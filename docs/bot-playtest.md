# Bot playtest harness (Bucket C)

`tools/trackPlaytest.js` is the **objective half of the level-quality critic loop**
(see `docs/track-quality-spec.md`, Bucket C). Given a level's 7-lane row grid and
ship parameters, it simulates play across several reaction-time **personas** and
emits objective metrics — failure rate, near-miss rate, completion-time spread,
monotonicity-in-skill, and solvable-at-expert. These feed the critic agent
(Bucket D) and are meant to recalibrate the static validator's numeric bands
(Bucket A).

> **This is a heuristic simulator, not the real game engine.** It approximates
> SkyRoads physics well enough to rank levels by difficulty and surface outliers.
> It is NOT a substitute for real telemetry. The numeric pass-bands below are
> **living constants** — recalibrate them against real player data.

## Running it

```bash
node tools/trackPlaytest.js              # prints a table for levels 61,65,70,75,80,85,90
node tools/trackPlaytest.js --level 70   # a single level

npx vitest run tests/trackPlaytest.test.js   # the harness unit tests
```

Programmatic:

```js
import { runPlaytestAsync } from './tools/trackPlaytest.js';
const report = await runPlaytestAsync(level, { seeds: 24 });
// runPlaytestAsync loads worldBuilder's real solver first (for solvable@expert).
// runPlaytest(level, opts) is the synchronous core; pass opts.solver to inject one.
```

`runPlaytest` is **deterministic** — all randomness comes from a seeded Mulberry32
RNG (`opts.seed`, default 12345); it never reads `Date`/`now`.

## Report shape

```
{
  solvableExpert: boolean,           // can a perfect player finish? (see below)
  perPersona: [{ name, deaths, attempts, failRate, completionTime, nearMissesPerMin }],
  failRate: number,                  // mean per-persona failure rate
  nearMissPerMin: number,            // mean per-persona near-misses per minute
  timeCV: number,                    // coeff. of variation of completion time across all successful runs
  monotoneInSkill: boolean,          // a better persona never fails MORE than a worse one
  verdict: 'pass' | 'fail',
  reasons: string[]                  // why it failed, if it did
}
```

## Personas

Each persona is parameterized by **reaction latency** (seconds before it can
re-decide its lane / commit a jump) and **timing jitter** (random spread on each
demand), plus a small fumble chance on hard demands. Better persona ⇒ never a
worse outcome (the monotone-in-skill invariant).

| Persona  | Latency | Jitter | Fumble | Intuition |
|----------|---------|--------|--------|-----------|
| expert   | 0.15 s  | 0.02 s | 0 %    | frame-perfect, essentially never misses |
| skilled  | 0.25 s  | 0.05 s | 2 %    | strong player |
| average  | 0.40 s  | 0.10 s | 6 %    | typical player |
| sloppy   | 0.55 s  | 0.18 s | 14 %   | struggles with tight sections |

Each persona is run over many seeds (default 24); a death anywhere ends that run.

## Metric definitions

- **solvableExpert** — delegated to worldBuilder's proven static solver
  (`solveLevel`, the same DFS that gates level generation), deep-cloning the level
  first because the solver mutates (fuel injection). If that import is unavailable,
  it falls back to a conservative zero-imperfection run of the harness's own bot.
- **deaths / failRate** — a run dies on: collision with a too-tall wall, a hazard
  with no landing in view (only when the level is *not* solver-solvable), or a
  mistimed/fumbled jump (timing error exceeds the hazard's tolerance window).
  `failRate = deaths / attempts`, reported per persona and as the per-persona mean.
- **nearMissesPerMin** — a hazard cleared with little margin (large timing error
  relative to the window, or an intrinsically hard demand). Normalized to the total
  simulated minutes for that persona.
- **timeCV** — coefficient of variation (stddev/mean) of completion time across all
  *successful* runs (personas × seeds). Captures how much skill/luck spreads finish
  time. **Note:** SkyRoads locks forward speed (`maxSpeedNormal`), so completion
  time is intrinsically low-variance here — see the caveat below.
- **monotoneInSkill** — true iff no better persona has a strictly higher failure
  rate than a worse one (small epsilon for sampling noise).

## Pass bands (LIVING CONSTANTS)

From the spec, encoded in `BANDS`:

| Metric        | Band            | Target |
|---------------|-----------------|--------|
| failRate      | [15 %, 55 %]    | ~30–40 % |
| nearMissPerMin| [3, 8]          | — |
| timeCV        | [10 %, 35 %]    | — |
| monotone-in-skill | true        | — |
| solvable@expert   | true        | — |

A level **passes** only if every band is satisfied; otherwise `verdict='fail'` and
`reasons[]` lists each violation.

## What it reuses vs. reimplements

- **Reused (read-only, not modified):**
  - `worldBuilder.js` `solveLevel` — for `solvableExpert` (ground truth).
  - The jump/gravity constants from `worldBuilder.js`'s solver: `JUMP_IMPULSE`,
    the `jumpFactor 1.25` / `gravityFactor 1.45` / `fallGravityMultiplier 1.45`
    scaling, `gPhys = gravity*3*1.45`, and the −4 gap-crash floor.
  - The lane-scan / lane-pick heuristics from `autoplay.js`'s `Autopilot`
    (`_scanLanes` / `_pickLane`), adapted and extended (distance-weighted scoring,
    proactive migration to clear lanes, landing-surface detection).
  - Track constants (`TILE_WIDTH 2.0`, `TILE_LENGTH 4.0`, 7 lanes) and ship speed
    (`maxSpeedNormal`, default 32) from `levelLoader.js` / `physics.js`.
- **Reimplemented (standalone, headless):** a minimal per-row kinematic march —
  constant forward speed (nudged toward `maxSpeed`, with boost/sticky tiles),
  one-lane-per-row lateral slew gated by reaction latency, and a ballistic jump-range
  estimate. `PhysicsEngine` is Three-coupled and not used.

## What it approximates vs. the real physics (honest caveats)

- **Forward march, not continuous integration.** The real solver integrates the
  jump arc per row with precise landing detection on elevated surfaces; the bot uses
  a closed-form jump-range estimate (apex height + the −4 crash floor). It can
  mis-rank jumps that land on tall elevated tiles. For the *completability* boolean
  we therefore defer to the real solver rather than the bot.
- **No fuel / oxygen.** The bot ignores fuel and oxygen budgets (the static solver
  models them). Levels that are only "hard" because of fuel starvation will read as
  easier than they play.
- **No tunnel ceilings.** Like `autoplay.js`, the bot ignores tunnel ceiling
  collisions (the row grid carries no ceiling data); it won't penalize forced ducks.
- **Locked forward speed ⇒ low time-CV.** SkyRoads pins forward speed, so completion
  time barely varies between players. The harness adds a small per-demand "wobble"
  time cost so the metric isn't identically zero, but **time-CV will typically read
  below the spec's [10 %, 35 %] band for this game.** Treat that band as the prime
  candidate for recalibration (or replacement with a death-cost-weighted time
  metric) once real telemetry exists.
- **Imperfection is a model, not a measurement.** Latency/jitter/fumble values and
  the demand tolerance window are hand-tuned so that, on the procedural 61–90 set,
  failure rates spread across personas and rank levels plausibly. They are not
  validated against humans — that is the recalibration step.

## Example: procedural levels 61–90 (current calibration)

Running the CLI over a spread of generated levels produces, e.g.:

```
L61  solvE=true  fail=15%  nm/min=1.2  cv=3%  monotone=true   (too easy)
L65  solvE=true  fail=55%  nm/min=4.3  cv=3%  monotone=true   (borderline too hard)
L70  solvE=true  fail=34%  nm/min=5.3  cv=8%  monotone=true   (closest to passing)
L75  solvE=true  fail=54%  nm/min=4.5  cv=6%  monotone=true
L80  solvE=true  fail=50%  nm/min=5.6  cv=5%  monotone=true
L85  solvE=true  fail=44%  nm/min=5.3  cv=4%  monotone=true
L90  solvE=true  fail=59%  nm/min=4.3  cv=3%  monotone=true   (too hard)
```

All are solver-solvable and monotone-in-skill; failure rates land in a sensible
30–60 % spread; near-miss rates sit near the [3, 8] band. Every level currently
fails the verdict on **time-CV** (the locked-speed caveat above) and the hardest
ones also exceed the failure-rate ceiling — consistent with the spec's note that
the tightly-packed procedural levels lean hard. These numbers are the starting
point for recalibrating Bucket A's bands against bot telemetry.
