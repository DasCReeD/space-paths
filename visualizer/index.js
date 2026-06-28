import './style.css'
import { init as initWebamp } from './webamp-init.js'
import * as engine from './engine.js'
import { createControls } from './controls.js'

/**
 * @param {{ initialTracks?: Array, threeRenderer: THREE.WebGLRenderer }} options
 *   `threeRenderer` is the game's own renderer — the Milkdrop visualizer
 *   draws into render targets in its context (see engine.js / milkdrop/).
 * @returns {Promise<{ webamp: import('webamp').default, controls: object, outputTexture: THREE.Texture, renderFrame: function, dispose(): void }>}
 *   `outputTexture` is the visualizer's render-target texture (sample as
 *   scene background / wall map); `renderFrame` draws one feedback frame into
 *   it and must be called once per game frame before the composer.
 */
export async function initVisualizer({ initialTracks = [], threeRenderer } = {}) {
  // Webamp centers its whole window group within whatever element you pass
  // to renderWhenReady — passing the full-viewport `container` puts the
  // player dead-center of the screen, right behind the ship/cockpit model.
  // Give it a small anchored box instead, positioned clear of the ship.
  const webampAnchor = document.createElement('div')
  webampAnchor.id = 'webamp-anchor'
  document.body.appendChild(webampAnchor)
  const webamp = await initWebamp(webampAnchor, { initialTracks })

  const analyser = webamp.media.getAnalyser()
  const { outputTexture } = engine.initEngine(threeRenderer, analyser.context, analyser)

  const controls = createControls(webamp, engine)
  // Floating control panel removed — the visualizer controls now live inside
  // the game's XMB Settings menu (VISUALIZER category). See app.js.

  function dispose() {
    controls.dispose()
    engine.dispose()
    webampAnchor.remove()
  }

  return { webamp, controls, outputTexture, renderFrame: engine.renderFrame, dispose }
}
