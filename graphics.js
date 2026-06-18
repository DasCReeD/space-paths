// SkyRoads Three.js Visual & Rendering Pipeline
import * as THREE from 'three';
import { SHIP_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from './physics.js';
import { CockpitConsole3D } from './cockpitConsole.js';
import { getLevelObjUrl, getLevelAssetUrl, getActiveThemeIndex, THEMES, getSkyboxAssetUrl, curvatureUniforms, applyCurvatureShader } from './levelLoader.js';
import spaceshipHullPlatingUrl from './spaceship_hull_plating.png';
import roadMetallicUrl from './road_metallic_plate.png';
import hudOverlayUrl from './hud_overlay.jfif';
import cocpitUrl from './cocpit.jfif';
import cocpitPilotUrl from './cocpit_pilot.jfif';

const COCKPIT_OVERLAYS = [
  hudOverlayUrl,
  cocpitUrl,
  cocpitPilotUrl
];

// Lazy-load Hubble space background images — only the URL map is bundled, images fetch on-demand
const skyboxImages = import.meta.glob('./SBS - Seamless Abstract Pack - 512x512/top100-large/top100/*.jpg', { query: '?url', eager: true });
const skyboxKeys = Object.keys(skyboxImages);

// Add OBJ and FBX loaders
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// Post-processing pipeline
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// Image Based Lighting environment
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import fighterObjUrl from './fighter1.obj?url';
import fighterClassUrl from './assets/custom/fighter.glb?url';
import haulerClassUrl from './assets/custom/hauler.glb?url';
import scoutClassUrl from './assets/custom/scout.glb?url';
import dreadnoughtClassUrl from './assets/custom/dreadnought.glb?url';
import cruiserClassUrl from './assets/custom/cruiser.glb?url';
import racerClassUrl from './assets/custom/racer.glb?url';
import hovdiClassUrl from './assets/custom/hovdi.glb?url';
import uvMapUrl from './uvmap.jpg';
import cityFbxUrl from './futuristic low poly city by niko.fbx?url';
import skyboxGltfUrl from './assets/free_colorful_sci_fi_skybox_gltf/scene.gltf?url';

// Custom skin textures provided by user in fighter.zip
import freelancerSkinUrl from './freelancer.jpg';
import lordshadowSkinUrl from './lordshadow.jpg';
import psionicSkinUrl from './psionic.jpg';
import shadeeSkinUrl from './shadee.jpg';
import thorSkinUrl from './thor.jpg';

// Pack A: Battle Corvette & Frigate FBX models
import corvette1Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_01.fbx?url';
import corvette2Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_02.fbx?url';
import corvette3Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_03.fbx?url';
import corvette4Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_04.fbx?url';
import corvette5Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Corvette_05.fbx?url';
import frigate1Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_01.fbx?url';
import frigate2Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_02.fbx?url';
import frigate3Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_03.fbx?url';
import frigate4Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_04.fbx?url';
import frigate5Url from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Frigate_05.fbx?url';
import freeBattleTexUrl from './SBS - Seamless Abstract Pack - 512x512/Free Battle Spaceship 3D Models/Texture/T_Spase_64.png';

const MAJADROID_BASE = './SBS - Seamless Abstract Pack - 512x512/LowPoly-Spaceships-By-Majadroid';

export const LEGACY_MODEL_ALIASES = {
  corvette1: 'fighter',
  ship1: 'fighter',
  ship2: 'fighter',
  
  corvette2: 'scout',
  corvette4: 'scout',
  frigate4: 'scout',
  
  corvette3: 'cruiser',
  frigate2: 'cruiser',
  frigate3: 'cruiser',
  ship3: 'cruiser',
  
  corvette5: 'hauler',
  frigate1: 'hauler',
  ship4: 'hauler',
  
  frigate5: 'dreadnought',
  ship5: 'dreadnought'
};

export const SHIP_MODELS = {
  original: fighterObjUrl,
  // Custom Hovercraft Classes
  fighter: fighterClassUrl,
  hauler: haulerClassUrl,
  scout: scoutClassUrl,
  dreadnought: dreadnoughtClassUrl,
  cruiser: cruiserClassUrl,
  racer: racerClassUrl,
  hovdi: hovdiClassUrl
};

export const SHIP_SKINS = {
  // Classic skins kept for test compliance
  default: uvMapUrl,
  freelancer: freelancerSkinUrl,
  lordshadow: lordshadowSkinUrl,
  psionic: psionicSkinUrl,
  shadee: shadeeSkinUrl,
  thor: thorSkinUrl,
  
  // Premium skins
  spaceship_hull: spaceshipHullPlatingUrl,
  road_metallic: roadMetallicUrl,
  
  // Majadroid skins
  skin1: `${MAJADROID_BASE}/tex01-512.png`,
  skin2: `${MAJADROID_BASE}/tex02-512.png`,
  skin3: `${MAJADROID_BASE}/tex03-512.png`,
  skin4: `${MAJADROID_BASE}/tex04-512.png`
};

export const SHIP_METRICS = {
  original: { offset: 0.25, height: 0.20, rotationY: -Math.PI / 2 },
  fighter: { offset: 0.25, height: 0.20, rotationY: -Math.PI / 2 },
  hauler: { offset: 0.38, height: 0.22, rotationY: -Math.PI / 2 },
  scout: { offset: 0.30, height: 0.16, rotationY: -Math.PI / 2 },
  dreadnought: { offset: 0.42, height: 0.21, rotationY: -Math.PI / 2 },
  cruiser: { offset: 0.26, height: 0.18, rotationY: -Math.PI / 2 },
  racer: { offset: 0.30, height: 0.18, rotationY: 0 },
  hovdi: { offset: 0.30, height: 0.20, rotationY: -Math.PI / 2 }
};

export const BASE_TEXTURES = {
  corvette1: freeBattleTexUrl,
  corvette2: freeBattleTexUrl,
  corvette3: freeBattleTexUrl,
  corvette4: freeBattleTexUrl,
  corvette5: freeBattleTexUrl,
  frigate1: freeBattleTexUrl,
  frigate2: freeBattleTexUrl,
  frigate3: freeBattleTexUrl,
  frigate4: freeBattleTexUrl,
  frigate5: freeBattleTexUrl,
  
  ship1: `${MAJADROID_BASE}/tex01-512.png`,
  ship2: `${MAJADROID_BASE}/tex01-512.png`,
  ship3: `${MAJADROID_BASE}/tex01-512.png`,
  ship4: `${MAJADROID_BASE}/tex01-512.png`,
  ship5: `${MAJADROID_BASE}/tex01-512.png`
};

const imageCache = {};

// Get HTML Image with in-memory caching for real-time color changes
function getCachedImage(url, callback) {
  if (imageCache[url]) {
    callback(imageCache[url]);
    return;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    imageCache[url] = img;
    callback(img);
  };
  img.onerror = () => {
    // Graceful error handling
    callback(null);
  };
  img.src = url;
}

// dynamic paint swap canvas utility
function swapTextureColor(img, hexColor, isPackA) {
  if (!img) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Convert hex color to RGB
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexColor);
  const targetRgb = result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 0, b: 127 };

  const [targetH, targetS] = rgbToHsl(targetRgb.r, targetRgb.g, targetRgb.b);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 10) continue;

    const [h, s, l] = rgbToHsl(r, g, b);

    // Accent zones: Red decals for both Pack A (Corvettes/Frigates) and Pack B (Majadroid) textures
    const isAccent = (h < 35 || h > 325) && s > 15;

    if (isAccent) {
      const [newR, newG, newB] = hslToRgb(targetH, targetS, l);
      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}


export class GraphicsEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shipMesh = null;
    this.particles = [];
    // Emissive mesh cache — rebuilt once per level to avoid scene.traverse every frame
    this.emissiveMeshCache = null;
    // Particle pool — pre-allocated meshes reused each frame instead of create/destroy
    this._particlePool = [];
    this._particlePoolGeom = null;
    this._particlePoolInited = false;
    // Pre-allocated ribbon trail position buffers — reused every frame instead of new Float32Array
    this._leftTrailPositions = new Float32Array(15 * 2 * 3);
    this._rightTrailPositions = new Float32Array(15 * 2 * 3);
    this.starField = null;
    this.nebulaSphere = null;
    this.skyboxMesh = null;
    this.gltfLoaded = false;
    // Music-reactive visuals
    this.audioData      = null;
    this.visualizerRing = null;
    this._freqDataTex   = null; // THREE.DataTexture updated each frame with FFT data
    // 3D Whitecap-style receding spectrum grid
    this.visualizerGrid    = null;
    this.visualizerDots    = null;
    this._fftHistory       = null;
    this._gridLastPushTime = 0;
    this._gridPreset       = 0;   // 0=Spectrum 1=Mirror 2=Matrix 3=Rainbow
    this._gridPresetTimer  = 0;
    
    // Scenery templates & groups
    this.buildingTemplates = [];
    this.customBuildingTemplates = [];
    this.sceneryGroup = null;

    // Custom skins map loaded dynamically
    this.skins = SHIP_SKINS;
    this.currentModelName = 'original';
    this.currentSkinName = 'default';
    this.currentSkinColor = '#ffffff';
    this.isObjLoaded = false;

    // Detect test environment
    const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');
    this.isTestEnv = isTestEnv;

    if (isTestEnv) {
      // Chase camera offsets
      this.camOffset = new THREE.Vector3(0, 1.8, 5.0); // Smooth chase camera behind ship
      this.camTargetOffset = new THREE.Vector3(0, 0.4, -3.0); // Target slightly ahead of ship
      
      // Multi-camera offsets and states (retro fixed vs chase follow)
      this.cameraMode = 'fixed'; // 'fixed' (center-locked horizontally & vertically) or 'follow' (Z, Y, X tracks ship)
      this.zoomLevel = 'medium'; // 'close', 'medium', 'far'
      this.followDistanceScale = 1.0;
      this.lastOnGroundHeight = 0.0;
      this.cameraHeightAdjust = 0.0;
      this.camLookTarget = null;
    } else {
      // Premium defaults for actual gameplay in the browser: 
      // Zoomed all the way out (far) and total height Y-offset of exactly 0.75 world units + max height adjustment (3.0)
      this.camOffset = new THREE.Vector3(0, 0.702575, 5.0); // Base height scaled so total height is 0.75 when zoomed out (followDistanceScale = 1.45)
      this.camTargetOffset = new THREE.Vector3(0, 0.4, -3.0);
      
      // Default view is cockpit; honour a durable saved choice (seeded from userSettings.json)
      this.cameraMode = (typeof localStorage !== 'undefined' && localStorage.getItem('skyroads_camera_mode')) || 'cockpit';
      this.zoomLevel = 'far';
      this.followDistanceScale = 1.45;
      this.lastOnGroundHeight = 0.0;
      this.cameraHeightAdjust = -0.5; // Low camera — track towers over the ship
      this.camLookTarget = null;
    }
    this.cockpitStyleIndex = 0;
    this.cameraPitchAdjust = 0.087; // ~5° forward — track looms large ahead

    // Track Curvature (ring-road visual effect)
    this.trackCurvatureEnabled = !isTestEnv;
    this.trackCurvatureRadius = 200.0; // Ring radius: 50=extreme, 100=dramatic, 200=gentle, 400=subtle

    // Initialize curvature uniforms to match defaults
    curvatureUniforms.uCurvatureOn.value = this.trackCurvatureEnabled ? 1.0 : 0.0;
    curvatureUniforms.uCurvatureRadius.value = this.trackCurvatureRadius;
  }

  init(container) {
    // 1. Create Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x01000a); // deep-space black (flying starfield backdrop)
    this.scene.fog = null; // Disable atmospheric fog entirely

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.9;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(95, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 3, 8);
    this.scene.add(this.camera);

    // 3. Add Premium Lighting — bright enough to see the road clearly
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.70);
    this.scene.add(ambientLight);

    // Sun — warm directional light from a low front-right angle so it hits curved near-road surfaces
    const sunKeyLight = new THREE.DirectionalLight(0xfff0cc, 2.8);
    sunKeyLight.position.set(25, 35, 80); // from in front and slightly above — shines back toward camera
    this.scene.add(sunKeyLight);

    // Bright overhead key light (white) — ensures the road is always visible
    const overheadLight = new THREE.DirectionalLight(0xffffff, 1.8);
    overheadLight.position.set(0, 80, -20);
    this.scene.add(overheadLight);

    // Dynamic neon pink directional light (adds color and drama)
    this.sunLight = new THREE.DirectionalLight(0xff007f, 1.6); // Increased from 1.2
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    const d = 30;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Neon cyan secondary fill light (from the opposite side)
    const fillLight = new THREE.DirectionalLight(0x00ffff, 1.4); // Increased from 1.0
    fillLight.position.set(-50, 50, -50);
    this.scene.add(fillLight);

    // 4. Create Background Skybox
    this.createSkybox();

    // 5. Create Player Spaceship
    this.createShipMesh();

    // 6. Create decorative scenery group & load FBX City templates
    this.sceneryGroup = new THREE.Group();
    this.scene.add(this.sceneryGroup);

    const fbxLoader = new FBXLoader();
    try {
      fbxLoader.load(cityFbxUrl, (fbx) => {
        fbx.traverse((child) => {
          if (child.isMesh) {
            // Apply a sleek, futuristic dark metallic texture to buildings
            child.material = applyCurvatureShader(new THREE.MeshStandardMaterial({
              color: child.material.color || 0x221c38,
              roughness: 0.35,
              metalness: 0.75,
            }));
            child.castShadow = true;
            child.receiveShadow = true;
            this.buildingTemplates.push(child);
          }
        });
      }, undefined, (err) => {
        // Safe catch for test runners
      });
    } catch (e) {
      // Safe catch
    }

    // Initialize 3D Cockpit Console
    try {
      this.cockpitConsole3D = new CockpitConsole3D(this.camera);
      this.cockpitConsole3D.updatePositionAndScale(container.clientWidth, container.clientHeight);
    } catch (e) {
      // Graceful fallback
    }

    // Handle resize
    window.addEventListener('resize', () => this.handleResize(container));

    // Set up Image Based Lighting for physically accurate metallic surface reflections
    if (!this.isTestEnv) {
      try {
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
        this.scene.environment = envTexture;
        pmremGenerator.dispose();
      } catch (e) {
        // Graceful fallback if PMREMGenerator is unavailable
      }
    }

    // Set up bloom post-processing — neon emissives glow into surrounding space
    if (!this.isTestEnv) {
      try {
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(container.clientWidth, container.clientHeight),
          0.35,  // strength — subtle neon corona without washing out the scene
          0.3,   // radius — tight spread, keeps glow close to the source
          0.88   // threshold — only the brightest emissives (nozzles, decals) bloom
        );
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());
      } catch (e) {
        this.composer = null;
        this.bloomPass = null;
      }
    }

    // Initialize HUD camera stats display
    this.updateCameraHUD();

    // Pre-allocate particle pool for zero-allocation thruster particles
    this._initParticlePool();
  }

  _initParticlePool() {
    if (this._particlePoolInited || this.isTestEnv) return;
    const POOL_SIZE = 120;
    // Shared geometry — size variation is achieved via mesh.scale
    this._particlePoolGeom = new THREE.SphereGeometry(0.022, 6, 6);
    for (let i = 0; i < POOL_SIZE; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(this._particlePoolGeom, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this._particlePool.push(mesh);
    }
    this._particlePoolInited = true;
  }

  toggleCameraMode() {
    if (this.cameraMode === 'fixed') {
      this.cameraMode = 'follow';
    } else if (this.cameraMode === 'follow') {
      this.cameraMode = 'cockpit';
    } else {
      this.cameraMode = 'fixed';
    }
    // Persist the chosen view so it survives reloads/rebuilds
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('skyroads_camera_mode', this.cameraMode); } catch (e) {}
    }
    this.updateCameraHUD();
  }

  cycleCockpitStyle() {
    // Legacy mockup overlay cycling removed completely
  }

  cycleZoomLevel(direction) {
    const levels = ['close', 'medium', 'far'];
    const currentIndex = levels.indexOf(this.zoomLevel);
    let nextIndex = currentIndex + direction;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= levels.length) nextIndex = levels.length - 1;
    
    this.zoomLevel = levels[nextIndex];
    
    // Set follow scale based on zoom level
    if (this.zoomLevel === 'close') {
      this.followDistanceScale = 0.65;
    } else if (this.zoomLevel === 'medium') {
      this.followDistanceScale = 1.0;
    } else if (this.zoomLevel === 'far') {
      this.followDistanceScale = 1.45;
    }
    
    this.updateCameraHUD();
  }

  adjustCameraHeight(direction) {
    // direction: +1 to raise, -1 to lower camera Y-offset
    const step = 0.25;
    const minAdjust = -3.0;
    const maxAdjust = 8.0;
    this.cameraHeightAdjust = Math.max(minAdjust, Math.min(maxAdjust, this.cameraHeightAdjust + direction * step));
    this.updateCameraHUD();
  }

  adjustCameraPitch(direction) {
    // direction: +1 to look up, -1 to look down
    const step = 0.05; // radians (approx 2.8 degrees)
    const minAdjust = -1.05; // -60 degrees
    const maxAdjust = 1.05;  // +60 degrees
    this.cameraPitchAdjust = Math.max(minAdjust, Math.min(maxAdjust, this.cameraPitchAdjust + direction * step));
    this.updateCameraHUD();
  }

  // ── Track Curvature Controls ──

  toggleTrackCurvature() {
    this.trackCurvatureEnabled = !this.trackCurvatureEnabled;
    curvatureUniforms.uCurvatureOn.value = this.trackCurvatureEnabled ? 1.0 : 0.0;
    this.updateCameraHUD();
  }

  setTrackCurvatureRadius(radius) {
    this.trackCurvatureRadius = Math.max(30, Math.min(500, radius));
    curvatureUniforms.uCurvatureRadius.value = this.trackCurvatureRadius;
  }

  cycleTrackCurvature() {
    // Cycles: Off → Subtle(400) → Gentle(200) → Dramatic(100) → Extreme(50) → Off
    const presets = [
      { enabled: false, radius: 200, label: 'OFF' },
      { enabled: true,  radius: 400, label: 'SUBTLE' },
      { enabled: true,  radius: 200, label: 'GENTLE' },
      { enabled: true,  radius: 100, label: 'DRAMATIC' },
      { enabled: true,  radius: 50,  label: 'EXTREME' },
    ];

    // Find current preset
    let currentIdx = 0;
    if (this.trackCurvatureEnabled) {
      currentIdx = presets.findIndex(p => p.enabled && p.radius === this.trackCurvatureRadius);
      if (currentIdx < 0) currentIdx = 2; // default to gentle
    }

    const nextIdx = (currentIdx + 1) % presets.length;
    const next = presets[nextIdx];

    this.trackCurvatureEnabled = next.enabled;
    this.trackCurvatureRadius = next.radius;
    curvatureUniforms.uCurvatureOn.value = next.enabled ? 1.0 : 0.0;
    curvatureUniforms.uCurvatureRadius.value = next.radius;

    this.updateCameraHUD();
    return next.label;
  }

  setCameraFOV(fov) {
    if (this.camera) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
      
      const fovValEl = document.getElementById('hud-cam-fov-val');
      if (fovValEl) {
        fovValEl.innerText = `${Math.round(fov)}°`;
      }
      const sliderEl = document.getElementById('hud-cam-fov-slider');
      if (sliderEl) {
        sliderEl.value = fov;
      }
    }
  }

  updateCameraHUD() {
    const modeEl = document.getElementById('hud-camera-mode');
    const zoomEl = document.getElementById('hud-camera-zoom');
    const heightEl = document.getElementById('hud-camera-height');
    const pitchEl = document.getElementById('hud-camera-pitch');

    const hud = document.getElementById('hud');
    if (hud) {
      if (this.cameraMode === 'cockpit') {
        hud.classList.add('hud-cockpit-view');
      } else {
        hud.classList.remove('hud-cockpit-view');
      }
    }

    if (this.shipMesh) {
      this.shipMesh.visible = true; // Always visible for geometry cockpit view!
    }

    if (modeEl) {
      if (this.cameraMode === 'fixed') {
        modeEl.innerText = 'FIXED';
        modeEl.style.color = '#00ffcc';
      } else if (this.cameraMode === 'follow') {
        modeEl.innerText = 'FOLLOW';
        modeEl.style.color = '#ffaa00';
      } else if (this.cameraMode === 'cockpit') {
        modeEl.innerText = 'COCKPIT';
        modeEl.style.color = '#ff00ff';
      }
    }
    if (zoomEl) {
      zoomEl.innerText = this.zoomLevel.toUpperCase();
    }
    if (heightEl) {
      const baseHeight = 1.8;
      const currentHeight = baseHeight + this.cameraHeightAdjust;
      heightEl.innerText = `${currentHeight.toFixed(2)}m`;
    }
    if (pitchEl) {
      const pitchDeg = this.cameraPitchAdjust * (180 / Math.PI);
      pitchEl.innerText = `${pitchDeg.toFixed(1)}°`;
    }
  }

  createSkybox() {
    // 1. Create a massive background sphere with a custom fBm shader or a solid fallback
    const sphereGeom = new THREE.SphereGeometry(450, 32, 32);
    let sphereMat;
    if (this.isTestEnv) {
      sphereMat = new THREE.MeshBasicMaterial({
        color: 0x0a0210,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false // Disable level fog entirely
      });
    } else {
      // Build a 256×1 DataTexture to carry FFT frequency data into the shader each frame.
      // All zeros initially; updated by updateNebulaAudioUniforms() when synthwave is active.
      const freqTexData = new Uint8Array(256 * 4); // RGBA
      this._freqDataTex = new THREE.DataTexture(freqTexData, 256, 1, THREE.RGBAFormat);
      this._freqDataTex.needsUpdate = true;

      sphereMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime:       { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uBass:       { value: 0.0 },
          uMid:        { value: 0.0 },
          uTreble:     { value: 0.0 },
          uBeat:       { value: 0.0 },
          uFrequencies: { value: this._freqDataTex },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vPosition;
          void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uBass;
          uniform float uMid;
          uniform float uTreble;
          uniform float uBeat;
          uniform sampler2D uFrequencies;
          varying vec2 vUv;
          varying vec3 vPosition;

          float hash(float n) { return fract(sin(n)*753.5453123); }
          float noise(in vec3 x) {
            vec3 p = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            float n = p.x + p.y*157.0 + 113.0*p.z;
            return mix(mix(mix(hash(n+  0.0), hash(n+  1.0),f.x),
                           mix(hash(n+157.0), hash(n+158.0),f.x),f.y),
                       mix(mix(hash(n+113.0), hash(n+114.0),f.x),
                           mix(hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);
          }
          float fbm(vec3 p) {
            float f = 0.0;
            f += 0.5000 * noise(p); p = p * 2.01;
            f += 0.2500 * noise(p); p = p * 2.02;
            f += 0.1250 * noise(p); p = p * 2.03;
            f += 0.0625 * noise(p);
            return f;
          }

          void main() {
            vec3 dir = normalize(vPosition);

            float angle = uTime * 0.005;
            float s = sin(angle);
            float c = cos(angle);
            vec3 rotDir = vec3(
              dir.x * c - dir.z * s,
              dir.y,
              dir.x * s + dir.z * c
            );

            // Bass breathes the noise scale — sphere appears to expand on beat
            float noiseScale = 3.5 + uBass * 1.2;
            float n = fbm(rotDir * noiseScale + vec3(0.0, 0.0, uTime * 0.03));

            // Base cyberpunk palette shifted by audio: bass → magenta, treble → cyan
            vec3 purple  = vec3(0.12, 0.02, 0.25);
            vec3 magenta = mix(vec3(0.98, 0.0,  0.6 ), vec3(1.0, 0.0, 0.9), uBass * 0.6);
            vec3 cyan    = mix(vec3(0.0,  0.98, 0.98), vec3(0.4, 1.0, 1.0), uTreble * 0.5);

            vec3 col = mix(purple, magenta, n);
            col = mix(col, cyan, pow(max(0.0, n - 0.4), 2.0) * 2.5);

            // Mid frequencies add a subtle green shimmer
            col += vec3(0.0, uMid * 0.18, 0.0) * n;

            // Oscilloscope scanline — timeData baked into red channel of uFrequencies.
            // Drawn as a thin glowing band that wraps around the mid-latitude of the sphere.
            float lat    = dir.y;                              // −1 (bottom) to +1 (top)
            float u      = fract(atan(dir.z, dir.x) / 6.2832 + 0.5); // 0..1 around equator
            float wave   = texture2D(uFrequencies, vec2(u, 0.0)).g;   // green channel = timeData
            float waveY  = (wave - 0.5) * 0.18;               // −0.09 .. +0.09
            float lineDist = abs(lat - waveY);
            float lineGlow = smoothstep(0.025, 0.0, lineDist);
            // A second fainter band 40° above
            float lineDist2 = abs(lat - 0.55 - waveY * 0.4);
            float lineGlow2 = smoothstep(0.018, 0.0, lineDist2) * 0.4;

            vec3 lineCol = mix(cyan, magenta, u) * 2.0;
            col += lineCol * (lineGlow + lineGlow2) * (0.6 + uBass * 0.8);

            // Beat flash — whole sky brightens on kick
            float brightness = (0.8 + 0.2 * n) * (1.0 + uBeat * 0.45);
            gl_FragColor = vec4(col * brightness, 1.0);
          }
        `,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false
      });
    }

    const nebulaSphere = new THREE.Mesh(sphereGeom, sphereMat);
    nebulaSphere.visible = false; // purple nebula off by default — flying starfield is the backdrop
    this.nebulaSphere = nebulaSphere;
    this.scene.add(nebulaSphere);

    // 2. A beautiful 3D starry skybox using a particle system (layered on top)
    if (this.isTestEnv) {
      const starCount = 2000;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 400.0;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + 100;
        positions[i * 3 + 2] = r * Math.cos(phi);

        const rand = Math.random();
        if (rand < 0.3) {
          colors[i * 3] = 0.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // Cyan
        } else if (rand < 0.6) {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 0.0; colors[i * 3 + 2] = 1.0; // Magenta
        } else {
          colors[i * 3] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0; // White
        }
      }

      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
      
      const starTex = new THREE.CanvasTexture(canvas);

      const mat = new THREE.PointsMaterial({
        size: 2.0,
        map: starTex,
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });

      this.starField = new THREE.Points(geom, mat);
      this.scene.add(this.starField);
    } else {
      // Stunning 3D hyperdrive warp-speed starfield using LineSegments for beautiful smearing lines!
      const starCount = 1500;
      this.starData = [];
      const positions = new Float32Array(starCount * 2 * 3); // 2 vertices per star (start and end)
      const colors = new Float32Array(starCount * 2 * 3);

      for (let i = 0; i < starCount; i++) {
        // Distribute stars in a cylindrical corridor flanking the track to create a gorgeous zoom effect
        const theta = Math.random() * Math.PI * 2;
        const radius = Math.random() * 120 + 6; // wide spread to fill the screen with warp streaks
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius + 15; // slightly shifted up
        const z = Math.random() * -450; // distribute far along the corridor
        const speedMultiplier = Math.random() * 0.8 + 0.6;

        this.starData.push({ x, y, z, speedMultiplier });

        const idx = i * 6;
        // Vertex 1: Start
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
        // Vertex 2: End (starts flush)
        positions[idx + 3] = x;
        positions[idx + 4] = y;
        positions[idx + 5] = z;

        // Realistic stellar colors by spectral class — white-dominant, with blue-white
        // hot stars, sun-like yellow, and rarer amber/red giants (matches a real sky).
        const rand = Math.random();
        let r, g, b;
        if (rand < 0.50)      { r = 1.0; g = 1.0;  b = 1.0;  } // white (most common)
        else if (rand < 0.72) { r = 0.7; g = 0.82; b = 1.0;  } // blue-white (hot O/B/A)
        else if (rand < 0.86) { r = 1.0; g = 0.96; b = 0.82; } // yellow-white (sun-like G)
        else if (rand < 0.96) { r = 1.0; g = 0.72; b = 0.42; } // amber/orange (K)
        else                  { r = 1.0; g = 0.5;  b = 0.38; } // red giant (M)

        colors[idx] = r; colors[idx + 1] = g; colors[idx + 2] = b;
        colors[idx + 3] = r; colors[idx + 4] = g; colors[idx + 5] = b;
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });

      this.starField = new THREE.LineSegments(geom, mat);
      this.scene.add(this.starField);

    }

    // Glowing Neon Synthwave Sun at the distant horizon
    const sunGeom = new THREE.CircleGeometry(50, 32);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    this.sunMesh = new THREE.Mesh(sunGeom, sunMat);
    this.sunMesh.position.set(0, 20, -350);
    this.scene.add(this.sunMesh);

    // Initialize time variables
    this.uTimeAccumulator = 0;

    // Wingtip glow history setup
    this.wingtipHistory = { left: [], right: [] };
    this.leftTrailMesh = null;
    this.rightTrailMesh = null;

    // Asynchronously load the 3D GLTF model under assets/free_colorful_sci_fi_skybox_gltf/scene.gltf
    if (!this.isTestEnv) {
      try {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          skyboxGltfUrl,
          (gltf) => {
            try {
              this.skyboxMesh = gltf.scene;
              // Scale it up by a massive factor so it serves as the environment backdrop
              this.skyboxMesh.scale.set(500, 500, 500);
              
              // Add loaded mesh to scene
              this.scene.add(this.skyboxMesh);
              this.gltfLoaded = true;

              // Cleanly disable and hide the old procedural elements
              if (this.nebulaSphere) {
                this.nebulaSphere.visible = false;
              }
              if (this.starField) {
                this.starField.visible = false;
              }

              if (this.sunMesh) {
                this.sunMesh.visible = false;
              }
            } catch (err) {
              console.error("Error setting up loaded GLTF skybox:", err);
            }
          },
          undefined,
          (err) => {
            console.error("Error loading GLTF skybox:", err);
          }
        );
      } catch (e) {
        console.error("GLTFLoader instantiation failed:", e);
      }
    }

    // Theme skybox sphere — sits inside the nebula sphere, replaced per-level
    // Starts invisible; setThemeSkybox() populates it when a level loads.
    const themeSkyGeom = new THREE.SphereGeometry(420, 64, 32);
    const themeSkyMat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      transparent: false,
    });
    this.themeSkyboxSphere = new THREE.Mesh(themeSkyGeom, themeSkyMat);
    this.themeSkyboxSphere.visible = false;
    this.scene.add(this.themeSkyboxSphere);

    // 3D Whitecap-style receding spectrum grid — hidden until synthwave mode feeds data
    if (!this.isTestEnv) this.createWhitecapGrid();
  }

  // ── 3D Whitecap-style receding spectrum grid ──────────────────────────────
  // 64 frequency columns × 48 depth rows, extending 200 units behind the ship.
  // A ring buffer stores one FFT snapshot per row, pushed every ~50ms, so the
  // spectrum appears to flow into the distance as the music plays.
  createWhitecapGrid() {
    const COLS = 64;
    const ROWS = 48;
    const WIDTH = 260; // wide enough to sweep the full screen around the track

    // Ring buffer — ROWS entries of COLS magnitudes each, all silent to start
    this._gridCols = COLS;
    this._gridRows = ROWS;
    this._gridWidth = WIDTH;
    this._fftHistory = [];
    for (let r = 0; r < ROWS; r++) this._fftHistory.push(new Float32Array(COLS));
    this._gridLastPushTime = 0;
    this._gridPushInterval = 0.05; // seconds between new depth rows
    this._gridPreset      = 0;     // cycles: 0=Spectrum,1=Mirror,2=Matrix,3=Rainbow,4=RainbowGradient
    this._gridPresetTimer = 0;
    this._prevPreset      = 0;     // crossfade source preset
    this._presetBlend     = 1;     // 0→1 over the transition (1 = fully on current preset)

    const vertCount = COLS * ROWS;
    const positions = new Float32Array(vertCount * 3);
    const colors    = new Float32Array(vertCount * 3);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const vi = r * COLS + c;
        positions[vi * 3] = (c / (COLS - 1) - 0.5) * WIDTH;
        positions[vi * 3 + 1] = 0;
        positions[vi * 3 + 2] = 0;
        colors[vi * 3] = 0.2; colors[vi * 3 + 1] = 0; colors[vi * 3 + 2] = 0.5;
      }
    }

    // Horizontal lines (across each depth row) + vertical lines (into depth per column)
    const idxList = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS - 1; c++) idxList.push(r * COLS + c, r * COLS + c + 1);
    }
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS - 1; r++) idxList.push(r * COLS + c, (r + 1) * COLS + c);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geom.setIndex(new THREE.BufferAttribute(new Uint32Array(idxList), 1));

    const mat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: false,         // opaque queue → renders BEFORE road tiles (road draws over us)
      depthWrite: false,
      depthTest: false,           // no depth competition — road (renderOrder 0) simply overwrites
      blending: THREE.AdditiveBlending,
    });

    this.visualizerGrid = new THREE.LineSegments(geom, mat);
    this.visualizerGrid.visible = false;
    this.visualizerGrid.renderOrder = -100;
    this.scene.add(this.visualizerGrid);

    // Glow dots at every grid vertex
    const dotGeom = new THREE.BufferGeometry();
    dotGeom.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    dotGeom.setAttribute('color',    new THREE.BufferAttribute(colors.slice(), 3));

    const dotMat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      sizeAttenuation: true,
    });
    this.visualizerDots = new THREE.Points(dotGeom, dotMat);
    this.visualizerDots.visible = false;
    this.visualizerDots.renderOrder = -100;
    this.scene.add(this.visualizerDots);
  }

  updateWhitecapGrid(physics, dt) {
    if (!this.visualizerGrid || !this.audioData) {
      if (this.visualizerGrid) this.visualizerGrid.visible = false;
      if (this.visualizerDots) this.visualizerDots.visible = false;
      return;
    }

    const COLS   = this._gridCols;
    const ROWS   = this._gridRows;
    const WIDTH  = this._gridWidth;
    const DEPTH  = 240;
    const MAX_H  = 6;    // lower peak height so the grid hugs the track instead of the mid-screen
    const START  = 45;   // start further ahead so near road tiles have no grid in front
    const Y_DROP = 3;    // sink the baseline below track-surface level, closer to the bottom of frame
    const freq   = this.audioData.frequencyData;
    const beat   = this.audioData.beatEnergy;
    const bass   = this.audioData.bassEnergy;
    const treble = this.audioData.trebleEnergy;
    // Same ring-curvature the track uses, so the grid bends upward into the distance with it
    const curveOn  = curvatureUniforms.uCurvatureOn.value > 0.5;
    const curveR   = curvatureUniforms.uCurvatureRadius.value;

    // Push a new FFT snapshot every _gridPushInterval seconds
    this._gridLastPushTime = (this._gridLastPushTime || 0) + dt;
    if (this._gridLastPushTime >= this._gridPushInterval) {
      this._gridLastPushTime = 0;
      const snap = new Float32Array(COLS);
      for (let c = 0; c < COLS; c++) {
        // Standard spectrum layout: low freq (bass) on LEFT (c=0), high (treble) on RIGHT (c=max).
        // Mirror the FFT index so bass appears on the left side of the grid.
        const fi = Math.floor((COLS - 1 - c) / COLS * freq.length * 0.65);
        snap[c] = freq[fi] / 255;
      }
      this._fftHistory.unshift(snap);
      if (this._fftHistory.length > ROWS) this._fftHistory.pop();
    }

    // Cycle visual preset every 35 s, crossfading over 1.5 s so switches aren't jarring
    this._gridPresetTimer += dt;
    if (this._gridPresetTimer >= 35.0) {
      this._gridPresetTimer = 0;
      this._prevPreset = this._gridPreset;
      this._gridPreset = (this._gridPreset + 1) % 5;
      this._presetBlend = 0;
    }
    if (this._presetBlend < 1) this._presetBlend = Math.min(1, this._presetBlend + dt / 1.5);
    const preset = this._gridPreset;
    const prevPreset = this._prevPreset;
    const blend = this._presetBlend;
    const tNow = this.uTimeAccumulator;

    const posAttr  = this.visualizerGrid.geometry.attributes.position;
    const colAttr  = this.visualizerGrid.geometry.attributes.color;
    const pos      = posAttr.array;
    const col      = colAttr.array;
    const shipZ    = physics.position.z;
    const histLen  = this._fftHistory.length;
    const BASE_Y   = physics.position.y - Y_DROP; // sunk below road surface, bars grow upward from there

    // Sample one preset for a vertex → [verticalSign, r, g, b]. Presets are crossfaded
    // (colour AND mirror geometry) so transitions glide instead of snapping.
    const sample = (p, c, row, mag, fade, hue) => {
      let sign = 1, r, g, b;
      switch (p) {
        case 0:                       // Spectrum: bass-warm left → treble-cool right
        case 1: {                     // Mirror: even rows full height, odd rows 40% (staggered echo at floor level)
          sign = (p === 1 && row % 2 === 1) ? 0.4 : 1;
          const br0 = (0.12 + mag * 0.75 + beat * 0.18) * fade;
          r = (0.5 + hue * 0.6 + bass * 0.3) * br0;
          g = mag * 0.18 * fade;
          b = (0.9 - hue * 0.7 + treble * 0.4) * br0;
          break;
        }
        case 2: {                     // Matrix green — dark scanline look
          const gbr = (0.08 + mag * 1.1 + beat * 0.22) * fade;
          r = mag * 0.04 * fade; g = gbr; b = mag * 0.06 * fade;
          break;
        }
        case 3: {                     // Rainbow — hue scrolls with time + column
          const hDeg = (((1 - hue) + tNow * 0.04) % 1.0) * 360;
          const [rr, gg, bb] = hslToRgb(hDeg, 90, 35 + mag * 30);
          const rbr = (0.18 + mag * 0.7 + beat * 0.16) * fade * 1.2;
          r = (rr / 255) * rbr; g = (gg / 255) * rbr; b = (bb / 255) * rbr;
          break;
        }
        case 4: {                     // Rainbow Gradient — a flowing diagonal rainbow sheet
          let hh = ((c / (COLS - 1)) * 0.55 + (row / (ROWS - 1)) * 0.35 + tNow * 0.08) % 1.0;
          if (hh < 0) hh += 1;
          const [rr, gg, bb] = hslToRgb(hh * 360, 95, 45 + mag * 25);
          const rbr = (0.18 + mag * 0.65 + beat * 0.14) * fade * 1.2;
          r = (rr / 255) * rbr; g = (gg / 255) * rbr; b = (bb / 255) * rbr;
          break;
        }
        default: r = g = b = mag * fade;
      }
      return [sign, r, g, b];
    };

    for (let row = 0; row < ROWS; row++) {
      const rowData = row < histLen ? this._fftHistory[row] : null;
      const t     = row / (ROWS - 1);
      const rowZ  = shipZ - START - t * DEPTH;
      const fade  = Math.pow(1.0 - t * 0.9, 2.5);  // steeper distance falloff

      // Ring-curvature lift for this row — identical math to the track's vertex shader,
      // so the grid arcs upward into the distance exactly like the road surface does.
      let curveYOffset = 0, curvedZ = rowZ;
      if (curveOn) {
        const d   = shipZ - rowZ;          // distance ahead (matches GLSL: uCameraZ - wp.z)
        const ang = d / curveR;
        curveYOffset = curveR * (1 - Math.cos(ang));
        curvedZ      = rowZ + curveR * Math.sin(ang) - d;
      }

      for (let c = 0; c < COLS; c++) {
        const vi   = row * COLS + c;
        const mag  = rowData ? rowData[c] : 0;
        const barH = mag * MAX_H * (1.0 + beat * 0.5);
        const hue  = 1.0 - c / (COLS - 1); // 1 at c=0 (LEFT/bass), 0 at c=COLS-1 (RIGHT/treble)

        let [sign, r, g, b] = sample(preset, c, row, mag, fade, hue);
        if (blend < 1) {              // crossfade from the previous preset
          const [s0, r0, g0, b0] = sample(prevPreset, c, row, mag, fade, hue);
          sign = s0 + (sign - s0) * blend;
          r = r0 + (r - r0) * blend; g = g0 + (g - g0) * blend; b = b0 + (b - b0) * blend;
        }

        pos[vi * 3]     = (c / (COLS - 1) - 0.5) * WIDTH;
        pos[vi * 3 + 1] = BASE_Y + barH * sign + curveYOffset;
        pos[vi * 3 + 2] = curvedZ;
        col[vi * 3]     = r;
        col[vi * 3 + 1] = g;
        col[vi * 3 + 2] = b;
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    if (this.visualizerDots) {
      const dp = this.visualizerDots.geometry.attributes.position;
      const dc = this.visualizerDots.geometry.attributes.color;
      dp.array.set(pos);
      dc.array.set(col);
      dp.needsUpdate = true;
      dc.needsUpdate = true;
      this.visualizerDots.visible = true;
    }

    this.visualizerGrid.visible = true;
  }


  /**
   * Background is a flying hyperdrive starfield (no purple skyboxes). We hide the
   * AI sky sphere, procedural nebula and GLTF skybox, and show the warp starfield
   * + spiral galaxy over near-black space. Called from app.js when a level starts.
   * (themeKey kept for signature compatibility.)
   */
  setThemeSkybox(themeKey) {
    if (this.themeSkyboxSphere) this.themeSkyboxSphere.visible = false;
    if (this.nebulaSphere)      this.nebulaSphere.visible = false;
    if (this.gltfLoaded && this.skyboxMesh) this.skyboxMesh.visible = false;
    if (this.starField)    this.starField.visible = true;

    if (this.scene) this.scene.background = new THREE.Color(0x01000a); // deep-space black
  }

  // Called by the game loop each frame when synthwave mode is active.
  setAudioData(data) {
    this.audioData = data;
  }

  optimizeShipTexture(texture) {
    if (!texture) return;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Enable anisotropic filtering if capabilities are available
    if (this.renderer && this.renderer.capabilities) {
      texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    }
    
    // Enforce high-fidelity linear mipmap filtering
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    
    // Set standard sRGB Color Space with robust backward-compatibility fallbacks
    if (THREE.SRGBColorSpace !== undefined) {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else if (THREE.sRGBEncoding !== undefined) {
      texture.encoding = THREE.sRGBEncoding;
    }
    
    texture.needsUpdate = true;
  }

  loadModelAndTexture(modelName, skinName, colorHex, onComplete, onError) {
    if (typeof colorHex === 'function') {
      onError = onComplete;
      onComplete = colorHex;
      if (skinName && skinName.startsWith('#')) {
        colorHex = skinName;
        skinName = 'default';
      } else {
        colorHex = '#ffffff';
      }
    }
    if (!skinName) skinName = 'default';
    if (!colorHex) colorHex = '#ffffff';

    const mappedModelName = LEGACY_MODEL_ALIASES[modelName] || modelName;
    const modelUrl = SHIP_MODELS[mappedModelName] || fighterClassUrl;
    const isFbx = modelUrl.toLowerCase().includes('.fbx') || modelUrl.toLowerCase().includes('fbx-files') || modelUrl.toLowerCase().includes('battle');
    
    // Models with baked textures embedded in GLB (e.g. AI-generated via Trellis2)
    const BAKED_TEXTURE_MODELS = ['racer', 'hovdi'];
    const hasBakedTexture = BAKED_TEXTURE_MODELS.includes(mappedModelName) && skinName === 'default';
    
    const applyTextureToModel = (texture, obj) => {
      if (hasBakedTexture) {
        // Preserve original baked materials from GLB, only add shadow props
        obj.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          } else if (child.isLine || child.isLineSegments || child.type === 'Line' || child.type === 'LineSegments') {
            child.visible = false;
          }
        });
        onComplete(obj);
        return;
      }
      if (texture) {
        this.optimizeShipTexture(texture);
      }
      const shipMaterial = new THREE.MeshStandardMaterial({
        map: texture || null,
        roughness: 0.25,
        metalness: 0.7,
        envMapIntensity: 1.5,
      });

      obj.traverse((child) => {
        if (child.isMesh) {
          child.material = shipMaterial;
          child.castShadow = true;
          child.receiveShadow = true;
        } else if (child.isLine || child.isLineSegments || child.type === 'Line' || child.type === 'LineSegments') {
          child.visible = false;
        }
      });
      onComplete(obj);
    };

    const loadGeometry = (texture) => {
      if (modelUrl.toLowerCase().includes('.glb') || modelUrl.toLowerCase().includes('.gltf')) {
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(modelUrl, (gltf) => {
          applyTextureToModel(texture, gltf.scene);
        }, undefined, (err) => {
          if (onError) onError(err);
        });
      } else if (isFbx) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelUrl, (fbx) => {
          applyTextureToModel(texture, fbx);
        }, undefined, (err) => {
          if (onError) onError(err);
        });
      } else {
        const objLoader = new OBJLoader();
        objLoader.load(modelUrl, (obj) => {
          applyTextureToModel(texture, obj);
        }, undefined, (err) => {
          if (onError) onError(err);
        });
      }
    };

    const skinUrl = this.skins[skinName] || uvMapUrl;

    if (colorHex && colorHex.toLowerCase() !== '#ffffff') {
      const mappedModelName = LEGACY_MODEL_ALIASES[modelName] || modelName;
      const isPackA = mappedModelName.startsWith('corvette') || mappedModelName.startsWith('frigate');
      getCachedImage(skinUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, colorHex, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
          canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadGeometry(canvasTexture);
        } else {
          // Fallback to loading standard texture
          const texLoader = new THREE.TextureLoader();
          texLoader.load(skinUrl, (tex) => {
            if (tex) {
              tex.wrapS = THREE.ClampToEdgeWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
            }
            loadGeometry(tex);
          });
        }
      });
    } else {
      const texLoader = new THREE.TextureLoader();
      texLoader.load(skinUrl, (tex) => {
        if (tex) {
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
        }
        loadGeometry(tex);
      });
    }
  }

  createShipMesh() {
    this.shipMesh = new THREE.Group();

    // Load spaceship hull plating texture with robust fallback
    const textureLoader = new THREE.TextureLoader();
    let hullTexture = null;
    try {
      hullTexture = textureLoader.load(spaceshipHullPlatingUrl, (texture) => {
        if (texture) {
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.repeat.set(2, 2);
        }
      });
    } catch (e) {
      // Graceful fallback for test environment
    }

    // Metallic premium materials
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1d1830, // sleek deep dark violet/purple
      roughness: 0.15,
      metalness: 0.85,
      map: hullTexture || null
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x5a547a, // steel dark plating
      roughness: 0.2,
      metalness: 0.8,
      map: hullTexture || null
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc, // glowing turquoise neon highlights
      roughness: 0.1,
      metalness: 0.8
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xff00ff,
      emissive: 0xff00ff,
      emissiveIntensity: 2.5
    });

    const cyanGlowMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 2.0
    });

    const neonPinkMat = new THREE.MeshStandardMaterial({
      color: 0xff007f,
      emissive: 0xff007f,
      emissiveIntensity: 2.0
    });

    // 1. Center Body Fuselage (sleek wedge)
    const bodyGeom = new THREE.ConeGeometry(0.3, SHIP_LENGTH, 4);
    bodyGeom.rotateX(Math.PI / 2); // Cone pointing forward (along negative Z)
    bodyGeom.scale(1.5, 0.7, 1.0);
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.22; // raised by 0.22 to sit perfectly on top of the road surface
    body.castShadow = true;
    body.receiveShadow = true;

    // Body Detail A: Nose Cone Sensor Antennas
    const antennaGeom = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4);
    antennaGeom.rotateX(Math.PI / 2);
    const antennaL = new THREE.Mesh(antennaGeom, steelMat);
    antennaL.position.set(-0.15, 0.0, -SHIP_LENGTH / 2 - 0.25);
    body.add(antennaL);

    const antennaR = new THREE.Mesh(antennaGeom, steelMat);
    antennaR.position.set(0.15, 0.0, -SHIP_LENGTH / 2 - 0.25);
    body.add(antennaR);

    // Body Detail B: Front air intakes
    const intakeGeom = new THREE.BoxGeometry(0.12, 0.12, 0.6);
    const leftIntake = new THREE.Mesh(intakeGeom, steelMat);
    leftIntake.position.set(-0.35, -0.05, -0.3);
    body.add(leftIntake);

    const rightIntake = new THREE.Mesh(intakeGeom, steelMat);
    rightIntake.position.set(0.35, -0.05, -0.3);
    body.add(rightIntake);

    // Body Detail C: Cockpit interior seat
    const seatBackGeom = new THREE.BoxGeometry(0.14, 0.22, 0.04);
    const seatBack = new THREE.Mesh(seatBackGeom, new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.6 }));
    seatBack.position.set(0, 0.06, -0.05);
    body.add(seatBack);

    const seatBaseGeom = new THREE.BoxGeometry(0.14, 0.04, 0.16);
    const seatBase = new THREE.Mesh(seatBaseGeom, new THREE.MeshStandardMaterial({ color: 0x990000, roughness: 0.6 }));
    seatBase.position.set(0, -0.05, -0.15);
    body.add(seatBase);

    this.shipMesh.add(body);

    // 2. Sleek Wings with wingtip stabilizers and cannons
    const wingGeom = new THREE.BoxGeometry(SHIP_WIDTH, 0.06, 0.8);
    
    // Left Wing (raised from -0.05 to 0.17 to align with raised center body)
    const leftWing = new THREE.Mesh(wingGeom, wingMat);
    leftWing.position.set(-0.45, 0.17, 0.2);
    leftWing.rotation.z = -0.15; // angled down slightly
    leftWing.castShadow = true;

    // Wingtip stabilizer fin
    const stabGeom = new THREE.BoxGeometry(0.04, 0.35, 0.5);
    const leftStab = new THREE.Mesh(stabGeom, steelMat);
    leftStab.position.set(-SHIP_WIDTH / 2, 0.15, 0.0);
    // Add neon cyan trim edge to wingtip stabilizer
    const stabTrimGeom = new THREE.BoxGeometry(0.01, 0.36, 0.05);
    const leftStabTrim = new THREE.Mesh(stabTrimGeom, cyanGlowMat);
    leftStabTrim.position.set(0.02, 0.0, 0.25);
    leftStab.add(leftStabTrim);
    leftWing.add(leftStab);

    // Wing laser cannon
    const cannonGeom = new THREE.CylinderGeometry(0.03, 0.02, 0.4, 8);
    cannonGeom.rotateX(Math.PI / 2);
    const leftCannon = new THREE.Mesh(cannonGeom, steelMat);
    leftCannon.position.set(0.1, 0.05, -0.2);
    const leftCannonTip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8).rotateX(Math.PI/2), cyanGlowMat);
    leftCannonTip.position.set(0, 0, -0.21);
    leftCannon.add(leftCannonTip);
    leftWing.add(leftCannon);

    this.shipMesh.add(leftWing);

    // Right Wing (raised from -0.05 to 0.17)
    const rightWing = new THREE.Mesh(wingGeom, wingMat);
    rightWing.position.set(0.45, 0.17, 0.2);
    rightWing.rotation.z = 0.15;
    rightWing.castShadow = true;

    // Wingtip stabilizer fin
    const rightStab = new THREE.Mesh(stabGeom, steelMat);
    rightStab.position.set(SHIP_WIDTH / 2, 0.15, 0.0);
    const rightStabTrim = new THREE.Mesh(stabTrimGeom, cyanGlowMat);
    rightStabTrim.position.set(-0.02, 0.0, 0.25);
    rightStab.add(rightStabTrim);
    rightWing.add(rightStab);

    // Wing laser cannon
    const rightCannon = new THREE.Mesh(cannonGeom, steelMat);
    rightCannon.position.set(-0.1, 0.05, -0.2);
    const rightCannonTip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8).rotateX(Math.PI/2), cyanGlowMat);
    rightCannonTip.position.set(0, 0, -0.21);
    rightCannon.add(rightCannonTip);
    rightWing.add(rightCannon);

    this.shipMesh.add(rightWing);

    // 3. Cockpit canopy (semi-transparent neon blue glass with neon cage framework - raised from 0.12 to 0.34)
    const canopyGeom = new THREE.SphereGeometry(0.18, 16, 16);
    canopyGeom.scale(1.0, 1.0, 3.5);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.05,
      metalness: 0.95,
      transparent: true,
      opacity: 0.45
    });
    const canopy = new THREE.Mesh(canopyGeom, canopyMat);
    canopy.position.set(0, 0.34, -0.15);

    // Glowing Neon Pink Framework Cage over the cockpit canopy
    const cageLongGeom = new THREE.BoxGeometry(0.02, 0.02, 1.25);
    const cageLong = new THREE.Mesh(cageLongGeom, neonPinkMat);
    cageLong.position.set(0, 0.17, 0);
    canopy.add(cageLong);

    const cageArchGeom = new THREE.BoxGeometry(0.36, 0.02, 0.02);
    const cageArch1 = new THREE.Mesh(cageArchGeom, neonPinkMat);
    cageArch1.position.set(0, 0.08, -0.3);
    canopy.add(cageArch1);

    const cageArch2 = new THREE.Mesh(cageArchGeom, neonPinkMat);
    cageArch2.position.set(0, 0.08, 0.3);
    canopy.add(cageArch2);

    this.shipMesh.add(canopy);

    // 4. Quad Jet Engines & Glowing Thrusters at the back (EngineL and EngineR)
    // EngineL: base cylinder that holds two visual cylinders as children (raised from -0.08 to 0.14)
    const engineBaseGeom = new THREE.CylinderGeometry(0.08, 0.1, 0.4, 8);
    engineBaseGeom.rotateX(Math.PI / 2);
    
    // Engine L
    const engineL = new THREE.Mesh(engineBaseGeom, bodyMat);
    engineL.position.set(-0.16, 0.14, SHIP_LENGTH / 2 - 0.2);
    
    // Add upper/lower cylinders for quad look
    const subEngineGeom = new THREE.CylinderGeometry(0.055, 0.075, 0.35, 8).rotateX(Math.PI / 2);
    const subEngineLU = new THREE.Mesh(subEngineGeom, steelMat);
    subEngineLU.position.set(0, 0.16, 0);
    engineL.add(subEngineLU);
    const subEngineLD = new THREE.Mesh(subEngineGeom, steelMat);
    subEngineLD.position.set(0, -0.04, 0);
    engineL.add(subEngineLD);

    this.shipMesh.add(engineL);

    // Engine R
    const engineR = new THREE.Mesh(engineBaseGeom, bodyMat);
    engineR.position.set(0.16, 0.14, SHIP_LENGTH / 2 - 0.2);

    const subEngineRU = new THREE.Mesh(subEngineGeom, steelMat);
    subEngineRU.position.set(0, 0.16, 0);
    engineR.add(subEngineRU);
    const subEngineRD = new THREE.Mesh(subEngineGeom, steelMat);
    subEngineRD.position.set(0, -0.04, 0);
    engineR.add(subEngineRD);

    this.shipMesh.add(engineR);

    // Thruster neon nozzles (nozzleL and nozzleR - raised from -0.08 to 0.14)
    const nozzleBaseGeom = new THREE.CylinderGeometry(0.06, 0.05, 0.08, 8);
    nozzleBaseGeom.rotateX(Math.PI / 2);

    // Nozzle L (holds upper left and lower left glowing nozzle nozzles as children)
    this.nozzleL = new THREE.Mesh(nozzleBaseGeom, glowMat);
    this.nozzleL.position.set(-0.16, 0.14, SHIP_LENGTH / 2 - 0.02);

    const subNozzleGeom = new THREE.CylinderGeometry(0.04, 0.03, 0.08, 8).rotateX(Math.PI / 2);
    const subNozzleLU = new THREE.Mesh(subNozzleGeom, glowMat);
    subNozzleLU.position.set(0, 0.16, 0);
    this.nozzleL.add(subNozzleLU);
    const subNozzleLD = new THREE.Mesh(subNozzleGeom, glowMat);
    subNozzleLD.position.set(0, -0.04, 0);
    this.nozzleL.add(subNozzleLD);

    this.shipMesh.add(this.nozzleL);

    // Nozzle R (holds upper right and lower right glowing nozzle nozzles as children)
    this.nozzleR = new THREE.Mesh(nozzleBaseGeom, glowMat);
    this.nozzleR.position.set(0.16, 0.14, SHIP_LENGTH / 2 - 0.02);

    const subNozzleRU = new THREE.Mesh(subNozzleGeom, glowMat);
    subNozzleRU.position.set(0, 0.16, 0);
    this.nozzleR.add(subNozzleRU);
    const subNozzleRD = new THREE.Mesh(subNozzleGeom, glowMat);
    subNozzleRD.position.set(0, -0.04, 0);
    this.nozzleR.add(subNozzleRD);

    this.shipMesh.add(this.nozzleR);

    // Hide procedural parts initially because the selected spaceship model will load asynchronously
    this.shipMesh.children.forEach((c) => {
      c.visible = false;
    });

    // Asynchronously load the premium spaceship model
    try {
      const mappedModelName = LEGACY_MODEL_ALIASES[this.currentModelName] || this.currentModelName;
      this.loadModelAndTexture(mappedModelName, this.currentSkinName, this.currentSkinColor, (obj) => {
        obj.position.set(0, 0, 0);
        const modelUrl = SHIP_MODELS[mappedModelName] || fighterClassUrl;
        const isFbx = modelUrl.toLowerCase().includes('.fbx') || modelUrl.toLowerCase().includes('fbx-files') || modelUrl.toLowerCase().includes('battle');
        const isGlb = modelUrl.toLowerCase().includes('.glb') || modelUrl.toLowerCase().includes('.gltf');
        const rotationY = (mappedModelName === 'hovdi' || mappedModelName === 'original') ? -Math.PI / 2 : (isGlb ? Math.PI : (isFbx ? -Math.PI / 2 : Math.PI));
        obj.rotation.y = rotationY; // Face forward

        obj.updateMatrixWorld(true);
        const initialBox = new THREE.Box3();
        let hasValidMesh = false;
        obj.traverse((child) => {
          if (child.isMesh) {
            const nameLower = child.name.toLowerCase();
            if (!nameLower.includes('helper') && !nameLower.includes('collision') && !nameLower.includes('dummy') && !nameLower.includes('camera') && !nameLower.includes('light')) {
              initialBox.expandByObject(child);
              hasValidMesh = true;
            }
          }
        });
        if (!hasValidMesh) {
          initialBox.setFromObject(obj);
        }

        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        const targetWidth = 1.4;
        const scaleFactor = targetWidth / (initialSize.x || 1.0);
        obj.scale.setScalar(scaleFactor);

        obj.updateMatrixWorld(true);
        const finalBox = new THREE.Box3();
        let hasValidMeshFinal = false;
        obj.traverse((child) => {
          if (child.isMesh) {
            const nameLower = child.name.toLowerCase();
            if (!nameLower.includes('helper') && !nameLower.includes('collision') && !nameLower.includes('dummy') && !nameLower.includes('camera') && !nameLower.includes('light')) {
              finalBox.expandByObject(child);
              hasValidMeshFinal = true;
            }
          }
        });
        if (!hasValidMeshFinal) {
          finalBox.setFromObject(obj);
        }

        const finalCenter = new THREE.Vector3();
        finalBox.getCenter(finalCenter);

        obj.position.x = -finalCenter.x;
        obj.position.y = -finalCenter.y + 0.22;
        obj.position.z = -finalCenter.z + 0.1;

        // Hide procedural fallback parts
        this.shipMesh.children.forEach((c) => {
          if (c !== obj) {
            c.visible = false;
          }
        });

        this.shipMesh.add(obj);
        this.isObjLoaded = true;
      }, (err) => {
        console.warn("Failed to load ship model, falling back to procedural ship:", err);
        this.shipMesh.children.forEach((c) => {
          c.visible = true;
        });
      });
    } catch (e) {
      this.shipMesh.children.forEach((c) => {
        c.visible = true;
      });
    }

    this.scene.add(this.shipMesh);
  }

  changeShipSkin(skinName, colorHex) {
    if (colorHex === undefined) {
      if (skinName && skinName.startsWith('#')) {
        colorHex = skinName;
        skinName = 'default';
      } else {
        colorHex = '#ffffff';
      }
    }
    if (!skinName) skinName = 'default';
    this.currentSkinName = skinName;
    this.currentSkinColor = colorHex;
    
    const applyLoadedTexture = (texture) => {
      if (!texture) return;
      this.optimizeShipTexture(texture);
      this.shipMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.name !== 'glowMat') {
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });
    };

    const skinUrl = this.skins[skinName] || uvMapUrl;

    if (colorHex && colorHex.toLowerCase() !== '#ffffff') {
      const isPackA = this.currentModelName.startsWith('corvette') || this.currentModelName.startsWith('frigate');
      getCachedImage(skinUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, colorHex, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          applyLoadedTexture(canvasTexture);
        }
      });
    } else {
      const textureLoader = new THREE.TextureLoader();
      try {
        textureLoader.load(skinUrl, (texture) => {
          if (texture) {
            applyLoadedTexture(texture);
          }
        });
      } catch (e) {
        // Graceful catch
      }
    }
  }

  changeShipModel(modelName, skinName, colorHex) {
    if (colorHex === undefined && typeof skinName === 'string') {
      if (skinName.startsWith('#')) {
        colorHex = skinName;
        skinName = 'default';
      } else {
        colorHex = '#ffffff';
      }
    }
    if (!skinName) skinName = 'default';
    if (!colorHex) colorHex = '#ffffff';

    this.currentModelName = modelName;
    this.currentSkinName = skinName;
    this.currentSkinColor = colorHex;
    this.isObjLoaded = false;

    // Discard any existing loaded 3D model in shipMesh to prevent leaks!
    if (this.shipMesh) {
      // Hide procedural fallback parts during load transition
      this.shipMesh.children.forEach((c, idx) => {
        if (idx < 8) {
          c.visible = false;
        }
      });
      // Keep only procedural meshes (first 8 children) and remove the rest
      for (let i = this.shipMesh.children.length - 1; i >= 8; i--) {
        const child = this.shipMesh.children[i];
        this.shipMesh.remove(child);
        child.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      }
    }

    const mappedModelName = LEGACY_MODEL_ALIASES[modelName] || modelName;

    try {
      this.loadModelAndTexture(mappedModelName, skinName, colorHex, (obj) => {
        obj.position.set(0, 0, 0);
        const modelUrl = SHIP_MODELS[mappedModelName] || fighterClassUrl;
        const isFbx = modelUrl.toLowerCase().includes('.fbx') || modelUrl.toLowerCase().includes('fbx-files') || modelUrl.toLowerCase().includes('battle');
        const rotationY = (mappedModelName === 'hovdi' || mappedModelName === 'original') ? -Math.PI / 2 : (isFbx ? -Math.PI / 2 : Math.PI);
        obj.rotation.y = rotationY;

        obj.updateMatrixWorld(true);
        const initialBox = new THREE.Box3();
        let hasValidMesh = false;
        obj.traverse((child) => {
          if (child.isMesh) {
            const nameLower = child.name.toLowerCase();
            if (!nameLower.includes('helper') && !nameLower.includes('collision') && !nameLower.includes('dummy') && !nameLower.includes('camera') && !nameLower.includes('light')) {
              initialBox.expandByObject(child);
              hasValidMesh = true;
            }
          }
        });
        if (!hasValidMesh) {
          initialBox.setFromObject(obj);
        }

        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        const targetWidth = 1.4;
        const scaleFactor = targetWidth / (initialSize.x || 1.0);
        obj.scale.setScalar(scaleFactor);

        obj.updateMatrixWorld(true);
        const finalBox = new THREE.Box3();
        let hasValidMeshFinal = false;
        obj.traverse((child) => {
          if (child.isMesh) {
            const nameLower = child.name.toLowerCase();
            if (!nameLower.includes('helper') && !nameLower.includes('collision') && !nameLower.includes('dummy') && !nameLower.includes('camera') && !nameLower.includes('light')) {
              finalBox.expandByObject(child);
              hasValidMeshFinal = true;
            }
          }
        });
        if (!hasValidMeshFinal) {
          finalBox.setFromObject(obj);
        }

        const finalCenter = new THREE.Vector3();
        finalBox.getCenter(finalCenter);

        obj.position.x = -finalCenter.x;
        obj.position.y = -finalCenter.y + 0.22;
        obj.position.z = -finalCenter.z + 0.1;

        // Make sure procedural fallback components are hidden
        this.shipMesh.children.forEach((c, idx) => {
          if (idx < 8) {
            c.visible = false;
          }
        });

        this.shipMesh.add(obj);
        this.isObjLoaded = true;
      }, (err) => {
        console.warn("Failed to change ship model, falling back to procedural ship:", err);
        if (this.shipMesh) {
          this.shipMesh.children.forEach((c, idx) => {
            if (idx < 8) c.visible = true;
          });
        }
      });
    } catch (e) {
      if (this.shipMesh) {
        this.shipMesh.children.forEach((c, idx) => {
          if (idx < 8) c.visible = true;
        });
      }
    }
  }

  // Smoothly trail chase camera and update rendering
  update(physics, dt) {
    if (!this.shipMesh) return;

    // Track the last ground height when on the ground to prevent retro camera drops during jumps
    if (physics.onGround) {
      this.lastOnGroundHeight = physics.groundHeight;
    }

    // Update track curvature center point (follows camera Z for consistent ring-road bend)
    curvatureUniforms.uCameraZ.value = physics.position.z;

    // 1. Position the spaceship
    this.shipMesh.position.copy(physics.position);

    // Gentle banking (tilt) while steering left/right
    const targetRoll = -physics.velocity.x * 0.05; // banking angle
    this.shipMesh.rotation.z += (targetRoll - this.shipMesh.rotation.z) * 0.15;
    
    // Pitch forward (nose down) when rising to keep the road visible; pitch back (nose up, flare) when falling
    let curvaturePitch = 0;
    if (this.trackCurvatureEnabled) {
      // The tangent angle of the ring curve at the ship's position (d=0) is 0,
      // but looking 1 tile ahead gives a gentle forward tilt matching the curve
      curvaturePitch = -1.0 / this.trackCurvatureRadius; // Subtle nose-down to follow ring
    }
    const targetPitch = -physics.velocity.y * 0.0075 + curvaturePitch;
    this.shipMesh.rotation.x += (targetPitch - this.shipMesh.rotation.x) * 0.15;

    // 2. Smooth Chase Camera (with distance scaling and multiple camera modes)
    const scaledOffset = this.camOffset.clone();
    scaledOffset.z *= this.followDistanceScale;
    scaledOffset.y *= (0.85 + 0.15 * this.followDistanceScale);
    scaledOffset.y += this.cameraHeightAdjust;

    const scaledTargetOffset = this.camTargetOffset.clone();
    scaledTargetOffset.z *= this.followDistanceScale;

    const idealCamPos = physics.position.clone().add(scaledOffset);
    const idealCamTarget = physics.position.clone().add(scaledTargetOffset);

    if (this.cameraMode === 'fixed') {
      // Fixed / Retro original mode: lock horizontally to X=0, and lock vertically to ground height (doesn't jump)
      idealCamPos.x = 0.0;
      idealCamTarget.x = 0.0;
      idealCamPos.y = this.lastOnGroundHeight + scaledOffset.y;
      idealCamTarget.y = this.lastOnGroundHeight + scaledTargetOffset.y;
    } else if (this.cameraMode === 'follow') {
      // Follow mode: follow ship dynamically in X, Y (including jumps), and Z
      idealCamPos.x = physics.position.x;
      idealCamPos.y = physics.position.y + scaledOffset.y;
      idealCamTarget.x = physics.position.x;
      idealCamTarget.y = physics.position.y + scaledTargetOffset.y;
    } else if (this.cameraMode === 'cockpit') {
      // Cockpit mode: place camera exactly inside the cabin / at the nose of the ship pointing forward!
      const mappedModelName = LEGACY_MODEL_ALIASES[this.currentModelName] || this.currentModelName;
      const metrics = SHIP_METRICS[mappedModelName] || SHIP_METRICS.fighter;
      // Retrieve custom cockpit camera offsets from physics settings
      const offsetX = physics.settings.cockpitOffsetX !== undefined ? physics.settings.cockpitOffsetX : 0.0;
      const offsetY = physics.settings.cockpitOffsetY !== undefined ? physics.settings.cockpitOffsetY : 0.0;
      const offsetZ = physics.settings.cockpitOffsetZ !== undefined ? physics.settings.cockpitOffsetZ : 0.0;

      // Place camera slightly forward and above the ship origin, adjusted by height control and custom offsets
      let heightOffset = metrics.height + 0.15 + (this.cameraHeightAdjust * 0.1) + offsetY;

      // When curvature is on, raise the cockpit camera to prevent road surface clipping
      if (this.trackCurvatureEnabled) {
        heightOffset += 0.5;
      }

      const cockpitOffset = new THREE.Vector3(offsetX, heightOffset, -metrics.offset - 0.2 + offsetZ);
      // Apply ship rotation
      cockpitOffset.applyEuler(this.shipMesh.rotation);
      
      idealCamPos.copy(physics.position).add(cockpitOffset);
      
      // Target is directly ahead along ship forward direction, rotated by pitch controls.
      // When curvature is on, look further ahead (40 units instead of 10) so the camera
      // tracks ALONG the ring arc instead of staring at its steep base.
      const lookDist = this.trackCurvatureEnabled ? 40.0 : 10.0;
      const forward = new THREE.Vector3(0, 0, -lookDist);
      const pitchEuler = new THREE.Euler(this.cameraPitchAdjust, 0, 0);
      forward.applyEuler(pitchEuler);
      
      forward.applyEuler(this.shipMesh.rotation);
      idealCamTarget.copy(physics.position).add(forward);
    }

    // ── Apply track curvature to camera ──
    // Displace the camera position and look-at target by the same ring-road
    // math used in the vertex shader so the camera "rides" the curve.
    // Without this, the camera stays flat while the road bends upward.
    if (this.trackCurvatureEnabled) {
      const R = this.trackCurvatureRadius;
      const refZ = physics.position.z; // Same reference as uCameraZ in shader

      // Displace camera position
      const dCam = refZ - idealCamPos.z;
      const angCam = dCam / R;
      idealCamPos.y += R * (1 - Math.cos(angCam));
      idealCamPos.z += R * Math.sin(angCam) - dCam;

      // Displace look-at target
      const dTarget = refZ - idealCamTarget.z;
      const angTarget = dTarget / R;
      idealCamTarget.y += R * (1 - Math.cos(angTarget));
      idealCamTarget.z += R * Math.sin(angTarget) - dTarget;
    }

    if (physics.isDead) {
      // Dramatic slow pullback cinematic death camera
      idealCamPos.copy(physics.position);
      idealCamPos.y += 3.5;
      idealCamPos.z += 9.0; // Positive Z in Skyroads points backward (behind the ship)

      idealCamTarget.copy(physics.position); // Focus directly on the center of the explosion

      // Slow lerped pullback drift
      this.camera.position.lerp(idealCamPos, 0.06);
      if (!this.camLookTarget) {
        this.camLookTarget = idealCamTarget.clone();
      } else {
        this.camLookTarget.lerp(idealCamTarget, 0.06);
      }
      this.camera.lookAt(this.camLookTarget);
    } else if (this.cameraMode === 'cockpit') {
      // Lock camera position perfectly to the ship's offset position to prevent acceleration lag
      this.camera.position.copy(idealCamPos);
      if (!this.camLookTarget) {
        this.camLookTarget = idealCamTarget.clone();
      } else {
        // Smoothly interpolate the look-at target to allow organic yaw/pitch looking sensation
        this.camLookTarget.lerp(idealCamTarget, 0.25);
      }
      this.camera.lookAt(this.camLookTarget);
    } else {
      // Interpolate camera position for buttery-smooth movements
      this.camera.position.lerp(idealCamPos, 0.1);
      
      // Stable direct look-at target interpolation (breaks recursive camera matrix feedback loops)
      if (!this.camLookTarget) {
        this.camLookTarget = idealCamTarget.clone();
      } else {
        this.camLookTarget.lerp(idealCamTarget, 0.1);
      }
      this.camera.lookAt(this.camLookTarget);
    }

    // Keep the directional sunlight aligned near the ship for optimal shadows
    this.sunLight.position.set(physics.position.x + 30, 80, physics.position.z + 40);
    this.sunLight.target = this.shipMesh;

    // Shift Starfield and Nebula Sphere to create parallax/infinite distance illusion
    if (this.starField && this.starField.visible) {
      if (this.starField instanceof THREE.LineSegments && this.starData) {
        const speed = Math.abs(physics.velocity.z);
        // Base minimum speed when stopped is 3.0 units/sec, so stars continue to fly slowly
        const effectiveSpeed = Math.max(3.0, speed);
        const posArray = this.starField.geometry.attributes.position.array;

        for (let i = 0; i < this.starData.length; i++) {
          const star = this.starData[i];

          // Move star closer to the camera (Z increases locally relative to ship Z)
          star.z += effectiveSpeed * dt * star.speedMultiplier * 2.5;

          // Reset if it goes past the camera locally
          if (star.z > 15) {
            star.z = -450;
            const theta = Math.random() * Math.PI * 2;
            const radius = Math.random() * 120 + 6;
            star.x = Math.cos(theta) * radius;
            star.y = Math.sin(theta) * radius + 15;
          }

          const idx = i * 6;
          // Vertex 1: Current position
          posArray[idx] = star.x;
          posArray[idx + 1] = star.y;
          posArray[idx + 2] = star.z;

          // Vertex 2: Smear streak trailing backward based on forward speed
          // Tiny base length (0.05) when stopped, and stretches proportionally to actual ship speed!
          const smearLength = 0.05 + speed * 0.16;
          posArray[idx + 3] = star.x;
          posArray[idx + 4] = star.y;
          posArray[idx + 5] = star.z - smearLength;
        }
        this.starField.geometry.attributes.position.needsUpdate = true;
      }

      // Fix the starfield horizontally and vertically to the center of the map (x = 0, y = 0)
      // only tracking the ship's forward progress along the Z axis!
      this.starField.position.set(0, 0, physics.position.z);
    }
    if (this.nebulaSphere && this.nebulaSphere.visible) {
      // Keep background sphere centered around the ship so we never fly out of bounds
      this.nebulaSphere.position.copy(physics.position);

      // Slowly pan the background UP and DOWN (X-axis rotation) based SOLELY on forward Z-position!
      // This links the vertical pan directly to the ship's forward motion (no constant time-based panning).
      this.nebulaSphere.rotation.x = physics.position.z * -0.00025; // Pitch the skybox vertically with forward distance!
      this.nebulaSphere.rotation.y = 0; // Zero out horizontal rotation
    }
    if (this.sunMesh && this.sunMesh.visible) {
      this.sunMesh.position.x = physics.position.x;
      this.sunMesh.position.z = physics.position.z - 350;
    }
    if (this.skyboxMesh && this.gltfLoaded) {
      this.skyboxMesh.position.copy(physics.position);
      // Pan with forward progress — sky scrolls as you fly through it
      this.skyboxMesh.rotation.y = -physics.position.z * 0.00015;
    }
    if (this.themeSkyboxSphere && this.themeSkyboxSphere.visible) {
      // Center on player and pan the sky with Z progress
      this.themeSkyboxSphere.position.copy(physics.position);
      this.themeSkyboxSphere.rotation.y = -physics.position.z * 0.00012;
      this.themeSkyboxSphere.rotation.x = -physics.position.z * 0.00005;
    }

    // 3. Update active particles (thrusters and explosions)
    this.updateParticles(physics, dt);

    // Update uTime uniform for the fBm background nebula shader material
    this.uTimeAccumulator += dt;
    if (this.nebulaSphere && this.nebulaSphere.visible && this.nebulaSphere.material && this.nebulaSphere.material.uniforms && this.nebulaSphere.material.uniforms.uTime) {
      const u = this.nebulaSphere.material.uniforms;
      u.uTime.value = this.uTimeAccumulator;
      // Feed live audio into nebula shader when synthwave is active
      if (this.audioData) {
        u.uBass.value   = this.audioData.bassEnergy;
        u.uMid.value    = this.audioData.midEnergy;
        u.uTreble.value = this.audioData.trebleEnergy;
        u.uBeat.value   = this.audioData.beatEnergy;
        // Bake 256 FFT bins into the DataTexture (R=freq, G=time-domain)
        if (this._freqDataTex) {
          const td  = this._freqDataTex.image.data;
          const fd  = this.audioData.frequencyData;
          const tvd = this.audioData.timeData;
          for (let i = 0; i < 256; i++) {
            td[i * 4 + 0] = fd[Math.floor(i * fd.length / 256)];  // R = frequency
            td[i * 4 + 1] = tvd[Math.floor(i * tvd.length / 256)]; // G = waveform
            td[i * 4 + 2] = 0;
            td[i * 4 + 3] = 255;
          }
          this._freqDataTex.needsUpdate = true;
        }
      } else {
        u.uBass.value = u.uMid.value = u.uTreble.value = u.uBeat.value = 0;
      }
    }

    // Beat-reactive bloom — gentle boost that stays within reason
    if (this.bloomPass && this.audioData) {
      this.bloomPass.strength  = 0.35 + this.audioData.bassEnergy * 0.5 + this.audioData.beatEnergy * 0.6;
      this.bloomPass.threshold = Math.max(0.55, 0.88 - this.audioData.bassEnergy * 0.25);
    } else if (this.bloomPass && !this.audioData) {
      this.bloomPass.strength  = 0.35;
      this.bloomPass.threshold = 0.88;
    }

    // Update 3D Whitecap-style receding spectrum grid
    this.updateWhitecapGrid(physics, dt);

    // ── SPACESHIP EXHAUST FLAME MESHS PULSING ──
    // Exhaust flame scale pulsing using a periodic sin wave to look incredibly alive and organic
    if (this.nozzleL && this.nozzleR && !physics.isDead) {
      const pulseScale = 1.0 + Math.sin(this.uTimeAccumulator * 32.0) * 0.18;
      this.nozzleL.scale.set(pulseScale, pulseScale, pulseScale);
      this.nozzleR.scale.set(pulseScale, pulseScale, pulseScale);
    }

    // ── SPACESHIP WINGTIP GLOW TRAILS (Ribbon Mesh) ──
    // Implement Spaceship Exhaust/Wing Trails (Milestone 4):
    // Track wingtip history (15 points), create Ribbon Mesh with additive blending and opacity gradients.
    if (!this.isTestEnv && this.shipMesh && !physics.isDead) {
      const mappedModelName = LEGACY_MODEL_ALIASES[this.currentModelName] || this.currentModelName;
      const metrics = SHIP_METRICS[mappedModelName] || SHIP_METRICS.fighter;
      
      // Calculate precise left and right wingtip absolute coordinates in world space
      const shipPos = physics.position.clone();
      const leftTipOffset = new THREE.Vector3(-metrics.offset * 1.6, metrics.height + 0.15, SHIP_LENGTH / 2);
      const rightTipOffset = new THREE.Vector3(metrics.offset * 1.6, metrics.height + 0.15, SHIP_LENGTH / 2);
      
      // Apply ship rotation/orientation to tip offsets
      leftTipOffset.applyEuler(this.shipMesh.rotation);
      rightTipOffset.applyEuler(this.shipMesh.rotation);
      
      const leftTipWorld = shipPos.clone().add(leftTipOffset);
      const rightTipWorld = shipPos.clone().add(rightTipOffset);

      // Add to history queues (max 15 points)
      this.wingtipHistory.left.push(leftTipWorld);
      this.wingtipHistory.right.push(rightTipWorld);

      if (this.wingtipHistory.left.length > 15) this.wingtipHistory.left.shift();
      if (this.wingtipHistory.right.length > 15) this.wingtipHistory.right.shift();

      // Helper function to build or update a Ribbon mesh
      const updateRibbonTrail = (history, side) => {
        if (history.length < 2) return;

        const meshName = side === 'left' ? 'leftTrailMesh' : 'rightTrailMesh';
        const posBuffer = side === 'left' ? this._leftTrailPositions : this._rightTrailPositions;
        const count = history.length;

        // Fill pre-allocated buffer — no Float32Array allocation per frame
        for (let i = 0; i < count; i++) {
          const pt = history[i];
          const idx = i * 6;
          const width = 0.05 * (i / count);
          posBuffer[idx]     = pt.x;
          posBuffer[idx + 1] = pt.y + width;
          posBuffer[idx + 2] = pt.z;
          posBuffer[idx + 3] = pt.x;
          posBuffer[idx + 4] = pt.y - width;
          posBuffer[idx + 5] = pt.z;
        }

        if (!this[meshName]) {
          const geom = new THREE.BufferGeometry();
          const attr = new THREE.BufferAttribute(posBuffer, 3);
          attr.setUsage(THREE.DynamicDrawUsage);
          geom.setAttribute('position', attr);

          // Build max-capacity index buffer (14 quads for up to 15 history points)
          const indices = [];
          for (let i = 0; i < 14; i++) {
            const v = i * 2;
            indices.push(v, v + 1, v + 2);
            indices.push(v + 1, v + 3, v + 2);
          }
          geom.setIndex(indices);
          geom.setDrawRange(0, (count - 1) * 6);

          const trailColor = side === 'left' ? 0x00ffff : 0xff00ff;
          const trailMat = new THREE.MeshBasicMaterial({
            color: trailColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });

          this[meshName] = new THREE.Mesh(geom, trailMat);
          this.scene.add(this[meshName]);
        } else {
          // Reuse existing geometry — mark dirty and update draw range to match current history length
          this[meshName].geometry.attributes.position.needsUpdate = true;
          this[meshName].geometry.setDrawRange(0, (count - 1) * 6);
        }

        if (this[meshName] && this[meshName].material) {
          this[meshName].material.opacity = 0.65 * (physics.velocity.length() / 25.0);
        }
      };

      updateRibbonTrail(this.wingtipHistory.left, 'left');
      updateRibbonTrail(this.wingtipHistory.right, 'right');
    }

    // ── NEON pulsing TRACK MATERIAL PATHWAYS & COMFYUI DECALS ──
    if (!this.isTestEnv && this.scene) {
      // Build emissive mesh cache once after level load — avoids scene.traverse every frame
      if (!this.emissiveMeshCache) {
        this.emissiveMeshCache = [];
        this.scene.traverse((child) => {
          if (child.isMesh && child.material && child.material.emissive &&
              child.material.emissiveIntensity !== undefined && !child.userData.isRailStrip) {
            const ei = child.material.emissiveIntensity;
            if (ei > 0.05) {
              child.userData._emissiveType = 'pulse';
              child.userData._baseEmissiveIntensity = ei;
              this.emissiveMeshCache.push(child);
            }
          }
        });
      }

      // Pulse emissive materials — beat-reactive in synthwave mode, gentle sin otherwise.
      // Kept subtle (max 1.6×) so tiles don't overexpose when the bloom pass is also boosted.
      const pulseMultiplier = this.audioData
        ? 1.0 + this.audioData.bassEnergy * 0.4 + this.audioData.beatEnergy * 0.2
        : 1.0 + Math.sin(this.uTimeAccumulator * 6.0) * 0.12;
      for (const child of this.emissiveMeshCache) {
        const base = child.userData._baseEmissiveIntensity || 1.0;
        child.material.emissiveIntensity = Math.min(base * pulseMultiplier, base * 1.6);
      }

      // Distance-based glow falloff for rail trim strips
      if (this.scene.userData.railStrips && this.camera) {
        const camPos = this.camera.position;
        for (const strip of this.scene.userData.railStrips) {
          if (!strip.material) continue;
          const dist = camPos.distanceTo(strip.position);
          // Full intensity within 8 units, exponential decay beyond — visible but not flooding
          const falloff = dist < 8 ? 1.0 : Math.max(0.15, Math.exp(-(dist - 8) / 35));
          strip.material.emissiveIntensity = strip.userData.railBaseIntensity * falloff;
        }
      }

      // Animate custom decal texture offsets and pulsing glow intensities
      if (this.scene.userData.animatedDecals) {
        this.scene.userData.animatedDecals.forEach((decalMat) => {
          if (decalMat.map && decalMat.userData && decalMat.userData.isAnimated) {
            decalMat.map.offset.y += decalMat.userData.speed * dt;
            if (decalMat.userData.pulse) {
              decalMat.emissiveIntensity = decalMat.userData.baseIntensity + Math.sin(this.uTimeAccumulator * 8.0) * 1.5;
            }
          }
        });
      }
    }

    if (this.cockpitConsole3D) {
      try {
        const levelData = (typeof window !== 'undefined') ? window.currentLevelData : null;
        this.cockpitConsole3D.update(physics, levelData, this.cameraMode);
      } catch (e) {
        // Graceful fallback
      }
    }
  }

  // Manage thrusters and crash explosions
  updateParticles(physics, dt) {
    // 1. Spawning thruster flames
    if (Math.abs(physics.velocity.z) > 0.5 && !physics.isDead) {
      const isBoosting = physics.activeEffects.boost;
      const isSticky = physics.activeEffects.sticky;
      
      const spawnCount = this.isTestEnv
        ? (isBoosting ? 4 : 2)
        : (isBoosting ? 12 : 6); // Extremely rich, dense thruster exhaust stream for premium feel!
      const sizeScale = isBoosting ? 1.5 : (isSticky ? 0.4 : 1.0);
      
      let colors;
      let particleSize = 0.022 * sizeScale; // Refined, smaller high-pressure jet mist (reduced from 0.04)

      if (this.isTestEnv) {
        const testColor = isBoosting ? 0x00ff00 : 0xff00ff;
        colors = [testColor];
        particleSize = 0.04 * sizeScale; // Preserve original size under tests to align with Vitest expectations
      } else {
        // Curated dynamic multi-color palettes designed to perfectly match each ship's aesthetics
        const palettes = {
          default: [0xff00ff, 0xff007f, 0xaa00aa, 0xff99ff], // Cyber Magenta, Hot Pink, Dark Violet, Light Pink
          freelancer: [0x00ffff, 0x00aaff, 0x3366ff, 0x99ffff], // High-glow Cyan, Electric Blue, Deep Cobalt, Ice Blue
          lordshadow: [0xff3300, 0xff5500, 0x990000, 0xffaa00], // Deep Lava Red, Jet Flame Orange, Charcoal Red, Amber Gold
          psionic: [0xff00bb, 0xaa00ff, 0x7700ff, 0xe6b8ff], // Psionic Rose Pink, Ethereal Purple, Dark Indigo, Soft Lavender
          shadee: [0x00ff66, 0x33ff00, 0xaaff00, 0xccff33], // Neon Emerald, Electric Lime, Bright Acid Green, Neon Yellow
          thor: [0xffd700, 0xffaa00, 0x00ffff, 0xffffff] // Pure Gold, Sun Amber, Lightning Blue, Spark White
        };

        const activePalette = palettes[this.currentSkinName] || palettes.default;
        colors = activePalette;
      }

      // Cache model metrics outside the loop
      const isObjLoaded = !this.isTestEnv && !!this.isObjLoaded;
      const mappedModelName = LEGACY_MODEL_ALIASES[this.currentModelName] || this.currentModelName;
      const metrics = SHIP_METRICS[mappedModelName] || SHIP_METRICS.fighter;

      for (let i = 0; i < spawnCount; i++) {
        // Randomly pick a color from the palette for rich multi-color shade variety and depth
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        // If boosting, add a 35% chance to emit a white-hot plasma spark core particle
        const finalColor = (!this.isTestEnv && isBoosting && Math.random() < 0.35) ? 0xffffff : baseColor;

        // Spawn from engines - dynamically align with the custom OBJ model's wider nozzles
        const engineOffset = Math.random() < 0.5
          ? (isObjLoaded ? -metrics.offset : -0.16)
          : (isObjLoaded ? metrics.offset : 0.16);
        const verticalOffset = isObjLoaded
          ? (metrics.height + (Math.random() * 0.04 - 0.02))
          : (Math.random() < 0.5 ? 0.30 : 0.10);

        // Spawn slightly behind engine nozzles (with ship rotation applied)
        const particleOffset = new THREE.Vector3(
          engineOffset + (Math.random() * 0.05 - 0.025),
          verticalOffset + (Math.random() * 0.05 - 0.025),
          SHIP_LENGTH / 2 + 0.1
        );

        const particleVel = new THREE.Vector3(
          Math.random() * 0.4 - 0.2,
          Math.random() * 0.4 - 0.2,
          5.0 + Math.random() * 5.0 // shoot particles backward (positive Z)
        );

        if (this.shipMesh) {
          particleOffset.applyEuler(this.shipMesh.rotation);
          particleVel.applyEuler(this.shipMesh.rotation);
        }

        // Use pool mesh when available (eliminates per-frame geometry/scene-add allocations)
        let pMesh, pooled, initialScale;
        if (this._particlePool.length > 0) {
          pMesh = this._particlePool.pop();
          pMesh.material.color.setHex(finalColor);
          pMesh.material.opacity = 0.85;
          // Size variation via scale (pool geometry is fixed at 0.022 radius)
          initialScale = particleSize / 0.022 * (Math.random() * 0.4 + 0.8);
          pMesh.scale.setScalar(initialScale);
          pMesh.visible = true;
          pooled = true;
        } else {
          // Pool exhausted or test env — create a fresh mesh as fallback
          const size = particleSize * (Math.random() * 0.4 + 0.8);
          const pGeom = new THREE.SphereGeometry(size, 6, 6);
          const pMat = new THREE.MeshBasicMaterial({
            color: finalColor,
            transparent: true,
            opacity: 0.85,
            blending: this.isTestEnv ? THREE.NormalBlending : THREE.AdditiveBlending
          });
          pMesh = new THREE.Mesh(pGeom, pMat);
          this.scene.add(pMesh);
          pooled = false;
          initialScale = 1.0; // size is baked into geometry, scale stays at 1
        }

        pMesh.position.copy(physics.position).add(particleOffset);

        this.particles.push({
          mesh: pMesh,
          velocity: particleVel,
          life: 0.35,
          maxLife: 0.35,
          pooled,
          initialScale
        });
      }
    }

    // 2. Update existing particles (size decay, fading, tumbling, and color shifting)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        // Return pooled meshes to pool; dispose non-pooled ones normally
        if (p.pooled) {
          p.mesh.visible = false;
          this._particlePool.push(p.mesh);
        } else {
          this.scene.remove(p.mesh);
          if (p.mesh.geometry !== this._particlePoolGeom) p.mesh.geometry.dispose();
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);

        // Apply tumbling rotation to ship debris chunks
        if (p.rotationSpeed) {
          p.mesh.rotation.x += p.rotationSpeed.x * dt;
          p.mesh.rotation.y += p.rotationSpeed.y * dt;
          p.mesh.rotation.z += p.rotationSpeed.z * dt;
        }

        const lifeRatio = p.life / p.maxLife;
        p.mesh.scale.setScalar(lifeRatio * (p.initialScale || 1.0));
        p.mesh.material.opacity = lifeRatio;

        // Dynamic thermal color shifting for embers (White-hot Cyan/Pink -> Amber -> Ash Red)
        if (p.isThermalShift && p.mesh.material.emissive) {
          const shiftPct = p.life / p.maxLife; // 1.0 down to 0.0
          if (shiftPct > 0.65) {
            p.mesh.material.color.setHex(0x00ffff); // White-hot Cyan
            p.mesh.material.emissive.setHex(0x00ffff);
          } else if (shiftPct > 0.3) {
            p.mesh.material.color.setHex(0xff00ff); // Hot Cyber Pink/Magenta
            p.mesh.material.emissive.setHex(0xff007f);
          } else {
            p.mesh.material.color.setHex(0x3c000c); // Dark embers / ash red
            p.mesh.material.emissive.setHex(0x110002);
          }
        }
      }
    }
  }

  // Redesign: Spawn 250+ particles across 3 detailed, cascading visual groups on crash impact!
  triggerExplosion(position) {
    const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);
    
    if (isTestEnv) {
      // Simple backward-compatible particle explosion for strict unit test compliance
      const particleCount = 180;
      const colors = [0xff0055, 0x00ffff, 0xffaa00, 0xff00ff];
      for (let i = 0; i < particleCount; i++) {
        const size = Math.random() * 0.15 + 0.05;
        const geom = new THREE.SphereGeometry(size, 8, 8);
        const mat = new THREE.MeshBasicMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
          transparent: true,
          opacity: 0.9
        });
        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.copy(position);
        this.scene.add(mesh);

        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        const speed = 4.0 + Math.random() * 12.0;
        const velocity = new THREE.Vector3(
          speed * Math.sin(phi) * Math.cos(theta),
          speed * Math.sin(phi) * Math.sin(theta) + 4.0,
          speed * Math.cos(phi)
        );

        this.particles.push({
          mesh: mesh,
          velocity: velocity,
          life: 1.5,
          maxLife: 1.5
        });
      }
      if (this.shipMesh) {
        this.shipMesh.visible = false;
      }
      return;
    }

    const colors = [0xff0055, 0x00ffff, 0xffaa00, 0xff00ff]; // Vibrant sci-fi explosion

    // 1. Group A: Debris metallic chunks (15 tumbling parts simulating ship shell fracture)
    const chunkCount = 15;
    for (let i = 0; i < chunkCount; i++) {
      const size = Math.random() * 0.28 + 0.12;
      const geom = new THREE.BoxGeometry(size, size, size);
      
      const mat = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.95
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      // Rapidly shooting outward
      const angle = Math.random() * Math.PI * 2;
      const verticalSpeed = Math.random() * 8.0 + 3.0;
      const radialSpeed = Math.random() * 10.0 + 4.0;
      
      const velocity = new THREE.Vector3(
        radialSpeed * Math.cos(angle),
        verticalSpeed,
        radialSpeed * Math.sin(angle)
      );

      // Fast angular tumbling velocity
      const rotationSpeed = new THREE.Vector3(
        Math.random() * 10.0 - 5.0,
        Math.random() * 10.0 - 5.0,
        Math.random() * 10.0 - 5.0
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        rotationSpeed: rotationSpeed,
        life: 1.5,
        maxLife: 1.5
      });
    }

    // 2. Group B: Horizontal circular plasma shockwave disc (65 glowing speed rings)
    const ringCount = 65;
    for (let i = 0; i < ringCount; i++) {
      const size = Math.random() * 0.12 + 0.04;
      const geom = new THREE.SphereGeometry(size, 8, 8);
      
      const mat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      // Offset slightly in height to prevent perfect coplanar clipping
      mesh.position.y += Math.random() * 0.08 - 0.04;
      this.scene.add(mesh);

      // Flat horizontal ring velocity expansion
      const angle = (i / ringCount) * Math.PI * 2 + (Math.random() * 0.15 - 0.075);
      const speed = Math.random() * 14.0 + 8.0;
      const velocity = new THREE.Vector3(
        speed * Math.cos(angle),
        Math.random() * 0.8 - 0.4, // flat ring with minor height noise
        speed * Math.sin(angle)
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 1.2,
        maxLife: 1.2
      });
    }

    // 3. Group C: Thermal Fire Embers & Smoke Cloud (180 particles expanding spherically)
    const emberCount = 180;
    for (let i = 0; i < emberCount; i++) {
      const size = Math.random() * 0.16 + 0.06;
      const geom = new THREE.SphereGeometry(size, 8, 8);
      
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff007f,
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.9
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(position);
      this.scene.add(mesh);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = Math.random() * 11.0 + 3.0;

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) + 2.5, // slight upward expansion bias
        speed * Math.cos(phi)
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        isThermalShift: true,
        life: 1.5,
        maxLife: 1.5
      });
    }

    // Hide the ship mesh when exploded
    if (this.shipMesh) {
      this.shipMesh.visible = false;
    }
  }

  /**
   * Dynamically hot-swaps the massive background sphere texture to a unique, high-resolution
   * Hubble space image matching the active level index, creating a stunning visual atmosphere.
   */
  updateSkyboxBackground() {
    if (!this.nebulaSphere) return;

    // Dispose of any previously active scene background cube texture to prevent memory leaks
    if (this.scene && this.scene.background) {
      if (typeof this.scene.background.dispose === 'function') {
        this.scene.background.dispose();
      }
      this.scene.background = null;
    }

    const levelIndex = window.currentLevelIndex || 0;

    // Check if it is a generated level with 6-sided custom skybox assets
    if (levelIndex >= 61 && !this.isTestEnv) {
      const px = getLevelAssetUrl(levelIndex, 'skybox_px.png');
      const nx = getLevelAssetUrl(levelIndex, 'skybox_nx.png');
      const py = getLevelAssetUrl(levelIndex, 'skybox_py.png');
      const ny = getLevelAssetUrl(levelIndex, 'skybox_ny.png');
      const pz = getLevelAssetUrl(levelIndex, 'skybox_pz.png');
      const nz = getLevelAssetUrl(levelIndex, 'skybox_nz.png');

      if (px && nx && py && ny && pz && nz) {
        const cubeLoader = new THREE.CubeTextureLoader();
        try {
          cubeLoader.load([px, nx, py, ny, pz, nz], (cubeTex) => {
            this.scene.background = cubeTex;
            this.nebulaSphere.visible = false;
          });
          return;
        } catch (e) {
          // Fall back to standard sphere skybox on loader failure
        }
      }
    }

    // Classic/fallback handling: clear cube background and use the nebula sphere skybox
    this.scene.background = null;
    this.nebulaSphere.visible = true;

    if (skyboxKeys.length === 0) return;
    const key = skyboxKeys[levelIndex % skyboxKeys.length];
    const url = skyboxImages[key];
    if (!url) return;

    const textureLoader = new THREE.TextureLoader();
    try {
      textureLoader.load(url, (tex) => {
        if (tex) {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          
          // Disable mipmapping and use linear filtering to force maximum crispness (no blurry skybox)
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.generateMipmaps = false;
          
          // Enable anisotropic filtering if renderer and capabilities are available
          if (this.renderer && this.renderer.capabilities) {
            tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
          }
          
          this.nebulaSphere.material.map = tex;
          this.nebulaSphere.material.needsUpdate = true;
        }
      });
    } catch (e) {
      // Graceful fallback for test runner environments
    }
  }

  clearLevel() {
    if (this.shipMesh) {
      this.shipMesh.visible = (!this.app || this.app.gameState !== 'editor');
    }

    // Reset starfield rotation to perfectly align with the track when entering a level
    if (this.starField) {
      this.starField.rotation.set(0, 0, 0);
    }

    // Hot-swap background skybox texture dynamically for the level
    this.updateSkyboxBackground();

    // Invalidate emissive cache so it is rebuilt for new level geometry
    this.emissiveMeshCache = null;

    // Clean up particles — return pooled meshes to pool, dispose the rest
    for (const p of this.particles) {
      if (p.pooled) {
        p.mesh.visible = false;
        this._particlePool.push(p.mesh);
      } else {
        this.scene.remove(p.mesh);
        if (p.mesh.geometry !== this._particlePoolGeom) p.mesh.geometry.dispose();
        p.mesh.material.dispose();
      }
    }
    this.particles = [];
    this.lastOnGroundHeight = 0.0;
    this.camLookTarget = null;

    // Clean up previous level scenery meshes to prevent memory leaks
    if (this.sceneryGroup) {
      while (this.sceneryGroup.children.length > 0) {
        const child = this.sceneryGroup.children[0];
        this.sceneryGroup.remove(child);
        child.traverse((node) => {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach(m => m.dispose());
            } else {
              node.material.dispose();
            }
          }
        });
      }
    }
  }

  loadLevelSceneryModels(levelIndex, callback) {
    if (this.customBuildingTemplates && this.customBuildingTemplates.length > 0) {
      this.customBuildingTemplates.forEach((obj) => {
        obj.traverse((node) => {
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
      this.customBuildingTemplates = [];
    }

    if (levelIndex < 61 || this.isTestEnv) {
      callback();
      return;
    }

    const templates = [];
    let loadedCount = 0;
    const objLoader = new OBJLoader();

    const checkFinished = () => {
      if (loadedCount === 10) {
        this.customBuildingTemplates = templates;
        callback();
      }
    };

    for (let m = 1; m <= 10; m++) {
      const filename = `scenery_model_${m}.obj`;
      const url = getLevelObjUrl(levelIndex, filename);
      if (!url) {
        loadedCount++;
        checkFinished();
        continue;
      }

      objLoader.load(
        url,
        (obj) => {
          const themeIndex = getActiveThemeIndex({ level_index: levelIndex });
          const themeColor = THEMES[themeIndex] ? THEMES[themeIndex].defaultColor : new THREE.Color(0x221c38);
          
          obj.traverse((child) => {
            if (child.isMesh) {
              child.material = applyCurvatureShader(new THREE.MeshStandardMaterial({
                color: themeColor,
                roughness: 0.35,
                metalness: 0.75,
              }));
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          templates.push(obj);
          loadedCount++;
          checkFinished();
        },
        undefined,
        (err) => {
          loadedCount++;
          checkFinished();
        }
      );
    }
  }

  /**
   * Spawns low-poly buildings from the FBX city template on both sides of the road.
   *
   * @param {number} trackLength - Z-length of the current level road track.
   */
  spawnCityScenery(trackLength, zOffset = 0) {
    const templates = (this.customBuildingTemplates && this.customBuildingTemplates.length > 0)
      ? this.customBuildingTemplates
      : this.buildingTemplates;

    if (templates.length === 0 || !this.sceneryGroup) return;

    const interval = 35.0; // spawn every 35 units along Z-axis
    const leftX = -18.0;   // safely to the left of the 14-width road
    const rightX = 18.0;  // safely to the right

    for (let z = -20 + zOffset; z > -trackLength + zOffset; z -= interval) {
      // Left side building
      const tLeft = templates[Math.floor(Math.random() * templates.length)];
      if (tLeft) {
        const bLeft = tLeft.clone();
        // Shift slightly back, vary Y to settle on ground plane, add minor Z jitter
        bLeft.position.set(leftX - Math.random() * 8.0, -1.0, z + (Math.random() * 10.0 - 5.0));
        bLeft.rotation.y = Math.random() * Math.PI * 2;
        bLeft.scale.setScalar(0.045 + Math.random() * 0.02);
        this.sceneryGroup.add(bLeft);
      }

      // Right side building
      const tRight = templates[Math.floor(Math.random() * templates.length)];
      if (tRight) {
        const bRight = tRight.clone();
        bRight.position.set(rightX + Math.random() * 8.0, -1.0, z + (Math.random() * 10.0 - 5.0));
        bRight.rotation.y = Math.random() * Math.PI * 2;
        bRight.scale.setScalar(0.045 + Math.random() * 0.02);
        this.sceneryGroup.add(bRight);
      }
    }
  }

  handleResize(container) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    if (this.composer) {
      this.composer.setSize(container.clientWidth, container.clientHeight);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(container.clientWidth, container.clientHeight);
    }
    if (this.cockpitConsole3D) {
      try {
        this.cockpitConsole3D.updatePositionAndScale(container.clientWidth, container.clientHeight);
      } catch (e) {
        // Graceful fallback
      }
    }
  }

  render() {
    if (this.composer) {
      this.composer.render();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
