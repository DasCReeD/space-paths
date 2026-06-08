import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to paint a cell using normalized coordinates based on active camera pan
async function paintCellAt(page, viewportName, lane, row) {
  // Wait for editor debug to be ready
  await page.waitForFunction(() => typeof window.__editorDebug !== 'undefined');
  
  await page.evaluate(({ viewportName, lane, row }) => {
    const debug = window.__editorDebug;
    if (!debug) {
      throw new Error("window.__editorDebug is undefined inside evaluate!");
    }
    const wrapper = document.getElementById(`canvas-${viewportName}`);
    const rect = wrapper.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    
    // Retrieve current viewport camera coordinates for panning offset
    const cameras = debug.getViewportCameras();
    const panX = cameras[viewportName].position.x;
    const panZ = cameras[viewportName].position.z;
    
    // Compute intersection coordinate relative to tile scale
    const intersectionX = (lane - 3) * 2.0;
    const intersectionZ = -row * 4.0 - 2.0;
    
    // Convert to normalized mouse space [-1, 1]
    const mouseX = (intersectionX - panX) / (15.0 * aspect);
    const mouseY = (panZ - intersectionZ) / 15.0;
    
    // Convert to clientX and clientY
    const clientX = rect.left + (mouseX + 1.0) * rect.width / 2.0;
    const clientY = rect.top + (1.0 - mouseY) * rect.height / 2.0;
    
    // Dispatch events
    const downEvent = new MouseEvent('mousedown', { button: 0, bubbles: true, clientX, clientY });
    const upEvent = new MouseEvent('mouseup', { button: 0, bubbles: true, clientX, clientY });
    
    wrapper.dispatchEvent(downEvent);
    wrapper.dispatchEvent(upEvent);
  }, { viewportName, lane, row });
}

// Helper to drag from one cell to another (for line & marquee selections)
async function dragCellTo(page, viewportName, startLane, startRow, endLane, endRow) {
  // Wait for editor debug to be ready
  await page.waitForFunction(() => typeof window.__editorDebug !== 'undefined');

  await page.evaluate(({ viewportName, startLane, startRow, endLane, endRow }) => {
    const debug = window.__editorDebug;
    if (!debug) {
      throw new Error("window.__editorDebug is undefined inside evaluate!");
    }
    const wrapper = document.getElementById(`canvas-${viewportName}`);
    const rect = wrapper.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    
    // Retrieve current viewport camera coordinates for panning offset
    const cameras = debug.getViewportCameras();
    const panX = cameras[viewportName].position.x;
    const panZ = cameras[viewportName].position.z;
    
    const getClientCoords = (l, r) => {
      const intersectionX = (l - 3) * 2.0;
      const intersectionZ = -r * 4.0 - 2.0;
      const mouseX = (intersectionX - panX) / (15.0 * aspect);
      const mouseY = (panZ - intersectionZ) / 15.0;
      const clientX = rect.left + (mouseX + 1.0) * rect.width / 2.0;
      const clientY = rect.top + (1.0 - mouseY) * rect.height / 2.0;
      return { clientX, clientY };
    };

    const start = getClientCoords(startLane, startRow);
    const end = getClientCoords(endLane, endRow);

    // Dispatch mousedown at start
    wrapper.dispatchEvent(new MouseEvent('mousedown', {
      button: 0,
      bubbles: true,
      clientX: start.clientX,
      clientY: start.clientY
    }));

    // Dispatch mousemove at end
    wrapper.dispatchEvent(new MouseEvent('mousemove', {
      button: 0,
      bubbles: true,
      clientX: end.clientX,
      clientY: end.clientY
    }));

    // Dispatch mouseup at end on window
    window.dispatchEvent(new MouseEvent('mouseup', {
      button: 0,
      bubbles: true,
      clientX: end.clientX,
      clientY: end.clientY
    }));
  }, { viewportName, startLane, startRow, endLane, endRow });
}

test.describe('Space Paths Hybrid Level Editor E2E Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Print page console messages
    page.on('console', msg => console.log(`PAGE LOG [${msg.type()}]:`, msg.text()));
    
    // Automatically accept any dialogs (e.g. autosave restore)
    page.on('dialog', async dialog => {
      console.log(`DIALOG POPUP: [${dialog.type()}] "${dialog.message()}"`);
      await dialog.dismiss();
    });

    // Navigate to Level Editor and wait for initialize
    await page.goto('/editor.html');
    await page.waitForFunction(() => typeof window.__editorDebug !== 'undefined');
  });

  test('should verify orthogonal viewports visibility and non-zero dimensions', async ({ page }) => {
    const viewports = ['canvas-top', 'canvas-front', 'canvas-side', 'canvas-3d'];
    for (const id of viewports) {
      const el = page.locator(`#${id}`);
      await expect(el).toBeVisible();
      
      const box = await el.boundingBox();
      expect(box).not.toBeNull();
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });

  test('should test drawing mutations (pen, line, and fill tools)', async ({ page }) => {
    // 1. Pen tool painting
    await page.locator('#tool-pen').click();
    await paintCellAt(page, 'top', 3, 2);
    
    let cell = await page.evaluate(() => window.__editorDebug.level.rows[2][3]);
    expect(cell).not.toBeNull();
    expect(cell.type).toBe('road');

    // 2. Line tool painting
    await page.locator('#tool-line').click();
    await dragCellTo(page, 'top', 3, 3, 3, 5);

    let cells = await page.evaluate(() => [
      window.__editorDebug.level.rows[3][3],
      window.__editorDebug.level.rows[4][3],
      window.__editorDebug.level.rows[5][3]
    ]);
    expect(cells.every(c => c !== null && c.type === 'road')).toBe(true);

    // 3. Fill tool erasure (using delete/hole brush)
    await page.locator('#tool-fill').click();
    await page.locator('.brush-btn[data-brush-type="hole"]').click();
    await paintCellAt(page, 'top', 3, 4);

    cells = await page.evaluate(() => [
      window.__editorDebug.level.rows[3][3],
      window.__editorDebug.level.rows[4][3],
      window.__editorDebug.level.rows[5][3]
    ]);
    expect(cells.every(c => c === null)).toBe(true);

    // 4. Fill tool painting (using obstacle-full brush)
    // First repaint the lines
    await page.locator('#tool-pen').click();
    await page.locator('.brush-btn[data-brush-type="road"]').click();
    await paintCellAt(page, 'top', 3, 3);
    await paintCellAt(page, 'top', 3, 4);
    await paintCellAt(page, 'top', 3, 5);

    await page.locator('#tool-fill').click();
    await page.locator('.brush-btn[data-brush-type="obstacle-full"]').click();
    await paintCellAt(page, 'top', 3, 4);

    cells = await page.evaluate(() => [
      window.__editorDebug.level.rows[3][3],
      window.__editorDebug.level.rows[4][3],
      window.__editorDebug.level.rows[5][3]
    ]);
    expect(cells.every(c => c !== null && c.type === 'obstacle-full')).toBe(true);
  });

  test('should test marquee selection, duplication, and nudge translation', async ({ page }) => {
    // Make sure we have painted cells to select
    await page.locator('#tool-pen').click();
    await page.locator('.brush-btn[data-brush-type="obstacle-full"]').click();
    await paintCellAt(page, 'top', 3, 3);
    await paintCellAt(page, 'top', 3, 4);

    // Select Marquee tool and drag selection
    await page.locator('#tool-marquee').click();
    await dragCellTo(page, 'top', 3, 3, 3, 4);

    // Assert selection boundaries
    let bounds = await page.evaluate(() => window.__editorDebug.selectionBoundingBoxes);
    expect(bounds).toEqual({ minLane: 3, maxLane: 3, minRow: 3, maxRow: 4 });

    // Trigger duplication via Ctrl+D
    await page.keyboard.press('Control+d');

    // Assert selection shifted
    bounds = await page.evaluate(() => window.__editorDebug.selectionBoundingBoxes);
    expect(bounds).toEqual({ minLane: 3, maxLane: 3, minRow: 4, maxRow: 5 });

    // Assert cell at row 5 was duplicated/painted
    let cellAtRow5 = await page.evaluate(() => window.__editorDebug.level.rows[5][3]);
    expect(cellAtRow5).not.toBeNull();
    expect(cellAtRow5.type).toBe('obstacle-full');

    // Nudge selection to the right using ArrowRight
    await page.keyboard.press('ArrowRight');

    // Assert selection shifted lane
    bounds = await page.evaluate(() => window.__editorDebug.selectionBoundingBoxes);
    expect(bounds).toEqual({ minLane: 4, maxLane: 4, minRow: 4, maxRow: 5 });

    // Assert old positions are now null/hole
    let oldCells = await page.evaluate(() => [
      window.__editorDebug.level.rows[4][3],
      window.__editorDebug.level.rows[5][3]
    ]);
    expect(oldCells.every(c => c === null)).toBe(true);

    // Assert new positions are painted
    let newCells = await page.evaluate(() => [
      window.__editorDebug.level.rows[4][4],
      window.__editorDebug.level.rows[5][4]
    ]);
    expect(newCells.every(c => c !== null && c.type === 'obstacle-full')).toBe(true);
  });

  test('should test cooked level loading with fallback naming and status bar row updates', async ({ page }) => {
    // Write a temporary cooked level JSON
    const tempCookedPath = path.join(__dirname, 'temp_cooked_level.json');
    const dummyCooked = {
      level_index: 88,
      author: "Playwright E2E",
      parTime: 42,
      biome: 3,
      gravity: 5,
      fuel: 120,
      oxygen: 80,
      rows: Array(15).fill(null).map(() => Array(7).fill(null))
    };
    fs.writeFileSync(tempCookedPath, JSON.stringify(dummyCooked, null, 2));

    try {
      // Trigger load file input
      await page.setInputFiles('#file-loader', tempCookedPath);

      // Wait for status message or level name update in loaded level metadata
      await page.waitForFunction(() => window.__editorDebug.loadedLevelMetadata.name === 'Level 88');

      // Assert fallback name was set correctly
      const meta = await page.evaluate(() => window.__editorDebug.loadedLevelMetadata);
      expect(meta.name).toBe('Level 88');
      expect(meta.author).toBe('Playwright E2E');
      expect(meta.rowsCount).toBe(15);

      // Assert status bar shows correct row count
      const statusText = await page.locator('#status-length').innerText();
      expect(statusText).toBe('15 Rows');
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempCookedPath)) {
        fs.unlinkSync(tempCookedPath);
      }
    }
  });

  test('should test camera scrubbing via PageUp/PageDown keys and mouse panning', async ({ page }) => {
    // 1. Camera scrubbing via keyboard keys
    const getZPan = async () => page.evaluate(() => window.__editorDebug.getViewportCameras().top.position.z);
    
    const initialZ = await getZPan();
    expect(initialZ).toBe(-40);

    // Press PageUp
    await page.keyboard.press('PageUp');
    let updatedZ = await getZPan();
    expect(updatedZ).toBe(-60);

    // Press PageDown
    await page.keyboard.press('PageDown');
    updatedZ = await getZPan();
    expect(updatedZ).toBe(-40);

    // 2. Mouse panning with Shift + Left Click on top viewport
    const getCamPan = async () => page.evaluate(() => {
      const cams = window.__editorDebug.getViewportCameras();
      return { x: cams.top.position.x, z: cams.top.position.z };
    });

    const beforePan = await getCamPan();

    await page.evaluate(() => {
      const wrapper = document.getElementById('canvas-top');
      const rect = wrapper.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;

      // dispatch mousedown with Shift key
      wrapper.dispatchEvent(new MouseEvent('mousedown', {
        button: 0,
        shiftKey: true,
        bubbles: true,
        clientX: startX,
        clientY: startY
      }));

      // dispatch mousemove
      window.dispatchEvent(new MouseEvent('mousemove', {
        button: 0,
        shiftKey: true,
        bubbles: true,
        clientX: startX + 100,
        clientY: startY + 100
      }));

      // dispatch mouseup
      window.dispatchEvent(new MouseEvent('mouseup', {
        button: 0,
        bubbles: true,
        clientX: startX + 100,
        clientY: startY + 100
      }));
    });

    const afterPan = await getCamPan();
    // Panning should change camera position x and/or z
    expect(afterPan.x !== beforePan.x || afterPan.z !== beforePan.z).toBe(true);
  });

});
