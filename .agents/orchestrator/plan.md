# Implementation Plan: 10 Generated Worlds Expansion & Rendering Fixes

This plan details the steps to implement 10 new playable worlds with custom biomes, segment-based level generation, asset pipeline enhancements, and rendering fixes (mesh rotation, obstacle shading, and basement blocks).

## Milestone 1: Exploration & Codebase Audit
- [x] Spawn Explorer to inspect:
  - Existing `worldBuilder.js` and its generation/solver logic.
  - Existing level asset loaders in `levelLoader.js` and `graphics.js`.
  - Texture generator script `scratch/generate_comfy_assets_10_worlds.py` and obstacle generator `scratch/generate_assets_50_per_level.py`.
  - Mesh loading and rotation code in `graphics.js` and `preview.js`.
  - Greedy meshing loop in `buildMergedBlocks()` and tile processing in `levelLoader.js`.
- [x] Generate detailed reports on findings and proposed edits.

## Milestone 2: Level Blueprinting & Segment-based Generator Overhaul
- [x] Draft detailed level specification blueprints in `scratch/level_blueprints.json` outlining turns, vertical steps, and segment structures for all 30 levels.
- [x] Overhaul `worldBuilder.js` to:
  - Parse and execute `scratch/level_blueprints.json`.
  - Construct tracks using a Segment-based Track Builder structure: `buildRunway`, `buildClassicJumps`, `buildVerticalSteps`, `buildFloatingIslands`, `buildSlalom`, `buildTimingGates`, and `buildTunnelRun`.
  - Implement static playability solver checking jump trajectories (parabolic flight path) and fuel consumption.
  - Re-generate `data/generated_levels.json` with 30 validated playable levels.
- [x] Implement/update unit tests in `tests/worldBuilder.test.js` to verify segment structures and solver playability.

## Milestone 3: Art Team: Asset Planning, Generation & Integration
- [x] Update `scratch/generate_comfy_assets_10_worlds.py` to use `imagen-4.0-generate-001` as the primary model, producing diffuse maps, normal maps, and decals for the 10 biomes, with Pillow fallback.
- [x] Map generated assets to level-specific directories `assets/custom/level_X/` (where X is 61 to 90).
- [x] Configure `THEMES[]` definition array in `levelLoader.js` with colors, roughness, metalness, and maps for the 10 new themes.
- [x] Ensure `levelLoader.js` and `graphics.js` load level-specific assets if present, with biome-level fallback.

## Milestone 4: Rendering & Mesh Fixes
- [x] **Spaceship Rotation**: Rotate GLB spaceship meshes by `Math.PI` (180 degrees) in `graphics.js` and `preview.js` to face forward.
- [x] **Hollow Obstacles Shading**: Update `loadAndApplyObstacleModel` in `levelLoader.js` to compute vertex normals. Modify `generate_assets_50_per_level.py` to write clean faces `v/vt` without normal overrides.
- [x] **Basement Blocks**: Render a standard flat road tile underneath all obstacles in `processTile()`. Update `buildMergedBlocks()` greedy meshing to run in two separate passes: Road Layer Pass and Obstacle Layer Pass.

## Milestone 5: Verification & Automated Tests
- [/] Run `npm run test` to verify all 490 tests pass.
- [ ] Implement new tests verifying the segment-based track building and playability checks.
- [ ] Perform manual/visual checks on levels, meshes, and the play menu.
