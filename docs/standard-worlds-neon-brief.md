# Standard Worlds — Procedural Neon Design Brief

The 10 original SkyRoads worlds (standard pack, levels 1–30, 3 roads each) each get a bespoke
procedural **neon** texture set, in the same drawing grammar as the demo road (level 0) and the
generated biomes (61–90). This doc is the authored source of truth; `WORLD_NEON_SETS` and the
per-world `motif*` functions in `levelLoader.js` mirror it.

## Principles (borrowed from No Man's Sky)

- **Curated palette swatches, never random RGB.** Each world has a fixed `{base, primary,
  secondary, accent}` swatch chosen from its identity. Coherence comes from the constraint.
- **Dark base, always.** Bases are near-black (bloom-safe); the neon strokes carry the colour.
- **Seeded variation within a family.** The 3 roads in a world share the motif but get a small
  hue rotation (`tintNeonSet(set, roadInWorld)`, ±14°) — NMS "same family, seeded drift".
- **A signature motif per world** layered over the shared grate/block road rhythm
  (`_defaultFrame`).

## Universal hazards (do NOT re-colour per world)

For gameplay readability the safety-critical tiles keep fixed shapes AND colours across every
world (identical to the biomes): boost = green chevrons, super-boost = cyan, burning = red bars,
refill = cyan rings, slippery = ice-cyan diagonals. Only the **default road, obstacle border and
tunnel** take world flavour.

## The 10 worlds

| idx | World | Archetype | base | primary | secondary | accent | Motif |
|-----|-------|-----------|------|---------|-----------|--------|-------|
| 0 | RED HEAT | molten | `#100303` | `#ff2a1a` | `#ff7a00` | `#ffd23b` | `motifMolten` — flowing lava fissures + ember dots |
| 1 | INTO THE SUN | solar | `#0e0b03` | `#ffd447` | `#ff8a00` | `#fff6d0` | `motifSolar` — radiant corona rays + flare ring |
| 2 | BLUE PLANET | ocean | `#02060f` | `#22d3ee` | `#2f8fff` | `#aefcff` | `motifOcean` — wave crests + caustic sparkles |
| 3 | SATELLITE | orbital-tech | `#080b10` | `#39c6ff` | `#dfe9f5` | `#7fb0ff` | `motifOrbital` — hull panel seams + rivet ticks |
| 4 | MISTY | ether/fog | `#0b0c14` | `#c9b7ff` | `#9fb4d8` | `#ffffff` | `motifMist` — soft fog bands + faint stars |
| 5 | ASTEROID BELT | rocky-debris | `#0a0806` | `#d9a066` | `#8a7f74` | `#ff7a3c` | `motifBelt` — cratered rock chips + debris |
| 6 | CRAB NEBULA | cosmic-gas | `#0a0414` | `#ff3db4` | `#8a5cff` | `#ffd6f2` | `motifNebula` — gas filaments + star specks |
| 7 | OVER THE BASE | industrial-hazard | `#0b0a05` | `#ffc400` | `#ffe14d` | `#39ff14` | `motifBase` — stencil hazard band + chevron ticks |
| 8 | THE EARTH | terrestrial | `#040814` | `#3aa0ff` | `#38d66b` | `#eef6ff` | `motifTerra` — globe graticule + continent |
| 9 | DRUIDIA | mystic-grove | `#050e06` | `#39d95a` | `#8fe36b` | `#ffd54a` | `motifGrove` — vine + leaf lattice + berries |

`worldIdx = floor((level_index - 1) / 3)`, `roadInWorld = (level_index - 1) % 3` (the demo road
occupies `level_index 0`, so the −1 offset aligns worlds to their 3 roads).

Families that share low-level drawing primitives while staying distinct via palette + motif:
fire {RED HEAT, INTO THE SUN}, space {SATELLITE, ASTEROID BELT, CRAB NEBULA},
atmos {BLUE PLANET, MISTY}, earth {THE EARTH, DRUIDIA}, tech {OVER THE BASE}.

Scope note: the standalone **Xmas** pack (also `level_index 0–30`) is intentionally left on its
existing look this pass; the neon path is gated to `currentGamePack === 'standard'`.
