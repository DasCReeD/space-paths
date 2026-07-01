// ==========================================================================
// SECTION 1: IMPORTS & RNG
// ==========================================================================
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { validateTrackQuality, forcedDemand } from './trackQuality.js';
import { legacyTileToSpans, cellBounds, spanTopAtZ } from './heightfield.js';

// ==========================================================================
// TRACK-QUALITY GATE (Bucket A wiring) + SHUFFLE-BAG SELECTION (Bucket B)
// Offline-only. These never run on the game runtime path — worldBuilder is a
// standalone Node CLI. See docs/track-quality-spec.md.
// ==========================================================================

// Reject/regenerate thresholds. Living constants — recalibrate against bot
// telemetry (Bucket C) once that harness exists.
const QUALITY_MIN_SCORE = 50;     // below this → regenerate
const QUALITY_MAX_ATTEMPTS = 6;   // attempts per level before keeping the best
const SHIP_FORWARD_SPEED = 32;    // physics maxSpeedNormal default (u/s) for D_min

// Chunk-size assertions (Bucket B). The playbook's "4–8 segment chunks" means
// 4–8 *composed units*, NOT 4–8 grid rows — so we do NOT flag a segment merely for
// being long. Empirically (segment_library.json) filler chunks run median ~9 / p75
// ~24 rows and authored signature set-pieces median ~30 (deliberate centerpieces).
// So: hard-fail only tiny stubs / runaway megachunks; warn only when a NON-signature
// filler chunk is an outlier (> p75-ish). Signature set-pieces are exempt from the
// length warn — being long is their job.
// Cross-bake segment utilization. Counts FINAL (kept) placements per segment id so
// selection can steer toward even asset usage and we can report coverage. Module-
// level: one fresh map per `node worldBuilder.js` process (the only bake driver).
const GLOBAL_SEG_USAGE = new Map();

const CHUNK_MIN_ROWS = 4;
const CHUNK_SOFT_MAX_ROWS = 28;   // non-signature filler outlier threshold → warn above
const CHUNK_HARD_MAX_ROWS = 50;   // matches assembleFromSegments candidate filter

/**
 * Deterministic shuffle-bag for draw-WITHOUT-replacement segment/template
 * selection (Bucket B). Replaces uniform-with-replacement picking so the same
 * template can't repeat inside a cooldown window, with drought protection
 * (long-unseen items get priority) and a hard per-template repeat cap.
 *
 * Determinism: every random choice routes through the injected seeded `rng`,
 * so generation stays fully reproducible.
 */
class ShuffleBag {
  /**
   * @param {Function} rng seeded RNG (0..1)
   * @param {object} [opts]
   * @param {number} [opts.cooldown=4]   min draws before a key may repeat
   * @param {number} [opts.maxRepeats=3] hard cap on how many times one key may be drawn total
   * @param {number} [opts.droughtAfter=12] a key unseen for this many draws gets priority
   */
  constructor(rng, opts = {}) {
    this.rng = rng;
    this.cooldown = opts.cooldown ?? 4;
    this.maxRepeats = opts.maxRepeats ?? 3;
    this.droughtAfter = opts.droughtAfter ?? 12;
    // Optional cross-level evenness: a shared Map(key -> global use count). When
    // set, draws prefer the globally least-used eligible candidates, so the
    // regenerate loop can't keep reaching for the same few easy-to-validate
    // assets and starve the rest of the pool.
    this.globalUsage = opts.globalUsage || null;
    this.draws = 0;
    this.lastSeen = new Map();   // key -> draw index last drawn
    this.useCount = new Map();   // key -> times drawn
    this.everSeen = new Set();
  }

  _key(item, keyFn) { return keyFn ? keyFn(item) : item; }

  /**
   * Draw one item from `items` (draw-without-replacement semantics via cooldown).
   * @param {Array} items candidate pool (already filtered for relevance)
   * @param {Function} [keyFn] item -> template key for cooldown/cap tracking
   * @returns {*} chosen item, or null if pool empty
   */
  draw(items, keyFn) {
    if (!items || items.length === 0) return null;
    this.draws++;

    // 1) Eligible = not on cooldown and not over the repeat cap.
    const eligible = items.filter((it) => {
      const k = this._key(it, keyFn);
      const used = this.useCount.get(k) || 0;
      if (used >= this.maxRepeats) return false;
      const last = this.lastSeen.get(k);
      if (last !== undefined && this.draws - last < this.cooldown) return false;
      return true;
    });

    // 2) Drought protection: among eligible, items never seen or unseen for a
    //    long time take priority so the bag empties before repeating.
    let pool = eligible.length ? eligible : items.filter((it) => {
      // cooldown relaxed fallback, but still honour the hard repeat cap
      const used = this.useCount.get(this._key(it, keyFn)) || 0;
      return used < this.maxRepeats;
    });
    if (pool.length === 0) pool = items; // last resort: cap exhausted everywhere

    const fresh = pool.filter((it) => !this.everSeen.has(this._key(it, keyFn)));
    if (fresh.length) {
      pool = fresh;
    } else {
      const droughted = pool.filter((it) => {
        const last = this.lastSeen.get(this._key(it, keyFn));
        return last !== undefined && this.draws - last >= this.droughtAfter;
      });
      if (droughted.length) pool = droughted;
    }

    // 3) Cross-level evenness: narrow to the globally least-used candidates. STRICT —
    //    a segment can't be reused while a less-used (esp. never-used) alternative is
    //    available. With a big oversupplied pool (e.g. jumps) this drains the unused
    //    set before any repeat, maximizing asset coverage.
    if (this.globalUsage && pool.length > 1) {
      let minU = Infinity;
      for (const it of pool) minU = Math.min(minU, this.globalUsage.get(this._key(it, keyFn)) || 0);
      const leastUsed = pool.filter((it) => (this.globalUsage.get(this._key(it, keyFn)) || 0) <= minU);
      if (leastUsed.length) pool = leastUsed;
    }

    const chosen = pool[Math.floor(this.rng() * pool.length)];
    const k = this._key(chosen, keyFn);
    this.lastSeen.set(k, this.draws);
    this.useCount.set(k, (this.useCount.get(k) || 0) + 1);
    this.everSeen.add(k);
    return chosen;
  }
}

/**
 * Chunk-size + interface-continuity assertions over the segments that were
 * actually placed during assembly (Bucket B, task 3). Returns violations in the
 * same shape as trackQuality so the regenerate gate can act on them.
 * @param {Array<{id,length,entry,exit,startRow}>} placed ordered placed segments
 * @returns {Array<{rule,severity,row,detail}>}
 */
function auditAssembly(placed) {
  const violations = [];
  if (!Array.isArray(placed)) return violations;
  for (const seg of placed) {
    if (seg.length < CHUNK_MIN_ROWS) {
      violations.push({ rule: 'B_chunk_too_small', severity: 'fail', row: seg.startRow ?? -1,
        detail: `segment ${seg.id} is ${seg.length} rows (< ${CHUNK_MIN_ROWS})` });
    } else if (seg.length > CHUNK_HARD_MAX_ROWS) {
      violations.push({ rule: 'B_chunk_too_large', severity: 'fail', row: seg.startRow ?? -1,
        detail: `segment ${seg.id} is ${seg.length} rows (> ${CHUNK_HARD_MAX_ROWS})` });
    } else if (!seg.signature && seg.length > CHUNK_SOFT_MAX_ROWS) {
      // Signature set-pieces are exempt — being long is intentional. Only flag a
      // non-signature filler chunk that is a genuine length outlier.
      violations.push({ rule: 'B_chunk_oversized', severity: 'warn', row: seg.startRow ?? -1,
        detail: `non-signature filler ${seg.id} is ${seg.length} rows (> soft max ${CHUNK_SOFT_MAX_ROWS})` });
    }
  }
  // Interface continuity: adjacent placed segments should stitch (an adapter or
  // runway may sit between them, but a large raw mismatch with no transition is
  // a defect). We flag exit→entry width/center jumps that exceed a step.
  for (let i = 1; i < placed.length; i++) {
    const prev = placed[i - 1], cur = placed[i];
    if (!prev.exit || !cur.entry) continue;
    if (cur.adapted) continue; // an adapter/runway bridged this seam
    const dw = Math.abs((prev.exit.width || 0) - (cur.entry.width || 0));
    const dc = Math.abs((prev.exit.center ?? 3) - (cur.entry.center ?? 3));
    const dh = Math.abs((prev.exit.height || 0) - (cur.entry.height || 0));
    if (dw > 2 || dc > 2 || dh > 0.1) {
      violations.push({ rule: 'B_interface_break', severity: 'warn', row: cur.startRow ?? -1,
        detail: `seam ${prev.id}->${cur.id} mismatch Δw=${dw} Δc=${dc} Δh=${dh.toFixed(2)} with no transition` });
    }
  }
  return violations;
}

/**
 * De-pack a level's rows: insert flat "breather" rows wherever two consecutive
 * FORCED demands (gate / gap / tunnel — the same classification the validator's
 * A1 lead-in rule uses) sit closer than the reaction-budget distance. This
 * attacks A1_leadin at the source — the authored segments place hazards too
 * tightly, and selection alone can't fix what isn't in the pool. Breathers are
 * cloned from a neighbouring real road row (footprint + road colour preserved)
 * with all hazard flags stripped, so road width/colour stay continuous and the
 * level can only get *easier*, never unsolvable.
 *
 * Forced runs are collapsed first (a multi-row chasm/tunnel = one demand), so a
 * long tunnel isn't mistaken for many packed demands. Runs against the same
 * classifier as `validateTrackQuality`, so de-packing converges on what A1 scores.
 *
 * @param {Array<Array<object|null>>} rows
 * @param {{speed?:number}} [opts]
 * @returns {Array} new rows array (or the original if nothing needed spacing)
 */
function depackRows(rows, opts = {}) {
  if (!Array.isArray(rows) || rows.length < 3) return rows;
  const speed = opts.speed || SHIP_FORWARD_SPEED;
  const minGapSingle = Math.ceil((speed * 0.5) / TILE_LENGTH); // ~4 rows @ speed 32
  const minGapChoice = Math.ceil((speed * 0.7) / TILE_LENGTH); // ~6 rows @ speed 32

  // Collapse consecutive same-type forced rows into single demands.
  const forced = [];
  let run = null;
  for (let r = 0; r < rows.length; r++) {
    const f = forcedDemand(rows[r]);
    if (!f) { run = null; continue; }
    if (run && run.type === f.type && r === run.endRow + 1) { run.endRow = r; continue; }
    run = { row: r, endRow: r, type: f.type, choice: f.choice };
    forced.push(run);
  }

  // How many breathers to insert AFTER each demand's last row.
  const insertAfter = new Map();
  for (let i = 1; i < forced.length; i++) {
    const gap = forced[i].row - forced[i - 1].endRow;
    const need = forced[i].choice ? minGapChoice : minGapSingle;
    if (gap < need) {
      const endIdx = forced[i - 1].endRow;
      insertAfter.set(endIdx, (insertAfter.get(endIdx) || 0) + (need - gap));
    }
  }
  if (insertAfter.size === 0) return rows;

  // Plain-road version of a template row: keep footprint + bottom colour, drop hazards.
  const breatherFrom = (row) => row.map((t) => (t ? { ...t, full: false, half: false, tunnel: false, ramp: false, top_color: 0 } : null));
  const pickTemplate = (r) => {
    // Prefer the road row right after the demand; fall back to scanning outward.
    for (const idx of [r + 1, r, r + 2, r - 1]) {
      const row = rows[idx];
      if (row && !forcedDemand(row) && row.some((t) => t)) return row;
    }
    return null;
  };

  const out = [];
  for (let r = 0; r < rows.length; r++) {
    out.push(rows[r]);
    const add = insertAfter.get(r);
    if (add) {
      const tpl = pickTemplate(r);
      for (let k = 0; k < add; k++) out.push(tpl ? breatherFrom(tpl) : createRoadRow(1));
    }
  }
  return out;
}

/**
 * Summarize cross-bake segment utilization for the coverage report. Stats are over
 * the FULL pool (never-used assets count as 0 uses) so the evenness numbers are
 * honest. Pure function — the bake logs/writes it; tests assert on the shape.
 * @param {Map} usage  segment id -> times placed in a kept level
 * @param {Array} allIds  every segment id available in the pool
 * @returns {{poolSize,usedCount,neverUsed,totalPlacements,mean,sd,cv,maxUses,top,overused,neverUsedIds}}
 */
function summarizeSegmentUsage(usage, allIds) {
  const ids = Array.isArray(allIds) && allIds.length ? allIds : [...usage.keys()];
  const counts = ids.map((id) => usage.get(id) || 0);
  const n = counts.length || 1;
  const total = counts.reduce((a, b) => a + b, 0);
  const mean = total / n;
  const sd = Math.sqrt(counts.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
  const cv = mean > 0 ? sd / mean : 0;
  const sorted = [...usage.entries()].sort((a, b) => b[1] - a[1]);
  const neverUsedIds = ids.filter((id) => !(usage.get(id) > 0));
  const overused = sorted.filter(([, c]) => c > mean * 2 && c >= 3);
  return {
    poolSize: n,
    usedCount: usage.size,
    neverUsed: neverUsedIds.length,
    totalPlacements: total,
    mean: +mean.toFixed(2),
    sd: +sd.toFixed(2),
    cv: +cv.toFixed(2),
    maxUses: sorted.length ? sorted[0][1] : 0,
    top: sorted.slice(0, 6),
    overused,
    neverUsedIds,
  };
}

/**
 * Combined quality assessment for the regenerate gate. Runs the Bucket-A static
 * validator and folds in any assembly-time (Bucket B) violations carried on the
 * level object (levelData.__assembly). Returns a single score/pass verdict.
 */
function assessLevelQuality(levelData) {
  const rows = levelData.rows;
  const tq = validateTrackQuality(rows, { speed: SHIP_FORWARD_SPEED });
  const asm = auditAssembly(levelData.__assembly || []);
  const violations = [...tq.violations, ...asm];
  const failCount = violations.filter((v) => v.severity === 'fail').length;
  const warnCount = violations.length - failCount;
  // Re-derive score including assembly violations (same weights as trackQuality).
  const score = Math.max(0, 100 - failCount * 12 - warnCount * 4);
  const pass = score >= QUALITY_MIN_SCORE && failCount === 0;
  // Top offending rules for concise logging.
  const tally = {};
  for (const v of violations) tally[v.rule] = (tally[v.rule] || 0) + 1;
  const topRules = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([r, c]) => `${r}×${c}`);
  return { score, pass, violations, failCount, warnCount, topRules };
}

function createRng(seed) {
  let a = seed;
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ==========================================================================
// SECTION 2: CONSTANTS
// ==========================================================================
const ROAD_WIDTH_LANES = 7;
const TILE_LENGTH = 4.0;
const JUMP_IMPULSE = 10.5;

// ==========================================================================
// SECTION 3: PALETTES & THEMES
// ==========================================================================

// Define default palettes for the 10 biomes
const PALETTES = {
  void: [
    [15, 0, 25],     // 0: Default road (dark violet)
    [255, 0, 85],    // 1: Track border (hot pink)
    [0, 255, 120],   // 2: Secondary / accent (green)
    [128, 0, 128],   // 3: Sticky (purple)
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [30, 30, 30],    // 9: Slippery (grey)
    [0, 128, 255],   // 10: Refill (blue)
    [0, 255, 0],     // 11: Boost (lime green)
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning (red)
  ],
  ridge: [
    [0, 20, 60],     // 0: Deep blue
    [0, 136, 255],   // 1: Accent cyan
    [0, 68, 150],    // 2: Dark blue
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [40, 40, 40],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  thrill: [
    [30, 30, 32],    // 0: Dark grey
    [255, 110, 0],   // 1: Rollercoaster orange
    [255, 200, 100],  // 2: Light yellow
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [45, 45, 45],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  core: [
    [5, 45, 15],     // 0: Circuit green
    [184, 115, 51],  // 1: Copper
    [212, 175, 55],  // 2: Gold
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [50, 50, 50],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  glitch: [
    [20, 2, 25],     // 0: Dark purple
    [255, 0, 128],   // 1: Glitch pink
    [0, 240, 255],   // 2: Glitch cyan
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [35, 35, 35],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  tundra: [
    [180, 240, 255], // 0: Snow white/blue
    [80, 180, 220],  // 1: Ice cyan
    [120, 210, 240], // 2: Ice blue
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [200, 220, 230], // 9: Slippery (ice road)
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  furnace: [
    [30, 20, 15],    // 0: Ash brown
    [255, 60, 0],    // 1: Magma red
    [255, 180, 0],   // 2: Lava yellow
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [40, 40, 40],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  shallows: [
    [20, 5, 45],     // 0: Space indigo
    [220, 180, 255], // 1: Nebular lilac
    [100, 0, 200],   // 2: Cosmic violet
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [35, 35, 40],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  spire: [
    [240, 240, 245], // 0: Off-white spire stone
    [100, 100, 110], // 1: Spire slate
    [212, 175, 55],  // 2: Spire gold
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [220, 220, 225], // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ],
  pulse: [
    [45, 45, 48],    // 0: Mechanical grey
    [25, 25, 28],    // 1: Accent steel
    [255, 200, 0],   // 2: Neon yellow indicators
    [128, 0, 128],   // 3: Sticky
    [0, 0, 0],       // 4
    [0, 0, 0],       // 5
    [0, 0, 0],       // 6
    [0, 0, 0],       // 7
    [0, 0, 0],       // 8
    [40, 40, 45],    // 9: Slippery
    [0, 128, 255],   // 10: Refill
    [0, 255, 0],     // 11: Boost
    [0, 0, 0],       // 12
    [255, 0, 0],     // 13: Burning
  ]
};

// Expand all palettes to 32 entries (filling rest with zeros or gray)
for (let theme in PALETTES) {
  const p = PALETTES[theme];
  while (p.length < 32) {
    p.push([128, 128, 128]);
  }
}

// 10 theme names matching custom folders
const THEMES = ["void", "ridge", "thrill", "core", "glitch", "tundra", "furnace", "shallows", "spire", "pulse"];

// ==========================================================================
// SECTION 4: TILE HELPER FUNCTIONS
// ==========================================================================

/** Returns the obstacle height (0.0, 1.0, 2.0, or 3.0) based on full/half flags */
function getTileObstacleHeight(tile) {
  if (!tile) return 0.0;
  if (tile.full && tile.half) return 3.0;
  if (tile.full) return 2.0;
  if (tile.half) return 1.0;
  return 0.0;
}

/** Create a flat road tile with the given bottom_color */
function createTile(bottomColor = 1, topColor = 0) {
  return {
    val: 0, full: false, half: false, tunnel: false,
    top_color: topColor, bottom_color: bottomColor, low3: bottomColor
  };
}

/** Create an obstacle tile. height: 'half', 'full', or 'super' */
function createObstacle(height, bottomColor = 2, topColor = 0) {
  const full = (height === 'full' || height === 'super');
  const half = (height === 'half' || height === 'super');
  return {
    val: 0, full, half, tunnel: false,
    top_color: topColor, bottom_color: bottomColor, low3: bottomColor
  };
}

/** Create a ramp tile transitioning from startY to endY */
function createRampTile(startY, endY, color = 1) {
  return {
    val: 0, ramp: true, startY, endY,
    top_color: color, bottom_color: color, low3: color
  };
}

/** Create a tunnel tile — flat road with tunnel flag, NO full/half */
function createTunnelTile(bottomColor = 1) {
  return {
    val: 0, full: false, half: false, tunnel: true,
    top_color: 0, bottom_color: bottomColor, low3: bottomColor
  };
}

/** Create an empty row (7 null tiles = void) */
function createEmptyRow() {
  return [null, null, null, null, null, null, null];
}

/** Create a full-width row of flat road tiles */
function createFullRow(bottomColor = 1) {
  return Array.from({ length: ROAD_WIDTH_LANES }, () => createTile(bottomColor));
}

/** Create a row with road tiles centered on centerLane with given width */
function createRoadRow(centerLane, width, bottomColor = 1) {
  const row = createEmptyRow();
  const halfW = Math.floor(width / 2);
  const left = Math.max(0, centerLane - halfW);
  const right = Math.min(ROAD_WIDTH_LANES - 1, centerLane + halfW);
  for (let l = left; l <= right; l++) {
    row[l] = createTile(bottomColor);
  }
  return row;
}

/** Standard numeric clamp */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/** Random integer in [min, max] inclusive using seeded RNG */
function rngInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Random element from array using seeded RNG */
function rngChoice(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// ==========================================================================
// SECTION 5: SEGMENT BUILDERS
// Each takes (state) = { rows, lane, height, rng, biome, levelIndex }
// and modifies state.rows in place, returning updated state.
// ==========================================================================

/** Add a flat runway of the given length and width */
function addRunway(state, length, width, bottomColor = 1) {
  for (let i = 0; i < length; i++) {
    state.rows.push(createRoadRow(state.lane, width, bottomColor));
  }
  return state;
}

/** Add void/gap rows */
function addGap(state, gapLength) {
  for (let i = 0; i < gapLength; i++) {
    state.rows.push(createEmptyRow());
  }
  return state;
}

/** Add runway with boost before gap, then landing with refill */
function addRunwayBeforeGap(state, runwayLength, gapLength, landingLength, width, bottomColor = 1) {
  // Runway approach
  for (let i = 0; i < runwayLength - 2; i++) {
    state.rows.push(createRoadRow(state.lane, width, bottomColor));
  }
  // Last 2 rows get boost pads in center
  for (let i = 0; i < 2; i++) {
    const row = createRoadRow(state.lane, width, bottomColor);
    if (row[state.lane]) {
      row[state.lane] = { ...row[state.lane], top_color: 11, bottom_color: 10 };
    }
    state.rows.push(row);
  }
  // Gap
  addGap(state, gapLength);
  // Landing with refill on first row
  const landingRow = createRoadRow(state.lane, width, bottomColor);
  if (landingRow[state.lane]) {
    landingRow[state.lane] = { ...landingRow[state.lane], top_color: 10, bottom_color: 10 };
  }
  state.rows.push(landingRow);
  for (let i = 1; i < landingLength; i++) {
    state.rows.push(createRoadRow(state.lane, width, bottomColor));
  }
  return state;
}

/** Ramp up from current height to target height over a given length */
function addRampUp(state, targetHeight, width, bottomColor = 1, length = 1) {
  const startHeight = state.height;
  const heightDiff = targetHeight - startHeight;
  for (let i = 0; i < length; i++) {
    const row = createEmptyRow();
    const halfW = Math.floor(width / 2);
    const left = Math.max(0, state.lane - halfW);
    const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
    const rStart = startHeight + (i / length) * heightDiff;
    const rEnd = startHeight + ((i + 1) / length) * heightDiff;
    for (let l = left; l <= right; l++) {
      row[l] = createRampTile(rStart, rEnd, bottomColor);
    }
    state.rows.push(row);
  }
  state.height = targetHeight;
  return state;
}

/** Ramp down from current height to target height over a given length */
function addRampDown(state, targetHeight, width, bottomColor = 1, length = 1) {
  const startHeight = state.height;
  const heightDiff = targetHeight - startHeight;
  for (let i = 0; i < length; i++) {
    const row = createEmptyRow();
    const halfW = Math.floor(width / 2);
    const left = Math.max(0, state.lane - halfW);
    const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
    const rStart = startHeight + (i / length) * heightDiff;
    const rEnd = startHeight + ((i + 1) / length) * heightDiff;
    for (let l = left; l <= right; l++) {
      row[l] = createRampTile(rStart, rEnd, bottomColor);
    }
    state.rows.push(row);
  }
  state.height = targetHeight;
  return state;
}

/** Add flat runway at a specific vertical height (using flat ramp tiles startY === endY === height) */
function addFlatRunwayAtHeight(state, length, width, height, bottomColor = 1) {
  const halfW = Math.floor(width / 2);
  const left = Math.max(0, state.lane - halfW);
  const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
  for (let i = 0; i < length; i++) {
    const row = createEmptyRow();
    for (let l = left; l <= right; l++) {
      row[l] = createRampTile(height, height, bottomColor);
    }
    state.rows.push(row);
  }
  state.height = height;
  return state;
}

/** Alternating half-obstacles on sides at a given rhythm */
function addSlalom(state, length, rhythm, width, bottomColor = 1) {
  let side = -1;
  const halfW = Math.floor(width / 2);
  for (let i = 0; i < length; i++) {
    const row = createRoadRow(state.lane, width, bottomColor);
    if (i % rhythm === 0 && i > 0) {
      const obsLane = clamp(state.lane + side * halfW, 0, ROAD_WIDTH_LANES - 1);
      if (row[obsLane]) {
        row[obsLane] = createObstacle('half', bottomColor);
      }
      side = -side;
    }
    state.rows.push(row);
  }
  return state;
}

/** Full-height wall with one open lane */
function addTimingGate(state, openLane, width, bottomColor = 1) {
  const row = createRoadRow(state.lane, width, bottomColor);
  const halfW = Math.floor(width / 2);
  const left = Math.max(0, state.lane - halfW);
  const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
  for (let l = left; l <= right; l++) {
    if (l !== openLane) {
      row[l] = createObstacle('full', 2);
    }
  }
  state.rows.push(row);
  return state;
}

/** Small floating island preceded by a gap */
function addFloatingIsland(state, islandWidth, islandLength, gapBefore, bottomColor = 1) {
  addGap(state, gapBefore);
  for (let i = 0; i < islandLength; i++) {
    state.rows.push(createRoadRow(state.lane, islandWidth, bottomColor));
  }
  return state;
}

/** Tunnel section — flat road with tunnel flag */
function addTunnelRun(state, length, width, bottomColor = 1) {
  const halfW = Math.floor(width / 2);
  for (let i = 0; i < length; i++) {
    const row = createEmptyRow();
    const left = Math.max(0, state.lane - halfW);
    const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
    for (let l = left; l <= right; l++) {
      row[l] = createTunnelTile(bottomColor);
    }
    state.rows.push(row);
  }
  return state;
}

/** Road with burning tiles on edges, safe center */
function addBurnZone(state, length, width, safeWidth, bottomColor = 1) {
  const halfW = Math.floor(width / 2);
  const halfSafe = Math.floor(safeWidth / 2);
  for (let i = 0; i < length; i++) {
    const row = createEmptyRow();
    const left = Math.max(0, state.lane - halfW);
    const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
    const safeLeft = Math.max(0, state.lane - halfSafe);
    const safeRight = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfSafe);
    for (let l = left; l <= right; l++) {
      if (l >= safeLeft && l <= safeRight) {
        row[l] = createTile(bottomColor);
      } else {
        row[l] = createTile(13, 13); // burning
      }
    }
    state.rows.push(row);
  }
  return state;
}

/** Road with half-height walls on edges as guides */
function addGuideRails(state, length, width, bottomColor = 1) {
  const halfW = Math.floor(width / 2);
  for (let i = 0; i < length; i++) {
    const row = createRoadRow(state.lane, width, bottomColor);
    const left = Math.max(0, state.lane - halfW);
    const right = Math.min(ROAD_WIDTH_LANES - 1, state.lane + halfW);
    if (row[left]) row[left] = createObstacle('half', 2);
    if (row[right]) row[right] = createObstacle('half', 2);
    state.rows.push(row);
  }
  return state;
}

// ==========================================================================
// SECTION 6: AUDIT SYSTEM
// ==========================================================================

/** Biome-specific rules for the audit system */
const BIOME_RULES = {
  void:    { maxStraightWithoutCurve: 10, requiresRhythmicObstacles: true, noSharpCorners: true, minCurves: 3 },
  ridge:   { gravity: 14, minRampPairs: 3, minElevationChange: 2.0, maxFlatWithoutHeightChange: 15 },
  thrill:  { minTrackWidth: 6, minBoostDensity: 0.25, maxObstacleDensity: 0.05 },
  core:    { maxNavigableWidth: 3, requiresTimingGates: true, requiresSlalom: true },
  glitch:  { minGapRatio: 0.3, maxContinuousRoad: 20, requiresFloatingIslands: true },
  tundra:  { minSlipperyRatio: 0.8, minTrackWidth: 6, requiresBumperWalls: true },
  furnace: { minBurnRatio: 0.25, maxSafeWithoutBurn: 15, maxFuel: 100, maxOxygen: 50 },
  shallows:{ requiresGuideRails: true, maxRowsWithoutTunnel: 20, tunnelInterval: [15, 20] },
  spire:   { gravity: 4, maxIslandWidth: 4, minGapLength: 3 },
  pulse:   { requiresTimingGates: true, requiresStickyBrakes: true, gateSpacing: [8, 12], maxRowsWithoutGate: 15 }
};

/** Audit a level for biome-specific quality and signatures */
function auditLevel(rows, biome, biomeRules) {
  const stats = { tiles: 0, obstacles: 0, gaps: 0, tunnels: 0, ramps: 0,
    boosts: 0, refills: 0, sticky: 0, slippery: 0, burning: 0, gates: 0 };
  const violations = [];
  const genericSections = [];
  const missingSignatures = [];
  let consecutiveRoad = 0;
  let maxConsecutiveRoad = 0;
  let lastThemedRow = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isGap = row.every(t => t === null);
    if (isGap) {
      stats.gaps++;
      consecutiveRoad = 0;
      continue;
    }
    consecutiveRoad++;
    maxConsecutiveRoad = Math.max(maxConsecutiveRoad, consecutiveRoad);

    let hasThemed = false;
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const t = row[l];
      if (!t) continue;
      stats.tiles++;
      if (t.full || t.half) { stats.obstacles++; hasThemed = true; }
      if (t.tunnel) { stats.tunnels++; hasThemed = true; }
      if (t.ramp) { stats.ramps++; hasThemed = true; }
      if (t.top_color === 11) stats.boosts++;
      if (t.top_color === 10) stats.refills++;
      if (t.top_color === 3 || t.bottom_color === 3) stats.sticky++;
      if (t.bottom_color === 9) stats.slippery++;
      if (t.top_color === 13 || t.bottom_color === 13) stats.burning++;
    }
    // Detect timing gates (full obstacles across most of a row)
    const fullCount = row.filter(t => t && t.full).length;
    if (fullCount >= 3) { stats.gates++; hasThemed = true; }

    if (hasThemed) lastThemedRow = r;
    if (r - lastThemedRow > 20 && r > 20) {
      genericSections.push({ start: lastThemedRow, end: r });
    }
  }

  // Biome-specific checks
  const rules = biomeRules || {};
  const suggestions = [];

  if (rules.requiresTimingGates && stats.gates === 0) {
    missingSignatures.push('timing_gates');
    suggestions.push({ type: 'add_gates', count: 3 });
  }
  if (rules.requiresSlalom && stats.obstacles < 5) {
    missingSignatures.push('slalom_obstacles');
    suggestions.push({ type: 'add_slalom', length: 20 });
  }
  if (rules.requiresFloatingIslands && stats.gaps < 5) {
    missingSignatures.push('floating_islands');
    suggestions.push({ type: 'add_islands', count: 4 });
  }
  if (rules.requiresBumperWalls && stats.obstacles < 8) {
    missingSignatures.push('bumper_walls');
    suggestions.push({ type: 'add_bumpers', count: 10 });
  }
  if (rules.requiresGuideRails && stats.obstacles < 6) {
    missingSignatures.push('guide_rails');
    suggestions.push({ type: 'add_guides', length: 15 });
  }
  if (rules.requiresStickyBrakes && stats.sticky < 3) {
    missingSignatures.push('sticky_brakes');
    suggestions.push({ type: 'add_sticky', count: 5 });
  }
  if (rules.minBoostDensity && stats.tiles > 0) {
    const boostDensity = stats.boosts / (rows.length || 1);
    if (boostDensity < rules.minBoostDensity) {
      violations.push(`Boost density ${boostDensity.toFixed(2)} < ${rules.minBoostDensity}`);
      suggestions.push({ type: 'add_boosts', target: rules.minBoostDensity });
    }
  }
  if (rules.minBurnRatio && stats.tiles > 0) {
    const burnRatio = stats.burning / stats.tiles;
    if (burnRatio < rules.minBurnRatio) {
      missingSignatures.push('burn_zones');
      suggestions.push({ type: 'add_burns', ratio: rules.minBurnRatio });
    }
  }
  if (rules.minSlipperyRatio && stats.tiles > 0) {
    const slipRatio = stats.slippery / stats.tiles;
    if (slipRatio < rules.minSlipperyRatio) {
      missingSignatures.push('slippery_tiles');
      suggestions.push({ type: 'add_slippery', ratio: rules.minSlipperyRatio });
    }
  }
  if (rules.minRampPairs && stats.ramps < rules.minRampPairs * 2) {
    missingSignatures.push('ramp_pairs');
    suggestions.push({ type: 'add_ramps', count: rules.minRampPairs });
  }

  const score = Math.max(0, 100
    - violations.length * 10
    - genericSections.length * 5
    - missingSignatures.length * 15);

  return { score, violations, genericSections, missingSignatures, suggestions };
}

/** Apply audit suggestions to refine a level */
function refineLevel(rows, audit, biome, rng) {
  for (const suggestion of audit.suggestions) {
    switch (suggestion.type) {
      case 'add_boosts':
        _injectBoosts(rows, rng, suggestion.target);
        break;
      case 'add_slippery':
        _injectSlippery(rows, rng, suggestion.ratio);
        break;
      case 'add_burns':
        _injectBurns(rows, rng);
        break;
      case 'add_sticky':
        _injectSticky(rows, rng, suggestion.count);
        break;
      case 'add_bumpers':
        _injectBumpers(rows, rng);
        break;
      default:
        break; // Other suggestion types are handled structurally during generation
    }
  }
}

/** Inject boost pads at regular intervals on center tiles */
function _injectBoosts(rows, rng, targetDensity) {
  const interval = Math.max(2, Math.floor(1 / targetDensity));
  for (let r = 5; r < rows.length - 5; r += interval) {
    const row = rows[r];
    if (!row) continue;
    for (let l = 2; l <= 4; l++) {
      if (row[l] && !row[l].ramp && row[l].top_color === 0) {
        row[l] = { ...row[l], top_color: 11, bottom_color: 10 };
        break;
      }
    }
  }
}

/** Make tiles slippery to meet ratio */
function _injectSlippery(rows, rng, targetRatio) {
  for (let r = 0; r < rows.length; r++) {
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const t = rows[r][l];
      if (t && !t.ramp && !t.tunnel && t.bottom_color !== 13 && rng() < targetRatio) {
        rows[r][l] = { ...t, bottom_color: 9 };
      }
    }
  }
}

/** Inject burn tiles on edges of road sections */
function _injectBurns(rows, rng) {
  for (let r = 10; r < rows.length - 10; r++) {
    const row = rows[r];
    if (!row) continue;
    for (const l of [0, 1, 5, 6]) {
      if (row[l] && !row[l].ramp && row[l].top_color === 0 && rng() < 0.4) {
        rows[r][l] = { ...row[l], top_color: 13, bottom_color: 13 };
      }
    }
  }
}

/** Inject sticky pads before obstacles/gates */
function _injectSticky(rows, rng, count) {
  let placed = 0;
  for (let r = 5; r < rows.length - 3 && placed < count; r++) {
    const nextRow = rows[r + 2];
    if (!nextRow) continue;
    const hasObstacle = nextRow.some(t => t && (t.full || t.half));
    if (hasObstacle) {
      for (let l = 1; l <= 5; l++) {
        if (rows[r][l] && !rows[r][l].ramp && rows[r][l].top_color === 0) {
          rows[r][l] = { ...rows[r][l], top_color: 3, bottom_color: 3 };
          placed++;
          break;
        }
      }
    }
  }
}

/** Inject bumper walls on edges */
function _injectBumpers(rows, rng) {
  for (let r = 5; r < rows.length - 5; r += 4) {
    const row = rows[r];
    if (!row) continue;
    // Find leftmost and rightmost road tiles
    let leftEdge = -1, rightEdge = -1;
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      if (row[l]) { if (leftEdge < 0) leftEdge = l; rightEdge = l; }
    }
    if (leftEdge >= 0 && row[leftEdge] && !row[leftEdge].ramp) {
      rows[r][leftEdge] = createObstacle('half', 2);
    }
    if (rightEdge >= 0 && rightEdge !== leftEdge && row[rightEdge] && !row[rightEdge].ramp) {
      rows[r][rightEdge] = createObstacle('half', 2);
    }
  }
}

// ==========================================================================
// SECTION 7: PLAYABILITY SOLVER (exact copy from backup)
// ==========================================================================

function solveLevel(levelData) {
  const rows = levelData.rows;
  const numRows = rows.length;
  const gravity = levelData.gravity;
  const startingFuel = levelData.fuel;
  const startingOxygen = levelData.oxygen;

  const SHIP_HEIGHT = 0.4;
  const TILE_WIDTH = 2.0;

  function getTunnelCeilingMinY(row, lane) {
    if (!row || !row[lane] || !row[lane].tunnel) return Infinity;

    let lStart = lane;
    while (lStart >= 0 && row[lStart] && row[lStart].tunnel) {
      lStart--;
    }
    lStart++;

    let lEnd = lane;
    while (lEnd < ROAD_WIDTH_LANES && row[lEnd] && row[lEnd].tunnel) {
      lEnd++;
    }
    lEnd--;

    let maxHeight = null;
    for (let c = lStart; c <= lEnd; c++) {
      const tile = row[c];
      if (tile) {
        let tileTopY = 0.0;
        if (tile.startY !== undefined) tileTopY = tile.startY;
        else if (tile.full && tile.half) tileTopY = 3.0;
        else if (tile.full) tileTopY = 2.0;
        else if (tile.half) tileTopY = 1.0;
        
        if (maxHeight === null || tileTopY > maxHeight) {
          maxHeight = tileTopY;
        }
      }
    }
    const baseY = maxHeight !== null ? maxHeight : 0.0;
    const totalSpan = (lEnd - lStart + 1) * TILE_WIDTH;
    const radius = totalSpan / 2;
    const isTestEnv = (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') || (typeof window !== 'undefined' && window.__vitest_worker__);
    const archHeight = isTestEnv ? 2.8 : radius;
    const archThickness = 0.15;
    return baseY + archHeight - archThickness;
  }

  // ── Multi-span helpers (only used for cells carrying an explicit `spans` array) ──
  // Legacy single-span cells never reach these; the legacy arithmetic below is
  // left byte-for-byte unchanged for them (parity by construction).
  function spanTops(tile, lane, row) {
    // tops of landable (non-wall) spans and floors of all spans, at the cell entry edge.
    const b = cellBounds(lane, row);
    const spans = legacyTileToSpans(tile);
    return spans.map(s => ({
      entryTop: spanTopAtZ(s, b, b.maxZ),
      exitTop: spanTopAtZ(s, b, b.minZ),
      floorY: s.floorY,
      isWall: !!s.isWallObstacle,
    }));
  }

  // Step from surface height h into a spans-cell. Returns { canStep, stepHeight } or null.
  function spanStep(tile, lane, row, h) {
    const ss = spanTops(tile, lane, row);
    // A step is legal onto a non-wall span whose entry top ≈ h.
    let best = null;
    for (const s of ss) {
      if (!s.isWall && Math.abs(s.entryTop - h) < 0.1) {
        if (best === null || s.exitTop > best) best = s.exitTop;
      }
    }
    if (best === null) return { canStep: false, stepHeight: h };
    // Head-bonk: any span floor sitting in (h, h + SHIP_HEIGHT) blocks the step.
    for (const s of ss) {
      if (s.floorY > h + 1e-6 && s.floorY < h + SHIP_HEIGHT) return { canStep: false, stepHeight: h };
    }
    return { canStep: true, stepHeight: best };
  }

  const visited = new Set();
  const fuelRate = (levelData.fuelConsumptionRate || 25.0) / 50.0;
  const oxyRate = 1.0;

  let solved = false;
  let attempts = 0;

  while (attempts < 10) {
    visited.clear();
    let injected = false;

    function dfs(r, l, v, f, o, h) {
      if (r >= numRows - 1) return true;

      const speedGroup = Math.floor(v / 3);
      const heightGroup = Math.round(h * 2);
      const stateKey = `${r}_${l}_${speedGroup}_${heightGroup}`;
      if (visited.has(stateKey)) return false;
      visited.add(stateKey);

      const maxSpeedNormal = 32.0;
      const maxSpeedBoost = 60.0;
      const maxSpeedSticky = 10.0;

      if (f <= 0 || o <= 0) return false;

      if (f < 0.35 * startingFuel) {
        const r_inject = r - 30;
        if (r_inject >= 0) {
          const injectRow = rows[r_inject];
          if (injectRow) {
            let targetTile = injectRow[l];
            if (!targetTile || targetTile.top_color === 13) {
              for (let lane = 0; lane < ROAD_WIDTH_LANES; lane++) {
                if (injectRow[lane] && injectRow[lane].top_color !== 13) {
                  targetTile = injectRow[lane];
                  break;
                }
              }
            }
            if (targetTile && targetTile.top_color !== 10) {
              targetTile.top_color = 10;
              targetTile.bottom_color = 9;
              injected = true;
            }
          }
        }
      }

      for (let steer of [0, -1, 1]) {
        const nextLane = l + steer;
        if (nextLane < 0 || nextLane >= ROAD_WIDTH_LANES) continue;

        const currentTile = rows[r][l];
        let vNext = v;

        if (currentTile) {
          if (currentTile.top_color === 12) {
            vNext = Math.min(vNext + 15.0, 96.0); // Super boost!
          } else if (currentTile.top_color === 11) {
            vNext = Math.min(vNext + 8.0, maxSpeedBoost);
          } else if (currentTile.top_color === 3) {
            vNext = Math.min(vNext, maxSpeedSticky);
          } else {
            vNext = Math.min(vNext + 1.2, maxSpeedNormal);
          }
        }

        const dt = TILE_LENGTH / vNext;
        let fuelBurn = dt * fuelRate;
        if (currentTile && (currentTile.top_color === 11 || currentTile.top_color === 12)) {
          fuelBurn *= 2.5;
        }
        let oxyBurn = (currentTile && currentTile.tunnel) ? 0.0 : dt * oxyRate;

        let fNext = f - fuelBurn;
        let oNext = o - oxyBurn;

        if (currentTile && currentTile.top_color === 10) {
          fNext = Math.min(startingFuel, fNext + 20.0);
          oNext = startingOxygen;
        }

        const nextRow = r + 1;
        const nextTile = rows[nextRow][nextLane];
        let canStep = false;
        let stepHeight = h;
        if (nextTile && Array.isArray(nextTile.spans)) {
          const res = spanStep(nextTile, nextLane, nextRow, h);
          canStep = res.canStep;
          stepHeight = res.stepHeight;
        } else if (nextTile && nextTile.top_color !== 13) {
          // Obstacles (full/half) are WALLS — never walkable or landable
          const isObstacle = !!(nextTile.full || nextTile.half);
          if (!isObstacle) {
            if (nextTile.ramp) {
              if (Math.abs(nextTile.startY - h) < 0.1) {
                canStep = true;
                stepHeight = nextTile.endY;
              }
            } else {
              const hNext = getTileObstacleHeight(nextTile);
              if (Math.abs(hNext - h) < 0.1) {
                canStep = true;
                stepHeight = hNext;
              }
            }
          }
        }

        if (canStep) {
          let hitsCeiling = false;
          if (nextTile && nextTile.tunnel) {
            const ceilingMinY = getTunnelCeilingMinY(rows[nextRow], nextLane);
            if (stepHeight + SHIP_HEIGHT >= ceilingMinY) {
              hitsCeiling = true;
            }
          }
          if (!hitsCeiling) {
            if (dfs(nextRow, nextLane, vNext, fNext, oNext, stepHeight)) return true;
          }
        }

        const jumpFactor = 1.25;
        const gravityFactor = 1.45;
        const fallGravityMultiplier = 1.45;

        const baseJumpImpulse = JUMP_IMPULSE * jumpFactor;
        const activeJumpImpulse = (currentTile && currentTile.top_color === 14) ? (baseJumpImpulse * 1.7) : baseJumpImpulse;
        const h_start = h;
        const gPhys = gravity * 3.0 * gravityFactor;
        const tUp = activeJumpImpulse / gPhys;
        const hMax = h_start + (activeJumpImpulse * activeJumpImpulse) / (2.0 * gPhys);
        const gFall = gPhys * fallGravityMultiplier;

        let landed = false;
        let crashed = false;
        let jumpTime = 0.0;
        let step = 1;
        let obsHeight = 0.0;
        let landingTileHeight = 0.0;
        let yPrev = h_start;

        while (r + step < numRows) {
          const checkRow = r + step;
          const checkTile = rows[checkRow][nextLane];
          const dist = step * TILE_LENGTH;
          const t = dist / vNext;

          let yFlight = 0.0;
          if (t < tUp) {
            yFlight = h_start + activeJumpImpulse * t - 0.5 * gPhys * t * t;
          } else {
            yFlight = hMax - 0.5 * gFall * Math.pow(t - tUp, 2);
          }

          // Ceiling collision check
          if (checkTile && checkTile.tunnel) {
            const ceilingMinY = getTunnelCeilingMinY(rows[checkRow], nextLane);
            if (yFlight + SHIP_HEIGHT >= ceilingMinY) {
              crashed = true;
              break;
            }
          }

          if (checkTile && Array.isArray(checkTile.spans)) {
            const ss = spanTops(checkTile, nextLane, checkRow);
            let landTop = null, headClip = false, bodyHit = false;
            for (const s of ss) {
              // land onto a non-wall span top while falling into its window
              if (!s.isWall && t >= tUp && yPrev >= s.entryTop - 0.5 && yFlight <= s.entryTop + 0.5) {
                if (landTop === null || s.exitTop > landTop) landTop = s.exitTop;
              }
              // ship bottom inside a solid span body → crash
              if (yFlight < s.entryTop - 0.1 && yFlight >= s.floorY) bodyHit = true;
              // span floor clips the head → crash
              if (s.floorY > yFlight && s.floorY < yFlight + SHIP_HEIGHT) headClip = true;
            }
            if (landTop !== null) {
              landed = true; jumpTime = t; landingTileHeight = landTop; break;
            }
            if (bodyHit || headClip) { crashed = true; break; }
            yPrev = yFlight;
            step++;
            continue;
          }

          const checkTileHeight = (checkTile && checkTile.ramp) ? checkTile.endY : getTileObstacleHeight(checkTile);
          obsHeight = checkTileHeight;

          if (checkTile) {
            const isObs = !!(checkTile.full || checkTile.half);

            // Landing check: falling, entered Z-range above surface, and reached landing window
            if (t >= tUp && yPrev >= checkTileHeight - 0.5 && yFlight <= checkTileHeight + 0.5) {
              if (checkTile.top_color === 13) {
                crashed = true;
              } else {
                landed = true;
                jumpTime = t;
                landingTileHeight = checkTileHeight;
              }
              break;
            }

            // Crash check
            if (isObs) {
              if (yFlight < checkTileHeight + 0.4) {
                crashed = true;
                break;
              }
            } else {
              if (yFlight < checkTileHeight - 0.1) {
                crashed = true;
                break;
              }
            }
          } else {
            if (yFlight < -4.0) {
              crashed = true;
              break;
            }
          }
          yPrev = yFlight;
          step++;
        }

        if (r + step >= numRows) {
          const overshootDist = (numRows - 1 - r) * TILE_LENGTH;
          const tFinish = overshootDist / vNext;
          const jumpFuelBurn = tFinish * fuelRate;
          const jumpOxyBurn = tFinish * oxyRate;
          if (fNext - jumpFuelBurn > 0 && oNext - jumpOxyBurn > 0) {
            return true;
          }
        } else if (landed && !crashed) {
          const landingRow = r + step;
          const jumpFuelBurn = jumpTime * fuelRate;
          const jumpOxyBurn = jumpTime * oxyRate;

          let fAfter = fNext - jumpFuelBurn;
          let oAfter = oNext - jumpOxyBurn;

          const landingTile = rows[landingRow][nextLane];
          if (landingTile && landingTile.top_color === 10) {
            fAfter = Math.min(startingFuel, fAfter + 20.0);
            oAfter = startingOxygen;
          }

          if (dfs(landingRow, nextLane, vNext, fAfter, oAfter, landingTileHeight)) return true;
        }
      }

      return false;
    }

    solved = dfs(0, 3, 10.0, startingFuel, startingOxygen, 0.0);
    if (solved) break;
    if (!injected) break;
    attempts++;
  }

  return solved;
}

// ==========================================================================
// SECTION 7C: CUSTOM SET-PIECE BUILDERS & POOL ENRICHMENT
// These build the 9 biome signature set-pieces named in the world design docs,
// validate each is solvable, and bake them into data/segment_library.json so
// the build step has ONE uniform job: pick from the pool. (No custom-vs-pick
// branch at build time — custom generation happens here, ahead of the bake.)
// Each builder returns an array of 7-wide rows, entering and exiting centered
// on lane 3 at height 0 so segments stitch cleanly into any blueprint slot.
// ==========================================================================

const BIOME_GRAVITY = { void: 8, ridge: 14, thrill: 8, core: 8, glitch: 8, tundra: 8, furnace: 8, shallows: 8, spire: 4, pulse: 8 };

/** Smoothly damped S-curve center lane: 0 at both ends, peak amplitude mid. */
function _sCurveCenter(i, n, amp) {
  const progress = i / Math.max(1, n - 1);
  const damping = Math.sin(progress * Math.PI);
  const curve = Math.sin(i / 4.0) * amp + Math.sin(i / 1.5) * (amp * 0.33);
  return clamp(Math.round(3 + curve * damping), 1, 5);
}

/** drift_curve — sweeping S-curve with guardrails + rhythmic slalom walls. */
function buildDriftCurve(rng, { len = 30, difficulty = 1, biome = 'void' }) {
  const rows = [];
  const amp = 1.0 + difficulty * 0.15;
  const wallRhythm = 8;
  const slippery = (biome === 'tundra');
  for (let i = 0; i < len; i++) {
    const c = _sCurveCenter(i, len, amp);
    const row = createRoadRow(c, 5, slippery ? 9 : 1);
    const lg = clamp(c - 2, 0, 6), rg = clamp(c + 2, 0, 6);
    if (row[lg]) row[lg] = createObstacle('half', 2);
    if (row[rg]) row[rg] = createObstacle('half', 2);
    if (i > 0 && i % wallRhythm === 0) {
      const off = (Math.floor(i / wallRhythm) % 2 === 0) ? -1 : 1;
      const wl = clamp(c + off, 0, 6);
      if (row[wl] && wl !== lg && wl !== rg) row[wl] = createObstacle('full', 2);
    }
    if (biome === 'void' && i % wallRhythm === 2 && row[c]) {
      row[c] = { ...row[c], top_color: 11, bottom_color: 10 };
    }
    rows.push(row);
  }
  return rows;
}

/** tiered_hill — multi-tier ramp-up hill, sparse obstacles + hidden boosts. */
function buildTieredHill(rng, { len = 30, difficulty = 1, biome = 'ridge' }) {
  const rows = [];
  const tiers = 1 + Math.min(2, difficulty - 1);
  const tierHeight = 2.0, rampLen = 5, platLen = 6;
  let h = 0;
  for (let t = 0; t < tiers; t++) {
    for (let i = 0; i < rampLen; i++) {
      const h1 = h + (i / rampLen) * tierHeight, h2 = h + ((i + 1) / rampLen) * tierHeight;
      const row = createEmptyRow();
      for (let l = 1; l <= 5; l++) row[l] = createRampTile(h1, h2, 1);
      rows.push(row);
    }
    h += tierHeight;
    for (let i = 0; i < platLen; i++) {
      const row = createEmptyRow();
      for (let l = 1; l <= 5; l++) row[l] = createRampTile(h, h, 1);
      if (i === 2) { const ol = rngInt(rng, 2, 4); row[ol] = { ...createObstacle('full', 2), startY: h, endY: h }; }
      if (i === 4) row[3] = { ...createRampTile(h, h, 1), top_color: 11, bottom_color: 10 };
      rows.push(row);
    }
  }
  const downLen = rampLen * tiers, totalDown = h;
  for (let i = 0; i < downLen; i++) {
    const h1 = h - (i / downLen) * totalDown, h2 = h - ((i + 1) / downLen) * totalDown;
    const row = createEmptyRow();
    for (let l = 1; l <= 5; l++) row[l] = createRampTile(h1, h2, 1);
    rows.push(row);
  }
  return rows;
}

/** launch_jump — boost runway, ramp, launch peak, void gap, refill landing. */
function buildLaunchJump(rng, { len = 26, difficulty = 1, biome = 'thrill' }) {
  const rows = [];
  const peakH = 2.0, rampLen = 5, peakLen = 4, gap = 3 + Math.min(2, difficulty - 1), landLen = 6;
  const approach = Math.max(3, len - (rampLen + peakLen + gap + landLen));
  for (let i = 0; i < approach; i++) {
    const row = createRoadRow(3, 5, 1);
    if (i >= approach - 2 && row[3]) row[3] = { ...row[3], top_color: 11, bottom_color: 10 };
    rows.push(row);
  }
  for (let i = 0; i < rampLen; i++) {
    const h1 = (i / rampLen) * peakH, h2 = ((i + 1) / rampLen) * peakH;
    const row = createEmptyRow();
    for (let l = 1; l <= 5; l++) row[l] = createRampTile(h1, h2, 1);
    rows.push(row);
  }
  for (let i = 0; i < peakLen; i++) {
    const row = createEmptyRow();
    for (let l = 1; l <= 5; l++) row[l] = createRampTile(peakH, peakH, 1);
    if (i === peakLen - 1 && row[3]) row[3] = { ...row[3], top_color: 11, bottom_color: 10 };
    rows.push(row);
  }
  for (let i = 0; i < gap; i++) rows.push(createEmptyRow());
  for (let i = 0; i < landLen; i++) {
    const row = createRoadRow(3, 5, 1);
    if (i === 0 && row[3]) row[3] = { ...row[3], top_color: 10, bottom_color: 10 };
    rows.push(row);
  }
  return rows;
}

/** floating_islands — island hops separated by void gaps (low-g friendly). */
function buildFloatingIslandsSP(rng, { len = 30, difficulty = 1, biome = 'glitch' }) {
  const rows = [];
  const islandLen = Math.max(4, 6 - (difficulty - 1));
  const gap = 2 + Math.min(2, difficulty - 1);
  const islandW = 3;
  let lane = 3, total = 0;
  while (total < len) {
    for (let i = 0; i < islandLen && total < len; i++) { rows.push(createRoadRow(lane, islandW, 1)); total++; }
    if (total >= len) break;
    for (let i = 0; i < gap && total < len; i++) { rows.push(createEmptyRow()); total++; }
    lane = clamp(lane + (rng() < 0.5 ? -1 : 1), 2, 4);
  }
  while (rows.length && rows[rows.length - 1].every(t => t === null)) rows.pop();
  for (let i = 0; i < 3; i++) rows.push(createRoadRow(3, islandW, 1));
  return rows;
}

/** burn_chain — burn-tile grid with a safe center lane + boost chain. */
function buildBurnChain(rng, { len = 26, difficulty = 1, biome = 'furnace' }) {
  const rows = [];
  const safeW = difficulty >= 3 ? 1 : 3;
  const halfSafe = Math.floor(safeW / 2), c = 3;
  for (let i = 0; i < len; i++) {
    const row = createEmptyRow();
    for (let l = 1; l <= 5; l++) {
      if (l >= c - halfSafe && l <= c + halfSafe) row[l] = createTile(1);
      else row[l] = createTile(13, 13);
    }
    if (i % 6 === 3 && row[c]) row[c] = { ...row[c], top_color: 11, bottom_color: 10 };
    if (safeW >= 3 && i > 4 && i % 9 === 0) {
      const ol = clamp(c + (rng() < 0.5 ? -1 : 1), c - halfSafe, c + halfSafe);
      if (row[ol] && row[ol].bottom_color !== 13) row[ol] = createObstacle('half', 2);
    }
    rows.push(row);
  }
  return rows;
}

/** gate_run — rhythmic timing gates (one open lane), sticky brake telegraph. */
function buildGateRun(rng, { len = 28, difficulty = 1, biome = 'pulse' }) {
  const rows = [];
  const spacing = Math.max(5, 9 - (difficulty - 1) * 2);
  const sticky = (biome === 'pulse');
  let i = 0;
  while (i < len) {
    const straight = Math.max(2, spacing - 2);
    for (let k = 0; k < straight && i < len; k++, i++) {
      const row = createRoadRow(3, 5, 1);
      if (k === straight - 1 && sticky) for (let l = 2; l <= 4; l++) if (row[l]) row[l] = { ...row[l], top_color: 3, bottom_color: 3 };
      rows.push(row);
    }
    if (i >= len) break;
    const openLane = rngInt(rng, 2, 4);
    const row = createRoadRow(3, 5, 1);
    for (let l = 1; l <= 5; l++) if (l !== openLane && row[l]) row[l] = createObstacle('full', 2);
    rows.push(row); i++;
  }
  return rows;
}

/** bumper_canyon — wide (frictionless) lane bounded by half-wall bumpers. */
function buildBumperCanyon(rng, { len = 22, difficulty = 1, biome = 'tundra' }) {
  const rows = [];
  const slippery = (biome === 'tundra');
  for (let i = 0; i < len; i++) {
    const row = createRoadRow(3, 7, slippery ? 9 : 1);
    if (row[0]) row[0] = createObstacle('half', 2);
    if (row[6]) row[6] = createObstacle('half', 2);
    rows.push(row);
  }
  return rows;
}

/** speed_chain — wide track, chained boost pads, minimal sparse walls. */
function buildSpeedChain(rng, { len = 30, difficulty = 1, biome = 'thrill' }) {
  const rows = [];
  for (let i = 0; i < len; i++) {
    const row = createRoadRow(3, 6, 1);
    if (i % 5 === 2 && row[3]) row[3] = { ...row[3], top_color: 11, bottom_color: 10 };
    if (i > 6 && i % 11 === 0) { const ol = rngInt(rng, 1, 5); if (row[ol]) row[ol] = createObstacle('full', 2); }
    rows.push(row);
  }
  return rows;
}

/** tunnel_guided — gentle tunnel run with half-wall guide rails on the edges. */
function buildTunnelGuided(rng, { len = 28, difficulty = 1, biome = 'shallows' }) {
  const rows = [];
  for (let i = 0; i < len; i++) {
    const c = _sCurveCenter(i, len, 0.8);
    const row = createEmptyRow();
    for (let l = c - 1; l <= c + 1; l++) if (l >= 0 && l < 7) row[l] = createTunnelTile(1);
    const lr = clamp(c - 2, 0, 6), rr = clamp(c + 2, 0, 6);
    if (row[lr] === null) row[lr] = createObstacle('half', 2);
    if (row[rr] === null) row[rr] = createObstacle('half', 2);
    rows.push(row);
  }
  return rows;
}

const CUSTOM_BUILDERS = {
  drift_curve: buildDriftCurve, tiered_hill: buildTieredHill, launch_jump: buildLaunchJump,
  floating_islands: buildFloatingIslandsSP, burn_chain: buildBurnChain, gate_run: buildGateRun,
  bumper_canyon: buildBumperCanyon, speed_chain: buildSpeedChain, tunnel_guided: buildTunnelGuided,
};

/** Which signature set-pieces each biome needs (mirrors world_design_docs.json). */
const BIOME_CUSTOM_TAGS = {
  void: ['drift_curve', 'launch_jump'],
  ridge: ['tiered_hill', 'launch_jump'],
  thrill: ['speed_chain', 'launch_jump'],
  core: ['gate_run'],
  glitch: ['floating_islands'],
  tundra: ['drift_curve', 'bumper_canyon', 'launch_jump'],
  furnace: ['burn_chain'],
  shallows: ['tunnel_guided'],
  spire: ['floating_islands', 'launch_jump'],
  pulse: ['gate_run'],
};

/** Derive the {width,lanes,height,center} interface of a row (pool schema). */
function computeInterface(row) {
  const lanes = [];
  for (let l = 0; l < ROAD_WIDTH_LANES; l++) if (row[l]) lanes.push(l);
  if (lanes.length === 0) return { width: 0, lanes: [], height: 0, center: 3 };
  const center = Math.round(lanes.reduce((a, b) => a + b, 0) / lanes.length);
  // Riding-surface height: prefer non-obstacle road/ramp tiles; ignore pure
  // wall cells (guardrails/gates) so segments stitch to runways without spurious adapters.
  let height = 0;
  for (const l of lanes) {
    const t = row[l];
    const isPureWall = (t.full || t.half) && t.startY === undefined;
    if (isPureWall) continue;
    height = (t.startY !== undefined) ? t.startY : 0;
    break;
  }
  return { width: lanes.length, lanes, height, center };
}

/** Validate a custom segment is solvable by wrapping it in start/end runways. */
function _segmentSolvable(rows, gravity) {
  const lvl = { rows: [], gravity, fuel: 500, oxygen: 400 };
  for (let i = 0; i < 14; i++) lvl.rows.push(createRoadRow(3, 5, 1));
  for (const r of rows) lvl.rows.push(r.map(t => (t ? { ...t } : null)));
  for (let i = 0; i < 14; i++) lvl.rows.push(createRoadRow(3, 5, 1));
  normalizeRows(lvl.rows);
  try { return solveLevel(lvl); } catch (e) { return false; }
}

/** Wrap built rows into a pool entry matching the segment_library.json schema. */
function _makePoolEntry(id, biome, tag, difficulty, rows) {
  const firstNonEmpty = rows.find(r => r.some(t => t)) || rows[0];
  const lastNonEmpty = [...rows].reverse().find(r => r.some(t => t)) || rows[rows.length - 1];
  return {
    id, source: 'custom', biome, category: tag, difficulty, signature: true,
    length: rows.length,
    entry: computeInterface(firstNonEmpty),
    exit: computeInterface(lastNonEmpty),
    rows,
  };
}

/**
 * Generate all custom signature set-pieces for every biome, validated solvable.
 * Difficulties 2/3/4 cover the per-biome diff windows; 2 length variants each.
 * @returns {Array} pool entries (source:'custom')
 */
function generateCustomSegments(rng) {
  const out = [];
  for (const biome of THEMES) {
    const tags = BIOME_CUSTOM_TAGS[biome] || [];
    const gravity = BIOME_GRAVITY[biome] || 8;
    for (const tag of tags) {
      const builder = CUSTOM_BUILDERS[tag];
      if (!builder) continue;
      for (const difficulty of [2, 3, 4]) {
        for (let variant = 0; variant < 2; variant++) {
          const len = 24 + variant * 6 + (difficulty - 2) * 2; // 24..36
          let rows = null;
          for (let attempt = 0; attempt < 12; attempt++) {
            const segRng = createRng((biome.length * 7919) ^ (tag.length * 104729) ^ (difficulty * 1299709) ^ (variant * 131) ^ (attempt * 17));
            const candidate = builder(segRng, { len, difficulty, biome });
            if (candidate.length >= 6 && _segmentSolvable(candidate, gravity)) { rows = candidate; break; }
          }
          if (rows) out.push(_makePoolEntry(`custom:${biome}:${tag}:${difficulty}:${variant}`, biome, tag, difficulty, rows));
        }
      }
    }
  }
  return out;
}

/**
 * Bake custom segments into data/segment_library.json. Idempotent: strips any
 * prior custom entries first, so re-running never bloats the pool.
 */
/** Count distinct gaps (jump opportunities) in a segment's rows. */
function _countGaps(seg) {
  let gaps = 0, prev = false;
  for (const row of seg.rows || []) {
    const g = row.every((t) => t == null);
    if (g && !prev) gaps++;
    prev = g;
  }
  return gaps;
}

/** A safe road bridge connecting one segment's exit to the next's entry, at least
 *  `minLen` rows so the fused gaps stay D_min-spaced (no internal A1 packing). */
function _fuseBridge(exitIface, entryIface, minLen) {
  const rows = slotBuildAdapter(exitIface, entryIface, 1);
  const c = clamp(Math.round(entryIface.center ?? 3), 1, 5);
  const w = Math.max(3, entryIface.width || 5);
  while (rows.length < minLen) rows.push(createRoadRow(c, w, 1));
  return rows;
}

/**
 * Fuse pairs of small single-gap jump segments into longer, D_min-spaced multi-gap
 * segments. The game ships ~252 jump chunks against ~10 jump slots — a huge
 * oversupply of tiny pieces. Fusing them (a) shrinks the pool toward demand, (b)
 * makes longer segments that fit slot target lengths far better, and (c) turns
 * single hops into rhythm `gap_run`s (reclassified on load). Every fusion is
 * validated solvable; unsolvable ones are skipped. Deterministic (index-ordered).
 * @returns {Array} new pool with consumed singles removed and fusions added
 */
function fuseJumpSegments(pool, opts = {}) {
  const minBridge = opts.minBridge ?? 5;   // ≈ D_min at speed 32 (16u / 4)
  const maxFusions = opts.maxFusions ?? 40;
  const gravity = opts.gravity ?? 8;
  const smalls = pool.filter((s) => s.category === 'jump' && Array.isArray(s.rows) &&
    s.rows.length <= 8 && _countGaps(s) === 1 &&
    !(typeof s.id === 'string' && (s.id.startsWith('custom:') || s.id.startsWith('fused:'))));
  const fused = [];
  const consumed = new Set();
  let made = 0;
  for (let i = 0; i + 1 < smalls.length && made < maxFusions; i += 2) {
    const a = smalls[i], b = smalls[i + 1];
    const bridge = _fuseBridge(a.exit || { width: 5, center: 3, height: 0 }, b.entry || { width: 5, center: 3, height: 0 }, minBridge);
    const rows = [
      ...a.rows.map((r) => r.map((t) => (t ? { ...t } : null))),
      ...bridge,
      ...b.rows.map((r) => r.map((t) => (t ? { ...t } : null))),
    ];
    if (!_segmentSolvable(rows, gravity)) continue;
    const first = rows.find((r) => r.some((t) => t)) || rows[0];
    const last = [...rows].reverse().find((r) => r.some((t) => t)) || rows[rows.length - 1];
    fused.push({
      id: `fused:${a.id}+${b.id}`, source: 'fused', biome: a.biome || null,
      category: 'jump', // reclassifies to gap_run on load (now 2 gaps)
      difficulty: Math.max(a.difficulty || 3, b.difficulty || 3),
      signature: false, length: rows.length,
      entry: computeInterface(first), exit: computeInterface(last), rows,
    });
    consumed.add(a.id); consumed.add(b.id); made++;
  }
  if (!made) return pool;
  return pool.filter((s) => !consumed.has(s.id)).concat(fused);
}

function enrichSegmentPool() {
  const libPath = path.resolve('data/segment_library.json');
  let pool = [];
  try { pool = JSON.parse(fs.readFileSync(libPath, 'utf8')); } catch (e) { /* start fresh */ }
  // Strip prior generated entries so re-running never bloats the pool (idempotent).
  pool = pool.filter(s => !(typeof s.id === 'string' && (s.id.startsWith('custom:') || s.id.startsWith('fused:'))));
  const rng = createRng(0xC0FFEE);
  const custom = generateCustomSegments(rng);
  // The PERSISTED pool is base + custom ONLY. Fusion is applied to an in-memory copy
  // for the build and is NOT written back: fuseJumpSegments CONSUMES the small jump
  // originals it fuses, and the strip above only restores custom:/fused: ids — so
  // persisting the fused result permanently erodes the library across runs (this is
  // what drove base 489 → 331 over repeated bakes). Writing base+custom keeps
  // enrichment fully idempotent; fuseJumpSegments returns a new array without mutating
  // `base`, so the persisted copy stays intact.
  const base = pool.concat(custom);
  const enriched = fuseJumpSegments(base);
  fs.writeFileSync(libPath, JSON.stringify(base, null, 2), 'utf8');
  _segmentLibraryCache = reclassifyJumps(enriched); // build uses the fused pool, in-memory only
  console.log(`Pool enriched: +${custom.length} custom, fused jumps ${base.length}→${enriched.length} (persisted base ${base.length}, build pool ${enriched.length}).`);
  return _segmentLibraryCache;
}

// ==========================================================================
// SECTION 8: WORLD GENERATORS — 10 biome functions, each 8-pass workflow
// ==========================================================================

/** Ensure all tiles have required schema fields */
function normalizeRows(rows) {
  for (let r = 0; r < rows.length; r++) {
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const tile = rows[r][l];
      if (tile) {
        if (tile.full === undefined) tile.full = false;
        if (tile.half === undefined) tile.half = false;
        if (tile.tunnel === undefined) tile.tunnel = false;
        if (tile.top_color === undefined) tile.top_color = 0;
        if (tile.bottom_color === undefined) tile.bottom_color = 1;
        if (tile.low3 === undefined) tile.low3 = 1;
        if (tile.val === undefined) tile.val = 0;
      }
    }
  }
}

/** Create initial builder state */
function makeState(rng, biome, levelIndex) {
  return { rows: [], lane: 3, height: 0.0, rng, biome, levelIndex };
}

/** Add starting runway (safe zone for player to orient) */
function addStartRunway(state, width, bottomColor, length = 10) {
  return addRunway(state, length, width, bottomColor);
}

/** Add ending runway (safe finish zone) */
function addEndRunway(state, width, bottomColor, length = 8) {
  return addRunway(state, length, width, bottomColor);
}

/** Add a segment from the library, padding with flat runways to targetLength */
function addLibrarySegment(state, categories, targetLength, defaultWidth, defaultColor) {
  let fallback = true;
  try {
    const allSegments = getSegmentLibrary();
    const candidates = allSegments.filter(s => 
      s.length >= 6 && s.length <= targetLength &&
      s.entry.height === 0 && s.exit.height === 0 &&
      categories.includes(s.category)
    );
    if (candidates.length > 0) {
      const seg = rngChoice(state.rng, candidates);
      const paddingStart = Math.floor((targetLength - seg.length) / 2);
      const paddingEnd = targetLength - seg.length - paddingStart;
      
      addRunway(state, paddingStart, defaultWidth, defaultColor);
      
      for (const r of seg.rows) {
        const adaptedRow = r.map(t => {
          if (!t) return null;
          return {
            ...t,
            startY: 0.0,
            endY: 0.0,
            ramp: false
          };
        });
        state.rows.push(adaptedRow);
      }
      
      addRunway(state, paddingEnd, defaultWidth, defaultColor);
      fallback = false;
    }
  } catch (e) {
    // fallback to runway
  }
  if (fallback) {
    addRunway(state, targetLength, defaultWidth, defaultColor);
  }
}

// ---------------------------------------------------------------------------
// World 0: VOID (levels 61-63) — S-curve path, rhythmic obstacles
// ---------------------------------------------------------------------------
function generateVoidLevel(levelIndex, difficulty, seed) {
  const rng = createRng(seed);
  const state = makeState(rng, 'void', levelIndex);

  if (levelIndex === 61) {
    // ==========================================================================
    // VERTICAL TEST LEVEL (Level 61) - Showcase of multi-height paths & slalom walls
    // ==========================================================================
    
    // Helper to build a platform row at a specific height with guide walls on blocked lanes
    function createPlatformRow(height, openLanes, themeColor = 1) {
      const row = createEmptyRow();
      for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
        if (openLanes.includes(l)) {
          row[l] = createRampTile(height, height, themeColor);
        } else {
          row[l] = { ...createObstacle('full', 2), startY: height, endY: height };
        }
      }
      return row;
    }

    // Helper to build a ramp row from startHeight to endHeight with guide walls on blocked lanes
    function createRampRow(h1, h2, openLanes, themeColor = 1) {
      const row = createEmptyRow();
      for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
        if (openLanes.includes(l)) {
          row[l] = createRampTile(h1, h2, themeColor);
        } else {
          row[l] = { ...createObstacle('full', 2), startY: h1, endY: h2 };
        }
      }
      return row;
    }

    // SECTION 1: Intro runway (rows 0-14)
    addStartRunway(state, 5, 1, 15);
    // Introductory jump pad on lane 3 at row 13, pointing to the upcoming upper platforms on lane 3 starting at row 17
    state.rows[13][3] = { ...state.rows[13][3], top_color: 14, bottom_color: 10 };

    // SECTION 2: Curved Slalom with Guardrails, Boosts, & Jump Pads (rows 15-44)
    for (let i = 0; i < 30; i++) {
      // 1. Calculate centerLane with multi-sine wave and noise, damped at the end for smooth runway alignment
      const progress = i / 29.0;
      const damping = 1.0 - progress;
      const curve1 = Math.sin(i / 4.0) * 1.2;
      const curve2 = Math.sin(i / 1.5) * 0.4;
      const noise = (rng() - 0.5) * 0.3;
      const centerLane = clamp(Math.round(3.0 + (curve1 + curve2 + noise) * damping), 1, 5);
      const row = createRoadRow(centerLane, 5, 1);

      // 2. Guardrails follow the outer edges of the sweeping track
      const leftGuard = centerLane - 2;
      const rightGuard = centerLane + 2;
      row[leftGuard] = createObstacle('half', 2);
      row[rightGuard] = createObstacle('half', 2);

      // 3. Slalom walls placed on timing gate rows, alternating left and right lanes relative to center
      const isWallRow = (i % 4 === 0);
      if (isWallRow) {
        const offset = (i % 8 === 0) ? -1 : 1;
        const wallLane = centerLane + offset;
        row[wallLane] = createObstacle('full', 2);
      }

      // 4. Branching Path: Upper Platform Hop Path (height 4.0, lane 3) interleaved with wall rows
      const isPlatformRow = (i % 4 === 2);
      if (isPlatformRow) {
        // Platform tile at height 4.0
        row[3] = createRampTile(4.0, 4.0, 1);
        
        // Rhythmic jump pads & boost pads on the high pillars to help hop above the walls
        if (i % 8 === 2) {
          row[3] = { ...row[3], top_color: 14, bottom_color: 10 }; // Jump pad
        } else {
          row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost pad
        }
      } else {
        // Gaps between platforms on the upper deck: lane 3 is empty
        row[3] = null;
      }

      state.rows.push(row);
    }
    state.lane = 3;

    // Transition runway (15 rows) blending custom S-curve to Section 3 using segment library
    addLibrarySegment(state, ['mixed', 'slalom', 'obstacle_course'], 15, 5, 1);

    // SECTION 3: Special Behavior Showcase (rows 60-109)
    // 3a. Slippery Section (15 rows)
    for (let i = 0; i < 15; i++) {
      state.rows.push(createRoadRow(3, 5, 9)); // bottom color 9 (slippery)
    }

    // 3b. Sticky Section with Timing Gate (15 rows)
    for (let i = 0; i < 15; i++) {
      const row = createRoadRow(3, 5, 1);
      for (let l = 1; l <= 5; l++) {
        row[l] = { ...row[l], top_color: 3, bottom_color: 3 }; // sticky
      }
      if (i === 12) {
        for (let l = 1; l <= 5; l++) {
          if (l !== 3) {
            row[l] = createObstacle('full', 2);
          }
        }
      }
      // Hidden Boost directly behind the timing gate at i = 13
      if (i === 13) {
        row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost overrides sticky
      }
      state.rows.push(row);
    }

    // 3c. High Jump Section (20 rows)
    // Ramp up to launcher
    for (let i = 0; i < 5; i++) {
      const row = createEmptyRow();
      const h1 = (i / 5) * 1.5;
      const h2 = ((i + 1) / 5) * 1.5;
      for (let l = 1; l <= 5; l++) {
        row[l] = createRampTile(h1, h2, 1);
      }
      state.rows.push(row);
    }
    // Launcher platform with High Jump pad
    for (let i = 0; i < 5; i++) {
      const row = createEmptyRow();
      for (let l = 1; l <= 5; l++) {
        row[l] = createRampTile(1.5, 1.5, 1);
      }
      if (i === 3) {
        row[3] = { ...row[3], top_color: 14, bottom_color: 10 }; // High Jump
      }
      state.rows.push(row);
    }
    // Gap
    for (let i = 0; i < 5; i++) {
      state.rows.push(createEmptyRow());
    }
    // Landing runway with refill
    for (let i = 0; i < 5; i++) {
      const row = createRoadRow(3, 5, 1);
      if (i === 1) {
        row[3] = { ...row[3], top_color: 10, bottom_color: 10 }; // Refill
      }
      state.rows.push(row);
    }

    // SECTION 4: Three-Tier Incline Hill (rows 110-174)
    // Tier 1 Ramp: Ramp up from 0.0 to 2.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const h1 = (i / 10) * 2.0;
      const h2 = ((i + 1) / 10) * 2.0;
      state.rows.push(createRampRow(h1, h2, [5]));
    }

    // Tier 1 Platform: Platform at 2.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const row = createPlatformRow(2.0, [1, 2, 3, 4, 5]);
      if (i === 2) row[2] = { ...createObstacle('full', 2), startY: 2.0, endY: 2.0 };
      if (i === 5) row[4] = { ...createObstacle('full', 2), startY: 2.0, endY: 2.0 };
      if (i === 8) row[3] = { ...createObstacle('full', 2), startY: 2.0, endY: 2.0 };
      // Hidden boosts directly behind obstacles
      if (i === 3) row[2] = { ...row[2], top_color: 11, bottom_color: 10 };
      if (i === 6) row[4] = { ...row[4], top_color: 11, bottom_color: 10 };
      if (i === 9) row[3] = { ...row[3], top_color: 11, bottom_color: 10 };
      state.rows.push(row);
    }

    // Tier 2 Ramp: Ramp up from 2.0 to 4.0 (10 rows)
    const tier2OpenLanes = [
      [1, 2, 3, 4, 5], [1, 2, 3, 4, 5],
      [2, 3, 4, 5], [2, 3, 4, 5],
      [2, 3, 4, 5], [2, 3, 4, 5],
      [3, 4, 5], [3, 4, 5],
      [3, 4, 5], [3, 4, 5]
    ];
    for (let i = 0; i < 10; i++) {
      const h1 = 2.0 + (i / 10) * 2.0;
      const h2 = 2.0 + ((i + 1) / 10) * 2.0;
      state.rows.push(createRampRow(h1, h2, tier2OpenLanes[i]));
    }

    // Tier 2 Platform: Platform at 4.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const row = createPlatformRow(4.0, [3, 4, 5]);
      if (i === 3) row[3] = { ...createObstacle('full', 2), startY: 4.0, endY: 4.0 };
      if (i === 7) row[5] = { ...createObstacle('full', 2), startY: 4.0, endY: 4.0 };
      // Hidden boosts directly behind obstacles
      if (i === 4) row[3] = { ...row[3], top_color: 11, bottom_color: 10 };
      if (i === 8) row[5] = { ...row[5], top_color: 11, bottom_color: 10 };
      state.rows.push(row);
    }

    // Tier 3 Ramp: Ramp up from 4.0 to 6.0 (10 rows)
    const tier3OpenLanes = [
      [3, 4, 5], [3, 4, 5],
      [2, 3, 4], [2, 3, 4],
      [2, 3, 4], [2, 3, 4],
      [1, 2, 3], [1, 2, 3],
      [1, 2, 3], [1, 2, 3]
    ];
    for (let i = 0; i < 10; i++) {
      const h1 = 4.0 + (i / 10) * 2.0;
      const h2 = 4.0 + ((i + 1) / 10) * 2.0;
      state.rows.push(createRampRow(h1, h2, tier3OpenLanes[i]));
    }

    // Tier 3 Platform: Platform at 6.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const row = createPlatformRow(6.0, [1, 2, 3]);
      if (i === 3) row[1] = { ...createObstacle('full', 2), startY: 6.0, endY: 6.0 };
      if (i === 7) row[2] = { ...createObstacle('full', 2), startY: 6.0, endY: 6.0 };
      // Hidden boosts directly behind obstacles
      if (i === 4) row[1] = { ...row[1], top_color: 11, bottom_color: 10 };
      if (i === 8) row[2] = { ...row[2], top_color: 11, bottom_color: 10 };
      state.rows.push(row);
    }

    // Ramp/Bridge to Center (5 rows)
    const bridgeOpenLanes = [
      [1, 2, 3], [1, 2, 3],
      [2, 3, 4], [2, 3, 4], [2, 3, 4]
    ];
    for (let i = 0; i < 5; i++) {
      state.rows.push(createPlatformRow(6.0, bridgeOpenLanes[i]));
    }

    // SECTION 5: Sunken Trench & Tunnel (rows 175-224)
    // 5a. Ramp down from 6.0 to -2.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const h1 = 6.0 - (i / 10) * 8.0;
      const h2 = 6.0 - ((i + 1) / 10) * 8.0;
      state.rows.push(createRampRow(h1, h2, [1, 2, 3, 4, 5]));
    }
    // 5b. Sunken Tunnel at -2.0 with dynamic snaking hazards (30 rows)
    for (let i = 0; i < 30; i++) {
      const progress = i / 29.0;
      const damping = Math.sin(progress * Math.PI); // double-ended damping
      const curve1 = Math.sin(i / 4.0) * 1.2;
      const curve2 = Math.sin(i / 1.5) * 0.4;
      const noise = (rng() - 0.5) * 0.3;
      const centerLane = clamp(Math.round(3.0 + (curve1 + curve2 + noise) * damping), 1, 5);
      
      const row = createEmptyRow();
      const safeLanes = [centerLane - 1, centerLane, centerLane + 1];
      
      for (let l = 1; l <= 5; l++) {
        if (safeLanes.includes(l)) {
          row[l] = { ...createTunnelTile(1), ramp: true, startY: -2.0, endY: -2.0 };
        } else {
          row[l] = { ...createTunnelTile(13), ramp: true, startY: -2.0, endY: -2.0, top_color: 13, bottom_color: 13 }; // burning hazard
        }
      }
      
      // Place half-obstacles directly on the racing line (centerLane) at i = 5, 12, 18, 24
      if (i === 5) row[centerLane] = { ...createObstacle('half', 2), tunnel: true, startY: -2.0, endY: -2.0 };
      if (i === 12) row[centerLane] = { ...createObstacle('half', 2), tunnel: true, startY: -2.0, endY: -2.0 };
      if (i === 18) row[centerLane] = { ...createObstacle('half', 2), tunnel: true, startY: -2.0, endY: -2.0 };
      if (i === 24) row[centerLane] = { ...createObstacle('half', 2), tunnel: true, startY: -2.0, endY: -2.0 };
      
      // Place boosts on the racing line (centerLane) 2 rows later at i = 7, 14, 20, 26
      if (i === 7 || i === 14 || i === 20 || i === 26) {
        row[centerLane] = { ...row[centerLane], top_color: 11, bottom_color: 10 };
      }
      
      state.rows.push(row);
    }
    // 5c. Ramp up from -2.0 to 0.0 (10 rows)
    for (let i = 0; i < 10; i++) {
      const h1 = -2.0 + (i / 10) * 2.0;
      const h2 = -2.0 + ((i + 1) / 10) * 2.0;
      state.rows.push(createRampRow(h1, h2, [1, 2, 3, 4, 5]));
    }

    // SECTION 6: Burning Hazards & Boost Chain (rows 225-284)
    // 6a. Burn Zone (19 rows)
    for (let i = 0; i < 19; i++) {
      const row = createEmptyRow();
      for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
        if (l >= 2 && l <= 4) {
          row[l] = createTile(1);
        } else {
          row[l] = { ...createTile(13, 13) }; // Burning
        }
      }
      if (i === 5) row[2] = createObstacle('half', 2);
      if (i === 10) row[4] = createObstacle('half', 2);
      if (i === 15) row[3] = createObstacle('half', 2);
      state.rows.push(row);
    }
    // 6b. Checkpoint Flat Runway (10 rows)
    for (let i = 0; i < 10; i++) {
      state.rows.push(createRoadRow(3, 5, 1));
    }
    // 6c. High-Speed Timing Gates with Spaced Boosts (20 rows) - library segment
    addLibrarySegment(state, ['obstacle_course', 'narrow_passage', 'speed_section'], 20, 5, 1);
    
    // 6d. Ultimate Boost Runway (15 rows)
    for (let i = 0; i < 15; i++) {
      const row = createRoadRow(3, 5, 1);
      if (i === 2) row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost
      if (i === 6) row[2] = { ...row[2], top_color: 11, bottom_color: 10 };
      if (i === 6) row[4] = { ...row[4], top_color: 11, bottom_color: 10 };
      if (i === 11) row[3] = { ...row[3], top_color: 12, bottom_color: 10 }; // Super Boost
      if (i === 13) row[3] = { ...row[3], top_color: 12, bottom_color: 10 }; // Super Boost
      state.rows.push(row);
    }

    // SECTION 7: Ultimate Void Jump (rows 285-350)
    // 7a. Ramp up from 0.0 to 6.0 (15 rows)
    for (let i = 0; i < 15; i++) {
      const h1 = (i / 15) * 6.0;
      const h2 = ((i + 1) / 15) * 6.0;
      state.rows.push(createRampRow(h1, h2, [1, 2, 3, 4, 5]));
    }
    // 7b. Launch Peak at 6.0 with Boost (10 rows)
    for (let i = 0; i < 10; i++) {
      const row = createPlatformRow(6.0, [1, 2, 3, 4, 5]);
      if (i === 2) {
        row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost pad at row 302
      }
      if (i === 6) {
        row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost pad at row 306
      }
      if (i === 9) {
        for (let l of [2, 3, 4]) {
          row[l] = { ...createRampTile(6.0, 6.0, 1), top_color: 12, bottom_color: 10 }; // Super Boost pad at row 309
        }
      }
      state.rows.push(row);
    }
    // 7c. Huge Void Gap (9 rows)
    for (let i = 0; i < 9; i++) {
      state.rows.push(createEmptyRow());
    }
    // 7d. Landing Platform at 2.0 with Refill (10 rows)
    for (let i = 0; i < 10; i++) {
      const row = createPlatformRow(2.0, [1, 2, 3, 4, 5]);
      if (i === 2) {
        for (let l of [2, 3, 4]) {
          row[l] = { ...createRampTile(2.0, 2.0, 1), top_color: 10, bottom_color: 10 }; // Refill pad at row 321
        }
      }
      state.rows.push(row);
    }
    // 7e. Ramp down from 2.0 to 0.0 (12 rows)
    for (let i = 0; i < 12; i++) {
      const h1 = 2.0 - (i / 12) * 2.0;
      const h2 = 2.0 - ((i + 1) / 12) * 2.0;
      state.rows.push(createRampRow(h1, h2, [1, 2, 3, 4, 5]));
    }
    // 7f. Recovery Runway (10 rows)
    for (let i = 0; i < 10; i++) {
      state.rows.push(createRoadRow(3, 5, 1));
    }

    // SECTION 8: Outro & Finish (rows 351-415)
    // 8a. High-Speed Slalom with Boosts (15 rows) -> library segment
    addLibrarySegment(state, ['slalom', 'speed_section'], 15, 5, 1);

    // 8b. Final Mini Void Jump (15 rows)
    // Approach runway (4 rows)
    for (let i = 0; i < 4; i++) {
      const row = createRoadRow(3, 5, 1);
      if (i === 2) row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost
      state.rows.push(row);
    }
    // Ramp up from 0.0 to 2.0 (4 rows)
    for (let i = 0; i < 4; i++) {
      const h1 = (i / 4) * 2.0;
      const h2 = ((i + 1) / 4) * 2.0;
      state.rows.push(createRampRow(h1, h2, [1, 2, 3, 4, 5]));
    }
    // Launch Peak at 2.0 with boost (1 row)
    {
      const row = createPlatformRow(2.0, [2, 3, 4]);
      row[3] = { ...row[3], top_color: 11, bottom_color: 10 }; // Boost
      state.rows.push(row);
    }
    // Mini Void Gap (3 rows)
    for (let i = 0; i < 3; i++) {
      state.rows.push(createEmptyRow());
    }
    // Landing platform at height 0.0 (3 rows)
    for (let i = 0; i < 3; i++) {
      const row = createRoadRow(3, 3, 1); // lanes 2-4
      if (i === 0) {
        row[3] = { ...row[3], top_color: 10, bottom_color: 10 }; // Refill
      }
      state.rows.push(row);
    }

    // 8c. Finish Approach (15 rows)
    for (let i = 0; i < 15; i++) {
      const row = createRoadRow(3, 5, 1);
      if (i === 4) {
        row[1] = createObstacle('half', 2);
        row[5] = createObstacle('half', 2);
      }
      if (i === 10) {
        row[1] = createObstacle('full', 2);
        row[5] = createObstacle('full', 2);
      }
      state.rows.push(row);
    }

    // 8d. Finish Runway (12 rows)
    for (let i = 0; i < 12; i++) {
      state.rows.push(createRoadRow(3, 5, 1));
    }

    // 8e. End Runway (8 rows)
    addEndRunway(state, 5, 1, 8);

    normalizeRows(state.rows);
    return {
      level_index: levelIndex,
      name: "DEMO LEVEL",
      gravity: 8,
      fuel: 220,
      oxygen: 150,
      palette: PALETTES['void'],
      rows: state.rows
    };
  } else {
    // Void levels 62 & 63 — design-doc blueprint driven (level 61 stays bespoke above).
    return generateFromDesignDoc(levelIndex, difficulty, seed, 'void');
  }
}

// ==========================================================================
// SECTION 7B: SHARED SEGMENT-LIBRARY ASSEMBLER
// All biome generators use this to build levels from extracted real-game
// chunks ("lego pieces") with biome-specific configuration.
// ==========================================================================

/** Cache the segment library so we only read disk once */
// Jump is the biggest pillar of the game (jump + steer) but shipped as one
// 252-strong category — too coarse to design with, and so oversupplied that most
// members never get drawn. Split it by what the player actually DOES, read off
// the gap shape, so blueprints can request jump *types* the way they request
// steering types:
//   hop            — one short gap (≤2 wide), easy → the connective "glue"
//   precision_jump — one short gap but harder (difficulty ≥4) → a deliberate test
//   leap           — one wide gap (≥3 wide) → a committed long jump (feature/climax)
//   gap_run        — multiple gaps in sequence → rhythm jumping
const JUMP_FAMILY = new Set(['hop', 'precision_jump', 'leap', 'gap_run']);

function jumpSubcategory(seg) {
  let maxRun = 0, run = 0, gaps = 0, prevGap = false;
  for (const row of seg.rows || []) {
    const g = row.every((t) => t == null);
    if (g) { run++; if (run > maxRun) maxRun = run; if (!prevGap) gaps++; } else run = 0;
    prevGap = g;
  }
  if (gaps >= 2) return 'gap_run';
  if (maxRun >= 3) return 'leap';
  if ((seg.difficulty || 0) >= 4) return 'precision_jump';
  return 'hop';
}

/** Does a segment's category satisfy a slot tag? A `jump` slot matches any
 * jump-family subtype (back-compat for blueprints that still say 'jump'). */
function categoryMatches(segCat, slotTag) {
  if (segCat === slotTag) return true;
  if (slotTag === 'jump' && JUMP_FAMILY.has(segCat)) return true;
  return false;
}

/** Re-tag every monolithic 'jump' segment into its jump-family subtype (in place). */
function reclassifyJumps(pool) {
  if (!Array.isArray(pool)) return pool;
  for (const s of pool) {
    if (s && s.category === 'jump' && Array.isArray(s.rows)) s.category = jumpSubcategory(s);
  }
  return pool;
}

let _segmentLibraryCache = null;
function getSegmentLibrary() {
  if (!_segmentLibraryCache) {
    const libPath = path.resolve('data/segment_library.json');
    _segmentLibraryCache = reclassifyJumps(JSON.parse(fs.readFileSync(libPath, 'utf8')));
  }
  return _segmentLibraryCache;
}

/**
 * Assemble a level from segment library chunks.
 * @param {object} config — biome-specific configuration
 * @returns {object} level data object
 */
function assembleFromSegments(config) {
  const {
    levelIndex, difficulty, seed, biome, name,
    gravity, fuel, oxygen, targetRows,
    diffRange = [1, 5],
    categoryPrefs = ['slalom', 'hop', 'gap_run', 'narrow_passage', 'tunnel', 'obstacle_course', 'leap', 'mixed', 'hazard_zone', 'speed_section'],
    refillSpacing = 30,
    roadColor = 1,
    postProcess = null,
  } = config;

  const rng = createRng(seed);
  const state = makeState(rng, biome, levelIndex);
  const allSegments = getSegmentLibrary();
  const [minDiff, maxDiff] = diffRange;

  const candidates = allSegments.filter(s =>
    s.difficulty >= minDiff && s.difficulty <= maxDiff &&
    s.length >= 4 && s.length <= 50 && s.category !== 'runway'
  );

  const byCategory = {};
  for (const seg of candidates) {
    if (!byCategory[seg.category]) byCategory[seg.category] = [];
    byCategory[seg.category].push(seg);
  }
  const availableCategories = categoryPrefs.filter(c => byCategory[c] && byCategory[c].length > 0);

  function buildAdapter(exitIface, entryIface) {
    const adapterRows = [];
    const exitW = exitIface.width || 4, entryW = entryIface.width || 4;
    const exitC = exitIface.center, entryC = entryIface.center;
    const totalLen = Math.max(2, Math.abs(exitW - entryW), Math.abs(exitC - entryC));
    for (let i = 0; i < totalLen; i++) {
      const t = (i + 1) / totalLen;
      const w = Math.max(1, Math.round(exitW + (entryW - exitW) * t));
      const c = Math.round(exitC + (entryC - exitC) * t);
      adapterRows.push(createRoadRow(clamp(c, 1, 5), w, roadColor));
    }
    return adapterRows;
  }

  function interfaceDistance(exitIface, entryIface) {
    return Math.abs((exitIface.width || 4) - (entryIface.width || 4)) +
           Math.abs((exitIface.center || 3) - (entryIface.center || 3)) * 2 +
           Math.abs((exitIface.height || 0) - (entryIface.height || 0)) * 10;
  }

  const usedSegmentIds = new Set();
  let lastCategory = '', sameCategoryCount = 0;
  let lastExit = { width: 5, lanes: [1,2,3,4,5], height: 0, center: 3 };

  // Bucket B: shuffle-bag for category selection so the same category can't
  // repeat inside a cooldown window (drought-protected, repeat-capped). Keyed by
  // category string. Deterministic w.r.t. the seeded rng.
  const catBag = new ShuffleBag(rng, { cooldown: 2, maxRepeats: 4, droughtAfter: 6 });
  // And a second bag over concrete segment ids, so individual templates don't
  // recur within the cooldown window (≥4 segments) — replaces uniform-with-
  // replacement picking from the top-N interface-matched candidates.
  const segBag = new ShuffleBag(rng, { cooldown: 4, maxRepeats: 1, droughtAfter: 12, globalUsage: GLOBAL_SEG_USAGE });
  const placed = []; // assembly metadata for chunk/interface assertions

  addStartRunway(state, 5, roadColor, rngInt(rng, 10, 14));

  while (state.rows.length < targetRows - 15) {
    let catPool = availableCategories;
    if (sameCategoryCount >= 2) catPool = catPool.filter(c => c !== lastCategory);
    if (catPool.length === 0) catPool = availableCategories;
    if (catPool.length === 0) break;

    const category = catBag.draw(catPool) ?? rngChoice(rng, catPool);
    const catSegments = byCategory[category] || [];
    if (catSegments.length === 0) continue;

    let scored = catSegments
      .filter(s => !usedSegmentIds.has(s.id))
      .map(s => ({ segment: s, distance: interfaceDistance(lastExit, s.entry) }))
      .sort((a, b) => a.distance - b.distance);
    if (scored.length === 0) {
      const reuse = rngChoice(rng, catSegments);
      scored = [{ segment: reuse, distance: interfaceDistance(lastExit, reuse.entry) }];
    }

    const topN = scored.slice(0, Math.min(5, scored.length));
    // Shuffle-bag draw over the interface-matched top-N (no template repeats
    // within the cooldown window); fall back to nearest if the bag is exhausted.
    const pick = segBag.draw(topN, (p) => p.segment.id) ?? topN[0];
    const seg = pick.segment;

    if (state.rows.length + seg.length > targetRows + 30) {
      const shorter = topN.filter(s => state.rows.length + s.segment.length <= targetRows + 20);
      if (shorter.length === 0) break;
      const sp = segBag.draw(shorter, (p) => p.segment.id) ?? shorter[0];
      const adapted = sp.distance > 2;
      if (adapted) for (const row of buildAdapter(lastExit, sp.segment.entry)) state.rows.push(row);
      addRunway(state, rngInt(rng, 3, 5), Math.max(3, sp.segment.entry.width || 4), roadColor);
      placed.push({ id: sp.segment.id, length: sp.segment.length, entry: sp.segment.entry,
        exit: sp.segment.exit, startRow: state.rows.length, adapted: true, signature: !!sp.segment.signature });
      for (const row of sp.segment.rows) state.rows.push(row.map(t => t ? { ...t } : null));
      usedSegmentIds.add(sp.segment.id);
      lastExit = sp.segment.exit;
      break;
    }

    const adapted = pick.distance > 2;
    if (adapted) for (const row of buildAdapter(lastExit, seg.entry)) state.rows.push(row);

    const transLen = rngInt(rng, 3, 6);
    addRunway(state, transLen, Math.max(3, seg.entry.width || 4), roadColor);
    placed.push({ id: seg.id, length: seg.length, entry: seg.entry, exit: seg.exit,
      startRow: state.rows.length, adapted: true, signature: !!seg.signature });

    const refillRow = state.rows.length - Math.floor(transLen / 2);
    if (refillRow >= 0 && refillRow < state.rows.length) {
      const rRow = state.rows[refillRow];
      if (rRow) {
        const cL = _findRoadLane(rRow, 3);
        if (cL >= 0 && rRow[cL] && rRow[cL].top_color === 0) {
          rRow[cL] = { ...rRow[cL], top_color: 10, bottom_color: 10 };
        }
      }
    }

    for (const row of seg.rows) state.rows.push(row.map(t => t ? { ...t } : null));
    usedSegmentIds.add(seg.id);
    lastExit = seg.exit;
    if (seg.category === lastCategory) sameCategoryCount++;
    else { sameCategoryCount = 1; lastCategory = seg.category; }
  }

  state.lane = 3;
  addEndRunway(state, 5, roadColor, rngInt(rng, 8, 12));

  const biomeRules = BIOME_RULES[biome] || {};
  const audit = auditLevel(state.rows, biome, biomeRules);
  refineLevel(state.rows, audit, biome, rng);

  let lastRefill = 0;
  for (let r = 20; r < state.rows.length - 10; r++) {
    if (r - lastRefill >= refillSpacing) {
      const row = state.rows[r];
      if (!row) continue;
      const cL = _findRoadLane(row, 3);
      if (cL >= 0 && row[cL] && row[cL].top_color === 0 && !row[cL].ramp) {
        row[cL] = { ...row[cL], top_color: 10, bottom_color: 10 };
        lastRefill = r;
      }
    }
    const row = state.rows[r];
    if (row) for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      if (row[l] && row[l].top_color === 10) { lastRefill = r; break; }
    }
  }

  if (postProcess) postProcess(state, rng, difficulty);

  for (let r = 0; r < state.rows.length; r++) {
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const tile = state.rows[r][l];
      if (tile && !tile.ramp && tile.bottom_color === 1 && roadColor !== 1) {
        tile.bottom_color = roadColor;
        tile.low3 = roadColor;
      }
    }
  }

  normalizeRows(state.rows);
  return { level_index: levelIndex, name, gravity, fuel, oxygen, palette: PALETTES[biome], rows: state.rows, __assembly: placed };
}

// ==========================================================================
// SECTION 7D: BLUEPRINT-DRIVEN GENERATION
// The design document (data/world_design_docs.json) emits a per-level blueprint
// of ordered, tagged slots. buildLevelFromBlueprint fills each slot by PICKING
// from the enriched pool — signature slots prefer biome-matched custom segments,
// filler slots use real extracted chunks (detail-fill). One uniform job: pick.
// ==========================================================================

let _designDocsCache = null;
function getDesignDocs() {
  if (!_designDocsCache) {
    _designDocsCache = JSON.parse(fs.readFileSync(path.resolve('data/world_design_docs.json'), 'utf8'));
  }
  return _designDocsCache;
}

/** Look up the authored blueprint (level entry) for a biome + level index. */
function buildBlueprint(biome, levelIndex) {
  const world = getDesignDocs().worlds.find(w => w.biome === biome);
  if (!world) return null;
  const level = (world.levels || []).find(l => l.levelIndex === levelIndex);
  return level ? { ...level, worldTitle: world.title } : null;
}

/** Interface mismatch cost between a previous exit and a candidate entry. */
function slotInterfaceDistance(exitIface, entryIface) {
  return Math.abs((exitIface.width || 4) - (entryIface.width || 4)) +
         Math.abs((exitIface.center || 3) - (entryIface.center || 3)) * 2 +
         Math.abs((exitIface.height || 0) - (entryIface.height || 0)) * 10;
}

/** Build a short road transition that morphs width/center between interfaces. */
function slotBuildAdapter(exitIface, entryIface, roadColor) {
  const adapterRows = [];
  const exitW = exitIface.width || 4, entryW = entryIface.width || 4;
  const exitC = exitIface.center, entryC = entryIface.center;
  const totalLen = Math.max(2, Math.abs(exitW - entryW), Math.abs(exitC - entryC));
  for (let i = 0; i < totalLen; i++) {
    const t = (i + 1) / totalLen;
    const w = Math.max(1, Math.round(exitW + (entryW - exitW) * t));
    const c = Math.round(exitC + (entryC - exitC) * t);
    adapterRows.push(createRoadRow(clamp(c, 1, 5), w, roadColor));
  }
  return adapterRows;
}

/** Pick the best pool segment for a blueprint slot (uniform pick step). */
// TODO (Bucket B, task 4 — three-beat phrase grammar, NOT YET IMPLEMENTED):
// A setup→challenge→recovery cadence would require segments in
// data/segment_library.json to carry a `role` tag ('setup'|'challenge'|'recovery').
// The current schema has no such field (keys: id, source, length, category,
// difficulty, entry, exit, rows; custom entries add source:'custom'+biome+signature).
// Implementing it fragile-free needs either (a) an offline pass that classifies
// each pooled segment's role from its intensity profile via trackQuality's
// computeIntensity (peak/forced-demand density → challenge; low flat → recovery;
// rising → setup) and bakes a `role` field, or (b) authored role tags in the
// segment extractor. Once roles exist, gate selection here so a 'challenge' draw
// forces a 'recovery' before the next 'challenge'. Deferred to avoid inventing a
// brittle heuristic; see final report.
function pickSegmentForSlot(pool, slot, biome, diffRange, lastExit, usedIds, rng, segBag = null) {
  const [minDiff, maxDiff] = diffRange;
  let cands = pool.filter(s =>
    categoryMatches(s.category, slot.tag) && s.rows && s.length >= 4 &&
    s.difficulty >= minDiff - 1 && s.difficulty <= maxDiff + 1 &&
    !usedIds.has(s.id));

  if (slot.signature) {
    // Signature slots: prefer biome-matched custom set-pieces, then any custom.
    let pref = cands.filter(s => s.source === 'custom' && s.biome === biome);
    if (pref.length === 0) pref = cands.filter(s => s.source === 'custom');
    if (pref.length > 0) cands = pref;
  } else {
    // Filler slots: detail-fill from real extracted chunks where possible.
    const real = cands.filter(s => s.source !== 'custom');
    if (real.length > 0) cands = real;
  }
  if (cands.length === 0) return null;

  const target = slot.rows || 24;
  // Group-based draw (Bucket B widening): when a bag is supplied, draw from the
  // WHOLE eligible group ("I need a `tag` segment → pick one from that group"),
  // not just the 5 best-fitting candidates. The shuffle-bag's global-usage bias
  // then spreads picks across the entire group instead of hammering the few that
  // happen to fit the running interface, so dormant assets actually get used. Any
  // interface gap is bridged by the adapter (and smoothed by the revision pass).
  // A light length-band keeps slot sizing sane without collapsing back to top-N.
  const band = cands.filter(s => Math.abs(s.length - target) <= Math.max(12, target * 0.6));
  const group = band.length >= 3 ? band : cands;
  if (segBag) {
    const pick = segBag.draw(group, (s) => s.id);
    if (pick) return pick;
  }
  // Deterministic fallback (no bag): best interface+length fit.
  const scored = group
    .map(s => ({ s, d: slotInterfaceDistance(lastExit, s.entry) + Math.abs(s.length - target) * 0.5 }))
    .sort((a, b) => a.d - b.d);
  return rngChoice(rng, scored.slice(0, Math.min(5, scored.length))).s;
}

/**
 * Revision pass (multi-pass assembly) — the part that makes this work like a real
 * level designer instead of a single perfect pass. After segments are *planned*
 * for each slot, walk the seams; wherever the next segment fits the previous one
 * badly (interface distance over `threshold`), examine the PREVIOUS segment and
 * try to swap it for an alternative from its own group that stitches better to
 * BOTH its neighbours. Greedy, bounded sweeps; deterministic (picks max seam
 * improvement, no rng). Purely reorders *selection*; materialization is unchanged.
 *
 * @param {Array<{slot,seg}>} plan  seg is a segment object, 'runway', or null
 * @param {(slot:object, excludeIds:Set)=>Array} getAlternatives  group candidates for a slot
 * @param {{threshold?:number, sweeps?:number}} [opts]
 * @returns {{plan, swaps}}
 */
function reviseSegmentPlan(plan, getAlternatives, opts = {}) {
  const threshold = opts.threshold ?? 8;
  const sweeps = opts.sweeps ?? 2;
  const FULL = { width: 5, center: 3, height: 0 };
  const isSeg = (e) => e && e.seg && e.seg !== 'runway';
  const exitOf = (e) => (isSeg(e) && e.seg.exit) ? e.seg.exit : FULL;
  let swaps = 0;
  for (let s = 0; s < sweeps; s++) {
    let changed = false;
    for (let i = 1; i < plan.length; i++) {
      const cur = plan[i], prev = plan[i - 1];
      if (!isSeg(cur) || !isSeg(prev)) continue;
      const seam = slotInterfaceDistance(prev.seg.exit || FULL, cur.seg.entry || FULL);
      if (seam <= threshold) continue;
      const prevPrevExit = i >= 2 ? exitOf(plan[i - 2]) : FULL;
      const oldBefore = slotInterfaceDistance(prevPrevExit, prev.seg.entry || FULL);
      const excl = new Set(plan.filter(isSeg).map((p) => p.seg.id));
      let best = null, bestGain = 1e-9;
      for (const alt of (getAlternatives(prev.slot, excl) || [])) {
        const nb = slotInterfaceDistance(prevPrevExit, alt.entry || FULL);
        const na = slotInterfaceDistance(alt.exit || FULL, cur.seg.entry || FULL);
        const gain = (oldBefore + seam) - (nb + na);
        if (gain > bestGain) { bestGain = gain; best = alt; }
      }
      if (best) { prev.seg = best; swaps++; changed = true; }
    }
    if (!changed) break;
  }
  return { plan, swaps };
}

/**
 * Enforce the safety-critical subset of the 27 design constraints as a final
 * pass. By design this ONLY removes hazards/walls (never adds), so a level that
 * the solver already accepted stays solvable.
 *  - #12 Safe Landing Zones: the first 3 road rows after any gap are cleared of
 *        obstacles and burn tiles (boosts/refills/ramps are preserved).
 *  - #10 Hazard Grouping: isolated single burn tiles (no burn neighbour) are
 *        reverted to plain road, so burns read as deliberate barriers.
 */
function enforceConstraints(rows, biome, blueprint, rng) {
  const n = rows.length;

  for (let r = 1; r < n; r++) {
    const prevGap = rows[r - 1] && rows[r - 1].every(t => t === null);
    const isRoad = rows[r] && rows[r].some(t => t);
    if (!(prevGap && isRoad)) continue;
    for (let k = r; k < Math.min(n, r + 3); k++) {
      const row = rows[k];
      if (!row) continue;
      for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
        const t = row[l];
        if (!t || t.ramp) continue;
        if (t.full || t.half) row[l] = createTile(t.bottom_color === 2 ? 1 : t.bottom_color);
        else if (t.top_color === 13 || t.bottom_color === 13) row[l] = createTile(1);
      }
    }
  }

  for (let r = 0; r < n; r++) {
    const row = rows[r];
    if (!row) continue;
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const t = row[l];
      if (!t || !(t.top_color === 13 || t.bottom_color === 13)) continue;
      const hasBurnNeighbour = [[r, l - 1], [r, l + 1], [r - 1, l], [r + 1, l]].some(([rr, ll]) => {
        if (rr < 0 || rr >= n || ll < 0 || ll >= ROAD_WIDTH_LANES) return false;
        const tt = rows[rr] && rows[rr][ll];
        return tt && (tt.top_color === 13 || tt.bottom_color === 13);
      });
      if (!hasBurnNeighbour) row[l] = createTile(1);
    }
  }
}

const FULL_EXIT = { width: 5, lanes: [1, 2, 3, 4, 5], height: 0, center: 3 };

/**
 * Build a level by filling an authored blueprint's ordered slots from the pool.
 * @param {object} cfg level config + blueprint
 */
function buildLevelFromBlueprint(cfg) {
  const {
    levelIndex, difficulty, seed, biome, name, gravity, fuel, oxygen,
    blueprint, diffRange = [1, 5], roadColor = 1, refillSpacing = 30, postProcess = null,
    targetRows = 0,
  } = cfg;

  const rng = createRng(seed);
  const state = makeState(rng, biome, levelIndex);
  const pool = getSegmentLibrary();
  const usedIds = new Set();
  let lastExit = { ...FULL_EXIT };

  // Bucket B: shuffle-bag over concrete segment ids so the same template doesn't
  // recur within the cooldown window across all slot picks. Deterministic.
  const segBag = new ShuffleBag(rng, { cooldown: 4, maxRepeats: 1, droughtAfter: 12, globalUsage: GLOBAL_SEG_USAGE });
  const placed = []; // assembly metadata for chunk/interface assertions

  // Group candidates for a slot (used by the revision pass to find alternatives).
  const getAlternatives = (slot, excludeIds) => pool.filter((s) =>
    categoryMatches(s.category, slot.tag) && s.rows && s.length >= 4 &&
    s.difficulty >= diffRange[0] - 1 && s.difficulty <= diffRange[1] + 1 &&
    !excludeIds.has(s.id) && (slot.signature ? s.source === 'custom' : true));

  // Lay down a single blueprint slot. `chosenSeg` (when provided) is a segment
  // already selected + revised in the planning pass; otherwise pick one now.
  const placeSlot = (slot, chosenSeg) => {
    if (slot.tag === 'runway') {
      addRunway(state, slot.rows || 10, 5, roadColor);
      lastExit = { ...FULL_EXIT };
      return;
    }
    const seg = chosenSeg !== undefined
      ? chosenSeg
      : pickSegmentForSlot(pool, slot, biome, diffRange, lastExit, usedIds, rng, segBag);
    if (!seg) {
      // No pool match — keep the arc intact with a runway of the slot's length.
      addRunway(state, Math.max(6, slot.rows || 12), 5, roadColor);
      lastExit = { ...FULL_EXIT };
      return;
    }
    const adapted = slotInterfaceDistance(lastExit, seg.entry) > 2;
    if (adapted) {
      for (const row of slotBuildAdapter(lastExit, seg.entry, roadColor)) state.rows.push(row);
    }
    addRunway(state, rngInt(rng, 2, 4), Math.max(3, seg.entry.width || 4), roadColor);
    placed.push({ id: seg.id, length: seg.length, entry: seg.entry, exit: seg.exit,
      startRow: state.rows.length, adapted: true, signature: !!seg.signature });
    for (const row of seg.rows) state.rows.push(row.map(t => (t ? { ...t } : null)));
    usedIds.add(seg.id);
    lastExit = seg.exit || { ...FULL_EXIT };
  };

  // Drop the trailing outro runway (a single short end runway is the finish)
  // and pull out the climax so the level ENDS on its hardest beat — no long
  // flat tail. Length top-up is inserted right before the climax.
  const slots = blueprint.slots;
  let bodySlots = slots;
  if (slots.length > 1 && slots[slots.length - 1].tag === 'runway') bodySlots = slots.slice(0, -1);

  let climaxIdx = -1;
  for (let i = bodySlots.length - 1; i >= 0; i--) { if (bodySlots[i].role === 'climax') { climaxIdx = i; break; } }
  if (climaxIdx < 0) climaxIdx = bodySlots.length - 1;
  const climaxSlot = bodySlots[climaxIdx];
  const preClimax = bodySlots.filter((_, i) => i !== climaxIdx);

  // Filler categories for length top-up: reuse the blueprint's own filler tags
  // (real extracted chunks; never the signature set-pieces).
  const fillerTags = [...new Set(bodySlots.filter(s => !s.signature && s.tag !== 'runway').map(s => s.tag))];
  // 'hop' is the universal connective glue (easy single jumps, biome-agnostic) so
  // every level shares a common jump vocabulary; mixed with light steering fillers.
  const glueTags = ['hop', 'slalom', 'narrow_passage', 'gap_run', 'precision_jump'];
  const fillerPool = [...new Set([...glueTags, ...fillerTags])];

  // Multi-pass assembly for the authored backbone: (1) PLAN — pick a segment per
  // slot (group-based draw, threading the running interface); (2) REVISE — swap
  // poorly-fitting segments by examining the previous one; (3) MATERIALIZE.
  let planExit = { ...FULL_EXIT };
  const plan = [];
  for (const slot of preClimax) {
    if (slot.tag === 'runway') { plan.push({ slot, seg: 'runway' }); planExit = { ...FULL_EXIT }; continue; }
    const seg = pickSegmentForSlot(pool, slot, biome, diffRange, planExit, usedIds, rng, segBag);
    if (seg) usedIds.add(seg.id);
    plan.push({ slot, seg: seg || null });
    planExit = seg && seg.exit ? seg.exit : { ...FULL_EXIT };
  }
  reviseSegmentPlan(plan, getAlternatives, { threshold: 8, sweeps: 2 });
  for (const { slot, seg } of plan) {
    if (slot.tag === 'runway') placeSlot(slot);
    else placeSlot(slot, seg);
  }

  if (targetRows > 0) {
    const reserve = 48; // room for the climax segment + the short safe finish
    let guard = 0;
    while (state.rows.length < targetRows - reserve && guard++ < 40) {
      const before = state.rows.length;
      placeSlot({ tag: rngChoice(rng, fillerPool), role: 'filler', rows: rngInt(rng, 20, 30) });
      if (state.rows.length <= before) break;
    }
  }

  if (climaxSlot) placeSlot(climaxSlot);

  // Short safe finish only — the climax is the last real challenge.
  state.lane = 3;
  addEndRunway(state, 5, roadColor, rngInt(rng, 6, 8));

  // Biome audit/refine ensures signature elements are present.
  const audit = auditLevel(state.rows, biome, BIOME_RULES[biome] || {});
  refineLevel(state.rows, audit, biome, rng);

  // Refill economy: spawn a refill at most every refillSpacing rows of road.
  let lastRefill = 0;
  for (let r = 20; r < state.rows.length - 10; r++) {
    const row = state.rows[r];
    if (!row) continue;
    if (r - lastRefill >= refillSpacing) {
      const cL = _findRoadLane(row, 3);
      if (cL >= 0 && row[cL] && row[cL].top_color === 0 && !row[cL].ramp) {
        row[cL] = { ...row[cL], top_color: 10, bottom_color: 10 };
        lastRefill = r;
      }
    }
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      if (row[l] && row[l].top_color === 10) { lastRefill = r; break; }
    }
  }

  if (postProcess) postProcess(state, rng, difficulty);

  // Final 27-constraint safety pass: safe landings after gaps + hazard grouping.
  // Only removes hazards/walls, so the solver guarantee is preserved.
  enforceConstraints(state.rows, biome, blueprint, rng);

  // Recolor default road tiles to the biome road color.
  for (let r = 0; r < state.rows.length; r++) {
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const tile = state.rows[r][l];
      if (tile && !tile.ramp && tile.bottom_color === 1 && roadColor !== 1) {
        tile.bottom_color = roadColor;
        tile.low3 = roadColor;
      }
    }
  }

  normalizeRows(state.rows);
  return { level_index: levelIndex, name, gravity, fuel, oxygen, palette: PALETTES[biome], rows: state.rows, __assembly: placed };
}

/** Per-biome build config: road color, refill cadence, difficulty windows, flavor pass. */
const BIOME_BUILD_CFG = {
  void:     { roadColor: 1, refillSpacing: 30, diffRange: [[1, 3], [2, 4], [3, 5]] },
  ridge:    { roadColor: 1, refillSpacing: 25, diffRange: [[1, 3], [2, 4], [3, 5]] },
  thrill:   { roadColor: 1, refillSpacing: 35, diffRange: [[1, 3], [1, 4], [2, 4]],
    postProcess: (state, rng) => {
      for (let r = 20; r < state.rows.length - 15; r += 3) {
        if (rng() < 0.25) {
          const row = state.rows[r]; if (!row) continue;
          const cL = _findRoadLane(row, 3);
          if (cL >= 0 && row[cL] && row[cL].top_color === 0 && !row[cL].ramp && !row[cL].full && !row[cL].half)
            row[cL] = { ...row[cL], top_color: 11, bottom_color: 11, low3: 11 };
        }
      }
    } },
  core:     { roadColor: 2, refillSpacing: 28, diffRange: [[1, 3], [2, 4], [3, 5]] },
  glitch:   { roadColor: 1, refillSpacing: 25, diffRange: [[1, 3], [2, 4], [3, 5]],
    postProcess: (state, rng) => {
      for (let r = 30; r < state.rows.length - 20; r++) {
        if (rng() < 0.08) { const row = state.rows[r]; if (!row) continue;
          for (let l = 0; l < ROAD_WIDTH_LANES; l++)
            if (row[l] && row[l].top_color === 0 && !row[l].ramp && !row[l].full && !row[l].half && rng() < 0.35)
              row[l] = { ...row[l], top_color: 3, bottom_color: 3, low3: 3 };
        }
      }
    } },
  tundra:   { roadColor: 1, refillSpacing: 30, diffRange: [[1, 3], [1, 4], [2, 4]],
    postProcess: (state, rng) => {
      for (let r = 15; r < state.rows.length - 10; r++) {
        const row = state.rows[r]; if (!row) continue;
        for (let l = 0; l < ROAD_WIDTH_LANES; l++)
          if (row[l] && row[l].top_color === 0 && !row[l].ramp && !row[l].full && !row[l].half && rng() < 0.40)
            row[l] = { ...row[l], top_color: 9, bottom_color: 9, low3: 9 };
      }
    } },
  furnace:  { roadColor: 1, refillSpacing: 20, diffRange: [[1, 3], [2, 4], [3, 5]],
    postProcess: (state, rng, d) => {
      const burnChance = [0.15, 0.25, 0.35][d];
      for (let r = 20; r < state.rows.length - 15; r++) {
        const row = state.rows[r]; if (!row) continue;
        for (let l = 0; l < ROAD_WIDTH_LANES; l++)
          if (row[l] && row[l].top_color === 0 && !row[l].ramp && !row[l].full && !row[l].half && rng() < burnChance)
            row[l] = { ...row[l], top_color: 13, bottom_color: 13, low3: 13 };
      }
    } },
  shallows: { roadColor: 1, refillSpacing: 25, diffRange: [[1, 3], [2, 4], [3, 5]] },
  spire:    { roadColor: 1, refillSpacing: 30, diffRange: [[1, 3], [2, 4], [3, 5]] },
  pulse:    { roadColor: 1, refillSpacing: 28, diffRange: [[2, 4], [3, 5], [3, 5]],
    postProcess: (state, rng) => {
      for (let r = 25; r < state.rows.length - 15; r += 8) {
        if (rng() < 0.30) {
          const row = state.rows[r]; if (!row) continue;
          const cL = _findRoadLane(row, 3);
          if (cL >= 0 && row[cL] && row[cL].top_color === 0 && !row[cL].ramp && !row[cL].full && !row[cL].half)
            row[cL] = { ...row[cL], top_color: 3, bottom_color: 3, low3: 3 };
        }
      }
    } },
};

/** Generic generator: design-doc blueprint -> uniform pool picking. */
function generateFromDesignDoc(levelIndex, difficulty, seed, biome) {
  const blueprint = buildBlueprint(biome, levelIndex);
  if (!blueprint || !blueprint.slots) {
    throw new Error(`No blueprint slots for ${biome} level ${levelIndex} in world_design_docs.json`);
  }
  const cfg = BIOME_BUILD_CFG[biome] || {};
  // Per-tier target length (I/II/III): keep levels substantial with a ramp.
  const tierTarget = [220, 280, 330][difficulty] || 260;
  return buildLevelFromBlueprint({
    levelIndex, difficulty, seed, biome,
    name: `${biome.toUpperCase()} ${blueprint.tier || ''}`.trim(),
    gravity: blueprint.gravity, fuel: blueprint.fuel, oxygen: blueprint.oxygen,
    blueprint,
    targetRows: blueprint.targetRows || tierTarget,
    diffRange: (cfg.diffRange && cfg.diffRange[difficulty]) || [1, 5],
    roadColor: cfg.roadColor || 1,
    refillSpacing: cfg.refillSpacing || 30,
    postProcess: cfg.postProcess || null,
  });
}

// ---------------------------------------------------------------------------
// World 1-9: thin biome wrappers (design-doc driven). World 0/void keeps its
// bespoke Level 61 showcase inside generateVoidLevel.
// ---------------------------------------------------------------------------
function generateRidgeLevel(levelIndex, difficulty, seed)   { return generateFromDesignDoc(levelIndex, difficulty, seed, 'ridge'); }
function generateThrillLevel(levelIndex, difficulty, seed)  { return generateFromDesignDoc(levelIndex, difficulty, seed, 'thrill'); }
function generateCoreLevel(levelIndex, difficulty, seed)    { return generateFromDesignDoc(levelIndex, difficulty, seed, 'core'); }
function generateGlitchLevel(levelIndex, difficulty, seed)  { return generateFromDesignDoc(levelIndex, difficulty, seed, 'glitch'); }
function generateTundraLevel(levelIndex, difficulty, seed)  { return generateFromDesignDoc(levelIndex, difficulty, seed, 'tundra'); }
function generateFurnaceLevel(levelIndex, difficulty, seed) { return generateFromDesignDoc(levelIndex, difficulty, seed, 'furnace'); }
function generateShallowsLevel(levelIndex, difficulty, seed){ return generateFromDesignDoc(levelIndex, difficulty, seed, 'shallows'); }
function generateSpireLevel(levelIndex, difficulty, seed)   { return generateFromDesignDoc(levelIndex, difficulty, seed, 'spire'); }
function generatePulseLevel(levelIndex, difficulty, seed)   { return generateFromDesignDoc(levelIndex, difficulty, seed, 'pulse'); }


// ---------------------------------------------------------------------------
// Internal helper: find the closest road lane to a target
// ---------------------------------------------------------------------------
function _findRoadLane(row, target) {
  if (!row) return -1;
  if (row[target]) return target;
  for (let d = 1; d < ROAD_WIDTH_LANES; d++) {
    if (target - d >= 0 && row[target - d]) return target - d;
    if (target + d < ROAD_WIDTH_LANES && row[target + d]) return target + d;
  }
  return -1;
}

// ==========================================================================
// SECTION 9: MAIN BAKE RUNNER
// ==========================================================================

const WORLD_GENERATORS = [
  generateVoidLevel,    // World 0: 61-63
  generateRidgeLevel,   // World 1: 64-66
  generateThrillLevel,  // World 2: 67-69
  generateCoreLevel,    // World 3: 70-72
  generateGlitchLevel,  // World 4: 73-75
  generateTundraLevel,  // World 5: 76-78
  generateFurnaceLevel, // World 6: 79-81
  generateShallowsLevel,// World 7: 82-84
  generateSpireLevel,   // World 8: 85-87
  generatePulseLevel,   // World 9: 88-90
];

function injectCheckpoints(levelData) {
  const numRows = levelData.rows.length;
  if (numRows < 40) return; // level too short for 2 checkpoints
  
  // Decide target rows: r1 around 1/3, r2 around 2/3
  const target1 = Math.floor(numRows * 0.33);
  const target2 = Math.floor(numRows * 0.66);
  
  // Search ranges: +/- 10% of track length
  const range1Start = Math.max(10, target1 - 15);
  const range1End = Math.min(numRows - 20, target1 + 15);
  const range2Start = Math.max(range1End + 15, target2 - 15);
  const range2End = Math.min(numRows - 10, target2 + 15);
  
  function findBestRow(target) {
    let bestRow = -1;
    let minDistance = Infinity;

    // Search the entire level (excluding start and end runways)
    for (let r = 15; r < numRows - 15; r++) {
      let valid = true;
      for (let rowIdx = r; rowIdx < r + 6; rowIdx++) {
        const row = levelData.rows[rowIdx];
        if (!row) { valid = false; break; }
        
        // Checkpoints need solid ground in the main center lanes
        if (!row[2] || !row[3] || !row[4]) {
          valid = false;
          break;
        }

        for (let colIdx = 0; colIdx < 7; colIdx++) {
          const tile = row[colIdx];
          if (tile) {
            // No sloped ramps, tunnels, obstacles, or special tiles in the first pass
            const isSlopedRamp = tile.ramp && tile.startY !== tile.endY;
            if (isSlopedRamp || tile.tunnel || tile.full || tile.half ||
                tile.top_color === 11 || tile.top_color === 12 || 
                tile.top_color === 14 || tile.top_color === 10 || 
                tile.top_color === 3 || tile.bottom_color === 3 ||
                tile.bottom_color === 9 || tile.top_color === 13 || 
                tile.bottom_color === 13) {
              valid = false;
              break;
            }
          }
        }
        if (!valid) break;
      }

      if (valid) {
        const dist = Math.abs(r - target);
        if (dist < minDistance) {
          minDistance = dist;
          bestRow = r;
        }
      }
    }

    // Fallback: allow obstacles/special tiles, but strictly forbid sloped ramps and tunnels
    if (bestRow === -1) {
      minDistance = Infinity;
      for (let r = 15; r < numRows - 15; r++) {
        let valid = true;
        for (let rowIdx = r; rowIdx < r + 6; rowIdx++) {
          const row = levelData.rows[rowIdx];
          if (!row) { valid = false; break; }
          if (!row[2] || !row[3] || !row[4]) {
            valid = false;
            break;
          }
          for (let colIdx = 0; colIdx < 7; colIdx++) {
            const tile = row[colIdx];
            if (tile) {
              const isSlopedRamp = tile.ramp && tile.startY !== tile.endY;
              if (isSlopedRamp || tile.tunnel) {
                valid = false;
                break;
              }
            }
          }
          if (!valid) break;
        }

        if (valid) {
          const dist = Math.abs(r - target);
          if (dist < minDistance) {
            minDistance = dist;
            bestRow = r;
          }
        }
      }
    }

    // Ultimate fallback: just return target row
    return bestRow !== -1 ? bestRow : target;
  }
  
  const r1 = findBestRow(target1);
  const r2 = findBestRow(target2);
  
  const checkpoints = [r1, r2];
  levelData.checkpoints = [];
  
  checkpoints.forEach((r, idx) => {
    // 1. Determine baseY from the row
    let baseY = 0.0;
    let foundTile = false;
    for (let c = 0; c < 7; c++) {
      const tile = levelData.rows[r][c];
      if (tile) {
        if (tile.startY !== undefined) {
          baseY = tile.startY;
          foundTile = true;
          break;
        }
      }
    }
    if (!foundTile && r > 0) {
      for (let c = 0; c < 7; c++) {
        const tile = levelData.rows[r - 1][c];
        if (tile) {
          if (tile.startY !== undefined) {
            baseY = tile.startY;
            break;
          }
        }
      }
    }
    
    // 2. Force convert rows r to r + 5 into flat road tiles at height baseY
    for (let rowIdx = r; rowIdx < r + 6; rowIdx++) {
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        levelData.rows[rowIdx][colIdx] = {
          val: 0,
          full: false,
          half: false,
          tunnel: false,
          ramp: baseY !== 0.0,
          startY: baseY,
          endY: baseY,
          top_color: 1,
          bottom_color: 1
        };
      }
    }
    
    // 3. Mark the row itself as a checkpoint row
    levelData.rows[r].checkpoint = true;
    
    // 4. Save checkpoint metadata
    levelData.checkpoints.push({
      row: r,
      z: -r * 4.0,
      baseY: baseY
    });
  });
}

function bakeAllWorlds() {
  const args = process.argv.slice(2);
  const targetLevelIndexArg = args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1], 10) : null;

  const OUT_PATH = path.resolve('data/generated_levels.json');
  let generatedLevels = [];
  const failedIndices = []; // levels that couldn't regenerate; keep their prior version

  // Always load existing levels so we can upsert in place. This preserves any
  // out-of-range entries (e.g. the audio-generated level 91) across a full bake.
  if (fs.existsSync(OUT_PATH)) {
    try {
      generatedLevels = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    } catch (e) {
      console.warn("Could not read existing generated levels, generating from scratch instead.");
    }
  }

  console.log("Starting Build-Time Seeded Level Generation & Solver...");

  // Step 0: enrich the segment pool with custom signature set-pieces so the
  // build step has one uniform job — pick. Idempotent (strips prior custom).
  enrichSegmentPool();

  const levelsToGenerate = [];
  if (targetLevelIndexArg !== null) {
    if (targetLevelIndexArg < 61 || targetLevelIndexArg > 90) {
      console.error(`Invalid level index for baking: ${targetLevelIndexArg}. Must be in range 61-90.`);
      process.exit(1);
    }
    levelsToGenerate.push(targetLevelIndexArg);
    console.log(`Baking ONLY Level ${targetLevelIndexArg}...`);
  } else {
    for (let w = 0; w < 10; w++) {
      for (let l = 0; l < 3; l++) {
        levelsToGenerate.push(61 + w * 3 + l);
      }
    }
  }

  for (const levelIndex of levelsToGenerate) {
    const relativeIdx = levelIndex - 61;
    const w = Math.floor(relativeIdx / 3);
    const l = relativeIdx % 3;
    const biome = THEMES[w];
    const generator = WORLD_GENERATORS[w];

    console.log(`\nBaking Level ${levelIndex} (World ${w}, Theme: ${biome})...`);
    
    let seed = levelIndex * 1337;
    let attempts = 0;
    let success = false;
    let levelData = null;

    // Track the best solvable-but-sub-threshold candidate so that if no attempt
    // clears the quality bar we still emit the strongest one we found.
    let best = null; // { levelData, quality, seed }
    let qualityAttempts = 0;

    while (!success && attempts < 1000) {
      try {
        levelData = generator(levelIndex, l, seed);

        // De-pack: space out forced demands that the authored segments placed too
        // tightly, before checkpoints/solve so the quality gate scores the spaced
        // rows. (__assembly describes the pre-depack composition; the chunk audit
        // uses lengths/interfaces which de-packing leaves intact.)
        levelData.rows = depackRows(levelData.rows, { speed: SHIP_FORWARD_SPEED });

        // Inject checkpoints
        injectCheckpoints(levelData);

        // Run the static solver to verify complete traversability
        if (solveLevel(levelData)) {
          // Bucket-A reject/regenerate gate: a solvable level must also clear the
          // track-quality bar. We keep the best-scoring solvable attempt and stop
          // either on a pass or after QUALITY_MAX_ATTEMPTS solvable tries.
          qualityAttempts++;
          const quality = assessLevelQuality(levelData);
          if (!best || quality.score > best.quality.score) {
            best = { levelData, quality, seed };
          }
          if (quality.pass || qualityAttempts >= QUALITY_MAX_ATTEMPTS) {
            // Use the best attempt seen (could be this one or an earlier higher score).
            levelData = best.levelData;
            success = true;
          } else {
            seed += 17;
            attempts++;
          }
        } else {
          seed += 17;
          attempts++;
        }
      } catch (err) {
        seed += 17;
        attempts++;
      }
    }

    // Salvage: if we burned the iteration budget without reaching a pass or 6
    // solvable attempts, but DID find at least one solvable level along the way,
    // keep the best of those rather than discarding it. (Fixes levels like PULSE
    // III where most seeds don't solve, so 6 quality attempts never accumulate.)
    if (!success && best) {
      levelData = best.levelData;
      success = true;
    }

    if (success) {
      const q = best ? best.quality : null;
      if (q) {
        const verdict = q.pass ? 'PASS' : 'BEST(sub-threshold)';
        console.log(`  Quality: ${verdict} score=${q.score} after ${qualityAttempts} attempt(s)` +
          (q.topRules.length ? ` top=[${q.topRules.join(', ')}]` : ''));
      }
      seed = (best && best.seed) || seed;
      // Record FINAL placements into the cross-bake usage map (kept level only, not
      // discarded attempts) so utilization stays even and we can report coverage.
      if (Array.isArray(levelData.__assembly)) {
        for (const seg of levelData.__assembly) {
          if (seg && seg.id != null) GLOBAL_SEG_USAGE.set(seg.id, (GLOBAL_SEG_USAGE.get(seg.id) || 0) + 1);
        }
      }
      // Upsert by index: replace in place if present, otherwise insert. Keeps
      // unrelated entries (e.g. audio level 91) intact for both bake modes.
      delete levelData.__assembly; // strip internal assembly metadata before persisting
      const existingIdx = generatedLevels.findIndex(lvl => lvl.level_index === levelIndex);
      if (existingIdx >= 0) generatedLevels[existingIdx] = levelData;
      else generatedLevels.push(levelData);
      console.log(`  Level ${levelIndex} (Attempt ${attempts + 1}): PLAYABLE. Seed = ${seed}`);
    } else {
      // A single level failing to solve must NOT abort the whole bake and lose all
      // prior work before the write. Keep the existing level for this index (if one
      // was loaded), warn, and continue. Track it so the run summary is honest.
      console.error(`  Level ${levelIndex} Failed to solve playability after 1000 iterations! Keeping previous version.`);
      failedIndices.push(levelIndex);
      if (!generatedLevels.some(lvl => lvl.level_index === levelIndex)) {
        console.error(`  Level ${levelIndex} has no previous version to fall back on — it will be ABSENT from output.`);
      }
    }
  }

  if (failedIndices.length) {
    console.error(`\n⚠ ${failedIndices.length} level(s) failed to regenerate and kept their prior version: [${failedIndices.join(', ')}]`);
  }

  // Segment utilization / coverage report — surfaces uneven asset use.
  try {
    const poolIds = (getSegmentLibrary() || []).map((s) => s.id).filter((id) => id != null);
    const u = summarizeSegmentUsage(GLOBAL_SEG_USAGE, poolIds);
    console.log(`\n── Segment utilization ──`);
    console.log(`  pool ${u.poolSize} | used ${u.usedCount} | never-used ${u.neverUsed} | placements ${u.totalPlacements}`);
    console.log(`  per-asset uses: mean ${u.mean} sd ${u.sd} CV ${u.cv} max ${u.maxUses}`);
    if (u.overused.length) console.log(`  ⚠ overused (>2× mean): ${u.overused.map(([id, c]) => `${id}:${c}`).join(', ')}`);
    else console.log(`  ✓ no asset exceeds 2× the mean — utilization is even`);
    fs.writeFileSync(path.resolve('data/segment_usage_report.json'),
      JSON.stringify({ ...u, top: u.top, generatedAtRun: true }, null, 2), 'utf8');
  } catch (e) {
    console.warn('  (segment utilization report skipped:', e.message, ')');
  }

  // Write the output file (sorted by index so the pack stays ordered).
  generatedLevels.sort((a, b) => a.level_index - b.level_index);
  const outDir = path.dirname(OUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(OUT_PATH, JSON.stringify(generatedLevels, null, 2), 'utf8');
  console.log(`\nSuccessfully baked levels and saved to ${OUT_PATH}!`);
}

// ==========================================================================
// SECTION: BUCKET-D REVISE MODE
//   node worldBuilder.js --revise --level <61-90>
//        [--notes '<json array>' | --notes-file <path>] [--seeds K] [--out path]
//
// Applies the track-critic's (Bucket D) revision notes to ONE generated level by
// resampling the generator over a seed sweep and selecting the variant that
// (a) is solvable, (b) clears the Bucket-A gate, and (c) best improves the beats
// the critic flagged. It is a GUIDED RE-ROLL, not a prose-driven surgical patch:
// the generator is procedural, so the honest "revise" operation is to draw new
// variants under a fitness biased toward the critic's concern categories and keep
// the best gate-passing one. Solvability + A-pass are HARD constraints; the
// concern bias only ranks among survivors, so quality never regresses below the
// gate. Only the target level is rewritten — every other entry in the output file
// is preserved. The downstream A+C+critic re-check (tools/trackSoul.mjs / the
// track-soul workflow) decides keep / revise-again / regenerate.
// ==========================================================================

const REVISE_SEED_BASE = 9001; // explore a different seed neighbourhood than bake

function _rvMean(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }
function _rvClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function _rvCorr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = _rvMean(a.slice(0, n)), mb = _rvMean(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; num += xa * xb; da += xa * xa; db += xb * xb; }
  return da && db ? num / Math.sqrt(da * db) : 0;
}

// Map the critic's free-text revision notes onto the small set of concern
// categories the fitness can actually optimise. revisionNotes are
// [{ rows:[a,b], beatId, issue, fix }] — we read beatId + issue + fix keywords.
function classifyRevisionNotes(notes) {
  const concerns = { climax: false, breather: false, telegraph: false, arc: false };
  const text = (Array.isArray(notes) ? notes : [])
    .map((nte) => `${nte.beatId || ''} ${nte.issue || ''} ${nte.fix || ''}`.toLowerCase())
    .join(' \n ');
  if (/climax|peak|finale|set-?piece|crescendo|capstone/.test(text)) concerns.climax = true;
  if (/breather|rest|flat|valley|deepen|lull|recover|relief/.test(text)) concerns.breather = true;
  if (/telegraph|hidden|sightline|read|warning|fair|gotcha|blind|surprise/.test(text)) concerns.telegraph = true;
  if (/arc|soul|story|pacing|monoton|rhythm|cadence|build|tension/.test(text)) concerns.arc = true;
  return concerns;
}

// Revision-aware fitness. Base is the Bucket-A score (so we never trade away
// overall quality); each flagged concern adds a bounded term computed from the
// measured smoothed-intensity arc, keeping the A-score dominant.
function revisionFitness(tq, concerns) {
  const arr = ((tq.intensity && tq.intensity.smooth) || []).filter((v) => Number.isFinite(v));
  const n = arr.length;
  let bias = 0;
  if (n >= 9) {
    const peakVal = Math.max(...arr, 1e-6);
    const third = Math.floor(n / 3);
    if (concerns.climax) {
      // Reward a peak located late AND a final third that is the strongest third.
      let peakRow = 0;
      for (let i = 1; i < n; i++) if (arr[i] > arr[peakRow]) peakRow = i;
      bias += (peakRow / (n - 1)) * 14;
      const lift = _rvMean(arr.slice(2 * third)) - _rvMean(arr.slice(0, third));
      bias += _rvClamp(lift, -1, 1) * 6;
    }
    if (concerns.breather) {
      // Reward a genuine low valley in the middle third (real release).
      const mid = arr.slice(third, 2 * third);
      const minMid = mid.length ? Math.min(...mid) : peakVal;
      bias += _rvClamp(1 - minMid / peakVal, 0, 1) * 12;
    }
    if (concerns.telegraph) {
      // A-side proxy for fairness: penalise abrupt single-row intensity spikes
      // (a hazard that appears with no ramp-up reads as a gotcha). Smoother = fairer.
      let maxJump = 0;
      for (let i = 1; i < n; i++) maxJump = Math.max(maxJump, Math.abs(arr[i] - arr[i - 1]));
      bias += _rvClamp(1 - maxJump, 0, 1) * 10;
    }
    if (concerns.arc) {
      // Reward correlation with a canonical rising arc (intro → climax).
      const ramp = arr.map((_, i) => i / (n - 1));
      bias += _rvClamp(_rvCorr(arr, ramp), -1, 1) * 10;
    }
  }
  return tq.score + bias;
}

// Build one revise candidate through the exact bake pipeline (generate → de-pack
// → checkpoints → solve → assess), returning the level plus its A result and the
// full intensity-bearing trackQuality for the fitness. null on un-solvable / throw.
function buildRevisionCandidate(levelIndex, l, generator, seed) {
  let levelData;
  try {
    levelData = generator(levelIndex, l, seed);
  } catch (e) {
    return null;
  }
  levelData.rows = depackRows(levelData.rows, { speed: SHIP_FORWARD_SPEED });
  injectCheckpoints(levelData);
  if (!solveLevel(levelData)) return null;
  const quality = assessLevelQuality(levelData);
  const tq = validateTrackQuality(levelData.rows, { speed: SHIP_FORWARD_SPEED });
  return { levelData, quality, tq, seed };
}

async function reviseLevel({ levelIndex, notes = [], seeds = 16, outPath, cGate = true, cGateMax = 8 }) {
  if (!(levelIndex >= 61 && levelIndex <= 90)) {
    throw new Error(`--revise level must be in range 61-90, got ${levelIndex}`);
  }
  const OUT_PATH = path.resolve(outPath || 'data/generated_levels.json');
  enrichSegmentPool(); // signature set-pieces present, same as bake

  const relativeIdx = levelIndex - 61;
  const w = Math.floor(relativeIdx / 3);
  const l = relativeIdx % 3;
  const biome = THEMES[w];
  const generator = WORLD_GENERATORS[w];

  const concerns = classifyRevisionNotes(notes);
  const active = Object.entries(concerns).filter(([, v]) => v).map(([k]) => k);
  console.log(`Revising Level ${levelIndex} (World ${w}, ${biome}). ` +
    `Concerns: ${active.length ? active.join(', ') : 'none (plain quality re-roll)'}`);

  // Seed sweep — collect solvable + A-passing variants, rank by revision fitness.
  const survivors = [];
  let seed = levelIndex * 1337 + REVISE_SEED_BASE;
  let tried = 0, guard = 0;
  while (survivors.length < seeds && guard++ < seeds * 30) {
    const cand = buildRevisionCandidate(levelIndex, l, generator, seed);
    seed += 17;
    tried++;
    if (!cand) continue;
    if (cand.quality.failCount > 0 || cand.quality.score < QUALITY_MIN_SCORE) continue;
    cand.fitness = revisionFitness(cand.tq, concerns);
    survivors.push(cand);
  }

  if (!survivors.length) {
    console.error(`  No solvable, A-passing variant found in ${tried} seeds — level left UNCHANGED.`);
    return { changed: false, levelIndex };
  }

  survivors.sort((a, b) => b.fitness - a.fitness);

  // C-gate: A-pass + solvable is necessary but not sufficient — a high-A variant can
  // still land outside the Bucket-C difficulty band. Walk the top survivors by fitness
  // and pick the first that ALSO passes the bot, so --revise never commits a level the
  // machine gate would reject. Lazy-imported so the bake/test/import paths never load
  // the bot. Falls back to the top-fitness A-passing variant (with a warning) if none
  // of the checked survivors pass C.
  let winner = survivors[0];
  let cVerdict = null;
  if (cGate) {
    let runPlaytestAsync;
    try { ({ runPlaytestAsync } = await import('./tools/trackPlaytest.js')); }
    catch (e) { console.warn(`  (C-gate skipped — could not load bot: ${e.message})`); }
    if (runPlaytestAsync) {
      const checked = survivors.slice(0, Math.min(cGateMax, survivors.length));
      let cPass = null;
      for (const cand of checked) {
        let c;
        try { c = await runPlaytestAsync(cand.levelData, { speed: SHIP_FORWARD_SPEED }); }
        catch (e) { continue; }
        cand.cVerdict = c;
        if (c && c.solvableExpert !== false && c.verdict !== 'fail') { cPass = cand; cVerdict = c; break; }
      }
      if (cPass) {
        winner = cPass;
      } else {
        console.warn(`  ⚠ none of the top ${checked.length} survivor(s) passed Bucket C — keeping ` +
          `top-fitness A-passing variant (C verdict may be 'fail'); the loop should revise again.`);
        cVerdict = checked[0] && checked[0].cVerdict;
      }
    }
  }

  console.log(`  Picked seed ${winner.seed} from ${survivors.length} survivor(s) / ${tried} seed(s): ` +
    `A=${winner.quality.score} fitness=${winner.fitness.toFixed(1)}` +
    (cVerdict ? ` C=${cVerdict.verdict} fail=${(cVerdict.failRate * 100).toFixed(0)}%` : '') +
    (winner.quality.topRules.length ? ` top=[${winner.quality.topRules.join(', ')}]` : ''));

  const out = winner.levelData;
  if (Array.isArray(out.__assembly)) {
    for (const seg of out.__assembly) {
      if (seg && seg.id != null) GLOBAL_SEG_USAGE.set(seg.id, (GLOBAL_SEG_USAGE.get(seg.id) || 0) + 1);
    }
  }
  delete out.__assembly;

  let levels = [];
  if (fs.existsSync(OUT_PATH)) {
    try { levels = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')); } catch (e) { levels = []; }
  }
  const idx = levels.findIndex((lv) => lv.level_index === levelIndex);
  if (idx >= 0) levels[idx] = out; else levels.push(out);
  levels.sort((a, b) => a.level_index - b.level_index);
  fs.writeFileSync(OUT_PATH, JSON.stringify(levels, null, 2), 'utf8');
  console.log(`  Wrote revised Level ${levelIndex} to ${OUT_PATH}.`);
  return { changed: true, levelIndex, seed: winner.seed, score: winner.quality.score, fitness: winner.fitness,
    concerns: active, cVerdict: cVerdict ? cVerdict.verdict : null };
}

function parseReviseArgs(args) {
  const levelIndex = args.includes('--level') ? parseInt(args[args.indexOf('--level') + 1], 10) : NaN;
  let notes = [];
  if (args.includes('--notes')) {
    try { notes = JSON.parse(args[args.indexOf('--notes') + 1]); }
    catch (e) { console.error('--notes must be a JSON array of revision notes'); process.exit(1); }
  } else if (args.includes('--notes-file')) {
    const p = args[args.indexOf('--notes-file') + 1];
    const raw = JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
    // Accept a bare array OR a critic payload/verdict object carrying revisionNotes.
    notes = Array.isArray(raw) ? raw : (raw.revisionNotes || []);
  }
  if (!Array.isArray(notes)) notes = notes.revisionNotes || [];
  const seeds = args.includes('--seeds') ? parseInt(args[args.indexOf('--seeds') + 1], 10) : 16;
  const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;
  const cGate = !args.includes('--no-cgate'); // C-gate the survivors by default
  return { levelIndex, notes, seeds, outPath, cGate };
}

// Only bake when run directly (`node worldBuilder.js`); allow importing the
// solver + tile helpers (e.g. the audio-level generator reuses solveLevel).
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) {
  const argv = process.argv.slice(2);
  if (argv.includes('--revise')) {
    const opts = parseReviseArgs(argv);
    if (!(opts.levelIndex >= 61 && opts.levelIndex <= 90)) {
      console.error('Usage: node worldBuilder.js --revise --level <61-90> ' +
        '[--notes \'<json array>\' | --notes-file <path>] [--seeds K] [--out path] [--no-cgate]');
      process.exit(1);
    }
    reviseLevel(opts).catch((e) => { console.error(e); process.exit(1); });
  } else {
    bakeAllWorlds();
  }
}

export {
  solveLevel, getSegmentLibrary, assembleFromSegments,
  createRoadRow, createRampTile, createTile, createObstacle, createTunnelTile,
  createEmptyRow, createFullRow, clamp, normalizeRows, injectCheckpoints,
  generateCustomSegments, enrichSegmentPool, computeInterface,
  ShuffleBag, auditAssembly, assessLevelQuality, depackRows, summarizeSegmentUsage, reviseSegmentPlan,
  jumpSubcategory, reclassifyJumps, categoryMatches, JUMP_FAMILY, fuseJumpSegments,
  QUALITY_MIN_SCORE, QUALITY_MAX_ATTEMPTS, SHIP_FORWARD_SPEED
};
