// SkyRoads Level Loader & 3D Geometry Generator (Three.js)
import * as THREE from 'three';
import roadMetallicPlateUrl from './road_metallic_plate.png';

// Eagerly glob all color-divided seamless abstract textures recursively from subfolders
const colorTextures = import.meta.glob('./SBS - Seamless Abstract Pack - 512x512/PNG/**/*.png', { eager: true });

// Seamless road tile texture loading with robust fallback
const textureLoader = new THREE.TextureLoader();
let roadTexture = null;
try {
  roadTexture = textureLoader.load(roadMetallicPlateUrl, (texture) => {
    if (texture) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
    }
  });
} catch (e) {
  // Graceful fallback for test environments or failed load
}

// Tile width and Z-length configuration
export const TILE_WIDTH = 2.0;
export const TILE_LENGTH = 4.0;
export const ROAD_WIDTH_LANES = 7;
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

// Number of rows to process per async chunk before yielding
const CHUNK_SIZE = 50;

/**
 * Get a Three.js Color from the level palette at the given index.
 * Falls back to grey if the index is out of range.
 */
function getPaletteColor(palette, colorIndex) {
  let idx = colorIndex;
  // Index 0 in level formats represents "use default top road color", which maps to index 11
  // We only intercept this if the palette is fully loaded (length > 11) to avoid breaking test fixtures
  if (idx === 0 && palette && palette.length > 11) {
    idx = 11;
  }
  if (palette && idx < palette.length) {
    const [r, g, b] = palette[idx];
    return new THREE.Color(r / 255, g / 255, b / 255);
  }
  return new THREE.Color(0.5, 0.5, 0.5);
}

/**
 * Determine the tile behavior from its top_color index.
 * Returns { behavior, emissiveGlow, glowColor } or null values if no special behavior.
 */
function classifyTileBehavior(topColor) {
  const BEHAVIORS = {
    3:  { behavior: 'sticky',    glowColor: new THREE.Color(0.0, 0.25, 0.0) },
    9:  { behavior: 'slippery',  glowColor: new THREE.Color(0.2, 0.2, 0.2) },
    10: { behavior: 'refill',    glowColor: new THREE.Color(0.0, 0.5, 1.0) },
    11: { behavior: 'boost',     glowColor: new THREE.Color(0.0, 1.0, 0.0) },
    13: { behavior: 'burning',   glowColor: new THREE.Color(1.0, 0.0, 0.0) },
  };

  const entry = BEHAVIORS[topColor];
  if (entry) {
    return { behavior: entry.behavior, emissiveGlow: true, glowColor: entry.glowColor };
  }
  return { behavior: null, emissiveGlow: false, glowColor: null };
}

/**
 * Calculate tile height and vertical position from block flags.
 * Returns { height, yPos, isObstacle }.
 */
function computeTileGeometry(tile) {
  if (tile.full && tile.half) {
    return { height: 3.0, yPos: 1.5, isObstacle: true };
  }
  if (tile.full) {
    return { height: 2.0, yPos: 1.0, isObstacle: true };
  }
  if (tile.half) {
    return { height: 1.0, yPos: 0.5, isObstacle: true };
  }
  return { height: 0.45, yPos: -0.225, isObstacle: false };
}

const textureCache = new Map();

/**
 * Load a premium color-divided seamless abstract pattern texture from the user's
 * downloaded folder, mapping it organically to Level 2's color palette (and all other levels).
 */
function getSeamlessTexture(colorIndex) {
  if (typeof document === 'undefined') return null;

  // Map each VGA palette color index (0-15) to its closest color-divided folder
  const folderMapping = {
    0: 'Light',   // Default obstacle color (VGA 11 fallback, light blue/cyan)
    1: 'Green',   // Light green
    2: 'Green',   // Green main road track blocks of Level 2!
    3: 'Light',   // Cyan/teal
    4: 'Red',     // Red
    5: 'Purple',  // Purple
    6: 'Orange',  // Orange/brown
    7: 'Light',   // Light gray
    8: 'Dark',    // Dark gray
    9: 'Dark',    // Blue
    10: 'Green',  // Lime green
    11: 'Light',  // Light blue side obstacle blocks of Level 2!
    12: 'Red',    // Light red
    13: 'Purple', // Pink/purple
    14: 'Orange', // Yellow/orange
    15: 'Light',  // Light grey/white
  };
  const folder = folderMapping[colorIndex] || 'Dark';

  // Choose a distinct pattern texture (1 to 13) inside the folder based on the colorIndex,
  // ensuring different block types load completely different abstract geometries!
  const patternIndex = (colorIndex % 13) + 1;
  const patternStr = String(patternIndex).padStart(2, '0');
  const key = `./SBS - Seamless Abstract Pack - 512x512/PNG/${folder}/texture_${patternStr}.png`;

  const module = colorTextures[key];
  if (!module) return null;

  const url = module.default;
  if (!url) return null;

  const cacheKey = `seamless_${colorIndex}_${url}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  try {
    const texture = textureLoader.load(url, (tex) => {
      if (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Narrow repeat aspect to preserve the perfect square abstract design on long rectangular 3D blocks (2x4)
        tex.repeat.set(1.5, 3.0);
        tex.anisotropy = 16;
      }
    });
    textureCache.set(cacheKey, texture);
    return texture;
  } catch (e) {
    return null;
  }
}

/**

 * Generate a high-fidelity procedural texture canvas for each block type/behavior,
 * matching the user's beautiful geometric and abstract pattern specifications.
 */
function getProceduralTexture(behavior, baseColor, colorIndex) {
  // Graceful check for test runners or environments where document/canvas is unavailable
  if (typeof document === 'undefined') return null;

  const cacheKey = `${behavior}_${baseColor.getHexString()}_${colorIndex}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  
  // 1. Fill base solid color
  const hex = "#" + baseColor.getHexString();
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 256, 256);

  // 2. Add dynamic brushed sci-fi metal grain noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 25 + 5, 1);
  }
  ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 25 + 5, 1);
  }

  // 3. Draw a unique geometric texture pattern for each block color type
  if (colorIndex === 0 || colorIndex === 11) {
    // Interlocking concentric glowing circles (glowing light blue overlaps for Level 2 side obstacles)
    // Draw thick dark black backing circles first to create immense contrast
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 9;
    for (let x = 0; x <= 256; x += 64) {
      for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 32, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Draw the bright glowing cyan overlapping circles
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 4;
    for (let x = 0; x <= 256; x += 64) {
      for (let y = 0; y <= 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 32, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 230, 255, 0.25)';
        ctx.fill();
      }
    }
    // Inner core black backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Inner core high-contrast white rings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let x = 32; x < 256; x += 64) {
      for (let y = 32; y < 256; y += 64) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  } 
  else if (colorIndex === 1 || colorIndex === 12) {
    // Speed-chevron patterns
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw thick black backing chevrons first
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let yOffset = -64; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(32, yOffset + 64);
      ctx.lineTo(128, yOffset + 16);
      ctx.lineTo(224, yOffset + 64);
      ctx.stroke();
    }
    
    // Draw bright neon yellow forward chevrons
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 8;
    for (let yOffset = -64; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(32, yOffset + 64);
      ctx.lineTo(128, yOffset + 16);
      ctx.lineTo(224, yOffset + 64);
      ctx.stroke();
    }
    
    // Draw staggered black inner chevrons
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    for (let yOffset = -32; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(48, yOffset + 50);
      ctx.lineTo(128, yOffset + 18);
      ctx.lineTo(208, yOffset + 50);
      ctx.stroke();
    }
    
    // Draw staggered neon orange inner highlights
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 3;
    for (let yOffset = -32; yOffset < 256; yOffset += 96) {
      ctx.beginPath();
      ctx.moveTo(48, yOffset + 50);
      ctx.lineTo(128, yOffset + 18);
      ctx.lineTo(208, yOffset + 50);
      ctx.stroke();
    }
  }
  else if (colorIndex === 3 || colorIndex === 6) {
    // Woven checkerboard fabric mesh (sticky mesh)
    // Draw black mesh backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 16;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Draw bright solid forest-green grid lines
    ctx.strokeStyle = '#00aa33';
    ctx.lineWidth = 10;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Highlighting threads with bright neon green
    ctx.strokeStyle = '#66ff66';
    ctx.lineWidth = 3;
    for (let i = 16; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke();
    }
    // Add bright orange knots for incredible high-contrast pop!
    ctx.fillStyle = '#ffaa00';
    for (let x = 0; x <= 256; x += 32) {
      for (let y = 0; y <= 256; y += 32) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }
  }
  else if (colorIndex === 8 || colorIndex === 9) {
    // Icy diamond lattice with cyan core nodes (slippery)
    // Draw thick black diagonal backing lines
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 7;
    for (let i = -256; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
    }
    // Draw glowing bright white diagonal lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = -256; i <= 256; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 256, 256); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i + 256, 0); ctx.lineTo(i, 256); ctx.stroke();
    }
    // Large cyan core nodes with black outlines
    for (let x = 0; x <= 256; x += 32) {
      for (let y = 0; y <= 256; y += 32) {
        if ((x + y) % 64 === 0) {
          ctx.beginPath();
          ctx.arc(x, y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fillStyle = '#00ffff';
          ctx.fill();
        }
      }
    }
  }
  else if (colorIndex === 4 || colorIndex === 13) {
    // Warning hazard cracks and stripes (burning hazard)
    // Solid fill background
    ctx.fillStyle = '#ff1a1a';
    ctx.fillRect(0, 0, 256, 256);
    
    // Draw pure black solid warning hazard stripes
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 24;
    for (let i = -256; i <= 256 * 2; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - 256, 256);
      ctx.stroke();
    }
    
    // Draw pure yellow hazard highlights
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 8;
    for (let i = -256; i <= 256 * 2; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i + 16, 0);
      ctx.lineTo(i - 256 + 16, 256);
      ctx.stroke();
    }
    
    // Black backing flame cracks
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(10, 20); ctx.lineTo(60, 120); ctx.lineTo(120, 80); ctx.lineTo(180, 210); ctx.lineTo(240, 140);
    ctx.stroke();
    
    // Glowing neon orange/pink flame cracks
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 20); ctx.lineTo(60, 120); ctx.lineTo(120, 80); ctx.lineTo(180, 210); ctx.lineTo(240, 140);
    ctx.stroke();
  }
  else if (colorIndex === 7 || colorIndex === 15) {
    // Chevron zigzags pattern
    // Black backings
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 12;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + 16);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + 16);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    // Bright white/magenta lines
    ctx.strokeStyle = '#ff33cc';
    ctx.lineWidth = 4;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + 16);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + 16);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    for (let y = -32; y < 256 + 32; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y + 16);
      ctx.lineTo(128, y);
      ctx.lineTo(192, y + 16);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
  }
  else if (colorIndex === 14) {
    // Circular pop-art target shapes
    for (let x = 64; x < 256; x += 128) {
      for (let y = 64; y < 256; y += 128) {
        // Draw black target backing rings
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
        
        // Draw bright white target rings
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(x, y, 48, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
        
        // Center black backing core
        ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
        // Center white core
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      }
    }
  }
  else {
    // NORMAL BLOCKS / default: Staggered metal slats / staggered horizontal panels with horizontal brushed textures and rivets
    // Draw thick dark black panel lines for maximum 3D block contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 4;
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    // Slat bevel highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 2;
    for (let y = 0; y <= 256; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y + 2);
      ctx.lineTo(256, y + 2);
      ctx.stroke();
    }

    // Staggered vertical panel divisions in solid black
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      const yVal = r * 64;
      const shift = (r % 2) * 64;
      for (let c = 0; c < 4; c++) {
        const xVal = c * 128 + shift;
        ctx.beginPath();
        ctx.moveTo(xVal % 256, yVal);
        ctx.lineTo(xVal % 256, yVal + 64);
        ctx.stroke();
      }
    }

    // Larger 3D metal rivets near boundaries with dark shadow drop
    for (let r = 0; r < 4; r++) {
      const yVal = r * 64;
      const shift = (r % 2) * 64;
      for (let c = 0; c < 4; c++) {
        const xVal = c * 128 + shift;
        // Rivet Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath(); ctx.arc((xVal + 11) % 256, yVal + 11, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc((xVal + 119) % 256, yVal + 11, 3.5, 0, Math.PI * 2); ctx.fill();

        // Rivet Cap (Bright Silver)
        ctx.fillStyle = 'rgba(230, 230, 240, 0.95)';
        ctx.beginPath(); ctx.arc((xVal + 10) % 256, yVal + 10, 3.0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Create a Three.js material for a tile based on its color and behavior.
 */
function createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, colorIndex) {
  // Try loading a premium seamless abstract pattern texture from the user's downloaded pack first
  let texture = getSeamlessTexture(colorIndex);

  // If seamless texture loading fails or is unavailable (e.g., in Node/Vitest tests),
  // fall back gracefully to our procedural high-contrast canvas texture generator.
  if (!texture) {
    texture = getProceduralTexture(behavior, baseColor, colorIndex);
  }

  const matParams = {
    color: baseColor,
    shininess: emissiveGlow ? 95 : 75,
  };

  if (texture) {
    matParams.map = texture;
  }

  if (emissiveGlow) {
    matParams.emissive = glowColor;
    matParams.emissiveIntensity = 3.0;
  } else {
    matParams.emissive = baseColor;
    matParams.emissiveIntensity = 0.35;
  }

  return new THREE.MeshPhongMaterial(matParams);
}

/**
 * Process a single tile in a row and add its geometry to the scene.
 * Mutates collidables, specialTiles, and roadMeshes arrays.
 */
function processTile(tile, r, c, palette, scene, collidables, specialTiles, roadMeshes) {
  if (!tile) return;

  const xPos = (c - 3) * TILE_WIDTH;
  const zPos = -r * TILE_LENGTH;

  const { height, yPos, isObstacle } = computeTileGeometry(tile);

  // Under the corrected Shikadi format:
  // For flat blocks, the main color/behavior is in bottom_color (or top_color fallback in tests).
  // For elevated blocks (obstacles), it is in top_color.
  let activeColor = 0;
  if (isObstacle) {
    activeColor = tile.top_color;
  } else {
    activeColor = tile.bottom_color !== 0 ? tile.bottom_color : tile.top_color;
  }

  // The gameplay behavior and visual color are determined by the 1-based palette entry:
  const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;

  const { behavior, emissiveGlow, glowColor } = classifyTileBehavior(behaviorColor);
  const baseColor = getPaletteColor(palette, behaviorColor);
  const material = createTileMaterial(baseColor, emissiveGlow, glowColor, behavior, behaviorColor);

  // Main block mesh
  const geom = new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH);
  const mesh = new THREE.Mesh(geom, material);
  mesh.position.set(xPos, yPos, zPos - TILE_LENGTH / 2);
  mesh.receiveShadow = true;
  mesh.castShadow = isObstacle;
  scene.add(mesh);
  roadMeshes.push(mesh);

  // Collision bounding box
  const halfW = TILE_WIDTH / 2;
  const halfH = height / 2;
  const halfL = TILE_LENGTH / 2;

  if (isObstacle) {
    collidables.push({
      minX: xPos - halfW,
      maxX: xPos + halfW,
      minY: yPos - halfH,
      maxY: yPos + halfH,
      minZ: mesh.position.z - halfL,
      maxZ: mesh.position.z + halfL,
      height,
      isObstacle: true,
      isFlatRoad: false,
    });
  }

  // Special tile behavior zone
  if (behavior) {
    specialTiles.push({
      boundingBox: {
        minX: xPos - halfW,
        maxX: xPos + halfW,
        minY: yPos + halfH - 0.05,
        maxY: yPos + halfH + 0.3,
        minZ: mesh.position.z - halfL,
        maxZ: mesh.position.z + halfL,
      },
      behavior,
    });
  }

  // Tunnel archway
  if (tile.tunnel) {
    buildTunnel(tile, xPos, yPos, height, zPos, palette, scene, collidables, roadMeshes);
  }
}

/**
 * Build a tunnel (archway) with walls and ceiling around a tile.
 */
function buildTunnel(tile, xPos, yPos, height, zPos, palette, scene, collidables, roadMeshes) {
  const archHeight = 2.8;
  const archThickness = 0.15;
  const tunnelColor = getPaletteColor(palette, tile.bottom_color || 1);

  const tunnelMaterial = new THREE.MeshStandardMaterial({
    color: tunnelColor,
    emissive: tunnelColor,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
  });

  const meshZ = zPos - TILE_LENGTH / 2;
  const baseY = yPos + height / 2;

  // Left wall
  const leftWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
  const leftWall = new THREE.Mesh(leftWallGeom, tunnelMaterial);
  leftWall.position.set(xPos - TILE_WIDTH / 2 + archThickness / 2, baseY + archHeight / 2, meshZ);
  scene.add(leftWall);

  // Right wall
  const rightWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
  const rightWall = new THREE.Mesh(rightWallGeom, tunnelMaterial);
  rightWall.position.set(xPos + TILE_WIDTH / 2 - archThickness / 2, baseY + archHeight / 2, meshZ);
  scene.add(rightWall);

  // Ceiling
  const ceilingGeom = new THREE.BoxGeometry(TILE_WIDTH, archThickness, TILE_LENGTH);
  const ceiling = new THREE.Mesh(ceilingGeom, tunnelMaterial);
  ceiling.position.set(xPos, baseY + archHeight - archThickness / 2, meshZ);
  scene.add(ceiling);

  roadMeshes.push(leftWall, rightWall, ceiling);

  // Tunnel collidables
  const halfL = TILE_LENGTH / 2;
  collidables.push(
    {
      minX: xPos - TILE_WIDTH / 2,
      maxX: xPos - TILE_WIDTH / 2 + archThickness,
      minY: baseY,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
    },
    {
      minX: xPos + TILE_WIDTH / 2 - archThickness,
      maxX: xPos + TILE_WIDTH / 2,
      minY: baseY,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
    },
    {
      minX: xPos - TILE_WIDTH / 2,
      maxX: xPos + TILE_WIDTH / 2,
      minY: baseY + archHeight - archThickness,
      maxY: baseY + archHeight,
      minZ: meshZ - halfL,
      maxZ: meshZ + halfL,
      isObstacle: true,
    }
  );
}

/**
 * Build the neon finish line at the end of the track.
 */
function buildFinishLine(trackLength, scene, roadMeshes) {
  const finishZ = -trackLength - 2.0;
  const finishWidth = TOTAL_ROAD_WIDTH + 4.0;
  const finishMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 2.0,
  });

  // Ground strip
  const finishGeom = new THREE.BoxGeometry(finishWidth, 0.2, 2.0);
  const finishLineMesh = new THREE.Mesh(finishGeom, finishMat);
  finishLineMesh.position.set(0, -0.05, finishZ);
  scene.add(finishLineMesh);
  roadMeshes.push(finishLineMesh);

  // Left arch pillar
  const finishArchGeom = new THREE.BoxGeometry(0.3, 8.0, 0.3);
  const leftFin = new THREE.Mesh(finishArchGeom, finishMat);
  leftFin.position.set(-finishWidth / 2, 4.0, finishZ);
  scene.add(leftFin);

  // Right arch pillar
  const rightFin = new THREE.Mesh(finishArchGeom, finishMat);
  rightFin.position.set(finishWidth / 2, 4.0, finishZ);
  scene.add(rightFin);

  // Top beam
  const topFinGeom = new THREE.BoxGeometry(finishWidth, 0.3, 0.3);
  const topFin = new THREE.Mesh(topFinGeom, finishMat);
  topFin.position.set(0, 8.0, finishZ);
  scene.add(topFin);

  roadMeshes.push(leftFin, rightFin, topFin);

  return finishZ;
}

/**
 * Extract level metadata (gravity, fuel, oxygen) with safe defaults.
 */
function extractLevelMeta(levelData) {
  return {
    gravityScale: levelData.gravity ? (levelData.gravity * 3.0) : 24.0,
    initialFuel: levelData.fuel || 100,
    initialOxygen: levelData.oxygen || 60,
    palette: levelData.palette,
  };
}

/**
 * Synchronous version of buildLevel — processes all rows at once.
 * Used for small levels and unit tests.
 */
export function buildLevel(levelData, scene) {
  const collidables = [];
  const specialTiles = [];
  const roadMeshes = [];

  const rows = levelData.rows;
  const numRows = rows.length;
  const trackLength = numRows * TILE_LENGTH;
  const { gravityScale, initialFuel, initialOxygen, palette } = extractLevelMeta(levelData);

  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      processTile(row[c], r, c, palette, scene, collidables, specialTiles, roadMeshes);
    }
  }

  const finishZ = buildFinishLine(trackLength, scene, roadMeshes);

  return {
    trackLength,
    collidables,
    specialTiles,
    finishZ,
    gravity: gravityScale,
    fuel: initialFuel,
    oxygen: initialOxygen,
    roadMeshes,
  };
}

/**
 * Asynchronous version of buildLevel — processes rows in chunks,
 * yielding control back to the browser between chunks to prevent
 * the main thread from freezing on large levels.
 *
 * @param {object} levelData - Parsed level data with rows, palette, etc.
 * @param {THREE.Scene} scene - Three.js scene to add meshes to.
 * @param {function} onProgress - Optional callback(progressPercent) called after each chunk.
 * @returns {Promise<object>} Level info object (same shape as buildLevel return).
 */
export function buildLevelAsync(levelData, scene, onProgress) {
  const collidables = [];
  const specialTiles = [];
  const roadMeshes = [];

  const rows = levelData.rows;
  const numRows = rows.length;
  const trackLength = numRows * TILE_LENGTH;
  const { gravityScale, initialFuel, initialOxygen, palette } = extractLevelMeta(levelData);

  return new Promise((resolve) => {
    let currentRow = 0;

    function processChunk() {
      const endRow = Math.min(currentRow + CHUNK_SIZE, numRows);

      for (let r = currentRow; r < endRow; r++) {
        const row = rows[r];
        for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
          processTile(row[c], r, c, palette, scene, collidables, specialTiles, roadMeshes);
        }
      }

      currentRow = endRow;

      if (onProgress) {
        const progress = Math.min(100, Math.floor((currentRow / numRows) * 100));
        onProgress(progress);
      }

      if (currentRow < numRows) {
        // Yield to browser, then continue next chunk
        setTimeout(processChunk, 0);
      } else {
        // All rows processed — build finish line and resolve
        const finishZ = buildFinishLine(trackLength, scene, roadMeshes);
        resolve({
          trackLength,
          collidables,
          specialTiles,
          finishZ,
          gravity: gravityScale,
          fuel: initialFuel,
          oxygen: initialOxygen,
          roadMeshes,
        });
      }
    }

    processChunk();
  });
}
