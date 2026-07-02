// track-soul.js — Workflow-tool script that runs the SkyRoads Bucket-D critic loop.
//
// Pipeline (per docs/track-quality-spec.md):
//   (re)generate -> validateTrackQuality (Bucket A) + bot playtest (Bucket C)
//             -> track-critic agent (Bucket D) -> revise -> repeat (up to K)
//
// The Node steps are OFFLINE CLIs, so each is run by a subagent that has Bash/Read
// (the Workflow sandbox itself has no shell/fs). The critic step is the one genuine
// judgement spawn. All commands assume CWD = repo root.
//
// COST: this fans out subagents per level per iteration (generate + A/C + critic,
// up to K iterations). Scope `args.targets` to the few levels you actually want
// reviewed before launching — do not run all 30 unless you mean to.

export const meta = {
  name: 'track-soul',
  description: 'Per-track Bucket-D critic loop for generated SkyRoads levels 61-90: (re)generate geometry, run Bucket-A static validation + Bucket-C bot playtest, spawn the track-critic for the subjective review, then apply its notes via worldBuilder --revise and repeat up to K times until the critic says keep (or regenerate).',
  phases: [
    { title: 'assess' },
    { title: 'critic' },
    { title: 'revise' },
  ],
};

// Tunables. `args.targets` overrides the default set; `K` caps revise iterations per track.
const K = (args && args.K) || 2;
const DEFAULT_TARGETS = (args && args.targets && args.targets.length) ? args.targets : [74];

const OUT = 'data/generated_levels.json';
const results = [];

// Pull the structured object an agent was asked to return as raw JSON. Agents may wrap
// it in prose or a ```json fence; be defensive.
function parseJson(text, label) {
  if (text == null) return null;
  if (typeof text === 'object') return text;
  const fence = String(text).match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1] : String(text);
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end < 0) { log(`parseJson(${label}): no JSON object found`); return null; }
  try { return JSON.parse(body.slice(start, end + 1)); } catch (e) { log(`parseJson(${label}): ${e.message}`); return null; }
}

for (const levelIndex of DEFAULT_TARGETS) {
  log(`=== track ${levelIndex} ===`);
  let verdict = null, critique = null, lastAssess = null;

  for (let iter = 0; iter < K; iter++) {
    log(`track ${levelIndex} — iteration ${iter + 1}/${K}`);

    // --- Phase: assess (run Bucket A + C and emit the critic payload) ----------------------
    // tools/trackSoul.mjs reads the already-baked level from data/generated_levels.json, runs
    // validateTrackQuality (A) + runPlaytestAsync (C), prints the machine verdict, and with
    // --emit writes the full critic payload to data/critic-payloads/<levelIndex>.json.
    phase('assess');
    const assessRaw = await agent(
      `Run the SkyRoads machine gate (Bucket A + C) for level ${levelIndex} and return the payload.\n` +
      `1. From the repo root, run exactly:  node tools/trackSoul.mjs --level ${levelIndex} --emit\n` +
      `2. Read the file it wrote: data/critic-payloads/${levelIndex}.json\n` +
      `3. That file is { levelIndex, storyboard, rows, bucketA, bucketC }. The rows array is large; ` +
      `do NOT echo it. Return ONLY a compact JSON object: ` +
      `{ "levelIndex": ${levelIndex}, "bucketA": { "score": <n>, "violations": <bucketA.violations array> }, ` +
      `"bucketC": { "solvableExpert": <bool>, "verdict": "<str>", "failRate": <n>, "nearMissPerMin": <n>, ` +
      `"monotoneInSkill": <bool>, "reasons": <array> }, "payloadPath": "data/critic-payloads/${levelIndex}.json" }`,
      { label: `assess-${levelIndex}-iter${iter + 1}`, phase: 'assess' },
    );
    const assess = parseJson(assessRaw, `assess-${levelIndex}`);
    lastAssess = assess;
    if (!assess || !assess.bucketA || !assess.bucketC) {
      log(`track ${levelIndex} iter ${iter + 1}: assess failed to parse — aborting this track`);
      verdict = 'error';
      break;
    }

    // --- Hard-gate short-circuit: A/C objective reject skips the expensive critic. ----------
    const hardFail =
      (Array.isArray(assess.bucketA.violations) && assess.bucketA.violations.some((v) => v.severity === 'fail')) ||
      assess.bucketC.solvableExpert === false || assess.bucketC.verdict === 'fail';
    if (hardFail) {
      log(`track ${levelIndex} iter ${iter + 1}: hard gate (A/C) failed -> regenerate`);
      verdict = 'regenerate';
      // Regenerate fresh (no notes) and re-assess next iteration.
      await agent(
        `Regenerate SkyRoads level ${levelIndex} fresh. From the repo root run exactly:\n` +
        `  node worldBuilder.js --level ${levelIndex}\n` +
        `(this re-bakes only that level into ${OUT}). Return the single line the command prints that ` +
        `starts with "  Level ${levelIndex}". Nothing else.`,
        { label: `regenerate-${levelIndex}-iter${iter + 1}`, phase: 'revise' },
      );
      continue;
    }

    // --- Phase: critic (the one genuine judgement spawn) ------------------------------------
    // The custom 'track-critic' agentType may not be registered; drive a general agent with the
    // rubric file instead. Either way it loads ONLY .claude/agents/track-critic.md + the payload.
    phase('critic');
    const critiqueRaw = await agent(
      `You are the SkyRoads track-critic (Bucket-D subjective reviewer). Adopt that role exactly.\n` +
      `STEP 1: Read your rubric + output contract: .claude/agents/track-critic.md (follow it verbatim; ` +
      `judge ONLY climax quality, telegraph fairness, soul/arc, borderline adjudication — do NOT recompute ` +
      `spacing/density/cadence/solvability).\n` +
      `STEP 2: Read your input payload (large — do not echo it): ${assess.payloadPath}\n` +
      `It is { levelIndex, storyboard, rows, bucketA, bucketC }. If storyboard is null, judge soul/arc ` +
      `against the canonical intro->teach->rising->breather->signature->climax->resolution shape and the ` +
      `measured bucketA.intensity.smooth array; say so. rowIndex*4 = Z units; ship ~= 8 rows/sec.\n` +
      `STEP 3: Return EXACTLY the rubric's JSON output contract ` +
      `({ levelIndex, dimensions, revisionNotes, overall, summary }) and NOTHING else. Make every ` +
      `revisionNotes entry concrete and row-tied so worldBuilder.js --revise can act on it.`,
      { label: `critic-${levelIndex}-iter${iter + 1}`, phase: 'critic' },
    );
    critique = parseJson(critiqueRaw, `critic-${levelIndex}`);
    verdict = critique && critique.overall; // 'keep' | 'revise' | 'regenerate'
    log(`track ${levelIndex} iter ${iter + 1}: critic verdict = ${verdict}`);

    if (verdict === 'keep') break;
    if (verdict !== 'revise' && verdict !== 'regenerate') {
      log(`track ${levelIndex} iter ${iter + 1}: unrecognised verdict '${verdict}' — stopping track`);
      break;
    }

    // --- Phase: revise (apply the critic's notes via the offline generator) -----------------
    // verdict 'revise'  -> worldBuilder --revise --notes-file <notes> (guided re-roll toward the notes)
    // verdict 'regenerate' -> worldBuilder --level (fresh bake, no notes)
    phase('revise');
    if (verdict === 'revise') {
      await agent(
        `Apply the track-critic's revision notes to SkyRoads level ${levelIndex}.\n` +
        `1. Write this JSON array to scratch/revise_notes_${levelIndex}.json (create scratch/ if needed):\n` +
        `${JSON.stringify(critique.revisionNotes || [])}\n` +
        `2. From the repo root run exactly:\n` +
        `  node worldBuilder.js --revise --level ${levelIndex} --notes-file scratch/revise_notes_${levelIndex}.json --seeds 16 --out ${OUT}\n` +
        `Return the single "  Picked seed ..." line the command prints. Nothing else.`,
        { label: `revise-${levelIndex}-iter${iter + 1}`, phase: 'revise' },
      );
    } else { // regenerate
      await agent(
        `Regenerate SkyRoads level ${levelIndex} fresh. From the repo root run exactly:\n` +
        `  node worldBuilder.js --level ${levelIndex}\n` +
        `Return the single line that starts with "  Level ${levelIndex}". Nothing else.`,
        { label: `regenerate-${levelIndex}-iter${iter + 1}`, phase: 'revise' },
      );
    }
    // Loop: next iteration re-assesses (A+C) the freshly written level and re-judges.
  }

  results.push({ levelIndex, verdict, critique, lastAssess });
  if (verdict !== 'keep') {
    log(`track ${levelIndex}: ended on '${verdict}' after <=${K} iterations — flag for human review`);
  }
}

const kept = results.filter((r) => r.verdict === 'keep').map((r) => r.levelIndex);
const needsReview = results.filter((r) => r.verdict !== 'keep');
log(`done. kept: [${kept.join(', ')}]; needs review: [${needsReview.map((r) => r.levelIndex).join(', ')}]`);
return { kept, needsReview, results };
