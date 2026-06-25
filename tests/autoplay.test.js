import { describe, it, expect, beforeEach } from 'vitest';
import { Ghost, Autopilot } from '../autoplay.js';

// 7 lanes wide, rows of tiles ahead of the ship (row 0 = where the ship currently is).
function buildRows(laneRowSpecs, rowCount) {
  const rows = [];
  for (let r = 0; r < rowCount; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      row.push(laneRowSpecs[c](r));
    }
    rows.push(row);
  }
  return rows;
}

const FLAT = () => ({});
const GAP = () => null;

function makeShip({ x = 0, z = 0, vz = -32, onGround = true } = {}) {
  return { position: { x, y: 0, z }, velocity: { x: 0, y: 0, z: vz }, onGround, jumpImpulse: 10.5 };
}

function makeKeyboard() {
  return { keys: {} };
}

describe('Autopilot lane scanning + jump timing', () => {
  it('jumps a short gap in the lane it is already in instead of swerving', () => {
    // Lane 3 (center, x=0) has a 1-tile gap 1 row ahead; every other lane is flat.
    const rows = buildRows(
      [FLAT, FLAT, FLAT, (r) => (r === 1 ? GAP() : FLAT()), FLAT, FLAT, FLAT],
      20
    );
    window.currentLevelData = { rows };

    const bot = new Autopilot();
    const ship = makeShip({ x: 0, z: -3.9 }); // just inside row 0, about to cross into the gap row
    const keyboard = makeKeyboard();
    const levelInfo = { gravity: 24.0 };

    bot.update(1 / 60, keyboard, ship, levelInfo);

    expect(keyboard.keys.left).toBe(false);
    expect(keyboard.keys.right).toBe(false);
    expect(keyboard.keys.jump).toBe(true);
  });

  it('steers to a clear lane when the current lane has a gap too wide to jump', () => {
    // Lanes 0-3 all have a 12-tile-long gap (way past jump range); lane 4 stays flat.
    const wideGap = (r) => (r >= 1 && r <= 12 ? GAP() : FLAT());
    const rows = buildRows([wideGap, wideGap, wideGap, wideGap, FLAT, FLAT, FLAT], 20);
    window.currentLevelData = { rows };

    const bot = new Autopilot();
    const ship = makeShip({ x: 0, z: -0.5 });
    const keyboard = makeKeyboard();
    const levelInfo = { gravity: 24.0 };

    bot.update(1 / 60, keyboard, ship, levelInfo);

    // Lane 4 (x=2) is to the right of lane 3 (x=0) and is clear -> steer right.
    expect(keyboard.keys.right).toBe(true);
    expect(keyboard.keys.left).toBe(false);
  });

  it('drives straight with no input when no level data is loaded yet', () => {
    window.currentLevelData = null;
    const bot = new Autopilot();
    const ship = makeShip();
    const keyboard = makeKeyboard();
    bot.update(1 / 60, keyboard, ship, { gravity: 24.0 });
    expect(keyboard.keys.jump).toBe(false);
    expect(keyboard.keys.left).toBe(false);
    expect(keyboard.keys.right).toBe(false);
  });
});

describe('Ghost.positionAt', () => {
  it('interpolates linearly at a midpoint between two samples', () => {
    const samples = [
      { t: 0, x: 0, y: 0, z: 0 },
      { t: 1, x: 10, y: 2, z: -4 }
    ];
    const pos = Ghost.positionAt(samples, 0.5);
    expect(pos).toEqual({ x: 5, y: 1, z: -2 });
  });

  it('clamps before first and after last sample', () => {
    const samples = [
      { t: 1, x: 1, y: 1, z: 1 },
      { t: 2, x: 2, y: 2, z: 2 }
    ];
    expect(Ghost.positionAt(samples, 0)).toEqual({ x: 1, y: 1, z: 1 });
    expect(Ghost.positionAt(samples, 5)).toEqual({ x: 2, y: 2, z: 2 });
  });

  it('returns null for empty samples', () => {
    expect(Ghost.positionAt([], 1)).toBeNull();
  });
});

describe('Ghost.maybeSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves when no existing ghost', () => {
    const g = new Ghost();
    g.samples = [{ t: 0, x: 0, y: 0, z: 0 }];
    g.maybeSave('standard', 0, 42);
    expect(Ghost.load('standard', 0).time).toBe(42);
  });

  it('keeps the faster time and rejects a slower one', () => {
    const g1 = new Ghost();
    g1.samples = [{ t: 0, x: 1, y: 1, z: 1 }];
    g1.maybeSave('standard', 0, 30);

    const g2 = new Ghost();
    g2.samples = [{ t: 0, x: 9, y: 9, z: 9 }];
    g2.maybeSave('standard', 0, 50); // slower, should be rejected

    const saved = Ghost.load('standard', 0);
    expect(saved.time).toBe(30);
    expect(saved.samples[0].x).toBe(1);
  });

  it('overwrites with a faster time', () => {
    const g1 = new Ghost();
    g1.samples = [{ t: 0, x: 1, y: 1, z: 1 }];
    g1.maybeSave('standard', 0, 30);

    const g2 = new Ghost();
    g2.samples = [{ t: 0, x: 9, y: 9, z: 9 }];
    g2.maybeSave('standard', 0, 20); // faster, should overwrite

    const saved = Ghost.load('standard', 0);
    expect(saved.time).toBe(20);
    expect(saved.samples[0].x).toBe(9);
  });
});
