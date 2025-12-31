/**
 * Password Hashing Utilities
 * Simple password hashing for Cloudflare Workers environment
 */

/**
 * Hashes a password using SHA-256 (simple implementation for Workers)
 *
 * Note: For production, consider using bcrypt or scrypt if available
 * in Cloudflare Workers environment, or use a more robust hashing algorithm.
 * This implementation uses SHA-256 with a salt for basic security.
 *
 * @param {string} password - The plain text password
 * @returns {Promise<string>} The hashed password (hex string)
 *
 * @example
 * const hash = await hashPassword('mypassword123');
 * // "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = crypto.randomUUID();

  // Combine password with salt
  const saltedPassword = `${salt}:${password}`;

  // Hash using SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(saltedPassword);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return salt:hash format for verification
  return `${salt}:${hashHex}`;
}

/**
 * Verifies a password against a hash
 *
 * @param {string} password - The plain text password to verify
 * @param {string} storedHash - The stored hash (salt:hash format)
 * @returns {Promise<boolean>} True if password matches, false otherwise
 *
 * @example
 * const isValid = await verifyPassword('mypassword123', storedHash);
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    // Extract salt from stored hash
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;

    // Hash the provided password with the same salt
    const saltedPassword = `${salt}:${password}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    // Convert to hex
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Compare hashes
    return computedHash === hash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}
