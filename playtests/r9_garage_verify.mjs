// r9: Re-verify the two remaining FAILs from r8:
//  1) PAINT category rows (legacy .color-preset-option width:32px collapsing rows to circles)
//  2) Mobile (390x844) overlay-header title/BACK-button overlap on Garage + Level Select
// Connects to isolated vite instance on port 5199 (NOT the user's 3000/3001 dev server).
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5199';
const OUT = 'c:\\dev\\Sky roads\\playtests\\';

function shot(page, name) {
  return page.screenshot({ path: OUT + name });
}

async function openGarage(page) {
  await page.evaluate(() => {
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

const VIEWPORTS = [
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 }
];

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
    await shot(page, `r9_garage_${vpKey}_default.png`);

    // ---- FIX 2: mobile header overlap (Garage) ----
    results[vpKey].garage_title_glyph = await textGlyphRect(page, '#ship-picker-screen .screen-title');
    results[vpKey].garage_back_btn_rect = await rectOf(page, '#btn-picker-back');
    results[vpKey].garage_back_vs_title_overlap = rectsOverlap(results[vpKey].garage_title_glyph, results[vpKey].garage_back_btn_rect);
    results[vpKey].garage_gear_rect = await rectOf(page, '.btn-settings-gear-trigger');
    results[vpKey].garage_back_vs_gear_overlap = rectsOverlap(results[vpKey].garage_back_btn_rect, results[vpKey].garage_gear_rect);
    results[vpKey].garage_header_rect = await rectOf(page, '#ship-picker-screen .overlay-header');
    results[vpKey].garage_header_flex_direction = await page.evaluate(() => {
      const el = document.querySelector('#ship-picker-screen .overlay-header');
      return el ? getComputedStyle(el).flexDirection : null;
    });

    // ---- FIX 1: PAINT rows ----
    // HULL -> SKIN -> PAINT (2x ArrowRight)
    await pressKey(page, 'ArrowRight', 2, 350);
    await shot(page, `r9_garage_${vpKey}_paint.png`);
    results[vpKey].active_category = await page.evaluate(() => {
      const ctrl = window.gameManagerInstance.crossbarControllers['ship-picker-screen'];
      return ctrl && ctrl.activeCategory ? ctrl.activeCategory.id : null;
    });
    results[vpKey].paint_rows = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      if (!track) return { found: false };
      const items = Array.from(track.querySelectorAll('.garage-item'));
      return {
        found: true, count: items.length,
        rows: items.map(el => {
          const r = el.getBoundingClientRect();
          const thumb = el.querySelector('.garage-item-thumb');
          const tr = thumb ? thumb.getBoundingClientRect() : null;
          const cs = getComputedStyle(el);
          return {
            name: el.querySelector('.garage-item-name')?.textContent.trim() || null,
            focused: !!el.querySelector('.xmb-item-label'),
            width: r.width, height: r.height, borderRadius: cs.borderRadius,
            thumbWidth: tr ? tr.width : null, thumbHeight: tr ? tr.height : null,
            left: r.left, right: r.right, top: r.top, bottom: r.bottom
          };
        })
      };
    });
    // Compare to a HULL row's width/height for "same row size as HULL/SKIN" check
    await pressKey(page, 'ArrowLeft', 2, 350); // back to HULL
    results[vpKey].hull_row_sample = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-hull');
      if (!track) return { found: false };
      const el = track.querySelector('.garage-item');
      if (!el) return { found: false };
      const r = el.getBoundingClientRect();
      return { found: true, width: r.width, height: r.height };
    });

    // Re-enter PAINT to test Up/Down nav + CUSTOM COLOR row
    await pressKey(page, 'ArrowRight', 2, 350);
    results[vpKey].paint_focused_before = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      const focused = track ? track.querySelector('.garage-item:has(.xmb-item-label) .garage-item-name')?.textContent.trim() : null;
      return focused;
    });
    await pressKey(page, 'ArrowDown', 1, 350);
    results[vpKey].paint_focused_after_down1 = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      const focused = track ? track.querySelector('.garage-item:has(.xmb-item-label) .garage-item-name')?.textContent.trim() : null;
      return focused;
    });
    await shot(page, `r9_garage_${vpKey}_paint_down1.png`);

    // Walk to the end to find CUSTOM COLOR row and confirm it renders as a normal row
    for (let i = 0; i < 12; i++) await pressKey(page, 'ArrowDown', 1, 120);
    await shot(page, `r9_garage_${vpKey}_paint_end.png`);
    results[vpKey].paint_focused_at_end = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      const focused = track ? track.querySelector('.garage-item:has(.xmb-item-label) .garage-item-name')?.textContent.trim() : null;
      return focused;
    });
    results[vpKey].custom_color_row = await page.evaluate(() => {
      const track = document.getElementById('garage-item-track-paint');
      if (!track) return { found: false };
      const items = Array.from(track.querySelectorAll('.garage-item'));
      const custom = items.find(el => /custom/i.test(el.querySelector('.garage-item-name')?.textContent || ''));
      if (!custom) return { found: false };
      const r = custom.getBoundingClientRect();
      return { found: true, width: r.width, height: r.height, name: custom.querySelector('.garage-item-name').textContent.trim() };
    });

    // Reset back to HULL category for cleanliness
    await pressKey(page, 'ArrowLeft', 2, 350);

    // ---- Regression: Level Select header at 390x844 ----
    if (vpKey === '390x844') {
      await page.evaluate(() => { window.gameManagerInstance.showLevelSelection('standard'); });
      await new Promise(r => setTimeout(r, 800));
      await shot(page, `r9_level_${vpKey}_default.png`);
      results[vpKey].level_title_glyph = await textGlyphRect(page, '#level-screen .screen-title');
      results[vpKey].level_back_btn_rect = await rectOf(page, '#btn-level-back');
      results[vpKey].level_back_vs_title_overlap = rectsOverlap(results[vpKey].level_title_glyph, results[vpKey].level_back_btn_rect);
      results[vpKey].level_header_flex_direction = await page.evaluate(() => {
        const el = document.querySelector('#level-screen .overlay-header');
        return el ? getComputedStyle(el).flexDirection : null;
      });
    }
  }

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
