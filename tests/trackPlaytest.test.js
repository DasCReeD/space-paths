import { describe, it, expect } from 'vitest';
import { runPlaytest, PERSONAS, simulateRun, mulberry32 } from '../tools/trackPlaytest.js';

// --- tiny level builders -----------------------------------------------------
function roadTile(topColor = 0) {
  return { val: 0, full: false, half: false, tunnel: false, top_color: topColor, bottom_color: 1, low3: 1 };
}
// "super" obstacle: full+half = height 3.0, taller than any jump → unjumpable wall.
function fullTile() {
  return { val: 0, full: true, half: true, tunnel: false, top_color: 0, bottom_color: 2, low3: 2 };
}
// A full-width road row with lanes 0 and 6 as off-track edges (matches data).
function roadRow() {
  return [null, roadTile(), roadTile(), roadTile(), roadTile(), roadTile(), null];
}
function flatLevel(numRows = 60, gravity = 8) {
  return {
    level_index: 999, name: 'FLAT', gravity, fuel: 500, oxygen: 400,
    rows: Array.from({ length: numRows }, () => roadRow()),
  };
}

describe('trackPlaytest harness', () => {
  it('a trivially-flat level is solvable@expert with ~0 deaths and passes-or-too-easy', () => {
    const report = runPlaytest(flatLevel(60), { seeds: 12 });
    expect(report.solvableExpert).toBe(true);
    // no hazards → nobody dies, regardless of persona.
    const totalDeaths = report.perPersona.reduce((s, p) => s + p.deaths, 0);
    expect(totalDeaths).toBe(0);
    expect(report.failRate).toBe(0);
    // a flat track has no challenge → it should fail the "too easy" band.
    expect(report.verdict).toBe('fail');
    expect(report.reasons.join(' ')).toMatch(/too easy|too low/);
  });

  it('an impossible wall across all lanes (no jump room) fails solvable@expert', () => {
    // Wall is a long span of full-width blocks → unjumpable, no clear lane.
    const rows = [];
    for (let i = 0; i < 10; i++) rows.push(roadRow());
    for (let i = 0; i < 8; i++) rows.push([null, fullTile(), fullTile(), fullTile(), fullTile(), fullTile(), null]);
    for (let i = 0; i < 10; i++) rows.push(roadRow());
    const level = { level_index: 998, name: 'WALL', gravity: 8, fuel: 500, oxygen: 400, rows };
    const report = runPlaytest(level, { seeds: 8 });
    expect(report.solvableExpert).toBe(false);
    expect(report.verdict).toBe('fail');
    expect(report.reasons.join(' ')).toMatch(/expert/);
  });

  it('report has the documented shape', () => {
    const report = runPlaytest(flatLevel(40), { seeds: 6 });
    expect(report).toEqual(expect.objectContaining({
      solvableExpert: expect.any(Boolean),
      failRate: expect.any(Number),
      nearMissPerMin: expect.any(Number),
      timeCV: expect.any(Number),
      monotoneInSkill: expect.any(Boolean),
      verdict: expect.stringMatching(/^(pass|fail)$/),
      reasons: expect.any(Array),
    }));
    expect(report.perPersona).toHaveLength(PERSONAS.length);
    for (const p of report.perPersona) {
      expect(p).toEqual(expect.objectContaining({
        name: expect.any(String),
        deaths: expect.any(Number),
        attempts: expect.any(Number),
        failRate: expect.any(Number),
        nearMissesPerMin: expect.any(Number),
      }));
      expect(p.failRate).toBeGreaterThanOrEqual(0);
      expect(p.failRate).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const a = runPlaytest(flatLevel(50), { seeds: 10, seed: 42 });
    const b = runPlaytest(flatLevel(50), { seeds: 10, seed: 42 });
    expect(a).toEqual(b);
  });

  it('a level with jumpable gaps produces some deaths for sloppier personas and stays monotone', () => {
    // road with periodic single-row gaps (jumpable) → timing pressure.
    const rows = [];
    for (let i = 0; i < 80; i++) {
      if (i > 5 && i % 5 === 0) rows.push([null, null, null, null, null, null, null]); // gap row
      else rows.push(roadRow());
    }
    const level = { level_index: 997, name: 'GAPS', gravity: 8, fuel: 500, oxygen: 400, rows };
    const report = runPlaytest(level, { seeds: 30 });
    expect(report.solvableExpert).toBe(true);
    // sloppy persona should not be strictly safer than expert.
    const expert = report.perPersona.find(p => p.name === 'expert');
    const sloppy = report.perPersona.find(p => p.name === 'sloppy');
    expect(sloppy.failRate).toBeGreaterThanOrEqual(expert.failRate);
    expect(report.monotoneInSkill).toBe(true);
  });

  it('mulberry32 yields reproducible, in-range numbers', () => {
    const r1 = mulberry32(7), r2 = mulberry32(7);
    for (let i = 0; i < 5; i++) {
      const x = r1();
      expect(x).toBe(r2());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('expert never dies on a flat level via simulateRun', () => {
    const expert = PERSONAS[0];
    const run = simulateRun(flatLevel(40), expert, mulberry32(123));
    expect(run.finished).toBe(true);
    expect(run.deaths).toBe(0);
  });
});
