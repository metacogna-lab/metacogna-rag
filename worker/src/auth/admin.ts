/**
 * Admin Authentication and Token Validation
 * Provides token-based admin authentication for sensitive operations
 */

/**
 * Generates an admin Bearer token
 *
 * @param {string} userId - The user's ID
 * @param {string} passwordHash - The user's password hash
 * @returns {Promise<string>} Bearer token with base64 encoded credentials
 *
 * @example
 * const token = await generateAdminToken('user-123', 'hash-abc');
 * // "Bearer dXNlci0xMjM6aGFzaC1hYmM="
 */
export async function generateAdminToken(
  userId: string,
  passwordHash: string
): Promise<string> {
  const credentials = `${userId}:${passwordHash}`;
  const encoded = btoa(credentials);
  return `Bearer ${encoded}`;
}

/**
 * Validates an admin Bearer token
 *
 * Token format: "Bearer base64(userId:passwordHash)"
 *
 * Validation steps:
 * 1. Parse Bearer token format
 * 2. Decode base64 credentials
 * 3. Extract userId and passwordHash
 * 4. Query database for user
 * 5. Verify passwordHash matches
 * 6. Verify user is admin (isAdmin = 1)
 *
 * @param {string | null} authHeader - The Authorization header value
 * @param {D1Database} db - The D1 database instance
 * @returns {Promise<boolean>} True if valid admin token, false otherwise
 *
 * @example
 * const isAdmin = await validateAdminToken(
 *   request.headers.get('Authorization'),
 *   env.DB
 * );
 * if (!isAdmin) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 */
export async function validateAdminToken(
  authHeader: string | null,
  db: any
): Promise<boolean> {
  try {
    // Check if Authorization header is present
    if (!authHeader) {
      return false;
    }

    // Verify Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return false;
    }

    // Extract base64 encoded credentials
    const encodedCredentials = authHeader.replace('Bearer ', '');

    // Decode base64
    let decodedCredentials: string;
    try {
      decodedCredentials = atob(encodedCredentials);
    } catch (error) {
      // Invalid base64
      return false;
    }

    // Parse userId:passwordHash format
    const parts = decodedCredentials.split(':');
    if (parts.length !== 2) {
      return false;
    }

    const [userId, passwordHash] = parts;

    // Query database for user
    const user = await db
      .prepare('SELECT id, passwordHash, isAdmin FROM users WHERE id = ?')
      .bind(userId)
      .first();

    // Check if user exists
    if (!user) {
      return false;
    }

    // Verify userId matches (security check for mock/test scenarios)
    if (user.id !== userId) {
      return false;
    }

    // Verify passwordHash matches
    if (user.passwordHash !== passwordHash) {
      return false;
    }

    // Verify user is admin
    if (user.isAdmin !== 1) {
      return false;
    }

    return true;
  } catch (error) {
    // Log error and return false for any unexpected errors
    console.error('Admin token validation error:', error);
    return false;
  }
}
