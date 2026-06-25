/**
 * engine.js — standalone Butterchurn render engine.
 *
 * Webamp's own milkdrop WINDOW never renders any DOM (its generated/resizable
 * window positions itself off `state.windows.browserWindowSize`, which stays
 * `{width:0,height:0}` in standalone embedded Webamp — confirmed via live
 * Playwright inspection of the redux store). Rather than fight Webamp's
 * window manager, we drive Butterchurn ourselves: pull a real AnalyserNode
 * off Webamp's playback graph (`media.getAnalyser()`) and render to our own
 * canvas, modeled on BrainBlur's `src/js/engine.js` but reading from this
 * project's own curated `presets.js` array (index-based, not a name-keyed
 * map).
 *
 * The visible result is NOT composited directly onto the page as a DOM
 * overlay — confirmed via live debugging (a hardcoded solid-color test block
 * rendered into a canvas's pixel buffer but never appeared on screen) that
 * the game's bloom/post-processing pipeline always writes alpha=1 into its
 * final output, making the 3D canvas opaque on screen regardless of its own
 * "transparent" renderer settings. Rather than fight that, graphics.js reads
 * Butterchurn's rendered output into a THREE.CanvasTexture and uses it as
 * the scene's own background — same WebGL context as the game, no
 * cross-canvas alpha compositing. `getCanvas()` is the integration point.
 *
 * Butterchurn's public `createVisualizer()` always renders to its own
 * internal WebGL canvas, then unconditionally blits that to a 2D canvas via
 * `outputGl.drawImage()` every frame (its `Visualizer.render()` wrapper does
 * this; see node_modules/butterchurn/dist/butterchurn.js). That blit is a
 * real cost — TRIED bypassing it by calling `visualizer.renderer.render()`
 * directly and feeding `visualizer.internalCanvas` (an OffscreenCanvas)
 * straight to THREE's CanvasTexture, skipping the wrapper's blit entirely.
 * That ran faster but rendered nothing visible (no thrown error, just a
 * blank texture) — the OffscreenCanvas-as-texture-source path didn't behave
 * like the plain `<canvas>`-via-2D-blit path in this THREE/browser
 * combination. Reverted; the resolution cap below (RENDER_HEIGHT) is the
 * real, verified lever for this engine's frame cost.
 */

import butterchurn from 'butterchurn'
import { presets } from './presets.js'

const PRESET_BLEND_SECONDS = 2.0

let visualizer = null
let canvasEl = null
let currentIndex = -1
let resizeHandler = null
let rafId = null

/**
 * Creates the Butterchurn visualizer, connects audio, and starts the
 * render/resize loops.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {AudioContext} audioContext
 * @param {AudioNode} audioNode - real-time analyser tapped off playback audio
 * @returns {object} the butterchurn visualizer instance
 */
// This canvas only ever ends up as a blurred-by-distance scene background
// (see graphics.js's CanvasTexture). Rendering it at full screen resolution
// (further multiplied by devicePixelRatio on high-DPI displays) costs real
// time on every frame's WebGL->2D->WebGL blit chain, for detail nobody sees.
// A fixed, modest resolution keeps that cost flat regardless of display.
const RENDER_HEIGHT = 360

function sizeFor(width, height) {
  const h = RENDER_HEIGHT
  const w = Math.round(h * (width / height))
  return { w, h }
}

export function initEngine(canvas, audioContext, audioNode) {
  // REVERTED: feeding visualizer.internalCanvas (an OffscreenCanvas) directly
  // into THREE's CanvasTexture rendered nothing visible, despite no thrown
  // error — that cross-context upload path didn't behave the way the public
  // <canvas>-via-2D-blit path does. Back to the known-working route: let
  // Butterchurn do its normal render() (WebGL draw + blit to this 2D
  // canvas), and use *that* canvas as the texture source.
  canvasEl = canvas
  const { w, h } = sizeFor(window.innerWidth, window.innerHeight)
  canvas.width = w
  canvas.height = h

  visualizer = butterchurn.createVisualizer(audioContext, canvas, {
    width: w,
    height: h,
    pixelRatio: 1
  })

  visualizer.connectAudio(audioNode)

  loadPresetByIndex(0)

  resizeHandler = () => {
    const { w, h } = sizeFor(window.innerWidth, window.innerHeight)
    canvas.width = w
    canvas.height = h
    visualizer.setRendererSize(w, h)
  }
  window.addEventListener('resize', resizeHandler)

  // Both the inner WebGL->2D blit and the outer 2D->WebGL texture upload
  // (graphics.js) are cross-context sync points whose cost is dominated by
  // per-call overhead, not pixel count — confirmed via live testing (CPU/GPU
  // both ~15% utilized while FPS stayed capped well below the game's native
  // rate). A blurred background visualizer doesn't need to update at the
  // game's full framerate; throttling to ~30fps cuts those expensive calls
  // by roughly 3x at typical 90-144fps game framerates, for no visible loss
  // of smoothness on a soft backdrop.
  const TARGET_INTERVAL_MS = 1000 / 30
  let lastRenderTime = 0

  function render(now) {
    if (now - lastRenderTime >= TARGET_INTERVAL_MS) {
      lastRenderTime = now
      visualizer.render()
    }
    rafId = requestAnimationFrame(render)
  }
  rafId = requestAnimationFrame(render)

  return visualizer
}

export function getCanvas() {
  return canvasEl
}

export function getPresetKeys() {
  return presets.map((p) => p.name)
}

let loadRequestCount = 0

export async function loadPresetByIndex(index, blendSeconds = PRESET_BLEND_SECONDS) {
  if (!visualizer || presets.length === 0) return null
  const wrapped = ((index % presets.length) + presets.length) % presets.length
  
  const reqId = ++loadRequestCount
  currentIndex = wrapped
  const preset = presets[wrapped]

  try {
    const response = await fetch(`./visualizer-presets/${preset.file}.json`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const presetObj = await response.json()

    if (reqId === loadRequestCount) {
      visualizer.loadPreset(presetObj, blendSeconds)
    }
  } catch (error) {
    console.error(`Failed to load preset "${preset.name}":`, error)
  }

  return { name: preset.name, index: wrapped }
}

export function loadRandomPreset(blendSeconds = PRESET_BLEND_SECONDS) {
  if (presets.length === 0) return null
  const index = Math.floor(Math.random() * presets.length)
  return loadPresetByIndex(index, blendSeconds)
}

export function getCurrentIndex() {
  return currentIndex
}

export function dispose() {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
    resizeHandler = null
  }
  if (rafId != null) {
    cancelAnimationFrame(rafId)
    rafId = null
  }
  visualizer = null
  canvasEl = null
  currentIndex = -1
}
