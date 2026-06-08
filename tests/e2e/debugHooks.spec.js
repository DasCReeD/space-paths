import { test, expect } from '@playwright/test';

test.describe('Space Paths Level Editor Debug Hooks', () => {
  test('should expose window.__editorDebug and trigger events', async ({ page }) => {
    // Navigate to level editor page
    await page.goto('/editor.html');

    // Wait for the app to initialize
    await page.waitForFunction(() => typeof window.__editorDebug !== 'undefined');

    // Get current tool from debug object
    const tool = await page.evaluate(() => window.__editorDebug.currentTool);
    expect(tool).toBe('pen');

    // Get metadata from debug object
    const meta = await page.evaluate(() => window.__editorDebug.loadedLevelMetadata);
    expect(meta.name).toBe('Custom Road');
    expect(meta.author).toBe('Designer');

    // Check callbacks and custom triggers
    const rebuildCalled = await page.evaluate(async () => {
      let resolve;
      const promise = new Promise(r => resolve = r);
      
      window.__editorDebug.on('viewportRebuild', (data) => {
        if (data.step === 'rebuildHelperGrid') {
          resolve(true);
        }
      });

      // Trigger a change that causes viewport rebuild, e.g. changing slice heights
      // Simulating PageDown key press or changing active plane height via ArrowUp keydown
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));

      // Wait up to 1 second
      const timeout = setTimeout(() => resolve(false), 1000);
      const result = await promise;
      clearTimeout(timeout);
      return result;
    });

    expect(rebuildCalled).toBe(true);
  });
});
