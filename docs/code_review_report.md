# SkyRoads WebGL — Code Review Report

> **Last updated:** 2026-06-04
> Assessment against project coding standards.

---

## Executive Summary

The SkyRoads WebGL codebase has grown significantly from its initial commit to a feature-rich game with 14 source modules, 20 test files, and ~269 asset textures. While the module boundaries are clean and the test coverage is comprehensive, the codebase has **significant file size violations** — every main source file exceeds the 800-line standard. There are also mutation patterns in the physics and state management code, and code duplication between `graphics.js` and `preview.js`. These are the priority areas for refactoring.

---

## Scorecard

| File | Lines | Size Limit | Immutability | Error Handling | Input Validation | No console.log | Overall |
|------|-------|------------|-------------|----------------|------------------|----------------|---------|
| [app.js](file:///c:/dev/Sky%20roads/app.js) | ~3,044 | ❌ 3.8× over | ⚠️ State mutation | ⚠️ Mixed | ⚠️ Partial | ⚠️ Some | ⚠️ |
| [graphics.js](file:///c:/dev/Sky%20roads/graphics.js) | ~1,800 | ❌ 2.3× over | ✅ Mostly clean | ✅ Try/catch | ⚠️ Limited | ⚠️ Some | ⚠️ |
| [levelLoader.js](file:///c:/dev/Sky%20roads/levelLoader.js) | ~2,200 | ❌ 2.8× over | ⚠️ Cache mutation | ✅ Good | ⚠️ Partial | ⚠️ Some | ⚠️ |
| [worldBuilder.js](file:///c:/dev/Sky%20roads/worldBuilder.js) | ~1,695 | ❌ 2.1× over | ✅ Standalone | ✅ Validates output | ✅ Schema checks | ✅ Clean | ✅ |
| [physics.js](file:///c:/dev/Sky%20roads/physics.js) | ~850 | ❌ 1.1× over | ❌ Heavy mutation | ✅ DT capping | ⚠️ Partial | ✅ Clean | ⚠️ |
| [audio.js](file:///c:/dev/Sky%20roads/audio.js) | ~1,281 | ❌ 1.6× over | ⚠️ State mutation | ✅ Context guards | ⚠️ Limited | ⚠️ Some | ⚠️ |
| [cockpitConsole.js](file:///c:/dev/Sky%20roads/cockpitConsole.js) | ~400 | ✅ Under limit | ✅ Clean | ✅ Good | ✅ N/A | ✅ Clean | ✅ |
| [preview.js](file:///c:/dev/Sky%20roads/preview.js) | ~600 | ✅ Under limit | ✅ Clean | ✅ Good | ⚠️ Limited | ✅ Clean | ✅ |
| [oplSynth.js](file:///c:/dev/Sky%20roads/oplSynth.js) | ~637 | ✅ Under limit | ⚠️ Buffer mutation | ✅ Good | ✅ Binary parsing | ✅ Clean | ✅ |
| [levels.js](file:///c:/dev/Sky%20roads/levels.js) | ~78 | ✅ Under limit | ✅ Cache pattern | ✅ Good | ✅ N/A | ✅ Clean | ✅ |
| [generate_textures.js](file:///c:/dev/Sky%20roads/generate_textures.js) | ~511 | ✅ Under limit | ✅ Standalone | ✅ Good | ✅ N/A | ✅ Clean | ✅ |
| [debug_coords.js](file:///c:/dev/Sky%20roads/debug_coords.js) | ~220 | ✅ Under limit | ✅ Clean | ✅ Good | ✅ N/A | ⚠️ Debug logs | ✅ |
| [vitest.setup.js](file:///c:/dev/Sky%20roads/vitest.setup.js) | ~103 | ✅ Under limit | ✅ Clean | ✅ Try/catch | ✅ N/A | ⚠️ Setup logs | ✅ |
| [levels.js](file:///c:/dev/Sky%20roads/levels.js) | ~78 | ✅ Under limit | ✅ Clean | ✅ Good | ✅ N/A | ✅ Clean | ✅ |

---

## Critical Issues

### 1. File Size Violations (P0)

Every main game module exceeds the 800-line limit:

| File | Lines | Over By |
|------|-------|---------|
| app.js | ~3,044 | **3.8×** |
| levelLoader.js | ~2,200 | **2.8×** |
| graphics.js | ~1,800 | **2.3×** |
| worldBuilder.js | ~1,695 | **2.1×** |
| audio.js | ~1,281 | **1.6×** |
| physics.js | ~850 | **1.1×** |

> [!CAUTION]
> `app.js` at 3,044 lines is the most urgent target. It contains the entire GameManager, all UI event handlers, gamepad manager, touch control manager, physics calibrator, ship garage, scoring, and leaderboard logic in a single file.

### 2. Code Duplication (P1)

`graphics.js` and `preview.js` duplicate 5 constant objects:
- `SHIP_MODELS`
- `SHIP_SKINS`
- `SHIP_METRICS`
- `BASE_TEXTURES`
- `LEGACY_MODEL_ALIASES`

These should be extracted to a shared `shipCatalog.js` module.

### 3. Mutation Patterns (P1)

`physics.js` mutates the ship state object directly — position, velocity, fuel, oxygen are all mutated in-place. While common in game engines for performance, this violates the immutability coding standard.

`app.js` mutates game state, settings objects, and DOM state extensively.

### 4. Massive Import Section (P2)

`levelLoader.js` has ~60+ static Vite imports for themed textures. This creates a large import block and tight coupling between the level builder and texture file paths.

---

## Strengths

1. **Comprehensive test coverage** — 20 test files covering all major systems
2. **Clean module boundaries** — each file has a clear, focused responsibility
3. **Vitest setup** with intelligent asset stub generation for CI environments
4. **GitHub Pages CI/CD** — automated deployment on push to main
5. **Multiple input systems** — keyboard, gamepad, and touch all cleanly separated
6. **Theme system** — 14 visual themes with complete texture sets per theme
7. **OPL2 FM synthesis** — authentic audio recreation from original DOS data
8. **Physics solver** — procedurally generated levels are validated before acceptance
9. **GPU memory management** — `disposeUnusedThemes()` prevents VRAM leaks
10. **Automated visual testing** — Puppeteer screenshot pipeline for regression detection

---

## Detailed Observations

### Immutability

- **physics.js:** Ship state (`position`, `velocity`, `fuel`, `oxygen`) is mutated in-place for performance. This is standard in game engine physics but violates the coding standard.
- **app.js:** Game state transitions mutate the `gameState` variable and UI-related state objects directly.
- **levelLoader.js:** `textureCache` and `loadedTextureCache` are mutated Maps.
- **worldBuilder.js:** ✅ Standalone script creates new objects cleanly.
- **cockpitConsole.js, preview.js, levels.js:** ✅ Mostly clean patterns.

### File Size

Only 8 of 14 source files meet the 800-line limit. The 6 oversized files collectively account for ~10,870 lines that should be distributed across smaller modules.

### Error Handling

- **audio.js:** Good AudioContext lifecycle management with `resume()` guards for autoplay policy
- **graphics.js:** Try/catch around model loading and texture loading
- **physics.js:** DT capping at 0.05s prevents physics explosion from frame spikes
- **app.js:** Mixed — some operations have try/catch, others silently proceed
- **levelLoader.js:** Good error handling in async level building

### Input Validation

- **worldBuilder.js:** ✅ Validates generated level data before accepting it
- **physics.js:** ⚠️ Limited bounds checking on input values
- **app.js:** ⚠️ Partial validation of localStorage data on load

### Console.log Usage

Several modules still have `console.log` / `console.warn` statements:
- `app.js` — state transition logging
- `audio.js` — AudioContext status messages
- `debug_coords.js` — intentional debug output
- `vitest.setup.js` — test setup logging (acceptable in test context)

---

## Recommended Refactoring Plan

### Phase 1: Extract Shared Constants (P1, Low Risk)

Extract `shipCatalog.js` from `graphics.js` and `preview.js`:
```
shipCatalog.js (NEW)
├── SHIP_MODELS
├── SHIP_SKINS
├── SHIP_METRICS
├── BASE_TEXTURES
└── LEGACY_MODEL_ALIASES
```

### Phase 2: Split app.js (P1, Medium Risk)

```
app.js (~800 lines) — GameManager core + game loop
├── ui/menuScreens.js — Main menu, level select, death/success screens
├── ui/settingsPanel.js — Settings UI + physics calibrator
├── ui/garagePanel.js — Ship garage UI
├── input/gamepadManager.js — Gamepad polling + mapping
├── input/touchControlManager.js — Touch input + customizer
└── scoring.js — Score calculation + leaderboard
```

### Phase 3: Split levelLoader.js (P2, Medium Risk)

```
levelLoader.js (~800 lines) — Core level building
├── themeManager.js — Theme definitions, texture loading, VRAM disposal
├── tileFactory.js — Individual tile/block/tunnel geometry creation
└── textureImports.js — Static texture URL imports
```

### Phase 4: Split graphics.js (P2, Medium Risk)

```
graphics.js (~800 lines) — Scene + renderer management
├── shipRenderer.js — Ship model loading, skin painting
├── particles.js — Particle systems (exhaust, explosion, sparks)
├── skybox.js — Procedural skybox creation
└── cameraController.js — Camera modes + zoom
```

---

## Test Coverage Assessment

| Module | Test File(s) | Coverage |
|--------|-------------|----------|
| GameManager | app.test.js (1,071 lines) | ✅ Comprehensive |
| GraphicsEngine | graphics.test.js (1,125 lines) | ✅ Comprehensive |
| PhysicsEngine | physics.test.js (1,418 lines) | ✅ Comprehensive |
| Level Builder | levelLoader.test.js (674 lines) | ✅ Good |
| Audio | audio.test.js, classicAudio.test.js | ✅ Good |
| Cockpit | cockpitConsole.test.js | ✅ Good |
| Touch | touchControls.test.js | ✅ Good |
| Ship Classes | shipStats.test.js | ✅ Good |
| Gamepad | gamepad.test.js | ✅ Good |
| Ramps | ramps.test.js | ✅ Good |
| WorldBuilder | worldBuilder.test.js | ✅ Basic (data integrity) |
| Preview | preview.test.js | ✅ Good |
| Settings | settingsToggles.test.js | ✅ Good |
| Lane Snap | laneSnapToggles.test.js | ✅ Good |
| Themes | dynamicSkinning.test.js | ✅ Good |
| Assets | assets.test.js, generate.test.js | ✅ Good |
| Playtest | playtest_run.test.js | ✅ Basic |
| Analysis | analyze.test.js | ✅ Basic |
| OPL Synth | — | ❌ No dedicated tests |
| Debug | — | ❌ No tests (tool script) |

---

## Action Items

| # | Action | Priority | Effort |
|---|--------|----------|--------|
| 1 | Extract `shipCatalog.js` from graphics.js + preview.js | P1 | Small |
| 2 | Split `app.js` into 6 focused modules | P1 | Large |
| 3 | Remove console.log from production modules | P1 | Small |
| 4 | Split `levelLoader.js` into theme/tile/import modules | P2 | Medium |
| 5 | Split `graphics.js` into ship/particles/skybox/camera modules | P2 | Medium |
| 6 | Add OPL synthesizer unit tests | P2 | Medium |
| 7 | Add input validation to localStorage data loading | P2 | Small |
| 8 | Evaluate immutable physics state pattern (perf impact) | P2 | Research |
