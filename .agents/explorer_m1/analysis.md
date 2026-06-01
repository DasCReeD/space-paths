# Next-Gen Overhaul Analysis & Design Specification

This analysis outlines the architectural findings and provides a high-fidelity implementation plan for the Sky Roads Next-Gen Overhaul, covering GPU shaders, swirling particle galaxies, spaceship trails, track geometry corrections, and adjustable physics.

---

## 1. Architectural & Codebase Findings

We thoroughly explored the flat, hub-and-spoke ES Module structure. The exact locations, patterns, and current states of the targeted systems are mapped below:

### A. Skybox / Background Systems
- **File & Line**: `graphics.js:5` (Import) and `graphics.js:424-450` (`createSkybox()`).
- **Current State**: Loads a large, static texture `skybox_space_nebula.png` via `THREE.TextureLoader()`, wraps it around a massive `THREE.SphereGeometry(450, 32, 32)` with a simple `THREE.MeshBasicMaterial`.
- **Drawbacks**: Static, uninspired background with a heavy 1.1MB image download, which goes against modern procedural WebGL best practices.

### B. Spaceship Engines, Trails, HUD & Tracks
- **Engines & Exhaust**: `graphics.js:1181-1279` (`updateParticles()`). Individually instantiates `SphereGeometry` meshes and basic materials in a loop for every frame, pushing them into a CPU array `this.particles` and adding/removing them to/from `THREE.Scene`.
- **Trails**: Currently no dedicated continuous ribbons or glowing trail paths exist. Only loose exhaust particles are shot backward.
- **HUD**: Declared in `index.html:28-170` (DOM element `.hud-container` / `.cockpit-panel`) and controlled via direct DOM updates in `app.js:600-685`. Includes decorative SVG circles for speed, oxygen, and fuel.
- **Tracks**: Level loader `levelLoader.js` instantiates standard flat boxes using a custom procedural or seamless canvas texture in `createTileMaterial()` (line 515).

### C. Tunnel Parsing & Geometries
- **File & Line**: `levelLoader.js:618` (Parsing check) and `levelLoader.js:626-694` (`buildTunnel()`).
- **Current State**: Tunnels are built using three distinct flat rectangular box meshes (`BoxGeometry`): a `leftWall`, `rightWall`, and `ceiling` of standard width `TILE_WIDTH` (2.0) spanning exactly one lane.
- **Issues**:
  1. Tunnels are perfectly square instead of the smooth rounded arches of the original game.
  2. The parser instantiates wall meshes for *every* individual tile marked with `tile.tunnel = true`. If multiple adjacent columns are tunnels in a row, internal walls are placed *between* the lanes inside the tunnel, creating unavoidable collision barriers that trap the ship and block all steering.

### D. Gravity & Landing Rebounds
- **File & Line**: `physics.js:202-218` (Gravity update) and `physics.js:297, 329` (Landing bounce).
- **Current State**:
  - Landing bounce has a hardcoded upward rebound impulse: `this.velocity.y = 4.2`.
  - Gravity scales linearly with the level data value in `extractLevelMeta()` in `levelLoader.js:740` (`levelData.gravity * 3.0` falling back to `24.0`).
- **Floatiness**: Jumps feel slightly floaty on low-gravity levels, with no option for the player to tune damping or quicken landings.

---

## 2. Next-Gen Design & Proposed Implementations

To address all R1-R6 requirements cleanly while maintaining a 60 FPS performance envelope and full Vitest backward compatibility, we propose the following high-fidelity mathematical and structural designs:

### R2. Procedural Galaxy & Custom GPU Shaders (Background)
Instead of static images, we will implement a dual-layered GPU-driven cosmic background:

#### 1. Volumetric Nebula Custom Shader
Applied to a massive sphere shell `THREE.SphereGeometry(450, 64, 64)`. The shader uses a **Fractional Brownian Motion (fBm)** noise generator inside the GPU fragment shader to synthesize shifting nebulous clouds.

**Proposed GLSL Vertex Shader Pattern:**
```glsl
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

**Proposed GLSL Fragment Shader Pattern:**
```glsl
uniform float uTime;
varying vec2 vUv;
varying vec3 vPosition;

// GPU noise helpers
float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(in vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                   mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                   mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < 4; ++i) {
        v += a * noise(p);
        p = p * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}

void main() {
    // scale position and offset z over time for scrolling/warping nebulae
    vec3 coord = vPosition * 0.004 + vec3(0.0, 0.0, uTime * 0.015);
    float n = fbm(coord);
    
    // Cyberpunk stellar color palette: Deep Velvet Purple -> Hyper Magenta -> Neon Cyan highlights
    vec3 spacePurple = vec3(0.08, 0.02, 0.2);
    vec3 cosmicMagenta = vec3(0.85, 0.0, 0.45);
    vec3 starlightCyan = vec3(0.0, 0.75, 0.85);
    
    vec3 finalColor = mix(spacePurple, cosmicMagenta, n);
    float n2 = fbm(coord + vec3(4.0, 2.0, 0.0));
    finalColor = mix(finalColor, starlightCyan, n2 * 0.35);
    
    // Add brightness spikes
    finalColor += vec3(pow(n, 5.0) * 0.5);
    
    gl_FragColor = vec4(finalColor, 1.0);
}
```

#### 2. Logarithmic Spiral Galaxy Particle System
A standalone `THREE.Points` particle system rotating in real time. Stars are distributed mathematically along a double-armed logarithmic spiral:
$$r = a \cdot e^{b \cdot \theta}$$

- **Distribution Math**:
  For $N = 1500$ particles:
  - Generate angle $\theta_i$ spanning $0$ to $3\pi$.
  - Assign to Arm 1 ($\theta_i$) or Arm 2 ($\theta_i + \pi$).
  - Position:
    $$x_i = r_i \cos(\theta_i) + \Delta x_i$$
    $$y_i = \Delta y_i$$
    $$z_i = r_i \sin(\theta_i) + \Delta z_i - 200.0$$
    Where $\Delta x, \Delta y, \Delta z$ are random offsets following a normal distribution tapering off further away from the galactic center.
  - **Rotation Update**: In `graphics.js:update()`, the angle $\theta_i$ rotates:
    $$\theta_{new} = \theta + \omega(r) \cdot dt$$
    Where galactic rotation speed $\omega$ decays with radius to avoid simple solid-body rotation:
    $$\omega(r) = \frac{\omega_0}{1.0 + \gamma \cdot r}$$

---

### R3. Visuals, Track & HUD Overhaul
- **Glowing Spaceship Trails**:
  Instead of spawning CPU-heavy sphere meshes, wings will emit a continuous neon trail.
  - Structuring: A `THREE.BufferGeometry` representing a quad strip ribbon mesh.
  - Vertices are generated dynamically by storing the last 15 wingtip coordinates inside a history queue during `graphics.js` frames.
  - A custom material with transparency and `additive blending` is used. Vertex attributes map the opacity linearly from $1.0$ (nozzles) to $0.0$ (tail end), creating a beautiful glowing fading stream.
- **Dynamic Track Lighting**:
  Customize road tile materials using a custom shader pattern on top of procedural canvas grids. Inject a moving sine-wave neon pathway emission:
  $$\text{neonPulse} = \max\left(0.0, \sin\left(\frac{z}{3.0} + \text{uTime} \cdot 5.0\right)\right)^{4.0}$$
  Multiply this by the tile's secondary palette glow color to send bright neon energy pulses racing down the highway.
- **Cyberpunk Sleek HUD**:
  Add drop shadow glows and scanning line filters:
  ```css
  .lcd-value {
    text-shadow: 0 0 10px rgba(0, 255, 204, 0.8);
    font-family: 'Orbitron', monospace;
  }
  .gauge-inner-bg {
    filter: drop-shadow(0 0 12px #ff00ff);
  }
  ```

---

### R5. Tunnel Translation & Geometry Correction (Navigability)
To ensure maximum navigability and visual elegance, we correct tunnel geometry in two steps:

#### 1. Rounded Geometry formulation
Instead of three box coordinates, build a beautiful semi-cylindrical archway covering the road lanes.
- Shape: `THREE.CylinderGeometry(radius, radius, length, radialSegments, heightSegments, openEnded, thetaStart, thetaLength)`
  - `radius = 3.5` (height is comfortable for the spacecraft size).
  - `thetaStart = Math.PI` and `thetaLength = Math.PI` to create the upper curved dome arch.
  - `length = TILE_LENGTH` (4.0 units).

#### 2. Multi-Lane Tunnel Span Merging Algorithm
To prevent inner partition walls when multiple adjacent columns have tunnel markers in a single row:
1. **Group Adjacent Columns**:
   Inside `levelLoader.js`, before building individual blocks of row $R$, scan across columns $0$ to $6$.
   - Find contiguous groups of columns where `tile.tunnel === true` (e.g. Columns 2, 3, and 4 forming group $G = [2, 4]$).
2. **Merge Geometry**:
   Instead of drawing isolated tunnel segments for each tile, create a single large tunnel spanning the entire width from column 2's outer left boundary to column 4's outer right boundary.
   - Span width $W = (\text{endColumn} - \text{startColumn} + 1) \times \text{TILE\_WIDTH}$.
   - Spawn a single wide `CylinderGeometry` spanning width $W$.
3. **Optimized Collision Mesh**:
   Only generate three bounding box collidables:
   - One left wall at the outer boundary.
   - One right wall at the outer boundary.
   - One flat ceiling at the very top.
   This guarantees that the interior is a wide-open, unified, safe navigable chamber without any internal partition walls.

---

### R6. Adjustable Bounce Speed & Gravity Physics (Floatiness)
We introduce custom configurations to eliminate floatiness and responsive jumping.

- **Dampening Configuration**:
  Add settings to the `PhysicsEngine` constructor:
  ```javascript
  this.settings = {
    bounceFactor: 1.0,        // Scales rebound upward impulse (velocity.y)
    gravityFactor: 1.0,       // Scales overall downward acceleration force
  };
  ```
- **Physics Equations Integration**:
  - Rebound:
    ```javascript
    if (this.velocity.y < -3.0) {
      this.isRebounding = true;
      this.reboundTimer = 0.12;
      this.velocity.y = 4.2 * this.settings.bounceFactor; // Dynamic bounce velocity
      this.onGround = false;
      this.triggerLandingReboundAudio = true;
    }
    ```
  - Gravity:
    ```javascript
    let gravityForce = levelInfo.gravity * this.settings.gravityFactor;
    if (this.velocity.y < 0) {
      gravityForce *= 1.45; // Keep snappy falling
    }
    ```
- **HUD Settings Control**:
  Add a interactive hotkey trigger (e.g., `O` to increase gravity/damping, `P` to decrease) or a configuration slider inside the HUD cockpit sidebar to allow the player to instantly tune physics behavior in real time.
