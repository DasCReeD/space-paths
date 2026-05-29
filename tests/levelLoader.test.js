import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { buildLevel } from '../levelLoader.js';

describe('levelLoader Unit Tests', () => {
  it('should parse level rows and build track with finish line', () => {
    // 1. Create a dummy level layout (2 rows)
    const dummyLevelData = {
      gravity: 8,
      fuel: 100,
      oxygen: 60,
      palette: [
        [255, 255, 255], // index 0 (white)
        [0, 255, 0],     // index 1
        [0, 0, 255],     // index 2
        [255, 0, 0],     // index 3
      ],
      rows: [
        // Row 0: simple road tile in lane 3 (center)
        [
          null, null, null,
          { val: 5, full: false, half: false, tunnel: false, top_color: 0, bottom_color: 0, low3: 5 },
          null, null, null
        ],
        // Row 1: full block in lane 3
        [
          null, null, null,
          { val: 16389, full: true, half: false, tunnel: false, top_color: 0, bottom_color: 0, low3: 5 },
          null, null, null
        ]
      ]
    };

    // 2. Mock Three.js scene
    const mockScene = {
      add: vi.fn()
    };

    // 3. Build level
    const levelInfo = buildLevel(dummyLevelData, mockScene);

    // 4. Verify outputs
    expect(levelInfo.trackLength).toBe(8.0); // 2 rows * 4.0 length each
    expect(levelInfo.gravity).toBe(24.0); // 8 * 3.0 scale
    expect(levelInfo.fuel).toBe(100);
    expect(levelInfo.oxygen).toBe(60);

    // Bounding boxes check
    // We have 1 obstacle (the full block in Row 1)
    expect(levelInfo.collidables.length).toBe(1);
    
    const block = levelInfo.collidables[0];
    expect(block.isObstacle).toBe(true);
    expect(block.height).toBe(2.0); // full block = 2.0 height
    expect(block.maxY).toBe(2.0);   // top surface height
  });

  it('should correctly identify special tile behaviors from palette top colors', () => {
    const specialLevelData = {
      gravity: 8,
      fuel: 100,
      oxygen: 60,
      palette: Array(15).fill([255, 255, 255]),
      rows: [
        [
          // Sticky tile (top_color = 3)
          { val: 3, full: false, half: false, tunnel: false, top_color: 3, bottom_color: 0, low3: 3 },
          // Boost tile (top_color = 11)
          { val: 11, full: false, half: false, tunnel: false, top_color: 11, bottom_color: 0, low3: 3 },
          // Refill tile (top_color = 10)
          { val: 10, full: false, half: false, tunnel: false, top_color: 10, bottom_color: 0, low3: 3 },
          // Burning tile (top_color = 13)
          { val: 13, full: false, half: false, tunnel: false, top_color: 13, bottom_color: 0, low3: 3 },
          null, null, null
        ]
      ]
    };

    const mockScene = { add: vi.fn() };
    const levelInfo = buildLevel(specialLevelData, mockScene);

    expect(levelInfo.specialTiles.length).toBe(4);
    
    const behaviors = levelInfo.specialTiles.map(t => t.behavior);
    expect(behaviors).toContain('sticky');
    expect(behaviors).toContain('boost');
    expect(behaviors).toContain('refill');
    expect(behaviors).toContain('burning');
  });

  it('should generate ceiling and walls for tunnel tiles', () => {
    const tunnelLevelData = {
      gravity: 8,
      fuel: 100,
      oxygen: 60,
      palette: Array(15).fill([255, 255, 255]),
      rows: [
        [
          null, null, null,
          // Tunnel tile in center
          { val: 4096, full: false, half: false, tunnel: true, top_color: 0, bottom_color: 1, low3: 0 },
          null, null, null
        ]
      ]
    };

    const mockScene = { add: vi.fn() };
    const levelInfo = buildLevel(tunnelLevelData, mockScene);

    // Tunnels generate 3 collidables (left wall, right wall, ceiling)
    expect(levelInfo.collidables.length).toBe(3);
    
    // Total meshes added includes road + left wall + right wall + ceiling + finish elements
    expect(levelInfo.roadMeshes.length).toBeGreaterThan(4);
  });
});
