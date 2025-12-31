/**
 * R2 Key Generation Utilities
 * Provides consistent key generation for R2 object storage
 */

import { generateUUID } from './uuid';

/**
 * Generates an R2 key for storing user documents
 * Format: users/{userId}/documents/{uuid}-{filename}
 *
 * @param {string} userId - The user's UUID
 * @param {string} filename - The original filename
 * @returns {string} R2 object key
 *
 * @example
 * const key = generateR2Key('user-123', 'research.pdf');
 * // "users/user-123/documents/abc123-def456-research.pdf"
 */
export function generateR2Key(userId: string, filename: string): string {
  const documentUUID = generateUUID();
  return `users/${userId}/documents/${documentUUID}-${filename}`;
}

/**
 * Generates an R2 key for storing documents with explicit document ID
 * Format: users/{userId}/documents/{documentId}/{filename}
 *
 * @param {string} userId - The user's UUID
 * @param {string} documentId - The document's UUID
 * @param {string} filename - The original filename
 * @returns {string} R2 object key
 *
 * @example
 * const key = generateR2DocumentKey('user-123', 'doc-456', 'notes.md');
 * // "users/user-123/documents/doc-456/notes.md"
 */
export function generateR2DocumentKey(userId: string, documentId: string, filename: string): string {
  return `users/${userId}/documents/${documentId}/${filename}`;
}

/**
 * Generates an R2 key for user profile data
 * Format: users/{userId}/profile/{dataType}
 *
 * @param {string} userId - The user's UUID
 * @param {string} dataType - Type of profile data (e.g., 'avatar', 'settings')
 * @returns {string} R2 object key
 *
 * @example
 * const key = generateR2ProfileKey('user-123', 'avatar');
 * // "users/user-123/profile/avatar"
 */
export function generateR2ProfileKey(userId: string, dataType: string): string {
  return `users/${userId}/profile/${dataType}`;
}

/**
 * Parses a userId from an R2 key
 * Extracts the userId portion from a key that follows our naming convention
 *
 * @param {string} r2Key - The R2 object key
 * @returns {string | null} The userId if found, null otherwise
 *
 * @example
 * const userId = parseUserIdFromR2Key('users/user-123/documents/doc.pdf');
 * // "user-123"
 */
export function parseUserIdFromR2Key(r2Key: string): string | null {
  const match = r2Key.match(/^users\/([\w-]+)\//);
  return match ? match[1] : null;
}
