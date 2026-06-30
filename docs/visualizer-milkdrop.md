# Milkdrop Visualizer (THREE-native) — Architecture & Handoff

Status: **Phase 1 complete and verified on real hardware.** The music
visualizer used as the scene background (and the optional flanking "wall
mode" meshes) is now a custom THREE-native reimplementation of Milkdrop's
default render pipeline. It replaces the previous Butterchurn integration.

---

## Why this exists (the problem it solves)

Butterchurn (the JS MilkDrop engine) renders into its **own** WebGL context.
Using its output as a THREE scene texture therefore required copying pixels
from Butterchurn's context into THREE's context every frame. That
cross-context copy is a GPU command-queue fence/sync — it stalled the game
(FPS into the 20s-30s with CPU **and** GPU sitting idle, the signature of a
wait, not real work). Every transfer variant was tried and all stalled:

- 2D-canvas blit → `THREE.CanvasTexture` upload
- main-thread `createImageBitmap` (worse — forces a GPU readback)
- Web Worker + `OffscreenCanvas` + transferred `ImageBitmap` (moved Butterchurn
  compute off-thread, but the ImageBitmap→texture upload still stalled)

Two attempts to make Butterchurn render **into** THREE's context (shared
context) **black-screened the whole game** with an unrecoverable
`GL_INVALID_OPERATION` on real GPU hardware — because Butterchurn issues raw
WebGL calls behind THREE's back and corrupts THREE's state cache (WebGL errors
don't throw, so it can't even be caught/recovered).

**The fix:** stop using Butterchurn's renderer entirely. Reimplement
Milkdrop's *default* pipeline using **only THREE's public API**
(`ShaderMaterial` + `WebGLRenderTarget` ping-pong). This is the standard,
ubiquitous THREE render-to-texture pattern — THREE fully manages its own GL
state, so the context-corruption class of bug is structurally impossible, and
the output is a normal THREE texture already in the game's context: **zero
transfer, zero stall, native resolution.**

### What made this tractable

- **All 179 preset JSONs use the DEFAULT warp/comp shaders** (their `warp` and
  `comp` fields are empty). So there is **no HLSL→GLSL translation** — we
  implement Milkdrop's two default shaders once.
- **The preset equations are already JavaScript.** The offline
  `milkdrop-preset-converter` already turned Milkdrop's NS-EEL expression
  language into runnable JS strings (e.g. `frame_eqs_str` =
  `"a['zoom']=(1-...); a['rot']=...;"`). We just `new Function` them — no
  expression parser needed.

---

## Architecture

```
Webamp playback ──► AnalyserNode (media.getAnalyser())
                          │
              ┌───────────▼────────────┐
              │ milkdrop/audioLevels.js │  bass/mid/treb + attack smoothing
              └───────────┬────────────┘  (+ time-domain PCM for the waveform)
                          │ per frame
   preset JSON ──► milkdrop/equations.js   frame_eqs / pixel_eqs as JS funcs
   (already JS)         │ run
                  ┌──────▼──────────────────────────────────────┐
                  │ milkdrop/renderer.js (MilkdropRenderer)       │
                  │  • run frame_eqs → motion/appearance uniforms │
                  │  • run pixel_eqs over 48×36 grid → warp UVs    │
                  │  • WARP pass: prev frame ×decay, distorted     │   all in
                  │    + basic audio waveform drawn on top         │   THREE's
                  │    (the feedback "seed")                       │   OWN
                  │  • COMP pass: echo/gamma/post → output target  │   context
                  │  • swap ping-pong buffers                      │
                  └──────┬───────────────────────────────────────┘
                         │ outputRT.texture  (a normal THREE texture)
                         ▼
        graphics.js:  scene.background = texture   AND   wall-mode mesh .map
                         ▼
                  EffectComposer (RenderPass → bloom → output) → screen
```

Per game frame, `graphics.render()` calls `engine.renderFrame()` (which draws
the visualizer into its render targets and restores `setRenderTarget(null)`)
**before** `composer.render()`, so the background texture is current.

---

## Modules (`visualizer/milkdrop/`)

All ported faithfully from Butterchurn's source (MIT,
`node_modules/butterchurn/dist/butterchurn.js`) — line refs are to that file.

| File | What it does | Borrowed from Butterchurn |
|------|--------------|---------------------------|
| `equations.js` | The milkdrop math helpers (`div`, `above`, `below`, `equal`, `pow`, `mod`, `sqrt`, `sqr`, `sign`, `randint`, `bnot`, `bor`, `bitand`, `sigmoid`, …) and a `compileEq(str)` that wraps a preset's `*_eqs_str` into a function via `new Function('a', ...helpers, body)`. The variable bag `a` is mutated in place. Empty/blank or malformed eqs compile to a safe no-op. | Helpers ~lines 63-184 |
| `audioLevels.js` | `AudioLevels(analyser)` — reads `getByteFrequencyData`, bins into bass (20-320 Hz), mid (320-2800 Hz), treb (2800-11025 Hz), and computes attack/decay-smoothed `*_att` via the `avg`/`longAvg` EMA (attack rate 0.2 / release 0.5, FPS-adjusted `rate**(30/fps)`, normalized by `longAvg`). Also samples `getByteTimeDomainData` for the waveform. | `AudioLevels` ~3175-3301 |
| `shaders.js` | The DEFAULT warp + comp shaders rewritten as THREE-idiomatic GLSL1. Warp frag = sample previous frame at the per-vertex warped UV × decay. Comp frag = echo + gamma + brighten/darken/solarize/invert. | warp ~7169/7187, comp ~8048-8074 |
| `renderer.js` | `MilkdropRenderer(threeRenderer, {width,height})` — owns the ping-pong `WebGLRenderTarget`s, the 48×36 warp mesh + per-vertex `aWarpUv` attribute, the basic-waveform `THREE.Line`, the comp fullscreen quad, and the output target. `loadPreset(json)` compiles its eqs + seeds baseVals + runs init_eqs. `renderFrame(audio, dt)` runs the per-frame + per-vertex equations and renders the warp/waveform/comp passes. | warp-UV distortion math ~11297-11422; mesh 48×36 ~10881; globalVars bag ~11680-11696; baseValsDefaults ~12142 |

### The per-frame sequence (`MilkdropRenderer.renderFrame`)

1. Reset the per-frame motion/appearance vars to the preset's baseVals (q-vars
   and custom user vars persist across frames in the same bag).
2. Seed `globalVars` into the bag: `time, frame, fps, bass, bass_att, mid,
   mid_att, treb, treb_att, meshx=48, meshy=36, aspectx=1, aspecty=1, pixelsx,
   pixelsy`. (Aspect is fixed at 1 in Phase 1 — square warp; refine later.)
3. Run `frame_eqs` → read motion/appearance values for uniforms.
4. For each of the 1813 mesh vertices: restore the frame motion values, set
   `x/y/rad/ang`, run `pixel_eqs`, then compute that vertex's sample UV into
   the previous frame via the exact Butterchurn distortion math
   (`zoom**(zoomexp**(rad*2-1))`, scale `sx/sy`, the 4 warp sine waves,
   rotation, `dx/dy` pan). Write into the `aWarpUv` attribute.
5. Update the basic waveform line from the time-domain PCM (position by
   `wave_y`, amplitude `0.15*wave_scale`, color `wave_r/g/b`, opacity `wave_a`).
6. WARP pass: `setRenderTarget(target)`, render the warp mesh (samples `prev`
   × decay) + the waveform on top (additive).
7. COMP pass: `setRenderTarget(outputRT)`, render the fullscreen comp quad
   sampling `target`.
8. `setRenderTarget(null)`, swap `prev`/`target`.

**Why a seed is required:** a pure warp+comp feedback loop with no injected
source is `black × decay = black` forever. Milkdrop's visible content comes
from the waveform/shapes drawn on top each frame, which the warp then smears.
Phase 1 draws the **basic audio waveform** as that seed — which is also the
primary look of ~93 of the presets.

---

## Integration points (the drop-in surface)

- **`visualizer/engine.js`** — orchestrates the native renderer. Public surface
  kept for `controls.js`: `getPresetKeys`, `getCurrentIndex`,
  `loadPresetByIndex`, `loadRandomPreset`, `dispose`. New render hooks for
  `graphics.js`: `initEngine(threeRenderer, audioContext, audioNode)` →
  `{ outputTexture }`, `renderFrame()`, `getOutputTexture()`. Feedback buffer
  capped at 720p (`FEEDBACK_MAX_HEIGHT`). Default preset is
  `DEFAULT_PRESET_INDEX = 32` ("Wire Circular: Geiss - Bipolar 3") — a
  basic-waveform preset, since registry index 0 is shape-driven (dark until
  Phase 2).
- **`visualizer/index.js`** — `initVisualizer({ initialTracks, threeRenderer })`
  returns `{ webamp, controls, outputTexture, renderFrame, dispose }`.
- **`graphics.js`** — `setVisualizerRenderer(outputTexture, renderFrameFn)`
  sets `scene.background = outputTexture` and builds the wall meshes mapping it.
  `render()` calls `renderFrameFn()` before `composer.render()`.
  `setVisualizerWallMode` / `_buildVisualizerWalls` / `setVisualizerWallParams`
  are unchanged — they just sample `this.visualizerTexture`.
- **`app.js`** — passes `threeRenderer: this.graphics.renderer` into
  `initVisualizer`; calls `setVisualizerRenderer(...)`. The XMB settings action
  keys (`vis-preset` / `vis-lock` / `vis-fav` / `vis-mode`) and
  `visualizerControls` wiring are unchanged.
- **Unchanged:** `controls.js`, `presets.js` (179-entry registry of
  `{name, file}`), `public/visualizer-presets/*.json`, `menuConfig.js`.

---

## Phasing

**Phase 1 (done):** audio analysis + warp/comp ping-pong feedback + the basic
audio waveform seed. This is ~80% of the visual character of the presets.

**Deferred (later phases):**
- **Custom waveforms** (`waves[]` with their own per-point equations) and
  **shapes** (`shapes[]`) — required for shape-driven presets (e.g. the old
  default "Angel") which currently render dark.
- **Preset blending** (the 2-second crossfade on switch — `loadPreset` accepts
  a `blendSeconds` arg for API compat but doesn't blend yet).
- **Blur/noise/motion-vector** sampler support (default-shader presets don't
  use them, so not needed for our set).
- **Aspect correction** in the warp math (currently fixed at 1:1).
- **Preset curation** — trim the auto-cycle list to the ~93 presets that are
  basic-waveform-driven (and thus look great now); shape-driven ones can rejoin
  once shapes land. A script can pre-filter by `baseVals.wave_a > 0` with no
  enabled `waves[]`/`shapes[]`.

---

## Performance

The feedback runs entirely in THREE's context: two small passes per frame (a
48×36 mesh + one fullscreen comp quad) into a 720p-capped buffer. This is
sub-millisecond GPU work, far cheaper than the game scene, and — unlike every
Butterchurn approach — incurs **no** cross-context transfer. Verified on real
hardware: high framerate, GPU actually doing the work, game fully intact.

---

## Dead code left by this migration (safe to remove)

Now that the native renderer is the only visualizer path, these are unused at
runtime and can be deleted in a follow-up cleanup:

- `visualizer/butterchurn-worker.js` — the old Worker; nothing imports it.
- `patches/butterchurn+3.0.0-beta.5.patch` + the `postinstall: "patch-package"`
  script + the `patch-package` devDependency — only existed for the worker's
  Butterchurn usage.
- the `butterchurn` runtime dependency in `package.json` — no runtime code
  imports it anymore. (Note: the preset JSONs were generated **offline** by
  `scripts/convert-all-presets.js` using a *separate* converter library, not
  Butterchurn's runtime, so removing the dep does not affect preset assets.)

Kept in-tree for now as a known-good reference; removal is a standalone,
coordinated step (remove patch + postinstall + devDep + dep together, or
`postinstall` fails).

---

## Verifying / extending

- Tests: `npx vitest run` (full suite green; the visualizer's internals aren't
  unit-tested — they need a real WebGL context — but the app/graphics wiring and
  the Puppeteer playtest exercise it).
- Manual: `rm -rf node_modules/.vite` (the dep pre-bundle caches things), then
  `scratch/verify_visualizer_worker.mjs` drives the game headless and checks
  `getError() === 0`, no page errors, and screenshots gameplay. NOTE: the
  sandbox uses software WebGL with near-silent audio, so the effect looks muted
  there; the real validation is on a GPU with music playing.
- To change the default look: `DEFAULT_PRESET_INDEX` in `visualizer/engine.js`.
- To add Phase 2 shapes/waves: extend `MilkdropRenderer` with shape/custom-wave
  passes (their per-point eqs compile through the same `equations.js`), drawn
  into `target` alongside the basic waveform before the comp pass.
```
