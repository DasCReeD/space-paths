# Track-Quality Spec — operationalizing the level-design playbook

How the [racing-level-design-playbook](racing-level-design-playbook.md) becomes enforcement.
The playbook is the *rationale* (rarely loaded whole); this spec is the *contract*. Each constraint
is routed to the cheapest home that can enforce it:

- **Bucket A — code, per-level static validator** (`trackQuality.js`, runs at generation time, zero
  context cost). The bulk.
- **Bucket B — code, generator/selection architecture** (how `worldBuilder` assembles + picks chunks).
- **Bucket C — code, bot harness** (multi-persona `autoplay` metrics; the objective half of the critic).
- **Bucket D — agent** (the irreducibly subjective remainder; this list *is* the critic-agent card).

Data available to Bucket A: the 7-lane row grid (`top_color`/`bottom_color`/`full`/`half`/`tunnel`/
`ramp`, lane occupancy), `row_index × TILE_LENGTH (=4)` = Z distance, and ship forward speed
(`maxSpeedNormal`, default 32 u/s). That's enough for distance/density/sequence math; it is **not**
enough for true visual occlusion, "feel", or music — those fall to Bucket C/D.

---

## Bucket A — per-level static checks (`validateTrackQuality`)

| # | Check | Method | Notes |
|---|-------|--------|-------|
| A1 | **Lead-in spacing** | consecutive *forced* hazards ≥ `D_min = speed × T_total`; rows→units via ×4 | T_total: single ~0.5 s / choice ~0.7 s, ≥0.34 s floor |
| A2 | **Forced-demand density** | rolling window: forced demands ≤ `1/T_total` | same forced classifier as A1 |
| A3 | **Intensity metric** | per-row score = f(obstacle density, forced type, narrowing, grip), 3-row smoothed | **keystone** — A4/A6 depend on it |
| A4 | **Sawtooth / breathers** | no high-intensity run > `maxClimbRows` without a sub-threshold trough | needs A3 |
| A5 | **Mechanic cadence** | first-appearance row per behavior → thirds; ≤ `maxNewPerThird`; safe-intro (uncombined) before lethal/combined | taxonomy already in `auditLevel` |
| A6 | **Set-piece placement** | single dominant intensity peak, located in the final third | proxy for "one climax, late" |
| A7 | **Fork cap** | simultaneous open branches ≤ 3–4 at a decision row | — |
| A8 | **Grid-proxy occlusion** | no taller block/ramp/tunnel-mouth in the lead-in lane within D_min | proxy only; true occlusion → D |

## Bucket B — generator/selection architecture
- **Chunks 4–8, interface-matched, validated spine first** — *mostly already done* (`segment_library` +
  `_segmentSolvable` + `computeInterface`). Validator asserts chunk sizes + entry/exit continuity.
- **Three-beat phrase grammar** (setup→challenge→recovery) — needs segments to carry **role tags**.
- **Shuffle-bag selection** — cooldown + drought caps + template-repeat cap in the picker.

## Bucket C — bot harness (objective half of the critic loop)
Multi-persona `autoplay` runs → failure rate ∈ [15%, 55%] (target ~30–40%), near-miss 3–8/min,
time-CV ∈ [10%, 35%], monotone-in-skill, ≥3 personas. Solvable-at-expert already exists
(`_segmentSolvable`). Reject/regenerate on fail.

## Bucket D — agent card (the subjective remainder)
The critic agent loads **only this**, plus the track's data + Bucket C metrics. It does **not** load the
full playbook.
1. **Climax quality** — is the final-third peak a *memorable* set-piece (dramatically telegraphed,
   player-caused), not just a dense cluster? (A6 only checks it exists + is placed.)
2. **Telegraph fairness** — does the hazard genuinely *read* at speed (sightline/occlusion beyond the
   A8 grid proxy)? Are flagged near-deaths fair?
3. **Soul / arc** — does the track read as an authored story against its storyboard, or as noise that
   happens to pass the numeric gates?
4. **Borderline adjudication** — resolve the cases Bucket C flags but can't decide.

## Out of scope (here)
- **Danger = reserved emissive hue + silhouette contrast** → `levelLoader` material assertion + visual
  review, not a level-data check.
- **Beat-grid sync** → the separate audio-level tool, not the offline 61–90 generator.
- **Corner/race-line theory** → no corners in SkyRoads; adapted to "effective width + grip" in A3.
- **ERA / MAP-Elites generator characterization** → offline analysis tool, later.

---

## Status
**Bucket A (code, validator) — DONE**
- [x] A3 intensity metric → A1/A2/A4/A5/A6/A7 checks in `trackQuality.js` (+ 15 unit tests). Forced
  demands collapse same-type runs (a chasm/tunnel = one demand). Calibrated against
  `generated_levels.json`: scores spread 0–100, the tightly-packed procedural levels score low.
- [x] Wired into `worldBuilder` `bakeAllWorlds` as a reject/regenerate gate: `assessLevelQuality` runs
  the validator at `speed:32`, level passes only if `score≥50 && failCount===0`, retries up to 6
  attempts keeping the best solvable one. Offline-only; output JSON shape unchanged.
- [ ] A8 grid-proxy occlusion check (deferred — needs elevation lookahead)

**Bucket B (code, selection arch) — MOSTLY DONE**
- [x] Deterministic `ShuffleBag` (cooldown / drought / repeat-cap) replaces uniform picking at both
  assembly entry points (`assembleFromSegments`, `pickSegmentForSlot`).
- [x] `auditAssembly` asserts chunk sizes (4–8 soft, <4 fail) + adjacent-interface continuity; folds
  into the gate.
- [ ] Three-beat phrase grammar — **deferred (schema gap):** segments carry no `role` field. TODO in
  `worldBuilder` above `pickSegmentForSlot` describes the two routes (classify role offline via
  `computeIntensity`, or author tags in the extractor).

**Bucket C (code, bot harness) — DONE**
- [x] `tools/trackPlaytest.js` `runPlaytest`/`runPlaytestAsync(level,opts)` → 5 reaction-time personas
  over 24 seeds → `{ solvableExpert, perPersona[], failRate, nearMissPerMin, timeCV, monotoneInSkill,
  verdict, reasons[] }` (+ 7 tests). Reuses worldBuilder `solveLevel` for solvable@expert; standalone
  kinematic march otherwise (PhysicsEngine is Three-coupled). See `docs/bot-playtest.md`.
- ⚠ **Recalibration flag:** SkyRoads locks forward speed, so `timeCV` is intrinsically ~3–8 % (below
  the [10 %,35 %] band) — prime candidate to recalibrate or replace with a death-cost-weighted metric.

**Integration — runnable code half**
- [x] `tools/trackSoul.mjs` chains A + C + hard-gate per level and emits the Bucket-D critic payload
  (`{storyboard, rows, bucketA, bucketC}`). This is the seam the workflow's `// INTEGRATION:` points
  call. Verified: `node tools/trackSoul.mjs` runs A+C end-to-end; the gate correctly flags packed
  levels (regenerate) and too-easy levels (regenerate). No baked level currently reaches `needs-critic`
  — they predate the gate; regenerating through worldBuilder's gate is the next step.

**Regenerate-through-gate result (2026-06-30)**
- Backed up old levels → `data/levels_backup_20260630.7z` first. Re-baked all 30 through the active gate.
- Same-validator before/after: **avg A-score 41.7 → 66.3 (+24.6)**, structural fails **217 → 145 (−33%)**,
  16 levels improved, 0 regressed. Driven by shuffle-bag + best-of-6 + the A5 cadence fix.
- Two fixes made during this pass: (a) A5 cadence now counts only *special* mechanics (was firing on
  every level by counting base obstacle/gap); (b) bake no longer `process.exit(1)`s on one level's solve
  failure — it keeps that level's prior version and continues (L90 hit this; kept old, flagged).
- **FIXED — `B_chunk_oversized` recalibrated.** Root cause: the playbook's "4–8 *segment* chunks" means
  composed units, not grid rows; the check wrongly applied 8 to each segment's row-length, flagging
  ~51% of segments (signature set-pieces are median 30 rows by design). Fix: exempt signature segments
  from the length warn, and raise the non-signature soft-max 8→28 (just above the empirical p75≈24). Now
  fires ×2–3/level instead of ×7–15; internal scores rose to ~76.
- **FIXED — L90 salvage.** The bake only set `success` on a pass or 6 *solvable* attempts; if most seeds
  don't solve it could hit the 1000-iter cap holding a perfectly good solvable `best` and discard it.
  Now keeps that best. All 30 regenerate, none fall back to prior.
- **Final lift (recalibrated bake, same validator, old vs new):** avg A-score **41.7 → 66.7 (+25.0)**,
  structural fails **217 → 143 (−34%)**, 17 improved / 0 regressed. Clean (score≥50 & 0 fails) 4→5 —
  most levels are still blocked from "clean" by residual **A1_leadin over-packing baked into the segment
  source** (selection can't fix that; needs segment de-packing — the real next lever).

**Segment de-pack + utilization (2026-06-30) — the content fix**
- `depackRows(rows,{speed})` inserts flat breather rows wherever two consecutive *forced* demands
  (same `forcedDemand` classifier the A1 rule uses) sit closer than `D_min`. Breathers clone a
  neighbouring road row (footprint + colour preserved, hazards stripped) → can only ease, never break
  solvability. Runs in the bake before checkpoints/solve. **Result: avg A-score 41.7 → 86.1 (+44.4),
  structural fails 217 → 57 (−74%), clean levels 4 → 23/31, 26 improved / 0 regressed**, level length
  only +3%. PASS at the worldBuilder gate 5/30 → 23/30.
- **Even utilization:** `ShuffleBag` now takes a shared `GLOBAL_SEG_USAGE` map and biases each draw to
  the globally least-used eligible candidates; final (kept-level) placements are counted and a coverage
  report prints + writes `data/segment_usage_report.json`.
- **Utilization finding (honest):** no asset is hammered (max 6 uses, mean 0.59) — the bias works *within
  eligible candidates*. BUT **413 of 585 segments are never used** (CV 1.94): most of the pool never
  becomes an eligible candidate for any slot (interface/category/biome matching is too narrow). That's a
  candidate-*breadth* issue, separate from selection bias — the next lever for true asset coverage.

**Widen + multi-pass revision (2026-06-30)**
- **Group-based draw:** `pickSegmentForSlot` now hands the shuffle-bag the WHOLE eligible group (within a
  length band), not the 5 best interface fits — "need a `tag` segment → draw one from that group", with
  the adapter bridging interface gaps. Segments used 172 → 202, never-used 413 → 383, CV 1.94 → 1.72.
- **Revision pass (`reviseSegmentPlan`):** authored slots are now filled in three passes — PLAN (pick per
  slot) → REVISE (for each bad seam, examine the *previous* segment and swap it for a group alternative
  that stitches better to both neighbours; greedy, 2 sweeps, deterministic) → MATERIALIZE. This is the
  "real designer does multiple passes" model.
- **Combined result vs the original backup:** avg A-score **41.7 → 91.4 (+49.7)**, structural fails
  **217 → 43**, **clean 29/31**, 26 improved / 0 regressed. No asset over-hammered (max 7 uses, mean 0.58).

**Jump split + glue routing (2026-06-30)**
- Diagnosis corrected: dormancy was NOT unused categories — it was a monolithic 252-strong `jump`
  category (43% of the pool) with only ~10 jump slots of demand. Split `jump` → **hop / precision_jump /
  leap / gap_run** by gap shape (`jumpSubcategory`, applied on load via `reclassifyJumps`); a `jump` slot
  still matches the whole family (`categoryMatches`/`JUMP_FAMILY`). Blueprints retagged (climax jumps →
  `leap`); `hop`/`gap_run`/`precision_jump` added to the filler glue + categoryPrefs. Backup:
  `data/world_design_docs_backup_20260630.json`.
- Result: jump usage **doubled 15% → 29%**, now spread across 4 meaningful types (hop 25%, precision 23%,
  gap_run 35%, leap 41%) instead of one. Quality held (avg A 91.9, 29/30 PASS, 660 tests).
- **Honest ceiling:** total never-used barely moved (390 → 385). 252 jumps is genuine OVERSUPPLY — using
  more would mean jump-spam. The dormant majority are redundant extracted near-duplicates. Next real
  lever is TRIMMING (dedupe the jump pool), not adding demand. Max single-asset use rose 7 → 9 (a glue
  motif recurring ~1/3 of levels — arguably the desired cohesion).

**Strict no-reuse + jump fusion (2026-06-30) — attacking the oversupply from both ends**
- **Strict no-reuse:** the `ShuffleBag` global-usage bias now narrows to the *exact* least-used set (was
  a +1 band) — a segment can't be reused while a never-used alternative exists. Lifted used 200 → 262,
  never-used 385 → 323, CV 2.0 → 1.74.
- **Jump fusion (`fuseJumpSegments`, in `enrichSegmentPool`):** fuses pairs of small single-gap jumps into
  longer, D_min-bridged multi-gap segments (reclassify → `gap_run`), each validated solvable. Right-sizes
  the pool 585 → 545 and makes slot-sized segments. Idempotent (`fused:` ids stripped on re-bake).
- **Combined coverage:** segments used **29% → 49%** of the pool (172 → 267); never-used 413 → 278; CV
  **1.94 → 1.64**; no asset over-hammered (max 8). Quality held: avg A **90.8**, 662 tests.
- PASS 27/30 (2 levels at 76/84 with one residual A1; not a quality regression — A-score flat vs pre-fusion).

**Still pending (documented, not built):**
- ~278 still never-used — mostly the irreducible jump oversupply (≈210 jumps vs ≈73 jump placements) +
  rarely-requested categories (tunnel 40 segs/1 slot, obstacle_course 51/3). More fusion or trimming would
  shrink further, but diminishing returns; current spread is even (CV 1.64) and quality is high.
**Bucket-C difficulty re-check (2026-06-30) — DONE**
- Ran the multi-persona bot over all 29 generated levels: **avg failure 39.3 %** (target sweet spot),
  **0 too easy**, all monotone-in-skill + solvable@expert. De-pack/fusion did NOT overshoot. Only 5 levels
  marginally too hard (56–59 %, just over the 55 % line).
- **Fixed the `timeCV` gate bug:** it gated the verdict but is structurally ~3–8 % for this locked-speed
  game, so it failed EVERY level → trackSoul regenerated everything. Now `timeCV` is reported as an
  advisory `notes` entry, not a verdict reason. The A+C gate now discriminates: **10/29 levels graduate to
  `needs-critic`**, 19 still regenerate (5 too-hard + residual A1 fails). The pipeline runs end-to-end.

**Optional follow-ups (not owed):**
- Ease the 5 marginally-too-hard levels (or widen the failRate band to 60 %).
- **Re-check difficulty via Bucket C** — confirm the de-pack/revision easing didn't push levels below the
  failure-rate floor (too easy).
- Wire the workflow's `generate`/`revise` step → needs a `worldBuilder --revise --notes` mode (doesn't
  exist yet) + running the Workflow tool with the live track-critic loop.
- Bucket B three-beat phrase grammar (segment `role` schema gap — TODO in worldBuilder).
- Recalibrate numeric bands against real telemetry (esp. `timeCV`).

**Bucket D (agent + workflow) — BUILT & PROVEN (2026-06-30)**
- [x] `.claude/agents/track-critic.md` — critic subagent; loads only the 4-point Bucket-D card inline,
  trusts A/C as ground truth, returns structured keep/revise/regenerate verdict.
- [x] `docs/storyboard-schema.md` + `data/storyboard_example.json` (level 62, void) — the beat sheet.
- [x] **`worldBuilder.js --revise`** — the code blocker is built. `node worldBuilder.js --revise --level N
  [--notes-file <critic notes> | --notes '<json>'] [--seeds K] [--out path]`. A GUIDED RE-ROLL: it
  resamples the generator over a seed sweep and keeps the variant that (a) is solvable, (b) clears the
  Bucket-A gate, and (c) best improves the beats the critic flagged. Notes are classified into concern
  categories (`climax`/`breather`/`telegraph`/`arc` via `classifyRevisionNotes`); `revisionFitness`
  biases seed selection on the measured intensity arc while keeping the A-score dominant (solvability +
  A-pass are hard constraints, the bias only ranks survivors). Only the target level is rewritten; all
  other entries are preserved.
- [x] `.claude/workflows/track-soul.js` — **now runnable.** (re)generate → A+C (`tools/trackSoul.mjs
  --emit`) → track-critic agent → `worldBuilder --revise --notes-file` → re-assess, ≤K. Node steps run
  as subagents with Bash/Read (the Workflow sandbox has no shell). Scope `args.targets` before launching
  — it fans out subagents per level per iteration.
- [x] **`--revise` C-gates its survivors:** A-pass + solvable is necessary but not sufficient (a high-A
  variant can land outside the Bucket-C band). After ranking survivors by fitness, `reviseLevel` walks
  the top `cGateMax` (8) and picks the first that also passes the bot (`runPlaytestAsync`, lazy-imported
  so bake/test/import never load it). Falls back to top-fitness A-pass with a warning if none pass C
  (the loop then revises again). `--no-cgate` disables it.
- [x] **Loop run on the three playtested tracks (2026-06-30), committed to `data/generated_levels.json`:**
  - **L74 Z-FIGHT BEAT** — critic `revise` (peak front-loaded at 52%) → climax now at **90%**, A100, C pass.
  - **L78 STASIS DRIFT** — critic `keep` (well-arced; only an optional bimodal-peak note) → left unchanged.
  - **L79 BURN FLANK** — critic `revise` (climax/arc **fail**: peaked at 53% then 37 dead runout rows;
    matched the human "flat at the end" report) → climax now at **77%**, A96, C pass. C-gate picked a
    different seed than the first A-only winner (which was C-fail), proving the gate works.
- [x] **Erosion bug fixed in `enrichSegmentPool`:** it persisted the post-fusion pool, but
  `fuseJumpSegments` consumes the originals it fuses and the idempotent strip only restores
  `custom:`/`fused:` ids — so every bake/revise permanently shrank the committed `segment_library.json`
  (base 489 → 331 over this session's runs). Now it persists **base + custom only** (idempotent) and
  keeps the fused build pool in-memory via the cache. Library restored from HEAD to base 489; verified
  stable at 585/489 across repeated revises.
