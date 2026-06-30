---
name: project_xmb_settings_input_model
description: XMB settings menu (xmbMenu.js CrossbarController) has an axis-swap rule for single-item slider categories — Up/Down adjusts the slider instead of Left/Right, to avoid a navigation dead-end.
metadata:
  type: project
---

`xmbMenu.js` `CrossbarController.handleDirection(axis, dir)` normally routes
horizontal (Left/Right) input to a focused slider's `onAdjust(dir)` instead of
changing category — this is "the slider exception," documented inline at the
top of `handleDirection`.

**Exception to the exception**: if a slider is the ONLY item in its category
(e.g. the `audio` category in `menuConfig.js`, which has just `sfx-volume`),
intercepting Left/Right would permanently trap keyboard/gamepad navigation —
there's no second item to Up/Down to as an escape route, and Left/Right would
never reach category-switching again. Fixed 2026-06-21: in that single-item
case, Left/Right falls through to normal category-switching, and the slider
is adjusted via Up/Down instead (which is otherwise a dead no-op in a
1-item category).

So: in `menuConfig.js`, a category's input convention depends on item count:
- Categories with 2+ items (e.g. `visuals`: 5 sliders + 4 toggles) — sliders
  still use Left/Right to adjust, Up/Down to move between items (unchanged).
- Categories with exactly 1 item that is a slider (e.g. `audio`) — Up/Down
  adjusts the slider, Left/Right changes category.

**Why this matters for visual QA**: don't flag "Left/Right does nothing on
the SFX Volume slider" as a bug if it's the sole item in the `audio`
category — that's by design now. Verify adjustment via Up/Down instead.
If a future menuConfig.js change adds a second item to `audio` (or removes
items from `visuals` down to just one slider), re-check this assumption,
since the axis convention is keyed off `cat.items.length === 1`, not the
category id.

Tests covering this: `tests/xmbMenu.test.js`, in the "Slider exception"
describe block — look for the single-item-category regression tests.

No project-wide visual QA / screenshot npm script was found by name; the
closest is `playtests/run_playtest.js`, invoked via `tests/playtest_run.test.js`
(part of `npm test` / `vitest run`), which drives Puppeteer through main
menu, settings, garage, level select, gameplay, and touch customizer at both
desktop (default puppeteer viewport) and a mobile viewport (375x812),
saving screenshots like `menu_main.png`, `menu_settings_mobile.png`, etc.
Ad-hoc one-off interactive checks in this project are written as throwaway
`playtests/xmb_audit*.mjs` Puppeteer scripts that connect to an already-running
dev server on `localhost:3000` — they do not spawn/kill the server themselves.
