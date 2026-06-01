import * as THREE from 'three';
import { TILE_WIDTH, TILE_LENGTH, ROAD_WIDTH_LANES, TOTAL_ROAD_WIDTH } from './levelLoader.js';

export class PathScannerMinimap {
  /**
   * @param {HTMLCanvasElement} canvasElement - The canvas element to render onto.
   */
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    
    // Grid sizing parameters
    this.width = this.canvas ? this.canvas.width : 128;
    this.height = this.canvas ? this.canvas.height : 256;
    
    this.scanAhead = 30; // Scan 30 blocks ahead
    this.scanBehind = 2;  // Scan 2 blocks behind
    this.totalRows = this.scanAhead + this.scanBehind;
    
    this.cellWidth = this.width / ROAD_WIDTH_LANES; // 7 lanes
    this.cellHeight = this.height / this.totalRows;  // 32 rows
    
    // Map colors for different terrain behaviors
    this.colors = {
      boost: '#39FF14',     // Neon Lime Green
      refill: '#00E5FF',    // Hologram Cyan
      sticky: '#008000',    // Acidic Forest Green
      slippery: '#8c8f99',  // Glacial Metallic Grey
      burning: '#FF003c',   // Magma Coral Red
      obstacle: '#FFFFFF',  // Solid wall obstacle
      normal: '#2c2447',    // Standard dark violet road
      empty: '#05020a'      // Transparent/deep space background gap
    };
  }

  /**
   * Classify behavior index mapping (derived from levelLoader.js)
   * Kept for test suite compliance.
   */
  getTileBehavior(tile) {
    if (!tile) return { behavior: null, isObstacle: false };
    
    const isObstacle = tile.full || tile.half;
    let activeColor = 0;
    
    if (isObstacle) {
      activeColor = tile.top_color;
    } else {
      activeColor = tile.bottom_color !== 0 ? tile.bottom_color : tile.top_color;
    }
    
    const behaviorColor = activeColor > 0 ? (activeColor + 1) : 0;
    
    const BEHAVIORS = {
      3:  'sticky',
      9:  'slippery',
      10: 'refill',
      11: 'boost',
      13: 'burning',
    };
    
    return {
      behavior: BEHAVIORS[behaviorColor] || null,
      isObstacle
    };
  }

  /**
   * Get the color of a tile based on its palette and behavior type
   */
  getTileColor(tile, palette) {
    if (!tile) return this.colors.empty;
    
    const isObstacle = tile.full || tile.half;
    let activeColor = 0;
    
    if (isObstacle) {
      activeColor = tile.top_color;
    } else {
      activeColor = tile.bottom_color !== 0 ? tile.bottom_color : tile.top_color;
    }
    
    const colorIndex = activeColor > 0 ? (activeColor + 1) : 0;
    
    // Check if it's a special behavior tile
    const BEHAVIORS = {
      3:  this.colors.sticky,
      9:  this.colors.slippery,
      10: this.colors.refill,
      11: this.colors.boost,
      13: this.colors.burning,
    };
    
    if (BEHAVIORS[colorIndex]) {
      return BEHAVIORS[colorIndex];
    }
    
    // If it's a regular obstacle, default to obstacle color
    if (isObstacle) {
      return this.colors.obstacle;
    }
    
    // If it's a regular road block, check if we have the palette color!
    if (palette && colorIndex < palette.length) {
      const [r, g, b] = palette[colorIndex];
      // Convert [r, g, b] (0-255) to hex string
      const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
      return hex;
    }
    
    return this.colors.normal;
  }

  /**
   * Update and draw the minimap
   * @param {THREE.Vector3} playerPosition - The ship's current position vector.
   * @param {object} levelData - Current active level rows buffer.
   */
  update(playerPosition, levelData) {
    if (!this.ctx || !levelData || !levelData.rows) return;
    
    // Calculate player row
    const playerRow = Math.floor(-playerPosition.z / TILE_LENGTH);
    const maxLeft = -TOTAL_ROAD_WIDTH / 2;
    
    // Smooth scrolling vertical offset
    const playerRowFraction = (-playerPosition.z / TILE_LENGTH) % 1.0;
    const scrollOffsetY = playerRowFraction * this.cellHeight;
    
    // Clear canvas
    try {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.ctx.fillStyle = this.colors.empty;
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // 1. Draw level grid blocks
      for (let y = -1; y < this.totalRows + 1; y++) {
        // level row index (bottom is scanBehind rows behind player, top is scanAhead)
        const r = (playerRow + this.scanAhead) - y;
        
        if (r < 0 || r >= levelData.rows.length) continue;
        
        const row = levelData.rows[r];
        if (!row) continue;
        
        const drawY = y * this.cellHeight + scrollOffsetY;
        
        for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
          const tile = row[c];
          let cellColor = this.colors.empty;
          let isObstacle = false;
          
          if (tile !== null) {
            isObstacle = tile.full || tile.half;
            cellColor = this.getTileColor(tile, levelData.palette);
          }
          
          // Draw the block cell
          this.ctx.fillStyle = cellColor;
          this.ctx.fillRect(c * this.cellWidth, drawY, this.cellWidth, this.cellHeight);
          
          // Draw grid outline for active road blocks
          if (tile !== null && typeof this.ctx.strokeRect === 'function') {
            this.ctx.strokeStyle = isObstacle ? 'rgba(255, 0, 85, 0.4)' : 'rgba(0, 255, 204, 0.12)';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(c * this.cellWidth, drawY, this.cellWidth, this.cellHeight);
          }
        }
      }
      
      // 2. Draw precise sub-tile player indicator
      const playerXInLanes = (playerPosition.x - maxLeft) / TILE_WIDTH;
      const playerZInRows = -playerPosition.z / TILE_LENGTH;
      
      const drawPlayerX = playerXInLanes * this.cellWidth;
      // player Z is at (playerRow - playerZInRows) offset from scanAhead y anchor
      const relativeRowPos = (playerZInRows - (playerRow - this.scanBehind));
      const drawPlayerY = this.height - (relativeRowPos * this.cellHeight);
      
      if (typeof this.ctx.save === 'function') {
        this.ctx.save();
        
        // Draw neon outer glow for player dot
        this.ctx.shadowColor = '#ff00ff';
        this.ctx.shadowBlur = 12;
        this.ctx.fillStyle = '#ff00ff';
        
        // Draw neon triangle (ship icon pointing forward/upward)
        this.ctx.beginPath();
        this.ctx.moveTo(drawPlayerX, drawPlayerY - 8); // Tip
        this.ctx.lineTo(drawPlayerX - 5, drawPlayerY + 4); // Bottom left
        this.ctx.lineTo(drawPlayerX + 5, drawPlayerY + 4); // Bottom right
        this.ctx.closePath();
        this.ctx.fill();
        
        // Inner bright core
        this.ctx.shadowBlur = 0;
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.moveTo(drawPlayerX, drawPlayerY - 5);
        this.ctx.lineTo(drawPlayerX - 3, drawPlayerY + 3);
        this.ctx.lineTo(drawPlayerX + 3, drawPlayerY + 3);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
      }
    } catch (e) {
      // Safe fallback for mocked/unsupported context calls in JSDOM
    }
  }
}

export class CockpitConsole3D {
  /**
   * @param {THREE.Camera} camera - The main perspective camera.
   */
  constructor(camera) {
    this.camera = camera;
    this.group = new THREE.Group();
    this.group.name = "cockpit_console_3d";
    this.group.visible = false;
    
    // Parenting to the camera locks positioning lag-free
    this.camera.add(this.group);
    
    // Positioning config
    this.distance = 0.8;
    this.verticalOffset = 0.16; // Sits lower on the screen to prevent blocking the track view
    
    // Visual component properties
    this.casing = null;
    this.speedDial = null;
    this.speedNeedlePivot = null;
    this.o2Dial = null;
    this.fuelDial = null;
    this.ledBoost = null;
    this.ledSticky = null;
    this.ledSlippery = null;
    
    this.lcdCanvas = null;
    this.lcdCtx = null;
    this.lcdTexture = null;
    
    this.minimapCanvas = null;
    this.minimap = null;
    this.minimapTexture = null;
    
    this.init();
  }

  init() {
    // 1. Build Bezel dashboard casing as a sleek, sloped dipped-wing glass plate
    const shape = new THREE.Shape();
    // Start at bottom-left: x=-0.6, y=-0.14
    shape.moveTo(-0.6, -0.14);
    // Line to bottom-right: x=0.6, y=-0.14
    shape.lineTo(0.6, -0.14);
    // Line to top-right wing: x=0.6, y=0.14
    shape.lineTo(0.6, 0.14);
    // Left wing top extends to x=-0.2, y=0.14. Right wing top extends to x=0.2, y=0.14.
    // Center dips down to y=-0.04 to protect core player sightlines
    shape.lineTo(0.2, 0.14);
    shape.lineTo(0.12, -0.04);
    shape.lineTo(-0.12, -0.04);
    shape.lineTo(-0.2, 0.14);
    // Line to top-left wing: x=-0.6, y=0.14
    shape.lineTo(-0.6, 0.14);
    shape.closePath();

    const extrudeSettings = {
      depth: 0.02,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.005,
      bevelThickness: 0.005
    };
    const casingGeom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    casingGeom.center(); // Center geometry

    // Premium physical material for real space-age glassmorphism
    const casingMat = new THREE.MeshPhysicalMaterial({
      color: 0x0c0e14,
      transparent: true,
      opacity: 0.55,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.5,
      thickness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      depthTest: false,
      depthWrite: false
    });
    
    const casing = new THREE.Mesh(casingGeom, casingMat);
    casing.renderOrder = 9999;
    this.group.add(casing);
    this.casing = casing;
    
    // Add a razor-sharp glowing neon outline around the glass plate
    const borderGeom = new THREE.EdgesGeometry(casingGeom);
    this.borderMat = new THREE.LineBasicMaterial({
      color: 0x00ffcc, // Cyan glowing rim
      depthTest: false,
      depthWrite: false
    });
    const border = new THREE.LineSegments(borderGeom, this.borderMat);
    border.renderOrder = 9999;
    this.group.add(border);
    this.border = border;

    // Specular Glass Lens Dome over Gauges (left side)
    const glassDomeMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      roughness: 0.02,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      depthTest: false,
      depthWrite: false
    });
    
    const speedGlassDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      glassDomeMat
    );
    speedGlassDome.position.set(-0.42, 0.02, 0.035);
    speedGlassDome.rotation.set(Math.PI / 2, 0, 0);
    speedGlassDome.renderOrder = 9999;
    this.group.add(speedGlassDome);

    // Dials and gauges setup below

    // 2. Torus gauges for speedometer, fuel, oxygen (GROUPED LEFT)
    const speedGaugeBgMat = new THREE.MeshBasicMaterial({
      color: 0x111318,
      depthTest: false,
      depthWrite: false
    });
    
    // Speedometer Dial (Left)
    const speedGaugeBg = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.009, 8, 24, Math.PI * 1.5),
      speedGaugeBgMat
    );
    speedGaugeBg.position.set(-0.42, 0.02, 0.02);
    speedGaugeBg.rotation.set(0, 0, -Math.PI * 0.75);
    speedGaugeBg.renderOrder = 9999;
    this.group.add(speedGaugeBg);

    const speedDialMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      depthTest: false,
      depthWrite: false
    });
    const speedDial = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.009, 8, 24, Math.PI * 1.5),
      speedDialMat
    );
    speedDial.position.set(-0.42, 0.02, 0.021);
    speedDial.rotation.set(0, 0, -Math.PI * 0.75);
    speedDial.renderOrder = 9999;
    this.group.add(speedDial);
    this.speedDial = speedDial;

    // Dial Needle pivot and hand
    this.speedNeedlePivot = new THREE.Group();
    this.speedNeedlePivot.position.set(-0.42, 0.02, 0.025);
    
    const needleGeom = new THREE.BoxGeometry(0.008, 0.08, 0.008);
    const needleMat = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      depthTest: false,
      depthWrite: false
    });
    const needle = new THREE.Mesh(needleGeom, needleMat);
    needle.position.y = 0.03; // pivot around center
    needle.renderOrder = 9999;
    this.speedNeedlePivot.add(needle);
    this.speedNeedlePivot.rotation.z = Math.PI * 0.75;
    this.group.add(this.speedNeedlePivot);

    // Oxygen Circular Arc (Left bottom-middle)
    const o2DialBg = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.006, 8, 24, Math.PI),
      speedGaugeBgMat
    );
    o2DialBg.position.set(-0.22, 0.04, 0.02);
    o2DialBg.rotation.set(0, 0, Math.PI);
    o2DialBg.renderOrder = 9999;
    this.group.add(o2DialBg);

    const o2DialMat = new THREE.MeshStandardMaterial({
      color: 0x00ff66,
      depthTest: false,
      depthWrite: false,
      roughness: 0.2,
      metalness: 0.8
    });
    const o2Dial = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.006, 8, 24, Math.PI),
      o2DialMat
    );
    o2Dial.position.set(-0.22, 0.04, 0.021);
    o2Dial.rotation.set(0, 0, Math.PI);
    o2Dial.renderOrder = 9999;
    this.group.add(o2Dial);
    this.o2Dial = o2Dial;

    // Fuel Circular Arc (Left extreme bottom-middle)
    const fuelDialBg = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.006, 8, 24, Math.PI),
      speedGaugeBgMat
    );
    fuelDialBg.position.set(-0.22, -0.04, 0.02);
    fuelDialBg.rotation.set(0, 0, 0);
    fuelDialBg.renderOrder = 9999;
    this.group.add(fuelDialBg);

    const fuelDialMat = new THREE.MeshStandardMaterial({
      color: 0xff00cc,
      depthTest: false,
      depthWrite: false,
      roughness: 0.2,
      metalness: 0.8
    });
    const fuelDial = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.006, 8, 24, Math.PI),
      fuelDialMat
    );
    fuelDial.position.set(-0.22, -0.04, 0.021);
    fuelDial.rotation.set(0, 0, 0);
    fuelDial.renderOrder = 9999;
    this.group.add(fuelDial);
    this.fuelDial = fuelDial;

    // 3. Status LEDs (Boost, Sticky, Slippery near Center-Right)
    const createLed = (color, yPos) => {
      const ledMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        emissive: color,
        emissiveIntensity: 0.05,
        roughness: 0.4,
        metalness: 0.8,
        depthTest: false,
        depthWrite: false
      });
      const led = new THREE.Mesh(new THREE.OctahedronGeometry(0.016), ledMat);
      led.position.set(0.22, yPos, 0.025);
      led.renderOrder = 9999;
      return led;
    };
    
    this.ledBoost = createLed(0x39ff14, 0.06);
    this.ledSticky = createLed(0x008000, 0.0);
    this.ledSlippery = createLed(0x8c8f99, -0.06);
    this.group.add(this.ledBoost);
    this.group.add(this.ledSticky);
    this.group.add(this.ledSlippery);

    // 4. LCD Panel using dynamic PlaneGeometry slot & CanvasTexture (Left far corner)
    try {
      this.lcdCanvas = document.createElement('canvas');
      this.lcdCanvas.width = 128;
      this.lcdCanvas.height = 128;
      this.lcdCtx = this.lcdCanvas.getContext('2d');
      this.lcdTexture = new THREE.CanvasTexture(this.lcdCanvas);
      
      const lcdMat = new THREE.MeshBasicMaterial({
        map: this.lcdTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false
      });
      const lcdMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.2, 0.12),
        lcdMat
      );
      lcdMesh.position.set(-0.42, -0.07, 0.021);
      lcdMesh.renderOrder = 9999;
      this.group.add(lcdMesh);
    } catch (e) {
      // Graceful fallback for headless/JSDOM tests
      const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x05020a, depthTest: false, depthWrite: false });
      const lcdMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), fallbackMat);
      lcdMesh.position.set(-0.42, -0.07, 0.021);
      lcdMesh.renderOrder = 9999;
      this.group.add(lcdMesh);
    }

    // 5. Top-Down 2D Path Scanner Minimap slot (SMALL & IN THE RIGHT CORNER)
    // Minimap is scaled down and set to x = 0.44 to keep the center view fully open!
    try {
      this.minimapCanvas = document.createElement('canvas');
      this.minimapCanvas.width = 128;
      this.minimapCanvas.height = 256;
      
      this.minimap = new PathScannerMinimap(this.minimapCanvas);
      this.minimapTexture = new THREE.CanvasTexture(this.minimapCanvas);
      
      const minimapMat = new THREE.MeshBasicMaterial({
        map: this.minimapTexture,
        transparent: true,
        depthTest: false,
        depthWrite: false
      });
      const minimapMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.18, 0.23), // Smaller visual profile
        minimapMat
      );
      minimapMesh.position.set(0.44, -0.01, 0.021);
      minimapMesh.renderOrder = 9999;
      this.group.add(minimapMesh);
    } catch (e) {
      // Graceful fallback
      const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x05020a, depthTest: false, depthWrite: false });
      const minimapMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.23), fallbackMat);
      minimapMesh.position.set(0.44, -0.01, 0.021);
      minimapMesh.renderOrder = 9999;
      this.group.add(minimapMesh);
    }
  }

  /**
   * Auto-position the console in front of the camera at its bottom bounds.
   */
  updatePositionAndScale(width, height) {
    if (!this.camera) return;
    const fov = this.camera.fov;
    const aspect = width / height;
    
    // Frustum boundaries at distance d
    const H_v = 2 * this.distance * Math.tan((fov * Math.PI) / 360);
    
    // Reposition at the bottom
    const localX = 0;
    const localY = -H_v / 2 + this.verticalOffset * H_v;
    const localZ = -this.distance;
    
    this.group.position.set(localX, localY, localZ);
    
    // Scale on narrow ratios to prevent layout breaking
    let scale = 1.0;
    if (aspect < 1.77) {
      scale = Math.max(0.38, aspect / 1.77);
    }
    this.group.scale.set(scale, scale, scale);
  }

  /**
   * Update the gauges and minimap state dynamically.
   */
  update(physics, levelData, cameraMode) {
    const isCockpit = (cameraMode === 'cockpit');
    this.group.visible = isCockpit;
    
    if (!isCockpit) return;
    
    // Calculate Speedometer Pct
    const velocityZ = physics.velocity ? physics.velocity.z : 0;
    const speedKmh = Math.floor(Math.abs(velocityZ) * 10);
    const maxZSpeed = (physics.activeEffects && physics.activeEffects.boost) ? (physics.maxSpeedBoost || 60) : (physics.maxSpeedNormal || 32);
    const speedPct = Math.min(100, (Math.abs(velocityZ) / maxZSpeed) * 100);
    
    // Oxygen & Fuel
    const oxygen = physics.oxygen !== undefined ? Math.ceil(physics.oxygen) : 100;
    const fuel = physics.fuel !== undefined ? Math.ceil(physics.fuel) : 10000;
    
    let fuelPct = 100;
    if (levelData && levelData.fuel) {
      fuelPct = Math.min(100, (fuel / (levelData.fuel * 50)) * 100);
    }
    
    const isRebounding = !!physics.isRebounding;
    const onGround = !!physics.onGround;
    const gravityVal = (levelData && levelData.gravity) ? ((levelData.gravity - 3) * 100) : 500;
    const activeEffects = physics.activeEffects || {};

    // Dynamic warning pulse triggers
    const pulseFactor = (Math.sin(Date.now() / 150) + 1.0) / 2.0; // Oscillates 0 to 1
    const isLowFuel = (fuelPct < 20);
    const isLowO2 = (oxygen < 25);

    // 1. Casing Neon Outline Warn Pulser
    if (this.borderMat) {
      if (isLowFuel) {
        // Red flashing pulsing color
        const redVal = 0.5 + pulseFactor * 0.5;
        this.borderMat.color.setRGB(redVal, 0.0, 0.23);
      } else if (isLowO2) {
        // Yellow flashing pulsing color
        const yellowVal = 0.5 + pulseFactor * 0.5;
        this.borderMat.color.setRGB(yellowVal, yellowVal * 0.66, 0.0);
      } else {
        // Steady neon cyan
        this.borderMat.color.setHex(0x00ffcc);
      }
    }

    // 2. Rotate Needle
    if (this.speedNeedlePivot) {
      const angle = (Math.PI * 0.75) - (speedPct / 100) * Math.PI * 1.5;
      this.speedNeedlePivot.rotation.z = angle;
    }

    // 3. Scale and Glow Dial Arcs
    if (this.o2Dial) {
      this.o2Dial.scale.set(1, Math.max(0.001, oxygen / 100), 1);
      if (isLowO2) {
        this.o2Dial.material.color.setHex(0xffaa00);
        this.o2Dial.material.emissive.setHex(0xffaa00);
        this.o2Dial.material.emissiveIntensity = 0.5 + pulseFactor * 2.5;
      } else {
        this.o2Dial.material.color.setHex(0x00ff66);
        this.o2Dial.material.emissive.setHex(0x000000);
        this.o2Dial.material.emissiveIntensity = 0;
      }
    }
    if (this.fuelDial) {
      if (isLowFuel) {
        // Pulse size of the dial scale as well
        const scalePulse = 1.0 + pulseFactor * 0.15;
        this.fuelDial.scale.set(scalePulse, Math.max(0.001, fuelPct / 100) * scalePulse, scalePulse);
        this.fuelDial.material.color.setHex(0xff003c);
        this.fuelDial.material.emissive.setHex(0xff003c);
        this.fuelDial.material.emissiveIntensity = 0.5 + pulseFactor * 2.5;
      } else {
        this.fuelDial.scale.set(1, Math.max(0.001, fuelPct / 100), 1);
        this.fuelDial.material.color.setHex(0xff00cc);
        this.fuelDial.material.emissive.setHex(0x000000);
        this.fuelDial.material.emissiveIntensity = 0;
      }
    }

    // 4. Status LEDs emissive intensities
    if (this.ledBoost) {
      this.ledBoost.material.emissiveIntensity = activeEffects.boost ? 2.5 : 0.05;
    }
    if (this.ledSticky) {
      this.ledSticky.material.emissiveIntensity = activeEffects.sticky ? 2.5 : 0.05;
    }
    if (this.ledSlippery) {
      this.ledSlippery.material.emissiveIntensity = activeEffects.slippery ? 2.5 : 0.05;
    }

    // 5. Draw LCD Screen
    this.drawLCD(speedKmh, fuel, oxygen, isRebounding, onGround, gravityVal, isLowFuel, isLowO2, pulseFactor);

    // 6. Update Path Scanner Minimap
    if (this.minimap && physics.position) {
      this.minimap.update(physics.position, levelData);
      if (this.minimapTexture) {
        this.minimapTexture.needsUpdate = true;
      }
    }
  }

  drawLCD(speed, fuel, oxygen, isRebounding, onGround, gravityVal, isLowFuel, isLowO2, pulseFactor) {
    if (!this.lcdCtx) return;
    const ctx = this.lcdCtx;
    const w = this.lcdCanvas.width;
    const h = this.lcdCanvas.height;
    
    try {
      // 1. LCD Polycarbonate CRT backdrop
      ctx.fillStyle = '#0a0215';
      ctx.fillRect(0, 0, w, h);
      
      // LCD CRT Red Warning Outline Flashing
      if (isLowFuel && Math.floor(Date.now() / 250) % 2 === 0) {
        ctx.strokeStyle = '#ff003c';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, w, h);
      } else if (isLowO2 && Math.floor(Date.now() / 250) % 2 === 0) {
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, w, h);
      }
      
      // 2. Retro scanlines (CRT)
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.06)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      
      // Reset text shadows for glowing phosphor effect
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#00ffcc';
      ctx.font = '900 12px monospace';
      
      let jumpStatus = 'IDLE';
      let jumpColor = '#00ffcc';
      if (isRebounding) {
        jumpStatus = 'REBOUND';
        jumpColor = '#ff00ff';
      } else if (!onGround) {
        jumpStatus = 'JUMPING';
        jumpColor = '#00ffff';
      }
      
      // Oxygen status line
      if (isLowO2) {
        ctx.fillStyle = '#ffaa00';
        ctx.shadowColor = '#ffaa00';
        if (Math.floor(Date.now() / 250) % 2 === 0) {
          ctx.fillText(`OXY: CRITICAL`, 10, 24);
        } else {
          ctx.fillText(`OXY: ${String(oxygen).padStart(3, '0')}% (LOW)`, 10, 24);
        }
      } else {
        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.fillText(`OXY: ${String(oxygen).padStart(3, '0')}%`, 10, 24);
      }
      
      // Fuel status line
      if (isLowFuel) {
        ctx.fillStyle = '#ff003c';
        ctx.shadowColor = '#ff003c';
        if (Math.floor(Date.now() / 250) % 2 === 0) {
          ctx.fillText(`FUEL: DANGER`, 10, 48);
        } else {
          ctx.fillText(`FUEL: ${String(fuel).padStart(5, '0')} (LOW)`, 10, 48);
        }
      } else {
        ctx.fillStyle = '#00ffcc';
        ctx.shadowColor = '#00ffcc';
        ctx.fillText(`FUEL: ${String(fuel).padStart(5, '0')}`, 10, 48);
      }
      
      // Gravity status line
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ffaa00';
      ctx.fillText(`GRAV: ${String(gravityVal).padStart(4, '0')}`, 10, 72);
      
      // Jump status line
      ctx.fillStyle = jumpColor;
      ctx.shadowColor = jumpColor;
      ctx.fillText(`JUMP: ${jumpStatus}`, 10, 96);
      
      // Clean shadows
      ctx.shadowBlur = 0;
      
      if (this.lcdTexture) {
        this.lcdTexture.needsUpdate = true;
      }
    } catch (e) {
      // Safe fallback
    }
  }
}
