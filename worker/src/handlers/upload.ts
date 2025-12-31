/**
 * Multi-File Upload Handler
 * Handles FormData parsing and R2 upload for multiple files
 */

import { generateR2Key } from '../utils/r2-keys';
import { uploadToR2 } from '../services/r2';

/**
 * Upload result for a single file
 */
export interface UploadResult {
  filename: string;
  r2Key: string;
  size: number;
  contentType: string;
}

/**
 * Multi-file upload response
 */
export interface UploadResponse {
  success: boolean;
  uploaded: UploadResult[];
  error?: string;
}

/**
 * Handles multi-file upload from FormData
 *
 * @param {Request} request - The HTTP request containing FormData
 * @param {any} env - The Worker environment with R2 bucket binding
 * @returns {Promise<UploadResponse>} Upload results or error
 *
 * @example
 * const formData = new FormData();
 * formData.append('userId', 'user-123');
 * formData.append('files', file1);
 * formData.append('files', file2);
 *
 * const result = await handleMultiFileUpload(request, env);
 * // { success: true, uploaded: [{ filename: '...', r2Key: '...', ... }] }
 */
export async function handleMultiFileUpload(
  request: Request,
  env: any
): Promise<UploadResponse> {
  try {
    // Parse FormData
    const formData = await request.formData();

    // Extract userId
    const userId = formData.get('userId') as string;
    if (!userId) {
      return {
        success: false,
        uploaded: [],
        error: 'Missing required field: userId'
      };
    }

    // Extract files
    const files = formData.getAll('files') as File[];
    if (files.length === 0) {
      return {
        success: false,
        uploaded: [],
        error: 'No files provided'
      };
    }

    // Extract optional custom metadata
    const metadataStr = formData.get('metadata') as string;
    const customMetadata = metadataStr ? JSON.parse(metadataStr) : {};

    // Upload each file to R2
    const uploadResults: UploadResult[] = [];

    for (const file of files) {
      // Generate unique R2 key
      const r2Key = generateR2Key(userId, file.name);

      // Read file content
      const content = await file.text();

      // Prepare metadata
      const metadata = {
        userId,
        filename: file.name,
        contentType: file.type,
        uploadedAt: Date.now().toString(),
        ...customMetadata
      };

      // Upload to R2
      await uploadToR2(env.metacogna_vault, r2Key, content, metadata);

      // Add to results
      uploadResults.push({
        filename: file.name,
        r2Key,
        size: content.length,
        contentType: file.type
      });
    }

    return {
      success: true,
      uploaded: uploadResults
    };
  } catch (error) {
    return {
      success: false,
      uploaded: [],
      error: error instanceof Error ? error.message : 'Unknown error during upload'
    };
  }
}
