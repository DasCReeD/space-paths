# SkyRoads WebGL — Project Overview

> **Last updated:** 2026-06-05

---

## Architecture & Code Layout

| Module | Lines | Purpose |
|--------|-------|---------|
| [app.js](file:///c:/dev/Sky%20roads/app.js) | ~2,797 | GameManager — state machine, UI, game loop, input, garage, settings |
| [graphics.js](file:///c:/dev/Sky%20roads/graphics.js) | ~1,800 | Three.js rendering, particles, skybox, ship models, theming |
| [levelLoader.js](file:///c:/dev/Sky%20roads/levelLoader.js) | ~2,200 | Level geometry builder, themed textures, async building, VRAM |
| [worldBuilder.js](file:///c:/dev/Sky%20roads/worldBuilder.js) | ~1,695 | Procedural level generation (standalone CLI with physics solver) |
| [physics.js](file:///c:/dev/Sky%20roads/physics.js) | ~850 | Physics engine, collision, ship classes, keyboard/gamepad input |
| [audio.js](file:///c:/dev/Sky%20roads/audio.js) | ~1,281 | Web Audio synthesizer, music sequencer, SFX |
| [cockpitConsole.js](file:///c:/dev/Sky%20roads/cockpitConsole.js) | ~400 | 3D cockpit dashboard HUD + path scanner minimap |
| [touchControls.js](file:///c:/dev/Sky%20roads/touchControls.js) | ~751 | Touch input manager — individual button system |
| [preview.js](file:///c:/dev/Sky%20roads/preview.js) | ~600 | Ship garage preview engine (isolated Three.js scene) |
| [oplSynth.js](file:///c:/dev/Sky%20roads/oplSynth.js) | ~637 | OPL2 FM synthesis (Yamaha YM3812) + LZS decompressor |
| [levels.js](file:///c:/dev/Sky%20roads/levels.js) | ~78 | Level pack fetch + cache loader |
| [generate_textures.js](file:///c:/dev/Sky%20roads/generate_textures.js) | ~511 | Procedural PNG texture generator (standalone CLI) |
| [debug_coords.js](file:///c:/dev/Sky%20roads/debug_coords.js) | ~220 | Puppeteer-based UI debug automation |
| [vitest.setup.js](file:///c:/dev/Sky%20roads/vitest.setup.js) | ~103 | Test harness — asset stub generation |
| [index.html](file:///c:/dev/Sky%20roads/index.html) | ~967 | Full game UI structure |
| [index.css](file:///c:/dev/Sky%20roads/index.css) | ~3,145 | Retro-futuristic glassmorphism design system |

---

## Completed Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | WebGL recreation of original SkyRoads with 10 worlds | ✅ DONE |
| 2 | Xmas Special level pack integration | ✅ DONE |
| 3 | 3D cockpit HUD with gauges, LCD readouts, wing elements | ✅ DONE |
| 4 | Corner minimap path scanner | ✅ DONE |
| 5 | 14 visual themes with themed textures and decals | ✅ DONE |
| 6 | Procedural skybox with stars, nebulae, planets | ✅ DONE |
| 7 | Ship Garage with 6 models, texture/color picker, class presets | ✅ DONE |
| 8 | OPL2 FM synthesizer with original 1993 sound assets | ✅ DONE |
| 9 | Xbox gamepad support with configurable button remapping | ✅ DONE |
| 10 | Mobile touch controls with analog stick, D-pad, customizer | ✅ DONE |
| 11 | Sloped ramps, physics snapping, tunnel transitions | ✅ DONE |
| 12 | Autolane magnetic snapping for mobile | ✅ DONE |
| 13 | 30 procedurally generated levels with physics solver validation | ✅ DONE |
| 14 | GitHub Pages automated deployment | ✅ DONE |
| 15 | Automated visual playtest pipeline (Puppeteer screenshots) | ✅ DONE |
| 16 | 20-file test suite with Vitest + jsdom | ✅ DONE |
| 17 | ComfyUI/Trellis2 asset generation pipeline | ✅ DONE |

---

## Future Milestones

| # | Milestone | Status | Priority |
|---|-----------|--------|----------|
| 18 | VRAM garbage collection & memory optimization | ⏳ Planned | P1 |
| 19 | E2E browser testing with Playwright | ⏳ Planned | P1 |
| 20 | World Builder UI (in-game level editor) | ⏳ Planned | P2 |
| 21 | Extract shared `shipCatalog.js` from graphics.js/preview.js | ⏳ Planned | P2 |
| 22 | Module splitting (app.js, graphics.js, levelLoader.js) | ⏳ Planned | P2 |

---

## Interface Contracts

### GamepadManager
```typescript
interface GamepadManager {
  pollGamepad(): void
  getInputs(): { forward, backward, left, right, jump }
  setMapping(mapping: Record<string, number>): void
  setDeadzone(value: number): void
}
```

### TouchControlManager
```typescript
interface TouchControlManager {
  init(keyboard: any, graphics: any, app: any): void
  registerButtons(): void
  show(): void
  hide(): void
  loadConfig(): void
  saveConfig(): void
  resetConfig(): void
  applyConfig(): void
  enterCustomizeMode(): void
  exitCustomizeMode(): void
}
```

### CockpitConsole3D
```typescript
interface CockpitConsole3D {
  update(physicsState: PhysicsState): void
  setVisible(visible: boolean): void
}
```

### PathScannerMinimap
```typescript
interface PathScannerMinimap {
  update(levelData: LevelData, shipZ: number, shipX: number): void
  setTheme(themeIndex: number): void
}
```

### WorldBuilder (Standalone CLI)
```typescript
interface WorldBuilder {
  // Standalone Node.js script — no runtime API
  // Reads: data/level_patterns.json
  // Writes: data/generated_levels.json
  // Validates each level with static physics solver
}
```

---

## Git Branching

| Branch | Commits | Status | Description |
|--------|---------|--------|-------------|
| `main` | 33 | Stable | Production branch, deploys to GitHub Pages |
| `feature/visual-ui-overhaul` | 27 | Merged | Completed visual UI overhaul, PBR textures, ship models |
| `subagent-*` | 27 | Stale | Teamwork preview branch (mirrors feature branch) |

### Remotes
- `origin/main` — Primary repository
- `fork/main` — Fork repository
