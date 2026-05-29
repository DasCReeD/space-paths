// SkyRoads WebGL - Core Game Orchestrator & State Controller
import { LEVEL_PACKS } from './levels.js';
import { GraphicsEngine } from './graphics.js';
import { PhysicsEngine, KeyboardController, SHIP_LENGTH } from './physics.js';
import { buildLevel } from './levelLoader.js';
import { gameAudio } from './audio.js';

class GameManager {
  constructor() {
    // Engine instances
    this.graphics = new GraphicsEngine();
    this.physics = new PhysicsEngine();
    this.keyboard = new KeyboardController();
    
    // Game state variables
    this.currentPack = 'standard'; // 'standard' or 'xmas'
    this.currentLevelIndex = 0;
    this.currentLevelData = null;
    this.levelInfo = null;
    
    this.gameState = 'menu'; // 'menu', 'level_select', 'playing', 'death', 'success'
    this.lastTime = 0;
    this.animationFrameId = null;

    // Road names in original order for display polish
    this.standardRoadNames = [
      "DEMO ROAD", "RED HEAT", "ROAD 2", "ROAD 3", "ROAD 4", "ROAD 5", "ROAD 6", "ROAD 7", "ROAD 8", "ROAD 9",
      "ROAD 10", "ROAD 11", "ROAD 12", "ROAD 13", "ROAD 14", "ROAD 15", "ROAD 16", "ROAD 17", "ROAD 18", "ROAD 19",
      "ROAD 20", "ROAD 21", "ROAD 22", "ROAD 23", "ROAD 24", "ROAD 25", "ROAD 26", "ROAD 27", "ROAD 28", "ROAD 29",
      "ROAD 30"
    ];
    this.xmasRoadNames = [
      "XMAS DEMO", "ROAD 1", "ROAD 2", "ROAD 3", "ROAD 4", "ROAD 5", "ROAD 6", "ROAD 7", "ROAD 8", "ROAD 9",
      "ROAD 10", "ROAD 11", "ROAD 12", "ROAD 13", "ROAD 14", "ROAD 15", "ROAD 16", "ROAD 17", "ROAD 18", "ROAD 19",
      "ROAD 20", "ROAD 21", "ROAD 22", "ROAD 23", "ROAD 24", "ROAD 25", "ROAD 26", "ROAD 27", "ROAD 28", "ROAD 29",
      "ROAD 30"
    ];
  }

  init() {
    // 1. Initialize Visual Viewport
    const container = document.getElementById('canvas-container');
    this.graphics.init(container);

    // 2. Setup Navigation Listeners
    this.setupUIListeners();

    // 3. Start high-frequency background render loop (stars sparkling)
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  setupUIListeners() {
    // Menu triggers
    document.getElementById('btn-play-standard').addEventListener('click', () => {
      gameAudio.playClick();
      this.showLevelSelection('standard');
    });

    document.getElementById('btn-play-xmas').addEventListener('click', () => {
      gameAudio.playClick();
      this.showLevelSelection('xmas');
    });

    document.getElementById('btn-how-to').addEventListener('click', () => {
      gameAudio.playClick();
      this.showScreen('how-to-screen');
    });

    document.getElementById('btn-how-to-back').addEventListener('click', () => {
      gameAudio.playClick();
      this.showScreen('menu-screen');
    });

    document.getElementById('btn-level-back').addEventListener('click', () => {
      gameAudio.playClick();
      this.showScreen('menu-screen');
    });

    // Death / Victory screen retry triggers
    document.getElementById('btn-death-retry').addEventListener('click', () => {
      gameAudio.playClick();
      this.startLevel(this.currentLevelIndex);
    });

    document.getElementById('btn-death-menu').addEventListener('click', () => {
      gameAudio.playClick();
      this.returnToMenu();
    });

    document.getElementById('btn-success-next').addEventListener('click', () => {
      gameAudio.playClick();
      const nextIdx = this.currentLevelIndex + 1;
      const packLevels = LEVEL_PACKS[this.currentPack];
      if (nextIdx < packLevels.length) {
        this.startLevel(nextIdx);
      } else {
        this.returnToMenu();
      }
    });

    document.getElementById('btn-success-menu').addEventListener('click', () => {
      gameAudio.playClick();
      this.returnToMenu();
    });
  }

  showScreen(screenId) {
    // Hide all overlay screens
    const screens = document.querySelectorAll('.overlay-screen');
    screens.forEach(s => s.classList.remove('active'));
    screens.forEach(s => s.classList.add('hidden'));

    // Show target screen
    const target = document.getElementById(screenId);
    target.classList.remove('hidden');
    // Force reflow for transitions
    target.offsetHeight;
    target.classList.add('active');
  }

  showLevelSelection(packName) {
    this.currentPack = packName;
    this.gameState = 'level_select';
    
    const packTitle = packName === 'standard' ? 'STANDARD PACK' : 'XMAS SPECIAL';
    document.getElementById('level-pack-title').innerText = packTitle;

    const grid = document.getElementById('level-grid');
    grid.innerHTML = ''; // Clear previous

    const levels = LEVEL_PACKS[packName];
    const names = packName === 'standard' ? this.standardRoadNames : this.xmasRoadNames;

    levels.forEach((level, idx) => {
      const btn = document.createElement('div');
      btn.className = 'level-item';
      
      const numLabel = document.createElement('div');
      numLabel.className = 'level-num';
      numLabel.innerText = idx;
      
      const nameLabel = document.createElement('div');
      nameLabel.className = 'level-name';
      nameLabel.innerText = names[idx] || `ROAD ${idx}`;

      btn.appendChild(numLabel);
      btn.appendChild(nameLabel);

      btn.addEventListener('click', () => {
        gameAudio.playClick();
        this.startLevel(idx);
      });

      grid.appendChild(btn);
    });

    this.showScreen('level-screen');
  }

  startLevel(index) {
    this.currentLevelIndex = index;
    const packLevels = LEVEL_PACKS[this.currentPack];
    this.currentLevelData = packLevels[index];
    
    // Bind to window to allow physics engines gap detection lookup
    window.currentGamePack = this.currentPack;
    window.currentLevelIndex = index;
    window.currentLevelData = this.currentLevelData;

    // 1. Reset Scene Meshes
    this.graphics.clearLevel();
    if (this.levelInfo && this.levelInfo.roadMeshes) {
      this.levelInfo.roadMeshes.forEach(mesh => {
        this.graphics.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    }

    // 2. Build track geometry
    this.levelInfo = buildLevel(this.currentLevelData, this.graphics.scene);

    // 3. Reset Physics ship state
    this.physics.reset(this.levelInfo.fuel, this.levelInfo.oxygen);

    // 4. Update HUD and hide overlays
    document.getElementById('hud').classList.remove('hidden');
    this.showScreen(''); // Hide all menus

    // 5. Trigger Continuous Sound Hum
    gameAudio.startEngine();

    this.gameState = 'playing';
    this.lastTime = performance.now();
  }

  returnToMenu() {
    this.gameState = 'menu';
    document.getElementById('hud').classList.add('hidden');
    gameAudio.stopEngine();
    this.showScreen('menu-screen');
  }

  animate(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000.0;
    this.lastTime = timestamp;

    if (this.gameState === 'playing') {
      // 1. Advance Physics Engine (DT capped internally to prevent tunneling)
      this.physics.update(dt, this.keyboard, this.levelInfo);

      // 2. Refresh HUD overlays
      this.updateHUD();

      // 3. Chase Camera and thrusters
      this.graphics.update(this.physics, dt);

      // 4. Modulate Engine frequency
      const speedRatio = Math.abs(this.physics.velocity.z) / this.physics.maxSpeedNormal;
      gameAudio.updateEngineSpeed(speedRatio);

      // 5. Check Refill Audio trigger from physics
      if (this.physics.triggerRefillAudio) {
        gameAudio.playRefill();
        this.physics.triggerRefillAudio = false;
      }

      // 6. Check success condition (crossed Z-line)
      if (!this.physics.isDead && this.physics.position.z <= this.levelInfo.finishZ + SHIP_LENGTH / 2) {
        this.handleSuccess();
      }

      // 7. Check death condition
      if (this.physics.isDead) {
        this.handleDeath();
      }

    } else {
      // Spin stars background slightly while in menus for dynamic feel
      if (this.graphics.starField) {
        this.graphics.starField.rotation.y += 0.02 * dt;
      }
      this.graphics.render();
    }

    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }

  updateHUD() {
    // Speed conversion (relative Z-speed to km/h)
    const speedKmh = Math.floor(Math.abs(this.physics.velocity.z) * 10);
    document.getElementById('hud-speed-text').innerText = String(speedKmh).padStart(3, '0');
    
    // Cap speed bar at 100%
    const maxZSpeed = this.physics.activeEffects.boost ? this.physics.maxSpeedBoost : this.physics.maxSpeedNormal;
    const speedPct = Math.min(100, (Math.abs(this.physics.velocity.z) / maxZSpeed) * 100);
    document.getElementById('hud-speed-bar').style.width = `${speedPct}%`;

    // Oxygen
    const oxygen = Math.ceil(this.physics.oxygen);
    document.getElementById('hud-oxygen-text').innerText = String(oxygen).padStart(3, '0');
    document.getElementById('hud-oxygen-bar').style.width = `${oxygen}%`;

    // Fuel (Original DOS maps scale)
    const fuel = Math.ceil(this.physics.fuel);
    document.getElementById('hud-fuel-text').innerText = String(fuel).padStart(5, '0');
    const fuelPct = Math.min(100, (this.physics.fuel / (this.levelInfo.fuel * 50)) * 100);
    document.getElementById('hud-fuel-bar').style.width = `${fuelPct}%`;

    // Progress Bar
    const absoluteZ = -this.physics.position.z;
    const progressPct = Math.min(100, Math.max(0, (absoluteZ / this.levelInfo.trackLength) * 100));
    document.getElementById('hud-progress-bar').style.width = `${progressPct}%`;
    document.getElementById('hud-progress-marker').style.left = `${progressPct}%`;
  }

  handleDeath() {
    this.gameState = 'death';
    gameAudio.stopEngine();
    gameAudio.playExplosion();
    this.graphics.triggerExplosion(this.physics.position);

    // Display appropriate death reason
    let msg = "Your ship crashed into a wall of solid block.";
    if (this.physics.deathReason === 'FELL OFF ROAD') {
      msg = "You steered off the edge and plummeted into the deep abyss.";
    } else if (this.physics.deathReason === 'OUT OF FUEL') {
      msg = "Your thrusters sputtered out of fuel and shut down.";
    } else if (this.physics.deathReason === 'OUT OF OXYGEN') {
      msg = "Life support systems failed. You ran out of oxygen.";
    } else if (this.physics.deathReason === 'BURNED TO CRIPPLES') {
      msg = "Your hull melted immediately on contact with a burning tile.";
    }

    document.getElementById('death-reason').innerText = msg;
    
    // Delay death menu overlay to admire the explosion
    setTimeout(() => {
      if (this.gameState === 'death') {
        this.showScreen('death-screen');
      }
    }, 1200);
  }

  handleSuccess() {
    this.gameState = 'success';
    gameAudio.stopEngine();
    gameAudio.playWin();
    
    // Hide next button if it was the last road
    const packLevels = LEVEL_PACKS[this.currentPack];
    if (this.currentLevelIndex + 1 >= packLevels.length) {
      document.getElementById('btn-success-next').classList.add('hidden');
    } else {
      document.getElementById('btn-success-next').classList.remove('hidden');
    }

    this.showScreen('success-screen');
  }
}

// Instantiate and start the application on load
window.addEventListener('DOMContentLoaded', () => {
  const manager = new GameManager();
  manager.init();
});
