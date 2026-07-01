import { describe, it, expect } from 'vitest';
import { resolve, getShipBox } from '../collision.js';
import { buildColumnGrid, cellBounds } from '../heightfield.js';

// Headless: no jsdom, no THREE. Ship collision dims from physics.js.
const SHIP = { width: 0.44, height: 0.4, length: 1.8 };

// Build a grid from explicit rows. Each row is an array of 7 tiles (or null).
function gridFromRows(rows) {
  return buildColumnGrid({ rows });
}

// A full block (top 2.0) at lane c. Other lanes flat road.
function rowWith(c, tile) {
  const row = [];
  for (let i = 0; i < 7; i++) row.push(i === c ? tile : { val: 0 });
  return row;
}

const FLAT = { val: 0 };
const FULL = { val: 0, full: true };

describe('collision.resolve — geometry-only swept MTV', () => {
  it('head-on into a full block => one wallFront, pushed out in Z, vz=0', () => {
    // Block at lane 3 (centerX 0), row 2: bounds minZ=-12 maxZ=-8.
    const { grid, numRows } = gridFromRows([
      rowWith(3, FLAT),
      rowWith(3, FLAT),
      rowWith(3, FULL),
    ]);
    const b = cellBounds(3, 2); // maxZ = -8

    // Start just in front of the block entry edge (maxZ), at footing y=0, moving -Z.
    const position = { x: 0, y: 0, z: b.maxZ + 1.0 }; // ship front (z - L/2) = maxZ + 0.1
    const velocity = { x: 0, y: 0, z: -5 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    const fronts = out.events.filter(e => e.kind === 'wallFront');
    expect(fronts.length).toBeGreaterThanOrEqual(1);
    expect(out.velocity.z).toBe(0);
    // Ship front must be at or in front of the block entry edge (not inside).
    const front = out.position.z - SHIP.length / 2;
    expect(front).toBeGreaterThanOrEqual(b.maxZ - 1e-9);
    // No spurious land/wallSide on the X-centered head-on.
    expect(out.events.some(e => e.kind === 'wallSide')).toBe(false);
  });

  it('elevated obstacle on a platform => walls at platform height (no fall-through)', () => {
    // Regression for the "fall through the track near an obstacle" bug. Generated
    // levels build platform obstacles as {full, startY:h}. If the adapter ignores
    // startY, the obstacle lands at [0,2] instead of [h,h+2], leaving a phantom hole
    // at the platform surface — the ship drives in and falls through. A ship on the
    // height-4 platform driving into the obstacle must hit a wallFront and stay at ~4.
    const PLAT = { val: 0, ramp: true, startY: 4, endY: 4 };            // flat platform surface at 4
    const OBST = { val: 0, full: true, startY: 4, endY: 4 };            // obstacle sitting on the platform
    const { grid, numRows } = gridFromRows([
      rowWith(3, PLAT),
      rowWith(3, PLAT),
      rowWith(3, OBST),
    ]);
    const b = cellBounds(3, 2); // obstacle row: maxZ = -8

    // Ship on the platform at y=4, just in front of the obstacle entry edge, moving -Z.
    const position = { x: 0, y: 4, z: b.maxZ + 1.0 };
    const velocity = { x: 0, y: 0, z: -6 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    // Must wall on Z (not sink): a wallFront fires and the ship never drops below the platform.
    expect(out.events.some(e => e.kind === 'wallFront')).toBe(true);
    expect(out.velocity.z).toBe(0);
    expect(out.position.y).toBeGreaterThanOrEqual(4 - 1e-6); // stayed on the platform, no fall-through
    // Ship front backed out to (or in front of) the obstacle entry edge — not inside it.
    expect(out.position.z - SHIP.length / 2).toBeGreaterThanOrEqual(b.maxZ - 1e-9);
  });

  it('side graze: overlapping a block X edge moving +X => wallSide, pushed out in X, vx=0', () => {
    // Block at lane 4 (centerX +2): minX=+1, maxX=+3. Put ship straddling minX.
    const { grid, numRows } = gridFromRows([
      rowWith(4, FLAT),
      rowWith(4, FULL),
    ]);
    const b = cellBounds(4, 1); // minX=1, maxX=3, minZ=-8, maxZ=-4

    // Ship at block's z, y inside block height, x just left of minX so it overlaps in X.
    const zCenter = (b.minZ + b.maxZ) / 2;
    const position = { x: b.minX - 0.1, y: 0.0, z: zCenter };
    const velocity = { x: 2, y: 0, z: 0 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.05, ship: SHIP });

    expect(out.events.some(e => e.kind === 'wallSide')).toBe(true);
    expect(out.velocity.x).toBe(0);
    // Pushed to the -X side: ship right edge <= block minX.
    expect(out.position.x + SHIP.width / 2).toBeLessThanOrEqual(b.minX + 1e-6);
  });

  it('falling onto a block top => land, y snapped to top, vy=0, surfaceY correct', () => {
    const { grid, numRows } = gridFromRows([
      rowWith(3, FULL),
    ]);
    const b = cellBounds(3, 0); // top = 2.0
    const zCenter = (b.minZ + b.maxZ) / 2;

    const position = { x: 0, y: 2.3, z: zCenter }; // above the 2.0 top
    const velocity = { x: 0, y: -5, z: 0 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    const land = out.events.find(e => e.kind === 'land');
    expect(land).toBeTruthy();
    expect(land.surfaceY).toBeCloseTo(2.0, 6);
    expect(out.velocity.y).toBe(0);
    expect(out.position.y).toBeCloseTo(2.0, 6);
  });

  it('jump into an overpass underside => ceiling, vy=0, y below floorY - height', () => {
    // Two-span column: road span at 0, a thick slab floorY=3.0 top=4.0 (an
    // overpass deck). Thick enough that a substep can't skip it.
    const slabTile = {
      val: 0,
      spans: [
        { floorY: -0.1, topEntryY: 0, topExitY: 0 },
        { floorY: 3.0, topEntryY: 4.0, topExitY: 4.0 },
      ],
    };
    const { grid, numRows } = gridFromRows([rowWith(3, slabTile)]);
    const b = cellBounds(3, 0);
    const zCenter = (b.minZ + b.maxZ) / 2;

    // Ship head near the slab floor, rising.
    const position = { x: 0, y: 2.8, z: zCenter }; // head at 3.2 -> into slab floor 3.0
    const velocity = { x: 0, y: 5, z: 0 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    const ceil = out.events.find(e => e.kind === 'ceiling');
    expect(ceil).toBeTruthy();
    expect(out.velocity.y).toBe(0);
    // Head must be at or below floorY -> feet at or below floorY - height.
    expect(out.position.y).toBeLessThanOrEqual(3.0 - SHIP.height + 1e-6);
  });

  it('up-ramp entry matching footing => NO wallFront (rides up)', () => {
    // Flat road then an up-ramp 0 -> 2.0. Ship footing y=0 entering the ramp.
    const ramp = { val: 0, ramp: true, startY: 0, endY: 2.0 };
    const { grid, numRows } = gridFromRows([
      rowWith(3, FLAT),
      rowWith(3, ramp),
      rowWith(3, ramp),
    ]);
    const b = cellBounds(3, 1); // ramp entry edge maxZ = -4

    // Ship sitting at footing 0, front just at the ramp entry, moving -Z.
    const position = { x: 0, y: 0, z: b.maxZ + 0.9 };
    const velocity = { x: 0, y: 0, z: -3 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    expect(out.events.some(e => e.kind === 'wallFront')).toBe(false);
    // It should ride up: any y-resolution must be a land, never a ceiling/wall.
    expect(out.events.every(e => e.kind === 'land')).toBe(true);
  });

  it('tunneling guard: fast single frame through a full block still collides', () => {
    const { grid, numRows } = gridFromRows([
      rowWith(3, FLAT),
      rowWith(3, FULL),
      rowWith(3, FLAT),
    ]);
    const b = cellBounds(3, 1); // block row, maxZ = -4

    // Start in front of the block, velocity so |dz| spans well past a tile in one frame.
    const position = { x: 0, y: 0, z: b.maxZ + 1.0 };
    const velocity = { x: 0, y: 0, z: -60 }; // dt 0.1 => dz = -6 (1.5 tiles)
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    expect(out.events.some(e => e.kind === 'wallFront')).toBe(true);
    expect(out.velocity.z).toBe(0);
    // Did NOT tunnel through: front stays at/in front of block entry.
    expect(out.position.z - SHIP.length / 2).toBeGreaterThanOrEqual(b.maxZ - 1e-6);
  });

  it('MTV picks minimum-penetration axis: shallow-X deep-Z => wallSide', () => {
    // Block at lane 4 (minX=1). Ship overlaps X by a sliver but Z deeply.
    const { grid, numRows } = gridFromRows([
      rowWith(4, FULL),
    ]);
    const b = cellBounds(4, 0); // minX=1 maxX=3, minZ=-4 maxZ=0
    // Place ship deep in Z (center near zCenter) but barely past X edge.
    const position = { x: b.minX - SHIP.width / 2 + 0.05, y: 0, z: (b.minZ + b.maxZ) / 2 };
    const velocity = { x: 0, y: 0, z: 0 };
    // No motion -> resolve from initial overlap.
    const out = resolve({ grid, numRows, position, velocity, dt: 0.016, ship: SHIP });

    expect(out.events.length).toBeGreaterThanOrEqual(1);
    expect(out.events[0].kind).toBe('wallSide');
    expect(out.events[0].axis).toBe('x');
  });

  it('MTV picks minimum-penetration axis: shallow-Z deep-X => wallFront', () => {
    const { grid, numRows } = gridFromRows([
      rowWith(3, FULL),
    ]);
    const b = cellBounds(3, 0); // minX=-1 maxX=1, minZ=-4 maxZ=0
    // Ship centered in X (deep X overlap), barely past the Z entry edge (maxZ=0).
    const position = { x: 0, y: 0, z: b.maxZ + SHIP.length / 2 - 0.05 };
    const velocity = { x: 0, y: 0, z: 0 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.016, ship: SHIP });

    expect(out.events.length).toBeGreaterThanOrEqual(1);
    expect(out.events[0].kind).toBe('wallFront');
    expect(out.events[0].axis).toBe('z');
  });

  it('ramp-to-ramp seam is a surface, not a wall (rides up across consecutive ramp tiles)', () => {
    // Regression for the in-browser smoke: per-row ramp tiles create seams. With the
    // ship's feet lagging the surface, the next segment's entry was wrongly walling
    // (wallFront) and the ship got stuck. A span whose top is near the feet is a
    // walkable surface — the ship must ride up across the seam.
    const { grid, numRows } = gridFromRows([
      rowWith(3, FLAT),
      rowWith(3, { val: 0, ramp: true, startY: 0, endY: 0.5 }),
      rowWith(3, { val: 0, ramp: true, startY: 0.5, endY: 1.0 }),
    ]);
    const seamZ = cellBounds(3, 1).minZ; // = -8, boundary between the two ramp tiles

    // Ship straddling the seam, feet lagging slightly below the 0.5 seam height, fast -Z.
    const position = { x: 0, y: 0.4, z: seamZ };
    const velocity = { x: 0, y: 0, z: -20 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.05, ship: SHIP });

    expect(out.events.some(e => e.kind === 'wallFront'), 'seam must not wall').toBe(false);
    expect(out.events.some(e => e.kind === 'land'), 'ship rides onto the next ramp').toBe(true);
    expect(out.position.y, 'climbed to the seam surface').toBeGreaterThanOrEqual(0.45);
    expect(out.velocity.z, 'forward motion preserved (not stopped by a wall)').toBeLessThan(0);
  });

  it('high-speed head-on into a tall wall resolves as wall, never ejects downward', () => {
    // Regression: at high speed a single substep can drive Z-penetration past the
    // 0.4 ship height. Without disqualifying the (interior) Y face, min-penetration
    // would pick Y and shove the ship DOWN, emitting a spurious ceiling/land + dip.
    const { grid, numRows } = gridFromRows([
      rowWith(3, FLAT),
      rowWith(3, FULL),
    ]);
    const b = cellBounds(3, 1); // block entry edge maxZ = -4

    // Footing y=0, front right at the block face, very fast -Z.
    const position = { x: 0, y: 0, z: b.maxZ + SHIP.length / 2 };
    const velocity = { x: 0, y: 0, z: -80 };
    const out = resolve({ grid, numRows, position, velocity, dt: 0.1, ship: SHIP });

    expect(out.events.some(e => e.kind === 'wallFront')).toBe(true);
    expect(out.events.some(e => e.kind === 'ceiling')).toBe(false);
    expect(out.events.some(e => e.kind === 'land')).toBe(false);
    expect(out.events.some(e => e.kind === 'wallSide')).toBe(false);
    expect(out.velocity.z).toBe(0);
    // Crucially: no downward NOR sideways ejection — the ship stays put on X/Y.
    expect(out.position.y).toBeCloseTo(0, 6);
    expect(out.position.x).toBeCloseTo(0, 6);
  });

  it('fast jump-descent does not tunnel through the thin flat-road floor', () => {
    // Regression (classic road 5): the flat-road span is only 0.1u thick, so its
    // landing window is exactly 0.5u (T+shipHeight). At the old 0.5u substep cap a
    // jump descent (vy=-10, dt 0.05 => 0.5u/substep) stepped clean over it and the
    // ship fell through. The substep must stay below the window so it can't skip.
    const { grid, numRows } = gridFromRows([rowWith(3, FLAT)]);
    const b = cellBounds(3, 0);
    const zc = (b.minZ + b.maxZ) / 2;
    // Feet exactly on the road top with a fast downward velocity — the worst-case
    // alignment that previously skipped the 0.5u window in one step.
    const out = resolve({ grid, numRows, position: { x: 0, y: 0, z: zc }, velocity: { x: 0, y: -10, z: 0 }, dt: 0.05, ship: SHIP });
    expect(out.events.some(e => e.kind === 'land')).toBe(true);
    expect(out.position.y).toBeGreaterThanOrEqual(-0.05); // caught at the road, not fallen through
    expect(out.velocity.y).toBe(0);
  });

  it('partial-width span (tunnel wall) blocks laterally only at its X strip', () => {
    // A thin wall leg at the left edge of lane 3's cell, full arch height — what
    // addTunnelWalls produces. The ship is contained, but only near the strip.
    const b = cellBounds(3, 0);
    const wall = { floorY: 0, topEntryY: 2, topExitY: 2, isRamp: false, xMin: b.minX, xMax: b.minX + 0.15 };
    const road = { floorY: -0.1, topEntryY: 0, topExitY: 0, isRamp: false };
    const grid = [[null, null, null, { spans: [road, wall], isGap: false }, null, null, null]];
    const zc = (b.minZ + b.maxZ) / 2;

    // Centered in the lane, driving forward: far from the wall strip => no wall hit.
    let out = resolve({ grid, numRows: 1, position: { x: 0, y: 0, z: zc }, velocity: { x: 0, y: 0, z: -10 }, dt: 0.05, ship: SHIP });
    expect(out.events.some(e => e.kind === 'wallSide')).toBe(false);

    // Steering hard into the wall strip: hits a wallSide and is pushed out of it.
    out = resolve({ grid, numRows: 1, position: { x: b.minX + 0.15, y: 0, z: zc }, velocity: { x: -5, y: 0, z: 0 }, dt: 0.05, ship: SHIP });
    expect(out.events.some(e => e.kind === 'wallSide')).toBe(true);
    expect(out.velocity.x).toBe(0);
    expect(out.position.x).toBeGreaterThanOrEqual(b.minX + 0.15 + SHIP.width / 2 - 1e-6);
  });
});

describe('getShipBox', () => {
  it('centers X/Z and sets feet at position.y', () => {
    const box = getShipBox({ x: 1, y: 2, z: -3 }, SHIP);
    expect(box.minX).toBeCloseTo(1 - 0.22);
    expect(box.maxX).toBeCloseTo(1 + 0.22);
    expect(box.minY).toBe(2);
    expect(box.maxY).toBeCloseTo(2.4);
    expect(box.minZ).toBeCloseTo(-3 - 0.9);
    expect(box.maxZ).toBeCloseTo(-3 + 0.9);
  });
});
