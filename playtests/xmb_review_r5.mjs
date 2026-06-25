// r5: Verify the PS3-authentic focal-point relocation (.xmb-focal-ps3,
// --xmb-focal-x:27%, --xmb-item-y:42%, leftAlignItems:true) on Main Menu,
// Settings, Level Select. Confirm dialogs (pause/death/success/how-to/
// gamepad-config) and Garage remain centred/unchanged. Confirm mobile
// override (--xmb-focal-x:12%, --xmb-item-y:38%) works at phone width.
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
      if (fullyOffscreen || partiallyClipped) {
        offenders.push({ id: el.id, cls: el.className, text: el.textContent.trim().slice(0,30), top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right), vw, vh, fullyOffscreen, partiallyClipped });
      }
    });
    return offenders;
  }, screenId);
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
    return { found: true, overlap, aHidden, bHidden };
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
      catTopPct: catR ? +(catR.top / vh * 100).toFixed(1) : null,
      catCenterXPct: catR ? +((catR.left + catR.width/2) / vw * 100).toFixed(1) : null,
      itemLeftPct: itemR ? +(itemR.left / vw * 100).toFixed(1) : null,
      itemTopPct: itemR ? +(itemR.top / vh * 100).toFixed(1) : null,
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

  // ============ 1. MAIN MENU / SETTINGS / LEVEL SELECT @ 1920x1080 ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  await showScreen(page, 'menu-screen');
  await shot(page, 'r5_menu_1920x1080.png');
  results.menu_focal_1920 = await focalReport(page, 'menu-screen', '#menu-screen .xmb-category:has(.xmb-category-label)', '#menu-screen .xmb-item:has(.xmb-item-label)');
  results.menu_clip_1920 = await checkXmbClipping(page, 'menu-screen');
  // category rail left/right scroll through focal point
  await press(page, 'ArrowRight', 1);
  await shot(page, 'r5_menu_extras_1920x1080.png');
  results.menu_extras_focal_1920 = await focalReport(page, 'menu-screen', '#menu-screen .xmb-category:has(.xmb-category-label)', '#menu-screen .xmb-item:has(.xmb-item-label)');
  await press(page, 'ArrowLeft', 1);

  await showScreen(page, 'settings-screen');
  await shot(page, 'r5_settings_game_1920x1080.png');
  results.settings_focal_1920 = await focalReport(page, 'settings-screen', '#settings-screen .xmb-category:has(.xmb-category-label)', '#settings-screen .xmb-item:has(.xmb-item-label)');
  await press(page, 'ArrowRight', 2); // -> visuals (9 items, longest category)
  await shot(page, 'r5_settings_visuals_top_1920x1080.png');
  for (let i = 1; i <= 8; i++) {
    await press(page, 'ArrowDown', 1, 180);
  }
  await shot(page, 'r5_settings_visuals_bottom_1920x1080.png');
  results.settings_visuals_clip_1920 = await checkXmbClipping(page, 'settings-screen');
  results.settings_visuals_bottom_focal_1920 = await focalReport(page, 'settings-screen', '#settings-screen .xmb-category:has(.xmb-category-label)', '#settings-screen .xmb-item:has(.xmb-item-label)');

  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r5_level_top_1920x1080.png');
  results.level_focal_1920 = await focalReport(page, 'level-screen', '#level-screen .xmb-category:has(.xmb-category-label)', '#level-screen .xmb-item:has(.xmb-item-label)');
  results.level_first_item = await page.evaluate(() => {
    const el = document.querySelector('#level-screen .xmb-item:has(.xmb-item-label)');
    return el ? el.textContent.trim() : null;
  });
  const levelLabels1920 = [];
  for (let i = 0; i < 11; i++) {
    const label = await page.evaluate(() => {
      const el = document.querySelector('#level-screen .xmb-item:has(.xmb-item-label)');
      return el ? el.textContent.trim() : null;
    });
    levelLabels1920.push(label);
    await press(page, 'ArrowDown', 1, 150);
  }
  results.level_labels_walked_1920 = levelLabels1920;
  await shot(page, 'r5_level_bottom_1920x1080.png');
  results.level_clip_1920 = await checkXmbClipping(page, 'level-screen');

  // ============ 1b. SAME THREE @ 1366x768 ============
  await page.setViewport({ width: 1366, height: 768 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await showScreen(page, 'menu-screen');
  await shot(page, 'r5_menu_1366x768.png');
  results.menu_focal_1366 = await focalReport(page, 'menu-screen', '#menu-screen .xmb-category:has(.xmb-category-label)', '#menu-screen .xmb-item:has(.xmb-item-label)');
  results.menu_clip_1366 = await checkXmbClipping(page, 'menu-screen');

  await showScreen(page, 'settings-screen');
  await press(page, 'ArrowRight', 2); // visuals
  await shot(page, 'r5_settings_visuals_top_1366x768.png');
  for (let i = 1; i <= 8; i++) await press(page, 'ArrowDown', 1, 180);
  await shot(page, 'r5_settings_visuals_bottom_1366x768.png');
  results.settings_visuals_clip_1366 = await checkXmbClipping(page, 'settings-screen');
  results.settings_visuals_bottom_focal_1366 = await focalReport(page, 'settings-screen', '#settings-screen .xmb-category:has(.xmb-category-label)', '#settings-screen .xmb-item:has(.xmb-item-label)');

  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r5_level_top_1366x768.png');
  results.level_focal_1366 = await focalReport(page, 'level-screen', '#level-screen .xmb-category:has(.xmb-category-label)', '#level-screen .xmb-item:has(.xmb-item-label)');
  for (let i = 0; i < 10; i++) await press(page, 'ArrowDown', 1, 150);
  await shot(page, 'r5_level_bottom_1366x768.png');
  results.level_clip_1366 = await checkXmbClipping(page, 'level-screen');

  // ============ 2. DIALOGS REMAIN CENTERED @ 1920x1080 ============
  await page.setViewport({ width: 1920, height: 1080 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  for (const id of ['pause-screen', 'death-screen', 'how-to-screen', 'gamepad-config-screen']) {
    await showScreen(page, id);
    await shot(page, `r5_dialog_${id}_1920x1080.png`);
    results['dialog_' + id + '_clip'] = await checkXmbClipping(page, id);
    results['dialog_' + id + '_crossbar_rect'] = await rectOf(page, `#${id} .xmb-crossbar`);
  }

  // success screen via real handleSuccess() path
  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const gm = window.gameManagerInstance;
    gm.currentPack = 'standard';
    gm.currentLevelIndex = 0;
    gm.handleSuccess();
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r5_dialog_success-screen_1920x1080.png');
  results.dialog_success_clip = await checkXmbClipping(page, 'success-screen');
  results.dialog_success_columns_rect = await rectOf(page, '.success-columns-container');
  results.dialog_success_crossbar_rect = await rectOf(page, '#success-xmb-crossbar');

  // ============ 3. GARAGE UNCHANGED @ 1920x1080 ============
  await showScreen(page, 'ship-picker-screen');
  await shot(page, 'r5_garage_1920x1080.png');
  results.garage_clip = await checkXmbClipping(page, 'ship-picker-screen');
  results.garage_crossbar_rect = await rectOf(page, '#garage-crossbar');
  results.garage_preview_rect = await page.evaluate(() => {
    const el = document.querySelector('#ship-picker-screen canvas, #ship-picker-screen .garage-preview, #ship-picker-screen .ship-preview-canvas');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return { found: true, top: r.top, left: r.left, right: r.right, bottom: r.bottom };
  });

  // ============ 4. PHONE WIDTH 390x844 ============
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  await showScreen(page, 'menu-screen');
  await shot(page, 'r5_menu_390x844.png');
  results.menu_focal_390 = await focalReport(page, 'menu-screen', '#menu-screen .xmb-category:has(.xmb-category-label)', '#menu-screen .xmb-item:has(.xmb-item-label)');
  results.menu_clip_390 = await checkXmbClipping(page, 'menu-screen');
  results.menu_horiz_scroll_390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  await showScreen(page, 'settings-screen');
  await shot(page, 'r5_settings_390x844.png');
  results.settings_focal_390 = await focalReport(page, 'settings-screen', '#settings-screen .xmb-category:has(.xmb-category-label)', '#settings-screen .xmb-item:has(.xmb-item-label)');
  results.settings_clip_390 = await checkXmbClipping(page, 'settings-screen');
  results.settings_horiz_scroll_390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  await press(page, 'ArrowRight', 2); // visuals
  await shot(page, 'r5_settings_visuals_390x844.png');
  results.settings_visuals_clip_390 = await checkXmbClipping(page, 'settings-screen');

  await page.evaluate(() => window.gameManagerInstance.showLevelSelection('standard'));
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r5_level_390x844.png');
  results.level_focal_390 = await focalReport(page, 'level-screen', '#level-screen .xmb-category:has(.xmb-category-label)', '#level-screen .xmb-item:has(.xmb-item-label)');
  results.level_clip_390 = await checkXmbClipping(page, 'level-screen');
  results.level_horiz_scroll_390 = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
