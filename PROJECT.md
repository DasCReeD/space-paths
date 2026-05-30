# Project: Sky Roads Codebase Review & Documentation

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
| 1 | Explore & Map | Run teamwork_preview_explorer on main files to map variables, functions, dependencies, and architecture | None | DONE |
| 2 | Codemaps & Architecture | Generate high-quality text-based and visual codemaps under `docs/` explaining the flow | M1 | DONE |
| 3 | Best Practice Code Review | Perform deep, rule-by-rule review of graphics.js, physics.js, app.js and report issues/refactoring paths | M1 | DONE |
| 4 | Final Handoff & Git | Write README.md and documentation. Commit all changes to the active branch, and verify git status. | M2, M3 | DONE |
