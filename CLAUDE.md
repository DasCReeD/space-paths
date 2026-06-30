# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser WebGL recreation of the 1993 DOS game **SkyRoads**, built with Three.js + Vite as a vanilla ES-module app (no framework, no TypeScript). Two HTML entry points: `index.html` (the game, loads `app.js`) and `editor.html` (the standalone level editor, loads `editor.js`).

## Commands

```bash
npm install            # also runs patch-package via postinstall
npm run dev            # Vite dev server on http://localhost:3000 (auto-opens)
npm run build          # builds both index.html + editor.html into dist/
npm run preview        # serve the production build

npm test               # vitest run (jsdom) — unit/integration suite
npx vitest run tests/physics.test.js     # single test file
npx vitest run -t "name of test"         # single test by name
npx vitest                                # watch mode

npx playwright test    # E2E (tests/e2e/); auto-starts dev server via webServer config
```

Note: `npm test` (vitest) **excludes** `tests/e2e/**` — those run only under Playwright. Vitest also excludes `node_modules`, `dist`, and `.agents`.

## Architecture

`app.js` is the central `GameManager` — it owns the state machine, game loop, UI wiring, input, garage, and settings, and constructs every engine. Major engines it composes:

- `graphics.js` (`GraphicsEngine`) — Three.js scene, rendering, particles, skybox, ship models, theming. Holds a back-reference `graphics.app`.
- `physics.js` (`PhysicsEngine`, `KeyboardController`) — collision, ship-class presets, keyboard/gamepad input.
- `levelLoader.js` — builds level geometry from level JSON, themed PBR textures, async building, VRAM disposal. Source of truth for track constants (`TILE_WIDTH=2.0`, `TILE_LENGTH=4.0`, `ROAD_WIDTH_LANES=7`) and the `THEMES` array. `editorRenderer.js` re-declares the same constants — keep them in sync.
- `audio.js` (`gameAudio` singleton) → `oplSynth.js` — Web Audio synth, music sequencer, SFX, plus OPL2 FM emulation and an LZS decompressor for the original 1993 assets.
- `cockpitConsole.js` — 3D cockpit HUD + minimap (driven by graphics).
- `xmbMenu.js` (`CrossbarController`) + `menuConfig.js` (pure-data menu trees) — PS3 XMB-style crossbar menus. `app.js` wires the configs into the controller.
- `visualizer/` — music visualizer (see memory notes; THREE-native Milkdrop replaced Butterchurn).
- `preview.js`, `touchControls.js`, `inGameEditor.js`, `autoplay.js`, `levels.js`.

The level **editor** is a separate module graph rooted at `editor.js` (`editorRenderer.js`, `editorState.js`, `editorCommands.js`), reusing `levelLoader`'s cooked-level parser.

### Levels / data flow

Levels are JSON in `data/` (`standard_levels.json`, `xmas_levels.json`, `generated_levels.json`), loaded via `levels.js` `loadLevelPack(name)` which fetches + caches. The `'standard'` pack concatenates standard + xmas and renumbers xmas `level_index`. Level JSON schema (gravity/fuel/oxygen/palette/rows, 7-lane grid, Z runs negative) is documented in `docs/level_format_guide.md`.

Procedural levels 61–90 are generated **offline** by `worldBuilder.js` — a standalone Node CLI (no runtime API) that reads `data/level_patterns.json` / `data/world_design_docs.json` and writes `data/generated_levels.json`, validating each level with a static physics solver. Other standalone CLIs live in `tools/` and `scripts/` (texture/skybox/thumbnail/audio generation).

### Settings persistence

`userSettings.js` is imported first in `app.js` to seed localStorage from committed `userSettings.json` before any engine reads settings. In dev, `vite.config.js` adds `/api/get-settings` and `/api/save-settings` middleware that read/write `userSettings.json` on disk (and the file watcher ignores it to avoid reload loops).

## Conventions & gotchas

- Pure ES modules, browser-targeted. Tests run in jsdom via `vitest.setup.js`, which stubs Three.js/canvas/asset loading — when adding code that touches WebGL or asset fetches, check that setup file so tests don't break.
- `dist/` and `node_modules/` are gitignored; `*.blend`, large mp3s under `assets/Music/`, and `.env` are excluded.
- Original 1993 binary assets (`*.LZS`, `*.SND`, `WORLD*.LZS`) live at repo root and are decoded at runtime by `oplSynth.js`.
- Several files have `_backup_<date>` copies committed alongside them — edit the live file, not the backup.

## Reference docs

`docs/architecture.md` (definitive), `docs/module-map.md` (all exports/deps), `docs/level_format_guide.md`, `docs/asset-generation-pipeline.md`, `docs/visualizer-milkdrop.md`, `docs/xmb-menu-handoff.md`. `README.md` and `PROJECT.md` track features and milestones.
