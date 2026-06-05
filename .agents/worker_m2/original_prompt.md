## 2026-06-04T11:03:23Z
Your working directory is: c:\dev\Sky roads
You are the Level Generation Implementer.
Your mission is to execute Milestone 2: Level Blueprinting & Segment-based Generator Overhaul.

Target Files to modify/create:
- `worldBuilder.js`
- `scratch/level_blueprints.json`

Requirements:
1. MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

2. Blueprint Schema & Parser:
- Create `scratch/level_blueprints.json` containing blueprint definitions for all 30 generated levels (levels 61-90), grouped under 10 biomes (void, ridge, thrill, core, glitch, tundra, furnace, shallows, spire, pulse).
- If the blueprint JSON file is missing or fails to load, write a default set of 30 blueprints to `scratch/level_blueprints.json` first, and then parse it.
- Each level blueprint should list its level index, theme, gravity, starting fuel, starting oxygen, and an array of segment specifications (e.g. runway, classicJumps, verticalSteps, floatingIslands, slalom, timingGates, tunnelRun).

3. Segment-based Track Builder:
Overhaul `generateLevelData` in `worldBuilder.js` to process the segments from the level's blueprint. The track building must be delegated to dedicated segment functions:
- `buildRunway(builderState, segment)`: Flat safe road. Can drift the target lane slowly.
- `buildClassicJumps(builderState, segment)`: Runway, jump gap, runway. Boost pad optional.
- `buildVerticalSteps(builderState, segment)`: Elevation transitions (sloped ramps, dropping steps). Track the current elevation `currentHeight` in `builderState`.
  - Ramp step up: set `ramp: true`, `startY: currentHeight`, `endY: currentHeight + heightChange`.
  - Step down: place gap rows preceded by a warning tunnel, start road at lower height.
- `buildFloatingIslands(builderState, segment)`: Small floating platforms separated by gaps. The target lane shifts dynamically.
- `buildSlalom(builderState, segment)`: Obstacles alternating left/right lanes rhythmically.
- `buildTimingGates(builderState, segment)`: Obstacle wall blocking all lanes except one open gate, preceded by sticky or boost tiles.
- `buildTunnelRun(builderState, segment)`: Road tiles with `tunnel: true` and hazard burning tiles on side lanes.
- Enforce the 10-row flat starting zone at the beginning of the level and a 5-row flat landing runway at the end.

4. 3D Kinematic Playability Solver:
Upgrade `solveLevel` in `worldBuilder.js` to implement high-fidelity physical traversal simulation matching actual game physics:
- Track current coordinate `y` and ship elevation.
- Compute landing heights on elevated surfaces. A ship can land on elevated blocks (`full` or `half` tiles) if the jump trajectory landing or step height matches their top surface (`block.maxY`).
- Parabolic Jump Equations: Calculate flight path height row-by-row during jumps based on jumping starting height, landing height, entrance velocity, and gravity. Evaluate vertical flight height at each intermediate row to check for obstacle collision (flight height must clear the obstacle height + 0.1).
- Time-based Resource Consumption: Deduct fuel and oxygen based on actual traversal time ($dt = TILE\_LENGTH / v$) and tile-specific burn scales. Suspend oxygen depletion inside tunnels (where `tile.tunnel` is true).
- Inject Refills: Restore fuel and oxygen on refill pads. If simulated fuel drops below 35% at any step, dynamically inject a blue refill pad (`top_color = 10`) onto the track runway 30 rows prior to the depletion coordinate.

5. Validation & Test Run:
- Run `node worldBuilder.js` to ensure the compilation executes cleanly, successfully generating `data/generated_levels.json`.
- Run `npx vitest run tests/worldBuilder.test.js` to verify JSON structure, metadata, and playability invariants.
- Run all vitest tests in the codebase using `npm run test` to verify no regressions are introduced.

Please report back with your completion status, files edited, and test results.
