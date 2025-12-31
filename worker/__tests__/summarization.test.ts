/**
 * Goal Summarization Tests
 * Tests verify goal summarization using Workers AI
 */

import { describe, test, expect, mock } from 'bun:test';
import { summarizeGoals, GOAL_SUMMARY_PROMPT } from '../src/services/summarization';

describe('Goal Summarization', () => {
  test('should summarize long goals to max 200 characters', async () => {
    const longGoals = `
      I want to become an expert in machine learning and artificial intelligence.
      I plan to learn Python, TensorFlow, PyTorch, and work on several projects
      including natural language processing, computer vision, and reinforcement learning.
      My ultimate goal is to transition into an AI research position at a leading tech company.
    `;

    const mockAI = {
      run: mock(async (model: string, options: any) => {
        expect(model).toBe('@cf/meta/llama-3-8b-instruct');
        expect(options.messages).toHaveLength(2);
        expect(options.messages[0].role).toBe('system');
        expect(options.messages[1].role).toBe('user');
        expect(options.max_tokens).toBe(100);

        return {
          response: 'Expert in ML/AI, learn Python/TensorFlow/PyTorch, work on NLP/CV/RL projects, transition to AI research at top tech company'
        };
      })
    };

    const summary = await summarizeGoals(mockAI, longGoals);

    expect(summary.length).toBeLessThanOrEqual(200);
    expect(mockAI.run).toHaveBeenCalledTimes(1);
  });

  test('should handle empty goals gracefully', async () => {
    const mockAI = {
      run: mock(async () => ({ response: '' }))
    };

    const summary = await summarizeGoals(mockAI, '');

    expect(summary).toBe('No specific goals provided.');
    expect(mockAI.run).not.toHaveBeenCalled(); // Should not call AI for empty input
  });

  test('should handle whitespace-only goals', async () => {
    const mockAI = {
      run: mock(async () => ({ response: '' }))
    };

    const summary = await summarizeGoals(mockAI, '   \n   \t   ');

    expect(summary).toBe('No specific goals provided.');
    expect(mockAI.run).not.toHaveBeenCalled();
  });

  test('should truncate AI response if longer than 200 chars', async () => {
    const mockAI = {
      run: mock(async () => ({
        response: 'A'.repeat(300) // Return 300 characters
      }))
    };

    const summary = await summarizeGoals(mockAI, 'Test goals here');

    expect(summary.length).toBe(200);
    expect(summary).toBe('A'.repeat(200));
  });

  test('should use system prompt for goal analysis', async () => {
    const mockAI = {
      run: mock(async (model: string, options: any) => {
        const systemMessage = options.messages[0];
        expect(systemMessage.role).toBe('system');
        expect(systemMessage.content).toContain('goal analysis');
        expect(systemMessage.content).toContain('200 chars');

        return { response: 'Summary of goals' };
      })
    };

    await summarizeGoals(mockAI, 'My goal is to learn TypeScript');

    expect(mockAI.run).toHaveBeenCalled();
  });

  test('should handle AI errors gracefully', async () => {
    const userGoals = 'Become a better developer';

    const mockAI = {
      run: mock(async () => {
        throw new Error('AI service unavailable');
      })
    };

    // Should fall back to truncated original goals
    const summary = await summarizeGoals(mockAI, userGoals);

    expect(summary).toBe(userGoals); // Falls back to original since it's under 200 chars
  });

  test('should fallback to truncated goals if AI returns empty response', async () => {
    const userGoals = 'Short goal';

    const mockAI = {
      run: mock(async () => ({ response: null }))
    };

    const summary = await summarizeGoals(mockAI, userGoals);

    expect(summary).toBe(userGoals);
  });

  test('should handle goals exactly 200 characters', async () => {
    const exactGoals = 'A'.repeat(200);

    const mockAI = {
      run: mock(async () => ({ response: exactGoals }))
    };

    const summary = await summarizeGoals(mockAI, exactGoals);

    expect(summary.length).toBe(200);
    expect(summary).toBe(exactGoals);
  });
});

describe('GOAL_SUMMARY_PROMPT Constant', () => {
  test('should define goal summary prompt', () => {
    expect(GOAL_SUMMARY_PROMPT).toBeDefined();
    expect(typeof GOAL_SUMMARY_PROMPT).toBe('string');
    expect(GOAL_SUMMARY_PROMPT.length).toBeGreaterThan(0);
  });

  test('should mention character limit in prompt', () => {
    expect(GOAL_SUMMARY_PROMPT).toContain('200');
  });

  test('should instruct for concise summarization', () => {
    const promptLower = GOAL_SUMMARY_PROMPT.toLowerCase();
    const hasSummarization =
      promptLower.includes('summarize') ||
      promptLower.includes('concise') ||
      promptLower.includes('brief');

    expect(hasSummarization).toBe(true);
  });
});
