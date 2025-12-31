/**
 * Goal Summarization Service
 * Uses Workers AI to summarize user goals concisely
 */

/**
 * System prompt for goal analysis and summarization
 * Instructs the AI to create concise summaries under 200 characters
 */
export const GOAL_SUMMARY_PROMPT = `You are a goal analysis assistant. Summarize the user's goals concisely in 200 chars or less. Focus on key objectives and desired outcomes. Be brief and clear.`;

/**
 * Summarizes user goals using Workers AI
 *
 * @param {any} ai - The Workers AI binding
 * @param {string} rawGoals - The raw user goals text
 * @returns {Promise<string>} Summarized goals (max 200 chars)
 *
 * @example
 * const summary = await summarizeGoals(env.AI, userGoals);
 * // "Expert in ML/AI, learn Python/TensorFlow, work on NLP projects"
 */
export async function summarizeGoals(ai: any, rawGoals: string): Promise<string> {
  // Handle empty or whitespace-only input
  if (!rawGoals || rawGoals.trim().length === 0) {
    return 'No specific goals provided.';
  }

  try {
    // Call Workers AI with Llama 3 model
    const response = await ai.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: GOAL_SUMMARY_PROMPT
        },
        {
          role: 'user',
          content: rawGoals
        }
      ],
      max_tokens: 100
    });

    // Extract and truncate response
    const summary = response.response;

    // If AI returns empty/null, fall back to truncated original
    if (!summary || summary.trim().length === 0) {
      return rawGoals.substring(0, 200);
    }

    // Ensure max 200 characters
    return summary.substring(0, 200);
  } catch (error) {
    // On error, fall back to truncated original goals
    console.error('Goal summarization error:', error);
    return rawGoals.substring(0, 200);
  }
}
