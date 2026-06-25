/**
 * controls.js — preset prev/next/lock/favorite/auto-transition state
 * machine, adapted from BrainBlur's milkdrop-controls.js.
 *
 * Webamp's own milkdrop window never renders (see engine.js for why), so all
 * preset navigation/lock/favorite/auto-transition logic is driven directly
 * against our own engine.js instead of Webamp's redux store. The one
 * exception is `setWebampVisible`, which still toggles Webamp's own main
 * player window via its real, confirmed `SET_WINDOW_VISIBILITY` redux
 * action — that window is unrelated to the broken milkdrop window and works
 * fine.
 *
 * "Capture" audio button from BrainBlur is intentionally dropped — the game
 * music is always the audio source now, there is nothing to capture.
 */

const AUTO_TRANSITION_MS = 15000
const FAVORITES_KEY = 'skyroads_visualizer_favorites'

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
  } catch {
    return []
  }
}

function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
}

/**
 * Creates a preset-control state machine bound to a webamp instance (for
 * window visibility only) and the engine module (for everything else).
 *
 * @param {import('webamp').default} webampInstance
 * @param {typeof import('./engine.js')} engine
 * @returns {object} controller with prev/next/lock/favorite/mode/dispose
 */
export function createControls(webampInstance, engine) {
  let isLocked = false
  let transitionMode = 'all' // 'all' | 'favs'
  let autoTimer = null
  const listeners = new Set()

  function notify() {
    const info = getPresetInfo()
    listeners.forEach((fn) => fn(info))
  }

  function getPresetNames() {
    return engine.getPresetKeys()
  }

  function getPresetInfo() {
    const names = getPresetNames()
    const index = engine.getCurrentIndex()
    const name = index >= 0 ? names[index] : null
    return {
      index,
      name,
      total: names.length,
      isFavorite: name ? isFavorite(name) : false,
      isLocked,
      transitionMode
    }
  }

  function isFavorite(name) {
    return getFavorites().includes(name)
  }

  function toggleFavoriteCurrent() {
    const { name } = getPresetInfo()
    if (!name) return false
    let favs = getFavorites()
    if (favs.includes(name)) {
      favs = favs.filter((f) => f !== name)
    } else {
      favs.push(name)
    }
    saveFavorites(favs)
    notify()
    return favs.includes(name)
  }

  function selectIndex(index) {
    const names = getPresetNames()
    if (names.length === 0) return
    engine.loadPresetByIndex(index)
    notify()
  }

  function getFilteredIndex(dir) {
    const names = getPresetNames()
    const current = engine.getCurrentIndex() >= 0 ? engine.getCurrentIndex() : 0

    if (transitionMode === 'favs') {
      const favs = getFavorites()
      const validFavIndexes = names
        .map((n, i) => (favs.includes(n) ? i : -1))
        .filter((i) => i !== -1)
      if (validFavIndexes.length > 0) {
        let pos = validFavIndexes.indexOf(current)
        if (pos === -1) pos = dir > 0 ? -1 : 0
        pos = ((pos + dir) % validFavIndexes.length + validFavIndexes.length) % validFavIndexes.length
        return validFavIndexes[pos]
      }
    }
    return current + dir
  }

  function next() {
    selectIndex(getFilteredIndex(1))
    restartAutoTransition()
  }

  function prev() {
    selectIndex(getFilteredIndex(-1))
    restartAutoTransition()
  }

  function setLocked(locked) {
    isLocked = locked
    if (isLocked) {
      stopAutoTransition()
    } else {
      restartAutoTransition()
    }
    notify()
  }

  function toggleLocked() {
    setLocked(!isLocked)
    return isLocked
  }

  function toggleTransitionMode() {
    transitionMode = transitionMode === 'all' ? 'favs' : 'all'
    notify()
    return transitionMode
  }

  function stopAutoTransition() {
    if (autoTimer) {
      clearInterval(autoTimer)
      autoTimer = null
    }
  }

  function restartAutoTransition() {
    stopAutoTransition()
    if (isLocked) return
    autoTimer = setInterval(() => {
      selectIndex(getFilteredIndex(1))
    }, AUTO_TRANSITION_MS)
  }

  function setWebampVisible(visible) {
    webampInstance.store.dispatch({ type: 'SET_WINDOW_VISIBILITY', windowId: 'main', hidden: !visible })
  }

  function onChange(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  function dispose() {
    stopAutoTransition()
    listeners.clear()
  }

  // Kick off with the auto-transition timer running (engine.js already
  // loaded preset 0 during initEngine).
  notify()
  restartAutoTransition()

  return {
    next,
    prev,
    toggleLocked,
    toggleFavoriteCurrent,
    toggleTransitionMode,
    setWebampVisible,
    getPresetInfo,
    onChange,
    dispose
  }
}
