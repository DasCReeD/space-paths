// tests/editorTools.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStateManager } from '../editorState.js';
import { PaintCellCommand } from '../editorCommands.js';

// Bresenham's line algorithm helper (matching implementation in editor.js)
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

describe('Editor Tools Unit Tests (Sprint 3)', () => {
  let state;

  beforeEach(() => {
    state = new EditorStateManager();
  });

  it('should interpolate Bresenham points correctly for vector lines', () => {
    // Horizontal line
    const horizontal = getBresenhamPoints(1, 5, 4, 5);
    expect(horizontal).toEqual([
      { lane: 1, row: 5 },
      { lane: 2, row: 5 },
      { lane: 3, row: 5 },
      { lane: 4, row: 5 }
    ]);

    // Vertical line
    const vertical = getBresenhamPoints(3, 10, 3, 13);
    expect(vertical).toEqual([
      { lane: 3, row: 10 },
      { lane: 3, row: 11 },
      { lane: 3, row: 12 },
      { lane: 3, row: 13 }
    ]);

    // Diagonal line
    const diagonal = getBresenhamPoints(0, 0, 2, 2);
    expect(diagonal).toEqual([
      { lane: 0, row: 0 },
      { lane: 1, row: 1 },
      { lane: 2, row: 2 }
    ]);
  });

  it('should copy selected cells to clipboard with offsets', () => {
    // Set up some painted blocks
    state.executeCommand(new PaintCellCommand(1, 10, { type: 'road', colorIdx: 11 }));
    state.executeCommand(new PaintCellCommand(2, 11, { type: 'obstacle-full', colorIdx: 13 }));

    // Select them
    state.ui.selectedCells = [
      { lane: 1, row: 10 },
      { lane: 2, row: 11 }
    ];

    const success = state.copySelection();
    expect(success).toBe(true);
    expect(state.clipboard).toHaveLength(2);

    // Reference origin: minLane=1, minRow=10
    expect(state.clipboard[0]).toEqual({
      dx: 0,
      dr: 0,
      type: 'road',
      colorIdx: 11,
      materialId: null,
      decals: null,
      decalText: null
    });
    expect(state.clipboard[1]).toEqual({
      dx: 1,
      dr: 1,
      type: 'obstacle-full',
      colorIdx: 13,
      materialId: null,
      decals: null,
      decalText: null
    });
  });

  it('should paste clipboard elements at target offset correctly', () => {
    // 1. Copy active selection
    state.executeCommand(new PaintCellCommand(1, 10, { type: 'road', colorIdx: 11 }));
    state.ui.selectedCells = [{ lane: 1, row: 10 }];
    state.copySelection();

    // 2. Paste at new target coordinate
    const pasteSuccess = state.pasteClipboard(3, 20);
    expect(pasteSuccess).toBe(true);

    // Check target painted
    expect(state.level.rows[20][3]).toEqual({
      type: 'road',
      colorIdx: 11,
      materialId: null,
      decals: null,
      decalText: null
    });

    // Check active selection updated to pasted cell
    expect(state.ui.selectedCells).toEqual([{ lane: 3, row: 20 }]);
  });

  it('should duplicate selected cells offset by 1 row forward', () => {
    state.executeCommand(new PaintCellCommand(2, 5, { type: 'road', colorIdx: 12 }));
    state.ui.selectedCells = [{ lane: 2, row: 5 }];

    const dupSuccess = state.duplicateSelection();
    expect(dupSuccess).toBe(true);

    // Check target (2, 6) painted
    expect(state.level.rows[6][2]).toEqual({
      type: 'road',
      colorIdx: 12,
      materialId: null,
      decals: null,
      decalText: null
    });

    // Selection should be updated to duplicate
    expect(state.ui.selectedCells).toEqual([{ lane: 2, row: 6 }]);
  });

  it('should nudge selected cells and block out-of-bounds nudges', () => {
    state.executeCommand(new PaintCellCommand(5, 10, { type: 'road', colorIdx: 11 }));
    state.ui.selectedCells = [{ lane: 5, row: 10 }];

    // Nudge right (towards lane 6)
    let nudgeSuccess = state.nudgeSelection(1, 0);
    expect(nudgeSuccess).toBe(true);
    expect(state.level.rows[10][5]).toBeNull();
    expect(state.level.rows[10][6]).toEqual({
      type: 'road',
      colorIdx: 11
    });
    expect(state.ui.selectedCells).toEqual([{ lane: 6, row: 10 }]);

    // Try to nudge right again (lane 7 is out of bounds)
    nudgeSuccess = state.nudgeSelection(1, 0);
    expect(nudgeSuccess).toBe(false); // blocked
    expect(state.level.rows[10][6]).toEqual({
      type: 'road',
      colorIdx: 11
    });
    expect(state.ui.selectedCells).toEqual([{ lane: 6, row: 10 }]); // unchanged
  });
});
