# SkyRoads WebGL — Progress Log

> **Last updated:** 2026-06-28

---

## 2026-06-28 — Code Cleanup, Deduplication, & Dependency Removal

Cleaned up visualizer remnants, removed unused dependencies, resolved ship constant duplication, and optimized menu math.

**Visualizer & Dependency Cleanups**
- Completely removed the unused NPM `butterchurn` dependency from `package.json` and ran `npm install` to update the package lockfile.
- Deleted obsolete off-screen WebGL worker script `visualizer/butterchurn-worker.js`.
- Deleted legacy floating visualizer UI panel `visualizer/control-panel.js` (superseded by XMB Settings integration).
- Deleted obsolete patch file `patches/butterchurn+3.0.0-beta.5.patch`.

**Ship Constant Deduplication**
- Created a new shared catalog module `shipCatalog.js` to house `SHIP_MODELS`, `SHIP_SKINS`, `SHIP_METRICS`, `BASE_TEXTURES`, and `uvMapUrl`.
- Updated `graphics.js` and `preview.js` to import their configurations from `shipCatalog.js`, removing about 150 lines of duplicate code.

**Math Simplification**
- Removed the custom `clamp` helper function in `xmbMenu.js` and replaced it with native `Math.max`/`Math.min` inline calls.

---

## 2026-06-25 — Level Select Layout Fixes + Live UI Layout Debug Panel

**Level select crossbar/title-card positioning bug.** The decade-tabs/item-list
crossbar wasn't moving when its focal-point CSS vars were changed, because the
override selector targeted `#level-screen.xmb-focal-ps3` — but `.xmb-focal-ps3`
is actually applied to the child `#level-crossbar` element (`index.html:771`),
not its parent. Fixed the selector to `#level-crossbar.xmb-focal-ps3`
(`index.css`), then re-measured a mockup screenshot and the live render as
ratios of the shared 2560×1392 capture viewport to land on `--xmb-focal-x: 8%`
/ `--xmb-item-y: 10%` (top-left corner, matching the mockup) and resized
`#level-title-card.ltc` to `left:22%; top:16%; width:min(64%,900px);
max-height:69%`.

**New tool — `layoutDebugPanel.js`.** Since pixel-measuring mockups by hand was
slow and error-prone, built a live in-browser layout tool instead: a bottom-right
**⚙ LAYOUT** toggle button reveals dashed drag-handles over the active XMB
crossbar (main/settings/level-select), the level title card, the FPS counter,
and the score HUD. Dragging a handle updates that element on screen in
real time and a JSON panel tracks the resulting values (percentages for
menu/title-card via inline CSS custom-property/left/top overrides, px
top/right for the two fixed-position HUD widgets) so they can be copied out
and hardcoded back into `index.css`. Also has a "Capture Webamp Position"
button that reads Webamp's own redux store (`webamp.store.getState().windows`)
since Webamp drags itself by its titlebar already — feeds into the
`windowLayout` constructor option in `visualizer/webamp-init.js` for setting
its default startup position.

Implementation note: the handle-sync loop must *reposition* existing handle
DOM nodes on each animation frame, never recreate them — recreating mid-drag
drops the element's `setPointerCapture()` and silently truncates the drag to
whatever moved before the next rebuild (caught via a Puppeteer drag test that
only registered ~10% of the intended movement).

Wired into `app.js` via `initLayoutDebugPanel()`, called once after
`GameManager` is constructed on `DOMContentLoaded`. Dev-only measuring tool —
no gameplay effect, always available.

---

## 2026-06-25 — Visualizer Preset Variety & Physics Calibrator Overhaul

Improved visualizer preset variety by integrating Jason Fletcher's "Cream of the Crop" Waveform collection. Implemented an asynchronous fetch-on-demand architecture, and resolved key physics calibration saving and persistence issues.

**New scripts**
- **scripts/convert-all-presets.js** — Automates offline conversion of `.milk` presets. Automatically detects and filters out 1,100 presets containing custom shaders (`warp_1`/`comp_1`/backticks/`shader_body`) that cannot be compiled offline, converting only the 179 fully-compatible presets. Writes outputs as static `.json` files to `public/visualizer-presets/` and updates the index in `visualizer/presets.js`.

**Visualizer Engine & UI**
- **visualizer/presets.js** — Replaced inlined preset payload with a clean metadata array of 179 `{ name, file }` entries.
- **visualizer/engine.js** — Updated `loadPresetByIndex` to perform an async `fetch()` of the target preset JSON file. Added a `loadRequestCount` request counter to resolve race conditions and ignore stale responses during rapid preset scrolling.
- **app.js** — Imported `presets` index and dynamically updated the Settings menu visualizer preset slider range bounds (`max = presets.length - 1`) to naturally support all 179 presets.

**Physics Calibrator Overhaul**
- **app.js** & **vite.config.js** — Set up a custom GET `/api/get-settings` endpoint to bypass Vite's ignore-watch cache during preferred settings tuning. Frontend retrieves preference overrides dynamically on startup and seeds them into `localStorage`.
- **physics.js** — Resolved a startup regression where constructor initialization of default ship classes unconditionally overwrote customized preset settings. Differentiated initial load from in-game Garage class switches via a `writeToLocalStorage` parameter.
- Realignment of `vga` (VGA Classic) preset values to match UI design layouts.

---

## 2026-06-22 — XMB Menu System

Rebuilt every in-game menu as a PS3 XrossMediaBar-style crossbar (driven by the
`.claude/skills/xmb-menu` skill + [design guide.md](design%20guide.md)).

**New modules**
- **xmbMenu.js** — `CrossbarController` engine: `{categoryIndex,itemIndex}` state,
  150 ms cubic-ease retarget-safe tweens, tap/200 ms-hold input, fixed-slot
  centred translate, label-on-focus, 5 audio hooks (guarded by `safePlay`).
- **menuConfig.js** — pure-data trees (`mainMenuConfig`, `settingsConfig`,
  `garageConfig`, `gamepadConfigConfig`) + `buildLevelSelectConfig` (decade groups).

**app.js** — `crossbarControllers` map + `getActiveCrossbarController`,
`handleCrossbarKeyboard`, `wireCategoryClicks`, `_cancelActiveScreen`,
`setupXmbMenus` / `mountSettingsCrossbar` / `setupGarageCrossbar` /
`setupPauseDeathSuccessCrossbars`, `buildLiveSettingsConfig` /
`_resolveSettingsAction` / `_renderSettingsSlider` / `_renderVisualizerSettings`,
`startInfiniteRoad`, `_makeCalibratorDraggable`; captures `this.visualizerControls`.

**Round 1** — engine + data + per-screen ports (every overlay screen).
**Round 2** — full-screen blurred backdrop (no glass-card window); fixed the
"nothing works" bug (audio stubs threw mid-navigation → wrapped in `safePlay`)
and a slider-trap; cancel/back nav for all screens; centred the cross.
**Round 3** — full-screen draw area with the active item vertically centred (no
clipping); Infinite Road moved to the first item under "Levels 1-10"; **all**
decade groups visible; folded the music-visualizer panel into a Settings
**VISUALIZER** category and removed the floating panel + its top-left toggle;
Settings Calibrator/Garage/Close became XMB items; physics calibrator made
drag-movable + resizable.

**Round 4 — XMB Visual QA pass** (audited against [data/desigh_review.md](data/desigh_review.md),
the PS3 XMB Visual QA Standard, via the `visual-ui-reviewer` agent on isolated
vite port 5199). First pass FAILED; fixed and re-verified to **PASS**:
Webamp hidden below 900px/720px so it no longer overlaps the menu; removed the
stale inline `max-width` on `#success-screen` (full-screen blur); added
`.btn.btn-danger` (blank pause "RESET LEVEL EDITS"); `.xmb-crossbar` →
`position:static` so tracks anchor to the true viewport centre (short-viewport
clipping); vertical-column items fade by distance (`itemOpacityForDistance`,
grid/row layouts opt out via `flatItems`) to stop the category-bar/item label
collision; `#how-to-xmb-crossbar` + `#success-xmb-crossbar` keep
`position:relative; min-height:0`. See [docs/xmb-menu-handoff.md](docs/xmb-menu-handoff.md).

**Round 5 — Authentic PS3 focal point.** Moved the three full-screen crossbars
(Main, Settings, Level Select) off dead-centre to the real PS3 location: active
category ~1/4 from the left (`--xmb-focal-x:27%`), rail upper-middle
(`--xmb-item-y:42%`), item list hanging down **left-aligned** — via a
`.xmb-focal-ps3` class + `leftAlignItems:true` on those controllers (`xmbMenu.js`
writes `translate(0px,…)` instead of `-50%`). Dialogs (Pause/Death/Success/
How-To/Gamepad) stay centred; Garage keeps its side-by-side panel. Visual-QA
PASS at 1920×1080/1366×768; phone-width (390) follow-ups fixed: dropped an
over-aggressive mobile focal override that clipped the "Levels 1-10" label, and
shrank all three title classes (`.logo-text`/`.status-title`/`.screen-title`) so
they clear the corner icons.

**Round 6 — Garage overhaul.** Fixed the three garage problems: (1) **navigation** —
converted the HULL/SKIN/PAINT item lists from a broken 4-col CSS grid (the 1-D
`CrossbarController` couldn't navigate it) to single **vertical lists** of
[thumb + name] rows, with names baked in via `setupGarageCrossbar()` and PAINT
colours moved from the row background into a swatch thumb; (2) **model preview** —
`preview.js` now scales by the largest bounding-box dimension (`computeFitScale`,
was width-only → narrow/long ships blew past the frustum and looked blank) and a
failed load shows a cone placeholder instead of nothing; (3) **layout** —
`.ship-picker-container` height fits the viewport (was a fixed 560px that pushed
the title off-screen), stacking preview-over-list on phones. Also fixed the
Level-Select/Garage BACK button overlapping the fixed gear icon, and the mobile
header BACK/title overlap (header stacks column-wise ≤600px). Visual-QA PASS.

**Tests** — added `tests/xmbMenu.test.js`, `tests/menuConfig.test.js`,
`computeFitScale` cases in `tests/preview.test.js`; updated `tests/app.test.js`
for the new DOM/level/settings shape. Suite green (607).
Docs: [docs/module-map.md](docs/module-map.md), [docs/architecture.md](docs/architecture.md),
[docs/xmb-menu-handoff.md](docs/xmb-menu-handoff.md).

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

## 2026-06-29 — Procedural Biome Reskinning & Flow Mode Transition Fixes

Integrated dynamic, shape-aware procedural textures for levels 61-90 and fixed gameplay flow transitions.

**Procedural Level Reskinning**
- Created `getBiomeProceduralTexture()` in `levelLoader.js` to dynamically render custom canvas patterns (Void, Ridge, Thrill, Core, Glitch, Tundra, Furnace, Shallows, Spire, Pulse) mapping palette variables from `BIOME_COLOR_PROFILES`.
- Updated `adjustBoxUVs` in `levelLoader.js` to stretch UV mapping (`0` to `1`) on generated levels (61-90) to eliminate block seams.
- Wired materials in `createTileMaterial()` to load procedural maps and configure lighting properties (roughness, metalness) tailored per biome.

**Death Animation Fix**
- Updated the main game loop in `app.js` to continue calling `this.graphics.update(...)` during the `death` state, letting explosion particles animate and fade instead of freezing.

**Flow/Tower Transition Bug Fixes**
- Updated intra-world level completion transitions in `app.js` to skip completed stages in Flow Mode and advance sequentially to the next remaining uncleared gate.
- Updated success screen "Next Road" actions in `app.js` to transition to the start of the next 3-level world group using `startGroup` in Flow and Tower Modes, instead of single-level indexes.

---

## Future Work

| Task | Priority | Status |
|------|----------|--------|
| VRAM garbage collection & memory optimization | P1 | ⏳ Planned |
| E2E browser testing with Playwright | P1 | ⏳ Planned |
| World Builder UI (in-game level editor) | P2 | ⏳ Planned |
| Extract shared `shipCatalog.js` module | P2 | ✅ Completed |
| Module splitting (app.js, graphics.js, levelLoader.js) | P2 | ⏳ Planned |

