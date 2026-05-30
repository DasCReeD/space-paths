# SkyRoads WebGL Code Review Report

## Scorecard Rating

This section rates the core files against the **Global User Rules**:
1. **Immutability**: Creating new objects rather than mutating in-place (Spread operators, immutable state updates).
2. **Focus**: Keeping files small (<800 lines, focused modules, extracting utility functions).
3. **Error Handling**: Comprehensive and explicit try-catch blocks at system/module boundaries and async code.
4. **Input Validation**: Schema-based validation (e.g. Zod) or proactive validation at system boundaries.
5. **No `console` Statements**: No `console.log` or similar debug output in production files.

| File | Immutability | Focus / File Size | Error Handling | Input Validation | No console.log | Overall Grade |
|---|---|---|---|---|---|---|
| **app.js** | ❌ **FAIL** (High Mutation) | ❌ **FAIL** (877 lines, needs splitting) | ⚠️ **PARTIAL** (some try-catch, but missing at async boundaries) | ❌ **FAIL** (No system boundary schema check) | 🍏 **PASS** | **D** |
| **graphics.js** | ❌ **FAIL** (High Mutation) | ❌ **FAIL** (1,455 lines, extremely oversized) | ⚠️ **PARTIAL** (silent catches, no user alerts) | ❌ **FAIL** (No boundary validation) | 🍏 **PASS** | **D-** |
| **physics.js** | ❌ **FAIL** (High Mutation) | 🍏 **PASS** (541 lines) | ❌ **FAIL** (No try-catch blocks) | ❌ **FAIL** (No keyboard/level input validation) | 🍏 **PASS** | **D** |
| **levelLoader.js**| ❌ **FAIL** (High Mutation) | ❌ **FAIL** (846 lines, oversized) | ⚠️ **PARTIAL** (try-catches on texture loading, none on builders) | ❌ **FAIL** (No level schema validation) | 🍏 **PASS** | **D+** |
| **audio.js** | ❌ **FAIL** (State Mutation) | 🍏 **PASS** (418 lines) | ⚠️ **PARTIAL** (several try-catches but has console.warn/error) | ❌ **FAIL** (No envelope input validation) | ❌ **FAIL** (Uses `console.warn` and `console.error`) | **D** |

---

## Specific, Line-by-Line Observations

### 1. Immutability Violations (CRITICAL RULE VIOLATION)
The codebase extensively relies on mutating state in-place, modifying property values, or updating vector instances directly.

- **app.js**:
  - `this.tempSelectedModel = ...`, `this.tempSelectedSkin = ...` (mutations on the class instance rather than returning updated state descriptors).
  - Lines 441-450: In-place removal and mutation of Three.js materials and geometries.
  - Lines 496, 548, 556, 564: Modifying the `this.physics` vector state directly via methods like `this.physics.position.set(...)` or setting boolean flags in-place.
- **graphics.js**:
  - Lines 166-184: `data[i] = newR`, `data[i+1] = newG`, etc. direct pixel array mutation in `swapTextureColor`.
  - Lines 1000-1017: Deep structural tree modification using `this.shipMesh.remove(child)` and disposing geometries/materials sequentially.
  - Lines 1071-1076: Modifying rotations directly: `this.shipMesh.rotation.z += ...`.
  - Lines 1105-1112: In-place linear interpolation mutating vector objects: `this.camera.position.lerp(...)`.
- **physics.js**:
  - Entire `update(dt, keyboard, levelInfo)` method modifies `this.position`, `this.velocity`, `this.activeEffects`, `this.fuel`, and `this.oxygen` in-place (e.g. Lines 86, 88, 115, 120, 221-223).
  - Lines 268-271: Directly mutating `this.position.x` in-place when colliding with wall blocks.
  - Lines 386-390: In-place reset of `this.activeEffects` variables.
- **levelLoader.js**:
  - Processes and populates arrays passed by reference in `processTile(...)` (Lines 549, 581, 589, 604).
  - Mutates THREE meshes, geometries, and materials in-place (Lines 646, 652, 658).

### 2. Focus & File Size Violations
- **graphics.js** exceeds the absolute max constraint of 800 lines significantly (1,455 lines). It couples procedural ship meshes, asset texture caching, OBJ/FBX dynamic loaders, color replacement HSL logic, hyperdrive line particle systems, and scenery generators in a single file.
- **app.js** is 877 lines long, exceeding the 800-line limit. It combines UI event handlers, keyboard navigation matrices, HUD SVG render controllers, and level orchestrations.
- **levelLoader.js** is 846 lines long, which exceeds the 800-line constraint. It contains procedural canvas pattern creators alongside chunk-based asynchronous level meshes builders.

### 3. Error Handling Gaps
- **app.js**:
  - Lines 385, 462: `await loadLevelPack(packName)` and `await buildLevelAsync(...)` are called inside async methods without surrounding `try-catch` blocks. If any level file fails to load or parse, the entire orchestrator crashes silently.
- **physics.js**:
  - Completely lacks `try-catch` error handling blocks. Any undefined lookup in `levelInfo` causes the physics updates to panic.
- **graphics.js**:
  - Lines 357, 360, 609, 616, 945, 989, 1019, 1053, 1359: Multiple empty `catch` blocks or simple ignored callbacks where loader failures could lock up the rendering queue without user-friendly feedback.

### 4. System Boundary Input Validation Gaps
- **levelLoader.js** and **levels.js** do not validate JSON level structures before compiling geometries. Gaps or format deviations in row tile arrays will throw uncaught property lookup errors.
- **physics.js**:
  - `KeyboardController` does not validate keyboard event objects or mouse coordinates, making it vulnerable to null references if client parameters differ.

### 5. Console Statements in Production
- **audio.js**:
  - Line 16: `console.warn("Web Audio API is not supported in this browser:", e)`
  - Line 71: `console.error("Failed to start engine audio in test:", e)`
  - Line 111: `console.error("Failed to start engine audio:", e)`

---

## Concrete Refactoring Suggestions

### 1. Splitting `graphics.js` (Oversized: 1,455 lines)
We suggest breaking down `graphics.js` into smaller modules under a `graphics/` subdirectory:
- **`graphics/textureColorSwap.js`**: Extract the canvas-based color replacement logic (`swapTextureColor`, `rgbToHsl`, `hslToRgb`, `getCachedImage`).
- **`graphics/particleSystem.js`**: Extract thruster and explosion particle emitters and updates.
- **`graphics/starfield.js`**: Extract the cylinder warp segments starfield and rotating skybox pan updates.
- **`graphics/shipMeshGenerator.js`**: Extract procedural/fallback standard wedge ship meshes build steps.
- **`graphics/sceneryGenerator.js`**: Extract scenery loader and city templates cloning logic (`spawnCityScenery`).
- **`graphics/cameraController.js`**: Extract multi-camera setups, modes (`fixed` vs `follow`), zooming calculations, and HUD syncs.

### 2. Splitting `app.js` (Oversized: 877 lines)
Break down `app.js` into focused controller components:
- **`ui/keyboardMenuHandler.js`**: Move arrow key screens navigation matrices and focus behaviors out.
- **`ui/hudController.js`**: Move speedometer gauge SVGs dashboard ring redraw updates.
- **`ui/shipPickerUI.js`**: Move preview engine bindings, custom colors, and model selector clicks out.

### 3. Splitting `levelLoader.js` (Oversized: 846 lines)
Break down `levelLoader.js` into:
- **`level/proceduralTextures.js`**: Extract the heavy `getProceduralTexture(...)` patterns.
- **`level/tunnelBuilder.js`**: Extract the detailed Three.js archways constructors.
- **`level/finishLineBuilder.js`**: Extract neon arches and Z-finishing markers constructors.

---

## Action Items

1. **Adopt State Reducer Patterns in Physics**: Refactor `PhysicsEngine.js` state modifications to yield new immutable state descriptors rather than mutating `this.position` and `this.velocity` objects in-place.
2. **Deconstruct `graphics.js`**: Move modules out into `graphics/` directory following the proposed structure to comply with the <800 lines constraint.
3. **Deconstruct `app.js` and `levelLoader.js`**: Extract procedural textures and UI controller files to drop total lines per file below 800.
4. **Implement Zod Schema Boundary Validation**: Write schemas for `levels.json` and level pack structure in `levels.js` / `levelLoader.js` to fail fast during loading.
5. **Add Comprehensive Error Boundaries**: Wrap async pack loading and geometry builders in `app.js` inside structured try-catch clauses that alert the user gracefully.
6. **Remove `console` Logs**: Re-route console logs in `audio.js` to a custom logging wrapper or abstract them.
