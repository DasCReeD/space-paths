/**
 * trackSoul.mjs — runnable orchestrator for the CODE half of the track-quality pipeline.
 *
 * Chains Bucket A (static validator) + Bucket C (bot playtest) over an already-baked level and
 * applies the objective hard-gate, then emits the payload the Bucket-D track-critic consumes. This
 * is the concrete seam the `.claude/workflows/track-soul.js` workflow's `// INTEGRATION:` points
 * call — the LLM critic loop runs on top of this, it does not replace it.
 *
 * It does NOT generate geometry: generation is `worldBuilder.js` (offline CLI) which already runs
 * the same Bucket-A gate during bake. This reads the baked result and runs the full A+C assessment
 * + emits critic payloads for tracks that clear the machine gates but still want a soul review.
 *
 * Usage:
 *   node tools/trackSoul.mjs                 # assess a sample of generated levels
 *   node tools/trackSoul.mjs --level 70      # assess one level by level_index
 *   node tools/trackSoul.mjs --all           # assess every generated level
 *   node tools/trackSoul.mjs --level 70 --emit   # also write the critic payload JSON
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateTrackQuality } from '../trackQuality.js';
import { runPlaytestAsync } from './trackPlaytest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHIP_SPEED = 32;

function loadLevels() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/generated_levels.json'), 'utf8'));
  return Array.isArray(raw) ? raw : Object.values(raw)[0];
}

function loadStoryboard(levelIndex) {
  // Authored beat sheet, if one exists (docs/storyboard-schema.md). Optional.
  const p = path.join(ROOT, 'data/storyboards', `${levelIndex}.json`);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  return null;
}

/**
 * Run the objective half (A + C) and decide the machine verdict.
 * @returns {{ levelIndex, name, bucketA, bucketC, hardFail, machineVerdict, payload }}
 */
export async function assess(level, opts = {}) {
  const speed = opts.speed || SHIP_SPEED;
  const bucketA = validateTrackQuality(level.rows, { speed });
  const bucketC = await runPlaytestAsync(level, { speed });

  const aFail = bucketA.violations.some((v) => v.severity === 'fail') || bucketA.score < 50;
  const cFail = bucketC.solvableExpert === false || bucketC.verdict === 'fail';
  const hardFail = aFail || cFail;

  // The track-critic's input contract (.claude/agents/track-critic.md): storyboard + rows + A + C.
  const payload = {
    levelIndex: level.level_index,
    storyboard: loadStoryboard(level.level_index),
    rows: level.rows,
    bucketA,
    bucketC,
  };

  return {
    levelIndex: level.level_index,
    name: level.name,
    bucketA,
    bucketC,
    hardFail,
    // machine verdict: a hard fail goes back to the generator; otherwise it graduates to the
    // subjective Bucket-D critic (the machine can't decide "soul").
    machineVerdict: hardFail ? 'regenerate' : 'needs-critic',
    payload,
  };
}

function fmt(r) {
  const a = r.bucketA, c = r.bucketC;
  const topA = a.violations.length
    ? Object.entries(a.violations.reduce((m, v) => ((m[v.rule] = (m[v.rule] || 0) + 1), m), {}))
        .map(([k, n]) => `${k}×${n}`).join(' ')
    : '—';
  return [
    `L${String(r.levelIndex).padStart(2)} ${String(r.name || '').slice(0, 18).padEnd(18)}`,
    `A:score ${String(a.score).padStart(3)} peak@${a.metrics.peakRow}`,
    `C:solv ${c.solvableExpert ? 'Y' : 'N'} fail ${(c.failRate * 100).toFixed(0)}% nm ${c.nearMissPerMin.toFixed(1)} mono ${c.monotoneInSkill ? 'Y' : 'N'}`,
    `=> ${r.machineVerdict.toUpperCase()}`,
    topA !== '—' ? `[${topA}]` : '',
  ].join('  ');
}

async function main() {
  const args = process.argv.slice(2);
  const levelArg = args.includes('--level') ? Number(args[args.indexOf('--level') + 1]) : null;
  const emit = args.includes('--emit');
  const all = args.includes('--all');

  const levels = loadLevels();
  let pick;
  if (levelArg != null) pick = levels.filter((l) => l.level_index === levelArg);
  else if (all) pick = levels;
  else pick = levels.slice(0, 8); // a sample

  const out = [];
  for (const lvl of pick) {
    if (!lvl.rows) continue;
    const r = await assess(lvl);
    out.push(r);
    console.log(fmt(r));
    if (emit) {
      const dir = path.join(ROOT, 'data/critic-payloads');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${r.levelIndex}.json`), JSON.stringify(r.payload, null, 2));
    }
  }

  const regen = out.filter((r) => r.machineVerdict === 'regenerate').map((r) => r.levelIndex);
  const critic = out.filter((r) => r.machineVerdict === 'needs-critic').map((r) => r.levelIndex);
  console.log(`\nmachine gate → regenerate: [${regen.join(', ')}]  |  needs-critic: [${critic.join(', ')}]`);
  if (emit) console.log(`critic payloads written to data/critic-payloads/`);
}

// Run as CLI only (keep the named export clean for importers/tests).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
