/**
 * Automated Playtest Screenshot Capture Script
 * Skyroads WebGL Visual Design Pipeline — QA Tool
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'scratch', 'playtests');

// Ensure output directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getChromeExecutablePath() {
  if (process.platform === 'win32') {
    const paths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`
    ];
    for (const p of paths) {
      if (fs.existsSync(p)) {
        console.log(`🔍 Found system browser executable at: ${p}`);
        return p;
      }
    }
  }
  return undefined;
}

const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function runPlaytest() {
  console.log("🚀 Starting Automated Playtest Capture Pipeline...");
  
  // 1. Launch Puppeteer browser instance
  const execPath = getChromeExecutablePath();
  const launchOptions = {
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
  if (execPath) {
    launchOptions.executablePath = execPath;
  }
  
  const browser = await puppeteer.launch(launchOptions);
  
  const page = await browser.newPage();
  
  // Set consistent viewport dimensions for visual comparisons (1920x1080)
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log("🔗 Connecting to local game server...");
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  } catch (err) {
    console.error("❌ Could not connect to local server at http://localhost:3000. Make sure to run 'npm run dev' first!");
    await browser.close();
    process.exit(1);
  }
  
  // 2. Navigate menu interface and start gameplay
  console.log("🎮 Navigating menus to start standard level...");
  await page.waitForSelector('#btn-play-standard');
  await page.click('#btn-play-standard');
  
  // Click standard Level 1 (Demo Road)
  await page.waitForSelector('.level-item');
  const levelCards = await page.$$('.level-item');
  if (levelCards.length > 0) {
    await levelCards[0].click();
  }
  
  // Wait for loading screen to clear and game to enter playing state
  console.log("⏳ Waiting for game engine and geometry to load...");
  await page.waitForFunction(() => {
    const screen = document.getElementById('loading-screen');
    return screen && screen.classList.contains('hidden');
  }, { timeout: 15000 });
  
  // 3. Toggle Cockpit Camera View
  console.log("📷 Switching to Cockpit view perspective...");
  // Press KeyC twice to cycle from Follow -> cockpit (or check active state)
  await page.keyboard.press('KeyC');
  await wait(500);
  await page.keyboard.press('KeyC');
  await wait(500);
  
  // 4. Capturing State A (Baseline cockpit HUD)
  console.log("📸 Capturing State A: Cockpit HUD Baseline...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playtest_baseline.png') });
  
  // 5. Accelerating and triggering Boost State
  console.log("⚡ Simulating forward acceleration and boost state...");
  await page.keyboard.down('KeyW'); // Hold forward key
  await wait(2000); // Accelerate
  
  // Call window global to force trigger boost terrain effect
  await page.evaluate(() => {
    if (window.gameManager && window.gameManager.physics) {
      window.gameManager.physics.activeEffects.boost = true;
    }
  });
  await wait(200); // Let visual indicators update
  
  console.log("📸 Capturing State B: Speed Boost active...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playtest_boost.png') });
  
  // Disable boost
  await page.evaluate(() => {
    if (window.gameManager && window.gameManager.physics) {
      window.gameManager.physics.activeEffects.boost = false;
    }
  });
  
  // 6. Draining fuel to trigger Low Fuel warning feedback loops
  console.log("⚠️ Simulating low fuel diagnostics warning state...");
  await page.evaluate(() => {
    if (window.gameManager && window.gameManager.physics) {
      window.gameManager.physics.fuel = 800; // force low fuel (8% of 10000 max scale)
    }
  });
  await wait(400); // Allow warning pulses to flash
  
  console.log("📸 Capturing State C: Low Fuel warning feedback loops...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playtest_low_fuel.png') });
  
  // 7. Test responsive tablet scaling bounds (iPad aspect ratio)
  console.log("📱 Simulating narrow aspect tablet viewport layout scaling...");
  await page.setViewport({ width: 1024, height: 1366 }); // Portrait tablet
  await wait(400);
  
  console.log("📸 Capturing State D: Responsive aspect scaling...");
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'playtest_portrait_tablet.png') });
  
  // Release keyboard
  await page.keyboard.up('KeyW');
  
  // Clean up and close
  console.log("🏁 Playtest screenshots completed! Saved in scratch/playtests/");
  await browser.close();
}

runPlaytest();
