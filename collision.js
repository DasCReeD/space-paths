/**
 * collision.js — Swept-AABB-vs-column resolver with MTV resolution.
 *
 * Imports ONLY heightfield.js (its query API). NO three.js, NO physics.js.
 *
 * This module resolves GEOMETRY ONLY: it sweeps the ship AABB through the column
 * grid in substeps, pushes it out of any solid span along the minimum-translation
 * axis, zeroes the blocked velocity component, and emits CollisionEvents. It
 * applies NO game outcomes (crash/death/bounce/damage/audio) — those live in
 * physics.js, keyed off the events + span.behavior. See docs/collision-redesign-plan.md
 * §1.6, §1.7, §3.1.
 *
 * @typedef {import('./heightfield.js').Span} Span
 *
 * @typedef {Object} CollisionEvent
 * @property {'land'|'ceiling'|'wallSide'|'wallFront'} kind  geometric classification (NOT a game outcome)
 * @property {'x'|'y'|'z'} axis        MTV resolution axis
 * @property {Span}   span             the span hit (carries behavior + metadata)
 * @property {{c:number,r:number}} cell
 * @property {number} surfaceY         for 'land': the top the ship was snapped to
 * @property {number} penetration      MTV depth before push-out
 * @property {number} impactSpeed      |velocity component| along `axis` at contact
 */

import {
  spanSolidTopAtZ,
  columnsOverlappingBox,
} from './heightfield.js';

/** Max distance the ship may move per substep on any axis (kills tunneling). */
const MAX_SUBSTEP = 0.5;

/**
 * Minimum penetration depth that counts as a real contact. Resting flush on a
 * surface (the ship's feet exactly on a span top, ovY ≈ 0) must NOT register as
 * a collision to push out of — otherwise the very ground you stand on bounces
 * you off. Anything at or below this is treated as touching-but-not-penetrating.
 */
const CONTACT_EPSILON = 1e-6;

/**
 * Build the ship AABB centered in X/Z on `position`, with feet at position.y.
 * Matches physics.js getShipBox(): minY = position.y, maxY = position.y + height.
 *
 * @param {{x:number,y:number,z:number}} position
 * @param {{width:number,height:number,length:number}} ship
 */
export function getShipBox(position, ship) {
  const halfW = ship.width / 2;
  const halfL = ship.length / 2;
  return {
    minX: position.x - halfW,
    maxX: position.x + halfW,
    minY: position.y,
    maxY: position.y + ship.height,
    minZ: position.z - halfL,
    maxZ: position.z + halfL,
  };
}

/**
 * Swept push-out + MTV resolution for one physics frame.
 *
 * @param {Object}  args
 * @param {import('./heightfield.js').Column[][]} args.grid
 * @param {number}  args.numRows
 * @param {{x:number,y:number,z:number}} args.position  (not mutated)
 * @param {{x:number,y:number,z:number}} args.velocity  (not mutated)
 * @param {number}  args.dt
 * @param {{width:number,height:number,length:number}} args.ship  collision dims
 * @returns {{ position:{x,y,z}, velocity:{x,y,z}, events:CollisionEvent[] }}
 */
export function resolve({ grid, numRows, position, velocity, dt, ship }) {
  const pos = { x: position.x, y: position.y, z: position.z };
  const vel = { x: velocity.x, y: velocity.y, z: velocity.z };
  const events = [];

  const maxMove = Math.max(
    Math.abs(vel.x * dt), Math.abs(vel.y * dt), Math.abs(vel.z * dt),
  );
  // Cap a substep BELOW the ship's height so it can never fully step over a thin
  // surface in one move. A span of thickness T is skippable iff substep >= T + shipHeight
  // (the overlap window). The flat-road span is only 0.1u thick, so at the old 0.5u cap a
  // jump-descent (vy≈-10, dt 0.05 → exactly 0.5u/substep) stepped clean through the floor.
  const cap = Math.min(MAX_SUBSTEP, ship.height * 0.9);
  const N = Math.max(1, Math.ceil(maxMove / cap));
  const subDt = dt / N;

  for (let i = 0; i < N; i++) {
    // Advance using the LIVE velocity: once a collision zeroes an axis, the
    // remaining substeps stop moving along it (no overshoot past a wall).
    pos.x += vel.x * subDt;
    pos.y += vel.y * subDt;
    pos.z += vel.z * subDt;
    resolveSubstep(grid, numRows, pos, vel, ship, events);
  }

  return {
    position: pos,
    velocity: vel,
    events,
  };
}

/**
 * Resolve all contacts at the current position. Resolves one span/axis per
 * iteration, rebuilding the ship AABB and re-testing, so multiple contacts in a
 * single substep settle deterministically. Returns when nothing overlaps.
 */
function resolveSubstep(grid, numRows, pos, vel, ship, events) {
  // Guard against pathological geometry: at most a handful of contacts can
  // possibly be live at once (≤2×2 cells, few spans each). Cap to stay bounded.
  const MAX_ITERS = 16;
  for (let iter = 0; iter < MAX_ITERS; iter++) {
    const shipBox = getShipBox(pos, ship);
    const hit = findContact(grid, numRows, shipBox, pos, vel);
    if (!hit) return;
    applyResolution(hit, pos, vel, events);
  }
}

/**
 * Find the single contact to resolve this iteration. For each overlapping span,
 * choose its MTV axis (see chooseAxis), then return the contact with the
 * SMALLEST penetration (resolve the gentlest contact first, rebuild, re-test —
 * so corners and multiple contacts settle deterministically).
 */
function findContact(grid, numRows, shipBox, pos, vel) {
  const cells = columnsOverlappingBox(grid, numRows, shipBox);
  let best = null;

  for (const { c, r, column, bounds } of cells) {
    if (column.isGap) continue;
    for (const span of column.spans) {
      const solidTop = spanSolidTopAtZ(span, bounds, pos.z);
      // Span solid box: full cell footprint in X/Z, [floorY..solidTop] in Y —
      // unless the span is partial-width (xMin/xMax, e.g. a thin tunnel side wall).
      const B = {
        minX: span.xMin != null ? span.xMin : bounds.minX,
        maxX: span.xMax != null ? span.xMax : bounds.maxX,
        minY: span.floorY, maxY: solidTop,
        minZ: bounds.minZ, maxZ: bounds.maxZ,
      };

      // Per-axis penetration depth and the sign to push the ship out along it
      // (toward the nearer box face / out of penetration).
      const ov = {
        x: axisOverlap(shipBox.minX, shipBox.maxX, B.minX, B.maxX),
        y: axisOverlap(shipBox.minY, shipBox.maxY, B.minY, B.maxY),
        z: axisOverlap(shipBox.minZ, shipBox.maxZ, B.minZ, B.maxZ),
      };

      // No contact unless every axis overlaps and the MTV depth clears epsilon.
      // Resting flush on a surface gives ovY ≈ 0 — not a collision to resolve.
      if (ov.x.depth <= 0 || ov.y.depth <= 0 || ov.z.depth <= 0) continue;
      if (Math.min(ov.x.depth, ov.y.depth, ov.z.depth) <= CONTACT_EPSILON) continue;

      const shipHeight = shipBox.maxY - shipBox.minY;
      const { axis, sign } = chooseAxis(ov, vel, shipBox.minY, solidTop, shipHeight);
      const penetration = ov[axis].depth;

      // Directional push-out: back the ship's LEADING edge out to the obstacle's
      // entry face. Overlap-MTV alone fails when an obstacle is THINNER than the ship
      // (a 0.15u tunnel wall inside the 0.44u ship) — pushing by the overlap makes the
      // ship straddle it and oscillate. When moving on the axis, exit opposite to
      // velocity to the entry face; for a static (v=0) overlap, fall back to MTV.
      const lo = { x: 'minX', y: 'minY', z: 'minZ' }[axis];
      const hi = { x: 'maxX', y: 'maxY', z: 'maxZ' }[axis];
      let push;
      if (vel[axis] < 0)      push =  (B[hi] - shipBox[lo]); // entered through B.max face → back out +
      else if (vel[axis] > 0) push = -(shipBox[hi] - B[lo]); // entered through B.min face → back out -
      else                    push = sign * penetration;     // static overlap (MTV)

      if (best === null || penetration < best.penetration) {
        best = { axis, penetration, push, sign: push >= 0 ? 1 : -1, span, solidTop, cell: { c, r }, B };
      }
    }
  }
  return best;
}

/**
 * Overlap of [aMin,aMax] (ship) with [bMin,bMax] (box) on one axis.
 * sign = +1 if pushing the ship the +axis direction exits penetration
 * (ship's center is on the +side of the box), else -1.
 */
function axisOverlap(aMin, aMax, bMin, bMax) {
  const depth = Math.min(aMax, bMax) - Math.max(aMin, bMin);
  const shipCenter = (aMin + aMax) / 2;
  const boxCenter = (bMin + bMax) / 2;
  return { depth, sign: shipCenter < boxCenter ? -1 : 1, shipCenter, boxCenter };
}

/**
 * Choose the MTV axis + push-out sign — VELOCITY-AWARE, not pure min-penetration.
 *
 * Pure min-penetration fails when a small box (the ship) deeply penetrates a large
 * one: the smallest-dimension overlap caps low, so a fast head-on hit resolves on Y
 * (eject downward) or on X (squirt sideways) instead of as a wall. The fix: only
 * resolve along a face the ship actually CROSSED this frame.
 *
 * Candidate axes:
 *  - `movingInto[a]`: the ship's velocity opposes the push-out direction on axis a,
 *    i.e. it drove in through that face. Covers walls (Z/X), falling-land and
 *    ceiling-bonk (Y, moving down/up).
 *  - Y when the ship sits near the span's TOP (`nearTop`): a support contact where
 *    the surface rose to meet the ship even with vy≈0 — this is what keeps an
 *    up-ramp riding up (ramp top ≈ feet) without any ramp special-case.
 *  - Fallback to all three axes when nothing qualifies (e.g. a zero-velocity
 *    embedded overlap) so we always push out somewhere.
 *
 * Among candidates: minimum penetration; ties prefer the velocity-carrying axis.
 *
 * Sign: push toward the ship's nearer box face (center-based); on a center tie use
 * velocity so a rising ship bonks a slab underside (down), not onto its top.
 *
 * @returns {{axis:'x'|'y'|'z', sign:1|-1}}
 */
const TIE_EPSILON = 1e-4;
function chooseAxis(ov, vel, shipFeet, solidTop, shipHeight) {
  const v = { x: vel.x, y: vel.y, z: vel.z };

  // Effective push-out sign + "did the ship cross this face" per axis.
  const effSign = {}, movingInto = {};
  for (const a of ['x', 'y', 'z']) {
    const o = ov[a];
    effSign[a] = (Math.abs(o.shipCenter - o.boxCenter) < TIE_EPSILON && v[a] !== 0)
      ? (v[a] < 0 ? 1 : -1)   // centers coincide: push back the way it came
      : o.sign;               // otherwise: out toward the nearer face
    movingInto[a] = effSign[a] * v[a] < 0;
  }

  // A span whose top sits within a ship-height of the feet is a WALKABLE surface
  // (ground, a ramp, the next ramp segment at a seam, a small step) — ride ONTO it
  // (resolve Y, step up) instead of crashing into its leading face (Z/X). This is
  // what keeps multi-segment ramps and ramp->platform seams smooth: the next
  // segment's entry top matches the surface the ship is on, so |feet - top| is tiny.
  // A real wall has its top far above the feet (nearTop false) and still walls.
  const nearTop = Math.abs(shipFeet - solidTop) < shipHeight;
  if (nearTop && ov.y.depth > CONTACT_EPSILON) {
    return { axis: 'y', sign: effSign.y };
  }

  const candidates = [];
  for (const a of ['x', 'y', 'z']) {
    if (movingInto[a] || (a === 'y' && nearTop)) candidates.push(a);
  }
  const pool = candidates.length ? candidates : ['x', 'y', 'z'];

  let axis = pool[0];
  for (const a of pool.slice(1)) {
    const d = ov[a].depth - ov[axis].depth;
    if (d < -TIE_EPSILON) axis = a;                                  // strictly shallower
    else if (Math.abs(d) <= TIE_EPSILON &&                           // tie -> prefer moving axis
             Math.abs(v[a]) > Math.abs(v[axis])) axis = a;
  }

  return { axis, sign: effSign[axis] };
}

/**
 * Push the ship out of the span along the MTV axis, zero that velocity
 * component, and record a CollisionEvent classifying the geometry.
 */
function applyResolution(hit, pos, vel, events) {
  const { axis, penetration, push, sign, span, solidTop, cell } = hit;
  const impactSpeed = Math.abs(vel[axis]);
  let kind, surfaceY;

  pos[axis] += push;

  if (axis === 'x') {
    kind = 'wallSide';
  } else if (axis === 'y') {
    if (sign > 0) { kind = 'land'; surfaceY = solidTop; } // pushed UP, resting on top
    else          { kind = 'ceiling'; }                   // pushed DOWN, head into underside
  } else {
    kind = 'wallFront';
  }
  vel[axis] = 0;

  events.push({ kind, axis, span, cell, surfaceY, penetration, impactSpeed });
}
