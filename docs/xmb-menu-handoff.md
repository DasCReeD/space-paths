# XMB Menu — Session Handoff (2026-06-22)

Status of the PS3 XrossMediaBar menu redesign and the visual-QA audit run against
`data/desigh_review.md` (the "PS3 XMB Visual QA Standard").

## Outcome: PASS

The full menu system was audited against the XMB standard with the
`visual-ui-reviewer` agent (real Puppeteer interaction on an isolated vite port
5199 — never the user's 3000/3001 server). First audit FAILED; all blocking
defects were fixed and re-verified. **Final result: PASS, no remaining CRITICAL/
MAJOR defects, 591/591 tests green.**

## What this session changed (round 4 — QA fixes)

All fixes were localized; the XMB engine model itself was sound.

1. **Webamp overlapped the menu at small viewports** (CRITICAL).
   - `index.css`: `@media (max-width:900px),(max-height:720px) { #webamp-container, #webamp { display:none } }`.
   - Audio (Web Audio) keeps playing when hidden; still toggleable from Settings → VISUALIZER on desktop.

2. **Success screen showed a half-blurred backdrop** (CRITICAL).
   - `index.html`: removed the stale inline `style="max-width:780px;..."` on `#success-screen` (leftover from the pre-XMB glass-card design) so the blur fills the whole viewport.
   - `index.css`: added `.success-dashboard .success-columns-container { max-width:720px }` so the telemetry columns stay centered instead of stretching ultrawide.

3. **Pause "RESET LEVEL EDITS" rendered blank** (MAJOR).
   - `index.css`: added `.btn.btn-danger` / `:hover` (only `.cust-btn.btn-danger` existed). Restrained red gradient, distinct but not garish.

4. **VISUALS category clipped / focal point drifted at short viewports** (MAJOR).
   - Root cause: the full-screen crossbar tracks were positioned relative to the
     crossbar box, whose centre is pushed below the viewport centre by the title
     above it. Fix: `.xmb-crossbar { position: static }` so the absolutely-
     positioned tracks anchor to the full-screen `.overlay-screen` → focal point
     is the **true viewport centre** regardless of title height.
   - Bespoke screens that position their tracks against their own crossbar box
     opt back in: `#success-xmb-crossbar, #how-to-xmb-crossbar { position:relative; min-height:0 }`
     and `#ship-picker-screen .garage-xmb-crossbar { position:relative }`.

5. **Category-bar label collided with the adjacent item label** (CRITICAL, found after fix 4).
   - `xmbMenu.js`: vertical-column items now fade by distance from the focused
     row — `itemOpacityForDistance(d)` table `[1.0, 0.38, 0.22, 0.13, 0.08]` —
     so the row nearest the fixed category bar reads as faded background (XMB
     "items fade into the background" behaviour) rather than solid colliding text.
   - Grid (garage) and single-row (success buttons) controllers pass
     `flatItems:true` to skip the gradient (index-distance has no vertical
     meaning there). Set at the `new CrossbarController(...)` calls in `app.js`.

6. **How-To title + first rows rendered off-screen at 1920×1080** (CRITICAL, regression from fix 4).
   - Fixed by the `#how-to-xmb-crossbar { position:relative; min-height:0 }` exception above.

## Architecture recap (unchanged this session)

- **`xmbMenu.js`** — `CrossbarController`: state `{categoryIndex,itemIndex}`,
  150 ms cubic-ease retarget-safe tweens, tap/200 ms-hold input, 5 `safePlay`-
  guarded audio hooks. Slot sizes `CATEGORY_SLOT_PX=200` / `ITEM_SLOT_PX=56`
  must match `.xmb-category` width / `.xmb-item` height in `index.css`.
- **`menuConfig.js`** — pure data: `mainMenuConfig`, `settingsConfig` (GAME,
  AUDIO, VISUALS, CONTROLS, DISPLAY, VISUALIZER), `garageConfig`,
  `gamepadConfigConfig`, `buildLevelSelectConfig` (decade groups).
- **`app.js`** — `crossbarControllers` map, `getActiveCrossbarController`,
  `handleCrossbarKeyboard`, `mountSettingsCrossbar`, `showLevelSelection`
  (Infinite Road = first item under Levels 1-10), `_makeCalibratorDraggable`.

## Critical gotchas for the next session

- **NEVER `taskkill node` / kill node broadly** — the user's dev server runs on
  :3000/:3001. Verify interaction on an isolated port (e.g. 5199) and kill only
  that PID.
- **Do not touch `assets/`** — those are the user's WIP.
- The full-screen crossbars now anchor to the viewport via `position:static`.
  Any NEW screen that puts a single button/row below a content block must add
  itself to the `position:relative; min-height:0` exception list, or its track
  will jump to viewport centre over the content.
- Changing `ITEM_SLOT_PX`/`CATEGORY_SLOT_PX` requires matching the CSS slot
  sizes or the focal-point math breaks.

## Verification artifacts

- Review scripts: `playtests/xmb_review_r3.mjs`, `playtests/xmb_review_r4.mjs`.
- Screenshots: `playtests/r3_*.png`, `playtests/r4_*.png`; raw measurements
  `playtests/r3_results.json`, `playtests/r4_results.json`.
- Tests: `tests/xmbMenu.test.js`, `tests/menuConfig.test.js`, `tests/app.test.js`.
  Suite: 28 files / 591 tests green.

## Docs updated

`docs/module-map.md`, `docs/architecture.md`, `README.md`, `progress.md`, and
this handoff. `docs/code_review_report.md` is a historical point-in-time audit —
intentionally not rewritten (its proposed `ui/menuScreens.js`/`ui/settingsPanel.js`
split was partially realised by the `xmbMenu.js`/`menuConfig.js` extraction).
