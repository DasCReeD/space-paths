# Handoff Report: SkyRoads WebGL Subsystem & Architecture Analysis

## 1. Observation

Direct code observations from static analysis of `c:\dev\Sky roads` codebase:

### File Statistics and Directory Contents

We listed the root directory contents, identifying the following key files:
- **`app.js`**: `31,913` bytes (877 lines). Contains `GameManager` class. Entry point of the application.
- **`graphics.js`**: `54,618` bytes (1,455 lines). Contains `GraphicsEngine` class. Integrates Three.js.
- **`physics.js`**: `18,298` bytes (541 lines). Contains `PhysicsEngine` and `KeyboardController`.
- **`levelLoader.js`**: `27,323` bytes (846 lines). Contains `buildLevel` and `buildLevelAsync` functions.
- **`audio.js`**: `14,146` bytes (418 lines). Contains `AudioSynthesizer` class and `gameAudio` singleton.
- **`rebuild_levels.py`**: `5,767` bytes (164 lines). Contains `BitReader`, `decompress_stream`, and `extract_pack` for `.LZS` offline decoding.
- **`levels.js`**: `1,577` bytes (or ~6.3 MB runtime/bundle size). Contains `loadLevelPack` and `getCachedPack` for lazy-loaded JSON level tracks.

---

## 2. Detailed Technical Analysis

### A. Subsystem Structure, Exports & Imports

#### 1. `app.js` (Game Orchestrator)
- **Role**: Bootstraps the application, coordinates rendering, physics, audio state transitions, and manages DOM screens/UI.
- **Imports**:
  - `loadLevelPack`, `getCachedPack` from `./levels.js`
  - `GraphicsEngine` from `./graphics.js`
  - `PhysicsEngine`, `KeyboardController`, `SHIP_LENGTH` from `./physics.js`
  - `buildLevelAsync` from `./levelLoader.js`
  - `gameAudio` from `./audio.js`
  - `ShipPreviewEngine` from `./preview.js`
- **Exports**: None (self-initializes on `DOMContentLoaded` via `window.addEventListener`).
- **Structure**: Instantiates a single `GameManager` instance that hosts `graphics`, `physics`, `keyboard`, and runs the game loop.

#### 2. `graphics.js` (Rendering Engine)
- **Role**: Initializes Three.js renderer, sets up camera (chase-cam and retro fixed modes), lights, sun mesh, procedural space nebula skybox, star streak line segments, and loads 3D models (OBJ/FBX) with dynamic texture-color shifting.
- **Imports**:
  - `* as THREE` from `'three'`
  - `SHIP_WIDTH`, `SHIP_HEIGHT`, `SHIP_LENGTH` from `./physics.js`
  - Ship asset URLs (`uvmap.jpg`, OBJ/FBX models, user skins, and seamless pack textures)
- **Exports**: `GraphicsEngine`, `SHIP_MODELS`, `SHIP_SKINS`, `SHIP_METRICS`, `BASE_TEXTURES`.
- **Structure**: Features modular setup methods (`createSkybox`, `createShipMesh`) and update functions to compute chase-camera lerping and dynamic hyperdrive parallax.

#### 3. `physics.js` (Kinematics & Input)
- **Role**: Drives the axis-aligned bounding box (AABB) collision system, handles player input (keyboard & mouse analogue steering), manages resources (fuel and oxygen consumption), and resolves special tile behaviors.
- **Imports**: `* as THREE` from `'three'`
- **Exports**: `ROAD_WIDTH_LANES`, `TILE_WIDTH`, `TILE_LENGTH`, `TOTAL_ROAD_WIDTH`, `SHIP_WIDTH`, `SHIP_HEIGHT`, `SHIP_LENGTH`, `PhysicsEngine`, `KeyboardController`.
- **Structure**: Pure physics solver separated from rendering. Calculates 3D kinematic vector positions, bounding box updates, landing rebounds, and registers global keyboard event listeners.

#### 4. `levelLoader.js` (3D Track Geometry Generator)
- **Role**: Converts pre-extracted level JSON schemas into tangible 3D meshes (road panels, neon blocks, tunnel arches, final finish arches) and builds lists of dynamic collidables and special zones.
- **Imports**:
  - `* as THREE` from `'three'`
  - `road_metallic_plate.png` and color-divided abstract seamless texture packs.
- **Exports**: `TILE_WIDTH`, `TILE_LENGTH`, `ROAD_WIDTH_LANES`, `TOTAL_ROAD_WIDTH`, `buildLevel`, `buildLevelAsync`.
- **Structure**: Offers both a synchronous `buildLevel` (tests/small grids) and a time-sliced asynchronous `buildLevelAsync` (using `setTimeout(..., 0)` in `CHUNK_SIZE = 50` rows) to prevent blocking the main browser thread on massive level tracks.

#### 5. `audio.js` (Sound Synthesizer)
- **Role**: Generates real-time retro game audio completely procedurally via the browser's native **Web Audio API**—eliminating the need for static sound asset files.
- **Imports**: None.
- **Exports**: `gameAudio` (AudioSynthesizer singleton instance).
- **Structure**: Modular synthesis methods generating sweeps and noise bursts using Web Audio oscillators (`sawtooth`, `triangle`, `sine`), gain nodes, and biquad filters.

---

### B. Core Functions Reference

| File | Function/Method | Parameters | Return Value | Side Effects / Purpose |
|---|---|---|---|---|
| **`app.js`** | `init()` | None | `void` | Mounts WebGL, registers keyboard camera shortcuts (`C`, `[`, `]`, `-`, `=`), starts game loop. |
| | `startLevel(index)` | `index: number` | `Promise<void>` | Clears graphics, resets physics, asynchronously calls `buildLevelAsync` to generate the new track, and plays the engine hum. |
| | `animate(timestamp)` | `timestamp: number` | `void` | Orchestrates the primary game loop: updates physics, triggers HUD redrawing, updates engine speeds, checks victory/death conditions. |
| | `updateHUD()` | None | `void` | Modulates the outer SVG circles for speed, fuel, oxygen, and coordinates the vertical progress bar. |
| **`graphics.js`**| `init(container)` | `container: HTMLElement` | `void` | Spawns a PerspectiveCamera, WebGLRenderer with PCFSoft shadows, FogExp2, ambient/directional lights, and draws the skybox/ship. |
| | `update(physics, dt)` | `physics: PhysicsEngine`, `dt: number` | `void` | Shifts the spaceship mesh, computes chase-cam lerping (fixed horizontally or follow X/Y/Z), updates hyperdrive star streaks. |
| | `triggerExplosion(pos)` | `pos: THREE.Vector3` | `void` | Instantiates `180` neon green/pink particles with radial vectors, hides the spaceship model. |
| **`physics.js`** | `reset(fuel, oxygen)` | `startFuel: number`, `startOxygen: number` | `void` | Restores position to origin, resets velocity vectors, maps DOS fuel scaling (`startFuel * 50`), clears death reasons. |
| | `update(dt, keyboard, levelInfo)` | `dt: number`, `keyboard`, `levelInfo` | `void` | Consumes resources, calculates vector kinematics, executes the AABB collision checks, and registers rebounding bounce heights. |
| | `resolveSpecialTiles(tiles)`| `specialTiles` | `void` | Checks ship box intersection against special bounding boxes and toggles boost, slippery, sticky, and burning flags. |
| **`levelLoader.js`**| `buildLevelAsync(data, scene, onProgress)`| `levelData`, `scene`, `onProgress: function` | `Promise<LevelInfo>` | Time-sliced loop processing rows in chunks of 50. Resolves with bounding boxes, special behaviors, and mesh references. |
| **`audio.js`** | `startEngine()` | None | `void` | Procedurally blends three detuned oscillators (sawtooth/triangle at 35Hz, 70Hz, 105.5Hz) through a resonant lowpass filter. |
| | `updateEngineSpeed(ratio)`| `ratio: number` | `void` | Maps the speed ratio (0 to 1) to dynamically modulate oscillator frequencies and sweep the lowpass filter cutoff (220Hz to 870Hz). |
| | `playExplosion()` | None | `void` | Generates a 1.2-second brown noise buffer swept through a lowpass filter (600Hz to 60Hz) to produce a deep crunch sound. |

---

### C. Core State Variables and Cross-Module Flow

The system employs a tightly-coupled flow mediated by explicit instance parameters and global `window` objects:

1. **State Ownership**:
   - **`GameManager.gameState`**: The central Finite State Machine variable (`menu`, `loading`, `level_select`, `playing`, `death`, `success`). It decides which screen overlay is active and whether `animate()` executes rendering only or invokes the physics step.
   - **`PhysicsEngine.position` / `velocity`**: Calculated strictly within `physics.js`. `graphics.js` queries `physics.position` inside its `update()` method to position the 3D ship mesh and smoothly offset the camera position.
   - **`PhysicsEngine.fuel` / `oxygen` / `activeEffects`**: Driven by resource ticks and special tile intersections. Sampled frame-by-frame by `GameManager.updateHUD()` to paint the SVG status gauges.
   - **`PhysicsEngine.isDead` / `deathReason`**: Raised by resources hitting zero, falling below Y=-4.0, or block crashes. `app.js` reads these flags to halt the gameplay, trigger explosion particles, play the procedural noise blast, and switch the state machine to `death`.

2. **Global Window Interfacing (State Coupling)**:
   - For performance and structure, `app.js` binds level metrics globally:
     - `window.currentGamePack`
     - `window.currentLevelIndex`
     - `window.currentLevelData`
   - **`PhysicsEngine.checkTileExists(x, z)`** queries `window.currentLevelData.rows` to determine if a flat panel exists at the current grid row/column. If a coordinate returns `null`, the physics engine allows the ship to fall through the pit, triggering gravity and a "FELL OFF ROAD" death state.

---

### D. LZS Binary Decompression & Representation

The `.LZS` (Lempel-Ziv-Storer) decompression is an **offline preprocessing step** handled by `rebuild_levels.py` rather than a runtime browser component. The resulting decompressed data is structured into pure static JSON assets embedded in `levels.js`.

#### 1. Bit-Level LZS Decompression Algorithm
In `rebuild_levels.py`, `decompress_stream` decodes the binary level buffers:
- **Bit-by-Bit Stream Processing**: A custom `BitReader` consumes bits sequentially from a byte offset.
- **Dynamic Compression Bit Widths**: The first 3 bytes of the compressed stream denote three bit widths: `width1`, `width2`, and `width3`.
- **Prefix Decoding Rules**:
  - **Prefix `0` (Reference/Copy short distance)**:
    - Reads next `width2` bits to get `distance` (actual back-reference distance is `distance + 2`).
    - Reads next `width1` bits to get `count` (number of bytes to repeat is `count + 2`).
    - Copies `count` bytes from the back-history `output[-distance]` into the output array.
  - **Prefix `10` (Reference/Copy long distance)**:
    - Reads next `width3` bits to get `distance` (actual distance is `distance + 2 + (1 << width2)`).
    - Reads next `width1` bits to get `count` (number of bytes is `count + 2`).
    - Copies `count` bytes from back-history into the output array.
  - **Prefix `11` (Literal byte)**:
    - Reads the next 8 bits as a literal byte and appends it directly to the output.

#### 2. In-Memory Level Representation
The decompressed stream yields a sequential byte array:
- **Header Structure**:
  - `gravity` (uint16)
  - `fuel` (uint16)
  - `oxygen` (uint16)
  - `palette` (72 colors, 3 bytes each: red, green, blue). Mapped from VGA intensity (0 to 63) to regular RGB (0 to 255) using `(color_val * 255) // 63`.
- **Tile Grid Representation**:
  - The remaining bytes are parsed as pairs of bytes representing **16-bit packed unsigned integers (`uint16`)**.
  - There are exactly 7 columns per row.
  - Each 16-bit word is decoded using the **Shikadi ModdingWiki Bit Spec**:
    - `bottom_color = val & 0xF` (palette index 0–15)
    - `top_color = (val >> 4) & 0xF` (palette index 0–15)
    - `tunnel = bool((val >> 8) & 1)` (has tunnel overlay)
    - `half_height = bool((val >> 9) & 1)` (has half-height block geometry)
    - `full_height = bool((val >> 10) & 1)` (has full-height block geometry)
    - If a tile's 16-bit value is `0`, it represents an **empty space/gap (`null`)**.

---

### E. Graphics Setup, Game Loop, and Three.js Integration

#### 1. WebGL Setup
- **Scene Fog**: `THREE.FogExp2` configured at `0x0a0519` color with `0.003` density.
- **Lighting**: Features a bright overhead DirectionalLight (intensity `2.2`) that guarantees high visibility, flanked by neon pink and cyan lights to emphasize the synthwave retro-neon shadows.
- **Skybox/Background**: Built as a massive sphere mapped with a space nebula texture using linear filters to prevent pixel blurring, layered with 3D line streaks that simulate warping space dust.

#### 2. Three.js Ship Models & Dynamic Skins
- The system supports 3D OBJ/FBX models (e.g., *Majadroid Fighters*, *Battle Corvettes*).
- **Dynamic Accent Color Swap**:
  - The system loads the base skin (e.g., `spaceship_hull_plating.png` or `T_Spase_64.png`).
  - Converts the pixels to HSL, identifies red accent/decal areas (`h < 35 || h > 325`), and dynamically sweeps the HSL values to match the player's custom hex color selection.
  - Generates a new `THREE.CanvasTexture` on the fly to swap ship colors seamlessly.

#### 3. Game Loop Pipeline
The game loop runs via browser `requestAnimationFrame` hooks:
```
1. requestAnimationFrame(animate) -> calculates DT (capped at 50ms to prevent tunneling).
2. physics.update() -> checks steering inputs, advances ship vectors, updates bounding boxes.
3. Collisions solved -> tests box overlaps against collidables (walls slide, obstacles block, road panels support).
4. specialTiles resolved -> tests overlay triggers (refills, boosts, burning, sticky).
5. GameManager.updateHUD() -> syncs SVG speedometer, progress meters, and HUD readouts.
6. graphics.update() -> aligns shipMesh position/rotation (banks during steering, pitches during jumps).
7. camera.lerp() -> executes chase-camera smoothing.
8. gameAudio.updateEngineSpeed() -> modulates procedural engine frequency.
9. renderer.render(scene, camera) -> paints the WebGL view.
```

---

### F. Audio Contexts & Sound Design

The system implements fully procedural real-time synthesis:
- **Engine Sound**: Merges three oscillators (sawtooth low rumble at 35Hz, triangle growl at 70Hz, detuned sawtooth at 105.5Hz) passed through a dynamic `BiquadFilter` lowpass node. Increasing ship velocity triggers a linear sweep of frequencies and shifts the lowpass filter frequency up from 220Hz to 870Hz.
- **Explosion Sound**: Generates a 1.2-second buffer of custom-filtered brown noise. The signal is swept through a lowpass filter node (sweeping down from 600Hz to 60Hz) combined with an exponential gain falloff to simulate a deep, decaying shockwave.
- **Landing Rebound**: Creates a dual-oscillator chime combining a low sine wave thud (80Hz to 30Hz) and a springy triangle upward pitch sweep (90Hz to 220Hz).
- **Resource Refills**: Fires two sine wave chime notes in sequence: C5 (`523.25` Hz) followed 80ms later by G5 (`783.99` Hz).
- **Steering Thrusters**: Generates a short, low-volume white-noise burst passed through a bandpass filter (sweeping from 1400Hz to 700Hz) to mimic pneumatic thruster puffs.

---

### G. Detailed Architecture Map

The interaction pathways between files follow a hub-and-spoke schema structured as follows:

```
                      +-------------------+
                      |     levels.js     |
                      | (Level Data Pack) |
                      +---------+---------+
                                |
                                | parses / returns JSON
                                v
                      +-------------------+
                      |      app.js       | <======================+
                      |  (Game Manager)   |                        |
                      +---+---+---+---+---+                        |
                          |   |   |   |                            |
      +-------------------+   |   |   +--------------------+       |
      |                       |   |                        |       |
      v                       |   |                        v       |
+-----------+                 |   |                  +-----------+ | writes global state
|  audio.js |                 |   |                  |physics.js | | (window.currentLevelData)
|(Synthesizer)                |   |                  | (Physics) | +
+-----------+                 |   |                  +-----+-----+
                              |   |                        |
                              |   |                        | checks gaps / pit falls
                              |   |                        v
                              |   |                  +-----------+
                              |   |                  | levels.js |
                              |   |                  | (LevelRow)|
                              |   |                  +-----------+
                              |   |
                              |   v
                              | +--------------------+
                              | |   levelLoader.js   |
                              | |  (Grid Mesh / BB)  |
                              | +---------+----------+
                              |           |
                              |           | builds 3D meshes & AABB boxes
                              v           v
                      +-------------------+
                      |    graphics.js    |
                      | (Three.js Render) |
                      +-------------------+
```

---

## 3. Caveats

1. **Memory Dispositions**: The level mesh regeneration in `app.js` proactively disposes of old geometries and materials, but complex textures loaded dynamically inside the ship picker could cause minor GPU memory leakage if the user rapidly switches ship colors and skins.
2. **Implicit Coupling**: The physics engine checks for gap detection by querying `window.currentLevelData.rows[rIdx][cIdx]`. This relies on `app.js` maintaining this global. If the global is cleared or modified, it will fall back to assuming tiles exist, preventing correct gap falls.
3. **No Dynamic LZS Loading**: The browser codebase contains zero binary parsing or LZS decompression code. Gaps are pre-determined offline.

---

## 4. Conclusion

The SkyRoads WebGL architecture is highly optimized, self-contained, and faithful to the mechanics of the original 1993 DOS game. It decouples kinematics solver tasks (`physics.js`), procedurally synthesizes audio (`audio.js`), time-slices large-scale track generation (`levelLoader.js`), and implements modern WebGL visual configurations (`graphics.js`), all organized under a central orchestrating state machine (`app.js`).

---

## 5. Verification Method

To verify this architecture and ensure correct behavioral execution, run the Vitest test suites:
- Command: `npm run test` or `npx vitest run` in `c:\dev\Sky roads`.
- Inspect tests within the `/tests` directory to verify collision boundaries, landing rebounds, and dynamic color-swapping logic.
