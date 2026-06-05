import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 5173;
const url = `http://localhost:${port}`;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isPortOpen(port) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(1000);
    socket.once('error', onError);
    socket.once('timeout', onError);
    socket.connect(port, '127.0.0.1', () => {
      socket.end();
      resolve(true);
    });
  });
}

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => {
      resolve(false);
    });
    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });
    server.listen(port);
  });
}

async function terminateProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const execSync = (await import('child_process')).execSync;
      let output = "";
      try {
        output = execSync(`netstat -ano`).toString();
      } catch (e) {
        // ignore error if netstat fails
      }
      const lines = output.split('\n');
      for (const line of lines) {
        if (line.includes(`:${port}`)) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid) && pid !== '0') {
            console.log(`Killing Windows process ${pid} on port ${port}...`);
            try {
              execSync(`taskkill /pid ${pid} /f /t`);
            } catch (e) {}
          }
        }
      }
    } else {
      const execSync = (await import('child_process')).execSync;
      try {
        execSync(`fuser -k -n tcp ${port}`);
        console.log(`Terminated Unix process on port ${port} using fuser.`);
      } catch (e) {
        try {
          execSync(`kill -9 $(lsof -t -i:${port})`);
          console.log(`Terminated Unix process on port ${port} using lsof/kill.`);
        } catch (err2) {
          // ignore
        }
      }
    }
  } catch (err) {
    console.error(`Failed to clear port ${port}:`, err);
  }
}

async function run() {
  const playtestsDir = __dirname;
  if (!fs.existsSync(playtestsDir)) {
    fs.mkdirSync(playtestsDir);
  }

  // 1. Port Safety and cleanup
  console.log(`Checking port ${port} availability...`);
  const available = await isPortAvailable(port);
  if (!available) {
    console.warn(`Port ${port} is currently in use. Attempting to clear it...`);
    await terminateProcessOnPort(port);
    await delay(1000);
  }

  console.log('Starting Vite server...');
  const isWin = process.platform === 'win32';
  const cmd = isWin ? 'npx.cmd' : 'npx';
  const viteProcess = spawn(cmd, ['vite', '--port', String(port), '--strictPort'], {
    shell: isWin,
    stdio: 'pipe'
  });

  viteProcess.stdout.on('data', (data) => {
    console.log(`[Vite STDOUT] ${data.toString().trim()}`);
  });

  viteProcess.stderr.on('data', (data) => {
    console.error(`[Vite STDERR] ${data.toString().trim()}`);
  });

  console.log(`Waiting for server on port ${port}...`);
  let started = false;
  for (let i = 0; i < 50; i++) {
    if (await isPortOpen(port)) {
      started = true;
      break;
    }
    await delay(300);
  }

  if (!started) {
    console.error('Failed to start Vite server.');
    viteProcess.kill('SIGKILL');
    process.exit(1);
  }
  console.log('Vite server started successfully.');

  let browser;
  try {
    console.log('Detecting system Chrome/Edge...');
    const possiblePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/usr/bin/google-chrome',
      '/usr/bin/microsoft-edge',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser'
    ];
    let executablePath = undefined;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        console.log(`Found system browser at: ${p}`);
        break;
      }
    }
    
    console.log('Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    async function takeScreenshotSequence(viewportWidth, viewportHeight, suffix) {
      console.log(`Running sequence for ${viewportWidth}x${viewportHeight}...`);
      
      // Use clean incognito context to avoid state leaks
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
      
      page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.text()}`));
      page.on('pageerror', err => console.error(`[BROWSER ERROR] ${err.toString()}`));

      await page.setViewport({ width: viewportWidth, height: viewportHeight });

      // 1. Load Main Menu
      console.log('Loading Main Menu...');
      await page.goto(url, { waitUntil: 'networkidle2' });
      await page.waitForSelector('#menu-screen.active', { timeout: 10000 });
      await delay(1000);
      await page.screenshot({ path: path.join(playtestsDir, `menu_main${suffix}.png`) });
      console.log(`Saved menu_main${suffix}.png`);

      // 2. Click Settings
      console.log('Clicking Settings Gear...');
      await page.waitForSelector('#btn-settings-gear', { visible: true });
      await page.click('#btn-settings-gear');
      await page.waitForSelector('#settings-screen.active', { timeout: 5000 });
      await delay(500);
      await page.screenshot({ path: path.join(playtestsDir, `menu_settings${suffix}.png`) });
      console.log(`Saved menu_settings${suffix}.png`);

      // 3. Enable Touch HUD
      const touchBtn = await page.$('#btn-settings-touch');
      const touchText = await page.evaluate(el => el.innerText, touchBtn);
      if (touchText.includes('OFF')) {
        console.log('Toggling Touch HUD ON...');
        await page.click('#btn-settings-touch');
        await delay(500);
      }

      // 4. Click Hovercraft Garage
      console.log('Opening Hovercraft Garage...');
      await page.click('#btn-settings-picker');
      await page.waitForSelector('#ship-picker-screen.active', { timeout: 5000 });
      
      // Wait for ship 3D model to load in garage
      await page.waitForFunction(() => {
        return window.gameManagerInstance &&
               window.gameManagerInstance.graphics &&
               window.gameManagerInstance.graphics.isObjLoaded;
      }, { timeout: 15000 });
      
      await delay(500);
      await page.screenshot({ path: path.join(playtestsDir, `menu_garage${suffix}.png`) });
      console.log(`Saved menu_garage${suffix}.png`);

      // 5. Go Back to Settings, then Main Menu
      console.log('Returning to Settings...');
      await page.click('#btn-picker-back');
      await page.waitForSelector('#settings-screen.active', { timeout: 5000 });
      await delay(300);
      console.log('Closing Settings Menu...');
      await page.click('#btn-settings-close');
      await page.waitForSelector('#menu-screen.active', { timeout: 5000 });
      await delay(300);

      // 6. Click Play Standard (Level Select)
      console.log('Opening Level Select...');
      await page.click('#btn-play-standard');
      await page.waitForSelector('#level-screen.active', { timeout: 5000 });
      await delay(500);
      await page.screenshot({ path: path.join(playtestsDir, `menu_levels${suffix}.png`) });
      console.log(`Saved menu_levels${suffix}.png`);

      // 7. Load first level
      console.log('Loading first level...');
      await page.click('.level-grid-container .level-item');
      
      // Wait for HUD to become active, indicating level loaded
      await page.waitForSelector('#hud', { timeout: 15000 });
      // Wait for the 3D ship model to load in active gameplay
      await page.waitForFunction(() => {
        return window.gameManagerInstance &&
               window.gameManagerInstance.graphics &&
               window.gameManagerInstance.graphics.isObjLoaded;
      }, { timeout: 15000 });
      
      await delay(1000);

      // Cycle camera
      console.log('Cycling Camera View...');
      await page.keyboard.press('KeyC');
      await delay(500);
      await page.screenshot({ path: path.join(playtestsDir, `gameplay_active${suffix}.png`) });
      console.log(`Saved gameplay_active${suffix}.png`);

      // 8. Open Touch Customizer
      console.log('Opening Touch Customizer...');
      await page.evaluate(() => {
        const hud = document.getElementById('mobile-touch-hud');
        if (hud) {
          console.log(`[DEBUG] #mobile-touch-hud classes: "${hud.className}", display: ${getComputedStyle(hud).display}, visibility: ${getComputedStyle(hud).visibility}`);
        } else {
          console.log('[DEBUG] #mobile-touch-hud NOT found!');
        }
        const btn = document.getElementById('btn-touch-customize');
        if (btn) {
          const rect = btn.getBoundingClientRect();
          console.log(`[DEBUG] Button #btn-touch-customize properties - display: ${getComputedStyle(btn).display}, visibility: ${getComputedStyle(btn).visibility}, opacity: ${getComputedStyle(btn).opacity}, rect: {x: ${rect.x}, y: ${rect.y}, w: ${rect.width}, h: ${rect.height}}`);
        } else {
          console.log('[DEBUG] Button #btn-touch-customize NOT found in DOM!');
        }
        if (window.gameManagerInstance) {
          console.log(`[DEBUG] gameManagerInstance state - gameState: ${window.gameManagerInstance.gameState}, touchControlsEnabled: ${window.gameManagerInstance.keyboard.touchControlsEnabled}`);
        } else {
          console.log('[DEBUG] window.gameManagerInstance NOT found!');
        }
      });
      try {
        await page.click('#btn-touch-customize');
      } catch (clickErr) {
        console.warn('[WARNING] Puppeteer click failed, trying JS click fallback:', clickErr.message);
        await page.evaluate(() => {
          const btn = document.getElementById('btn-touch-customize');
          if (btn) btn.click();
        });
      }
      await page.waitForSelector('#touch-customizer-dashboard', { visible: true, timeout: 5000 });
      await delay(500);
      await page.screenshot({ path: path.join(playtestsDir, `touch_customizer${suffix}.png`) });
      console.log(`Saved touch_customizer${suffix}.png`);

      await page.close();
      await context.close();
    }

    // Run desktop sequence first
    await takeScreenshotSequence(1280, 720, '');
    
    // Run mobile sequence next
    await takeScreenshotSequence(375, 812, '_mobile');

  } catch (err) {
    console.error('Playtest error:', err);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }

    console.log('Terminating Vite server...');
    viteProcess.kill('SIGKILL');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', viteProcess.pid, '/f', '/t']);
    }
    console.log('Done!');
  }
}

run();
