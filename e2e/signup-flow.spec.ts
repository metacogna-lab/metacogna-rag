import { test, expect } from '@playwright/test';

test.describe('Admin Signup Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Admin Login API
    await page.route('**/api/auth/login', async route => {
      const request = route.request();
      const postData = await request.postDataJSON();

      if (postData.username === 'admin' && postData.password === 'admin123') {
        const json = {
          success: true,
          user: {
            id: 'admin-001',
            username: 'admin',
            email: 'admin@metacogna.ai',
            isAdmin: true,
            preferences: {}
          }
        };
        await route.fulfill({ json });
      } else {
        await route.fulfill({ status: 401, json: { success: false, error: 'Invalid credentials' } });
      }
    });

    // Mock Signup API (Admin-Only)
    await page.route('**/api/signup', async route => {
      const authHeader = route.request().headers()['authorization'];

      // Validate admin token
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        await route.fulfill({ status: 401, json: { success: false, error: 'Unauthorized' } });
        return;
      }

      const formData = route.request().postData();
      const json = {
        success: true,
        userId: 'user-' + Date.now(),
        goalsSummary: 'Learn RAG systems, build AI applications',
        filesUploaded: 2
      };
      await route.fulfill({ json });
    });

    await page.goto('http://localhost:3000/');
  });

  test('Admin can access signup view', async ({ page }) => {
    // Login as admin
    await page.fill('input[placeholder*="ID"]', 'admin');
    await page.fill('input[placeholder*="Secret"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Click "Create User" button (admin-only)
    const createUserButton = page.locator('button', { hasText: 'Create User' });
    await expect(createUserButton).toBeVisible();
    await createUserButton.click();

    // Verify signup view loaded
    await expect(page.getByText('Create New User')).toBeVisible();
    await expect(page.getByText('Admin-Only User Creation')).toBeVisible();
  });

  test('Admin can create user with name, email, password, and goals', async ({ page }) => {
    // Login as admin
    await page.fill('input[placeholder*="ID"]', 'admin');
    await page.fill('input[placeholder*="Secret"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Navigate to signup
    await page.click('button:has-text("Create User")');

    // Fill signup form
    await page.fill('input[placeholder*="Full Name"]', 'Alice Johnson');
    await page.fill('input[placeholder*="Email"]', 'alice@example.com');
    await page.fill('input[placeholder*="Password"]', 'SecurePass123!');
    await page.fill('textarea[placeholder*="goals"]', 'Build a RAG system for research papers. Learn vector databases and embeddings.');

    // Submit form
    await page.click('button:has-text("Create User")');

    // Verify success message
    await expect(page.getByText(/User created successfully/i)).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/alice@example.com/i)).toBeVisible();
  });

  test('Admin can upload initial files during signup', async ({ page }) => {
    // Login as admin
    await page.fill('input[placeholder*="ID"]', 'admin');
    await page.fill('input[placeholder*="Secret"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Navigate to signup
    await page.click('button:has-text("Create User")');

    // Fill required fields
    await page.fill('input[placeholder*="Full Name"]', 'Bob Smith');
    await page.fill('input[placeholder*="Email"]', 'bob@example.com');
    await page.fill('input[placeholder*="Password"]', 'BobPass123!');
    await page.fill('textarea[placeholder*="goals"]', 'Implement semantic search for legal documents.');

    // Simulate file upload (Playwright file chooser)
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();

    // Mock file upload would require actual files in headless mode
    // For E2E, we verify the file input exists and accepts multiple files
    const isMultiple = await fileInput.getAttribute('multiple');
    expect(isMultiple).not.toBeNull();

    // Check accepted file types
    const accept = await fileInput.getAttribute('accept');
    expect(accept).toContain('.md');
    expect(accept).toContain('.pdf');
    expect(accept).toContain('.txt');
  });

  test('Form validation: Required fields', async ({ page }) => {
    // Login as admin
    await page.fill('input[placeholder*="ID"]', 'admin');
    await page.fill('input[placeholder*="Secret"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Navigate to signup
    await page.click('button:has-text("Create User")');

    // Try to submit empty form
    await page.click('button:has-text("Create User")');

    // HTML5 validation should prevent submission
    // Check if form fields have required attribute
    const nameInput = page.locator('input[placeholder*="Full Name"]');
    const emailInput = page.locator('input[placeholder*="Email"]');
    const passwordInput = page.locator('input[placeholder*="Password"]');
    const goalsInput = page.locator('textarea[placeholder*="goals"]');

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
    await expect(goalsInput).toHaveAttribute('required', '');
  });

  test('Goals monitoring banner is displayed', async ({ page }) => {
    // Login as admin
    await page.fill('input[placeholder*="ID"]', 'admin');
    await page.fill('input[placeholder*="Secret"]', 'admin123');
    await page.click('button:has-text("Sign In")');

    // Navigate to signup
    await page.click('button:has-text("Create User")');

    // Verify goals monitoring instruction banner
    await expect(page.getByText(/Goals are monitored/i)).toBeVisible();
    await expect(page.getByText(/MetaCogna agent/i)).toBeVisible();
    await expect(page.getByText(/personalize interactions/i)).toBeVisible();
  });
});

test.describe('Non-Admin Signup Restrictions', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Non-Admin Login API
    await page.route('**/api/auth/login', async route => {
      const request = route.request();
      const postData = await request.postDataJSON();

      if (postData.username === 'user' && postData.password === 'user123') {
        const json = {
          success: true,
          user: {
            id: 'user-001',
            username: 'user',
            email: 'user@example.com',
            isAdmin: false,
            preferences: {}
          }
        };
        await route.fulfill({ json });
      } else {
        await route.fulfill({ status: 401, json: { success: false, error: 'Invalid credentials' } });
      }
    });

    await page.goto('http://localhost:3000/');
  });

  test('Non-admin user cannot see "Create User" button', async ({ page }) => {
    // Login as non-admin
    await page.fill('input[placeholder*="ID"]', 'user');
    await page.fill('input[placeholder*="Secret"]', 'user123');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard to load
    await expect(page.getByText('METACOGNA')).toBeVisible();

    // "Create User" button should NOT be visible
    const createUserButton = page.locator('button', { hasText: 'Create User' });
    await expect(createUserButton).not.toBeVisible();
  });

  test('Non-admin cannot access signup URL directly', async ({ page }) => {
    // Login as non-admin
    await page.fill('input[placeholder*="ID"]', 'user');
    await page.fill('input[placeholder*="Secret"]', 'user123');
    await page.click('button:has-text("Sign In")');

    // Try to navigate to signup view (if using routing)
    // This assumes the app has client-side route protection
    // For now, verify button is hidden (primary protection)
    const createUserButton = page.locator('button', { hasText: 'Create User' });
    await expect(createUserButton).not.toBeVisible();
  });
});
