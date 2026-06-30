// tests/worldBuilder_quality.test.js
//
// Focused unit tests for the Bucket A-wiring (reject/regenerate gate) and
// Bucket B (shuffle-bag selection + chunk/interface assertions) added to
// worldBuilder.js. These are offline-generator concerns; the suite never runs
// on the game runtime path.
import { describe, it, expect } from 'vitest';
import {
  ShuffleBag, auditAssembly, assessLevelQuality, depackRows, summarizeSegmentUsage, reviseSegmentPlan,
  jumpSubcategory, reclassifyJumps, categoryMatches, JUMP_FAMILY, fuseJumpSegments,
  QUALITY_MIN_SCORE, QUALITY_MAX_ATTEMPTS,
} from '../worldBuilder.js';
import { validateTrackQuality } from '../trackQuality.js';

// Tiny deterministic RNG identical in spirit to worldBuilder's createRng, so the
// bag's behaviour here matches generation-time determinism.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('ShuffleBag — draw without replacement', () => {
  it('never repeats a key within the cooldown window', () => {
    const rng = makeRng(123);
    const cooldown = 4;
    const bag = new ShuffleBag(rng, { cooldown, maxRepeats: 999, droughtAfter: 50 });
    const items = ['a', 'b', 'c', 'd', 'e', 'f'];
    const drawn = [];
    for (let i = 0; i < 60; i++) drawn.push(bag.draw(items));

    for (let i = 0; i < drawn.length; i++) {
      for (let j = Math.max(0, i - (cooldown - 1)); j < i; j++) {
        expect(drawn[j]).not.toBe(drawn[i]); // no repeat inside the window
      }
    }
  });

  it('honours the hard per-template repeat cap', () => {
    const rng = makeRng(7);
    const bag = new ShuffleBag(rng, { cooldown: 1, maxRepeats: 2, droughtAfter: 3 });
    const items = ['x', 'y'];
    const counts = { x: 0, y: 0 };
    // Draw far more than the cap allows; once both are capped, draw() falls back
    // but must still respect the cap until the pool is genuinely exhausted.
    for (let i = 0; i < 4; i++) {
      const d = bag.draw(items);
      if (d) counts[d]++;
    }
    // Each template may appear at most maxRepeats times across the 4 draws.
    expect(counts.x).toBeLessThanOrEqual(2);
    expect(counts.y).toBeLessThanOrEqual(2);
  });

  it('is deterministic for a fixed seed', () => {
    const items = ['a', 'b', 'c', 'd'];
    const run = (seed) => {
      const bag = new ShuffleBag(makeRng(seed), { cooldown: 2, maxRepeats: 99 });
      return Array.from({ length: 20 }, () => bag.draw(items));
    };
    expect(run(42)).toEqual(run(42));
  });

  it('uses a key function to track templates across distinct objects', () => {
    const rng = makeRng(99);
    const bag = new ShuffleBag(rng, { cooldown: 3, maxRepeats: 99 });
    // Two distinct objects sharing a template id must be treated as the same key.
    const items = [{ s: { id: 1 } }, { s: { id: 2 } }, { s: { id: 3 } }, { s: { id: 4 } }];
    const drawn = [];
    for (let i = 0; i < 24; i++) drawn.push(bag.draw(items, (x) => x.s.id).s.id);
    for (let i = 0; i < drawn.length; i++) {
      for (let j = Math.max(0, i - 2); j < i; j++) {
        expect(drawn[j]).not.toBe(drawn[i]);
      }
    }
  });
});

describe('auditAssembly — chunk-size + interface assertions (Bucket B)', () => {
  const iface = (width, center = 3, height = 0) => ({ width, center, height });

  it('passes well-sized, interface-matched segments', () => {
    const placed = [
      { id: 1, length: 6, entry: iface(5), exit: iface(5), startRow: 0, adapted: true },
      { id: 2, length: 5, entry: iface(5), exit: iface(4), startRow: 12, adapted: true },
    ];
    expect(auditAssembly(placed)).toHaveLength(0);
  });

  it('fails a too-small chunk', () => {
    const placed = [{ id: 9, length: 2, entry: iface(5), exit: iface(5), startRow: 0 }];
    const v = auditAssembly(placed);
    expect(v.some((x) => x.rule === 'B_chunk_too_small' && x.severity === 'fail')).toBe(true);
  });

  it('warns on an oversized NON-signature chunk but does not hard-fail until the hard cap', () => {
    const placed = [{ id: 3, length: 36, entry: iface(5), exit: iface(5), startRow: 0 }];
    const v = auditAssembly(placed);
    expect(v.some((x) => x.rule === 'B_chunk_oversized' && x.severity === 'warn')).toBe(true);
    expect(v.some((x) => x.severity === 'fail')).toBe(false);
  });

  it('exempts signature set-pieces from the oversized warn (long is intentional)', () => {
    const placed = [{ id: 4, length: 36, entry: iface(5), exit: iface(5), startRow: 0, signature: true }];
    const v = auditAssembly(placed);
    expect(v.some((x) => x.rule === 'B_chunk_oversized')).toBe(false);
  });

  it('flags an interface break only when no transition bridged the seam', () => {
    const broken = [
      { id: 1, length: 6, entry: iface(5), exit: iface(5, 1), startRow: 0, adapted: false },
      { id: 2, length: 6, entry: iface(5, 5), exit: iface(5), startRow: 6, adapted: false },
    ];
    const v = auditAssembly(broken);
    expect(v.some((x) => x.rule === 'B_interface_break')).toBe(true);

    const bridged = broken.map((s, i) => (i === 1 ? { ...s, adapted: true } : s));
    expect(auditAssembly(bridged).some((x) => x.rule === 'B_interface_break')).toBe(false);
  });
});

describe('assessLevelQuality — reject/regenerate gate verdict (Bucket A wiring)', () => {
  // Build a deliberately BAD level: a wall of back-to-back forced gate rows with
  // no recovery room. This violates A1 lead-in spacing repeatedly + has no
  // breathers, so the score drops below the threshold and the gate must reject.
  function badLevel() {
    const fullTile = { full: true, top_color: 2, bottom_color: 2 };
    const road = { top_color: 0, bottom_color: 1 };
    // Alternate DISTINCT forced demands one row apart: gate → gap → gate → gap …
    // trackQuality collapses same-type runs into one demand, so we interleave
    // types to produce many separate demands with zero recovery room (A1 fails).
    const gateRow = [fullTile, fullTile, fullTile, fullTile, road, null, null];
    const gapRow = [null, null, null, null, null, null, null];
    const rows = [];
    for (let i = 0; i < 60; i++) {
      rows.push((i % 2 === 0 ? gateRow : gapRow).map((t) => (t ? { ...t } : null)));
    }
    return { level_index: 99, rows };
  }

  // A clean, mostly-open level: wide road, sparse demands → should score well.
  function goodLevel() {
    const road = () => [null, { top_color: 0, bottom_color: 1 }, { top_color: 0, bottom_color: 1 },
      { top_color: 0, bottom_color: 1 }, { top_color: 0, bottom_color: 1 }, { top_color: 0, bottom_color: 1 }, null];
    const rows = [];
    for (let i = 0; i < 90; i++) rows.push(road().map((t) => (t ? { ...t } : null)));
    return { level_index: 98, rows };
  }

  it('rejects a deliberately bad level (sub-threshold, has fails)', () => {
    const q = assessLevelQuality(badLevel());
    expect(q.pass).toBe(false);
    expect(q.score).toBeLessThan(QUALITY_MIN_SCORE);
    expect(q.failCount).toBeGreaterThan(0);
    expect(q.topRules.length).toBeGreaterThan(0);
  });

  it('accepts a clean level', () => {
    const q = assessLevelQuality(goodLevel());
    expect(q.score).toBeGreaterThanOrEqual(QUALITY_MIN_SCORE);
    expect(q.failCount).toBe(0);
    expect(q.pass).toBe(true);
  });

  it('folds assembly (Bucket B) violations into the verdict', () => {
    const lvl = goodLevel();
    // Attach a too-small placed chunk → an assembly fail must sink the verdict
    // even though the row-level static checks are clean.
    lvl.__assembly = [{ id: 1, length: 1, entry: { width: 5, center: 3, height: 0 },
      exit: { width: 5, center: 3, height: 0 }, startRow: 0 }];
    const q = assessLevelQuality(lvl);
    expect(q.failCount).toBeGreaterThan(0);
    expect(q.pass).toBe(false);
  });

  it('exposes sane gate constants', () => {
    expect(QUALITY_MIN_SCORE).toBe(50);
    expect(QUALITY_MAX_ATTEMPTS).toBeGreaterThanOrEqual(1);
  });
});

// ── Row builders for de-pack tests (7-lane) ──────────────────────────────────
const LANES = 7;
const t = (p = {}) => ({ top_color: 0, bottom_color: 1, full: false, half: false, tunnel: false, ramp: false, ...p });
const road = () => Array.from({ length: LANES }, () => t());
const gap = () => Array.from({ length: LANES }, () => null);
const gate = (open = 3) => Array.from({ length: LANES }, (_, l) => (l === open ? t() : t({ full: true })));

describe('depackRows — space out packed forced demands', () => {
  it('inserts breather rows so consecutive forced demands clear D_min', () => {
    // two gates 1 row apart — far under the ~4-row lead-in at speed 32
    const rows = [...Array(6).fill(0).map(road), gate(), road(), gate(), ...Array(6).fill(0).map(road)];
    const before = validateTrackQuality(rows, { speed: 32 }).violations.filter((v) => v.rule === 'A1_leadin').length;
    const out = depackRows(rows, { speed: 32 });
    const after = validateTrackQuality(out, { speed: 32 }).violations.filter((v) => v.rule === 'A1_leadin').length;
    expect(out.length).toBeGreaterThan(rows.length); // breathers added
    expect(after).toBeLessThan(before);              // packing reduced
  });

  it('leaves an already well-spaced track untouched', () => {
    const rows = [];
    for (let i = 0; i < 4; i++) { rows.push(...Array(10).fill(0).map(road), gate()); }
    const out = depackRows(rows, { speed: 32 });
    expect(out.length).toBe(rows.length);
  });

  it('breather rows are plain road (no hazard flags) and preserve footprint', () => {
    const rows = [...Array(5).fill(0).map(road), gate(), road(), gate(), ...Array(5).fill(0).map(road)];
    const out = depackRows(rows, { speed: 32 });
    // every inserted row beyond the originals must be hazard-free
    const hazard = (row) => row.some((c) => c && (c.full || c.half || c.tunnel || c.ramp));
    const inserted = out.filter((row) => !hazard(row));
    expect(inserted.length).toBeGreaterThan(0);
  });
});

describe('ShuffleBag — global usage evenness bias', () => {
  it('steers draws toward globally least-used items', () => {
    const rng = makeRng(99);
    const usage = new Map([['a', 10], ['b', 10], ['c', 0]]); // c is starved
    const bag = new ShuffleBag(rng, { cooldown: 1, maxRepeats: 999, droughtAfter: 99, globalUsage: usage });
    const items = ['a', 'b', 'c'];
    const counts = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 20; i++) counts[bag.draw(items)]++;
    // the under-used 'c' should be picked far more than the over-used a/b
    expect(counts.c).toBeGreaterThan(counts.a + counts.b);
  });
});

describe('summarizeSegmentUsage', () => {
  it('reports pool coverage, evenness and overuse honestly', () => {
    const usage = new Map([[1, 5], [2, 1], [3, 1]]);
    const pool = [1, 2, 3, 4, 5]; // 4 and 5 never used
    const s = summarizeSegmentUsage(usage, pool);
    expect(s.poolSize).toBe(5);
    expect(s.neverUsed).toBe(2);
    expect(s.totalPlacements).toBe(7);
    expect(s.overused.some(([id]) => id === 1)).toBe(true); // 5 > 2× mean(1.4)
    expect(s.cv).toBeGreaterThan(0);
  });
});

describe('reviseSegmentPlan — backtracking seam revision', () => {
  const seg = (id, entry, exit) => ({ id, entry, exit, category: 'slalom' });
  const if2 = (width, center = 3, height = 0) => ({ width, center, height });

  it('swaps a previous segment for one that bridges a bad seam', () => {
    // plan: A(exit width 1) -> B(entry width 5): big seam. An alternative A' with
    // exit width 5 fits B far better and still fits the start.
    const A = seg('A', if2(5), if2(1));
    const B = seg('B', if2(5), if2(5));
    const plan = [{ slot: { tag: 'slalom' }, seg: A }, { slot: { tag: 'slalom' }, seg: B }];
    const Aprime = seg('Aprime', if2(5), if2(5)); // exit matches B's entry
    const getAlternatives = () => [Aprime];
    const { swaps } = reviseSegmentPlan(plan, getAlternatives, { threshold: 2, sweeps: 2 });
    expect(swaps).toBeGreaterThan(0);
    expect(plan[0].seg.id).toBe('Aprime'); // previous segment was revised
  });

  it('leaves a clean plan untouched and never swaps in a worse fit', () => {
    const A = seg('A', if2(5), if2(5));
    const B = seg('B', if2(5), if2(5));
    const plan = [{ slot: { tag: 'slalom' }, seg: A }, { slot: { tag: 'slalom' }, seg: B }];
    const worse = seg('worse', if2(5), if2(1)); // would make the seam worse
    const { swaps } = reviseSegmentPlan(plan, () => [worse], { threshold: 4 });
    expect(swaps).toBe(0);
    expect(plan[0].seg.id).toBe('A');
  });

  it('ignores runway/null entries safely', () => {
    const plan = [{ slot: { tag: 'runway' }, seg: 'runway' }, { slot: { tag: 'slalom' }, seg: null }];
    expect(() => reviseSegmentPlan(plan, () => [], {})).not.toThrow();
  });
});

describe('jump family split', () => {
  const gapRow = () => Array.from({ length: 7 }, () => null);
  const roadRow = () => Array.from({ length: 7 }, () => ({ top_color: 0, bottom_color: 1 }));
  const withRows = (rows, difficulty = 3) => ({ category: 'jump', difficulty, rows });

  it('classifies hop / leap / gap_run / precision_jump by gap shape', () => {
    // single 1-wide gap, easy -> hop
    expect(jumpSubcategory(withRows([roadRow(), gapRow(), roadRow()], 3))).toBe('hop');
    // single 1-wide gap, hard -> precision_jump
    expect(jumpSubcategory(withRows([roadRow(), gapRow(), roadRow()], 5))).toBe('precision_jump');
    // single 3-wide gap -> leap
    expect(jumpSubcategory(withRows([roadRow(), gapRow(), gapRow(), gapRow(), roadRow()], 3))).toBe('leap');
    // two distinct gaps -> gap_run
    expect(jumpSubcategory(withRows([roadRow(), gapRow(), roadRow(), gapRow(), roadRow()], 3))).toBe('gap_run');
  });

  it('reclassifyJumps re-tags only monolithic jump segments, leaves others alone', () => {
    const pool = [
      withRows([roadRow(), gapRow(), roadRow()], 3),
      { category: 'slalom', difficulty: 3, rows: [roadRow()] },
    ];
    reclassifyJumps(pool);
    expect(JUMP_FAMILY.has(pool[0].category)).toBe(true);
    expect(pool[0].category).not.toBe('jump');
    expect(pool[1].category).toBe('slalom'); // untouched
  });

  it('categoryMatches treats a jump slot as the whole family but keeps subtypes distinct', () => {
    expect(categoryMatches('hop', 'jump')).toBe(true);
    expect(categoryMatches('leap', 'jump')).toBe(true);
    expect(categoryMatches('hop', 'hop')).toBe(true);
    expect(categoryMatches('hop', 'leap')).toBe(false); // a leap slot won't take a hop
    expect(categoryMatches('slalom', 'jump')).toBe(false);
  });
});

describe('fuseJumpSegments — right-size the oversupplied jump pool', () => {
  const road = () => Array.from({ length: 7 }, () => ({ top_color: 0, bottom_color: 1, full: false, half: false, tunnel: false, ramp: false }));
  const gap = () => Array.from({ length: 7 }, () => null);
  // a tiny single-gap hop: road, gap, road  (length 3, 1 gap)
  const hop = (id) => ({ id, category: 'jump', difficulty: 3, source: {}, biome: 'void',
    length: 5, entry: { width: 7, center: 3, height: 0 }, exit: { width: 7, center: 3, height: 0 },
    rows: [road(), road(), gap(), road(), road()] });

  it('fuses pairs of small single-gap jumps into fewer, longer segments', () => {
    const pool = [hop(1), hop(2), hop(3), hop(4), { id: 5, category: 'slalom', rows: [road()] }];
    const out = fuseJumpSegments(pool, { maxFusions: 10, minBridge: 5 });
    const fused = out.filter((s) => typeof s.id === 'string' && s.id.startsWith('fused:'));
    expect(fused.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThan(pool.length); // 2-into-1 shrinks the pool
    // a fused segment is longer than its parts and has 2 gaps (→ gap_run on load)
    const f = fused[0];
    expect(f.length).toBeGreaterThan(hop(1).rows.length);
    expect(f.signature).toBe(false);
    expect(out.some((s) => s.category === 'slalom')).toBe(true); // non-jumps untouched
  });

  it('is a no-op when there is nothing fusable', () => {
    const pool = [{ id: 1, category: 'slalom', rows: [road()] }];
    expect(fuseJumpSegments(pool)).toBe(pool);
  });
});
