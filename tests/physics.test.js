import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PhysicsEngine, KeyboardController, SHIP_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from '../physics.js';

// Headless mock for Web Audio Context to prevent error in node environment
if (typeof window !== 'undefined') {
  window.AudioContext = vi.fn().mockImplementation(() => ({
    createOscillator: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn()
      }
    })),
    createGain: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn()
      }
    })),
    createBiquadFilter: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn()
      }
    })),
    createBuffer: vi.fn().mockImplementation(() => ({
      getChannelData: vi.fn().mockImplementation(() => new Float32Array(100))
    })),
    createBufferSource: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn()
    })),
    destination: {},
    currentTime: 0,
    sampleRate: 44100
  }));
}

describe('PhysicsEngine Unit Tests', () => {
  let physics;
  let keyboard;
  let mockLevelInfo;

  beforeEach(() => {
    physics = new PhysicsEngine();
    keyboard = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      resetJump: vi.fn()
    };
    
    // Mock level layout: length = 200 Z-units, gravity scale = 24.0, initial fuel = 100
    mockLevelInfo = {
      trackLength: 200.0,
      finishZ: -202.0,
      gravity: 24.0,
      fuel: 100,
      oxygen: 100,
      collidables: [],
      specialTiles: [],
      roadMeshes: []
    };

    physics.reset(100, 100);
  });

  it('should initialize ship position on the ground and set metrics', () => {
    expect(physics.position.x).toBe(0);
    expect(physics.position.y).toBe(0.2);
    expect(physics.position.z).toBe(0);
    expect(physics.velocity.length()).toBe(0);
    expect(physics.isDead).toBe(false);
    expect(physics.fuel).toBe(5000); // 100 * 50
    expect(physics.oxygen).toBe(100);
  });

  it('should consume fuel and oxygen as ship flies forward', () => {
    physics.velocity.z = -10.0; // flying forward along negative Z
    physics.update(0.05, keyboard, mockLevelInfo);
    
    expect(physics.fuel).toBeLessThan(5000);
    expect(physics.oxygen).toBe(99.95); // 100 - 0.05 * 1.0
  });

  it('should trigger death when fuel or oxygen runs out', () => {
    physics.fuel = 0;
    physics.update(0.05, keyboard, mockLevelInfo);
    expect(physics.isDead).toBe(true);
    expect(physics.deathReason).toBe('OUT OF FUEL');

    physics.reset(100, 100);
    physics.oxygen = 0;
    physics.update(0.05, keyboard, mockLevelInfo);
    expect(physics.isDead).toBe(true);
    expect(physics.deathReason).toBe('OUT OF OXYGEN');
  });

  it('should accelerate forward when pressing W / Forward key', () => {
    keyboard.forward = true;
    physics.update(0.05, keyboard, mockLevelInfo);
    
    // Z speed should decrease (moving in negative Z direction)
    expect(physics.velocity.z).toBeLessThan(0);
    expect(physics.position.z).toBeLessThan(0);
  });

  it('should apply natural rolling drag when W is released', () => {
    physics.velocity.z = -20.0;
    physics.update(0.05, keyboard, mockLevelInfo);
    
    // Natural drag should decrease speed (make it closer to 0)
    expect(physics.velocity.z).toBeGreaterThan(-20.0);
  });

  it('should steer left and right with correct velocity changes', () => {
    keyboard.left = true;
    physics.update(0.05, keyboard, mockLevelInfo);
    expect(physics.velocity.x).toBeLessThan(0);

    physics.reset(100, 100);
    keyboard.left = false;
    keyboard.right = true;
    physics.update(0.05, keyboard, mockLevelInfo);
    expect(physics.velocity.x).toBeGreaterThan(0);
  });

  it('should drift without steering friction when slippery effect is active', () => {
    // Put a mock slippery tile intersecting with the ship
    mockLevelInfo.specialTiles = [{
      boundingBox: {
        minX: -5.0, maxX: 5.0,
        minY: -1.0, maxY: 2.0,
        minZ: -5.0, maxZ: 5.0
      },
      behavior: 'slippery'
    }];
    
    physics.velocity.x = 5.0;
    
    // Update without keyboard input
    physics.update(0.05, keyboard, mockLevelInfo);
    
    // Side drift velocity should dampen very slowly (dampens by 1.0 * 0.05 = 0.05)
    expect(physics.velocity.x).toBe(4.95);
  });

  it('should jump and pull ship down with gravity', () => {
    keyboard.jump = true;
    physics.onGround = true;
    
    physics.update(0.05, keyboard, mockLevelInfo);
    
    expect(physics.onGround).toBe(false);
    expect(physics.velocity.y).toBe(physics.jumpImpulse - mockLevelInfo.gravity * 0.05);
    expect(physics.position.y).toBeGreaterThan(0.2);
  });

  it('should trigger death when ship falls off the road', () => {
    physics.position.y = -5.0; // fell down
    physics.update(0.1, keyboard, mockLevelInfo);
    
    expect(physics.isDead).toBe(true);
    expect(physics.deathReason).toBe('FELL OFF ROAD');
  });

  it('should check ship bounding box calculations accurately', () => {
    const box = physics.getShipBox();
    const halfW = SHIP_WIDTH / 2;
    
    expect(box.minX).toBe(physics.position.x - halfW);
    expect(box.maxX).toBe(physics.position.x + halfW);
    expect(box.minY).toBe(physics.position.y);
    expect(box.maxY).toBe(physics.position.y + SHIP_HEIGHT);
  });
});
