/**
 * UUID Generation Tests
 * Tests verify UUID v4 generation and R2 key structure
 */

import { describe, test, expect } from 'bun:test';
import { generateUUID } from '../src/utils/uuid';
import { generateR2Key, generateR2DocumentKey } from '../src/utils/r2-keys';

describe('UUID Generation', () => {
  test('should generate valid UUID v4 format', () => {
    const uuid = generateUUID();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is one of [8, 9, a, b]
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    expect(uuid).toMatch(uuidV4Regex);
  });

  test('should generate unique UUIDs', () => {
    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    expect(uuid1).not.toBe(uuid2);
  });

  test('should return string type', () => {
    const uuid = generateUUID();

    expect(typeof uuid).toBe('string');
  });

  test('should be 36 characters long (including hyphens)', () => {
    const uuid = generateUUID();

    expect(uuid.length).toBe(36);
  });
});

describe('R2 Key Generation', () => {
  test('should generate R2 key with correct path structure', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    const filename = 'test-file.md';

    const r2Key = generateR2Key(userId, filename);

    // Expected format: users/{userId}/documents/{uuid}-{filename}
    expect(r2Key).toMatch(/^users\/[\w-]+\/documents\/[\w-]+-test-file\.md$/);
  });

  test('should include userId in path', () => {
    const userId = 'user-123';
    const filename = 'doc.pdf';

    const r2Key = generateR2Key(userId, filename);

    expect(r2Key).toContain(`users/${userId}`);
  });

  test('should include documents directory', () => {
    const userId = 'user-123';
    const filename = 'notes.txt';

    const r2Key = generateR2Key(userId, filename);

    expect(r2Key).toContain('/documents/');
  });

  test('should preserve original filename', () => {
    const userId = 'user-123';
    const filename = 'my-document.md';

    const r2Key = generateR2Key(userId, filename);

    expect(r2Key).toContain(filename);
  });

  test('should generate unique keys for same filename', () => {
    const userId = 'user-123';
    const filename = 'duplicate.txt';

    const key1 = generateR2Key(userId, filename);
    const key2 = generateR2Key(userId, filename);

    expect(key1).not.toBe(key2);
  });

  test('should handle filenames with special characters', () => {
    const userId = 'user-123';
    const filename = 'file with spaces & symbols (1).md';

    const r2Key = generateR2Key(userId, filename);

    expect(r2Key).toContain(userId);
    expect(r2Key).toContain('documents');
  });
});

describe('R2 Document Key Generation', () => {
  test('should generate document-specific R2 key', () => {
    const userId = 'user-456';
    const documentId = 'doc-789';
    const filename = 'research.pdf';

    const r2Key = generateR2DocumentKey(userId, documentId, filename);

    // Expected format: users/{userId}/documents/{documentId}/{filename}
    expect(r2Key).toMatch(/^users\/user-456\/documents\/doc-789\/research\.pdf$/);
  });

  test('should organize by document ID', () => {
    const userId = 'user-456';
    const documentId = 'doc-abc';
    const filename = 'file.txt';

    const r2Key = generateR2DocumentKey(userId, documentId, filename);

    expect(r2Key).toContain(`/${documentId}/`);
  });
});
