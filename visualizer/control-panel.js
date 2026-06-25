/**
 * control-panel.js — floating control panel UI for the visualizer.
 *
 * Not a port: this is new markup, visually modeled on BrainBlur's
 * `.skin-modal`/`.skin-modal-backdrop`/`.skin-modal-content` CSS classes
 * (see style.css), but with fresh, much simpler contents — no search, no
 * tabs, no preset gallery grid. With only 10 curated presets, prev/next is
 * enough; the gallery/browser machinery BrainBlur built for its
 * multi-thousand-preset library is unneeded bloat here.
 *
 * Contents: preset prev/next, lock toggle, favorite toggle, transition-mode
 * toggle, current preset name display, and a Webamp show/hide toggle.
 */

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str ?? ''
  return div.innerHTML
}

/**
 * Mounts the toggle button + floating panel into the document.
 *
 * @param {ReturnType<typeof import('./controls.js').createControls>} controls
 * @returns {{ dispose(): void }}
 */
export function mountControlPanel(controls) {
  const toggleBtn = document.createElement('button')
  toggleBtn.id = 'btn-skybox-controls'
  toggleBtn.title = 'Visualizer controls'
  toggleBtn.textContent = '\u{1F30C}' // 🌌

  const modal = document.createElement('div')
  modal.className = 'skin-modal hidden'
  modal.innerHTML = `
    <div class="skin-modal-backdrop"></div>
    <div class="skin-modal-content">
      <div class="skin-modal-header">
        <h2>Visualizer</h2>
        <button class="skin-close-btn" title="Close">✕</button>
      </div>
      <div class="visualizer-panel-body">
        <div class="visualizer-preset-name" id="vis-preset-name">—</div>
        <div class="visualizer-row">
          <button id="vis-prev" title="Previous preset">⏮ Prev</button>
          <button id="vis-next" title="Next preset">Next ⏭</button>
        </div>
        <div class="visualizer-row">
          <button id="vis-lock" title="Lock current preset">\u{1F513} Lock</button>
          <button id="vis-fav" title="Favorite current preset">☆ Fav</button>
        </div>
        <div class="visualizer-row">
          <button id="vis-mode" title="Toggle transition mode">\u{1F3B2} All</button>
          <button id="vis-webamp" title="Show/hide Webamp">\u{1F3B5} Webamp</button>
        </div>
      </div>
    </div>
  `

  document.body.appendChild(toggleBtn)
  document.body.appendChild(modal)

  const nameEl = modal.querySelector('#vis-preset-name')
  const lockBtn = modal.querySelector('#vis-lock')
  const favBtn = modal.querySelector('#vis-fav')
  const modeBtn = modal.querySelector('#vis-mode')
  const webampBtn = modal.querySelector('#vis-webamp')
  const closeBtn = modal.querySelector('.skin-close-btn')
  const backdrop = modal.querySelector('.skin-modal-backdrop')

  let webampVisible = true

  function render(info) {
    nameEl.textContent = info.name ? `${info.index + 1}/${info.total} — ${escapeHtml(info.name)}` : 'Loading…'
    lockBtn.classList.toggle('active', info.isLocked)
    lockBtn.textContent = info.isLocked ? '\u{1F512} Lock' : '\u{1F513} Lock'
    favBtn.classList.toggle('active', info.isFavorite)
    favBtn.textContent = info.isFavorite ? '⭐ Fav' : '☆ Fav'
    modeBtn.classList.toggle('active', info.transitionMode === 'favs')
    modeBtn.textContent = info.transitionMode === 'favs' ? '⭐ Favs' : '\u{1F3B2} All'
  }

  function openPanel() {
    modal.classList.remove('hidden')
  }

  function closePanel() {
    modal.classList.add('hidden')
  }

  toggleBtn.addEventListener('click', () => {
    modal.classList.contains('hidden') ? openPanel() : closePanel()
  })
  closeBtn.addEventListener('click', closePanel)
  backdrop.addEventListener('click', closePanel)

  modal.querySelector('#vis-prev').addEventListener('click', () => controls.prev())
  modal.querySelector('#vis-next').addEventListener('click', () => controls.next())
  lockBtn.addEventListener('click', () => controls.toggleLocked())
  favBtn.addEventListener('click', () => controls.toggleFavoriteCurrent())
  modeBtn.addEventListener('click', () => controls.toggleTransitionMode())
  webampBtn.addEventListener('click', () => {
    webampVisible = !webampVisible
    controls.setWebampVisible(webampVisible)
    webampBtn.classList.toggle('active', !webampVisible)
  })

  const unsubscribe = controls.onChange(render)
  render(controls.getPresetInfo())

  function dispose() {
    unsubscribe()
    toggleBtn.remove()
    modal.remove()
  }

  return { dispose }
}
