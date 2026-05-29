// SkyRoads 3D Kinematics & Physics Engine
import * as THREE from 'three';

// Road configuration constants
export const ROAD_WIDTH_LANES = 7;
export const TILE_WIDTH = 2.0;
export const TILE_LENGTH = 4.0;
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

// Ship dimensions
export const SHIP_WIDTH = 1.0;
export const SHIP_HEIGHT = 0.4;
export const SHIP_LENGTH = 1.8;

export class PhysicsEngine {
  constructor() {
    this.position = new THREE.Vector3(0, 0.2, 0); // Start at lane 3 (x=0), on the ground
    this.velocity = new THREE.Vector3(0, 0, 0);
    
    // Physics constants
    this.maxSpeedNormal = 32.0; // Z speed in units/s
    this.maxSpeedBoost = 60.0;
    this.maxSpeedSticky = 10.0;
    this.accelForward = 18.0;
    this.decelBrakes = 35.0;
    this.dragZ = 4.0;
    
    this.maxSteerSpeed = 10.0;
    this.steerAccel = 35.0;
    this.dragSteer = 28.0; // quick stabilization when keys released
    
    this.jumpImpulse = 10.5;
    
    // Engine states
    this.onGround = true;
    this.groundHeight = 0;
    this.isDead = false;
    this.deathReason = '';
    
    // Active special behaviors
    this.activeEffects = {
      boost: false,
      sticky: false,
      slippery: false,
      burning: false
    };
    
    this.oxygen = 100;
    this.fuel = 10000;
  }

  reset(startFuel, startOxygen) {
    this.position.set(0, 0.2, 0);
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.groundHeight = 0;
    this.isDead = false;
    this.deathReason = '';
    this.fuel = startFuel * 50; // Map original DOS fuel scale
    this.oxygen = startOxygen;
    
    this.activeEffects = {
      boost: false,
      sticky: false,
      slippery: false,
      burning: false
    };
  }

  update(dt, keyboard, levelInfo) {
    if (this.isDead) return;
    dt = Math.min(dt, 0.05); // Cap timestep to prevent tunneling

    // 1. Consume Fuel & Oxygen
    if (Math.abs(this.velocity.z) > 0.5) {
      this.fuel = Math.max(0, this.fuel - dt * 25.0 * (this.activeEffects.boost ? 2.5 : 1.0));
    }
    this.oxygen = Math.max(0, this.oxygen - dt * 1.0); // 1 unit per second

    if (this.fuel <= 0) {
      this.isDead = true;
      this.deathReason = 'OUT OF FUEL';
      return;
    }
    if (this.oxygen <= 0) {
      this.isDead = true;
      this.deathReason = 'OUT OF OXYGEN';
      return;
    }

    // 2. Resolve Effects from active special tiles
    this.resolveSpecialTiles(levelInfo.specialTiles);

    if (this.activeEffects.burning) {
      this.isDead = true;
      this.deathReason = 'BURNED TO CRIPPLES';
      return;
    }

    // 3. Forward Movement Acceleration / Drag
    let targetMaxSpeed = this.maxSpeedNormal;
    if (this.activeEffects.boost) {
      targetMaxSpeed = this.maxSpeedBoost;
      // Boost forces forward acceleration
      this.velocity.z -= this.accelForward * 2.5 * dt;
    } else if (this.activeEffects.sticky) {
      targetMaxSpeed = this.maxSpeedSticky;
      // Sticky aggressively decelerates
      if (Math.abs(this.velocity.z) > this.maxSpeedSticky) {
        this.velocity.z += this.decelBrakes * dt;
      }
    }

    // Process player forward controls (positive/negative Z)
    // Note: Z-axis is negative for forward movement
    if (keyboard.forward && !this.activeEffects.boost) {
      if (this.velocity.z > -targetMaxSpeed) {
        this.velocity.z -= this.accelForward * dt;
      }
    } else if (keyboard.backward) {
      if (this.velocity.z < 0) {
        this.velocity.z += this.decelBrakes * dt;
      }
    } else {
      // Natural rolling drag
      if (this.velocity.z < 0) {
        this.velocity.z += this.dragZ * dt;
        if (this.velocity.z > 0) this.velocity.z = 0;
      }
    }

    // Cap speed
    if (this.velocity.z < -targetMaxSpeed) {
      this.velocity.z = -targetMaxSpeed;
    }

    // 4. Steering (Left / Right along X axis)
    let steeringDrag = this.dragSteer;
    if (this.activeEffects.slippery) {
      steeringDrag = 1.0; // minimal friction, drift!
    }

    if (keyboard.left) {
      this.velocity.x -= this.steerAccel * dt;
      if (this.velocity.x < -this.maxSteerSpeed) this.velocity.x = -this.maxSteerSpeed;
    } else if (keyboard.right) {
      this.velocity.x += this.steerAccel * dt;
      if (this.velocity.x > this.maxSteerSpeed) this.velocity.x = this.maxSteerSpeed;
    } else {
      // Bring steering velocity back to 0
      if (this.velocity.x > 0) {
        this.velocity.x = Math.max(0, this.velocity.x - steeringDrag * dt);
      } else if (this.velocity.x < 0) {
        this.velocity.x = Math.min(0, this.velocity.x + steeringDrag * dt);
      }
    }

    // 5. Jump & Gravity
    if (keyboard.jump && this.onGround) {
      this.velocity.y = this.jumpImpulse;
      this.onGround = false;
      keyboard.resetJump(); // Avoid double jumping immediately
    }

    if (!this.onGround) {
      // Pull ship down using level's specific gravity scale
      this.velocity.y -= levelInfo.gravity * dt;
    }

    // 6. Update Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 7. Ground Collisions and Bounding Boxes
    this.onGround = false;
    this.groundHeight = -10.0; // If you fall, you keep falling

    // Create ship bounding box
    const shipBox = this.getShipBox();

    // Check collisions with all level collidables
    for (const block of levelInfo.collidables) {
      // Check if Z and X intersect
      const xOverlap = shipBox.maxX > block.minX && shipBox.minX < block.maxX;
      const zOverlap = shipBox.maxZ > block.minZ && shipBox.minZ < block.maxZ;

      if (xOverlap && zOverlap) {
        // We have X/Z intersection! Let's check Y height
        if (block.isObstacle) {
          // If Z overlap is deep, check if it's a side crash
          // A side crash happens if the ship's bottom is below the block's top height (block.maxY)
          // and we hit it horizontally
          const isBelowTop = shipBox.minY < block.maxY - 0.15;
          const isAboveBottom = shipBox.maxY > block.minY;

          if (isBelowTop && isAboveBottom) {
            // Check if we hit the block from the front
            // Moving in negative Z, front of ship is minZ. Back of block is maxZ.
            const hitFront = shipBox.minZ < block.maxZ && shipBox.maxZ > block.maxZ;
            
            if (hitFront) {
              this.isDead = true;
              this.deathReason = 'COLLIDED WITH BLOCK';
              this.velocity.set(0, 0, 0);
              return;
            }
          }
        }

        // Check if we are landing on top of the tile
        const fallingDown = this.velocity.y <= 0;
        const aboveBlockTop = shipBox.minY >= block.maxY - 0.25;

        if (fallingDown && aboveBlockTop) {
          this.onGround = true;
          this.groundHeight = block.maxY;
          this.position.y = block.maxY;
          this.velocity.y = 0;
        }
      }
    }

    // Handle standard ground level (y=0) check across active track zones
    const absoluteZ = -this.position.z;
    if (absoluteZ >= 0 && absoluteZ <= levelInfo.trackLength) {
      // Check if we are inside the track width
      const maxLeft = -TOTAL_ROAD_WIDTH / 2;
      const maxRight = TOTAL_ROAD_WIDTH / 2;
      const withinTrackWidth = this.position.x >= maxLeft && this.position.x <= maxRight;

      // Check if we landed on standard flat ground
      if (withinTrackWidth && !this.onGround && this.position.y <= 0.0) {
        // Let's verify we aren't falling in a gap!
        // We check if the block directly below us is active
        const rIdx = Math.floor(absoluteZ / TILE_LENGTH);
        const cIdx = Math.floor((this.position.x - maxLeft) / TILE_WIDTH);
        
        if (rIdx >= 0 && rIdx < levelInfo.roadMeshes.length && levelInfo.roadMeshes) {
          // Verify if there is a tile in this row/column
          const rowData = levelInfo.roadMeshes; // Just a placeholder, we verify direct tile existence
          const currentLevelRows = levelInfo.collidables; // Standard level loader collidables
          
          // Let's check if there is an empty tile space (gap) in our lane
          // If we are touching the flat ground (y=0), but there is NO flat tile under us, we fall!
          const tileExists = this.checkTileExists(this.position.x, this.position.z, levelInfo);
          if (tileExists) {
            this.onGround = true;
            this.groundHeight = 0.0;
            this.position.y = 0.0;
            this.velocity.y = 0.0;
          }
        }
      }
    }

    // 8. Fall out of track detection
    if (this.position.y < -4.0) {
      this.isDead = true;
      this.deathReason = 'FELL OFF ROAD';
      this.velocity.set(0, -15, 0); // plummet down
    }
  }

  // Check if a tile exists at a specific coordinates on the track
  checkTileExists(x, z, levelInfo) {
    const maxLeft = -TOTAL_ROAD_WIDTH / 2;
    const absZ = -z;
    const rIdx = Math.floor(absZ / TILE_LENGTH);
    const cIdx = Math.floor((x - maxLeft) / TILE_WIDTH);

    // If out of bounds of track, no tile
    if (rIdx < 0 || cIdx < 0 || cIdx >= ROAD_WIDTH_LANES) return false;

    // Check level structure
    // Since rows contain parsed blocks, let's see if this lane's tile is active
    // We can do this by checking if the coordinate falls inside any flat road bounding box,
    // OR checking the raw row structure!
    // The easiest way is checking the raw level rows:
    const activePack = window.currentGamePack || 'standard';
    const activeLevelIdx = window.currentLevelIndex || 0;
    
    // We get the original level rows from the window/global state
    const originalLevelData = window.currentLevelData;
    if (originalLevelData && originalLevelData.rows[rIdx]) {
      const tile = originalLevelData.rows[rIdx][cIdx];
      return tile !== null;
    }
    return true; // Fallback
  }

  // Ship bounding box
  getShipBox() {
    const halfW = SHIP_WIDTH / 2;
    const halfH = SHIP_HEIGHT / 2;
    const halfL = SHIP_LENGTH / 2;
    return {
      minX: this.position.x - halfW,
      maxX: this.position.x + halfW,
      minY: this.position.y,
      maxY: this.position.y + SHIP_HEIGHT,
      minZ: this.position.z - halfL,
      maxZ: this.position.z + halfL
    };
  }

  // Detect and resolve special tiles (boost, supplies, slippery, sticky, burning)
  resolveSpecialTiles(specialTiles) {
    const shipBox = this.getShipBox();

    // Reset temporary tile effects (they only last while touching!)
    this.activeEffects.boost = false;
    this.activeEffects.sticky = false;
    this.activeEffects.slippery = false;
    this.activeEffects.burning = false;

    for (const tile of specialTiles) {
      const box = tile.boundingBox;
      const xOverlap = shipBox.maxX > box.minX && shipBox.minX < box.maxX;
      const yOverlap = shipBox.minY <= box.maxY && shipBox.maxY >= box.minY;
      const zOverlap = shipBox.maxZ > box.minZ && shipBox.minZ < box.maxZ;

      if (xOverlap && yOverlap && zOverlap) {
        const behavior = tile.behavior;
        if (behavior === 'boost') {
          this.activeEffects.boost = true;
        } else if (behavior === 'sticky') {
          this.activeEffects.sticky = true;
        } else if (behavior === 'slippery') {
          this.activeEffects.slippery = true;
        } else if (behavior === 'burning') {
          this.activeEffects.burning = true;
        } else if (behavior === 'refill') {
          // Refills occur instantaneously, adding fuel and resetting oxygen to max
          if (this.fuel < 100 * 50) {
            this.fuel = Math.min(100 * 50, this.fuel + 1000);
          }
          this.oxygen = 100;
          
          // Trigger a sound chime (we set a flag to notify app.js)
          this.triggerRefillAudio = true;
        }
      }
    }
  }
}

// Simple Keyboard controller class
export class KeyboardController {
  constructor() {
    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.jump = false;

    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  handleKey(e, isDown) {
    const code = e.code;
    if (code === 'ArrowUp' || code === 'KeyW') this.forward = isDown;
    if (code === 'ArrowDown' || code === 'KeyS') this.backward = isDown;
    if (code === 'ArrowLeft' || code === 'KeyA') this.left = isDown;
    if (code === 'ArrowRight' || code === 'KeyD') this.right = isDown;
    if (code === 'Space') this.jump = isDown;
  }

  resetJump() {
    this.jump = false;
  }
}

