// tests/editorCommands.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStateManager } from '../editorState.js';
import {
  PaintCellCommand,
  PaintCellsBatchCommand,
  UpdateMetadataCommand,
  UpdatePhysicsCommand,
  ConfigureMaterialCommand,
  DrawRampCommand,
  EditSpansCommand
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

  // ── P4.3 EditSpansCommand tests ───────────────────────────────────────────

  it('P4.3: EditSpansCommand execute sets type:spans and drops legacy fields', () => {
    // Seed a legacy ramp cell
    state.executeCommand(new PaintCellCommand(2, 3, {
      type: 'ramp', colorIdx: 5, ramp: { direction: 'forward', startY: 0, endY: 2 }
    }));
    const legacyCell = state.level.rows[3][2];
    expect(legacyCell.type).toBe('ramp');

    const spans = [
      { floorY: -0.1, topEntryY: 0, topExitY: 0 },
      { floorY: 3.0, topEntryY: 3.2, topExitY: 3.2 }
    ];
    state.executeCommand(new EditSpansCommand(2, 3, spans));

    const cell = state.level.rows[3][2];
    expect(cell.type).toBe('spans');
    expect(Array.isArray(cell.spans)).toBe(true);
    expect(cell.spans).toHaveLength(2);
    expect(cell.spans[0].floorY).toBe(-0.1);
    // Legacy fields must be gone
    expect(cell.ramp).toBeUndefined();
    expect(cell.colorIdx).toBeUndefined();
  });

  it('P4.3: EditSpansCommand undo restores prior legacy ramp cell exactly', () => {
    const legacyRamp = { type: 'ramp', colorIdx: 5, ramp: { direction: 'forward', startY: 0, endY: 2 } };
    state.executeCommand(new PaintCellCommand(2, 3, legacyRamp));

    const spans = [{ floorY: -0.1, topEntryY: 0, topExitY: 0 }];
    state.executeCommand(new EditSpansCommand(2, 3, spans));
    expect(state.level.rows[3][2].type).toBe('spans');

    state.undo();
    const restored = state.level.rows[3][2];
    expect(restored.type).toBe('ramp');
    expect(restored.colorIdx).toBe(5);
    expect(restored.ramp.endY).toBe(2);
  });

  it('P4.3: EditSpansCommand undo restores null when prior cell was null', () => {
    // Lane 4, row 7 starts null
    expect(state.level.rows[7][4]).toBeNull();

    const spans = [{ floorY: -0.1, topEntryY: 0, topExitY: 0 }];
    state.executeCommand(new EditSpansCommand(4, 7, spans));
    expect(state.level.rows[7][4].type).toBe('spans');

    state.undo();
    expect(state.level.rows[7][4]).toBeNull();
  });

  it('P4.3: adding a span at activePlaneHeight=3 yields 2 spans, ground span unchanged', () => {
    // Start with a ground span
    const groundSpans = [{ floorY: -0.1, topEntryY: 0, topExitY: 0 }];
    state.executeCommand(new EditSpansCommand(1, 5, groundSpans));
    state.ui.activePlaneHeight = 3;

    // Simulate what the Add Span button does
    const cell = state.level.rows[5][1];
    const h = state.ui.activePlaneHeight * 1.0;
    const newSpan = { floorY: h, topEntryY: h + 0.2, topExitY: h + 0.2 };
    const newSpans = [...cell.spans, newSpan];
    state.executeCommand(new EditSpansCommand(1, 5, newSpans));

    const result = state.level.rows[5][1];
    expect(result.spans).toHaveLength(2);
    // Ground span unchanged
    expect(result.spans[0].floorY).toBe(-0.1);
    expect(result.spans[0].topEntryY).toBe(0);
    // New upper span at height 3
    expect(result.spans[1].floorY).toBeCloseTo(3);
    expect(result.spans[1].topEntryY).toBeCloseTo(3.2);
  });

  it('P4.3: cook → deserialize round-trip preserves EditSpansCommand spans', () => {
    const spans = [
      { floorY: -0.1, topEntryY: 0, topExitY: 0 },
      { floorY: 3.0, topEntryY: 3.2, topExitY: 3.2 }
    ];
    state.executeCommand(new EditSpansCommand(3, 2, spans));

    const cooked = state.cook();
    const reloaded = new EditorStateManager();
    expect(reloaded.deserialize(JSON.stringify(cooked))).toBe(true);

    const cell = reloaded.level.rows[2][3];
    expect(cell.type).toBe('spans');
    expect(cell.spans).toHaveLength(2);
    expect(cell.spans[0].floorY).toBe(-0.1);
    expect(cell.spans[1].floorY).toBe(3.0);
    expect(cell.spans[1].topEntryY).toBe(3.2);
  });

  it('P4.3: toString reports lane+1, row, and span count', () => {
    const cmd = new EditSpansCommand(2, 5, [
      { floorY: -0.1, topEntryY: 0, topExitY: 0 },
      { floorY: 3.0, topEntryY: 3.2, topExitY: 3.2 }
    ]);
    expect(cmd.toString()).toBe('Edited spans at Lane 3, Row 5 (2 spans)');
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
