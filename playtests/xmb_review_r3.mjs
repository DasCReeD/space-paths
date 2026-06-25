// Re-verification script for the 4 fixes from the 2026-06-22 XMB audit.
// Connects to an isolated vite instance on port 5199 (NOT the user's 3000/3001).
// Screenshots prefixed r3_.
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
  await new Promise(r => setTimeout(r, 250));
}

async function press(page, key, times = 1, delay = 220) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press(key);
    await new Promise(r => setTimeout(r, delay));
  }
}

async function getCrossbarState(page, screenId) {
  return page.evaluate((screenId) => {
    const c = window.gameManagerInstance.crossbarControllers[screenId];
    if (!c) return null;
    return {
      categoryIndex: c.categoryIndex,
      itemIndex: c.itemIndex,
      activeCategory: c.activeCategory ? c.activeCategory.id : null,
      activeItem: c.activeItem ? c.activeItem.id : null,
      itemCount: c.activeCategory ? c.activeCategory.items.length : 0
    };
  }, screenId);
}

async function webampVisibility(page) {
  return page.evaluate(() => {
    const c = document.getElementById('webamp-container');
    const w = document.getElementById('webamp');
    function info(el) {
      if (!el) return { exists: false };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { exists: true, display: cs.display, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
    }
    return { container: info(c), webamp: info(w) };
  });
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
    return { found: true, overlap, aHidden, bHidden, ra: { x: ra.x, y: ra.y, w: ra.width, h: ra.height }, rb: { x: rb.x, y: rb.y, w: rb.width, h: rb.height } };
  }, selA, selB);
}

async function checkXmbClipping(page, screenId) {
  return page.evaluate((screenId) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const offenders = [];
    const scope = screenId ? document.getElementById(screenId) : document;
    if (!scope) return offenders;
    scope.querySelectorAll('.xmb-item:has(.xmb-item-label), .xmb-category:has(.xmb-category-label)').forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (r.width === 0 && r.height === 0) return; // not laid out / not the live track
      const fullyOffscreen = r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw;
      const partiallyClipped = r.top < 0 || r.left < -5 || r.bottom > vh || r.right > vw + 5;
      offenders.push({ id: el.id, cls: el.className, top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right), vw, vh, fullyOffscreen, partiallyClipped });
    });
    return offenders;
  }, screenId);
}

async function backdropCoverage(page) {
  // Sample several points across the viewport behind the success screen to see if blur/dark backdrop covers everything.
  return page.evaluate(() => {
    const screen = document.getElementById('success-screen');
    const r = screen.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight };
  });
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));

  const results = {};

  // ============ FIX 1: Webamp hidden at small viewports ============
  await page.setViewport({ width: 375, height: 667 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await showScreen(page, 'menu-screen');
  await shot(page, 'r3_fix1_main_375x667.png');
  results.fix1_webamp_375 = await webampVisibility(page);

  await showScreen(page, 'settings-screen');
  await shot(page, 'r3_fix1_settings_375x667.png');
  results.fix1_webamp_settings_375 = await webampVisibility(page);
  results.fix1_overlap_settings_375 = await checkOverlap(page, '#webamp-container', '#settings-screen .xmb-item:has(.xmb-item-label)');

  await page.setViewport({ width: 1024, height: 640 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await showScreen(page, 'menu-screen');
  await shot(page, 'r3_fix1_main_1024x640.png');
  results.fix1_webamp_main_1024 = await webampVisibility(page);

  await showScreen(page, 'settings-screen');
  await shot(page, 'r3_fix1_settings_1024x640.png');
  results.fix1_webamp_settings_1024 = await webampVisibility(page);
  results.fix1_overlap_settings_1024 = await checkOverlap(page, '#webamp-container', '#settings-screen .xmb-item:has(.xmb-item-label)');

  // confirm webamp STILL shows at 1920x1080 (allowed)
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  await showScreen(page, 'menu-screen');
  await shot(page, 'r3_fix1_main_1920x1080.png');
  results.fix1_webamp_1920 = await webampVisibility(page);

  // ============ FIX 2: Success screen backdrop + centered columns at 1920x1080 ============
  await page.evaluate(() => {
    window.gameManagerInstance.showLevelSelection('standard');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const gm = window.gameManagerInstance;
    gm.currentPack = 'standard';
    gm.currentLevelIndex = 0;
    gm.handleSuccess();
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r3_fix2_success_1920x1080.png');
  results.fix2_success_state = await getCrossbarState(page, 'success-screen');
  results.fix2_screen_rect = await backdropCoverage(page);
  results.fix2_columns_rect = await page.evaluate(() => {
    const el = document.querySelector('.success-columns-container');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, computedMaxWidth: getComputedStyle(el).maxWidth };
  });
  results.fix2_backdrop_filter = await page.evaluate(() => {
    const el = document.getElementById('success-screen');
    const cs = getComputedStyle(el);
    return { backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter, background: cs.background, position: cs.position, inset: cs.inset, width: cs.width, height: cs.height };
  });
  results.fix2_clip = await checkXmbClipping(page, 'success-screen');

  // ============ FIX 3: Pause "RESET LEVEL EDITS" styled ============
  await showScreen(page, 'pause-screen');
  await shot(page, 'r3_fix3_pause_1920x1080.png');
  results.fix3_reset_btn = await page.evaluate(() => {
    const btn = document.getElementById('btn-pause-reset-level');
    if (!btn) return { found: false };
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    return { found: true, background: cs.backgroundImage || cs.background, color: cs.color, boxShadow: cs.boxShadow, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
  });
  results.fix3_other_btns = await page.evaluate(() => {
    const ids = ['btn-pause-resume', 'btn-pause-boat-throttle', 'btn-pause-reset-level', 'btn-pause-quit'];
    return ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return { id, found: false };
      const cs = getComputedStyle(el);
      return { id, found: true, background: cs.backgroundImage || cs.background, classes: el.className };
    });
  });

  // ============ FIX 4: VISUALS category centered at 1024x640 ============
  await page.setViewport({ width: 1024, height: 640 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await showScreen(page, 'settings-screen');
  await press(page, 'ArrowRight', 2); // game(0) -> audio(1) -> visuals(2), 9 items
  await shot(page, 'r3_fix4_visuals_top_1024x640.png');
  results.fix4_visuals_top = await getCrossbarState(page, 'settings-screen');
  results.fix4_visuals_top_activeItem = await page.evaluate(() => {
    const el = document.querySelector('#settings-screen .xmb-item:has(.xmb-item-label)');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { y: r.y, h: r.height, cy: r.y + r.height / 2, vh: window.innerHeight };
  });

  for (let i = 1; i <= 8; i++) {
    await press(page, 'ArrowDown', 1, 200);
    const st = await page.evaluate(() => {
      const el = document.querySelector('#settings-screen .xmb-item:has(.xmb-item-label)');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { y: r.y, h: r.height, cy: r.y + r.height / 2, top: r.top, bottom: r.bottom, label: el.textContent.trim() };
    });
    results['fix4_visuals_step' + i] = st;
  }
  await shot(page, 'r3_fix4_visuals_bottom_1024x640.png');
  results.fix4_visuals_bottom = await getCrossbarState(page, 'settings-screen');
  results.fix4_visuals_clip = await checkXmbClipping(page, 'settings-screen');

  // ============ REGRESSION: Success screen buttons stay at bottom (1920x1080) ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    window.gameManagerInstance.showLevelSelection('standard');
  });
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const gm = window.gameManagerInstance;
    gm.currentPack = 'standard';
    gm.currentLevelIndex = 0;
    gm.handleSuccess();
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r3_regress_success_buttons_1920x1080.png');
  results.regress_success_button_rects = await page.evaluate(() => {
    const crossbar = document.getElementById('success-xmb-crossbar');
    const cols = document.querySelector('.success-columns-container');
    const cr = crossbar ? crossbar.getBoundingClientRect() : null;
    const colr = cols ? cols.getBoundingClientRect() : null;
    return {
      crossbar: cr ? { x: cr.x, y: cr.y, w: cr.width, h: cr.height } : null,
      columns: colr ? { x: colr.x, y: colr.y, w: colr.width, h: colr.height } : null,
      crossbarBelowColumns: cr && colr ? cr.y >= colr.bottom - 5 : null
    };
  });

  // ============ REGRESSION: Garage still renders beside 3D preview ============
  await page.evaluate(() => window.gameManagerInstance.showScreen(''));
  await showScreen(page, 'ship-picker-screen');
  await shot(page, 'r3_regress_garage_1920x1080.png');
  results.regress_garage_crossbar_rect = await page.evaluate(() => {
    const el = document.querySelector('#ship-picker-screen .garage-xmb-crossbar');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { found: true, position: cs.position, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
  });
  await press(page, 'ArrowRight', 1); // skin
  await shot(page, 'r3_regress_garage_skin_1920x1080.png');

  // ============ REGRESSION: Other full-screen XMB screens at 1920x1080 ============
  for (const id of ['menu-screen', 'pause-screen', 'death-screen', 'how-to-screen', 'gamepad-config-screen']) {
    await showScreen(page, id);
    await shot(page, `r3_regress_${id}_1920x1080.png`);
    results['regress_' + id] = await getCrossbarState(page, id);
  }
  // level select
  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r3_regress_level_screen_1920x1080.png');
  results.regress_level_screen = await getCrossbarState(page, 'level-screen');

  // settings other categories quick check (focal point)
  await showScreen(page, 'settings-screen');
  await shot(page, 'r3_regress_settings_game_1920x1080.png');

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
