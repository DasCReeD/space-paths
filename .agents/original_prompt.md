## 2026-06-04T10:59:23Z
Add 10 new playable worlds with custom biomes and level layouts to the SkyRoads WebGL remake, utilizing build-time level baking, a pattern analyst agent, and an AI-driven asset pipeline.

Working directory: c:/dev/Sky roads
Integrity mode: development

---

## 1. Project Overview
We want to introduce 10 new playable worlds (Worlds 0 to 9), each containing 3 levels (total 30 levels) in a new pack called "generated".
The project divides the work between a dedicated **Art Team** and a **Level Design Team**:
1. **Art Team** (4 Specialized Roles):
   - **Asset Planner**: Decides what visual assets (textures, decals, 3D models, FX) are required for each biome/level and writes detailed, high-contrast prompt descriptors.
   - **Asset Generator**: Orchestrates the API scripts using the Google AI Studio Imagen 4 model (`imagen-4.0-generate-001`) to generate raw diffuse textures, uses ComfyUI background removal, or falls back to procedural image filters if offline.
   - **Asset Integrator**: Manages directories (e.g. `assets/custom/level_X/`) and maps individual asset filenames to the level loading logic.
   - **Visual Designer**: Themes the blocks, decals, and decorations for each biome/level (defines color palettes, roughness, metalness, and emissive glow values).
2. **Level Design Team** (3 Specialized Roles):
   - **Level Blueprinter**: Creates a detailed, segment-by-segment blueprint for each level prior to generation. Each blueprint details the sequence of runs, jumps, slalom weaving, floating islands, curves/turns, and height transitions, drawing structural inspiration and pacing ideas from the original 61 levels (using them as a guide only, rather than strictly duplicating them).
   - **Level Generator**: Overhauls the level builder (`worldBuilder.js`) using these blueprints and the seed-based generator to compile the track geometry.
   - **Level Validator**: Integrates a static playability solver to programmatically verify that every generated track is fully solvable at its gravity and pacing.

---

## 2. Requirements

### R1. Art Team: Asset Planning, Generation & Integration
- **Asset Planner**: Define prompt profiles for road, obstacle, and tunnel textures across the 10 biomes.
- **Asset Generator**: Update `scratch/generate_comfy_assets_10_worlds.py` to use `imagen-4.0-generate-001` as the primary image model. Generate 2D textures (diffuse, normal maps) and decals (boost, refill, burning, sticky, slippery, slow) for the 10 biomes. Fall back to Pillow-based procedural assets if API keys are missing.
- **Asset Integrator**: Map generated files to their respective level asset directories under `assets/custom/level_X/` (where X is 61 to 90). Ensure the `levelLoader.js` and `graphics.js` load level-specific assets if present, falling back to biome defaults.
- **Visual Designer**: Configure the `THEMES[]` definition array in `levelLoader.js` to assign colors, roughness, metalness, and maps for the 10 new themes:
  1. `void` (Visualizer Void): neon pink/green glowing wireframe.
  2. `ridge` (Blue Ridge Ascents): blue topographic contours.
  3. `thrill` (Thrill Sector): orange rollercoaster tarmac.
  4. `core` (Hardware Core): green supercomputer microchip grids.
  5. `glitch` (Glitch Grid): pixelated chromatic noise.
  6. `tundra` (Cryo-Stasis Tundra): icy white and cyan sheets.
  7. `furnace` (Supernova Furnace): magma flows and obsidian.
  8. `shallows` (Nebula Shallows): violet cosmic dust and neon guide lines.
  9. `spire` (Quantum Spire): stark minimalist white spires.
  10. `pulse` (Kinetic Pulse): dark steel and warning indicators.

### R2. Level Design Team: Blueprinting, Generation & Validation
- **Level Blueprinter**: Draft a detailed track specification document (`scratch/level_blueprints.json` or inline data structures) outlining the exact sequence of segments for each level. The blueprints must dictate vertical transitions (slopes up/down, steep drops), turns/curves (lane shifts), jumps, timing gates, and island sizes, using classic human-designed layouts as a general guide only.
- **Level Generator**: Overhaul `worldBuilder.js` to read and execute these blueprints. Construct tracks using a **Segment-based Track Builder** structure, chaining sequential segments (length 15-25 rows):
  - `buildRunway(length)`: Flat solid roads.
  - `buildClassicJumps(length, gapSize, boostCount)`: Jumps over 1-3 row gaps.
  - `buildVerticalSteps(length, startHeight, targetHeight)`: Steps up/down using ramps (e.g. height 1.0/2.0), or vertical drops (jumping off raised platforms to ground).
  - `buildFloatingIslands(length, islandSize, gapSize)`: Isolated platforms with large voids.
  - `buildSlalom(length, spacing)`: Alternating left/right obstacle walls.
  - `buildTimingGates(length, spacing)`: High obstacle walls with narrow openings, preceded by sticky speed-bleeding pads or speed boosts.
  - `buildTunnelRun(length)`: Covered arches containing hazard tiles.
- Apply these segments to build distinct difficulty curves: World 0 has simple jumps, World 1 has high-gravity steps, World 8 has low-gravity floating spires, World 9 has sticky timing gates.
- **Level Validator**: Enforce the static playability solver in `worldBuilder.js` to simulate a perfect run on each track (verifying jumps are mathematically clearable and fuel is sufficient).
- Re-generate `data/generated_levels.json` with 30 fully validated playable levels.

### R3. Rendering Bug Fixes
- **Spaceship Rotation**: In `graphics.js` and `preview.js`, rotate the GLB spaceship meshes by `Math.PI` (180 degrees) so they face forward during gameplay and in the garage preview.
- **Hollow Obstacles Shading**: Update `loadAndApplyObstacleModel` in `levelLoader.js` to compute correct normals for loaded OBJ models: call `child.geometry.computeVertexNormals()` for all loaded meshes. Modify `generate_assets_50_per_level.py` to write clean faces `v/vt` without hardcoded upward normal overrides.
- **Basement Blocks**: Render a standard flat road tile underneath all obstacles. In `processTile()`, if it's an obstacle, recursively render a flat tile first. In `buildMergedBlocks()`, execute the greedy 2D meshing loop in two separate passes:
  - **Road Layer Pass**: Greedily merge all tiles as flat blocks.
  - **Obstacle Layer Pass**: Greedily merge obstacle blocks sitting on top of the road.

---

## 3. Acceptance Criteria

### Verification Target
- [ ] Running `npm test` passes all 480+ unit tests.
- [ ] Running `python scratch/generate_comfy_assets_10_worlds.py` runs successfully using the `imagen-4.0-generate-001` model (or fallback if offline) and populates `assets/custom/`.
- [ ] Detailed level blueprints exist in `scratch/level_blueprints.json` or within `worldBuilder.js` itself, containing turns, vertical steps, and segment structures for all 30 levels.
- [ ] Running `node worldBuilder.js` compiles successfully, outputs `data/generated_levels.json`, and all 30 generated levels are verified playable by the solver.
- [ ] Spaceship GLB is verified facing forward (jet nozzle glowing towards the camera view, cockpit pointing forward).
- [ ] Obstacles render with a solid road tile beneath them (no void gaps in the track under obstacles).
- [ ] Obstacle OBJ meshes (pyramids, prisms, buildings) render with proper shading on their side walls (no black faces or hollow rendering).
- [ ] The "PLAY 10 NEW WORLDS" button in the menu displays the level select grid with 30 generated levels, each launching with its correct biome theme.

## 2026-06-04T11:17:45Z
Resume work at c:/dev/Sky roads. Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, and progress.md for current state.
Your parent is d136a84b-e796-4bf7-ad11-74a8d2014369 — use this ID for all escalation and status reporting (send_message).

## 2026-06-04T10:59:23Z
Add 10 new playable worlds with custom biomes and level layouts to the SkyRoads WebGL remake, utilizing build-time level baking, a pattern analyst agent, and an AI-driven asset pipeline.
Working directory: c:/dev/Sky roads
Integrity mode: development
Resuming from a compaction.
