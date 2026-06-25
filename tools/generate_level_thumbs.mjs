// Batch level-thumbnail generator.
//
// Spins up the Vite dev server, drives the real game with Puppeteer, and for
// every level in every pack captures a clean "scenic elevated" screenshot used
// by the level-select title card (see app.js updateTitleCard / index.html
// #level-title-card). Output: assets/level_thumbs/<pack>_<idx>.jpg, keyed the
// same way as the leaderboard (skyroads_..._<pack>_<idx>) so the UI lookup is
// trivial. One-time / on-demand — not part of the normal build.
//
// Camera trick: graphics.update() does the per-frame ship+camera follow; we
// swap it for a no-op so the ship/camera freeze, set an elevated 3/4 pose, then
// let graphics.render() (still running each frame) draw it before we capture.

import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const outDir = path.join(repoRoot, 'assets', 'level_thumbs');

const port = 5173;
const url = `http://localhost:${port}`;
// Quick-iteration overrides: THUMB_PACKS=generated THUMB_MAX=2 node ...
const PACKS = (process.env.THUMB_PACKS || 'generated,standard,xmas').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_PER_PACK = process.env.THUMB_MAX ? parseInt(process.env.THUMB_MAX, 10) : Infinity;
const VIEWPORT = { width: 768, height: 432 };

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function isPortOpen(p) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const fail = () => { socket.destroy(); resolve(false); };
    socket.setTimeout(1000);
    socket.once('error', fail);
    socket.once('timeout', fail);
    socket.connect(p, '127.0.0.1', () => { socket.end(); resolve(true); });
  });
}

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

async function run() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('Starting Vite server...');
  const isWin = process.platform === 'win32';
  const vite = spawn(isWin ? 'npx.cmd' : 'npx', ['vite', '--port', String(port), '--strictPort'],
    { shell: isWin, stdio: 'pipe', cwd: repoRoot });
  vite.stderr.on('data', (d) => process.env.DEBUG && console.error(`[vite] ${d}`));

  let up = false;
  for (let i = 0; i < 50; i++) { if (await isPortOpen(port)) { up = true; break; } await delay(300); }
  if (!up) { console.error('Vite did not start.'); vite.kill('SIGKILL'); process.exit(1); }
  console.log('Vite up.');

  let browser;
  let totalShots = 0;
  try {
    browser = await puppeteer.launch({
      headless: 'new', executablePath: findBrowser(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--enable-webgl', '--ignore-gpu-blocklist'],
    });
    const page = await browser.newPage();
    page.on('pageerror', (e) => console.error(`[browser error] ${e}`));
    await page.setViewport(VIEWPORT);

    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#menu-screen.active', { timeout: 15000 });
    await page.waitForFunction(() => !!window.gameManagerInstance, { timeout: 15000 });

    for (const pack of PACKS) {
      console.log(`\n=== Pack: ${pack} ===`);
      // Load the pack + render the level list, then count its playable levels.
      await page.evaluate((p) => window.gameManagerInstance.showLevelSelection(p), pack);
      await page.waitForSelector('#level-screen.active', { timeout: 20000 });
      await delay(400);
      const fullCount = await page.evaluate(() =>
        document.querySelectorAll('#level-crossbar .level-item').length);
      const count = Math.min(fullCount, MAX_PER_PACK);
      console.log(`  ${count}/${fullCount} levels`);

      for (let idx = 0; idx < count; idx++) {
        const outPath = path.join(outDir, `${pack}_${idx}.jpg`);
        try {
          await page.evaluate(async (i) => { await window.gameManagerInstance.startLevel(i); }, idx);
          await page.waitForFunction(
            () => window.gameManagerInstance?.graphics?.isObjLoaded === true, { timeout: 15000 });

          // Leave cockpit mode first: that detaches the 3D dashboard overlay and
          // gives us an external camera to reposition. Let update() run a few
          // frames so the console hides before we freeze.
          await page.evaluate(() => { window.gameManagerInstance.graphics.cameraMode = 'follow'; });
          await delay(700); // geometry/materials settle + mode change applies

          // Freeze the sim, set a scenic elevated 3/4 pose, hide all chrome.
          await page.evaluate(() => {
            const g = window.gameManagerInstance.graphics;
            if (!g.__origUpdate) g.__origUpdate = g.update;
            g.update = () => {};
            if (g.cockpitConsole3D && g.cockpitConsole3D.group) g.cockpitConsole3D.group.visible = false;
            const s = (g.shipMesh && g.shipMesh.position) || { x: 0, y: 0, z: 0 };
            g.camera.fov = 64;
            g.camera.position.set(s.x + 4, s.y + 7.5, s.z + 11);
            g.camera.lookAt(s.x, s.y - 1, s.z - 28);
            g.camera.updateProjectionMatrix();
            // Hide all chrome for a clean shot. Inline !important beats any
            // !important class rule on the floating in-game buttons.
            window.__thumbHidden = [];
            document.querySelectorAll('button, #fps-counter, #top-right-hud, #hud, #checkpoint-notify')
              .forEach((el) => { window.__thumbHidden.push(el); el.style.setProperty('display', 'none', 'important'); });
          });
          await delay(220); // a few render frames with the new camera

          const rect = await page.evaluate(() => {
            const c = window.gameManagerInstance.graphics.renderer.domElement;
            const r = c.getBoundingClientRect();
            return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
          });
          await page.screenshot({ path: outPath, type: 'jpeg', quality: 82, clip: rect });
          totalShots++;
          process.stdout.write(`  ✓ ${pack}_${idx}.jpg\r`);

          // Restore per-frame update + chrome for the next level.
          await page.evaluate(() => {
            const g = window.gameManagerInstance.graphics;
            if (g.__origUpdate) g.update = g.__origUpdate;
            (window.__thumbHidden || []).forEach((el) => el.style.removeProperty('display'));
            window.__thumbHidden = [];
          });
        } catch (e) {
          console.warn(`\n  ✗ ${pack}_${idx} failed: ${e.message}`);
          // Make sure update is restored even on failure.
          await page.evaluate(() => {
            const g = window.gameManagerInstance?.graphics;
            if (g && g.__origUpdate) g.update = g.__origUpdate;
          }).catch(() => {});
        }
      }
      console.log(`\n  done: ${pack}`);
    }
  } catch (err) {
    console.error('Generator error:', err);
  } finally {
    if (browser) await browser.close();
    vite.kill('SIGKILL');
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(vite.pid), '/f', '/t']);
    console.log(`\nDone. ${totalShots} thumbnails written to ${path.relative(repoRoot, outDir)}.`);
  }
}

run();
