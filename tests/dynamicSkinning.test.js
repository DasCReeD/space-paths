import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  buildLevel,
  getActiveThemeIndex,
  THEMES,
  ROAD_WIDTH_LANES
} from '../levelLoader.js';

// Helper mock scene
function createMockScene() {
  return { add: vi.fn() };
}

// Helpers to build rows
function createFlatTile(topColor = 0, overrides = {}) {
  return {
    val: topColor,
    full: false,
    half: false,
    tunnel: false,
    top_color: topColor,
    bottom_color: 0,
    low3: 0,
    ...overrides
  };
}

function createBaseLevelData(overrides = {}) {
  return {
    gravity: 8,
    fuel: 100,
    oxygen: 60,
    palette: Array(16).fill([128, 128, 128]),
    rows: [],
    ...overrides
  };
}

describe('Dynamic Level Skinning Manager', () => {
  let scene;

  beforeEach(() => {
    scene = createMockScene();
  });

  describe('Theme Selection (getActiveThemeIndex)', () => {
    afterEach(() => {
      if (typeof window !== 'undefined') {
        delete window.currentLevelIndex;
      }
    });

    it('should map levelData.level_index to 0..3 themes using modulo 4', () => {
      expect(getActiveThemeIndex({ level_index: 0 })).toBe(0);
      expect(getActiveThemeIndex({ level_index: 1 })).toBe(1);
      expect(getActiveThemeIndex({ level_index: 2 })).toBe(2);
      expect(getActiveThemeIndex({ level_index: 3 })).toBe(3);
      expect(getActiveThemeIndex({ level_index: 4 })).toBe(0);
      expect(getActiveThemeIndex({ level_index: 15 })).toBe(3);
    });

    it('should fall back to window.currentLevelIndex if levelData.level_index is missing', () => {
      if (typeof window !== 'undefined') {
        window.currentLevelIndex = 2;
        expect(getActiveThemeIndex({})).toBe(2);
        
        window.currentLevelIndex = 5;
        expect(getActiveThemeIndex({})).toBe(1);
      }
    });

    it('should default to 0 if no level index is available at all', () => {
      expect(getActiveThemeIndex(null)).toBe(0);
      expect(getActiveThemeIndex({})).toBe(0);
    });
  });

  describe('Theme Configurations (THEMES)', () => {
    it('should define exactly 4 themed sets', () => {
      expect(THEMES).toHaveLength(4);
    });

    it('should name each theme set correctly', () => {
      expect(THEMES[0].name).toBe('Cyberpunk/Neon Grid');
      expect(THEMES[1].name).toBe('Industrial Metal');
      expect(THEMES[2].name).toBe('Alien/Stained Glass');
      expect(THEMES[3].name).toBe('Retro Cabin/Organics');
    });

    it('should have behaviors mapped for each theme', () => {
      THEMES.forEach((theme) => {
        expect(theme.behaviors).toBeDefined();
        expect(theme.behaviors.default).toBeDefined();
        expect(theme.behaviors.obstacle).toBeDefined();
        expect(theme.behaviors.boost).toBeDefined();
        expect(theme.behaviors.refill).toBeDefined();
        expect(theme.behaviors.burning).toBeDefined();
        expect(theme.behaviors.sticky).toBeDefined();
        expect(theme.behaviors.slippery).toBeDefined();
      });
    });
  });

  describe('Theme Color & Fallback Logic in buildLevel', () => {
    it('should preserve standard palette color for default tiles', () => {
      const palette = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
      const row = Array(ROAD_WIDTH_LANES).fill(null);
      row[3] = createFlatTile(0); // activeColor = 0 -> maps to palette[0]
      
      const levelData = createBaseLevelData({
        level_index: 0,
        rows: [row],
        palette
      });

      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];

      // Material color should match palette[0] which is Red (1, 0, 0)
      expect(mesh.material.color.r).toBeCloseTo(1.0, 3);
      expect(mesh.material.color.g).toBeCloseTo(0.0, 3);
      expect(mesh.material.color.b).toBeCloseTo(0.0, 3);
    });

    it('should apply bright green for boost tiles', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null);
      row[3] = createFlatTile(10); // Color index 10 corresponds to boost behavior
      
      const levelData = createBaseLevelData({
        level_index: 1, // Industrial theme
        rows: [row]
      });

      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];

      // Boost color should be green
      expect(mesh.material.color.r).toBeCloseTo(0.2, 1);
      expect(mesh.material.color.g).toBeCloseTo(0.8, 1);
      expect(mesh.material.color.b).toBeCloseTo(0.2, 1);
      
      // Emissive should also be green/lime glow
      expect(mesh.material.emissive.g).toBeGreaterThan(0.05);
    });

    it('should apply blue for refill tiles', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null);
      row[3] = createFlatTile(9); // Color index 9 corresponds to refill behavior
      
      const levelData = createBaseLevelData({
        level_index: 2, // Alien glass theme
        rows: [row]
      });

      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];

      // Refill color should be blue
      expect(mesh.material.color.r).toBeCloseTo(0.0, 3);
      expect(mesh.material.color.g).toBeCloseTo(0.5, 3);
      expect(mesh.material.color.b).toBeCloseTo(1.0, 3);
    });

    it('should apply red for burning tiles', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null);
      row[3] = createFlatTile(12); // Color index 12 corresponds to burning behavior
      
      const levelData = createBaseLevelData({
        level_index: 3, // Retro cabin theme
        rows: [row]
      });

      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];

      // Burning color should be fiery red/orange
      expect(mesh.material.color.r).toBeCloseTo(0.9, 1);
      expect(mesh.material.color.g).toBeCloseTo(0.25, 1);
    });

    it('should fall back gracefully to MeshStandardMaterial without crashing under Vitest (no-DOM/absent files)', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null);
      row[3] = createFlatTile(0);
      
      const levelData = createBaseLevelData({
        level_index: 0,
        rows: [row]
      });

      // Verification that this call succeeds and outputs THREE.MeshStandardMaterial instances
      const result = buildLevel(levelData, scene);
      expect(result.roadMeshes.length).toBeGreaterThan(0);
      
      const mesh = result.roadMeshes[0];
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mesh.material.roughness).toBeDefined();
      expect(mesh.material.metalness).toBeDefined();
    });
  });
});
