// SkyRoads WebGL - Core Game Orchestrator & State Controller
import { loadLevelPack, getCachedPack } from './levels.js';
import { GraphicsEngine } from './graphics.js';
import { PhysicsEngine, KeyboardController, SHIP_LENGTH } from './physics.js';
import { buildLevelAsync } from './levelLoader.js';
import { gameAudio } from './audio.js';
import { ShipPreviewEngine } from './preview.js';

const SKIN_DETAILS = {
  default: { name: "DEFAULT", desc: "Standard spaceforce combat livery" },
  freelancer: { name: "FREELANCER", desc: "Sleek carbon-fiber composite plating" },
  lordshadow: { name: "LORD SHADOW", desc: "Dark stealth plating for covert deep-space runs" },
  psionic: { name: "PSIONIC", desc: "Psionic energy-shielded armor plating" },
  shadee: { name: "SHADEE", desc: "Vibrant metallic racing decals" },
  thor: { name: "THOR", desc: "Golden thundergod battle plating" },
  skin1: { name: "RED CORSAIR", desc: "Traditional military-grade red & white livery" },
  skin2: { name: "GREEN ACID", desc: "Vibrant green and carbon-black armor casing" },
  skin3: { name: "BLUE NEBULA", desc: "Deep cobalt blue spaceforce plating" },
  skin4: { name: "ORANGE BURNING", desc: "High-contrast hazard orange warning colors" }
};

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
    
    this.gameState = 'menu'; // 'menu', 'loading', 'level_select', 'playing', 'death', 'success'
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
    this.wasSteeringLastFrame = false;
    this.wallScrapeSoundTimer = 0.0;

    // Ship preview variables
    this.previewEngine = null;
    this.tempSelectedSkin = 'default';
  }

  init() {
    // 1. Initialize Visual Viewport
    const container = document.getElementById('canvas-container');
    this.graphics.init(container);

    // Load persisted mouse setting from localStorage
    const savedMousePlay = localStorage.getItem('skyroads_mouse_play') === 'true';
    this.keyboard.mouseControlsEnabled = savedMousePlay;
    this.updateMouseToggleBtn();

    // Load persisted model and skin preferences
    this.selectedModel = localStorage.getItem('skyroads_selected_model') || 'corvette1';
    this.selectedSkin = localStorage.getItem('skyroads_selected_skin') || '#ff007f';
    this.graphics.currentModelName = this.selectedModel;
    this.graphics.currentSkinName = this.selectedSkin;

    // 2. Setup Navigation Listeners
    this.setupUIListeners();

    // 3. Listen to camera controls during play (KeyC toggles modes, [ and ] adjusts zoom, - and = adjusts height)
    window.addEventListener('keydown', (e) => {
      if (this.gameState !== 'playing') return;

      if (e.code === 'KeyC') {
        gameAudio.playClick();
        this.graphics.toggleCameraMode();
      }
      if (e.code === 'BracketLeft') {
        gameAudio.playClick();
        this.graphics.cycleZoomLevel(-1); // zoom in
      }
      if (e.code === 'BracketRight') {
        gameAudio.playClick();
        this.graphics.cycleZoomLevel(1); // zoom out
      }
      if (e.code === 'Minus') {
        gameAudio.playClick();
        this.graphics.adjustCameraHeight(-1); // lower camera height
      }
      if (e.code === 'Equal') {
        gameAudio.playClick();
        this.graphics.adjustCameraHeight(1); // raise camera height
      }
    });

    // 4. Listen to keyboard menu navigation when not actively playing a level
    window.addEventListener('keydown', (e) => {
      if (this.gameState === 'playing') return;
      this.handleMenuKeyboard(e);
    });

    // 5. Start high-frequency background render loop (stars sparkling)
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  updateMouseToggleBtn() {
    const btn = document.getElementById('btn-toggle-mouse');
    if (!btn) return;
    if (this.keyboard.mouseControlsEnabled) {
      btn.innerText = 'MOUSE PLAY: ON';
      btn.classList.remove('btn-info');
      btn.classList.add('btn-primary');
    } else {
      btn.innerText = 'MOUSE PLAY: OFF';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-info');
    }
  }

  openShipPicker() {
    this.gameState = 'ship_picker';
    this.tempSelectedModel = this.selectedModel || 'corvette1';
    this.tempSelectedSkin = this.selectedSkin || '#ff007f';
    this.showScreen('ship-picker-screen');
    
    // Update active highlight states on model selector
    this.updateModelPickerSidebarSelection();

    // Set custom color input value
    const colorPickerInput = document.getElementById('ship-color-picker');
    if (colorPickerInput) {
      if (this.tempSelectedSkin.startsWith('#')) {
        colorPickerInput.value = this.tempSelectedSkin;
      } else {
        colorPickerInput.value = '#ff007f';
      }
    }
    
    this.updateColorPickerUISelection();

    // Initialize 3D preview viewport
    const container = document.getElementById('ship-preview-container');
    if (container) {
      if (this.previewEngine) {
        this.previewEngine.destroy();
      }
      this.previewEngine = new ShipPreviewEngine();
      this.previewEngine.init(container, this.tempSelectedModel, this.tempSelectedSkin);
    }
  }

  selectModelInPicker(modelName) {
    this.tempSelectedModel = modelName;
    this.updateModelPickerSidebarSelection();

    // Swap model in 3D preview
    if (this.previewEngine) {
      this.previewEngine.changeModel(modelName, this.tempSelectedSkin);
    }
  }

  selectColorInPicker(hexColor) {
    this.tempSelectedSkin = hexColor;

    // Update color picker input
    const colorPickerInput = document.getElementById('ship-color-picker');
    if (colorPickerInput) {
      colorPickerInput.value = hexColor;
    }

    this.updateColorPickerUISelection();

    if (this.previewEngine) {
      this.previewEngine.changeSkin(hexColor);
    }
  }

  updateModelPickerSidebarSelection() {
    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(opt => {
      const modelName = opt.getAttribute('data-model');
      if (modelName === this.tempSelectedModel) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  updateColorPickerUISelection() {
    const presetOptions = document.querySelectorAll('.color-preset-option');
    presetOptions.forEach(opt => {
      const color = opt.getAttribute('data-color');
      if (color.toLowerCase() === this.tempSelectedSkin.toLowerCase()) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });
  }

  closeShipPicker(saveSelection = true) {
    if (saveSelection) {
      this.selectedModel = this.tempSelectedModel;
      this.selectedSkin = this.tempSelectedSkin;
      localStorage.setItem('skyroads_selected_model', this.selectedModel);
      localStorage.setItem('skyroads_selected_skin', this.selectedSkin);
      
      // Dynamically load geometry and skin maps in active gameplay meshes
      this.graphics.changeShipModel(this.selectedModel, this.selectedSkin);
    }

    if (this.previewEngine) {
      this.previewEngine.destroy();
      this.previewEngine = null;
    }

    this.returnToMenu();
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

    const btnToggleMouse = document.getElementById('btn-toggle-mouse');
    if (btnToggleMouse) {
      btnToggleMouse.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.mouseControlsEnabled = !this.keyboard.mouseControlsEnabled;
        localStorage.setItem('skyroads_mouse_play', this.keyboard.mouseControlsEnabled);
        this.updateMouseToggleBtn();
      });
    }

    const btnOpenPicker = document.getElementById('btn-open-picker');
    if (btnOpenPicker) {
      btnOpenPicker.addEventListener('click', () => {
        gameAudio.playClick();
        this.openShipPicker();
      });
    }

    const btnPickerBack = document.getElementById('btn-picker-back');
    if (btnPickerBack) {
      btnPickerBack.addEventListener('click', () => {
        gameAudio.playClick();
        this.closeShipPicker(false);
      });
    }

    const btnPickerSelect = document.getElementById('btn-picker-select');
    if (btnPickerSelect) {
      btnPickerSelect.addEventListener('click', () => {
        gameAudio.playClick();
        this.closeShipPicker(true);
      });
    }

    const modelOptions = document.querySelectorAll('.model-option');
    modelOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        gameAudio.playClick();
        const modelName = opt.getAttribute('data-model');
        this.selectModelInPicker(modelName);
      });
    });

    const presetOptions = document.querySelectorAll('.color-preset-option');
    presetOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        gameAudio.playClick();
        const color = opt.getAttribute('data-color');
        this.selectColorInPicker(color);
      });
    });

    const colorPickerInput = document.getElementById('ship-color-picker');
    if (colorPickerInput) {
      colorPickerInput.addEventListener('input', (e) => {
        const color = e.target.value;
        this.selectColorInPicker(color);
      });
    }

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
      const packLevels = getCachedPack(this.currentPack);
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

    // If no target specified, just hide everything
    if (!screenId) return;

    // Show target screen
    const target = document.getElementById(screenId);
    if (!target) return;

    target.classList.remove('hidden');
    // Force reflow for transitions
    target.offsetHeight;
    target.classList.add('active');

    // Reset and auto-focus the first visible button for keyboard menu navigation
    this.selectedMenuIndex = 0;
    setTimeout(() => {
      let buttons = Array.from(target.querySelectorAll('.btn, .level-item, .skin-option'));
      buttons = buttons.filter(btn => !btn.classList.contains('hidden') && btn.style.display !== 'none');
      if (buttons.length > 0) {
        this.highlightMenuButton(buttons);
      }
    }, 50);
  }

  async showLevelSelection(packName) {
    this.currentPack = packName;
    this.gameState = 'loading';
    
    // Show loading screen while fetching pack data
    this.showScreen('loading-screen');
    document.getElementById('loading-status').innerText = 'Loading level pack...';
    document.getElementById('loading-progress-bar').style.width = '50%';

    // Lazy-load the level pack (cached on subsequent calls)
    const levels = await loadLevelPack(packName);

    this.gameState = 'level_select';
    const packTitle = packName === 'standard' ? 'STANDARD PACK' : 'XMAS SPECIAL';
    document.getElementById('level-pack-title').innerText = packTitle;

    const grid = document.getElementById('level-grid');
    grid.innerHTML = ''; // Clear previous

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

  async startLevel(index) {
    this.currentLevelIndex = index;
    const packLevels = getCachedPack(this.currentPack);
    this.currentLevelData = packLevels[index];
    
    // Bind to window to allow physics engine's gap detection lookup
    window.currentGamePack = this.currentPack;
    window.currentLevelIndex = index;
    window.currentLevelData = this.currentLevelData;

    // Show loading screen
    this.gameState = 'loading';
    this.showScreen('loading-screen');
    document.getElementById('loading-progress-bar').style.width = '0%';
    document.getElementById('loading-status').innerText = 'Building track geometry...';

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

    // 2. Build track geometry asynchronously with progress updates
    const onProgress = (percent) => {
      const progressBar = document.getElementById('loading-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
    };

    this.levelInfo = await buildLevelAsync(this.currentLevelData, this.graphics.scene, onProgress);

    // Spawn low-poly city scenery flanking both sides of the track
    this.graphics.spawnCityScenery(this.levelInfo.trackLength);

    // 3. Reset Physics ship state
    this.physics.reset(this.levelInfo.fuel, this.levelInfo.oxygen);

    // 4. Position ship at the first row that has ground tiles.
    //    Many levels start with empty rows (gaps), and some levels have
    //    the starting road offset to the left or right, not centered.
    const TILE_LENGTH = 4.0; // must match levelLoader constant
    const TILE_WIDTH = 2.0;
    const rows = this.currentLevelData.rows;
    let spawnRow = 0;
    for (let r = 0; r < rows.length; r++) {
      if (rows[r].some(t => t !== null)) {
        spawnRow = r;
        break;
      }
    }

    // Calculate X from the center of the tiles present in the spawn row
    const spawnRowTiles = rows[spawnRow];
    const tileCols = spawnRowTiles
      .map((t, c) => t !== null ? c : null)
      .filter(x => x !== null);
    const avgCol = tileCols.length > 0
      ? tileCols.reduce((a, b) => a + b, 0) / tileCols.length
      : 3; // default center
    const spawnX = (avgCol - 3) * TILE_WIDTH;

    // Place ship on the first solid row, slightly elevated
    const spawnZ = -spawnRow * TILE_LENGTH;
    this.physics.position.set(spawnX, 0.3, spawnZ);
    this.physics.onGround = false;

    // 5. Update HUD headers & telemetry, then show HUD and hide overlays
    const packNameEl = document.getElementById('hud-pack-name');
    if (packNameEl) packNameEl.innerText = this.currentPack === 'standard' ? 'STANDARD PACK' : 'XMAS SPECIAL';
    const roadNames = this.currentPack === 'standard' ? this.standardRoadNames : this.xmasRoadNames;
    const roadNameEl = document.getElementById('hud-road-name');
    if (roadNameEl) roadNameEl.innerText = roadNames[index] || `ROAD ${index}`;

    const gravityVal = this.currentLevelData.gravity ? (this.currentLevelData.gravity * 100) : 800;
    const gravityTextEl = document.getElementById('hud-gravity-text');
    if (gravityTextEl) gravityTextEl.innerText = String(gravityVal).padStart(4, '0');

    document.getElementById('hud').classList.remove('hidden');
    this.showScreen(''); // Hide all menus

    // 6. Trigger Continuous Sound Hum
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

      // 5. Check Audio Triggers from physics & keyboard inputs
      if (this.physics.triggerRefillAudio) {
        gameAudio.playRefill();
        this.physics.triggerRefillAudio = false;
      }

      if (this.physics.triggerWallCollisionAudio) {
        if (this.wallScrapeSoundTimer <= 0) {
          gameAudio.playWallCollision();
          this.wallScrapeSoundTimer = 0.22; // Throttle sound playback
        }
        this.physics.triggerWallCollisionAudio = false;
      }
      if (this.wallScrapeSoundTimer > 0) {
        this.wallScrapeSoundTimer -= dt;
      }

      if (this.physics.triggerLandingReboundAudio) {
        gameAudio.playLandingRebound();
        this.physics.triggerLandingReboundAudio = false;
      }

      // Gentle thruster puff whoosh sound when player initiates steering
      const isSteering = this.keyboard.left || this.keyboard.right;
      if (isSteering && !this.wasSteeringLastFrame) {
        gameAudio.playSteer();
      }
      this.wasSteeringLastFrame = isSteering;

      // 6. Check success condition (crossed Z-line)
      if (!this.physics.isDead && this.physics.position.z <= this.levelInfo.finishZ + SHIP_LENGTH / 2) {
        this.handleSuccess();
      }

      // 7. Check death condition
      if (this.physics.isDead) {
        this.handleDeath();
      }

      // 8. Render the frame to the screen
      this.graphics.render();

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
    
    // SVG speedometer outer ring (circumference = 565.48)
    const speedOffset = 565.48 - (speedPct / 100) * 565.48;
    const speedRing = document.getElementById('gauge-speed-ring');
    if (speedRing) speedRing.style.strokeDashoffset = speedOffset;
    
    // Legacy support for unit tests
    const legacySpeedBar = document.getElementById('hud-speed-bar');
    if (legacySpeedBar) legacySpeedBar.style.width = `${speedPct}%`;

    // Oxygen
    const oxygen = Math.ceil(this.physics.oxygen);
    document.getElementById('hud-oxygen-text').innerText = String(oxygen).padStart(3, '0');
    
    // SVG Oxygen arc (semicircular length = 194.78)
    const oxygenOffset = 194.78 - (oxygen / 100) * 194.78;
    const oxygenArc = document.getElementById('gauge-oxygen-arc');
    if (oxygenArc) oxygenArc.style.strokeDashoffset = oxygenOffset;
    
    // Legacy support for unit tests
    const legacyOxygenBar = document.getElementById('hud-oxygen-bar');
    if (legacyOxygenBar) legacyOxygenBar.style.width = `${oxygen}%`;

    // Fuel (Original DOS maps scale)
    const fuel = Math.ceil(this.physics.fuel);
    document.getElementById('hud-fuel-text').innerText = String(fuel).padStart(5, '0');
    const fuelPct = Math.min(100, (this.physics.fuel / (this.levelInfo.fuel * 50)) * 100);
    
    // SVG Fuel arc (semicircular length = 194.78)
    const fuelOffset = 194.78 - (fuelPct / 100) * 194.78;
    const fuelArc = document.getElementById('gauge-fuel-arc');
    if (fuelArc) fuelArc.style.strokeDashoffset = fuelOffset;
    
    // Legacy support for unit tests
    const legacyFuelBar = document.getElementById('hud-fuel-bar');
    if (legacyFuelBar) legacyFuelBar.style.width = `${fuelPct}%`;

    // Progress Bar
    const absoluteZ = -this.physics.position.z;
    const progressPct = Math.min(100, Math.max(0, (absoluteZ / this.levelInfo.trackLength) * 100));
    
    // Vertical Progress tube & rocket indicator styling
    const progressBar = document.getElementById('hud-progress-bar');
    if (progressBar) {
      progressBar.style.height = `${progressPct}%`;
      progressBar.style.width = `${progressPct}%`; // legacy support
    }
    const progressMarker = document.getElementById('hud-progress-marker');
    if (progressMarker) {
      progressMarker.style.bottom = `calc(${progressPct}% - 4px)`;
      progressMarker.style.left = `${progressPct}%`; // legacy support
    }
    // Update JUMP-O MASTER status readout
    const jumpTextEl = document.getElementById('hud-jump-text');
    if (jumpTextEl) {
      if (this.physics.isRebounding) {
        jumpTextEl.innerText = 'REBOUND';
        jumpTextEl.style.color = '#ff00ff';
      } else if (!this.physics.onGround) {
        jumpTextEl.innerText = 'JUMPING';
        jumpTextEl.style.color = '#00ffff';
      } else {
        jumpTextEl.innerText = 'IDLE';
        jumpTextEl.style.color = '#00ffcc';
      }
    }

    // Toggle active classes on status lights
    const boostLight = document.getElementById('status-boost');
    if (boostLight) boostLight.classList.toggle('active', !!this.physics.activeEffects.boost);

    const stickyLight = document.getElementById('status-sticky');
    if (stickyLight) stickyLight.classList.toggle('active', !!this.physics.activeEffects.sticky);

    const slipperyLight = document.getElementById('status-slippery');
    if (slipperyLight) slipperyLight.classList.toggle('active', !!this.physics.activeEffects.slippery);
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
    const packLevels = getCachedPack(this.currentPack);
    if (this.currentLevelIndex + 1 >= packLevels.length) {
      document.getElementById('btn-success-next').classList.add('hidden');
    } else {
      document.getElementById('btn-success-next').classList.remove('hidden');
    }

    this.showScreen('success-screen');
  }

  handleMenuKeyboard(e) {
    const activeScreen = document.querySelector('.overlay-screen.active');
    if (!activeScreen) return;

    const screenId = activeScreen.id;
    
    if (screenId === 'level-screen') {
      this.handleLevelSelectKeyboard(e, activeScreen);
      return;
    }

    if (screenId === 'ship-picker-screen') {
      this.handleShipPickerKeyboard(e, activeScreen);
      return;
    }

    let buttons = Array.from(activeScreen.querySelectorAll('.btn, .level-item, .skin-option'));
    buttons = buttons.filter(btn => !btn.classList.contains('hidden') && btn.style.display !== 'none');
    
    if (buttons.length === 0) return;

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % buttons.length;
      this.highlightMenuButton(buttons);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex - 1 + buttons.length) % buttons.length;
      this.highlightMenuButton(buttons);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      const activeBtn = buttons[this.selectedMenuIndex];
      if (activeBtn) {
        activeBtn.click();
      }
    }
  }

  handleShipPickerKeyboard(e, activeScreen) {
    const modelOptions = Array.from(activeScreen.querySelectorAll('.model-option'));
    const colorOptions = Array.from(activeScreen.querySelectorAll('.color-preset-option'));
    const colorPickerInput = document.getElementById('ship-color-picker');
    const backBtn = document.getElementById('btn-picker-back');
    const selectBtn = document.getElementById('btn-picker-select');
    
    // Combine all selectable buttons in order: models grid, then preset colors, custom picker, then buttons
    const buttons = [...modelOptions, ...colorOptions, colorPickerInput, backBtn, selectBtn].filter(el => el && !el.classList.contains('hidden') && el.style.display !== 'none');
    if (buttons.length === 0) return;

    if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % buttons.length;
      this.highlightMenuButton(buttons);
      
      const activeEl = buttons[this.selectedMenuIndex];
      if (activeEl) {
        if (activeEl.classList.contains('model-option')) {
          const modelName = activeEl.getAttribute('data-model');
          this.selectModelInPicker(modelName);
        } else if (activeEl.classList.contains('color-preset-option')) {
          const color = activeEl.getAttribute('data-color');
          this.selectColorInPicker(color);
        }
      }
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex - 1 + buttons.length) % buttons.length;
      this.highlightMenuButton(buttons);

      const activeEl = buttons[this.selectedMenuIndex];
      if (activeEl) {
        if (activeEl.classList.contains('model-option')) {
          const modelName = activeEl.getAttribute('data-model');
          this.selectModelInPicker(modelName);
        } else if (activeEl.classList.contains('color-preset-option')) {
          const color = activeEl.getAttribute('data-color');
          this.selectColorInPicker(color);
        }
      }
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      const activeEl = buttons[this.selectedMenuIndex];
      if (activeEl) {
        activeEl.click();
      }
    }
  }

  handleLevelSelectKeyboard(e, activeScreen) {
    const items = Array.from(activeScreen.querySelectorAll('.level-item'));
    if (items.length === 0) return;

    const rowOffset = 5;

    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex + 1) % items.length;
      this.highlightMenuButton(items);
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex - 1 + items.length) % items.length;
      this.highlightMenuButton(items);
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex + rowOffset) % items.length;
      this.highlightMenuButton(items);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      gameAudio.playClick();
      this.selectedMenuIndex = (this.selectedMenuIndex - rowOffset + items.length) % items.length;
      this.highlightMenuButton(items);
    } else if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      const currentItem = items[this.selectedMenuIndex];
      if (currentItem) {
        currentItem.click();
      }
    }
  }

  highlightMenuButton(buttons) {
    buttons.forEach(btn => {
      btn.classList.remove('keyboard-focused');
      btn.blur();
    });

    if (this.selectedMenuIndex >= buttons.length) {
      this.selectedMenuIndex = 0;
    }
    const currentBtn = buttons[this.selectedMenuIndex];
    if (currentBtn) {
      currentBtn.classList.add('keyboard-focused');
      currentBtn.focus();
    }
  }
}

// Instantiate and start the application on load
window.addEventListener('DOMContentLoaded', () => {
  const manager = new GameManager();
  manager.init();
});
