import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { KeyboardController, PhysicsEngine } from '../physics.js';

describe('Lane Snap Settings & Tuning', () => {
  let keyboard;
  let physics;
  let levelInfo;

  beforeEach(() => {
    vi.clearAllMocks();
    keyboard = new KeyboardController();
    physics = new PhysicsEngine();
    levelInfo = {
      trackLength: 200.0,
      finishZ: -202.0,
      gravity: 24.0,
      fuel: 100,
      oxygen: 100,
      collidables: [],
      specialTiles: [],
      roadMeshes: []
    };
    
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Lane Snap Toggle', () => {
    it('should default laneSnapEnabled to true in KeyboardController', () => {
      expect(keyboard.laneSnapEnabled).toBe(true);
    });

    it('should respect laneSnapEnabled state in settings', () => {
      keyboard.laneSnapEnabled = false;
      expect(keyboard.laneSnapEnabled).toBe(false);
    });
  });

  describe('Physics snap integration', () => {
    it('should NOT apply lane snapping when laneSnapEnabled is false', () => {
      keyboard.touchControlsEnabled = true;
      keyboard.laneSnapEnabled = false;
      keyboard.steerAmount = 0; // neutral joystick

      physics.position.set(0.4, 0, 0); // ship is off-center (lane is 0.0)
      physics.onGround = true;
      physics.velocity.x = 0;

      physics.update(1/60, keyboard, levelInfo);
      
      // Expected steer speed should be 0 because snap is disabled
      expect(physics.velocity.x).toBe(0);
    });

    it('should apply lane snapping when laneSnapEnabled is true', () => {
      keyboard.touchControlsEnabled = true;
      keyboard.laneSnapEnabled = true;
      keyboard.steerAmount = 0; // neutral joystick

      physics.position.set(0.4, 0, 0); // ship is off-center (nearest lane is 0.0)
      physics.onGround = true;
      physics.velocity.x = 0;

      physics.update(1/60, keyboard, levelInfo);
      
      // Nearest lane = 0.0. distToLane = 0.0 - 0.4 = -0.4.
      // snapStrength = 4.0. Target steer speed = -0.4 * 4.0 = -1.6.
      // velocity.x updates: velocity.x += (targetSteerSpeed - velocity.x) * 15.0 * dt
      // velocity.x += (-1.6 - 0) * 15 * (1/60) = -1.6 * 0.25 = -0.4.
      expect(physics.velocity.x).toBeCloseTo(-0.4, 3);
    });

    it('should adjust snap pull velocity dynamically based on laneSnapStrength settings value', () => {
      keyboard.touchControlsEnabled = true;
      keyboard.laneSnapEnabled = true;
      keyboard.steerAmount = 0; // neutral joystick

      physics.settings.laneSnapStrength = 10.0; // Cranked snap strength
      physics.position.set(0.4, 0, 0);
      physics.onGround = true;
      physics.velocity.x = 0;

      physics.update(1/60, keyboard, levelInfo);
      
      // Nearest lane = 0.0. distToLane = -0.4.
      // snapStrength = 10.0. Target steer speed = -0.4 * 10.0 = -4.0.
      // velocity.x updates: velocity.x += (-4.0 - 0) * 15.0 * (1/60) = -4.0 * 0.25 = -1.0.
      expect(physics.velocity.x).toBeCloseTo(-1.0, 3);
    });
  });
});
