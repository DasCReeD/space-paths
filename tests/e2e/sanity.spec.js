import { test, expect } from '@playwright/test';

test.describe('Space Paths Level Editor Sanity', () => {
  test('should load the Level Editor page successfully', async ({ page }) => {
    // Navigate to the level editor page
    await page.goto('/editor.html');

    // Verify page title
    await expect(page).toHaveTitle('Space Paths Hybrid Level Editor');

    // Verify presence of basic layout elements
    const editorContainer = page.locator('.editor-container');
    await expect(editorContainer).toBeVisible();

    // Verify canvas viewport containers are present
    const canvasTop = page.locator('#canvas-top');
    const canvasFront = page.locator('#canvas-front');
    const canvasSide = page.locator('#canvas-side');
    const canvas3d = page.locator('#canvas-3d');

    await expect(canvasTop).toBeVisible();
    await expect(canvasFront).toBeVisible();
    await expect(canvasSide).toBeVisible();
    await expect(canvas3d).toBeVisible();
  });
});
