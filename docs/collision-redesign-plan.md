# Collision & Physics Redesign — Multi-Span Column Model

**Status:** In progress (2026-06-30). **P0 DONE** (heightfield.js + constants centralized + 38 headless tests; full suite 700/700). Supervisor-fixed an off-by-one in the behavior-color adapter before sign-off (map must be keyed by RAW JSON color, not behaviorColor). `spanTopAtZ`/`spanSolidTopAtZ` signatures took a `bounds` arg: `(span, bounds, z)`. Tunnel `tunnelClear` default = 1.0 for single-lane (Phase 3 does proper multi-lane grouping). **P1.1 DONE** (collision.js — swept MTV resolver; 10 headless tests; full suite 710/710). Supervisor hardened axis selection: pure min-penetration ejected the ship downward/sideways on fast head-on hits; replaced with **velocity-aware resolution** (resolve along the face the ship crossed, + a "near top surface" exception so ramps still ride up). The §1.6 "minimum-penetration axis" line is superseded by `collision.js` `chooseAxis` — read the code, not just §1.6. Known deferral: substep cap (0.5u) can tunnel spans THINNER than 0.5u; fix in P3.3 by making tunnel/thin ceiling collision spans tall, not by shrinking substeps. **P1.2–P1.4 DONE** (resolver wired into physics.js behind `useColumnCollision` flag, default off; 18 ramp tests pass on the new path with ZERO assertions changed; **P1.4b** added tests/columnCollision.test.js — 11 new-path parity tests for flat-ground land/bounce/onGround/falloff/obstacle-by-difficulty, exact numeric match to old engine; full suite 721/721). Transitional shims to remove later: `physics.js _buildGridFromCollidables` + the `collidables.length` cache key (test-only bridge — drop in P3.1 once levelLoader supplies `levelInfo.columnGrid` and ramp tests feed real level data); the `-1e-6` z nudge for `columnsOverlappingBox` maxZ=0 boundary (consider fixing in heightfield.js). **P1 COMPLETE.** P2 pre-flight in-browser smoke (flag forced on, bot + scripted drive on a generated level and a controlled flat→ramp→elevated-runway level) found a real bug the unit tests missed: **multi-segment ramp seams walled** (consecutive per-row ramp tiles — the ship's feet lag the surface, so the next segment's entry was resolved as a wallFront and the ship got stuck). Fixed in `collision.js chooseAxis`: a span whose top is within a ship-height of the feet is a WALKABLE surface → ride up (Y), never wall. Locked by a new `collision.test.js` seam regression test (unit suite now 722/722). LESSON for later phases: ramp/collision tests must use REAL multi-row tile geometry, not single-span ramps, or seam bugs hide. In-browser ramp drive now climbs to the full elevated runway. **P2 DONE** (old collision path deleted — ~424 old-path lines gone, flag removed, column path is now the ONLY path; `checkTileExists` deleted; `checkSuperJumpTile` repointed to the grid via a new `isSuperJump` span field; physics.test.js's old-path-dependent collision tests migrated to real grids or deleted-as-duplicates, all health/damage assertions intact; unit suite 715/715). Supervisor-reviewed: a real new-path bug surfaced when physics.test.js first ran on the column path — `supportSurface` could false-snap a ship 0.12u above ground; fixed with a `restTol`-guarded resting check (`(position.y - surfaceY) <= 0.05`). Changed test assertions are flagged genuine divergences (MTV push-out distance vs old additive bounce; transitional tunnel-ceiling slab geometry — P3.3 revisits). Re-smoked in-browser post-deletion: flat-ground resting + ramp ride to elevated runway, no errors. Transitional shims still present (remove in P3.1): `_buildGridFromCollidables`, the `-1e-6` z nudge. **P3 DONE.** P3.1: levelLoader's buildLevel/buildLevelAsync now attach `levelInfo.columnGrid` + `numRows` (built via `buildColumnGrid(levelData)`), so native multi-span `spans` reach physics (collidables can't carry stacks); physics prefers `columnGrid`. `_buildGridFromCollidables` kept as a documented test-only fallback (decided: not worth migrating 18 ramp tests). P3.3: tunnel ceiling collision span made TALL (`floorY=tunnelClear`, top=`+6`) so fast vertical movers can't tunnel through; visual archway stays thin; head-bonk Y unchanged. P3.2 (the headline — multi-span geometry rendering): FIRST agent PUNTED it ("future work") — caught in review; re-delegated with an explicit no-punt recipe. Now a `tile.spans` branch in `processTile` renders each span as its own box via `createRampGeometry(TILE_WIDTH, TILE_LENGTH, span.floorY, span.topEntryY, span.topExitY)` (yBottom=floorY so an overpass is a thin slab with a visible underside, not a ground pillar); reuses createTileMaterial; pushes specialTiles for behavior spans; no collidables. Single-span legacy tiles untouched. Decals on upper spans deferred (emissive material glows; v1). Unit suite 731/731. VERIFIED in-browser: drove the column engine UNDER a hand-authored overpass slab — stayed at y=0 (no phantom ceiling collision), slab renders as an overhead structure, zero errors. **Multi-span verticality now works end-to-end.**

**TUNNEL FIXES (user-reported regressions, 2026-06-30, post-P3 playtest):** Two bugs from the P3.3 per-tile tunnel adapter, which had discarded the original merged-arch structure. (1) **Couldn't ride on top of tunnels** (critical — many segments require jumping onto tunnel roofs): the adapter pushed the rideable roof to +6; the original roof TOP is at `baseY+archHeight`. Fixed: tunnel ceiling is now a thin (0.15) RIDEABLE slab with top at `baseY+archHeight`, underside 0.15 below (the +6 anti-tunnel hack was never needed — a 0.4-tall ship at the 0.5u substep cap can't skip a slab thicker than 0.1u). (2) **Could clip out the sides** (no lateral containment): the adapter dropped the arch's left/right legs. Fixed: **partial-width spans** — a new general capability (`Span.xMin`/`xMax`; `collision.js` + `supportSurface`/`ceilingAbove` respect it) — plus a run-aware pass in `buildColumnGrid` (`addTunnelStructure`) that detects contiguous tunnel runs and adds thin full-height wall legs on the outer edges, AND corrects the roof height to be run-aware (`runWidth/2` for plain multi-lane tunnels, matching the original semi-cylinder). Also hardened the resolver: **directional (swept) push-out** — back the ship's leading edge to the obstacle's entry face instead of pushing by AABB overlap, which fixes resolving obstacles THINNER than the ship (a 0.15u wall inside the 0.44u ship would otherwise make it straddle/oscillate). Both fixes VERIFIED in-browser: ride-on-top (ship grounded on roof at 2.0), side containment (ship pinned at the wall, doesn't clip into the adjacent lane). Unit suite 732/732.

**FLOOR CLIP-THROUGH FIX (user-reported, classic road 5):** ship fell straight through plain flat road during aggressive play. Root cause: the flat-road collision span is only 0.1u thick, so its landing window (`T + shipHeight = 0.1 + 0.4 = 0.5`) exactly equalled the 0.5u substep cap — a jump descent (vy≈-10 at dt 0.05 → a 0.5u substep) stepped clean over the floor, and `supportSurface` (which only looks at surfaces ≤ feet+0.05) couldn't recover once below. Fixed generally in `collision.js`: substep cap is now `min(0.5, ship.height*0.9)` — strictly below the ship's height, so a substep can never fully step over ANY surface regardless of thickness (protects the thin road and any future thin feature). Reproduced via scripted high-speed jumping (4 clip-throughs), fixed (0), regression test added. Unit suite 733/733.

**CORNER CLIP-THROUGH FIX (user-reported, intermittent, "approaching a corner of an obstacle"):** a SECOND clip-through path. The post-resolution grounding check (`supportSurface`) point-sampled only the ship's CENTRE. When the ship clips an obstacle's corner and the resolver pushes it back (front collision) rather than sideways, its centre can sit over the obstacle's lane — where the only span is the obstacle top (too high to stand on) — so the centre point found no ground even though the ship's other half rested on the road → lost ground for a frame → gravity dropped it through. Intermittent (depends on whether the centre rounds into the obstacle's lane). Fixed: `supportSurface` is now **footprint-aware** (optional `halfW`/`halfL`; defaults to point for the ramp-slope callers), and the physics grounding check passes the ship's full width/length so road under ANY part of the footprint keeps it grounded. Unit test added (centre over obstacle → null; footprint → road). Verified: aggressive in-browser run (jumps + corner-clipping steering wiggle) = 0 real clip-throughs. Unit suite 734/734. **Next: P4** (editor authoring of multi-span) then P5 (opus solver).
**Owner of planning:** Opus (max). **Execution:** lower-tier agents per the `[tier]` tag on each task.
**Goal:** Replace the 2D-on-rails collision engine (flat AABB list + grid poke + per-block heuristic loop) with a **unified multi-span column model** that supports true 3D verticality — including stacked surfaces (bridges/overpasses you drive over *and* pass under).

---

## 0. Why (one paragraph)

Today "how high is the ground here?" has no single answer: height lives in tile JSON flags, in a flat `collidables` AABB list, and in per-frame physics state, with no `floorHeightAt(x,z)` function. The physics loop reconstructs height every frame by scanning *every* collidable and branching on type with magic-number tolerances (`0.15`, `0.25`, `0.35`, `0.5`), mutating position mid-loop (order-dependent), with a second `window.currentLevelData` grid poke for connectivity, two separate ground systems (the y=0 special path vs. the collidable path), no swept collision (only a `dt ≤ 0.05` tunneling band-aid), and an O(n) per-frame `deathY` scan. The fix is a precomputed **column grid**: each cell holds a sorted stack of solid **spans** `[floorY, topY]`; collision becomes swept-AABB-vs-column with **minimum-translation-vector (MTV)** resolution. This collapses flat road, elevated platforms, ramps, half/full obstacles, walls, gaps, *and* stacked bridges into one model and deletes essentially every band-aid.

### Non-goals (v1)

- Curved/non-linear ramps (tops slope **linearly** across a cell).
- Per-span partial X footprints (every span fills the full `TILE_WIDTH × TILE_LENGTH` cell footprint).
- Sloped span *undersides* (floors are flat; only tops may slope).
- Banking/lateral slopes. Y varies along Z only.

---

## 1. The model

### 1.1 Coordinate conventions (unchanged from today)

- 7 lanes, `TILE_WIDTH=2.0`, `TILE_LENGTH=4.0`, `ROAD_WIDTH_LANES=7`, `TOTAL_ROAD_WIDTH=14`.
- Lane `c` center X = `-6 + c*2`. Cell X bounds = `centerX ± 1.0`.
- Row `r` has `zPos = -r*4`. Cell Z bounds: `minZ = zPos - 4`, `maxZ = zPos`.
- **Entry edge = `maxZ`** (approached first), **exit edge = `minZ`**. This matches the current ramp formula
  `t = (z - maxZ)/(minZ - maxZ)`, `top = startY + t*(endY - startY)`. So **`startY` = entry top, `endY` = exit top.**
- Y is **active-level-LOCAL**: flat ground top = `0.0`. (Flow/Tower stack levels by shifting `position.y`/`groundHeight` by `H=25` in app.js — *that stays in app.js, physics never sees it.*) See §6.

### 1.2 Data structures (`heightfield.js` — NEW module, **NO three.js import**)

`heightfield.js` is pure logic so both the browser (physics/editor) **and** Node (`worldBuilder.js` CLI) import it. Geometry/THREE stays out (lives in `levelLoader.js` / `editorRenderer.js`).

```js
/**
 * A solid span filling the full cell footprint (TILE_WIDTH × TILE_LENGTH).
 * The TOP face is drivable and may slope along Z. The floor (underside) is flat.
 * @typedef {Object} Span
 * @property {number} floorY       underside of the solid (local Y)
 * @property {number} topEntryY    drivable top at entry edge (maxZ)
 * @property {number} topExitY     drivable top at exit edge (minZ)
 * @property {boolean} isRamp      derived: topEntryY !== topExitY
 * @property {?string} behavior    surface behavior on the TOP face: 'boost'|'super_boost'|'sticky'|'slippery'|'burning'|'high_jump'|'refill'|null
 * @property {boolean} isWallObstacle  legacy full/half block (telegraph/quality hints only; collision is generic)
 * @property {number} topColor     palette index (renderer)
 * @property {number} bottomColor  palette index (renderer)
 */

/**
 * @typedef {Object} Column
 * @property {Span[]} spans   sorted ascending by topEntryY (empty array allowed)
 * @property {boolean} isGap  true => no tile (void; ship falls)
 */

// columnGrid[r][c] : Column   (r = 0..numRows-1, c = 0..6)
```

### 1.3 Pure query API (`heightfield.js`)

```js
buildColumnGrid(levelData) -> { grid: Column[][], numRows: number }
//   Walks levelData.rows; for each cell, null => {isGap:true,spans:[]},
//   else legacyTileToSpans(cell) (or cell.spans if present). Sorts spans by topEntryY.

legacyTileToSpans(tile) -> Span[]
//   Backward-compat adapter (see §1.4). If tile.spans exists, normalize & return it.

cellBounds(c, r) -> {minX, maxX, minZ, maxZ}
worldToCell(x, z) -> {c, r} | null      // floor division; out-of-track => null
spanTopAtZ(span, bounds, z) -> number   // lerp top across [maxZ..minZ]; clamps to cell. bounds={minZ,maxZ}
spanSolidTopAtZ(span, bounds, z) -> num // == spanTopAtZ (top face); used for landing
columnsOverlappingBox(grid, numRows, box) -> Array<{c,r,column,bounds}>
//   box = {minX,maxX,minZ,maxZ}. Returns the (≤2×2) cells the ship footprint covers.

supportSurface(grid, numRows, x, z, y, tol) -> { surfaceY, span, slope } | null
//   Highest span whose spanTopAtZ(span,z) <= y + tol, across the cell(s) at (x,z).
//   slope = atan2(endY-startY, TILE_LENGTH) (0 for flat). null => nothing to stand on => gap/fall.

ceilingAbove(grid, numRows, x, z, y) -> number | Infinity
//   Lowest span.floorY strictly above y among overlapping cells (head-bonk limit).
```

### 1.4 Legacy → spans adapter (zero data migration)

Existing tiles map deterministically; **no level files change**:

| Legacy tile | Spans produced |
|---|---|
| flat road (`val:0`, no flags) | `[{floorY:-0.1, topEntryY:0, topExitY:0}]` |
| `half:true` | `[{floorY:0, topEntryY:1.0, topExitY:1.0, isWallObstacle:true}]` |
| `full:true` | `[{floorY:0, topEntryY:2.0, topExitY:2.0, isWallObstacle:true}]` |
| `full && half` | `[{floorY:0, topEntryY:3.0, topExitY:3.0, isWallObstacle:true}]` |
| `ramp` (`startY,endY`) | `[{floorY:min(startY,endY,0)-2.0, topEntryY:startY, topExitY:endY, isRamp:(startY!==endY)}]` |
| `tunnel:true` | base road span **plus** a ceiling span `[{floorY:tunnelClear, topEntryY:tunnelClear+0.3,...}]` (see §1.5) |
| `null` | `isGap:true` |

`behavior` is read from the tile's active color exactly as `classifyTileBehavior` does today (top_color for obstacles/ramps, bottom_color for flat road).

### 1.5 Native multi-span (the new capability)

A cell may carry an explicit `spans` array in JSON to express stacked solids:

```json
{ "val":0, "spans":[
  { "floorY": -0.1, "topEntryY": 0,   "topExitY": 0,   "bottom_color":1 },
  { "floorY": 3.0,  "topEntryY": 3.2, "topExitY": 3.2, "bottom_color":1 }
]}
```

= drive at 0; an overpass slab at 3.0–3.2 you can also drive on; passable air between 0 and 3.0 (head-bonk on the slab underside `floorY:3.0`). Tunnels become a real ceiling span instead of a decorative archway.

When `spans` is present it is authoritative; otherwise the adapter synthesizes spans from legacy flags. **Both forms coexist forever.**

### 1.6 Collision algorithm (per physics frame)

Replaces physics.js lines ~498–943.

```
integrate velocity -> desired delta (dx,dy,dz)
N = max(1, ceil(max(|dx|,|dy|,|dz|) / 0.5))     // substep so no step moves > 0.5 units (kills tunneling)
for each substep:
    position += (dx,dy,dz)/N
    ship = AABB(position, SHIP_COLLISION_WIDTH, SHIP_HEIGHT, SHIP_LENGTH)
    events = []
    for each {column,bounds} in columnsOverlappingBox(grid, ship):
        for each span in column.spans:
            solidTop = spanSolidTopAtZ(span, position.z)        // sloped for ramps
            B = AABB over [bounds.minX,maxX] × [span.floorY, solidTop] × [bounds.minZ,maxZ]
            ov = overlap(ship, B)                                // per-axis penetration
            if ov.x<=0 || ov.y<=0 || ov.z<=0: continue           // no contact
            axis = argmin(ov.x, ov.y, ov.z)                      // MTV: minimum-penetration axis
            push ship out along axis; record event(axis, span, impactSpeed)
            rebuild ship AABB
classify events -> apply outcomes (see §1.7)
post-resolution: support = supportSurface(...); set onGround/groundHeight/onRamp/rampSlope
gap/death: if support==null and position.y < localFloorY - fallMargin -> fall (or death per playStyle)
```

### 1.7 Event → outcome mapping (replaces all heuristic branches)

- **Y axis, falling (`vy<=0`):** **land** on `solidTop`. Snap `position.y = solidTop`, `groundHeight = solidTop`, `onGround=true`, `vy=0`; if `vy < -3.0` and jump not held and not just-rebounded → classic rebound (`vy = 4.2*bounceFactor`, `isRebounding`, audio). (Same numbers as today, lines 800–826.)
- **Y axis, rising (`vy>0`):** **ceiling bonk** — `position.y = span.floorY - SHIP_HEIGHT - 0.01`, `vy=0`. (Same as `isCeiling` path, lines 679–686.)
- **X axis:** **side slide** — push out, `vx=0`, scrape audio; in `normal` difficulty apply lateral damage (lines 769–784). (Same as side path.)
- **Z axis, ship pushed backward (+z):** **frontal crash** — difficulty branch identical to today (`easy` bounce / `normal` damage-or-die / `hard` die), lines 718–754.

Difficulty/damage/death/audio logic is **copied verbatim** from current physics — only the *detection* changes. Ramps don't need a bespoke front/side/snap trinity anymore: an up-ramp whose entry matches the current surface produces ~0 Z-penetration (no wall) and lands you as you advance; a ramp whose entry is a step above you produces real Z-penetration (a wall) → crash, which is correct.

---

## 2. Outputs to preserve (the interface contract — do NOT change)

`graphics.js` and `app.js` depend on these; keep names + semantics:

| Output | Meaning | Consumed by |
|---|---|---|
| `physics.position` (Vec3) | ship world/local pos | graphics 1316, app progress/checkpoints |
| `physics.onGround` (bool) | grounded | graphics 1297, app 4276 |
| `physics.groundHeight` (num) | support surface height (local Y) | graphics 1298, app wrap/checkpoint/rewind |
| `physics.onRamp` (bool) | on a sloped surface | graphics 1330 |
| `physics.rampSlope` (num, rad) | `atan2(endY-startY, TILE_LENGTH)` weighted across ship length | graphics 1331 |
| `physics.isDead`, `deathReason`, `deathY` | death state | app |
| `triggerJumpAudio` / `triggerLandingReboundAudio` / `triggerWallCollisionAudio` / `triggerRefillAudio` | one-frame SFX flags | app |
| `activeEffects.*` | boost/sticky/slippery/burning/highJump | physics/app/graphics |

**Invariants surfaced by recon (must hold):**

1. When grounded, `groundHeight == support surface height` and `position.y == support surface height`.
2. Spawn/checkpoint: app sets `position.y = baseY + 0.3`, `groundHeight = baseY` (drop-in). Keep that contract — physics must settle the +0.3 onto `baseY`.
3. Flow/Tower wrap adds/subtracts `H=25` to **both** `position.y` and `groundHeight` atomically (app.js 5535–5581). Physics stays in active-level-local Y so this is untouched.
4. Rewind snapshot saves `position, velocity, onGround, groundHeight` (app.js 4060–4077); `onRamp/rampSlope` are recomputed on next `update()`. Keep those 4 fields.
5. Flat ground top stays at local **Y=0** (default road span top). This keeps app.js's hardcoded transitions valid.

---

## 3. Module boundary rules (enforce in review)

- `heightfield.js` — **pure**, no `import * as THREE`. Node + browser safe. Unit-testable headless.
- `levelLoader.js` / `editorRenderer.js` — THREE geometry only; call `heightfield.js` for span data.
- `physics.js` — owns integration, difficulty, death, audio flags; calls `heightfield.js` queries + a sweep/MTV resolver (may live in `physics.js` or a new `collision.js` that also imports only `heightfield.js`).
- Constants (`TILE_WIDTH/TILE_LENGTH/ROAD_WIDTH_LANES/TOTAL_ROAD_WIDTH`) currently duplicated in `physics.js:5-8`, `levelLoader.js:155-158`, `editorRenderer.js:6-9`. **Centralize**: export from one module (`heightfield.js` or a tiny `trackConstants.js`) and re-export elsewhere. Do this in Phase 0 so every later task imports one source.

---

### 3.1 Extensibility (modularity) principles — add features later without a rewrite

The goal: new game details (new tile behaviors, hazard types, surface feels, scoring hooks) plug in at a seam instead of forcing edits to the geometry core. Achieve it with **clean boundaries + data, not abstraction layers**:

- **Three stable interfaces** — keep these backward-compatible; refactor freely *behind* them:
  1. `heightfield.js` query API (§1.3).
  2. The **collision event schema** (below) — plain objects; new fields are additive.
  3. The physics **output contract** (§2).
- **Geometry/rules split is the main seam.** `collision.js` resolves *geometry only* — swept push-out, zeroing the blocked velocity component — and emits **events**. `physics.js` applies *game rules* (crash vs. bounce vs. damage, audio, scoring) by reading events + `span.behavior`. A new hazard or feel = a new handler in physics keyed off an event/behavior, with **zero** change to the resolver.
- **Data-driven behaviors.** Tile behaviors live in one table in `heightfield.js`; `Span` carries open metadata (renderer hints, behavior, future fields) that flows through the resolver untouched. New surface type = one table entry + one physics handler.
- **No speculative machinery (ponytail).** No plugin system, event bus, or base classes. Modularity = small modules, plain-object events, and lookup tables. Introduce a new seam only when the *second* real case for it arrives — not before.

**Collision event schema** (stable; emitted by `collision.js`, consumed by `physics.js`):

```js
/** @typedef {Object} CollisionEvent
 *  @property {'land'|'ceiling'|'wallSide'|'wallFront'} kind  geometric classification (NOT a game outcome)
 *  @property {'x'|'y'|'z'} axis        MTV resolution axis
 *  @property {Span}   span             the span hit (carries behavior + metadata)
 *  @property {{c:number,r:number}} cell
 *  @property {number} surfaceY         for 'land': the top the ship was snapped to
 *  @property {number} penetration      MTV depth before push-out
 *  @property {number} impactSpeed      |velocity component| along `axis` at contact
 */
```

`collision.js` signature (decoupled from physics' ship config — ship dims are passed in, so the resolver never imports physics):

```js
resolve({ grid, numRows, position, velocity, dt, ship }) -> { position, velocity, events }
//   ship = { width, height, length }  (collision width, not visual width)
//   Returns the corrected position + velocity (blocked components zeroed) and the events list.
//   Pure geometry: applies NO crash/bounce/damage/audio — that's physics.js per §1.7.
```

## 4. Phasing (each phase ends green; game stays shippable)

```
P0 Foundations: heightfield.js + constants + fixtures + unit tests        (no runtime wiring)
P1 New collision core behind a flag; pass ramps.test + physics.test       (parity on legacy data)
P2 Delete old paths; remove flag; physics.js shrinks                       (parity locked)
P3 levelLoader builds columnGrid + multi-span geometry; physics reads it   (rendering + native spans)
P4 Editor + format authoring of multi-span                                 (content tooling)
P5 worldBuilder solver + generation upgraded to multi-span; re-bake 61–90  (procedural)
P6 Docs, migration notes, final regression + playtest
```

Parity gate between P1→P2 and after every phase: `npm test` green; manual smoke per §7.

---

## 5. Task breakdown (each task = one agent prompt)

Format per task: **ID — Title `[tier]`** · *deps* · files · steps · tests · done-when.
Tiers: `[haiku]` mechanical, `[sonnet]` standard logic, `[sonnet-high]` careful/algorithmic. Reserve Opus for re-planning only.

### Phase 0 — Foundations

**P0.1 — Extract track constants to one module `[haiku]`**
*deps: none* · files: NEW `trackConstants.js` (or add to `heightfield.js`), edit `physics.js:5-8`, `levelLoader.js:155-158`, `editorRenderer.js:6-9`.
Steps: create the four exports once; replace the three duplicate declarations with imports/re-exports; keep names identical.
Tests: `npm test` unchanged-green; grep shows a single source declaration.
Done-when: no duplicated literal `2.0/4.0/7` constant decls; suite green.

**P0.2 — `heightfield.js` data + adapter `[sonnet]`**
*deps: P0.1* · files: NEW `heightfield.js`.
Steps: implement `Span`/`Column` typedefs, `legacyTileToSpans`, `buildColumnGrid`, `cellBounds`, `worldToCell`. Adapter table exactly per §1.4. No THREE import.
Tests: NEW `tests/heightfield.test.js` — for each legacy tile kind assert produced spans; assert gap handling; assert `worldToCell` round-trips lane/row; assert ramp `startY=entry@maxZ`.
Done-when: adapter reproduces today's heights for a fixture level built from `data/standard_levels.json` row samples.

**P0.3 — `heightfield.js` query functions `[sonnet]`**
*deps: P0.2* · files: `heightfield.js`.
Steps: `spanTopAtZ`, `spanSolidTopAtZ`, `columnsOverlappingBox`, `supportSurface`, `ceilingAbove` per §1.3. Multi-span aware (sorted spans).
Tests: extend `tests/heightfield.test.js` — single flat cell support=0; ramp support interpolates 25/50/75%; two-span column returns upper top when y above gap, lower when below; `ceilingAbove` returns slab `floorY`; out-of-track => null.
Done-when: all query tests pass headless (no jsdom/THREE needed).

### Phase 1 — New collision core (flagged, parity)

**P1.1 — Sweep + MTV resolver skeleton `[sonnet-high]`**
*deps: P0.3* · files: NEW `collision.js` (imports only `heightfield.js`) OR a `resolveColumns()` method in `physics.js`.
Steps: implement §1.6 substep loop + per-span AABB overlap + MTV axis selection; **emit events** `{axis, span, impactSpeed, solidTop}` — do NOT apply game outcomes here. Provide `getShipBox(position)` shared with physics.
Tests: NEW `tests/collision.test.js` — feed synthetic grids; assert event axis for: head-on full block (Z), side graze (X), falling onto block (Y-down), jump into overpass underside (Y-up). Assert no event when riding an up-ramp whose entry matches footing.
Done-when: MTV picks the minimum-penetration axis deterministically; substep count scales with speed.

**P1.2 — Wire resolver into `physics.update()` behind `useColumnCollision` flag `[sonnet-high]`**
*deps: P1.1* · files: `physics.js`.
Steps: build `this.columnGrid` from `levelInfo` once per level (or accept it on `levelInfo`); inside `update()`, when flag on, replace the body from "7. Ground Collisions" through the deathY block (lines ~498–943) with: substep-resolve → §1.7 outcome mapping (copy difficulty/death/bounce/audio verbatim) → support/onRamp/rampSlope from `supportSurface` → O(1) deathY from local floor. Keep flag **off** by default.
Tests: temporary test toggling the flag runs both paths on the same inputs.
Done-when: flag off = byte-identical behavior to today; flag on = compiles and runs.

**P1.3 — `onRamp`/`rampSlope` parity `[sonnet]`**
*deps: P1.2* · files: `physics.js`, `heightfield.js`.
Steps: reproduce the ship-length-weighted slope blend (today lines 870–916) using `supportSurface().slope` sampled at ship front/center/back, or the analytic equivalent.
Tests: the existing `ramps.test.js` slope cases (lines 405–440) pass with flag on.
Done-when: `rampSlope` matches old within test tolerance.

**P1.4 — Pass `ramps.test.js` + `physics.test.js` with flag ON `[sonnet-high]`**
*deps: P1.3* · files: `physics.js`, tests setup.
Steps: set the flag on in the test environment; fix divergences. Where new behavior is *legitimately better* (e.g., a magic-number edge), update the specific assertion **with a comment citing this plan** rather than weakening the engine.
Tests: full `npm test` green with flag on.
Done-when: all 18 ramp tests + physics tests green; list any intentionally-changed assertions in the PR description.

### Phase 2 — Delete old paths

**P2.1 — Remove legacy collision body + flip default `[sonnet]`**
*deps: P1.4* · files: `physics.js`, `tests/physics.test.js`.
Steps: delete the old per-block loop, the y=0 dual-ground path (830–869), `checkTileExists`, the `window.currentLevelData` poke (522–549), the O(n) deathY scan, the second slope loop. Make column collision the only path; remove the flag (and the now-unconditional `_updateColumnCollision` can be inlined). **TRAP:** tests/physics.test.js's "Jump and gravity" + "Death conditions" blocks (landing rebound, bounceFactor, on-ground gravity, jump-from-ground, fall-off death — ~lines 360–650) currently pass via the OLD path's implicit y=0 ground with EMPTY collidables. Once the column path is the only path, those break (no grid → no ground). They are already covered on the new path by tests/columnCollision.test.js — so MIGRATE each to provide a real grid (`window.currentLevelData = { rows }`, flat `{val:0}` road or `null` gaps) OR remove the now-redundant ones, citing columnCollision.test.js. Do NOT weaken assertions; keep the non-collision tests (accel/drag/steering/fuel/oxygen) untouched.
Tests: `npm test` green; grep confirms `window.currentLevelData` no longer READ by physics for collision (it may still be the grid source until P3.1) and `checkTileExists` is gone.
Done-when: physics.js net-shrinks; suite green; manual smoke §7 passes.

**P2.2 — Repoint `checkSuperJumpTile` / special-tile lookups to the grid `[haiku]`**
*deps: P2.1* · files: `physics.js`, `heightfield.js`.
Steps: super-jump tile + `resolveSpecialTiles` should query the column grid / span behavior instead of `window.currentLevelData` and the parallel `specialTiles` list where practical (or keep `specialTiles` if cheaper — document choice).
Tests: tower-mode super-jump test (if present) green; boost/sticky/slippery still trigger.
Done-when: no physics dependence on `window.currentLevelData`.

### Phase 3 — levelLoader column grid + multi-span geometry

**P3.1 — levelLoader emits `columnGrid` on `levelInfo` `[sonnet]`**
*deps: P0.3* · files: `levelLoader.js` (buildLevelAsync ~3707–3746).
Steps: call `buildColumnGrid(levelData)`; attach `levelInfo.columnGrid` + `numRows`. Keep `collidables`/`specialTiles` for now (P3.4 decides removal).
Tests: `tests/levelLoader.test.js` asserts `columnGrid` present and matches `heightfield` adapter output.
Done-when: physics consumes `levelInfo.columnGrid` (remove the per-level rebuild from P1.2 if duplicated).

**P3.2 — Generalize ramp geometry to multi-span `[sonnet-high]`**
*deps: P3.1* · files: `levelLoader.js` (`createRampGeometry` ~476–539, `computeTileGeometry` ~449–470, tile build ~2464–2569).
Steps: render **each span** as a box with a (possibly sloped) top face; render the **underside** (`floorY`) for spans that are overpasses (floor above 0) so you see the slab from below; keep flat-road/obstacle visuals identical for single-span legacy cells. Decals/behavior zones per top span.
Tests: `tests/graphics.test.js` (jsdom stubs) builds a 2-span fixture without throwing; visual smoke §7.
Done-when: a hand-authored 2-span level renders an overpass you can see over and under.

**P3.3 — Tunnels become real ceiling spans `[sonnet]`**
*deps: P3.2* · files: `levelLoader.js` tunnel archway (~3005–3060), adapter §1.4 (`heightfield.js legacyTileToSpans`).
Steps: tunnel tile → base road span + ceiling span; physics head-bonk now generic. Keep archway mesh as decoration aligned to the ceiling span. **IMPORTANT (from P1.1):** the substep cap is 0.5u, so a ceiling span thinner than that can be tunneled through by a fast vertical mover. Make the tunnel/ceiling **collision** span TALL (e.g. `floorY = clearance`, `topEntryY/topExitY = clearance + large`, well above any reachable Y) so it can't be skipped — the visual archway mesh stays thin/decorative, but the collision span must be thick. The current adapter makes it only 0.3 thick — fix that here.
Tests: a tunnel fixture: ship at full height bonks ceiling; ducking height passes; a FAST upward mover (one frame, |dy| > 0.5) still bonks (doesn't tunnel through).
Done-when: tunnel collision no longer a bespoke `isCeiling` special-case in physics, and no thin-span tunneling.

**P3.4 — Retire `collidables` if unused `[haiku]`**
*deps: P3.1–P3.3* · files: `levelLoader.js`, grep consumers.
Steps: if nothing but physics read `collidables`, stop producing it; else document remaining consumers and leave a thin derivation.
Tests: suite green.
Done-when: no dead producer; module-map updated note.

### Phase 4 — Editor + format authoring

**P4.1 — editorState cell schema: `spans[]` `[sonnet]`**
*deps: P0.2* · files: `editorState.js` (createEmptyLevel ~33–80, deserialize ~295–338, cook ~358–408).
Steps: add optional `spans` to draft cells; cook to JSON `spans` (or keep legacy flags when single-span for diff-cleanliness); deserialize legacy → spans on load.
Tests: NEW `tests/editorState.test.js` round-trips a multi-span cell draft→cook→reload.
Done-when: legacy levels load unchanged; multi-span survives save/load.

**P4.2 — editorRenderer multi-span geometry `[sonnet]`**
*deps: P4.1, P3.2* · files: `editorRenderer.js` (`createBasicRampGeometry` ~667–697, rebuildMeshes ~580–610). Import constants from P0.1.
Steps: reuse the `heightfield` span model; draw each span box across all viewports.
Tests: editor smoke (manual) — multi-span cell shows both decks in 3D + ortho views.
Done-when: editor visualizes what the game renders.

**P4.3 — Span authoring UI + commands `[sonnet-high]`**
*deps: P4.2* · files: `editor.js` (ramp UI ~282–336, commits ~866–883, ramp tool ~1337–1371), `editorCommands.js`, `inGameEditor.js` (activePlaneHeight ~75,678–699).
Steps: per-cell span list editor (add/remove/edit floor+top per span); ramp tool writes a span (not a flat cell); `activePlaneHeight` selects which span you paint onto. New `EditSpansCommand` (execute/undo).
Tests: command undo/redo restores prior spans; painting at plane height 3 adds an upper span without destroying the lower.
Done-when: a designer can build a bridge in the editor without hand-editing JSON.

### Phase 5 — worldBuilder solver + generation

**P5.1 — Upgrade `solveLevel` DFS to multi-span `[sonnet-high]`**
*deps: P0.3* · files: `worldBuilder.js` (`solveLevel` ~1013–1299).
Steps: import `heightfield.js` (Node-safe per §3); state key adds **which surface/span** the ship is on; transitions consider per-span tops, pass-under clearance, head-bonk, and gaps between spans. Legacy single-span levels must still solve identically.
Tests: NEW `tests/worldBuilderSolver.test.js` — solver accepts a known-good single-span level (parity) and a hand-made multi-span level (drive-over and pass-under routes both found/blocked correctly).
Done-when: re-running the existing bake on 61–90 still passes solvability (no regressions).

**P5.2 — trackQuality clearance reasoning `[sonnet]`**
*deps: P5.1* · files: `trackQuality.js` (validateTrackQuality ~164–316, forcedDemand ~82–93).
Steps: teach forced-demand/intensity about vertical clearance (can a 2.5-high wall be cleared under a 2.0 ceiling?) and multi-height lane choice. Keep existing rule numbers.
Tests: unit cases for an impossible clearance (flagged) and a fair one (passed).
Done-when: quality gate no longer blind to verticality.

**P5.3 — Multi-span set-piece builders + re-bake `[sonnet]`**
*deps: P5.1, P5.2* · files: `worldBuilder.js` (CUSTOM_BUILDERS ~1510, ramp helpers ~632–685), `data/generated_levels.json`.
Steps: add a `bridge`/`overpass` builder emitting native `spans`; run the bake; commit regenerated `generated_levels.json`. Keep it to **one** new set-piece archetype for v1 (ponytail: prove the pipeline before flooding content).
Tests: bake completes; all 61–90 solvable; spot-check one level loads + plays in browser.
Done-when: at least one shipped generated level uses a real overpass.

### Phase 6 — Docs & close-out

**P6.1 — Update docs `[haiku]`**
*deps: all* · files: `docs/level_format_guide.md` (add `spans`), `docs/architecture.md`, `docs/module-map.md` (add `heightfield.js`, note solver upgrade), this file → Status: Done.
**P6.2 — Final regression + manual playtest `[sonnet]`** — full `npm test`, `npx playwright test`, manual §7 across classic/flow/tower + a multi-span level.

---

## 6. Flow/Tower invariant (do not break)

Physics operates in **active-level-local Y** (flat ground = 0). app.js keeps the active level group at world y=0 and, on wrap, shifts **both** `position.y` and `groundHeight` by `H=25` (5535–5581). Because physics never reads the THREE.Group offsets and always collides against the active level's `columnGrid` in local Y, the rewrite needs **no Flow/Tower changes** — verify by smoke test, don't refactor. Checkpoints store `baseY` (local surface); respawn writes `(0, baseY+0.3, z)`, `groundHeight=baseY`. Preserve exactly.

## 7. Manual smoke checklist (every phase)

1. Classic level with a ramp up→flat→down: ride smoothly, no jitter at seams.
2. Jump onto a full block; land; rebound bounce fires once.
3. Drive into a wall head-on (hard) → crash; graze its side → slide + scrape SFX.
4. Tunnel: pass under at ride height; (multi-span) bonk head if you jump.
5. Gap: fall + death (classic) / wrap (flow).
6. Flow + Tower: wrap up/down across all three decks; camera height tracks; checkpoints respawn at right Y.
7. (P3+) Hand-authored overpass: drive over it; on another lane pass under it.

## 8. Risk register

| Risk | Mitigation |
|---|---|
| MTV mis-picks axis at corners (diagonal hit) | substep ≤0.5u; resolve one span/axis per iteration, rebuild AABB, re-test |
| Ramp entry reads as a wall | entry top == preceding surface → ~0 Z-penetration by construction; covered by P1.4 ramp tests |
| Solver drifts from runtime physics | P5.1 imports the SAME `heightfield.js` queries; parity test on single-span levels |
| `heightfield.js` accidentally imports THREE | lint/review rule §3; P0 tests run headless (would fail on THREE) |
| Editor/runtime span schema drift | one adapter in `heightfield.js`; editor cooks through it |
| Performance (substeps × spans) | only ≤2×2 cells queried per frame via grid index; spans/cell tiny |

## 9. Suggested execution order for agents

P0.1 → P0.2 → P0.3 (gate: headless tests green) → P1.1 → P1.2 → P1.3 → P1.4 (gate: full suite green, flag on) → P2.1 → P2.2 (gate: suite + smoke) → P3.1 → P3.2 → P3.3 → P3.4 → P4.1 → P4.2 → P4.3 → P5.1 → P5.2 → P5.3 → P6. Phases 3 and 4 may run in parallel after P2 (different files); P5 needs P0.3 only for the solver but should land after P3 so multi-span content has runtime support.
