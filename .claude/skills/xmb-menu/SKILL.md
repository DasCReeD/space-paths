---
name: xmb-menu
description: >
  Redesigns this game's menu system into a PS3 XrossMediaBar (XMB) style
  fixed-focus crossbar UI: horizontal categories + vertical sub-items,
  world-moves-not-cursor navigation, strict scale/opacity/easing specs, and
  audio hooks. Use when the user asks to redesign, rebuild, or restyle the
  menu/main menu/menu system as an "XMB", "crossbar", "PS3-style", or
  "10-foot UI" menu, or references "design guide.md" for the menu redesign.
license: MIT
---

# XMB Menu Redesign

You are implementing a PlayStation 3 XrossMediaBar-style menu for this
project. This is a **vanilla JS / HTML5 canvas game** (`app.js`,
`index.html`, `audio.js`, `graphics.js`) — not Unity/Godot/Unreal. Translate
the spec below into DOM + CSS transforms + `requestAnimationFrame`, reusing
the project's existing patterns rather than introducing a framework.

Full design rationale lives in [design guide.md](../../../design%20guide.md)
at the repo root — read it once for context, but treat the numbers in this
file as the binding contract (they're the condensed, code-ready version).

## Current state to replace

`app.js` currently drives menus as a stack of `.overlay-screen.glass-card`
divs (`#menu-screen`, `#level-screen`, `#ship-picker-screen`, etc.), each
with a flat `.menu-buttons` list. Navigation is `handleMenuKeyboard` /
`handleLevelSelectKeyboard` / `handleShipPickerKeyboard`, all walking a flat
`buttons` array with `selectedMenuIndex` and calling `highlightMenuButton`.
Gamepad input already arrives pre-decoded as `gp.menuUp/menuDown/menuLeft/
menuRight/menuSelect/menuCancel` (see the gamepad polling block in `app.js`).

The redesign keeps that same upstream input decoding (keyboard codes +
`gp.menu*` booleans) but replaces the per-screen flat-list logic with one
shared crossbar component: horizontal categories (top-level screens:
Campaign/Level Select, Ship Picker, Settings, Extras, etc.) each owning a
vertical list of items (existing `.btn` / `.level-item` / `.skin-option`
content, re-skinned as XMB rows).

## Required architecture

1. **Data structure** — one JS array/JSON describing the whole bar:
   ```js
   const XMB_MENU = [
     { id: 'campaign', label: 'Campaign', icon: '...', items: [
       { id: 'level-select', label: 'Level Select', action: () => app.showLevelSelect() },
       { id: 'continue', label: 'Continue', action: () => app.continueRun() },
     ]},
     { id: 'garage', label: 'Garage', items: [ /* ship picker rows */ ] },
     { id: 'settings', label: 'Settings', items: [ /* settings rows */ ] },
   ];
   ```
   Keep this in its own module (e.g. `menuConfig.js`) so adding a
   category/item never touches navigation or render code.

2. **State** — `{ categoryIndex, itemIndex }` only. No DOM querying for
   "current selection"; the data structure + two indices are the single
   source of truth. Each category remembers its own last `itemIndex` when
   you leave and return to it.

3. **Fixed focal point** — one CSS anchor at `left: 30%; top: 40%`. The
   horizontal category row and the active vertical item list are each a
   `position: absolute` track inside that anchor; navigation never moves the
   anchor, it moves the tracks via `transform: translate(Xpx, Ypx)` so the
   target slot lands on the anchor.

4. **Animation** — drive the translate/scale/opacity with `requestAnimationFrame`
   (the project already runs an RAF loop in `app.js`; piggyback a small tween
   queue rather than relying on raw CSS `transition`, because hold-scroll
   needs to be interruptible mid-flight without a snap-back glitch).
   Cubic ease-out, exactly **150ms** per step, zero overshoot:
   ```js
   const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
   ```

## Visual state contract (exact numbers)

| Element | Scale | Opacity | Label visible? |
|---|---|---|---|
| Active vertical item (at focal point) | 1.0 | 1.0 | yes |
| Inactive vertical item | 0.75 | 0.6 | no |
| Active horizontal category | 1.0 | 1.0 | yes |
| Inactive horizontal category | 0.75 | 0.6 | no |

Lerp every transform/opacity change, never snap, using the 150ms ease-out
above. Render the label `<span>` only for the focused item — don't just
`opacity: 0` it, actually skip rendering it (the spec calls for low
information density, not invisible clutter sitting in the DOM).

## Input logic (tap vs hold)

- **Tap** (keydown → keyup before repeat fires): move exactly one index,
  wrap or clamp to match this project's existing convention per list (check
  whether the screen you're touching currently wraps — `handleLevelSelectKeyboard`
  wraps with modulo; preserve that unless told otherwise).
- **Hold**: first step fires immediately on keydown, then wait **200ms**,
  then repeat at a **fixed** interval (no ramp-up) until keyup. Implement
  with one `setTimeout` for the initial delay chained into one `setInterval`
  for the fixed-rate phase — do not use a gradually-shrinking interval.
- Clear both timers on keyup / blur / screen change to avoid orphaned
  repeats firing into a different menu.

## Audio hooks

Add stub methods to `audio.js` (alongside the existing `gameAudio.playClick()`
pattern) and call them from the crossbar component:

```js
playVerticalTick() {}    // vertical move, <50ms, soft attack, no reverb
playHorizontalSwoosh() {} // category change, airy whoosh
playConfirmSound() {}     // select/enter
playCancelSound() {}      // back/escape
playBoundaryError() {}    // hit top/bottom/edge of a list
```
Leave bodies empty (or wire to existing SFX as placeholders) — the user
attaches real clips later. Call `playBoundaryError()` instead of moving the
index when a clamp would go out of bounds; call the others at the matching
input edge.

## What NOT to change

- Don't touch `physics.js` / `graphics.js` / `levelLoader.js` — this is a
  menu/UI task only.
- Don't introduce a UI framework (React, etc.) — stay vanilla JS/DOM/CSS to
  match the rest of the codebase.
- Don't rewire the gamepad polling itself; consume the existing `gp.menu*`
  booleans, same as today.

## Verification

After implementing, use the `run` skill (or manually serve `index.html`) and
check: focal point never moves, label only shows on the focused item, hold
produces an immediate step + 200ms pause + fixed-rate scroll (not ramping),
and each audio hook fires at the right edge (check via console.log stubs
before wiring real clips).
