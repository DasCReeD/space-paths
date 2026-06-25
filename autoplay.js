const TILE_WIDTH = 2.0;
const TILE_LENGTH = 4.0;
const LANES = 7;
const MAX_LEFT_X = -(TILE_WIDTH * LANES) / 2;

function tileObstacleHeight(tile) {
  if (tile.full && tile.half) return 3.0;
  if (tile.full) return 2.0;
  if (tile.half) return 1.0;
  return 0;
}

// Autopilot: reads the same row grid physics.js uses (window.currentLevelData.rows)
// to look ahead per-lane, scores each lane as clear/jumpable/deadly, and steers
// toward the nearest safe lane while timing jumps to clear what's survivable.
//
// Call update(dt, keyboard, ship, levelInfo) every frame while bot mode is
// active, BEFORE keyboard.updateCombinedState() runs (call site: app.js animate()).
export class Autopilot {
  constructor() {
    this.reset();
  }

  reset() {
    this.targetCol = null;
    this.holdJump = false;
  }

  // Scans `lookRows` rows ahead in every lane starting at `fromRow`.
  // Returns per-lane { hazardRow, deadly }: hazardRow is rows-until-hazard-start
  // (-1 if none seen), deadly is true if the hazard can't be cleared by a jump
  // of `jumpClearRows` length (too tall, or the gap/block runs longer than that).
  _scanLanes(rows, fromRow, lookRows, jumpClearRows, maxJumpHeight) {
    const lanes = [];
    for (let c = 0; c < LANES; c++) {
      let hazardRow = -1;
      let deadly = false;
      let i = 0;
      while (i < lookRows) {
        const row = rows[fromRow + i];
        const tile = row ? row[c] : undefined;
        const isGap = !tile;
        const isBlock = tile && (tile.full || tile.half) && !tile.ramp;
        if (isGap || isBlock) {
          hazardRow = i;
          let span = 0;
          let j = i;
          while (j < lookRows) {
            const t = rows[fromRow + j] ? rows[fromRow + j][c] : undefined;
            const stillGap = !t;
            const stillBlock = t && (t.full || t.half) && !t.ramp;
            if (isGap ? !stillGap : !stillBlock) break;
            span++;
            j++;
          }
          const tooTall = isBlock && tileObstacleHeight(tile) > maxJumpHeight;
          deadly = tooTall || span > jumpClearRows;
          break;
        }
        i++;
      }
      lanes.push({ hazardRow, deadly });
    }
    return lanes;
  }

  _laneScore(lane) {
    if (lane.hazardRow === -1) return 0;
    return lane.deadly ? 1000 : 1;
  }

  _pickLane(lanes, curCol) {
    // Stay put unless the current lane is unsurvivable — jumping a clearable
    // gap/obstacle beats swerving for no reason.
    if (!lanes[curCol].deadly) return curCol;
    let best = curCol;
    let bestScore = 1000;
    for (let c = 0; c < lanes.length; c++) {
      const score = this._laneScore(lanes[c]);
      if (score < bestScore || (score === bestScore && Math.abs(c - curCol) < Math.abs(best - curCol))) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  update(dt, keyboard, ship, levelInfo) {
    keyboard.keys.forward = true;

    const rows = (typeof window !== 'undefined' && window.currentLevelData) ? window.currentLevelData.rows : null;
    if (!rows || !ship) {
      keyboard.keys.jump = false;
      keyboard.keys.left = false;
      keyboard.keys.right = false;
      return;
    }

    const speed = Math.max(1, Math.abs(ship.velocity.z));
    const gravity = (levelInfo && levelInfo.gravity) || 24.0;
    const jumpImpulse = ship.jumpImpulse || 10.5;
    // ponytail: ignores fallGravityMultiplier/jumpFactor/highJump for the arc estimate
    // and tunnel ceilings entirely (rows grid has no ceiling data) — good enough to
    // pick lanes and time jumps; revisit if the bot keeps bonking tunnel roofs.
    const airTime = (2 * jumpImpulse) / gravity;
    const maxJumpHeight = (jumpImpulse * jumpImpulse) / (2 * gravity);
    const jumpClearDistance = speed * airTime;
    const jumpClearRows = Math.max(1, Math.round(jumpClearDistance / TILE_LENGTH));
    const lookRows = jumpClearRows + 3;

    const absZ = -ship.position.z;
    const curRow = Math.floor(absZ / TILE_LENGTH);
    const curCol = Math.min(LANES - 1, Math.max(0, Math.floor((ship.position.x - MAX_LEFT_X) / TILE_WIDTH)));

    const lanes = this._scanLanes(rows, curRow, lookRows, jumpClearRows, maxJumpHeight);

    const laneCenterX = (col) => MAX_LEFT_X + (col + 0.5) * TILE_WIDTH;
    const deadzone = 0.25;
    if (this.targetCol === null || Math.abs(ship.position.x - laneCenterX(this.targetCol)) < deadzone) {
      this.targetCol = this._pickLane(lanes, curCol);
    }

    const dx = laneCenterX(this.targetCol) - ship.position.x;
    keyboard.keys.left = dx < -deadzone;
    keyboard.keys.right = dx > deadzone;

    // Jump timing: fire just before the current lane's hazard edge, hold through
    // the whole hop for max height, release on landing.
    const curLane = lanes[curCol];
    if (!this.holdJump && curLane.hazardRow !== -1 && !curLane.deadly && ship.onGround) {
      const distanceIntoTile = absZ - curRow * TILE_LENGTH;
      const distanceToHazard = curLane.hazardRow * TILE_LENGTH - distanceIntoTile;
      const jumpLead = speed * 0.08;
      if (distanceToHazard <= jumpLead) {
        this.holdJump = true;
      }
    }
    if (this.holdJump) {
      keyboard.keys.jump = true;
      if (ship.onGround) this.holdJump = false;
    } else {
      keyboard.keys.jump = false;
    }
  }
}

// Ghost: records a position trail and persists only the single best
// (fastest completed) run per level to localStorage.
export class Ghost {
  constructor() {
    this.samples = [];
    this.recording = false;
  }

  startRecording() {
    this.samples = [];
    this.recording = true;
  }

  // ponytail: caller throttles to ~10/sec, keeps localStorage small. No internal clock here.
  sample(t, position) {
    this.samples.push({ t, x: position.x, y: position.y, z: position.z });
  }

  stopRecording() {
    this.recording = false;
  }

  static _key(packName, levelIndex) {
    return `skyroads_ghost_${packName}_${levelIndex}`;
  }

  static load(packName, levelIndex) {
    const raw = localStorage.getItem(Ghost._key(packName, levelIndex));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  maybeSave(packName, levelIndex, finishTime) {
    const existing = Ghost.load(packName, levelIndex);
    if (existing && existing.time <= finishTime) return;
    localStorage.setItem(
      Ghost._key(packName, levelIndex),
      JSON.stringify({ time: finishTime, samples: this.samples })
    );
  }

  static positionAt(samples, t) {
    if (!samples || samples.length === 0) return null;
    if (t <= samples[0].t) return { x: samples[0].x, y: samples[0].y, z: samples[0].z };
    const last = samples[samples.length - 1];
    if (t >= last.t) return { x: last.x, y: last.y, z: last.z };

    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i];
      const b = samples[i + 1];
      if (t >= a.t && t <= b.t) {
        const span = b.t - a.t;
        const f = span === 0 ? 0 : (t - a.t) / span;
        return {
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z: a.z + (b.z - a.z) * f
        };
      }
    }
    return { x: last.x, y: last.y, z: last.z };
  }
}
