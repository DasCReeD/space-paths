// One-off XMB visual QA audit script. Connects to an isolated vite instance
// on port 5199 (NOT the user's 3000/3001 dev server). Drives real keyboard
// input through window.gameManagerInstance, captures screenshots into
// c:\dev\Sky roads\playtests\, and dumps layout-measurement JSON to stdout.
//
// IMPORTANT input-model note (see agent memory): when the focused item is a
// slider AND its category has 2+ items, Left/Right ADJUSTS the slider rather
// than changing category. So category navigation must always happen while
// itemIndex is 0 (or on a non-slider item), not after drilling down into a
// category that ends on a slider.
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

async function measureFocal(page) {
  return page.evaluate(() => {
    const out = { items: [], cats: [] };
    document.querySelectorAll('.xmb-item:has(.xmb-item-label)').forEach((el) => {
      const r = el.getBoundingClientRect();
      out.items.push({ x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2, cx: r.x + r.width / 2 });
    });
    document.querySelectorAll('.xmb-category:has(.xmb-category-label)').forEach((el) => {
      const r = el.getBoundingClientRect();
      out.cats.push({ x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2, cx: r.x + r.width / 2 });
    });
    out.viewport = { w: window.innerWidth, h: window.innerHeight };
    return out;
  });
}

async function checkXmbClipping(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const offenders = [];
    document.querySelectorAll('.xmb-item, .xmb-category').forEach(el => {
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      if (r.width === 0 && r.height === 0) return;
      if (r.top < 0 || r.left < -5 || r.bottom > vh || r.right > vw + 5) {
        offenders.push({ id: el.id, cls: el.className, top: Math.round(r.top), left: Math.round(r.left), bottom: Math.round(r.bottom), right: Math.round(r.right), vw, vh });
      }
    });
    return offenders;
  });
}

async function elementAtCenterIsButton(page, btnId) {
  return page.evaluate((btnId) => {
    const btn = document.getElementById(btnId);
    if (!btn) return { found: false };
    const r = btn.getBoundingClientRect();
    const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    return { found: true, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, hitIsButtonOrChild: hit === btn || (hit && btn.contains(hit)), hitTag: hit ? hit.tagName + '#' + hit.id : null };
  }, btnId);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();
  page.on('pageerror', err => console.log('[PAGE EXCEPTION]', err.message));

  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));

  const results = {};

  // ───── MAIN MENU ─────
  await showScreen(page, 'menu-screen');
  await shot(page, 'r2_main_default.png');
  results.main_default = await getCrossbarState(page, 'menu-screen');
  results.main_focal = await measureFocal(page);

  await press(page, 'ArrowRight', 1);
  await shot(page, 'r2_main_extras.png');
  results.main_extras = await getCrossbarState(page, 'menu-screen');

  await press(page, 'ArrowDown', 2);
  await shot(page, 'r2_main_extras_items.png');
  results.main_extras_items = await getCrossbarState(page, 'menu-screen');
  results.main_clip = await checkXmbClipping(page);

  // ───── SETTINGS: walk each category at itemIndex 0 first ─────
  await showScreen(page, 'settings-screen');
  await shot(page, 'r2_settings_game.png');
  results.settings_game = await getCrossbarState(page, 'settings-screen');
  results.settings_game_focal = await measureFocal(page);

  await press(page, 'ArrowRight', 1); // audio (1 item, slider)
  await shot(page, 'r2_settings_audio.png');
  results.settings_audio = await getCrossbarState(page, 'settings-screen');
  // Per memory: audio's slider is the ONLY item -> adjust via Up/Down, not Left/Right
  await press(page, 'ArrowUp', 2, 150);
  await shot(page, 'r2_settings_audio_adjusted.png');
  results.settings_audio_adjusted = await getCrossbarState(page, 'settings-screen');

  await press(page, 'ArrowRight', 1); // visuals (9 items)
  await shot(page, 'r2_settings_visuals_top.png');
  results.settings_visuals_top = await getCrossbarState(page, 'settings-screen');
  await press(page, 'ArrowDown', 8); // walk to last item (star-density, a slider)
  await shot(page, 'r2_settings_visuals_bottom.png');
  results.settings_visuals_bottom = await getCrossbarState(page, 'settings-screen');
  results.settings_visuals_clip = await checkXmbClipping(page);
  await press(page, 'ArrowUp', 8); // back to item 0 (starfield, non-slider) before changing category

  await press(page, 'ArrowRight', 1); // controls (5 items)
  await shot(page, 'r2_settings_controls_top.png');
  results.settings_controls_top = await getCrossbarState(page, 'settings-screen');
  await press(page, 'ArrowDown', 4); // walk to last item (gamepad-config, non-slider action)
  await shot(page, 'r2_settings_controls_bottom.png');
  results.settings_controls_bottom = await getCrossbarState(page, 'settings-screen');
  results.settings_controls_clip = await checkXmbClipping(page);
  await press(page, 'ArrowUp', 4);

  await press(page, 'ArrowRight', 1); // display
  await shot(page, 'r2_settings_display_top.png');
  results.settings_display_top = await getCrossbarState(page, 'settings-screen');
  await press(page, 'ArrowDown', 4);
  await shot(page, 'r2_settings_display_bottom.png');
  results.settings_display_bottom = await getCrossbarState(page, 'settings-screen');
  results.settings_display_clip = await checkXmbClipping(page);
  await press(page, 'ArrowUp', 4);

  await press(page, 'ArrowRight', 1); // visualizer (5 items, item0 is preset slider)
  await shot(page, 'r2_settings_visualizer_top.png');
  results.settings_visualizer_top = await getCrossbarState(page, 'settings-screen');
  // preset is item 0 (slider) in a 5-item category -> Left/Right SHOULD adjust it (multi-item rule)
  await press(page, 'ArrowRight', 1, 150);
  await shot(page, 'r2_settings_visualizer_preset_cycled.png');
  results.settings_visualizer_preset_cycled = await getCrossbarState(page, 'settings-screen');
  await press(page, 'ArrowDown', 4); // walk down through lock/favorite/mode/webamp toggles
  await shot(page, 'r2_settings_visualizer_bottom.png');
  results.settings_visualizer_bottom = await getCrossbarState(page, 'settings-screen');
  results.settings_visualizer_clip = await checkXmbClipping(page);

  // ───── LEVEL SELECT ─────
  await page.evaluate(() => {
    window.gameManagerInstance.showLevelSelection('standard');
  });
  await new Promise(r => setTimeout(r, 600));
  await shot(page, 'r2_level_select_group1_top.png');
  results.level_group1_top = await getCrossbarState(page, 'level-screen');
  results.level_group1_top_focal = await measureFocal(page);

  await press(page, 'ArrowDown', 9); // all 10 items in group 1 (Infinite Road is index 0)
  await shot(page, 'r2_level_select_group1_bottom.png');
  results.level_group1_bottom = await getCrossbarState(page, 'level-screen');
  results.level_group1_clip = await checkXmbClipping(page);
  await press(page, 'ArrowUp', 9);

  await press(page, 'ArrowRight', 1); // group 2
  await shot(page, 'r2_level_select_group2.png');
  results.level_group2 = await getCrossbarState(page, 'level-screen');

  // ───── GARAGE ─────
  await page.evaluate(() => window.gameManagerInstance.showScreen(''));
  await showScreen(page, 'ship-picker-screen');
  await shot(page, 'r2_garage_hull.png');
  results.garage_hull = await getCrossbarState(page, 'ship-picker-screen');
  await press(page, 'ArrowRight', 1);
  await shot(page, 'r2_garage_skin_top.png');
  results.garage_skin_top = await getCrossbarState(page, 'ship-picker-screen');
  await press(page, 'ArrowDown', 11); // skins has 12 items
  await shot(page, 'r2_garage_skin_bottom.png');
  results.garage_skin_bottom = await getCrossbarState(page, 'ship-picker-screen');
  results.garage_skin_clip = await checkXmbClipping(page);
  await press(page, 'ArrowUp', 11);
  await press(page, 'ArrowRight', 1); // paint
  await shot(page, 'r2_garage_paint_top.png');
  results.garage_paint_top = await getCrossbarState(page, 'ship-picker-screen');
  await press(page, 'ArrowDown', 7); // paint has 8 items (7 presets + custom)
  await shot(page, 'r2_garage_paint_bottom.png');
  results.garage_paint_bottom = await getCrossbarState(page, 'ship-picker-screen');
  results.garage_paint_clip = await checkXmbClipping(page);

  // ───── GAMEPAD CONFIG (single category, 8 items) ─────
  await showScreen(page, 'gamepad-config-screen');
  await shot(page, 'r2_gamepad_config_top.png');
  results.gamepad_top = await getCrossbarState(page, 'gamepad-config-screen');
  await press(page, 'ArrowDown', 7);
  await shot(page, 'r2_gamepad_config_bottom.png');
  results.gamepad_bottom = await getCrossbarState(page, 'gamepad-config-screen');
  results.gamepad_clip = await checkXmbClipping(page);
  results.gamepad_close_btn_hit_test = await elementAtCenterIsButton(page, 'btn-gamepad-close');

  // ───── PAUSE / DEATH / SUCCESS / HOW-TO (single-item-column screens) ─────
  await showScreen(page, 'pause-screen');
  await shot(page, 'r2_pause.png');
  results.pause = await getCrossbarState(page, 'pause-screen');

  await showScreen(page, 'death-screen');
  await shot(page, 'r2_death.png');
  results.death = await getCrossbarState(page, 'death-screen');

  await showScreen(page, 'success-screen');
  await shot(page, 'r2_success.png');
  results.success = await getCrossbarState(page, 'success-screen');

  await showScreen(page, 'how-to-screen');
  await shot(page, 'r2_how_to.png');
  results.how_to = await getCrossbarState(page, 'how-to-screen');

  // ───── PHYSICS CALIBRATOR (drag/resize window, not a crossbar) ─────
  await showScreen(page, 'settings-screen');
  await page.evaluate(() => window.gameManagerInstance.togglePhysicsCalibrator(true));
  await new Promise(r => setTimeout(r, 300));
  await shot(page, 'r2_physics_calibrator.png');
  results.calibrator_rect = await page.evaluate(() => {
    const panel = document.getElementById('physics-calibrator-screen');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight, visible: getComputedStyle(panel).display !== 'none' };
  });

  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})();
