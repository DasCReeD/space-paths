// tests/worldBuilderSolver.test.js
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { solveLevel } from '../worldBuilder.js';

const PALETTE = Array.from({ length: 32 }, () => [128, 128, 128]);

// Flat road tile at height 0.
const road = () => ({ val: 0, full: false, half: false, tunnel: false, top_color: 0, bottom_color: 1, low3: 1 });
const roadRow = () => Array.from({ length: 7 }, road);

// A cell carrying an explicit multi-span deck. `top` = drivable deck height.
const deckCell = (top, { floorY = -0.1, isWallObstacle = false } = {}) => ({
  spans: [{ floorY, topEntryY: top, topExitY: top, isWallObstacle, top_color: 0, bottom_color: 1 }],
});
const deckRow = (top, opts) => Array.from({ length: 7 }, () => deckCell(top, opts));

const baseLevel = (rows) => ({
  gravity: 1.6, fuel: 1000, oxygen: 1000, fuelConsumptionRate: 25.0,
  palette: PALETTE, rows,
});

describe('worldBuilder solveLevel — parity', () => {
  it('all 31 baked generated levels still solve (read-only)', () => {
    const jsonPath = path.resolve('data/generated_levels.json');
    const levels = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const results = levels.map((lvl) => solveLevel(lvl));
    const passing = results.filter(Boolean).length;
    expect(passing).toBe(levels.length);
    expect(passing).toBe(31);
  });
});

describe('worldBuilder solveLevel — single-span legacy', () => {
  it('flat road with a passable ramp solves', () => {
    const rows = [];
    for (let i = 0; i < 6; i++) rows.push(roadRow());
    // ramp up 0 -> 1 across one row, then flat deck-height road via ramp back down
    rows.push(Array.from({ length: 7 }, () => ({ val: 0, ramp: true, startY: 0, endY: 1, top_color: 1, bottom_color: 1, low3: 1 })));
    rows.push(Array.from({ length: 7 }, () => ({ val: 0, ramp: true, startY: 1, endY: 0, top_color: 1, bottom_color: 1, low3: 1 })));
    for (let i = 0; i < 6; i++) rows.push(roadRow());
    expect(solveLevel(baseLevel(rows))).toBe(true);
  });
});

describe('worldBuilder solveLevel — multi-span', () => {
  it('drive-over: route requires standing on a raised span deck', () => {
    const rows = [];
    for (let i = 0; i < 4; i++) rows.push(roadRow());
    // ramp up onto deck height 1.0
    rows.push(Array.from({ length: 7 }, () => ({ val: 0, ramp: true, startY: 0, endY: 1, top_color: 1, bottom_color: 1, low3: 1 })));
    // drive across explicit multi-span decks at height 1.0
    for (let i = 0; i < 4; i++) rows.push(deckRow(1.0));
    // ramp back down
    rows.push(Array.from({ length: 7 }, () => ({ val: 0, ramp: true, startY: 1, endY: 0, top_color: 1, bottom_color: 1, low3: 1 })));
    for (let i = 0; i < 4; i++) rows.push(roadRow());
    expect(solveLevel(baseLevel(rows))).toBe(true);
  });

  it('blocked: a wall deck with no clearance and no over-route fails', () => {
    const rows = [];
    for (let i = 0; i < 4; i++) rows.push(roadRow());
    // wall spans filling the full column: floor at 0, top far above jump apex — can't
    // clear it (jump apex ≈ 12.4), can't pass under (floor on the ground), not landable.
    const wallRow = Array.from({ length: 7 }, () => deckCell(50.0, { floorY: 0, isWallObstacle: true }));
    rows.push(wallRow);
    for (let i = 0; i < 4; i++) rows.push(roadRow());
    expect(solveLevel(baseLevel(rows))).toBe(false);
  });
});
