import { test, expect } from '@playwright/test';

test.describe('Environment Variable Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
  });

  test('shows environment indicator when VITE_GEMINI_API_KEY is set', async ({ page }) => {
    // Skip if env var is not set (local dev without .env.production)
    const hasEnvVar = process.env.VITE_GEMINI_API_KEY !== undefined;

    if (!hasEnvVar) {
      test.skip();
      return;
    }

    // Login first (assuming we have a test user)
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForSelector('text=/Dashboard|Settings/i');

    // Navigate to Settings
    await page.click('button:has-text("Settings")');

    // Click on LLM tab
    await page.click('button:has-text("Model Intelligence")');

    // Select Google provider
    await page.click('button:has-text("google")');

    // Wait for environment detection to run
    await page.waitForTimeout(500);

    // Should show "Loaded from Environment Variable" message
    await expect(page.locator('text=Loaded from Environment Variable')).toBeVisible();

    // Should show green check icon
    await expect(page.locator('.bg-green-50 .text-green-600')).toBeVisible();

    // Should NOT show password input field
    await expect(page.locator('input[type="password"][placeholder*="AIza"]')).not.toBeVisible();
  });

  test('shows input field when no env var exists', async ({ page }) => {
    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForSelector('text=/Dashboard|Settings/i');

    // Navigate to Settings
    await page.click('button:has-text("Settings")');

    // Click on LLM tab
    await page.click('button:has-text("Model Intelligence")');

    // Select OpenAI provider (assuming no VITE_OPENAI_API_KEY in test env)
    await page.click('button:has-text("openai")');

    // Wait for UI update
    await page.waitForTimeout(500);

    // Should show password input if no env var
    const hasOpenAIEnvVar = process.env.VITE_OPENAI_API_KEY !== undefined;

    if (!hasOpenAIEnvVar) {
      // Should show input field
      await expect(page.locator('input[type="password"][placeholder*="sk-"]')).toBeVisible();

      // Should NOT show environment indicator
      await expect(page.locator('text=Loaded from Environment Variable')).not.toBeVisible();
    } else {
      // Should show environment indicator
      await expect(page.locator('text=Loaded from Environment Variable')).toBeVisible();
    }
  });

  test('does not save env vars to localStorage', async ({ page }) => {
    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await page.waitForSelector('text=/Dashboard|Settings/i');

    // Navigate to Settings
    await page.click('button:has-text("Settings")');

    // Click on LLM tab
    await page.click('button:has-text("Model Intelligence")');

    // Get current localStorage
    const apiKeys = await page.evaluate(() => {
      return localStorage.getItem('metacogna_api_keys');
    });

    const parsedKeys = apiKeys ? JSON.parse(apiKeys) : {};

    // If environment variable is set, it should NOT be in localStorage
    if (process.env.VITE_GEMINI_API_KEY) {
      // localStorage should not have the full env var value
      expect(parsedKeys.google).not.toBe(process.env.VITE_GEMINI_API_KEY);
    }

    if (process.env.VITE_OPENAI_API_KEY) {
      expect(parsedKeys.openai).not.toBe(process.env.VITE_OPENAI_API_KEY);
    }

    if (process.env.VITE_ANTHROPIC_API_KEY) {
      expect(parsedKeys.anthropic).not.toBe(process.env.VITE_ANTHROPIC_API_KEY);
    }
  });

  test('shows correct preview for environment variable', async ({ page }) => {
    const hasGeminiKey = process.env.VITE_GEMINI_API_KEY !== undefined;

    if (!hasGeminiKey) {
      test.skip();
      return;
    }

    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');

    await page.waitForSelector('text=/Dashboard|Settings/i');
    await page.click('button:has-text("Settings")');
    await page.click('button:has-text("Model Intelligence")');
    await page.click('button:has-text("google")');

    await page.waitForTimeout(500);

    // Should show first 7 characters + "..."
    const previewText = await page.locator('.bg-green-50 .font-bold').last().textContent();

    expect(previewText).toMatch(/^.{7}\.\.\./);
    expect(previewText).toContain('...');
  });

  test('environment detection runs on tab switch', async ({ page }) => {
    // Login
    await page.fill('input[type="text"]', 'testuser');
    await page.fill('input[type="password"]', 'testpassword');
    await page.click('button:has-text("Sign In")');

    await page.waitForSelector('text=/Dashboard|Settings/i');
    await page.click('button:has-text("Settings")');

    // Switch to different tab first
    await page.click('button:has-text("Data Vaults")');
    await page.waitForTimeout(200);

    // Then switch to LLM tab - detection should run
    await page.click('button:has-text("Model Intelligence")');
    await page.waitForTimeout(500);

    // If Google is default provider and env var is set, should see indicator
    const hasGeminiKey = process.env.VITE_GEMINI_API_KEY !== undefined;
    const currentProvider = await page.evaluate(() => {
      const config = localStorage.getItem('metacogna-store');
      if (!config) return null;
      const parsed = JSON.parse(config);
      return parsed?.state?.config?.llm?.provider;
    });

    if (hasGeminiKey && currentProvider === 'google') {
      await expect(page.locator('text=Loaded from Environment Variable')).toBeVisible();
    }
  });
});
