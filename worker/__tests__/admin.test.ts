/**
 * Admin Token Validation Tests
 * Tests verify admin token generation and validation
 */

import { describe, test, expect, mock } from 'bun:test';
import { validateAdminToken, generateAdminToken } from '../src/auth/admin';

describe('Admin Token Generation', () => {
  test('should generate Bearer token with base64 encoded credentials', async () => {
    const userId = 'user-123';
    const passwordHash = 'hash-abc-xyz';

    const token = await generateAdminToken(userId, passwordHash);

    expect(token).toStartWith('Bearer ');

    // Decode and verify
    const encodedPart = token.replace('Bearer ', '');
    const decoded = atob(encodedPart);
    expect(decoded).toBe('user-123:hash-abc-xyz');
  });

  test('should generate unique tokens for different users', async () => {
    const token1 = await generateAdminToken('user-1', 'hash-1');
    const token2 = await generateAdminToken('user-2', 'hash-2');

    expect(token1).not.toBe(token2);
  });

  test('should handle special characters in password hash', async () => {
    const token = await generateAdminToken('user-123', 'hash+/=special');

    expect(token).toStartWith('Bearer ');

    const decoded = atob(token.replace('Bearer ', ''));
    expect(decoded).toContain('hash+/=special');
  });
});

describe('Admin Token Validation', () => {
  test('should validate token for admin user', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => ({
            id: 'user-123',
            passwordHash: 'hash-abc',
            isAdmin: 1
          }))
        }))
      }))
    };

    const token = await generateAdminToken('user-123', 'hash-abc');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(true);
    expect(mockDB.prepare).toHaveBeenCalled();
  });

  test('should reject token for non-admin user', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => ({
            id: 'user-456',
            passwordHash: 'hash-def',
            isAdmin: 0  // Not admin
          }))
        }))
      }))
    };

    const token = await generateAdminToken('user-456', 'hash-def');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject token with wrong password hash', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => ({
            id: 'user-123',
            passwordHash: 'correct-hash',
            isAdmin: 1
          }))
        }))
      }))
    };

    const token = await generateAdminToken('user-123', 'wrong-hash');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject token for non-existent user', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => null)  // User not found
        }))
      }))
    };

    const token = await generateAdminToken('nonexistent', 'hash');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject malformed Bearer token', async () => {
    const mockDB = {
      prepare: mock(() => ({ bind: mock(() => ({ first: mock(async () => null) })) }))
    };

    const isValid = await validateAdminToken('InvalidToken', mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject missing Authorization header', async () => {
    const mockDB = {
      prepare: mock(() => ({ bind: mock(() => ({ first: mock(async () => null) })) }))
    };

    const isValid = await validateAdminToken(null, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject invalid base64 encoding', async () => {
    const mockDB = {
      prepare: mock(() => ({ bind: mock(() => ({ first: mock(async () => null) })) }))
    };

    const isValid = await validateAdminToken('Bearer invalid-base64!!!', mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should reject token without userId:passwordHash format', async () => {
    const mockDB = {
      prepare: mock(() => ({ bind: mock(() => ({ first: mock(async () => null) })) }))
    };

    // Valid base64 but wrong format (missing colon separator)
    const invalidToken = 'Bearer ' + btoa('justonevalue');
    const isValid = await validateAdminToken(invalidToken, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should handle database errors gracefully', async () => {
    const mockDB = {
      prepare: mock(() => ({
        bind: mock(() => ({
          first: mock(async () => {
            throw new Error('Database connection failed');
          })
        }))
      }))
    };

    const token = await generateAdminToken('user-123', 'hash');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });
});

describe('Admin Token Security', () => {
  test('should require exact passwordHash match', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => ({
            id: 'user-123',
            passwordHash: 'hash-abc-xyz',
            isAdmin: 1
          }))
        }))
      }))
    };

    // Token with slightly different hash
    const token = await generateAdminToken('user-123', 'hash-abc-XYZ');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });

  test('should not validate token from different user', async () => {
    const mockDB = {
      prepare: mock((query: string) => ({
        bind: mock(() => ({
          first: mock(async () => ({
            id: 'user-123',
            passwordHash: 'hash-abc',
            isAdmin: 1
          }))
        }))
      }))
    };

    // Token for different user
    const token = await generateAdminToken('user-456', 'hash-abc');
    const isValid = await validateAdminToken(token, mockDB as any);

    expect(isValid).toBe(false);
  });
});
