# Storyboard schema — the per-track beat sheet

A **storyboard** is the *authored intent* for one track. It is written before generation,
the generator fills geometry toward it, and the **track-critic** (Bucket D) scores the finished
rows against it. It is deliberately compact: a handful of ordered **beats**, each naming the
mechanic(s) it should teach/exercise, an intensity target, and the fraction of the track it spans.

It sits one level *above* `data/world_design_docs.json` slots: a world-design slot list says
"runway / drift_curve / launch_jump"; the storyboard says *why* — the dramatic arc those slots are
meant to produce. The generator's slot list is the *how*; the storyboard is the *what-for*.

Source of biome vocabulary: `data/world_design_docs.json` (`signatureMechanic`, `slotTagLegend`,
per-level `theme` + `slots`). Source of mechanic taxonomy and intensity semantics:
`docs/track-quality-spec.md` (Bucket A: A3 intensity metric, A5 mechanic cadence, A6 set-piece).

---

## Top-level object

```jsonc
{
  "schemaVersion": 1,
  "levelIndex": 62,            // matches data/world_design_docs.json + generated_levels.json
  "biome": "void",            // world_design_docs world.biome
  "title": "Waveform Highway", // human label (world_design_docs theme, short form)
  "targetRows": 340,           // expected total rows; beat spans sum to ~1.0 of this
  "signatureMechanic": "rhythmic equalizer-bar slalom + one big void jump as the drop",
  "intent": "1-3 sentence designer pitch: the feeling/story this track should deliver.",
  "beats": [ /* ordered Beat objects, see below */ ],
  "successCriteria": {         // optional, free-form authored guardrails the critic reads
    "climax": "the void jump must be the single hardest, most-telegraphed moment",
    "fairness": "every wall in the slalom reads one phrase (8 rows) ahead",
    "arc": "intensity must dip to a real breather before the climax"
  }
}
```

## Beat object

Beats are an **ordered** list. They should cover the canonical dramatic arc; not every track
uses every kind, but the order must be non-decreasing in narrative position.

```jsonc
{
  "id": "climax",                 // unique within the track
  "kind": "climax",               // one of the canonical kinds below
  "label": "The Drop",            // short human label
  "span": [0.62, 0.84],           // [startFrac, endFrac] of total track length (0..1, ordered, non-overlapping)
  "mechanics": ["launch_jump"],   // slot tags from world_design_docs.slotTagLegend (real or custom)
  "intensityTarget": 0.95,        // 0..1 target for Bucket-A A3 smoothed intensity in this span
  "telegraph": "boost runway + ramp marker 1 phrase before the gap",  // how the hazard should read
  "notes": "riskReward: boost before the gap; safeLanding refill island after"  // free authored intent
}
```

### Canonical beat kinds (the arc)

| kind        | role                                   | typical intensityTarget | maps to world_design role |
|-------------|----------------------------------------|-------------------------|---------------------------|
| `intro`     | safe accel runway; establish baseline  | 0.05–0.20               | `intro`                   |
| `teach`     | introduce the signature mechanic safe (uncombined) | 0.25–0.45   | `signature` (first)       |
| `rising`    | escalate; combine mechanics            | 0.45–0.70               | `filler` / `signature`    |
| `breather`  | sub-threshold trough before the peak (A4 sawtooth) | 0.10–0.30   | `filler` / `runway`       |
| `signature` | the biome's defining set-piece moment  | 0.55–0.80               | `signature`               |
| `climax`    | single dominant peak, in the final third (A6) | 0.85–1.00        | `climax`                  |
| `resolution`| safe outro runway; let the player exhale | 0.05–0.20             | `outro`                   |

### Field rules

- `span` values are fractions in `[0,1]`, `start < end`, beats non-overlapping and in order; the
  union should cover ~the whole track (small gaps tolerated, the critic notes large ones).
- `mechanics[]` entries must be valid `slotTagLegend` tags (`runway`, `slalom`, `jump`,
  `narrow_passage`, `tunnel`, `obstacle_course`, `hazard_zone`, `mixed`, or the custom set-pieces
  `drift_curve`, `tiered_hill`, `launch_jump`, `floating_islands`, `burn_chain`, `gate_run`,
  `bumper_canyon`, `speed_chain`, `tunnel_guided`).
- `intensityTarget` is the *authored* target; Bucket A reports the *measured* per-row intensity.
  The critic compares authored arc vs measured arc — it does **not** recompute intensity.
- Exactly **one** beat should be `kind: "climax"` and its `span` should lie in the final third
  (`start >= 0.66`). A6 already asserts a single late peak exists; the critic judges whether *this*
  beat is where the peak actually landed and whether it is *memorable*.

---

## How the critic uses it

The track-critic receives this storyboard plus the level rows, the Bucket-A result, and the
Bucket-C metrics. It judges the **4 subjective Bucket-D dimensions only** by asking, per beat:
does the finished geometry deliver the *authored intent* of the beat (climax memorable & telegraphed,
hazards readable at speed, the whole arc reads as this story rather than noise), and does it resolve
the borderline cases Bucket C flagged. It returns row-range-tied revision notes. It must **not**
re-derive spacing/density/cadence — those are already decided by Bucket A/C.

See `data/storyboard_example.json` for a worked example (level 62, void biome).
