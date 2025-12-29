
import { AnalyticsEvent } from "../types";

/**
 * Analytics Engine
 * Tracks performance metrics for the RAG system
 */
export class AnalyticsService {
  private events: AnalyticsEvent[] = [];

  logEvent(type: AnalyticsEvent['type'], latencyMs: number, tokenCount: number, success: boolean, details?: Record<string, any>) {
    const event: AnalyticsEvent = {
      id: Math.random().toString(36).substring(7),
      type,
      latencyMs,
      tokenCount,
      timestamp: Date.now(),
      success,
      details
    };
    this.events.push(event);
    console.debug(`[Analytics] ${type.toUpperCase()} | ${latencyMs}ms | Tokens: ${tokenCount} | Success: ${success}`);
  }

  getAverageLatency(type: AnalyticsEvent['type']): number {
    const relevant = this.events.filter(e => e.type === type);
    if (relevant.length === 0) return 0;
    return relevant.reduce((acc, curr) => acc + curr.latencyMs, 0) / relevant.length;
  }

  getEvents(): AnalyticsEvent[] {
      return this.events;
  }

  clearEvents() {
      this.events = [];
  }
}

export const analyticsService = new AnalyticsService();
