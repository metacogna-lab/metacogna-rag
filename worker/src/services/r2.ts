/**
 * R2 Storage Service
 * Provides upload, download, and management functions for Cloudflare R2 object storage
 */

/**
 * Content type mapping for common file extensions
 */
const CONTENT_TYPES: Record<string, string> = {
  'pdf': 'application/pdf',
  'md': 'text/markdown',
  'txt': 'text/plain',
  'json': 'application/json',
  'html': 'text/html',
  'css': 'text/css',
  'js': 'application/javascript',
  'png': 'image/png',
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'gif': 'image/gif',
  'svg': 'image/svg+xml',
};

/**
 * Detects content type from filename extension
 * @param {string} filename - The filename to analyze
 * @returns {string} MIME type
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext && CONTENT_TYPES[ext] ? CONTENT_TYPES[ext] : 'application/octet-stream';
}

/**
 * Uploads content to R2 bucket with metadata
 *
 * @param {R2Bucket} bucket - The R2 bucket instance
 * @param {string} key - The R2 object key (path)
 * @param {string} content - The content to upload
 * @param {Record<string, string>} metadata - Custom metadata key-value pairs
 * @returns {Promise<void>}
 *
 * @example
 * await uploadToR2(
 *   env.METACOGNA_VAULT,
 *   'users/user-123/documents/doc.pdf',
 *   pdfContent,
 *   { userId: 'user-123', docId: 'doc-456' }
 * );
 */
export async function uploadToR2(
  bucket: R2Bucket,
  key: string,
  content: string,
  metadata: Record<string, string>
): Promise<void> {
  await bucket.put(key, content, {
    httpMetadata: {
      contentType: getContentType(key)
    },
    customMetadata: metadata
  });
}

/**
 * Downloads content from R2 bucket
 *
 * @param {R2Bucket} bucket - The R2 bucket instance
 * @param {string} key - The R2 object key (path)
 * @returns {Promise<string | null>} The content as string, or null if not found
 *
 * @example
 * const content = await getFromR2(env.METACOGNA_VAULT, 'users/user-123/documents/doc.md');
 */
export async function getFromR2(bucket: R2Bucket, key: string): Promise<string | null> {
  const object = await bucket.get(key);

  if (!object) {
    return null;
  }

  return await object.text();
}

/**
 * Deletes an object from R2 bucket
 *
 * @param {R2Bucket} bucket - The R2 bucket instance
 * @param {string} key - The R2 object key (path) to delete
 * @returns {Promise<void>}
 *
 * @example
 * await deleteFromR2(env.METACOGNA_VAULT, 'users/user-123/documents/old.pdf');
 */
export async function deleteFromR2(bucket: R2Bucket, key: string): Promise<void> {
  await bucket.delete(key);
}

/**
 * Lists all documents for a specific user
 *
 * @param {R2Bucket} bucket - The R2 bucket instance
 * @param {string} userId - The user's UUID
 * @returns {Promise<Array<{ key: string; size: number }>>} Array of document objects
 *
 * @example
 * const docs = await listUserDocuments(env.METACOGNA_VAULT, 'user-123');
 * // [{ key: 'users/user-123/documents/file1.md', size: 1024 }, ...]
 */
export async function listUserDocuments(
  bucket: R2Bucket,
  userId: string
): Promise<Array<{ key: string; size: number }>> {
  const prefix = `users/${userId}/documents/`;

  const listed = await bucket.list({ prefix });

  return listed.objects.map(obj => ({
    key: obj.key,
    size: obj.size
  }));
}

/**
 * Gets metadata for an R2 object without downloading the content
 *
 * @param {R2Bucket} bucket - The R2 bucket instance
 * @param {string} key - The R2 object key
 * @returns {Promise<{ size: number; uploaded: Date; metadata: Record<string, string> } | null>}
 *
 * @example
 * const info = await getR2Metadata(env.METACOGNA_VAULT, 'users/user-123/profile/avatar');
 */
export async function getR2Metadata(
  bucket: R2Bucket,
  key: string
): Promise<{ size: number; uploaded: Date; metadata: Record<string, string> } | null> {
  const object = await bucket.head(key);

  if (!object) {
    return null;
  }

  return {
    size: object.size,
    uploaded: object.uploaded,
    metadata: object.customMetadata || {}
  };
}
