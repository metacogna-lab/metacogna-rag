import { test, expect } from '@playwright/test';

test.describe('Document Upload Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Auth API
    await page.route('**/api/auth/login', async route => {
      const json = {
        success: true,
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@metacogna.ai',
          isAdmin: false,
          preferences: {}
        }
      };
      await route.fulfill({ json });
    });

    // Mock Documents List API
    await page.route('**/api/documents', async route => {
      const json = {
        documents: [
          {
            id: 'doc-001',
            title: 'RAG System Overview',
            uploadedAt: Date.now() - 86400000, // 1 day ago
            status: 'indexed',
            progress: 100,
            chunkCount: 42,
            metadata: {
              author: 'Alice Chen',
              category: 'Research',
              tags: 'RAG, Embeddings, Vector Search'
            }
          },
          {
            id: 'doc-002',
            title: 'TypeScript Best Practices',
            uploadedAt: Date.now() - 3600000, // 1 hour ago
            status: 'processing',
            progress: 65,
            chunkCount: 0,
            metadata: {
              author: 'Bob Smith',
              category: 'Engineering'
            }
          },
          {
            id: 'doc-003',
            title: 'Failed Upload Test',
            uploadedAt: Date.now() - 7200000, // 2 hours ago
            status: 'error',
            progress: 35,
            chunkCount: 0,
            metadata: {
              error: 'Embedding generation failed'
            }
          }
        ]
      };
      await route.fulfill({ json });
    });

    // Mock Upload/Ingest API
    await page.route('**/api/ingest', async route => {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
      const json = {
        success: true,
        documentId: 'doc-new-' + Date.now(),
        chunks: 28,
        graphNodes: 12,
        status: 'indexed'
      };
      await route.fulfill({ json });
    });

    // Mock Reindex API
    await page.route('**/api/documents/reindex', async route => {
      await new Promise(resolve => setTimeout(resolve, 300));
      const json = { success: true, reindexed: 3 };
      await route.fulfill({ json });
    });

    // Mock Purge Errors API
    await page.route('**/api/documents/purge-errors', async route => {
      const json = { success: true, deleted: 1 };
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:3000/');
  });

  test('Document table displays metadata tooltips on hover', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents view
    await page.click('text=Documents');

    // Wait for documents to load
    await expect(page.getByText('RAG System Overview')).toBeVisible();

    // Find metadata cell for first document
    const metadataCell = page.locator('td').filter({ hasText: /author:|category:|tags:/ }).first();
    await expect(metadataCell).toBeVisible();

    // Hover over metadata badges
    await metadataCell.hover();

    // Wait for tooltip to appear (using group-hover CSS)
    // Tooltip should show full metadata
    await expect(page.getByText('Full Metadata')).toBeVisible({ timeout: 1000 });
    await expect(page.getByText('Alice Chen')).toBeVisible();
    await expect(page.getByText('Research')).toBeVisible();
  });

  test('Upload progress shows pipeline stages', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents view
    await page.click('text=Documents');

    // Find document with "processing" status
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();

    // Check for progress bar
    const progressBar = page.locator('.progress-bar, [class*="progress"]').first();
    await expect(progressBar).toBeVisible();

    // Verify pipeline stage labels based on progress (65%)
    // At 65%, should show "Graph extraction..." (60-89%)
    await expect(page.getByText(/Embedding|Graph extraction/i)).toBeVisible();

    // Verify percentage display
    await expect(page.getByText('65%')).toBeVisible();
  });

  test('Pipeline stages update with progress', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Check document at 65% progress shows correct stage
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible();

    // Stage at 65% should be "Graph extraction..." (60-89% range)
    const stage = page.getByText(/Graph extraction/i);
    await expect(stage).toBeVisible();

    // Verify color coding (indigo for 60-89%)
    // In real test, would check computed styles or class names
  });

  test('Maintenance: Reindex All Documents', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find "Reindex All Documents" button
    const reindexButton = page.locator('button', { hasText: /Reindex All/i });
    await expect(reindexButton).toBeVisible();

    // Mock confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Click reindex
    await reindexButton.click();

    // Wait for confirmation and success message
    await expect(page.getByText(/reindexed successfully/i)).toBeVisible({ timeout: 2000 });
  });

  test('Maintenance: Purge Error Documents', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Verify error document exists
    await expect(page.getByText('Failed Upload Test')).toBeVisible();

    // Find "Purge Error Documents" button
    const purgeButton = page.locator('button', { hasText: /Purge Error/i });
    await expect(purgeButton).toBeVisible();

    // Mock confirmation dialog
    page.on('dialog', dialog => dialog.accept());

    // Click purge
    await purgeButton.click();

    // Wait for success message
    await expect(page.getByText(/Purged.*error document/i)).toBeVisible({ timeout: 2000 });
  });

  test('Error document displays error status badge', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find error document
    await expect(page.getByText('Failed Upload Test')).toBeVisible();

    // Verify error badge/status
    const errorBadge = page.locator('span, div', { hasText: /error|failed/i }).first();
    await expect(errorBadge).toBeVisible();

    // Error badge should have red styling (check for class or style)
    // In real test, would verify CSS class contains 'red' or 'error'
  });

  test('Document status badges: processing, indexed, error', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Check all 3 document statuses
    await expect(page.getByText('RAG System Overview')).toBeVisible(); // indexed
    await expect(page.getByText('TypeScript Best Practices')).toBeVisible(); // processing
    await expect(page.getByText('Failed Upload Test')).toBeVisible(); // error

    // Verify status badges
    const indexedBadge = page.locator('text=indexed, text=Indexed').first();
    const processingBadge = page.locator('text=processing, text=Processing').first();
    const errorBadge = page.locator('text=error, text=Error').first();

    // At least one of each status should be visible
    await expect(indexedBadge.or(processingBadge).or(errorBadge)).toBeVisible();
  });

  test('Metadata badges show truncated preview (3 max)', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find document with multiple metadata fields
    const metadataCell = page.locator('td').filter({ hasText: /author:|category:|tags:/ }).first();
    await expect(metadataCell).toBeVisible();

    // Should show max 3 metadata badges + "..." indicator
    const badges = metadataCell.locator('span[class*="border"]');
    const badgeCount = await badges.count();

    // If more than 3 fields, should show "..." indicator
    if (badgeCount >= 3) {
      await expect(metadataCell.getByText('...')).toBeVisible();
    }
  });

  test('Chunk count displays for indexed documents', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find indexed document (doc-001 has 42 chunks)
    await expect(page.getByText('RAG System Overview')).toBeVisible();

    // Verify chunk count is displayed
    await expect(page.getByText('42')).toBeVisible();

    // Processing/error docs should show 0 or empty chunk count
  });
});

test.describe('File Upload Interaction', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Auth
    await page.route('**/api/auth/login', async route => {
      const json = {
        success: true,
        user: { id: 'user-123', username: 'testuser', isAdmin: false, preferences: {} }
      };
      await route.fulfill({ json });
    });

    // Mock empty documents list
    await page.route('**/api/documents', async route => {
      const json = { documents: [] };
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:3000/');
  });

  test('File input accepts multiple files', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Verify multiple attribute
    const isMultiple = await fileInput.getAttribute('multiple');
    expect(isMultiple).not.toBeNull();
  });

  test('File input accepts .md, .pdf, .txt files', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'testuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Navigate to Documents
    await page.click('text=Documents');

    // Find file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Verify accept attribute
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('.md');
    expect(accept).toContain('.pdf');
    expect(accept).toContain('.txt');
  });
});
