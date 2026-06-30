/**
 * shaders.js — GLSL for Milkdrop's DEFAULT warp and composite passes.
 *
 * Reconstructed (THREE-idiomatic GLSL1) from Butterchurn's default shader
 * bodies (node_modules/butterchurn/dist/butterchurn.js): the default WARP
 * fragment is simply "sample previous frame at the warped UV, times decay"
 * (~line 7169); the default COMP fragment applies echo + gamma + the
 * brighten/darken/solarize/invert toggles (~lines 8048-8074). Every one of
 * our presets uses these defaults (their `warp`/`comp` fields are empty), so
 * no per-preset shader translation is needed.
 *
 * These run as plain THREE.ShaderMaterial (GLSL1), so THREE injects
 * `attribute vec3 position; attribute vec2 uv;` and the matrix uniforms for
 * us — we only declare our own extras (aWarpUv) and ignore the matrices,
 * since both passes draw in clip space directly (geometry is a 2x2 plane
 * spanning [-1,1]).
 */

// --- WARP pass: distort + decay the previous frame ------------------------
// The 48x36 mesh carries a per-vertex aWarpUv (computed on the CPU each frame
// from the preset's per-vertex equations); the fragment samples the previous
// frame there. position.xy is already in [-1,1] clip space.
export const warpVert = /* glsl */ `
  attribute vec2 aWarpUv;
  varying vec2 vWarpUv;
  void main() {
    vWarpUv = aWarpUv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const warpFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uMain;   // previous frame
  uniform float uDecay;
  varying vec2 vWarpUv;
  void main() {
    vec3 ret = texture2D(uMain, vWarpUv).rgb * uDecay;
    gl_FragColor = vec4(ret, 1.0);
  }
`

// --- COMP pass: echo + gamma + post toggles, to the output target ---------
export const compVert = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

export const compFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uMain;        // warped frame
  uniform float uGamma;
  uniform float uEchoZoom;
  uniform float uEchoAlpha;
  uniform float uEchoOrient;
  uniform float uBrighten;
  uniform float uDarken;
  uniform float uSolarize;
  uniform float uInvert;
  varying vec2 vUv;
  void main() {
    float orientHoriz = mod(uEchoOrient, 2.0);
    float orientX = (orientHoriz != 0.0) ? -1.0 : 1.0;
    float orientY = (uEchoOrient >= 2.0) ? -1.0 : 1.0;
    vec2 uvEcho = ((vUv - 0.5) * (1.0 / uEchoZoom) * vec2(orientX, orientY)) + 0.5;

    vec3 ret = mix(texture2D(uMain, vUv).rgb,
                   texture2D(uMain, uvEcho).rgb,
                   uEchoAlpha);
    ret *= uGamma;
    if (uBrighten != 0.0) ret = sqrt(ret);
    if (uDarken != 0.0) ret = ret * ret;
    if (uSolarize != 0.0) ret = ret * (1.0 - ret) * 4.0;
    if (uInvert != 0.0) ret = 1.0 - ret;
    gl_FragColor = vec4(ret, 1.0);
  }
`
