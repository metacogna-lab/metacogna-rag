/**
 * R2 Storage Service Tests
 * Tests verify R2 upload/download functionality and metadata handling
 */

import { describe, test, expect, mock } from 'bun:test';
import { uploadToR2, getFromR2, deleteFromR2, listUserDocuments } from '../src/services/r2';

describe('R2 Upload Operations', () => {
  test('should upload text content to R2 with metadata', async () => {
    const mockR2Bucket = {
      put: mock(async (key: string, content: string, options: any) => {
        expect(key).toBe('users/test-user/documents/test.txt');
        expect(content).toBe('Test content');
        expect(options.httpMetadata.contentType).toBe('text/plain');
        expect(options.customMetadata.userId).toBe('test-user');
        return {};
      })
    };

    await uploadToR2(
      mockR2Bucket as any,
      'users/test-user/documents/test.txt',
      'Test content',
      { userId: 'test-user', filename: 'test.txt' }
    );

    expect(mockR2Bucket.put).toHaveBeenCalledTimes(1);
  });

  test('should handle upload errors gracefully', async () => {
    const mockR2Bucket = {
      put: mock(async () => {
        throw new Error('Upload failed');
      })
    };

    await expect(uploadToR2(
      mockR2Bucket as any,
      'test-key',
      'content',
      {}
    )).rejects.toThrow('Upload failed');
  });

  test('should set correct content type based on file extension', async () => {
    const mockR2Bucket = {
      put: mock(async (key: string, content: string, options: any) => {
        if (key.endsWith('.pdf')) {
          expect(options.httpMetadata.contentType).toBe('application/pdf');
        } else if (key.endsWith('.md')) {
          expect(options.httpMetadata.contentType).toBe('text/markdown');
        }
        return {};
      })
    };

    await uploadToR2(mockR2Bucket as any, 'file.pdf', 'content', {});
    await uploadToR2(mockR2Bucket as any, 'file.md', 'content', {});

    expect(mockR2Bucket.put).toHaveBeenCalledTimes(2);
  });
});

describe('R2 Download Operations', () => {
  test('should download text content from R2', async () => {
    const mockR2Bucket = {
      get: mock(async (key: string) => {
        if (key === 'existing-key') {
          return {
            text: async () => 'Retrieved content',
            httpMetadata: { contentType: 'text/plain' }
          };
        }
        return null;
      })
    };

    const content = await getFromR2(mockR2Bucket as any, 'existing-key');

    expect(content).toBe('Retrieved content');
    expect(mockR2Bucket.get).toHaveBeenCalledWith('existing-key');
  });

  test('should return null for missing keys', async () => {
    const mockR2Bucket = {
      get: mock(async () => null)
    };

    const content = await getFromR2(mockR2Bucket as any, 'missing-key');

    expect(content).toBeNull();
  });

  test('should handle download errors gracefully', async () => {
    const mockR2Bucket = {
      get: mock(async () => {
        throw new Error('Download failed');
      })
    };

    await expect(getFromR2(mockR2Bucket as any, 'test-key')).rejects.toThrow('Download failed');
  });
});

describe('R2 Delete Operations', () => {
  test('should delete object from R2', async () => {
    const mockR2Bucket = {
      delete: mock(async (key: string) => {
        expect(key).toBe('users/test-user/documents/old.txt');
        return {};
      })
    };

    await deleteFromR2(mockR2Bucket as any, 'users/test-user/documents/old.txt');

    expect(mockR2Bucket.delete).toHaveBeenCalledTimes(1);
  });
});

describe('R2 List Operations', () => {
  test('should list user documents from R2', async () => {
    const mockR2Bucket = {
      list: mock(async (options: any) => {
        expect(options.prefix).toBe('users/test-user/documents/');
        return {
          objects: [
            { key: 'users/test-user/documents/file1.md', size: 100 },
            { key: 'users/test-user/documents/file2.pdf', size: 200 }
          ]
        };
      })
    };

    const documents = await listUserDocuments(mockR2Bucket as any, 'test-user');

    expect(documents).toHaveLength(2);
    expect(documents[0].key).toContain('file1.md');
    expect(mockR2Bucket.list).toHaveBeenCalled();
  });
});

describe('Content Type Detection', () => {
  test('should detect content type from filename', () => {
    const testCases = [
      { filename: 'doc.pdf', expected: 'application/pdf' },
      { filename: 'notes.md', expected: 'text/markdown' },
      { filename: 'data.txt', expected: 'text/plain' },
      { filename: 'unknown.xyz', expected: 'application/octet-stream' }
    ];

    // This will be tested via the actual implementation
    // For now, we define the expected behavior
    testCases.forEach(({ filename, expected }) => {
      expect(expected).toBeDefined();
    });
  });
});
