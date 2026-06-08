// tests/editorCommands.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStateManager } from '../editorState.js';
import {
  PaintCellCommand,
  PaintCellsBatchCommand,
  UpdateMetadataCommand,
  UpdatePhysicsCommand,
  ConfigureMaterialCommand,
  DrawRampCommand
} from '../editorCommands.js';

describe('Editor Command Pattern Unit Tests', () => {
  let state;

  beforeEach(() => {
    state = new EditorStateManager();
  });

  it('should execute and undo PaintCellCommand', () => {
    const cmd = new PaintCellCommand(3, 5, { type: 'road', colorIdx: 11 });
    
    // Execute
    state.executeCommand(cmd);
    expect(state.level.rows[5][3]).toEqual({ type: 'road', colorIdx: 11 });
    expect(state.history).toHaveLength(1);
    expect(cmd.toString()).toContain('Painted ROAD at Lane 4, Row 5');

    // Undo
    const success = state.undo();
    expect(success).toBe(true);
    expect(state.level.rows[5][3]).toBeNull();
    expect(state.history).toHaveLength(0);
    expect(state.redoStack).toHaveLength(1);

    // Redo
    const redoSuccess = state.redo();
    expect(redoSuccess).toBe(true);
    expect(state.level.rows[5][3]).toEqual({ type: 'road', colorIdx: 11 });
    expect(state.history).toHaveLength(1);
    expect(state.redoStack).toHaveLength(0);
  });

  it('should execute and undo PaintCellsBatchCommand', () => {
    const list = [
      { lane: 0, row: 2, cellProps: { type: 'obstacle-full', colorIdx: 13 } },
      { lane: 1, row: 2, cellProps: { type: 'obstacle-half', colorIdx: 13 } }
    ];
    const cmd = new PaintCellsBatchCommand(list, 'Batch Obstacle Drawing');

    state.executeCommand(cmd);
    expect(state.level.rows[2][0]).toEqual({ type: 'obstacle-full', colorIdx: 13 });
    expect(state.level.rows[2][1]).toEqual({ type: 'obstacle-half', colorIdx: 13 });
    expect(cmd.toString()).toBe('Batch Obstacle Drawing');

    state.undo();
    expect(state.level.rows[2][0]).toBeNull();
    expect(state.level.rows[2][1]).toBeNull();
  });

  it('should execute and undo UpdateMetadataCommand', () => {
    const cmd = new UpdateMetadataCommand('Sector X', 'Andross', 120, 4);

    state.executeCommand(cmd);
    expect(state.level.name).toBe('Sector X');
    expect(state.level.author).toBe('Andross');
    expect(state.level.parTime).toBe(120);
    expect(state.level.biome).toBe(4);
    expect(cmd.toString()).toContain('Sector X');

    state.undo();
    expect(state.level.name).toBe('Custom Road');
    expect(state.level.author).toBe('Designer');
  });

  it('should execute and undo UpdatePhysicsCommand', () => {
    const cmd = new UpdatePhysicsCommand(18, 90, 200);

    state.executeCommand(cmd);
    expect(state.level.physics.gravity).toBe(18);
    expect(state.level.physics.oxygen).toBe(90);
    expect(state.level.physics.fuel).toBe(200);

    state.undo();
    expect(state.level.physics.gravity).toBe(8);
    expect(state.level.physics.oxygen).toBe(60);
    expect(state.level.physics.fuel).toBe(130);
  });

  it('should execute and undo ConfigureMaterialCommand', () => {
    const newProps = {
      name: 'Glowing Neon Blue',
      textureType: 'seamless-cyan',
      color: '#00ffff',
      roughness: 0.2,
      metalness: 0.8,
      emissive: 1.5,
      repeat: 2.0
    };
    const cmd = new ConfigureMaterialCommand('mat-1', newProps);

    state.executeCommand(cmd);
    expect(state.level.materials['mat-1']).toEqual(newProps);
    expect(cmd.toString()).toContain('Glowing Neon Blue');

    state.undo();
    expect(state.level.materials['mat-1'].color).toBe('#00ffff');
    expect(state.level.materials['mat-1'].roughness).toBe(0.4); // default restored
  });

  it('should execute and undo DrawRampCommand', () => {
    const list = [
      { lane: 3, row: 10, cellProps: { type: 'ramp', ramp: { startY: 0, endY: 1 } } }
    ];
    const cmd = new DrawRampCommand(list, { lane: 3, row: 10, height: 0 }, { lane: 3, row: 10, height: 1 });

    state.executeCommand(cmd);
    expect(state.level.rows[10][3].type).toBe('ramp');
    expect(cmd.toString()).toContain('Plotted Ramp: Lane 4, Row 10 to Row 10');

    state.undo();
    expect(state.level.rows[10][3]).toBeNull();
  });

  it('should jump to arbitrary history indices correctly', () => {
    const c1 = new UpdateMetadataCommand('Step 1', 'D1', 10, 0);
    const c2 = new UpdatePhysicsCommand(10, 20, 30);
    const c3 = new PaintCellCommand(3, 5, { type: 'road', colorIdx: 1 });

    state.executeCommand(c1); // idx 1
    state.executeCommand(c2); // idx 2
    state.executeCommand(c3); // idx 3

    expect(state.history).toHaveLength(3);
    expect(state.level.rows[5][3]).not.toBeNull();
    expect(state.level.physics.gravity).toBe(10);
    expect(state.level.name).toBe('Step 1');

    // Jump to index 1 (UpdateMetadata executed, others undone)
    state.jumpToHistoryIndex(1);
    expect(state.history).toHaveLength(1);
    expect(state.redoStack).toHaveLength(2);
    expect(state.level.name).toBe('Step 1');
    expect(state.level.physics.gravity).toBe(8); // restored
    expect(state.level.rows[5][3]).toBeNull(); // restored

    // Jump to index 3 (all executed again)
    state.jumpToHistoryIndex(3);
    expect(state.history).toHaveLength(3);
    expect(state.redoStack).toHaveLength(0);
    expect(state.level.rows[5][3]).toEqual({ type: 'road', colorIdx: 1 });
    expect(state.level.physics.gravity).toBe(10);

    // Jump to index 0 (initial blank level)
    state.jumpToHistoryIndex(0);
    expect(state.history).toHaveLength(0);
    expect(state.redoStack).toHaveLength(3);
    expect(state.level.name).toBe('Custom Road');
  });
});
