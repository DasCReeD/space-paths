import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import {
  buildLevel,
  buildLevelAsync,
  TILE_WIDTH,
  TILE_LENGTH,
  ROAD_WIDTH_LANES,
  TOTAL_ROAD_WIDTH,
  getLevelObjUrl,
  getLevelAssetUrl,
  buildDeckCeilingLight,
  buildDeckPillars
} from '../levelLoader.js';
import { buildColumnGrid, ceilingAbove, cellBounds } from '../heightfield.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function createMockScene() {
  return { add: vi.fn() };
}

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

function createFullBlockTile(topColor = 0, overrides = {}) {
  return {
    val: 16389,
    full: true,
    half: false,
    tunnel: false,
    top_color: topColor,
    bottom_color: 0,
    low3: 5,
    ...overrides
  };
}

function createHalfBlockTile(topColor = 0, overrides = {}) {
  return {
    val: 8192,
    full: false,
    half: true,
    tunnel: false,
    top_color: topColor,
    bottom_color: 0,
    low3: 0,
    ...overrides
  };
}

function createCombinedBlockTile(topColor = 0, overrides = {}) {
  return {
    val: 24581,
    full: true,
    half: true,
    tunnel: false,
    top_color: topColor,
    bottom_color: 0,
    low3: 5,
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

function createNullRow() {
  return Array(ROAD_WIDTH_LANES).fill(null);
}

function createFullFlatRow(topColor = 0) {
  return Array(ROAD_WIDTH_LANES).fill(null).map(() => createFlatTile(topColor));
}

// ── Test Suite ───────────────────────────────────────────────────────────────

describe('buildLevel', () => {
  let scene;

  beforeEach(() => {
    scene = createMockScene();
  });

  // ── Empty Level ─────────────────────────────────────────────────────────

  describe('Empty level (all null rows)', () => {
    it('should return empty collidables and specialTiles', () => {
      const levelData = createBaseLevelData({
        rows: [createNullRow(), createNullRow(), createNullRow()]
      });
      const result = buildLevel(levelData, scene);
      expect(result.collidables).toHaveLength(0);
      expect(result.specialTiles).toHaveLength(0);
    });

    it('should still compute track length from row count', () => {
      const levelData = createBaseLevelData({
        rows: [createNullRow(), createNullRow(), createNullRow()]
      });
      const result = buildLevel(levelData, scene);
      expect(result.trackLength).toBe(3 * TILE_LENGTH);
    });

    it('should still create finish line elements', () => {
      const levelData = createBaseLevelData({ rows: [createNullRow()] });
      const result = buildLevel(levelData, scene);
      // Finish line mesh + left arch + right arch + top arch = 4 finish meshes
      expect(result.roadMeshes).toHaveLength(4);
    });
  });

  // ── Flat Road Tiles ─────────────────────────────────────────────────────

  describe('Level with flat road tiles only', () => {
    it('should create road meshes for each non-null tile', () => {
      const levelData = createBaseLevelData({
        rows: [createFullFlatRow()]
      });
      const result = buildLevel(levelData, scene);
      // 7 road tiles + 4 finish elements = 11
      expect(result.roadMeshes).toHaveLength(7 + 4);
    });

    it('should not create any collidables for flat tiles', () => {
      const levelData = createBaseLevelData({
        rows: [createFullFlatRow()]
      });
      const result = buildLevel(levelData, scene);
      expect(result.collidables).toHaveLength(0);
    });

    it('should add each mesh to the scene', () => {
      const row = [null, null, null, createFlatTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // 1 road tile + 4 finish elements = 5 scene.add calls
      expect(scene.add).toHaveBeenCalledTimes(5);
    });
  });

  // ── Block Heights ───────────────────────────────────────────────────────

  describe('Block heights', () => {
    it('should set full block height to 2.0 with isObstacle true', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.collidables).toHaveLength(1);
      expect(result.collidables[0].height).toBe(2.0);
      expect(result.collidables[0].isObstacle).toBe(true);
    });

    it('should position full block with yPos = height/2 (1.0)', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // yPos = 1.0, halfH = 1.0, so maxY = 1.0 + 1.0 = 2.0
      expect(result.collidables[0].maxY).toBe(2.0);
      expect(result.collidables[0].minY).toBe(0.0);
    });

    it('should set half block height to 1.0 with isObstacle true', () => {
      const row = [null, null, null, createHalfBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.collidables).toHaveLength(1);
      expect(result.collidables[0].height).toBe(1.0);
      expect(result.collidables[0].isObstacle).toBe(true);
    });

    it('should position half block with maxY = 1.0', () => {
      const row = [null, null, null, createHalfBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.collidables[0].maxY).toBe(1.0);
      expect(result.collidables[0].minY).toBe(0.0);
    });

    it('should set combined full+half block height to 3.0', () => {
      const row = [null, null, null, createCombinedBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.collidables).toHaveLength(1);
      expect(result.collidables[0].height).toBe(3.0);
    });

    it('should position combined block with maxY = 3.0', () => {
      const row = [null, null, null, createCombinedBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // yPos = 1.5, halfH = 1.5, maxY = 1.5 + 1.5 = 3.0
      expect(result.collidables[0].maxY).toBe(3.0);
      expect(result.collidables[0].minY).toBe(0.0);
    });
  });

  // ── Palette Color Mapping ─────────────────────────────────────────────

  describe('getPaletteColor', () => {
    it('should map palette RGB values to THREE.Color (normalized 0-1)', () => {
      const palette = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
      const row = [null, null, null, createFlatTile(0), null, null, null];
      const levelData = createBaseLevelData({ rows: [row], palette });
      const result = buildLevel(levelData, scene);
      // The mesh material should have been created with color from palette[0]
      const mesh = result.roadMeshes[0];
      expect(mesh.material.color.r).toBeCloseTo(1.0, 3);
      expect(mesh.material.color.g).toBeCloseTo(0.0, 3);
      expect(mesh.material.color.b).toBeCloseTo(0.0, 3);
    });

    it('should use default grey (0.5, 0.5, 0.5) when color index exceeds palette', () => {
      const palette = [[255, 0, 0]]; // Only 1 entry
      const row = [null, null, null, createFlatTile(5), null, null, null]; // color index 5 out of range
      const levelData = createBaseLevelData({ rows: [row], palette });
      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];
      expect(mesh.material.color.r).toBeCloseTo(0.5, 3);
      expect(mesh.material.color.g).toBeCloseTo(0.5, 3);
      expect(mesh.material.color.b).toBeCloseTo(0.5, 3);
    });

    it('should use default grey when palette is undefined', () => {
      const row = [null, null, null, createFlatTile(0), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      delete levelData.palette;
      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];
      expect(mesh.material.color.r).toBeCloseTo(0.5, 3);
    });
  });

  // ── Special Tile Behaviors ────────────────────────────────────────────

  describe('Special tile behaviors from top_color', () => {
    it('should detect sticky behavior from top_color = 2', () => {
      const row = [null, null, null, createFlatTile(2), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(1);
      expect(result.specialTiles[0].behavior).toBe('sticky');
    });

    it('should detect slippery behavior from top_color = 8', () => {
      const row = [null, null, null, createFlatTile(8), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(1);
      expect(result.specialTiles[0].behavior).toBe('slippery');
    });

    it('should detect refill behavior from top_color = 9', () => {
      const row = [null, null, null, createFlatTile(9), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(1);
      expect(result.specialTiles[0].behavior).toBe('refill');
    });

    it('should detect boost behavior from top_color = 10', () => {
      const row = [null, null, null, createFlatTile(10), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(1);
      expect(result.specialTiles[0].behavior).toBe('boost');
    });

    it('should detect burning behavior from top_color = 12', () => {
      const row = [null, null, null, createFlatTile(12), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(1);
      expect(result.specialTiles[0].behavior).toBe('burning');
    });

    it('should not create special tile for non-special top_color values', () => {
      const row = [null, null, null, createFlatTile(0), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(0);
    });

    it('should detect all five special behaviors in a single row', () => {
      const row = [
        createFlatTile(2),   // sticky
        createFlatTile(8),   // slippery
        createFlatTile(9),   // refill
        createFlatTile(10),  // boost
        createFlatTile(12),  // burning
        null, null
      ];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.specialTiles).toHaveLength(5);
      const behaviors = result.specialTiles.map(t => t.behavior).sort();
      expect(behaviors).toEqual(['boost', 'burning', 'refill', 'slippery', 'sticky']);
    });

    it('should use emissive material for special tiles', () => {
      const row = [null, null, null, createFlatTile(10), null, null, null]; // boost
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];
      expect(mesh.material.emissiveIntensity).toBe(0.9);
    });

    it('should set correct emissive glow colors for each behavior', () => {
      // Boost = lime green (0, 1, 0)
      const row = [null, null, null, createFlatTile(10), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      const mesh = result.roadMeshes[0];
      expect(mesh.material.emissive.r).toBeCloseTo(0.0, 3);
      expect(mesh.material.emissive.g).toBeCloseTo(1.0, 3);
      expect(mesh.material.emissive.b).toBeCloseTo(0.0, 3);
    });
  });

  // ── Special Tile Bounding Box ─────────────────────────────────────────

  describe('Special tile bounding box', () => {
    it('should extend bounding box above tile surface for detection', () => {
      const row = [null, null, null, createFlatTile(10), null, null, null]; // refill
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      const tileBox = result.specialTiles[0].boundingBox;
      // Flat tile: height = 0.15, yPos = -0.075, halfH = 0.075
      // minY = yPos + halfH - 0.05 = -0.075 + 0.075 - 0.05 = -0.05
      // maxY = yPos + halfH + 0.3 = -0.075 + 0.075 + 0.3 = 0.3
      expect(tileBox.maxY).toBeCloseTo(0.3, 3);
      expect(tileBox.minY).toBeCloseTo(-0.05, 3);
    });
  });

  // ── Tunnel Generation ─────────────────────────────────────────────────

  describe('Tunnel generation', () => {
    it('should generate 3 collidables for tunnel tile (left wall, right wall, ceiling)', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // Flat tile is not an obstacle collidable, so all 3 are from the tunnel
      expect(result.collidables).toHaveLength(3);
    });

    it('should mark all tunnel collidables as obstacles', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      result.collidables.forEach(c => {
        expect(c.isObstacle).toBe(true);
      });
    });

    it('should add 3 extra meshes for tunnel (left wall, right wall, ceiling)', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // 1 road mesh + 3 tunnel meshes + 4 finish elements = 8
      expect(result.roadMeshes).toHaveLength(8);
    });

    it('should use transparent material for tunnel walls', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // Tunnel meshes are roadMeshes[1], [2], [3]
      const leftWall = result.roadMeshes[1];
      expect(leftWall.material.transparent).toBe(true);
      expect(leftWall.material.opacity).toBeCloseTo(0.35, 3);
    });

    it('should generate tunnel collidables and mark the ceiling as isCeiling', () => {
      const fullBlockWithTunnel = createFullBlockTile(0);
      fullBlockWithTunnel.tunnel = true;
      fullBlockWithTunnel.bottom_color = 1;
      const row = [null, null, null, fullBlockWithTunnel, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // Renders only the tunnel walls and ceiling (3)
      expect(result.collidables).toHaveLength(3);
      
      const ceiling = result.collidables.find(c => c.isCeiling);
      expect(ceiling).toBeDefined();
      expect(ceiling.isObstacle).toBe(true);
    });

    it('should set tunnel ceiling and wall heights dynamically based on half block flag', () => {
      const halfBlockWithTunnel = createHalfBlockTile(0);
      halfBlockWithTunnel.tunnel = true;
      halfBlockWithTunnel.bottom_color = 1;
      const row = [null, null, null, halfBlockWithTunnel, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      
      // Renders only the tunnel walls and ceiling (3)
      expect(result.collidables).toHaveLength(3);
      
      // Verify the tunnel floor (baseY) remains at 0.0
      const leftWall = result.collidables[0];
      expect(leftWall.minY).toBe(0.0);
      
      // Verify that archHeight was set to 1.0 (from half block flag)
      expect(leftWall.maxY).toBe(1.0);
      
      const ceiling = result.collidables.find(c => c.isCeiling);
      expect(ceiling).toBeDefined();
      expect(ceiling.maxY).toBe(1.0);
    });

    it('should dynamically shift tunnel height (baseY) to sit on top of custom-height ramp/road', () => {
      const customTunnel = {
        val: 0,
        ramp: true,
        startY: -4.0,
        endY: -4.0,
        tunnel: true,
        top_color: 0,
        bottom_color: 1,
        low3: 1
      };
      const row = [null, null, null, customTunnel, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);

      // Find any tunnel wall collidable and verify it sits at baseY=-4.0
      const tunnelWall = result.collidables.find(c => c.minY !== undefined && c.maxY !== undefined && c.minY < -0.1);
      expect(tunnelWall).toBeDefined();
      expect(tunnelWall.minY).toBe(-4.0);
    });
  });

  // ── Gravity Scaling ───────────────────────────────────────────────────

  describe('Gravity scaling', () => {
    it('should scale gravity by 3.0', () => {
      const levelData = createBaseLevelData({ gravity: 8, rows: [createNullRow()] });
      const result = buildLevel(levelData, scene);
      expect(result.gravity).toBe(24.0); // 8 * 3.0
    });

    it('should handle different gravity values', () => {
      const levelData = createBaseLevelData({ gravity: 12, rows: [createNullRow()] });
      const result = buildLevel(levelData, scene);
      expect(result.gravity).toBe(36.0); // 12 * 3.0
    });

    it('should use gravity = 1 (scale to 3.0) for very low gravity', () => {
      const levelData = createBaseLevelData({ gravity: 1, rows: [createNullRow()] });
      const result = buildLevel(levelData, scene);
      expect(result.gravity).toBe(3.0);
    });
  });

  // ── Default Values ────────────────────────────────────────────────────

  describe('Default values when data is missing', () => {
    it('should default gravity to 24.0 when gravity is missing', () => {
      const levelData = createBaseLevelData({ rows: [createNullRow()] });
      delete levelData.gravity;
      const result = buildLevel(levelData, scene);
      expect(result.gravity).toBe(24.0);
    });

    it('should default gravity to 24.0 when gravity is 0 (falsy)', () => {
      const levelData = createBaseLevelData({ gravity: 0, rows: [createNullRow()] });
      const result = buildLevel(levelData, scene);
      expect(result.gravity).toBe(24.0);
    });

    it('should default fuel to 100 when fuel is missing', () => {
      const levelData = createBaseLevelData({ rows: [createNullRow()] });
      delete levelData.fuel;
      const result = buildLevel(levelData, scene);
      expect(result.fuel).toBe(100);
    });

    it('should default oxygen to 60 when oxygen is missing', () => {
      const levelData = createBaseLevelData({ rows: [createNullRow()] });
      delete levelData.oxygen;
      const result = buildLevel(levelData, scene);
      expect(result.oxygen).toBe(60);
    });
  });

  // ── Finish Line ───────────────────────────────────────────────────────

  describe('Finish line', () => {
    it('should position finish line at -(trackLength + 2.0)', () => {
      const levelData = createBaseLevelData({
        rows: [createNullRow(), createNullRow(), createNullRow()]
      });
      const result = buildLevel(levelData, scene);
      const expectedFinishZ = -(3 * TILE_LENGTH) - 2.0;
      expect(result.finishZ).toBe(expectedFinishZ);
    });

    it('should return finishZ in result object', () => {
      const levelData = createBaseLevelData({
        rows: [createNullRow()]
      });
      const result = buildLevel(levelData, scene);
      expect(result.finishZ).toBe(-(1 * TILE_LENGTH) - 2.0);
    });

    it('should generate an autopilot tube with support ribs in Infinite Mode', () => {
      const levelData = createBaseLevelData({
        rows: [createNullRow()]
      });
      const result = buildLevel(levelData, scene, 0, true);
      
      // Without infinite mode, it creates 4 finish elements.
      // With infinite mode, it adds:
      // - 1 translucent autopilot tube
      // - 5 pink support ribs
      // Total meshes: 4 + 1 + 5 = 10
      expect(result.roadMeshes).toHaveLength(10);
      expect(scene.add).toHaveBeenCalledTimes(10);
    });
  });

  // ── Track Length ──────────────────────────────────────────────────────

  describe('Track length', () => {
    it('should equal numRows * TILE_LENGTH', () => {
      const rows = Array(10).fill(null).map(() => createNullRow());
      const levelData = createBaseLevelData({ rows });
      const result = buildLevel(levelData, scene);
      expect(result.trackLength).toBe(10 * TILE_LENGTH);
    });

    it('should be 0 for empty rows array', () => {
      const levelData = createBaseLevelData({ rows: [] });
      const result = buildLevel(levelData, scene);
      expect(result.trackLength).toBe(0);
    });
  });

  // ── Road Mesh Count ───────────────────────────────────────────────────

  describe('Road mesh count', () => {
    it('should equal tile count + 4 finish elements (line + left/right/top arch)', () => {
      const row = [
        createFlatTile(), createFlatTile(), null, null, null, createFlatTile(), null
      ];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // 3 tiles + 4 finish elements = 7
      expect(result.roadMeshes).toHaveLength(7);
    });

    it('should include tunnel meshes in road mesh count', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // 1 tile + 3 tunnel + 4 finish = 8
      expect(result.roadMeshes).toHaveLength(8);
    });
  });

  // ── Tile Positioning ──────────────────────────────────────────────────

  describe('Tile positioning', () => {
    it('should set X position as (col - 3) * TILE_WIDTH for each column', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null).map(() => createFlatTile());
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);

      for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
        const expectedX = (c - 3) * TILE_WIDTH;
        expect(result.roadMeshes[c].position.x).toBeCloseTo(expectedX, 5);
      }
    });

    it('should center column 3 at x = 0', () => {
      const row = Array(ROAD_WIDTH_LANES).fill(null).map(() => createFlatTile());
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.roadMeshes[3].position.x).toBe(0);
    });

    it('should set Z position as -row * TILE_LENGTH - TILE_LENGTH / 2', () => {
      const rows = [createFullFlatRow(), createFullFlatRow()];
      const levelData = createBaseLevelData({ rows });
      const result = buildLevel(levelData, scene);

      // Row 0, col 0 → z = -0 * 4 - 2 = -2
      expect(result.roadMeshes[0].position.z).toBeCloseTo(-TILE_LENGTH / 2, 5);
      // Row 1, col 0 → z = -1 * 4 - 2 = -6
      expect(result.roadMeshes[7].position.z).toBeCloseTo(-TILE_LENGTH - TILE_LENGTH / 2, 5);
    });

    it('should set flat tile Y position at -height/2 (flush with ground)', () => {
      const row = [null, null, null, createFlatTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // height = 0.45, yPos = -0.225
      expect(result.roadMeshes[0].position.y).toBeCloseTo(-0.225, 5);
    });

    it('should set obstacle block Y position at height/2 (centered)', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // height = 2.0, yPos = 1.0 + 0.02 z-fighting offset
      // Since a flat road tile is created underneath, index 0 is the flat road tile, index 1 is the obstacle block
      expect(result.roadMeshes[1].position.y).toBeCloseTo(1.02, 5);
    });
  });

  // ── Collidable Bounding Boxes ─────────────────────────────────────────

  describe('Collidable bounding boxes', () => {
    it('should compute correct X bounds for center tile', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      const block = result.collidables[0];
      // col 3, xPos = 0, halfW = 1.0
      expect(block.minX).toBeCloseTo(-1.0, 5);
      expect(block.maxX).toBeCloseTo(1.0, 5);
    });

    it('should compute correct Z bounds', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      const block = result.collidables[0];
      // row 0, zPos = 0, mesh.z = 0 - 2 = -2, halfL = 2
      expect(block.minZ).toBeCloseTo(-4.0, 5);
      expect(block.maxZ).toBeCloseTo(0.0, 5);
    });
  });

  // ── Shadow Settings ───────────────────────────────────────────────────

  describe('Shadow settings', () => {
    it('should enable receiveShadow on all meshes', () => {
      const row = [null, null, null, createFlatTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      expect(result.roadMeshes[0].receiveShadow).toBe(true);
    });

    it('should enable castShadow only on obstacle tiles', () => {
      const row = [null, null, createFlatTile(), createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, scene);
      // roadMeshes[0] = flat tile (col 2), roadMeshes[1] = flat tile under obstacle (col 3), roadMeshes[2] = full block (col 3)
      expect(result.roadMeshes[0].castShadow).toBe(false);
      expect(result.roadMeshes[2].castShadow).toBe(true);
    });
  });

  // ── Exported Constants ────────────────────────────────────────────────

  describe('Exported constants', () => {
    it('should export correct tile dimensions', () => {
      expect(TILE_WIDTH).toBe(2.0);
      expect(TILE_LENGTH).toBe(4.0);
    });

    it('should export correct road configuration', () => {
      expect(ROAD_WIDTH_LANES).toBe(7);
      expect(TOTAL_ROAD_WIDTH).toBe(14.0);
    });
  });

  // ── Custom Generated Level Assets ─────────────────────────────────────

  describe('Custom Generated Level Assets', () => {
    it('should export getLevelObjUrl and getLevelAssetUrl', () => {
      expect(typeof getLevelObjUrl).toBe('function');
      expect(typeof getLevelAssetUrl).toBe('function');
    });

    it('should return null or undefined for non-existent assets', () => {
      expect(getLevelObjUrl(999, 'nonexistent.obj')).toBeNull();
      expect(getLevelAssetUrl(999, 'nonexistent.png')).toBeNull();
    });
  });

  // ── Flow/Tower deck ceiling lighting ──────────────────────────────────

  describe('buildDeckCeilingLight', () => {
    function makeGroup() {
      const g = new THREE.Group();
      vi.spyOn(g, 'add');
      return g;
    }

    it('adds light rails + rungs into the deck group, tagged for cleanup', () => {
      const group = makeGroup();
      buildDeckCeilingLight(group, 80); // 20 tiles long
      expect(group.children.length).toBeGreaterThan(2); // 2 rails + several rungs
      expect(group.children.every((m) => m.userData.isDeckCeilingLight)).toBe(true);
    });

    it('length-segments the rails so they bend with the curvature shader', () => {
      const group = makeGroup();
      buildDeckCeilingLight(group, 80);
      const rails = group.children.filter((m) => m.geometry.parameters.depth === 80);
      expect(rails.length).toBe(2);
      // one depth segment per tile (80 / TILE_LENGTH = 20), never a single chord
      expect(rails[0].geometry.parameters.depthSegments).toBe(80 / TILE_LENGTH);
    });

    it('disables frustum culling (curvature invalidates the static AABB)', () => {
      const group = makeGroup();
      buildDeckCeilingLight(group, 80);
      expect(group.children.every((m) => m.frustumCulled === false)).toBe(true);
    });

    it('draws the cross rungs as a single InstancedMesh with one instance per rung', () => {
      const group = makeGroup();
      buildDeckCeilingLight(group, 80); // default rungSpacingRows = 5
      // Mirror the production loop exactly so the assertion tracks any spacing change.
      const rungSpacing = 5 * TILE_LENGTH;
      let expectedRungCount = 0;
      for (let z = -rungSpacing; z > -80; z -= rungSpacing) expectedRungCount++;
      const rungMeshes = group.children.filter((m) => m.isInstancedMesh && m.userData.isDeckCeilingLight);
      expect(rungMeshes.length).toBe(1);
      expect(rungMeshes[0].count).toBe(expectedRungCount);
    });

    it('no-ops on a missing group or non-positive length', () => {
      expect(() => buildDeckCeilingLight(null, 80)).not.toThrow();
      const group = makeGroup();
      buildDeckCeilingLight(group, 0);
      expect(group.children.length).toBe(0);
    });
  });

  // ── Flow/Tower connecting pillars ─────────────────────────────────────

  describe('buildDeckPillars', () => {
    function makeGroup() {
      return new THREE.Group();
    }

    it('raises paired left/right pillars along the deck as instanced columns+trims, tagged for cleanup', () => {
      const group = makeGroup();
      buildDeckPillars(group, 80); // 20 tiles, spacingRows 4 → ~5 pillar rows
      // Drawn as two InstancedMesh (columns + trims) instead of one mesh per pillar.
      expect(group.children.length).toBe(2);
      expect(group.children.every((m) => m.userData.isDeckPillar)).toBe(true);
      expect(group.children.every((m) => m.isInstancedMesh)).toBe(true);
      const [columns, trims] = group.children;
      // both sides at each pillar row → instance count is a positive multiple of 2
      expect(columns.count).toBeGreaterThan(0);
      expect(columns.count % 2).toBe(0);
      expect(trims.count).toBe(columns.count);

      // Each trim sits ~0.26u inboard of its column (emissive strip on the inner face).
      const cm = new THREE.Matrix4();
      const tm = new THREE.Matrix4();
      const cp = new THREE.Vector3();
      const tp = new THREE.Vector3();
      columns.getMatrixAt(0, cm); cp.setFromMatrixPosition(cm);
      trims.getMatrixAt(0, tm); tp.setFromMatrixPosition(tm);
      expect(Math.abs(tp.x)).toBeLessThan(Math.abs(cp.x)); // trim inboard of its column
      expect(Math.abs(Math.abs(cp.x) - Math.abs(tp.x))).toBeCloseTo(0.26, 5);
    });

    it('columns span the deck gap and sit just outside the road, culling disabled', () => {
      const group = makeGroup();
      buildDeckPillars(group, 80, { height: 25 });
      const columns = group.children.find((m) => m.geometry.parameters.height === 25);
      expect(columns).toBeDefined();
      expect(columns.frustumCulled).toBe(false);
      // Every instance's X translation sits just beyond the road half-width.
      const mat = new THREE.Matrix4();
      const pos = new THREE.Vector3();
      for (let i = 0; i < columns.count; i++) {
        columns.getMatrixAt(i, mat);
        pos.setFromMatrixPosition(mat);
        expect(Math.abs(pos.x)).toBeGreaterThan(TOTAL_ROAD_WIDTH / 2);
      }
    });

    it('no-ops on a missing group or non-positive length', () => {
      expect(() => buildDeckPillars(null, 80)).not.toThrow();
      const group = makeGroup();
      buildDeckPillars(group, 0);
      expect(group.children.length).toBe(0);
    });
  });

  // ── P3.1: columnGrid on levelInfo ─────────────────────────────────────
  // Verifies that buildLevel (sync) and buildLevelAsync attach columnGrid and numRows
  // to the returned levelInfo, and that the grid matches what buildColumnGrid produces
  // directly from the same levelData.

  describe('P3.1 — columnGrid on levelInfo', () => {
    it('buildLevel returns columnGrid and numRows', () => {
      const rows = [createFullFlatRow(), createFullFlatRow(), createFullFlatRow()];
      const levelData = createBaseLevelData({ rows });
      const result = buildLevel(levelData, createMockScene());
      expect(result.columnGrid).toBeDefined();
      expect(result.numRows).toBe(3);
    });

    it('columnGrid matches buildColumnGrid for a flat level', () => {
      const rows = [createFullFlatRow()];
      const levelData = createBaseLevelData({ rows });
      const result = buildLevel(levelData, createMockScene());
      const { grid } = buildColumnGrid(levelData);
      // Same structure: 1 row × 7 columns, each a non-gap column with 1 span (flat road)
      expect(result.columnGrid.length).toBe(grid.length);
      for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
        expect(result.columnGrid[0][c].isGap).toBe(grid[0][c].isGap);
        expect(result.columnGrid[0][c].spans.length).toBe(grid[0][c].spans.length);
        expect(result.columnGrid[0][c].spans[0].topEntryY).toBe(grid[0][c].spans[0].topEntryY);
      }
    });

    it('columnGrid gap cells match null tiles', () => {
      const row = createNullRow();
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
        expect(result.columnGrid[0][c].isGap).toBe(true);
      }
    });

    it('buildLevelAsync returns columnGrid and numRows', async () => {
      const rows = [createFullFlatRow(), createFullFlatRow()];
      const levelData = createBaseLevelData({ rows });
      const result = await buildLevelAsync(levelData, createMockScene());
      expect(result.columnGrid).toBeDefined();
      expect(result.numRows).toBe(2);
      expect(result.columnGrid.length).toBe(2);
    });
  });

  // ── P3.2: multi-span geometry (no-throw + single-span unchanged) ──────
  // Verifies that a native 2-span cell doesn't throw during buildLevel and
  // that single-span legacy tiles are unaffected (collidables/mesh counts match).

  describe('P3.2 — multi-span geometry', () => {
    it('2-span native cell builds without throwing', () => {
      const twoSpanTile = {
        val: 0,
        full: false, half: false, tunnel: false,
        top_color: 0, bottom_color: 0, low3: 0,
        // Native spans: road at 0, then an overpass slab at floorY=3, top=3.2
        spans: [
          { floorY: -0.1, topEntryY: 0, topExitY: 0, bottom_color: 0 },
          { floorY: 3.0, topEntryY: 3.2, topExitY: 3.2, bottom_color: 1 },
        ],
      };
      const row = [null, null, null, twoSpanTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      expect(() => buildLevel(levelData, createMockScene())).not.toThrow();
    });

    it('2-span cell columnGrid has 2 spans in the right cell', () => {
      const twoSpanTile = {
        val: 0,
        full: false, half: false, tunnel: false,
        top_color: 0, bottom_color: 0, low3: 0,
        spans: [
          { floorY: -0.1, topEntryY: 0, topExitY: 0, bottom_color: 0 },
          { floorY: 3.0, topEntryY: 3.2, topExitY: 3.2, bottom_color: 1 },
        ],
      };
      const row = [null, null, null, twoSpanTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      // Lane 3 (centre) = column index 3 in grid row 0
      expect(result.columnGrid[0][3].spans).toHaveLength(2);
      expect(result.columnGrid[0][3].spans[0].topEntryY).toBeCloseTo(0, 6);
      expect(result.columnGrid[0][3].spans[1].topEntryY).toBeCloseTo(3.2, 6);
    });

    it('2-span cell produces more roadMeshes than a plain flat-road cell (upper slab rendered)', () => {
      // Plain flat road: 1 tile → 1 mesh + 4 finish elements = 5
      const flatRow = [null, null, null, createFlatTile(), null, null, null];
      const flatLevel = createBaseLevelData({ rows: [flatRow] });
      const flatResult = buildLevel(flatLevel, createMockScene());
      const flatMeshCount = flatResult.roadMeshes.length;

      // 2-span native cell: road span + overpass slab span → 2 meshes for that cell + 4 finish = 6
      const twoSpanTile = {
        val: 0,
        full: false, half: false, tunnel: false,
        top_color: 0, bottom_color: 0, low3: 0,
        spans: [
          { floorY: -0.1, topEntryY: 0,   topExitY: 0,   bottom_color: 1 },
          { floorY: 3.0,  topEntryY: 3.2, topExitY: 3.2, bottom_color: 1 },
        ],
      };
      const spanRow = [null, null, null, twoSpanTile, null, null, null];
      const spanLevel = createBaseLevelData({ rows: [spanRow] });
      const spanResult = buildLevel(spanLevel, createMockScene());

      // The overpass slab must have produced its own mesh — strictly MORE meshes than a flat tile
      expect(spanResult.roadMeshes.length).toBeGreaterThan(flatMeshCount);
      // Exact: 2 span meshes + 4 finish = 6 vs 1 flat mesh + 4 finish = 5
      expect(spanResult.roadMeshes.length).toBe(flatMeshCount + 1);
    });

    it('multi-span cell does NOT push to collidables (physics uses columnGrid)', () => {
      const twoSpanTile = {
        val: 0,
        full: false, half: false, tunnel: false,
        top_color: 0, bottom_color: 0, low3: 0,
        spans: [
          { floorY: -0.1, topEntryY: 0,   topExitY: 0,   bottom_color: 1 },
          { floorY: 3.0,  topEntryY: 3.2, topExitY: 3.2, bottom_color: 1 },
        ],
      };
      const row = [null, null, null, twoSpanTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      expect(result.collidables).toHaveLength(0);
    });

    it('single-span flat tile: collidable count unchanged (0 for flat road)', () => {
      const levelData = createBaseLevelData({ rows: [createFullFlatRow()] });
      const result = buildLevel(levelData, createMockScene());
      // Flat road produces no collidables in the legacy list (physics now uses columnGrid)
      expect(result.collidables).toHaveLength(0);
    });

    it('single-span obstacle: collidable count unchanged (1)', () => {
      const row = [null, null, null, createFullBlockTile(), null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      expect(result.collidables).toHaveLength(1);
    });
  });

  // ── P3.3: tunnel ceiling span height ─────────────────────────────────
  // The collision ceiling span must be tall (floorY = tunnelClear, top = tunnelClear+6)
  // so a fast vertical mover can't tunnel through it in one substep.
  // The VISUAL archway in levelLoader remains thin/decorative (collidable isCeiling slab
  // is still thin — that's a legacy collidable for the editor; physics uses columnGrid).

  describe('tunnel ceiling span — rideable roof', () => {
    it('tunnel cell = road + rideable roof + two lateral wall legs (containment)', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      const col = result.columnGrid[0][3];
      const archHeight = TILE_WIDTH / 2; // 1.0 single-lane default
      // Full-width spans: road + rideable roof.
      const full = col.spans.filter(s => s.xMin == null);
      const road = full.find(s => s.floorY === -0.1);
      const roof = full.find(s => s.floorY > 0);
      expect(road.topEntryY).toBeCloseTo(0, 6);
      expect(roof.topEntryY).toBeCloseTo(archHeight, 6);          // rideable top
      expect(roof.floorY).toBeCloseTo(archHeight - 0.15, 6);      // bonk underside
      expect(roof.topEntryY - roof.floorY).toBeGreaterThan(0.1);  // untunnelable
      // Partial-width side walls — single-lane tunnel => both legs on this cell.
      const walls = col.spans.filter(s => s.xMin != null);
      expect(walls).toHaveLength(2);
      const b = cellBounds(3, 0);
      for (const w of walls) {
        expect(w.floorY).toBeCloseTo(0, 6);                  // wall rises from the road
        expect(w.topEntryY).toBeCloseTo(archHeight, 6);      // to the roof height
        expect(w.xMax - w.xMin).toBeCloseTo(0.15, 6);        // thin leg
      }
      // One leg on the left edge, one on the right edge.
      expect(walls.some(w => Math.abs(w.xMin - b.minX) < 1e-6)).toBe(true);
      expect(walls.some(w => Math.abs(w.xMax - b.maxX) < 1e-6)).toBe(true);
    });

    it('full-block tunnel: roof rideable at 2.0, underside at 1.85', () => {
      const tile = createFullBlockTile(0);
      tile.tunnel = true;
      tile.bottom_color = 1;
      const row = [null, null, null, tile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      const roof = result.columnGrid[0][3].spans.find(s => s.xMin == null && s.floorY > 0);
      expect(roof.floorY).toBeCloseTo(1.85, 6);
      expect(roof.topEntryY).toBeCloseTo(2.0, 6);
    });

    it('head-bonk: ceilingAbove at y=0 equals the roof underside (archHeight - 0.15)', () => {
      const tunnelTile = createFlatTile(0, { tunnel: true, bottom_color: 1 });
      const row = [null, null, null, tunnelTile, null, null, null];
      const levelData = createBaseLevelData({ rows: [row] });
      const result = buildLevel(levelData, createMockScene());
      const b = cellBounds(3, 0);
      const x = (b.minX + b.maxX) / 2;
      const z = (b.minZ + b.maxZ) / 2;
      const archHeight = TILE_WIDTH / 2;
      expect(ceilingAbove(result.columnGrid, result.numRows, x, z, 0))
        .toBeCloseTo(archHeight - 0.15, 6);
    });
  });
});
