// Tests for the CrossbarController (XMB-style menu engine) in xmbMenu.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../audio.js', () => ({
  gameAudio: {
    playVerticalTick: vi.fn(),
    playHorizontalSwoosh: vi.fn(),
    playConfirmSound: vi.fn(),
    playCancelSound: vi.fn(),
    playBoundaryError: vi.fn(),
  }
}));

import { CrossbarController, easeOutCubic } from '../xmbMenu.js';
import { gameAudio } from '../audio.js';

function makeConfig() {
  return {
    categories: [
      {
        id: 'play', label: 'PLAY',
        items: [
          { id: 'standard', label: 'Standard Pack', kind: 'action', onConfirm: vi.fn() },
          { id: 'sfx-volume', label: 'SFX Volume', kind: 'slider', value: 0.5, min: 0, max: 1, step: 0.05, onAdjust: vi.fn() },
        ]
      },
      {
        id: 'extras', label: 'EXTRAS',
        items: [
          { id: 'how-to', label: 'How To Play', kind: 'action', onConfirm: vi.fn() },
        ]
      },
    ]
  };
}

describe('easeOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeOutCubic(0)).toBe(0);
  });

  it('returns 0.875 at t=0.5', () => {
    // 1 - (1-0.5)^3 = 1 - 0.125 = 0.875
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 10);
  });

  it('returns 1 at t=1', () => {
    expect(easeOutCubic(1)).toBe(1);
  });
});

describe('CrossbarController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with categoryIndex 0 and itemIndex 0', () => {
    const ctrl = new CrossbarController(makeConfig());
    expect(ctrl.categoryIndex).toBe(0);
    expect(ctrl.itemIndex).toBe(0);
  });

  // ── Item-column horizontal anchor (centred vs PS3 left-aligned) ────────────

  it('centres the item column by default (translateX -50%)', () => {
    const itemTrackEl = { style: {} };
    const ctrl = new CrossbarController(makeConfig(), { itemTrackEl });
    ctrl.render(0);
    expect(itemTrackEl.style.transform).toContain('translate(-50%');
  });

  it('left-aligns the item column when leftAlignItems is set (translateX 0px)', () => {
    const itemTrackEl = { style: {} };
    const ctrl = new CrossbarController(makeConfig(), { itemTrackEl, leftAlignItems: true });
    ctrl.render(0);
    expect(itemTrackEl.style.transform).toContain('translate(0px,');
    expect(itemTrackEl.style.transform).not.toContain('-50%');
  });

  // ── Retarget-safety ───────────────────────────────────────────────────────

  it('a tween retargeted mid-flight starts from the live interpolated value, not a snap', () => {
    const ctrl = new CrossbarController(makeConfig());
    const now0 = 1000;

    // Start a tween from 0 -> 1 (simulating a vertical move within bounds isn't
    // possible on this config's first category since item 1 is a slider; use
    // the category axis instead, which has 2 entries).
    ctrl._categoryTween.retarget(1, now0);

    // Read the interpolated value partway through the 150ms tween.
    const midTime = now0 + 60; // 60ms into a 150ms tween
    const expectedMidValue = ctrl._categoryTween.valueAt(midTime);

    // Retarget again at exactly midTime, before the first tween settled.
    ctrl._categoryTween.retarget(0, midTime);

    // The new tween's `from` must equal what render()/valueAt() produced
    // just before the retarget — not 1 (old target) and not 0 (a snap).
    expect(ctrl._categoryTween.from).toBeCloseTo(expectedMidValue, 10);
    expect(ctrl._categoryTween.from).not.toBe(0);
    expect(ctrl._categoryTween.from).not.toBe(1);
  });

  // ── Boundary clamping ─────────────────────────────────────────────────────

  it('clamps at the last item and calls playBoundaryError instead of moving past it', () => {
    const ctrl = new CrossbarController(makeConfig());
    ctrl.categoryIndex = 1; // 'extras' category has only 1 item
    ctrl.itemIndex = 0;

    ctrl.handleDirection('vertical', 1);

    expect(ctrl.itemIndex).toBe(0);
    expect(gameAudio.playBoundaryError).toHaveBeenCalledTimes(1);
    expect(gameAudio.playVerticalTick).not.toHaveBeenCalled();
  });

  it('clamps at the first category and calls playBoundaryError instead of moving past it', () => {
    const ctrl = new CrossbarController(makeConfig());
    expect(ctrl.categoryIndex).toBe(0);

    ctrl.handleDirection('horizontal', -1);

    expect(ctrl.categoryIndex).toBe(0);
    expect(gameAudio.playBoundaryError).toHaveBeenCalledTimes(1);
    expect(gameAudio.playHorizontalSwoosh).not.toHaveBeenCalled();
  });

  // ── Slider exception ──────────────────────────────────────────────────────

  it('routes horizontal input to onAdjust when the focused item is a slider, without changing category', () => {
    const config = makeConfig();
    const ctrl = new CrossbarController(config);
    ctrl.itemIndex = 1; // the slider item in 'play'

    ctrl.handleDirection('horizontal', 1);

    expect(ctrl.categoryIndex).toBe(0);
    expect(config.categories[0].items[1].onAdjust).toHaveBeenCalledWith(1);
    expect(gameAudio.playHorizontalSwoosh).not.toHaveBeenCalled();
  });

  it('does not trap navigation when a slider is the ONLY item in its category: horizontal still changes category', () => {
    // Regression test for the 'audio' settings category dead-end: a
    // single-item slider category used to swallow Left/Right forever (no
    // other item exists to Up/Down to and "escape" through), making the
    // category permanently stuck. Horizontal must fall through to normal
    // category-switching when the slider has no sibling items.
    const config = {
      categories: [
        { id: 'game', label: 'GAME', items: [
          { id: 'rewind', label: 'Rewind', kind: 'action', onConfirm: vi.fn() },
        ] },
        { id: 'audio', label: 'AUDIO', items: [
          { id: 'sfx-volume', label: 'SFX Volume', kind: 'slider', value: 0.5, min: 0, max: 1, step: 0.05, onAdjust: vi.fn() },
        ] },
        { id: 'controls', label: 'CONTROLS', items: [
          { id: 'mouse-play', label: 'Mouse Play', kind: 'action', onConfirm: vi.fn() },
        ] },
      ]
    };
    const ctrl = new CrossbarController(config);
    ctrl.categoryIndex = 1; // 'audio', focused on its sole slider item
    ctrl.itemIndex = 0;

    ctrl.handleDirection('horizontal', 1);

    expect(ctrl.categoryIndex).toBe(2); // advanced to 'controls', not trapped
    expect(config.categories[1].items[0].onAdjust).not.toHaveBeenCalled();
    expect(gameAudio.playHorizontalSwoosh).toHaveBeenCalled();
  });

  it('adjusts a single-item slider category via vertical input instead, since horizontal is freed for category-switching', () => {
    const config = {
      categories: [
        { id: 'audio', label: 'AUDIO', items: [
          { id: 'sfx-volume', label: 'SFX Volume', kind: 'slider', value: 0.5, min: 0, max: 1, step: 0.05, onAdjust: vi.fn() },
        ] },
      ]
    };
    const ctrl = new CrossbarController(config);

    ctrl.handleDirection('vertical', 1);

    expect(config.categories[0].items[0].onAdjust).toHaveBeenCalledWith(1);
    expect(gameAudio.playVerticalTick).not.toHaveBeenCalled();
  });

  // ── confirm / cancel ───────────────────────────────────────────────────────

  it('confirm() calls onConfirm and plays the confirm sound for an action item', () => {
    const config = makeConfig();
    const ctrl = new CrossbarController(config);

    ctrl.confirm();

    expect(config.categories[0].items[0].onConfirm).toHaveBeenCalledTimes(1);
    expect(gameAudio.playConfirmSound).toHaveBeenCalledTimes(1);
  });

  it('confirm() is a no-op for a focused slider item (no onConfirm, no sound)', () => {
    const ctrl = new CrossbarController(makeConfig());
    ctrl.itemIndex = 1; // slider

    ctrl.confirm();

    expect(gameAudio.playConfirmSound).not.toHaveBeenCalled();
  });

  it('cancel() only plays the cancel sound and does not touch state', () => {
    const ctrl = new CrossbarController(makeConfig());
    const before = { categoryIndex: ctrl.categoryIndex, itemIndex: ctrl.itemIndex };

    ctrl.cancel();

    expect(gameAudio.playCancelSound).toHaveBeenCalledTimes(1);
    expect(ctrl.categoryIndex).toBe(before.categoryIndex);
    expect(ctrl.itemIndex).toBe(before.itemIndex);
  });

  // ── startHold / stopHold sequencing ──────────────────────────────────────

  it('startHold fires one immediate step, waits 200ms, then repeats at a fixed rate until stopHold', () => {
    const ctrl = new CrossbarController(makeConfig());
    ctrl.categoryIndex = 1; // so horizontal -1 has room to move back to 0
    const spy = vi.spyOn(ctrl, 'handleDirection');

    ctrl.startHold('horizontal', -1);
    // Immediate tap step.
    expect(spy).toHaveBeenCalledTimes(1);

    // No second step before the 200ms initial delay elapses.
    vi.advanceTimersByTime(199);
    expect(spy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1); // crosses the 200ms mark
    // At t=200ms the setInterval is armed but hasn't fired yet (interval fires after its own delay).
    expect(spy).toHaveBeenCalledTimes(1);

    // First fixed-rate repeat.
    vi.advanceTimersByTime(130);
    expect(spy).toHaveBeenCalledTimes(2);

    // Second fixed-rate repeat.
    vi.advanceTimersByTime(130);
    expect(spy).toHaveBeenCalledTimes(3);

    ctrl.stopHold();

    // Advancing further after stop produces no additional calls.
    vi.advanceTimersByTime(1000);
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('calling startHold again before stopHold clears the previous timers (no orphaned double-fire)', () => {
    const ctrl = new CrossbarController(makeConfig());
    ctrl.categoryIndex = 1;
    const spy = vi.spyOn(ctrl, 'handleDirection');

    ctrl.startHold('horizontal', -1);
    expect(spy).toHaveBeenCalledTimes(1);

    // Re-trigger before the hold's initial delay elapses.
    ctrl.startHold('horizontal', -1);
    expect(spy).toHaveBeenCalledTimes(2); // the second startHold's immediate tap

    vi.advanceTimersByTime(200);
    vi.advanceTimersByTime(130);
    // Only one interval should be running, not two stacked ones.
    const callsAfterOneRepeat = spy.mock.calls.length;
    vi.advanceTimersByTime(130);
    expect(spy.mock.calls.length).toBe(callsAfterOneRepeat + 1);

    ctrl.stopHold();
  });
});
