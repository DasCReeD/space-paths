// r6: Re-verify two phone-width (390x844) fixes from r5:
// 1. Level Select "Levels 1-10" category label clipping (mobile focal-x override removed,
//    phones now use desktop 27% focal-x; only --xmb-item-y:38% differs on mobile).
// 2. Title overlapping corner icons (.logo-text -> 1.6rem, .status-title -> 1.2rem on mobile).
// Also re-checks 1920x1080 PS3 focal geometry is unaffected (regression sanity).
// Connects to an isolated vite instance on port 5199 (NOT the user's 3000/3001).
import puppeteer from 'puppeteer';

const BASE = 'http://localhost:5199';
const OUT = 'c:\\dev\\Sky roads\\playtests\\';

function shot(page, name) {
  return page.screenshot({ path: OUT + name });
}

async function showScreen(page, id) {
  await page.evaluate((id) => {
    window.gameManagerInstance.showScreen(id);
  }, id);
  await new Promise(r => setTimeout(r, 300));
}

async function press(page, key, times = 1, delay = 220) {
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
    return { found: true, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  }, sel);
}

// Measure the TRUE glyph bounds of a category/item label via Range on its text node,
// not the parent box (which is width:200px;text-align:center and routinely extends
// off-screen at narrow viewports even when the glyphs are fully visible). See memory:
// xmb-layout-pitfalls finding #15.
async function textGlyphRect(page, labelSel) {
  return page.evaluate((labelSel) => {
    const el = document.querySelector(labelSel);
    if (!el) return { found: false };
    // find first text node with non-whitespace content
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
    return { found: true, left, right, top, bottom, text: textNode.textContent };
  }, labelSel);
}

async function checkOverlap(page, selA, selB) {
  return page.evaluate((selA, selB) => {
    const a = document.querySelector(selA);
    const b = document.querySelector(selB);
    if (!a || !b) return { found: false, a: !!a, b: !!b };
    const ra = a.getBoundingClientRect();
    const rb = b.getBoundingClientRect();
    const aHidden = getComputedStyle(a).display === 'none' || (ra.width === 0 && ra.height === 0);
    const bHidden = getComputedStyle(b).display === 'none' || (rb.width === 0 && rb.height === 0);
    const overlap = !aHidden && !bHidden && !(ra.right < rb.left || ra.left > rb.right || ra.bottom < rb.top || ra.top > rb.bottom);
    return { found: true, overlap, aHidden, bHidden, ra, rb };
  }, selA, selB);
}

async function focalReport(page, screenId, catSel, itemSel) {
  return page.evaluate((screenId, catSel, itemSel) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const cat = document.querySelector(catSel);
    const item = document.querySelector(itemSel);
    const catR = cat ? cat.getBoundingClientRect() : null;
    const itemR = item ? item.getBoundingClientRect() : null;
    return {
      vw, vh,
      catLeftPct: catR ? +(catR.left / vw * 100).toFixed(1) : null,
      catCenterXPct: catR ? +((catR.left + catR.width/2) / vw * 100).toFixed(1) : null,
      itemLeftPct: itemR ? +(itemR.left / vw * 100).toFixed(1) : null,
      catText: cat ? cat.textContent.trim() : null,
      itemText: item ? item.textContent.trim() : null,
    };
  }, screenId, catSel, itemSel);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));

  const results = {};

  // ============ PHONE WIDTH 390x844 ============
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // --- FIX 2a: Main Menu title vs gear/fullscreen icons ---
  await showScreen(page, 'menu-screen');
  await shot(page, 'r6_menu_390x844.png');
  results.menu_logo_rect = await rectOf(page, '.logo-text');
  results.menu_gear_rect = await rectOf(page, '.btn-settings-gear-trigger');
  results.menu_fullscreen_rect = await rectOf(page, '#btn-fullscreen-toggle, .btn-fullscreen-toggle, [class*="fullscreen"]');
  results.menu_logo_vs_gear_overlap = await checkOverlap(page, '.logo-text', '.btn-settings-gear-trigger');

  // --- FIX 2b: Settings title vs gear/fullscreen icons ---
  await showScreen(page, 'settings-screen');
  await shot(page, 'r6_settings_390x844.png');
  results.settings_title_rect = await rectOf(page, '#settings-screen .status-title');
  results.settings_gear_rect = await rectOf(page, '.btn-settings-gear-trigger');
  results.settings_title_vs_gear_overlap = await checkOverlap(page, '#settings-screen .status-title', '.btn-settings-gear-trigger');
  // try to find a fullscreen icon button generically
  results.fullscreen_btn_candidates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, .btn, [class*="fullscreen"], [id*="fullscreen"]'))
      .filter(el => /fullscreen/i.test(el.className) || /fullscreen/i.test(el.id))
      .map(el => ({ id: el.id, cls: el.className, rect: el.getBoundingClientRect() }));
  });
  results.settings_title_vs_fullscreen_overlap = results.fullscreen_btn_candidates.length
    ? await checkOverlap(page, '#settings-screen .status-title', `#${results.fullscreen_btn_candidates[0].id || ''}`)
    : { found: false, note: 'no fullscreen candidate id found via generic selector' };

  // --- FIX 1: Level Select "Levels 1-10" label clipping ---
  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r6_level_390x844.png');
  results.level_focal_390 = await focalReport(page, 'level-screen', '#level-screen .xmb-category:has(.xmb-category-label)', '#level-screen .xmb-item:has(.xmb-item-label)');
  results.level_category_glyph_390 = await textGlyphRect(page, '#level-screen .xmb-category-label');
  results.level_horiz_scroll_390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  // walk items to confirm list (incl INFINITE ROAD) is readable
  const levelLabels390 = [];
  for (let i = 0; i < 11; i++) {
    const label = await page.evaluate(() => {
      const el = document.querySelector('#level-screen .xmb-item:has(.xmb-item-label)');
      return el ? el.textContent.trim() : null;
    });
    const glyph = await textGlyphRect(page, '#level-screen .xmb-item.is-active .xmb-item-label, #level-screen .xmb-item:has(.xmb-item-label)');
    levelLabels390.push({ label, glyphLeft: glyph.found ? Math.round(glyph.left) : null });
    await press(page, 'ArrowDown', 1, 150);
  }
  results.level_labels_walked_390 = levelLabels390;
  await shot(page, 'r6_level_bottom_390x844.png');

  // ============ REGRESSION SANITY @ 1920x1080 ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await showScreen(page, 'menu-screen');
  await shot(page, 'r6_menu_1920x1080.png');
  results.menu_focal_1920 = await focalReport(page, 'menu-screen', '#menu-screen .xmb-category:has(.xmb-category-label)', '#menu-screen .xmb-item:has(.xmb-item-label)');

  await showScreen(page, 'settings-screen');
  await shot(page, 'r6_settings_1920x1080.png');
  results.settings_focal_1920 = await focalReport(page, 'settings-screen', '#settings-screen .xmb-category:has(.xmb-category-label)', '#settings-screen .xmb-item:has(.xmb-item-label)');

  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r6_level_1920x1080.png');
  results.level_focal_1920 = await focalReport(page, 'level-screen', '#level-screen .xmb-category:has(.xmb-category-label)', '#level-screen .xmb-item:has(.xmb-item-label)');

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
