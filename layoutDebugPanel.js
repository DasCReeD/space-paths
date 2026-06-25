// layoutDebugPanel.js — dev-only overlay for live-tuning UI element placement.
// Drag the dashed handles on screen to reposition an element; the JSON box
// in the bottom-right panel tracks the resulting values so they can be
// copied out and hardcoded into index.css (or webamp-init.js for Webamp).
// Toggle with the "LAYOUT" button — purely a measuring tool, no gameplay effect.

const TARGETS = [
  { id: 'menu-main', label: 'Main Menu', selector: '#menu-xmb-crossbar', type: 'cssvar-percent', vars: ['--xmb-focal-x', '--xmb-item-y'] },
  { id: 'menu-settings', label: 'Settings Menu', selector: '#settings-xmb-crossbar', type: 'cssvar-percent', vars: ['--xmb-focal-x', '--xmb-item-y'] },
  { id: 'menu-level', label: 'Level Select Menu', selector: '#level-crossbar', type: 'cssvar-percent', vars: ['--xmb-focal-x', '--xmb-item-y'] },
  { id: 'title-card', label: 'Title Card', selector: '#level-title-card', type: 'percent-left-top' },
  { id: 'fps-counter', label: 'FPS Counter', selector: '#fps-counter', type: 'px-top-right' },
  { id: 'score-hud', label: 'Score HUD', selector: '#top-right-hud', type: 'px-top-right' },
];

let panelEl, handlesLayer, jsonBox;
let open = false;
let rafId = null;
const state = {};
const liveHandles = new Map(); // target.id -> { handle, el, target }

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  let node = el;
  while (node) {
    if (node.classList && node.classList.contains('hidden')) return false;
    node = node.parentElement;
  }
  return true;
}

function readPercentVar(el, name) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function getCurrentValue(target, el) {
  if (target.type === 'cssvar-percent') {
    return { x: readPercentVar(el, target.vars[0]), y: readPercentVar(el, target.vars[1]) };
  }
  if (target.type === 'percent-left-top') {
    if (el.style.left.endsWith('%') && el.style.top.endsWith('%')) {
      return { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
    }
    const rect = el.getBoundingClientRect();
    return { x: (rect.left / window.innerWidth) * 100, y: (rect.top / window.innerHeight) * 100 };
  }
  if (target.type === 'px-top-right') {
    if (el.style.top && el.style.right) {
      return { top: parseFloat(el.style.top), right: parseFloat(el.style.right) };
    }
    const cs = getComputedStyle(el);
    return { top: parseFloat(cs.top) || 0, right: parseFloat(cs.right) || 0 };
  }
  return { x: 0, y: 0 };
}

function applyValue(target, el, value) {
  if (target.type === 'cssvar-percent') {
    el.style.setProperty(target.vars[0], `${value.x.toFixed(2)}%`);
    el.style.setProperty(target.vars[1], `${value.y.toFixed(2)}%`);
  } else if (target.type === 'percent-left-top') {
    el.style.left = `${value.x.toFixed(2)}%`;
    el.style.top = `${value.y.toFixed(2)}%`;
  } else if (target.type === 'px-top-right') {
    el.style.top = `${Math.round(value.top)}px`;
    el.style.right = `${Math.round(value.right)}px`;
  }
}

function refreshJson() {
  if (!jsonBox) return;
  const out = {};
  TARGETS.forEach((t) => { if (state[t.id]) out[t.id] = state[t.id]; });
  if (state.webamp) out.webamp = state.webamp;
  jsonBox.value = JSON.stringify(out, null, 2);
}

function positionHandle(handle, el) {
  const rect = el.getBoundingClientRect();
  handle.style.left = `${rect.left}px`;
  handle.style.top = `${rect.top}px`;
  handle.style.width = `${Math.max(rect.width, 40)}px`;
  handle.style.height = `${Math.max(rect.height, 24)}px`;
}

function makeHandle(target, el) {
  const handle = document.createElement('div');
  handle.className = 'layout-debug-handle';
  const labelEl = document.createElement('span');
  labelEl.className = 'layout-debug-handle-label';
  labelEl.textContent = target.label;
  handle.appendChild(labelEl);

  let dragging = false;
  let startMouse = { x: 0, y: 0 };
  let startValue = null;

  handle.addEventListener('pointerdown', (e) => {
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    startMouse = { x: e.clientX, y: e.clientY };
    startValue = getCurrentValue(target, el);
    handle.classList.add('dragging');
    e.preventDefault();
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startMouse.x;
    const dy = e.clientY - startMouse.y;
    const next = target.type === 'px-top-right'
      ? { top: startValue.top + dy, right: startValue.right - dx }
      : { x: startValue.x + (dx / window.innerWidth) * 100, y: startValue.y + (dy / window.innerHeight) * 100 };
    applyValue(target, el, next);
    state[target.id] = next;
    refreshJson();
    positionHandle(handle, el);
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('dragging');
    try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  return handle;
}

// Reconciles the persistent handle elements against which targets are
// currently visible — never destroys a handle that's mid-drag (recreating
// the DOM node mid-drag drops pointer capture and breaks the drag).
function syncHandles() {
  if (!open) return;
  TARGETS.forEach((target) => {
    const el = document.querySelector(target.selector);
    const visible = el && isVisible(el);
    const existing = liveHandles.get(target.id);

    if (!visible) {
      if (existing) {
        existing.handle.remove();
        liveHandles.delete(target.id);
      }
      return;
    }

    if (!state[target.id]) state[target.id] = getCurrentValue(target, el);

    if (existing && existing.el === el) {
      if (!existing.handle.classList.contains('dragging')) {
        positionHandle(existing.handle, el);
      }
      return;
    }

    if (existing) existing.handle.remove();
    const handle = makeHandle(target, el);
    handlesLayer.appendChild(handle);
    positionHandle(handle, el);
    liveHandles.set(target.id, { handle, el, target });
  });

  refreshJson();
  rafId = requestAnimationFrame(syncHandles);
}

function captureWebamp() {
  const webamp = window.gameManagerInstance && window.gameManagerInstance.webampInstance;
  if (!webamp || !webamp.store) {
    state.webamp = { error: 'Webamp not ready yet — open the player first' };
    refreshJson();
    return;
  }
  try {
    const s = webamp.store.getState();
    const pos = s.windows && s.windows.positions && s.windows.positions.main;
    state.webamp = pos ? { top: pos.y, left: pos.x } : { raw: s.windows };
  } catch (err) {
    state.webamp = { error: String(err) };
  }
  refreshJson();
}

function openPanel() {
  open = true;
  panelEl.classList.add('open');
  syncHandles();
}

function closePanel() {
  open = false;
  panelEl.classList.remove('open');
  handlesLayer.innerHTML = '';
  liveHandles.clear();
  if (rafId) cancelAnimationFrame(rafId);
}

export function initLayoutDebugPanel() {
  if (document.getElementById('layout-debug-toggle')) return;

  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'layout-debug-toggle';
  toggleBtn.textContent = '⚙ LAYOUT';
  toggleBtn.addEventListener('click', () => (open ? closePanel() : openPanel()));
  document.body.appendChild(toggleBtn);

  panelEl = document.createElement('div');
  panelEl.id = 'layout-debug-panel';
  panelEl.innerHTML = `
    <div class="layout-debug-header">UI LAYOUT TOOL</div>
    <div class="layout-debug-hint">Drag the dashed boxes to move that element. Values below update live — copy them out to hardcode.</div>
    <button id="layout-debug-capture-webamp" type="button">Capture Webamp Position</button>
    <textarea id="layout-debug-json" readonly></textarea>
    <div class="layout-debug-actions">
      <button id="layout-debug-copy" type="button">Copy JSON</button>
      <button id="layout-debug-reset" type="button">Reset Session</button>
    </div>
  `;
  document.body.appendChild(panelEl);

  handlesLayer = document.createElement('div');
  handlesLayer.id = 'layout-debug-handles';
  document.body.appendChild(handlesLayer);

  jsonBox = panelEl.querySelector('#layout-debug-json');

  panelEl.querySelector('#layout-debug-capture-webamp').addEventListener('click', captureWebamp);
  panelEl.querySelector('#layout-debug-copy').addEventListener('click', () => {
    navigator.clipboard?.writeText(jsonBox.value).catch(() => {});
  });
  panelEl.querySelector('#layout-debug-reset').addEventListener('click', () => {
    Object.keys(state).forEach((k) => delete state[k]);
    TARGETS.forEach((t) => {
      const el = document.querySelector(t.selector);
      if (!el) return;
      if (t.type === 'cssvar-percent') {
        el.style.removeProperty(t.vars[0]);
        el.style.removeProperty(t.vars[1]);
      } else if (t.type === 'percent-left-top') {
        el.style.removeProperty('left');
        el.style.removeProperty('top');
      } else if (t.type === 'px-top-right') {
        el.style.removeProperty('top');
        el.style.removeProperty('right');
      }
    });
    refreshJson();
  });
}
