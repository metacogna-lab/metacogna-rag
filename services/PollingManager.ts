import { useAppStore } from '../store';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STATE_CHANGE_THRESHOLD = 0.05; // 5%
const DEEP_ANALYSIS_INTERVAL = 15 * 60 * 1000; // 15 minutes

class PollingManager {
  private intervalId: NodeJS.Timeout | null = null;
  private deepAnalysisIntervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    useAppStore.getState().startMonitoring();

    // Lightweight polling (5 min)
    this.poll();
    this.intervalId = setInterval(() => this.poll(), POLL_INTERVAL_MS);

    // Deep analysis polling (15 min)
    this.deepAnalysis();
    this.deepAnalysisIntervalId = setInterval(() => this.deepAnalysis(), DEEP_ANALYSIS_INTERVAL);

    console.log('[PollingManager] Started monitoring');
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    if (this.deepAnalysisIntervalId) clearInterval(this.deepAnalysisIntervalId);
    this.isRunning = false;
    useAppStore.getState().stopMonitoring();
    console.log('[PollingManager] Stopped monitoring');
  }

  private async poll() {
    const { userId, documents, config } = useAppStore.getState();
    if (!userId) return;

    try {
      const currentSnapshot = {
        userId,
        timestamp: Date.now(),
        documentCount: documents.length,
        goalsHash: this.hashString(config.userGoals || ''),
        dreamsHash: this.hashString(config.userDreams || '')
      };

      const response = await fetch('/api/supervisor/state-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSnapshot)
      });

      const data = await response.json();

      useAppStore.getState().setStateChange(data.changePercentage || 0);
      useAppStore.getState().updatePollTimestamp();

      if (data.shouldTriggerSupervisor) {
        await this.triggerSupervisorAnalysis();
      }
    } catch (err) {
      console.error('[PollingManager] Poll failed:', err);
    }
  }

  private async deepAnalysis() {
    const { userId } = useAppStore.getState();
    if (!userId) return;

    try {
      // Fetch last 50 interactions
      const interactionsRes = await fetch(`/api/interactions/recent?userId=${userId}&limit=50`);

      if (!interactionsRes.ok) {
        console.warn('[PollingManager] Failed to fetch interactions:', interactionsRes.status);
        return;
      }

      const { interactions } = await interactionsRes.json();

      if (!interactions || interactions.length === 0) {
        console.log('[PollingManager] No interactions to analyze');
        return;
      }

      // Send to /api/chat for deep summarization
      const chatResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemPrompt: `You are the Supervisor's deep analysis module. Analyze user interaction patterns and extract insights.

Output JSON with:
{
  "patterns": ["pattern1", "pattern2"],
  "habits": ["habit1", "habit2"],
  "preferences": ["pref1", "pref2"],
  "risks": ["risk1", "risk2"],
  "goalAlignment": 0.0-1.0,
  "summary": "Overall behavioral summary"
}`,
          userQuery: `Analyze these interactions:\n${JSON.stringify(interactions, null, 2)}`,
          agentType: 'supervisor'
        })
      });

      if (!chatResponse.ok) {
        console.warn('[PollingManager] Deep analysis chat failed:', chatResponse.status);
        return;
      }

      const analysis = await chatResponse.json();

      console.log('[PollingManager] Deep analysis complete:', analysis);

      // Store insights in supervisor_knowledge_graph
      // This will be implemented when we add the Worker endpoint for storing insights
    } catch (err) {
      console.error('[PollingManager] Deep analysis failed:', err);
    }
  }

  private async triggerSupervisorAnalysis() {
    const { userId, config } = useAppStore.getState();

    try {
      const response = await fetch('/api/supervisor/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          userGoals: config.userGoals,
          userDreams: config.userDreams
        })
      });

      if (!response.ok) {
        console.warn('[PollingManager] Supervisor analysis failed:', response.status);
        return;
      }

      const data = await response.json();
      console.log('[PollingManager] Supervisor analysis:', data);
    } catch (err) {
      console.error('[PollingManager] Trigger supervisor analysis failed:', err);
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

export const pollingManager = new PollingManager();
