/* 🚀 Space Paths Level Editor - Main Coordinator */
import { EditorStateManager, createEmptyLevel } from './editorState.js';
import { EditorRenderer, TILE_WIDTH, TILE_LENGTH } from './editorRenderer.js';
import {
  PaintCellCommand,
  PaintCellsBatchCommand,
  UpdateMetadataCommand,
  UpdatePhysicsCommand,
  ConfigureMaterialCommand,
  DrawRampCommand,
  ResizeGridCommand
} from './editorCommands.js';
import * as THREE from 'three';
import { PhysicsEngine } from './physics.js';

// Initialize core manager classes
const state = new EditorStateManager();
const renderer = new EditorRenderer('editor-workspace', state);

// Material Preview Renderer variables
let previewRenderer, previewScene, previewCamera, previewSphere;
let materialsBackup = null;

// Drawing stroke state variables (combines drag strokes into single actions)
let isStrokeActive = false;
let strokeCellsList = [];

// Selection marquee and Line tool drag states
let marqueeStartCell = null;
let lineStartCell = null;
let isPasteModeActive = false;

// Ramp drawing state
let isRampDrawing = false;
let rampStartCell = null;

// Playtest Simulation state variables
let isPlaytestActive = false;
let playtestPhysics = null;
let playtestKeyboard = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  spacePressed: false,
  resetJump() {
    this.jump = false;
  }
};
let playtestShipMesh = null;
let playtestClock = new THREE.Clock();
let playtestSpawnPos = new THREE.Vector3();
let playtestRestartTimer = 0;

if (typeof window !== 'undefined') {
  window.__editorDebug = {
    get level() {
      return state.level;
    },
    get currentTool() {
      return state.ui.activeTool;
    },
    get selectionBoundingBoxes() {
      const cells = state.ui.selectedCells;
      if (!cells || cells.length === 0) return null;
      let minLane = Infinity, maxLane = -Infinity;
      let minRow = Infinity, maxRow = -Infinity;
      cells.forEach(c => {
        if (c.lane < minLane) minLane = c.lane;
        if (c.lane > maxLane) maxLane = c.lane;
        if (c.row < minRow) minRow = c.row;
        if (c.row > maxRow) maxRow = c.row;
      });
      return { minLane, maxLane, minRow, maxRow };
    },
    get loadedLevelMetadata() {
      return {
        name: state.level.name,
        author: state.level.author,
        parTime: state.level.parTime,
        biome: state.level.biome,
        rowsCount: state.level.rows.length,
        physics: state.level.physics,
        materials: state.level.materials
      };
    },
    get activeSliceOffsets() {
      return {
        height: state.ui.activePlaneHeight,
        row: state.ui.activePlaneRow,
        lane: state.ui.activePlaneLane
      };
    },
    get isPlaytestActive() {
      return isPlaytestActive;
    },
    getViewportCameras() {
      return Object.fromEntries(
        Object.entries(renderer.viewports).map(([name, vp]) => [
          name,
          {
            position: { x: vp.camera.position.x, y: vp.camera.position.y, z: vp.camera.position.z },
            rotation: { x: vp.camera.rotation.x, y: vp.camera.rotation.y, z: vp.camera.rotation.z }
          }
        ])
      );
    },
    callbacks: {
      deserialization: [],
      viewportRebuild: [],
      raycast: []
    },
    on(event, cb) {
      if (this.callbacks[event]) {
        this.callbacks[event].push(cb);
      }
    },
    off(event, cb) {
      if (this.callbacks[event]) {
        this.callbacks[event] = this.callbacks[event].filter(x => x !== cb);
      }
    },
    trigger(event, data) {
      if (this.callbacks[event]) {
        this.callbacks[event].forEach(cb => {
          try { cb(data); } catch (err) { console.error('Error in debug callback:', err); }
        });
      }
    }
  };
}

// Bresenham's line algorithm helper
function getBresenhamPoints(x0, y0, x1, y1) {
  const points = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = (x0 < x1) ? 1 : -1;
  const sy = (y0 < y1) ? 1 : -1;
  let err = dx - dy;

  let x = x0;
  let y = y0;

  while (true) {
    points.push({ lane: x, row: y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return points;
}

// Start Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  if (isPlaytestActive) {
    const dt = playtestClock.getDelta();
    if (playtestPhysics && !playtestPhysics.isDead) {
      playtestPhysics.update(dt, playtestKeyboard, cookedLevelInfo);
      
      // Update ship mesh translation & banking rotation
      if (playtestShipMesh) {
        playtestShipMesh.position.copy(playtestPhysics.position);
        playtestShipMesh.rotation.z = -playtestPhysics.velocity.x * 0.03;
        playtestShipMesh.rotation.y = Math.PI; // facing forward along negative Z
      }
      
      // Third-person camera chase follow
      const camera = renderer.viewports.perspective.camera;
      camera.position.set(playtestPhysics.position.x, playtestPhysics.position.y + 1.8, playtestPhysics.position.z + 5.0);
      camera.lookAt(playtestPhysics.position.x, playtestPhysics.position.y + 0.5, playtestPhysics.position.z - 5.0);
      
      // Update Telemetry HUD
      const speedVal = Math.abs(playtestPhysics.velocity.z) * 3.6;
      document.getElementById('playtest-speed-val').innerText = speedVal.toFixed(1);
      
      const fuelPct = Math.max(0, (playtestPhysics.fuel / 5000) * 100);
      document.getElementById('playtest-fuel-val').innerText = `${fuelPct.toFixed(0)}%`;
      
      const oxyPct = Math.max(0, playtestPhysics.oxygen);
      document.getElementById('playtest-oxygen-val').innerText = `${oxyPct.toFixed(0)}%`;
    }
    
    if (playtestPhysics && playtestPhysics.isDead) {
      document.getElementById('playtest-banner').style.display = 'block';
      document.getElementById('playtest-banner-text').innerText = playtestPhysics.deathReason || 'CRASHED!';
      
      playtestRestartTimer += dt;
      if (playtestRestartTimer >= 1.5) {
        // Auto-restart playtest from spawn position
        playtestPhysics.reset(100, 100);
        playtestPhysics.position.copy(playtestSpawnPos);
        playtestPhysics.velocity.z = -18.0;
        playtestRestartTimer = 0;
        document.getElementById('playtest-banner').style.display = 'none';
      }
    }
  }

  renderer.render();
  
  if (previewRenderer && previewScene && previewCamera) {
    previewRenderer.render(previewScene, previewCamera);
  }

  // Update floating minimap tracking in real-time
  updateMinimap();
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  setupKeyboardShortcuts();
  setupMenuBindings();
  setupToolbarBindings();
  setupSidebarBindings();
  setupPropertiesPanel();
  setupMaterialModal();
  setupViewportClickDrawing();
  setupAutosaveAndRecovery();
  setupViewToggles();

  // Draw initial blank state
  state.level = createEmptyLevel();
  state.resizeGridRaw(30); // 30 default rows
  updateUIFromState();
  renderer.rebuildMeshes();

  // Start loop
  animate();
  
  // Hide loading spinner
  const loader = document.getElementById('loading-overlay');
  if (loader) loader.style.display = 'none';
});

// Update input values on UI from state manager
function updateUIFromState() {
  // Global metadata
  document.getElementById('prop-name').value = state.level.name;
  document.getElementById('prop-author').value = state.level.author;
  document.getElementById('prop-par').value = state.level.parTime;
  document.getElementById('prop-rows').value = state.level.rows.length;
  document.getElementById('prop-biome').value = state.level.biome;

  // Physics sliders
  document.getElementById('override-gravity').value = state.level.physics.gravity;
  document.getElementById('gravity-val').innerText = state.level.physics.gravity;

  document.getElementById('override-oxygen').value = state.level.physics.oxygen;
  document.getElementById('oxygen-val').innerText = state.level.physics.oxygen;

  document.getElementById('override-fuel').value = state.level.physics.fuel;
  document.getElementById('fuel-val').innerText = state.level.physics.fuel;

  // Selection Properties panel update
  updateSelectionPanel();

  // Undo / Redo buttons status
  document.getElementById('btn-undo').disabled = state.history.length === 0;
  document.getElementById('btn-redo').disabled = state.redoStack.length === 0;

  // History List sidebar update
  renderHistoryPanel();

  // Status Bar update
  document.getElementById('status-length').innerText = `${state.level.rows.length} Rows`;
  
  // Rebuild Three.js visuals
  renderer.rebuildMeshes();
}

function updateSelectionPanel() {
  const emptyPanel = document.getElementById('selection-details-empty');
  const activePanel = document.getElementById('selection-details-active');

  if (!state.ui.selectedCell) {
    emptyPanel.style.display = 'block';
    activePanel.style.display = 'none';
    return;
  }

  emptyPanel.style.display = 'none';
  activePanel.style.display = 'block';

  const { lane, row } = state.ui.selectedCell;
  const cell = state.level.rows[row]?.[lane];

  document.getElementById('sel-lane').innerText = lane + 1;
  document.getElementById('sel-row').innerText = row;

  if (!cell) {
    // Empty cell
    document.getElementById('sel-tile-type').value = 'hole';
    document.getElementById('sel-tile-material').value = 'default';
    document.getElementById('sel-decal-type').value = 'none';
    document.getElementById('sel-decal-face').value = 'top';
    document.getElementById('group-decal-text').style.display = 'none';
    document.getElementById('sel-ramp-specifics').style.display = 'none';
  } else {
    // Populated cell
    document.getElementById('sel-tile-type').value = cell.type;
    document.getElementById('sel-tile-material').value = cell.materialId || 'default';
    
    // Decal selections
    const activeFace = document.getElementById('sel-decal-face').value;
    const decalVal = cell.decals?.[activeFace] || 'none';
    document.getElementById('sel-decal-type').value = decalVal;
    
    if (decalVal === 'custom') {
      document.getElementById('group-decal-text').style.display = 'block';
      document.getElementById('sel-decal-text').value = cell.decalText || '';
    } else {
      document.getElementById('group-decal-text').style.display = 'none';
    }

    // Ramp selections
    if (cell.type === 'ramp') {
      document.getElementById('sel-ramp-specifics').style.display = 'block';
      document.getElementById('sel-ramp-direction').value = cell.ramp?.direction || 'forward';
      document.getElementById('sel-ramp-start-y').value = cell.ramp?.startY || 0;
      document.getElementById('sel-ramp-end-y').value = cell.ramp?.endY || 1;
    } else {
      document.getElementById('sel-ramp-specifics').style.display = 'none';
    }
  }
}

// Bind Global Keyboard Hotkeys
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT') return;

    // Playtest Keyboard Input Handling
    if (isPlaytestActive) {
      let handled = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { playtestKeyboard.forward = true; handled = true; }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { playtestKeyboard.backward = true; handled = true; }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { playtestKeyboard.left = true; handled = true; }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { playtestKeyboard.right = true; handled = true; }
      if (e.key === 'Spacebar' || e.key === ' ') {
        playtestKeyboard.jump = true;
        playtestKeyboard.spacePressed = true;
        handled = true;
      }
      
      // Let Escape or F5 bypass playtest controls
      if (e.key === 'Escape' || e.key === 'F5') {
        handled = false;
      }
      
      if (handled) {
        e.preventDefault();
        return;
      }
    }

    // Undo / Redo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (state.undo()) {
        updateUIFromState();
        showStatusMessage("Action Undone");
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      if (state.redo()) {
        updateUIFromState();
        showStatusMessage("Action Redone");
      }
    }

    // Clipboard hotkeys (Copy, Paste, Duplicate)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (state.copySelection()) {
        showStatusMessage(`Copied ${state.clipboard.length} cells to clipboard`);
      } else {
        showStatusMessage("No active selection to copy");
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      if (state.clipboard && state.clipboard.length > 0) {
        isPasteModeActive = !isPasteModeActive;
        if (isPasteModeActive) {
          showStatusMessage("Paste Mode: Move mouse to hover, click to place (ESC to cancel)");
        } else {
          renderer.pasteHoverCell = null;
          renderer.rebuildHelperGrid();
          showStatusMessage("Paste Mode Deactivated");
        }
      } else {
        showStatusMessage("Clipboard is empty");
      }
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      if (state.duplicateSelection()) {
        updateUIFromState();
        showStatusMessage("Selection duplicated");
      } else {
        showStatusMessage("No active selection to duplicate");
      }
    }

    // F5 Play from Cursor
    if (e.key === 'F5') {
      e.preventDefault();
      if (!isPlaytestActive) {
        enterPlaytestSimulation();
      } else {
        exitPlaytestSimulation();
      }
    }

    // New, Save, Load shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      document.getElementById('btn-new').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      document.getElementById('btn-save').click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      document.getElementById('btn-load').click();
    }

    // Tools Hotkeys
    if (e.key.toLowerCase() === 'p') selectTool('pen');
    if (e.key.toLowerCase() === 'l') selectTool('line');
    if (e.key.toLowerCase() === 'f') selectTool('fill');
    if (e.key.toLowerCase() === 'm') selectTool('marquee');
    if (e.key.toLowerCase() === 'r') selectTool('ramp-line');
    if (e.key.toLowerCase() === 'd') selectTool('decal');

    // Arrow Key Selection Nudge / Height Level Plane Shift
    const hasSelection = state.ui.selectedCells && state.ui.selectedCells.length > 0;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (hasSelection) {
        if (state.nudgeSelection(0, 1)) {
          updateUIFromState();
        }
      } else {
        state.ui.activePlaneHeight = Math.min(5, state.ui.activePlaneHeight + 1);
        document.getElementById('status-slice').innerText = `Height Level ${state.ui.activePlaneHeight}`;
        renderer.rebuildHelperGrid();
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hasSelection) {
        if (state.nudgeSelection(0, -1)) {
          updateUIFromState();
        }
      } else {
        state.ui.activePlaneHeight = Math.max(0, state.ui.activePlaneHeight - 1);
        document.getElementById('status-slice').innerText = `Height Level ${state.ui.activePlaneHeight}`;
        renderer.rebuildHelperGrid();
      }
    }
    if (e.key === 'ArrowLeft') {
      if (hasSelection) {
        e.preventDefault();
        if (state.nudgeSelection(-1, 0)) {
          updateUIFromState();
        }
      }
    }
    if (e.key === 'ArrowRight') {
      if (hasSelection) {
        e.preventDefault();
        if (state.nudgeSelection(1, 0)) {
          updateUIFromState();
        }
      }
    }

    // PageUp / PageDown shortcuts for camera scrubbing (forward / backward)
    if (e.key === 'PageUp') {
      e.preventDefault();
      renderer.viewports.top.pan.z -= 20;
      renderer.viewports.side.pan.z -= 20;
      renderer.resetOrthogonalCameras();
      
      // Slide 3D OrbitControls target and perspective camera Z
      renderer.controls3D.target.z -= 20;
      renderer.viewports.perspective.camera.position.z -= 20;
      renderer.controls3D.update();
      
      renderer.rebuildHelperGrid();
    }
    if (e.key === 'PageDown') {
      e.preventDefault();
      renderer.viewports.top.pan.z += 20;
      renderer.viewports.side.pan.z += 20;
      renderer.resetOrthogonalCameras();
      
      // Slide 3D OrbitControls target and perspective camera Z
      renderer.controls3D.target.z += 20;
      renderer.viewports.perspective.camera.position.z += 20;
      renderer.controls3D.update();
      
      renderer.rebuildHelperGrid();
    }

    // Escape exits modes
    if (e.key === 'Escape') {
      if (isPasteModeActive) {
        isPasteModeActive = false;
        renderer.pasteHoverCell = null;
        renderer.rebuildHelperGrid();
        showStatusMessage("Paste Mode Cancelled");
      }

      const indicator = document.getElementById('test-indicator');
      if (indicator && indicator.style.display !== 'none') {
        exitPlaytestSimulation();
      }
      
      const modal = document.getElementById('materials-modal');
      if (modal && modal.style.display !== 'none') {
        document.getElementById('modal-close').click();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (isPlaytestActive) {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') playtestKeyboard.forward = false;
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') playtestKeyboard.backward = false;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') playtestKeyboard.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') playtestKeyboard.right = false;
      if (e.key === 'Spacebar' || e.key === ' ') {
        playtestKeyboard.spacePressed = false;
      }
    }
  });
}

function selectTool(toolId) {
  state.ui.activeTool = toolId;
  document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tool-${toolId}`).classList.add('active');
  showStatusMessage(`Tool selected: ${toolId.toUpperCase()}`);

  if (toolId !== 'ramp-line') {
    isRampDrawing = false;
    rampStartCell = null;
  }
}

// Render dynamic history stack in sidebar
function renderHistoryPanel() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';

  // 1. Initial State (Index 0)
  const initLi = document.createElement('li');
  initLi.className = 'history-item active-step';
  initLi.innerText = 'Level Initialized';
  initLi.setAttribute('data-index', '0');
  if (state.history.length === 0) {
    initLi.classList.add('active-step');
  } else {
    initLi.classList.remove('active-step');
  }
  list.appendChild(initLi);

  // 2. Executed commands (active history stack)
  state.history.forEach((cmd, idx) => {
    const li = document.createElement('li');
    li.className = 'history-item';
    li.innerText = cmd.toString();
    
    const targetIdx = idx + 1;
    li.setAttribute('data-index', String(targetIdx));
    
    if (targetIdx === state.history.length) {
      li.classList.add('active-step');
    }
    list.appendChild(li);
  });

  // 3. Undone commands (future redo stack)
  // Stack items are displayed in reverse order (representing timeline steps)
  for (let idx = state.redoStack.length - 1; idx >= 0; idx--) {
    const cmd = state.redoStack[idx];
    const li = document.createElement('li');
    li.className = 'history-item undone-step';
    li.innerText = cmd.toString();
    
    // Jump index represents number of commands in history AFTER redoing this item
    const targetIdx = state.history.length + (state.redoStack.length - idx);
    li.setAttribute('data-index', String(targetIdx));
    
    list.appendChild(li);
  }

  // Bind click-to-revert action listeners
  document.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.getAttribute('data-index'));
      state.jumpToHistoryIndex(idx);
      updateUIFromState();
      showStatusMessage(`Jumped to step #${idx}`);
    });
  });
}

// Bind top menu actions
function setupMenuBindings() {
  document.getElementById('btn-new').addEventListener('click', () => {
    if (confirm("Create new level? Unsaved draft changes will be lost.")) {
      state.level = createEmptyLevel();
      state.clearAutosave();
      state.history = [];
      state.redoStack = [];
      updateUIFromState();
      showStatusMessage("Created New Level Grid");
    }
  });

  document.getElementById('btn-save').addEventListener('click', () => {
    const serialized = state.serialize();
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.level.name.replace(/\s+/g, '_')}_draft.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatusMessage("Saved draft file downloaded");
  });

  document.getElementById('btn-save-as').addEventListener('click', () => {
    document.getElementById('btn-save').click();
  });

  const fileLoader = document.getElementById('file-loader');
  document.getElementById('btn-load').addEventListener('click', () => {
    fileLoader.click();
  });

  fileLoader.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (state.deserialize(event.target.result)) {
        updateUIFromState();
        showStatusMessage(`Successfully loaded level: ${state.level.name}`);
      } else {
        alert("Failed to parse level JSON. Make sure the schema matches a Space Paths level draft.");
      }
    };
    reader.readAsText(file);
    fileLoader.value = ''; // clear input
  });

  document.getElementById('btn-undo').addEventListener('click', () => {
    if (state.undo()) {
      updateUIFromState();
      showStatusMessage("Action Undone");
    }
  });

  document.getElementById('btn-redo').addEventListener('click', () => {
    if (state.redo()) {
      updateUIFromState();
      showStatusMessage("Action Redone");
    }
  });

  document.getElementById('btn-materials-mgr').addEventListener('click', () => {
    const modal = document.getElementById('materials-modal');
    modal.style.display = 'flex';
    initMaterialPreviewCanvas();
    loadMaterialSlotIntoModal(state.ui.activeMaterialSlot);
    
    // Create backup of materials dictionary in case of cancel
    materialsBackup = deepClone(state.level.materials);
  });

  document.getElementById('btn-cook-export').addEventListener('click', () => {
    const cooked = state.cook();
    const serialized = JSON.stringify(cooked, null, 2);
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.level.name.replace(/\s+/g, '_')}_cooked.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatusMessage("Level cooked and downloaded successfully!");
  });

  document.getElementById('btn-play-cursor').addEventListener('click', () => {
    enterPlaytestSimulation();
  });
}

function setupToolbarBindings() {
  document.getElementById('tool-pen').addEventListener('click', () => selectTool('pen'));
  document.getElementById('tool-line').addEventListener('click', () => selectTool('line'));
  document.getElementById('tool-fill').addEventListener('click', () => selectTool('fill'));
  document.getElementById('tool-marquee').addEventListener('click', () => selectTool('marquee'));
  document.getElementById('tool-ramp-line').addEventListener('click', () => selectTool('ramp-line'));
  document.getElementById('tool-decal').addEventListener('click', () => selectTool('decal'));
}

function setupSidebarBindings() {
  document.querySelectorAll('.brush-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const brushType = btn.getAttribute('data-brush-type');
      const colorIdx = btn.getAttribute('data-color-idx');

      state.ui.activeBrush = {
        type: brushType,
        colorIdx: colorIdx ? parseInt(colorIdx) : 1
      };
      
      showStatusMessage(`Brush active: ${brushType.toUpperCase()}`);
    });
  });

  document.querySelectorAll('.decal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.decal-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      state.ui.activeDecal = btn.getAttribute('data-decal-id');
      showStatusMessage(`Decal active: ${state.ui.activeDecal.toUpperCase()}`);
    });
  });
}

function setupPropertiesPanel() {
  // Commit metadata command when input loses focus
  const commitGlobals = () => {
    const name = document.getElementById('prop-name').value;
    const author = document.getElementById('prop-author').value;
    const par = parseInt(document.getElementById('prop-par').value) || 45;
    const biome = parseInt(document.getElementById('prop-biome').value) || 0;

    // Only commit command if something actually changed
    if (name !== state.level.name || author !== state.level.author || par !== state.level.parTime || biome !== state.level.biome) {
      state.executeCommand(new UpdateMetadataCommand(name, author, par, biome));
      updateUIFromState();
    }
  };

  document.getElementById('prop-name').addEventListener('change', commitGlobals);
  document.getElementById('prop-author').addEventListener('change', commitGlobals);
  document.getElementById('prop-par').addEventListener('change', commitGlobals);
  document.getElementById('prop-biome').addEventListener('change', commitGlobals);

  document.getElementById('prop-rows').addEventListener('change', (e) => {
    const newLen = parseInt(e.target.value);
    if (newLen >= 10 && newLen <= 1000) {
      if (newLen !== state.level.rows.length) {
        state.executeCommand(new ResizeGridCommand(newLen));
        updateUIFromState();
        showStatusMessage(`Resized track to ${newLen} rows`);
      }
    } else {
      e.target.value = state.level.rows.length;
      alert("Track length must be between 10 and 1000 rows.");
    }
  });

  // Physics updates
  // Slider real-time dragging updates labels
  const updateLabelsOnly = () => {
    document.getElementById('gravity-val').innerText = document.getElementById('override-gravity').value;
    document.getElementById('oxygen-val').innerText = document.getElementById('override-oxygen').value;
    document.getElementById('fuel-val').innerText = document.getElementById('override-fuel').value;
  };
  document.getElementById('override-gravity').addEventListener('input', updateLabelsOnly);
  document.getElementById('override-oxygen').addEventListener('input', updateLabelsOnly);
  document.getElementById('override-fuel').addEventListener('input', updateLabelsOnly);

  // Release mouse handle commits command
  const commitPhysics = () => {
    const grav = parseInt(document.getElementById('override-gravity').value);
    const oxy = parseInt(document.getElementById('override-oxygen').value);
    const fuel = parseInt(document.getElementById('override-fuel').value);

    if (grav !== state.level.physics.gravity || oxy !== state.level.physics.oxygen || fuel !== state.level.physics.fuel) {
      state.executeCommand(new UpdatePhysicsCommand(grav, oxy, fuel));
      updateUIFromState();
    }
  };
  document.getElementById('override-gravity').addEventListener('change', commitPhysics);
  document.getElementById('override-oxygen').addEventListener('change', commitPhysics);
  document.getElementById('override-fuel').addEventListener('change', commitPhysics);

  // Selected cell properties changes
  document.getElementById('sel-tile-type').addEventListener('change', (e) => {
    if (!state.ui.selectedCell) return;
    const { lane, row } = state.ui.selectedCell;
    const type = e.target.value;

    if (type === 'hole') {
      state.executeCommand(new PaintCellCommand(lane, row, null));
    } else {
      const colorIdx = state.ui.activeBrush.colorIdx || 1;
      const cellProps = { type, colorIdx };
      
      if (type === 'ramp') {
        cellProps.ramp = { direction: 'forward', startY: 0, endY: 1 };
      }
      state.executeCommand(new PaintCellCommand(lane, row, cellProps));
    }
    updateUIFromState();
  });

  document.getElementById('sel-tile-material').addEventListener('change', (e) => {
    if (!state.ui.selectedCell) return;
    const { lane, row } = state.ui.selectedCell;
    state.executeCommand(new PaintCellCommand(lane, row, { materialId: e.target.value }));
    updateUIFromState();
  });

  const commitSelectedDecal = () => {
    if (!state.ui.selectedCell) return;
    const { lane, row } = state.ui.selectedCell;
    const face = document.getElementById('sel-decal-face').value;
    const decalVal = document.getElementById('sel-decal-type').value;
    const textVal = document.getElementById('sel-decal-text').value;

    const cell = state.level.rows[row]?.[lane];
    if (!cell) return;

    const decals = cell.decals ? { ...cell.decals } : {};
    decals[face] = decalVal;

    state.executeCommand(new PaintCellCommand(lane, row, { 
      decals: decals,
      decalText: textVal
    }));
    updateUIFromState();
  };

  document.getElementById('sel-decal-face').addEventListener('change', updateSelectionPanel);
  document.getElementById('sel-decal-type').addEventListener('change', commitSelectedDecal);
  document.getElementById('sel-decal-text').addEventListener('change', commitSelectedDecal);

  // Ramp properties updates
  const commitSelectedRamp = () => {
    if (!state.ui.selectedCell) return;
    const { lane, row } = state.ui.selectedCell;
    const dir = document.getElementById('sel-ramp-direction').value;
    const start = parseFloat(document.getElementById('sel-ramp-start-y').value) || 0;
    const end = parseFloat(document.getElementById('sel-ramp-end-y').value) || 1;

    state.executeCommand(new PaintCellCommand(lane, row, {
      ramp: { direction: dir, startY: start, endY: end }
    }));
    updateUIFromState();
  };

  document.getElementById('sel-ramp-direction').addEventListener('change', commitSelectedRamp);
  document.getElementById('sel-ramp-start-y').addEventListener('change', commitSelectedRamp);
  document.getElementById('sel-ramp-end-y').addEventListener('change', commitSelectedRamp);
}

function setupMaterialModal() {
  const modal = document.getElementById('materials-modal');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const saveBtn = document.getElementById('modal-save-btn');

  const hideModal = () => {
    modal.style.display = 'none';
  };

  // Revert changes on cancel/close
  const cancelChanges = () => {
    if (materialsBackup) {
      state.level.materials = materialsBackup;
      materialsBackup = null;
    }
    hideModal();
    updateUIFromState();
  };

  closeBtn.addEventListener('click', cancelChanges);
  cancelBtn.addEventListener('click', cancelChanges);

  // Apply PBR changes to level via Command
  saveBtn.addEventListener('click', () => {
    const slotId = state.ui.activeMaterialSlot;
    const name = document.getElementById('mat-input-name').value;
    const textureType = document.getElementById('mat-texture-type').value;
    const color = document.getElementById('mat-color-picker').value;
    const roughness = document.getElementById('mat-slider-roughness').value;
    const metalness = document.getElementById('mat-slider-metalness').value;
    const emissive = document.getElementById('mat-slider-emissive').value;
    const repeat = document.getElementById('mat-slider-repeat').value;

    const newProps = { name, textureType, color, roughness, metalness, emissive, repeat };

    // Clear backup (so it doesn't revert) and execute command
    materialsBackup = null;
    state.executeCommand(new ConfigureMaterialCommand(slotId, newProps));
    
    // Update visual slot picker labels
    const activeSlotBtn = document.querySelector(`.slot-item[data-slot-id="${slotId}"]`);
    if (activeSlotBtn) {
      activeSlotBtn.querySelector('.slot-color-preview').style.backgroundColor = color;
      activeSlotBtn.querySelector('.slot-name').innerText = name;
      activeSlotBtn.querySelector('.slot-desc').innerText = `Texture: ${textureType.toUpperCase()}`;
    }

    hideModal();
    updateUIFromState();
    showStatusMessage(`Saved material settings: ${name}`);
  });

  document.querySelectorAll('.slot-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.slot-item').forEach(s => s.classList.remove('active'));
      item.classList.add('active');

      const slotId = item.getAttribute('data-slot-id');
      state.ui.activeMaterialSlot = slotId;
      loadMaterialSlotIntoModal(slotId);
    });
  });

  // Real-time slider preview changes (modifies state RAW for preview sphere)
  const updateModalPreview = () => {
    const slotId = state.ui.activeMaterialSlot;
    const color = document.getElementById('mat-color-picker').value;
    document.getElementById('mat-color-hex').value = color;

    const roughness = parseFloat(document.getElementById('mat-slider-roughness').value);
    document.getElementById('val-roughness').innerText = roughness.toFixed(2);

    const metalness = parseFloat(document.getElementById('mat-slider-metalness').value);
    document.getElementById('val-metalness').innerText = metalness.toFixed(2);

    const emissive = parseFloat(document.getElementById('mat-slider-emissive').value);
    document.getElementById('val-emissive').innerText = emissive.toFixed(2);

    const repeat = parseFloat(document.getElementById('mat-slider-repeat').value);
    document.getElementById('val-repeat').innerText = repeat.toFixed(1);

    // Apply raw updates to slot for rendering preview sphere
    state.setMaterialSlotRaw(slotId, {
      color, roughness, metalness, emissive, repeat
    });

    if (previewSphere) {
      previewSphere.material.color.set(color);
      previewSphere.material.roughness = roughness;
      previewSphere.material.metalness = metalness;
      previewSphere.material.emissive.set(color).multiplyScalar(emissive);
    }
  };

  document.getElementById('mat-color-picker').addEventListener('input', updateModalPreview);
  document.getElementById('mat-color-hex').addEventListener('change', (e) => {
    document.getElementById('mat-color-picker').value = e.target.value;
    updateModalPreview();
  });
  document.getElementById('mat-slider-roughness').addEventListener('input', updateModalPreview);
  document.getElementById('mat-slider-metalness').addEventListener('input', updateModalPreview);
  document.getElementById('mat-slider-emissive').addEventListener('input', updateModalPreview);
  document.getElementById('mat-slider-repeat').addEventListener('input', updateModalPreview);
  document.getElementById('mat-texture-type').addEventListener('change', updateModalPreview);
}

function loadMaterialSlotIntoModal(slotId) {
  const config = state.level.materials?.[slotId] || createEmptyLevel().materials[slotId];
  if (!config) return;

  document.getElementById('mat-input-name').value = config.name;
  document.getElementById('mat-texture-type').value = config.textureType;
  document.getElementById('mat-color-picker').value = config.color;
  document.getElementById('mat-color-hex').value = config.color;

  document.getElementById('mat-slider-roughness').value = config.roughness;
  document.getElementById('val-roughness').innerText = parseFloat(config.roughness).toFixed(2);

  document.getElementById('mat-slider-metalness').value = config.metalness;
  document.getElementById('val-metalness').innerText = parseFloat(config.metalness).toFixed(2);

  document.getElementById('mat-slider-emissive').value = config.emissive;
  document.getElementById('val-emissive').innerText = parseFloat(config.emissive).toFixed(2);

  document.getElementById('mat-slider-repeat').value = config.repeat;
  document.getElementById('val-repeat').innerText = parseFloat(config.repeat).toFixed(1);

  if (previewSphere) {
    previewSphere.material.color.set(config.color);
    previewSphere.material.roughness = parseFloat(config.roughness);
    previewSphere.material.metalness = parseFloat(config.metalness);
    previewSphere.material.emissive.set(config.color).multiplyScalar(parseFloat(config.emissive));
  }
}

function initMaterialPreviewCanvas() {
  const container = document.getElementById('material-preview-canvas-container');
  if (container.children.length > 0) return;

  previewRenderer = new THREE.WebGLRenderer({ antialias: true });
  previewRenderer.setSize(250, 250);
  previewRenderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(previewRenderer.domElement);

  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color('#08090f');

  previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  previewCamera.position.set(0, 0, 4);

  const amb = new THREE.AmbientLight(0xffffff, 0.25);
  previewScene.add(amb);
  const dir1 = new THREE.DirectionalLight(0xffffff, 0.85);
  dir1.position.set(5, 5, 5);
  previewScene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0x0088ff, 0.45);
  dir2.position.set(-5, -5, -5);
  previewScene.add(dir2);

  const geom = new THREE.SphereGeometry(1.2, 64, 64);
  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#00ffff'),
    roughness: 0.4,
    metalness: 0.6
  });
  previewSphere = new THREE.Mesh(geom, mat);
  previewScene.add(previewSphere);

  let isDragging = false;
  let startMouse = { x: 0, y: 0 };
  
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    startMouse.x = e.clientX;
    startMouse.y = e.clientY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dX = e.clientX - startMouse.x;
    const dY = e.clientY - startMouse.y;

    previewSphere.rotation.y += dX * 0.01;
    previewSphere.rotation.x += dY * 0.01;

    startMouse.x = e.clientX;
    startMouse.y = e.clientY;
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

// Setup active drawing in viewport 2D clicks
function setupViewportClickDrawing() {
  const vpNames = ['top', 'front', 'side'];
  let rowsBackup = null;
  let activeDragViewportName = null;

  vpNames.forEach(name => {
    const wrapper = document.getElementById(`canvas-${name}`);

    const handleDrawingStroke = (e) => {
      // 1. If paste mode is active, track hover preview
      if (isPasteModeActive) {
        const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
        if (coords) {
          renderer.pasteHoverCell = { lane: coords.lane, row: coords.row };
          renderer.rebuildHelperGrid();
        }
        return;
      }

      // 2. If marquee mode is dragging, update selection box preview
      if (marqueeStartCell && activeDragViewportName === name) {
        const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
        if (coords) {
          renderer.marqueeEndCell = { lane: coords.lane, row: coords.row };
          renderer.rebuildHelperGrid();
        }
        return;
      }

      // 3. If line tool is dragging, update line preview
      if (lineStartCell && activeDragViewportName === name) {
        const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
        if (coords) {
          renderer.linePreviewCells = getBresenhamPoints(lineStartCell.lane, lineStartCell.row, coords.lane, coords.row);
          renderer.rebuildHelperGrid();
        }
        return;
      }

      // 4. Standard drawing stroke (pen, decal)
      if (!isStrokeActive || activeDragViewportName !== name) return;
      
      const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
      if (!coords) return;
      
      const { lane, row } = coords;
      document.getElementById('status-cursor').innerText = `Lane ${lane + 1}, Row ${row}`;

      // Check if we've already modified this cell in the current drag stroke
      const alreadyPainted = strokeCellsList.some(item => item.lane === lane && item.row === row);
      if (alreadyPainted) return;

      if (state.ui.activeTool === 'pen') {
        const brush = state.ui.activeBrush;
        const cellProps = brush.type === 'hole' ? null : { type: brush.type, colorIdx: brush.colorIdx };
        
        // Apply raw modification instantly to viewport meshes
        state.setCellRaw(lane, row, cellProps);
        renderer.rebuildMeshes();
        
        strokeCellsList.push({ lane, row, cellProps });
      }
      
      if (state.ui.activeTool === 'decal') {
        const face = document.getElementById('sel-decal-face').value;
        const decalId = state.ui.activeDecal;
        const textVal = state.ui.activeDecalText;
        
        const cell = state.level.rows[row]?.[lane];
        if (cell) {
          const decals = cell.decals ? { ...cell.decals } : {};
          decals[face] = decalId;
          const cellProps = { decals, decalText: textVal };
          
          state.setCellRaw(lane, row, cellProps);
          renderer.rebuildMeshes();
          
          strokeCellsList.push({ lane, row, cellProps });
        }
      }
    };

    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // only left click
      
      const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
      if (!coords) return;
      
      const { lane, row } = coords;

      // 1. If paste mode is active, click to place
      if (isPasteModeActive) {
        if (state.pasteClipboard(lane, row)) {
          showStatusMessage("Pasted clipboard cells.");
        }
        isPasteModeActive = false;
        renderer.pasteHoverCell = null;
        updateUIFromState();
        return;
      }

      activeDragViewportName = name;

      // 2. Marquee select tool start
      if (state.ui.activeTool === 'marquee') {
        marqueeStartCell = { lane, row };
        renderer.marqueeStartCell = { lane, row };
        renderer.marqueeEndCell = { lane, row };
        renderer.rebuildHelperGrid();
      } 
      // 3. Line vector draw tool start
      else if (state.ui.activeTool === 'line') {
        lineStartCell = { lane, row };
        renderer.linePreviewCells = [{ lane, row }];
        renderer.rebuildHelperGrid();
      }
      // 4. Pen and decal tools start
      else if (state.ui.activeTool === 'pen' || state.ui.activeTool === 'decal') {
        isStrokeActive = true;
        strokeCellsList = [];
        rowsBackup = JSON.parse(JSON.stringify(state.level.rows));
        handleDrawingStroke(e);
      } 
      // 5. Fill tool
      else if (state.ui.activeTool === 'fill') {
        performFloodFillCommand(lane, row);
      } 
      // 6. Ramp plot tool
      else if (state.ui.activeTool === 'ramp-line') {
        if (!isRampDrawing) {
          isRampDrawing = true;
          rampStartCell = { lane, row, height: state.ui.activePlaneHeight };
          showStatusMessage(`Ramp start: Lane ${lane+1}, Row ${row}. Click endpoint.`);
        } else {
          isRampDrawing = false;
          const endCell = { lane, row, height: state.ui.activePlaneHeight };
          createRampCommand(rampStartCell, endCell);
          rampStartCell = null;
        }
      }
    });

    wrapper.addEventListener('mousemove', handleDrawingStroke);
  });

  window.addEventListener('mouseup', (e) => {
    if (!activeDragViewportName) return;
    const name = activeDragViewportName;
    activeDragViewportName = null;

    if (isStrokeActive) {
      isStrokeActive = false;
      if (strokeCellsList.length > 0) {
        if (rowsBackup) {
          state.level.rows = rowsBackup;
          rowsBackup = null;
        }
        const label = state.ui.activeTool === 'decal' ? 'Applied Decals' : 'Painted Blocks';
        state.executeCommand(new PaintCellsBatchCommand(strokeCellsList, `${label} (${strokeCellsList.length} tiles)`));
        updateUIFromState();
      }
    }

    if (marqueeStartCell) {
      const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
      const finalLane = coords ? coords.lane : marqueeStartCell.lane;
      const finalRow = coords ? coords.row : marqueeStartCell.row;

      const minLane = Math.min(marqueeStartCell.lane, finalLane);
      const maxLane = Math.max(marqueeStartCell.lane, finalLane);
      const minRow = Math.min(marqueeStartCell.row, finalRow);
      const maxRow = Math.max(marqueeStartCell.row, finalRow);

      const selected = [];
      for (let r = minRow; r <= maxRow; r++) {
        for (let l = minLane; l <= maxLane; l++) {
          selected.push({ lane: l, row: r });
        }
      }

      state.ui.selectedCells = selected;
      if (selected.length > 0) {
        state.ui.selectedCell = { ...selected[0] };
        state.ui.activePlaneRow = selected[0].row;
        state.ui.activePlaneLane = selected[0].lane;
      } else {
        state.ui.selectedCell = null;
      }

      marqueeStartCell = null;
      renderer.marqueeStartCell = null;
      renderer.marqueeEndCell = null;
      updateUIFromState();
    }

    if (lineStartCell) {
      const coords = renderer.getRaycastCoordinates(name, e.clientX, e.clientY);
      const finalLane = coords ? coords.lane : lineStartCell.lane;
      const finalRow = coords ? coords.row : lineStartCell.row;

      const points = getBresenhamPoints(lineStartCell.lane, lineStartCell.row, finalLane, finalRow);
      const brush = state.ui.activeBrush;
      const cellProps = brush.type === 'hole' ? null : { type: brush.type, colorIdx: brush.colorIdx };
      
      const batchList = points.map(p => ({ lane: p.lane, row: p.row, cellProps }));
      if (batchList.length > 0) {
        state.executeCommand(new PaintCellsBatchCommand(batchList, `Drawn Line (${batchList.length} cells)`));
      }

      lineStartCell = null;
      renderer.linePreviewCells = [];
      updateUIFromState();
    }
  });
}

// Flood Fill Command wrapper
function performFloodFillCommand(startLane, startRow) {
  const rows = state.level.rows;
  const targetType = rows[startRow]?.[startLane]?.type || 'hole';
  const newType = state.ui.activeBrush.type;
  
  if (targetType === newType && (targetType === 'hole' || rows[startRow]?.[startLane]?.colorIdx === state.ui.activeBrush.colorIdx)) {
    return;
  }

  const queue = [[startLane, startRow]];
  const visited = new Set();
  const batchList = [];

  const getKey = (l, r) => `${l},${r}`;
  visited.add(getKey(startLane, startRow));

  while (queue.length > 0) {
    const [l, r] = queue.shift();
    const cellProps = newType === 'hole' ? null : { type: newType, colorIdx: state.ui.activeBrush.colorIdx };
    batchList.push({ lane: l, row: r, cellProps });

    const neighbors = [[l, r - 1], [l, r + 1], [l - 1, r], [l + 1, r]];
    for (const [nl, nr] of neighbors) {
      if (nl < 0 || nl > 6 || nr < 0 || nr >= rows.length) continue;
      const key = getKey(nl, nr);
      if (visited.has(key)) continue;

      const neighborType = rows[nr]?.[nl]?.type || 'hole';
      if (neighborType === targetType) {
        visited.add(key);
        queue.push([nl, nr]);
      }
    }
  }

  state.executeCommand(new PaintCellsBatchCommand(batchList, `Flood Fill with ${newType.toUpperCase()}`));
  updateUIFromState();
}

// Draw Ramp Command wrapper
function createRampCommand(start, end) {
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const totalLength = (maxRow - minRow) + 1;
  
  const startHeight = start.height * 1.0;
  const endHeight = end.height * 1.0;
  const deltaH = endHeight - startHeight;
  const stepH = deltaH / totalLength;

  const colorIdx = state.ui.activeBrush.colorIdx || 1;
  const direction = end.row <= start.row ? 'forward' : 'backward';
  const batchList = [];

  for (let r = minRow; r <= maxRow; r++) {
    const offset = r - minRow;
    const cellStartHeight = startHeight + offset * stepH;
    const cellEndHeight = startHeight + (offset + 1) * stepH;

    const rowLane = start.lane;
    batchList.push({
      lane: rowLane,
      row: r,
      cellProps: {
        type: 'ramp',
        colorIdx: colorIdx,
        ramp: { direction: direction, startY: cellStartHeight, endY: cellEndHeight }
      }
    });
  }

  state.executeCommand(new DrawRampCommand(batchList, start, end));
  updateUIFromState();
}

// 2D Canvas Minimap Renderer
function updateMinimap() {
  const canvas = document.getElementById('canvas-minimap');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const maxRows = state.level.rows.length;
  
  // Clear canvas
  ctx.fillStyle = '#05060b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const laneW = canvas.width / 7;
  const rowH = canvas.height / maxRows;

  // Draw cells (row 0 at bottom, row N at top)
  state.level.rows.forEach((row, r) => {
    // Inverted Y axis for top-down track ahead feel
    const y = canvas.height - (r + 1) * rowH;
    
    row.forEach((cell, c) => {
      if (!cell) return;
      
      const x = c * laneW;
      
      // Select minimap cell color
      if (cell.type === 'obstacle-full') {
        ctx.fillStyle = '#ff5500';
      } else if (cell.type === 'obstacle-half') {
        ctx.fillStyle = '#bb8800';
      } else if (cell.type === 'tunnel') {
        ctx.fillStyle = '#3333aa';
      } else if (cell.type === 'ramp') {
        ctx.fillStyle = '#00aa88';
      } else {
        // Flat road, color-coded by behavior if special
        if (cell.colorIdx === 11 || cell.colorIdx === 12) {
          ctx.fillStyle = '#00ff00'; // boost
        } else if (cell.colorIdx === 3) {
          ctx.fillStyle = '#660088'; // sticky
        } else if (cell.colorIdx === 13) {
          ctx.fillStyle = '#ff0000'; // burning
        } else {
          ctx.fillStyle = '#008833'; // normal flat road
        }
      }

      ctx.fillRect(x + 0.5, y + 0.5, laneW - 1, rowH - 1);
    });
  });

  // Render camera focus Z line tracker
  const camZ = renderer.viewports.perspective.camera.position.z;
  const activeRow = Math.max(0, Math.min(maxRows - 1, Math.floor(-camZ / TILE_LENGTH)));
  const camY = canvas.height - (activeRow + 0.5) * rowH;
  
  ctx.strokeStyle = '#00ffff';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00ffff';
  ctx.shadowBlur = 4;
  
  ctx.beginPath();
  ctx.moveTo(0, camY);
  ctx.lineTo(canvas.width, camY);
  ctx.stroke();
  
  // Reset shadows
  ctx.shadowBlur = 0;
}

// Setup periodic autosave & restore handlers
function setupAutosaveAndRecovery() {
  setInterval(() => {
    if (state.autosave()) {
      const time = new Date().toLocaleTimeString();
      const status = document.getElementById('status-autosave');
      status.innerText = `Autosave: Saved at ${time}`;
      status.style.color = '#00ff66';
      setTimeout(() => {
        status.style.color = 'var(--text-muted)';
      }, 3000);
    }
  }, 300000);

  setTimeout(() => {
    if (state.hasAutosave()) {
      if (confirm("We found an unsaved level draft from your previous session. Would you like to restore it?")) {
        if (state.recoverAutosave()) {
          updateUIFromState();
          showStatusMessage("Draft recovery file restored.");
        }
      } else {
        state.clearAutosave();
      }
    }
  }, 1000);
}

function showStatusMessage(message) {
  const bar = document.getElementById('status-autosave');
  if (bar) {
    bar.innerText = message;
    bar.style.color = 'var(--text-accent)';
    setTimeout(() => {
      bar.innerText = 'Autosave: Idle';
      bar.style.color = 'var(--text-muted)';
    }, 4000);
  }
}

let cookedLevelInfo = null;

function buildPlaytestLevelInfo() {
  const maxRows = state.level.rows.length;
  const collidables = [];
  const specialTiles = [];

  state.level.rows.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (!cell) return;
      
      const xPos = (c - 3) * TILE_WIDTH;
      const zPos = -r * TILE_LENGTH - TILE_LENGTH / 2;
      const minX = xPos - TILE_WIDTH / 2;
      const maxX = xPos + TILE_WIDTH / 2;
      const minZ = zPos - TILE_LENGTH / 2;
      const maxZ = zPos + TILE_LENGTH / 2;

      let height = 0.2;
      let yPos = -0.1;

      if (cell.type === 'obstacle-half') {
        height = 1.0;
        yPos = 0.5;
      } else if (cell.type === 'obstacle-full') {
        height = 2.0;
        yPos = 1.0;
      } else if (cell.type === 'tunnel') {
        height = 2.5;
        yPos = 1.25;
        
        collidables.push({
          isCeiling: true,
          minX, maxX,
          minY: height - 0.2,
          maxY: height,
          minZ, maxZ
        });
        collidables.push({
          isObstacle: true,
          minX: minX, maxX: minX + 0.2,
          minY: 0.0, maxY: height - 0.2,
          minZ, maxZ
        });
        collidables.push({
          isObstacle: true,
          minX: maxX - 0.2, maxX: maxX,
          minY: 0.0, maxY: height - 0.2,
          minZ, maxZ
        });
        return;
      } else if (cell.type === 'ramp') {
        const sY = cell.ramp?.startY !== undefined ? cell.ramp.startY : 0.0;
        const eY = cell.ramp?.endY !== undefined ? cell.ramp.endY : 1.0;
        collidables.push({
          isRamp: true,
          minX, maxX,
          minZ, maxZ,
          startY: sY,
          endY: eY,
          direction: cell.ramp?.direction || 'forward'
        });
        return;
      }

      if (typeof cell.type === 'string' && cell.type.startsWith('obstacle')) {
        collidables.push({
          isObstacle: true,
          minX, maxX,
          minY: yPos - height / 2,
          maxY: yPos + height / 2,
          minZ, maxZ
        });
      }

      if (cell.colorIdx !== undefined) {
        const BEHAVIORS = {
          3: 'sticky',
          9: 'slippery',
          10: 'refill',
          11: 'boost',
          12: 'super_boost',
          13: 'burning',
          14: 'high_jump'
        };
        const behavior = BEHAVIORS[cell.colorIdx];
        if (behavior) {
          specialTiles.push({
            boundingBox: {
              minX, maxX,
              minY: yPos + height / 2 - 0.1,
              maxY: yPos + height / 2 + 0.5,
              minZ, maxZ
            },
            behavior: behavior
          });
        }
      }
    });
  });

  cookedLevelInfo = {
    gravity: state.level.physics.gravity,
    trackLength: maxRows * TILE_LENGTH,
    collidables,
    specialTiles
  };
}

function createPlaytestShipMesh() {
  const group = new THREE.Group();
  
  // Fuselage
  const fuseGeom = new THREE.BoxGeometry(0.5, 0.2, 1.2);
  const mainMat = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    roughness: 0.2,
    metalness: 0.8
  });
  const fuselage = new THREE.Mesh(fuseGeom, mainMat);
  fuselage.position.set(0, 0.1, 0);
  group.add(fuselage);
  
  // Left Wing
  const wingGeom = new THREE.BoxGeometry(0.35, 0.04, 0.5);
  const leftWing = new THREE.Mesh(wingGeom, mainMat);
  leftWing.position.set(-0.4, 0.05, 0.1);
  group.add(leftWing);
  
  // Right Wing
  const rightWing = leftWing.clone();
  rightWing.position.x = 0.4;
  group.add(rightWing);
  
  // Tail Fin
  const finGeom = new THREE.BoxGeometry(0.04, 0.35, 0.25);
  const fin = new THREE.Mesh(finGeom, mainMat);
  fin.position.set(0, 0.35, -0.3);
  group.add(fin);
  
  // Engine Thrusters
  const engineGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 8);
  const engineMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  
  const leftEngine = new THREE.Mesh(engineGeom, engineMat);
  leftEngine.rotation.x = Math.PI / 2;
  leftEngine.position.set(-0.15, 0.1, -0.6);
  group.add(leftEngine);
  
  const rightEngine = leftEngine.clone();
  rightEngine.position.x = 0.15;
  group.add(rightEngine);

  return group;
}

function findSpawnSurfaceY(lane, row) {
  const cell = state.level.rows[row]?.[lane];
  if (!cell) return 0.0;
  if (cell.type === 'obstacle-full') return 2.0;
  if (cell.type === 'obstacle-half') return 1.0;
  if (cell.type === 'tunnel') return 0.0;
  if (cell.type === 'ramp') {
    const sY = cell.ramp?.startY !== undefined ? cell.ramp.startY : 0.0;
    const eY = cell.ramp?.endY !== undefined ? cell.ramp.endY : 1.0;
    return sY + 0.5 * (eY - sY);
  }
  return 0.0;
}

function enterPlaytestSimulation() {
  if (isPlaytestActive) return;
  
  // 1. Compile Level
  buildPlaytestLevelInfo();
  
  // 2. Determine Spawn Point
  let spawnLane = 3;
  let spawnRow = 0;
  
  if (state.ui.selectedCell) {
    spawnLane = state.ui.selectedCell.lane;
    spawnRow = state.ui.selectedCell.row;
  } else {
    for (let r = 0; r < state.level.rows.length; r++) {
      if (state.level.rows[r].some(c => c !== null)) {
        spawnRow = r;
        let minD = Infinity;
        for (let c = 0; c < 7; c++) {
          if (state.level.rows[r][c] !== null) {
            const d = Math.abs(c - 3);
            if (d < minD) {
              minD = d;
              spawnLane = c;
            }
          }
        }
        break;
      }
    }
  }
  
  const spawnX = (spawnLane - 3) * TILE_WIDTH;
  const spawnZ = -spawnRow * TILE_LENGTH - TILE_LENGTH / 2;
  const spawnY = findSpawnSurfaceY(spawnLane, spawnRow) + 0.3;
  
  playtestSpawnPos.set(spawnX, spawnY, spawnZ);
  
  // 3. Initialize Physics Engine
  playtestPhysics = new PhysicsEngine();
  playtestPhysics.reset(100, 100);
  playtestPhysics.position.copy(playtestSpawnPos);
  playtestPhysics.velocity.z = -18.0; // baseline momentum
  
  Object.keys(playtestKeyboard).forEach(k => {
    if (typeof playtestKeyboard[k] === 'boolean') {
      playtestKeyboard[k] = false;
    }
  });
  
  // 4. Initialize Ship Mesh
  playtestShipMesh = createPlaytestShipMesh();
  renderer.scene.add(playtestShipMesh);
  
  renderer.controls3D.enabled = false;
  
  // 5. Update UI states
  isPlaytestActive = true;
  playtestClock.getDelta();
  playtestRestartTimer = 0;
  
  document.getElementById('test-indicator').style.display = 'inline-block';
  document.getElementById('playtest-telemetry').style.display = 'flex';
  document.getElementById('playtest-banner').style.display = 'none';
  
  const box3D = document.getElementById('viewport-3d');
  box3D.classList.add('maximized');
  box3D.classList.add('active-focus');
  
  document.querySelectorAll('.menu-btn, .tool-btn, .brush-btn, .decal-btn').forEach(btn => {
    btn.disabled = true;
  });
  
  showStatusMessage("Simulating playtest segment (Press ESC to return)...");
  renderer.resize();
}

function exitPlaytestSimulation() {
  if (!isPlaytestActive) return;
  
  isPlaytestActive = false;
  
  document.getElementById('test-indicator').style.display = 'none';
  document.getElementById('playtest-telemetry').style.display = 'none';
  document.getElementById('playtest-banner').style.display = 'none';
  
  const box3D = document.getElementById('viewport-3d');
  box3D.classList.remove('maximized');
  box3D.classList.remove('active-focus');
  
  document.querySelectorAll('.menu-btn, .tool-btn, .brush-btn, .decal-btn').forEach(btn => {
    btn.disabled = false;
  });
  
  document.getElementById('btn-undo').disabled = state.history.length === 0;
  document.getElementById('btn-redo').disabled = state.redoStack.length === 0;
  
  if (playtestShipMesh) {
    renderer.scene.remove(playtestShipMesh);
    playtestShipMesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    playtestShipMesh = null;
  }
  
  playtestPhysics = null;
  
  renderer.controls3D.enabled = true;
  renderer.resetOrthogonalCameras();
  renderer.controls3D.target.set(0, 0, -40);
  renderer.controls3D.update();
  
  showStatusMessage("Playtest terminated. Restored editor state.");
  renderer.resize();
}

function setupViewToggles() {
  const btnMinimap = document.getElementById('btn-toggle-minimap');
  const btnDecals = document.getElementById('btn-toggle-decals');
  const btnGrid = document.getElementById('btn-toggle-grid');

  btnMinimap.addEventListener('click', () => {
    const minimap = document.getElementById('viewport-minimap');
    if (minimap.style.display === 'none') {
      minimap.style.display = 'flex';
      btnMinimap.classList.remove('toggle-btn-inactive');
      btnMinimap.classList.add('toggle-btn-active');
      showStatusMessage("Track Scanner Enabled");
    } else {
      minimap.style.display = 'none';
      btnMinimap.classList.remove('toggle-btn-active');
      btnMinimap.classList.add('toggle-btn-inactive');
      showStatusMessage("Track Scanner Disabled");
    }
  });

  btnDecals.addEventListener('click', () => {
    renderer.showDecals = !renderer.showDecals;
    if (renderer.showDecals) {
      btnDecals.classList.remove('toggle-btn-inactive');
      btnDecals.classList.add('toggle-btn-active');
      showStatusMessage("Decals Visible");
    } else {
      btnDecals.classList.remove('toggle-btn-active');
      btnDecals.classList.add('toggle-btn-inactive');
      showStatusMessage("Decals Hidden");
    }
    renderer.rebuildMeshes();
  });

  btnGrid.addEventListener('click', () => {
    renderer.showGrid = !renderer.showGrid;
    if (renderer.showGrid) {
      btnGrid.classList.remove('toggle-btn-inactive');
      btnGrid.classList.add('toggle-btn-active');
      showStatusMessage("Grid Helpers Visible");
    } else {
      btnGrid.classList.remove('toggle-btn-active');
      btnGrid.classList.add('toggle-btn-inactive');
      showStatusMessage("Grid Helpers Hidden");
    }
    renderer.rebuildHelperGrid();
  });

  const btnCollisionView = document.getElementById('btn-toggle-collision-view');
  if (btnCollisionView) {
    btnCollisionView.addEventListener('click', () => {
      renderer.collisionView = !renderer.collisionView;
      if (renderer.collisionView) {
        btnCollisionView.classList.remove('toggle-btn-inactive');
        btnCollisionView.classList.add('toggle-btn-active');
        showStatusMessage("Collision/Hitbox View Enabled");
      } else {
        btnCollisionView.classList.remove('toggle-btn-active');
        btnCollisionView.classList.add('toggle-btn-inactive');
        showStatusMessage("Collision/Hitbox View Disabled");
      }
      renderer.rebuildMeshes();
    });
  }
}

// Test hooks export
export function getPlaytestState() {
  return {
    isPlaytestActive,
    playtestPhysics,
    playtestKeyboard,
    playtestShipMesh,
    playtestSpawnPos
  };
}

export { enterPlaytestSimulation, exitPlaytestSimulation, findSpawnSurfaceY, buildPlaytestLevelInfo };
