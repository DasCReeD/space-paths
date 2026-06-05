import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  buildLevel,
  getActiveThemeIndex,
  THEMES,
  ROAD_WIDTH_LANES,
  getLevelAssetUrl,
  disposeUnusedThemes,
  loadedTextureCache,
  textureCache
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

    it('should map level indices >= 61 correctly to indices 4-13', () => {
      expect(getActiveThemeIndex({ level_index: 61 })).toBe(4);
      expect(getActiveThemeIndex({ level_index: 62 })).toBe(4);
      expect(getActiveThemeIndex({ level_index: 63 })).toBe(4);
      expect(getActiveThemeIndex({ level_index: 64 })).toBe(5);
      expect(getActiveThemeIndex({ level_index: 90 })).toBe(13);
      expect(getActiveThemeIndex({ level_index: 91 })).toBe(4);
    });
  });

  describe('Theme Configurations (THEMES)', () => {
    it('should define exactly 14 themed sets', () => {
      expect(THEMES).toHaveLength(14);
    });

    it('should name each theme set correctly', () => {
      expect(THEMES[0].name).toBe('Cyberpunk/Neon Grid');
      expect(THEMES[1].name).toBe('Industrial Metal');
      expect(THEMES[2].name).toBe('Alien/Stained Glass');
      expect(THEMES[3].name).toBe('Retro Cabin/Organics');
      expect(THEMES[4].name).toBe('Visualizer Void');
      expect(THEMES[5].name).toBe('Blue Ridge Ascents');
      expect(THEMES[6].name).toBe('Thrill Sector');
      expect(THEMES[7].name).toBe('Hardware Core');
      expect(THEMES[8].name).toBe('Glitch Grid');
      expect(THEMES[9].name).toBe('Cryo-Stasis Tundra');
      expect(THEMES[10].name).toBe('Supernova Furnace');
      expect(THEMES[11].name).toBe('Nebula Shallows');
      expect(THEMES[12].name).toBe('Quantum Spire');
      expect(THEMES[13].name).toBe('Kinetic Pulse');
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

  describe('VRAM Garbage Collection (disposeUnusedThemes)', () => {
    beforeEach(() => {
      loadedTextureCache.clear();
      textureCache.clear();
      if (typeof window !== 'undefined') {
        delete window.currentLevelIndex;
      }
    });

    afterEach(() => {
      loadedTextureCache.clear();
      textureCache.clear();
      if (typeof window !== 'undefined') {
        delete window.currentLevelIndex;
      }
    });

    it('should dispose unused textures and keep active ones', () => {
      const activeTheme = THEMES[0];
      const activeUrls = new Set();
      for (const key in activeTheme.behaviors) {
        const behavior = activeTheme.behaviors[key];
        if (behavior) {
          if (typeof behavior.map === 'string') activeUrls.add(behavior.map);
          if (typeof behavior.normalMap === 'string') activeUrls.add(behavior.normalMap);
          if (typeof behavior.decal === 'string') activeUrls.add(behavior.decal);
        }
      }

      const activeUrl = Array.from(activeUrls)[0];
      const inactiveTheme = THEMES[1];
      let inactiveUrl = null;
      for (const key in inactiveTheme.behaviors) {
        const behavior = inactiveTheme.behaviors[key];
        if (behavior && typeof behavior.map === 'string' && !activeUrls.has(behavior.map)) {
          inactiveUrl = behavior.map;
          break;
        }
      }

      expect(activeUrl).toBeDefined();
      expect(inactiveUrl).toBeDefined();

      const activeTexture = { dispose: vi.fn() };
      const inactiveTexture = { dispose: vi.fn() };

      loadedTextureCache.set(activeUrl, activeTexture);
      loadedTextureCache.set(inactiveUrl, inactiveTexture);

      const activeCacheKey = `seamless_2_${activeUrl}`;
      const inactiveCacheKey = `seamless_2_${inactiveUrl}`;
      const proceduralCacheKey = `default_ffffff_0`;

      const activeCacheTexture = { dispose: vi.fn() };
      const inactiveCacheTexture = { dispose: vi.fn() };
      const proceduralCacheTexture = { dispose: vi.fn() };

      textureCache.set(activeCacheKey, activeCacheTexture);
      textureCache.set(inactiveCacheKey, inactiveCacheTexture);
      textureCache.set(proceduralCacheKey, proceduralCacheTexture);

      disposeUnusedThemes(0);

      expect(loadedTextureCache.has(activeUrl)).toBe(true);
      expect(loadedTextureCache.has(inactiveUrl)).toBe(false);
      expect(inactiveTexture.dispose).toHaveBeenCalled();
      expect(activeTexture.dispose).not.toHaveBeenCalled();

      expect(textureCache.has(activeCacheKey)).toBe(true);
      expect(textureCache.has(inactiveCacheKey)).toBe(false);
      expect(textureCache.has(proceduralCacheKey)).toBe(false);
      
      expect(inactiveCacheTexture.dispose).toHaveBeenCalled();
      expect(proceduralCacheTexture.dispose).toHaveBeenCalled();
      expect(activeCacheTexture.dispose).not.toHaveBeenCalled();
    });

    it('should keep generated level-specific assets if current level is a generated level', () => {
      if (typeof window !== 'undefined') {
        window.currentLevelIndex = 61;
        
        const genRoadDiff = getLevelAssetUrl(61, 'road_diffuse.png');
        const genRoadNorm = getLevelAssetUrl(61, 'road_normal.png');
        
        if (genRoadDiff && genRoadNorm) {
          const activeTexture = { dispose: vi.fn() };
          const inactiveTexture = { dispose: vi.fn() };

          loadedTextureCache.set(genRoadDiff, activeTexture);
          loadedTextureCache.set('some_unused_url.png', inactiveTexture);

          disposeUnusedThemes(4); // active theme for level 61 is 4

          expect(loadedTextureCache.has(genRoadDiff)).toBe(true);
          expect(loadedTextureCache.has('some_unused_url.png')).toBe(false);
          expect(inactiveTexture.dispose).toHaveBeenCalled();
          expect(activeTexture.dispose).not.toHaveBeenCalled();
        }
      }
    });
  });
});
