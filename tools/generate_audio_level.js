/**
 * Stage 2 of the audio→level pipeline: turn a track's analysis into a playable level.
 *
 * Reads the cached analysis (tools/audio_analysis/<track>.json) and builds a level
 * by driving the proven worldBuilder segment-stitcher PER MUSIC SECTION, then lifts
 * each section to a height tier so the track uses the vertical axis aggressively.
 *
 *   - BPM      → per-level gravity (a full jump's airtime = whole # of beats; rule 1)
 *   - sections → each section is assembled from authored library chunks chosen by a
 *                difficulty band + category set (slalom / jump / tunnel / obstacle…),
 *                giving real slalom + obstacle variety (rules 2,3,4).
 *   - section  → height TIER (rule 5): choruses ride elevated tunnels, breakdowns drop
 *                into negative-Y trenches, verses weave at ground. Tiers are joined by
 *                ramps (never block-stops), and dodge sections get one-lane gate walls.
 *   - playability is verified with worldBuilder's DFS solver (with seed retries).
 *
 * Usage:
 *   node tools/generate_audio_level.js              # auto-pick the clearest track
 *   node tools/generate_audio_level.js --track 12   # specific track number
 *   node tools/generate_audio_level.js --index 91   # target level_index (default 91)
 *   node tools/generate_audio_level.js --dry        # don't write generated_levels.json
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { solveLevel, assembleFromSegments, injectCheckpoints } from '../worldBuilder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ANALYSIS_DIR = path.join(__dirname, 'audio_analysis');
const GEN_LEVELS = path.join(ROOT, 'data', 'generated_levels.json');
const GEN_DIR = path.join(ROOT, 'data', 'generated');

// ── Engine constants (mirror physics.js) ──────────────────────────────────────
const LANES = 7;
const TILE_LENGTH = 4.0;
const REF_SPEED = 32.0;                          // default cruise speed (reference)
const ROWS_PER_SEC = REF_SPEED / TILE_LENGTH;    // = 8
const CENTER_LANE = 3;
const JUMP_IMPULSE = 10.5;
const FALL_MULT = 1.45;
const AIR_FACTOR = 1 + 1 / Math.sqrt(FALL_MULT); // total airtime = (J/g)*AIR_FACTOR

const Y_MIN = -3.0, Y_MAX = 2.2, MAX_STEP = 0.5;
const END_PAD = 14;

// behavior → top_color index (levelLoader.classifyTileBehavior)
const B = { sticky: 3, slippery: 9, refill: 10, boost: 11, super_boost: 12, burning: 13, high_jump: 14 };
const SPECIAL_COLORS = new Set([3, 9, 10, 11, 12, 13, 14]);

const r2 = (v) => Math.round(v * 100) / 100;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── tile factories ────────────────────────────────────────────────────────────
const flatRoad = () => ({ val: 0, full: false, half: false, tunnel: false, top_color: 0, bottom_color: 1, low3: 1 });
const rampTile = (startY, endY) => ({ val: 0, ramp: true, startY: r2(startY), endY: r2(endY), top_color: 0, bottom_color: 1, low3: 1, full: false, half: false, tunnel: false });
const fullWall = () => ({ val: 0, full: true, half: false, tunnel: false, top_color: 0, bottom_color: 2, low3: 2 });
const halfWall = () => ({ val: 0, full: false, half: true, tunnel: false, top_color: 0, bottom_color: 2, low3: 2 });
const floorTile = (prevH, h) => (Math.abs(h) < 0.02 && Math.abs(prevH) < 0.02) ? flatRoad() : rampTile(prevH, h);

// Lift a whole section's rows to height H (walls stay put — lifted sections are wall-free)
function liftRows(rows, H) {
  if (Math.abs(H) < 0.02) return rows;
  return rows.map(row => row.map(t => {
    if (!t) return null;
    if (t.full || t.half) return t;
    return { ...t, ramp: true, startY: r2((t.startY || 0) + H), endY: r2((t.endY || 0) + H) };
  }));
}

// ── load analysis ─────────────────────────────────────────────────────────────
function pickAnalysis(trackArg) {
  if (!fs.existsSync(ANALYSIS_DIR)) { console.error('No analysis cache. Run: node tools/analyze_audio.js'); process.exit(1); }
  const files = fs.readdirSync(ANALYSIS_DIR).filter(f => f.endsWith('.json'));
  if (!files.length) { console.error('No analysis files. Run analyze_audio.js first.'); process.exit(1); }
  const all = files.map(f => JSON.parse(fs.readFileSync(path.join(ANALYSIS_DIR, f), 'utf8')));
  if (trackArg) {
    const num = String(trackArg).padStart(2, '0');
    const hit = all.find(a => (a.file || a.name || '').startsWith(num));
    if (!hit) { console.error(`No analyzed track matching "${trackArg}"`); process.exit(1); }
    return hit;
  }
  const score = (a) => 0.45 * a.melodyProminence + 0.35 * a.bpmConfidence + 0.20 * Math.min(1, a.dynamicRange / 0.6);
  all.sort((a, b) => score(b) - score(a));
  return all[0];
}

// ── assign each section a role: mechanic, height tier, difficulty band, categories ─
function planSections(a) {
  const secs = a.sections.map((s, i) => ({ ...s, i }));
  const energies = secs.map(s => s.avgEnergy);
  const maxE = Math.max(...energies), minE = Math.min(...energies);
  const normE = (e) => (maxE > minE ? (e - minE) / (maxE - minE) : 0.5);

  for (let i = 0; i < secs.length; i++) {
    const s = secs[i];
    s.energyNorm = normE(s.avgEnergy);
    const prev = secs[i - 1];
    s.isBreakdown = !!prev && s.level === 'low' && (prev.level === 'high' || prev.level === 'mid');

    if (s.isBreakdown) {                 // sunken trench, wall-free so it lifts cleanly
      s.mechanic = 'flow'; s.tier = clamp(-2.0 - s.energyNorm * 0.8, Y_MIN, -1.2);
      s.diffBand = [1, 2]; s.categories = ['tunnel', 'jump']; s.biome = 'thrill';
    } else if (s.level === 'low') {       // ground verse: slalom + obstacle variety
      s.mechanic = 'flow'; s.tier = 0;
      s.diffBand = [2, 3]; s.categories = ['slalom', 'tunnel', 'jump', 'mixed']; s.biome = 'core';
    } else if (s.level === 'mid') {       // ground dodge: walls + one-lane gates
      s.mechanic = 'dodge'; s.tier = 0;
      s.diffBand = [3, 4]; s.categories = ['slalom', 'obstacle_course', 'narrow_passage', 'hazard_zone']; s.biome = 'core';
    } else {                             // high chorus: elevated, wall-free so it lifts
      s.mechanic = 'jump'; s.tier = clamp(1.3 + s.energyNorm * 0.9, 1.0, Y_MAX);
      s.diffBand = [3, 5]; s.categories = ['jump', 'tunnel']; s.biome = 'thrill';
    }
    s.difficulty = s.isBreakdown ? 0.12
      : clamp(0.25 + s.energyNorm * 0.5 + (s.level === 'high' ? 0.3 : s.level === 'mid' ? 0.15 : 0), 0, 1);
  }
  return secs;
}

// ── main generation ───────────────────────────────────────────────────────────
function generate(a, levelIndex, seedSalt = 0) {
  const rng = mulberry32((0xA17D10 ^ levelIndex) + seedSalt * 7919);
  const bpm = a.bpm;
  const rngInt = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));

  // gravity from BPM: pick K (beats per jump) keeping gravity in a comfortable band
  let best = null;
  for (const K of [2, 3, 4]) {
    const g = JUMP_IMPULSE * AIR_FACTOR * bpm / (K * 60);
    const cost = Math.abs(g - 10);
    if (!best || cost < best.cost) best = { K, g, cost };
  }
  const gravity = r2(best.g);
  const airtimeSec = (JUMP_IMPULSE / best.g) * AIR_FACTOR;
  const jumpRows = airtimeSec * ROWS_PER_SEC;

  const secs = planSections(a);
  const oxygen = Math.ceil(a.durationSec * 2.0);
  const fuel = Math.ceil(a.durationSec * 3.0);
  const baseSeed = levelIndex * 1337 + seedSalt * 17;

  const rows = [];
  const counters = { sections: secs.length, gates: 0, rampTransitions: 0, specials: 0 };
  const sectionStartRows = [];

  const pushRamp = (fromH, toH) => {
    const steps = Math.max(2, Math.ceil(Math.abs(toH - fromH) / MAX_STEP));
    for (let k = 1; k <= steps; k++) {
      const h = fromH + (toH - fromH) * (k / steps), ph = fromH + (toH - fromH) * ((k - 1) / steps);
      const row = new Array(LANES).fill(null);
      for (let c = 1; c <= 5; c++) row[c] = floorTile(ph, h);
      rows.push(row);
    }
    counters.rampTransitions++;
  };

  let prevTier = 0;
  for (const s of secs) {
    const target = Math.max(40, Math.round((s.endSec - s.startSec) * ROWS_PER_SEC));
    // Retry seeds until THIS section is individually solvable (flat). Concatenating
    // per-section-solvable chunks makes the whole level reliably playable.
    let sub = null;
    for (let t = 0; t < 40; t++) {
      try {
        const cand = assembleFromSegments({
          levelIndex, difficulty: 1, seed: baseSeed + s.i * 101 + t * 13, biome: s.biome, name: 'audio',
          gravity, fuel, oxygen, targetRows: target, diffRange: s.diffBand,
          categoryPrefs: s.categories, refillSpacing: 40, roadColor: 1,
        }).rows;
        if (solveLevel({ rows: cand, gravity, fuel: cand.length, oxygen: cand.length, fuelConsumptionRate: 25 })) { sub = cand; break; }
        if (!sub) sub = cand; // keep best-effort fallback
      } catch (e) { /* try next seed */ }
    }
    if (!sub) { sub = []; for (let i = 0; i < target; i++) { const row = new Array(LANES).fill(null); for (let c = 1; c <= 5; c++) row[c] = flatRoad(); sub.push(row); } }

    // slalom variety in dodge sections: alternate jump-over half-bars (always
    // clearable by jumping) and full-wall gates with the centre lane open.
    if (s.mechanic === 'dodge') {
      for (let i = 10; i < sub.length - 6; i += rngInt(12, 18)) {
        const row = new Array(LANES).fill(null);
        if (rng() < 0.5) for (let c = 1; c <= 5; c++) row[c] = halfWall();                          // jump bar
        else for (let c = 1; c <= 5; c++) row[c] = (c === CENTER_LANE) ? flatRoad() : fullWall();    // one-lane gate
        sub[i] = row; counters.gates++;
      }
    }

    const tier = s.mechanic === 'dodge' ? 0 : s.tier;
    if (Math.abs(tier - prevTier) > 0.02) pushRamp(prevTier, tier);
    prevTier = tier;

    sectionStartRows.push(rows.length);
    const lifted = s.mechanic === 'dodge' ? sub : liftRows(sub, tier);
    for (const row of lifted) rows.push(row);
  }

  if (Math.abs(prevTier) > 0.02) pushRamp(prevTier, 0);
  for (let k = 0; k < END_PAD; k++) { const row = new Array(LANES); for (let c = 0; c < LANES; c++) row[c] = flatRoad(); rows.push(row); }

  const totalRows = rows.length;

  // ── continuity repair: guarantee a navigable safe lane the whole way. Allows
  // jumpable voids (≤ ~70% of a jump's reach); carves a connecting floor through
  // wall blocks (this is what opens the one-lane gates) and over-long holes. ─────
  {
    let sc = CENTER_LANE, prevH = 0, gapRun = 0;
    const maxGap = Math.max(2, Math.floor(jumpRows * 0.7));
    for (let r = 0; r < totalRows; r++) {
      let best = -1, bestEndH = null, bestDist = 9;
      for (let c = clamp(sc - 1, 0, LANES - 1); c <= clamp(sc + 1, 0, LANES - 1); c++) {
        const t = rows[r][c];
        if (!t || t.full || t.half) continue;
        const sH = t.ramp ? t.startY : 0, eH = t.ramp ? t.endY : 0;
        const reachable = gapRun > 0 ? true : Math.abs(sH - prevH) <= MAX_STEP + 0.5;
        if (reachable) { const d = Math.abs(c - sc); if (d < bestDist) { bestDist = d; best = c; bestEndH = eH; } }
      }
      if (best >= 0) { sc = best; prevH = bestEndH; gapRun = 0; continue; }
      // no landable floor beside the safe lane. Full-wall traps get carved open;
      // voids and half-wall jump-bars are left as clearable obstacles (jumpable).
      let hasFull = false;
      for (let c = clamp(sc - 1, 0, LANES - 1); c <= clamp(sc + 1, 0, LANES - 1); c++) { const t = rows[r][c]; if (t && t.full) hasFull = true; }
      if (hasFull) { rows[r][sc] = floorTile(prevH, prevH); gapRun = 0; }
      else if (gapRun < maxGap) { gapRun++; }
      else { rows[r][sc] = floorTile(prevH, prevH); gapRun = 0; }
    }
  }

  // ── overlay refills at the start of each section (breathers) ─────────────────
  const placeSpecial = (r, beh) => {
    if (r < 5 || r >= totalRows - END_PAD) return;
    for (const c of [CENTER_LANE, 2, 4, 1, 5]) {
      const t = rows[r][c];
      if (t && !t.full && !t.half && !SPECIAL_COLORS.has(t.top_color)) {
        rows[r][c] = { ...t, top_color: B[beh], bottom_color: 10, low3: 1 };
        counters.specials++; return;
      }
    }
  };
  for (const sr of sectionStartRows) { placeSpecial(sr + 3, 'refill'); }

  // ── budget + palette + level object ─────────────────────────────────────────
  const palette = buildPalette();
  const niceName = (a.name || a.file || 'AUDIO').replace(/^\d+_/, '').replace(/_/g, ' ').toUpperCase();
  const trackNum = parseInt(a.file, 10);
  const synthwaveTrack = Number.isFinite(trackNum) ? Math.max(0, trackNum - 1) : null;

  const level = {
    level_index: levelIndex, name: niceName, gravity, fuel, oxygen, synthwaveTrack, palette, rows,
    audioMeta: {
      track: a.file, bpm, beatsPerJump: best.K, gravityFromBpm: gravity,
      airtimeSec: r2(airtimeSec), jumpRows: r2(jumpRows), refSpeed: REF_SPEED,
      totalRows, durationSec: a.durationSec, ...counters,
    },
  };

  // Inject checkpoints and runways
  injectCheckpoints(level);

  let solvable = null;
  try { solvable = solveLevel({ rows: level.rows, gravity, fuel, oxygen, fuelConsumptionRate: 25 }); }
  catch (e) { solvable = `error:${e.message}`; }

  return { level, secs, solvable, stats: { gravity, K: best.K, airtimeSec, jumpRows, totalRows, ...counters, oxygen, fuel } };
}

function buildPalette() {
  const p = Array.from({ length: 32 }, () => [128, 128, 128]);
  p[0] = [15, 0, 25]; p[1] = [40, 30, 60]; p[2] = [80, 60, 110];
  p[3] = [0, 140, 0]; p[9] = [90, 90, 100]; p[10] = [0, 128, 255];
  p[11] = [0, 255, 0]; p[12] = [0, 255, 255]; p[13] = [255, 0, 0]; p[14] = [255, 0, 255];
  return p;
}

// ── ASCII preview ─────────────────────────────────────────────────────────────
function preview(rows, fromRow, count) {
  const glyph = (c) => {
    if (!c) return ' ';
    if (c.full) return '#'; if (c.half) return 'n'; if (c.tunnel) return '=';
    switch (c.top_color) {
      case B.boost: return '>'; case B.super_boost: return '»'; case B.refill: return '+';
      case B.high_jump: return '^'; case B.sticky: return 's'; case B.slippery: return '~'; case B.burning: return 'x';
      default: return c.ramp ? '/' : '.';
    }
  };
  console.log(`\n  PREVIEW rows ${fromRow}..${fromRow + count}:`);
  for (let r = fromRow; r < Math.min(rows.length, fromRow + count); r++) {
    const ramp = rows[r].find(c => c && c.ramp);
    console.log('  ' + String(r).padEnd(6) + rows[r].map(glyph).join('') + '  y=' + (ramp ? ramp.endY.toFixed(1) : '0'));
  }
  console.log('  legend: .=road /=ramp ==tunnel #=wall n=half +=refill >=boost ^=highjump (space)=gap');
}

function main() {
  const args = process.argv.slice(2);
  const trackArg = args.includes('--track') ? args[args.indexOf('--track') + 1] : null;
  const levelIndex = args.includes('--index') ? parseInt(args[args.indexOf('--index') + 1], 10) : 91;
  const dry = args.includes('--dry');

  const a = pickAnalysis(trackArg);
  console.log(`  Track: ${a.file}  (bpm ${a.bpm}, ${a.durationSec}s, ${a.sections.length} sections, melody ${a.melodyProminence})`);

  // generate with seed retries until the DFS solver confirms it's playable
  let result = null;
  for (let salt = 0; salt < 6; salt++) {
    result = generate(a, levelIndex, salt);
    process.stdout.write(`    seed ${salt}: ${result.stats.totalRows} rows, solvable=${result.solvable}\n`);
    if (result.solvable === true) break;
  }
  const { level, secs, stats, solvable } = result;

  console.log(`\n  GENERATED "${level.name}"  level_index=${levelIndex}`);
  console.log(`    PLAYABILITY (solveLevel): ${solvable === true ? 'PASS ✅' : 'FAIL ⚠ ' + solvable}`);
  console.log(`    gravity ${stats.gravity} (jump = ${stats.K} beats, airtime ${stats.airtimeSec.toFixed(2)}s, reaches ${stats.jumpRows.toFixed(1)} rows)`);
  console.log(`    ${stats.totalRows} rows (${(stats.totalRows * TILE_LENGTH).toFixed(0)}u @ ref speed), ${stats.gates} gates, ${stats.rampTransitions} ramp transitions, ${stats.specials} specials`);
  console.log(`    oxygen ${stats.oxygen}, fuel ${stats.fuel}`);
  console.log('    sections:');
  for (const s of secs) {
    console.log(`      ${s.level.padEnd(4)}${s.isBreakdown ? '*BRK' : '    '} ${String(s.startSec).padStart(6)}-${String(s.endSec).padEnd(6)}s  ` +
      `mech ${s.mechanic.padEnd(5)} tier ${s.tier.toFixed(1)} diff ${s.difficulty.toFixed(2)} [${s.categories.join(',')}]`);
  }
  preview(level.rows, 0, 30);

  if (!fs.existsSync(GEN_DIR)) fs.mkdirSync(GEN_DIR, { recursive: true });
  const standalone = path.join(GEN_DIR, `level_audio_${(a.name || 'track').replace(/^\d+_/, '')}.json`);
  fs.writeFileSync(standalone, JSON.stringify(level));
  console.log(`\n  wrote ${path.relative(ROOT, standalone)} (${(fs.statSync(standalone).size / 1024 | 0)} KB)`);

  if (dry) { console.log('  --dry: not touching generated_levels.json'); return; }

  const pack = JSON.parse(fs.readFileSync(GEN_LEVELS, 'utf8'));
  const existing = pack.findIndex(l => l.level_index === levelIndex);
  if (existing >= 0) { pack[existing] = level; console.log(`  replaced level_index ${levelIndex}`); }
  else { pack.push(level); console.log(`  appended as entry #${pack.length}`); }
  fs.writeFileSync(GEN_LEVELS, JSON.stringify(pack));
  console.log(`  generated_levels.json now has ${pack.length} levels`);
}

main();
