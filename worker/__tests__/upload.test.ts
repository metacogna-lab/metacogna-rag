/**
 * Multi-File Upload Handler Tests
 * Tests verify FormData parsing, R2 upload, and metadata handling
 */

import { describe, test, expect, mock } from 'bun:test';
import { handleMultiFileUpload, UploadResult } from '../src/handlers/upload';

describe('Multi-File Upload Handler', () => {
  test('should upload multiple files to R2 with unique keys', async () => {
    const file1 = new File(['Content 1'], 'doc1.md', { type: 'text/markdown' });
    const file2 = new File(['Content 2'], 'doc2.pdf', { type: 'application/pdf' });

    const formData = new FormData();
    formData.append('userId', 'user-123');
    formData.append('files', file1);
    formData.append('files', file2);

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async (key: string, content: any, options: any) => {
        expect(key).toContain('users/user-123/documents/');
        expect(options.customMetadata.userId).toBe('user-123');
        return {};
      })
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(true);
    expect(results.uploaded).toHaveLength(2);
    expect(mockR2Bucket.put).toHaveBeenCalledTimes(2);

    // Verify unique R2 keys
    const keys = results.uploaded.map((r: UploadResult) => r.r2Key);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('doc1.md');
    expect(keys[1]).toContain('doc2.pdf');
  });

  test('should reject upload without userId', async () => {
    const file = new File(['Content'], 'doc.md', { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('files', file);

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockEnv = {
      metacogna_vault: {}
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(false);
    expect(results.error).toContain('userId');
  });

  test('should handle empty file list gracefully', async () => {
    const formData = new FormData();
    formData.append('userId', 'user-123');

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockEnv = {
      metacogna_vault: {}
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(false);
    expect(results.error).toContain('No files');
  });

  test('should include file metadata in upload results', async () => {
    const file = new File(['Test content'], 'test.md', { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('userId', 'user-456');
    formData.append('files', file);

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async () => ({}))
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(true);
    expect(results.uploaded[0].filename).toBe('test.md');
    expect(results.uploaded[0].size).toBe(12); // "Test content" length
    expect(results.uploaded[0].contentType).toBe('text/markdown');
  });

  test('should handle R2 upload errors gracefully', async () => {
    const file = new File(['Content'], 'doc.md', { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('userId', 'user-123');
    formData.append('files', file);

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async () => {
        throw new Error('R2 upload failed');
      })
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(false);
    expect(results.error).toContain('R2 upload failed');
  });

  test('should generate unique R2 keys for files with same name', async () => {
    const file1 = new File(['Content 1'], 'doc.md', { type: 'text/markdown' });
    const file2 = new File(['Content 2'], 'doc.md', { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('userId', 'user-123');
    formData.append('files', file1);
    formData.append('files', file2);

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async () => ({}))
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(true);
    const keys = results.uploaded.map((r: UploadResult) => r.r2Key);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[0]).toContain('doc.md');
    expect(keys[1]).toContain('doc.md');
  });

  test('should pass custom metadata to R2', async () => {
    const file = new File(['Content'], 'doc.md', { type: 'text/markdown' });

    const formData = new FormData();
    formData.append('userId', 'user-789');
    formData.append('files', file);
    formData.append('metadata', JSON.stringify({ source: 'upload', tag: 'important' }));

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async (key: string, content: any, options: any) => {
        expect(options.customMetadata.source).toBe('upload');
        expect(options.customMetadata.tag).toBe('important');
        return {};
      })
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(mockR2Bucket.put).toHaveBeenCalled();
  });

  test('should support uploading up to 10 files', async () => {
    const formData = new FormData();
    formData.append('userId', 'user-123');

    // Add 10 files
    for (let i = 1; i <= 10; i++) {
      const file = new File([`Content ${i}`], `doc${i}.md`, { type: 'text/markdown' });
      formData.append('files', file);
    }

    const mockRequest = new Request('http://localhost/upload', {
      method: 'POST',
      body: formData
    });

    const mockR2Bucket = {
      put: mock(async () => ({}))
    };

    const mockEnv = {
      metacogna_vault: mockR2Bucket
    };

    const results = await handleMultiFileUpload(mockRequest, mockEnv as any);

    expect(results.success).toBe(true);
    expect(results.uploaded).toHaveLength(10);
    expect(mockR2Bucket.put).toHaveBeenCalledTimes(10);
  });
});
