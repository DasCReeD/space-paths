// @vitest-environment node
//
// Headless unit tests for heightfield.js — no jsdom, no THREE.js needed.
// See docs/collision-redesign-plan.md §1 for the full spec.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  TILE_WIDTH,
  TILE_LENGTH,
  ROAD_WIDTH_LANES,
  TOTAL_ROAD_WIDTH,
  legacyTileToSpans,
  buildColumnGrid,
  cellBounds,
  worldToCell,
  spanTopAtZ,
  spanSolidTopAtZ,
  columnsOverlappingBox,
  supportSurface,
  ceilingAbove,
} from '../heightfield.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flatTile(overrides = {}) {
  return { val: 1, full: false, half: false, tunnel: false, ramp: false,
           top_color: 0, bottom_color: 0, ...overrides };
}

function buildSimpleGrid(rows) {
  // rows is an array of arrays (7 cells each, null = gap)
  return buildColumnGrid({ rows });
}

// ─── Constants sanity ─────────────────────────────────────────────────────────

describe('track constants', () => {
  it('has expected values', () => {
    expect(TILE_WIDTH).toBe(2.0);
    expect(TILE_LENGTH).toBe(4.0);
    expect(ROAD_WIDTH_LANES).toBe(7);
    expect(TOTAL_ROAD_WIDTH).toBe(14.0);
  });
});

// ─── P0.2: legacyTileToSpans — §1.4 table ────────────────────────────────────

describe('legacyTileToSpans', () => {
  it('flat road => single span [floorY:-0.1, top:0,0]', () => {
    const spans = legacyTileToSpans(flatTile());
    expect(spans).toHaveLength(1);
    expect(spans[0].floorY).toBe(-0.1);
    expect(spans[0].topEntryY).toBe(0);
    expect(spans[0].topExitY).toBe(0);
    expect(spans[0].isRamp).toBe(false);
    expect(spans[0].isWallObstacle).toBe(false);
  });

  it('elevated flat tile (ramp:false, startY=1.5) => flat span at 1.5 (matches renderer)', () => {
    // A plain tile can still carry startY (an elevated flat surface). The renderer
    // draws it flat at baseY=startY; collision must match or the ship floats/falls.
    const spans = legacyTileToSpans(flatTile({ startY: 1.5, endY: 2, ramp: false }));
    expect(spans).toHaveLength(1);
    expect(spans[0].topEntryY).toBe(1.5);
    expect(spans[0].topExitY).toBe(1.5); // renderer's non-ramp branch draws flat at startY
    expect(spans[0].floorY).toBeCloseTo(1.4, 6);
    expect(spans[0].isWallObstacle).toBe(false);
  });

  it('half block => [floorY:0, top:1.0, isWallObstacle]', () => {
    const spans = legacyTileToSpans(flatTile({ half: true }));
    expect(spans).toHaveLength(1);
    expect(spans[0].floorY).toBe(0);
    expect(spans[0].topEntryY).toBe(1.0);
    expect(spans[0].topExitY).toBe(1.0);
    expect(spans[0].isWallObstacle).toBe(true);
  });

  it('full block => [floorY:0, top:2.0, isWallObstacle]', () => {
    const spans = legacyTileToSpans(flatTile({ full: true }));
    expect(spans).toHaveLength(1);
    expect(spans[0].floorY).toBe(0);
    expect(spans[0].topEntryY).toBe(2.0);
    expect(spans[0].topExitY).toBe(2.0);
    expect(spans[0].isWallObstacle).toBe(true);
  });

  it('full+half block => [floorY:0, top:3.0, isWallObstacle]', () => {
    const spans = legacyTileToSpans(flatTile({ full: true, half: true }));
    expect(spans).toHaveLength(1);
    expect(spans[0].floorY).toBe(0);
    expect(spans[0].topEntryY).toBe(3.0);
    expect(spans[0].topExitY).toBe(3.0);
    expect(spans[0].isWallObstacle).toBe(true);
  });

  // Regression: an obstacle sitting on an ELEVATED platform is encoded
  // `{full:true, startY:h, endY:h}` (generated levels build platform obstacles this
  // way). It must occupy [h, h+height] — matching levelLoader.computeTileGeometry —
  // NOT [0, height]. The old adapter ignored startY, leaving a phantom hole at the
  // platform surface where the wall renders → the ship drove in and fell through.
  it('elevated full block (startY=4) => [floorY:4, top:6] (matches renderer, no phantom hole)', () => {
    const spans = legacyTileToSpans(flatTile({ full: true, startY: 4, endY: 4 }));
    expect(spans).toHaveLength(1);
    expect(spans[0].floorY).toBe(4);
    expect(spans[0].topEntryY).toBe(6);
    expect(spans[0].topExitY).toBe(6);
    expect(spans[0].isWallObstacle).toBe(true);
  });

  it('elevated half block (startY=2) => [floorY:2, top:3]', () => {
    const spans = legacyTileToSpans(flatTile({ half: true, startY: 2, endY: 2 }));
    expect(spans[0].floorY).toBe(2);
    expect(spans[0].topEntryY).toBe(3);
  });

  it('elevated full+half block (startY=6) => [floorY:6, top:9]', () => {
    const spans = legacyTileToSpans(flatTile({ full: true, half: true, startY: 6, endY: 6 }));
    expect(spans[0].floorY).toBe(6);
    expect(spans[0].topEntryY).toBe(9);
  });

  it('ramp up (startY=0, endY=2) => topEntryY=startY, topExitY=endY, isRamp', () => {
    const spans = legacyTileToSpans(flatTile({ ramp: true, startY: 0, endY: 2 }));
    expect(spans).toHaveLength(1);
    const s = spans[0];
    expect(s.topEntryY).toBe(0);  // entry = maxZ edge = startY per §1.1
    expect(s.topExitY).toBe(2);
    expect(s.isRamp).toBe(true);
    expect(s.floorY).toBe(Math.min(0, 2, 0) - 2.0); // min(0,2,0)-2 = -2
    expect(s.isWallObstacle).toBe(false);
  });

  it('ramp down (startY=2, endY=0) => topEntryY=2, topExitY=0', () => {
    const spans = legacyTileToSpans(flatTile({ ramp: true, startY: 2, endY: 0 }));
    expect(spans).toHaveLength(1);
    const s = spans[0];
    expect(s.topEntryY).toBe(2);
    expect(s.topExitY).toBe(0);
    expect(s.isRamp).toBe(true);
    expect(s.floorY).toBe(Math.min(2, 0, 0) - 2.0); // = -2
  });

  it('flat ramp (startY=4, endY=4) => isRamp false', () => {
    const spans = legacyTileToSpans(flatTile({ ramp: true, startY: 4, endY: 4 }));
    expect(spans[0].isRamp).toBe(false);
    expect(spans[0].topEntryY).toBe(4);
    expect(spans[0].topExitY).toBe(4);
  });

  it('tunnel tile => 2 spans: road + ceiling slab', () => {
    const spans = legacyTileToSpans(flatTile({ tunnel: true }));
    expect(spans).toHaveLength(2);
    // road span
    expect(spans[0].floorY).toBe(-0.1);
    expect(spans[0].topEntryY).toBe(0);
    expect(spans[0].topExitY).toBe(0);
    // ceiling = RIDEABLE roof slab: top at archHeight (= TILE_WIDTH/2 = 1.0 single-lane),
    // underside 0.15 below (head-bonk when jumping inside). You can land on the top —
    // jumping onto tunnels is core gameplay. (Thin slab is untunnelable: 0.4-tall ship at
    // the 0.5u substep cap can't skip a slab thicker than 0.1u.)
    const archHeight = TILE_WIDTH / 2;
    expect(spans[1].topEntryY).toBeCloseTo(archHeight, 6);       // rideable roof top
    expect(spans[1].floorY).toBeCloseTo(archHeight - 0.15, 6);   // bonk underside
  });

  it('behavior colors are mapped from bottom_color for flat road', () => {
    const spans = legacyTileToSpans(flatTile({ bottom_color: 10 })); // raw 10 = boost (behaviorColor 11)
    expect(spans[0].behavior).toBe('boost');
  });

  it('behavior colors are mapped from top_color for obstacles', () => {
    const spans = legacyTileToSpans(flatTile({ full: true, top_color: 12 })); // raw 12 = burning (behaviorColor 13)
    expect(spans[0].behavior).toBe('burning');
  });

  it('native spans array is authoritative — returned as-is (normalized)', () => {
    const tile = {
      val: 0,
      spans: [
        { floorY: -0.1, topEntryY: 0,   topExitY: 0,   bottom_color: 1 },
        { floorY: 3.0,  topEntryY: 3.2, topExitY: 3.2, bottom_color: 1 },
      ],
    };
    const spans = legacyTileToSpans(tile);
    expect(spans).toHaveLength(2);
    expect(spans[0].topEntryY).toBe(0);
    expect(spans[1].topEntryY).toBe(3.2);
    expect(spans[1].floorY).toBe(3.0);
  });
});

// ─── P0.2: null cell => isGap ─────────────────────────────────────────────────

describe('buildColumnGrid — null cell', () => {
  it('null tile produces isGap column with empty spans', () => {
    const { grid } = buildSimpleGrid([[null, null, null, null, null, null, null]]);
    expect(grid[0][0].isGap).toBe(true);
    expect(grid[0][0].spans).toHaveLength(0);
  });
});

// ─── P0.2: cellBounds ────────────────────────────────────────────────────────

describe('cellBounds', () => {
  it('lane 0 row 0: minX=-7, maxX=-5, maxZ=0, minZ=-4', () => {
    const b = cellBounds(0, 0);
    expect(b.minX).toBeCloseTo(-7.0);
    expect(b.maxX).toBeCloseTo(-5.0);
    expect(b.maxZ).toBeCloseTo(0.0);
    expect(b.minZ).toBeCloseTo(-4.0);
  });

  it('lane 3 (center) row 0: minX=-1, maxX=1', () => {
    const b = cellBounds(3, 0);
    expect(b.minX).toBeCloseTo(-1.0);
    expect(b.maxX).toBeCloseTo(1.0);
  });

  it('lane 6 (rightmost) row 0: minX=5, maxX=7', () => {
    const b = cellBounds(6, 0);
    expect(b.minX).toBeCloseTo(5.0);
    expect(b.maxX).toBeCloseTo(7.0);
  });

  it('row r: maxZ = -r*4, minZ = -(r+1)*4', () => {
    const b = cellBounds(3, 5);
    expect(b.maxZ).toBeCloseTo(-5 * 4);
    expect(b.minZ).toBeCloseTo(-6 * 4);
  });
});

// ─── P0.2: worldToCell round-trips ───────────────────────────────────────────

describe('worldToCell', () => {
  it('lane centers round-trip for all 7 lanes at row 0', () => {
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const { minX, maxX, maxZ, minZ } = cellBounds(c, 0);
      const centerX = (minX + maxX) / 2;
      const centerZ = (maxZ + minZ) / 2;
      const result = worldToCell(centerX, centerZ);
      expect(result).not.toBeNull();
      expect(result.c).toBe(c);
      expect(result.r).toBe(0);
    }
  });

  it('row centers round-trip for several rows', () => {
    for (let r = 0; r < 5; r++) {
      const { maxZ, minZ } = cellBounds(3, r);
      const centerZ = (maxZ + minZ) / 2;
      const result = worldToCell(0, centerZ);
      expect(result).not.toBeNull();
      expect(result.r).toBe(r);
    }
  });

  it('out-of-track (x too large) => null', () => {
    expect(worldToCell(100, -4)).toBeNull();
  });

  it('out-of-track (x too small) => null', () => {
    expect(worldToCell(-100, -4)).toBeNull();
  });

  it('z > 0 (before start) => null', () => {
    expect(worldToCell(0, 1)).toBeNull();
  });
});

// ─── P0.3: spanTopAtZ interpolation ──────────────────────────────────────────

describe('spanTopAtZ', () => {
  const bounds = cellBounds(3, 0); // maxZ=0, minZ=-4

  it('at entry edge (maxZ=0) returns topEntryY', () => {
    const span = { topEntryY: 0, topExitY: 2, isRamp: true };
    expect(spanTopAtZ(span, bounds, 0)).toBeCloseTo(0);
  });

  it('at exit edge (minZ=-4) returns topExitY', () => {
    const span = { topEntryY: 0, topExitY: 2, isRamp: true };
    expect(spanTopAtZ(span, bounds, -4)).toBeCloseTo(2);
  });

  it('at 25% through (z=-1) returns 25% of slope', () => {
    const span = { topEntryY: 0, topExitY: 2, isRamp: true };
    // t = (0 - (-1)) / (0 - (-4)) = 1/4
    expect(spanTopAtZ(span, bounds, -1)).toBeCloseTo(0.5);
  });

  it('at 50% through (z=-2) returns midpoint', () => {
    const span = { topEntryY: 0, topExitY: 2, isRamp: true };
    expect(spanTopAtZ(span, bounds, -2)).toBeCloseTo(1.0);
  });

  it('at 75% through (z=-3) returns 75% of slope', () => {
    const span = { topEntryY: 0, topExitY: 2, isRamp: true };
    expect(spanTopAtZ(span, bounds, -3)).toBeCloseTo(1.5);
  });

  it('flat span always returns topEntryY regardless of z', () => {
    const span = { topEntryY: 1.5, topExitY: 1.5, isRamp: false };
    expect(spanTopAtZ(span, bounds, -2)).toBeCloseTo(1.5);
  });
});

describe('spanSolidTopAtZ', () => {
  it('equals spanTopAtZ (top face is the solid surface)', () => {
    const bounds = cellBounds(3, 0);
    const span = { topEntryY: 0, topExitY: 4, isRamp: true };
    expect(spanSolidTopAtZ(span, bounds, -2)).toBeCloseTo(spanTopAtZ(span, bounds, -2));
  });
});

// ─── P0.3: supportSurface ────────────────────────────────────────────────────

describe('supportSurface — single flat cell', () => {
  it('ship at y=0 on flat road returns surfaceY=0', () => {
    const row = Array(7).fill(null).map((_, i) =>
      i === 3 ? flatTile() : null
    );
    const { grid, numRows } = buildSimpleGrid([row]);

    // Ship at center of cell (c=3, r=0)
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;

    const result = supportSurface(grid, numRows, x, z, 0.3, 0.5);
    expect(result).not.toBeNull();
    expect(result.surfaceY).toBeCloseTo(0);
    expect(result.slope).toBeCloseTo(0);
  });
});

describe('supportSurface — two-span column', () => {
  // Lower span: floorY=-0.1, top=0
  // Upper span (slab): floorY=3.0, top=3.2
  function makeTwoSpanGrid() {
    const tile = {
      val: 0,
      spans: [
        { floorY: -0.1, topEntryY: 0,   topExitY: 0,   bottom_color: 0 },
        { floorY: 3.0,  topEntryY: 3.2, topExitY: 3.2, bottom_color: 0 },
      ],
    };
    const row = Array(7).fill(null).map((_, i) => i === 3 ? tile : null);
    return buildSimpleGrid([row]);
  }

  it('ship above gap (y=3.5) lands on upper slab (surfaceY=3.2)', () => {
    const { grid, numRows } = makeTwoSpanGrid();
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;
    // Ship at y=3.5 (above slab top), tol=0.5 — slab top 3.2 <= 3.5+0.5
    const result = supportSurface(grid, numRows, x, z, 3.5, 0.5);
    expect(result).not.toBeNull();
    expect(result.surfaceY).toBeCloseTo(3.2);
  });

  it('ship below gap (y=0.5) lands on lower road (surfaceY=0)', () => {
    const { grid, numRows } = makeTwoSpanGrid();
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;
    // Ship at y=0.5, tol=0.5 — slab top 3.2 > 0.5+0.5=1.0, so only lower road qualifies
    const result = supportSurface(grid, numRows, x, z, 0.5, 0.5);
    expect(result).not.toBeNull();
    expect(result.surfaceY).toBeCloseTo(0);
  });
});

// ─── P0.3: ceilingAbove ──────────────────────────────────────────────────────

describe('ceilingAbove — two-span column', () => {
  function makeTwoSpanGrid() {
    const tile = {
      val: 0,
      spans: [
        { floorY: -0.1, topEntryY: 0,   topExitY: 0,   bottom_color: 0 },
        { floorY: 3.0,  topEntryY: 3.2, topExitY: 3.2, bottom_color: 0 },
      ],
    };
    const row = Array(7).fill(null).map((_, i) => i === 3 ? tile : null);
    return buildSimpleGrid([row]);
  }

  it('from below the slab (y=0) returns slab floorY=3.0', () => {
    const { grid, numRows } = makeTwoSpanGrid();
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;
    expect(ceilingAbove(grid, numRows, x, z, 0)).toBeCloseTo(3.0);
  });

  it('from above the slab (y=4) returns Infinity', () => {
    const { grid, numRows } = makeTwoSpanGrid();
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;
    expect(ceilingAbove(grid, numRows, x, z, 4)).toBe(Infinity);
  });
});

// ─── P0.3: gap cell ──────────────────────────────────────────────────────────

describe('supportSurface — gap cell', () => {
  it('returns null for gap cell (nothing to stand on)', () => {
    const { grid, numRows } = buildSimpleGrid([
      [null, null, null, null, null, null, null],
    ]);
    const { minX, maxX, minZ, maxZ } = cellBounds(3, 0);
    const x = (minX + maxX) / 2;
    const z = (minZ + maxZ) / 2;
    const result = supportSurface(grid, numRows, x, z, 0, 0.5);
    expect(result).toBeNull();
  });
});

describe('supportSurface — footprint-aware grounding (obstacle corner)', () => {
  it('centre over an obstacle lane finds no support, but the ship footprint finds the adjacent road', () => {
    // lane 3 = road, lane 4 = full obstacle (top 2.0).
    const { grid, numRows } = buildSimpleGrid([
      [null, null, null, { val: 0 }, { val: 0, full: true }, null, null],
    ]);
    const b4 = cellBounds(4, 0);            // obstacle lane
    const x = b4.minX + 0.05;               // just inside lane 4, near the lane 3/4 edge
    const z = (b4.minZ + b4.maxZ) / 2;
    // Point sample (centre over the obstacle lane): obstacle top 2.0 > feet+tol => no ground.
    expect(supportSurface(grid, numRows, x, z, 0, 0.05)).toBeNull();
    // Footprint sample (half-width 0.22) straddles the lane-3 road => grounded at 0.
    const fp = supportSurface(grid, numRows, x, z, 0, 0.05, 0.22, 0.9);
    expect(fp).not.toBeNull();
    expect(fp.surfaceY).toBeCloseTo(0, 6);
  });
});

// ─── P0.3: out-of-track ───────────────────────────────────────────────────────

describe('columnsOverlappingBox — out of track', () => {
  it('returns empty array when box is entirely out of track', () => {
    const { grid, numRows } = buildSimpleGrid([
      [flatTile(), flatTile(), flatTile(), flatTile(), flatTile(), flatTile(), flatTile()],
    ]);
    const cells = columnsOverlappingBox(grid, numRows, { minX: 100, maxX: 102, minZ: -4, maxZ: 0 });
    expect(cells).toHaveLength(0);
  });
});

// ─── P0.2: ramp startY is entry top (at maxZ) ─────────────────────────────────

describe('ramp entry = maxZ edge', () => {
  it('spanTopAtZ at the entry (maxZ) of a ramp returns startY', () => {
    // up-ramp: startY=0 at entry, endY=2 at exit
    const tile = flatTile({ ramp: true, startY: 0, endY: 2 });
    const spans = legacyTileToSpans(tile);
    const bounds = cellBounds(3, 0);
    // maxZ = 0 (entry edge)
    expect(spanTopAtZ(spans[0], bounds, bounds.maxZ)).toBeCloseTo(0);
    // minZ = -4 (exit edge)
    expect(spanTopAtZ(spans[0], bounds, bounds.minZ)).toBeCloseTo(2);
  });
});

// ─── Tunnel ceiling: rideable roof (you jump ONTO tunnels) ───────────────────
// The roof's TOP is the drivable surface at baseY+archHeight (core gameplay), with
// the head-bonk underside ARCH_THICKNESS (0.15) below. A 0.4-tall ship at the 0.5u
// substep cap cannot tunnel a slab thicker than 0.1u, so the thin roof is safe.

describe('tunnel ceiling — rideable roof', () => {
  it('roof TOP is the rideable surface at archHeight (you can land on top of a tunnel)', () => {
    const spans = legacyTileToSpans(flatTile({ tunnel: true }));
    const archHeight = TILE_WIDTH / 2; // 1.0 single-lane default
    const roof = spans[1];
    expect(roof.topEntryY).toBeCloseTo(archHeight, 6);
    expect(roof.topExitY).toBeCloseTo(archHeight, 6);
  });

  it('roof slab is thin (0.15) but thicker than the 0.1u tunneling threshold', () => {
    const roof = legacyTileToSpans(flatTile({ tunnel: true }))[1];
    const thickness = roof.topEntryY - roof.floorY;
    expect(thickness).toBeCloseTo(0.15, 6);
    expect(thickness).toBeGreaterThan(0.1); // S(0.5) - H(0.4)
  });

  it('full tunnel roof is rideable at 2.0', () => {
    const roof = legacyTileToSpans(flatTile({ tunnel: true, full: true }))[1];
    expect(roof.topEntryY).toBeCloseTo(2.0, 6);
    expect(roof.floorY).toBeCloseTo(2.0 - 0.15, 6);
  });
});

// ─── Integration: buildColumnGrid on real level data ─────────────────────────

describe('buildColumnGrid on real standard_levels.json slice', () => {
  it('runs without throwing on the first level', () => {
    const raw = readFileSync(
      resolve(__dirname, '../data/standard_levels.json'), 'utf8'
    );
    const levels = JSON.parse(raw);
    const level0 = levels[0];
    expect(() => {
      const { grid, numRows } = buildColumnGrid(level0);
      expect(numRows).toBeGreaterThan(0);
      expect(grid).toHaveLength(numRows);
      expect(grid[0]).toHaveLength(ROAD_WIDTH_LANES);
    }).not.toThrow();
  });
});
