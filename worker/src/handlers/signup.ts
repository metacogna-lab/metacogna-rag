/**
 * Admin-Only Signup Handler
 * Handles complete signup workflow: validation, user creation, file uploads
 */

import { validateAdminToken } from '../auth/admin';
import { generateUUID } from '../utils/uuid';
import { hashPassword } from '../utils/password';
import { summarizeGoals } from '../services/summarization';
import { handleMultiFileUpload } from './upload';

/**
 * Signup response interface
 */
export interface SignupResponse {
  success: boolean;
  userId?: string;
  goalsSummary?: string;
  files?: Array<{
    filename: string;
    r2Key: string;
    size: number;
    contentType: string;
  }>;
  error?: string;
}

/**
 * Handles admin-only signup requests
 *
 * Workflow:
 * 1. Validate admin token
 * 2. Parse FormData (name, email, password, goals, files)
 * 3. Validate required fields
 * 4. Check email uniqueness
 * 5. Generate UUID and hash password
 * 6. Summarize goals using Workers AI
 * 7. Create user in D1
 * 8. Upload files to R2 (if provided)
 * 9. Create document records in D1
 * 10. Return success response
 *
 * @param {Request} request - The HTTP request with Authorization header and FormData body
 * @param {any} env - The Worker environment (DB, AI, R2)
 * @returns {Promise<Response>} HTTP response with signup result
 *
 * @example
 * // POST /api/signup
 * // Authorization: Bearer <admin-token>
 * // Content-Type: multipart/form-data
 * // Body: name, email, password, goals (optional), files[] (optional)
 */
export async function handleSignup(request: Request, env: any): Promise<Response> {
  try {
    // 1. Validate admin token
    const authHeader = request.headers.get('Authorization');
    const isAdmin = await validateAdminToken(authHeader, env.DB);

    if (!isAdmin) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Forbidden: Admin access required'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse FormData
    const formData = await request.formData();

    // 3. Extract and validate required fields
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!name || name.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required field: name'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!email || email.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required field: email'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!password || password.trim().length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required field: password'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Check email uniqueness
    const existingUser = await env.DB
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email already registered'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 5. Generate UUID and hash password
    const userId = generateUUID();
    const passwordHash = await hashPassword(password);

    // 6. Summarize goals (optional field)
    const rawGoals = (formData.get('goals') as string) || '';
    const goalsSummary = await summarizeGoals(env.AI, rawGoals);

    // 7. Create user in D1
    const createdAt = Date.now();
    await env.DB.prepare(`
      INSERT INTO users (id, username, email, name, passwordHash, goals, isAdmin, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    `)
      .bind(userId, email, email, name, passwordHash, goalsSummary, createdAt)
      .run();

    // 8. Upload files to R2 (if provided)
    const files = formData.getAll('files') as File[];
    let uploadedFiles: any[] = [];

    if (files.length > 0) {
      // Create a new FormData with userId and files for the upload handler
      const uploadFormData = new FormData();
      uploadFormData.append('userId', userId);

      files.forEach(file => {
        uploadFormData.append('files', file);
      });

      // Create a new request for the upload handler
      const uploadRequest = new Request(request.url, {
        method: 'POST',
        body: uploadFormData
      });

      const uploadResult = await handleMultiFileUpload(uploadRequest, env);

      if (uploadResult.success) {
        uploadedFiles = uploadResult.uploaded;

        // 9. Create document records in D1 for each uploaded file
        for (const file of uploadedFiles) {
          const docId = generateUUID();
          await env.DB.prepare(`
            INSERT INTO documents (id, userId, title, r2Key, metadata, createdAt, uploadedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
            .bind(
              docId,
              userId,
              file.filename,
              file.r2Key,
              JSON.stringify({ contentType: file.contentType, size: file.size }),
              createdAt,
              createdAt
            )
            .run();
        }
      }
    }

    // 10. Return success response
    return new Response(JSON.stringify({
      success: true,
      userId,
      goalsSummary,
      files: uploadedFiles
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
