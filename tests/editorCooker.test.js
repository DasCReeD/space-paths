// tests/editorCooker.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorStateManager } from '../editorState.js';
import { PaintCellCommand, UpdateMetadataCommand, UpdatePhysicsCommand } from '../editorCommands.js';
import { registerCustomPack, LEVEL_PACKS } from '../levels.js';

describe('Editor Cooker Unit Tests (Sprint 4)', () => {
  let state;

  beforeEach(() => {
    state = new EditorStateManager();
  });

  it('should cook global level settings and metadata correctly', () => {
    state.executeCommand(new UpdateMetadataCommand('Test Cook Road', 'Antigravity', 75, 0));
    state.executeCommand(new UpdatePhysicsCommand(10, 80, 180));

    const cooked = state.cook();

    expect(cooked.name).toBe('Test Cook Road');
    expect(cooked.author).toBe('Antigravity');
    expect(cooked.parTime).toBe(75);
    expect(cooked.biome).toBe(0);
    expect(cooked.gravity).toBe(10);
    expect(cooked.oxygen).toBe(80);
    expect(cooked.fuel).toBe(180);
    expect(cooked.level_index).toBe(99);
    expect(cooked.palette).toBeDefined();
    expect(cooked.palette).toHaveLength(16);
  });

  it('should cook different grid cells with correct properties', () => {
    // 1. Flat Road Boost cell (green / Color 11)
    state.executeCommand(new PaintCellCommand(3, 2, { type: 'road', colorIdx: 11 }));

    // 2. Full Obstacle (orange / Color 13)
    state.executeCommand(new PaintCellCommand(4, 5, { type: 'obstacle-full', colorIdx: 13 }));

    // 3. Half Obstacle (yellow / Color 10)
    state.executeCommand(new PaintCellCommand(1, 7, { type: 'obstacle-half', colorIdx: 10 }));

    // 4. Tunnel cell (blue / Color 9)
    state.executeCommand(new PaintCellCommand(2, 9, { type: 'tunnel', colorIdx: 9 }));

    // 5. Ramp cell (cyan / Color 12)
    state.executeCommand(new PaintCellCommand(5, 12, {
      type: 'ramp',
      colorIdx: 12,
      ramp: { direction: 'forward', startY: 0.5, endY: 1.5 }
    }));

    const cooked = state.cook();

    // Verify Flat Road Boost cell
    const cellRoad = cooked.rows[2][3];
    expect(cellRoad.val).toBe(11);
    expect(cellRoad.full).toBe(false);
    expect(cellRoad.half).toBe(false);
    expect(cellRoad.tunnel).toBe(false);
    expect(cellRoad.bottom_color).toBe(11);
    expect(cellRoad.top_color).toBe(0);

    // Verify Full Obstacle
    const cellFull = cooked.rows[5][4];
    expect(cellFull.val).toBe(13);
    expect(cellFull.full).toBe(true);
    expect(cellFull.half).toBe(false);
    expect(cellFull.top_color).toBe(13);
    expect(cellFull.bottom_color).toBe(0);

    // Verify Half Obstacle
    const cellHalf = cooked.rows[7][1];
    expect(cellHalf.val).toBe(10);
    expect(cellHalf.full).toBe(false);
    expect(cellHalf.half).toBe(true);
    expect(cellHalf.top_color).toBe(10);
    expect(cellHalf.bottom_color).toBe(0);

    // Verify Tunnel
    const cellTunnel = cooked.rows[9][2];
    expect(cellTunnel.val).toBe(9);
    expect(cellTunnel.full).toBe(false);
    expect(cellTunnel.half).toBe(false);
    expect(cellTunnel.tunnel).toBe(true);

    // Verify Ramp
    const cellRamp = cooked.rows[12][5];
    expect(cellRamp.ramp).toBe(true);
    expect(cellRamp.startY).toBe(0.5);
    expect(cellRamp.endY).toBe(1.5);
    expect(cellRamp.direction).toBe('forward');
    expect(cellRamp.top_color).toBe(12);
    expect(cellRamp.bottom_color).toBe(0);
  });

  it('should register custom levels dynamically in levels pack cache', () => {
    state.executeCommand(new UpdateMetadataCommand('Dynamic Custom Road', 'Tester', 50, 0));
    const cooked = state.cook();

    const customPack = [cooked];
    registerCustomPack(customPack);

    expect(LEVEL_PACKS['custom']).toBeDefined();
    expect(LEVEL_PACKS['custom']).toEqual(customPack);
  });
});
