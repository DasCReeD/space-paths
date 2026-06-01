# Implementation Plan: Sky Roads Next-Gen Overhaul

We will execute the implementation across sequential milestones to ensure high quality, performance (60 FPS), and clean isolation.

## Milestone 1: Exploration & Planning
- [x] Spawns explorer to research codebase structure and locate targets.
- [x] Produce detailed mathematical specifications for particles, shaders, tunnel merging, and physics parameters.

## Milestone 2: Branching Isolation & Skybox Decoupling
- [ ] Create and switch to a new git branch: `feature/nextgen-graphics`.
- [ ] Completely decouple, remove import, loading configurations, and references to `skybox_space_nebula.png`.
- [ ] Delete/remove `skybox_space_nebula.png` from tracking and the file system.
- [ ] Setup a placeholder standard black/nebula ShaderMaterial in `graphics.js:createSkybox()` to verify decoupling without compile errors.

## Milestone 3: Procedural Cosmic Galaxy Skybox Overhaul
- [ ] Implement custom GPU Vertex & Fragment Shaders using a 3D Fractional Brownian Motion (fBm) noise algorithm to generate dynamic, swirling volumetric neon nebulae on a massive sphere background.
- [ ] Implement an animated Double-Armed Logarithmic Spiral particle system ($r = a \cdot e^{b\theta}$) rotating dynamically over time with radial velocity decay ($\omega(r) = \omega_0 / (1.0 + \gamma r)$) behind the play space.
- [ ] Ensure 60 FPS performance by keeping particle count optimized (~1500 particles) and leveraging GPU operations.

## Milestone 4: Visuals, Track, and HUD Next-Gen Overhaul
- [ ] Overhaul spaceship exhaust with sleeker engine flames and glowing wings trail ribbons using a dynamic `BufferGeometry` quad-strip history queue with AdditiveBlending.
- [ ] Apply animated glowing neon pathways on road materials using time-based moving sine-wave patterns.
- [ ] Polish the HUD cockpit/containers with beautiful Orbitron text-shadows, glow filters, and scanning line overlays.

## Milestone 5: Tunnel Translation, Scale, and Navigability
- [ ] Correct track translation logic in `levelLoader.js` where tunnel blocks were misparsed/offset.
- [ ] Implement a Multi-Lane Tunnel Span Merging algorithm inside `levelLoader.js` to combine adjacent columns into a single wide arched geometry, preventing internal partition walls.
- [ ] Scale and round/curve tunnel blocks correctly using semi-cylindrical geometries (`CylinderGeometry`) with double-sided materials.
- [ ] Verify that a clear navigable path is fully open and unblocked in all levels.

## Milestone 6: Gravity & Bounce Physics Settings
- [ ] Introduce adjustable `bounceFactor` and `gravityFactor` multipliers to `PhysicsEngine`.
- [ ] Integrate factors into landing rebound equations and gravity calculations in `physics.js`.
- [ ] Expose settings controls (hotkeys 'O'/'P' or slider controls in HUD) so player can adjust values in real-time to eliminate "floatiness".

## Milestone 7: Testing, Verification & Forensic Audit
- [ ] Run test suite `npm run test` using Vitest to confirm zero regressions in existing tests.
- [ ] Run Forensic Auditor to confirm authentic, non-hardcoded, clean WebGL shader and physics implementation.
- [ ] Verify clean Git status on the branch `feature/nextgen-graphics`.
