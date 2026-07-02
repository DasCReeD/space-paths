/**
 * webamp-init.js — Webamp bootstrap.
 *
 * Ported from BrainBlur's src/js/webamp-init.js, but:
 * - `initialTracks` is passed in by the caller instead of hardcoded to [].
 * - No skin-manifest fetch / custom skin loading — ships with a single
 *   bundled base skin (Winamp's classic default, also BrainBlur's own
 *   fallback skin) instead of multi-skin selection (v1 scope). Webamp's
 *   truly-skinless state renders structurally-correct DOM but paints with no
 *   sprite texture at all, i.e. completely invisible — so a real skin file
 *   is required, not optional polish.
 * - Does NOT use Webamp's `__butterchurnOptions` constructor option. That
 *   option's milkdrop WINDOW never actually rendered in testing (its redux
 *   state reports open/enabled/loaded correctly, but the generated-window
 *   component silently produces no DOM — most likely gated on
 *   `browserWindowSize`, which standalone Webamp never populates without a
 *   real desktop-mode resize event). Rather than fight Webamp's internal
 *   window manager for something it's not built to do reliably (a
 *   full-viewport visualizer, as opposed to a small windowed plugin), we use
 *   the documented fallback: pull a real, live `AnalyserNode` straight off
 *   Webamp's own playback graph (`media.getAnalyser()`, a public, exported
 *   method — confirmed in webamp's bundle to be tied to actual track
 *   playback) and feed that into our OWN Butterchurn instance, rendered to
 *   our own full-viewport canvas. See engine.js.
 */

import Webamp from 'webamp'
import baseSkinUrl from './assets/skins/0_base-2.91.wsz?url'

let webampInstance = null

/**
 * Initialize and render Webamp.
 *
 * @param {HTMLElement} container - DOM element passed to renderWhenReady
 *   (Webamp portals its actual UI to document.body regardless; this is
 *   mostly a readiness signal, not a real mount point)
 * @param {{ initialTracks?: Array }} options
 * @returns {Promise<Webamp>} the webamp instance
 */
// Classic Winamp main-window height (px) — used to anchor the window to the bottom edge.
const MAIN_WINDOW_HEIGHT = 116
const EDGE_MARGIN = 8

// Place the player's main window in the bottom-left corner of the viewport. Webamp re-centers its
// windows on the detected browser size and IGNORES the constructor's `windowLayout` here, so we set
// the position AFTER render via the store (UPDATE_WINDOW_POSITIONS, absolute). Re-applied a couple
// of times to beat Webamp's async centering pass.
function positionBottomLeft(webamp) {
  const vh = (typeof window !== 'undefined' && window.innerHeight) || 720
  const y = Math.max(0, vh - MAIN_WINDOW_HEIGHT - EDGE_MARGIN)
  try {
    webamp.store.dispatch({
      type: 'UPDATE_WINDOW_POSITIONS',
      positions: { main: { x: EDGE_MARGIN, y } },
      absolute: true,
    })
  } catch (e) {
    // Non-fatal: if Webamp's internal store shape changes, keep the default position.
    console.warn('[Webamp] could not set start position:', e)
  }
}

export async function init(container, { initialTracks = [] } = {}) {
  webampInstance = new Webamp({ initialTracks })

  // Webamp with no skin renders correct-size/position DOM but paints
  // nothing (no sprite texture to draw with) — load a real skin so the
  // player window is actually visible.
  webampInstance.setSkinFromUrl(baseSkinUrl)

  await webampInstance.renderWhenReady(container)

  // Anchor to bottom-left once rendered, then re-apply after layout/centering settles.
  positionBottomLeft(webampInstance)
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => positionBottomLeft(webampInstance))
  }
  if (typeof setTimeout === 'function') {
    setTimeout(() => positionBottomLeft(webampInstance), 400)
  }

  // Prevent Webamp from being closed (it would otherwise destroy itself).
  webampInstance.onClose(() => {
    webampInstance.reopen()
  })

  return webampInstance
}

export function getWebampInstance() {
  return webampInstance
}
