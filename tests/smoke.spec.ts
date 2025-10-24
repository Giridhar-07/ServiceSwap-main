import { test, expect } from '@playwright/test';

// Minimal smoke test: verify top navigation renders on production preview
// Uses direct URL without relying on Playwright webServer config

test('smoke navigation: Features link is visible', async ({ page }) => {
  await page.goto('http://localhost:4173/', { waitUntil: 'domcontentloaded' });
  const featuresLink = page.getByRole('link', { name: /Features/i });
  await expect(featuresLink).toBeVisible();
});