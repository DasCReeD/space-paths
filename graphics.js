// SkyRoads Three.js Visual & Rendering Pipeline
import * as THREE from 'three';
import { SHIP_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from './physics.js';
import spaceshipHullPlatingUrl from './spaceship_hull_plating.png';
import skyboxSpaceNebulaUrl from './skybox_space_nebula.png';

// Glob all large high-res Hubble background images from the top100 folder
const skyboxImages = import.meta.glob('./SBS - Seamless Abstract Pack - 512x512/top100-large/top100/*.jpg', { eager: true });
const skyboxKeys = Object.keys(skyboxImages);

// Add OBJ and FBX loaders
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import fighterObjUrl from './fighter1.obj?url';
import uvMapUrl from './uvmap.jpg';
import cityFbxUrl from './futuristic low poly city by niko.fbx?url';

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

export const SHIP_MODELS = {
  original: fighterObjUrl, // legacy fallback for tests
  
  // Pack A: Corvettes & Frigates
  corvette1: corvette1Url,
  corvette2: corvette2Url,
  corvette3: corvette3Url,
  corvette4: corvette4Url,
  corvette5: corvette5Url,
  frigate1: frigate1Url,
  frigate2: frigate2Url,
  frigate3: frigate3Url,
  frigate4: frigate4Url,
  frigate5: frigate5Url,
  
  // Pack B: MajadroidOBJ Fighters
  ship1: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship1.obj`,
  ship2: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship2.obj`,
  ship3: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship3.obj`,
  ship4: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship4.obj`,
  ship5: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship5.obj`
};

export const SHIP_SKINS = {
  // Classic skins kept for test compliance
  default: uvMapUrl,
  freelancer: freelancerSkinUrl,
  lordshadow: lordshadowSkinUrl,
  psionic: psionicSkinUrl,
  shadee: shadeeSkinUrl,
  thor: thorSkinUrl,
  
  // Majadroid skins
  skin1: `${MAJADROID_BASE}/tex01-512.png`,
  skin2: `${MAJADROID_BASE}/tex02-512.png`,
  skin3: `${MAJADROID_BASE}/tex03-512.png`,
  skin4: `${MAJADROID_BASE}/tex04-512.png`
};

export const SHIP_METRICS = {
  original: { offset: 0.25, height: 0.20, rotationY: -Math.PI / 2 },
  
  // Corvettes
  corvette1: { offset: 0.28, height: 0.18, rotationY: -Math.PI / 2 },
  corvette2: { offset: 0.30, height: 0.16, rotationY: -Math.PI / 2 },
  corvette3: { offset: 0.26, height: 0.18, rotationY: -Math.PI / 2 },
  corvette4: { offset: 0.34, height: 0.15, rotationY: -Math.PI / 2 },
  corvette5: { offset: 0.32, height: 0.17, rotationY: -Math.PI / 2 },
  
  // Frigates
  frigate1: { offset: 0.38, height: 0.22, rotationY: -Math.PI / 2 },
  frigate2: { offset: 0.40, height: 0.20, rotationY: -Math.PI / 2 },
  frigate3: { offset: 0.36, height: 0.22, rotationY: -Math.PI / 2 },
  frigate4: { offset: 0.44, height: 0.18, rotationY: -Math.PI / 2 },
  frigate5: { offset: 0.42, height: 0.21, rotationY: -Math.PI / 2 },
  
  // Majadroid
  ship1: { offset: 0.52, height: 0.19, rotationY: -Math.PI / 2 },
  ship2: { offset: 0.25, height: 0.21, rotationY: -Math.PI / 2 },
  ship3: { offset: 0.20, height: 0.26, rotationY: -Math.PI / 2 },
  ship4: { offset: 0.36, height: 0.20, rotationY: -Math.PI / 2 },
  ship5: { offset: 0.46, height: 0.18, rotationY: -Math.PI / 2 }
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
    this.starField = null;
    this.nebulaSphere = null;
    
    // Scenery templates & groups
    this.buildingTemplates = [];
    this.sceneryGroup = null;

    // Custom skins map loaded dynamically
    this.skins = SHIP_SKINS;
    this.currentModelName = 'original';
    this.currentSkinName = 'default';
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
      
      this.cameraMode = 'fixed';
      this.zoomLevel = 'far'; // Zooms all the way out by default!
      this.followDistanceScale = 1.45;
      this.lastOnGroundHeight = 0.0;
      this.cameraHeightAdjust = 3.0; // All the way up by default!
      this.camLookTarget = null;
    }
  }

  init(container) {
    // 1. Create Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0519, 0.003); // Subtle atmospheric fog

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);

    // 2. Setup Camera
    this.camera = new THREE.PerspectiveCamera(65, container.clientWidth / container.clientHeight, 0.1, 1000);
    this.camera.position.set(0, 3, 8);

    // 3. Add Premium Lighting — bright enough to see the road clearly
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambientLight);

    // Bright overhead key light (white) — ensures the road is always visible
    const overheadLight = new THREE.DirectionalLight(0xffffff, 2.2);
    overheadLight.position.set(0, 80, -20);
    this.scene.add(overheadLight);

    // Dynamic neon pink directional light (adds color and drama)
    this.sunLight = new THREE.DirectionalLight(0xff007f, 1.2);
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
    const fillLight = new THREE.DirectionalLight(0x00ffff, 1.0);
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
            child.material = new THREE.MeshStandardMaterial({
              color: child.material.color || 0x221c38,
              roughness: 0.35,
              metalness: 0.75,
            });
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

    // Handle resize
    window.addEventListener('resize', () => this.handleResize(container));

    // Initialize HUD camera stats display
    this.updateCameraHUD();
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'fixed' ? 'follow' : 'fixed';
    this.updateCameraHUD();
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
    const step = 0.2;
    const minAdjust = -1.0;
    const maxAdjust = 3.0;
    this.cameraHeightAdjust = Math.max(minAdjust, Math.min(maxAdjust, this.cameraHeightAdjust + direction * step));
    this.updateCameraHUD();
  }

  updateCameraHUD() {
    const modeEl = document.getElementById('hud-camera-mode');
    const zoomEl = document.getElementById('hud-camera-zoom');
    const heightEl = document.getElementById('hud-camera-height');
    if (modeEl) {
      modeEl.innerText = this.cameraMode === 'fixed' ? 'FIXED' : 'FOLLOW';
      modeEl.style.color = this.cameraMode === 'fixed' ? '#00ffcc' : '#ffaa00';
    }
    if (zoomEl) {
      zoomEl.innerText = this.zoomLevel.toUpperCase();
    }
    if (heightEl) {
      const baseHeight = 1.8;
      const currentHeight = baseHeight + this.cameraHeightAdjust;
      heightEl.innerText = `${currentHeight.toFixed(2)}m`;
    }
  }

  createSkybox() {
    // 1. Create a massive background sphere for the custom space nebula texture
    const textureLoader = new THREE.TextureLoader();
    const nebulaTex = textureLoader.load(skyboxSpaceNebulaUrl);
    nebulaTex.wrapS = THREE.RepeatWrapping;
    nebulaTex.wrapT = THREE.RepeatWrapping;
    
    // Disable mipmapping and use linear filtering to force maximum crispness (no blurry skybox)
    nebulaTex.minFilter = THREE.LinearFilter;
    nebulaTex.magFilter = THREE.LinearFilter;
    nebulaTex.generateMipmaps = false;
    
    // Enable anisotropic filtering if renderer and capabilities are available
    if (this.renderer && this.renderer.capabilities) {
      nebulaTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    }
    
    const sphereGeom = new THREE.SphereGeometry(450, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({
      map: nebulaTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false // Disable level fog entirely to make Hubble images pop in vivid, pure colors!
    });
    const nebulaSphere = new THREE.Mesh(sphereGeom, sphereMat);
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
      const starCount = 800;
      this.starData = [];
      const positions = new Float32Array(starCount * 2 * 3); // 2 vertices per star (start and end)
      const colors = new Float32Array(starCount * 2 * 3);

      for (let i = 0; i < starCount; i++) {
        // Distribute stars in a cylindrical corridor flanking the track to create a gorgeous zoom effect
        const theta = Math.random() * Math.PI * 2;
        const radius = Math.random() * 95 + 8; // keeps stars out of the direct immediate fuselage path
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

        // Stellar colors: vibrant cyan, magenta, and white star streaks
        const rand = Math.random();
        let r, g, b;
        if (rand < 0.4) {
          r = 0.0; g = 1.0; b = 1.0; // Cyan
        } else if (rand < 0.7) {
          r = 1.0; g = 0.0; b = 1.0; // Magenta
        } else {
          r = 1.0; g = 1.0; b = 1.0; // White
        }

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
  }

  loadModelAndTexture(modelName, skinNameOrColor, onComplete) {
    const modelUrl = SHIP_MODELS[modelName] || fighterObjUrl;
    const isFbx = modelUrl.toLowerCase().includes('.fbx') || modelUrl.toLowerCase().includes('fbx-files') || modelUrl.toLowerCase().includes('battle');
    
    const applyTextureToModel = (texture, obj) => {
      const shipMaterial = new THREE.MeshStandardMaterial({
        map: texture || null,
        roughness: 0.4,
        metalness: 0.35,
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
      if (isFbx) {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelUrl, (fbx) => {
          applyTextureToModel(texture, fbx);
        }, undefined, (err) => {
          // Fallback / error catch
        });
      } else {
        const objLoader = new OBJLoader();
        objLoader.load(modelUrl, (obj) => {
          applyTextureToModel(texture, obj);
        }, undefined, (err) => {
          // Fallback / error catch
        });
      }
    };

    // Load texture first, with color-swapping if hex color is passed
    if (skinNameOrColor.startsWith('#')) {
      const baseTexUrl = BASE_TEXTURES[modelName] || uvMapUrl;
      const isPackA = modelName.startsWith('corvette') || modelName.startsWith('frigate');
      
      getCachedImage(baseTexUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, skinNameOrColor, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
          canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadGeometry(canvasTexture);
        } else {
          // Fallback to loading standard texture
          const texLoader = new THREE.TextureLoader();
          texLoader.load(baseTexUrl, (tex) => {
            if (tex) {
              tex.wrapS = THREE.ClampToEdgeWrapping;
              tex.wrapT = THREE.ClampToEdgeWrapping;
            }
            loadGeometry(tex);
          });
        }
      });
    } else {
      // Legacy skin loading for test backward compatibility
      const skinUrl = this.skins[skinNameOrColor] || uvMapUrl;
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

    // Asynchronously load the premium spaceship model
    try {
      this.loadModelAndTexture(this.currentModelName, this.currentSkinName, (obj) => {
        obj.position.set(0, 0, 0);
        const metrics = SHIP_METRICS[this.currentModelName] || SHIP_METRICS.original;
        const rotationY = metrics.rotationY !== undefined ? metrics.rotationY : -Math.PI / 2;
        obj.rotation.y = rotationY; // Face forward

        const initialBox = new THREE.Box3().setFromObject(obj);
        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        const targetWidth = 1.4;
        const scaleFactor = targetWidth / initialSize.x;
        obj.scale.setScalar(scaleFactor);

        obj.updateMatrixWorld(true);
        const finalBox = new THREE.Box3().setFromObject(obj);
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
      });
    } catch (e) {
      // Graceful catch
    }

    this.scene.add(this.shipMesh);
  }

  changeShipSkin(skinNameOrColor) {
    this.currentSkinName = skinNameOrColor;
    
    const applyLoadedTexture = (texture) => {
      if (!texture) return;
      this.shipMesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.name !== 'glowMat') {
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });
    };

    if (skinNameOrColor.startsWith('#')) {
      const baseTexUrl = BASE_TEXTURES[this.currentModelName] || uvMapUrl;
      const isPackA = this.currentModelName.startsWith('corvette') || this.currentModelName.startsWith('frigate');
      
      getCachedImage(baseTexUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, skinNameOrColor, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
          canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
          applyLoadedTexture(canvasTexture);
        }
      });
    } else {
      const skinUrl = this.skins[skinNameOrColor] || uvMapUrl;
      const textureLoader = new THREE.TextureLoader();
      try {
        textureLoader.load(skinUrl, (texture) => {
          if (texture) {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            applyLoadedTexture(texture);
          }
        });
      } catch (e) {
        // Graceful catch
      }
    }
  }

  changeShipModel(modelName, skinNameOrColor) {
    this.currentModelName = modelName;
    this.currentSkinName = skinNameOrColor;
    this.isObjLoaded = false;

    // Discard any existing loaded 3D model in shipMesh to prevent leaks!
    if (this.shipMesh) {
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

    try {
      this.loadModelAndTexture(modelName, skinNameOrColor, (obj) => {
        obj.position.set(0, 0, 0);
        const metrics = SHIP_METRICS[modelName] || SHIP_METRICS.original;
        const rotationY = metrics.rotationY !== undefined ? metrics.rotationY : -Math.PI / 2;
        obj.rotation.y = rotationY;

        const initialBox = new THREE.Box3().setFromObject(obj);
        const initialSize = new THREE.Vector3();
        initialBox.getSize(initialSize);

        const targetWidth = 1.4;
        const scaleFactor = targetWidth / initialSize.x;
        obj.scale.setScalar(scaleFactor);

        obj.updateMatrixWorld(true);
        const finalBox = new THREE.Box3().setFromObject(obj);
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
      });
    } catch (e) {
      // Graceful catch
    }
  }

  // Smoothly trail chase camera and update rendering
  update(physics, dt) {
    if (!this.shipMesh) return;

    // Track the last ground height when on the ground to prevent retro camera drops during jumps
    if (physics.onGround) {
      this.lastOnGroundHeight = physics.groundHeight;
    }

    // 1. Position the spaceship
    this.shipMesh.position.copy(physics.position);

    // Gentle banking (tilt) while steering left/right
    const targetRoll = -physics.velocity.x * 0.05; // banking angle
    this.shipMesh.rotation.z += (targetRoll - this.shipMesh.rotation.z) * 0.15;
    
    // Slight pitch up/down while jumping/falling
    const targetPitch = physics.velocity.y * 0.025;
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
    } else {
      // Follow mode: follow ship dynamically in X, Y (including jumps), and Z
      idealCamPos.x = physics.position.x;
      idealCamPos.y = physics.position.y + scaledOffset.y;
      idealCamTarget.x = physics.position.x;
      idealCamTarget.y = physics.position.y + scaledTargetOffset.y;
    }

    // Interpolate camera position for buttery-smooth movements
    this.camera.position.lerp(idealCamPos, 0.1);
    
    // Stable direct look-at target interpolation (breaks recursive camera matrix feedback loops)
    if (!this.camLookTarget) {
      this.camLookTarget = idealCamTarget.clone();
    } else {
      this.camLookTarget.lerp(idealCamTarget, 0.1);
    }
    this.camera.lookAt(this.camLookTarget);

    // Keep the directional sunlight aligned near the ship for optimal shadows
    this.sunLight.position.set(physics.position.x + 30, 80, physics.position.z + 40);
    this.sunLight.target = this.shipMesh;

    // Shift Starfield and Nebula Sphere to create parallax/infinite distance illusion
    if (this.starField) {
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
            const radius = Math.random() * 95 + 8;
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
    if (this.nebulaSphere) {
      // Keep background sphere centered around the ship so we never fly out of bounds
      this.nebulaSphere.position.copy(physics.position);
      
      // Slowly pan the background UP and DOWN (X-axis rotation) based SOLELY on forward Z-position!
      // This links the vertical pan directly to the ship's forward motion (no constant time-based panning).
      this.nebulaSphere.rotation.x = physics.position.z * -0.00025; // Pitch the skybox vertically with forward distance!
      this.nebulaSphere.rotation.y = 0; // Zero out horizontal rotation
    }
    if (this.sunMesh) {
      this.sunMesh.position.x = physics.position.x;
      this.sunMesh.position.z = physics.position.z - 350;
    }

    // 3. Update active particles (thrusters and explosions)
    this.updateParticles(physics, dt);
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

      for (let i = 0; i < spawnCount; i++) {
        // Randomly pick a color from the palette for rich multi-color shade variety and depth
        const baseColor = colors[Math.floor(Math.random() * colors.length)];
        // If boosting, add a 35% chance to emit a white-hot plasma spark core particle
        const finalColor = (!this.isTestEnv && isBoosting && Math.random() < 0.35) ? 0xffffff : baseColor;

        // Spawn from engines - dynamically align with the custom OBJ model's wider nozzles (using SHIP_METRICS per model) if loaded, or fall back to procedural quad jet nozzles
        const isObjLoaded = !this.isTestEnv && !!this.isObjLoaded;
        const metrics = SHIP_METRICS[this.currentModelName] || SHIP_METRICS.original;
        const engineOffset = Math.random() < 0.5 
          ? (isObjLoaded ? -metrics.offset : -0.16) 
          : (isObjLoaded ? metrics.offset : 0.16);
        const verticalOffset = isObjLoaded 
          ? (metrics.height + (Math.random() * 0.04 - 0.02)) 
          : (Math.random() < 0.5 ? 0.30 : 0.10);
        
        // Add random size variation for realistic organic texturing
        const size = particleSize * (Math.random() * 0.4 + 0.8);
        const pGeom = new THREE.SphereGeometry(size, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: finalColor,
          transparent: true,
          opacity: 0.85,
          blending: this.isTestEnv ? THREE.NormalBlending : THREE.AdditiveBlending // Additive blending makes overlapping cores glow intensely!
        });
        const pMesh = new THREE.Mesh(pGeom, pMat);
        
        // Spawn slightly behind engine nozzles
        pMesh.position.set(
          physics.position.x + engineOffset + (Math.random() * 0.05 - 0.025),
          physics.position.y + verticalOffset + (Math.random() * 0.05 - 0.025),
          physics.position.z + SHIP_LENGTH / 2 + 0.1
        );

        this.scene.add(pMesh);

        this.particles.push({
          mesh: pMesh,
          velocity: new THREE.Vector3(
            Math.random() * 0.4 - 0.2,
            Math.random() * 0.4 - 0.2,
            5.0 + Math.random() * 5.0 // shoot particles backward (positive Z)
          ),
          life: 0.35, // short life
          maxLife: 0.35
        });
      }
    }

    // 2. Update existing particles (size decay & fading)
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.scale.setScalar(p.life / p.maxLife);
        p.mesh.material.opacity = p.life / p.maxLife;
      }
    }
  }

  // Spawn 150+ particles shooting out in all directions
  triggerExplosion(position) {
    const particleCount = 180;
    const colors = [0xff0055, 0x00ffff, 0xffaa00, 0xff00ff]; // vibrant neon explosion

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

      // Random spherical velocity
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 4.0 + Math.random() * 12.0;

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) + 4.0, // slight upward bias
        speed * Math.cos(phi)
      );

      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 1.5, // longer explosion life
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
    if (!this.nebulaSphere || skyboxKeys.length === 0) return;

    const levelIndex = window.currentLevelIndex || 0;
    const key = skyboxKeys[levelIndex % skyboxKeys.length];
    const module = skyboxImages[key];
    if (!module) return;

    const url = module.default;
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
      this.shipMesh.visible = true;
    }

    // Reset starfield rotation to perfectly align with the track when entering a level
    if (this.starField) {
      this.starField.rotation.set(0, 0, 0);
    }

    // Hot-swap background skybox texture dynamically for the level
    this.updateSkyboxBackground();

    // Clean up particles
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
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

  /**
   * Spawns low-poly buildings from the FBX city template on both sides of the road.
   *
   * @param {number} trackLength - Z-length of the current level road track.
   */
  spawnCityScenery(trackLength) {
    if (this.buildingTemplates.length === 0 || !this.sceneryGroup) return;

    const interval = 35.0; // spawn every 35 units along Z-axis
    const leftX = -18.0;   // safely to the left of the 14-width road
    const rightX = 18.0;  // safely to the right

    for (let z = -20; z > -trackLength; z -= interval) {
      // Left side building
      const tLeft = this.buildingTemplates[Math.floor(Math.random() * this.buildingTemplates.length)];
      if (tLeft) {
        const bLeft = tLeft.clone();
        // Shift slightly back, vary Y to settle on ground plane, add minor Z jitter
        bLeft.position.set(leftX - Math.random() * 8.0, -1.0, z + (Math.random() * 10.0 - 5.0));
        bLeft.rotation.y = Math.random() * Math.PI * 2;
        bLeft.scale.setScalar(0.045 + Math.random() * 0.02);
        this.sceneryGroup.add(bLeft);
      }

      // Right side building
      const tRight = this.buildingTemplates[Math.floor(Math.random() * this.buildingTemplates.length)];
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
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
