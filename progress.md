# SkyRoads WebGL — Progress Log

> **Last updated:** 2026-06-10

---

## Branch Status

| Branch | Commits | Status |
|--------|---------|--------|
| `main` | 51 | ✅ Stable, deploys to GitHub Pages |
| `feature/visual-ui-overhaul` | 27 | 🔄 Merged into main |

---

## Commit History (main branch — 51 commits)

| # | Commit | Feature |
|---|--------|---------|
| 1 | `38e79c9` | ✅ Initial commit: SkyRoads WebGL recreation with Vitest unit tests |
| ... | ... | ... |
| 50 | `24f4763` | ✅ feat: add editor select/edit tools and behavior color tag labels |
| 51 | `pending` | ✅ feat: batch generate and apply ComfyUI illustrated textures and decals to levels 61-90 |

### Changes in this integration:
- **scratch/generate_assets_50_per_level.py** — Modified to dynamically lookup generated ComfyUI illustrated textures in `assets/custom/` and copy them into level folders instead of writing stubs. Added Sobel-based normal map fallback generation and dynamic custom decals copy support.
- **playtests/run_playtest.js** — Executed E2E screenshots verification.
- **scratch/run_generated_playtest.js** — Added a custom playtest runner targeting Level 61 to visually capture active gameplay on the new generated biome themes.

---

## Committed Assets

### 10 New Biome Themes
core, furnace, glitch, pulse, ridge, shallows, spire, thrill, tundra, void
- Each with road/obstacle/tunnel diffuse+normal textures
- Each with 6 decal variants

### 30 Per-Level Asset Directories
`assets/custom/level_61/` through `assets/custom/level_90/` containing the illustrated textures

---

## Test Suite Status

| Test File | Status |
|-----------|--------|
| app.test.js | ✅ |
| graphics.test.js | ✅ |
| physics.test.js | ✅ |
| levelLoader.test.js | ✅ |
| audio.test.js | ✅ |
| cockpitConsole.test.js | ✅ |
| touchControls.test.js | ✅ |
| shipStats.test.js | ✅ |
| gamepad.test.js | ✅ |
| ramps.test.js | ✅ |
| worldBuilder.test.js | ✅ |
| preview.test.js | ✅ |
| settingsToggles.test.js | ✅ |
| laneSnapToggles.test.js | ✅ |
| dynamicSkinning.test.js | ✅ |
| classicAudio.test.js | ✅ |
| generate.test.js | ✅ |
| playtest_run.test.js | ✅ |
| assets.test.js | ✅ |
| analyze.test.js | ✅ |

---

## Future Work

| Task | Priority | Status |
|------|----------|--------|
| VRAM garbage collection & memory optimization | P1 | ⏳ Planned |
| E2E browser testing with Playwright | P1 | ⏳ Planned |
| Merge `feature/visual-ui-overhaul` into `main` | P0 | ✅ Completed |
| Commit untracked new theme assets (10 themes) | P0 | ✅ Completed |
| Commit untracked data files and test files | P0 | ✅ Completed |
| World Builder UI (in-game level editor) | P2 | ⏳ Planned |
| Extract shared `shipCatalog.js` module | P2 | ⏳ Planned |
| Module splitting (app.js, graphics.js, levelLoader.js) | P2 | ⏳ Planned |
