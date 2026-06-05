# Project: Sky Roads 10 Generated Worlds & World Builder

## Architecture
The project extends the Sky Roads clone with 10 custom biomes, a segment-based build-time level generator, and rendering fixes for spaceship orientation, normal shading, and road meshing.

- **worldBuilder.js**: Build-time level generator. Ingests level blueprints, executes segment-based track building, runs the kinematic playability/fuel solver, and bakes the final 30 levels (61-90) into `data/generated_levels.json`.
- **scratch/generate_comfy_assets_10_worlds.py**: Art asset generation script. Connects to `imagen-4.0-generate-001` or uses Pillow procedural fallback to produce diffuse, normal, and decal maps for the 10 biomes.
- **levelLoader.js**: Integrates theme configuration definitions, mapping materials, roughness, metalness, and handling dynamic biome fallbacks for missing assets.
- **graphics.js & preview.js**: Renders the 3D gameplay scene and the ship customizer preview garage. Loads spaceship models (GLB) and scenery objects.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Codebase Audit | Audit the generator solver, spaceship rendering, normal maps, and art assets | None | DONE |
| 2 | Level Blueprinting & Generator Overhaul | Implement `scratch/level_blueprints.json`, segment building, and physical solver in `worldBuilder.js`. Generate `data/generated_levels.json` | M1 | DONE |
| 3 | Art Asset Upgrades & Integration | Upgrade `generate_comfy_assets_10_worlds.py` to Imagen 4, implement skybox/decal/model fallback lookups in `levelLoader.js` and `graphics.js`, and configure biome theme properties | M1 | PLANNED |
| 4 | Rendering & Mesh Fixes | Implement spaceship Math.PI rotation, vertex normal calculation for OBJ obstacles, and two-pass greedy meshing (basement blocks) | M1 | PLANNED |
| 5 | Verification & Automated Tests | Run test suite, verify 100% of tests pass, perform manual validation, and final Git commit | M2, M3, M4 | PLANNED |

## Interface Contracts
- **data/generated_levels.json**: The output array containing the 30 generated levels (levels 61-90), with each level specifying gravity, fuel, oxygen, name, theme, and rows array.
- **THEMES[] visual definitions**: In `levelLoader.js`, the visual properties lookup table mapping biomes (`void`, `ridge`, `thrill`, `core`, `glitch`, `tundra`, `furnace`, `shallows`, `spire`, `pulse`) to their specific roughness, metalness, colors, and textures.
- **Spaceship metrics**: `SHIP_METRICS` in `graphics.js` and `preview.js` mapping ship types to local coordinate offsets for engines and wingtips.
