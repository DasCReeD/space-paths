import { describe, it, expect } from 'vitest';
import {
  validateTrackQuality,
  computeIntensity,
  forcedDemand,
  rowMechanics,
  openLanes,
  TRACK_QUALITY_DEFAULTS,
} from '../trackQuality.js';

const LANES = 7;

// ── Row builders ─────────────────────────────────────────────────────────────
const tile = (props = {}) => ({ top_color: 0, bottom_color: 1, full: false, half: false, tunnel: false, ramp: false, ...props });
const roadRow = () => Array.from({ length: LANES }, () => tile());
const gapRow = () => Array.from({ length: LANES }, () => null);
const gateRow = (openLane = 3) => Array.from({ length: LANES }, (_, l) => (l === openLane ? tile() : tile({ full: true })));
const tunnelRow = () => Array.from({ length: LANES }, () => tile({ tunnel: true }));
const flatTrack = (n) => Array.from({ length: n }, roadRow);

describe('forcedDemand', () => {
  it('classifies gaps, tunnels, and gates; plain road is not forced', () => {
    expect(forcedDemand(gapRow())).toEqual({ type: 'gap', choice: false });
    expect(forcedDemand(tunnelRow())).toEqual({ type: 'tunnel', choice: false });
    expect(forcedDemand(gateRow()).type).toBe('gate');
    expect(forcedDemand(roadRow())).toBeNull();
  });

  it('flags a narrow gate as a lane-choice demand', () => {
    expect(forcedDemand(gateRow(3)).choice).toBe(true);
  });

  it('does not treat a single avoidable obstacle as forced', () => {
    const row = roadRow();
    row[5] = tile({ full: true });
    expect(forcedDemand(row)).toBeNull();
  });
});

describe('openLanes & rowMechanics', () => {
  it('counts passable lanes (full blocks, half does not)', () => {
    expect(openLanes(roadRow())).toBe(LANES);
    expect(openLanes(gateRow(3))).toBe(1);
    const halfRow = roadRow();
    halfRow[2] = tile({ half: true });
    expect(openLanes(halfRow)).toBe(LANES);
  });

  it('surfaces distinct mechanics on a row', () => {
    const row = roadRow();
    row[1] = tile({ top_color: 11 }); // boost
    row[4] = tile({ bottom_color: 9 }); // slippery
    const m = rowMechanics(row);
    expect(m.has('boost')).toBe(true);
    expect(m.has('slippery')).toBe(true);
  });
});

describe('computeIntensity', () => {
  it('rates plain road near zero and a gate well above a breather', () => {
    const rows = [...flatTrack(5), gateRow(), ...flatTrack(5)];
    const { smooth } = computeIntensity(rows, { intensitySmooth: 0 });
    expect(smooth[0]).toBeLessThan(TRACK_QUALITY_DEFAULTS.lowIntensity);
    expect(smooth[5]).toBeGreaterThan(TRACK_QUALITY_DEFAULTS.highIntensity);
  });

  it('smoothing spreads a spike into neighbours', () => {
    const rows = [...flatTrack(3), gateRow(), ...flatTrack(3)];
    const sharp = computeIntensity(rows, { intensitySmooth: 0 }).smooth;
    const soft = computeIntensity(rows, { intensitySmooth: 2 }).smooth;
    expect(soft[3]).toBeLessThan(sharp[3]); // peak lowered
    expect(soft[2]).toBeGreaterThan(sharp[2]); // neighbour raised
  });
});

describe('validateTrackQuality', () => {
  it('passes a calm, well-spaced track with no fails', () => {
    // forced demands spaced far apart (every ~10 rows), gentle.
    const rows = [];
    for (let i = 0; i < 6; i++) { rows.push(...flatTrack(10), gapRow()); }
    const res = validateTrackQuality(rows);
    expect(res.violations.filter((v) => v.severity === 'fail')).toHaveLength(0);
    expect(res.score).toBeGreaterThan(80);
  });

  it('A1: flags forced demands packed closer than the lead-in distance', () => {
    // two gates 2 rows apart — well under D_min (~4 rows at speed 32)
    const rows = [...flatTrack(8), gateRow(), roadRow(), gateRow(), ...flatTrack(8)];
    const res = validateTrackQuality(rows);
    const a1 = res.violations.filter((v) => v.rule === 'A1_leadin');
    expect(a1.length).toBeGreaterThan(0);
    expect(a1[0].severity).toBe('fail');
  });

  it('A1: lead-in distance scales with ship speed', () => {
    const rows = [...flatTrack(8), gateRow(), roadRow(), roadRow(), gateRow(), ...flatTrack(8)];
    const slow = validateTrackQuality(rows, { speed: 16 }).violations.filter((v) => v.rule === 'A1_leadin');
    const fast = validateTrackQuality(rows, { speed: 48 }).violations.filter((v) => v.rule === 'A1_leadin');
    expect(fast.length).toBeGreaterThan(slow.length); // faster needs more room → more violations
  });

  it('A4: flags a long demanding run with no breather', () => {
    // 22 consecutive gate-ish demanding rows, no trough
    const rows = [...flatTrack(4), ...Array.from({ length: 22 }, () => gateRow()), ...flatTrack(4)];
    const res = validateTrackQuality(rows);
    expect(res.violations.some((v) => v.rule === 'A4_sawtooth' && v.severity === 'fail')).toBe(true);
  });

  it('A5: flags cramming many new mechanics into the first third', () => {
    const first = [];
    first.push(rowWith({ top_color: 11 }));  // boost
    first.push(rowWith({ top_color: 10 }));  // refill
    first.push(rowWith({ bottom_color: 9 })); // slippery
    first.push(rowWith({ bottom_color: 3 })); // sticky
    first.push(rowWith({ top_color: 13 }));  // burning
    const rows = [...first, ...flatTrack(40)];
    const res = validateTrackQuality(rows);
    expect(res.violations.some((v) => v.rule === 'A5_cadence')).toBe(true);
  });

  it('A6: flags a climax peak that lands before the final third', () => {
    // big difficulty spike early, calm afterwards
    const spike = Array.from({ length: 8 }, () => gateRow());
    const rows = [...flatTrack(2), ...spike, ...flatTrack(40)];
    const res = validateTrackQuality(rows);
    expect(res.violations.some((v) => v.rule === 'A6_climax_early')).toBe(true);
  });

  it('returns a structured fail for empty input', () => {
    const res = validateTrackQuality([]);
    expect(res.score).toBe(0);
    expect(res.violations[0].rule).toBe('input');
  });

  it('reports useful metrics', () => {
    const rows = [...flatTrack(10), gapRow(), ...flatTrack(10)];
    const { metrics } = validateTrackQuality(rows);
    expect(metrics.rows).toBe(21);
    expect(metrics.forcedCount).toBe(1);
    expect(metrics.dMinRowsSingle).toBeGreaterThan(0);
  });
});

// helper: a road row carrying one special tile in the center lane
function rowWith(props) {
  const row = Array.from({ length: LANES }, () => tile());
  row[3] = tile(props);
  return row;
}
