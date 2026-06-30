#!/usr/bin/env node
// =============================================================================
// trackPlaytest.js — Bucket C: multi-persona bot playtest harness.
//
// The OBJECTIVE half of the level-quality critic loop (docs/track-quality-spec.md).
// Given a level's 7-lane row grid + ship params, it simulates play across several
// "reaction-time personas" and emits objective quality metrics that later feed the
// critic agent (Bucket D) and recalibrate the static validator's numeric bands.
//
// IMPORTANT: this is a HEURISTIC simulator, NOT the real game engine. It reuses the
// numeric constants and the jump/gravity model from worldBuilder.js's static solver
// (solveLevel) and the lane-picking heuristics from autoplay.js's Autopilot, then
// injects HUMAN-LIKE IMPERFECTION (reaction latency + timing jitter) to produce
// failure / near-miss / completion-time statistics. See docs/bot-playtest.md.
//
// Pure Node, no Three.js, no browser globals — runs headless and deterministic
// (seeded Mulberry32 RNG; never reads Date/now).
// =============================================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

// --- Track constants (kept in sync with worldBuilder.js / levelLoader.js) ----
const TILE_WIDTH = 2.0;
const TILE_LENGTH = 4.0;
const ROAD_WIDTH_LANES = 7;
const MAX_LEFT_X = -(TILE_WIDTH * ROAD_WIDTH_LANES) / 2;
const JUMP_IMPULSE = 10.5;        // worldBuilder JUMP_IMPULSE
const SHIP_HEIGHT = 0.4;          // solver SHIP_HEIGHT
const DEFAULT_MAX_SPEED = 32.0;   // physics.js default maxSpeedNormal
const START_SPEED = 10.0;         // solver seeds dfs at v=10

// Solver's jump/gravity scaling — we mirror these so a level the static solver
// proves completable is also clearable by our "perfect" expert bot.
const JUMP_FACTOR = 1.25;
const GRAVITY_FACTOR = 1.45;
const FALL_GRAVITY_MULT = 1.45;

// Special top_color codes (from solver):
//   13 deadly,  10 fuel,  11 boost,  12 super-boost,  3 sticky,  14 jump pad.

// --- tile helpers ------------------------------------------------------------
function tileObstacleHeight(tile) {
  if (!tile) return 0.0;
  if (tile.full && tile.half) return 3.0;
  if (tile.full) return 2.0;
  if (tile.half) return 1.0;
  return 0.0;
}
function isGap(tile) { return !tile; }
function isBlock(tile) { return !!(tile && (tile.full || tile.half) && !tile.ramp); }
function isDeadlyTop(tile) { return !!(tile && tile.top_color === 13); }
// A lane is "standable" at ground if it has a non-block, non-deadly tile.
function isStandable(tile) { return !!(tile && !isBlock(tile) && !isDeadlyTop(tile)); }

// =============================================================================
// Seeded RNG — Mulberry32 (deterministic, no Date/now).
// =============================================================================
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Gaussian-ish jitter from a uniform RNG (sum of two uniforms ~ triangular).
function jitter(rng, scale) { return (rng() + rng() - 1.0) * scale; }

// =============================================================================
// Personas — parameterized by reaction latency (s) and timing jitter (s).
// Better persona (lower index) should never do worse → monotone-in-skill check.
// =============================================================================
const PERSONAS = [
  { name: 'expert',  latency: 0.15, jitter: 0.02, missChance: 0.00 },
  { name: 'skilled', latency: 0.25, jitter: 0.05, missChance: 0.02 },
  { name: 'average', latency: 0.40, jitter: 0.10, missChance: 0.06 },
  { name: 'sloppy',  latency: 0.55, jitter: 0.18, missChance: 0.14 },
];

const NEAR_MISS_MARGIN_S = 0.12;  // cleared a hazard within this time margin = near-miss

// =============================================================================
// Lane lookahead (adapted from autoplay.js Autopilot._scanLanes/_pickLane).
// Returns, per lane, rows-until-next-hazard and whether it's clearable by a jump.
// =============================================================================
function scanLanes(rows, fromRow, lookRows, jumpClearRows, maxJumpHeight) {
  const lanes = [];
  for (let c = 0; c < ROAD_WIDTH_LANES; c++) {
    let hazardRow = -1, deadly = false, found = false;
    for (let i = 0; i < lookRows; i++) {
      const row = rows[fromRow + i];
      const tile = row ? row[c] : undefined;
      const gap = isGap(tile);
      const block = isBlock(tile);
      const deadlyTop = isDeadlyTop(tile);
      if (gap || block || deadlyTop) {
        hazardRow = i;
        // measure how long the hazard spans (a long gap/wall must be cleared in one hop)
        let span = 0;
        for (let j = i; j < lookRows; j++) {
          const t = rows[fromRow + j] ? rows[fromRow + j][c] : undefined;
          const stillGap = isGap(t), stillBlock = isBlock(t), stillDeadly = isDeadlyTop(t);
          if (gap ? !stillGap : block ? !stillBlock : !stillDeadly) break;
          span++;
        }
        // Is there a landing surface (standable ground) just past the hazard, in
        // view? If the hazard runs to the edge of our lookahead with no landing,
        // we can't commit a jump → truly deadly. A too-tall block is also deadly.
        const landIdx = i + span;
        const landTile = rows[fromRow + landIdx] ? rows[fromRow + landIdx][c] : undefined;
        const hasLanding = landIdx < lookRows && isStandable(landTile);
        const tooTall = block && tileObstacleHeight(tile) > maxJumpHeight;
        deadly = tooTall || !hasLanding;            // long-but-landable = hard, not deadly
        lanes.push({ hazardRow, deadly, tooTall, noLanding: !hasLanding, span });
        found = true;
        break;
      }
    }
    if (!found) lanes.push({ hazardRow, deadly, tooTall: false, noLanding: false, span: 0 });
  }
  return lanes;
}

function laneScore(lane) {
  if (lane.deadly) return 1000;                   // unsurvivable — avoid
  if (lane.hazardRow === -1) return 0;            // wide open — best
  // jumpable hazard: the closer it is, the worse (less runway to react/time it).
  // hazardRow 0 (right under us) is the most dangerous survivable case.
  return 1 + 1 / (lane.hazardRow + 1);
}

// pickLane (extends autoplay's): stay put if the current lane is clear; otherwise
// proactively migrate toward the safest reachable lane. `commitRows` is how soon
// the current lane's hazard arrives — if it's close and a strictly-clear lane
// exists, move now rather than gambling on a jump (matches good human play and
// the solver's preference for landable ground past blocks/walls).
function pickLane(lanes, curCol) {
  const cur = lanes[curCol];
  // Clear ahead and not about to hit anything → hold the line.
  if (cur.hazardRow === -1) return curCol;

  // Find the best lane by score, tie-broken by nearness (reachable sooner).
  let best = curCol, bestScore = laneScore(cur);
  for (let c = 0; c < lanes.length; c++) {
    const score = laneScore(lanes[c]);
    if (score < bestScore ||
        (score === bestScore && Math.abs(c - curCol) < Math.abs(best - curCol))) {
      bestScore = score; best = c;
    }
  }
  return best;
}

// =============================================================================
// Single simulated run.
//
// Kinematic model (mirrors solver, simplified to a per-row march):
//   - forward speed constant per step, nudged toward maxSpeed (+1.2/row, capped),
//     boost/sticky tiles applied like the solver.
//   - lateral lane changes take a small fixed time per lane (human reaction +
//     jitter delays the *decision*, not the ship's slew rate).
//   - jumps are ballistic under gPhys = gravity*3*GRAVITY_FACTOR with the solver's
//     impulse; we check the ballistic arc against the lane ahead for clear/crash.
//
// `solvable` = the static solver proved the level completable. When true, the
// expert (zero-jitter) bot never dies on geometry — only timing imperfection
// (latency + jitter + fumbles) produces deaths/near-misses, so failure rate is
// purely a function of persona skill. When false, the bot can hard-fail on
// unescapable geometry regardless of skill.
//
// Returns { finished, time, deaths:0|1, nearMisses, rowsCleared }.
// =============================================================================
function simulateRun(level, persona, rng, solvable = true) {
  const rows = level.rows;
  const numRows = rows.length;
  const gravity = level.gravity || 8;
  const maxSpeed = level.maxSpeedNormal || DEFAULT_MAX_SPEED;

  const gPhys = gravity * 3.0 * GRAVITY_FACTOR;
  const baseImpulse = JUMP_IMPULSE * JUMP_FACTOR;

  let col = 3;            // start centered (solver starts lane 3)
  let v = START_SPEED;
  let time = 0;
  let nearMisses = 0;

  // reaction budget: the bot only re-decides its target lane after `latency`
  // seconds have elapsed since the last decision (models human reaction time).
  let decisionCooldown = 0;
  let targetCol = col;

  for (let r = 0; r < numRows - 1; r++) {
    const curTile = rows[r] ? rows[r][col] : undefined;

    // speed update (solver model)
    if (curTile) {
      if (curTile.top_color === 12) v = Math.min(v + 15.0, 96.0);
      else if (curTile.top_color === 11) v = Math.min(v + 8.0, 60.0);
      else if (curTile.top_color === 3) v = Math.min(v, 10.0);
      else v = Math.min(v + 1.2, maxSpeed);
    }
    const dt = TILE_LENGTH / v;
    time += dt;
    decisionCooldown -= dt;

    // jump arc geometry at this speed (mirrors solver: rise under gPhys, fall
    // under the heavier gFall). The launch height (current tile) plus the solver's
    // -4 gap-crash floor set how far the ship can travel before it must land —
    // jumping off an elevated tile reaches much farther, which is how the solver
    // clears long gaps after ramps/blocks.
    const gFall = gPhys * FALL_GRAVITY_MULT;
    const tUp = baseImpulse / gPhys;
    const maxJumpHeight = (baseImpulse * baseImpulse) / (2 * gPhys);
    const launchH = tileObstacleHeight(curTile) || (curTile && curTile.ramp ? (curTile.endY || 0) : 0);
    const apexY = launchH + maxJumpHeight;
    const GAP_CRASH_FLOOR = -4.0;                 // solver: yFlight < -4 in a gap = crash
    const tDown = Math.sqrt((2 * (apexY - GAP_CRASH_FLOOR)) / gFall);
    const airTime = tUp + tDown;
    const jumpClearRows = Math.max(1, Math.floor((v * airTime) / TILE_LENGTH));
    // Look far enough to FIND the landing past a long hazard (the solver sees
    // arbitrarily far); difficulty is judged separately from span vs jumpClearRows.
    const lookRows = Math.max(jumpClearRows + 3, Math.ceil(jumpClearRows * 1.6) + 4);

    const lanes = scanLanes(rows, r, lookRows, jumpClearRows, maxJumpHeight);

    // Decide target lane only when reaction budget allows (human latency).
    if (decisionCooldown <= 0) {
      targetCol = pickLane(lanes, col);
      decisionCooldown = persona.latency + jitter(rng, persona.jitter);
    }

    // Move toward target one lane per row (ship slews); a mistimed decision can
    // leave us in a deadly lane when the hazard arrives.
    if (col < targetCol) col++;
    else if (col > targetCol) col--;

    const here = lanes[col];
    if (here.hazardRow === -1) continue;          // clear ahead in this lane
    if (here.hazardRow > 1) continue;             // hazard still far — keep marching

    // --- DEMAND POINT: a hazard is upon us in this lane. -----------------------
    // Whether it's a "deadly"-flagged trap (no easy landing) or a jumpable span,
    // it's a moment that demands precise input. We measure the hazard span and a
    // difficulty 0..1, then resolve the outcome from the persona's imperfection.
    let span = 0;
    for (let j = here.hazardRow; j < lookRows; j++) {
      const t = rows[r + j] ? rows[r + j][col] : undefined;
      if (isGap(t) || isBlock(t) || isDeadlyTop(t)) span++; else break;
    }

    // Geometry hard-fail (any persona) only when the level is NOT solver-solvable
    // AND this lane is genuinely impassable: a wall taller than any jump, or a
    // hazard with no landing surface in view. On solver-solvable levels we trust a
    // route exists, so only timing imperfection (below) causes deaths.
    if (!solvable && (here.tooTall || here.noLanding)) {
      return { finished: false, time, deaths: 1, nearMisses, rowsCleared: r };
    }

    // Difficulty: how far the demand stretches our jump range. span ≤ jumpClearRows
    // is comfortable (≈0); span well beyond it is a precision jump (→1). `deadly`
    // (tight landing) adds a difficulty floor. Range [0,1].
    const overshoot = Math.max(0, span - jumpClearRows);
    let difficulty = overshoot / Math.max(1, jumpClearRows);
    if (here.deadly) difficulty = Math.max(difficulty, 0.45);
    difficulty = Math.min(1, difficulty);

    // Outcome model. The hazard offers a tolerance window (seconds of slop the
    // player can absorb). Difficulty AND reaction latency both EAT into it — a
    // slower player has less margin, a harder demand has less to give — but latency
    // shrinks the window rather than adding a guaranteed error, so a slow player
    // still clears EASY gates reliably and only risks the hard ones (no certain
    // death-by-attrition on long levels). The random jitter is what tips a given
    // attempt over the edge. Expert (≈0 latency, 0 jitter) → essentially never fails.
    const baseWindow = (1 - 0.7 * difficulty) * NEAR_MISS_MARGIN_S + 0.04;
    const window = Math.max(0.015, baseWindow - persona.latency * 0.12 * (0.4 + difficulty));
    const timingErr = Math.abs(jitter(rng, persona.jitter));
    const fumble = rng() < persona.missChance * difficulty;

    if (fumble || timingErr > window) {
      return { finished: false, time, deaths: 1, nearMisses, rowsCleared: r };
    }
    if (timingErr > window * 0.55 || difficulty >= 0.45) nearMisses++;

    // Cleared: skip past the hazard span (landed), keep accelerating in flight.
    // An imperfect entry costs time: the player brakes/wobbles and re-settles. The
    // cost grows with latency, jitter, and difficulty — this is what spreads
    // completion times across personas and seeds, producing the time-CV metric.
    const wobbleCost = (timingErr + persona.latency * 0.5) * (0.5 + difficulty) * 3.0;
    time += span * (TILE_LENGTH / v) + wobbleCost;
    v = Math.min(v + 1.2 * span, maxSpeed);
    r += span;
  }

  return { finished: true, time, deaths: 0, nearMisses, rowsCleared: numRows - 1 };
}

// =============================================================================
// Static expert-solvability.
//
// We REUSE worldBuilder.js's proven static physics solver (`solveLevel`, exported
// at ~line 2639) as ground truth — it's the same DFS that gates level generation,
// it runs headless, and re-deriving its exact arc/landing integration in a reactive
// bot is both error-prone and out of scope. If that import is unavailable for any
// reason, we fall back to a zero-imperfection run of our own kinematic bot.
//
// NOTE: solveLevel is mutating in its fuel-injection retry; we deep-clone first.
// =============================================================================
let _solveLevel = null;
async function loadSolver() {
  if (_solveLevel) return _solveLevel;
  try {
    const wb = await import('../worldBuilder.js');
    _solveLevel = wb.solveLevel;
  } catch {
    _solveLevel = null;
  }
  return _solveLevel;
}

function solvableAtExpertSync(level, solver) {
  if (solver) {
    try { return !!solver(JSON.parse(JSON.stringify(level))); } catch { /* fall through */ }
  }
  // Fallback probe (only when the solver import failed): our own zero-imperfection
  // bot WITH geometry hard-fail enabled (solvable=false) so an impossible wall is
  // detected. This under-reports solvability vs the real DFS on tricky geometry,
  // but is a safe conservative default.
  const perfect = { name: 'perfect', latency: 0.001, jitter: 0, missChance: 0 };
  return simulateRun(level, perfect, mulberry32(1), false).finished;
}

// =============================================================================
// Aggregate stats helpers.
// =============================================================================
function mean(a) { return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
function stddev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(x => (x - m) ** 2)));
}

// =============================================================================
// Pass bands (LIVING CONSTANTS — recalibrate against real telemetry; see docs).
// =============================================================================
const BANDS = {
  // Upper bound 0.60 (not 0.55): tier-III capstones legitimately run hot (56–59%
  // failure for an expert-paced bot), and rejecting a world's hardest level for
  // being hard is wrong. Target stays ~0.30–0.40 for the bulk.
  failRate:       [0.15, 0.60],
  nearMissPerMin: [3, 8],
  timeCV:         [0.10, 0.35],   // advisory only — does not gate (locked forward speed)
};

// =============================================================================
// Main entry: runPlaytest(level, opts).
// =============================================================================
export function runPlaytest(level, opts = {}) {
  const seeds = opts.seeds || 24;
  const baseSeed = opts.seed || 12345;
  const personas = opts.personas || PERSONAS;
  // Solver may be injected (tests / pre-loaded). Otherwise use the cached import,
  // which `runPlaytestAsync`/the CLI ensure is loaded; falls back to the bot.
  const solver = opts.solver !== undefined ? opts.solver : _solveLevel;

  const solvableExpert = solvableAtExpertSync(level, solver);
  const perPersona = [];
  const allCompletionTimes = [];

  personas.forEach((persona, pIdx) => {
    let deaths = 0;
    const completionTimes = [];   // only successful runs
    let nearMissTotal = 0;
    let totalTimeMin = 0;          // minutes of sim across all runs (for near-miss/min)

    for (let s = 0; s < seeds; s++) {
      const rng = mulberry32(baseSeed + pIdx * 100003 + s * 7919);
      const run = simulateRun(level, persona, rng, solvableExpert);
      if (run.finished) {
        completionTimes.push(run.time);
        allCompletionTimes.push(run.time);
      } else {
        deaths++;
      }
      nearMissTotal += run.nearMisses;
      totalTimeMin += run.time / 60;
    }

    const attempts = seeds;
    const failRate = deaths / attempts;
    const completionTime = completionTimes.length ? mean(completionTimes) : null;
    const nearMissesPerMin = totalTimeMin > 0 ? nearMissTotal / totalTimeMin : 0;

    perPersona.push({
      name: persona.name,
      deaths,
      attempts,
      failRate,
      completionTime,
      nearMissesPerMin,
    });
  });

  // Aggregate fail rate / near-miss across personas (mean of per-persona).
  const failRate = mean(perPersona.map(p => p.failRate));
  const nearMissPerMin = mean(perPersona.map(p => p.nearMissesPerMin));

  // time-CV: coefficient of variation of completion time across all successful
  // runs (personas × seeds). Captures how much skill/luck spreads finish time.
  const timeCV = allCompletionTimes.length >= 2
    ? stddev(allCompletionTimes) / mean(allCompletionTimes)
    : 0;

  // monotone-in-skill: a better persona must not have a *higher* fail rate than a
  // worse one (allow a tiny epsilon for sampling noise).
  let monotoneInSkill = true;
  for (let i = 1; i < perPersona.length; i++) {
    if (perPersona[i].failRate + 1e-9 < perPersona[i - 1].failRate) {
      monotoneInSkill = false; break;
    }
  }

  // Verdict. NOTE: timeCV does NOT gate the verdict. SkyRoads locks forward speed,
  // so completion-time variance is structurally tiny (~3–8%) and always below the
  // generic band — gating on it would fail every level. It's kept as a reported
  // metric + advisory note only. (See docs/bot-playtest.md / track-quality-spec.md.)
  const reasons = [];
  if (!solvableExpert) reasons.push('not solvable at expert');
  if (failRate < BANDS.failRate[0]) reasons.push(`fail rate ${(failRate * 100).toFixed(0)}% too low (<${BANDS.failRate[0] * 100}%) — too easy`);
  if (failRate > BANDS.failRate[1]) reasons.push(`fail rate ${(failRate * 100).toFixed(0)}% too high (>${BANDS.failRate[1] * 100}%) — too hard`);
  if (nearMissPerMin < BANDS.nearMissPerMin[0]) reasons.push(`near-miss ${nearMissPerMin.toFixed(1)}/min too low (<${BANDS.nearMissPerMin[0]})`);
  if (nearMissPerMin > BANDS.nearMissPerMin[1]) reasons.push(`near-miss ${nearMissPerMin.toFixed(1)}/min too high (>${BANDS.nearMissPerMin[1]})`);
  if (!monotoneInSkill) reasons.push('not monotone in skill (a better persona died more)');

  const notes = [];
  if (timeCV < BANDS.timeCV[0]) notes.push(`time-CV ${(timeCV * 100).toFixed(0)}% (advisory: intrinsically low — locked forward speed)`);
  if (timeCV > BANDS.timeCV[1]) notes.push(`time-CV ${(timeCV * 100).toFixed(0)}% high (advisory)`);

  const verdict = reasons.length === 0 ? 'pass' : 'fail';

  return {
    solvableExpert,
    perPersona,
    failRate,
    nearMissPerMin,
    timeCV,
    monotoneInSkill,
    verdict,
    reasons,
    notes,
  };
}

// Async wrapper that guarantees the real static solver is loaded before running,
// so `solvableExpert` uses worldBuilder's proven DFS rather than the bot fallback.
export async function runPlaytestAsync(level, opts = {}) {
  const solver = await loadSolver();
  return runPlaytest(level, { ...opts, solver });
}

// =============================================================================
// CLI — node tools/trackPlaytest.js [--level N]
// Prints a readable table for sample levels from generated_levels.json.
// =============================================================================
function fmtPct(x) { return (x * 100).toFixed(0).padStart(3) + '%'; }
function fmtNum(x, d = 1) { return x == null ? '  -  ' : x.toFixed(d); }

function printReport(level, report) {
  console.log(`\n=== Level ${level.level_index ?? '?'} — ${level.name || 'unnamed'} `
    + `(gravity ${level.gravity}, ${level.rows.length} rows) ===`);
  console.log(`  solvable@expert: ${report.solvableExpert}   verdict: ${report.verdict.toUpperCase()}`);
  console.log('  persona   deaths/att  fail%   compTime  nearMiss/min');
  for (const p of report.perPersona) {
    console.log(`  ${p.name.padEnd(8)}  ${String(p.deaths).padStart(3)}/${String(p.attempts).padEnd(3)}   `
      + `${fmtPct(p.failRate)}   ${fmtNum(p.completionTime, 2).padStart(7)}s   ${fmtNum(p.nearMissesPerMin)}`);
  }
  console.log(`  aggregate: failRate ${fmtPct(report.failRate)}  nearMiss ${fmtNum(report.nearMissPerMin)}/min  `
    + `timeCV ${fmtPct(report.timeCV)}  monotone ${report.monotoneInSkill}`);
  if (report.reasons.length) console.log(`  reasons: ${report.reasons.join('; ')}`);
}

function loadGeneratedLevels() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const p = path.resolve(here, '..', 'data', 'generated_levels.json');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function main() {
  const args = process.argv.slice(2);
  let levelArg = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--level') levelArg = parseInt(args[i + 1], 10);
  }
  const levels = loadGeneratedLevels();
  let sample;
  if (levelArg != null) {
    const l = levels.find(x => x.level_index === levelArg);
    if (!l) { console.error(`Level ${levelArg} not found.`); process.exit(1); }
    sample = [l];
  } else {
    // a readable spread across the procedural range
    const wanted = [61, 65, 70, 75, 80, 85, 90];
    sample = wanted.map(n => levels.find(x => x.level_index === n)).filter(Boolean);
    if (sample.length === 0) sample = levels.slice(0, 5);
  }
  await loadSolver();
  for (const level of sample) {
    printReport(level, runPlaytest(level));
  }
}

const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main();

export { PERSONAS, BANDS, simulateRun, solvableAtExpertSync, loadSolver, mulberry32 };
