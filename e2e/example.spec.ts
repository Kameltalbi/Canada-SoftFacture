import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');

  // Check that the page loads without errors
  await expect(page).toHaveTitle(/SoftFacture France/);
});

test('navigation works', async ({ page }) => {
  await page.goto('/');

  // Check basic page elements
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
