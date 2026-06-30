// SkyRoads WebGL - Core Game Orchestrator & State Controller
// Imported first: seeds localStorage from the committed defaults file before any
// engine constructor reads settings, so durable preferences survive rebuilds.
import './userSettings.js';
import * as THREE from 'three';
import { loadLevelPack, getCachedPack, registerCustomPack } from './levels.js';
import { GraphicsEngine } from './graphics.js';
import { PhysicsEngine, KeyboardController, SHIP_LENGTH, LEGACY_MODEL_ALIASES } from './physics.js';
import { buildLevelAsync, disposeUnusedThemes, getActiveThemeIndex, THEMES, curvatureUniforms, buildDeckCeilingLight, buildDeckPillars } from './levelLoader.js';
import { gameAudio, SYNTHWAVE_TRACK_URLS, SYNTHWAVE_TRACK_NAMES } from './audio.js';
import { ShipPreviewEngine } from './preview.js';
import { TouchControlManager } from './touchControls.js';
import { InGameEditor } from './inGameEditor.js';
import { initVisualizer } from './visualizer/index.js';
import { Autopilot, Ghost } from './autoplay.js';
import { CrossbarController } from './xmbMenu.js';
import { mainMenuConfig, garageConfig, gamepadConfigConfig, settingsConfig, buildLevelSelectConfig } from './menuConfig.js';
import { presets } from './visualizer/presets.js';
import { initLayoutDebugPanel } from './layoutDebugPanel.js';


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

// Safe vector helper utilities for test compatibility
const cloneVector = (vec) => {
  if (vec && typeof vec.clone === 'function') {
    return vec.clone();
  }
  return { x: vec ? vec.x : 0, y: vec ? vec.y : 0, z: vec ? vec.z : 0 };
};

const copyVector = (target, source) => {
  if (target && typeof target.copy === 'function') {
    target.copy(source);
  } else if (target && source) {
    target.x = source.x;
    target.y = source.y;
    target.z = source.z;
  }
};

class GameManager {
  constructor() {
    // Engine instances
    this.graphics = new GraphicsEngine();
    this.graphics.app = this;
    this.physics = new PhysicsEngine();
    this.keyboard = new KeyboardController();
    this.inGameEditor = new InGameEditor(this);
    
    // Game state variables
    this.currentPack = 'standard'; // 'standard' or 'xmas'
    this.currentLevelIndex = 0;
    this.currentLevelData = null;
    this.levelInfo = null;
    
    this.gameState = 'menu'; // 'menu', 'loading', 'level_select', 'playing', 'death', 'success'
    this.lastTime = 0;
    this.animationFrameId = null;
    this._webampStarted = false;

    // Idle attract mode: bot drives after inactivity, loops until real input cancels it.
    this.autopilot = new Autopilot();
    this._botActive = false;
    this._idleSeconds = 0;
    this.ghost = null;
    this.loadedGhost = null;
    this.ghostElapsed = 0;
    this._ghostSampleAccum = 0;

    // Multi-level systems configuration
    this.playStyle = 'classic'; // 'classic', 'flow', 'tower'
    this.activeLevelIndex = 0; // 0, 1, 2
    this.hardcoreModeEnabled = false;

    // Road names in original order for display polish.
    // The original game groups its 30 roads into 10 worlds of 3 roads each
    // (see the original level-select screenshots: world heading + Road 1/2/3).
    this.standardRoadNames = (() => {
      const worlds = [
        'RED HEAT', 'INTO THE SUN', 'BLUE PLANET', 'SATELLITE', 'MISTY',
        'ASTEROID BELT', 'CRAB NEBULA', 'OVER THE BASE', 'THE EARTH', 'DRUIDIA',
      ];
      const names = ['DEMO ROAD'];
      worlds.forEach((world) => { for (let r = 1; r <= 3; r++) names.push(`${world} — ROAD ${r}`); });
      return names;
    })();
    this.xmasRoadNames = (() => {
      const worlds = [
        'SNOWBOUND', 'AT THE OUTER RIM', 'TWILIGHT ZONE', 'THE GUIDING STAR', 'METEOR STORM',
        'MYSTERIOUS PLANET', 'NORTHERN LIGHTS', 'OVER THE POLE', 'UNDER THE ICE', 'THE EVE',
      ];
      const names = ['XMAS DEMO'];
      worlds.forEach((world) => { for (let r = 1; r <= 3; r++) names.push(`${world} — ROAD ${r}`); });
      return names;
    })();
    this.generatedRoadNames = [
      "DEMO LEVEL", "VECTOR PULSE", "RESONANCE STREAM",
      "BLUE CREST", "SKY ALPINE", "VERTICAL REACH",
      "COASTER CRUISE", "G-FORCE SHIFT", "THRILL RUNWAY",
      "SILICON SLALOM", "CIRCUIT TRACE", "HARDWARE GATE",
      "PHASE NOISE", "Z-FIGHT BEAT", "GRID FRACTURE",
      "GLACIER SLIDE", "CRYO RUNNER", "STASIS DRIFT",
      "BURN FLANK", "VOLCANIC CHASM", "SUPERNOVA RIFT",
      "COSMIC RAILS", "FOG SHORE", "NEBULA PATH",
      "VOID ISLANDS", "QUANTUM LEAP", "MONOLITH REACH",
      "STICKY SLOW", "PULSE GATE", "CHRONO SPEED",
      "♪ THE HUMAN ALGORITHM"
    ];
    this.wasSteeringLastFrame = false;

    this.wallScrapeSoundTimer = 0.0;

    // Ship preview variables
    this.previewEngine = null;
    this.tempSelectedSkin = 'default';
    this.tempSelectedColor = '#ffffff';

    // Infinite Mode & settings tracking
    this.isInfiniteMode = false;
    this.infiniteZOffset = 0;
    this.infiniteLevelTransitioning = false;
    this.preSettingsState = 'menu';
    this.stateHistory = [];
    this.rewindPressedLastFrame = false;
    this.rewindKeyHeldStart = 0;
    this.rewindTimeoutId = null;
    this.isRewinding = false;
    this.rewindHistoryIndex = -1;
    this.rewindBudget = Infinity;
    this.rewindBudgetMax = Infinity;
    this.rewindOverlay = null;
    this.collisionViewEnabled = false;

    // XMB crossbar controllers, one per ported screen. Keyed by screen id so
    // the keyboard/gamepad dispatch can look up "the controller for whichever
    // screen is currently active" in one place (see getActiveCrossbarController()).
    this.crossbarControllers = {};
  }

  init() {
    let savedModel = localStorage.getItem('skyroads_selected_model') || 'original';
    if (LEGACY_MODEL_ALIASES[savedModel]) {
      savedModel = LEGACY_MODEL_ALIASES[savedModel];
      localStorage.setItem('skyroads_selected_model', savedModel);
    }
    
    let savedSkin = localStorage.getItem('skyroads_selected_skin') || 'default';
    let savedColor = localStorage.getItem('skyroads_selected_color');

    // Revert to original Starfire Fighter with default green skin if currently set to hovdi or fighter
    if (savedModel === 'hovdi' || savedModel === 'fighter') {
      savedModel = 'original';
      savedSkin = 'default';
      localStorage.setItem('skyroads_selected_model', 'original');
      localStorage.setItem('skyroads_selected_skin', 'default');
    }
    this.selectedModel = savedModel;

    // Migration of legacy hex values inside skyroads_selected_skin
    if (savedSkin && savedSkin.startsWith('#')) {
      savedColor = savedSkin;
      savedSkin = 'default';
      localStorage.setItem('skyroads_selected_skin', 'default');
      localStorage.setItem('skyroads_selected_color', savedColor);
    }

    this.selectedSkin = savedSkin || 'default';
    this.selectedColor = savedColor || '#ffffff';

    this.graphics.currentModelName = this.selectedModel;
    this.graphics.currentSkinName = this.selectedSkin;
    this.graphics.currentSkinColor = this.selectedColor;

    // 1. Initialize Visual Viewport (will create shipMesh using the loaded model preferences directly)
    const container = document.getElementById('canvas-container');
    this.graphics.init(container);

    // Load persisted starfield settings from localStorage
    this.starfieldEnabled = localStorage.getItem('skyroads_starfield_enabled') !== 'false';
    if (this.graphics.starField) this.graphics.starField.visible = this.starfieldEnabled;
    const savedStarSize = localStorage.getItem('skyroads_star_size');
    this.graphics.setStarSize(savedStarSize !== null ? parseFloat(savedStarSize) : 1.0);
    const savedStarDensity = localStorage.getItem('skyroads_star_density');
    if (savedStarDensity !== null) this.graphics.setStarDensity(parseFloat(savedStarDensity));
    this.updateStarfieldToggleBtn();

    // Load persisted speed-FOV setting
    this.speedFovEnabled = localStorage.getItem('skyroads_speed_fov_enabled') === 'true';
    this.graphics.setSpeedFovEnabled(this.speedFovEnabled);
    this.updateSpeedFovToggleBtn();

    // Load persisted ghost racer setting
    this.ghostEnabled = localStorage.getItem('skyroads_ghost_enabled') !== 'false';
    this.updateGhostToggleBtn();
    const sliderStarSize = document.getElementById('slider-settings-star-size');
    if (sliderStarSize) sliderStarSize.value = Math.round(this.graphics.starSizeMultiplier * 100);
    const sliderStarDensity = document.getElementById('slider-settings-star-density');
    if (sliderStarDensity) sliderStarDensity.value = this.graphics.starCount;

    // Visualizer skybox layer — Webamp owns all music playback/control from here on.
    const webampContainer = document.getElementById('webamp-container');
    if (webampContainer) {
      const initialTracks = SYNTHWAVE_TRACK_URLS.map((url, i) => ({
        url,
        defaultName: SYNTHWAVE_TRACK_NAMES[i]
      }));
      initVisualizer({ initialTracks, threeRenderer: this.graphics.renderer }).then(({ webamp, outputTexture, renderFrame, controls }) => {
        this.webampInstance = webamp;
        this.visualizerControls = controls; // consumed by the Settings VISUALIZER category
        this.graphics.setVisualizerRenderer(outputTexture, renderFrame);
        this.graphics.setVisualizerWallMode(this.visualizerWallMode);
        const savedAngle = localStorage.getItem('skyroads_wall_angle');
        const savedSpread = localStorage.getItem('skyroads_wall_spread');
        const savedHeight = localStorage.getItem('skyroads_wall_height');
        const wallParams = {};
        if (savedAngle !== null) wallParams.angleDeg = parseFloat(savedAngle);
        if (savedSpread !== null) wallParams.halfTrack = parseFloat(savedSpread);
        if (savedHeight !== null) wallParams.height = parseFloat(savedHeight);
        if (Object.keys(wallParams).length) this.graphics.setVisualizerWallParams(wallParams);
        if (savedAngle !== null) document.getElementById('slider-settings-wall-angle').value = savedAngle;
        if (savedSpread !== null) document.getElementById('slider-settings-wall-spread').value = savedSpread;
        if (savedHeight !== null) document.getElementById('slider-settings-wall-height').value = savedHeight;
      }).catch((err) => {
        console.error('[Visualizer] Failed to initialize:', err);
      });
    }

    // Load persisted visualizer display mode (applied above once the visualizer loads)
    this.visualizerWallMode = localStorage.getItem('skyroads_visualizer_wall_mode') === 'true';
    this.updateVisualizerModeBtn();

    // Load persisted mouse setting from localStorage
    const savedMousePlay = localStorage.getItem('skyroads_mouse_play') === 'true';
    this.keyboard.mouseControlsEnabled = savedMousePlay;
    this.updateMouseToggleBtn();

    // Load persisted touch setting — auto-detect on first visit
    const savedTouchPref = localStorage.getItem('skyroads_touch_controls');
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    const touchEnabled = savedTouchPref !== null
      ? savedTouchPref === 'true'
      : isTouchDevice;
    this.keyboard.touchControlsEnabled = touchEnabled;
    this.updateTouchToggleBtn();

    // Load persisted boat throttle setting from localStorage
    const savedBoatThrottle = localStorage.getItem('skyroads_boat_throttle') === 'true';
    this.physics.boatThrottleEnabled = savedBoatThrottle;
    this.updateBoatThrottleToggleBtn();

    // Load persisted double jump setting from localStorage
    this.physics.doubleJumpEnabled = localStorage.getItem('skyroads_double_jump') === 'true';
    this.updateDoubleJumpToggleBtn();

    // Load persisted difficulty setting from localStorage
    const savedDifficulty = localStorage.getItem('skyroads_difficulty') || 'normal';
    this.physics.difficulty = savedDifficulty;
    this.updateDifficultyToggleBtn();

    // Load persisted SFX volume level
    const savedSfxVolume = localStorage.getItem('skyroads_sfx_volume');
    const sfxVol = savedSfxVolume !== null ? parseFloat(savedSfxVolume) : 0.8;
    gameAudio.setSfxVolume(sfxVol);

    // Load persisted bottom HUD toggle setting from localStorage
    this.bottomHudEnabled = localStorage.getItem('skyroads_bottom_hud') !== 'false';
    this.updateBottomHudToggleBtn();

    // Load persisted stick throttle setting from localStorage
    const savedStickThrottle = localStorage.getItem('skyroads_stick_throttle') === 'true';
    this.keyboard.touchJoystickThrottleEnabled = savedStickThrottle;
    this.updateStickThrottleToggleBtn();

    // Load persisted lane snap toggle setting from localStorage
    this.laneSnapEnabled = localStorage.getItem('skyroads_lane_snap') !== 'false';
    this.updateLaneSnapToggleBtn();

    // Load persisted rewind toggle setting from localStorage
    this.rewindEnabled = localStorage.getItem('skyroads_rewind_enabled') !== 'false';
    this.updateRewindToggleBtn();

    // Load persisted collision view setting from localStorage
    this.collisionViewEnabled = localStorage.getItem('skyroads_collision_view') === 'true';
    this.updateCollisionViewToggleBtn();

    // Load persisted tower hardcore setting from localStorage
    this.hardcoreModeEnabled = localStorage.getItem('skyroads_hardcore_mode') === 'true';
    this.updateHardcoreToggleBtn();

    // Sync slider value with loaded volume
    const sliderSfxVolume = document.getElementById('slider-settings-sfx-volume');
    if (sliderSfxVolume) {
      sliderSfxVolume.value = Math.round(sfxVol * 100);
    }

    // Initialize tunable physics preset profiles by loading from localStorage or falling back to defaults
    this.physicsPresets = { vga: {}, snappy: {}, lunar: {}, custom: {} };
    const basePresets = {
      vga: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 12.0, steerAccel: 50.0, dragSteer: 40.0, laneSnapStrength: 4.0, easyCollisionBounceVel: 5.0, easyCollisionBounceDist: 0.8, bounceFactor: 1.0, jumpImpulse: 11.5, jumpFactor: 1.0, gravityFactor: 1.0, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0, cameraHeight: -0.5, cameraPitchDeg: 5, cameraFOV: 95, speedFovMaxAdd: 14, speedCamPullback: 0.0 },
      snappy: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 10, steerAccel: 35, dragSteer: 28, laneSnapStrength: 4.0, easyCollisionBounceVel: 10, easyCollisionBounceDist: 1.2, bounceFactor: 1.0, jumpImpulse: 10.5, jumpFactor: 1.25, gravityFactor: 1.45, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0, cameraHeight: -0.5, cameraPitchDeg: 5, cameraFOV: 95, speedFovMaxAdd: 14, speedCamPullback: 0.0 },
      lunar: { maxSpeedNormal: 24, maxSpeedBoost: 50, accelForward: 12, decelBrakes: 25, dragZ: 2, maxSteerSpeed: 8, steerAccel: 15, dragSteer: 8, laneSnapStrength: 4.0, easyCollisionBounceVel: 8, easyCollisionBounceDist: 1.5, bounceFactor: 1.5, jumpImpulse: 7.5, jumpFactor: 1.0, gravityFactor: 0.45, fallGravityMultiplier: 1.15, variableJumpDampening: 0.90, coyoteTimeBuffer: 0.40, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0, cameraHeight: -0.5, cameraPitchDeg: 5, cameraFOV: 95, speedFovMaxAdd: 14, speedCamPullback: 0.0 },
      custom: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 10, steerAccel: 35, dragSteer: 28, laneSnapStrength: 4.0, easyCollisionBounceVel: 10, easyCollisionBounceDist: 1.2, bounceFactor: 1.0, jumpImpulse: 10.5, jumpFactor: 1.0, gravityFactor: 1.0, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0, cameraHeight: -0.5, cameraPitchDeg: 5, cameraFOV: 95, speedFovMaxAdd: 14, speedCamPullback: 0.0 }
    };

    for (const key in basePresets) {
      // Load user-saved baseline defaults if present, else fallback to hardcoded basePresets
      let activeBase = { ...basePresets[key] };
      const savedBaseline = localStorage.getItem(`skyroads_physics_preset_baseline_${key}`);
      if (savedBaseline) {
        try {
          activeBase = { ...activeBase, ...JSON.parse(savedBaseline) };
        } catch (e) {
          // Fallback
        }
      }

      const saved = localStorage.getItem(`skyroads_physics_preset_${key}`);
      if (saved) {
        try {
          this.physicsPresets[key] = { ...activeBase, ...JSON.parse(saved) };
        } catch (e) {
          this.physicsPresets[key] = { ...activeBase };
        }
      } else {
        this.physicsPresets[key] = { ...activeBase };
      }

      // Dynamic Auto-Migration: Force showCockpitBezel to 1.0 by default for existing players with cached presets
      if (this.physicsPresets[key].showCockpitBezel === undefined || this.physicsPresets[key].showCockpitBezel === 0.0) {
        this.physicsPresets[key].showCockpitBezel = 1.0;
        try {
          localStorage.setItem(`skyroads_physics_preset_${key}`, JSON.stringify(this.physicsPresets[key]));
        } catch (e) {
          // Graceful catch for JSDOM sandbox
        }
      }
      // Auto-migration: inject camera defaults for existing saved presets that lack them
      let camMigrated = false;
      if (this.physicsPresets[key].cameraHeight === undefined)    { this.physicsPresets[key].cameraHeight    = -0.5; camMigrated = true; }
      if (this.physicsPresets[key].cameraPitchDeg === undefined)  { this.physicsPresets[key].cameraPitchDeg  = 5;   camMigrated = true; }
      if (this.physicsPresets[key].cameraFOV === undefined)       { this.physicsPresets[key].cameraFOV       = 95;  camMigrated = true; }
      if (this.physicsPresets[key].cockpitFov === undefined)      { this.physicsPresets[key].cockpitFov      = 95;  camMigrated = true; }
      if (this.physicsPresets[key].speedFovMaxAdd === undefined)  { this.physicsPresets[key].speedFovMaxAdd  = 14.0; camMigrated = true; }
      if (this.physicsPresets[key].speedCamPullback === undefined) { this.physicsPresets[key].speedCamPullback = 0.0;  camMigrated = true; }
      if (camMigrated) {
        try { localStorage.setItem(`skyroads_physics_preset_${key}`, JSON.stringify(this.physicsPresets[key])); } catch (e) {}
      }
    }

    this.activePreset = localStorage.getItem('skyroads_physics_active_preset') || 'snappy';
    this.applyActivePreset();

    // 2. Setup Navigation Listeners
    this.setupUIListeners();
    this.setupXmbMenus();
    this._makeCalibratorDraggable();

    // 3. Listen to camera controls during play (KeyC toggles modes, [ and ] adjusts zoom, - and = adjusts height)
    window.addEventListener('keydown', (e) => {
      if (document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'SELECT')) {
        return;
      }
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
      if (e.code === 'KeyU' || e.code === 'PageUp') {
        gameAudio.playClick();
        this.graphics.adjustCameraPitch(1); // look up
      }
      if (e.code === 'KeyJ' || e.code === 'PageDown') {
        gameAudio.playClick();
        this.graphics.adjustCameraPitch(-1); // look down
      }
      if (e.code === 'KeyB') {
        gameAudio.playClick();
        const label = this.graphics.cycleTrackCurvature();
        const curveEl = document.getElementById('hud-track-curve');
        if (curveEl) curveEl.innerText = label;
        // Sync slider and value display
        const slider = document.getElementById('hud-curve-slider');
        if (slider) slider.value = String(this.graphics.trackCurvatureRadius);
        const valEl = document.getElementById('hud-curve-val');
        if (valEl) valEl.innerText = String(Math.round(this.graphics.trackCurvatureRadius));
      }
      if (e.code === 'KeyO') {
        gameAudio.playClick();
        this.physics.settings.gravityFactor = Math.min(3.0, (this.physics.settings.gravityFactor || 1.0) + 0.1);
        this.physics.settings.bounceFactor = Math.min(3.0, (this.physics.settings.bounceFactor || 1.0) + 0.1);
        const gravityVal = this.currentLevelData.gravity ? ((this.currentLevelData.gravity - 3) * 100 * this.physics.settings.gravityFactor) : 500 * this.physics.settings.gravityFactor;
        const gravityTextEl = document.getElementById('hud-gravity-text');
        if (gravityTextEl) gravityTextEl.innerText = String(Math.round(gravityVal)).padStart(4, '0');
      }
      if (e.code === 'KeyP') {
        gameAudio.playClick();
        this.toggleSettingsMenu();
      }
    });

    // Global listener for Escape to toggle settings/pause menu anywhere
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if (this.gameState === 'editor' || this.playtestEscHandler) {
          return;
        }
        e.preventDefault();
        gameAudio.playClick();
        this.toggleSettingsMenu();
      }
    });

    const btnSettingsGear = document.getElementById('btn-settings-gear');
    if (btnSettingsGear) {
      btnSettingsGear.addEventListener('click', (e) => {
        gameAudio.playClick();
        this.toggleSettingsMenu();
      });
    }

    // 4. Listen to keyboard menu navigation when not actively playing a level
    window.addEventListener('keydown', (e) => {
      if (this.gameState === 'playing') return;
      // Screens ported to the XMB engine (see setupXmbMenus) are handled by
      // their CrossbarController instead of the legacy handleMenuKeyboard()
      // walk; everything else keeps using the old handler untouched.
      const crossbar = this.getActiveCrossbarController();
      if (crossbar) {
        this.handleCrossbarKeyboard(e, crossbar);
        return;
      }
      this.handleMenuKeyboard(e);
    });

    // Crossbar-driven screens need keyup to stop hold-repeat timers (tap vs.
    // hold is keydown-without-repeat -> startHold, keyup -> stopHold; native
    // OS key-repeat keydown events are ignored via e.repeat in handleCrossbarKeyboard).
    window.addEventListener('keyup', (e) => {
      const crossbar = this.getActiveCrossbarController();
      if (crossbar) crossbar.stopHold();
    });

    // Any real input cancels attract mode / resets the idle timer.
    const cancelIdleAndBot = () => {
      this._idleSeconds = 0;
      if (this._botActive) {
        this._botActive = false;
        if (this.keyboard && typeof this.keyboard.resetKeys === 'function') {
          this.keyboard.resetKeys();
        }
        if (this.gameState === 'playing') {
          this.returnToMenu();
        }
      }
    };
    window.addEventListener('keydown', cancelIdleAndBot);
    window.addEventListener('click', cancelIdleAndBot);
    window.addEventListener('touchstart', cancelIdleAndBot);

    // 5. Initialize new touch control system
    this.touchManager = new TouchControlManager();
    this.touchManager.init(this.keyboard, this.graphics, this);

    // 6. Start high-frequency background render loop (stars sparkling)
    this.lastTime = performance.now();
    this.animate(this.lastTime);
  }

  // Shared by every simple on/off toggle button below — sets label + btn-primary/btn-info
  // class state. `label` can be a string or, for buttons whose text differs per element
  // id (e.g. boat throttle's compact touch variant), a function(id) => string.
  _setToggleBtnState(btnIds, isEnabled, label) {
    const ids = Array.isArray(btnIds) ? btnIds : [btnIds];
    ids.forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      const text = typeof label === 'function' ? label(id) : label;
      // Preserve the crossbar engine's focus label span (xmbMenu.js appends
      // it only to the active item) — innerText would otherwise wipe it out
      // from underneath the engine whenever a toggle item is confirmed.
      const labelSpan = btn.querySelector('.xmb-item-label');
      btn.innerText = `${text}: ${isEnabled ? 'ON' : 'OFF'}`;
      if (labelSpan) btn.appendChild(labelSpan);
      btn.classList.toggle('btn-primary', isEnabled);
      btn.classList.toggle('btn-info', !isEnabled);
    });
  }

  updateMouseToggleBtn() {
    this._setToggleBtnState(['btn-toggle-mouse', 'btn-settings-mouse'], this.keyboard.mouseControlsEnabled, 'MOUSE PLAY');
  }

  updateStarfieldToggleBtn() {
    this._setToggleBtnState('btn-settings-starfield', this.starfieldEnabled, 'STARFIELD');
  }

  updateSpeedFovToggleBtn() {
    this._setToggleBtnState('btn-settings-speed-fov', this.speedFovEnabled, 'SPEED FOV');
  }

  updateGhostToggleBtn() {
    this._setToggleBtnState('btn-settings-ghost', this.ghostEnabled, 'GHOST RACER');
  }

  updateVisualizerModeBtn() {
    const btn = document.getElementById('btn-settings-visualizer-mode');
    if (!btn) return;
    btn.innerText = this.visualizerWallMode ? 'VIS MODE: WALLS' : 'VIS MODE: SKY';
    btn.classList.toggle('btn-primary', this.visualizerWallMode);
    btn.classList.toggle('btn-info', !this.visualizerWallMode);
  }

  updateTouchToggleBtn() {
    this._setToggleBtnState(['btn-toggle-touch', 'btn-settings-touch'], this.keyboard.touchControlsEnabled, 'TOUCH CONTROLS');
  }

  updateBoatThrottleToggleBtn() {
    this._setToggleBtnState(
      ['btn-toggle-boat-throttle', 'btn-pause-toggle-boat-throttle', 'btn-touch-boat-throttle', 'btn-settings-boat-throttle'],
      this.physics.boatThrottleEnabled,
      id => id === 'btn-touch-boat-throttle' ? 'BOAT' : 'BOAT THROTTLE'
    );
  }

  updateDoubleJumpToggleBtn() {
    this._setToggleBtnState('btn-toggle-double-jump', this.physics.doubleJumpEnabled, 'DOUBLE JUMP');
  }

  updateBottomHudToggleBtn() {
    const isEnabled = this.bottomHudEnabled;
    this._setToggleBtnState('btn-settings-bottom-hud', isEnabled, 'BOTTOM HUD');

    // Immediately toggle HTML 2D HUD container visibility if playing or paused
    const hud = document.getElementById('hud');
    if (hud) {
      if (isEnabled && (this.gameState === 'playing' || this.gameState === 'paused')) {
        hud.classList.remove('hidden');
      } else {
        hud.classList.add('hidden');
      }
    }
  }

  updateStickThrottleToggleBtn() {
    this._setToggleBtnState('btn-settings-stick-throttle', this.keyboard.touchJoystickThrottleEnabled, 'STICK THROTTLE');
  }

  updateLaneSnapToggleBtn() {
    const isEnabled = this.laneSnapEnabled;
    this._setToggleBtnState('btn-settings-lane-snap', isEnabled, 'LANE SNAP');
    if (this.keyboard) {
      this.keyboard.laneSnapEnabled = isEnabled;
    }
  }

  updateRewindToggleBtn() {
    this._setToggleBtnState('btn-settings-rewind', this.rewindEnabled, 'REWIND');
  }

  updateDifficultyToggleBtn() {
    const diff = this.physics.difficulty || 'normal';
    const btn = document.getElementById('btn-settings-difficulty');
    if (!btn) return;
    btn.classList.remove('btn-info', 'btn-secondary', 'btn-primary', 'btn-danger');
    if (diff === 'easy') {
      btn.innerText = 'DIFFICULTY: EASY';
      btn.classList.add('btn-info');
    } else if (diff === 'normal') {
      btn.innerText = 'DIFFICULTY: NORMAL';
      btn.classList.add('btn-primary');
    } else {
      btn.innerText = 'DIFFICULTY: HARD';
      btn.classList.add('btn-danger');
    }
  }



  // ── Settings mutation methods ───────────────────────────────────────────
  // Lifted out of the old inline click listener bodies so both the legacy
  // .btn click path and the XMB crossbar's actionKey lookup (see
  // buildLiveSettingsConfig) call the exact same logic.

  toggleDifficulty() {
    const currentDiff = this.physics.difficulty || 'normal';
    let nextDiff = 'normal';
    if (currentDiff === 'easy') {
      nextDiff = 'normal';
    } else if (currentDiff === 'normal') {
      nextDiff = 'hard';
    } else {
      nextDiff = 'easy';
    }
    this.physics.difficulty = nextDiff;
    localStorage.setItem('skyroads_difficulty', nextDiff);
    this.updateDifficultyToggleBtn();

    if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'death') {
      if (nextDiff === 'easy') {
        this.rewindBudgetMax = Infinity;
      } else if (nextDiff === 'normal') {
        this.rewindBudgetMax = 10.0;
      } else {
        this.rewindBudgetMax = 0.0;
      }
      this.rewindBudget = Math.min(this.rewindBudget, this.rewindBudgetMax);
      const rewindRow = document.getElementById('hud-rewind-row');
      if (rewindRow) {
        rewindRow.classList.toggle('hidden', !this.rewindEnabled || nextDiff === 'hard');
      }
      const rewindText = document.getElementById('hud-rewind-text');
      if (rewindText) {
        rewindText.innerText = nextDiff === 'easy' ? '∞' : `${this.rewindBudget.toFixed(1)}s`;
      }
    }
  }

  toggleRewindOnDeath() {
    this.rewindEnabled = !this.rewindEnabled;
    localStorage.setItem('skyroads_rewind_enabled', this.rewindEnabled);
    this.updateRewindToggleBtn();
  }

  toggleLaneSnap() {
    this.laneSnapEnabled = !this.laneSnapEnabled;
    localStorage.setItem('skyroads_lane_snap', this.laneSnapEnabled);
    this.updateLaneSnapToggleBtn();
  }

  adjustSfxVolume(dir) {
    const step = 0.05;
    const slider = document.getElementById('slider-settings-sfx-volume');
    const current = slider ? parseFloat(slider.value) / 100 : 0.8;
    const next = Math.max(0, Math.min(1, current + dir * step));
    gameAudio.setSfxVolume(next);
    localStorage.setItem('skyroads_sfx_volume', next);
    if (slider) slider.value = String(Math.round(next * 100));
    return next;
  }

  toggleStarfield() {
    this.starfieldEnabled = !this.starfieldEnabled;
    if (this.graphics.starField) this.graphics.starField.visible = this.starfieldEnabled;
    localStorage.setItem('skyroads_starfield_enabled', this.starfieldEnabled);
    this.updateStarfieldToggleBtn();
  }

  toggleSpeedFov() {
    this.speedFovEnabled = !this.speedFovEnabled;
    this.graphics.setSpeedFovEnabled(this.speedFovEnabled);
    localStorage.setItem('skyroads_speed_fov_enabled', this.speedFovEnabled);
    this.updateSpeedFovToggleBtn();
  }

  toggleGhostRacer() {
    this.ghostEnabled = !this.ghostEnabled;
    localStorage.setItem('skyroads_ghost_enabled', this.ghostEnabled);
    if (!this.ghostEnabled) {
      this.graphics.setGhostVisible(false);
    } else if (this.loadedGhost) {
      this.graphics.setGhostVisible(true);
    }
    this.updateGhostToggleBtn();
  }

  toggleVisualizerMode() {
    this.visualizerWallMode = !this.visualizerWallMode;
    localStorage.setItem('skyroads_visualizer_wall_mode', this.visualizerWallMode);
    this.graphics.setVisualizerWallMode(this.visualizerWallMode);
    this.updateVisualizerModeBtn();
  }

  adjustWallAngle(dir) {
    const slider = document.getElementById('slider-settings-wall-angle');
    const step = 1, min = 1, max = 89;
    const current = slider ? parseFloat(slider.value) : 45;
    const next = Math.max(min, Math.min(max, current + dir * step));
    this.graphics.setVisualizerWallParams({ angleDeg: next });
    localStorage.setItem('skyroads_wall_angle', next);
    if (slider) slider.value = String(next);
    return next;
  }

  adjustWallSpread(dir) {
    const slider = document.getElementById('slider-settings-wall-spread');
    const step = 1, min = 5, max = 40;
    const current = slider ? parseFloat(slider.value) : 9;
    const next = Math.max(min, Math.min(max, current + dir * step));
    this.graphics.setVisualizerWallParams({ halfTrack: next });
    localStorage.setItem('skyroads_wall_spread', next);
    if (slider) slider.value = String(next);
    return next;
  }

  adjustWallHeight(dir) {
    const slider = document.getElementById('slider-settings-wall-height');
    const step = 10, min = 50, max = 600;
    const current = slider ? parseFloat(slider.value) : 300;
    const next = Math.max(min, Math.min(max, current + dir * step));
    this.graphics.setVisualizerWallParams({ height: next });
    localStorage.setItem('skyroads_wall_height', next);
    if (slider) slider.value = String(next);
    return next;
  }

  adjustStarSize(dir) {
    const slider = document.getElementById('slider-settings-star-size');
    const step = 10, min = 20, max = 300;
    const current = slider ? parseFloat(slider.value) : 100;
    const next = Math.max(min, Math.min(max, current + dir * step));
    this.graphics.setStarSize(next / 100);
    localStorage.setItem('skyroads_star_size', next / 100);
    if (slider) slider.value = String(next);
    return next;
  }

  adjustStarDensity(dir) {
    const slider = document.getElementById('slider-settings-star-density');
    const step = 100, min = 0, max = 5000;
    const current = slider ? parseFloat(slider.value) : 1500;
    const next = Math.max(min, Math.min(max, current + dir * step));
    this.graphics.setStarDensity(next);
    localStorage.setItem('skyroads_star_density', next);
    if (slider) slider.value = String(next);
    return next;
  }

  toggleMousePlay() {
    this.keyboard.mouseControlsEnabled = !this.keyboard.mouseControlsEnabled;
    localStorage.setItem('skyroads_mouse_play', this.keyboard.mouseControlsEnabled);
    this.updateMouseToggleBtn();
  }

  toggleTouchHud() {
    this.keyboard.touchControlsEnabled = !this.keyboard.touchControlsEnabled;
    localStorage.setItem('skyroads_touch_controls', this.keyboard.touchControlsEnabled);
    this.updateTouchToggleBtn();
  }

  toggleBoatThrottle() {
    this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
    localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
    this.updateBoatThrottleToggleBtn();
  }

  toggleStickThrottle() {
    this.keyboard.touchJoystickThrottleEnabled = !this.keyboard.touchJoystickThrottleEnabled;
    localStorage.setItem('skyroads_stick_throttle', this.keyboard.touchJoystickThrottleEnabled);
    this.updateStickThrottleToggleBtn();
  }

  openGamepadConfig() {
    this.gameState = 'gamepad_config';
    this.updateGamepadConfigUI();
    this.showScreen('gamepad-config-screen');
  }

  toggleBottomHud() {
    this.bottomHudEnabled = !this.bottomHudEnabled;
    localStorage.setItem('skyroads_bottom_hud', this.bottomHudEnabled);
    this.updateBottomHudToggleBtn();
  }

  toggleCockpitBezel() {
    const preset = this.physicsPresets[this.activePreset];
    if (preset) {
      const nextVal = Number(preset.showCockpitBezel) === 1 ? 0.0 : 1.0;
      preset.showCockpitBezel = nextVal;
      this.physics.settings.showCockpitBezel = nextVal;
      localStorage.setItem(`skyroads_physics_preset_${this.activePreset}`, JSON.stringify(preset));
      const calibratorSlider = document.getElementById('input-showCockpitBezel');
      if (calibratorSlider) {
        calibratorSlider.value = nextVal;
        const readout = document.getElementById('val-showCockpitBezel');
        if (readout) readout.innerText = nextVal === 1 ? 'ON' : 'OFF';
      }
      this.updateCockpitBezelToggleBtn();
    }
  }

  updateCockpitBezelToggleBtn() {
    const preset = this.physicsPresets[this.activePreset];
    const isEnabled = preset ? Number(preset.showCockpitBezel) === 1 : true;
    this._setToggleBtnState('btn-settings-bezel', isEnabled, 'COCKPIT REFLECTION');
  }

  toggleCollisionView() {
    const nextState = !this.collisionViewEnabled;
    this.toggleSceneCollisionView(nextState);
    this.updateCollisionViewToggleBtn();
  }

  /**
   * Resolves a settingsConfig actionKey string to the live function the XMB
   * crossbar should call. 'action' items get onConfirm = fn; 'slider' items
   * get onAdjust = (dir) => fn(dir). Centralizing this lookup here (rather
   * than scattering switch statements) is what buildLiveSettingsConfig uses
   * to turn the static menuConfig.js tree into a live, callable one each time
   * the settings screen opens.
   */
  _resolveSettingsAction(actionKey) {
    const table = {
      'toggle-difficulty': () => this.toggleDifficulty(),
      'toggle-rewind-on-death': () => this.toggleRewindOnDeath(),
      'toggle-lane-snap': () => this.toggleLaneSnap(),
      'toggle-tower-hardcore': () => this.toggleTowerHardcore(),
      'adjust-sfx-volume': (dir) => this.adjustSfxVolume(dir),
      'toggle-starfield': () => this.toggleStarfield(),
      'toggle-speed-fov': () => this.toggleSpeedFov(),
      'toggle-ghost-racer': () => this.toggleGhostRacer(),
      'toggle-visualizer-mode': () => this.toggleVisualizerMode(),
      'adjust-wall-angle': (dir) => this.adjustWallAngle(dir),
      'adjust-wall-spread': (dir) => this.adjustWallSpread(dir),
      'adjust-wall-height': (dir) => this.adjustWallHeight(dir),
      'adjust-star-size': (dir) => this.adjustStarSize(dir),
      'adjust-star-density': (dir) => this.adjustStarDensity(dir),
      'toggle-mouse-play': () => this.toggleMousePlay(),
      'toggle-touch-hud': () => this.toggleTouchHud(),
      'toggle-boat-throttle': () => this.toggleBoatThrottle(),
      'toggle-stick-throttle': () => this.toggleStickThrottle(),
      'open-gamepad-config': () => this.openGamepadConfig(),
      'toggle-bottom-hud': () => this.toggleBottomHud(),
      'toggle-cockpit-bezel': () => this.toggleCockpitBezel(),
      'toggle-collision-view': () => this.toggleCollisionView(),
      'open-ship-picker': () => this.openShipPicker(),
      'open-physics-calibrator': () => this.togglePhysicsCalibrator(true),
      'close-settings': () => this.toggleSettingsMenu(),
      // Visualizer controls (folded in from the old floating panel).
      'vis-preset': (dir) => { const c = this.visualizerControls; if (c) { dir > 0 ? c.next() : c.prev(); } },
      'vis-lock': () => { const c = this.visualizerControls; if (c) c.toggleLocked(); },
      'vis-fav': () => { const c = this.visualizerControls; if (c) c.toggleFavoriteCurrent(); },
      'vis-mode': () => { const c = this.visualizerControls; if (c) c.toggleTransitionMode(); },
      'vis-webamp': () => { const c = this.visualizerControls; if (c && c.getPresetInfo) { const showing = this._webampShowing = !this._webampShowing; c.setWebampVisible(showing); } }
    };
    return table[actionKey];
  }

  /** Renders the VISUALIZER settings rows (preset readout + toggle labels) from
   *  the live visualizer controls. Safe no-op if the visualizer isn't ready. */
  _renderVisualizerSettings() {
    const c = this.visualizerControls;
    const presetEl = document.getElementById('val-settings-vis-preset');
    if (!c || !c.getPresetInfo) { if (presetEl) presetEl.textContent = '—'; return; }
    const info = c.getPresetInfo();
    if (presetEl) presetEl.textContent = `${info.index + 1}/${info.total} — ${info.name}`;
    const lock = document.getElementById('btn-settings-vis-lock');
    if (lock) lock.textContent = `LOCK: ${info.isLocked ? 'ON' : 'OFF'}`;
    const fav = document.getElementById('btn-settings-vis-fav');
    if (fav) fav.textContent = `FAVORITE: ${info.isFavorite ? '★' : '☆'}`;
    const mode = document.getElementById('btn-settings-vis-mode');
    if (mode) mode.textContent = `MODE: ${(info.transitionMode || 'all').toUpperCase()}`;
    const webamp = document.getElementById('btn-settings-vis-webamp');
    if (webamp) webamp.textContent = `WEBAMP: ${this._webampShowing ? 'SHOWN' : 'HIDDEN'}`;
  }

  /**
   * Turns the live current value of a settings item into the display string
   * shown in its .xmb-item label (toggles get "ON"/"OFF" or the
   * difficulty/visualizer-mode tri-state text). Centralized here so
   * buildLiveSettingsConfig and the renderer agree on formatting.
   */
  _settingsItemValueText(id) {
    switch (id) {
      case 'difficulty': {
        const diff = this.physics.difficulty || 'normal';
        return diff.toUpperCase();
      }
      case 'rewind-on-death': return this.rewindEnabled ? 'ON' : 'OFF';
      case 'lane-snap': return this.laneSnapEnabled ? 'ON' : 'OFF';
      case 'starfield': return this.starfieldEnabled ? 'ON' : 'OFF';
      case 'speed-fov': return this.speedFovEnabled ? 'ON' : 'OFF';
      case 'ghost-racer': return this.ghostEnabled ? 'ON' : 'OFF';
      case 'visualizer-mode': return this.visualizerWallMode ? 'WALLS' : 'SKY';
      case 'mouse-play': return this.keyboard.mouseControlsEnabled ? 'ON' : 'OFF';
      case 'touch-hud': return this.keyboard.touchControlsEnabled ? 'ON' : 'OFF';
      case 'boat-throttle': return this.physics.boatThrottleEnabled ? 'ON' : 'OFF';
      case 'stick-throttle': return this.keyboard.touchJoystickThrottleEnabled ? 'ON' : 'OFF';
      case 'bottom-hud': return this.bottomHudEnabled ? 'ON' : 'OFF';
      case 'cockpit-bezel': {
        const preset = this.physicsPresets[this.activePreset];
        const val = preset ? preset.showCockpitBezel : 1.0;
        return Number(val) === 1 ? 'ON' : 'OFF';
      }
      case 'collision-view': return this.collisionViewEnabled ? 'ON' : 'OFF';
      default: return '';
    }
  }

  /**
   * Builds the "live" settings crossbar config: takes the pure-data
   * settingsConfig tree from menuConfig.js and returns a copy where every
   * item's actionKey has been resolved to onConfirm/onAdjust, plus a current
   * `value` for sliders (read straight off the existing slider's value attr
   * so persisted localStorage state round-trips correctly). Also splices in
   * the paused-only action rows (resume/retry/quit) into the 'game' category
   * when appropriate — rebuilt fresh every time toggleSettingsMenu() opens
   * the screen, matching the old conditional-visibility behavior exactly.
   */
  buildLiveSettingsConfig() {
    const sliderIdByItemId = {
      'sfx-volume': 'slider-settings-sfx-volume',
      'wall-angle': 'slider-settings-wall-angle',
      'wall-spread': 'slider-settings-wall-spread',
      'wall-height': 'slider-settings-wall-height',
      'star-size': 'slider-settings-star-size',
      'star-density': 'slider-settings-star-density'
    };

    const categories = settingsConfig.categories.map(cat => {
      let catItems = [...cat.items];
      const hasHardcoreBtn = document.getElementById('btn-settings-hardcore') !== null;
      if (cat.id === 'game' && hasHardcoreBtn) {
        catItems.push({ id: 'tower-hardcore', label: 'Hardcore Mode', kind: 'action', actionKey: 'toggle-tower-hardcore' });
      }
      const items = catItems.map(item => {
        const live = { ...item };
        const fn = this._resolveSettingsAction(item.actionKey);
        if (item.kind === 'slider') {
          live.onAdjust = (dir) => fn(dir);
          if (item.id === 'preset') {
            live.max = presets.length - 1;
            const c = this.visualizerControls;
            live.value = c && c.getPresetInfo ? c.getPresetInfo().index : 0;
          } else {
            const sliderEl = document.getElementById(sliderIdByItemId[item.id]);
            if (sliderEl) {
              const raw = parseFloat(sliderEl.value);
              live.value = item.id === 'sfx-volume' ? raw / 100 : raw;
            } else {
              live.value = item.min;
            }
          }
        } else {
          live.onConfirm = fn;
        }
        return live;
      });
      return { ...cat, items };
    });

    if (this.preSettingsState === 'playing' || this.preSettingsState === 'paused') {
      const gameCategory = categories.find(c => c.id === 'game');
      if (gameCategory) {
        gameCategory.items = [
          { id: 'resume', label: 'Resume Road', kind: 'action', onConfirm: () => { gameAudio.playClick(); this.toggleSettingsMenu(); } },
          { id: 'retry', label: 'Retry Road', kind: 'action', onConfirm: () => { gameAudio.playClick(); this.retryCurrentLevelOrGroup(); } },
          { id: 'quit', label: 'Quit to Menu', kind: 'action', onConfirm: () => { gameAudio.playClick(); this.returnToMenu(); } },
          ...gameCategory.items
        ];
      }
    }

    return { categories };
  }

  /** Updates one settings slider's visible fill bar + value readout from its
   *  hidden native <input>'s current value (the adjust* fns own the value). */
  _renderSettingsSlider(id) {
    const input = document.getElementById('slider-settings-' + id);
    const fill = document.getElementById('fill-settings-' + id);
    const val = document.getElementById('val-settings-' + id);
    if (!input) return;
    const v = parseFloat(input.value);
    const min = parseFloat(input.min), max = parseFloat(input.max);
    const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    if (fill) fill.style.width = pct + '%';
    if (val) val.textContent = id === 'sfx-volume' ? Math.round(v) + '%' : String(v);
  }

  /** Builds + registers the settings-screen crossbar. Called fresh on each
   *  open (toggleSettingsMenu) because the paused-only rows vary by state. */
  mountSettingsCrossbar() {
    const live = this.buildLiveSettingsConfig();
    // config item id -> DOM element id (irregular, so explicit)
    const elId = {
      difficulty: 'btn-settings-difficulty', 'rewind-on-death': 'btn-settings-rewind', 'lane-snap': 'btn-settings-lane-snap',
      'sfx-volume': 'item-settings-sfx-volume',
      starfield: 'btn-settings-starfield', 'speed-fov': 'btn-settings-speed-fov', 'ghost-racer': 'btn-settings-ghost', 'visualizer-mode': 'btn-settings-visualizer-mode',
      'wall-angle': 'item-settings-wall-angle', 'wall-spread': 'item-settings-wall-spread', 'wall-height': 'item-settings-wall-height', 'star-size': 'item-settings-star-size', 'star-density': 'item-settings-star-density',
      'mouse-play': 'btn-settings-mouse', 'touch-hud': 'btn-settings-touch', 'boat-throttle': 'btn-settings-boat-throttle', 'stick-throttle': 'btn-settings-stick-throttle', 'gamepad-config': 'btn-settings-gamepad',
      'bottom-hud': 'btn-settings-bottom-hud', 'cockpit-bezel': 'btn-settings-bezel', 'collision-view': 'btn-settings-collision-view', 'hovercraft-garage': 'btn-settings-picker',
      'physics-calibrator': 'btn-settings-calibrator', 'close-settings': 'btn-settings-close',
      preset: 'item-settings-vis-preset', lock: 'btn-settings-vis-lock', favorite: 'btn-settings-vis-fav', mode: 'btn-settings-vis-mode', webamp: 'btn-settings-vis-webamp'
    };
    const sliderIds = ['sfx-volume', 'wall-angle', 'wall-spread', 'wall-height', 'star-size', 'star-density'];

    const pausedHost = document.getElementById('settings-paused-actions');
    if (pausedHost) pausedHost.innerHTML = ''; // rebuilt per open

    live.categories.forEach(cat => {
      cat.el = document.getElementById('settings-xmb-cat-' + cat.id);
      cat.items.forEach(item => {
        item.label = ''; // buttons carry their own baked text; no duplicate label span
        if (elId[item.id]) {
          item.el = document.getElementById(elId[item.id]) || null;
        } else if (pausedHost && (item.id === 'resume' || item.id === 'retry' || item.id === 'quit')) {
          // Paused-only rows aren't static markup — create them on the fly.
          const b = document.createElement('button');
          b.className = 'xmb-item btn btn-glow ' + (item.id === 'resume' ? 'btn-primary' : 'btn-secondary');
          b.textContent = item.id === 'resume' ? 'RESUME ROAD' : (item.id === 'retry' ? 'RETRY ROAD' : 'QUIT TO MENU');
          pausedHost.appendChild(b);
          item.el = b;
        }
        if (item.kind === 'slider') {
          const base = item.onAdjust;
          // The visualizer "preset" slider has no native <input>; refresh the
          // VISUALIZER rows instead of the generic slider fill.
          const refresh = item.id === 'preset'
            ? () => this._renderVisualizerSettings()
            : () => this._renderSettingsSlider(item.id);
          item.onAdjust = (d) => { base(d); refresh(); };
        }
      });
    });

    const catTrack = document.getElementById('settings-xmb-category-track');
    const tracks = {};
    live.categories.forEach(cat => { tracks[cat.id] = document.getElementById('settings-xmb-item-track-' + cat.id); });

    if (this.crossbarControllers['settings-screen']) this.crossbarControllers['settings-screen'].destroy();
    const ctrl = new CrossbarController(live, { categoryTrackEl: catTrack, itemTrackEl: tracks[live.categories[0].id], leftAlignItems: true });
    const sync = () => {
      const active = ctrl.activeCategory;
      Object.entries(tracks).forEach(([id, el]) => { if (el) el.classList.toggle('hidden', !active || active.id !== id); });
      ctrl.mount(catTrack, active ? tracks[active.id] : null);
    };
    sync();
    const orig = ctrl.handleDirection.bind(ctrl);
    ctrl.handleDirection = (axis, dir) => { orig(axis, dir); if (axis === 'horizontal') sync(); };
    this.wireCategoryClicks(ctrl);
    ctrl._updateLabels();
    ctrl.render(performance.now());
    sliderIds.forEach(id => this._renderSettingsSlider(id));
    this._renderVisualizerSettings();
    // Keep the VISUALIZER rows live while settings is open (preset auto-cycles).
    if (this.visualizerControls && this.visualizerControls.onChange && !this._visUnsub) {
      this._visUnsub = this.visualizerControls.onChange(() => this._renderVisualizerSettings());
    }
    this.crossbarControllers['settings-screen'] = ctrl;
  }

  openShipPicker() {
    this.prePickerState = this.gameState;
    this.gameState = 'ship_picker';
    this.tempSelectedModel = this.selectedModel || 'racer';
    this.tempSelectedSkin = this.selectedSkin || 'default';
    this.tempSelectedColor = this.selectedColor || '#ffffff';
    this.showScreen('ship-picker-screen');
    
    // Update active highlight states on model selector
    this.updateModelPickerSidebarSelection();

    // Update active highlight states on skin selector
    this.updateTexturePickerSidebarSelection();

    // Set custom color input value
    const colorPickerInput = document.getElementById('ship-color-picker');
    if (colorPickerInput) {
      colorPickerInput.value = this.tempSelectedColor;
    }
    
    this.updateColorPickerUISelection();

    // Initialize 3D preview viewport
    const container = document.getElementById('ship-preview-container');
    if (container) {
      if (this.previewEngine) {
        this.previewEngine.destroy();
      }
      this.previewEngine = new ShipPreviewEngine();
      this.previewEngine.init(container, this.tempSelectedModel, this.tempSelectedSkin, this.tempSelectedColor);
    }
  }

  applyActivePreset() {
    const config = this.physicsPresets[this.activePreset];
    for (const param in config) {
      this.physics.settings[param] = config[param];
    }
    this._applyCameraSettings(config);
    this.updateCockpitBezelToggleBtn();
  }

  _applyCameraSettings(config) {
    if (!this.graphics) return;
    if (config.cameraHeight !== undefined) {
      this.graphics.cameraHeightAdjust = config.cameraHeight;
      this.graphics.updateCameraHUD();
    }
    if (config.cameraPitchDeg !== undefined) {
      this.graphics.cameraPitchAdjust = config.cameraPitchDeg * (Math.PI / 180);
      this.graphics.updateCameraHUD();
    }
    if (config.cameraFOV !== undefined) {
      this.graphics.setCameraFOV(config.cameraFOV);
    }
    if (config.cockpitFov !== undefined) {
      this.graphics.setCockpitFOV(config.cockpitFov);
    }
    if (config.speedFovMaxAdd !== undefined) {
      this.graphics.speedFovMaxAdd = config.speedFovMaxAdd;
    }
    if (config.speedCamPullback !== undefined) {
      this.graphics.speedCamPullback = config.speedCamPullback;
    }
  }

  togglePhysicsCalibrator(forceState) {
    const panel = document.getElementById('physics-calibrator-screen');
    const btn = document.getElementById('btn-settings-physics');
    if (!panel || !btn) return;

    const isActive = forceState !== undefined ? forceState : !panel.classList.contains('active');
    
    if (isActive) {
      panel.classList.add('active');
      btn.classList.add('active');
      this.updateCalibratorUI();
    } else {
      panel.classList.remove('active');
      btn.classList.remove('active');
    }
  }

  updateCalibratorUI() {
    // Highlight active preset button
    const presetButtons = ['vga', 'snappy', 'lunar', 'custom'];
    presetButtons.forEach(key => {
      const btn = document.getElementById(`preset-btn-${key}`);
      if (btn) {
        if (key === this.activePreset) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    // Load preset config values into slider inputs and labels
    const config = this.physicsPresets[this.activePreset];
    for (const param in config) {
      const slider = document.getElementById(`input-${param}`);
      const readout = document.getElementById(`val-${param}`);
      if (slider) {
        slider.value = config[param];
      }
      if (readout) {
        if (param === 'showCockpitBezel') {
          readout.innerText = Number(config[param]) === 1 ? 'ON' : 'OFF';
        } else if (param === 'cameraPitchDeg' || param === 'cameraFOV' || param === 'cockpitFov' || param === 'speedFovMaxAdd') {
          readout.innerText = `${Math.round(Number(config[param]))}°`;
        } else if (param === 'cameraHeight' || param === 'speedCamPullback') {
          readout.innerText = Number(config[param]).toFixed(2);
        } else {
          readout.innerText = Number(config[param]).toFixed(param.startsWith('cockpitOffset') || param === 'coyoteTimeBuffer' || param === 'variableJumpDampening' || param === 'gravityFactor' || param === 'fallGravityMultiplier' || param === 'bounceFactor' || param === 'dragZ' ? 2 : 1);
        }
      }
    }
  }

  updateGamepadConfigUI() {
    const GAMEPAD_BUTTON_NAMES = {
      0: 'A (Button 0)',
      1: 'B (Button 1)',
      2: 'X (Button 2)',
      3: 'Y (Button 3)',
      4: 'LB (Button 4)',
      5: 'RB (Button 5)',
      6: 'LT (Button 6)',
      7: 'RT (Button 7)',
      8: 'View/Back (Button 8)',
      9: 'Menu/Start (Button 9)',
      10: 'LSB (Button 10)',
      11: 'RSB (Button 11)',
      12: 'D-Pad Up (Button 12)',
      13: 'D-Pad Down (Button 13)',
      14: 'D-Pad Left (Button 14)',
      15: 'D-Pad Right (Button 15)',
      16: 'Xbox/Guide (Button 16)'
    };

    const mappings = this.keyboard.gamepadMappings;
    const actions = ['forward', 'backward', 'jump', 'left', 'right', 'cycleCamera', 'togglePause'];

    actions.forEach(action => {
      const btn = document.getElementById(`btn-map-${action}`);
      if (btn) {
        const bindingEl = btn.querySelector('.xmb-item-binding');
        const btnIndex = mappings[action];
        const text = (btnIndex === undefined || btnIndex === null)
          ? 'Not Mapped'
          : (GAMEPAD_BUTTON_NAMES[btnIndex] !== undefined ? GAMEPAD_BUTTON_NAMES[btnIndex] : `Button ${btnIndex}`);
        if (bindingEl) {
          bindingEl.textContent = text;
        } else {
          btn.innerText = text;
        }
        btn.classList.remove('xmb-listening', 'btn-danger'); // Remove listening visual cue if it was active
        btn.classList.add('btn-glow');
      }
    });
  }

  // Starts the "press any button now" remap-listen flow for one gamepad
  // action. Shared by the legacy click handler and the gamepad-config
  // CrossbarController's onConfirm — both end up calling this exact function
  // so there's only one remap-capture code path (physics.js's gamepad poll
  // loop reads `this.keyboard.currentlyMappingAction` and resolves it).
  startGamepadRemap(action) {
    gameAudio.playClick();
    const btn = document.getElementById(`btn-map-${action}`);
    this.keyboard.currentlyMappingAction = action;
    if (btn) {
      const bindingEl = btn.querySelector('.xmb-item-binding');
      if (bindingEl) {
        bindingEl.textContent = '[ PRESS ANY BUTTON... ]';
      } else {
        btn.innerText = '[ PRESS ANY BUTTON... ]';
      }
      btn.classList.remove('btn-glow');
      btn.classList.add('xmb-listening', 'btn-danger'); // red styling indicating recording
    }
  }

  showCalibratorAlert() {
    const alertEl = document.getElementById('calibrator-status-alert');
    if (alertEl) {
      alertEl.style.opacity = '1';
      if (this.alertTimeout) clearTimeout(this.alertTimeout);
      this.alertTimeout = setTimeout(() => {
        alertEl.style.opacity = '0';
      }, 1000);
    }
  }

  selectModelInPicker(modelName) {
    this.tempSelectedModel = modelName;
    this.updateModelPickerSidebarSelection();

    // Swap model in 3D preview
    if (this.previewEngine) {
      this.previewEngine.changeModel(modelName, this.tempSelectedSkin, this.tempSelectedColor);
    }
  }

  selectTextureInPicker(skinName) {
    this.tempSelectedSkin = skinName;
    this.updateTexturePickerSidebarSelection();

    // Update skin in 3D preview
    if (this.previewEngine) {
      this.previewEngine.changeSkin(skinName, this.tempSelectedColor);
    }
  }

  selectColorInPicker(hexColor) {
    this.tempSelectedColor = hexColor;

    // Update color picker input
    const colorPickerInput = document.getElementById('ship-color-picker');
    if (colorPickerInput) {
      colorPickerInput.value = hexColor;
    }

    this.updateColorPickerUISelection();

    if (this.previewEngine) {
      this.previewEngine.changeSkin(this.tempSelectedSkin, hexColor);
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

  updateTexturePickerSidebarSelection() {
    const textureOptions = document.querySelectorAll('.texture-option');
    textureOptions.forEach(opt => {
      const skinName = opt.getAttribute('data-skin');
      if (skinName === this.tempSelectedSkin) {
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
      if (color.toLowerCase() === this.tempSelectedColor.toLowerCase()) {
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
      this.selectedColor = this.tempSelectedColor;
      
      localStorage.setItem('skyroads_selected_model', this.selectedModel);
      localStorage.setItem('skyroads_selected_skin', this.selectedSkin);
      localStorage.setItem('skyroads_selected_color', this.selectedColor);
      
      // Dynamically load geometry and skin maps in active gameplay meshes
      this.graphics.changeShipModel(this.selectedModel, this.selectedSkin, this.selectedColor);
      
      if (this.physics && typeof this.physics.applyShipClass === 'function') {
        this.physics.applyShipClass(this.selectedModel);
      }
    }

    if (this.previewEngine) {
      this.previewEngine.destroy();
      this.previewEngine = null;
    }

    if (this.prePickerState === 'settings') {
      this.showScreen('settings-screen');
      this.gameState = 'settings';
    } else {
      this.returnToMenu();
    }
  }

  /**
   * Builds the CrossbarController instances for the screens already ported
   * to the XMB engine (main menu + how-to-play, Task D of the XMB redesign).
   * Each controller is configured from menuConfig.js's static data, with
   * each item's actionKey resolved here to the *same* function the legacy
   * click listener calls (see setupUIListeners) — no synthetic .click().
   *
   * Other screens (level select, ship garage, settings, pause/death/success,
   * gamepad config) still run on the old handleMenuKeyboard()/highlightMenuButton()
   * path; this.crossbarControllers only ever contains entries for screens that
   * have actually been ported, and the keyboard/gamepad dispatch below checks
   * "is the active screen one of these ids" before routing into the engine.
   */
  setupXmbMenus() {
    const actionHandlers = {
      'play-standard': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('standard'); },
      'play-generated': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('generated'); },
      'play-xmas': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('xmas'); },
      'play-classic-standard': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('standard'); },
      'play-classic-generated': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('generated'); },
      'play-classic-xmas': () => { gameAudio.playClick(); this.setPlayStyle('classic'); this.showLevelSelection('xmas'); },
      'play-flow-standard': () => { gameAudio.playClick(); this.setPlayStyle('flow'); this.showLevelSelection('standard'); },
      'play-flow-generated': () => { gameAudio.playClick(); this.setPlayStyle('flow'); this.showLevelSelection('generated'); },
      'play-flow-xmas': () => { gameAudio.playClick(); this.setPlayStyle('flow'); this.showLevelSelection('xmas'); },
      'play-tower-standard': () => { gameAudio.playClick(); this.setPlayStyle('tower'); this.showLevelSelection('standard'); },
      'play-tower-generated': () => { gameAudio.playClick(); this.setPlayStyle('tower'); this.showLevelSelection('generated'); },
      'play-tower-xmas': () => { gameAudio.playClick(); this.setPlayStyle('tower'); this.showLevelSelection('xmas'); },
      'load-custom-level': () => {
        gameAudio.playClick();
        const loader = document.getElementById('game-custom-level-loader');
        if (loader) loader.click();
      },
      'open-editor': () => { gameAudio.playClick(); window.open('editor.html', '_blank'); },
      'open-ship-picker': () => { gameAudio.playClick(); this.openShipPicker(); },
      'open-how-to': () => { gameAudio.playClick(); this.showScreen('how-to-screen'); }
    };

    const mainMenuItemEls = {
      standard: document.getElementById('btn-play-standard'),
      generated: document.getElementById('btn-play-generated'),
      xmas: document.getElementById('btn-play-xmas'),
      'load-custom-level': document.getElementById('btn-load-custom-level'),
      'flow-standard': document.getElementById('btn-play-flow-standard'),
      'flow-generated': document.getElementById('btn-play-flow-generated'),
      'flow-xmas': document.getElementById('btn-play-flow-xmas'),
      'tower-standard': document.getElementById('btn-play-tower-standard'),
      'tower-generated': document.getElementById('btn-play-tower-generated'),
      'tower-xmas': document.getElementById('btn-play-tower-xmas'),
      'level-editor': document.getElementById('btn-open-editor'),
      'hovercraft-garage': document.getElementById('btn-open-picker'),
      'how-to-play': document.getElementById('btn-how-to')
    };

    const hasFlow = document.getElementById('menu-xmb-cat-flow') !== null;
    let localCategories = [...mainMenuConfig.categories];
    
    if (hasFlow) {
      localCategories = [
        {
          id: 'classic',
          label: 'CLASSIC',
          items: [
            { id: 'standard', label: 'Standard Pack', kind: 'action', actionKey: 'play-classic-standard' },
            { id: 'generated', label: 'Generated Worlds', kind: 'action', actionKey: 'play-classic-generated' },
            { id: 'xmas', label: 'Xmas Special', kind: 'action', actionKey: 'play-classic-xmas' },
            { id: 'load-custom-level', label: 'Load Custom Level', kind: 'action', actionKey: 'load-custom-level' }
          ]
        },
        {
          id: 'flow',
          label: 'FLOW (GROUPED)',
          items: [
            { id: 'flow-standard', label: 'Standard Pack', kind: 'action', actionKey: 'play-flow-standard' },
            { id: 'flow-generated', label: 'Generated Worlds', kind: 'action', actionKey: 'play-flow-generated' },
            { id: 'flow-xmas', label: 'Xmas Special', kind: 'action', actionKey: 'play-flow-xmas' }
          ]
        },
        {
          id: 'tower',
          label: 'TOWER (STACK)',
          items: [
            { id: 'tower-standard', label: 'Standard Pack', kind: 'action', actionKey: 'play-tower-standard' },
            { id: 'tower-generated', label: 'Generated Worlds', kind: 'action', actionKey: 'play-tower-generated' },
            { id: 'tower-xmas', label: 'Xmas Special', kind: 'action', actionKey: 'play-tower-xmas' }
          ]
        },
        {
          id: 'extras',
          label: 'EXTRAS',
          items: [
            { id: 'level-editor', label: 'Level Editor', kind: 'action', actionKey: 'open-editor' },
            { id: 'hovercraft-garage', label: 'Hovercraft Garage', kind: 'action', actionKey: 'open-ship-picker' },
            { id: 'how-to-play', label: 'How To Play', kind: 'action', actionKey: 'open-how-to' }
          ]
        }
      ];
    }

    const mainMenuCategoryEls = {
      play: document.getElementById('menu-xmb-cat-play'),
      classic: document.getElementById('menu-xmb-cat-classic') || document.getElementById('menu-xmb-cat-play'),
      flow: document.getElementById('menu-xmb-cat-flow'),
      tower: document.getElementById('menu-xmb-cat-tower'),
      extras: document.getElementById('menu-xmb-cat-extras')
    };

    // Clone the static config and attach `el`/`onConfirm` per item — menuConfig.js
    // stays a pure-data module, so the DOM/function wiring happens here instead.
    const mainMenuConfigWired = {
      categories: localCategories.map(cat => ({
        ...cat,
        el: mainMenuCategoryEls[cat.id] || null,
        // Drop items whose button is hidden (e.g. xmas pack with display:none)
        // so vertical nav never lands on an invisible row.
        items: cat.items
          .map(item => ({
            ...item,
            el: mainMenuItemEls[item.id] || null,
            onConfirm: actionHandlers[item.actionKey]
          }))
          .filter(item => item.el && item.el.style.display !== 'none')
      })).filter(cat => cat.el !== null)
    };

    const menuItemTrackClassic = document.getElementById('menu-xmb-item-track-classic') || document.getElementById('menu-xmb-item-track-play');
    const menuItemTrackFlow = document.getElementById('menu-xmb-item-track-flow');
    const menuItemTrackTower = document.getElementById('menu-xmb-item-track-tower');
    const menuItemTrackExtras = document.getElementById('menu-xmb-item-track-extras');
    const menuCategoryTrack = document.getElementById('menu-xmb-category-track');

    const mainMenuController = new CrossbarController(mainMenuConfigWired, {
      categoryTrackEl: menuCategoryTrack,
      itemTrackEl: menuItemTrackClassic,
      leftAlignItems: true
    });

    const menuItemTracksByCategory = {
      classic: menuItemTrackClassic,
      flow: menuItemTrackFlow,
      tower: menuItemTrackTower,
      extras: menuItemTrackExtras
    };
    const syncMainMenuItemTrack = () => {
      const activeCat = mainMenuController.activeCategory;
      Object.entries(menuItemTracksByCategory).forEach(([catId, trackEl]) => {
        if (!trackEl) return;
        trackEl.classList.toggle('hidden', !activeCat || activeCat.id !== catId);
      });
      mainMenuController.mount(menuCategoryTrack, activeCat ? menuItemTracksByCategory[activeCat.id] : null);
    };
    syncMainMenuItemTrack();
    // Re-sync the mounted item track every time the category changes by
    // wrapping handleDirection — keeps the swap-on-category-change logic in
    // one place without forking the engine's horizontal-input handling.
    const originalHandleDirection = mainMenuController.handleDirection.bind(mainMenuController);
    mainMenuController.handleDirection = (axis, dir) => {
      originalHandleDirection(axis, dir);
      if (axis === 'horizontal') syncMainMenuItemTrack();
    };
    this.wireCategoryClicks(mainMenuController);
    mainMenuController._updateLabels();
    mainMenuController.render(performance.now());
    this.crossbarControllers['menu-screen'] = mainMenuController;

    // How-To Play: single category, single item (Back button) — same engine,
    // horizontal axis never moves.
    const howToBackEl = document.getElementById('btn-how-to-back');
    const howToConfig = {
      categories: [{
        id: 'how-to',
        label: 'HOW TO PLAY',
        items: [{
          id: 'back',
          label: 'UNDERSTOOD',
          kind: 'action',
          el: howToBackEl,
          onConfirm: () => { gameAudio.playClick(); this.showScreen('menu-screen'); }
        }]
      }]
    };
    const howToController = new CrossbarController(howToConfig, {
      itemTrackEl: document.getElementById('how-to-xmb-item-track')
    });
    howToController._updateLabels();
    howToController.render(performance.now());
    this.crossbarControllers['how-to-screen'] = howToController;

    // Gamepad Config (Task G): single category, 7 remap rows + reset.
    // btn-gamepad-close stays fixed chrome (Cancel target, same as the
    // gp.menuCancel cancelButtons map below) — not a vertical item.
    // Each remap item's onConfirm calls startGamepadRemap(action), the exact
    // same function the legacy btn-map-* click listener now calls too, so
    // there's only one remap-capture code path (see startGamepadRemap above).
    // Live binding text is written by updateGamepadConfigUI() into each row's
    // .xmb-item-binding span — this controller only owns focus/navigation.
    const gamepadConfigItemEls = {
      forward: document.getElementById('btn-map-forward'),
      backward: document.getElementById('btn-map-backward'),
      jump: document.getElementById('btn-map-jump'),
      left: document.getElementById('btn-map-left'),
      right: document.getElementById('btn-map-right'),
      cycleCamera: document.getElementById('btn-map-cycleCamera'),
      togglePause: document.getElementById('btn-map-togglePause'),
      reset: document.getElementById('btn-gamepad-reset')
    };
    const gamepadConfigActionHandlers = {
      'remap-forward': () => this.startGamepadRemap('forward'),
      'remap-backward': () => this.startGamepadRemap('backward'),
      'remap-jump': () => this.startGamepadRemap('jump'),
      'remap-left': () => this.startGamepadRemap('left'),
      'remap-right': () => this.startGamepadRemap('right'),
      'remap-cycleCamera': () => this.startGamepadRemap('cycleCamera'),
      'remap-togglePause': () => this.startGamepadRemap('togglePause'),
      'reset-gamepad-mappings': () => {
        gameAudio.playClick();
        this.keyboard.gamepadMappings = {
          forward: 7,
          backward: 6,
          jump: 0,
          left: 14,
          right: 15,
          cycleCamera: 3,
          togglePause: 9
        };
        this.keyboard.saveGamepadMappings();
        this.updateGamepadConfigUI();
      }
    };
    const gamepadConfigWired = {
      categories: gamepadConfigConfig.categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => ({
          ...item,
          el: gamepadConfigItemEls[item.id] || null,
          onConfirm: gamepadConfigActionHandlers[item.actionKey]
        }))
      }))
    };
    const gamepadConfigController = new CrossbarController(gamepadConfigWired, {
      itemTrackEl: document.querySelector('#gamepad-config-screen .xmb-item-track')
    });
    gamepadConfigController._updateLabels();
    gamepadConfigController.render(performance.now());
    this.crossbarControllers['gamepad-config-screen'] = gamepadConfigController;

    this.setupGarageCrossbar();
    this.setupPauseDeathSuccessCrossbars();
  }

  /**
   * Ship Garage (Task I): 3 categories — HULL (7 models), SKIN (12 textures),
   * PAINT (7 presets + a `kind:'focus'` custom-color item). onConfirm reuses
   * selectModelInPicker/selectTextureInPicker/selectColorInPicker directly —
   * the same functions the legacy click listeners in setupUIListeners call —
   * so equipping via mouse/touch and via the crossbar both go through one
   * code path. Each category has its own item-track DOM subtree
   * (garage-item-track-hull/-skin/-paint, the options differ in shape: model
   * name vs texture swatch vs color swatch), so handleDirection is wrapped
   * the same way setupXmbMenus() does for the main menu's PLAY/EXTRAS tracks,
   * to swap which track is mounted/visible on horizontal category change.
   */
  setupGarageCrossbar() {
    const garageCategoryEls = {
      hull: document.querySelector('#garage-category-track [data-category="hull"]'),
      skin: document.querySelector('#garage-category-track [data-category="skin"]'),
      paint: document.querySelector('#garage-category-track [data-category="paint"]')
    };

    const garageItemTracksByCategory = {
      hull: document.getElementById('garage-item-track-hull'),
      skin: document.getElementById('garage-item-track-skin'),
      paint: document.getElementById('garage-item-track-paint')
    };

    const colorPickerInput = document.getElementById('ship-color-picker');
    const modelOptionEls = Array.from(document.querySelectorAll('#garage-item-track-hull .model-option'));
    const textureOptionEls = Array.from(document.querySelectorAll('#garage-item-track-skin .texture-option'));
    const presetOptionEls = Array.from(document.querySelectorAll('#garage-item-track-paint .color-preset-option'));
    const paintConfig = garageConfig.categories.find(c => c.id === 'paint');

    // actionKey -> handler, resolved by matching each config item to its DOM
    // element in array order (both menuConfig.js's HULL_MODELS/SKIN_TEXTURES/
    // PAINT_PRESETS lists and the index.html markup were authored in the same
    // order), then reading that element's data-model/data-skin/data-color
    // attribute — avoids hand-writing 26 one-off id-to-handler entries while
    // still calling the exact same picker functions the old click listeners use.
    const garageActionHandlers = {};
    garageConfig.categories.find(c => c.id === 'hull').items.forEach((item, idx) => {
      const el = modelOptionEls[idx];
      if (!el) return;
      const modelName = el.getAttribute('data-model');
      garageActionHandlers[item.actionKey] = () => {
        gameAudio.playClick();
        this.selectModelInPicker(modelName);
      };
    });
    garageConfig.categories.find(c => c.id === 'skin').items.forEach((item, idx) => {
      const el = textureOptionEls[idx];
      if (!el) return;
      const skinName = el.getAttribute('data-skin');
      garageActionHandlers[item.actionKey] = () => {
        gameAudio.playClick();
        this.selectTextureInPicker(skinName);
      };
    });
    paintConfig.items.forEach((item, idx) => {
      if (item.kind === 'focus') return; // the trailing "Custom Color" item, handled below
      const el = presetOptionEls[idx];
      if (!el) return;
      const color = el.getAttribute('data-color');
      garageActionHandlers[item.actionKey] = () => {
        gameAudio.playClick();
        this.selectColorInPicker(color);
      };
    });

    // Custom color item: delegates focus to the real native <input type=color>
    // instead of applying a value itself — clicking it opens the OS color
    // dialog, and that input's own 'input' listener (set up in
    // setupUIListeners, untouched) still calls selectColorInPicker on every
    // native color change, exactly as it did before this port.
    garageActionHandlers['open-custom-color-picker'] = () => {
      gameAudio.playClick();
      if (colorPickerInput) colorPickerInput.click();
    };

    const garageItemEls = { hull: {}, skin: {}, paint: {} };
    garageConfig.categories.find(c => c.id === 'hull').items.forEach((item, idx) => {
      garageItemEls.hull[item.id] = modelOptionEls[idx] || null;
    });
    garageConfig.categories.find(c => c.id === 'skin').items.forEach((item, idx) => {
      garageItemEls.skin[item.id] = textureOptionEls[idx] || null;
    });
    paintConfig.items.forEach((item, idx) => {
      garageItemEls.paint[item.id] = item.kind === 'focus'
        ? document.getElementById('garage-custom-color-item')
        : (presetOptionEls[idx] || null);
    });

    const garageConfigWired = {
      categories: garageConfig.categories.map(cat => ({
        ...cat,
        el: garageCategoryEls[cat.id] || null,
        items: cat.items.map(item => ({
          ...item,
          el: garageItemEls[cat.id] ? garageItemEls[cat.id][item.id] : null,
          onConfirm: garageActionHandlers[item.actionKey]
        }))
      }))
    };

    // Bake a persistent NAME into each garage row (thumb + name), like Level
    // Select bakes its decade labels, so every option's name is always visible
    // in the vertical list (not just the focused one). Prefer the element's
    // descriptive `title` (e.g. skins) over the raw config id.
    garageConfigWired.categories.forEach(cat => {
      cat.items.forEach(item => {
        const el = item.el;
        if (!el) return;
        // PAINT presets carry their colour as the ROW's own inline background;
        // move it into a small swatch thumb so the row reads as [swatch][name]
        // instead of a full-width colour bar.
        const dataColor = el.getAttribute('data-color');
        if (dataColor) {
          el.style.background = '';
          el.style.border = '';
          if (!el.querySelector('.garage-item-thumb')) {
            const sw = document.createElement('span');
            sw.className = 'xmb-item-thumb garage-item-thumb';
            sw.style.background = dataColor;
            el.insertBefore(sw, el.firstChild);
          }
        }
        if (el.querySelector('.garage-item-name')) return;
        const name = el.getAttribute('title') || item.label || item.id || '';
        const span = document.createElement('span');
        span.className = 'garage-item-name';
        span.textContent = name;
        el.appendChild(span);
      });
    });

    const garageController = new CrossbarController(garageConfigWired, {
      categoryTrackEl: document.getElementById('garage-category-track'),
      itemTrackEl: garageItemTracksByCategory.hull
      // vertical list now (was a grid) → standard distance-fade applies
    });

    // Same per-category item-track swap pattern as the main menu's PLAY/EXTRAS
    // tracks in setupXmbMenus() above.
    const syncGarageItemTrack = () => {
      const activeCat = garageController.activeCategory;
      Object.entries(garageItemTracksByCategory).forEach(([catId, trackEl]) => {
        if (!trackEl) return;
        trackEl.classList.toggle('hidden', !activeCat || activeCat.id !== catId);
      });
      garageController.mount(
        document.getElementById('garage-category-track'),
        activeCat ? garageItemTracksByCategory[activeCat.id] : null
      );
    };
    syncGarageItemTrack();
    const originalGarageHandleDirection = garageController.handleDirection.bind(garageController);
    garageController.handleDirection = (axis, dir) => {
      originalGarageHandleDirection(axis, dir);
      if (axis === 'horizontal') syncGarageItemTrack();
    };
    this.wireCategoryClicks(garageController);

    garageController._updateLabels();
    garageController.render(performance.now());
    this.crossbarControllers['ship-picker-screen'] = garageController;
    this._garageController = garageController;
  }

  /**
   * Task E: Pause / Death / Success screens — all three are single-category
   * vertical lists (horizontal axis never moves), same engine as how-to-screen.
   * Each onConfirm calls the exact same function the legacy click listener in
   * setupUIListeners() calls (no synthetic .click()), except where noted.
   *
   * Death-screen special case: the rewind mechanic hides the whole vertical
   * item list for the first few seconds after death (see handleDeath()), which
   * used to query `.menu-buttons`; that query now targets `.xmb-item-track`
   * (see handleDeath()'s `deathButtons` lookup).
   *
   * Success-screen special case: the initials `<input>` is a native text
   * field, not a crossbar item. It is intentionally NOT added to the item
   * list — the existing `document.activeElement.tagName === 'INPUT'` guard
   * (top of handleCrossbarKeyboard / handleMenuKeyboard) already lets focus
   * "fall through" to native input behavior, including Enter-to-submit via
   * btn-score-submit, whether the user reached the input by mouse click or
   * Tab. No focus-delegation item is needed since nothing in the crossbar
   * list needs to hand off to it — clicking/tapping the input still works
   * exactly as before.
   */
  setupPauseDeathSuccessCrossbars() {
    // Pause screen
    const pauseConfig = {
      categories: [{
        id: 'pause',
        label: 'PAUSED',
        items: [
          { id: 'resume', label: 'Resume', kind: 'action', el: document.getElementById('btn-pause-resume'), onConfirm: () => { gameAudio.playClick(); this.resumeGame(); } },
          { id: 'retry', label: 'Retry', kind: 'action', el: document.getElementById('btn-pause-retry'), onConfirm: () => { gameAudio.playClick(); this.retryCurrentLevelOrGroup(); } },
          { id: 'boat-throttle', label: 'Boat Throttle', kind: 'action', el: document.getElementById('btn-pause-toggle-boat-throttle'), onConfirm: () => {
              gameAudio.playClick();
              this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
              localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
              this.updateBoatThrottleToggleBtn();
            } },
          { id: 'reset-level', label: 'Reset Level Edits', kind: 'action', el: document.getElementById('btn-pause-reset-level'), onConfirm: () => {
              gameAudio.playClick();
              if (confirm("Reset all edits to this level? This cannot be undone.")) {
                InGameEditor.resetLevelOverrides(this, this.currentPack, this.currentLevelIndex);
                this.resumeGame();
                this.retryCurrentLevelOrGroup();
              }
            } },
          { id: 'quit', label: 'Quit to Main Menu', kind: 'action', el: document.getElementById('btn-pause-quit'), onConfirm: () => { gameAudio.playClick(); this.returnToMenu(); } }
        ]
      }]
    };
    const pauseController = new CrossbarController(pauseConfig, {
      itemTrackEl: document.getElementById('pause-xmb-item-track')
    });
    pauseController._updateLabels();
    pauseController.render(performance.now());
    this.crossbarControllers['pause-screen'] = pauseController;

    // Death screen
    const deathConfig = {
      categories: [{
        id: 'death',
        label: 'YOU DIED',
        items: [
          { id: 'retry', label: 'Try Again', kind: 'action', el: document.getElementById('btn-death-retry'), onConfirm: () => { gameAudio.playClick(); this.retryCurrentLevelOrGroup(); } },
          { id: 'menu', label: 'Back to Menu', kind: 'action', el: document.getElementById('btn-death-menu'), onConfirm: () => { gameAudio.playClick(); this.returnToMenu(); } }
        ]
      }]
    };
    const deathController = new CrossbarController(deathConfig, {
      itemTrackEl: document.getElementById('death-xmb-item-track')
    });
    deathController._updateLabels();
    deathController.render(performance.now());
    this.crossbarControllers['death-screen'] = deathController;

    // Success screen: item set is rebuilt fresh in handleSuccess() each time
    // (NEXT ROAD is conditionally hidden on the last level of a pack), so the
    // controller itself is (re)constructed there, not here. See handleSuccess().
  }

  /**
   * Returns the CrossbarController for the currently active overlay screen,
   * or undefined if that screen hasn't been ported to the XMB engine yet.
   * Single lookup point so later ports (Task E-I) just need to populate
   * this.crossbarControllers[screenId] in their own setup method — no
   * changes needed here or at the keyboard/gamepad dispatch sites.
   */
  getActiveCrossbarController() {
    const activeScreen = document.querySelector('.overlay-screen.active');
    if (!activeScreen) return undefined;
    return this.crossbarControllers[activeScreen.id];
  }

  /** Lets the user drag the Physics Calibrator window by its title bar.
   *  (It's also CSS-resizable from its bottom-right corner.) */
  _makeCalibratorDraggable() {
    const panel = document.getElementById('physics-calibrator-screen');
    const handle = panel && panel.querySelector('.status-title');
    if (!panel || !handle) return;
    let startX = 0, startY = 0, originLeft = 0, originTop = 0, dragging = false;
    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      const r = panel.getBoundingClientRect();
      originLeft = r.left; originTop = r.top;
      startX = e.clientX; startY = e.clientY;
      panel.style.right = 'auto'; panel.style.bottom = 'auto';
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    handle.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - 60, originLeft + (e.clientX - startX)));
      const top = Math.max(0, Math.min(window.innerHeight - 40, originTop + (e.clientY - startY)));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    });
    const end = (e) => { if (dragging) { dragging = false; try { handle.releasePointerCapture(e.pointerId); } catch (_) {} } };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  /** Makes the category labels clickable (mouse) — clicking a category jumps to
   *  it. Goes through the controller's (already sync-wrapped) handleDirection so
   *  the per-category item-track swap fires too. Call after the handleDirection
   *  wrap is installed in a setup. */
  wireCategoryClicks(ctrl) {
    (ctrl.config.categories || []).forEach((cat, i) => {
      if (!cat.el) return;
      cat.el.addEventListener('click', () => {
        const dir = i > ctrl.categoryIndex ? 1 : -1;
        while (ctrl.categoryIndex !== i) {
          const before = ctrl.categoryIndex;
          ctrl.handleDirection('horizontal', dir);
          if (ctrl.categoryIndex === before) break; // guard against no-op (e.g. slider trap)
        }
      });
    });
  }

  /**
   * Routes one keydown event into a CrossbarController's tap/hold API.
   * Arrow keys + WASD map to the four directions; native OS key-repeat
   * keydowns (e.repeat === true) are ignored because startHold() already
   * owns the repeat timing (immediate step -> 200ms -> fixed-rate) — letting
   * both fire would double the repeat rate. Enter/Space confirm, Escape cancels
   * and hands off to the screen's existing back/close button (same as the
   * legacy gp.menuCancel path) since cancel() on the controller only plays
   * the sound, it doesn't navigate.
   */
  handleCrossbarKeyboard(e, crossbar) {
    // While remapping a gamepad button ("press any button"), don't let arrow
    // keys navigate away from the listening row.
    if (this.keyboard && this.keyboard.currentlyMappingAction) return;

    if (typeof document !== 'undefined' && document.activeElement &&
        (document.activeElement.tagName === 'INPUT' ||
         document.activeElement.tagName === 'TEXTAREA' ||
         document.activeElement.tagName === 'SELECT')) {
      // Preserve the success-screen behavior: Enter in the initials field
      // submits the score (the crossbar never sees the keystroke otherwise).
      if (e.code === 'Enter' && document.activeElement.id === 'input-score-initials') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-score-submit');
        if (submitBtn) submitBtn.click();
      }
      return;
    }

    const directionForCode = {
      ArrowUp: ['vertical', -1], KeyW: ['vertical', -1],
      ArrowDown: ['vertical', 1], KeyS: ['vertical', 1],
      ArrowLeft: ['horizontal', -1], KeyA: ['horizontal', -1],
      ArrowRight: ['horizontal', 1], KeyD: ['horizontal', 1]
    };

    if (directionForCode[e.code]) {
      e.preventDefault();
      if (e.repeat) return; // startHold()'s own timers own the repeat cadence
      const [axis, dir] = directionForCode[e.code];
      crossbar.startHold(axis, dir);
      return;
    }

    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      crossbar.confirm();
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      if (e.repeat) return;
      crossbar.cancel();
      this._cancelActiveScreen();
    }
  }

  /** Clicks the back/close button of the active overlay screen, so Escape /
   *  gamepad-cancel actually navigate back (crossbar.cancel() only plays the
   *  sound). Shared by the keyboard and gamepad cancel paths. */
  _cancelActiveScreen() {
    const activeScreen = document.querySelector('.overlay-screen.active');
    if (!activeScreen) return;
    const backButtons = {
      'settings-screen': 'btn-settings-close',
      'gamepad-config-screen': 'btn-gamepad-close',
      'level-screen': 'btn-level-back',
      'ship-picker-screen': 'btn-picker-back',
      'how-to-screen': 'btn-how-to-back',
      'death-screen': 'btn-death-menu',
      'success-screen': 'btn-success-menu',
      'pause-screen': 'btn-pause-resume'
    };
    const btnId = backButtons[activeScreen.id];
    if (btnId) {
      const btn = document.getElementById(btnId);
      if (btn) btn.click();
    }
  }

  setupUIListeners() {
    // Menu triggers
    document.getElementById('btn-play-standard').addEventListener('click', () => {
      gameAudio.playClick();
      this.setPlayStyle('classic');
      this.showLevelSelection('standard');
    });

    document.getElementById('btn-play-generated').addEventListener('click', () => {
      gameAudio.playClick();
      this.setPlayStyle('classic');
      this.showLevelSelection('generated');
    });

    document.getElementById('btn-play-xmas').addEventListener('click', () => {
      gameAudio.playClick();
      this.setPlayStyle('classic');
      this.showLevelSelection('xmas');
    });

    const btnPlayFlowStandard = document.getElementById('btn-play-flow-standard');
    if (btnPlayFlowStandard) {
      btnPlayFlowStandard.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('flow');
        this.showLevelSelection('standard');
      });
    }

    const btnPlayFlowGenerated = document.getElementById('btn-play-flow-generated');
    if (btnPlayFlowGenerated) {
      btnPlayFlowGenerated.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('flow');
        this.showLevelSelection('generated');
      });
    }

    const btnPlayFlowXmas = document.getElementById('btn-play-flow-xmas');
    if (btnPlayFlowXmas) {
      btnPlayFlowXmas.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('flow');
        this.showLevelSelection('xmas');
      });
    }

    const btnPlayTowerStandard = document.getElementById('btn-play-tower-standard');
    if (btnPlayTowerStandard) {
      btnPlayTowerStandard.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('tower');
        this.showLevelSelection('standard');
      });
    }

    const btnPlayTowerGenerated = document.getElementById('btn-play-tower-generated');
    if (btnPlayTowerGenerated) {
      btnPlayTowerGenerated.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('tower');
        this.showLevelSelection('generated');
      });
    }

    const btnPlayTowerXmas = document.getElementById('btn-play-tower-xmas');
    if (btnPlayTowerXmas) {
      btnPlayTowerXmas.addEventListener('click', () => {
        gameAudio.playClick();
        this.setPlayStyle('tower');
        this.showLevelSelection('xmas');
      });
    }

    const btnLoadCustomLevel = document.getElementById('btn-load-custom-level');
    const customLevelLoader = document.getElementById('game-custom-level-loader');
    if (btnLoadCustomLevel && customLevelLoader) {
      btnLoadCustomLevel.addEventListener('click', () => {
        gameAudio.playClick();
        customLevelLoader.click();
      });

      customLevelLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            let data = JSON.parse(evt.target.result);
            // Validation
            if (!data || typeof data !== 'object') throw new Error("Invalid JSON format");
            if (typeof data.name !== 'string') throw new Error("Missing 'name' field");
            if (!Array.isArray(data.rows)) throw new Error("Missing or invalid 'rows' array");

            // If it's a draft format level, auto-convert/cook it on the fly
            if (data.physics && typeof data.physics === 'object') {
              const draft = data;
              const biome = parseInt(draft.biome) || 0;
              
              // Standard fallback palette
              const fallbackPalette = [
                [0,0,0], [128,128,128], [255,255,255], [0,128,0], [0,255,0],
                [0,0,128], [0,0,255], [128,0,0], [255,0,0], [128,128,0],
                [255,255,0], [0,128,128], [0,255,255], [128,0,128], [255,0,255], [64,64,64]
              ];
              const palette = Array.isArray(draft.palette) ? draft.palette : fallbackPalette;

              const cookedRows = draft.rows.map((row) => {
                if (!Array.isArray(row)) return Array(7).fill(null);
                return row.map((cell) => {
                  if (!cell) return null;
                  
                  const colorIdx = cell.colorIdx !== undefined ? cell.colorIdx : 1;
                  const cookedCell = {
                    val: colorIdx,
                    full: cell.type === 'obstacle-full',
                    half: cell.type === 'obstacle-half',
                    tunnel: cell.type === 'tunnel',
                    top_color: 0,
                    bottom_color: 0,
                    low3: colorIdx
                  };

                  if (cookedCell.full || cookedCell.half) {
                    cookedCell.top_color = colorIdx;
                    cookedCell.bottom_color = 0;
                  } else {
                    cookedCell.top_color = 0;
                    cookedCell.bottom_color = colorIdx;
                  }

                  if (cell.type === 'ramp') {
                    cookedCell.ramp = true;
                    cookedCell.startY = cell.ramp?.startY !== undefined ? cell.ramp.startY : 0.0;
                    cookedCell.endY = cell.ramp?.endY !== undefined ? cell.ramp.endY : 1.0;
                    cookedCell.direction = cell.ramp?.direction || 'forward';
                    cookedCell.top_color = colorIdx;
                    cookedCell.bottom_color = 0;
                  }

                  return cookedCell;
                });
              });

              data = {
                level_index: 99,
                name: draft.name || "Loaded Level",
                author: draft.author || "Designer",
                parTime: parseInt(draft.parTime) || 45,
                biome: biome,
                gravity: parseInt(draft.physics.gravity) || 8,
                fuel: parseInt(draft.physics.fuel) || 100,
                oxygen: parseInt(draft.physics.oxygen) || 60,
                palette: palette,
                rows: cookedRows
              };
            }

            // Safe fallbacks for optional fields
            if (typeof data.gravity !== 'number') {
              data.gravity = 8; // default gravity value
            }
            if (typeof data.fuel !== 'number') {
              data.fuel = 100; // default starting fuel
            }
            if (typeof data.oxygen !== 'number') {
              data.oxygen = 60; // default starting oxygen
            }
            if (!Array.isArray(data.palette)) {
              data.palette = []; // fallback to empty palette (handled gracefully by loader)
            }

            // Register dynamic pack cache
            registerCustomPack([data]);

            // Set pack to custom and start playing level 0
            this.currentPack = 'custom';
            this.startLevel(0);
          } catch (err) {
            alert(`Failed to load level: ${err.message}`);
          }
        };
        reader.readAsText(file);
      });
    }

    const btnOpenEditor = document.getElementById('btn-open-editor');
    if (btnOpenEditor) {
      btnOpenEditor.addEventListener('click', () => {
        gameAudio.playClick();
        window.open('editor.html', '_blank');
      });
    }

    const btnEditLevel = document.getElementById('btn-edit-level');
    if (btnEditLevel) {
      btnEditLevel.addEventListener('click', () => {
        gameAudio.playClick();
        this.inGameEditor.activate();
      });
    }

    const btnPauseResetLevel = document.getElementById('btn-pause-reset-level');
    if (btnPauseResetLevel) {
      btnPauseResetLevel.addEventListener('click', () => {
        gameAudio.playClick();
        if (confirm("Reset all edits to this level? This cannot be undone.")) {
          InGameEditor.resetLevelOverrides(this, this.currentPack, this.currentLevelIndex);
          // Re-load the level
          this.resumeGame();
          this.retryCurrentLevelOrGroup();
        }
      });
    }

    const btnToggleMouse = document.getElementById('btn-toggle-mouse');
    if (btnToggleMouse) {
      btnToggleMouse.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.mouseControlsEnabled = !this.keyboard.mouseControlsEnabled;
        localStorage.setItem('skyroads_mouse_play', this.keyboard.mouseControlsEnabled);
        this.updateMouseToggleBtn();
      });
    }

    const btnToggleTouch = document.getElementById('btn-toggle-touch');
    if (btnToggleTouch) {
      btnToggleTouch.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.touchControlsEnabled = !this.keyboard.touchControlsEnabled;
        localStorage.setItem('skyroads_touch_controls', this.keyboard.touchControlsEnabled);
        this.updateTouchToggleBtn();
      });
    }

    const btnToggleBoatThrottle = document.getElementById('btn-toggle-boat-throttle');
    if (btnToggleBoatThrottle) {
      btnToggleBoatThrottle.addEventListener('click', () => {
        gameAudio.playClick();
        this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
        localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
        this.updateBoatThrottleToggleBtn();
      });
    }

    const btnToggleDoubleJump = document.getElementById('btn-toggle-double-jump');
    if (btnToggleDoubleJump) {
      btnToggleDoubleJump.addEventListener('click', () => {
        gameAudio.playClick();
        this.physics.doubleJumpEnabled = !this.physics.doubleJumpEnabled;
        localStorage.setItem('skyroads_double_jump', this.physics.doubleJumpEnabled);
        this.updateDoubleJumpToggleBtn();
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

    const textureOptions = document.querySelectorAll('.texture-option');
    textureOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        gameAudio.playClick();
        const skinName = opt.getAttribute('data-skin');
        this.selectTextureInPicker(skinName);
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
      this.retryCurrentLevelOrGroup();
    });

    document.getElementById('btn-death-menu').addEventListener('click', () => {
      gameAudio.playClick();
      this.returnToMenu();
    });

    document.getElementById('btn-success-next').addEventListener('click', () => this.goToNextRoadOrMenu());

    document.getElementById('btn-success-menu').addEventListener('click', () => {
      gameAudio.playClick();
      this.returnToMenu();
    });

    const fovSlider = document.getElementById('hud-cam-fov-slider');
    if (fovSlider) {
      fovSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.graphics.setCameraFOV(val);
      });
    }

    // Track Curvature (Tilt) slider
    const curveSlider = document.getElementById('hud-curve-slider');
    if (curveSlider) {
      curveSlider.addEventListener('input', (e) => {
        const radius = parseFloat(e.target.value);
        this.graphics.setTrackCurvatureRadius(radius);
        // Auto-enable curvature when slider is moved
        if (!this.graphics.trackCurvatureEnabled) {
          this.graphics.trackCurvatureEnabled = true;
          curvatureUniforms.uCurvatureOn.value = 1.0;
        }
        // Update HUD displays
        const valEl = document.getElementById('hud-curve-val');
        if (valEl) valEl.innerText = String(Math.round(radius));
        const labelEl = document.getElementById('hud-track-curve');
        if (labelEl) {
          if (radius <= 50) labelEl.innerText = 'EXTREME';
          else if (radius <= 100) labelEl.innerText = 'DRAMATIC';
          else if (radius <= 200) labelEl.innerText = 'GENTLE';
          else labelEl.innerText = 'SUBTLE';
        }
      });
    }

    // Start Infinite Road Mode
    const btnStartInfinite = document.getElementById('btn-start-infinite');
    if (btnStartInfinite) {
      btnStartInfinite.addEventListener('click', () => this.startInfiniteRoad());
    }

    // Settings Menu Listeners
    const btnSettingsResume = document.getElementById('btn-settings-resume');
    if (btnSettingsResume) {
      btnSettingsResume.addEventListener('click', () => {
        gameAudio.playClick();
        this.toggleSettingsMenu();
      });
    }

    const btnSettingsRetry = document.getElementById('btn-settings-retry');
    if (btnSettingsRetry) {
      btnSettingsRetry.addEventListener('click', () => {
        gameAudio.playClick();
        this.retryCurrentLevelOrGroup();
      });
    }

    const btnSettingsQuit = document.getElementById('btn-settings-quit');
    if (btnSettingsQuit) {
      btnSettingsQuit.addEventListener('click', () => {
        gameAudio.playClick();
        this.returnToMenu();
      });
    }

    const btnSettingsClose = document.getElementById('btn-settings-close');
    if (btnSettingsClose) {
      btnSettingsClose.addEventListener('click', () => {
        gameAudio.playClick();
        this.toggleSettingsMenu();
      });
    }

    const btnSettingsDifficulty = document.getElementById('btn-settings-difficulty');
    if (btnSettingsDifficulty) {
      btnSettingsDifficulty.addEventListener('click', () => {
        gameAudio.playClick();
        const currentDiff = this.physics.difficulty || 'normal';
        let nextDiff = 'normal';
        if (currentDiff === 'easy') {
          nextDiff = 'normal';
        } else if (currentDiff === 'normal') {
          nextDiff = 'hard';
        } else {
          nextDiff = 'easy';
        }
        this.physics.difficulty = nextDiff;
        localStorage.setItem('skyroads_difficulty', nextDiff);
        this.updateDifficultyToggleBtn();

        // Dynamically update budget and hide/show rewind UI if level is running
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'death') {
          if (nextDiff === 'easy') {
            this.rewindBudgetMax = Infinity;
          } else if (nextDiff === 'normal') {
            this.rewindBudgetMax = 10.0;
          } else {
            this.rewindBudgetMax = 0.0;
          }
          this.rewindBudget = Math.min(this.rewindBudget, this.rewindBudgetMax);
          const rewindRow = document.getElementById('hud-rewind-row');
          if (rewindRow) {
            rewindRow.classList.toggle('hidden', !this.rewindEnabled || nextDiff === 'hard');
          }
          const rewindText = document.getElementById('hud-rewind-text');
          if (rewindText) {
            rewindText.innerText = nextDiff === 'easy' ? '∞' : `${this.rewindBudget.toFixed(1)}s`;
          }
        }
      });
    }

    const sliderSfxVolume = document.getElementById('slider-settings-sfx-volume');
    if (sliderSfxVolume) {
      sliderSfxVolume.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        gameAudio.setSfxVolume(val);
        localStorage.setItem('skyroads_sfx_volume', val);
      });
    }

    const btnSettingsMouse = document.getElementById('btn-settings-mouse');
    if (btnSettingsMouse) {
      btnSettingsMouse.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.mouseControlsEnabled = !this.keyboard.mouseControlsEnabled;
        localStorage.setItem('skyroads_mouse_play', this.keyboard.mouseControlsEnabled);
        this.updateMouseToggleBtn();
      });
    }

    const btnSettingsStarfield = document.getElementById('btn-settings-starfield');
    if (btnSettingsStarfield) {
      btnSettingsStarfield.addEventListener('click', () => {
        gameAudio.playClick();
        this.starfieldEnabled = !this.starfieldEnabled;
        if (this.graphics.starField) this.graphics.starField.visible = this.starfieldEnabled;
        localStorage.setItem('skyroads_starfield_enabled', this.starfieldEnabled);
        this.updateStarfieldToggleBtn();
      });
    }

    const btnSettingsSpeedFov = document.getElementById('btn-settings-speed-fov');
    if (btnSettingsSpeedFov) {
      btnSettingsSpeedFov.addEventListener('click', () => {
        gameAudio.playClick();
        this.speedFovEnabled = !this.speedFovEnabled;
        this.graphics.setSpeedFovEnabled(this.speedFovEnabled);
        localStorage.setItem('skyroads_speed_fov_enabled', this.speedFovEnabled);
        this.updateSpeedFovToggleBtn();
      });
    }

    const btnSettingsGhost = document.getElementById('btn-settings-ghost');
    if (btnSettingsGhost) {
      btnSettingsGhost.addEventListener('click', () => {
        gameAudio.playClick();
        this.ghostEnabled = !this.ghostEnabled;
        localStorage.setItem('skyroads_ghost_enabled', this.ghostEnabled);
        if (!this.ghostEnabled) {
          this.graphics.setGhostVisible(false);
        } else if (this.loadedGhost) {
          this.graphics.setGhostVisible(true);
        }
        this.updateGhostToggleBtn();
      });
    }

    const btnSettingsVisualizerMode = document.getElementById('btn-settings-visualizer-mode');
    if (btnSettingsVisualizerMode) {
      btnSettingsVisualizerMode.addEventListener('click', () => {
        gameAudio.playClick();
        this.visualizerWallMode = !this.visualizerWallMode;
        localStorage.setItem('skyroads_visualizer_wall_mode', this.visualizerWallMode);
        this.graphics.setVisualizerWallMode(this.visualizerWallMode);
        this.updateVisualizerModeBtn();
      });
    }

    const sliderWallAngle = document.getElementById('slider-settings-wall-angle');
    if (sliderWallAngle) {
      sliderWallAngle.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.graphics.setVisualizerWallParams({ angleDeg: val });
        localStorage.setItem('skyroads_wall_angle', val);
      });
    }

    const sliderWallSpread = document.getElementById('slider-settings-wall-spread');
    if (sliderWallSpread) {
      sliderWallSpread.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.graphics.setVisualizerWallParams({ halfTrack: val });
        localStorage.setItem('skyroads_wall_spread', val);
      });
    }

    const sliderWallHeight = document.getElementById('slider-settings-wall-height');
    if (sliderWallHeight) {
      sliderWallHeight.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.graphics.setVisualizerWallParams({ height: val });
        localStorage.setItem('skyroads_wall_height', val);
      });
    }

    const sliderStarSize = document.getElementById('slider-settings-star-size');
    if (sliderStarSize) {
      sliderStarSize.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) / 100;
        this.graphics.setStarSize(val);
        localStorage.setItem('skyroads_star_size', val);
      });
    }

    const sliderStarDensity = document.getElementById('slider-settings-star-density');
    if (sliderStarDensity) {
      sliderStarDensity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.graphics.setStarDensity(val); // preserves current visibility internally
        localStorage.setItem('skyroads_star_density', val);
      });
    }

    const btnSettingsTouch = document.getElementById('btn-settings-touch');
    if (btnSettingsTouch) {
      btnSettingsTouch.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.touchControlsEnabled = !this.keyboard.touchControlsEnabled;
        localStorage.setItem('skyroads_touch_controls', this.keyboard.touchControlsEnabled);
        this.updateTouchToggleBtn();
      });
    }

    const btnSettingsBoatThrottle = document.getElementById('btn-settings-boat-throttle');
    if (btnSettingsBoatThrottle) {
      btnSettingsBoatThrottle.addEventListener('click', () => {
        gameAudio.playClick();
        this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
        localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
        this.updateBoatThrottleToggleBtn();
      });
    }

    const btnSettingsBottomHud = document.getElementById('btn-settings-bottom-hud');
    if (btnSettingsBottomHud) {
      btnSettingsBottomHud.addEventListener('click', () => {
        gameAudio.playClick();
        this.bottomHudEnabled = !this.bottomHudEnabled;
        localStorage.setItem('skyroads_bottom_hud', this.bottomHudEnabled);
        this.updateBottomHudToggleBtn();
      });
    }

    const btnSettingsBezel = document.getElementById('btn-settings-bezel');
    if (btnSettingsBezel) {
      btnSettingsBezel.addEventListener('click', () => {
        gameAudio.playClick();
        this.toggleCockpitBezel();
      });
    }

    const btnSettingsStickThrottle = document.getElementById('btn-settings-stick-throttle');
    if (btnSettingsStickThrottle) {
      btnSettingsStickThrottle.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.touchJoystickThrottleEnabled = !this.keyboard.touchJoystickThrottleEnabled;
        localStorage.setItem('skyroads_stick_throttle', this.keyboard.touchJoystickThrottleEnabled);
        this.updateStickThrottleToggleBtn();
      });
    }

    const btnSettingsLaneSnap = document.getElementById('btn-settings-lane-snap');
    if (btnSettingsLaneSnap) {
      btnSettingsLaneSnap.addEventListener('click', () => {
        gameAudio.playClick();
        this.laneSnapEnabled = !this.laneSnapEnabled;
        localStorage.setItem('skyroads_lane_snap', this.laneSnapEnabled);
        this.updateLaneSnapToggleBtn();
      });
    }

    const btnSettingsRewind = document.getElementById('btn-settings-rewind');
    if (btnSettingsRewind) {
      btnSettingsRewind.addEventListener('click', () => {
        gameAudio.playClick();
        this.rewindEnabled = !this.rewindEnabled;
        localStorage.setItem('skyroads_rewind_enabled', this.rewindEnabled);
        this.updateRewindToggleBtn();
      });
    }

    const btnSettingsCollisionView = document.getElementById('btn-settings-collision-view');
    if (btnSettingsCollisionView) {
      btnSettingsCollisionView.addEventListener('click', () => {
        gameAudio.playClick();
        const nextState = !this.collisionViewEnabled;
        this.toggleSceneCollisionView(nextState);
        this.updateCollisionViewToggleBtn();
      });
    }

    const btnSettingsPicker = document.getElementById('btn-settings-picker');
    if (btnSettingsPicker) {
      btnSettingsPicker.addEventListener('click', () => {
        gameAudio.playClick();
        this.openShipPicker();
      });
    }

    const btnSettingsGamepad = document.getElementById('btn-settings-gamepad');
    if (btnSettingsGamepad) {
      btnSettingsGamepad.addEventListener('click', () => {
        gameAudio.playClick();
        this.gameState = 'gamepad_config';
        this.updateGamepadConfigUI();
        this.showScreen('gamepad-config-screen');
      });
    }

    const btnGamepadClose = document.getElementById('btn-gamepad-close');
    if (btnGamepadClose) {
      btnGamepadClose.addEventListener('click', () => {
        gameAudio.playClick();
        this.gameState = 'settings';
        this.showScreen('settings-screen');
      });
    }

    const btnGamepadReset = document.getElementById('btn-gamepad-reset');
    if (btnGamepadReset) {
      btnGamepadReset.addEventListener('click', () => {
        gameAudio.playClick();
        this.keyboard.gamepadMappings = {
          forward: 7,
          backward: 6,
          jump: 0,
          left: 14,
          right: 15,
          cycleCamera: 3,
          togglePause: 9
        };
        this.keyboard.saveGamepadMappings();
        this.updateGamepadConfigUI();
      });
    }

    // Set up button mapping listener completion callback
    this.keyboard.onGamepadMapComplete = (action, btnIndex) => {
      gameAudio.playClick();
      this.updateGamepadConfigUI();
    };

    // Bind listeners to individual action map buttons
    const gamepadActions = ['forward', 'backward', 'jump', 'left', 'right', 'cycleCamera', 'togglePause'];
    gamepadActions.forEach(action => {
      const btn = document.getElementById(`btn-map-${action}`);
      if (btn) {
        btn.addEventListener('click', () => this.startGamepadRemap(action));
      }
    });

    // Advanced Physics Calibrator triggers
    const btnSettingsCalibrator = document.getElementById('btn-settings-calibrator');
    if (btnSettingsCalibrator) {
      btnSettingsCalibrator.addEventListener('click', () => {
        gameAudio.playClick();
        // Close settings menu and restore state
        if (this.gameState === 'settings') {
          const screenId = this.preSettingsState === 'playing' ? '' : (this.preSettingsState === 'paused' ? 'pause-screen' : 'menu-screen');
          this.showScreen(screenId);
          if (this.preSettingsState === 'playing') {
            this.gameState = 'playing';
            gameAudio.startEngine();
          } else {
            this.gameState = this.preSettingsState;
          }
        }
        this.togglePhysicsCalibrator(true);
      });
    }

    const btnSettingsPhysics = document.getElementById('btn-settings-physics');
    if (btnSettingsPhysics) {
      btnSettingsPhysics.addEventListener('click', (e) => {
        e.stopPropagation();
        gameAudio.playClick();
        this.togglePhysicsCalibrator();
      });
    }

    const btnCalibratorClose = document.getElementById('btn-calibrator-close');
    if (btnCalibratorClose) {
      btnCalibratorClose.addEventListener('click', () => {
        gameAudio.playClick();
        this.togglePhysicsCalibrator(false);
      });
    }

    // Collapsible accordion group headers
    const groupHeaders = document.querySelectorAll('#physics-calibrator-screen .group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', () => {
        gameAudio.playClick();
        const card = header.closest('.calibrator-group-card');
        if (card) {
          card.classList.toggle('collapsed');
        }
      });
    });

    // Preset slot selection triggers
    ['vga', 'snappy', 'lunar', 'custom'].forEach(key => {
      const btn = document.getElementById(`preset-btn-${key}`);
      if (btn) {
        btn.addEventListener('click', () => {
          gameAudio.playClick();
          this.activePreset = key;
          localStorage.setItem('skyroads_physics_active_preset', key);
          this.applyActivePreset();
          this.updateCalibratorUI();
          this.showCalibratorAlert();
        });
      }
    });

    // Reset current active preset to its design baseline (supporting custom isolated per-preset baselines)
    const btnCalibratorReset = document.getElementById('btn-calibrator-reset');
    if (btnCalibratorReset) {
      btnCalibratorReset.addEventListener('click', () => {
        gameAudio.playClick();
        const basePresets = {
          vga: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 12.0, steerAccel: 50.0, dragSteer: 40.0, laneSnapStrength: 4.0, easyCollisionBounceVel: 5.0, easyCollisionBounceDist: 0.8, bounceFactor: 1.0, jumpImpulse: 11.5, jumpFactor: 1.0, gravityFactor: 1.0, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0 },
          snappy: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 10, steerAccel: 35, dragSteer: 28, laneSnapStrength: 4.0, easyCollisionBounceVel: 10, easyCollisionBounceDist: 1.2, bounceFactor: 1.0, jumpImpulse: 10.5, jumpFactor: 1.25, gravityFactor: 1.45, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0 },
          lunar: { maxSpeedNormal: 24, maxSpeedBoost: 50, accelForward: 12, decelBrakes: 25, dragZ: 2, maxSteerSpeed: 8, steerAccel: 15, dragSteer: 8, laneSnapStrength: 4.0, easyCollisionBounceVel: 8, easyCollisionBounceDist: 1.5, bounceFactor: 1.5, jumpImpulse: 7.5, jumpFactor: 1.0, gravityFactor: 0.45, fallGravityMultiplier: 1.15, variableJumpDampening: 0.90, coyoteTimeBuffer: 0.40, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0 },
          custom: { maxSpeedNormal: 32, maxSpeedBoost: 60, accelForward: 18, decelBrakes: 35, dragZ: 4, maxSteerSpeed: 10, steerAccel: 35, dragSteer: 28, laneSnapStrength: 4.0, easyCollisionBounceVel: 10, easyCollisionBounceDist: 1.2, bounceFactor: 1.0, jumpImpulse: 10.5, jumpFactor: 1.0, gravityFactor: 1.0, fallGravityMultiplier: 1.45, variableJumpDampening: 0.82, coyoteTimeBuffer: 0.25, cockpitOffsetX: 0.0, cockpitOffsetY: 0.0, cockpitOffsetZ: 0.0, showCockpitBezel: 1.0, damageModifier: 1.0, shipMass: 1.0, minDamageSpeed: 4.0 }
        };

        // Check if there is a custom baseline override saved for this specific active preset
        let targetBaseline = { ...basePresets[this.activePreset] };
        const savedBaseline = localStorage.getItem(`skyroads_physics_preset_baseline_${this.activePreset}`);
        if (savedBaseline) {
          try {
            targetBaseline = { ...targetBaseline, ...JSON.parse(savedBaseline) };
          } catch (e) {
            // Fallback
          }
        }

        this.physicsPresets[this.activePreset] = { ...targetBaseline };
        localStorage.setItem(`skyroads_physics_preset_${this.activePreset}`, JSON.stringify(this.physicsPresets[this.activePreset]));
        this.applyActivePreset();
        this.updateCalibratorUI();
        this.showCalibratorAlert();
      });
    }

    // Save current active preset values as the new custom default baseline for this preset
    const btnCalibratorSaveDefault = document.getElementById('btn-calibrator-save-default');
    if (btnCalibratorSaveDefault) {
      btnCalibratorSaveDefault.addEventListener('click', () => {
        gameAudio.playClick();
        
        // Save the active physics preset values as the new baseline default override
        const currentVals = this.physicsPresets[this.activePreset];
        localStorage.setItem(`skyroads_physics_preset_baseline_${this.activePreset}`, JSON.stringify(currentVals));

        // Also persist the current camera view + active preset so the whole
        // "default" (view + calibration + controls) is durable, not just sliders
        if (this.graphics && this.graphics.cameraMode) {
          localStorage.setItem('skyroads_camera_mode', this.graphics.cameraMode);
        }
        localStorage.setItem('skyroads_physics_active_preset', this.activePreset);

        // Collect all preference keys to save to disk via backend API
        const keysToSave = [
          'skyroads_camera_mode',
          'skyroads_mouse_play',
          'skyroads_lane_snap',
          'skyroads_double_jump',
          'skyroads_boat_throttle',
          'skyroads_stick_throttle',
          'skyroads_difficulty',
          'skyroads_physics_active_preset',
          'skyroads_physics_preset_baseline_vga',
          'skyroads_physics_preset_baseline_snappy',
          'skyroads_physics_preset_baseline_lunar',
          'skyroads_physics_preset_baseline_custom'
        ];

        const payload = {};
        for (const key of keysToSave) {
          const val = localStorage.getItem(key);
          if (val !== null) {
            payload[key] = val;
          }
        }

        // Send payload to backend server
        fetch('/api/save-settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }).catch(err => {
          console.error("Failed to write defaults to disk:", err);
        });

        // Show success visual indicator alert inside HUD
        this.showCalibratorAlert();
        
        // Temporarily change button text as user feedback
        const originalText = btnCalibratorSaveDefault.innerText;
        btnCalibratorSaveDefault.innerText = "DEFAULT SAVED! 💾✅";
        btnCalibratorSaveDefault.style.borderColor = "#39FF14";
        btnCalibratorSaveDefault.style.color = "#39FF14";
        setTimeout(() => {
          btnCalibratorSaveDefault.innerText = originalText;
          btnCalibratorSaveDefault.style.borderColor = "#00ffcc";
          btnCalibratorSaveDefault.style.color = "#00ffcc";
        }, 1800);
      });
    }

    // Dynamic slider range inputs and real-time auto-saving
    const sliders = document.querySelectorAll('#physics-calibrator-screen input[type="range"]');
    sliders.forEach(slider => {
      slider.addEventListener('input', () => {
        const param = slider.id.replace('input-', '');
        const value = parseFloat(slider.value);
        
        // Update active preset and physics settings
        this.physicsPresets[this.activePreset][param] = value;
        this.physics.settings[param] = value;
        
        // Auto-save active configuration to localStorage
        localStorage.setItem(`skyroads_physics_preset_${this.activePreset}`, JSON.stringify(this.physicsPresets[this.activePreset]));
        
        // Apply camera-specific params directly to graphics
        if (param === 'cameraHeight' || param === 'cameraPitchDeg' || param === 'cameraFOV' || param === 'cockpitFov' || param === 'speedFovMaxAdd' || param === 'speedCamPullback') {
          this._applyCameraSettings(this.physicsPresets[this.activePreset]);
        }

        // Update active numerical readout text
        const readout = document.getElementById(`val-${param}`);
        if (readout) {
          if (param === 'showCockpitBezel') {
            readout.innerText = value === 1 ? 'ON' : 'OFF';
          } else if (param === 'cameraPitchDeg') {
            readout.innerText = `${Math.round(value)}°`;
          } else if (param === 'cameraFOV' || param === 'cockpitFov' || param === 'speedFovMaxAdd') {
            readout.innerText = `${Math.round(value)}°`;
          } else if (param === 'cameraHeight' || param === 'speedCamPullback') {
            readout.innerText = value.toFixed(2);
          } else {
            readout.innerText = value.toFixed(param.startsWith('cockpitOffset') || param === 'coyoteTimeBuffer' || param === 'variableJumpDampening' || param === 'gravityFactor' || param === 'fallGravityMultiplier' || param === 'bounceFactor' || param === 'dragZ' ? 2 : 1);
          }
        }

        this.showCalibratorAlert();
      });

      // Blur the slider when steering or jumping to return focus to the page for driving
      slider.addEventListener('keydown', (e) => {
        const driveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        const driveKeyNames = ['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
        if (driveKeys.includes(e.code) || driveKeyNames.includes(e.key.toLowerCase())) {
          slider.blur();
        }
      });
    });

    // Pause Menu Listeners
    const btnPauseResume = document.getElementById('btn-pause-resume');
    if (btnPauseResume) {
      btnPauseResume.addEventListener('click', () => {
        gameAudio.playClick();
        this.resumeGame();
      });
    }

    const btnPauseRetry = document.getElementById('btn-pause-retry');
    if (btnPauseRetry) {
      btnPauseRetry.addEventListener('click', () => {
        gameAudio.playClick();
        this.retryCurrentLevelOrGroup();
      });
    }

    const btnPauseQuit = document.getElementById('btn-pause-quit');
    if (btnPauseQuit) {
      btnPauseQuit.addEventListener('click', () => {
        gameAudio.playClick();
        this.returnToMenu();
      });
    }

    const btnPauseToggleBoatThrottle = document.getElementById('btn-pause-toggle-boat-throttle');
    if (btnPauseToggleBoatThrottle) {
      btnPauseToggleBoatThrottle.addEventListener('click', () => {
        gameAudio.playClick();
        this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
        localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
        this.updateBoatThrottleToggleBtn();
      });
    }

    const btnTouchBoatThrottle = document.getElementById('btn-touch-boat-throttle');
    if (btnTouchBoatThrottle) {
      btnTouchBoatThrottle.addEventListener('click', () => {
        gameAudio.playClick();
        this.physics.boatThrottleEnabled = !this.physics.boatThrottleEnabled;
        localStorage.setItem('skyroads_boat_throttle', this.physics.boatThrottleEnabled);
        this.updateBoatThrottleToggleBtn();
      });
    }

    // (In-game pause trigger button removed — the Settings gear pauses the game
    // and its menu offers Resume / Retry / Quit; Esc still pauses too.)

    // Deprecated multi-layout toggle removed for single unified premium layout

    // Touch camera/zoom buttons are now handled by TouchControlManager

    // Fullscreen Toggle button listener
    const btnFullscreenTrigger = document.getElementById('btn-fullscreen-trigger');
    if (btnFullscreenTrigger) {
      btnFullscreenTrigger.addEventListener('click', () => {
        gameAudio.playClick();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(err => {
            // Log as console warning instead of error to satisfy build environments
            console.warn(`Fullscreen request failed: ${err.message}`);
          });
        } else {
          document.exitFullscreen();
        }
      });
    }

    // Toggle icon path dynamically on fullscreen change
    document.addEventListener('fullscreenchange', () => {
      const btn = document.getElementById('btn-fullscreen-trigger');
      if (!btn) return;
      if (document.fullscreenElement) {
        // Exit fullscreen SVG path
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`;
      } else {
        // Enter fullscreen SVG path
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
      }
    });
  }

  showScreen(screenId) {
    // Toggle top-right HUD visibility based on active screen and game state
    const topRightHud = document.getElementById('top-right-hud');
    if (topRightHud) {
      if (!screenId && this.gameState === 'playing') {
        topRightHud.classList.remove('hidden');
      } else {
        topRightHud.classList.add('hidden');
      }
    }

    // Hide all overlay screens
    const screens = document.querySelectorAll('.overlay-screen');
    screens.forEach(s => s.classList.remove('active'));
    screens.forEach(s => s.classList.add('hidden'));

    // If opening a screen other than in-game (screenId is non-empty), close the physics panel
    if (screenId && screenId !== 'physics-calibrator-screen') {
      this.togglePhysicsCalibrator(false);
    }

    // Manage btn-edit-level visibility
    const btnEditLevel = document.getElementById('btn-edit-level');
    if (btnEditLevel) {
      if (!screenId && this.gameState === 'playing') {
        btnEditLevel.classList.remove('hidden');
      } else {
        btnEditLevel.classList.add('hidden');
      }
    }

    // If no target specified, just hide everything (return to gameplay)
    if (!screenId) {
      // Restore touch controls when returning to active gameplay
      if (this.touchManager && this.keyboard.touchControlsEnabled && this.gameState === 'playing') {
        this.touchManager.show();
      }
      return;
    }

    // An overlay is opening — hide touch buttons so they don't intercept taps
    if (this.touchManager) this.touchManager.hide();

    // Show target screen
    const target = document.getElementById(screenId);

    if (!target) return;

    target.classList.remove('hidden');
    // Force reflow for transitions
    target.offsetHeight;
    target.classList.add('active');

    // Settings crossbar is rebuilt on every open (paused-only rows vary by state).
    if (screenId === 'settings-screen') this.mountSettingsCrossbar();

    // Reset and auto-focus the first visible button for keyboard menu navigation
    // Legacy auto-focus only for screens without an XMB controller; ported
    // screens manage their own focus via the crossbar (avoids a stray
    // keyboard-focused highlight that doesn't track the crossbar's item).
    if (!this.crossbarControllers[screenId]) {
      this.selectedMenuIndex = 0;
      setTimeout(() => {
        let buttons = Array.from(target.querySelectorAll('.btn, .level-item, .skin-option'));
        buttons = buttons.filter(btn => !btn.classList.contains('hidden') && btn.style.display !== 'none');
        if (buttons.length > 0) {
          this.highlightMenuButton(buttons);
        }
      }, 50);
    }
  }

  async startInfiniteRoad() {
    gameAudio.playClick();
    this.isInfiniteMode = true;
    this.infiniteZOffset = 0;
    let packLevels = getCachedPack(this.currentPack);
    if (!packLevels) packLevels = await loadLevelPack(this.currentPack);
    const randomStartIdx = (packLevels && packLevels.length > 0)
      ? Math.floor(Math.random() * packLevels.length)
      : 0;
    this.startLevel(randomStartIdx);
  }

  /** Format a completion time (seconds) as m:ss.t for cards/leaderboards. */
  formatTime(t) {
    if (t == null || isNaN(t)) return '--:--';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    const tenths = Math.floor((t * 10) % 10);
    return `${m}:${String(s).padStart(2, '0')}.${tenths}`;
  }

  async showLevelSelection(packName) {
    this.isInfiniteMode = false;
    this.infiniteZOffset = 0;
    this.currentPack = packName;
    this.gameState = 'loading';
    
    // Show loading screen while fetching pack data
    this.showScreen('loading-screen');
    document.getElementById('loading-status').innerText = 'Loading level pack...';
    document.getElementById('loading-progress-bar').style.width = '50%';

    // Lazy-load the level pack (cached on subsequent calls)
    const levels = await loadLevelPack(packName);

    this.gameState = 'level_select';
    let packTitle = packName === 'standard' ? 'STANDARD PACK' : (packName === 'xmas' ? 'XMAS SPECIAL' : 'GENERATED PACK');
    if (this.playStyle === 'flow') packTitle += ' (FLOW)';
    if (this.playStyle === 'tower') packTitle += ' (TOWER)';
    document.getElementById('level-pack-title').innerText = packTitle;

    let names;
    if (packName === 'standard') {
      names = [...this.standardRoadNames, ...this.xmasRoadNames];
    } else if (packName === 'xmas') {
      names = this.xmasRoadNames;
    } else {
      names = this.generatedRoadNames;
    }

    let labels;
    let cfg;
    if (this.playStyle === 'classic') {
      labels = levels.map((_, idx) => names[idx] || `ROAD ${idx}`);
      cfg = buildLevelSelectConfig(labels);
    } else {
      labels = [];
      const worldName = this.playStyle === 'flow' ? 'WORLD' : 'TOWER';
      for (let i = 0; i < 10; i++) {
        const firstLevelName = names[i * 3];
        labels.push(`${worldName} ${i + 1}: ${firstLevelName ? firstLevelName.toUpperCase() : `SECTOR ${i + 1}`}`);
      }
      cfg = buildLevelSelectConfig(labels);
    }
    // Infinite Road is the first item of the first decade group (replaces the
    // old standalone START INFINITE ROAD button).
    if (cfg.categories[0]) {
      cfg.categories[0].items.unshift({ id: 'infinite', label: 'INFINITE ROAD', kind: 'action', infinite: true });
    }
    const catTrack = document.getElementById('level-category-track');
    const crossbar = document.getElementById('level-crossbar');
    catTrack.innerHTML = '';
    crossbar.querySelectorAll('.level-item-track-dyn').forEach(el => el.remove());
    const placeholder = document.getElementById('level-item-track');
    if (placeholder) placeholder.classList.add('hidden'); // replaced by per-decade tracks

    const tracks = {};
    cfg.categories.forEach((cat, ci) => {
      const catEl = document.createElement('div');
      catEl.className = 'xmb-category';
      catEl.textContent = cat.label; // bake all decade labels so every group is
                                     // visible in the bar, not just the active one
      cat.label = ''; // engine should not append a duplicate label span
      catTrack.appendChild(catEl);
      cat.el = catEl;

      const track = document.createElement('div');
      track.className = 'xmb-item-track level-item-track-dyn' + (ci === 0 ? '' : ' hidden');
      crossbar.appendChild(track);
      tracks[ci] = track;

      cat.items.forEach(item => {
        const btn = document.createElement('div');
        btn.className = 'level-item xmb-item';

        if (item.infinite) {
          // Special first-item: Infinite Road. NOT a `.level-item` (it's not a
          // numbered level) so level counts/first-level logic stay correct.
          btn.className = 'xmb-item level-item-infinite';
          const numLabel = document.createElement('div');
          numLabel.className = 'level-num';
          numLabel.innerText = '∞';
          const nameLabel = document.createElement('div');
          nameLabel.className = 'level-name';
          nameLabel.innerText = 'INFINITE ROAD';
          btn.appendChild(numLabel);
          btn.appendChild(nameLabel);
          const start = () => this.startInfiniteRoad();
          btn.addEventListener('click', start);
          item.el = btn;
          item.label = '';
          item.onConfirm = start;
          track.appendChild(btn);
          return;
        }

        const absIdx = parseInt(item.actionKey.replace('play-level-', ''), 10);
        const numLabel = document.createElement('div');
        numLabel.className = 'level-num';
        numLabel.innerText = this.playStyle === 'classic' ? absIdx : absIdx + 1;
        const nameLabel = document.createElement('div');
        nameLabel.className = 'level-name';
        nameLabel.innerText = labels[absIdx];
        btn.appendChild(numLabel);
        btn.appendChild(nameLabel);

        const scoreKey = this.playStyle === 'classic'
          ? `skyroads_best_score_${packName}_${absIdx}`
          : `skyroads_best_score_${this.playStyle}_${packName}_${absIdx}`;
        const bestScore = localStorage.getItem(scoreKey);
        if (bestScore) {
          const scoreBadge = document.createElement('div');
          scoreBadge.className = 'level-best-score';
          scoreBadge.innerText = `🏆 ${parseInt(bestScore, 10).toLocaleString()}`;
          btn.appendChild(scoreBadge);
        }

        const start = () => {
          gameAudio.playClick();
          if (this.playStyle === 'classic') {
            this.startLevel(absIdx);
          } else {
            this.startGroup(absIdx);
          }
        };
        btn.addEventListener('click', start); // mouse/touch still works
        item.el = btn;
        item.label = ''; // the button carries its own num/name; no duplicate label span
        item.onConfirm = start;
        track.appendChild(btn);
      });
    });

    if (this.crossbarControllers['level-screen']) this.crossbarControllers['level-screen'].destroy();
    const ctrl = new CrossbarController(cfg, { categoryTrackEl: catTrack, itemTrackEl: tracks[0], leftAlignItems: true });

    // Live title card: refreshes for the focused item (name + screenshot +
    // top-5 times). Reuses the existing score leaderboard store; the screenshot
    // degrades gracefully when a thumb hasn't been generated yet.
    const cardEl = document.getElementById('level-title-card');
    const updateTitleCard = () => {
      if (!cardEl) return;
      const item = ctrl.activeItem;
      const nameEl = cardEl.querySelector('.ltc-name');
      const shotWrap = cardEl.querySelector('.ltc-shot-wrap');
      const shotImg = cardEl.querySelector('.ltc-shot');
      const tbody = cardEl.querySelector('.ltc-times tbody');
      cardEl.classList.remove('hidden');

      const isLevel = item && item.actionKey && item.actionKey.startsWith('play-level-');
      if (!isLevel) {
        nameEl.textContent = item && item.infinite ? 'INFINITE ROAD' : '—';
        shotWrap.classList.add('no-shot');
        shotImg.removeAttribute('src');
        tbody.innerHTML = `<tr><td class="ltc-empty" colspan="4">${item && item.infinite ? 'Endless procedurally-streamed road.' : 'No records yet.'}</td></tr>`;
        return;
      }

      const absIdx = parseInt(item.actionKey.replace('play-level-', ''), 10);
      nameEl.textContent = labels[absIdx] || `ROAD ${absIdx}`;

      shotWrap.classList.add('no-shot');
      shotImg.onload = () => shotWrap.classList.remove('no-shot');
      shotImg.onerror = () => shotWrap.classList.add('no-shot');
      shotImg.src = `assets/level_thumbs/${packName}_${absIdx}.jpg`;

      let records = [];
      try {
        const raw = localStorage.getItem(`skyroads_leaderboard_${packName}_${absIdx}`);
        if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) records = p; }
      } catch (e) { /* ignore corrupt store */ }

      if (records.length === 0) {
        tbody.innerHTML = `<tr><td class="ltc-empty" colspan="4">No records yet. Be the first!</td></tr>`;
      } else {
        tbody.innerHTML = records.slice(0, 5).map((r, i) => `
          <tr>
            <td class="ltc-rank">#${i + 1}</td>
            <td class="ltc-ini">${r.initials || '???'}</td>
            <td class="ltc-time">${this.formatTime(r.time)}</td>
            <td class="ltc-score">${(r.score || 0).toLocaleString()}</td>
          </tr>`).join('');
      }
    };

    // Per-decade item-track swap, same pattern as the garage/main-menu ports.
    const sync = () => {
      const ai = ctrl.categoryIndex;
      Object.entries(tracks).forEach(([i, el]) => el.classList.toggle('hidden', Number(i) !== ai));
      ctrl.mount(catTrack, tracks[ai]);
    };
    sync();
    const orig = ctrl.handleDirection.bind(ctrl);
    ctrl.handleDirection = (axis, dir) => { orig(axis, dir); if (axis === 'horizontal') sync(); updateTitleCard(); };
    this.wireCategoryClicks(ctrl);
    ctrl._updateLabels();
    ctrl.render(performance.now());
    updateTitleCard();
    this.crossbarControllers['level-screen'] = ctrl;

    this.showScreen('level-screen');
  }

  findSafeSpawnPosition() {
    const TILE_LENGTH = 4.0;
    const TILE_WIDTH = 2.0;
    const rows = this.currentLevelData.rows;
    let spawnRow = Math.max(0, Math.min(2, rows.length - 1)); // Start at row 2 minimum for runway buffer if possible
    for (let r = 0; r < rows.length; r++) {
      if (rows[r] && rows[r].some(t => t !== null)) {
        spawnRow = Math.max(Math.max(0, Math.min(2, rows.length - 1)), r);
        break;
      }
    }
    spawnRow = Math.max(0, Math.min(spawnRow, rows.length - 1));

    const spawnRowTiles = rows[spawnRow] || [null, null, null, null, null, null, null];
    let spawnCol = 3;
    let minDistance = Infinity;
    for (let c = 0; c < spawnRowTiles.length; c++) {
      if (spawnRowTiles[c] !== null) {
        const dist = Math.abs(c - 3);
        if (dist < minDistance) {
          minDistance = dist;
          spawnCol = c;
        }
      }
    }
    const spawnX = (spawnCol - 3) * TILE_WIDTH;

    const spawnTile = spawnRowTiles[spawnCol];
    let tileSurfaceY = 0.0;
    if (spawnTile) {
      if (spawnTile.ramp) {
        const sY = spawnTile.startY !== undefined ? spawnTile.startY : 0.0;
        const eY = spawnTile.endY !== undefined ? spawnTile.endY : 0.0;
        tileSurfaceY = sY + 0.5 * (eY - sY);
      } else if (spawnTile.full && spawnTile.half) {
        tileSurfaceY = 3.0;
      } else if (spawnTile.full) {
        tileSurfaceY = 2.0;
      } else if (spawnTile.half) {
        tileSurfaceY = 1.0;
      }
    }
    const spawnY = tileSurfaceY + 0.3;
    const spawnZ = -(spawnRow + 0.5) * TILE_LENGTH + this.infiniteZOffset;

    return { spawnX, spawnY, spawnZ };
  }
  clearAllLevelGeometry() {
    // 1. Clear standard single-level meshes
    if (this.levelInfo && this.levelInfo.roadMeshes) {
      this.levelInfo.roadMeshes.forEach(mesh => {
        this.graphics.scene.remove(mesh);
        mesh.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      });
      this.levelInfo.roadMeshes = [];
    }

    // 2. Clear multi-level groups
    const groups = [this.levelGroupA, this.levelGroupB, this.levelGroupC];
    groups.forEach((group, idx) => {
      if (group) {
        this.graphics.scene.remove(group);
        group.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
        if (idx === 0) this.levelGroupA = null;
        if (idx === 1) this.levelGroupB = null;
        if (idx === 2) this.levelGroupC = null;
      }
    });
  }

  async startLevel(index, opts = {}) {
    this.clearAllLevelGeometry();

    if (this.keyboard && typeof this.keyboard.resetKeys === 'function') {
      this.keyboard.resetKeys();
    }
    // Kick off Webamp playback the first time gameplay actually starts — this
    // call site is guaranteed to run after a real user gesture (a button
    // click), satisfying browser autoplay-gesture rules.
    // If Webamp is already playing, do NOT call play() to avoid restarting or reloading it.
    if (this.webampInstance) {
      const isPlaying = this.webampInstance.getMediaStatus() === 'PLAYING';
      if (!isPlaying && !this._webampStarted) {
        try {
          this.webampInstance.play();
          this._webampStarted = true;
        } catch (err) {
          console.warn('[Visualizer] Webamp playback could not be started automatically:', err);
        }
      } else if (isPlaying) {
        this._webampStarted = true;
      }
    }

    if (!this.isInfiniteMode) {
      this.infiniteZOffset = 0;
    }
    this.currentLevelIndex = index;

    // Reset checkpoint system state
    this.lastCheckpointPassed = null;
    this.activeCheckpoint = null;
    
    // Check for local storage level overrides
    const storageKey = `skyroads_override_${this.currentPack}_${index}`;
    const localOverride = localStorage.getItem(storageKey);
    
    if (localOverride) {
      try {
        this.currentLevelData = JSON.parse(localOverride);
        const packLevels = getCachedPack(this.currentPack);
        if (packLevels) {
          packLevels[index] = this.currentLevelData;
        }
      } catch (e) {
        console.warn("Failed to parse local overrides for level", index, e);
        const packLevels = getCachedPack(this.currentPack);
        this.currentLevelData = packLevels[index];
      }
    } else {
      const packLevels = getCachedPack(this.currentPack);
      this.currentLevelData = packLevels[index];
    }
    
    // Initialize performance scoring trackers
    this.totalTime = 0.0;
    this.speedAccumulator = 0.0;
    this.speedTicks = 0;
    this.wallHits = 0;
    this.stateHistory = [];
    this.rewindPressedLastFrame = false;
    this.rewindKeyHeldStart = 0;
    this.rewindTimeoutId = null;
    this.isRewinding = false;
    this.rewindHistoryIndex = -1;
    // Rewind budget: unlimited on easy, 10s on normal, 0s (no rewind) on hard
    const diff = this.physics.difficulty || 'normal';
    if (diff === 'easy') {
      this.rewindBudgetMax = Infinity;
    } else if (diff === 'normal') {
      this.rewindBudgetMax = 10.0;
    } else {
      this.rewindBudgetMax = 0.0;
    }
    this.rewindBudget = this.rewindBudgetMax;
    // Show/hide rewind budget HUD
    const rewindRow = document.getElementById('hud-rewind-row');
    if (rewindRow) {
      rewindRow.classList.toggle('hidden', !this.rewindEnabled || diff === 'hard');
    }
    const rewindText = document.getElementById('hud-rewind-text');
    if (rewindText) {
      rewindText.innerText = diff === 'easy' ? '∞' : `${this.rewindBudgetMax.toFixed(1)}s`;
    }
    
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
    await new Promise((resolve) => {
      this.graphics.loadLevelSceneryModels(index, resolve);
    });
    const activeThemeIdx = getActiveThemeIndex(this.currentLevelData);
    disposeUnusedThemes(activeThemeIdx);

    // 2. Build track geometry asynchronously with progress updates
    const onProgress = (percent) => {
      const progressBar = document.getElementById('loading-progress-bar');
      if (progressBar) {
        progressBar.style.width = `${percent}%`;
      }
    };

    if (this.isInfiniteMode || this.infiniteZOffset !== 0) {
      this.levelInfo = await buildLevelAsync(
        this.currentLevelData, 
        this.graphics.scene, 
        onProgress, 
        this.infiniteZOffset, 
        this.isInfiniteMode
      );
    } else {
      this.levelInfo = await buildLevelAsync(
        this.currentLevelData, 
        this.graphics.scene, 
        onProgress
      );
    }

    // Spawn low-poly city scenery flanking both sides of the track
    this.graphics.spawnCityScenery(this.levelInfo.trackLength, this.infiniteZOffset);

    // 3. Reset Physics ship state
    this.physics.reset(this.levelInfo.fuel, this.levelInfo.oxygen);

    // 4. Position ship at the first row that has ground tiles.
    const { spawnX, spawnY, spawnZ } = this.findSafeSpawnPosition();
    this.physics.position.set(spawnX, spawnY, spawnZ);
    this.physics.onGround = false;

    // 5. Update HUD headers & telemetry, then show HUD and hide overlays
    const packNameEl = document.getElementById('hud-pack-name');
    if (packNameEl) packNameEl.innerText = this.currentPack === 'standard' ? 'STANDARD PACK' : (this.currentPack === 'xmas' ? 'XMAS SPECIAL' : 'GENERATED PACK');
    const roadNames = this.currentPack === 'standard' ? [...this.standardRoadNames, ...this.xmasRoadNames] : (this.currentPack === 'xmas' ? this.xmasRoadNames : this.generatedRoadNames);
    const roadNameEl = document.getElementById('hud-road-name');
    if (roadNameEl) roadNameEl.innerText = roadNames[index] || `ROAD ${index}`;


    const gravityVal = this.currentLevelData.gravity ? ((this.currentLevelData.gravity - 3) * 100) : 500;
    const gravityTextEl = document.getElementById('hud-gravity-text');
    if (gravityTextEl) gravityTextEl.innerText = String(gravityVal).padStart(4, '0');

    if (this.bottomHudEnabled) {
      document.getElementById('hud').classList.remove('hidden');
    } else {
      document.getElementById('hud').classList.add('hidden');
    }
    this.gameState = 'playing';
    this.showScreen(''); // Hide all menus

    // Bot driving (attract mode / idle demo)
    this._botActive = !!opts.bot;
    this.autopilot.reset();

    // Ghost recording (this run) + playback (best saved run, if any)
    this.ghost = new Ghost();
    this.ghost.startRecording();
    this.ghostElapsed = 0;
    this._ghostSampleAccum = 0;
    this.loadedGhost = Ghost.load(this.currentPack, index);
    this.graphics.removeGhostMesh();
    if (this.loadedGhost && this.ghostEnabled) {
      this.graphics.createGhostMesh();
      this.graphics.setGhostVisible(true);
    }

    // Toggle Pause Trigger button visibility
    const btnInGamePause = document.getElementById('btn-in-game-pause');
    if (btnInGamePause) btnInGamePause.classList.remove('hidden');

    // Toggle Mobile Touch controls HUD visibility
    if (this.touchManager) {
      if (this.keyboard.touchControlsEnabled) {
        this.touchManager.show();
      } else {
        this.touchManager.hide();
      }
    }

    // 6. Trigger Continuous Sound Hum
    gameAudio.startEngine();

    this.lastTime = performance.now();

    if (this.collisionViewEnabled) {
      this.toggleSceneCollisionView(true);
    }
  }

  // Attract mode: picks a random level from the current pack and starts it bot-driven.
  // Reuses the same random-index pattern as the "start infinite" button.
  async _startBotRun() {
    let packLevels = getCachedPack(this.currentPack);
    if (!packLevels) {
      packLevels = await loadLevelPack(this.currentPack);
    }
    const randomIdx = (packLevels && packLevels.length > 0)
      ? Math.floor(Math.random() * packLevels.length)
      : 0;
    this.startLevel(randomIdx, { bot: true });
  }

  returnToMenu() {
    if (this.keyboard && typeof this.keyboard.resetKeys === 'function') {
      this.keyboard.resetKeys();
    }
    this.gameState = 'menu';
    document.getElementById('hud').classList.add('hidden');
    
    // Hide in-game trigger
    const btnInGamePause = document.getElementById('btn-in-game-pause');
    if (btnInGamePause) btnInGamePause.classList.add('hidden');

    gameAudio.stopEngine();
    this.showScreen('menu-screen');
  }

  pauseGame() {
    this.gameState = 'paused';
    gameAudio.stopEngine();
    
    const btnInGamePause = document.getElementById('btn-in-game-pause');
    if (btnInGamePause) btnInGamePause.classList.add('hidden');
    
    // Reset the pause screen's crossbar itemIndex to 0 (Resume) before showing it
    const pauseController = this.crossbarControllers['pause-screen'];
    if (pauseController) {
      pauseController.itemIndex = 0;
      pauseController._lastItemIndexByCategory = (pauseController.config.categories || []).map(() => 0);
      pauseController._updateLabels();
      pauseController.render(performance.now());
    }

    this.showScreen('pause-screen');
  }

  resumeGame() {
    this.gameState = 'playing';
    this.lastTime = performance.now();
    gameAudio.startEngine();

    const btnInGamePause = document.getElementById('btn-in-game-pause');
    if (btnInGamePause) btnInGamePause.classList.remove('hidden');
    
    this.showScreen(''); // Hide pause overlay
  }

  toggleSettingsMenu() {
    if (this.gameState === 'settings') {
      // Close settings menu and restore state
      if (this.preSettingsState === 'playing') {
        this.gameState = 'playing';
        gameAudio.startEngine();
        this.showScreen('');
      } else {
        this.gameState = this.preSettingsState;
        const screenId = this.preSettingsState === 'paused' ? 'pause-screen' : 'menu-screen';
        this.showScreen(screenId);
      }
    } else {
      // Open settings menu
      gameAudio.stopEngine();
      this.preSettingsState = this.gameState;
      this.gameState = 'settings';

      // Update Settings popup overlay controls visibility based on gameplay state
      const pausedActions = document.getElementById('settings-paused-actions');
      if (pausedActions) {
        if (this.preSettingsState === 'playing' || this.preSettingsState === 'paused') {
          pausedActions.classList.remove('hidden');
        } else {
          pausedActions.classList.add('hidden');
        }
      }
      
      this.showScreen('settings-screen');
    }
  }

  async triggerInfiniteLevelTransition() {
    if (this.infiniteLevelTransitioning) return;
    this.infiniteLevelTransitioning = true;
    this.physics.isTransitioning = true;

    // Save active level finishZ & roadMeshes to clean up later
    const oldFinishZ = this.levelInfo.finishZ;
    const oldMeshes = [...this.levelInfo.roadMeshes];

    // We have 3.75s of transition tube at maxSpeedNormal (32).
    // Midway through the tube (1.8s), load the next level ahead.
    setTimeout(async () => {
      try {
        // 1. Calculate next level index (choose a random level and prevent direct consecutive duplicates)
        const packLevels = getCachedPack(this.currentPack);
        let nextIdx = this.currentLevelIndex;
        if (packLevels && packLevels.length > 1) {
          while (nextIdx === this.currentLevelIndex) {
            nextIdx = Math.floor(Math.random() * packLevels.length);
          }
        } else {
          nextIdx = 0;
        }
        this.currentLevelIndex = nextIdx;
        this.currentLevelData = packLevels[nextIdx];
        disposeUnusedThemes(getActiveThemeIndex(this.currentLevelData));

        // Bind to window for physics tile checks
        window.currentLevelIndex = nextIdx;
        window.currentLevelData = this.currentLevelData;

        // 2. Set next level offset: start of next level starts exactly at end of autopilot tube
        // End of tube is oldFinishZ - 120.0
        this.infiniteZOffset = oldFinishZ - 120.0;

        // 3. Load next level geometry asynchronously
        const nextLevelInfo = await buildLevelAsync(
          this.currentLevelData,
          this.graphics.scene,
          null,
          this.infiniteZOffset,
          true
        );

        // 4. Update scene references and clean up old meshes
        this.levelInfo = nextLevelInfo;

        // Spawn city scenery flanking the new track length at the new offset
        this.graphics.spawnCityScenery(nextLevelInfo.trackLength, this.infiniteZOffset);

        if (this.collisionViewEnabled) {
          this.toggleSceneCollisionView(true);
        }

        // Clean up old meshes from the scene
        oldMeshes.forEach(mesh => {
          this.graphics.scene.remove(mesh);
          mesh.traverse((node) => {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach(m => m.dispose());
              } else {
                node.material.dispose();
              }
            }
          });
        });

        // 5. Replenish fuel/oxygen and update gravity/telemetry
        this.physics.fuel = nextLevelInfo.fuel * 50;
        this.physics.oxygen = nextLevelInfo.oxygen;

        const roadNames = this.currentPack === 'standard' ? [...this.standardRoadNames, ...this.xmasRoadNames] : (this.currentPack === 'xmas' ? this.xmasRoadNames : this.generatedRoadNames);
        const roadNameEl = document.getElementById('hud-road-name');
        if (roadNameEl) roadNameEl.innerText = roadNames[nextIdx] || `ROAD ${nextIdx}`;


        const gravityVal = this.currentLevelData.gravity ? ((this.currentLevelData.gravity - 3) * 100) : 500;
        const gravityTextEl = document.getElementById('hud-gravity-text');
        if (gravityTextEl) gravityTextEl.innerText = String(gravityVal).padStart(4, '0');

        // Trigger a beautiful transition/refill sound effect!
        gameAudio.playRefill();

      } catch (error) {
        console.error('Failed seamless level stitching transition:', error);
      }
    }, 1800);

    // End autopilot and return controls to player after 3.75s
    setTimeout(() => {
      // Find safe spawn point of the new level and snap ship to it so player doesn't freefall to death
      const { spawnX, spawnY, spawnZ } = this.findSafeSpawnPosition();
      this.physics.position.set(spawnX, spawnY, spawnZ);
      this.physics.velocity.set(0, 0, -this.physics.maxSpeedNormal); // Maintain forward speed
      this.physics.onGround = false;

      this.physics.isTransitioning = false;
      this.infiniteLevelTransitioning = false;
    }, 3750);
  }

  retryCurrentLevelOrGroup() {
    if (this.playStyle === 'flow' || this.playStyle === 'tower') {
      this.startGroup(this.currentWorldIndex);
    } else {
      this.startLevel(this.currentLevelIndex);
    }
  }

  animate(timestamp) {
    const dt = (timestamp - this.lastTime) / 1000.0;
    this.lastTime = timestamp;

    // FPS counter — accumulate frames over 0.5s windows to avoid jitter
    this._fpsFrameCount = (this._fpsFrameCount || 0) + 1;
    this._fpsTimeAccum = (this._fpsTimeAccum || 0) + dt;
    if (this._fpsTimeAccum >= 0.5) {
      const fps = Math.round(this._fpsFrameCount / this._fpsTimeAccum);
      const fpsEl = document.getElementById('fps-counter');
      if (fpsEl) {
        fpsEl.textContent = `${fps} FPS`;
        fpsEl.style.color = fps >= 55 ? '#00ffcc' : fps >= 30 ? '#ffaa00' : '#ff4444';
      }
      this._fpsFrameCount = 0;
      this._fpsTimeAccum = 0;
    }

    if (this._botActive && this.gameState === 'playing') {
      this.autopilot.update(dt, this.keyboard, this.physics, this.levelInfo);
    }

    if (this.keyboard && typeof this.keyboard.updateCombinedState === 'function') {
      this.keyboard.updateCombinedState();
    }

    if (this.keyboard && typeof this.keyboard.consumeTogglePause === 'function' && this.keyboard.consumeTogglePause()) {
      if (this.gameState === 'playing') {
        gameAudio.playClick();
        this.pauseGame();
      } else if (this.gameState === 'paused') {
        gameAudio.playClick();
        this.resumeGame();
      }
    }

    // Process gamepad menu navigation when not actively playing a level
    if (this.gameState !== 'playing' && this.keyboard && this.keyboard.gamepadConnected && !this.keyboard.currentlyMappingAction) {
      const gp = this.keyboard.gamepad;
      // gp.menu* booleans are edge-triggered (true for exactly one frame per
      // physical press), so screens ported to the XMB engine get a single
      // handleDirection()/confirm() call per edge here — there's no
      // continuous-hold signal from the gamepad poll to feed startHold()/
      // stopHold(), unlike the keyboard path in handleCrossbarKeyboard().
      const crossbar = this.getActiveCrossbarController();

      if (crossbar) {
        if (gp.menuDown) crossbar.handleDirection('vertical', 1);
        else if (gp.menuUp) crossbar.handleDirection('vertical', -1);
        else if (gp.menuLeft) crossbar.handleDirection('horizontal', -1);
        else if (gp.menuRight) crossbar.handleDirection('horizontal', 1);

        if (gp.menuSelect) crossbar.confirm();

        if (gp.menuCancel) {
          crossbar.cancel();
          this._cancelActiveScreen();
        }
      } else {
        if (gp.menuDown) {
          this.handleMenuKeyboard({ code: 'ArrowDown', preventDefault: () => {} });
        } else if (gp.menuUp) {
          this.handleMenuKeyboard({ code: 'ArrowUp', preventDefault: () => {} });
        } else if (gp.menuLeft) {
          this.handleMenuKeyboard({ code: 'ArrowLeft', preventDefault: () => {} });
        } else if (gp.menuRight) {
          this.handleMenuKeyboard({ code: 'ArrowRight', preventDefault: () => {} });
        }

        if (gp.menuSelect) {
          this.handleMenuKeyboard({ code: 'Enter', preventDefault: () => {} });
        }

        if (gp.menuCancel) {
          const activeScreen = document.querySelector('.overlay-screen.active');
          if (activeScreen) {
            const cancelButtons = {
              'settings-screen': 'btn-settings-close',
              'gamepad-config-screen': 'btn-gamepad-close',
              'level-screen': 'btn-level-back',
              'ship-picker-screen': 'btn-picker-back',
              'how-to-screen': 'btn-how-to-back',
              'death-screen': 'btn-death-menu',
              'success-screen': 'btn-success-menu',
              'pause-screen': 'btn-pause-resume'
            };

            const btnId = cancelButtons[activeScreen.id];
            if (btnId) {
              const btn = document.getElementById(btnId);
              if (btn) {
                gameAudio.playClick();
                btn.click();
              }
            }
          }
        }
      }
    }

    if (this.gameState === 'editor') {
      this.inGameEditor.update(dt);
      if (this.graphics.starField) {
        this.graphics.starField.rotation.y += 0.02 * dt;
      }
      this.graphics.render();
      this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
      return;
    }

    if (this.gameState === 'paused') {
      this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
      return;
    }

    if (this.gameState === 'playing' || this.gameState === 'death') {
      // --- Rewind Input Handling (Hold R / X to visually rewind) ---
      const rewindPressed = !!(this.keyboard && this.keyboard.rewind);

      if (this.gameState === 'death' && !this.isRewinding) {
        // Start rewinding on fresh press during death state
        if (rewindPressed && !this.rewindPressedLastFrame && this.rewindEnabled && this.rewindBudget > 0 && this.stateHistory.length > 0) {
          this.isRewinding = true;
          this.rewindHistoryIndex = this.stateHistory.length - 1;

          // Cancel any pending death screen timeout
          if (this.rewindTimeoutId !== null) {
            clearTimeout(this.rewindTimeoutId);
            this.rewindTimeoutId = null;
          }

          // Hide death screen elements, show rewind overlay
          const deathScreenEl = document.getElementById('death-screen');
          if (deathScreenEl) {
            deathScreenEl.classList.remove('active');
            deathScreenEl.classList.add('hidden');
          }
          const promptEl = document.getElementById('death-rewind-prompt');
          if (promptEl) promptEl.classList.add('hidden');

          // Show ship again and clear explosion
          if (this.graphics.shipMesh) this.graphics.shipMesh.visible = true;
          if (this.graphics.particles) {
            for (const p of this.graphics.particles) {
              this.graphics.scene.remove(p.mesh);
              if (p.mesh.geometry) p.mesh.geometry.dispose();
              if (p.mesh.material) p.mesh.material.dispose();
            }
            this.graphics.particles = [];
          }

          // Add rewind visual overlay
          this.rewindOverlay = document.createElement('div');
          this.rewindOverlay.className = 'rewind-active-overlay';
          document.body.appendChild(this.rewindOverlay);

          gameAudio.stopEngine();
        }
      }

      if (this.isRewinding) {
        if (rewindPressed && this.rewindHistoryIndex > 0) {
          // Step backwards through history (3 frames per tick for visible speed)
          const stepsPerFrame = 3;
          for (let s = 0; s < stepsPerFrame && this.rewindHistoryIndex > 0; s++) {
            this.rewindHistoryIndex--;
          }

          // Deduct from budget (hard mode)
          if (this.rewindBudget !== Infinity) {
            this.rewindBudget = Math.max(0, this.rewindBudget - dt);
          }

          // Apply the historical state visually (ship position only)
          const snap = this.stateHistory[this.rewindHistoryIndex];
          if (snap) {
            copyVector(this.physics.position, snap.position);
            copyVector(this.physics.velocity, snap.velocity);
            this.physics.onGround = snap.onGround;
            this.physics.groundHeight = snap.groundHeight;
          }

          // Update camera to follow rewinding ship
          this.graphics.update(this.physics, dt);

          // Force budget-depleted stop
          if (this.rewindBudget <= 0) {
            this._finishRewind();
          }
        } else if (!rewindPressed || this.rewindHistoryIndex <= 0) {
          // Released or reached start — resume gameplay
          this._finishRewind();
        }
      }

      this.rewindPressedLastFrame = rewindPressed;
      // --- End Rewind Input Handling ---

      if (this.gameState === 'playing') {
        if (this.keyboard && typeof this.keyboard.consumeCycleCamera === 'function' && this.keyboard.consumeCycleCamera()) {
          gameAudio.playClick();
          this.graphics.toggleCameraMode();
        }

        // 1. Advance Physics Engine (DT capped internally to prevent tunneling)
        this.physics.update(dt, this.keyboard, this.levelInfo);

        // Multi-level height transitions
        if (this.playStyle === 'flow' || this.playStyle === 'tower') {
          this.checkMultiLevelHeightTransitions();
        }

        // Check if player crossed/went through any checkpoints in generated levels (none in Tower Mode)
        if (this.playStyle !== 'tower' && this.levelInfo && this.levelInfo.checkpoints && this.levelInfo.checkpoints.length > 0) {
          const lastPassed = this.playStyle === 'flow' ? this.lastPassedCheckpointList[this.activeLevelIndex] : this.lastCheckpointPassed;
          const nextCheckpointIdx = lastPassed === null ? 0 : lastPassed + 1;
          if (nextCheckpointIdx < this.levelInfo.checkpoints.length) {
            const checkpoint = this.levelInfo.checkpoints[nextCheckpointIdx];
            // Since Z moves negatively as the ship drives forward, check if we crossed checkpoint.z
            if (this.physics.position.z <= checkpoint.z) {
              if (this.playStyle === 'flow') {
                this.lastPassedCheckpointList[this.activeLevelIndex] = nextCheckpointIdx;
              } else {
                this.lastCheckpointPassed = nextCheckpointIdx;
              }
              
              // Verify the ship actually went THROUGH the arch (X within [-9, 9], Y within [baseY - 0.5, baseY + 6.5])
              const passedX = this.physics.position.x >= -9.0 && this.physics.position.x <= 9.0;
              const passedY = this.physics.position.y >= checkpoint.baseY - 0.5 && this.physics.position.y <= checkpoint.baseY + 6.5;
              
              if (passedX && passedY) {
                const cpObj = {
                  index: nextCheckpointIdx,
                  fuel: this.physics.fuel,
                  oxygen: this.physics.oxygen,
                  score: this.physics.score || 0,
                  time: this.totalTime,
                  position: {
                    x: 0,
                    y: checkpoint.baseY + 0.3,
                    z: checkpoint.z - 8.0 // 8 units ahead of checkpoint on flat runway
                  }
                };

                if (this.playStyle === 'flow') {
                  this.activeCheckpointList[this.activeLevelIndex] = cpObj;
                  this.activeCheckpoint = cpObj;
                } else {
                  this.activeCheckpoint = cpObj;
                }
                
                // Play refill chime and trigger visual notification
                if (typeof gameAudio.playRefill === 'function') {
                  gameAudio.playRefill();
                }
                
                const banner = document.getElementById('checkpoint-notify');
                if (banner) {
                  banner.classList.add('active');
                  if (this._checkpointBannerTimeout) clearTimeout(this._checkpointBannerTimeout);
                  this._checkpointBannerTimeout = setTimeout(() => {
                    banner.classList.remove('active');
                  }, 2000);
                }
              }
            }
          }
        }

        // Record history snapshot for rewind mechanic (full level run, capped at 10k frames)
        if (this.stateHistory && !this.physics.isDead && !this.physics.isTransitioning && !this.isRewinding) {
          const currentTimestamp = typeof timestamp === 'number' ? timestamp : performance.now();
          this.stateHistory.push({
            timestamp: currentTimestamp,
            position: cloneVector(this.physics.position),
            velocity: cloneVector(this.physics.velocity),
            onGround: this.physics.onGround,
            groundHeight: this.physics.groundHeight,
            isRebounding: this.physics.isRebounding,
            reboundTimer: this.physics.reboundTimer,
            justRebounded: this.physics.justRebounded,
            fuel: this.physics.fuel,
            oxygen: this.physics.oxygen,
            health: this.physics.health,
            activeEffects: { ...this.physics.activeEffects },
            wallHits: this.wallHits,
            totalTime: this.totalTime,
            speedAccumulator: this.speedAccumulator,
            speedTicks: this.speedTicks
          });
          // Cap at 10,000 frames (~2.7 min at 60fps) to prevent memory issues
          if (this.stateHistory.length > 10000) {
            this.stateHistory.shift();
          }
        }

        // Accumulate real-time stats for scoring
        this.totalTime = (this.totalTime || 0.0) + dt;
        if (Math.abs(this.physics.velocity.z) > 0.1) {
          this.speedAccumulator = (this.speedAccumulator || 0.0) + Math.abs(this.physics.velocity.z);
          this.speedTicks = (this.speedTicks || 0) + 1;
        }

        // Ghost recording (throttled to ~10/sec) and playback
        this.ghostElapsed += dt;
        this._ghostSampleAccum += dt;
        if (this._ghostSampleAccum >= 0.1) {
          this._ghostSampleAccum = 0;
          if (this.ghost) this.ghost.sample(this.totalTime, this.physics.position);
        }
        if (this.loadedGhost && this.ghostEnabled && this.graphics.ghostMesh) {
          const ghostPos = Ghost.positionAt(this.loadedGhost.samples, this.ghostElapsed);
          if (ghostPos) this.graphics.ghostMesh.position.set(ghostPos.x, ghostPos.y, ghostPos.z);
        }

        // 2. Refresh HUD overlays
        this.updateHUD();
      }

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
          if (!this.physics.activeEffects.slippery) {
            gameAudio.playWallCollision();
          }
          this.wallScrapeSoundTimer = 0.22; // Throttle sound playback
          this.wallHits = (this.wallHits || 0) + 1; // Increment scrape count
        }
        this.physics.triggerWallCollisionAudio = false;
      }
      if (this.wallScrapeSoundTimer > 0) {
        this.wallScrapeSoundTimer -= dt;
      }

      if (this.physics.triggerLandingReboundAudio) {
        if (!this.physics.activeEffects.slippery) {
          gameAudio.playLandingRebound();
        }
        this.physics.triggerLandingReboundAudio = false;
      }

      if (this.physics.triggerJumpAudio) {
        gameAudio.playJump();
        this.physics.triggerJumpAudio = false;
      }

      // Gentle thruster puff whoosh sound when player initiates steering
      const isSteering = this.keyboard.left || this.keyboard.right;
      if (isSteering && !this.wasSteeringLastFrame) {
        if (!this.physics.activeEffects.slippery) {
          gameAudio.playSteer();
        }
      }
      this.wasSteeringLastFrame = isSteering;

      // 6. Check success condition (finish line crossing)
      if (!this.physics.isDead && this.physics.position.z <= this.levelInfo.finishZ + SHIP_LENGTH / 2) {
        if (this.playStyle === 'flow' || this.playStyle === 'tower') {
          this.handleMultiLevelFinishCross();
        } else if (this.isInfiniteMode) {
          this.triggerInfiniteLevelTransition();
        } else {
          this.handleSuccess();
        }
      }

      // 7. Check death condition
      if (this.physics.isDead) {
        this.handleDeath();
      }

      // 8. Render the frame to the screen
      this.graphics.render();

    } else {
      if (this.gameState === 'death') {
        this.graphics.update(this.physics, dt);
      }
      // Spin stars background slightly while in menus for dynamic feel
      if (this.graphics.starField) {
        this.graphics.starField.rotation.y += 0.02 * dt;
      }
      this.graphics.render();

      // Idle attract mode: start the bot after ~10s of no input on the menu.
      if (this.gameState === 'menu') {
        this._idleSeconds += dt;
        if (this._idleSeconds >= 10) {
          this._idleSeconds = 0;
          this._startBotRun();
        }
      }

      // Bot loop: after death/success while bot-driven, pause briefly then retry another level.
      if (this._botActive && (this.gameState === 'death' || this.gameState === 'success') && !this._botLoopTimeoutId) {
        this._botLoopTimeoutId = setTimeout(() => {
          this._botLoopTimeoutId = null;
          if (this._botActive) this._startBotRun();
        }, 2000);
      }
    }

    this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
  }

  updateHUD() {
    // Speed conversion (relative Z-speed to km/h)
    const speedKmh = Math.floor(Math.abs(this.physics.velocity.z) * 10);
    document.getElementById('hud-speed-text').innerText = String(speedKmh).padStart(3, '0');
    
    // Cap speed bar at 100% relative to absolute max of 600 km/h
    const speedPct = Math.min(100, (speedKmh / 600) * 100);
    
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

    // Fuel (Original DOS maps scale) / Hull
    const fuel = Math.ceil(this.physics.fuel);
    let hullPct = 100;
    if (this.physics.health !== undefined) {
      hullPct = Math.min(100, Math.max(0, this.physics.health));
      document.getElementById('hud-fuel-text').innerText = String(Math.ceil(hullPct)).padStart(3, '0') + '%';
    } else {
      hullPct = Math.min(100, (this.physics.fuel / (this.levelInfo.fuel * 50)) * 100);
      document.getElementById('hud-fuel-text').innerText = String(fuel).padStart(5, '0');
    }
    
    // SVG Fuel arc (semicircular length = 194.78)
    const fuelOffset = 194.78 - (hullPct / 100) * 194.78;
    const fuelArc = document.getElementById('gauge-fuel-arc');
    if (fuelArc) fuelArc.style.strokeDashoffset = fuelOffset;
    
    // Legacy support for unit tests
    const legacyFuelBar = document.getElementById('hud-fuel-bar');
    if (legacyFuelBar) legacyFuelBar.style.width = `${hullPct}%`;

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

    // Real-Time Running Score calculation
    let difficultyMult = 1.0;
    if (this.physics.difficulty === 'normal') difficultyMult = 1.5;
    else if (this.physics.difficulty === 'hard') difficultyMult = 2.0;
    else if (this.physics.difficulty === 'extreme') difficultyMult = 2.5;

    const absoluteZPos = -this.physics.position.z;
    const distanceScore = Math.floor(absoluteZPos * 100);
    const collisionPenalty = (this.wallHits || 0) * 800;
    const liveScore = Math.max(0, Math.floor(distanceScore * difficultyMult) - collisionPenalty);
    this.physics.score = liveScore;

    const scoreTextEl = document.getElementById('hud-score-text');
    if (scoreTextEl) {
      scoreTextEl.innerText = String(liveScore).padStart(6, '0');
    }

    // Update top-right level HUD
    const topRightLevelEl = document.getElementById('top-right-level-name');
    if (topRightLevelEl) {
      topRightLevelEl.innerText = this.currentLevelData ? (this.currentLevelData.name || `ROAD ${this.currentLevelIndex}`) : `ROAD ${this.currentLevelIndex}`;
    }
    const topRightScoreEl = document.getElementById('top-right-score-val');
    if (topRightScoreEl) {
      topRightScoreEl.innerText = String(liveScore).padStart(6, '0');
    }
  }

  handleDeath() {
    if (this.gameState === 'death') return;
    if (this.keyboard && typeof this.keyboard.resetKeys === 'function') {
      this.keyboard.resetKeys();
    }

    if (this.ghost) this.ghost.stopRecording();

    this.gameState = 'death';
    try {
      gameAudio.stopEngine();
    } catch (e) {
      console.warn("Failed to stop engine sound on death:", e);
    }
    try {
      gameAudio.playExplosion();
    } catch (e) {
      console.warn("Failed to play explosion sound on death:", e);
    }
    try {
      this.graphics.triggerExplosion(this.physics.position);
    } catch (e) {
      console.warn("Failed to trigger visual explosion on death:", e);
    }

    if (this.playStyle === 'flow' || this.playStyle === 'tower') {
      // Decrement lives in Tower mode
      if (this.playStyle === 'tower') {
        this.lives--;
        this.updateLivesHUD();
        
        if (this.lives <= 0) {
          setTimeout(() => {
            if (this.gameState !== 'death') return;
            const titleEl = document.getElementById('death-screen-title');
            if (titleEl) titleEl.innerText = "GAME OVER";
            this.showScreen('death-screen');
          }, 1500);
          return;
        }
      }

      // Auto-respawn after delay
      setTimeout(() => {
        try {
          if (this.gameState !== 'death') return;

          if (this.graphics.shipMesh) this.graphics.shipMesh.visible = true;
          this.clearExplosionParticles();

          let targetLevelIndex = this.activeLevelIndex;
          let respawnCheckpoint = null;

          if (this.playStyle === 'tower' && this.hardcoreModeEnabled) {
            targetLevelIndex = 0;
          } else {
            respawnCheckpoint = this.activeCheckpointList[this.activeLevelIndex];
          }

          this.activeLevelIndex = targetLevelIndex;
          this.physics.activeLevelIndex = targetLevelIndex;

          if (!this.groupLevelInfos) {
            throw new Error("groupLevelInfos is undefined");
          }
          this.levelInfo = this.groupLevelInfos[targetLevelIndex];
          this.currentLevelData = this.groupLevelsData[targetLevelIndex];
          window.currentLevelData = this.groupLevelsData[targetLevelIndex];
          window.currentLevelIndex = this.currentWorldIndex * 3 + targetLevelIndex;

          const H = 25.0;
          if (this.levelGroupA && this.levelGroupB && this.levelGroupC) {
            this.levelGroupA.position.y = ( ( (0 - targetLevelIndex + 1) % 3 + 3) % 3 - 1 ) * H;
            this.levelGroupB.position.y = ( ( (1 - targetLevelIndex + 1) % 3 + 3) % 3 - 1 ) * H;
            this.levelGroupC.position.y = ( ( (2 - targetLevelIndex + 1) % 3 + 3) % 3 - 1 ) * H;
          }

          if (respawnCheckpoint) {
            this.physics.position.set(
              respawnCheckpoint.position.x,
              respawnCheckpoint.position.y,
              respawnCheckpoint.position.z
            );
            this.physics.groundHeight = respawnCheckpoint.position.y - 0.3;
            this.physics.fuel = respawnCheckpoint.fuel;
            this.physics.oxygen = respawnCheckpoint.oxygen;
            this.physics.score = respawnCheckpoint.score;
            this.totalTime = respawnCheckpoint.time;
          } else {
            const { spawnX, spawnY, spawnZ } = this.findSafeSpawnPosition();
            this.physics.position.set(spawnX, spawnY, spawnZ);
            this.physics.groundHeight = spawnY - 0.3;
            this.physics.fuel = this.levelInfo ? this.levelInfo.fuel : 5000;
            this.physics.oxygen = this.levelInfo ? this.levelInfo.oxygen : 100;
            if (this.playStyle === 'tower' && targetLevelIndex === 0) {
              this.physics.score = 0;
              this.totalTime = 0;
            }
          }

          if (this.physics.health !== undefined) {
            this.physics.health = 100.0;
          }
          this.physics.onGround = false;
          this.physics.velocity.set(0, 0, 0);

          this.physics.activeEffects = {
            boost: false,
            superBoost: false,
            sticky: false,
            slippery: false,
            burning: false,
            highJump: false
          };

          this.physics.isDead = false;
          this.physics.deathReason = '';
          this.activeCheckpoint = respawnCheckpoint;

          gameAudio.startEngine();
          this.gameState = 'playing';
          this.showScreen('');
        } catch (err) {
          console.error("Error inside multi-level respawn handler:", err);
          // Safe recovery fallback to prevent softlock/freeze
          this.physics.isDead = false;
          this.physics.activeEffects = {
            boost: false,
            superBoost: false,
            sticky: false,
            slippery: false,
            burning: false,
            highJump: false
          };
          this.gameState = 'playing';
          this.showScreen('');
        }
      }, 1500);
      return;
    }

    // If checkpoint is active, perform auto-respawn after explosion delay
    if (this.activeCheckpoint) {
      setTimeout(() => {
        try {
          if (this.gameState !== 'death') return; // State changed (e.g. exited to menu)

          // Restore ship physics
          this.physics.position.set(
            this.activeCheckpoint.position.x,
            this.activeCheckpoint.position.y,
            this.activeCheckpoint.position.z
          );
          this.physics.onGround = true;
          this.physics.groundHeight = this.activeCheckpoint.position.y - 0.3;
          this.physics.velocity.set(0, 0, 0);

          // Restore resources & health
          this.physics.fuel = this.activeCheckpoint.fuel;
          this.physics.oxygen = this.activeCheckpoint.oxygen;
          if (this.physics.health !== undefined) {
            this.physics.health = 100.0;
          }

          // Restore score and elapsed time
          this.physics.score = this.activeCheckpoint.score;
          this.totalTime = this.activeCheckpoint.time;

          // Reset active effects
          this.physics.activeEffects = {
            boost: false,
            superBoost: false,
            sticky: false,
            slippery: false,
            burning: false,
            highJump: false
          };

          // Reset death states
          this.physics.isDead = false;
          this.physics.deathReason = '';

          // Make ship visible again and clear explosion particles
          if (this.graphics.shipMesh) this.graphics.shipMesh.visible = true;
          if (this.graphics.particles) {
            for (const p of this.graphics.particles) {
              this.graphics.scene.remove(p.mesh);
              if (p.mesh.geometry) p.mesh.geometry.dispose();
              if (p.mesh.material) p.mesh.material.dispose();
            }
            this.graphics.particles = [];
          }

          // Restart sound and resume gameplay
          gameAudio.startEngine();
          this.gameState = 'playing';
          this.showScreen(''); // Hide all screens/menus
          
          // Trim history to match checkpoint start
          if (this.stateHistory) {
            this.stateHistory = this.stateHistory.filter(snap => snap.timestamp <= this.activeCheckpoint.time * 1000);
          }
        } catch (err) {
          console.error("Error inside classic checkpoint respawn handler:", err);
          // Safe recovery fallback to prevent softlock/freeze
          this.physics.isDead = false;
          this.physics.activeEffects = {
            boost: false,
            superBoost: false,
            sticky: false,
            slippery: false,
            burning: false,
            highJump: false
          };
          this.gameState = 'playing';
          this.showScreen('');
        }
      }, 1500);
      return;
    }

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
    } else if (this.physics.deathReason === 'HULL FAILURE') {
      msg = "Your hull integrity dropped to 0%.";
    }

    const reasonEl = document.getElementById('death-reason');
    if (reasonEl) reasonEl.innerText = msg;

    // Check if rewind is available
    const canRewind = this.rewindEnabled && this.rewindBudget > 0 && this.stateHistory.length > 0;

    // Detect gamepad for prompt text
    const rewindKeyEl = document.getElementById('death-rewind-prompt');
    if (rewindKeyEl) {
      const keySpan = rewindKeyEl.querySelector('.rewind-key');
      if (keySpan) {
        keySpan.innerText = (this.keyboard && this.keyboard.gamepadConnected) ? 'X' : 'R';
      }
    }

    // Hide rewind prompt initially, hide depleted message
    const promptEl = document.getElementById('death-rewind-prompt');
    if (promptEl) promptEl.classList.add('hidden');
    const depletedEl = document.getElementById('death-rewind-depleted');
    if (depletedEl) depletedEl.classList.add('hidden');

    // Show death screen with "YOU DIED" immediately (title + reason, no buttons yet)
    const deathScreen = document.getElementById('death-screen');
    const deathButtons = deathScreen ? deathScreen.querySelector('.xmb-item-track') : null;
    if (deathButtons) deathButtons.style.display = 'none';

    // Reset the death screen's crossbar itemIndex to 0 (Try Again) before showing it
    const deathController = this.crossbarControllers['death-screen'];
    if (deathController) {
      deathController.itemIndex = 0;
      deathController._lastItemIndexByCategory = (deathController.config.categories || []).map(() => 0);
      deathController._updateLabels();
      deathController.render(performance.now());
    }

    this.showScreen('death-screen');

    if (canRewind) {
      // After 1 second, show the rewind prompt
      const promptTimeout = setTimeout(() => {
        if (this.gameState === 'death' && !this.isRewinding) {
          if (promptEl) promptEl.classList.remove('hidden');
        }
      }, 1000);

      // After 4 seconds total (3s window), if they haven't pressed rewind, show full death screen
      this.rewindTimeoutId = setTimeout(() => {
        this.rewindTimeoutId = null;
        if (this.gameState === 'death' && !this.isRewinding) {
          // Time expired — show retry/menu buttons
          if (promptEl) promptEl.classList.add('hidden');
          if (deathButtons) deathButtons.style.display = '';
        }
      }, 4000);
    } else {
      // No rewind available — show buttons after explosion admiration delay
      if (!canRewind && this.rewindEnabled && this.rewindBudget <= 0) {
        // Budget depleted — show depleted message
        if (depletedEl) depletedEl.classList.remove('hidden');
      }

      const delay = 2200;
      setTimeout(() => {
        if (this.gameState === 'death') {
          if (deathButtons) deathButtons.style.display = '';
        }
      }, delay);
    }
  }

  _finishRewind() {
    if (!this.isRewinding) return;

    // Apply the final snapshot state fully
    const snap = this.stateHistory[this.rewindHistoryIndex];
    if (snap) {
      copyVector(this.physics.position, snap.position);
      copyVector(this.physics.velocity, snap.velocity);
      this.physics.onGround = snap.onGround;
      this.physics.groundHeight = snap.groundHeight;
      this.physics.isRebounding = snap.isRebounding;
      this.physics.reboundTimer = snap.reboundTimer;
      this.physics.justRebounded = snap.justRebounded;

      // Grace resource boosts to prevent instant re-death loops
      this.physics.fuel = Math.max(snap.fuel, 500);
      this.physics.oxygen = Math.max(snap.oxygen, 15);
      if (snap.health !== undefined) {
        this.physics.health = Math.max(snap.health, 20.0);
      }

      this.physics.activeEffects = { ...snap.activeEffects };

      // Restore stats
      this.wallHits = snap.wallHits;
      this.totalTime = snap.totalTime;
      this.speedAccumulator = snap.speedAccumulator;
      this.speedTicks = snap.speedTicks;
    }

    // Trim history to the rewind point (discard future frames)
    this.stateHistory = this.stateHistory.slice(0, this.rewindHistoryIndex + 1);

    // Reset physics death state
    this.physics.isDead = false;
    this.physics.deathReason = '';

    // Ensure ship is visible
    if (this.graphics.shipMesh) this.graphics.shipMesh.visible = true;

    // Clear explosion particles
    if (this.graphics.particles) {
      for (const p of this.graphics.particles) {
        this.graphics.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
      this.graphics.particles = [];
    }

    // Remove rewind overlay
    if (this.rewindOverlay) {
      this.rewindOverlay.remove();
      this.rewindOverlay = null;
    }

    // Update rewind budget HUD
    const rewindText = document.getElementById('hud-rewind-text');
    if (rewindText) {
      rewindText.innerText = this.rewindBudget === Infinity ? '∞' : this.rewindBudget.toFixed(1) + 's';
      if (this.rewindBudget !== Infinity && this.rewindBudget <= 3.0) {
        rewindText.style.color = '#ff3366';
      } else {
        rewindText.style.color = '#00ffcc';
      }
    }

    // Resume gameplay
    this.isRewinding = false;
    this.rewindHistoryIndex = -1;
    this.gameState = 'playing';
    gameAudio.startEngine();
    this.lastTime = performance.now();
  }

  /** Shared by the legacy btn-success-next click listener and the success
   * screen's crossbar "Next Road" item — advances to the next level in the
   * current pack, or returns to the menu if this was the last level. */
  goToNextRoadOrMenu() {
    gameAudio.playClick();
    const packLevels = getCachedPack(this.currentPack);
    if (this.playStyle === 'flow' || this.playStyle === 'tower') {
      const nextWorldIdx = this.currentWorldIndex + 1;
      if (nextWorldIdx * 3 < packLevels.length) {
        this.startGroup(nextWorldIdx);
      } else {
        this.returnToMenu();
      }
    } else {
      const nextIdx = this.currentLevelIndex + 1;
      if (nextIdx < packLevels.length) {
        this.startLevel(nextIdx);
      } else {
        this.returnToMenu();
      }
    }
  }

  handleSuccess() {
    if (this.keyboard && typeof this.keyboard.resetKeys === 'function') {
      this.keyboard.resetKeys();
    }
    this.gameState = 'success';
    gameAudio.stopEngine();
    gameAudio.playWin();

    // 1. Calculate Score Statistics
    const avgSpeed = this.speedTicks > 0 ? (this.speedAccumulator / this.speedTicks) : 0.0;
    const avgSpeedKmh = Math.floor(avgSpeed * 10);
    const wallHits = this.wallHits || 0;
    const totalTime = this.totalTime || 0.0;

    if (this.ghost) {
      this.ghost.stopRecording();
      this.ghost.maybeSave(this.currentPack, this.currentLevelIndex, totalTime);
    }

    let difficultyMult = 1.0;
    if (this.physics.difficulty === 'normal') difficultyMult = 1.5;
    else if (this.physics.difficulty === 'hard') difficultyMult = 2.0;
    else if (this.physics.difficulty === 'extreme') difficultyMult = 2.5;

    const baseScore = 10000;
    const speedBonus = Math.floor(avgSpeedKmh * 150);
    
    const trackLen = this.levelInfo ? this.levelInfo.trackLength : 200.0;
    const targetTime = trackLen / 18.0;
    const timeBonus = Math.max(0, Math.floor((targetTime - totalTime) * 300));
    
    const penalty = wallHits * 800;
    const perfectBonus = wallHits === 0 ? 5000 : 0;

    const rawScore = Math.max(0, baseScore + speedBonus + timeBonus - penalty + perfectBonus);
    const finalScore = Math.floor(rawScore * difficultyMult);

    // 2. Render Score Breakdown elements in HTML
    const valTime = document.getElementById('score-val-time');
    if (valTime) valTime.innerText = totalTime.toFixed(2) + 's';
    
    const valSpeed = document.getElementById('score-val-speed');
    if (valSpeed) valSpeed.innerText = avgSpeedKmh + ' km/h';
    
    const valCollisions = document.getElementById('score-val-collisions');
    if (valCollisions) valCollisions.innerText = String(wallHits);
    
    const valSpeedBonus = document.getElementById('score-val-speed-bonus');
    if (valSpeedBonus) valSpeedBonus.innerText = '+' + speedBonus.toLocaleString();
    
    const valTimeBonus = document.getElementById('score-val-time-bonus');
    if (valTimeBonus) valTimeBonus.innerText = '+' + timeBonus.toLocaleString();
    
    const valPenalty = document.getElementById('score-val-penalty');
    if (valPenalty) valPenalty.innerText = '-' + penalty.toLocaleString();

    const rowPerfectBonus = document.getElementById('score-row-perfect-bonus');
    if (rowPerfectBonus) {
      rowPerfectBonus.style.display = wallHits === 0 ? 'flex' : 'none';
    }

    const valFinal = document.getElementById('score-val-final');
    if (valFinal) valFinal.innerText = String(finalScore).padStart(6, '0');

    // 3. Setup Initials Input Form
    const inputInitials = document.getElementById('input-score-initials');
    const submitBtn = document.getElementById('btn-score-submit');
    const inputBox = document.getElementById('leaderboard-input-box');

    const leaderboardKey = this.playStyle === 'classic'
      ? `skyroads_leaderboard_${this.currentPack}_${this.currentLevelIndex}`
      : `skyroads_leaderboard_${this.playStyle}_${this.currentPack}_${this.currentWorldIndex}`;
    
    // Defensive leaderboard list loader
    const getLeaderboardList = () => {
      try {
        const stored = localStorage.getItem(leaderboardKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse leaderboard records", e);
      }
      return [];
    };

    const list = getLeaderboardList();
    let isRecord = false;
    if (finalScore > 0) {
      if (list.length < 5) {
        isRecord = true;
      } else {
        const lowestRecord = list[list.length - 1];
        if (lowestRecord && typeof lowestRecord.score === 'number') {
          if (finalScore > lowestRecord.score) {
            isRecord = true;
          } else if (finalScore === lowestRecord.score && totalTime < lowestRecord.time) {
            isRecord = true;
          }
        }
      }
    }

    if (isRecord) {
      if (inputBox) inputBox.style.display = 'flex';
      if (inputInitials) {
        inputInitials.setAttribute('autofocus', 'true');
        inputInitials.value = localStorage.getItem('skyroads_saved_initials') || '';
        
        // Immediate focus attempt
        inputInitials.focus();
        inputInitials.select();
        
        // Multi-stage timeouts to combat CSS transitions and rendering updates
        setTimeout(() => {
          inputInitials.focus();
          inputInitials.select();
        }, 50);
        
        setTimeout(() => {
          inputInitials.focus();
          inputInitials.select();
        }, 150);
        
        setTimeout(() => {
          inputInitials.focus();
          inputInitials.select();
        }, 350);

        setTimeout(() => {
          inputInitials.focus();
          inputInitials.select();
        }, 600);
      }
    } else {
      if (inputBox) inputBox.style.display = 'none';
      if (inputInitials) {
        inputInitials.removeAttribute('autofocus');
      }
    }

    // Helper to render Leaderboard Table
    const renderLeaderboardTable = (activeEntry = null) => {
      const tbody = document.getElementById('leaderboard-table-body');
      if (!tbody) return;
      tbody.innerHTML = '';

      const leaderboardEntries = getLeaderboardList();

      if (leaderboardEntries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#8c8f99; padding:15px; font-size:0.58rem;">No records yet. Be the first!</td></tr>`;
        return;
      }

      leaderboardEntries.forEach((item, idx) => {
        const tr = document.createElement('tr');
        if (activeEntry && activeEntry.initials === item.initials && activeEntry.score === item.score && activeEntry.time === item.time) {
          tr.className = 'leaderboard-row-active';
        }
        
        tr.innerHTML = `
          <td style="padding: 4px 6px;">#${idx + 1}</td>
          <td style="padding: 4px 6px; font-weight:bold;">${item.initials}</td>
          <td style="padding: 4px 6px; text-align:right; color:#cfd3dd;">${this.formatTime(item.time)}</td>
          <td style="padding: 4px 6px; text-align:right; font-weight:bold; color: #00ffcc;">${item.score.toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });
    };

    // Render current leaderboard list before submission
    renderLeaderboardTable();

    // Bind Score Submit Action
    if (submitBtn) {
      // Re-create listener to avoid multiple click bindings
      const newSubmitBtn = submitBtn.cloneNode(true);
      submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);
      // Reset state from any previous submission
      newSubmitBtn.disabled = false;
      newSubmitBtn.style.opacity = '';
      newSubmitBtn.style.cursor = '';
      newSubmitBtn.innerText = 'SUBMIT';
      
      newSubmitBtn.addEventListener('click', () => {
        if (newSubmitBtn.disabled) return; // Guard against double-submit
        gameAudio.playClick();
        const initials = inputInitials.value.trim().toUpperCase();
        
        if (!initials || initials.length !== 3 || !/^[A-Z0-9]{3}$/.test(initials)) {
          alert("Please enter exactly 3 uppercase letters or numbers!");
          return;
        }

        // Disable submit button immediately to prevent multiple submissions
        newSubmitBtn.disabled = true;
        newSubmitBtn.style.opacity = '0.4';
        newSubmitBtn.style.cursor = 'default';
        newSubmitBtn.innerText = 'SUBMITTED ✓';

        // Save initials preference
        localStorage.setItem('skyroads_saved_initials', initials);

        // Add score record to leaderboard list
        const currentList = getLeaderboardList();
        
        const newRecord = {
          initials: initials,
          score: finalScore,
          time: totalTime,
          date: new Date().toLocaleDateString()
        };

        currentList.push(newRecord);
        // Sort descending by score, ascending by time (if scores are equal)
        currentList.sort((a, b) => b.score !== a.score ? b.score - a.score : a.time - b.time);
        
        // Keep top 5 only
        const top5 = currentList.slice(0, 5);
        localStorage.setItem(leaderboardKey, JSON.stringify(top5));

        // Save as Personal Best
        const bestScoreKey = this.playStyle === 'classic'
          ? `skyroads_best_score_${this.currentPack}_${this.currentLevelIndex}`
          : `skyroads_best_score_${this.playStyle}_${this.currentPack}_${this.currentWorldIndex}`;
        const previousBest = parseInt(localStorage.getItem(bestScoreKey) || '0', 10);
        if (finalScore > previousBest) {
          localStorage.setItem(bestScoreKey, String(finalScore));
        }

        // Hide submission form and refresh leaderboard list with active highlighting!
        if (inputBox) inputBox.style.display = 'none';
        renderLeaderboardTable(newRecord);

        // Move focus to NEXT ROAD button (first crossbar item) or BACK TO MENU if last road
        const nextBtn = document.getElementById('btn-success-next');
        if (nextBtn && !nextBtn.classList.contains('hidden')) {
          nextBtn.focus();
          const successController = this.crossbarControllers['success-screen'];
          if (successController) successController.itemIndex = 0;
        } else {
          const menuBtn = document.getElementById('btn-success-menu');
          if (menuBtn) {
            menuBtn.focus();
            const successController = this.crossbarControllers['success-screen'];
            if (successController) successController.itemIndex = 0;
          }
        }
      });
    }

    // Hide next button if it was the last road
    const packLevels = getCachedPack(this.currentPack);
    let isLastRoad = false;
    if (this.playStyle === 'flow' || this.playStyle === 'tower') {
      isLastRoad = (this.currentWorldIndex + 1) * 3 >= packLevels.length;
    } else {
      isLastRoad = this.currentLevelIndex + 1 >= packLevels.length;
    }
    if (isLastRoad) {
      document.getElementById('btn-success-next').classList.add('hidden');
    } else {
      document.getElementById('btn-success-next').classList.remove('hidden');
    }

    // Success screen: single-category vertical list, rebuilt fresh every time
    // since NEXT ROAD is conditionally present (last level of a pack omits it).
    const successItems = [];
    if (!isLastRoad) {
      successItems.push({ id: 'next', label: 'Next Road', kind: 'action', el: document.getElementById('btn-success-next'), onConfirm: () => this.goToNextRoadOrMenu() });
    }
    successItems.push({ id: 'menu', label: 'Back to Menu', kind: 'action', el: document.getElementById('btn-success-menu'), onConfirm: () => { gameAudio.playClick(); this.returnToMenu(); } });
    const successConfig = { categories: [{ id: 'success', label: 'ROAD COMPLETED', items: successItems }] };
    if (this.crossbarControllers['success-screen']) this.crossbarControllers['success-screen'].destroy();
    const successController = new CrossbarController(successConfig, {
      itemTrackEl: document.getElementById('success-xmb-item-track'),
      flatItems: true // success actions are a horizontal button row, not a column
    });
    successController._updateLabels();
    successController.render(performance.now());
    this.crossbarControllers['success-screen'] = successController;

    this.showScreen('success-screen');

    // Auto-focus next road or menu button if not a record
    if (!isRecord) {
      setTimeout(() => {
        const nextBtn = document.getElementById('btn-success-next');
        if (nextBtn && !isLastRoad) {
          nextBtn.focus();
          if (this.crossbarControllers['success-screen']) {
            this.crossbarControllers['success-screen'].itemIndex = 0;
            this.crossbarControllers['success-screen'].render(performance.now());
          }
        } else {
          const menuBtn = document.getElementById('btn-success-menu');
          if (menuBtn) {
            menuBtn.focus();
            if (this.crossbarControllers['success-screen']) {
              this.crossbarControllers['success-screen'].itemIndex = 0;
              this.crossbarControllers['success-screen'].render(performance.now());
            }
          }
        }
      }, 100);
    }
  }

  // ponytail: handleMenuKeyboard/handleShipPickerKeyboard/handleLevelSelectKeyboard/
  // highlightMenuButton are now dead — every menu screen has a CrossbarController,
  // so the keydown + gamepad dispatch always take the crossbar branch and never
  // fall through here. Kept as a gated safety net; delete once manual testing
  // confirms no screen ever lacks a controller.
  handleMenuKeyboard(e) {
    if (typeof document !== 'undefined' && document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' || 
         document.activeElement.tagName === 'SELECT')) {
      // Allow pressing Enter to submit score when focused on initials input
      if (e.code === 'Enter' && document.activeElement.id === 'input-score-initials') {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-score-submit');
        if (submitBtn) {
          submitBtn.click();
        }
      }
      return;
    }
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
    const textureOptions = Array.from(activeScreen.querySelectorAll('.texture-option'));
    const colorOptions = Array.from(activeScreen.querySelectorAll('.color-preset-option'));
    const colorPickerInput = document.getElementById('ship-color-picker');
    const backBtn = document.getElementById('btn-picker-back');
    const selectBtn = document.getElementById('btn-picker-select');
    
    // Combine all selectable buttons in order: models grid, then textures grid, then preset colors, custom picker, then buttons
    const buttons = [...modelOptions, ...textureOptions, ...colorOptions, colorPickerInput, backBtn, selectBtn].filter(el => el && !el.classList.contains('hidden') && el.style.display !== 'none');
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
        } else if (activeEl.classList.contains('texture-option')) {
          const skinName = activeEl.getAttribute('data-skin');
          this.selectTextureInPicker(skinName);
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
        } else if (activeEl.classList.contains('texture-option')) {
          const skinName = activeEl.getAttribute('data-skin');
          this.selectTextureInPicker(skinName);
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

  updateCollisionViewToggleBtn() {
    this._setToggleBtnState('btn-settings-collision-view', this.collisionViewEnabled, 'COLLISION VIEW');
  }

  toggleSceneCollisionView(enabled) {
    if (!this.graphics || !this.graphics.scene) return;
    
    this.collisionViewEnabled = enabled;
    localStorage.setItem('skyroads_collision_view', enabled);
    
    // 1. Toggle visibility of non-essential visual elements
    if (this.graphics.sceneryGroup) {
      this.graphics.sceneryGroup.visible = !enabled;
    }
    // Also toggle procedural background elements if they were active
    if (this.graphics.starField) this.graphics.starField.visible = !enabled;
    if (this.graphics.galaxyPoints) this.graphics.galaxyPoints.visible = !enabled;

    // 2. Traverse the scene and swap materials of meshes
    this.graphics.scene.traverse((node) => {
      if (!node.isMesh) return;
      
      // Skip helper/system meshes if any
      if (node.name === 'helper' || node.userData.isHelper) return;

      // Check if it's part of the ship mesh
      const isShip = this.graphics.shipMesh && (node === this.graphics.shipMesh || this.graphics.shipMesh.getObjectById(node.id));

      if (enabled) {
        // Hiding decals or decorative OBJ children
        const isDecal = (node.material && node.material.transparent === true && node.material.depthWrite === false) || (node.userData && node.userData.isAnimated);
        const isChildDecoration = node.parent && node.parent.isMesh; // e.g. obstacle loaded OBJ children

        if (isDecal || isChildDecoration) {
          if (!node.userData.hasOwnProperty('originalVisible')) {
            node.userData.originalVisible = node.visible;
          }
          node.visible = false;
          return;
        }

        // It is a solid geometry node (road, obstacle, ramp, tunnel, ship body)
        if (!node.userData.originalMaterial) {
          node.userData.originalMaterial = node.material;
        }

        let wireframeColor = 0x888888; // Default grey
        if (isShip) {
          wireframeColor = 0xff00ff; // magenta for player ship
        } else if (node.geometry) {
          const type = node.geometry.type;
          if (type === 'BoxGeometry') {
            const h = node.geometry.parameters.height;
            if (h === 0.45) {
              wireframeColor = 0x00ff00; // green for road
            } else if (h === 1.0) {
              wireframeColor = 0xffff00; // yellow for half obstacle
            } else if (h === 2.0 || h === 3.0) {
              wireframeColor = 0xff5500; // orange for full obstacle
            } else {
              wireframeColor = 0xff8800; // fallback orange
            }
          } else if (type === 'CylinderGeometry') {
            wireframeColor = 0x0000ff; // blue for tunnel
          } else {
            // BufferGeometry (ramps, finish line beams, custom structures)
            if (node.material && node.material.color && node.material.color.r === 0 && node.material.color.g > 0.9 && node.material.color.b > 0.9) {
              // Finish line
              wireframeColor = 0x00ffff;
            } else {
              // Ramp
              wireframeColor = 0x00ffff; // cyan for ramps
            }
          }
        }

        node.material = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: wireframeColor,
          side: THREE.DoubleSide
        });

      } else {
        // Reverting back to original state
        if (node.userData.hasOwnProperty('originalVisible')) {
          node.visible = node.userData.originalVisible;
          delete node.userData.originalVisible;
        } else {
          node.visible = true;
        }

        if (node.userData.originalMaterial) {
          node.material = node.userData.originalMaterial;
          delete node.userData.originalMaterial;
        }
      }
    });
  }

  setPlayStyle(style) {
    this.playStyle = style;
    this.physics.playStyle = style;
  }

  toggleTowerHardcore(forcedValue) {
    const nextState = forcedValue !== undefined ? forcedValue : !this.hardcoreModeEnabled;
    this.hardcoreModeEnabled = nextState;
    localStorage.setItem('skyroads_hardcore_mode', nextState ? 'true' : 'false');
    this.updateHardcoreToggleBtn();
    if (typeof gameAudio.playClick === 'function') gameAudio.playClick();
  }

  updateHardcoreToggleBtn() {
    const btn = document.getElementById('btn-settings-hardcore');
    if (btn) {
      btn.innerText = `HARDCORE MODE: ${this.hardcoreModeEnabled ? 'ON' : 'OFF'}`;
      btn.classList.toggle('btn-danger', this.hardcoreModeEnabled);
      btn.classList.toggle('btn-info', !this.hardcoreModeEnabled);
    }
  }

  updateLivesHUD() {
    const valEl = document.getElementById('hud-lives-val');
    if (valEl) {
      valEl.innerText = '🚀'.repeat(Math.max(0, this.lives));
    }
  }

  updateGatesHUD() {
    ['a', 'b', 'c'].forEach((lvlLetter, idx) => {
      const el = document.getElementById(`gate-light-${lvlLetter}`);
      if (el) {
        el.classList.toggle('active', !!this.clearedGates[idx]);
      }
    });
  }

  async startGroup(worldIdx) {
    this.currentWorldIndex = worldIdx;
    this.activeLevelIndex = 0;
    this.physics.activeLevelIndex = 0;

    const packLevels = getCachedPack(this.currentPack);
    const lvlA = JSON.parse(JSON.stringify(packLevels[worldIdx * 3]));
    const lvlB = JSON.parse(JSON.stringify(packLevels[worldIdx * 3 + 1]));
    const lvlC = JSON.parse(JSON.stringify(packLevels[worldIdx * 3 + 2]));

    const maxLen = Math.max(lvlA.rows.length, lvlB.rows.length, lvlC.rows.length);
    [lvlA, lvlB, lvlC].forEach(lvl => {
      const diff = maxLen - lvl.rows.length;
      if (diff > 0) {
        const roadColor = lvl.roadColor || 1;
        for (let i = 0; i < diff; i++) {
          const row = Array.from({ length: 7 }, (_, c) => {
            if (c >= 1 && c <= 5) {
              return {
                top_color: 0,
                bottom_color: roadColor,
                full: false,
                half: false,
                tunnel: false,
                low3: 1,
                val: 0
              };
            }
            return null;
          });
          lvl.rows.push(row);
        }
      }
    });

    if (this.playStyle === 'tower') {
      [lvlA, lvlB].forEach((lvl) => {
        let padsPlaced = 0;
        if (lvl.checkpoints) {
          lvl.checkpoints.forEach(cp => {
            if (padsPlaced < 2 && lvl.rows[cp.row] && lvl.rows[cp.row][3]) {
              lvl.rows[cp.row][3].isSuperJump = true;
              padsPlaced++;
            }
          });
        }
        for (let r = 20; r < lvl.rows.length - 20 && padsPlaced < 2; r++) {
          const row = lvl.rows[r];
          if (row && row[3] && row[3].top_color === 0 && !row[3].ramp && !row[3].tunnel && !row[3].full && !row[3].half) {
            row[3].isSuperJump = true;
            padsPlaced++;
          }
        }
      });
    }

    this.groupLevelsData = [lvlA, lvlB, lvlC];

    this.gameState = 'loading';
    this.showScreen('loading-screen');
    document.getElementById('loading-progress-bar').style.width = '0%';

    this.graphics.clearLevel();

    await new Promise((resolve) => {
      this.graphics.loadLevelSceneryModels(worldIdx * 3, resolve);
    });

    const activeThemeIdxs = [
      getActiveThemeIndex(lvlA),
      getActiveThemeIndex(lvlB),
      getActiveThemeIndex(lvlC)
    ];
    disposeUnusedThemes(activeThemeIdxs);

    this.clearAllLevelGeometry();

    this.levelGroupA = new THREE.Group();
    this.levelGroupB = new THREE.Group();
    this.levelGroupC = new THREE.Group();
    this.graphics.scene.add(this.levelGroupA);
    this.graphics.scene.add(this.levelGroupB);
    this.graphics.scene.add(this.levelGroupC);

    this.levelGroupA.position.y = 0.0;
    this.levelGroupB.position.y = 25.0;
    this.levelGroupC.position.y = -25.0;

    const onProgress = (percent) => {
      document.getElementById('loading-progress-bar').style.width = `${percent}%`;
    };

    document.getElementById('loading-status').innerText = 'Building Level A...';
    this.infoA = await buildLevelAsync(lvlA, this.levelGroupA, onProgress);

    document.getElementById('loading-status').innerText = 'Building Level B...';
    this.infoB = await buildLevelAsync(lvlB, this.levelGroupB, onProgress);

    document.getElementById('loading-status').innerText = 'Building Level C...';
    this.infoC = await buildLevelAsync(lvlC, this.levelGroupC, onProgress);

    this.groupLevelInfos = [this.infoA, this.infoB, this.infoC];
    this.levelInfo = this.infoA;

    this.currentLevelData = lvlA;
    window.currentLevelData = lvlA;
    window.currentGamePack = this.currentPack;
    window.currentLevelIndex = worldIdx * 3;

    this.graphics.spawnCityScenery(this.levelInfo.trackLength);

    // Tunnel-ceiling lighting for stacked decks: light the underside of any deck
    // that can have the player beneath it. Deck B (top) sits over A; deck A (mid)
    // sits over C. The bottom deck C is never ridden under, so it gets none.
    // Tinted per deck so the roof overhead reads distinctly from the deck you're on.
    buildDeckCeilingLight(this.levelGroupB, this.infoB.trackLength, { color: 0x3fd0ff });
    buildDeckCeilingLight(this.levelGroupA, this.infoA.trackLength, { color: 0xff4fb0 });

    // Connecting pillars enclose each deck-pair into a tunnel shell. Parented to
    // the lower deck (the one you ride), rising the 25-unit gap to the roof above,
    // tinted to match that roof's ceiling light: A rises to B (cyan), C rises to A (magenta).
    buildDeckPillars(this.levelGroupA, this.infoA.trackLength, { color: 0x3fd0ff });
    buildDeckPillars(this.levelGroupC, this.infoC.trackLength, { color: 0xff4fb0 });

    this.physics.playStyle = this.playStyle;
    this.physics.activeLevelIndex = 0;

    if (this.playStyle === 'tower') {
      this.lives = 3;
      this.updateLivesHUD();
    }

    this.physics.reset(this.levelInfo.fuel, this.levelInfo.oxygen);

    const { spawnX, spawnY, spawnZ } = this.findSafeSpawnPosition();
    this.physics.position.set(spawnX, spawnY, spawnZ);
    this.physics.groundHeight = spawnY - 0.3;
    this.physics.onGround = false;

    this.clearedGates = [false, false, false];
    this.lastPassedCheckpointList = [null, null, null];
    this.activeCheckpointList = [null, null, null];
    this.activeCheckpoint = null;
    this.lastCheckpointPassed = null;
    this.clearSequence = [];

    this.totalTime = 0.0;
    this.speedAccumulator = 0.0;
    this.speedTicks = 0;
    this.wallHits = 0;

    const packNameEl = document.getElementById('hud-pack-name');
    if (packNameEl) {
      packNameEl.innerText = `${this.currentPack.toUpperCase()} (${this.playStyle.toUpperCase()})`;
    }
    const roadNameEl = document.getElementById('hud-road-name');
    if (roadNameEl) {
      roadNameEl.innerText = `WORLD ${worldIdx + 1}`;
    }

    const gravityVal = this.currentLevelData.gravity ? ((this.currentLevelData.gravity - 3) * 100) : 500;
    const gravityTextEl = document.getElementById('hud-gravity-text');
    if (gravityTextEl) gravityTextEl.innerText = String(gravityVal).padStart(4, '0');

    // Show Run Stats box and correct rows
    const multilevelBox = document.getElementById('hud-multilevel-box');
    if (multilevelBox) {
      multilevelBox.classList.remove('hidden');
      const livesRow = document.getElementById('hud-lives-row');
      const gatesRow = document.getElementById('hud-gates-row');
      if (livesRow) livesRow.classList.toggle('hidden', this.playStyle !== 'tower');
      if (gatesRow) gatesRow.classList.toggle('hidden', this.playStyle !== 'flow');
      this.updateGatesHUD();
    }

    if (this.bottomHudEnabled) {
      document.getElementById('hud').classList.remove('hidden');
    } else {
      document.getElementById('hud').classList.add('hidden');
    }

    this.gameState = 'playing';
    this.showScreen('');
  }

  checkMultiLevelHeightTransitions() {
    const H = 25.0;
    const wrapThreshold = this.physics.deathY !== undefined ? this.physics.deathY : -4.0;
    if (this.physics.position.y < wrapThreshold) {
      if (this.playStyle === 'flow') {
        let nextIdx = (this.activeLevelIndex - 1 + 3) % 3;
        
        this.physics.position.y += H;
        if (this.physics.groundHeight !== undefined) this.physics.groundHeight += H;
        this.physics.velocity.y = -3.0; // Dampen fall velocity on transition
        
        this.activeLevelIndex = nextIdx;
        this.physics.activeLevelIndex = nextIdx;
        this.levelInfo = this.groupLevelInfos[nextIdx];
        this.currentLevelData = this.groupLevelsData[nextIdx];
        window.currentLevelData = this.groupLevelsData[nextIdx];
        window.currentLevelIndex = this.currentWorldIndex * 3 + nextIdx;
        
        this.levelGroupA.position.y = ( ( (0 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        this.levelGroupB.position.y = ( ( (1 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        this.levelGroupC.position.y = ( ( (2 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        
        this.activeCheckpoint = this.activeCheckpointList[nextIdx];
        this.lastCheckpointPassed = this.lastPassedCheckpointList[nextIdx];

        if (typeof gameAudio.playClick === 'function') gameAudio.playClick();
      } else if (this.playStyle === 'tower') {
        if (this.activeLevelIndex > 0) {
          let nextIdx = this.activeLevelIndex - 1;
          
          this.physics.position.y += H;
          if (this.physics.groundHeight !== undefined) this.physics.groundHeight += H;
          this.physics.velocity.y = -3.0; // Dampen fall velocity on transition
          
          this.activeLevelIndex = nextIdx;
          this.physics.activeLevelIndex = nextIdx;
          this.levelInfo = this.groupLevelInfos[nextIdx];
          this.currentLevelData = this.groupLevelsData[nextIdx];
          window.currentLevelData = this.groupLevelsData[nextIdx];
          window.currentLevelIndex = this.currentWorldIndex * 3 + nextIdx;
          
          this.levelGroupA.position.y = ( ( (0 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
          this.levelGroupB.position.y = ( ( (1 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
          this.levelGroupC.position.y = ( ( (2 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
          
          if (typeof gameAudio.playClick === 'function') gameAudio.playClick();
        }
      }
    } else if (this.playStyle === 'tower' && this.physics.position.y > H / 2) {
      if (this.activeLevelIndex < 2) {
        let nextIdx = this.activeLevelIndex + 1;
        
        this.physics.position.y -= H;
        if (this.physics.groundHeight !== undefined) this.physics.groundHeight -= H;
        
        this.activeLevelIndex = nextIdx;
        this.physics.activeLevelIndex = nextIdx;
        this.levelInfo = this.groupLevelInfos[nextIdx];
        this.currentLevelData = this.groupLevelsData[nextIdx];
        window.currentLevelData = this.groupLevelsData[nextIdx];
        window.currentLevelIndex = this.currentWorldIndex * 3 + nextIdx;
        
        this.levelGroupA.position.y = ( ( (0 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        this.levelGroupB.position.y = ( ( (1 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        this.levelGroupC.position.y = ( ( (2 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
        
        if (typeof gameAudio.playCheckpoint === 'function') gameAudio.playCheckpoint();
        this.showTransitionNotification(nextIdx);
      }
    }
  }

  handleMultiLevelFinishCross() {
    if (this.playStyle === 'flow') {
      this.clearedGates[this.activeLevelIndex] = true;
      this.updateGatesHUD();

      const allCleared = this.clearedGates.every(g => g === true);
      if (allCleared) {
        let bonus = 0;
        if (this.wallHits === 0) {
          bonus += 5000;
          this.showMessage("FLAWLESS BONUS: +5000!");
        }
        if (this.clearSequence && this.clearSequence.join(',') === '0,1,2') {
          bonus += 3000;
          this.showMessage("ORDER BONUS: +3000!");
        }
        this.physics.score = (this.physics.score || 0) + bonus;
        
        this.handleSuccess();
      } else {
        let nextIdx = (this.activeLevelIndex + 1) % 3;
        while (this.clearedGates[nextIdx]) {
          nextIdx = (nextIdx + 1) % 3;
        }
        this.clearSequence = this.clearSequence || [];
        this.clearSequence.push(this.activeLevelIndex);
        
        this.transitionToLevelStart(nextIdx);
      }
    } else if (this.playStyle === 'tower') {
      if (this.activeLevelIndex === 2) {
        this.handleSuccess();
      } else {
        const nextIdx = this.activeLevelIndex + 1;
        this.transitionToLevelStart(nextIdx);
      }
    }
  }

  transitionToLevelStart(nextIdx) {
    if (typeof gameAudio.playCheckpoint === 'function') gameAudio.playCheckpoint();

    this.activeLevelIndex = nextIdx;
    this.physics.activeLevelIndex = nextIdx;
    this.levelInfo = this.groupLevelInfos[nextIdx];
    this.currentLevelData = this.groupLevelsData[nextIdx];
    window.currentLevelData = this.groupLevelsData[nextIdx];
    window.currentLevelIndex = this.currentWorldIndex * 3 + nextIdx;

    const H = 25.0;
    this.levelGroupA.position.y = ( ( (0 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
    this.levelGroupB.position.y = ( ( (1 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;
    this.levelGroupC.position.y = ( ( (2 - nextIdx + 1) % 3 + 3) % 3 - 1 ) * H;

    const { spawnX, spawnY, spawnZ } = this.findSafeSpawnPosition();
    this.physics.position.set(spawnX, spawnY, spawnZ);
    this.physics.groundHeight = spawnY - 0.3;
    this.physics.velocity.set(0, 0, this.physics.velocity.z);
    
    this.physics.fuel = Math.min(this.levelInfo.fuel, this.physics.fuel + 100.0);
    this.physics.oxygen = this.levelInfo.oxygen;
    this.physics.onGround = false;

    this.showTransitionNotification(nextIdx);
  }

  showTransitionNotification(nextIdx) {
    const notifyEl = document.getElementById('checkpoint-notify');
    if (notifyEl) {
      const levelNames = ['A', 'B', 'C'];
      notifyEl.querySelector('.checkpoint-text').innerText = `TRANSITION TO LEVEL ${levelNames[nextIdx]}!`;
      notifyEl.classList.add('active');
      setTimeout(() => {
        notifyEl.classList.remove('active');
      }, 2000);
    }
  }

  showMessage(msg) {
    const notifyEl = document.getElementById('checkpoint-notify');
    if (notifyEl) {
      notifyEl.querySelector('.checkpoint-text').innerText = msg;
      notifyEl.classList.add('active');
      setTimeout(() => {
        notifyEl.classList.remove('active');
      }, 2500);
    }
  }

  clearExplosionParticles() {
    if (this.graphics.particles) {
      for (const p of this.graphics.particles) {
        this.graphics.scene.remove(p.mesh);
        if (p.mesh.geometry) p.mesh.geometry.dispose();
        if (p.mesh.material) p.mesh.material.dispose();
      }
      this.graphics.particles = [];
    }
  }
}

// Instantiate and start the application on load
window.addEventListener('DOMContentLoaded', async () => {
  // Attempt to fetch fresh defaults from disk at runtime to bypass Vite's ESM cache
  if (typeof fetch === 'function') {
    try {
      const response = await fetch('/api/get-settings');
      if (response.ok) {
        const defaults = await response.json();
        for (const [key, value] of Object.entries(defaults)) {
          const valStr = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, valStr);
          
          if (key.startsWith('skyroads_physics_preset_baseline_')) {
            const activeKey = key.replace('_baseline_', '_');
            localStorage.setItem(activeKey, valStr);
          }
        }
      }
    } catch (e) {
      // Failed to fetch - fall back to the statically-seeded defaults in userSettings.js
    }
  }

  const manager = new GameManager();
  manager.init();
  window.gameManagerInstance = manager;
  initLayoutDebugPanel();
});
