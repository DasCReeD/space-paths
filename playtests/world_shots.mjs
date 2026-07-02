// Ad-hoc visual-verification harness for the standard-pack per-world neon texture sets.
// Clean elevated 3/4 shots (sim frozen, cockpit + chrome hidden) of road 1 of each of the
// 10 original SkyRoads worlds (RED HEAT … DRUIDIA), so each world's road/obstacle textures
// can be judged directly. Mirrors playtests/biome_shots.mjs.
// Usage: PORT=3000 node playtests/world_shots.mjs   (dev server must be running)
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = 'http://localhost:' + (process.env.PORT || '3000');
const outDir = path.join(__dirname, 'world_shots');
fs.mkdirSync(outDir, { recursive: true });

// standard pack: idx 0 = demo, then 10 worlds × 3 roads. Road 1 of each world = 1,4,7,...,28.
// Plus roads 1/2/3 of RED HEAT to eyeball the per-road hue drift.
const worlds = ['red_heat', 'into_the_sun', 'blue_planet', 'satellite', 'misty',
                'asteroid_belt', 'crab_nebula', 'over_the_base', 'the_earth', 'druidia'];
const targets = worlds.map((label, w) => ({ pack: 'standard', idx: 1 + w * 3, label: `${w}_${label}` }));
targets.push({ pack: 'standard', idx: 2, label: '0_red_heat_road2' });
targets.push({ pack: 'standard', idx: 3, label: '0_red_heat_road3' });

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

  let lastPack = null;
  for (const t of targets) {
    try {
      if (t.pack !== lastPack) {
        await page.evaluate((p) => window.gameManagerInstance.showLevelSelection(p), t.pack);
        await page.waitForSelector('#level-screen.active', { timeout: 20000 });
        await delay(300);
        lastPack = t.pack;
      }
      await page.evaluate(async (i) => {
        const m = window.gameManagerInstance;
        await m.startLevel(i);
        if (!m.__origPhys) m.__origPhys = m.physics.update.bind(m.physics);
        m.physics.update = () => {};
      }, t.idx);
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
