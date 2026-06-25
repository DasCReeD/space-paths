/**
 * index.js — public entrypoint for the visualizer module.
 *
 * The only function the game's bootstrap code needs to call. Wires up
 * Webamp (for playback + playlist UI), a standalone Butterchurn render
 * engine fed by Webamp's real playback analyser (see engine.js for why
 * Webamp's own milkdrop window isn't used), the preset-control state
 * machine, and the floating control panel UI.
 */

import './style.css'
import { init as initWebamp } from './webamp-init.js'
import * as engine from './engine.js'
import { createControls } from './controls.js'

/**
 * @param {{ initialTracks?: Array }} options
 * @returns {Promise<{ webamp: import('webamp').default, controls: object, canvas: HTMLCanvasElement, dispose(): void }>}
 *   `canvas` is the raw Butterchurn output canvas — NOT meant to be
 *   displayed directly (see engine.js's note on the bloom/alpha bug). The
 *   caller (app.js) hands it to graphics.js to use as a CanvasTexture
 *   instead.
 */
export async function initVisualizer({ initialTracks = [] } = {}) {
  // Webamp centers its whole window group within whatever element you pass
  // to renderWhenReady — passing the full-viewport `container` puts the
  // player dead-center of the screen, right behind the ship/cockpit model.
  // Give it a small anchored box instead, positioned clear of the ship.
  const webampAnchor = document.createElement('div')
  webampAnchor.id = 'webamp-anchor'
  document.body.appendChild(webampAnchor)
  const webamp = await initWebamp(webampAnchor, { initialTracks })

  // Kept off-screen/invisible — its pixel buffer is read into a THREE.js
  // CanvasTexture by graphics.js, not displayed as a DOM overlay directly.
  const canvas = document.createElement('canvas')
  canvas.id = 'visualizer-canvas'
  document.body.appendChild(canvas)

  const analyser = webamp.media.getAnalyser()
  engine.initEngine(canvas, analyser.context, analyser)

  const controls = createControls(webamp, engine)
  // Floating control panel removed — the visualizer controls now live inside
  // the game's XMB Settings menu (VISUALIZER category). See app.js.

  function dispose() {
    controls.dispose()
    engine.dispose()
    canvas.remove()
    webampAnchor.remove()
  }

  return { webamp, controls, canvas, dispose }
}
