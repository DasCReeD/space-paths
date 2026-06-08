// tests/editorState.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStateManager } from '../editorState.js';
import {
  PaintCellCommand,
  PaintCellsBatchCommand,
  UpdateMetadataCommand,
  UpdatePhysicsCommand,
  ConfigureMaterialCommand,
  ResizeGridCommand
} from '../editorCommands.js';

describe('Editor State Manager Unit Tests', () => {
  let state;

  beforeEach(() => {
    state = new EditorStateManager();
  });

  it('should initialize with a default empty level draft', () => {
    expect(state.level.name).toBe('Custom Road');
    expect(state.level.author).toBe('Designer');
    expect(state.level.parTime).toBe(45);
    expect(state.level.biome).toBe(0);
    expect(state.level.rows).toHaveLength(30);
    expect(state.level.rows[0]).toHaveLength(7);
    expect(state.level.rows[0][0]).toBeNull();
  });

  it('should immutably update global metadata', () => {
    state.executeCommand(new UpdateMetadataCommand('Neon Genesis', 'Shinji', 90, 1));
    
    // Check level values updated
    expect(state.level.name).toBe('Neon Genesis');
    expect(state.level.author).toBe('Shinji');
    expect(state.level.parTime).toBe(90);
    expect(state.level.biome).toBe(1);

    // Verify history stack contains old level state
    expect(state.history).toHaveLength(1);
  });

  it('should immutably update physics overrides', () => {
    state.executeCommand(new UpdatePhysicsCommand(12, 100, 250));
    
    expect(state.level.physics.gravity).toBe(12);
    expect(state.level.physics.oxygen).toBe(100);
    expect(state.level.physics.fuel).toBe(250);

    expect(state.history).toHaveLength(1);
  });

  it('should immutably update cells on the grid', () => {
    // Paint lane 3, row 5 with a flat road boost tile
    state.executeCommand(new PaintCellCommand(3, 5, { type: 'road', colorIdx: 11 }));

    expect(state.level.rows[5][3]).toEqual({
      type: 'road',
      colorIdx: 11
    });

    // Other lanes and rows must remain null/unchanged
    expect(state.level.rows[5][2]).toBeNull();
    expect(state.level.rows[4][3]).toBeNull();

    // Verify immutability
    expect(state.history).toHaveLength(1);
  });

  it('should batch update multiple cells immutably', () => {
    const batch = [
      { lane: 1, row: 10, cellProps: { type: 'obstacle-full', colorIdx: 4 } },
      { lane: 2, row: 10, cellProps: { type: 'obstacle-half', colorIdx: 4 } },
      { lane: 3, row: 10, cellProps: null } // delete/void
    ];

    state.executeCommand(new PaintCellsBatchCommand(batch));

    expect(state.level.rows[10][1]).toEqual({ type: 'obstacle-full', colorIdx: 4 });
    expect(state.level.rows[10][2]).toEqual({ type: 'obstacle-half', colorIdx: 4 });
    expect(state.level.rows[10][3]).toBeNull();

    expect(state.history).toHaveLength(1);
  });

  it('should manage custom material settings immutably', () => {
    state.executeCommand(new ConfigureMaterialCommand('mat-1', {
      color: '#ff00ff',
      roughness: 0.1,
      metalness: 0.95
    }));

    expect(state.level.materials['mat-1'].color).toBe('#ff00ff');
    expect(state.level.materials['mat-1'].roughness).toBe(0.1);
    expect(state.level.materials['mat-1'].metalness).toBe(0.95);
    
    // Check old values preserved in history
    expect(state.history).toHaveLength(1);
  });

  it('should handle undo and redo stack transitions correctly', () => {
    // Initial: History 0, Redo 0
    state.executeCommand(new UpdateMetadataCommand('T1', 'A1', 10, 0)); // Action 1 -> History 1, Redo 0
    state.executeCommand(new UpdatePhysicsCommand(15, 50, 100));       // Action 2 -> History 2, Redo 0
    
    expect(state.level.physics.gravity).toBe(15);
    expect(state.level.name).toBe('T1');

    // Undo 1
    let success = state.undo();
    expect(success).toBe(true);
    expect(state.level.physics.gravity).toBe(8); // restored default
    expect(state.level.name).toBe('T1');
    expect(state.history).toHaveLength(1);
    expect(state.redoStack).toHaveLength(1);

    // Undo 2
    success = state.undo();
    expect(success).toBe(true);
    expect(state.level.name).toBe('Custom Road'); // restored original
    expect(state.history).toHaveLength(0);
    expect(state.redoStack).toHaveLength(2);

    // Redo 1
    success = state.redo();
    expect(success).toBe(true);
    expect(state.level.name).toBe('T1');
    expect(state.history).toHaveLength(1);
    expect(state.redoStack).toHaveLength(1);
  });

  it('should serialize and deserialize projects correctly', () => {
    state.executeCommand(new UpdateMetadataCommand('Serialize Test', 'Unit', 123, 2));
    state.executeCommand(new PaintCellCommand(0, 0, { type: 'tunnel', colorIdx: 12 }));
    
    const serialized = state.serialize();
    const loadedState = new EditorStateManager();
    
    const success = loadedState.deserialize(serialized);
    expect(success).toBe(true);
    expect(loadedState.level.name).toBe('Serialize Test');
    expect(loadedState.level.author).toBe('Unit');
    expect(loadedState.level.parTime).toBe(123);
    expect(loadedState.level.rows[0][0]).toEqual({ type: 'tunnel', colorIdx: 12 });
  });

  it('should cook drafts into game-ready native format', () => {
    state.executeCommand(new UpdateMetadataCommand('Cook Test', 'Cooker', 60, 0));
    
    // Add Flat Road with boost color (Color 11)
    state.executeCommand(new PaintCellCommand(3, 4, { type: 'road', colorIdx: 11 }));
    // Add Full Obstacle (Color 13)
    state.executeCommand(new PaintCellCommand(2, 6, { type: 'obstacle-full', colorIdx: 13 }));
    // Add Ramp
    state.executeCommand(new PaintCellCommand(1, 8, {
      type: 'ramp',
      colorIdx: 1,
      ramp: { direction: 'forward', startY: 0, endY: 2 }
    }));

    const cooked = state.cook();

    // Verify global structure
    expect(cooked.name).toBe('Cook Test');
    expect(cooked.author).toBe('Cooker');
    expect(cooked.parTime).toBe(60);
    expect(cooked.gravity).toBe(8);
    expect(cooked.palette).toHaveLength(16);

    // Verify cell conversion to game layout
    const cookedBoost = cooked.rows[4][3];
    expect(cookedBoost.val).toBe(11);
    expect(cookedBoost.full).toBe(false);
    expect(cookedBoost.half).toBe(false);
    expect(cookedBoost.tunnel).toBe(false);
    expect(cookedBoost.bottom_color).toBe(11);
    expect(cookedBoost.top_color).toBe(0);

    const cookedObstacle = cooked.rows[6][2];
    expect(cookedObstacle.val).toBe(13);
    expect(cookedObstacle.full).toBe(true);
    expect(cookedObstacle.half).toBe(false);
    expect(cookedObstacle.top_color).toBe(13);
    expect(cookedObstacle.bottom_color).toBe(0);

    const cookedRamp = cooked.rows[8][1];
    expect(cookedRamp.ramp).toBe(true);
    expect(cookedRamp.startY).toBe(0);
    expect(cookedRamp.endY).toBe(2);
    expect(cookedRamp.direction).toBe('forward');
  });

  it('should deserialize game-cooked level data correctly, translating attributes', () => {
    const gameCookedJson = JSON.stringify({
      level_index: 5,
      gravity: 10,
      fuel: 140,
      oxygen: 80,
      rows: [
        [
          null,
          { val: 11, full: false, half: false, tunnel: false }, // road with color 11 (boost)
          { val: 3, full: false, half: false, tunnel: false, top_color: 0, bottom_color: 3, low3: 3 }, // road color 3
          { val: 1, full: true, half: false, tunnel: false },   // full obstacle color 1
          { val: 4, full: false, half: true, tunnel: false },   // half obstacle color 4
          { val: 6, full: false, half: false, tunnel: true },   // tunnel color 6
          { val: 1, ramp: true, startY: 0.0, endY: 1.5, direction: 'forward' } // ramp
        ]
      ]
    });

    const success = state.deserialize(gameCookedJson);
    expect(success).toBe(true);
    expect(state.level.name).toBe('Level 5');
    expect(state.level.physics.gravity).toBe(10);
    expect(state.level.physics.fuel).toBe(140);
    expect(state.level.physics.oxygen).toBe(80);

    const firstRow = state.level.rows[0];
    expect(firstRow[0]).toBeNull();
    expect(firstRow[1]).toEqual({ type: 'road', colorIdx: 11 });
    expect(firstRow[2]).toEqual({ type: 'road', colorIdx: 3 });
    expect(firstRow[3]).toEqual({ type: 'obstacle-full', colorIdx: 1 });
    expect(firstRow[4]).toEqual({ type: 'obstacle-half', colorIdx: 4 });
    expect(firstRow[5]).toEqual({ type: 'tunnel', colorIdx: 6 });
    expect(firstRow[6]).toEqual({
      type: 'ramp',
      colorIdx: 1,
      ramp: { direction: 'forward', startY: 0.0, endY: 1.5 }
    });
  });

  it('should trigger window.__editorDebug callbacks during deserialization', () => {
    let called = null;
    window.__editorDebug = {
      trigger(event, data) {
        if (event === 'deserialization') {
          called = data;
        }
      }
    };

    try {
      const gameCookedJson = JSON.stringify({
        level_index: 5,
        gravity: 10,
        fuel: 140,
        oxygen: 80,
        rows: []
      });

      // Successful deserialize
      state.deserialize(gameCookedJson);
      expect(called).toEqual({ status: 'success', name: 'Level 5', rows: 0 });

      // Failed deserialize
      called = null;
      state.deserialize('invalid-json');
      expect(called.status).toBe('error');
      expect(called.error).toBeDefined();
    } finally {
      delete window.__editorDebug;
    }
  });

  it('should resize the grid using ResizeGridCommand and support undo/redo', () => {
    expect(state.level.rows).toHaveLength(30);

    // Resize to 50 rows
    state.executeCommand(new ResizeGridCommand(50));
    expect(state.level.rows).toHaveLength(50);

    // Undo should restore 30 rows
    state.undo();
    expect(state.level.rows).toHaveLength(30);

    // Redo should restore 50 rows
    state.redo();
    expect(state.level.rows).toHaveLength(50);
  });
});
