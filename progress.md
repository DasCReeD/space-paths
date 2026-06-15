# SkyRoads WebGL — Progress Log

> **Last updated:** 2026-06-15

---

## Branch Status

| Branch | Commits | Status |
|--------|---------|--------|
| `main` | 51 | ✅ Stable, deploys to GitHub Pages |
| `feature/visual-ui-overhaul` | 27 | 🔄 Merged into main |

---

## Commit History (main branch — recent)

| Commit | Feature |
|--------|---------|
| `96ed3d3` | ✅ fix: resolve curvature bending on decal overlays and scenery blocks |
| `ccd6dd7` | ✅ feat: apply ComfyUI illustrated textures to levels 61-90 and generate visual playtest screenshots |
| `24f4763` | ✅ feat: add editor select/edit tools and behavior color tag labels |
| `4d57e5f` | ✅ fix: resolve level editor playtest crash and default ramp height placement |
| `89787bb` | ✅ fix: move Edit Level button visibility check before early return in showScreen |

### Committed changes in this update (as of 2026-06-15):
- **graphics.js** — Whitecap-style 3D receding spectrum grid (`createWhitecapGrid`, `updateWhitecapGrid`), `setAudioData()` API, bloom pass reactivity (bass/beat energy), and emissive tile pulse cache.
- **audio.js** — Added `SynthwaveSequencer` with 12 procedural synthwave tracks, and the `getAnalyserData()` method.
- **app.js** — Wired the game loop to retrieve analyser data and feed it to `graphics.setAudioData()`, and added a settings control toggle for double-jumping.
- **physics.js** — Added support for mid-air double jumping (toggled from settings/keyboard controls).
- **levelLoader.js** — Constrained block merging by road zones (rails vs center lane), added animated decal offsets/pulsing, and side rail glow strips.
- **tools/** — Added audio-to-level pipeline: `analyze_audio.js` and `generate_audio_level.js`.
- **vite.config.js** & **package.json** — Completely removed obsolete `butterchurn` dependency and config.

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
| World Builder UI (in-game level editor) | P2 | ⏳ Planned |
| Extract shared `shipCatalog.js` module | P2 | ⏳ Planned |
| Module splitting (app.js, graphics.js, levelLoader.js) | P2 | ⏳ Planned |

