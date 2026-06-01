/**
 * Master Design Pipeline Controller
 * Skyroads WebGL Visual Design Pipeline — QA Tool
 */

import { spawn } from 'child_process';
import http from 'http';
import path from 'path';

const CAPTURE_SCRIPT = path.join(process.cwd(), '.agents', 'ui_design_pipeline', 'playtest_capture_script.js');

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to poll the server until it is active
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get('http://localhost:3000', (res) => {
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
  });
}

async function runPipeline() {
  console.log("🌟 Initiating Automated Design-Playtest Pipeline...");
  
  // 1. Check if a server is already running on port 3000
  let isAlreadyRunning = await checkServerReady();
  let devServerProcess = null;
  
  if (!isAlreadyRunning) {
    console.log("🔌 Local server not detected. Launching Vite dev server...");
    
    // Set environment variable to run vite on port 3000 in background
    devServerProcess = spawn('npx', ['vite', '--port', '3000'], {
      shell: true,
      stdio: 'inherit'
    });
    
    // Poll server up to 10 seconds until ready
    let retries = 20;
    while (retries > 0) {
      await wait(500);
      const ready = await checkServerReady();
      if (ready) {
        console.log("✅ Vite dev server is active and listening on http://localhost:3000!");
        break;
      }
      retries--;
    }
    
    if (retries === 0) {
      console.error("❌ Timeout waiting for Vite server to start.");
      devServerProcess.kill();
      process.exit(1);
    }
  } else {
    console.log("🔗 Pre-existing active dev server detected on port 3000. Reusing it.");
  }
  
  // 2. Spawn playtest capture driver script
  console.log("🤖 Launching Automated Playtest Driver...");
  const captureProcess = spawn('node', [`"${CAPTURE_SCRIPT}"`], {
    shell: true,
    stdio: 'inherit'
  });
  
  captureProcess.on('close', (code) => {
    console.log(`🏁 Playtest Driver finished with exit code ${code}`);
    
    // 3. Clean up and stop dev server if we launched it
    if (devServerProcess) {
      console.log("🔌 Stopping Vite dev server...");
      devServerProcess.kill();
    }
    
    console.log("\n🚀 Visual design screenshots are ready in scratch/playtests/!");
    console.log("👉 Next Step: Send these images to your Visual Art Critic agent (via Gemini Vision) to analyze!");
    process.exit(code);
  });
}

runPipeline();
