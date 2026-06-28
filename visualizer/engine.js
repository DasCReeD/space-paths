/**
 * engine.js — visualizer engine (THREE-native Milkdrop renderer).
 *
 * Webamp owns playback and exposes a live AnalyserNode (media.getAnalyser());
 * we drive our own THREE-native Milkdrop-default renderer (visualizer/
 * milkdrop/) off it. The renderer draws into THREE render targets in the
 * game's OWN WebGL context, so its output is a normal THREE texture with no
 * cross-context transfer — the stall that plagued every Butterchurn-based
 * approach is gone by construction.
 *
 * This module keeps the same public surface the rest of the app expects
 * (getPresetKeys / getCurrentIndex / loadPresetByIndex / loadRandomPreset /
 * dispose, consumed by controls.js), plus the new render hooks
 * (renderFrame / getOutputTexture) graphics.js calls each frame.
 *
 * Preset assets are unchanged: public/visualizer-presets/*.json, registry in
 * presets.js. Their equations are already translated to JS and all use the
 * default warp/comp shaders, so the renderer consumes them directly (see
 * visualizer/milkdrop/equations.js + renderer.js).
 */

import { presets } from './presets.js'
import { AudioLevels } from './milkdrop/audioLevels.js'
import { MilkdropRenderer } from './milkdrop/renderer.js'

const PRESET_BLEND_SECONDS = 2.0 // accepted for API compat (blend not yet implemented)
const FEEDBACK_MAX_HEIGHT = 720 // feedback buffer cap — cheap, plenty for a backdrop
// Phase 1 renders the basic waveform + warp/comp feedback (shapes/custom
// waves come later), so start on a basic-waveform-driven preset rather than
// registry index 0 (which is shape-driven and would render dark for now).
const DEFAULT_PRESET_INDEX = 32 // "Wire Circular: Geiss - Bipolar 3"

let renderer = null
let audio = null
let currentIndex = -1
let resizeHandler = null
let lastTime = 0

function feedbackSize() {
  const h = Math.min(FEEDBACK_MAX_HEIGHT, window.innerHeight || 720)
  const aspect = (window.innerWidth || 1280) / (window.innerHeight || 720)
  return { width: Math.max(2, Math.round(h * aspect)), height: Math.max(2, h) }
}

/**
 * @param {THREE.WebGLRenderer} threeRenderer - the game's own renderer
 * @param {AudioContext} _audioContext - unused (kept for call-site compat)
 * @param {AnalyserNode} audioNode - Webamp's live playback analyser
 * @returns {{ outputTexture: THREE.Texture }}
 */
export function initEngine(threeRenderer, _audioContext, audioNode) {
  // Configure the analyser for our bands (1024 fft → 512 bins) with light
  // built-in smoothing; AudioLevels adds the attack/decay smoothing on top.
  try {
    audioNode.fftSize = 1024
    audioNode.smoothingTimeConstant = 0.6
  } catch {
    // some analyser impls disallow reconfiguration; AudioLevels adapts to whatever it is
  }
  audio = new AudioLevels(audioNode)

  const { width, height } = feedbackSize()
  renderer = new MilkdropRenderer(threeRenderer, { width, height })

  loadPresetByIndex(DEFAULT_PRESET_INDEX)

  resizeHandler = () => {
    const { width, height } = feedbackSize()
    renderer.resize(width, height)
  }
  window.addEventListener('resize', resizeHandler)

  lastTime = performance.now()
  return { outputTexture: renderer.outputTexture }
}

/** Drives one visualizer frame. Called by graphics.js before composer.render(). */
export function renderFrame() {
  if (!renderer || !audio) return
  const now = performance.now()
  let dt = (now - lastTime) / 1000
  lastTime = now
  if (!(dt > 0) || dt > 0.1) dt = 1 / 60 // clamp pauses/first-frame
  audio.update(dt > 0 ? 1 / dt : 60)
  renderer.renderFrame(audio, dt)
}

export function getOutputTexture() {
  return renderer ? renderer.outputTexture : null
}

export function getPresetKeys() {
  return presets.map((p) => p.name)
}

let loadRequestCount = 0

export async function loadPresetByIndex(index, _blendSeconds = PRESET_BLEND_SECONDS) {
  if (!renderer || presets.length === 0) return null
  const wrapped = ((index % presets.length) + presets.length) % presets.length

  const reqId = ++loadRequestCount
  currentIndex = wrapped
  const preset = presets[wrapped]

  try {
    const response = await fetch(`./visualizer-presets/${preset.file}.json`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const presetObj = await response.json()
    if (reqId === loadRequestCount) {
      renderer.loadPreset(presetObj)
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
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  audio = null
  currentIndex = -1
}
