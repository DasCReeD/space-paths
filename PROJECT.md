# Project: Sky Roads Remake - Mobile Touch Controls & Navigation Menu

## Architecture & Code Layout
The project is a web-based clone of the classic DOS game "Sky Roads", built using modern web techniques (Vite, Three.js, native HTML/CSS/JS).

### Major JS Modules
- **app.js**: Entry point, game loop, UI/state management, scene management, game loops.
- **graphics.js**: Rendering engine, Three.js integration, custom procedural galaxy particles and volumetric noise shaders, thruster fire trails, cockpit overlays.
- **physics.js**: Collision detection, movement updates, gravity, velocity, ship coordinates, game-grid interactions, customizable bounce/gravity factor, and KeyboardController.
- **levelLoader.js**: LZS/binary file decompression, parsing files like `WORLD0.LZS` to load levels, tracks, oxygen/fuel values, speed indicators, tunnel translations and rounded geometry scales.
- **audio.js**: Sound effect and music handling, audio contexts, buffer management.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Explore & Map | Run explorer on main files to map variables, functions, dependencies, and architecture | None | DONE |
| 2 | Next-Gen Graphics | Procedural galaxy skybox, volumetric shaders, sleeker thrusters, neon pathways, correct tunnel geometries, and bounce speed controls | M1 | DONE |
| 3 | Mobile Touch HUD Overlay | Visual glassmorphic overlay for mobile, multi-touch, and customizable layouts (D-Pad Hybrid / Classic Console) | M2 | DONE |
| 4 | Touch Mode System Integration | Expose toggle button `TOUCH CONTROLS: OFF / ON` in main menu. Inject touch states into `KeyboardController` | M3 | DONE |
| 5 | Pause Menu Overlay | Sleek top-left menu button to pause gameplay, rendering, and physics. Blurred glassmorphic cards with RESUME, RETRY, QUIT TO MAIN MENU | M3 | DONE |
| 6 | Automated Unit Tests & Verification | Write comprehensive unit and integration tests under `tests/` verifying touch control inputs, run Vitest, and perform final audits | M4, M5 | DONE |
| 7 | Responsive HUD & Menu Scaling | Design media query styles and CSS scaling factors to guarantee visual perfection on iPad, Android, and orientations | M6 | DONE |

## Interface Contracts
### `KeyboardController` Touch API
- `touchControlsEnabled`: boolean toggle to activate touch simulation.
- `touch`: object with keys `forward`, `backward`, `left`, `right`, `jump`, `steerAmount` (for analog controls).
- `updateCombinedState()`: merges `keys`, `mouse`, and `touch` inputs seamlessly.
