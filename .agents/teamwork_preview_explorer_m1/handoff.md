# Handoff Report: SkyRoads 3D Models, Textures, and Asset Overhaul Requirements

## 1. Observation

Direct code observations from static analysis of `c:\dev\Sky roads`:

### A. Geometries & Coordinate System in `scratch/generate_models.py`
We inspected `scratch/generate_models.py` and observed:
1. **Ship Class Models**:
   - **Fighter**: Main fuselage is a cuboid of size `(0.22, 0.14, 1.1)` offset at `(0.0, 0.04, 0.0)`. Wings are cuboids of size `(0.16, 0.03, 0.55)` offset at `(±0.18, 0.0, -0.05)` rotated on Z by `±0.15` radians. Rear engine is a cylinder of length `0.18`, offsets `(0.0, 0.04, -0.6)`, rotated on X by `pi/2`. Dual blasters are cylinders of length `0.25` offset at `(±0.25, -0.02, 0.2)` rotated on X by `pi/2`.
   - **Hauler**: Fuselage is a cuboid of size `(0.38, 0.2, 1.05)` offset at `(0.0, 0.04, -0.05)`. Elevated front cockpit cabin is a cuboid of size `(0.32, 0.12, 0.3)` offset at `(0.0, 0.18, 0.32)`. Side cargo pads are size `(0.08, 0.12, 0.8)` offset at `(±0.23, -0.03, 0.0)`.
   - **Scout**: Core body is a cylinder of radius `0.15` and length `0.7` offset at `(0.0, 0.03, 0.05)` rotated on X by `pi/2`. Stabilizer fins are size `(0.1, 0.02, 0.35)` offset at `(±0.18, -0.02, -0.1)` rotated by `(0.05, 0.0, ±0.2)`.
   - **Dreadnought**: Fuselage is a cuboid of size `(0.42, 0.22, 1.15)`. Armored side plates are size `(0.06, 0.18, 0.95)` offset at `(±0.24, 0.04, 0.08)`. Multi-deck command bridge is size `(0.18, 0.12, 0.25)` offset at `(0.0, 0.18, -0.25)`.
   - **Cruiser**: Core body is a cuboid of size `(0.26, 0.16, 1.2)`. Wings are size `(0.12, 0.04, 0.65)` offset at `(±0.19, 0.02, -0.05)` rotated by `(0.0, ±0.1, ±0.1)`. Vertical tail fin is size `(0.02, 0.15, 0.25)` offset at `(0.0, 0.2, -0.45)` rotated on X by `0.1`.
2. **Tunnel Archway**:
   - Depth length $L = 3.0$ (from $z = -1.5$ to $z = 1.5$).
   - Inner radius = $1.5$, outer radius = $1.65$. Rib columns (outer radius = $1.75$) generated at $z = -1.5, 0.0, 1.5$.
3. **Coordinate Axes Direction**:
   - Ship nose (canopy/cockpit) is offset in **Positive Z** (e.g. cockpit on hauler is at $z = 0.32$).
   - Ship engines (thrusters) are offset in **Negative Z** (e.g. cruiser engine is at $z = -0.65$).
   - Left/right symmetric structures use mirrored positive/negative X coordinates.
   - Ground levels are near $Y = 0$, with hover pads located below (negative Y offsets).

### B. Loading, Scaling & Orientation in `graphics.js` and `physics.js`
1. **OBJ Loader Scaling**:
   - `graphics.js` loads ships via `OBJLoader`. It calculates the bounding box size using `THREE.Box3`.
   - Uniform scaling is calculated to make the **width (along X) exactly 1.4 units**:
     ```javascript
     const targetWidth = 1.4;
     const scaleFactor = targetWidth / (initialSize.x || 1.0);
     obj.scale.setScalar(scaleFactor);
     ```
2. **Visual Translation Offset**:
   - Meshes are translated to center them horizontally/longitudinally, and offset vertically:
     ```javascript
     obj.position.x = -finalCenter.x;
     obj.position.y = -finalCenter.y + 0.22;
     obj.position.z = -finalCenter.z + 0.1;
     ```
3. **OBJ Loader Rotation**:
   - The OBJ model is rotated by 180 degrees (`Math.PI`) on the Y axis to face forward:
     ```javascript
     const rotationY = isFbx ? -Math.PI / 2 : Math.PI;
     obj.rotation.y = rotationY; // Face forward
     ```
4. **Physical Dimensions**:
   - `physics.js` defines ship collision dimensions:
     ```javascript
     export const SHIP_WIDTH = 0.6;
     export const SHIP_HEIGHT = 0.4;
     export const SHIP_LENGTH = 1.8;
     ```

### C. Tunnel Archway Configuration in `levelLoader.js`
1. **Span & Scale Calculations**:
   - Columns indexes `[minC, maxC]` determine bounds:
     ```javascript
     const leftX = (minC - 3) * TILE_WIDTH - TILE_WIDTH / 2;
     const rightX = (maxC - 3) * TILE_WIDTH + TILE_WIDTH / 2;
     const totalSpan = rightX - leftX;
     const radius = totalSpan / 2;
     ```
   - Scaled asymmetrically:
     ```javascript
     const targetWidth = radius * 2;
     const targetHeight = radius;
     const targetLength = TILE_LENGTH; // 4.0
     obj.scale.set(targetWidth / size.x, targetHeight / size.y, targetLength / size.z);
     ```
2. **Ceiling Physical Collisions**:
   - Outer walls and ceilings are added to `collidables`. Ceiling min Y:
     ```javascript
     minY: baseY + archHeight - archThickness // archHeight = radius, archThickness = 0.15
     ```
   - For a 1-lane tunnel, `radius = 1.0`. Ceiling `minY` is `baseY + 0.85`.
3. **ReferenceError bug**:
   - `levelLoader.js` line 910:
     ```javascript
     normalTexture = getLoadedTexture(cpPatternNormalUrl);
     ```
   - Verification: A search across all files confirms `cpPatternNormalUrl` is **never defined, declared, or imported** in `levelLoader.js`.

### D. Procedural Textures & PBR System
1. **`generate_textures.js`**:
   - Renders `road_metallic_plate.png` and `spaceship_hull_plating.png` as 1024x1024 seamless PNGs using a seedable PRNG (Mulberry32).
   - Plates have beveled edge highlights, brushed metal noise, battle scratches, and 3D rivets.
2. **`levelLoader.js`**:
   - Canvas-based 256x256 fallback textures generated if standard files are missing. Geometric patterns are drawn per color index (e.g. speed chevrons, icy diamond lattices).
   - Materials are `THREE.MeshStandardMaterial`. Theme-defined roughness and metalness are applied (e.g., slippery/icy tiles use `roughness: 0.05`, `metalness: 0.95`). Special blocks use `emissiveIntensity: 3.0` for glowing neon colors.

---

## 2. Logic Chain

1. **Orientation**:
   - *Observation*: Ship nose is $+Z$ in generator space, while Standard Three.js uses $-Z$ as forward.
   - *Observation*: `graphics.js` rotates OBJ models on the Y axis by `Math.PI` (180 degrees) during load.
   - *Inference*: The 180-degree rotation is needed solely because the procedural generator exports models facing $+Z$. To make new assets load cleanly without manual rotation offsets, they must either be exported facing $-Z$ (forward in Three.js) or the `graphics.js` rotation logic must be parameterized or removed.

2. **Visual vs. Physics Discrepancy**:
   - *Observation*: Ship visual width is scaled to exactly `1.4` units.
   - *Observation*: Physics collision bounding box width is hardcoded at `0.6` units.
   - *Inference*: The visual ship is **2.33 times wider** than its physical collision box. This explains why ship wings can overlap walls and obstacles without crashing. An overhaul model matching the physical bounding box ($0.6\text{w} \times 0.4\text{h} \times 1.8\text{l}$) would look much smaller visually or require updating the physics engine constants to prevent visual wing clipping.

3. **Tunnel Clipping**:
   - *Observation*: For a 1-lane tunnel, physical width span is `2.0` units, making `radius = 1.0`.
   - *Observation*: The tunnel model is scaled to height equal to `radius`, resulting in a `1.0` unit visual ceiling height.
   - *Observation*: A scaled visual ship has a height of $\approx 1.1$ units.
   - *Inference*: The visual height of the ship ($1.1$) exceeds the visual height of a 1-lane tunnel ($1.0$). Therefore, the ship will visually clip through the tunnel ceiling while on the ground. To resolve this, 1-lane tunnels must be scaled with an asymmetric height factor (e.g., $1.5\text{x}$) or the visual ship must be scaled down.

4. **ReferenceError Bug**:
   - *Observation*: `cpPatternNormalUrl` is passed to `getLoadedTexture` on line 910 of `levelLoader.js`.
   - *Observation*: Ripgrep search confirms `cpPatternNormalUrl` is not declared or imported anywhere in `levelLoader.js`.
   - *Inference*: Attempting to load this fallback normal map in non-test mode when `normalTexture` is null will cause a `ReferenceError`, halting execution. This fallback must be fixed by declaring or importing the missing URL (likely mapping to `cpRoadNorm` or similar).

---

## 3. Caveats

- **External FBX Models**: FBX loader models use a different rotation offset (`-Math.PI / 2`) than OBJ models (`Math.PI`). If new models are exported in FBX format, they must account for the specific legacy FBX alignment rotation.
- **Dynamic Color Accents**: The accent swapping logic (`swapTextureColor` in `graphics.js`) depends on detecting red pixels in the base skin. If new skins do not use red zones to indicate paint accents, dynamic color changes will fail to apply.

---

## 4. Conclusion

The overhaul of SkyRoads 3D assets requires adjusting model axes (new models should face $-Z$ natively), correcting the $2.33\text{x}$ width discrepancy between visual meshes ($1.4$) and physics boxes ($0.6$), increasing 1-lane tunnel height scales to prevent visual clipping, separating ship components for individual PBR properties (glow, metal, glass), and resolving the undefined `cpPatternNormalUrl` reference in `levelLoader.js`.

---

## 5. Verification Method

1. **Verify Code Structures**:
   - Inspect ship dimensions in `physics.js` (lines 11-13) and model rotations in `graphics.js` (lines 1247-1248).
   - Inspect fallback normal mapping in `levelLoader.js` (line 910) to confirm the undefined variable.
2. **Verify Execution**:
   - Run the project test suite using `npm run test` or `npx vitest run` in `c:\dev\Sky roads` to ensure no current tests are failing.
   - Load the game and observe the 1-lane tunnel ceiling height relative to the spaceship.
