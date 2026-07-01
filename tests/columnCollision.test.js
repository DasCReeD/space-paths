/**
 * tests/columnCollision.test.js
 *
 * Parity tests for the NEW column-collision path (useColumnCollision=true).
 * Each test section corresponds to a lettered behavior from the task spec
 * (A–E). All numeric thresholds match the live physics.js constants — read
 * don't invent.
 *
 * Grid setup: set window.currentLevelData = { rows } so _updateColumnCollision
 * calls buildColumnGrid(rawData) internally. Cleaned up in afterEach.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { PhysicsEngine, SHIP_COLLISION_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from '../physics.js';
import { TILE_WIDTH, TILE_LENGTH, ROAD_WIDTH_LANES } from '../heightfield.js';

// ── Web Audio stub (mirrors physics.test.js) ─────────────────────────────────
if (typeof window !== 'undefined') {
  window.AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }
    }),
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }
    }),
    createBiquadFilter: vi.fn().mockReturnValue({
      connect: vi.fn(),
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    }),
    createBuffer: vi.fn().mockReturnValue({ getChannelData: vi.fn().mockReturnValue(new Float32Array(100)) }),
    createBufferSource: vi.fn().mockReturnValue({ connect: vi.fn(), start: vi.fn(), stop: vi.fn() }),
    destination: {},
    currentTime: 0,
    sampleRate: 44100
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function createKeyboard(overrides = {}) {
  return {
    forward: false, backward: false,
    left: false, right: false,
    jump: false,
    resetJump: vi.fn(),
    ...overrides,
  };
}

function createLevelInfo(overrides = {}) {
  return {
    trackLength: 200.0,
    finishZ: -202.0,
    gravity: 24.0,
    fuel: 100,
    oxygen: 100,
    collidables: [],
    specialTiles: [],
    roadMeshes: [],
    ...overrides,
  };
}

/**
 * Build a minimal rows array: numRows rows × 7 lanes, all flat road by default.
 * Lane 3 is the centre lane (x=0).
 * Pass a cellOverride fn(r, c) -> tile | null to customise individual cells.
 */
function buildRows(numRows = 40, cellOverride = null) {
  return Array.from({ length: numRows }, (_, r) =>
    Array.from({ length: ROAD_WIDTH_LANES }, (__, c) =>
      cellOverride ? (cellOverride(r, c) ?? {}) : {}
    )
  );
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Column collision path (useColumnCollision=true)', () => {
  let physics;
  let keyboard;
  let levelInfo;

  beforeEach(() => {
    physics = new PhysicsEngine();
    // Disable forward drag so Z position is stable in tests that need it.
    physics.settings.dragZ = 0.0;
    keyboard = createKeyboard();
    levelInfo = createLevelInfo();
    physics.reset(100, 100);
    // Clear any residual cached grid from a prior test.
    physics._colGrid = null;
    physics._colNumRows = 0;
    physics._colLevelId = null;
    physics._colCollidablesLen = -1;
  });

  afterEach(() => {
    // Prevent window.currentLevelData leaking into other suites.
    if (typeof window !== 'undefined') window.currentLevelData = null;
  });

  // ── A. Flat-ground support ────────────────────────────────────────────────

  describe('A — Flat-ground support', () => {
    it('ship falling slightly above flat road lands: onGround=true, position.y≈0, groundHeight≈0', () => {
      window.currentLevelData = { rows: buildRows(40) };

      // Place ship a bit above y=0 at lane 3 (x=0), row 1 (z=-1)
      physics.position.set(0, 0.05, -1.0);
      physics.velocity.set(0, -2.0, 0);
      physics.onGround = false;

      physics.update(0.016, keyboard, levelInfo);

      expect(physics.onGround).toBe(true);
      expect(physics.position.y).toBeCloseTo(0.0, 3);
      expect(physics.groundHeight).toBeCloseTo(0.0, 3);
    });

    it('gravity is NOT applied once grounded: velocity.y stays 0 across a frame on flat road', () => {
      window.currentLevelData = { rows: buildRows(40) };

      // Ship is exactly on the ground.
      physics.position.set(0, 0.0, -1.0);
      physics.velocity.set(0, 0, 0);
      physics.onGround = true;

      physics.update(0.016, keyboard, levelInfo);

      // Must be grounded and vertical velocity must not have been pulled negative.
      expect(physics.onGround).toBe(true);
      expect(physics.velocity.y).toBeCloseTo(0.0, 3);
    });
  });

  // ── B. Jump from flat ground ──────────────────────────────────────────────

  describe('B — Jump from flat ground', () => {
    it('on-ground + jump pressed => velocity.y = jumpImpulse minus one frame of gravity', () => {
      window.currentLevelData = { rows: buildRows(40) };

      physics.position.set(0, 0.0, -1.0);
      physics.velocity.set(0, 0, 0);
      physics.onGround = true;
      keyboard.jump = true;

      physics.update(0.05, keyboard, levelInfo);

      // jumpImpulse=10.5; gravity=24.0; after one frame: 10.5 - 24*0.05 = 9.3
      expect(physics.velocity.y).toBeCloseTo(10.5 - 24.0 * 0.05, 5);
    });

    it('on-ground + jump pressed => onGround=false next frame (no collidables above)', () => {
      window.currentLevelData = { rows: buildRows(40) };

      physics.position.set(0, 0.0, -1.0);
      physics.velocity.set(0, 0, 0);
      physics.onGround = true;
      keyboard.jump = true;

      physics.update(0.05, keyboard, levelInfo);

      // Ship jumped off; no collision above → still in the air
      expect(physics.onGround).toBe(false);
    });
  });

  // ── C. Classic landing rebound ────────────────────────────────────────────

  describe('C — Classic landing rebound', () => {
    it('landing fast (vy < -3) with jump NOT held => isRebounding=true, velocity.y=4.2, triggerLandingReboundAudio set', () => {
      window.currentLevelData = { rows: buildRows(40) };

      physics.position.set(0, 0.05, -30.0);
      physics.velocity.set(0, -6.0, -10.0);
      physics.onGround = false;

      physics.update(0.016, keyboard, levelInfo);

      expect(physics.isRebounding).toBe(true);
      expect(physics.reboundTimer).toBe(0.12);
      expect(physics.onGround).toBe(false); // airborne during bounce
      expect(physics.velocity.y).toBe(4.2); // bounce impulse
      expect(physics.position.y).toBeCloseTo(0.0, 3); // snapped to ground
      expect(physics.triggerLandingReboundAudio).toBe(true);
    });

    it('bounceFactor=1.5 => bounce velocity = 4.2 * 1.5 = 6.3', () => {
      window.currentLevelData = { rows: buildRows(40) };

      physics.position.set(0, 0.05, -30.0);
      physics.velocity.set(0, -6.0, -10.0);
      physics.onGround = false;
      physics.settings.bounceFactor = 1.5;

      physics.update(0.016, keyboard, levelInfo);

      expect(physics.velocity.y).toBeCloseTo(6.3, 5);
    });
  });

  // ── D. Fall-off-road death ────────────────────────────────────────────────

  describe('D — Fall-off-road death', () => {
    it('ship falling through GAP columns and below deathY => isDead=true, reason=FELL OFF ROAD', () => {
      // Build rows where the centre lane (lane 3, x=0) is a gap (null)
      // and the ship is already at x=0, below deathY=-4.0
      window.currentLevelData = {
        rows: buildRows(40, (r, c) => c === 3 ? null : {}),
      };

      physics.playStyle = 'classic'; // must die, not wrap
      physics.position.set(0, -4.5, -1.0); // x=0 is lane 3 (gap), below deathY
      physics.velocity.set(0, -2.0, 0);
      physics.onGround = false;

      physics.update(0.05, keyboard, levelInfo);

      expect(physics.isDead).toBe(true);
      expect(physics.deathReason).toBe('FELL OFF ROAD');
    });

    it('plummet velocity is set to -15 on fall-off-road death', () => {
      window.currentLevelData = {
        rows: buildRows(40, (r, c) => c === 3 ? null : {}),
      };

      physics.playStyle = 'classic';
      physics.position.set(0, -4.5, -1.0);
      physics.velocity.set(0, -2.0, 0);
      physics.onGround = false;

      physics.update(0.05, keyboard, levelInfo);

      expect(physics.velocity.y).toBe(-15);
    });
  });

  // ── E. Obstacle outcomes by difficulty ───────────────────────────────────

  describe('E — Obstacle outcomes', () => {
    /**
     * Helper: build rows with a full-block obstacle ({full:true}) at row r=1,
     * lane 3 (x=0, z in [-8..-4]), surrounded by flat road.
     * Row 0 = z in [0..-4], row 1 = z in [-4..-8].
     */
    function buildRowsWithBlock() {
      return buildRows(40, (r, c) => {
        if (r === 1 && c === 3) return { full: true, top_color: 0, bottom_color: 0 };
        return {};
      });
    }

    it('hard difficulty + head-on hit => isDead=true, deathReason=COLLIDED WITH BLOCK', () => {
      window.currentLevelData = { rows: buildRowsWithBlock() };

      physics.difficulty = 'hard';
      // Place ship just in front of block (block occupies z=-4..-8; entry edge = z=-4)
      // Ship travelling forward into it.
      physics.position.set(0, 0.0, -3.6);
      physics.velocity.set(0, 0, -20.0);
      physics.onGround = true;

      physics.update(0.05, keyboard, levelInfo);

      expect(physics.isDead).toBe(true);
      expect(physics.deathReason).toBe('COLLIDED WITH BLOCK');
    });

    it('easy difficulty + head-on hit => NOT dead, velocity.z positive (bounced back)', () => {
      window.currentLevelData = { rows: buildRowsWithBlock() };

      physics.difficulty = 'easy';
      physics.position.set(0, 0.0, -3.6);
      physics.velocity.set(0, 0, -20.0);
      physics.onGround = true;

      physics.update(0.05, keyboard, levelInfo);

      expect(physics.isDead).toBe(false);
      // Bounced back: velocity.z should be positive (moving away from block)
      expect(physics.velocity.z).toBeGreaterThan(0);
    });

    it('side overlap (X) moving into block => velocity.x zeroed, ship not dead, pushed out', () => {
      window.currentLevelData = { rows: buildRowsWithBlock() };

      physics.difficulty = 'hard'; // even hard shouldn't die from a pure side scrape
      // Position ship beside lane 3 block, moving laterally into it.
      // Block centre x=0, ship approaching from x=-1.5 moving right (+x).
      // z=-5 is inside the block's Z range (-4..-8).
      const blockLaneCenterX = 0; // lane 3 centre
      const approachX = blockLaneCenterX - TILE_WIDTH / 2 - SHIP_COLLISION_WIDTH / 2 - 0.05;
      physics.position.set(approachX, 0.0, -5.0);
      physics.velocity.set(15.0, 0, 0); // moving purely in +X toward block
      physics.onGround = true;

      physics.update(0.016, keyboard, levelInfo);

      // Side-slide: not dead (not a frontal crash)
      // Hard difficulty side hit causes damage but only kills at 0 health.
      // We start at 100 health so we should survive one graze.
      expect(physics.isDead).toBe(false);
      // Velocity.x should be zeroed (slid along side)
      expect(physics.velocity.x).toBeCloseTo(0, 3);
    });
  });
});
