# Xmas Worlds — Procedural Neon Design Brief

The 10 Xmas-pack worlds each get a bespoke procedural **neon** texture set in the same drawing
grammar as the demo road, the generated biomes, and the standard worlds. This doc is the authored
source of truth; `XMAS_NEON_SETS` and the per-world `motif*` functions in `levelLoader.js` mirror
it. Same principles as [standard-worlds-neon-brief.md](standard-worlds-neon-brief.md): curated
dark-based palette per world, a signature motif, per-road hue drift (`tintNeonSet`), and universal
hazard colours (boost=green, burn=red, refill=cyan, ice-cyan) left untouched for readability.

## Where Xmas worlds live (two packs)

Xmas worlds appear in **both** the standalone `xmas` pack and the xmas half of the `standard`
pack, so `getXmasWorld` handles both:
- standalone `xmas` pack: `level_index 0` = XMAS DEMO, `1..30` = 10 worlds × 3 roads.
- `standard` pack: `level_index 31` = XMAS DEMO, `32..61` = the 10 worlds × 3 roads.

Both use a −1 demo offset: `worldIdx = floor((rel-1)/3)`, `roadInWorld = (rel-1)%3`, where `rel`
is the index within the xmas block.

## The 10 worlds

| idx | World | Identity | base | primary | secondary | accent | Motif |
|-----|-------|----------|------|---------|-----------|--------|-------|
| 0 | SNOWBOUND | snowfield | `#0a1420` | `#bfe9ff` | `#ffffff` | `#7fd6ff` | `motifSnow` — falling six-point flakes + drift mound |
| 1 | AT THE OUTER RIM | deep-space edge | `#05060f` | `#6f9bff` | `#b0c4ff` | `#9d7bff` | `motifRim` — glowing planetary rim arc + starfield |
| 2 | TWILIGHT ZONE | dusk gradient | `#0d0714` | `#ff9e5c` | `#b06bff` | `#ffd08a` | `motifTwilight` — dusk wash + horizon lines + stars |
| 3 | THE GUIDING STAR | north star | `#0b0a04` | `#ffe08a` | `#fff6d0` | `#ffd23b` | `motifGuidingStar` — radiant four-point star |
| 4 | METEOR STORM | meteor shower | `#0c0605` | `#ff6a3d` | `#ffd27f` | `#fff0d0` | `motifMeteor` — diagonal meteor streaks + heads |
| 5 | MYSTERIOUS PLANET | alien mystic | `#04100e` | `#35f0c8` | `#ff5cc8` | `#8affff` | `motifMystery` — orbit rings + rune glyphs |
| 6 | NORTHERN LIGHTS | aurora | `#04100a` | `#39ff9a` | `#00e5ff` | `#b06bff` | `motifAurora` — wavy aurora ribbons + stars |
| 7 | OVER THE POLE | polar cap | `#081420` | `#9fe8ff` | `#ffffff` | `#4fb8ff` | `motifPole` — polar rings + compass + N marker |
| 8 | UNDER THE ICE | subglacial | `#03101c` | `#4fd0ff` | `#bfefff` | `#2f8fd0` | `motifSubIce` — ice-sheet cracks + trapped bubbles |
| 9 | THE EVE | christmas eve | `#0a0806` | `#ff4d4d` | `#39d95a` | `#ffd54a` | `motifEve` — garland swags + baubles + topper star |

## Modes

Works in classic, **flow**, and **tower** — the skin keys off each level's authoritative
`levelData.level_index` (never the mutating `window.currentLevelIndex`) and the `currentGamePack`
gate, both of which are set correctly per-deck at build time in all three modes.
