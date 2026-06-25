// Re-verification script for the 2 fixes from the most recent XMB audit round
// (VISUALS fade-by-distance collision fix + How-To bespoke crossbar exception).
// Connects to an isolated vite instance on port 5199 (NOT the user's 3000/3001).
// Screenshots prefixed r4_.
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
      if (r.width === 0 && r.height === 0) return;
      const fullyOffscreen = r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw;
      const partiallyClipped = r.top < 0 || r.left < -5 || r.bottom > vh || r.right > vw + 5;
      offenders.push({ id: el.id, cls: el.className, top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right), vw, vh, fullyOffscreen, partiallyClipped });
    });
    return offenders;
  }, screenId);
}

async function rectOf(page, sel) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
  }, sel);
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

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));

  const results = {};

  // ============ FIX 1: VISUALS category-bar/item collision, fade by distance ============
  // 1024x640
  await page.setViewport({ width: 1024, height: 640 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  await showScreen(page, 'settings-screen');
  await press(page, 'ArrowRight', 2); // game(0) -> audio(1) -> visuals(2), 9 items
  await shot(page, 'r4_fix1_visuals_top_1024x640.png');
  results.fix1_visuals_top_1024 = await getCrossbarState(page, 'settings-screen');

  for (let i = 1; i <= 8; i++) {
    await press(page, 'ArrowDown', 1, 220);
    const st = await page.evaluate(() => {
      const cat = document.querySelector('#settings-screen .xmb-category:has(.xmb-category-label)');
      const active = document.querySelector('#settings-screen .xmb-item:has(.xmb-item-label)');
      const catR = cat ? cat.getBoundingClientRect() : null;
      const actR = active ? active.getBoundingClientRect() : null;
      // also grab all items + their computed opacity to inspect fade-by-distance
      const items = Array.from(document.querySelectorAll('#settings-screen .xmb-item')).map(el => {
        const r = el.getBoundingClientRect();
        const label = el.querySelector('.xmb-item-label');
        return {
          text: label ? label.textContent.trim() : null,
          opacity: getComputedStyle(el).opacity,
          top: Math.round(r.top), bottom: Math.round(r.bottom),
          visible: r.width > 0 || r.height > 0
        };
      }).filter(it => it.text);
      const overlap = catR && actR ? !(catR.right < actR.left || catR.left > actR.right || catR.bottom < actR.top || catR.top > actR.bottom) : null;
      return {
        activeLabel: active ? active.textContent.trim() : null,
        catRect: catR ? { top: Math.round(catR.top), bottom: Math.round(catR.bottom) } : null,
        activeRect: actR ? { top: Math.round(actR.top), bottom: Math.round(actR.bottom) } : null,
        catOverlapsActiveItem: overlap,
        items
      };
    });
    results['fix1_step' + i + '_1024'] = st;
    await shot(page, `r4_fix1_visuals_step${i}_1024x640.png`);
  }
  results.fix1_clip_1024 = await checkXmbClipping(page, 'settings-screen');

  // 1366x768
  await page.setViewport({ width: 1366, height: 768 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await showScreen(page, 'settings-screen');
  await press(page, 'ArrowRight', 2);
  await shot(page, 'r4_fix1_visuals_top_1366x768.png');
  for (let i = 1; i <= 8; i++) {
    await press(page, 'ArrowDown', 1, 220);
    const st = await page.evaluate(() => {
      const cat = document.querySelector('#settings-screen .xmb-category:has(.xmb-category-label)');
      const active = document.querySelector('#settings-screen .xmb-item:has(.xmb-item-label)');
      const catR = cat ? cat.getBoundingClientRect() : null;
      const actR = active ? active.getBoundingClientRect() : null;
      const overlap = catR && actR ? !(catR.right < actR.left || catR.left > actR.right || catR.bottom < actR.top || catR.top > actR.bottom) : null;
      return {
        activeLabel: active ? active.textContent.trim() : null,
        catRect: catR ? { top: Math.round(catR.top), bottom: Math.round(catR.bottom) } : null,
        activeRect: actR ? { top: Math.round(actR.top), bottom: Math.round(actR.bottom) } : null,
        catOverlapsActiveItem: overlap
      };
    });
    results['fix1_step' + i + '_1366'] = st;
  }
  await shot(page, 'r4_fix1_visuals_bottom_1366x768.png');
  results.fix1_clip_1366 = await checkXmbClipping(page, 'settings-screen');

  // ============ FIX 2: How-To screen layout at 1920x1080 ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await showScreen(page, 'how-to-screen');
  await shot(page, 'r4_fix2_howto_1920x1080.png');
  results.fix2_title_rect = await rectOf(page, '#how-to-screen .screen-title');
  results.fix2_content_rect = await rectOf(page, '#how-to-screen .how-to-content');
  results.fix2_crossbar_rect = await rectOf(page, '#how-to-xmb-crossbar');
  results.fix2_understood_btn_rect = await page.evaluate(() => {
    const el = document.querySelector('#how-to-screen .xmb-item:has(.xmb-item-label)');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, top: r.top, bottom: r.bottom, left: r.left, right: r.right, text: el.textContent.trim() };
  });
  results.fix2_clip = await checkXmbClipping(page, 'how-to-screen');
  results.fix2_overlap_title_crossbar = await checkOverlap(page, '#how-to-screen .screen-title', '#how-to-xmb-crossbar');
  results.fix2_overlap_content_crossbar = await checkOverlap(page, '#how-to-screen .how-to-content', '#how-to-xmb-crossbar');

  // also check How-To at small viewport for safety
  await page.setViewport({ width: 1366, height: 768 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));
  await showScreen(page, 'how-to-screen');
  await shot(page, 'r4_fix2_howto_1366x768.png');
  results.fix2_title_rect_1366 = await rectOf(page, '#how-to-screen .screen-title');
  results.fix2_understood_btn_rect_1366 = await rectOf(page, '#how-to-xmb-crossbar');

  // ============ REGRESSION: Garage flatItems uniform opacity ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => window.gameManagerInstance.showScreen(''));
  await showScreen(page, 'ship-picker-screen');
  await shot(page, 'r4_regress_garage_1920x1080.png');
  results.regress_garage_item_opacities = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#ship-picker-screen .xmb-item')).map(el => ({
      opacity: getComputedStyle(el).opacity,
      cls: el.className
    }));
  });

  // ============ REGRESSION: Success screen at 1920x1080 ============
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
  await shot(page, 'r4_regress_success_1920x1080.png');
  results.regress_success_columns = await rectOf(page, '.success-columns-container');
  results.regress_success_crossbar = await rectOf(page, '#success-xmb-crossbar');
  results.regress_success_clip = await checkXmbClipping(page, 'success-screen');

  // ============ REGRESSION: Main menu, Settings other cats, Level select, Pause, Death, Gamepad-config ============
  for (const id of ['menu-screen', 'pause-screen', 'death-screen', 'gamepad-config-screen']) {
    await showScreen(page, id);
    await shot(page, `r4_regress_${id}_1920x1080.png`);
    results['regress_' + id] = await getCrossbarState(page, id);
    results['regress_' + id + '_clip'] = await checkXmbClipping(page, id);
  }

  await showScreen(page, 'settings-screen');
  await shot(page, 'r4_regress_settings_game_1920x1080.png');
  await press(page, 'ArrowRight', 1); // audio
  await shot(page, 'r4_regress_settings_audio_1920x1080.png');
  await press(page, 'ArrowRight', 2); // controls
  await shot(page, 'r4_regress_settings_controls_1920x1080.png');
  results.regress_settings_clip = await checkXmbClipping(page, 'settings-screen');

  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r4_regress_level_screen_1920x1080.png');
  results.regress_level_screen = await getCrossbarState(page, 'level-screen');
  results.regress_level_first_item = await page.evaluate(() => {
    const el = document.querySelector('.level-item-track-dyn:not(.hidden) .level-item, .level-item-track-dyn:not(.hidden) .xmb-item');
    return el ? el.textContent.trim() : null;
  });
  results.regress_level_clip = await checkXmbClipping(page, 'level-screen');
  // walk down through a full decade to check infinite road + 10 levels
  const levelLabels = [];
  for (let i = 0; i < 12; i++) {
    const label = await page.evaluate(() => {
      const el = document.querySelector('#level-screen .xmb-item:has(.xmb-item-label)');
      return el ? el.textContent.trim() : null;
    });
    levelLabels.push(label);
    await press(page, 'ArrowDown', 1, 150);
  }
  results.regress_level_labels_walked = levelLabels;

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
