// SkyRoads 3D Kinematics & Physics Engine
import * as THREE from 'three';

// Road configuration constants — declared in heightfield.js (single source of truth)
export { ROAD_WIDTH_LANES, TILE_WIDTH, TILE_LENGTH, TOTAL_ROAD_WIDTH } from './heightfield.js';
import { ROAD_WIDTH_LANES, TILE_WIDTH, TILE_LENGTH, TOTAL_ROAD_WIDTH, buildColumnGrid, supportSurface, cellBounds, worldToCell } from './heightfield.js';
import { resolve as columnResolve } from './collision.js';

// Ship dimensions
export const SHIP_WIDTH = 0.6;
export const SHIP_HEIGHT = 0.4;
export const SHIP_LENGTH = 1.8;

// Collision width is DECOUPLED from the visual width (SHIP_WIDTH drives the wing/model
// geometry). The hitbox is deliberately narrower than the wingspan so that a wing tip
// visually grazing an obstacle is forgiven instead of killing you — this is what makes
// threading tunnels and brushing past blocks feel fair rather than punishing. Total
// hitbox = 0.44 (≈0.22 half-width), well under a 2.0 lane so there's real clearance.
export const SHIP_COLLISION_WIDTH = 0.44;

// Old/imported model & class names mapped to the current ship roster — shared by every
// module that resolves a saved/legacy ship name (was duplicated 4x across the codebase).
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

export const CLASS_PRESETS = {
  fighter: {
    maxSpeedNormal: 35.0,
    maxSpeedBoost: 65.0,
    accelForward: 20.0,
    decelBrakes: 38.0,
    maxSteerSpeed: 11.0,
    steerAccel: 38.0,
    dragZ: 4.0,
    fuelConsumptionRate: 30.0
  },
  hauler: {
    maxSpeedNormal: 25.0,
    maxSpeedBoost: 50.0,
    accelForward: 12.0,
    decelBrakes: 30.0,
    maxSteerSpeed: 8.0,
    steerAccel: 28.0,
    dragZ: 5.0,
    fuelConsumptionRate: 40.0
  },
  scout: {
    maxSpeedNormal: 40.0,
    maxSpeedBoost: 75.0,
    accelForward: 15.0,
    decelBrakes: 35.0,
    maxSteerSpeed: 13.0,
    steerAccel: 42.0,
    dragZ: 3.5,
    fuelConsumptionRate: 15.0
  },
  dreadnought: {
    maxSpeedNormal: 28.0,
    maxSpeedBoost: 55.0,
    accelForward: 10.0,
    decelBrakes: 25.0,
    maxSteerSpeed: 7.0,
    steerAccel: 24.0,
    dragZ: 4.5,
    fuelConsumptionRate: 50.0
  },
  cruiser: {
    maxSpeedNormal: 32.0,
    maxSpeedBoost: 60.0,
    accelForward: 18.0,
    decelBrakes: 35.0,
    maxSteerSpeed: 10.0,
    steerAccel: 35.0,
    dragZ: 4.0,
    fuelConsumptionRate: 25.0
  },
  original: {
    maxSpeedNormal: 32.0,
    maxSpeedBoost: 60.0,
    accelForward: 18.0,
    decelBrakes: 35.0,
    maxSteerSpeed: 10.0,
    steerAccel: 35.0,
    dragZ: 4.0,
    fuelConsumptionRate: 25.0
  }
};

export class PhysicsEngine {
  constructor() {
    this.position = new THREE.Vector3(0, 0.2, 0); // Start at lane 3 (x=0), on the ground
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.playStyle = 'classic';
    this.activeLevelIndex = 0;

    // ponytail: simple cache — rebuild when level identity or collidables length changes
    this._colGrid = null;
    this._colNumRows = 0;
    this._colLevelId = null;      // tracks levelInfo object identity
    this._colCollidablesLen = -1; // tracks collidables.length to detect push()
    // deathY depends only on the (immutable) column grid, so cache it by grid identity
    // instead of rescanning every frame. Each flow deck has its own grid object, so the
    // ref-compare re-scans correctly on deck wrap and reuses otherwise.
    this._deathYGrid = null;
    this._cachedDeathY = -4.0;
    
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
    this.onRamp = false;
    this.rampSlope = 0.0;
    this.canDoubleJump = false; // granted on first jump, consumed mid-air, reset on landing
    this.doubleJumpEnabled = false; // toggled from settings
    this.isDead = false;
    this.deathReason = '';
    this.difficulty = 'hard';
    this.isTransitioning = false;
    this.health = 100.0;
    
    // Classic landing bounce (rebound) parameters
    this.isRebounding = false;
    this.reboundTimer = 0.0;
    this.justRebounded = false;
    
    // Active special behaviors
    this.activeEffects = {
      boost: false,
      superBoost: false,
      sticky: false,
      slippery: false,
      burning: false,
      highJump: false
    };
    
    this.oxygen = 100;
    this.fuel = 10000;
    this.fuelConsumptionRate = 25.0;

    this.settings = {
      bounceFactor: 1.0,
      gravityFactor: 1.0,
      jumpFactor: 1.0,
      fuelConsumptionRate: 25.0,
      damageModifier: 1.0,
      shipMass: 1.0,
      minDamageSpeed: 4.0,
      
      // Configurable Throttle
      maxSpeedNormal: 32.0,
      maxSpeedBoost: 60.0,
      accelForward: 18.0,
      decelBrakes: 35.0,
      dragZ: 4.0,

      // Configurable Handling
      maxSteerSpeed: 10.0,
      steerAccel: 35.0,
      dragSteer: 28.0,
      laneSnapStrength: 4.0,

      // Easy Mode Front Collision Rebounds
      easyCollisionBounceVel: 10.0,
      easyCollisionBounceDist: 1.2,

      // Jumping & Flight dynamics
      fallGravityMultiplier: 1.45,
      variableJumpDampening: 0.82,
      coyoteTimeBuffer: 0.25,

      // Configurable Cockpit Camera Offsets
      cockpitOffsetX: 0.0,
      cockpitOffsetY: 0.0,
      cockpitOffsetZ: 0.0,
      showCockpitBezel: 0.0
    };
    this.boatThrottleEnabled = false;
    
    if (typeof localStorage !== 'undefined') {
      const savedModel = localStorage.getItem('skyroads_selected_model');
      if (savedModel) {
        this.applyShipClass(savedModel, false);
      }
    }
  }

  reset(startFuel, startOxygen) {
    this.position.set(0, 0.2, 0);
    this.velocity.set(0, 0, 0);
    this.onGround = true;
    this.groundHeight = 0;
    this.canDoubleJump = false;
    this.isDead = false;
    this.deathReason = '';
    this.isTransitioning = false;
    this.isRebounding = false;
    this.reboundTimer = 0.0;
    this.justRebounded = false;
    this.fuel = startFuel * 50; // Map original DOS fuel scale
    this.oxygen = startOxygen;
    this.health = 100.0; // Initialize health to 100%
    
    this.activeEffects = {
      boost: false,
      superBoost: false,
      sticky: false,
      slippery: false,
      burning: false,
      highJump: false
    };

    this.triggerRefillAudio = false;
    this.triggerWallCollisionAudio = false;
    this.triggerLandingReboundAudio = false;
    this.triggerJumpAudio = false;
  }

  update(dt, keyboard, levelInfo) {
    if (this.isDead) return;
    dt = Math.min(dt, 0.05); // Cap timestep to prevent tunneling

    // Poll and update keyboard/gamepad combined state on every physics frame tick
    if (keyboard && typeof keyboard.updateCombinedState === 'function') {
      keyboard.updateCombinedState();
    }

    // Synchronize customizable settings properties with active instance variables
    this.maxSpeedNormal = this.settings.maxSpeedNormal !== undefined ? this.settings.maxSpeedNormal : 32.0;
    this.maxSpeedBoost = this.settings.maxSpeedBoost !== undefined ? this.settings.maxSpeedBoost : 60.0;
    this.accelForward = this.settings.accelForward !== undefined ? this.settings.accelForward : 18.0;
    this.decelBrakes = this.settings.decelBrakes !== undefined ? this.settings.decelBrakes : 35.0;
    this.dragZ = this.settings.dragZ !== undefined ? this.settings.dragZ : 4.0;
    this.maxSteerSpeed = this.settings.maxSteerSpeed !== undefined ? this.settings.maxSteerSpeed : 10.0;
    this.steerAccel = this.settings.steerAccel !== undefined ? this.settings.steerAccel : 35.0;
    this.dragSteer = this.settings.dragSteer !== undefined ? this.settings.dragSteer : 28.0;

    if (this.isTransitioning) {
      // Auto-pilot inside transition tube!
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.velocity.z = -this.maxSpeedNormal; // Lock forward speed
      this.position.x = 0;
      this.position.y = 1.0; // Elevate slightly inside tube
      this.position.z += this.velocity.z * dt;
      this.onGround = true;
      this.groundHeight = 1.0;
      
      // Update engine states
      this.activeEffects = { boost: false, superBoost: false, sticky: false, slippery: false, burning: false, highJump: false };
      return;
    }

    // 1. Consume Fuel (only in hard difficulty) & Oxygen
    if (this.difficulty === 'hard') {
      if (Math.abs(this.velocity.z) > 0.5) {
        const rate = this.fuelConsumptionRate !== undefined ? this.fuelConsumptionRate : 25.0;
        this.fuel = Math.max(0, this.fuel - dt * rate * ((this.activeEffects.boost || this.activeEffects.superBoost) ? 2.5 : 1.0));
      }
    }
    this.oxygen = Math.max(0, this.oxygen - dt * 1.0); // 1 unit per second

    if (this.fuel <= 0) {
      this.isDead = true;
      this.deathReason = 'OUT OF FUEL';
      return;
    }
    if (this.difficulty !== 'hard' && this.health !== undefined && this.health <= 0) {
      this.isDead = true;
      this.deathReason = 'HULL FAILURE';
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
    //
    // Boost mechanics: boost tiles are CUMULATIVE with no top speed cap.
    // Each frame spent on a boost tile adds acceleration proportional to dt,
    // so longer contact = more speed gained. Speed persists after leaving
    // the tile — it only drops via natural drag, braking, or collisions.
    if (this.activeEffects.superBoost) {
      // Super boost: aggressive cumulative acceleration (no cap)
      this.velocity.z -= this.accelForward * 5.0 * dt;
    } else if (this.activeEffects.boost) {
      // Boost: cumulative acceleration (no cap)
      this.velocity.z -= this.accelForward * 2.5 * dt;
    } else if (this.activeEffects.sticky) {
      // Sticky aggressively decelerates toward sticky max speed
      if (Math.abs(this.velocity.z) > this.maxSpeedSticky) {
        this.velocity.z += this.decelBrakes * dt;
      }
    }

    // Process player forward controls (positive/negative Z)
    // Note: Z-axis is negative for forward movement
    // Manual acceleration is still capped at maxSpeedNormal to give boost tiles purpose
    if (keyboard.forward && !this.activeEffects.boost && !this.activeEffects.superBoost) {
      if (this.velocity.z > -this.maxSpeedNormal) {
        this.velocity.z -= this.accelForward * dt;
        // Only cap manual acceleration, not boost-accumulated speed
        if (this.velocity.z < -this.maxSpeedNormal) {
          this.velocity.z = -this.maxSpeedNormal;
        }
      }
    } else if (keyboard.backward) {
      if (this.velocity.z < 0) {
        this.velocity.z += this.decelBrakes * dt;
      }
    } else {
      // Natural rolling drag (only applies when not on boost and not pressing forward)
      if (!this.boatThrottleEnabled && !this.activeEffects.boost && !this.activeEffects.superBoost) {
        if (this.velocity.z < 0) {
          this.velocity.z += this.dragZ * dt;
          if (this.velocity.z > 0) this.velocity.z = 0;
        }
      }
    }

    // No global speed cap — boost is cumulative and uncapped.
    // Only sticky tiles enforce a speed limit (handled above).

    // 4. Steering (Left / Right along X axis)
    let steeringDrag = this.dragSteer;
    let steerAccel = this.steerAccel;
    let steerLerp = 15.0;
    if (this.activeEffects.slippery) {
      // Ice: lateral momentum is CONSERVED. Zero release-drag means letting go of the
      // controls does not bleed off sideways speed — once you're sliding you keep sliding.
      // Low accel + slow lerp mean changing your lateral velocity (building it OR reversing
      // it) takes sustained input, so to stop a slide you must hold counter-steer for a
      // while — or hit an obstacle. (The old impl bled momentum via release-drag, so ice
      // didn't feel slidey.)
      steeringDrag = 0.0;
      steerAccel = this.steerAccel * 0.30;
      steerLerp = 3.0;
    }

    if (keyboard.mouseControlsEnabled || keyboard.touchControlsEnabled) {
      let steerVal = 0;
      let activeSteering = false;

      if (keyboard.steerAmount !== undefined && keyboard.steerAmount !== 0) {
        steerVal = keyboard.steerAmount;
        activeSteering = true;
      } else if (keyboard.left) {
        steerVal = -1;
        activeSteering = true;
      } else if (keyboard.right) {
        steerVal = 1;
        activeSteering = true;
      }

      // Smoothly interpolate (lerp) towards target analogue steer speed
      let targetSteerSpeed = steerVal * this.maxSteerSpeed;

      // Smart Lane Snapping/Magnetism:
      // Applies when using touch controls, the user is not actively steering (joystick is neutral/released),
      // the ship is on the ground, and it is not dead.
      if (keyboard.touchControlsEnabled && keyboard.laneSnapEnabled && !activeSteering && this.onGround && !this.isDead) {
        // Road is 7 lanes, TILE_WIDTH is 2.0. Lanes centered at -6, -4, -2, 0, 2, 4, 6.
        const nearestLaneX = Math.max(-6.0, Math.min(6.0, Math.round(this.position.x / 2.0) * 2.0));
        const distToLane = nearestLaneX - this.position.x;
        
        // Only pull if we are within a reasonable distance (e.g. less than 1.0 unit / half tile width)
        if (Math.abs(distToLane) < 1.0) {
          const snapStrength = (this.settings && this.settings.laneSnapStrength !== undefined) ? this.settings.laneSnapStrength : 4.0;
          targetSteerSpeed = distToLane * snapStrength;
        }
      }

      const laneSnapping = keyboard.touchControlsEnabled && keyboard.laneSnapEnabled && !activeSteering && this.onGround && !this.isDead;
      if (this.activeEffects.slippery && !activeSteering && !laneSnapping) {
        // Ice + no input: conserve lateral momentum (steeringDrag is 0 on ice, so the
        // slide carries on instead of lerping back to centre).
        if (this.velocity.x > 0) this.velocity.x = Math.max(0, this.velocity.x - steeringDrag * dt);
        else if (this.velocity.x < 0) this.velocity.x = Math.min(0, this.velocity.x + steeringDrag * dt);
      } else {
        this.velocity.x += (targetSteerSpeed - this.velocity.x) * steerLerp * dt;
      }
    } else {
      if (keyboard.left) {
        this.velocity.x -= steerAccel * dt;
        if (this.velocity.x < -this.maxSteerSpeed) this.velocity.x = -this.maxSteerSpeed;
      } else if (keyboard.right) {
        this.velocity.x += steerAccel * dt;
        if (this.velocity.x > this.maxSteerSpeed) this.velocity.x = this.maxSteerSpeed;
      } else {
        // Bring steering velocity back to 0
        if (this.velocity.x > 0) {
          this.velocity.x = Math.max(0, this.velocity.x - steeringDrag * dt);
        } else if (this.velocity.x < 0) {
          this.velocity.x = Math.min(0, this.velocity.x + steeringDrag * dt);
        }
      }
    }

    // Update active landing rebound state timer
    if (this.isRebounding) {
      this.reboundTimer -= dt;
      if (this.reboundTimer <= 0) {
        this.isRebounding = false;
      }
    }

    // Super Jump Pad collision in Tower Mode
    if (this.playStyle === 'tower') {
      const isUnderSuperJump = this.checkSuperJumpTile(this.position.x, this.position.z);
      if (isUnderSuperJump && this.onGround && !this.isDead) {
        this.velocity.y = 28.0; 
        this.onGround = false;
        this.canDoubleJump = true;
        this.triggerJumpAudio = true;
      }
    }

    // 5. Jump & Gravity
    // Coyote time / Near-ground jump buffer (allows jumping when falling within 0.25 units of a valid ground block)
    // coyoteTimeBuffer setting defines the vertical near-ground distance threshold for jumping
    const isNearGround = this.velocity.y < 0 && this.groundHeight > -5.0 && (this.position.y - this.groundHeight) <= (this.settings.coyoteTimeBuffer !== undefined ? this.settings.coyoteTimeBuffer : 0.25);
    const wantsToJump = keyboard.jump || (keyboard.spacePressed !== undefined ? keyboard.spacePressed : false);
    const jumpFactor = (this.settings.jumpFactor !== undefined ? this.settings.jumpFactor : 1.0) * (this.activeEffects.highJump ? 1.7 : 1.0);
    if (wantsToJump && (this.onGround || this.isRebounding || isNearGround)) {
      // Normal jump from ground / coyote time / rebound
      this.velocity.y = this.jumpImpulse * jumpFactor;
      this.onGround = false;
      this.isRebounding = false;
      this.justRebounded = false;
      this.canDoubleJump = true; // grant one mid-air jump
      this.triggerJumpAudio = true;
      keyboard.resetJump();
    } else if (this.doubleJumpEnabled && keyboard.jumpPulse && !this.onGround && !this.isRebounding && !isNearGround && this.canDoubleJump) {
      // Double jump — jumpPulse is true only on the keydown frame, so holding space never auto-fires this
      this.velocity.y = this.jumpImpulse * jumpFactor * 0.85;
      this.canDoubleJump = false;
      this.triggerJumpAudio = true;
      keyboard.resetJump();
    }

    if (!this.onGround) {
      let gravityForce = levelInfo.gravity * (this.settings.gravityFactor !== undefined ? this.settings.gravityFactor : 1.0);
      
      // If falling down, apply asymmetric falling gravity to make the jump snappy and less floaty
      if (this.velocity.y < 0) {
        gravityForce *= (this.settings.fallGravityMultiplier !== undefined ? this.settings.fallGravityMultiplier : 1.45);
      }

      if (this.velocity.y > 0) {
        const isSpaceHeld = keyboard.spacePressed !== undefined ? keyboard.spacePressed : true;
        if (!isSpaceHeld) {
          // Cut upward velocity (variable jump height)
          this.velocity.y *= (this.settings.variableJumpDampening !== undefined ? this.settings.variableJumpDampening : 0.82);
        }
      }
      // Pull ship down using level's specific gravity scale
      this.velocity.y -= gravityForce * dt;
    }

    // 6. Update Position
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // 7. Ground Collisions and Bounding Boxes
    this.onGround = false;
    this.groundHeight = -10.0; // If you fall, you keep falling
    this.onRamp = false;
    this.rampSlope = 0.0;

    // ── Column-collision path (unconditional — P2.1) ────────────────────────
    this._updateColumnCollision(dt, keyboard, levelInfo);
  }

  // ── Column-collision update ───────────────────────────────────────────────
  // The sole collision path (P2.1 removed the old per-block loop).
  // Geometry resolution: collision.js resolve() — pure MTV, no game rules.
  // Game rules (death/bounce/damage/audio/rampSlope): applied per §1.7.
  _updateColumnCollision(dt, keyboard, levelInfo) {
    // ── Get or build column grid ──────────────────────────────────────────────
    // Prefer levelInfo.columnGrid (produced by levelLoader in P3.1).
    // Fall back to building from window.currentLevelData once per level.
    let grid, numRows;
    if (levelInfo.columnGrid) {
      grid = levelInfo.columnGrid;
      numRows = levelInfo.numRows ?? levelInfo.columnGrid.length;
      // Track identity so a level change forces a rebuild of the fallback cache.
      this._colLevelId = levelInfo;
    } else {
      // ponytail: use object-identity of levelInfo + collidables.length as cache key
      const curLen = levelInfo.collidables ? levelInfo.collidables.length : 0;
      if (this._colLevelId !== levelInfo || !this._colGrid || this._colCollidablesLen !== curLen) {
        this._colCollidablesLen = curLen;
        const rawData = (typeof window !== 'undefined' && window.currentLevelData)
          ? window.currentLevelData
          : null;
        if (rawData) {
          const built = buildColumnGrid(rawData);
          this._colGrid = built.grid;
          this._colNumRows = built.numRows;
        } else if (levelInfo.collidables) {
          // Test / editor fallback: synthesize a column grid from legacy collidables.
          // Keeps tests working without a rows-format level data source.
          // Transitional bridge — removed in P3.1 when levelLoader supplies columnGrid.
          const built = this._buildGridFromCollidables(levelInfo.collidables);
          this._colGrid = built.grid;
          this._colNumRows = built.numRows;
        } else {
          this._colGrid = null;
          this._colNumRows = 0;
        }
        this._colLevelId = levelInfo;
      }
      grid = this._colGrid;
      numRows = this._colNumRows;
    }

    if (!grid) {
      // Grid unavailable: run nothing (ship falls freely), set deathY default
      this.deathY = -4.0;
      const canFallBelow = (this.playStyle === 'flow') || (this.playStyle === 'tower' && this.activeLevelIndex > 0);
      if (this.position.y < this.deathY) {
        if (!canFallBelow) {
          this.isDead = true;
          this.deathReason = 'FELL OFF ROAD';
          this.velocity.set(0, -15, 0);
        }
      }
      return;
    }

    // ── Swept-AABB resolution ─────────────────────────────────────────────────
    // Position was already integrated by update() ("6. Update Position").
    // We pass the post-integration position + current velocity into resolve(),
    // which sub-steps, pushes out, and emits events. resolve() re-does its own
    // sub-step integration, so we must pass the PRE-integration position.
    // Fix: we need to undo the integration done in step 6, then let resolve() redo it.
    // ponytail: simpler — undo step-6 integration, pass to resolve, use result.
    const prePos = {
      x: this.position.x - this.velocity.x * dt,
      y: this.position.y - this.velocity.y * dt,
      z: this.position.z - this.velocity.z * dt,
    };

    const shipDims = { width: SHIP_COLLISION_WIDTH, height: SHIP_HEIGHT, length: SHIP_LENGTH };
    const result = columnResolve({
      grid,
      numRows,
      position: prePos,
      velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
      dt,
      ship: shipDims,
    });

    // Write back resolved position + velocity
    this.position.x = result.position.x;
    this.position.y = result.position.y;
    this.position.z = result.position.z;
    this.velocity.x = result.velocity.x;
    this.velocity.y = result.velocity.y;
    this.velocity.z = result.velocity.z;

    // ── §1.7 event → outcome mapping ─────────────────────────────────────────
    const isJumpHeld = keyboard.spacePressed !== undefined ? keyboard.spacePressed : false;

    for (const ev of result.events) {
      if (ev.kind === 'land') {
        // Landed on a surface top — snap, ground state, possible rebound
        const surfaceY = ev.surfaceY;
        this.groundHeight = surfaceY;
        this.onGround = true;
        this.canDoubleJump = false;
        this.onRamp = false;
        this.rampSlope = 0.0;

        // Classic rebound: fast landing that wasn't already a rebound
        // Matches old code lines 810-826: vy < -3.0 && !isJumpHeld && !justRebounded
        if (ev.impactSpeed > 3.0 && !isJumpHeld && !this.justRebounded) {
          this.isRebounding = true;
          this.reboundTimer = 0.12;
          this.velocity.y = 4.2 * (this.settings.bounceFactor !== undefined ? this.settings.bounceFactor : 1.0);
          this.onGround = false;
          this.justRebounded = true;
          this.triggerLandingReboundAudio = true;
        } else {
          this.velocity.y = 0;
          this.justRebounded = false;
        }

      } else if (ev.kind === 'ceiling') {
        // Head-bonk — matches old lines 679-686
        // position.y was already pushed down by resolve(); just zero vy
        this.velocity.y = 0;

      } else if (ev.kind === 'wallSide') {
        // Side slide — matches old lines 753-791
        this.velocity.x = 0;
        this.triggerWallCollisionAudio = true;
        if (this.difficulty === 'normal') {
          const shipMass = this.settings.shipMass !== undefined ? this.settings.shipMass : 1.0;
          const damageModifier = this.settings.damageModifier !== undefined ? this.settings.damageModifier : 1.0;
          const minDamageSpeed = this.settings.minDamageSpeed !== undefined ? this.settings.minDamageSpeed : 4.0;
          const impactSpeed = ev.impactSpeed;
          const damage = impactSpeed < minDamageSpeed ? 0 : impactSpeed * shipMass * damageModifier * 1.5;
          if (this.health > damage) {
            this.health -= damage;
          } else {
            this.health = 0;
            this.isDead = true;
            this.deathReason = 'COLLIDED WITH BLOCK';
            this.velocity.set(0, 0, 0);
            return;
          }
        }

      } else if (ev.kind === 'wallFront') {
        // Frontal crash — matches old lines 715-753
        if (this.difficulty === 'easy') {
          this.velocity.z = this.settings.easyCollisionBounceVel !== undefined ? this.settings.easyCollisionBounceVel : 10.0;
          this.position.z += this.settings.easyCollisionBounceDist !== undefined ? this.settings.easyCollisionBounceDist : 1.2;
          this.triggerWallCollisionAudio = true;
          this.velocity.x = 0;
        } else if (this.difficulty === 'normal') {
          const shipMass = this.settings.shipMass !== undefined ? this.settings.shipMass : 1.0;
          const damageModifier = this.settings.damageModifier !== undefined ? this.settings.damageModifier : 1.0;
          const minDamageSpeed = this.settings.minDamageSpeed !== undefined ? this.settings.minDamageSpeed : 4.0;
          const impactSpeed = ev.impactSpeed;
          const damage = impactSpeed < minDamageSpeed ? 0 : impactSpeed * shipMass * damageModifier * 1.5;
          if (this.health > damage) {
            this.health -= damage;
            this.velocity.z = this.settings.easyCollisionBounceVel !== undefined ? this.settings.easyCollisionBounceVel : 10.0;
            this.position.z += this.settings.easyCollisionBounceDist !== undefined ? this.settings.easyCollisionBounceDist : 1.2;
            this.triggerWallCollisionAudio = true;
            this.velocity.x = 0;
          } else {
            this.health = 0;
            this.isDead = true;
            this.deathReason = 'COLLIDED WITH BLOCK';
            this.velocity.set(0, 0, 0);
            return;
          }
        } else {
          // hard
          this.isDead = true;
          this.deathReason = 'COLLIDED WITH BLOCK';
          this.velocity.set(0, 0, 0);
          return;
        }
      }
    }

    // ── Post-resolution: resting-ground check ────────────────────────────────
    // If no 'land' event fired (ship was already sitting on the surface — zero
    // penetration, no push-out), use supportSurface() to detect resting contact.
    // This is the "or from heightfield.supportSurface for resting" path in §1.7.
    //
    // Nudge z by -1e-6 to avoid the columnsOverlappingBox boundary issue at
    // cell-entry edges (e.g. z=0 exactly maps to rMax=-1 due to the epsilon in
    // the rMax formula, excluding row 0).
    if (!this.onGround && !this.isDead && grid) {
      const restTol = 0.05; // ship is "resting" if surface is within 0.05 of feet
      // Footprint-aware: sample the ship's full width/length so a ship resting partly
      // on road (and partly over an obstacle's lane at a clipped corner) stays grounded.
      const support = supportSurface(grid, numRows, this.position.x, this.position.z, this.position.y, restTol, SHIP_COLLISION_WIDTH / 2, SHIP_LENGTH / 2);
      if (support && this.velocity.y <= 0 && (this.position.y - support.surfaceY) <= restTol) {
        this.position.y = support.surfaceY;
        this.groundHeight = support.surfaceY;
        this.onGround = true;
        this.canDoubleJump = false;
        this.velocity.y = 0;
        this.justRebounded = false;
      }
    }

    // ── P1.3: onRamp / rampSlope — ship-length-weighted slope blend ───────────
    // Reproduces old lines 870-916: weight each overlapping ramp span by how much
    // of the ship length it covers, then blend slopes. Uses supportSurface() at
    // three sample points (front, center, rear) so we capture partial overlap.
    if (this.onGround && !this.isDead && grid) {
      const halfL = SHIP_LENGTH / 2;
      const sampleZ = [
        this.position.z + halfL,   // rear (higher z = entry side)
        this.position.z,           // center
        this.position.z - halfL,   // front (lower z = exit side)
      ];
      const tol = 0.5; // how far below surface we can be and still be "on" it

      let sumOverlap = 0;
      let sumWeightedSlope = 0;

      // Sample at front, center, rear. For each ramp-supporting span, accumulate
      // an overlap weight (fraction of ship length touching it) × slope.
      // ponytail: three-point sample is O(1) and matches old behavior closely.
      const seen = new Set(); // avoid counting the same span twice
      for (const z of sampleZ) {
        // Nudge z slightly negative to avoid columnsOverlappingBox excluding the
        // cell at boundary edges (z=0 → rMax=-1 due to epsilon, missing row 0).
        const qz = z - 1e-6;
        const support = supportSurface(grid, numRows, this.position.x, qz, this.position.y, tol);
        if (!support || !support.span || !support.span.isRamp) continue;
        const spanKey = support.span; // object identity — each span is a unique object
        if (seen.has(spanKey)) continue;
        seen.add(spanKey);

        // Find the cell bounds for this span so we can compute the exact Z intersection
        // between the ship footprint and the ramp tile — matching old code lines 889-891.
        const cell = worldToCell(this.position.x, qz);
        if (!cell) continue;
        const bounds = cellBounds(cell.c, cell.r);

        const startIntersect = Math.max(this.position.z - halfL, bounds.minZ);
        const endIntersect   = Math.min(this.position.z + halfL, bounds.maxZ);
        const overlap = Math.max(0, endIntersect - startIntersect);
        if (overlap > 0) {
          sumOverlap += overlap;
          sumWeightedSlope += overlap * support.slope;
        }
      }

      if (sumOverlap > 0) {
        this.onRamp = true;
        this.rampSlope = sumWeightedSlope / SHIP_LENGTH;
      } else {
        this.onRamp = false;
        this.rampSlope = 0.0;
      }
    } else {
      this.onRamp = false;
      this.rampSlope = 0.0;
    }

    // ── Fall / deathY ─────────────────────────────────────────────────────────
    // O(1): local floor is always 0; deathY = -4.0 (matches old default when no
    // low ramps present). Low ramps (startY < -4) would push this lower, but
    // those cases are rare and the old O(n) scan's result was also -4 unless a
    // collidable went below -4. The ramps test for deathY (line 290-315) uses a
    // ramp ending at -6.0 → old deathY = min(-4, -6 - 4) = -10. With the column
    // model we query the grid's minimum floor Y instead.
    let deathY;
    if (grid === this._deathYGrid) {
      deathY = this._cachedDeathY; // grid is immutable → reuse last frame's scan
    } else {
      deathY = -4.0;
      if (grid && numRows > 0) {
        let minRoadY = 0.0;
        for (let r = 0; r < numRows; r++) {
          for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
            const col = grid[r]?.[c];
            if (!col || col.isGap) continue;
            for (const span of col.spans) {
              if (!span.isWallObstacle) {
                const spanMinY = Math.min(span.topEntryY, span.topExitY);
                if (spanMinY < minRoadY) minRoadY = spanMinY;
              }
            }
          }
        }
        deathY = Math.min(-4.0, minRoadY - 4.0);
      }
      this._deathYGrid = grid;
      this._cachedDeathY = deathY;
    }
    this.deathY = deathY;

    const canFallBelow = (this.playStyle === 'flow') || (this.playStyle === 'tower' && this.activeLevelIndex > 0);
    if (this.position.y < deathY) {
      if (canFallBelow) {
        // app.js handles the wrap
      } else {
        this.isDead = true;
        this.deathReason = 'FELL OFF ROAD';
        this.velocity.set(0, -15, 0);
      }
    }

    // Special-tile effects still run as today (resolveSpecialTiles already called
    // in step 2 of update(), before this method is reached).
  }
  // ── End _updateColumnCollision ────────────────────────────────────────────────

  /**
   * P1.4: Build a minimal columnGrid from legacy collidables array.
   * Used as a test/fallback path when neither levelInfo.columnGrid nor
   * window.currentLevelData is available. Converts each collidable to one or
   * more Span objects placed in the correct cell. Non-covered cells default to
   * flat road so the ground-check doesn't fall through.
   *
   * ponytail: only called when the other two sources are absent (tests, editor).
   * In production P3.1 provides levelInfo.columnGrid directly.
   */
  _buildGridFromCollidables(collidables) {
    const HALF_ROAD = TOTAL_ROAD_WIDTH / 2; // 7.0

    // Find how many rows we need
    let maxRow = 29; // safe default for tests
    for (const blk of collidables) {
      const r = Math.round(-blk.maxZ / TILE_LENGTH);
      if (r > maxRow) maxRow = r;
      const r2 = Math.round(-blk.minZ / TILE_LENGTH);
      if (r2 > maxRow) maxRow = r2;
    }
    const numRows = maxRow + 1;

    // Build rows as flat road by default
    const rows = Array.from({ length: numRows }, () =>
      Array.from({ length: ROAD_WIDTH_LANES }, () => ({
        val: 0, full: false, half: false, tunnel: false,
        top_color: 0, bottom_color: 0, low3: 0,
      }))
    );

    for (const blk of collidables) {
      const centerX = (blk.minX + blk.maxX) / 2;
      // Use floor (matching worldToCell) so x=0 → lane 3, not lane 4
      const c = Math.floor((centerX + HALF_ROAD) / TILE_WIDTH);
      // Row: maxZ=0 → r=0, maxZ=-4 → r=1, etc. Use round to handle fp edge cases.
      const r = Math.round(-blk.maxZ / TILE_LENGTH);

      if (r < 0 || r >= numRows || c < 0 || c >= ROAD_WIDTH_LANES) continue;

      if (blk.isRamp) {
        rows[r][c] = {
          val: 0, full: false, half: false, tunnel: false,
          ramp: true,
          startY: blk.startY ?? 0,
          endY: blk.endY ?? 0,
          top_color: 0, bottom_color: 0, low3: 0,
        };
      } else if (blk.isObstacle && !blk.isCeiling) {
        const h = blk.maxY ?? 0;
        rows[r][c] = {
          val: 0,
          full: h >= 2.0,
          half: h >= 1.0 && h < 2.0,
          tunnel: false,
          top_color: 0, bottom_color: 0, low3: 0,
        };
      }
      // Ceiling blocks and non-obstacle flat blocks stay as flat road
    }

    return buildColumnGrid({ rows });
  }

  // P2.2: super-jump detection via column grid span (no window.currentLevelData read).
  // Span.isSuperJump is set by legacyTileToSpans for flat-road tiles that carry the flag.
  checkSuperJumpTile(x, z) {
    if (!this._colGrid || !this._colNumRows) return false;
    const cell = worldToCell(x, z);
    if (!cell) return false;
    const col = this._colGrid[cell.r]?.[cell.c];
    if (!col || col.isGap) return false;
    return col.spans.some(s => s.isSuperJump);
  }

  // Ship bounding box
  getShipBox() {
    const halfW = SHIP_COLLISION_WIDTH / 2;
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
    this.activeEffects.superBoost = false;
    this.activeEffects.sticky = false;
    this.activeEffects.slippery = false;
    this.activeEffects.burning = false;
    this.activeEffects.highJump = false;

    for (const tile of specialTiles) {
      const box = tile.boundingBox;
      const xOverlap = shipBox.maxX > box.minX && shipBox.minX < box.maxX;
      const yOverlap = shipBox.minY <= box.maxY && shipBox.maxY >= box.minY;
      const zOverlap = shipBox.maxZ > box.minZ && shipBox.minZ < box.maxZ;

      if (xOverlap && yOverlap && zOverlap) {
        const behavior = tile.behavior;
        if (behavior === 'boost') {
          this.activeEffects.boost = true;
        } else if (behavior === 'super_boost') {
          this.activeEffects.superBoost = true;
        } else if (behavior === 'sticky') {
          this.activeEffects.sticky = true;
        } else if (behavior === 'slippery') {
          this.activeEffects.slippery = true;
        } else if (behavior === 'burning') {
          this.activeEffects.burning = true;
        } else if (behavior === 'high_jump') {
          this.activeEffects.highJump = true;
        } else if (behavior === 'refill') {
          // Refills occur instantaneously, restoring health, adding fuel, and resetting oxygen to max
          if (this.fuel < 100 * 50) {
            this.fuel = Math.min(100 * 50, this.fuel + 1000);
          }
          this.oxygen = 100;
          this.health = 100.0;
          
          // Trigger a sound chime (we set a flag to notify app.js)
          this.triggerRefillAudio = true;
        }
      }
    }
  }

  applyShipClass(className, writeToLocalStorage = true) {
    const mappedClass = LEGACY_MODEL_ALIASES[className] || className;
    this.shipClass = mappedClass;
    const stats = CLASS_PRESETS[mappedClass] || CLASS_PRESETS.original;
    this.fuelConsumptionRate = stats.fuelConsumptionRate || 25.0;
    
    for (const key in stats) {
      this.settings[key] = stats[key];
      if (this[key] !== undefined) {
        this[key] = stats[key];
      }
    }
    
    if (writeToLocalStorage && typeof localStorage !== 'undefined') {
      const activePreset = localStorage.getItem('skyroads_physics_active_preset') || 'snappy';
      const presetKey = `skyroads_physics_preset_${activePreset}`;
      let presetData = {};
      try {
        const saved = localStorage.getItem(presetKey);
        if (saved) {
          presetData = JSON.parse(saved);
        }
      } catch (e) {
        // ignore
      }
      
      for (const key in stats) {
        presetData[key] = stats[key];
      }
      
      localStorage.setItem(presetKey, JSON.stringify(presetData));
      localStorage.setItem('skyroads_selected_model', className);
    }
  }
}

// Simple Keyboard controller class with optional mouse play support
export class KeyboardController {
  constructor() {
    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpPulse = false; // edge-triggered: true only on keydown, cleared by resetJump()
    this.rewind = false;
    this.spacePressed = false;
    this.steerAmount = 0; // Proportional steer amount (-1 to 1) like an analogue stick

    this.touch = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      rewind: false
    };

    // Separate keyboard and mouse state tracking to allow seamless combinations
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      rewind: false
    };

    this.mouse = {
      forward: false,
      left: false,
      right: false,
      jump: false
    };

    this.mouseControlsEnabled = false;
    this.touchControlsEnabled = false;
    this.touchJoystickThrottleEnabled = false;
    this.laneSnapEnabled = true;

    this.gamepadConnected = false;
    this.gamepad = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      rewind: false,
      steerAmount: 0,
      cycleCameraPressed: false,
      togglePausePressed: false,
      menuUp: false,
      menuDown: false,
      menuLeft: false,
      menuRight: false,
      menuSelect: false,
      menuCancel: false
    };

    this.gamepadMappings = {
      forward: 7,       // RT (Right Trigger)
      backward: 6,      // LT (Left Trigger)
      jump: 0,          // A button
      left: 14,         // D-pad Left
      right: 15,        // D-pad Right
      rewind: 2,        // X button
      cycleCamera: 3,   // Y button
      togglePause: 9    // Start button
    };

    this.prevGamepadButtons = {};
    this.prevMenuDirections = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    this.currentlyMappingAction = null;
    this.onGamepadMapComplete = null;

    this.loadGamepadMappings();

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => this.handleKey(e, true));
      window.addEventListener('keyup', (e) => this.handleKey(e, false));

      window.addEventListener('mousedown', (e) => this.handleMouseDown(e));
      window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
      window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
      window.addEventListener('contextmenu', (e) => {
        if (this.mouseControlsEnabled) {
          e.preventDefault();
        }
      });

      window.addEventListener('gamepadconnected', () => {
        this.gamepadConnected = true;
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.gamepadConnected = false;
      });
    }
  }

  handleKey(e, isDown) {
    if (typeof document !== 'undefined' && document.activeElement && 
        (document.activeElement.tagName === 'INPUT' || 
         document.activeElement.tagName === 'TEXTAREA' || 
         document.activeElement.tagName === 'SELECT')) {
      return;
    }
    // Ignore key presses (keydown) when the game is not actively playing.
    // However, always process key releases (keyup) so that keys do not get stuck.
    if (isDown && typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    const code = e.code;
    if (code === 'ArrowUp' || code === 'KeyW') this.keys.forward = isDown;
    if (code === 'ArrowDown' || code === 'KeyS') this.keys.backward = isDown;
    if (code === 'ArrowLeft' || code === 'KeyA') this.keys.left = isDown;
    if (code === 'ArrowRight' || code === 'KeyD') this.keys.right = isDown;
    if (code === 'Space') {
      if (isDown && !this.keys.jump) this.jumpPulse = true; // rising edge
      this.keys.jump = isDown;
    }
    if (code === 'KeyR') {
      this.keys.rewind = isDown;
    }
    this.updateCombinedState();
  }

  handleMouseDown(e) {
    if (!this.mouseControlsEnabled) return;
    if (typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    if (e.button === 0) { // Left Click -> Jump
      if (!this.mouse.jump) this.jumpPulse = true;
      this.mouse.jump = true;
    } else if (e.button === 2) { // Right Click -> Accelerate
      this.mouse.forward = true;
    }
    this.updateCombinedState();
  }

  handleMouseUp(e) {
    if (!this.mouseControlsEnabled) return;
    if (e.button === 0) {
      this.mouse.jump = false;
    } else if (e.button === 2) {
      this.mouse.forward = false;
    }
    this.updateCombinedState();
  }

  handleMouseMove(e) {
    if (!this.mouseControlsEnabled) {
      this.mouse.left = false;
      this.mouse.right = false;
      this.steerAmount = 0;
      this.updateCombinedState();
      return;
    }
    if (typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    // Proportional analogue-style steering with central deadzone
    const centerX = window.innerWidth / 2;
    const diff = e.clientX - centerX;
    const deadzone = window.innerWidth * 0.05; // Tight, premium 5% deadzone
    const maxRange = window.innerWidth * 0.40; // Full steering achieved at 40% width from center

    if (Math.abs(diff) < deadzone) {
      this.steerAmount = 0;
      this.mouse.left = false;
      this.mouse.right = false;
    } else {
      const sign = diff < 0 ? -1 : 1;
      const val = (Math.abs(diff) - deadzone) / (maxRange - deadzone);
      this.steerAmount = Math.max(-1, Math.min(1, val * sign));
      this.mouse.left = this.steerAmount < 0;
      this.mouse.right = this.steerAmount > 0;
    }
    this.updateCombinedState();
  }

  setTouchState(action, active) {
    if (active && typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    if (this.touch[action] !== undefined) {
      if (action === 'jump' && active && !this.touch.jump) this.jumpPulse = true;
      this.touch[action] = active;
    }
    this.updateCombinedState();
  }

  setTouchSteerAmount(amount) {
    if (amount !== 0 && typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    this.steerAmount = amount;
    if (amount < 0) {
      this.touch.left = true;
      this.touch.right = false;
    } else if (amount > 0) {
      this.touch.left = false;
      this.touch.right = true;
    } else {
      this.touch.left = false;
      this.touch.right = false;
    }
    this.updateCombinedState();
  }

  setTouchJoystickY(yAmount) {
    if (!this.touchJoystickThrottleEnabled) {
      this.touch.forward = false;
      this.touch.backward = false;
      return;
    }
    if (yAmount !== 0 && typeof window !== 'undefined' && window.gameManagerInstance && window.gameManagerInstance.gameState !== 'playing') {
      return;
    }
    // yAmount ranges from -1 (top/forward) to 1 (bottom/backward)
    if (yAmount < -0.2) {
      this.touch.forward = true;
      this.touch.backward = false;
    } else if (yAmount > 0.2) {
      this.touch.forward = false;
      this.touch.backward = true;
    } else {
      this.touch.forward = false;
      this.touch.backward = false;
    }
    this.updateCombinedState();
  }

  resetKeys() {
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.jump = false;
    this.keys.rewind = false;
    
    this.mouse.forward = false;
    this.mouse.left = false;
    this.mouse.right = false;
    this.mouse.jump = false;

    this.touch.forward = false;
    this.touch.backward = false;
    this.touch.left = false;
    this.touch.right = false;
    this.touch.jump = false;
    this.touch.rewind = false;

    this.gamepad.forward = false;
    this.gamepad.backward = false;
    this.gamepad.left = false;
    this.gamepad.right = false;
    this.gamepad.jump = false;
    this.gamepad.rewind = false;
    this.gamepad.steerAmount = 0;

    this.forward = false;
    this.backward = false;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpPulse = false;
    this.rewind = false;
    this.spacePressed = false;
    this.steerAmount = 0;
  }

  updateCombinedState() {
    this.pollGamepad();

    this.forward = this.keys.forward || (this.mouseControlsEnabled && this.mouse.forward) || (this.touchControlsEnabled && this.touch.forward) || this.gamepad.forward;
    this.backward = this.keys.backward || (this.touchControlsEnabled && this.touch.backward) || this.gamepad.backward;
    this.left = this.keys.left || (this.mouseControlsEnabled && this.mouse.left) || (this.touchControlsEnabled && this.touch.left) || this.gamepad.left;
    this.right = this.keys.right || (this.mouseControlsEnabled && this.mouse.right) || (this.touchControlsEnabled && this.touch.right) || this.gamepad.right;
    this.jump = this.keys.jump || (this.mouseControlsEnabled && this.mouse.jump) || (this.touchControlsEnabled && this.touch.jump) || this.gamepad.jump;
    this.rewind = this.keys.rewind || (this.touchControlsEnabled && this.touch.rewind) || this.gamepad.rewind;
    this.spacePressed = this.keys.jump || (this.mouseControlsEnabled && this.mouse.jump) || (this.touchControlsEnabled && this.touch.jump) || this.gamepad.jump;

    // Steer Amount: prioritize analog gamepad stick, then touch/mouse steer amount
    if (this.gamepadConnected && this.gamepad.steerAmount !== 0) {
      this.steerAmount = this.gamepad.steerAmount;
    } else if (this.mouseControlsEnabled || this.touchControlsEnabled) {
      // Keep mouse/touch steerAmount if active
    } else {
      this.steerAmount = 0;
    }
  }

  loadGamepadMappings() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('skyroads_gamepad_mappings');
      if (saved) {
        try {
          this.gamepadMappings = { ...this.gamepadMappings, ...JSON.parse(saved) };
        } catch (e) {
          // Fallback to default
        }
      }
    }
  }

  saveGamepadMappings() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyroads_gamepad_mappings', JSON.stringify(this.gamepadMappings));
    }
  }

  _isGamepadPressed(gp, btnIndex) {
    if (btnIndex === null || btnIndex === undefined) return false;
    const btn = gp.buttons[btnIndex];
    return btn ? btn.pressed : false;
  }

  _detectGamepadJustPressed(gp, btnIndex, actionKey) {
    if (btnIndex === null || btnIndex === undefined) return false;
    const btn = gp.buttons[btnIndex];
    const pressed = btn ? btn.pressed : false;
    const prevPressed = this.prevGamepadButtons[actionKey] || false;
    this.prevGamepadButtons[actionKey] = pressed;
    return pressed && !prevPressed;
  }

  _detectMenuDirectionPress(dirKey, isPressedNow) {
    const prevPressed = this.prevMenuDirections[dirKey] || false;
    this.prevMenuDirections[dirKey] = isPressedNow;
    return isPressedNow && !prevPressed;
  }

  pollGamepad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) {
      this.gamepadConnected = false;
      return;
    }

    const gamepads = navigator.getGamepads();
    let gp = null;
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        gp = gamepads[i];
        break;
      }
    }

    if (!gp) {
      this.gamepadConnected = false;
      this.gamepad.forward = false;
      this.gamepad.backward = false;
      this.gamepad.left = false;
      this.gamepad.right = false;
      this.gamepad.jump = false;
      this.gamepad.rewind = false;
      this.gamepad.steerAmount = 0;
      this.gamepad.cycleCameraPressed = false;
      this.gamepad.togglePausePressed = false;
      this.gamepad.menuUp = false;
      this.gamepad.menuDown = false;
      this.gamepad.menuLeft = false;
      this.gamepad.menuRight = false;
      this.gamepad.menuSelect = false;
      this.gamepad.menuCancel = false;
      this.prevMenuDirections.up = false;
      this.prevMenuDirections.down = false;
      this.prevMenuDirections.left = false;
      this.prevMenuDirections.right = false;
      return;
    }

    this.gamepadConnected = true;

    // If currently mapping a button, listen for any pressed button
    if (this.currentlyMappingAction) {
      for (let b = 0; b < gp.buttons.length; b++) {
        if (gp.buttons[b].pressed) {
          const action = this.currentlyMappingAction;
          this.gamepadMappings[action] = b;
          this.saveGamepadMappings();
          this.currentlyMappingAction = null;
          
          if (typeof this.onGamepadMapComplete === 'function') {
            this.onGamepadMapComplete(action, b);
          }
          break;
        }
      }
      return;
    }

    // Read action states
    this.gamepad.forward = this._isGamepadPressed(gp, this.gamepadMappings.forward);
    this.gamepad.backward = this._isGamepadPressed(gp, this.gamepadMappings.backward);
    const gpJumpNow = this._isGamepadPressed(gp, this.gamepadMappings.jump);
    if (gpJumpNow && !this.gamepad.jump) this.jumpPulse = true; // rising edge
    this.gamepad.jump = gpJumpNow;
    this.gamepad.rewind = this._isGamepadPressed(gp, this.gamepadMappings.rewind);

    const steerLeftVal = this._isGamepadPressed(gp, this.gamepadMappings.left);
    const steerRightVal = this._isGamepadPressed(gp, this.gamepadMappings.right);

    // Left stick X axis analog steering
    if (gp.axes && gp.axes.length > 0) {
      const steerAxis = gp.axes[0];
      const deadzone = 0.15;
      if (Math.abs(steerAxis) > deadzone) {
        this.gamepad.steerAmount = steerAxis;
        this.gamepad.left = steerAxis < 0;
        this.gamepad.right = steerAxis > 0;
      } else {
        this.gamepad.steerAmount = 0;
        this.gamepad.left = steerLeftVal;
        this.gamepad.right = steerRightVal;
      }
    } else {
      this.gamepad.steerAmount = 0;
      this.gamepad.left = steerLeftVal;
      this.gamepad.right = steerRightVal;
    }

    this.gamepad.cycleCameraPressed = this._detectGamepadJustPressed(gp, this.gamepadMappings.cycleCamera, 'cycleCamera');
    this.gamepad.togglePausePressed = this._detectGamepadJustPressed(gp, this.gamepadMappings.togglePause, 'togglePause');

    // Menu Navigation Directions & Buttons
    let stickUp = false;
    let stickDown = false;
    let stickLeft = false;
    let stickRight = false;

    if (gp.axes && gp.axes.length > 1) {
      const stickX = gp.axes[0];
      const stickY = gp.axes[1];
      const stickThreshold = 0.5;
      
      stickUp = stickY < -stickThreshold;
      stickDown = stickY > stickThreshold;
      stickLeft = stickX < -stickThreshold;
      stickRight = stickX > stickThreshold;
    }

    // Combined menu directions (D-pad or Left Stick)
    const dirUp = this._isGamepadPressed(gp, 12) || stickUp;
    const dirDown = this._isGamepadPressed(gp, 13) || stickDown;
    const dirLeft = this._isGamepadPressed(gp, 14) || stickLeft;
    const dirRight = this._isGamepadPressed(gp, 15) || stickRight;

    this.gamepad.menuUp = this._detectMenuDirectionPress('up', dirUp);
    this.gamepad.menuDown = this._detectMenuDirectionPress('down', dirDown);
    this.gamepad.menuLeft = this._detectMenuDirectionPress('left', dirLeft);
    this.gamepad.menuRight = this._detectMenuDirectionPress('right', dirRight);

    // Menu Select (A button) & Cancel (B button) transitions
    this.gamepad.menuSelect = this._detectGamepadJustPressed(gp, 0, 'menuSelect');
    this.gamepad.menuCancel = this._detectGamepadJustPressed(gp, 1, 'menuCancel');
  }

  consumeCycleCamera() {
    if (this.gamepad.cycleCameraPressed) {
      this.gamepad.cycleCameraPressed = false;
      return true;
    }
    return false;
  }

  consumeTogglePause() {
    if (this.gamepad.togglePausePressed) {
      this.gamepad.togglePausePressed = false;
      return true;
    }
    return false;
  }

  resetJump() {
    this.jump = false;
    this.jumpPulse = false;
  }
}

