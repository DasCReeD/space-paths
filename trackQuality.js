/**
 * trackQuality.js — static, per-level quality validator.
 *
 * Operationalizes the machine-checkable rules from the racing level-design
 * playbook (see docs/track-quality-spec.md, Bucket A). Pure data analysis over
 * the 7-lane row grid — no THREE, no DOM, no deps — so it runs at generation
 * time for ~zero cost and is trivially unit-testable. `worldBuilder` can call
 * `validateTrackQuality` to reject/regenerate weak levels; the leftover
 * subjective dimensions go to the critic agent (Bucket D), not here.
 *
 * The behavior taxonomy mirrors worldBuilder.js `auditLevel` so the two agree on
 * what a tile *is*: obstacle = full|half, tunnel = forced duck, gate = a row that
 * blocks most lanes, plus color-coded behaviors (boost 11, refill 10, sticky 3,
 * slippery 9, burning 13, super_boost 12, high_jump 14).
 */

const ROAD_WIDTH_LANES = 7;
const TILE_LENGTH = 4.0; // world units per row (Z); kept in sync with levelLoader/worldBuilder

// Mechanics whose INTRODUCTION is paced (teach→develop→twist). The base dodge/jump
// vocabulary (obstacle/lowblock/gap) is present from the first row by nature and is
// NOT a "new mechanic" to stagger — counting it made A5 fire on every level.
const CADENCE_MECHANICS = new Set(['ramp', 'tunnel', 'gate', 'boost', 'refill', 'sticky', 'slippery', 'burning', 'highjump']);

const DEFAULTS = {
  speed: 32,            // ship forward speed, units/s (physics maxSpeedNormal default)
  tTotalSingle: 0.5,    // reaction budget, single forced demand (s) — perceive+react+execute+buffer
  tTotalChoice: 0.7,    // reaction budget when the demand also needs a lane choice (s)
  densityWindowRows: 12,// rolling window for forced-demand density
  intensitySmooth: 3,   // moving-average half-window (rows) for the intensity metric
  highIntensity: 0.6,   // a row at/above this is "demanding"
  lowIntensity: 0.25,   // a row at/below this is a genuine breather/trough
  maxClimbRows: 16,     // longest demanding run allowed before a breather is required (~4 segments)
  climaxThreshold: 1.0, // smoothed intensity that counts as a set-piece peak
  maxNewMechanicsPerThird: 3,
  forkCap: 4,           // max simultaneous open branches at a decision point
};

// ── Row-level classification ────────────────────────────────────────────────

function isGapRow(row) {
  return !row || row.every((t) => t == null);
}

/** Lanes the player can actually be in on this row (not blocked by a full obstacle). */
function openLanes(row) {
  if (!row) return 0;
  let n = 0;
  for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
    const t = row[l];
    if (t && !t.full) n++; // half-height is passable (jumpable/low); full blocks the lane
  }
  return n;
}

function countFull(row) {
  if (!row) return 0;
  let n = 0;
  for (let l = 0; l < ROAD_WIDTH_LANES; l++) if (row[l] && row[l].full) n++;
  return n;
}

function rowHas(row, pred) {
  if (!row) return false;
  for (let l = 0; l < ROAD_WIDTH_LANES; l++) if (row[l] && pred(row[l])) return true;
  return false;
}

const isTunnelTile = (t) => !!t.tunnel;
const isBurning = (t) => t.top_color === 13 || t.bottom_color === 13;
const isSlippery = (t) => t.bottom_color === 9;
const isSticky = (t) => t.top_color === 3 || t.bottom_color === 3;

/**
 * A *forced* demand is something the player MUST act on (can't simply hold a
 * lane through): a gap (must jump), a tunnel row (must not jump / duck), or a
 * gate (most lanes blocked → must jump or thread a narrow opening).
 * Returns { type, choice } or null. `choice` flags demands that also require
 * picking a lane, which gets the larger reaction budget.
 */
function forcedDemand(row) {
  if (isGapRow(row)) return { type: 'gap', choice: false };
  if (rowHas(row, isTunnelTile)) return { type: 'tunnel', choice: false };
  // A gate genuinely *constricts* the road: most lanes blocked, only a narrow
  // corridor left. Three full tiles with 4 lanes still open is sparse, avoidable
  // obstacle placement — a wide berth, not a forced demand.
  const full = countFull(row);
  const open = openLanes(row);
  if (full >= 3 && open <= 3) {
    return { type: 'gate', choice: open >= 1 && open <= 3 };
  }
  return null;
}

/** The distinct gameplay "mechanics" a row introduces, for cadence analysis. */
function rowMechanics(row) {
  const out = new Set();
  if (isGapRow(row)) { out.add('gap'); return out; }
  for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
    const t = row[l];
    if (!t) continue;
    if (t.full) out.add('obstacle');
    if (t.half) out.add('lowblock');
    if (t.tunnel) out.add('tunnel');
    if (t.ramp) out.add('ramp');
    if (t.top_color === 11 || t.top_color === 12) out.add('boost');
    if (t.top_color === 10) out.add('refill');
    if (isSticky(t)) out.add('sticky');
    if (isSlippery(t)) out.add('slippery');
    if (isBurning(t)) out.add('burning');
    if (t.top_color === 14) out.add('highjump');
  }
  if (countFull(row) >= 3) out.add('gate');
  return out;
}

// ── A3. Intensity metric (the keystone) ─────────────────────────────────────

/**
 * Per-row difficulty score in roughly [0, 1.5], then smoothed. Combines obstacle
 * density, the forced-demand type, road narrowing (fewer passable lanes), and
 * grip hazards. This is a deliberately simple, transparent heuristic — it exists
 * to drive sequence-shape rules (sawtooth, climax), not to be physically exact.
 */
function computeIntensity(rows, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const baseline = ROAD_WIDTH_LANES; // 7 lanes wide when fully open
  const raw = rows.map((row) => {
    if (isGapRow(row)) return 0.5; // a gap is a moderate forced demand on its own
    let s = 0;
    s += countFull(row) * 0.15;
    const forced = forcedDemand(row);
    if (forced) s += forced.type === 'gate' ? 0.6 : forced.type === 'tunnel' ? 0.4 : 0.5;
    const narrowing = (baseline - openLanes(row)) / baseline;
    s += narrowing * 0.4;
    if (rowHas(row, isBurning)) s += 0.4;
    if (rowHas(row, isSlippery)) s += 0.3;
    if (rowHas(row, isSticky)) s += 0.2;
    return Math.min(1.5, s);
  });

  // Symmetric moving average — segment-scale shape, not per-tile spikes.
  const w = Math.max(0, o.intensitySmooth | 0);
  const smooth = raw.map((_, i) => {
    let sum = 0, n = 0;
    for (let k = -w; k <= w; k++) {
      const j = i + k;
      if (j >= 0 && j < raw.length) { sum += raw[j]; n++; }
    }
    return n ? sum / n : 0;
  });
  return { raw, smooth };
}

// ── Validator ───────────────────────────────────────────────────────────────

/**
 * Run all Bucket-A static checks over a level's rows.
 * @param {Array<Array<object|null>>} rows - the 7-lane grid
 * @param {object} [opts] - overrides for DEFAULTS (e.g. { speed })
 * @returns {{ score, intensity, metrics, violations }}
 *   violations: [{ rule, severity: 'warn'|'fail', row, detail }]
 */
function validateTrackQuality(rows, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const violations = [];
  const add = (rule, severity, row, detail) => violations.push({ rule, severity, row, detail });

  if (!Array.isArray(rows) || rows.length === 0) {
    return { score: 0, intensity: { raw: [], smooth: [] }, metrics: {}, violations: [
      { rule: 'input', severity: 'fail', row: -1, detail: 'empty level' },
    ] };
  }

  const n = rows.length;
  const rowsPerUnit = 1 / TILE_LENGTH;
  const dMinSingle = o.speed * o.tTotalSingle; // world units
  const dMinChoice = o.speed * o.tTotalChoice;
  const dMinRowsSingle = dMinSingle * rowsPerUnit;
  const dMinRowsChoice = dMinChoice * rowsPerUnit;

  const intensity = computeIntensity(rows, o);

  // Forced demands, with consecutive same-type rows collapsed into one demand:
  // a 3-row chasm is a single jump, an 8-row tunnel a single duck — not N demands
  // packed one row apart. Each entry spans [row, endRow].
  const forced = [];
  let run = null;
  for (let r = 0; r < n; r++) {
    const f = forcedDemand(rows[r]);
    if (!f) { run = null; continue; }
    if (run && run.type === f.type && r === run.endRow + 1) {
      run.endRow = r; // same demand continuing
      continue;
    }
    run = { row: r, endRow: r, type: f.type, choice: f.choice };
    forced.push(run);
  }

  // A1 — lead-in spacing: recovery room from the END of one demand to the START
  // of the next must cover the reaction budget at this ship speed.
  for (let i = 1; i < forced.length; i++) {
    const gapRows = forced[i].row - forced[i - 1].endRow;
    const need = forced[i].choice ? dMinRowsChoice : dMinRowsSingle;
    if (gapRows < need) {
      add('A1_leadin', 'fail', forced[i].row,
        `forced ${forced[i].type} only ${gapRows} rows (${(gapRows * TILE_LENGTH).toFixed(0)}u) after previous ${forced[i - 1].type}; need ≥${need.toFixed(1)} rows`);
    }
  }

  // A2 — forced-demand density over a rolling window.
  const maxPerWindow = Math.max(1, Math.floor(o.densityWindowRows / dMinRowsSingle));
  for (let r = 0; r <= n - o.densityWindowRows; r++) {
    const count = forced.filter((f) => f.row >= r && f.row < r + o.densityWindowRows).length;
    if (count > maxPerWindow) {
      add('A2_density', 'warn', r,
        `${count} forced demands in ${o.densityWindowRows} rows (max ${maxPerWindow})`);
      r += o.densityWindowRows - 1; // don't spam overlapping windows
    }
  }

  // A4 — sawtooth: no demanding run longer than maxClimbRows without a breather.
  let runStart = -1;
  let sawBreatherSince = 0;
  for (let r = 0; r < n; r++) {
    const hot = intensity.smooth[r] >= o.highIntensity;
    if (hot) {
      if (runStart < 0) runStart = r;
      if (r - runStart + 1 > o.maxClimbRows) {
        add('A4_sawtooth', 'fail', runStart,
          `demanding run ${r - runStart + 1} rows with no breather (max ${o.maxClimbRows})`);
        runStart = r; // reset so we report once per overlong run
      }
    } else {
      runStart = -1;
      if (intensity.smooth[r] <= o.lowIntensity) sawBreatherSince = r;
    }
  }
  const breatherCount = intensity.smooth.filter((v) => v <= o.lowIntensity).length;

  // A5 — mechanic cadence: first-appearance thirds + safe-intro before combined/lethal.
  const firstSeen = new Map();
  for (let r = 0; r < n; r++) {
    for (const m of rowMechanics(rows[r])) {
      if (CADENCE_MECHANICS.has(m) && !firstSeen.has(m)) firstSeen.set(m, r);
    }
  }
  const third = n / 3;
  const newPerThird = [0, 0, 0];
  for (const [m, r] of firstSeen) {
    const t = Math.min(2, Math.floor(r / third));
    newPerThird[t]++;
    // safe-intro: a hazardous mechanic's debut row shouldn't also be another forced demand
    const hazardous = ['slippery', 'sticky', 'burning', 'tunnel', 'gate'].includes(m);
    if (hazardous) {
      const f = forcedDemand(rows[r]);
      const otherHazards = rowMechanics(rows[r]).size > 1;
      if (f && f.type !== m && otherHazards) {
        add('A5_unsafe_intro', 'warn', r, `mechanic '${m}' first appears combined with a forced ${f.type}`);
      }
    }
  }
  newPerThird.forEach((c, t) => {
    if (c > o.maxNewMechanicsPerThird) {
      add('A5_cadence', 'warn', Math.round(t * third), `${c} new mechanics introduced in third ${t + 1} (max ${o.maxNewMechanicsPerThird})`);
    }
  });

  // A6 — set-piece: a single dominant intensity peak, located in the final third.
  let peakRow = 0;
  for (let r = 1; r < n; r++) if (intensity.smooth[r] > intensity.smooth[peakRow]) peakRow = r;
  const peakVal = intensity.smooth[peakRow] || 0;
  const climaxPeaks = [];
  for (let r = 0; r < n; r++) {
    if (intensity.smooth[r] >= o.climaxThreshold &&
        (r === 0 || intensity.smooth[r] >= intensity.smooth[r - 1]) &&
        (r === n - 1 || intensity.smooth[r] > intensity.smooth[r + 1])) {
      climaxPeaks.push(r);
    }
  }
  if (peakVal >= o.climaxThreshold && peakRow < 2 * third) {
    add('A6_climax_early', 'warn', peakRow, `peak intensity at row ${peakRow} is before the final third (${Math.round(2 * third)})`);
  }
  if (climaxPeaks.length > 1) {
    add('A6_multi_climax', 'warn', climaxPeaks[0], `${climaxPeaks.length} set-piece-strength peaks; a track wants one clear climax`);
  }

  // A7 — fork cap: too many simultaneous open branches reads as noise, not a choice.
  for (let r = 0; r < n; r++) {
    const open = openLanes(rows[r]);
    const forcedHere = forcedDemand(rows[r]);
    if (forcedHere && forcedHere.type === 'gate' && open > o.forkCap) {
      add('A7_forks', 'warn', r, `${open} open branches at a gate (cap ${o.forkCap})`);
    }
  }

  const failCount = violations.filter((v) => v.severity === 'fail').length;
  const warnCount = violations.length - failCount;
  const score = Math.max(0, 100 - failCount * 12 - warnCount * 4);

  return {
    score,
    intensity,
    metrics: {
      rows: n,
      forcedCount: forced.length,
      breatherCount,
      peakRow,
      peakIntensity: +peakVal.toFixed(3),
      climaxPeaks: climaxPeaks.length,
      newMechanicsPerThird: newPerThird,
      dMinRowsSingle: +dMinRowsSingle.toFixed(2),
      dMinRowsChoice: +dMinRowsChoice.toFixed(2),
    },
    violations,
  };
}

export {
  validateTrackQuality,
  computeIntensity,
  forcedDemand,
  rowMechanics,
  openLanes,
  DEFAULTS as TRACK_QUALITY_DEFAULTS,
};
