# Project: Sky Roads Next-Gen Overhaul

## Architecture & Code Layout
The project is a web-based clone of the classic DOS game "Sky Roads", built using modern web techniques (Vite, Three.js, native HTML/CSS/JS).

### Major JS Modules
- **app.js**: Entry point, game loop, UI/state management, scene management.
- **graphics.js**: Rendering engine, Three.js integration, shaders, post-processing, light, camera setup, object loading, skybox.
- **physics.js**: Collision detection, movement updates, gravity, velocity, ship coordinates, and game-grid interactions.
- **levelLoader.js**: LZS/binary file decompression, parsing files like `WORLD0.LZS` to load levels, tracks, oxygen/fuel values, speed indicators.
- **audio.js**: Sound effect and music handling, audio contexts, buffer management.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Planning | Run explorer to analyze graphics, physics, level parsing, and outline changes | None | IN_PROGRESS |
| 2 | Branching & Decoupling | Create branch `feature/nextgen-graphics` and completely decouple/remove `skybox_space_nebula.png` | M1 | PLANNED |
| 3 | Procedural Background | Implement custom GPU fragment/vertex nebula shader + swirling galaxy particle system in `graphics.js` | M2 | PLANNED |
| 4 | Visuals & HUD Overhaul | Overhaul spaceship engines, glowing trails, track neon lighting, and sleek neon HUD display | M3 | PLANNED |
| 5 | Tunnels & Geometry | Fix tunnel parsing, correct scale, rounded/curved geometry, and ensure navigability | M1 | PLANNED |
| 6 | Gravity & Bounce Physics | Implement bounce speed / gravity control settings to eliminate floatiness | M1 | PLANNED |
| 7 | Testing & Verification | E2E, performance verification (60 FPS), clean git state on branch | M2, M3, M4, M5, M6 | PLANNED |
