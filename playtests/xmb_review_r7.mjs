// r7: Verify the .screen-title mobile font-shrink fix (index.css ~3022-3025,
// inside @media max-width:480px: font-size:1.25rem; letter-spacing:1px).
// Target: Level Select pack title (#level-pack-title.screen-title, "STANDARD PACK")
// and Garage title (#ship-picker-screen .screen-title, "HOVERCRAFT GARAGE")
// must NOT overlap the gear icon (left ~20-66) or fullscreen icon (left ~324-370)
// at 390x844. Connects to isolated vite on port 5199.
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

async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { found: true, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height, fontSize: cs.fontSize, text: el.textContent.trim() };
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
  if (!a.found || !b.found) return null;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));

  const results = {};

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  // Find the gear and fullscreen icon rects once (chrome shared across screens)
  results.gear_rect = await rectOf(page, '.btn-settings-gear-trigger');
  const fsCandidates = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, .btn, [class*="fullscreen"], [id*="fullscreen"]'))
      .filter(el => /fullscreen/i.test(el.className) || /fullscreen/i.test(el.id))
      .map(el => ({ id: el.id, cls: el.className }));
  });
  results.fullscreen_candidates = fsCandidates;
  const fsSel = fsCandidates.length ? (fsCandidates[0].id ? `#${fsCandidates[0].id}` : `.${fsCandidates[0].cls.split(' ')[0]}`) : null;
  results.fullscreen_rect = fsSel ? await rectOf(page, fsSel) : { found: false };

  // --- LEVEL SELECT pack title ---
  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r7_level_390x844.png');
  results.level_title_rect = await rectOf(page, '#level-pack-title.screen-title');
  results.level_title_glyph = await textGlyphRect(page, '#level-pack-title.screen-title');
  results.level_title_vs_gear_overlap_box = rectsOverlap(results.level_title_rect, results.gear_rect);
  results.level_title_vs_gear_overlap_glyph = rectsOverlap(results.level_title_glyph, results.gear_rect);
  results.level_title_vs_fs_overlap_box = results.fullscreen_rect.found ? rectsOverlap(results.level_title_rect, results.fullscreen_rect) : null;
  results.level_title_vs_fs_overlap_glyph = results.fullscreen_rect.found ? rectsOverlap(results.level_title_glyph, results.fullscreen_rect) : null;

  // --- GARAGE title ---
  await showScreen(page, 'ship-picker-screen');
  await new Promise(r => setTimeout(r, 400));
  await shot(page, 'r7_garage_390x844.png');
  results.garage_title_rect = await rectOf(page, '#ship-picker-screen .screen-title');
  results.garage_title_glyph = await textGlyphRect(page, '#ship-picker-screen .screen-title');
  results.garage_title_vs_gear_overlap_box = rectsOverlap(results.garage_title_rect, results.gear_rect);
  results.garage_title_vs_gear_overlap_glyph = rectsOverlap(results.garage_title_glyph, results.gear_rect);
  results.garage_title_vs_fs_overlap_box = results.fullscreen_rect.found ? rectsOverlap(results.garage_title_rect, results.fullscreen_rect) : null;
  results.garage_title_vs_fs_overlap_glyph = results.fullscreen_rect.found ? rectsOverlap(results.garage_title_glyph, results.fullscreen_rect) : null;

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
