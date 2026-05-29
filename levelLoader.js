// SkyRoads Level Loader & 3D Geometry Generator (Three.js)
import * as THREE from 'three';

// Tile width and Z-length configuration
export const TILE_WIDTH = 2.0;
export const TILE_LENGTH = 4.0;
export const ROAD_WIDTH_LANES = 7;
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

export function buildLevel(levelData, scene) {
  const collidables = [];
  const specialTiles = [];
  const roadMeshes = [];

  const rows = levelData.rows;
  const numRows = rows.length;
  const trackLength = numRows * TILE_LENGTH;

  // Extract gravity, fuel, and oxygen
  // Gravity scale: in original DOS, gravity ranges (e.g. 8 is normal).
  // We'll map gravity to a standard units scale (e.g. gravity = 8 -> 24 m/s^2)
  const gravityScale = levelData.gravity ? (levelData.gravity * 3.0) : 24.0;
  const initialFuel = levelData.fuel || 100;
  const initialOxygen = levelData.oxygen || 60;
  const palette = levelData.palette;

  // Function to get color from level palette
  const getPaletteColor = (colorIndex) => {
    if (palette && colorIndex < palette.length) {
      const [r, g, b] = palette[colorIndex];
      return new THREE.Color(r / 255, g / 255, b / 255);
    }
    return new THREE.Color(0.5, 0.5, 0.5); // Default grey
  };

  // Build the track segment by segment
  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    const zPos = -r * TILE_LENGTH; // Standard Three.js negative Z direction for forward movement

    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = row[c];
      if (!tile) continue; // null is empty space

      const xPos = (c - 3) * TILE_WIDTH; // Lane 3 is at x = 0

      // Geometry and properties
      let height = 0.15; // default flat road tile thickness
      let yPos = -height / 2; // flush with y = 0 surface
      let isObstacle = false;

      if (tile.full && tile.half) {
        height = 3.0;
        yPos = height / 2;
        isObstacle = true;
      } else if (tile.full) {
        height = 2.0;
        yPos = height / 2;
        isObstacle = true;
      } else if (tile.half) {
        height = 1.0;
        yPos = height / 2;
        isObstacle = true;
      }

      // Check special behavior from top color
      let behavior = null;
      let emitiveGlow = false;
      let glowColor = null;

      if (tile.top_color === 3) {
        behavior = 'sticky';
        emitiveGlow = true;
        glowColor = new THREE.Color(0.0, 0.25, 0.0); // Dark Green
      } else if (tile.top_color === 9) {
        behavior = 'slippery';
        emitiveGlow = true;
        glowColor = new THREE.Color(0.2, 0.2, 0.2); // Dark Gray
      } else if (tile.top_color === 10) {
        behavior = 'refill';
        emitiveGlow = true;
        glowColor = new THREE.Color(0.0, 0.5, 1.0); // Bright Blue neon
      } else if (tile.top_color === 11) {
        behavior = 'boost';
        emitiveGlow = true;
        glowColor = new THREE.Color(0.0, 1.0, 0.0); // Lime Green neon
      } else if (tile.top_color === 13) {
        behavior = 'burning';
        emitiveGlow = true;
        glowColor = new THREE.Color(1.0, 0.0, 0.0); // Bright Red neon
      }

      // Tile Materials
      let material;
      const baseColor = getPaletteColor(tile.top_color);

      if (emitiveGlow) {
        // Glowing neon look for special interactive tiles
        material = new THREE.MeshStandardMaterial({
          color: baseColor,
          emissive: glowColor,
          emissiveIntensity: 1.5,
          roughness: 0.2,
          metalness: 0.1
        });
      } else {
        // Beautiful modern standard grid tiles
        material = new THREE.MeshStandardMaterial({
          color: baseColor,
          roughness: 0.4,
          metalness: 0.2,
          bumpScale: 0.05
        });
      }

      // Render the main block
      const geom = new THREE.BoxGeometry(TILE_WIDTH, height, TILE_LENGTH);
      const mesh = new THREE.Mesh(geom, material);
      mesh.position.set(xPos, yPos, zPos - TILE_LENGTH / 2);
      mesh.receiveShadow = true;
      mesh.castShadow = isObstacle;
      scene.add(mesh);
      roadMeshes.push(mesh);

      // Save collision data
      const halfW = TILE_WIDTH / 2;
      const halfH = height / 2;
      const halfL = TILE_LENGTH / 2;

      const boundingBox = {
        minX: xPos - halfW,
        maxX: xPos + halfW,
        minY: yPos - halfH,
        maxY: yPos + halfH,
        minZ: mesh.position.z - halfL,
        maxZ: mesh.position.z + halfL,
        height: height,
        isObstacle: isObstacle,
        isFlatRoad: !isObstacle
      };

      if (isObstacle) {
        collidables.push(boundingBox);
      }

      if (behavior) {
        specialTiles.push({
          boundingBox: {
            minX: xPos - halfW,
            maxX: xPos + halfW,
            minY: yPos + halfH - 0.05, // Slightly below top surface to detect touching
            maxY: yPos + halfH + 0.3,  // Box extending above top surface
            minZ: mesh.position.z - halfL,
            maxZ: mesh.position.z + halfL
          },
          behavior: behavior
        });
      }

      // Render Tunnels / Pipes if tunnel bit is active
      if (tile.tunnel) {
        // Build a gorgeous semi-transparent neon archway
        const archHeight = 2.8;
        const archThickness = 0.15;
        const tunnelMaterial = new THREE.MeshStandardMaterial({
          color: getPaletteColor(tile.bottom_color || 1),
          emissive: getPaletteColor(tile.bottom_color || 1),
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide
        });

        // Left wall, Right wall, and Ceiling
        const leftWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
        const rightWallGeom = new THREE.BoxGeometry(archThickness, archHeight, TILE_LENGTH);
        const ceilingGeom = new THREE.BoxGeometry(TILE_WIDTH, archThickness, TILE_LENGTH);

        const leftWall = new THREE.Mesh(leftWallGeom, tunnelMaterial);
        leftWall.position.set(xPos - TILE_WIDTH / 2 + archThickness / 2, yPos + height / 2 + archHeight / 2, zPos - TILE_LENGTH / 2);
        
        const rightWall = new THREE.Mesh(rightWallGeom, tunnelMaterial);
        rightWall.position.set(xPos + TILE_WIDTH / 2 - archThickness / 2, yPos + height / 2 + archHeight / 2, zPos - TILE_LENGTH / 2);

        const ceiling = new THREE.Mesh(ceilingGeom, tunnelMaterial);
        ceiling.position.set(xPos, yPos + height / 2 + archHeight - archThickness / 2, zPos - TILE_LENGTH / 2);

        scene.add(leftWall);
        scene.add(rightWall);
        scene.add(ceiling);

        roadMeshes.push(leftWall, rightWall, ceiling);

        // Add tunnel walls as side/top obstacles
        collidables.push({
          minX: xPos - TILE_WIDTH / 2,
          maxX: xPos - TILE_WIDTH / 2 + archThickness,
          minY: yPos + height / 2,
          maxY: yPos + height / 2 + archHeight,
          minZ: mesh.position.z - halfL,
          maxZ: mesh.position.z + halfL,
          isObstacle: true
        });

        collidables.push({
          minX: xPos + TILE_WIDTH / 2 - archThickness,
          maxX: xPos + TILE_WIDTH / 2,
          minY: yPos + height / 2,
          maxY: yPos + height / 2 + archHeight,
          minZ: mesh.position.z - halfL,
          maxZ: mesh.position.z + halfL,
          isObstacle: true
        });

        collidables.push({
          minX: xPos - TILE_WIDTH / 2,
          maxX: xPos + TILE_WIDTH / 2,
          minY: yPos + height / 2 + archHeight - archThickness,
          maxY: yPos + height / 2 + archHeight,
          minZ: mesh.position.z - halfL,
          maxZ: mesh.position.z + halfL,
          isObstacle: true
        });
      }
    }
  }

  // Create a gorgeous massive Neon Finish Line at the end of the track
  const finishZ = -trackLength - 2.0;
  const finishWidth = TOTAL_ROAD_WIDTH + 4.0;
  const finishGeom = new THREE.BoxGeometry(finishWidth, 0.2, 2.0);
  const finishMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 2.0
  });
  const finishLineMesh = new THREE.Mesh(finishGeom, finishMat);
  finishLineMesh.position.set(0, -0.05, finishZ);
  scene.add(finishLineMesh);
  roadMeshes.push(finishLineMesh);

  // Add neon finishing arches
  const finishArchGeom = new THREE.BoxGeometry(0.3, 8.0, 0.3);
  const leftFin = new THREE.Mesh(finishArchGeom, finishMat);
  leftFin.position.set(-finishWidth / 2, 4.0, finishZ);
  scene.add(leftFin);

  const rightFin = new THREE.Mesh(finishArchGeom, finishMat);
  rightFin.position.set(finishWidth / 2, 4.0, finishZ);
  scene.add(rightFin);

  const topFinGeom = new THREE.BoxGeometry(finishWidth, 0.3, 0.3);
  const topFin = new THREE.Mesh(topFinGeom, finishMat);
  topFin.position.set(0, 8.0, finishZ);
  scene.add(topFin);

  roadMeshes.push(leftFin, rightFin, topFin);

  return {
    trackLength: trackLength,
    collidables: collidables,
    specialTiles: specialTiles,
    finishZ: finishZ,
    gravity: gravityScale,
    fuel: initialFuel,
    oxygen: initialOxygen,
    roadMeshes: roadMeshes
  };
}
