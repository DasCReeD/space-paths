// XMB-style crossbar menu engine: horizontal categories (X), vertical items (Y),
// fixed on-screen focal point — tracks translate to bring the focused slot to the
// focal point, the focal point itself never moves.
import { gameAudio } from './audio.js';

// Cubic ease-out, used for every position/scale/opacity tween in this engine.
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

export const TWEEN_DURATION_MS = 150;
// Hold-to-repeat timing: immediate tap, then a pause, then a fixed-rate repeat.
// No ramping/acceleration — flat rate the whole time, per spec.
const HOLD_INITIAL_DELAY_MS = 200;
const HOLD_REPEAT_INTERVAL_MS = 130;

// Fixed slot sizes (px) — must match .xmb-category width / .xmb-item height in
// index.css so a one-index translate moves exactly one slot to the focal point.
const CATEGORY_SLOT_PX = 200;
const ITEM_SLOT_PX = 56;

const ACTIVE_SCALE = 1.0;
const ACTIVE_OPACITY = 1.0;
const INACTIVE_SCALE = 0.75;
const INACTIVE_OPACITY = 0.6;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Opacity for a vertical-column item `d` rows away from the focused row. The
// row immediately adjacent to focus drops well below half so that when it sits
// behind the fixed category bar it reads as faded background rather than a
// solid-text collision; farther rows fade toward (but never to) invisible so
// the list still feels populated. Exported for unit coverage.
const ITEM_DISTANCE_OPACITY = [1.0, 0.38, 0.22, 0.13, 0.08];
export function itemOpacityForDistance(d) {
  if (d <= 0) return ITEM_DISTANCE_OPACITY[0];
  return ITEM_DISTANCE_OPACITY[Math.min(d, ITEM_DISTANCE_OPACITY.length - 1)];
}

// SFX hooks are cosmetic — a missing/throwing audio method must never abort
// navigation (this previously broke category/item switching entirely: an
// uncaught exception from a missing gameAudio.play*() mid-handleDirection
// skipped the tween retarget and label update that were supposed to run
// right after it).
function safePlay(fn) {
  try {
    if (typeof fn === 'function') fn();
  } catch (e) {
    if (typeof console !== 'undefined') console.warn('XMB SFX hook failed:', e);
  }
}

// One axis of motion (category-track X offset, or item-track Y offset).
// Holds the active tween's from/to/startTime and can report its live
// interpolated value at any instant — this is what makes retargeting safe.
class AxisTween {
  constructor() {
    this.from = 0;
    this.to = 0;
    this.startTime = 0;
    this.duration = TWEEN_DURATION_MS;
    this.current = 0; // last computed value, also the resting value when idle
  }

  // Read the interpolated value at time `now` without mutating state.
  valueAt(now) {
    if (this.duration <= 0) return this.to;
    const t = clamp((now - this.startTime) / this.duration, 0, 1);
    return this.from + (this.to - this.from) * easeOutCubic(t);
  }

  // Start a new tween toward `target`. If a tween is already in flight,
  // the new `from` is the *currently interpolated* position (read live via
  // valueAt), not the old target and not a snap to 0 — this is the
  // retarget-safety requirement that makes hold-scroll feel continuous.
  retarget(target, now) {
    this.from = this.valueAt(now);
    this.to = target;
    this.startTime = now;
  }

  isSettled(now) {
    return now - this.startTime >= this.duration;
  }
}

export class CrossbarController {
  /**
   * @param {object} config - { categories: [{ id, label, items: [{ id, label, kind, value, min, max, step, onConfirm, onAdjust }] }] }
   * @param {object} [options]
   * @param {HTMLElement} [options.categoryTrackEl] - element translated along X for category scroll
   * @param {HTMLElement} [options.itemTrackEl] - element translated along Y for item scroll
   *
   * DOM refs can also be supplied later via mount(categoryTrackEl, itemTrackEl) —
   * whichever is convenient for the caller. Both are optional at construction time
   * so a controller can exist (and be unit tested) with zero DOM.
   */
  constructor(config, options = {}) {
    this.config = config;
    this.categoryIndex = 0;
    this.itemIndex = 0;

    // Per-category remembered itemIndex, so navigating away and back restores
    // the last focused row instead of resetting to 0. Parallel array keyed by
    // category index (kept in sync with config.categories order).
    this._lastItemIndexByCategory = (config.categories || []).map(() => 0);

    this.categoryTrackEl = options.categoryTrackEl || null;
    this.itemTrackEl = options.itemTrackEl || null;

    // Horizontal anchor for the item column. Default '-50%' centres the column
    // on the focal line; PS3-layout screens pass leftAlignItems:true so the
    // column's LEFT edge sits at the focal X and items read as a left-aligned
    // list hanging under the active category (authentic XMB), paired with
    // `.xmb-focal-ps3 .xmb-item-track { align-items:flex-start }` in index.css.
    this._itemAnchorX = options.leftAlignItems ? '0px' : '-50%';

    // Vertical-column menus fade items by their distance from the focal row so
    // the rows nearest the (fixed) category bar recede into the background
    // instead of colliding with its label as solid text — the XMB "items above
    // and below the selection may fade into the background" behaviour. Grid
    // (garage) and single-row (success buttons) layouts opt out via flatItems,
    // where index-distance has no vertical meaning and graduated fade looks wrong.
    this._flatItems = !!options.flatItems;

    this._categoryTween = new AxisTween();
    this._itemTween = new AxisTween();

    this._rafHandle = null;
    this._holdTimeoutHandle = null;
    this._holdIntervalHandle = null;

    // Tracks which item/category elements currently have their label DOM node
    // inserted, so we can do a one-time remove/insert per index change instead
    // of writing to the DOM every frame.
    this._activeLabelEls = { category: null, item: null };

    this._destroyed = false;
  }

  /** Supply/replace the DOM track elements after construction. */
  mount(categoryTrackEl, itemTrackEl) {
    this.categoryTrackEl = categoryTrackEl;
    this.itemTrackEl = itemTrackEl;
  }

  get activeCategory() {
    return this.config.categories[this.categoryIndex];
  }

  get activeItem() {
    const cat = this.activeCategory;
    return cat ? cat.items[this.itemIndex] : undefined;
  }

  // ── Input API ──────────────────────────────────────────────────────────

  /**
   * @param {'horizontal'|'vertical'} axis
   * @param {1|-1} dir
   */
  handleDirection(axis, dir) {
    const cat = this.activeCategory;

    // Slider exception: when the focused item is a slider, Left/Right adjusts
    // its value instead of changing category. This is the one deliberate
    // deviation from "horizontal always changes category" — sliders need
    // Left/Right for their own value, so we intercept before any
    // category-tween/audio logic runs.
    //
    // BUT: if the slider is the only item in its category, Up/Down has
    // nothing else to reach (no toggle/action item exists to land on), so
    // intercepting Left/Right here would permanently trap the user — there'd
    // be no remaining input that changes category. In that single-item case
    // we let Left/Right fall through to normal category-switching instead,
    // and adjust the slider via Up/Down (which would otherwise be a dead
    // no-op, since there's no second item to navigate to).
    const focusedItem = cat && cat.items[this.itemIndex];
    if (focusedItem && focusedItem.kind === 'slider') {
      const isOnlyItem = cat.items.length === 1;
      const isAdjustAxis = isOnlyItem ? axis === 'vertical' : axis === 'horizontal';
      if (isAdjustAxis) {
        if (typeof focusedItem.onAdjust === 'function') focusedItem.onAdjust(dir);
        return;
      }
    }

    if (axis === 'horizontal') {
      const categories = this.config.categories;
      const nextIndex = this.categoryIndex + dir;
      if (nextIndex < 0 || nextIndex >= categories.length) {
        safePlay(() => gameAudio.playBoundaryError());
        return;
      }
      // Remember current category's item index before leaving it.
      this._lastItemIndexByCategory[this.categoryIndex] = this.itemIndex;
      this.categoryIndex = nextIndex;
      // Restore the remembered item index for the category we're entering.
      this.itemIndex = this._lastItemIndexByCategory[this.categoryIndex] || 0;
      safePlay(() => gameAudio.playHorizontalSwoosh());
      this._retargetTweens();
      this._updateLabels();
    } else {
      const items = cat ? cat.items : [];
      const nextIndex = this.itemIndex + dir;
      if (nextIndex < 0 || nextIndex >= items.length) {
        safePlay(() => gameAudio.playBoundaryError());
        return;
      }
      this.itemIndex = nextIndex;
      this._lastItemIndexByCategory[this.categoryIndex] = this.itemIndex;
      safePlay(() => gameAudio.playVerticalTick());
      this._retargetTweens();
      this._updateLabels();
    }

    this._ensureRafLoop();
  }

  /**
   * Confirms the focused item. 'action' and 'focus' kinds fire onConfirm
   * (semantically identical call shape — 'focus' is just an item that's
   * expected to hand off to a native DOM element, e.g. an <input type=color>).
   * 'slider' items are adjusted via Left/Right, not confirmed — confirm() is
   * a no-op for them so Enter on a focused slider does nothing surprising.
   * playConfirmSound() only fires when an onConfirm actually ran.
   */
  confirm() {
    const item = this.activeItem;
    if (!item || item.kind === 'slider') return;
    if ((item.kind === 'action' || item.kind === 'focus' || !item.kind) && typeof item.onConfirm === 'function') {
      item.onConfirm();
      safePlay(() => gameAudio.playConfirmSound());
    }
  }

  /**
   * Thin hook: plays the cancel sound only. The actual "go back" navigation
   * is the caller's responsibility (app.js wires this to existing back/close
   * buttons) — this method does not change any controller state.
   */
  cancel() {
    safePlay(() => gameAudio.playCancelSound());
  }

  /**
   * Begins tap-or-hold input: fires one immediate step, then after
   * HOLD_INITIAL_DELAY_MS switches to a fixed-rate repeat (no acceleration).
   * Calling startHold again before stopHold defensively calls stopHold()
   * first to avoid orphaned timers.
   */
  startHold(axis, dir) {
    this.stopHold();
    this.handleDirection(axis, dir);
    this._holdTimeoutHandle = setTimeout(() => {
      this._holdIntervalHandle = setInterval(() => {
        this.handleDirection(axis, dir);
      }, HOLD_REPEAT_INTERVAL_MS);
    }, HOLD_INITIAL_DELAY_MS);
  }

  /** Clears any pending hold timeout and/or active repeat interval. */
  stopHold() {
    if (this._holdTimeoutHandle !== null) {
      clearTimeout(this._holdTimeoutHandle);
      this._holdTimeoutHandle = null;
    }
    if (this._holdIntervalHandle !== null) {
      clearInterval(this._holdIntervalHandle);
      this._holdIntervalHandle = null;
    }
  }

  /** Cancels any pending rAF/timeout/interval. Call when a screen closes. */
  destroy() {
    this._destroyed = true;
    this.stopHold();
    if (this._rafHandle !== null) {
      cancelAnimationFrame(this._rafHandle);
      this._rafHandle = null;
    }
  }

  // ── Tween + render ───────────────────────────────────────────────────────

  _retargetTweens(now = (typeof performance !== 'undefined' ? performance.now() : Date.now())) {
    // Target offsets are the negative index*slotSize the caller's CSS expects;
    // since slot pixel size is a layout concern owned by CSS/the screen ports,
    // this engine tweens in *index units* and writes translate(calc(...)) so
    // CSS can define how big a "slot" is without this file needing layout info.
    this._categoryTween.retarget(this.categoryIndex, now);
    this._itemTween.retarget(this.itemIndex, now);
  }

  _ensureRafLoop() {
    if (this._rafHandle !== null || this._destroyed) return;
    const tick = (now) => {
      if (this._destroyed) return;
      this.render(now);
      const categorySettled = this._categoryTween.isSettled(now);
      const itemSettled = this._itemTween.isSettled(now);
      if (!categorySettled || !itemSettled) {
        this._rafHandle = requestAnimationFrame(tick);
      } else {
        this._rafHandle = null;
      }
    };
    this._rafHandle = requestAnimationFrame(tick);
  }

  /**
   * Computes both axis offsets at `now` and writes transform/scale/opacity
   * to the track + slot elements. Safe to call with no DOM mounted (tests
   * exercise the tween math directly without a render call).
   */
  render(now) {
    const categoryOffset = this._categoryTween.valueAt(now);
    const itemOffset = this._itemTween.valueAt(now);
    this._categoryTween.current = categoryOffset;
    this._itemTween.current = itemOffset;

    // Real XMB "the world moves, not the cursor": the tracks translate by fixed
    // slot sizes so the ACTIVE category/item lands on the screen-centre focal
    // point. The tracks are anchored at left:50% in CSS; the extra centring
    // offsets below put the active slot's centre exactly on that 50% line:
    //  - category: shift left by half a slot (CATEGORY_SLOT_PX/2) so the active
    //    category cell is centred, then by -index*slot to scroll it to centre.
    //  - item: translateX(-50%) centres the (variable-width) column on 50%,
    //    then translateY scrolls the active row to the focal row.
    if (this.categoryTrackEl) {
      this.categoryTrackEl.style.transform =
        `translateX(calc(-${CATEGORY_SLOT_PX / 2}px + ${-categoryOffset * CATEGORY_SLOT_PX}px))`;
    }
    if (this.itemTrackEl) {
      // translateX (`-50%` centred, or `0px` for left-aligned PS3 screens)
      // positions the column on the focal X; the Y term centres the ACTIVE row
      // on the focal line: shift up by half a row, then scroll by -index*row.
      this.itemTrackEl.style.transform =
        `translate(${this._itemAnchorX}, calc(-${ITEM_SLOT_PX / 2}px + ${-itemOffset * ITEM_SLOT_PX}px))`;
    }

    this._applyScaleOpacity();
  }

  // Exact-match-only scale/opacity: the active category/item gets scale 1 /
  // opacity 1, everything else gets scale 0.75 / opacity 0.6. No partial/near
  // tiers. This is a plain per-frame style write driven off the same rAF tick
  // (simplest option — no separate tween needed since it's a binary state).
  _applyScaleOpacity() {
    const categories = this.config.categories || [];
    categories.forEach((cat, i) => {
      if (!cat.el) return;
      const active = i === this.categoryIndex;
      cat.el.style.transform = `scale(${active ? ACTIVE_SCALE : INACTIVE_SCALE})`;
      cat.el.style.opacity = active ? String(ACTIVE_OPACITY) : String(INACTIVE_OPACITY);
    });

    const items = this.activeCategory ? this.activeCategory.items : [];
    items.forEach((item, i) => {
      if (!item.el) return;
      const active = i === this.itemIndex;
      item.el.style.transform = `scale(${active ? ACTIVE_SCALE : INACTIVE_SCALE})`;
      if (active) {
        item.el.style.opacity = String(ACTIVE_OPACITY);
      } else if (this._flatItems) {
        // Grid / row layouts: plain binary dim, no distance gradient.
        item.el.style.opacity = String(INACTIVE_OPACITY);
      } else {
        // Vertical column: fade by distance so rows near the category bar
        // read as receding background, not a collision (see _flatItems note).
        item.el.style.opacity = String(itemOpacityForDistance(Math.abs(i - this.itemIndex)));
      }
    });
  }

  // Label-only-on-focus: the active item's label text node is the only one
  // that exists in the DOM. Each time the active index changes we remove the
  // label span from whatever was previously active and create+insert it on
  // the newly active element — a one-time DOM mutation per index change, not
  // a per-frame operation.
  _updateLabels() {
    if (this._activeLabelEls.item && this._activeLabelEls.item.parentNode) {
      this._activeLabelEls.item.parentNode.removeChild(this._activeLabelEls.item);
    }
    this._activeLabelEls.item = null;

    const item = this.activeItem;
    if (item && item.el && typeof document !== 'undefined') {
      const span = document.createElement('span');
      span.className = 'xmb-item-label';
      span.textContent = item.label;
      item.el.appendChild(span);
      this._activeLabelEls.item = span;
    }

    if (this._activeLabelEls.category && this._activeLabelEls.category.parentNode) {
      this._activeLabelEls.category.parentNode.removeChild(this._activeLabelEls.category);
    }
    this._activeLabelEls.category = null;

    const cat = this.activeCategory;
    if (cat && cat.el && typeof document !== 'undefined') {
      const span = document.createElement('span');
      span.className = 'xmb-category-label';
      span.textContent = cat.label;
      cat.el.appendChild(span);
      this._activeLabelEls.category = span;
    }
  }
}
