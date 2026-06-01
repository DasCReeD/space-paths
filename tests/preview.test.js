import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';

// ── Mock WebGLRenderer (jsdom has no WebGL) ────────────────────────────────────

const mockRendererInstance = {
  setSize: vi.fn(),
  setPixelRatio: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
  domElement: document.createElement('canvas'),
  shadowMap: { enabled: false, type: null }
};

vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      ...mockRendererInstance,
      domElement: document.createElement('canvas')
    }))
  };
});

// ── Import the class under test ────────────────────────────────────────────────

import { ShipPreviewEngine } from '../preview.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function createMockContainer(width = 400, height = 300) {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  container.appendChild = vi.fn();
  return container;
}

// ── Test Suites ─────────────────────────────────────────────────────────────────

describe('ShipPreviewEngine', () => {
  let engine;
  let container;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new ShipPreviewEngine();
    container = createMockContainer();
  });

  afterEach(() => {
    if (engine) {
      engine.destroy();
    }
    vi.restoreAllMocks();
  });

  // ── Constructor defaults ─────────────────────────────────────────────────

  describe('constructor', () => {
    it('should initialize with null scene, camera, and renderer', () => {
      const fresh = new ShipPreviewEngine();
      expect(fresh.scene).toBeNull();
      expect(fresh.camera).toBeNull();
      expect(fresh.renderer).toBeNull();
    });

    it('should initialize with null shipMesh', () => {
      const fresh = new ShipPreviewEngine();
      expect(fresh.shipMesh).toBeNull();
    });

    it('should populate skins collection', () => {
      const fresh = new ShipPreviewEngine();
      expect(fresh.skins).toBeDefined();
      expect(fresh.skins.default).toBeDefined();
      expect(fresh.skins.freelancer).toBeDefined();
      expect(fresh.skins.lordshadow).toBeDefined();
    });
  });

  // ── init() ───────────────────────────────────────────────────────────────

  describe('init()', () => {
    it('should create scene, camera, and renderer', () => {
      engine.init(container);

      expect(engine.scene).not.toBeNull();
      expect(engine.scene).toBeInstanceOf(THREE.Scene);
      expect(engine.camera).not.toBeNull();
      expect(engine.camera).toBeInstanceOf(THREE.PerspectiveCamera);
      expect(engine.renderer).not.toBeNull();
    });

    it('should attach canvas to container', () => {
      engine.init(container);
      expect(container.appendChild).toHaveBeenCalled();
    });

    it('should setup lighting in the scene', () => {
      engine.init(container);
      
      const lights = engine.scene.children.filter(
        child => child instanceof THREE.DirectionalLight || child instanceof THREE.AmbientLight
      );
      // Ambient + 3 Directionals = 4 lights
      expect(lights.length).toBe(4);
    });

    it('should spawn shipMesh group', () => {
      engine.init(container);
      expect(engine.shipMesh).not.toBeNull();
      expect(engine.shipMesh).toBeInstanceOf(THREE.Group);
    });
  });

  // ── changeSkin() ─────────────────────────────────────────────────────────

  describe('changeSkin()', () => {
    it('should handle changeSkin on valid skin', () => {
      engine.init(container);
      expect(() => engine.changeSkin('freelancer')).not.toThrow();
    });

    it('should handle changeSkin on invalid skin gracefully', () => {
      engine.init(container);
      expect(() => engine.changeSkin('invalid-skin-name')).not.toThrow();
    });
  });

  // ── changeModel() ─────────────────────────────────────────────────────────

  describe('changeModel()', () => {
    it('should update currentModelName and currentSkinName and recreate shipMesh', () => {
      engine.init(container);
      expect(engine.shipMesh).not.toBeNull();
      const oldShipMesh = engine.shipMesh;
      
      engine.changeModel('ship1', 'skin1');
      
      expect(engine.currentModelName).toBe('ship1');
      expect(engine.currentSkinName).toBe('skin1');
      expect(engine.shipMesh).not.toBeNull();
      expect(engine.shipMesh).not.toBe(oldShipMesh);
    });

    it('should traverse and dispose geometries and materials of old ship components to prevent memory leaks', () => {
      engine.init(container);
      
      const mockGeometry = new THREE.BufferGeometry();
      const mockMaterial = new THREE.MeshBasicMaterial();
      const mockMesh = new THREE.Mesh(mockGeometry, mockMaterial);
      engine.shipMesh.add(mockMesh);
      
      const disposeGeomSpy = vi.spyOn(mockGeometry, 'dispose');
      const disposeMatSpy = vi.spyOn(mockMaterial, 'dispose');
      
      engine.changeModel('ship2', 'skin2');
      
      expect(disposeGeomSpy).toHaveBeenCalled();
      expect(disposeMatSpy).toHaveBeenCalled();
    });

    it('should handle array of materials correctly during old ship disposal', () => {
      engine.init(container);
      
      const mockGeometry = new THREE.BufferGeometry();
      const mockMaterial1 = new THREE.MeshBasicMaterial();
      const mockMaterial2 = new THREE.MeshBasicMaterial();
      const mockMesh = new THREE.Mesh(mockGeometry, [mockMaterial1, mockMaterial2]);
      engine.shipMesh.add(mockMesh);
      
      const disposeGeomSpy = vi.spyOn(mockGeometry, 'dispose');
      const disposeMatSpy1 = vi.spyOn(mockMaterial1, 'dispose');
      const disposeMatSpy2 = vi.spyOn(mockMaterial2, 'dispose');
      
      engine.changeModel('ship3', 'skin3');
      
      expect(disposeGeomSpy).toHaveBeenCalled();
      expect(disposeMatSpy1).toHaveBeenCalled();
      expect(disposeMatSpy2).toHaveBeenCalled();
    });
  });

  // ── handleResize() ───────────────────────────────────────────────────────

  describe('handleResize()', () => {
    it('should adjust camera aspect and update projection matrix', () => {
      engine.init(container);
      
      const spyUpdate = vi.spyOn(engine.camera, 'updateProjectionMatrix');
      const resizedContainer = createMockContainer(600, 450);
      
      engine.handleResize(resizedContainer);
      
      expect(engine.camera.aspect).toBe(600 / 450);
      expect(spyUpdate).toHaveBeenCalled();
    });
  });

  // ── destroy() ───────────────────────────────────────────────────────────

  describe('destroy()', () => {
    it('should dispose all WebGL elements and clear references', () => {
      engine.init(container);
      engine.destroy();

      expect(engine.scene).toBeNull();
      expect(engine.camera).toBeNull();
      expect(engine.renderer).toBeNull();
      expect(engine.shipMesh).toBeNull();
    });

    it('should not throw if destroy() is called multiple times', () => {
      engine.init(container);
      engine.destroy();
      expect(() => engine.destroy()).not.toThrow();
    });
  });
});
