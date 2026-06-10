import { vi, describe, it, expect, beforeEach } from 'vitest';
import { InGameEditor } from '../inGameEditor.js';
import * as THREE from 'three';

// Mock levelLoader.js functions
vi.mock('../levelLoader.js', () => {
  return {
    buildLevelAsync: vi.fn().mockResolvedValue({
      fuel: 130,
      oxygen: 60,
      roadMeshes: [],
      trackLength: 100
    }),
    disposeUnusedThemes: vi.fn(),
    getActiveThemeIndex: vi.fn().mockReturnValue(0),
    TILE_WIDTH: 2.0,
    TILE_LENGTH: 4.0
  };
});

describe('In-Game Level Editor Unit Tests', () => {
  let app;
  let editor;

  beforeEach(() => {
    // Construct a mocked app environment matching InGameEditor requirements
    app = {
      gameState: 'playing',
      currentPack: 'standard',
      currentLevelIndex: 0,
      currentLevelData: {
        name: 'Retro Speedway',
        author: 'SkyRunner',
        parTime: 50,
        biome: 1,
        gravity: 9,
        oxygen: 70,
        fuel: 140,
        rows: [
          [null, { val: 11 }, null, null, null, null, null],
          [null, null, { val: 1, full: true }, null, null, null, null]
        ]
      },
      physics: {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        reset: vi.fn(),
        onGround: false,
        isDead: false,
        deathReason: '',
        isTransitioning: false,
        isRebounding: false,
        reboundTimer: 0.0,
        justRebounded: false
      },
      showScreen: vi.fn(),
      rewindTimeoutId: null,
      playtestEscHandler: null,
      isRewinding: false,
      rewindHistoryIndex: -1,
      stateHistory: [],
      graphics: {
        camera: new THREE.PerspectiveCamera(),
        scene: new THREE.Scene(),
        renderer: {
          domElement: document.createElement('canvas')
        },
        clearLevel: vi.fn(),
        spawnCityScenery: vi.fn(),
        shipMesh: {
          visible: true
        },
        particles: []
      },
      getCachedPack: vi.fn().mockReturnValue({}),
      findSafeSpawnPosition: vi.fn().mockReturnValue({ spawnX: 0, spawnY: 0.3, spawnZ: -5 })
    };

    // Inject canvas-container element to satisfy _onMouseDown element lookup
    let container = document.getElementById('canvas-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'canvas-container';
      document.body.appendChild(container);
    }

    editor = new InGameEditor(app);
  });

  it('should unpack cooked level data correctly upon activation', () => {
    editor.activate();
    expect(editor.active).toBe(true);
    expect(app.gameState).toBe('editor');
    expect(editor.levelDraft).toBeDefined();
    expect(editor.levelDraft.name).toBe('Retro Speedway');
    expect(editor.levelDraft.physics.gravity).toBe(9);

    // Assert row unpacking translation
    const unpackedRow0 = editor.levelDraft.rows[0];
    expect(unpackedRow0[1]).toEqual({ type: 'road', colorIdx: 11 });
    expect(unpackedRow0[0]).toBeNull();

    const unpackedRow1 = editor.levelDraft.rows[1];
    expect(unpackedRow1[2]).toEqual({ type: 'obstacle-full', colorIdx: 1 });
  });

  it('should cook draft level data back to game cooked format correctly', () => {
    editor.activate();
    const cooked = editor.cookLevel();

    expect(cooked.name).toBe('Retro Speedway');
    expect(cooked.gravity).toBe(9);
    expect(cooked.rows[0][1].val).toBe(11);
    expect(cooked.rows[1][2].full).toBe(true);
  });

  it('should support immutable command history execution (paint block / undo / redo)', () => {
    editor.activate();

    // Verify row 0, lane 3 is null initially
    expect(editor.levelDraft.rows[0][3]).toBeNull();

    // Paint obstacle-half
    editor.paintCell(3, 0, { type: 'obstacle-half', colorIdx: 4 });

    // Assert it was painted
    expect(editor.levelDraft.rows[0][3]).toEqual({ type: 'obstacle-half', colorIdx: 4 });
    expect(editor.history.length).toBe(1);

    // Undo the painting command
    editor.undo();
    expect(editor.levelDraft.rows[0][3]).toBeNull();

    // Redo the painting command
    editor.redo();
    expect(editor.levelDraft.rows[0][3]).toEqual({ type: 'obstacle-half', colorIdx: 4 });
  });

  it('should handle saving level overrides to localStorage', async () => {
    editor.activate();
    
    // Add custom tag
    editor.paintCell(4, 0, { type: 'road', colorIdx: 10 });
    await editor.saveLevelOverrides();

    const storageKey = `skyroads_override_standard_0`;
    const savedString = localStorage.getItem(storageKey);
    expect(savedString).toBeDefined();

    const savedJson = JSON.parse(savedString);
    expect(savedJson.rows[0][4].val).toBe(10);

    // Reset overrides
    InGameEditor.resetLevelOverrides(app, 'standard', 0);
    expect(localStorage.getItem(storageKey)).toBeNull();
  });

  it('should calculate plane-locked coordinates snap when shift key is held', () => {
    editor.activate();

    // Setup plane lock height at Y=3
    editor.activePlaneHeight = 3;
    editor.keyboardState.shift = true;

    // Simulate look vector looking slightly down at plane Y=3
    editor.graphics.camera.position.set(0, 5, 0);
    editor.graphics.camera.lookAt(0, 3, -4); // pointing down to Y=3 at Z=-4

    // Call raycasting update
    editor.updateRaycasting();

    // The snap height must be locked to activePlaneHeight (3)
    expect(editor.hoverCoord).toBeDefined();
    expect(editor.hoverCoord.height).toBe(3);
  });

  it('should manage click drag gestures correctly', () => {
    editor.activate();

    // Mock mouse click and hover coord
    editor.pointerLocked = true;
    editor.mouseState.left = true;
    editor.hoverCoord = { lane: 2, row: 0, height: 0 };

    // Trigger paint
    editor.triggerPaintAtHover();

    // Check painted block
    expect(editor.levelDraft.rows[0][2]).toEqual({ type: 'road', colorIdx: 11 });

    // Move to another cell during drag
    editor.hoverCoord = { lane: 3, row: 0, height: 0 };
    editor.triggerPaintAtHover();

    // Check second cell is also painted
    expect(editor.levelDraft.rows[0][3]).toEqual({ type: 'road', colorIdx: 11 });

    // Try painting the same cell again, should not create multiple command entries
    const historyCount = editor.history.length;
    editor.triggerPaintAtHover();
    expect(editor.history.length).toBe(historyCount);
  });

  it('should default ramp start/end Y to 0.0 and 1.0 when shift is not held, and lock to activePlaneHeight when shift is held', () => {
    editor.activate();
    editor.mouseState.left = true;

    // 1. Paint ramp with shift NOT held, hover coord height is 3 (e.g. clicked top face of high block)
    editor.keyboardState.shift = false;
    editor.activeBrush = 'ramp';
    editor.hoverCoord = { lane: 3, row: 0, height: 3 };
    editor.triggerPaintAtHover();

    // The painted ramp should start at Y=0.0, end at Y=1.0 (defaults when shift is not held)
    expect(editor.levelDraft.rows[0][3].type).toBe('ramp');
    expect(editor.levelDraft.rows[0][3].ramp.startY).toBe(0.0);
    expect(editor.levelDraft.rows[0][3].ramp.endY).toBe(1.0);

    // 2. Paint ramp with shift held, locked to activePlaneHeight = 2
    editor.activePlaneHeight = 2;
    editor.keyboardState.shift = true;
    editor.hoverCoord = { lane: 4, row: 0, height: 2 };
    editor.lastPaintedCoord = null; // reset drag tracking
    editor.triggerPaintAtHover();

    // The painted ramp should start at Y=2.0, end at Y=3.0 (aligned with activePlaneHeight)
    expect(editor.levelDraft.rows[0][4].type).toBe('ramp');
    expect(editor.levelDraft.rows[0][4].ramp.startY).toBe(2.0);
    expect(editor.levelDraft.rows[0][4].ramp.endY).toBe(3.0);
  });

  it('should support Select & Edit tool to select a block and update its properties through form inputs', () => {
    editor.activate();

    // 1. Paint a standard road block at Lane 3, Row 0, Height 0
    editor.activeTool = 'paint';
    editor.activeBrush = 'road';
    editor.activeColorIdx = 1;
    editor.hoverCoord = { lane: 3, row: 0, height: 0 };
    editor.mouseState.left = true;
    editor.triggerPaintAtHover();
    expect(editor.levelDraft.rows[0][3]).toEqual({ type: 'road', colorIdx: 1 });

    // 2. Select the block using selectBlock
    editor.selectBlock(3, 0, 0);
    expect(editor.selectedCoord).toEqual({ lane: 3, row: 0, height: 0 });

    // Verify DOM inputs were populated
    const typeSel = document.getElementById('edit-block-type');
    const colorSel = document.getElementById('edit-block-color');
    expect(typeSel.value).toBe('road');
    expect(colorSel.value).toBe('1');

    // 3. Switch tool to select
    editor.activeTool = 'select';

    // 4. Change inputs and trigger updateSelectedBlockFromInputs
    typeSel.value = 'ramp';
    colorSel.value = '11';
    
    // Set ramp fields values
    const startY = document.getElementById('edit-block-starty');
    const endY = document.getElementById('edit-block-endy');
    const direction = document.getElementById('edit-block-direction');
    startY.value = '0';
    endY.value = '2';
    direction.value = 'forward';

    editor.updateSelectedBlockFromInputs();

    // Assert that the block has been modified in levelDraft
    expect(editor.levelDraft.rows[0][3].type).toBe('ramp');
    expect(editor.levelDraft.rows[0][3].colorIdx).toBe(11);
    expect(editor.levelDraft.rows[0][3].ramp.startY).toBe(0);
    expect(editor.levelDraft.rows[0][3].ramp.endY).toBe(2);
  });

  it('should toggle playtest mode and cleanup states when startPlaytest is called while already playtesting', async () => {
    editor.activate();
    
    // Simulate we are in playtest mode
    app.gameState = 'playing';
    
    // Set some dirty states
    app.physics.isDead = true;
    app.physics.isTransitioning = true;
    app.stateHistory = [{ pos: 1 }];
    app.playtestEscHandler = vi.fn();
    
    // Call startPlaytest() while already playtesting
    await editor.startPlaytest();
    
    // It should have called exitPlaytest() internally, returning to editor
    expect(app.gameState).toBe('editor');
    expect(app.physics.isDead).toBe(false);
    expect(app.physics.isTransitioning).toBe(false);
    expect(app.stateHistory.length).toBe(0);
    expect(app.showScreen).toHaveBeenCalledWith('');
    expect(app.playtestEscHandler).toBeNull();
  });

  it('should toggle playtest mode and cleanup states when activate is called while playtesting', () => {
    editor.activate();
    
    // Simulate we are playtesting
    app.gameState = 'playing';
    
    // Call activate() again
    editor.activate();
    
    // It should call exitPlaytest() internally
    expect(app.gameState).toBe('editor');
    expect(app.physics.isDead).toBe(false);
    expect(app.showScreen).toHaveBeenCalledWith('');
  });
});
