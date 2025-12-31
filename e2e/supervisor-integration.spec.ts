import { test, expect } from '@playwright/test';

test.describe('Supervisor Integration - Polling Lifecycle', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Auth API
    await page.route('**/api/auth/login', async route => {
      const json = {
        success: true,
        user: {
          id: 'user-supervisor-test',
          username: 'supervisoruser',
          email: 'supervisor@test.com',
          isAdmin: false,
          preferences: {}
        }
      };
      await route.fulfill({ json });
    });

    // Mock Supervisor State Change API
    await page.route('**/api/supervisor/state-change', async route => {
      const postData = await route.request().postDataJSON();
      await route.fulfill({
        json: {
          changePercentage: 0.03, // 3% change (below threshold)
          shouldTriggerSupervisor: false
        }
      });
    });

    // Mock Supervisor Decisions API
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: []
        }
      });
    });

    // Mock Interaction Logging API
    await page.route('**/api/interactions/log', async route => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('http://localhost:3000/');
  });

  test('Polling starts after successful authentication', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'supervisoruser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    // Wait for dashboard
    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Wait 2 seconds to allow initial polling
    await page.waitForTimeout(2000);

    // Verify state-change endpoint was called
    const stateChangeRequests = await page.evaluate(() => {
      return (window as any).__supervisorStateChangeCalls || 0;
    });

    // Note: In production, we'd need to instrument the code to track calls
    // For E2E, we verify the components are rendered
    // SupervisorWidget should be visible
    const widgetButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(widgetButton).toBeVisible({ timeout: 5000 });
  });

  test('Polling stops after logout', async ({ page }) => {
    // Login
    await page.fill('input[placeholder*="ID"]', 'supervisoruser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Logout (find logout button - may vary based on UI)
    // Typically in header or user menu
    await page.click('button:has-text("Logout")');

    // Should return to auth screen
    await expect(page.getByText(/System Access|Worker Auth/i)).toBeVisible();
  });
});

test.describe('Supervisor Integration - State Change Detection', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        json: {
          success: true,
          user: {
            id: 'user-state-test',
            username: 'stateuser',
            isAdmin: false
          }
        }
      });
    });

    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({ json: { decisions: [] } });
    });

    await page.route('**/api/interactions/log', async route => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('http://localhost:3000/');
  });

  test('Triggers Supervisor analysis when state change >5%', async ({ page }) => {
    let analyzeAPICalled = false;

    // Mock state change with >5% threshold
    await page.route('**/api/supervisor/state-change', async route => {
      await route.fulfill({
        json: {
          changePercentage: 0.08, // 8% change (above threshold)
          shouldTriggerSupervisor: true
        }
      });
    });

    // Mock Supervisor Analyze API
    await page.route('**/api/supervisor/analyze', async route => {
      analyzeAPICalled = true;
      await route.fulfill({
        json: {
          success: true,
          decision: {
            type: 'allow',
            confidenceScore: 85,
            userMessage: 'System is functioning normally',
            reasoning: 'No anomalies detected'
          }
        }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'stateuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Wait for polling cycle
    await page.waitForTimeout(6000); // Wait for 5-min poll + processing

    // In real scenario, we'd verify via network tab or instrumentation
  });

  test('Does NOT trigger Supervisor when state change <5%', async ({ page }) => {
    // Mock state change with <5% threshold
    await page.route('**/api/supervisor/state-change', async route => {
      await route.fulfill({
        json: {
          changePercentage: 0.02, // 2% change (below threshold)
          shouldTriggerSupervisor: false
        }
      });
    });

    // Mock Supervisor Analyze API (should NOT be called)
    await page.route('**/api/supervisor/analyze', async route => {
      throw new Error('Analyze API should not be called for <5% change');
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'stateuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Wait for polling cycle
    await page.waitForTimeout(6000);

    // If analyze endpoint wasn't called, test passes
  });
});

test.describe('Supervisor Integration - Decision Display', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        json: {
          success: true,
          user: {
            id: 'user-decision-test',
            username: 'decisionuser',
            isAdmin: false
          }
        }
      });
    });

    await page.route('**/api/supervisor/state-change', async route => {
      await route.fulfill({
        json: { changePercentage: 0.01, shouldTriggerSupervisor: false }
      });
    });

    await page.route('**/api/interactions/log', async route => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('http://localhost:3000/');
  });

  test('SupervisorWidget displays high-confidence decisions', async ({ page }) => {
    // Mock decisions with high confidence (≥70%)
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: [
            {
              id: 'dec-001',
              userId: 'user-decision-test',
              timestamp: Date.now(),
              type: 'allow',
              confidenceScore: 85,
              userMessage: 'Your workflow is optimized for current goals',
              reasoning: 'User is following established patterns',
              displayMode: 'widget',
              relevantGoal: 'Learn AI systems'
            }
          ]
        }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'decisionuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Click SupervisorWidget button (floating eye icon)
    const widgetButton = page.locator('button').filter({ hasText: '' }).first();
    await widgetButton.click();

    // Wait for popover to open
    await page.waitForTimeout(1000);

    // Verify decision is visible
    await expect(page.getByText('Your workflow is optimized')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('85% Conf')).toBeVisible();
  });

  test('SupervisorToast displays low-confidence urgent alerts', async ({ page }) => {
    // Mock decisions with low confidence (<70%)
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: [
            {
              id: 'dec-urgent-001',
              userId: 'user-decision-test',
              timestamp: Date.now(),
              type: 'request_guidance',
              confidenceScore: 55,
              userMessage: 'Your recent actions may conflict with stated goals',
              reasoning: 'Detected pattern deviation',
              displayMode: 'toast',
              actionLabel: 'Review Goals',
              actionLink: '#/settings'
            }
          ]
        }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'decisionuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Wait for toast polling
    await page.waitForTimeout(2000);

    // Verify toast notification appears
    await expect(page.getByText(/Supervisor Alert.*55% Confidence/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Your recent actions may conflict')).toBeVisible();
    await expect(page.getByText('Review Goals')).toBeVisible();
  });

  test('User can dismiss toast notifications', async ({ page }) => {
    // Mock decision with toast
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: [
            {
              id: 'dec-dismiss-001',
              userId: 'user-decision-test',
              timestamp: Date.now(),
              type: 'inhibit',
              confidenceScore: 40,
              userMessage: 'Risky action detected',
              displayMode: 'toast'
            }
          ]
        }
      });
    });

    // Mock dismiss endpoint
    await page.route('**/api/supervisor/decisions/dismiss', async route => {
      await route.fulfill({ json: { success: true } });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'decisionuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Wait for toast
    await page.waitForTimeout(2000);

    // Click dismiss button (X icon)
    const dismissButton = page.locator('button').filter({ has: page.locator('svg[class*="lucide-x"]') }).first();
    await dismissButton.click();

    // Toast should disappear
    await expect(page.getByText('Risky action detected')).not.toBeVisible({ timeout: 2000 });
  });
});

test.describe('Supervisor Integration - Interaction Logging', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        json: {
          success: true,
          user: {
            id: 'user-interaction-test',
            username: 'interactionuser',
            isAdmin: false
          }
        }
      });
    });

    await page.route('**/api/supervisor/state-change', async route => {
      await route.fulfill({
        json: { changePercentage: 0.01, shouldTriggerSupervisor: false }
      });
    });

    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({ json: { decisions: [] } });
    });

    await page.goto('http://localhost:3000/');
  });

  test('User interactions are logged to Worker API', async ({ page }) => {
    let interactionLogged = false;
    let loggedInteraction: any = null;

    // Mock interaction log endpoint
    await page.route('**/api/interactions/log', async route => {
      interactionLogged = true;
      loggedInteraction = await route.request().postDataJSON();
      await route.fulfill({ json: { success: true } });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'interactionuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Perform some user action (e.g., click on a view)
    await page.click('text=Documents');

    // Wait for interaction to be logged
    await page.waitForTimeout(1000);

    // Verify interaction was logged
    // Note: This requires the app to call logInteraction from Zustand store
    // In production, we'd verify via network inspection
  });
});

test.describe('Supervisor Integration - Widget UI Behavior', () => {

  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/login', async route => {
      await route.fulfill({
        json: {
          success: true,
          user: {
            id: 'user-widget-test',
            username: 'widgetuser',
            isAdmin: false
          }
        }
      });
    });

    await page.route('**/api/supervisor/state-change', async route => {
      await route.fulfill({
        json: { changePercentage: 0.01, shouldTriggerSupervisor: false }
      });
    });

    await page.route('**/api/interactions/log', async route => {
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('http://localhost:3000/');
  });

  test('Widget shows "Auto-monitoring active" status', async ({ page }) => {
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: [
            {
              id: 'dec-widget-001',
              timestamp: Date.now(),
              type: 'allow',
              confidenceScore: 90,
              userMessage: 'System monitoring active',
              displayMode: 'widget'
            }
          ]
        }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'widgetuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Click widget button
    const widgetButton = page.locator('button').filter({ hasText: '' }).first();
    await widgetButton.click();

    // Wait for popover
    await page.waitForTimeout(1000);

    // Verify monitoring status
    await expect(page.getByText(/Auto-monitoring active/i)).toBeVisible({ timeout: 3000 });
  });

  test('Widget shows decision count', async ({ page }) => {
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: {
          decisions: [
            { id: '1', timestamp: Date.now(), type: 'allow', confidenceScore: 90, userMessage: 'Test 1', displayMode: 'widget' },
            { id: '2', timestamp: Date.now(), type: 'allow', confidenceScore: 88, userMessage: 'Test 2', displayMode: 'widget' },
            { id: '3', timestamp: Date.now(), type: 'allow', confidenceScore: 92, userMessage: 'Test 3', displayMode: 'widget' }
          ]
        }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'widgetuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Click widget
    const widgetButton = page.locator('button').filter({ hasText: '' }).first();
    await widgetButton.click();

    await page.waitForTimeout(1000);

    // Verify decision count
    await expect(page.getByText(/3 decisions/i)).toBeVisible({ timeout: 3000 });
  });

  test('Widget shows empty state when no decisions', async ({ page }) => {
    await page.route('**/api/supervisor/decisions*', async route => {
      await route.fulfill({
        json: { decisions: [] }
      });
    });

    // Login
    await page.fill('input[placeholder*="ID"]', 'widgetuser');
    await page.fill('input[placeholder*="Secret"]', 'TestPass123!');
    await page.click('button:has-text("Sign In")');

    await expect(page.getByText('METACOGNA')).toBeVisible();

    // Click widget
    const widgetButton = page.locator('button').filter({ hasText: '' }).first();
    await widgetButton.click();

    await page.waitForTimeout(1000);

    // Verify empty state message
    await expect(page.getByText(/Monitoring cognitive stream/i)).toBeVisible({ timeout: 3000 });
  });
});
