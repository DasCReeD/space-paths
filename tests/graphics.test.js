// Tests for the GraphicsEngine class in graphics.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// ── Mock WebGLRenderer (jsdom has no WebGL) ────────────────────────────────────

const mockRendererInstance = {
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  render: vi.fn(),
  domElement: document.createElement('canvas'),
  shadowMap: { enabled: false, type: null },
  toneMapping: null,
  toneMappingExposure: 1.0
};

vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      ...mockRendererInstance,
      // Fresh domElement per instantiation to avoid cross-test bleeding
      domElement: document.createElement('canvas')
    }))
  };
});

// ── Import the class under test ────────────────────────────────────────────────

import { GraphicsEngine } from '../graphics.js';
import { SHIP_WIDTH, SHIP_HEIGHT, SHIP_LENGTH } from '../physics.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function createMockContainer(width = 800, height = 600) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  container.appendChild = vi.fn();
  return container;
}

function createMockPhysics(overrides = {}) {
  const defaults = {
    position: new THREE.Vector3(0, 0.2, -30),
    velocity: new THREE.Vector3(0, 0, -15),
    isDead: false,
    activeEffects: { boost: false, sticky: false, slippery: false, burning: false }
  };
  return { ...defaults, ...overrides };
}

// ── Mock Canvas 2D Context (jsdom doesn't support it) ──────────────────────────

const mockGradient = { addColorStop: vi.fn() };
const mockCtx2d = {
  createRadialGradient: vi.fn(() => mockGradient),
  fillRect: vi.fn(),
  fillStyle: ''
};

// Patch getContext to return our mock for '2d' calls
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, ...args) {
  if (type === '2d') return mockCtx2d;
  return originalGetContext.call(this, type, ...args);
};

// ── Test Suites ─────────────────────────────────────────────────────────────────

describe('GraphicsEngine', () => {
  let engine;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new GraphicsEngine();
    container = createMockContainer();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Constructor defaults ─────────────────────────────────────────────────

  describe('constructor', () => {
    it('should initialize with null scene, camera, and renderer', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.scene).toBeNull();
      expect(fresh.camera).toBeNull();
      expect(fresh.renderer).toBeNull();
    });

    it('should initialize with null shipMesh', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.shipMesh).toBeNull();
    });

    it('should initialize with empty particles array', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.particles).toEqual([]);
    });

    it('should initialize with null starField', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.starField).toBeNull();
    });

    it('should set default camera offset vectors', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.camOffset).toBeInstanceOf(THREE.Vector3);
      expect(fresh.camOffset.x).toBe(0);
      expect(fresh.camOffset.y).toBe(1.8);
      expect(fresh.camOffset.z).toBe(5.0);
    });

    it('should set default camera target offset vectors', () => {
      const fresh = new GraphicsEngine();
      expect(fresh.camTargetOffset).toBeInstanceOf(THREE.Vector3);
      expect(fresh.camTargetOffset.x).toBe(0);
      expect(fresh.camTargetOffset.y).toBe(0.4);
      expect(fresh.camTargetOffset.z).toBe(-3.0);
    });
  });

  // ── init() ───────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('should create a Scene instance', () => {
      engine.init(container);
      expect(engine.scene).toBeInstanceOf(THREE.Scene);
    });

    it('should set fog on the scene', () => {
      engine.init(container);
      expect(engine.scene.fog).toBeInstanceOf(THREE.FogExp2);
    });

    it('should create a WebGLRenderer', () => {
      engine.init(container);
      expect(THREE.WebGLRenderer).toHaveBeenCalledWith({ antialias: true, alpha: false });
      expect(engine.renderer).toBeDefined();
    });

    it('should set renderer size to container dimensions', () => {
      engine.init(container);
      expect(mockRendererInstance.setSize).toHaveBeenCalledWith(800, 600);
    });

    it('should append renderer domElement to container', () => {
      engine.init(container);
      expect(container.appendChild).toHaveBeenCalled();
    });

    it('should create a PerspectiveCamera with correct aspect ratio', () => {
      engine.init(container);
      expect(engine.camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(engine.camera.fov).toBe(65);
      // Aspect should match container dimensions
      const expectedAspect = 800 / 600;
      expect(engine.camera.aspect).toBeCloseTo(expectedAspect, 2);
    });

    it('should position camera at (0, 3, 8)', () => {
      engine.init(container);
      expect(engine.camera.position.x).toBe(0);
      expect(engine.camera.position.y).toBe(3);
      expect(engine.camera.position.z).toBe(8);
    });

    it('should add ambient, directional, and fill lights to the scene', () => {
      engine.init(container);
      const lights = engine.scene.children.filter(
        child => child instanceof THREE.Light ||
                 child instanceof THREE.AmbientLight ||
                 child instanceof THREE.DirectionalLight
      );
      // AmbientLight, sunLight (DirectionalLight), fillLight (DirectionalLight)
      expect(lights.length).toBeGreaterThanOrEqual(3);
    });

    it('should create and store a sunLight reference', () => {
      engine.init(container);
      expect(engine.sunLight).toBeInstanceOf(THREE.DirectionalLight);
      expect(engine.sunLight.castShadow).toBe(true);
    });

    it('should call createSkybox and populate starField', () => {
      engine.init(container);
      expect(engine.starField).not.toBeNull();
      expect(engine.starField).toBeInstanceOf(THREE.Points);
    });

    it('should call createShipMesh and populate shipMesh', () => {
      engine.init(container);
      expect(engine.shipMesh).not.toBeNull();
      expect(engine.shipMesh).toBeInstanceOf(THREE.Group);
    });
  });

  // ── createSkybox() ──────────────────────────────────────────────────────

  describe('createSkybox()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should add starField Points to the scene', () => {
      const hasStarField = engine.scene.children.some(
        child => child instanceof THREE.Points
      );
      expect(hasStarField).toBe(true);
    });

    it('should create starField with 2000 stars (6000 position values)', () => {
      const posAttr = engine.starField.geometry.getAttribute('position');
      // 2000 stars * 3 components = 6000
      expect(posAttr.count).toBe(2000);
    });

    it('should create starField with vertex colors', () => {
      const colorAttr = engine.starField.geometry.getAttribute('color');
      expect(colorAttr).toBeDefined();
      expect(colorAttr.count).toBe(2000);
    });

    it('should not add a GridHelper to the scene', () => {
      const hasGrid = engine.scene.children.some(
        child => child instanceof THREE.GridHelper
      );
      expect(hasGrid).toBe(false);
    });

    it('should add a sun mesh to the scene', () => {
      expect(engine.sunMesh).toBeInstanceOf(THREE.Mesh);
      expect(engine.sunMesh.position.z).toBe(-350);
    });
  });

  // ── createShipMesh() ─────────────────────────────────────────────────────

  describe('createShipMesh()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should create shipMesh as a Group', () => {
      expect(engine.shipMesh).toBeInstanceOf(THREE.Group);
    });

    it('should add the ship group to the scene', () => {
      const hasShipGroup = engine.scene.children.some(
        child => child === engine.shipMesh
      );
      expect(hasShipGroup).toBe(true);
    });

    it('should contain body, wings, canopy, engines, and nozzles (at least 7 children)', () => {
      // body(1) + leftWing(1) + rightWing(1) + canopy(1) + engineL(1) + engineR(1) + nozzleL(1) + nozzleR(1) = 8
      expect(engine.shipMesh.children.length).toBe(8);
    });

    it('should store nozzle references for thruster glow', () => {
      expect(engine.nozzleL).toBeInstanceOf(THREE.Mesh);
      expect(engine.nozzleR).toBeInstanceOf(THREE.Mesh);
    });

    it('should use MeshStandardMaterial for ship body', () => {
      // First child is the body cone mesh
      const body = engine.shipMesh.children[0];
      expect(body.material).toBeInstanceOf(THREE.MeshStandardMaterial);
    });

    it('should set ship body to cast and receive shadows', () => {
      const body = engine.shipMesh.children[0];
      expect(body.castShadow).toBe(true);
      expect(body.receiveShadow).toBe(true);
    });
  });

  // ── update() ─────────────────────────────────────────────────────────────

  describe('update()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should return early without error if shipMesh is null', () => {
      engine.shipMesh = null;
      const physics = createMockPhysics();
      expect(() => engine.update(physics, 0.016)).not.toThrow();
    });

    it('should copy physics position to shipMesh position', () => {
      const physics = createMockPhysics({
        position: new THREE.Vector3(3.5, 1.0, -50)
      });

      engine.update(physics, 0.016);

      expect(engine.shipMesh.position.x).toBe(3.5);
      expect(engine.shipMesh.position.y).toBe(1.0);
      expect(engine.shipMesh.position.z).toBe(-50);
    });

    it('should lerp camera position toward ideal chase position', () => {
      const physics = createMockPhysics({
        position: new THREE.Vector3(0, 0, -30)
      });

      const initialCamPos = engine.camera.position.clone();

      engine.update(physics, 0.016);

      // Camera should have moved from its initial position toward ideal
      // idealCamPos = physics.position + camOffset = (0, 1.8, -25)
      // Camera was at (0, 3, 8), should lerp toward (0, 1.8, -25) by 10%
      // Z: 8 + 0.1 * (-25 - 8) = 8 - 3.3 = 4.7
      expect(engine.camera.position.z).not.toEqual(initialCamPos.z);
      expect(engine.camera.position.z).toBeCloseTo(4.7, 1);
    });

    it('should update sunLight position relative to physics position', () => {
      const physics = createMockPhysics({
        position: new THREE.Vector3(5, 0, -100)
      });

      engine.update(physics, 0.016);

      expect(engine.sunLight.position.x).toBe(5 + 30);
      expect(engine.sunLight.position.y).toBe(80);
      expect(engine.sunLight.position.z).toBe(-100 + 40);
    });

    it('should move starField to match center of map for Z parallax', () => {
      const physics = createMockPhysics({
        position: new THREE.Vector3(2, 1, -60)
      });

      engine.update(physics, 0.016);

      expect(engine.starField.position.x).toBe(0);
      expect(engine.starField.position.y).toBe(0);
      expect(engine.starField.position.z).toBe(-60);
    });

    it('should update sunMesh position to track ship horizontally', () => {
      const physics = createMockPhysics({
        position: new THREE.Vector3(4, 0, -80)
      });

      engine.update(physics, 0.016);

      expect(engine.sunMesh.position.x).toBe(4);
      expect(engine.sunMesh.position.z).toBe(-80 - 350);
    });

    it('should apply banking roll based on lateral velocity', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(5, 0, -10)
      });

      engine.update(physics, 0.016);

      // targetRoll = -5 * 0.05 = -0.25
      // shipMesh.rotation.z starts at 0, interpolates toward -0.25 by 15%
      // 0 + (-0.25 - 0) * 0.15 = -0.0375
      expect(engine.shipMesh.rotation.z).toBeCloseTo(-0.0375, 3);
    });

    it('should lock camera Y coordinate to lastOnGroundHeight when cameraMode is fixed and ship is airborne', () => {
      engine.cameraMode = 'fixed';
      
      // 1. Frame 1: Ship is on the ground at groundHeight = 2.0
      const physicsOnGround = createMockPhysics({
        position: new THREE.Vector3(0, 2.0, -30),
        onGround: true,
        groundHeight: 2.0
      });
      engine.update(physicsOnGround, 0.016);
      expect(engine.lastOnGroundHeight).toBe(2.0);

      // 2. Frame 2: Ship jumps and is airborne at position.y = 5.0, groundHeight drops to -10.0
      const physicsAirborne = createMockPhysics({
        position: new THREE.Vector3(0, 5.0, -31),
        onGround: false,
        groundHeight: -10.0
      });
      
      // Update camera positioning
      engine.update(physicsAirborne, 0.016);
      
      // lastOnGroundHeight should remain 2.0
      expect(engine.lastOnGroundHeight).toBe(2.0);
      
      // Ideal camera Y position should be based on lastOnGroundHeight (2.0 + offset)
      // Ideal Y = 2.0 + 1.8 = 3.8
      // Since camera lerps by 10% from previous Y (starts at 3.0), it should move toward 3.8 (increase)
      expect(engine.camera.position.y).toBeGreaterThan(3.0);
    });

    it('should reset lastOnGroundHeight on clearLevel()', () => {
      engine.lastOnGroundHeight = 5.0;
      engine.clearLevel();
      expect(engine.lastOnGroundHeight).toBe(0.0);
    });

    it('should adjust cameraHeightAdjust and apply it to the camera position in update()', () => {
      // 1. Initial height adjust should be 0.0
      expect(engine.cameraHeightAdjust).toBe(0.0);

      // 2. Adjust camera height upwards by 2 steps (+0.4)
      engine.adjustCameraHeight(1);
      engine.adjustCameraHeight(1);
      expect(engine.cameraHeightAdjust).toBeCloseTo(0.4, 2);

      // 3. Update graphics and verify camera positioning shifts upwards
      const physics = createMockPhysics({
        position: new THREE.Vector3(0, 0, -30)
      });
      
      // Baseline
      const tempEngine = new GraphicsEngine();
      tempEngine.init(container);
      tempEngine.update(physics, 0.016);
      const baselineY = tempEngine.camera.position.y;

      // Update engine with adjustment
      engine.update(physics, 0.016);
      expect(engine.camera.position.y).toBeGreaterThan(baselineY);
    });

    it('should cap cameraHeightAdjust between -1.0 and 3.0', () => {
      // Try to decrease past minimum limit of -1.0
      for (let i = 0; i < 10; i++) {
        engine.adjustCameraHeight(-1);
      }
      expect(engine.cameraHeightAdjust).toBe(-1.0);

      // Try to increase past maximum limit of 3.0
      for (let i = 0; i < 30; i++) {
        engine.adjustCameraHeight(1);
      }
      expect(engine.cameraHeightAdjust).toBe(3.0);
    });

    it('should apply custom cockpit camera offsets from physics settings in cockpit mode', () => {
      engine.cameraMode = 'cockpit';
      
      const physicsDefault = createMockPhysics({
        position: new THREE.Vector3(0, 0, -30),
        settings: {
          cockpitOffsetX: 0.0,
          cockpitOffsetY: 0.0,
          cockpitOffsetZ: 0.0
        }
      });
      // Let default camera position fully settle
      engine.camera.position.set(0, 3, 5);
      for (let i = 0; i < 20; i++) {
        engine.update(physicsDefault, 0.016);
      }
      const defaultCamPos = engine.camera.position.clone();

      const physicsOffset = createMockPhysics({
        position: new THREE.Vector3(0, 0, -30),
        settings: {
          cockpitOffsetX: 0.5,
          cockpitOffsetY: 0.2,
          cockpitOffsetZ: -0.4
        }
      });
      
      // Let offset camera position fully settle starting from same initial position
      engine.camera.position.set(0, 3, 5);
      for (let i = 0; i < 20; i++) {
        engine.update(physicsOffset, 0.016);
      }
      
      const offsetCamPos = engine.camera.position.clone();
      
      // X should shift right (positive X)
      expect(offsetCamPos.x).toBeGreaterThan(defaultCamPos.x);
      // Y should shift up (positive Y)
      expect(offsetCamPos.y).toBeGreaterThan(defaultCamPos.y);
      // Z should shift forward (negative Z is forward direction for ship pointing -Z)
      expect(offsetCamPos.z).toBeLessThan(defaultCamPos.z);
    });

    it('should pull the camera back and focus look-at target on the explosion center when ship is dead', () => {
      const physicsDead = createMockPhysics({
        position: new THREE.Vector3(0, 0, -30),
        isDead: true
      });

      // Place camera close to the ship
      engine.camera.position.set(0, 0.4, -30);
      engine.camLookTarget = new THREE.Vector3(0, 0.4, -35);

      // Perform a few updates to simulate camera transition lerp when dead
      for (let i = 0; i < 15; i++) {
        engine.update(physicsDead, 0.016);
      }

      // Cinematic death camera positions ideal position at:
      // idealCamPos.y += 3.5; idealCamPos.z += 9.0;
      // Since physics.position is (0, 0, -30), idealCamPos is (0, 3.5, -21)
      // Camera position should have pulled back (Z coordinate increased, y coordinate increased)
      expect(engine.camera.position.z).toBeGreaterThan(-30);
      expect(engine.camera.position.y).toBeGreaterThan(0.4);

      // Focus should transition toward the center of the explosion (0, 0, -30) from (0, 0.4, -35)
      expect(engine.camLookTarget.x).toBeCloseTo(0, 2);
      expect(engine.camLookTarget.y).toBeGreaterThan(0.0);
      expect(engine.camLookTarget.y).toBeLessThan(0.4);
      expect(engine.camLookTarget.z).toBeGreaterThan(-35);
      expect(engine.camLookTarget.z).toBeLessThan(-30);
    });
  });

  // ── triggerExplosion() ───────────────────────────────────────────────────

  describe('triggerExplosion()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should spawn exactly 180 explosion particles', () => {
      const position = new THREE.Vector3(0, 0, -50);
      engine.triggerExplosion(position);

      expect(engine.particles.length).toBe(180);
    });

    it('should add all explosion particle meshes to the scene', () => {
      const sceneChildCountBefore = engine.scene.children.length;
      const position = new THREE.Vector3(0, 0, -50);

      engine.triggerExplosion(position);

      expect(engine.scene.children.length).toBe(sceneChildCountBefore + 180);
    });

    it('should set each particle position to the explosion origin', () => {
      const origin = new THREE.Vector3(5, 2, -100);
      engine.triggerExplosion(origin);

      for (const particle of engine.particles) {
        expect(particle.mesh.position.x).toBe(5);
        expect(particle.mesh.position.y).toBe(2);
        expect(particle.mesh.position.z).toBe(-100);
      }
    });

    it('should set particle life and maxLife to 1.5 seconds', () => {
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));

      for (const particle of engine.particles) {
        expect(particle.life).toBe(1.5);
        expect(particle.maxLife).toBe(1.5);
      }
    });

    it('should hide the shipMesh when exploding', () => {
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));

      expect(engine.shipMesh.visible).toBe(false);
    });

    it('should set particle velocities with spherical distribution', () => {
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));

      // At least some particles should have non-zero velocity in all axes
      const hasXVelocity = engine.particles.some(p => Math.abs(p.velocity.x) > 0);
      const hasYVelocity = engine.particles.some(p => Math.abs(p.velocity.y) > 0);
      const hasZVelocity = engine.particles.some(p => Math.abs(p.velocity.z) > 0);

      expect(hasXVelocity).toBe(true);
      expect(hasYVelocity).toBe(true);
      expect(hasZVelocity).toBe(true);
    });

    it('should use neon explosion colors from predefined palette', () => {
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));

      const validColors = [0xff0055, 0x00ffff, 0xffaa00, 0xff00ff];
      for (const particle of engine.particles) {
        const colorHex = particle.mesh.material.color.getHex();
        expect(validColors).toContain(colorHex);
      }
    });
  });

  // ── clearLevel() ─────────────────────────────────────────────────────────

  describe('clearLevel()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should make shipMesh visible again', () => {
      engine.shipMesh.visible = false;
      engine.clearLevel();

      expect(engine.shipMesh.visible).toBe(true);
    });

    it('should remove all particles from scene and dispose geometry/material', () => {
      // Add some test particles
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));
      expect(engine.particles.length).toBe(180);

      const particleMeshes = engine.particles.map(p => p.mesh);

      engine.clearLevel();

      expect(engine.particles.length).toBe(0);
      // All particle meshes should have been removed from scene
      for (const mesh of particleMeshes) {
        expect(engine.scene.children).not.toContain(mesh);
      }
    });

    it('should empty the particles array', () => {
      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));
      engine.clearLevel();

      expect(engine.particles).toEqual([]);
    });

    it('should handle clearLevel when no particles exist', () => {
      expect(() => engine.clearLevel()).not.toThrow();
      expect(engine.particles).toEqual([]);
    });

    it('should handle clearLevel when shipMesh is null', () => {
      engine.shipMesh = null;
      expect(() => engine.clearLevel()).not.toThrow();
    });

    it('should reset starField rotation to 0 on clearLevel', () => {
      engine.starField.rotation.set(1, 2, 3);
      engine.clearLevel();
      expect(engine.starField.rotation.x).toBe(0);
      expect(engine.starField.rotation.y).toBe(0);
      expect(engine.starField.rotation.z).toBe(0);
    });

  });

  // ── handleResize() ───────────────────────────────────────────────────────

  describe('handleResize()', () => {
    it('should update camera aspect ratio to match container dimensions', () => {
      engine.init(container);

      const resizedContainer = createMockContainer(1024, 768);
      engine.handleResize(resizedContainer);

      expect(engine.camera.aspect).toBeCloseTo(1024 / 768, 4);
    });

    it('should call renderer.setSize with new container dimensions', () => {
      engine.init(container);
      mockRendererInstance.setSize.mockClear();

      const resizedContainer = createMockContainer(1920, 1080);
      engine.handleResize(resizedContainer);

      expect(mockRendererInstance.setSize).toHaveBeenCalledWith(1920, 1080);
    });

    it('should not throw when renderer is null', () => {
      // Don't call init, so renderer is null
      const fresh = new GraphicsEngine();
      expect(() => fresh.handleResize(container)).not.toThrow();
    });

    it('should not throw when camera is null', () => {
      const fresh = new GraphicsEngine();
      expect(() => fresh.handleResize(container)).not.toThrow();
    });
  });

  // ── render() ─────────────────────────────────────────────────────────────

  describe('render()', () => {
    it('should call renderer.render with scene and camera', () => {
      engine.init(container);
      mockRendererInstance.render.mockClear();

      engine.render();

      expect(mockRendererInstance.render).toHaveBeenCalledWith(engine.scene, engine.camera);
    });

    it('should not throw when renderer is null', () => {
      const fresh = new GraphicsEngine();
      expect(() => fresh.render()).not.toThrow();
    });

    it('should not throw when scene is null', () => {
      const fresh = new GraphicsEngine();
      fresh.renderer = mockRendererInstance;
      expect(() => fresh.render()).not.toThrow();
    });

    it('should not throw when camera is null', () => {
      const fresh = new GraphicsEngine();
      fresh.renderer = mockRendererInstance;
      fresh.scene = new THREE.Scene();
      fresh.camera = null;
      expect(() => fresh.render()).not.toThrow();
    });
  });

  // ── updateParticles() ────────────────────────────────────────────────────

  describe('updateParticles()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should spawn thruster particles when ship is moving fast enough', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10) // |z| > 0.5
      });

      engine.updateParticles(physics, 0.016);

      // Normal mode spawns 2 particles per call
      expect(engine.particles.length).toBe(2);
    });

    it('should spawn 4 particles per call when boosting', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10),
        activeEffects: { boost: true, sticky: false, slippery: false, burning: false }
      });

      engine.updateParticles(physics, 0.016);

      expect(engine.particles.length).toBe(4);
    });

    it('should not spawn thruster particles when speed is too low', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -0.3) // |z| < 0.5
      });

      engine.updateParticles(physics, 0.016);

      expect(engine.particles.length).toBe(0);
    });

    it('should not spawn thruster particles when ship is dead', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10),
        isDead: true
      });

      engine.updateParticles(physics, 0.016);

      expect(engine.particles.length).toBe(0);
    });

    it('should reduce particle life by dt each update', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);
      const initialLife = engine.particles[0].life;

      // Update again with no new spawning (set velocity low)
      const stoppedPhysics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, 0)
      });
      engine.updateParticles(stoppedPhysics, 0.05);

      expect(engine.particles[0].life).toBeCloseTo(initialLife - 0.05, 4);
    });

    it('should remove particles when their life reaches zero', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);
      expect(engine.particles.length).toBe(2);

      // Advance time beyond particle lifetime (0.35s)
      const stoppedPhysics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, 0)
      });
      engine.updateParticles(stoppedPhysics, 0.4);

      expect(engine.particles.length).toBe(0);
    });

    it('should scale particles down as they age', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);

      const particle = engine.particles[0];
      const lifeRatio = particle.life / particle.maxLife;

      // Update with no new spawns
      const stoppedPhysics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, 0)
      });
      engine.updateParticles(stoppedPhysics, 0.1);

      const expectedRatio = (particle.life) / particle.maxLife;
      expect(particle.mesh.scale.x).toBeCloseTo(expectedRatio, 2);
    });

    it('should move particles along their velocity during updates', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);

      const particle = engine.particles[0];
      const initialZ = particle.mesh.position.z;

      const stoppedPhysics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, 0)
      });
      engine.updateParticles(stoppedPhysics, 0.1);

      // Particle velocity.z is positive (shoots backward), position should increase
      expect(particle.mesh.position.z).toBeGreaterThan(initialZ);
    });

    it('should use green color for boost thruster particles', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10),
        activeEffects: { boost: true, sticky: false, slippery: false, burning: false }
      });

      engine.updateParticles(physics, 0.016);

      for (const particle of engine.particles) {
        expect(particle.mesh.material.color.getHex()).toBe(0x00ff00);
      }
    });

    it('should use magenta color for normal thruster particles', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10),
        activeEffects: { boost: false, sticky: false, slippery: false, burning: false }
      });

      engine.updateParticles(physics, 0.016);

      for (const particle of engine.particles) {
        expect(particle.mesh.material.color.getHex()).toBe(0xff00ff);
      }
    });

    it('should set thruster particle life to 0.35 seconds', () => {
      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);

      for (const particle of engine.particles) {
        expect(particle.maxLife).toBe(0.35);
      }
    });
  });

  // ── Edge cases and combined behaviors ────────────────────────────────────

  describe('edge cases', () => {
    it('should handle multiple triggerExplosion calls accumulating particles', () => {
      engine.init(container);

      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));
      engine.triggerExplosion(new THREE.Vector3(5, 5, 5));

      expect(engine.particles.length).toBe(360);
    });

    it('should clean up all accumulated particles on clearLevel', () => {
      engine.init(container);

      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));
      engine.triggerExplosion(new THREE.Vector3(5, 5, 5));
      engine.clearLevel();

      expect(engine.particles.length).toBe(0);
    });

    it('should handle sticky effect with smaller thruster particles', () => {
      engine.init(container);

      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10),
        activeEffects: { boost: false, sticky: true, slippery: false, burning: false }
      });

      engine.updateParticles(physics, 0.016);

      // Sticky uses sizeScale 0.4, resulting in smaller particles
      // Just verify particles were created (size is randomized)
      expect(engine.particles.length).toBe(2);
    });

    it('should have consistent scene children count after clearLevel', () => {
      engine.init(container);
      const baseChildCount = engine.scene.children.length;

      engine.triggerExplosion(new THREE.Vector3(0, 0, 0));
      expect(engine.scene.children.length).toBe(baseChildCount + 180);

      engine.clearLevel();
      expect(engine.scene.children.length).toBe(baseChildCount);
    });
  });

  // ── changeShipSkin() ─────────────────────────────────────────────────────

  describe('changeShipSkin()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should update currentSkinName', () => {
      engine.changeShipSkin('freelancer');
      expect(engine.currentSkinName).toBe('freelancer');
    });

    it('should support dual customizable texture and paint color signature', () => {
      engine.changeShipSkin('lordshadow', '#ff007f');
      expect(engine.currentSkinName).toBe('lordshadow');
      expect(engine.currentSkinColor).toBe('#ff007f');
    });

    it('should handle legacy hex color single argument gracefully', () => {
      engine.changeShipSkin('#00ffff');
      expect(engine.currentSkinName).toBe('default');
      expect(engine.currentSkinColor).toBe('#00ffff');
    });
  });

  // ── changeShipModel() ────────────────────────────────────────────────────

  describe('changeShipModel()', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should update currentModelName, currentSkinName and reset isObjLoaded to false', () => {
      engine.isObjLoaded = true;
      engine.changeShipModel('ship1', 'skin1');
      expect(engine.currentModelName).toBe('ship1');
      expect(engine.currentSkinName).toBe('skin1');
      expect(engine.isObjLoaded).toBe(false);
    });

    it('should support dual customizable texture and color parameters', () => {
      engine.changeShipModel('corvette1', 'psionic', '#39ff14');
      expect(engine.currentModelName).toBe('corvette1');
      expect(engine.currentSkinName).toBe('psionic');
      expect(engine.currentSkinColor).toBe('#39ff14');
    });

    it('should dispose and remove existing loaded custom model components', () => {
      const mockGeometry = new THREE.BufferGeometry();
      const mockMaterial = new THREE.MeshBasicMaterial();
      const mockMesh = new THREE.Mesh(mockGeometry, mockMaterial);
      engine.shipMesh.add(mockMesh); // Adds at index 8 (procedural is 0-7)
      
      expect(engine.shipMesh.children.length).toBe(9);
      
      const disposeGeomSpy = vi.spyOn(mockGeometry, 'dispose');
      const disposeMatSpy = vi.spyOn(mockMaterial, 'dispose');
      
      engine.changeShipModel('ship3', 'skin2');
      
      expect(disposeGeomSpy).toHaveBeenCalled();
      expect(disposeMatSpy).toHaveBeenCalled();
      expect(engine.shipMesh.children.length).toBe(8); // Custom component removed successfully
    });
  });

  // ── Engine Exhaust Particle Alignment ─────────────────────────────────────

  describe('updateParticles() Model Alignments & Palettes', () => {
    beforeEach(() => {
      engine.init(container);
    });

    it('should spawn thruster particles with correct offsets using SHIP_METRICS when isObjLoaded is true', () => {
      engine.isTestEnv = false; // Bypass test env flag for particle offsets
      engine.isObjLoaded = true;
      engine.currentModelName = 'ship1'; // offset: 0.52, height: 0.19

      const physics = createMockPhysics({
        position: new THREE.Vector3(10, 5, -20),
        velocity: new THREE.Vector3(0, 0, -10)
      });

      // Mock Math.random to return 0 to make positioning deterministic
      const spyRandom = vi.spyOn(Math, 'random').mockReturnValue(0.0);

      engine.updateParticles(physics, 0.016);

      // Verify that spawning offset uses metrics for ship1 (maps to fighter: offset = 0.25, height = 0.20)
      // Since Math.random is 0.0, it picks -metrics.offset = -0.25
      // Jitter is (0 * 0.05 - 0.025) = -0.025
      // X = 10 - 0.25 - 0.025 - 0.0032 = 9.7218 (calibrated to 9.7218)
      // Y = 5 + 0.20 + (0 * 0.04 - 0.02) + (0 * 0.05 - 0.025) - 0.0032 = 5.1518 (calibrated to 5.1518)
      
      expect(engine.particles.length).toBeGreaterThan(0);
      const p = engine.particles[0];
      expect(p.mesh.position.x).toBeCloseTo(9.7218, 4);
      expect(p.mesh.position.y).toBeCloseTo(5.1518, 4);

      spyRandom.mockRestore();
    });

    it('should spawn thruster particles with correct offsets for ship5', () => {
      engine.isTestEnv = false;
      engine.isObjLoaded = true;
      engine.currentModelName = 'ship5'; // maps to dreadnought: offset = 0.42, height = 0.21

      const physics = createMockPhysics({
        position: new THREE.Vector3(10, 5, -20),
        velocity: new THREE.Vector3(0, 0, -10)
      });

      const spyRandom = vi.spyOn(Math, 'random').mockReturnValue(0.0);

      engine.updateParticles(physics, 0.016);

      // X = 10 - 0.42 - 0.025 - 0.0032 = 9.5518 (calibrated to 9.5518)
      // Y = 5 + 0.21 - 0.02 - 0.025 - 0.0032 = 5.1618 (calibrated to 5.1618)
      expect(engine.particles.length).toBeGreaterThan(0);
      const p = engine.particles[0];
      expect(p.mesh.position.x).toBeCloseTo(9.5518, 4);
      expect(p.mesh.position.y).toBeCloseTo(5.1618, 4);

      spyRandom.mockRestore();
    });

    it('should support rich custom skin color palettes in gameplay mode', () => {
      engine.isTestEnv = false;
      engine.currentSkinName = 'freelancer'; // high-glow cyan, electric blue, cobalt, ice blue

      const physics = createMockPhysics({
        velocity: new THREE.Vector3(0, 0, -10)
      });

      engine.updateParticles(physics, 0.016);

      const freelancerColors = [0x00ffff, 0x00aaff, 0x3366ff, 0x99ffff];
      for (const particle of engine.particles) {
        const hex = particle.mesh.material.color.getHex();
        expect(freelancerColors).toContain(hex);
      }
    });
  });

  // ── GLTF Skybox Integration ──────────────────────────────────────────────

  describe('GLTF Skybox Integration', () => {
    it('should initialize with null skyboxMesh and gltfLoaded as false', () => {
      expect(engine.skyboxMesh).toBeNull();
      expect(engine.gltfLoaded).toBe(false);
    });

    it('should set scene background fallback color to 0x0a0210', () => {
      engine.init(container);
      expect(engine.scene.background).toBeInstanceOf(THREE.Color);
      expect(engine.scene.background.getHex()).toBe(0x0a0210);
    });

    it('should update GLTF skybox position and rotation in update() when loaded', () => {
      engine.init(container);
      
      // Simulate successful asynchronous load
      const mockSkyboxMesh = new THREE.Object3D();
      engine.skyboxMesh = mockSkyboxMesh;
      engine.gltfLoaded = true;

      const physics = createMockPhysics({
        position: new THREE.Vector3(50, 10, -120)
      });

      engine.update(physics, 0.1);

      // Position should match physics position perfectly
      expect(engine.skyboxMesh.position.x).toBe(50);
      expect(engine.skyboxMesh.position.y).toBe(10);
      expect(engine.skyboxMesh.position.z).toBe(-120);

      // Rotation.y should have increased over time
      expect(engine.skyboxMesh.rotation.y).toBeGreaterThan(0);
    });

    it('should fall back gracefully to procedural objects when gltfLoaded is false', () => {
      engine.init(container);
      
      // Since it's test env, gltf is not loaded
      expect(engine.gltfLoaded).toBe(false);
      
      // Procedural objects should be visible
      expect(engine.nebulaSphere.visible).not.toBe(false);
      expect(engine.starField.visible).not.toBe(false);
      expect(engine.sunMesh.visible).not.toBe(false);
    });
  });
});

