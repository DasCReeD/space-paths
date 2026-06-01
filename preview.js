import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import fighterObjUrl from './fighter1.obj?url';
import uvMapUrl from './uvmap.jpg';
import freelancerSkinUrl from './freelancer.jpg';
import lordshadowSkinUrl from './lordshadow.jpg';
import psionicSkinUrl from './psionic.jpg';
import shadeeSkinUrl from './shadee.jpg';
import thorSkinUrl from './thor.jpg';
import spaceshipHullPlatingUrl from './spaceship_hull_plating.png';
import roadMetallicUrl from './road_metallic_plate.png';

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
  original: fighterObjUrl,
  
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
  
  // Pack B: Majadroid
  ship1: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship1.obj`,
  ship2: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship2.obj`,
  ship3: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship3.obj`,
  ship4: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship4.obj`,
  ship5: `${MAJADROID_BASE}/obj-files/obj-ships/material-01/m1-ship5.obj`
};

export const SHIP_SKINS = {
  // Classic skins
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
    callback(null);
  };
  img.src = url;
}

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

    // Accent colors: Red decals for both Pack A (Corvettes/Frigates) and Pack B (Majadroid) textures
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

export class ShipPreviewEngine {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.shipMesh = null;
    this.animationFrameId = null;
    
    this.currentModelName = 'original';
    this.currentSkinName = 'default';
    this.currentSkinColor = '#ffffff';
    this.skins = SHIP_SKINS;
    
    // Detect test environment
    const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');
    this.isTestEnv = isTestEnv;
  }

  init(container, initialModelName = 'original', initialSkinName = 'default', initialSkinColor = '#ffffff') {
    this.currentModelName = initialModelName;
    this.currentSkinName = initialSkinName;
    this.currentSkinColor = initialSkinColor;
    
    this.scene = new THREE.Scene();
    
    // Sleek space grey background
    this.scene.background = new THREE.Color(0x0a0712);

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0.7, 3.2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    container.appendChild(this.renderer.domElement);

    // Premium gallery lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Neon cyan side light
    const cyanLight = new THREE.DirectionalLight(0x00ffff, 2.0);
    cyanLight.position.set(-5, 3, 2);
    this.scene.add(cyanLight);

    // Neon magenta side light
    const magentaLight = new THREE.DirectionalLight(0xff00ff, 2.0);
    magentaLight.position.set(5, 3, 2);
    this.scene.add(magentaLight);

    // Subtle overhead spotlight
    const topLight = new THREE.DirectionalLight(0xffffff, 1.2);
    topLight.position.set(0, 8, -2);
    this.scene.add(topLight);

    // Create the ship preview mesh
    this.createPreviewShip(initialModelName, initialSkinName, initialSkinColor);

    // Start animation loop
    this.animate();
  }

  optimizeShipTexture(texture) {
    if (!texture) return;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
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

  loadModelAndTexture(modelName, skinName, colorHex, onComplete) {
    if (typeof colorHex === 'function') {
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

    const modelUrl = SHIP_MODELS[modelName] || fighterObjUrl;
    const isFbx = modelUrl.toLowerCase().includes('.fbx') || modelUrl.toLowerCase().includes('fbx-files') || modelUrl.toLowerCase().includes('battle');
    
    const applyTextureToModel = (texture, obj) => {
      if (texture) {
        this.optimizeShipTexture(texture);
      }
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

    const skinUrl = this.skins[skinName] || uvMapUrl;

    if (colorHex && colorHex.toLowerCase() !== '#ffffff') {
      const isPackA = modelName.startsWith('corvette') || modelName.startsWith('frigate');
      getCachedImage(skinUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, colorHex, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
          canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadGeometry(canvasTexture);
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

  createPreviewShip(modelName, skinName, colorHex) {
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
    
    this.shipMesh = new THREE.Group();
    this.scene.add(this.shipMesh);

    try {
      this.loadModelAndTexture(modelName, skinName, colorHex, (obj) => {
        obj.position.set(0, 0, 0);
        const metrics = SHIP_METRICS[modelName] || SHIP_METRICS.original;
        const rotationY = metrics.rotationY !== undefined ? metrics.rotationY : -Math.PI / 2;
        obj.rotation.y = rotationY; // face forward

        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);

        const scaleFactor = 1.4 / size.x;
        obj.scale.setScalar(scaleFactor);

        obj.updateMatrixWorld(true);
        const finalBox = new THREE.Box3().setFromObject(obj);
        const finalCenter = new THREE.Vector3();
        finalBox.getCenter(finalCenter);

        // Center visual pivot point
        obj.position.x = -finalCenter.x;
        obj.position.y = -finalCenter.y;
        obj.position.z = -finalCenter.z;

        this.shipMesh.add(obj);

        this.camera.lookAt(new THREE.Vector3(0, 0, 0));
      });
    } catch (e) {
      // Graceful fallback
    }
  }

  changeModel(modelName, skinName, colorHex) {
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

    if (this.shipMesh) {
      this.scene.remove(this.shipMesh);
      this.shipMesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
      this.shipMesh = null;
    }

    this.createPreviewShip(modelName, skinName, colorHex);
  }

  changeSkin(skinName, colorHex) {
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
      if (this.shipMesh) {
        this.shipMesh.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.map = texture;
            child.material.needsUpdate = true;
          }
        });
      }
    };

    const skinUrl = this.skins[skinName] || uvMapUrl;

    if (colorHex && colorHex.toLowerCase() !== '#ffffff') {
      const isPackA = this.currentModelName.startsWith('corvette') || this.currentModelName.startsWith('frigate');
      
      getCachedImage(skinUrl, (img) => {
        if (img) {
          const canvas = swapTextureColor(img, colorHex, isPackA);
          const canvasTexture = new THREE.CanvasTexture(canvas);
          canvasTexture.wrapS = THREE.ClampToEdgeWrapping;
          canvasTexture.wrapT = THREE.ClampToEdgeWrapping;
          applyLoadedTexture(canvasTexture);
        }
      });
    } else {
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
        // Graceful fallback
      }
    }
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    if (this.shipMesh) {
      // Spin slowly around Y axis
      this.shipMesh.rotation.y += 0.012;
      
      // Add a very gentle pitching float effect to look hover-like
      this.shipMesh.position.y = Math.sin(performance.now() * 0.0015) * 0.04;
    }

    this.render();
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  handleResize(container) {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  destroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.renderer) {
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer.dispose();
      this.renderer = null;
    }

    if (this.scene) {
      this.scene.traverse((node) => {
        if (node.geometry) node.geometry.dispose();
        if (node.material) {
          if (Array.isArray(node.material)) {
            node.material.forEach(m => m.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
      this.scene = null;
    }

    this.camera = null;
    this.shipMesh = null;
  }
}
