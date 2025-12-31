/**
 * UUID Generation Utility
 * Provides UUID v4 generation for user IDs, document IDs, and other entities
 */

/**
 * Generates a random UUID v4
 * Uses the Web Crypto API's crypto.randomUUID() for secure random UUIDs
 *
 * @returns {string} A UUID v4 string in the format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 *
 * @example
 * const userId = generateUUID();
 * // "123e4567-e89b-12d3-a456-426614174000"
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}
