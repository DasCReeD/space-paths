/**
 * heightfield.js — Pure-logic multi-span column model for SkyRoads collision.
 *
 * NO three.js import: this module runs headless in Node (worldBuilder CLI) and
 * in the browser. All geometry/THREE concerns stay in levelLoader.js.
 *
 * See docs/collision-redesign-plan.md §1 for the full spec.
 */

// ─── Track constants (single source of truth) ───────────────────────────────
// These were previously duplicated in physics.js, levelLoader.js, editorRenderer.js.
// All three now re-export from here.

/** Number of drivable lanes. */
export const ROAD_WIDTH_LANES = 7;
/** World-unit width of one tile / lane. */
export const TILE_WIDTH = 2.0;
/** World-unit depth (Z-extent) of one tile / row. */
export const TILE_LENGTH = 4.0;
/** Total road width = TILE_WIDTH × ROAD_WIDTH_LANES. */
export const TOTAL_ROAD_WIDTH = TILE_WIDTH * ROAD_WIDTH_LANES;

// ─── Typedefs (JSDoc only — this is plain JS) ────────────────────────────────

/**
 * A solid span filling the full cell footprint (TILE_WIDTH × TILE_LENGTH).
 * The TOP face is drivable and may slope along Z. The floor (underside) is flat.
 *
 * @typedef {Object} Span
 * @property {number}  floorY          underside of the solid (local Y)
 * @property {number}  topEntryY       drivable top at entry edge (maxZ)
 * @property {number}  topExitY        drivable top at exit edge (minZ)
 * @property {boolean} isRamp          topEntryY !== topExitY
 * @property {?string} behavior        'boost'|'super_boost'|'sticky'|'slippery'|'burning'|'high_jump'|'refill'|null
 * @property {boolean} isWallObstacle  legacy full/half block
 * @property {number}  topColor        palette index (renderer hint)
 * @property {number}  bottomColor     palette index (renderer hint)
 */

/**
 * A grid cell holding a sorted stack of solid spans.
 *
 * @typedef {Object} Column
 * @property {Span[]}  spans  sorted ascending by topEntryY (may be empty)
 * @property {boolean} isGap  true => void cell; ship falls
 */

// ─── Behavior lookup (mirrors classifyTileBehavior in levelLoader.js) ────────

// Keyed by RAW JSON tile color (top_color for obstacles/ramps, bottom_color for
// flat road). The game computes behaviorColor = rawColor + 1 and looks THAT up in
// classifyTileBehavior() (levelLoader.js:380), whose table is keyed 3/9/10/11/12/13/14.
// This map folds the +1 in so callers pass the raw tile color directly. Keep in
// sync with classifyTileBehavior.
const COLOR_TO_BEHAVIOR = {
  2:  'sticky',       // behaviorColor 3
  8:  'slippery',     // behaviorColor 9
  9:  'refill',       // behaviorColor 10
  10: 'boost',        // behaviorColor 11
  11: 'super_boost',  // behaviorColor 12
  12: 'burning',      // behaviorColor 13
  13: 'high_jump',    // behaviorColor 14
};

/** Return the behavior string for a raw JSON tile color, or null. */
function behaviorForColor(rawColor) {
  return COLOR_TO_BEHAVIOR[rawColor] ?? null;
}

// ─── Span factory ────────────────────────────────────────────────────────────

function makeSpan(floorY, topEntryY, topExitY, {
  behavior = null,
  isWallObstacle = false,
  topColor = 0,
  bottomColor = 0,
  isSuperJump = false,
  xMin = null,
  xMax = null,
} = {}) {
  return {
    floorY,
    topEntryY,
    topExitY,
    isRamp: topEntryY !== topExitY,
    behavior,
    isWallObstacle,
    topColor,
    bottomColor,
    isSuperJump,
    // Optional partial-width: when set, the span only occupies world-X [xMin,xMax]
    // within its cell instead of the full cell footprint (used for thin tunnel side
    // walls). null => full cell width.
    xMin,
    xMax,
  };
}

/** Tunnel arch/roof height above baseY, from the tile's full/half flags. */
function tunnelArchHeight(tile) {
  if (tile.full && tile.half) return 3.0;
  if (tile.full) return 2.0;
  if (tile.half) return 1.0;
  return TILE_WIDTH / 2; // single-lane default
}

// ─── P0.2: Legacy → spans adapter ────────────────────────────────────────────

/**
 * Convert a legacy tile object to an array of Span structs, exactly per
 * docs/collision-redesign-plan.md §1.4.
 *
 * If tile.spans is present it is authoritative (native multi-span); each entry
 * is normalized into a full Span struct and returned.
 *
 * @param {Object} tile  A cell object from levelData.rows[r][c]
 * @returns {Span[]}
 */
export function legacyTileToSpans(tile) {
  // Native multi-span: authoritative if present.
  if (Array.isArray(tile.spans)) {
    return tile.spans.map(s => makeSpan(
      s.floorY ?? -0.1,
      s.topEntryY ?? 0,
      s.topExitY  ?? (s.topEntryY ?? 0),
      {
        behavior:       s.behavior ?? behaviorForColor(s.top_color ?? 0),
        isWallObstacle: s.isWallObstacle ?? false,
        topColor:       s.top_color    ?? 0,
        bottomColor:    s.bottom_color ?? 0,
      }
    ));
  }

  // Ramp tile
  if (tile.ramp) {
    const startY = tile.startY ?? 0;
    const endY   = tile.endY   ?? 0;
    return [makeSpan(
      Math.min(startY, endY, 0) - 2.0,
      startY,
      endY,
      {
        behavior:       behaviorForColor(tile.top_color ?? 0),
        isWallObstacle: false,
        topColor:       tile.top_color    ?? 0,
        bottomColor:    tile.bottom_color ?? 0,
      }
    )];
  }

  // Tunnel tile — base road span + ceiling slab
  if (tile.tunnel) {
    // Determine arch clearance height from full/half flags (same logic as levelLoader
    // for the test-env case; for single-lane tiles full/half drive the height).
    const archHeight = tunnelArchHeight(tile);
    const baseY = tile.startY ?? 0;
    // Roof is a RIDEABLE slab matching the original arch: drivable top at
    // baseY+archHeight (you jump onto tunnels here — core gameplay), underside
    // (head-bonk when jumping inside) ARCH_THICKNESS below it. The 0.4-tall ship
    // at the 0.5u substep cap cannot tunnel a slab thicker than 0.1u, so a thin
    // roof is safe (the earlier +6 hack was unnecessary and broke ride-on-top).
    const ARCH_THICKNESS = 0.15; // matches the original arch; > S(0.5)-H(0.4)=0.1 so untunnelable
    const roofTop = baseY + archHeight;
    const roofFloor = roofTop - ARCH_THICKNESS;
    const roadBehavior = behaviorForColor(tile.bottom_color ?? 0);
    return [
      makeSpan(-0.1, baseY, baseY, {
        behavior: roadBehavior,
        topColor: tile.top_color ?? 0, bottomColor: tile.bottom_color ?? 0,
      }),
      makeSpan(roofFloor, roofTop, roofTop, {
        isWallObstacle: true,
        topColor: tile.top_color ?? 0, bottomColor: tile.bottom_color ?? 0,
      }),
    ];
  }

  // Full / half / full+half blocks. These may sit on an ELEVATED surface: a block
  // on a platform is encoded `{full:true, startY:h, endY:h}` (and on a ramp row,
  // startY/endY differ). The block occupies [base, base+height] — MUST match the
  // renderer (levelLoader.computeTileGeometry uses baseY = tile.startY, height
  // 1/2/3). Ignoring startY put the block at [0,height], leaving a phantom HOLE at
  // the platform surface where the wall should be → the ship drove in and fell
  // through the track near the obstacle. (base = startY, matching the renderer.)
  if (tile.full || tile.half) {
    const base = tile.startY ?? 0;
    const height = (tile.full && tile.half) ? 3.0 : (tile.full ? 2.0 : 1.0);
    return [makeSpan(base, base + height, base + height, {
      behavior:       behaviorForColor(tile.top_color ?? 0),
      isWallObstacle: true,
      topColor:       tile.top_color    ?? 0,
      bottomColor:    tile.bottom_color ?? 0,
    })];
  }

  // Flat road (default). May be ELEVATED: a plain (ramp:false) tile can still carry
  // startY (e.g. a flat platform surface). The renderer draws it flat at baseY=startY
  // (levelLoader.computeTileGeometry, non-ramp branch ignores endY), so the drivable
  // surface must sit at startY here too — otherwise collision (at 0) and the visible
  // road (at startY) diverge and the ship floats or falls through. base=0 for ground.
  const base = tile.startY ?? 0;
  return [makeSpan(base - 0.1, base, base, {
    behavior:       behaviorForColor(tile.bottom_color ?? 0),
    isWallObstacle: false,
    topColor:       tile.top_color    ?? 0,
    bottomColor:    tile.bottom_color ?? 0,
    isSuperJump:    !!tile.isSuperJump,
  })];
}

// ─── P0.2: Grid builders ─────────────────────────────────────────────────────

/**
 * Return the world-space bounding box of cell (c, r).
 *
 * Coordinate conventions (§1.1):
 *   lane c center X = -6 + c*2   (for ROAD_WIDTH_LANES=7, TILE_WIDTH=2)
 *   row r  → zPos = -r*4         (entry edge = maxZ = zPos, exit = minZ = zPos - TILE_LENGTH)
 *
 * @param {number} c  lane index 0–6
 * @param {number} r  row index 0..numRows-1
 * @returns {{ minX:number, maxX:number, minZ:number, maxZ:number }}
 */
export function cellBounds(c, r) {
  const centerX = -((ROAD_WIDTH_LANES - 1) / 2) * TILE_WIDTH + c * TILE_WIDTH; // = -6 + c*2
  const zPos    = -r * TILE_LENGTH;          // entry edge (maxZ)
  return {
    minX: centerX - TILE_WIDTH  / 2,
    maxX: centerX + TILE_WIDTH  / 2,
    minZ: zPos    - TILE_LENGTH,             // exit edge
    maxZ: zPos,                              // entry edge
  };
}

/**
 * Convert world (x, z) to { c, r } cell indices.  Returns null if out of track.
 *
 * @param {number} x
 * @param {number} z
 * @returns {{ c:number, r:number } | null}
 */
export function worldToCell(x, z) {
  const halfRoad = TOTAL_ROAD_WIDTH / 2; // 7.0
  if (x < -halfRoad || x >= halfRoad) return null;
  if (z > 0) return null; // ahead of start

  const c = Math.floor((x + halfRoad) / TILE_WIDTH);
  const r = Math.floor(-z / TILE_LENGTH);

  if (c < 0 || c >= ROAD_WIDTH_LANES) return null;
  return { c, r };
}

/**
 * Build the full column grid from a parsed level data object.
 *
 * @param {Object} levelData  object with a `rows` array (levelData.rows[r][c] = tile|null)
 * @returns {{ grid: Column[][], numRows: number }}
 */
export function buildColumnGrid(levelData) {
  const rows = levelData.rows;
  const numRows = rows.length;

  const grid = rows.map(row => {
    // row may be null/undefined for an empty row
    const cols = [];
    for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
      const tile = row ? row[c] : null;
      if (tile == null) {
        cols.push({ spans: [], isGap: true });
      } else {
        const spans = legacyTileToSpans(tile);
        // Sort ascending by topEntryY
        spans.sort((a, b) => a.topEntryY - b.topEntryY);
        cols.push({ spans, isGap: false });
      }
    }
    return cols;
  });

  addTunnelStructure(grid, rows, numRows);
  return { grid, numRows };
}

/**
 * Reconcile tunnels with their MERGED multi-lane arch (the original built one arch
 * per contiguous run of tunnel cells, not per tile). For each run:
 *  - Correct the rideable roof height to be RUN-aware: full/half from the run's
 *    first tile, else radius = runWidth/2 (matches the original semi-cylinder). The
 *    per-tile adapter can't know the run width, so a wide plain tunnel would
 *    otherwise get a too-low roof.
 *  - Add thin, full-arch-height lateral WALL spans on the run's outer edges so the
 *    ship can't clip out the side. Walls are partial-width (xMin/xMax) so they
 *    occupy only the edge strip, not the drivable opening.
 */
function addTunnelStructure(grid, rows, numRows) {
  const WALL_THICKNESS = 0.15; // matches the original arch leg thickness
  const ARCH_THICKNESS = 0.15;
  for (let r = 0; r < numRows; r++) {
    const row = rows[r];
    if (!row) continue;
    let c = 0;
    while (c < ROAD_WIDTH_LANES) {
      if (!(row[c] && row[c].tunnel)) { c++; continue; }
      // Extend the contiguous tunnel run.
      let c1 = c;
      while (c1 + 1 < ROAD_WIDTH_LANES && row[c1 + 1] && row[c1 + 1].tunnel) c1++;

      const first = row[c];
      const baseY = first.startY ?? 0;
      const runWidth = (c1 - c + 1) * TILE_WIDTH;
      const archHeight = (first.full || first.half) ? tunnelArchHeight(first) : runWidth / 2;
      const roofTop = baseY + archHeight;

      // Correct each cell's roof span to the run-aware height.
      for (let cc = c; cc <= c1; cc++) {
        const roof = grid[r][cc].spans.find(s => s.isWallObstacle && s.xMin == null);
        if (roof) { roof.floorY = roofTop - ARCH_THICKNESS; roof.topEntryY = roofTop; roof.topExitY = roofTop; }
      }

      const wall = (lane, side) => {
        const b = cellBounds(lane, r);
        const xMin = side === 'left' ? b.minX : b.maxX - WALL_THICKNESS;
        const xMax = side === 'left' ? b.minX + WALL_THICKNESS : b.maxX;
        grid[r][lane].spans.push(makeSpan(baseY, roofTop, roofTop, { isWallObstacle: true, xMin, xMax }));
        grid[r][lane].spans.sort((a, b2) => a.topEntryY - b2.topEntryY);
      };
      wall(c, 'left');    // left leg on the leftmost tunnel cell
      wall(c1, 'right');  // right leg on the rightmost tunnel cell

      c = c1 + 1;
    }
  }
}

// ─── P0.3: Query functions ───────────────────────────────────────────────────

/**
 * Interpolate the top surface height of a span at world Z.
 *
 * Entry edge is maxZ (approached first), exit edge is minZ.
 * t=0 at maxZ (entry), t=1 at minZ (exit).
 * Clamps to the cell's Z extent.
 *
 * @param {Span} span
 * @param {{ minZ:number, maxZ:number }} bounds  cell bounds
 * @param {number} z  world Z
 * @returns {number}
 */
export function spanTopAtZ(span, bounds, z) {
  if (span.topEntryY === span.topExitY) return span.topEntryY;
  // t runs 0→1 from entry (maxZ) to exit (minZ)
  const t = Math.max(0, Math.min(1, (bounds.maxZ - z) / (bounds.maxZ - bounds.minZ)));
  return span.topEntryY + t * (span.topExitY - span.topEntryY);
}

/**
 * Return the solid top height at z (same as spanTopAtZ — top face is the landing surface).
 *
 * @param {Span} span
 * @param {{ minZ:number, maxZ:number }} bounds
 * @param {number} z
 * @returns {number}
 */
export function spanSolidTopAtZ(span, bounds, z) {
  return spanTopAtZ(span, bounds, z);
}

/**
 * Return all columns whose cells overlap the given XZ bounding box.
 *
 * @param {Column[][]} grid
 * @param {number} numRows
 * @param {{ minX:number, maxX:number, minZ:number, maxZ:number }} box
 * @returns {Array<{ c:number, r:number, column:Column, bounds:Object }>}
 */
export function columnsOverlappingBox(grid, numRows, box) {
  const results = [];
  // Determine cell range that overlaps box
  const halfRoad = TOTAL_ROAD_WIDTH / 2;

  const cMin = Math.max(0, Math.floor((box.minX + halfRoad) / TILE_WIDTH));
  const cMax = Math.min(ROAD_WIDTH_LANES - 1, Math.floor((box.maxX + halfRoad - 1e-9) / TILE_WIDTH));

  // z is negative: row index r = floor(-z / TILE_LENGTH)
  // box.maxZ is the less-negative (closer to 0) edge
  const rMin = Math.max(0, Math.floor(-box.maxZ / TILE_LENGTH));
  const rMax = Math.min(numRows - 1, Math.floor((-box.minZ - 1e-9) / TILE_LENGTH));

  for (let r = rMin; r <= rMax; r++) {
    for (let c = cMin; c <= cMax; c++) {
      const column = grid[r]?.[c];
      if (!column) continue;
      const bounds = cellBounds(c, r);
      results.push({ c, r, column, bounds });
    }
  }
  return results;
}

/**
 * Find the highest span the ship can stand on at (x, z) whose top is at or below y + tol.
 *
 * Searches all columns overlapping a point (box degenerates to a point in XZ).
 *
 * @param {Column[][]} grid
 * @param {number} numRows
 * @param {number} x
 * @param {number} z
 * @param {number} y        ship bottom Y
 * @param {number} tol      penetration tolerance (how far inside a surface we can be)
 * @returns {{ surfaceY:number, span:Span, slope:number } | null}
 */
export function supportSurface(grid, numRows, x, z, y, tol, halfW = 0, halfL = 0) {
  // Sample the ship's FOOTPRINT (halfW × halfL), not just a point. A ship clipping
  // an obstacle's corner can have its centre over the obstacle's lane (no standable
  // surface) while its other half rests on the road — point-sampling the centre would
  // wrongly find no ground and drop it through. halfW=halfL=0 => point (ramp-slope use).
  const box = { minX: x - halfW, maxX: x + halfW, minZ: z - halfL, maxZ: z + halfL };
  const cells = columnsOverlappingBox(grid, numRows, box);

  let best = null;

  for (const { column, bounds } of cells) {
    if (column.isGap) continue;
    for (const span of column.spans) {
      if (span.xMin != null && (span.xMax < box.minX || span.xMin > box.maxX)) continue; // partial-width (e.g. tunnel wall) not under the footprint
      const top = spanTopAtZ(span, bounds, z);
      if (top > y + tol) continue; // span top is above ship — can't land here
      if (best === null || top > best.surfaceY) {
        const slope = Math.atan2(span.topExitY - span.topEntryY, TILE_LENGTH);
        best = { surfaceY: top, span, slope };
      }
    }
  }

  return best;
}

/**
 * Return the lowest span floor that is strictly above y (a head-bonk ceiling).
 *
 * @param {Column[][]} grid
 * @param {number} numRows
 * @param {number} x
 * @param {number} z
 * @param {number} y
 * @returns {number}  Infinity if no ceiling overhead
 */
export function ceilingAbove(grid, numRows, x, z, y) {
  const pointBox = { minX: x, maxX: x, minZ: z, maxZ: z };
  const cells = columnsOverlappingBox(grid, numRows, pointBox);

  let lowest = Infinity;

  for (const { column } of cells) {
    if (column.isGap) continue;
    for (const span of column.spans) {
      if (span.xMin != null && (x < span.xMin || x > span.xMax)) continue; // partial-width not above this point
      if (span.floorY > y && span.floorY < lowest) {
        lowest = span.floorY;
      }
    }
  }

  return lowest;
}
