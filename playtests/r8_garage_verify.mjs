// r8: Verify the Garage overhaul (vertical list nav, model preview fit-scale,
// container height fit) against data/desigh_review.md. Connects to isolated
// vite instance on port 5199 (NOT the user's 3000/3001 dev server).
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5199';
const OUT = 'c:\\dev\\Sky roads\\playtests\\';

function shot(page, name) {
  return page.screenshot({ path: OUT + name });
}

async function openGarage(page) {
  await page.evaluate(() => {
    // openShipPicker() (not bare showScreen) is required: it lazily
    // constructs/inits this.previewEngine (ShipPreviewEngine) against
    // #ship-preview-container. showScreen alone leaves the preview blank.
    window.gameManagerInstance.openShipPicker();
  });
  await new Promise(r => setTimeout(r, 800));
}

async function pressKey(page, key, times = 1, delay = 220) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await new Promise(r => setTimeout(r, delay));
  }
}

async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { found: true, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, opacity: cs.opacity, text: el.textContent.trim() };
  }, sel);
}

async function textGlyphRect(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    let textNode = null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) {
      if (n.textContent.trim().length > 0) { textNode = n; break; }
    }
    if (!textNode) return { found: false, reason: 'no-text-node' };
    const range = document.createRange();
    range.selectNodeContents(textNode);
    const rects = range.getClientRects();
    if (rects.length === 0) return { found: false, reason: 'no-rects' };
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const r of rects) {
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
    }
    return { found: true, left, right, top, bottom, text: textNode.textContent.trim() };
  }, sel);
}

function rectsOverlap(a, b) {
  if (!a || !b || !a.found || !b.found) return null;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

async function getHullRows(page) {
  return page.evaluate(() => {
    const track = document.getElementById('garage-item-track-hull');
    if (!track) return { found: false };
    const items = Array.from(track.querySelectorAll('.garage-item'));
    return {
      found: true,
      trackRect: (() => { const r = track.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right }; })(),
      items: items.map(el => {
        const r = el.getBoundingClientRect();
        const nameEl = el.querySelector('.garage-item-name');
        return {
          model: el.getAttribute('data-model'),
          name: nameEl ? nameEl.textContent.trim() : null,
          focused: !!el.querySelector('.xmb-item-label'),
          top: r.top, bottom: r.bottom, left: r.left, right: r.right,
          opacity: getComputedStyle(el).opacity
        };
      })
    };
  });
}

async function canvasHasContent(page) {
  return page.evaluate(() => {
    const container = document.getElementById('ship-preview-container');
    if (!container) return { found: false };
    const canvas = container.querySelector('canvas');
    if (!canvas) return { found: false, reason: 'no-canvas' };
    const r = canvas.getBoundingClientRect();
    // Sample pixels via a temp 2D canvas read of the WebGL canvas (toDataURL works for non-tainted canvases)
    let nonEmptyPixelRatio = null;
    try {
      const tmp = document.createElement('canvas');
      tmp.width = canvas.width; tmp.height = canvas.height;
      const ctx = tmp.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      const data = ctx.getImageData(0, 0, tmp.width, tmp.height).data;
      let nonBg = 0;
      const total = data.length / 4;
      // sample every 17th pixel for speed
      for (let i = 0; i < data.length; i += 4 * 17) {
        const r2 = data[i], g = data[i+1], b = data[i+2];
        if (r2 > 12 || g > 12 || b > 12) nonBg++;
      }
      nonEmptyPixelRatio = nonBg / (total / 17);
    } catch (e) {
      nonEmptyPixelRatio = 'error: ' + e.message;
    }
    return { found: true, rect: { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height }, nonEmptyPixelRatio };
  });
}

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '1366x768', width: 1366, height: 768 },
  { name: '390x844', width: 390, height: 844 }
];

const HULL_MODELS = ['original', 'hauler', 'scout', 'dreadnought', 'cruiser', 'racer', 'hovdi'];

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));
  page.on('console', msg => { if (/error/i.test(msg.type())) console.log('[CONSOLE]', msg.type(), msg.text()); });

  const results = {};

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    if (vp === VIEWPORTS[0]) {
      await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
    } else {
      await page.reload({ waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1500));
    }

    const vpKey = vp.name;
    results[vpKey] = {};

    await openGarage(page);
    await new Promise(r => setTimeout(r, 600));
    await shot(page, `r8_garage_${vpKey}_default.png`);

    // Title check
    results[vpKey].title_rect = await rectOf(page, '#ship-picker-screen .screen-title');
    results[vpKey].title_glyph = await textGlyphRect(page, '#ship-picker-screen .screen-title');
    results[vpKey].gear_rect = await rectOf(page, '.btn-settings-gear-trigger');
    results[vpKey].back_btn_rect = await rectOf(page, '#btn-picker-back');
    results[vpKey].title_vs_gear_overlap = rectsOverlap(results[vpKey].title_glyph, results[vpKey].gear_rect);
    results[vpKey].back_vs_gear_overlap = rectsOverlap(results[vpKey].back_btn_rect, results[vpKey].gear_rect);
    results[vpKey].viewport_height = vp.height;
    results[vpKey].title_visible_in_viewport = results[vpKey].title_rect.found && results[vpKey].title_rect.top >= 0 && results[vpKey].title_rect.bottom <= vp.height;

    // Container height check
    results[vpKey].container_rect = await rectOf(page, '.ship-picker-container');

    // HULL rows walk (default = HULL category active)
    results[vpKey].hull_rows_step0 = await getHullRows(page);

    // Preview check for model 0 (original)
    results[vpKey].preview_step0 = await canvasHasContent(page);

    // Walk Down through all 7 hull items, checking each step
    const hullSteps = [];
    for (let i = 1; i < HULL_MODELS.length; i++) {
      await pressKey(page, 'ArrowDown', 1, 350);
      const rows = await getHullRows(page);
      const preview = await canvasHasContent(page);
      hullSteps.push({ step: i, expectedModel: HULL_MODELS[i], rows, preview });
      if (vpKey === '1920x1080') await shot(page, `r8_hull_step${i}_${HULL_MODELS[i]}.png`);
    }
    results[vpKey].hull_walk = hullSteps;

    // Switch to SKIN category (Right arrow)
    await pressKey(page, 'ArrowRight', 1, 350);
    await shot(page, `r8_garage_${vpKey}_skin.png`);
    results[vpKey].skin_rows = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-skin');
      if (!track) return { found: false };
      const items = Array.from(track.querySelectorAll('.garage-item'));
      return { found: true, count: items.length, names: items.map(el => el.querySelector('.garage-item-name')?.textContent.trim() || null) };
    });
    const activeCatSkin = await page.evaluate(() => {
      const ctrl = window.gameManagerInstance.crossbarControllers['ship-picker-screen'];
      return ctrl && ctrl.activeCategory ? ctrl.activeCategory.id : null;
    });
    results[vpKey].active_category_after_1_right = activeCatSkin;

    // Switch to PAINT category (Right arrow again)
    await pressKey(page, 'ArrowRight', 1, 350);
    await shot(page, `r8_garage_${vpKey}_paint.png`);
    results[vpKey].active_category_after_2_right = await page.evaluate(() => {
      const ctrl = window.gameManagerInstance.crossbarControllers['ship-picker-screen'];
      return ctrl && ctrl.activeCategory ? ctrl.activeCategory.id : null;
    });
    results[vpKey].paint_rows = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      if (!track) return { found: false };
      const items = Array.from(track.querySelectorAll('.garage-item'));
      return {
        found: true, count: items.length,
        rows: items.map(el => ({
          name: el.querySelector('.garage-item-name')?.textContent.trim() || null,
          hasSwatch: !!el.querySelector('.garage-item-thumb'),
          bg: el.style.background || null
        }))
      };
    });

    // Move down within PAINT to verify single-row movement + centering
    const paintStep1Rows = await getHullRows(page); // reuse generic structure via direct query below
    results[vpKey].paint_before_down = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      const focused = track ? track.querySelector('.garage-item:has(.xmb-item-label) .garage-item-name')?.textContent.trim() : null;
      return focused;
    });
    await pressKey(page, 'ArrowDown', 1, 350);
    results[vpKey].paint_after_down = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      const focused = track ? track.querySelector('.garage-item:has(.xmb-item-label) .garage-item-name')?.textContent.trim() : null;
      return focused;
    });
    await shot(page, `r8_garage_${vpKey}_paint_down1.png`);

    // Go back to HULL (Left, Left) for clean state
    await pressKey(page, 'ArrowLeft', 2, 350);
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
