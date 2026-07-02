// Visual QA for the full neon rollout: Xmas worlds, upgraded generated biomes, and flow/tower.
// Usage: PORT=3000 node playtests/all_shots.mjs   (dev server must be running)
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'http://localhost:' + (process.env.PORT || '3000');
const outDir = path.join(__dirname, 'all_shots');
fs.mkdirSync(outDir, { recursive: true });

// mode 'classic' → startLevel(idx); mode 'flow'/'tower' → startGroup(worldIdx)
const targets = [
  // Xmas worlds (standalone xmas pack): road 1 of each of the 10 worlds
  ...['snowbound', 'outer_rim', 'twilight', 'guiding_star', 'meteor', 'mystery', 'aurora', 'pole', 'under_ice', 'the_eve']
    .map((label, w) => ({ style: 'classic', pack: 'xmas', idx: 1 + w * 3, label: `xmas_${w}_${label}` })),
  // Upgraded generated biomes (skip void 61 = demo look): first level of each biome
  ...['ridge_64', 'thrill_67', 'core_70', 'glitch_73', 'tundra_76', 'furnace_79', 'shallows_82', 'spire_85', 'pulse_88']
    .map((label, b) => ({ style: 'classic', pack: 'generated', idx: 3 + b * 3, label: `gen_${label}` })),
  // Flow / tower sanity — neon must render in the stacked modes too
  { style: 'flow', pack: 'generated', worldIdx: 1, label: 'flow_generated_ridge' },
  { style: 'flow', pack: 'xmas', worldIdx: 1, label: 'flow_xmas' },
  { style: 'tower', pack: 'standard', worldIdx: 3, label: 'tower_standard' },
];

const delay = (ms) => new Promise(r => setTimeout(r, ms));

const run = async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 640 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction('!!window.gameManagerInstance', { timeout: 30000 });
  await page.mouse.click(512, 320);
  await delay(400);

  for (const t of targets) {
    try {
      await page.evaluate(async (t) => {
        const m = window.gameManagerInstance;
        m.setPlayStyle(t.style);
        await m.showLevelSelection(t.pack);
      }, t);
      await page.waitForSelector('#level-screen.active', { timeout: 20000 });
      await delay(250);

      await page.evaluate(async (t) => {
        const m = window.gameManagerInstance;
        if (t.style === 'classic') await m.startLevel(t.idx);
        else await m.startGroup(t.worldIdx);
        if (!m.__origPhys) m.__origPhys = m.physics.update.bind(m.physics);
        m.physics.update = () => {};
      }, t);
      await page.waitForFunction('window.gameManagerInstance?.graphics?.isObjLoaded === true', { timeout: 20000 });

      await page.evaluate(() => {
        const g = window.gameManagerInstance.graphics;
        if (!g.__origUpdate) g.__origUpdate = g.update;
        g.update = () => {};
        g.cameraMode = 'follow';
        if (g.cockpitConsole3D && g.cockpitConsole3D.group) g.cockpitConsole3D.group.visible = false;
        const s = (g.shipMesh && g.shipMesh.position) || { x: 0, y: 0, z: 0 };
        g.camera.fov = 60;
        g.camera.position.set(s.x + 3, s.y + 6, s.z + 9);
        g.camera.lookAt(s.x, s.y - 1, s.z - 24);
        g.camera.updateProjectionMatrix();
        window.__hidden = [];
        document.querySelectorAll('button, #fps-counter, #top-right-hud, #hud, #checkpoint-notify')
          .forEach((el) => { window.__hidden.push(el); el.style.setProperty('display', 'none', 'important'); });
      });
      await delay(500);

      const rect = await page.evaluate(() => {
        const c = window.gameManagerInstance.graphics.renderer.domElement;
        const r = c.getBoundingClientRect();
        return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
      });
      await page.screenshot({ path: path.join(outDir, `${t.label}.png`), clip: rect });
      console.log(`saved ${t.label}`);

      await page.evaluate(() => {
        const m = window.gameManagerInstance;
        const g = m.graphics;
        if (g.__origUpdate) g.update = g.__origUpdate;
        if (m.__origPhys) m.physics.update = m.__origPhys;
        (window.__hidden || []).forEach((el) => el.style.removeProperty('display'));
        window.__hidden = [];
      });
    } catch (e) {
      console.log(`FAILED ${t.label}: ${e.message}`);
      await page.evaluate(() => { const g = window.gameManagerInstance?.graphics; if (g && g.__origUpdate) g.update = g.__origUpdate; }).catch(() => {});
    }
  }

  await browser.close();
  console.log('done ->', outDir);
};

run().catch(e => { console.error(e); process.exit(1); });
