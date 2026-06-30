---
name: project-xmb-layout-pitfalls
description: Sky Roads XMB crossbar menu — recurring CSS overflow/focal-point bugs, how to verify live, and where the fixed-size assumptions live
metadata:
  type: project
---

Sky Roads (c:\dev\Sky roads) has a PS3 XrossMediaBar-style menu engine
(`xmbMenu.js` CrossbarController + `menuConfig.js` data + `index.css` layout +
per-screen markup in `index.html`). Two recurring defect patterns to check
every time this UI changes:

**1. Item-track height is fixed but item COUNT varies per category.**
`.xmb-crossbar` is `height: 360px` with `overflow: visible`; `.xmb-item-track`
is absolutely positioned at `top: 156px` (or `top: 70px` for
`.xmb-crossbar-single`), each `.xmb-item` is `height: 56px`. Any category with
more than ~3-4 items overflows this box and visually/interactively collides
with whatever fixed chrome follows in document flow (e.g. Settings screen's
"PHYSICS CALIBRATOR" / "CLOSE" buttons, Gamepad Config's "BACK" button).
Confirmed broken as of 2026-06-21 for: Settings VISUALS (9 items), Settings
CONTROLS (5 items), Gamepad Config (8 items). The overlap is not just visual —
because the item-track is absolutely positioned, it can sit in front of the
later-in-flow chrome buttons in hit-testing, making CLOSE unclickable while a
long category is focused (verified via `document.elementFromPoint` resolving
to the item-track instead of the button). Always test the category/screen
with the MOST items, not the default/first one — defects hide behind the
default category (GAME, only 3 items, looks fine).

**2. Any overlay screen with a leftover narrow-box constraint breaks the
focal point.** The focal point math (`left: 30%` on `.xmb-category-track` /
`.xmb-item-track`) is computed against `.xmb-crossbar`'s own width, which is
only `100%` of the real viewport if every ancestor up to `.overlay-screen` is
also full-width. `#level-screen` had a leftover `max-width: 680px !important`
from the pre-XMB grid-based level picker (paired with now-dead
`.level-grid-container`/`.level-item` CSS), which silently shrank
`#level-crossbar` to 610px and pulled the focal point to ~17-25% of the
viewport instead of ~30%. Main menu and Settings screens are full-width and
correctly land at ~31%. When auditing focal-point calibration, measure
`getBoundingClientRect()` on the active `.xmb-category`/`.xmb-item` and divide
by `window.innerWidth` — don't trust the CSS `left: 30%` literal, trace what
it's 30% OF.

**Verification approach that works:** the user runs their own vite dev server
at `http://localhost:3000` — reuse it, don't spawn a competing one, don't kill
node processes. `window.gameManagerInstance.crossbarControllers[screenId]`
exposes the live `CrossbarController` (`.activeCategory.id`,
`.itemIndex`, etc.) for state assertions. `window.gameManagerInstance.showScreen(id)`
can jump directly to any screen (pause/death/success/how-to/gamepad-config)
without playing through the game, which is far more reliable for screenshots
than chaining through the full UI flow (clicking through Settings → close →
Play → Level Select sometimes stalls mid-chain in headless puppeteer; prefer
independent `showScreen()` calls per screenshot over one long click chain).
Category `<div>` elements have NO click handler anywhere in app.js (only
items do) and `.xmb-category` is `cursor: default` — this is consistent
(no affordance promises it), treat as a deliberate keyboard/gamepad-only
design, not a bug, unless the user says otherwise.

Project also has prior ad-hoc audit scripts at `playtests/xmb_audit*.mjs`
(numbered 1-16+) — check the latest-numbered one for the current known-good
puppeteer connection pattern before writing a new one from scratch. As of
2026-06-22 those numbered scripts were gone (cleaned up); see
`playtests/xmb_review_2026_06_22.mjs` for the current reusable pattern (drives
an isolated `npx vite --port 5199` instance, never the user's 3000/3001 server).

**As of 2026-06-22, re-verified against the standard in `data/desigh_review.md`:**

1. **VISUALS-category overflow is FIXED at 1080p+ but REGRESSED at <=720p-tall
   windows.** The fixed-360px-box bug from the original finding above is gone —
   `.xmb-crossbar` is now `min-height:70vh; overflow:visible` with tracks
   anchored at `top:50%`, so at 1920x1080 every long category (VISUALS 9 items,
   CONTROLS 5, gamepad-config 8) renders fully on-screen with the active item
   centered. BUT at a 1024x640 "small window" test, the focal point does NOT
   stay vertically centered for VISUALS — the active item pins near the top
   third and trailing slider items (WALL SPREAD etc.) run off the bottom edge
   uncentered/clipped. Always re-test long categories at a small (not just
   default 1080p) viewport, not just the default.

2. **Webamp/visualizer player widget is a recurring, severe cross-cutting
   defect.** `initVisualizer()` (wired in app.js `init()`) mounts a full
   interactive Winamp-skin player (transport, EQ, playlist sub-windows) docked
   top-right on EVERY screen, including all XMB menus. It does not reposition
   or simplify at small viewports: at a 375x667 "minimum supported size" test
   it covers the ENTIRE top half of the screen, clipping the logo and
   overlapping/hiding the active focused XMB item on every screen tested (main
   menu, settings). This occupies the XMB standard's "information panel" zone
   (rules 161-180) but is a full media-player UI, not subtle system info —
   fails "must not overlap navigation," "must reposition on small screens,"
   "must not become the main visual focus." At ultrawide (3440x1440) it scales
   down fine and is NOT a problem there — defect is specifically small/default
   viewport widths. Look for `#webamp-container` / `initVisualizer` in app.js.

3. **`#success-screen` has a stale inline
   `style="max-width:780px; width:90%; ..."` in index.html (~line 792)**, left
   over from the pre-XMB rounded-card design — same class of bug as the old
   `#level-screen` max-width issue, just never cleaned up on this one screen.
   Effect: the full-screen blur backdrop only covers the left ~40% of a
   1920px-wide viewport, leaving the raw unblurred 3D game/visualizer scene
   visible on the right side in a jarring half-blurred/half-not split. Every
   other screen (menu/settings/pause/death/how-to/gamepad-config) was already
   cleaned of this. Fix: delete that inline style attribute.

4. **`.btn-danger` (plain, used on `#btn-pause-reset-level` "RESET LEVEL
   EDITS") has zero CSS rules.** Only `.cust-btn.btn-danger` (a different,
   unrelated component) is styled. The pause-screen's "Reset Level Edits" XMB
   item renders as an unstyled flat/blank-looking bar with no distinguishing
   color — looks broken, especially sitting between two clearly-styled colored
   pill buttons (BOAT THROTTLE info-gray, QUIT TO MENU secondary-blue). Needs a
   `.btn.btn-danger` rule (e.g. red gradient matching `--color-danger`) added
   to index.css.

5. **`success-screen`'s CrossbarController is built lazily inside
   `handleSuccess()`** (app.js ~line 3986+), NOT pre-registered in
   `setupXmbMenus()`/`setupPauseDeathSuccessCrossbars()` like pause/death/how-to
   are. Calling `showScreen('success-screen')` directly without first calling
   `handleSuccess()` leaves `crossbarControllers['success-screen']` undefined —
   this is a TEST-HARNESS gap, not a product bug. To screenshot success-screen
   correctly: first `showLevelSelection('standard')` (so `getCachedPack` has
   data), then set `gm.currentPack='standard'; gm.currentLevelIndex=0;` and
   call `gm.handleSuccess()` directly.

6. **Level Select's per-decade item tracks are created fresh each call with NO
   id** (`class="xmb-item-track level-item-track-dyn"`; the static placeholder
   `#level-item-track` gets `.hidden`'d and is dead). Don't query
   `#level-item-track` for measurements — query
   `.level-item-track-dyn:not(.hidden)` instead. The `.level-item`/`.level-num`/
   `.level-name` CSS (index.css ~433-493) was written for the OLD grid-of-boxes
   picker (aspect-ratio:1 cells) and is now reused inside 56px-tall XMB rows —
   `.level-name` computes to ~10.4px font, visibly cramped/small compared to
   the bold pill-button items on every other XMB screen (main menu, settings,
   garage). Visually inconsistent item style across screens — worth flagging as
   a Major polish gap, not a hard clip.

**Re-verification round (2026-06-22, r3 script) of the 2026-06-22 fix batch — 3 of 4 fixes
landed clean, 1 fix has a real regression and 1 has a new defect introduced BY the fix:**

7. **CONFIRMED FIXED: webamp hidden at <=900px-wide / <=720px-tall** (`index.css`
   `@media (max-width:900px),(max-height:720px) { #webamp-container,#webamp{display:none!important} }`,
   ~line 103). Verified zero overlap and `display:none` at both 375x667 and
   1024x640 on main menu + settings; still visible top-right at 1920x1080 (allowed).

8. **CONFIRMED FIXED: success-screen stale `max-width:780px` inline style removed**
   from index.html (the `<div id="success-screen" ...>` tag now has no `style=`
   attribute at all). At 1920x1080 the blur backdrop (`#success-screen` itself,
   `position:absolute; inset:0`) now measures the full 1920x1080 viewport — no
   raw-scene split. `.success-columns-container` is capped at `max-width:720px`
   (index.css ~247) and renders centered. Buttons (NEXT ROAD/BACK TO MENU) still
   anchor correctly below the columns because `#success-xmb-crossbar` opts out of
   the new global crossbar centering via its own `position:relative; min-height:0`
   override (index.css ~238-241) — this override is necessary and is NOT dead code,
   don't suggest removing it as "redundant."

9. **CONFIRMED FIXED: `.btn.btn-danger` CSS added** (index.css ~450-459, red
   gradient `var(--color-danger)` to `hsl(345,90%,42%)`). `#btn-pause-reset-level`
   now renders a clear red pill, visually distinct from RESUME (pink), RETRY
   (blue), BOAT THROTTLE (muted gray), QUIT TO MENU (blue).

10. **PARTIALLY FIXED, NEW DEFECT INTRODUCED: VISUALS category centering at
    1024x640.** The active item DOES now stay vertically pinned at viewport
    center (cy=320 measured via getBoundingClientRect at every one of the 9
    items, confirmed via DOM measurement walking the full category) — the
    original "active item pins near top third" bug is gone. BUT: when the
    active item is near the END of a long category (e.g. item 8/9, "STAR
    DENSITY"), the items scrolled above it climb up far enough to collide
    with the category bar row. Measured collision: `.xmb-category`
    ("VISUALS" label, top:250 bottom:270) physically overlaps
    `.xmb-item` ("STAR SIZE", top:243 bottom:285) by ~20px — text renders
    literally striking through text, unreadable. This is confirmed at 1024x640;
    not yet checked at other heights below 1080p — re-test at e.g. 768px,
    900px tall if revisited. Root cause is structural: the category bar is
    fixed at `top: calc(50% - 70px)` while the item track's earlier rows
    scroll up toward/past that same row when many items precede the active
    one — there's no collision-avoidance between the two tracks. Screenshot:
    `playtests/r3_fix4_overlap_zoom.png`.

11. **NEW REGRESSION on How-To screen, caused by the VISUALS-centering fix.**
    Giving `.xmb-crossbar` a global `min-height: 70vh; flex: 1 1 auto` works
    for screens whose ONLY flex-column content is the crossbar itself, but
    `#how-to-screen` is structured differently: `.overlay-screen` (flex column,
    `justify-content: center`) contains THREE children — `.screen-title`,
    `.how-to-content` (a big static list of 7 control-row `<div>`s, ~622px
    tall, NOT part of the XMB crossbar), and `.xmb-crossbar.xmb-crossbar-single`
    (holds just one "UNDERSTOOD" button). The crossbar still claims 756px
    (70vh of 1080) even though its real content is one 56px-tall row. Total
    flex-column content (47 + 622 + 756 = 1425px) exceeds the 1080px viewport;
    `justify-content:center` centers the overflow and `overflow:hidden` on
    `.overlay-screen` silently clips it — the title and first 2 of 7 control
    rows render fully ABOVE y=0 (measured top:-200 for the title, top:-128 for
    row 1), completely invisible, no scrollbar, no indication anything is
    missing. Confirmed via DOM measurement showing `.screen-title` top:-200,
    `.how-to-content` top:-128 bottom:494, `.xmb-crossbar` top:524 bottom:1280
    at 1920x1080 — this is NOT a small-viewport-only bug, it reproduces at the
    DEFAULT 1920x1080 size too. Other single-category screens (pause/death/
    gamepad-config) are fine because their crossbar IS effectively their only
    large content block. Fix needs to either: (a) give `#how-to-xmb-crossbar`
    its own override (similar to `#success-xmb-crossbar`) with `min-height: 0`
    since it only ever holds 1 item, or (b) scope the `min-height: 70vh` rule
    to exclude `.xmb-crossbar-single` variants whose category has very few
    items, or (c) wrap `.how-to-content` + crossbar in their own
    non-stretching container. Always check ALL consumers of a shared CSS class
    when a fix changes shared-selector rules, not just the screen the fix was
    written for — How-To wasn't mentioned in the fix's target list but does
    use the same global `.xmb-crossbar` selector fix 4 modified.

**Re-verification round (2026-06-22/23, r4 script) — both outstanding fixes from r3 CONFIRMED FIXED, zero regressions found:**

12. **CONFIRMED FIXED: VISUALS category-bar/item collision at 1024x640 and
    1366x768**, via `xmbMenu.js` `itemOpacityForDistance` (exported, opacity
    table `[1.0, 0.38, 0.22, 0.13, 0.08]` for distance 0/1/2/3/4+ from the
    focused row) applied per-item each frame (`xmbMenu.js` ~line 364:
    `item.el.style.opacity = String(itemOpacityForDistance(Math.abs(i -
    this.itemIndex)))`). Walked all 9 VISUALS items at both viewports; at the
    worst-case frame (item 9/9 "STAR DENSITY" focused, "STAR SIZE" one row
    above at opacity 0.38 geometrically overlapping the fixed category-bar row
    by ~20px per `getBoundingClientRect`), the rendered result is a legible dim
    background label sitting behind/beside the bright "VISUALS" label — NOT
    the old solid-text strikethrough collision. Visual judgment confirmed via
    cropped zoom screenshot (`playtests/r4_zoom_step8_crop.png`), not just
    geometry — geometric overlap alone is expected/acceptable per the fix
    design, what matters is whether it LOOKS like a collision, and it doesn't.
    Active item stays centered/unclipped at every step at both viewports.

13. **CONFIRMED FIXED: How-To screen full visibility at 1920x1080 and
    1366x768**, via `#how-to-xmb-crossbar { position:relative; min-height:0 }`
    (index.css ~241-244, same bespoke exception pattern as
    `#success-xmb-crossbar`). Measured at 1920x1080: `.screen-title` top:40
    (was top:-200), `.how-to-content` top:112 bottom:734 (was top:-128,
    clipped), `#how-to-xmb-crossbar` top:764 bottom:1040, UNDERSTOOD button
    top:874 bottom:930 — title, all 7 control rows, and the special-tile-color
    legend are now fully on-screen, button sits cleanly below content with no
    overlap (`checkOverlap` confirmed false for both title/crossbar and
    content/crossbar pairs). Also re-checked at 1366x768 - same clean layout,
    scaled proportionally.

14. **No regressions from either fix.** Garage (`flatItems:true` opt-out)
    still renders uniform opacity (1 for all items except the focused tile —
    confirmed via DOM dump, no per-index gradient artifact leaked in). Success
    screen still full-screen blur + centered columns + buttons below. Main
    menu, pause, death, gamepad-config, level select (decade grouping with
    INFINITE ROAD first, confirmed via walked labels), and Settings'
    game/audio/controls categories all render full-screen, focal-point intact,
    no clipping, fade gradients proportionate to each category's item count.

Net effect: the two CRITICAL defects from finding #10/#11 (this same file,
2026-06-22 r3 round) are now both closed. As of this round there are no
remaining CRITICAL/MAJOR defects on these screens from this fix batch — see
finding #6 (Level Select font-size inconsistency, MAJOR/polish) and finding
#2 (webamp small-viewport behavior, already fixed per #7) for the only
previously-open lower-severity items not touched by this round.

**r5 round (2026-06-22) — PS3-authentic focal-point relocation
(`.xmb-focal-ps3`, `--xmb-focal-x:27%`/`--xmb-item-y:42%`, `leftAlignItems:true`)
applied to Main Menu, Settings, Level Select. PASS overall; one real CRITICAL
defect found at phone width, pre-existing and NOT caused by this change:**

15. **Gotcha for future audits: `.xmb-category`/`.xmb-item` elements are
    `width:200px; text-align:center`, so their `getBoundingClientRect()` box
    routinely extends off-screen at narrow viewports (e.g. left:-58 at 390px
    width) even when the actual rendered TEXT GLYPHS are fully visible and
    centered on-screen. Don't flag "category clipped" from the parent-box
    rect alone — measure the actual text node via `Range.getClientRects()`
    (`range.selectNodeContents(textNode); range.getClientRects()`) to get the
    true glyph bounds before calling clipping. This produced several false
    positives in `checkXmbClipping`-style helpers during this round (PLAY,
    GAME category labels) that were NOT real defects once verified against
    the rendered screenshot and glyph-level measurement.

16. **CONFIRMED REAL: Level Select's "Levels 1-10" category label DOES clip
    at 390px viewport width** — measured via text-node Range, left edge of
    the actual glyphs is at x:-20 (the leading "L" is cut off), confirmed
    visually in `playtests/r5_level_390x844.png` ("evels 1-10" visible, no
    "L"). This is a real instance of standard rule 241/251 (selected category
    clipped, no horizontal scroll as compensation). Likely cause: the dynamic
    decade-label string ("Levels 1-10") is longer than the static category
    labels (PLAY/GAME/VISUALS), and at the mobile focal (`--xmb-focal-x:12%`)
    the fixed 200px-wide centered box pushes the longer label's glyphs
    further left than the menu/settings ones. Fix needs either a narrower/
    left-aligned text box for category labels at the `max-width:600px`
    breakpoint, or shortening the dynamic decade label format (e.g. "1-10"
    without "Levels ") at that breakpoint.

17. **CONFIRMED REAL, pre-existing (not caused by the focal-point change):
    page title text overlaps the top-left gear/fullscreen icon buttons at
    390px viewport width**, on at least Main Menu (SKYROADS logo, "S" glyph
    sits behind the gear icon) and Settings ("SYSTEM SETTINGS" title directly
    overlaps the gear icon box — confirmed via rect overlap test, title
    left:31 vs gear left:20-66, both top:20-52ish). Root cause: same diff
    batch (uncommitted, includes non-PS3-focal changes) moved
    `.btn-settings-gear-trigger` from `left:80px` to `left:20px` (removed a
    pause-trigger button that used to occupy 20px) but did NOT adjust
    `.logo-text`/`.status-title` horizontal centering/padding at the
    `max-width:600px` breakpoint to compensate — titles are still
    full-width-centered text starting near x=0 at this viewport, colliding
    with the now-more-leftward gear icon. Verify whether `.logo-text`/
    `.status-title` have a left-padding or max-width rule scoped to mobile;
    if not, that's the fix (e.g. `padding-left: 70px` or `text-align` shift
    at `max-width:600px` on `.logo-text`/`.status-title`). Visible in
    `playtests/r5_menu_390x844.png` and `r5_settings_390x844.png`.

18. **CONFIRMED PASS: PS3 focal-point geometry matches spec exactly.**
    Measured via `getBoundingClientRect()` on the active category at both
    1920x1080 and 1366x768 for Main Menu/Settings/Level Select:
    `catCenterXPct` and `itemLeftPct` both land at exactly 27.0% (desktop) /
    10.8-12% (mobile, after the `max-width:600px` override drops
    `--xmb-focal-x` to 12%) — matches `--xmb-focal-x` exactly at every
    viewport tested. `catTopPct`≈35.5% (1920x1080) and ≈32.9% (1366x768),
    `itemTopPct`≈39.4%/38.4% — both reasonably close to the spec's intended
    ~35% rail position (percentage drifts slightly across viewports because
    `--xmb-item-y` is a fixed CSS percentage but the category track's
    `top: calc(var(--xmb-item-y) - 70px)` adds a fixed-px offset, so don't
    expect the rail itself to land at exactly 35% at every aspect ratio —
    27% horizontal is the more rigid invariant to check). Items hang
    downward and left-aligned under the active category at every viewport
    (`align-items:flex-start; text-align:left` confirmed via `leftAlignItems`
    -> `_itemAnchorX:'0px'` in xmbMenu.js). No clipping found at 1920x1080 or
    1366x768 for any of the three screens, including Level Select's full
    decade walk (Infinite Road + Road 0-9, all 11 labels) and Settings'
    longest category (VISUALS, 9 items, walked top to bottom).

19. **CONFIRMED PASS: dialogs and Garage unaffected.** Pause, Death, Success,
    How-To, Gamepad Config all render fully centered (`cx` measured at
    exactly 960 = screen-center at 1920px width for every dialog's
    `.xmb-crossbar`), zero clipping. Garage's side-by-side HULL/SKIN/PAINT
    panel + 3D preview layout unchanged. None of these carry `.xmb-focal-ps3`
    nor `leftAlignItems` — confirmed via static markup inspection
    (`index.html` lines ~258-935) that only the 3 PS3 screens have the class/
    option; this is a reliable invariant to spot-check first before even
    rendering, if revisited.

**r6 round (2026-06-22) — re-verification of two r5 phone-width (390x844) fixes.
Both named fixes PASS; found one sibling defect the fix batch missed:**

20. **CONFIRMED FIXED: Level Select "Levels 1-10" category label clipping.**
    Mobile override for `.xmb-focal-ps3` now only sets `--xmb-item-y:38%`
    (index.css ~3480-3488) and no longer touches `--xmb-focal-x`, so phones
    inherit the desktop 27% focal-x. Measured via text-node `Range` (walking
    `.xmb-category` directly, not `.xmb-category-label` — see gotcha below) at
    390x844: glyph left:38.4px, right:172.2px — fully on-screen with ~38px
    margin (was left:-20px/clipped "L" in r5). No horizontal scroll. Walked
    all 11 level items (Infinite Road + Road 0-9) at 390x844, all readable,
    `catLeftPct`/`itemLeftPct` both land at exactly 27% as designed.

21. **CONFIRMED FIXED on the two screens the fix targeted: Main Menu logo and
    Settings title no longer overlap the gear/fullscreen icons at 390x844.**
    `.logo-text` (Main Menu) measured top:25-57, left:83-268 vs gear
    left:20-66 / fullscreen left:324-370 — clear gaps both sides, zero
    overlap. `.status-title` (Settings, "SYSTEM SETTINGS") measured
    top:20-44, left:81.6-308.4 — same clean clearance. Both confirmed via
    rect-overlap test AND screenshot (`r6_menu_390x844.png`,
    `r6_settings_390x844.png`).

22. **NEW FINDING (sibling defect, not part of either named fix): a THIRD
    title class, `.screen-title` (index.css line 161, font-size:1.8rem,
    width:100%, text-align:center — distinct from `.logo-text` and
    `.status-title`), was NOT included in the mobile font-shrink fix and
    still overlaps both corner icons at 390x844.** Used by Level Select's
    dynamic pack title (`<h2 id="level-pack-title" class="screen-title">`,
    index.html line 766), How-To ("HOW TO PLAY", line 876), and Garage
    ("HOVERCRAFT GARAGE", line 927). Measured on Level Select showing the
    Standard pack: title rect top:20-67, left:15-375 — directly overlaps
    gear (left:20-66, `overlapGear:true`) AND fullscreen (left:324-370,
    `overlapFs:true`). Visually confirmed in `r6_level_390x844.png`: the
    "STANDARD PACK" text renders literally behind/through the gear icon and
    clipped under the fullscreen icon — same visual defect class as the
    original r5 finding #17, just on a screen outside that fix's target
    list. Garage shows the same overlap in its title's visible sliver
    (mostly scrolled off-screen above viewport for an unrelated reason, not
    investigated further here). How-To's title is currently fully
    off-screen above (top:-99) so the overlap isn't visible there, also for
    an unrelated reason. Fix: add `.screen-title` to the same
    `max-width:480px` media-query block as `.logo-text`/`.status-title`
    (index.css ~3012-3017 / ~3060-3065), shrinking font-size comparably
    (e.g. ~1.3-1.4rem) so it clears the 46px-wide icon buttons at 20px and
    324px from the edges on a 390px viewport.

23. **Gotcha for future audits: `.xmb-category-label` is an empty trailing
    `<span>` (likely reserved for an icon/badge), NOT the element containing
    the category's visible text.** The actual text (e.g. "Levels 1-10") is a
    direct text-node child of the parent `.xmb-category` div itself:
    `<div class="xmb-category">Levels 1-10<span class="xmb-category-label">
    </span></div>`. Walk `.xmb-category` with `document.createTreeWalker`
    for the text node, not `.xmb-category-label` — querying the label span
    directly returns "no text node" / false-negative every time.

Verification harness gotcha: `menuConfig.js` settings category order is
`game(0), audio(1), visuals(2), controls(3), display(4), visualizer(5)` — to
reach VISUALS from default you need 2x ArrowRight, not 1x (audio sits between
game and visuals). Also scope `.xmb-item:has(.xmb-item-label)` queries to the
current screen (e.g. `#settings-screen .xmb-item:has(...)`) — querying
unscoped against `document` picks up stray zero-size leftover elements from
OTHER screens' DOM (pause/menu/death buttons etc. all share the `.xmb-item`
class globally), producing bogus "offscreen at 0,0,0,0" clipping noise.

**r7 round (2026-06-22) — re-verified the `.screen-title` mobile font-shrink fix
(index.css ~3022-3025, inside `@media (max-width:480px)`: `font-size:1.25rem
!important; letter-spacing:1px !important`) added to close r6 finding #22.
PASS for the fix itself; two pre-existing, unrelated defects surfaced
incidentally and are NOT regressions from this fix:**

24. **CONFIRMED FIXED: `.screen-title` no longer overlaps the gear/fullscreen
    icons at 390x844, on both screens that use it.** Level Select
    (`#level-pack-title.screen-title`, "STANDARD PACK"): glyph rect (via
    text-node Range, not the centered 360px-wide box) measures left:87.1,
    right:302.9 — zero overlap with gear (left:20-66) or fullscreen
    (left:324-370). Garage (`#ship-picker-screen .screen-title`,
    "HOVERCRAFT GARAGE"): same check confirms glyph left:42.3, right:328.2,
    clear of both icons — verified by temporarily growing the viewport
    height to bypass an unrelated vertical-clip bug (see #26) that normally
    pushes this title off-screen; once visible, it renders at top:87.5
    (well below the icon row at top:20-66), comfortably full-width within
    390px. `font-size` computed to exactly 20px (=1.25rem) on both,
    confirming the rule applied as written.

25. **NEW, OUT-OF-SCOPE FINDING: Level Select's "← BACK" button
    (`#btn-level-back`) visually sits behind the gear icon at 390x844,
    pre-existing and unrelated to the `.screen-title` fix.** Measured
    `#btn-level-back` rect top:20-47, left:15-94.4 vs gear (`.btn-settings-
    gear-trigger`, `position:fixed`, `z-index:1000`) rect top:20-66,
    left:20-66 — direct overlap, confirmed visually (a "CK" glyph fragment
    of "← BACK" pokes out from under/behind the gear icon's left edge in
    `playtests/r7_level_zoom.png`). `document.elementFromPoint(70,33)`
    resolves to `#btn-level-back`, confirming it occupies that screen
    position even though the gear renders visually on top. This is a
    separate header-button overlap bug (the back button and gear icon
    share the same top-left corner at mobile width), not caused by and not
    fixed by the `.screen-title` font-size change. Worth a follow-up fix
    (e.g. shift `#btn-level-back` right or stack it below the gear at
    `max-width:480px`) but explicitly out of scope for this review.

26. **NEW, OUT-OF-SCOPE FINDING: Garage screen (`#ship-picker-screen`)
    content overflows vertically at 390x844, pushing its `.screen-title`
    fully off-screen above the viewport (measured top:-32.8, bottom:3.2 —
    almost entirely above y=0, only a 3px sliver technically in-bounds).**
    Same defect class as the already-documented How-To overflow (finding
    #11 in this file): `#ship-picker-screen` is a `glass-card` with a fixed
    `.ship-picker-container { height: 560px }` (index.css ~1401-1408) plus
    header/title/other panels, all inside a centered flex column that
    exceeds 844px of viewport height, with the overflow clipped/pushed
    upward rather than scrolling. This makes the fix's horizontal-clearance
    improvement moot in practice on Garage at this viewport — the title
    isn't just clear of the icons, it isn't visible at all. Confirmed this
    is NOT caused by the `.screen-title` font-size change (font-size only
    affects horizontal width/wrapping, not vertical position) by
    artificially growing the test viewport to 390x2000, which revealed the
    title rendering correctly at top:87.5 with full horizontal clearance —
    isolating the vertical-overflow bug as the sole cause of its invisibility
    at 390x844. Needs the same kind of fix as How-To eventually got
    (`#ship-picker-screen`-scoped override, e.g. shrinking
    `.ship-picker-container` height or enabling scroll at narrow/short
    viewports), but that's a separate, larger fix than this review's scope.

**r8 round (2026-06-22/23) — verified the Garage HULL/SKIN/PAINT grid-to-vertical-list
conversion (`.garage-item-track` flex-column rows replacing the old 1-D-engine-incompatible
CSS grid) plus the `computeFitScale` preview normalization and `.ship-picker-container`
height fit. HULL/SKIN navigation and the 3-D preview PASS cleanly; found one new CRITICAL
CSS-specificity bug the conversion introduced, plus a second CRITICAL title/button collision
exposed by the same screen (pre-existing gap in shared header CSS, not caused by this PR):**

27. **CONFIRMED CRITICAL: PAINT category rows collapse to ~24-32px circles instead of
    full-width 300px bars, at all three viewports (1920x1080, 1366x768, 390x844).**
    Root cause (confirmed via `getComputedStyle` + a CSS-rule-matching walk, not guesswork):
    the legacy pre-XMB swatch-picker rule `.color-preset-option { width: 32px; height: 32px;
    border-radius: 50%; }` (index.css ~1714) and the new row rule `#ship-picker-screen
    .garage-item { height: 50px; border-radius: 8px; ... }` (index.css ~1874) both target
    the same elements. The new ID-scoped rule correctly wins on `height`/`border-radius`
    (computed: 50px / 8px), but it **never declares `width` at all** — so `.color-preset-
    option`'s `width: 32px` is the only width rule in play and applies unopposed, defeating
    the track's `align-items: stretch` (`#ship-picker-screen .garage-item-track` is
    `flex-direction: column`, so width is the cross-axis and would stretch to the track's
    300px IF no child had its own explicit width). Net visual effect: PAINT renders as a
    column of tiny dots with color names invisible/illegible beside them, starkly
    inconsistent with the clean HULL/SKIN rows one category over. **General lesson for this
    codebase: when a new ID-scoped "row" rule is layered onto an element that ALSO carries an
    older, more specific-looking but lower-specificity class from a previous design (grid/
    circle/card/etc.), check EVERY box-model property the old class sets (width, height,
    border-radius, padding, display) and explicitly override each one in the new rule — don't
    assume parent flex/grid stretch will fill gaps left by an undeclared property, because any
    sibling class with its own explicit value for that property will win by default if the
    new rule is silent on it.** Fix: add `width: 100%;` to `#ship-picker-screen .garage-item`
    (or a `.color-preset-option`-specific override) so `align-items:stretch`/explicit width
    actually reaches the swatch rows. Screenshots: `playtests/r8_garage_1920x1080_paint.png`,
    `r8_garage_1366x768_paint.png`, `r8_garage_390x844_paint.png`.

28. **CONFIRMED CRITICAL, NOT caused by this PR but newly exposed/relevant here: at
    390x844, the centered `.screen-title` ("HOVERCRAFT GARAGE") visually overlaps the
    absolutely-positioned `← BACK` button (`.btn-icon`, `left:76px`) in `.overlay-header`.**
    Measured: title glyph rect left:42.3-328.2 vs BACK rect left:91-170.4, both top:47-74 —
    direct overlap (confirmed via `rectsOverlap`==true and visually, glyphs literally
    fuse into "OVERCRAFT GARAGEBACK"). This is a gap in the EXISTING mobile `.screen-title`
    font-shrink fix (r7 finding #24 in this file, `font-size:1.25rem` at `max-width:480px`)
    — that fix was scoped to clear the top-left gear icon and top-right fullscreen icon
    (both fixed-position, outside `.overlay-header`'s flow) but never accounted for the
    in-row `.btn-icon` BACK button that sits to the title's immediate left on EVERY screen
    using this `.overlay-header` + `.screen-title` pattern (Level Select, How-To, Garage).
    Likely affects Level Select/How-To too at the same viewport — not verified in this round
    (out of scope, Garage-focused review), worth a follow-up check before assuming it's
    Garage-only. Fix needs either further `.screen-title` shrink/left-padding at
    `max-width:480px`, or repositioning `.btn-icon` to stack above the title at that
    breakpoint. Screenshot: `playtests/r8_garage_390x844_default.png`.

29. **CONFIRMED PASS, false-negative gotcha for future preview-canvas checks: reading
    WebGL canvas pixels via `ctx.drawImage(canvas,0,0)` + `getImageData` AFTER the fact
    (e.g. in a separate `page.evaluate` call after the frame was drawn) returns all-zero/
    blank for EVERY model, even though the screenshot clearly shows the ship rendered
    correctly.** Cause: the preview's WebGL context likely has `preserveDrawingBuffer:
    false` (the three.js default), so the buffer clears before/between the evaluate call
    reading it. Don't trust a "blank canvas" pixel-sample result for this preview without
    cross-checking an actual screenshot crop first — in this round all 7 hull models
    (Starfire Fighter/original, Hauler, Scout, Dreadnought, Cruiser, Racer, Hovdi) were
    confirmed visually correct, centered, and reasonably sized via screenshots
    (`playtests/r8_hull_step1-6_*.png` + the default-state shot) despite every
    pixel-sample reporting `nonEmptyPixelRatio: 0`. Also: the preview only initializes via
    `gameManagerInstance.openShipPicker()` (which lazily constructs `this.previewEngine =
    new ShipPreviewEngine()` and calls `.init()`), NOT via a bare `showScreen('ship-picker-
    screen')` — calling `showScreen` directly leaves `#ship-preview-container` with no
    `<canvas>` at all. Always call `openShipPicker()` to test this screen, matching the
    same "use the real app entry point, not a raw showScreen jump" caution this file
    already notes for `success-screen`/`handleSuccess()`.

30. **CONFIRMED PASS: HULL list navigation, names, and fade gradient.** All 7 models
    (Starfire Fighter, Hovercraft Hauler, Hovercraft Scout, Hovercraft Dreadnought,
    Hovercraft Cruiser, Combat Racer, Hovdi Concept — these are the in-game display
    strings; they map 1:1 to `data-model` attributes `original/hauler/scout/dreadnought/
    cruiser/racer/hovdi`) render as a clean vertical list with persistent always-visible
    names (`.garage-item-name` span), at all three viewports. Down arrow moves exactly one
    56px row per press (verified via consistent row-top deltas across 6 steps); the
    focused row stays pinned at the identical screen Y position every step (confirmed
    `top`/`bottom` identical across all `hull_walk` steps at a given viewport — true
    "world moves, focus is fixed" XMB behavior) with the standard opacity-fade table
    (1 / 0.38 / 0.22 / 0.13 / 0.08) applied to non-focused rows by distance. SKIN category
    (12 rows, descriptive names) renders identically clean. Zero clipping, zero truncated
    names, zero overlap between rows at any step or viewport.

**r9 round (2026-06-23) — re-verified the two remaining FAILs from r8 (finding #27 PAINT
circle-collapse, finding #28 mobile title/BACK overlap). Both CONFIRMED FIXED, zero
regressions, one pre-existing/unrelated incidental overlap noted but out of scope:**

31. **CONFIRMED FIXED: PAINT category rows are now full-width pill rows matching HULL/SKIN,
    at 1920x1080 and 390x844.** `#ship-picker-screen .garage-item { width: 100% }` (index.css
    line 1876, added specifically to override the legacy `.color-preset-option { width:32px;
    border-radius:50% }`) works as intended — measured focused-row rect 300x50px,
    `border-radius:8px` (NOT the old 32x32 circle), identical width/height to a HULL row
    sampled in the same session. Each row renders [34px rounded-square colour swatch
    (`.garage-item-thumb`)] + [uppercase colour NAME] exactly per spec: walked all 8 rows
    (NO OVERLAY, CYBER PINK, NEON CYAN, ELECTRIC LIME, SUN GOLD, BURN ORANGE, DEEP INDIGO,
    CUSTOM COLOR) via screenshot and DOM measurement, zero tiny circles, zero full-width
    colour-bar rows (the colour lives only in the small thumb, not the row background, also
    confirmed visually). Up/Down navigates exactly one row at a time (`paint_focused_before`
    "NO OVERLAY" -> `_after_down1` "CYBER PINK" -> walking 12 more presses lands on
    "CUSTOM COLOR", the trailing row, which renders identically to the others at 300x50 with
    no special/broken styling). Confirmed at both 1920x1080 and 390x844 — same row geometry,
    same swatch+name layout, screenshots `r9_garage_*_paint.png`, `r9_garage_*_paint_down1.png`,
    `r9_garage_*_paint_end.png`. Note: non-focused rows measure 225x37.5 (a 0.75 scale) — this
    is the existing focus-scale animation (same one HULL/SKIN already use, not a new bug),
    not a layout defect; the focused row is the one to check for "is it 300x50/full-width" and
    it is.

32. **CONFIRMED FIXED: mobile (390x844) `.overlay-header` no longer fuses the title into the
    BACK button, on both Garage and Level Select.** `.overlay-header { flex-direction: column }`
    at `max-width:480px` (index.css ~3053-3063) stacks BACK onto its own row
    (`position:static; margin-left:76px` to clear the fixed gear icon at left:20-66) with the
    title centered on the row below. Measured Garage: BACK rect top:31.5-58.5/left:91-170.4;
    title glyph rect top:62.5-87.5/left:42.3-328.2 — `rectsOverlap` false, vertically stacked
    with a small gap, confirmed visually in `r9_garage_390x844_default.png` ("← BACK" cleanly
    above "HOVERCRAFT GARAGE", no fused text). BACK also confirmed clear of the gear icon
    (gear left:20-66 vs BACK left:91-170.4). Level Select header (same shared `.overlay-header`
    class) verified identically: BACK top:20-47/left:91-170.4, title ("STANDARD PACK") glyph
    top:51-76/left:87.1-302.9, zero overlap, screenshot `r9_level_390x844_default.png`. This
    closes r8 finding #28 and also pre-emptively confirms the "likely affects Level Select too"
    note from that same finding — it does NOT (already fixed by the same shared-class change).

33. **Incidental, OUT-OF-SCOPE finding (not part of either fix, not a regression): the
    top-right dev `.fps-counter` widget ("144 FPS", index.css ~2070, populated in app.js
    ~line 3435) geometrically sits close to/slightly under the `.screen-title` text at
    390x844** (fps rect left:311.5-382/top:60-82 vs title text-glyph rect right edge 328.2/
    top:62.5-87.5 — a few px of overlap in the corner where "GARAGE" ends and "144 FPS"
    begins, visible in `r9_garage_390x844_default.png`). This is unrelated to the PAINT-row
    and header-stacking fixes verified this round; the FPS counter is unconditionally in
    index.html (not gated behind a debug flag visible in markup) and would affect EVERY
    screen with a long `.screen-title`-style title at this viewport, not just Garage. Worth
    a future fix (e.g. hide `.fps-counter` at `max-width:480px`, or move it below the header)
    but explicitly not blocking this round's PASS since it's pre-existing dev chrome, not
    part of the reviewed diff.

**Net effect: both r8 CRITICAL FAILs are now closed. As of r9, the Garage screen
(HULL/SKIN/PAINT lists, 3-D preview, mobile header) has no known CRITICAL or MAJOR defects.**
