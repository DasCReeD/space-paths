# Racing / Runner / Tube-Racer Level-Design Playbook

A practical design reference for improving a procedural track generator for an arcade tunnel-racer
(SkyRoads / Audiosurf / F-Zero / Wipeout lineage): a ship on a narrow road, jumping obstacles and
gaps at high speed, with biome themes.

This is a **playbook**, not a survey. Each section ends with **actionable generator constraints** —
those rules are the point of the document.

---

> ### Sourcing note (web-verified 2026-06-29)
>
> This playbook was hardened with live web access. Claims below were checked against fetched
> sources; inline links point at the page that supports the claim, with a short verified quote or
> paraphrase. Quotes marked **"exact"** are reproduced verbatim from the cited page; everything else
> is a paraphrase of fetched content. Genuine design inferences not stated by any single source are
> marked **[theory]**. A handful of attributions in the original draft were **corrected** — those
> corrections are flagged inline (⚑).
>
> **Most load-bearing verified sources, by section:**
> - Pacing: [GameFlow, Sweetser & Wyeth 2005](https://dl.acm.org/doi/10.1145/1077246.1077253) ·
>   [Lopez, *Harnessed Pacing & Intensity*](https://www.gamedeveloper.com/design/gameplay-fundamentals-revisited-harnessed-pacing-intensity) ·
>   [Level Design Book — Pacing](https://book.leveldesignbook.com/process/preproduction/pacing) ·
>   [GMTK, Mario 3D World 4-step](https://www.youtube.com/watch?v=dBmIkEvEBtA) · [Kishōtenketsu](https://en.wikipedia.org/wiki/Kish%C5%8Dtenketsu)
> - Fairness: [Hick's law](https://en.wikipedia.org/wiki/Hick%27s_law) ·
>   [simple vs choice RT](https://www.psytoolkit.org/lessons/simple_choice_rts.html) ·
>   [DS3 attack anatomy (340 ms window)](https://www.gamedeveloper.com/game-platforms/anatomy-of-an-enemy-attack-in-dark-souls-3) ·
>   [Readability in games](https://www.gamedeveloper.com/design/the-importance-of-readability-in-games) ·
>   [Mirror's Edge runner vision](https://www.ea.com/news/runners-vision-in-mirrors-edge-catalyst)
> - Rhythm: [Audiosurf](https://en.wikipedia.org/wiki/Audiosurf) · [Thumper "rhythm violence"](https://www.gamedeveloper.com/audio/q-a-the-rhythm-violence-of-i-thumper-i-) ·
>   [Rez (quantization)](https://en.wikipedia.org/wiki/Rez_(video_game)) · [librosa beat_track](https://librosa.org/doc/main/generated/librosa.beat.beat_track.html) · [aubio](https://aubio.org/manual/latest/cli.html)
> - Layout: [A Rational Approach to Racing Game Track Design](https://www.gamedeveloper.com/design/a-rational-approach-to-racing-game-track-design) ·
>   [Racing Level design: the rally case](https://www.gamedeveloper.com/design/racing-level-design-the-rally-case) ·
>   [Spelunky Generator Lessons](http://tinysubversions.com/spelunkyGen/) · [WaveFunctionCollapse](https://github.com/mxgmn/WaveFunctionCollapse) ·
>   [Dormans, Generating Missions and Spaces](https://pcgworkshop.com/archive/dormans2010adventures.pdf)
> - Variety: [Tetris 7-bag / Random Generator](https://harddrop.com/wiki/Random_Generator) ·
>   [PCG Book — dungeons/grammars](https://antoniosliapis.com/articles/pcgbook_dungeons.php) ·
>   [Introducing Mechanics](https://www.gamedeveloper.com/design/game-design-introducing-mechanics) · [Koster, *A Theory of Fun*](https://www.raphkoster.com/games/a-theory-of-fun/) ·
>   [Valve landmarking](https://book.leveldesignbook.com/process/blockout/wayfinding)
> - AI testing: [EA SEED RL testing, CoG 2020](https://arxiv.org/abs/2103.15819) ·
>   [Evolving Personas, CIG 2014](http://julian.togelius.com/Holmgard2014Evolving.pdf) ·
>   [Mario AI Framework](http://julian.togelius.com/Karakovskiy2012The.pdf) ·
>   [Expressive Range Analysis](https://www.researchgate.net/publication/228411962) · [MAP-Elites, Mouret & Clune 2015](https://arxiv.org/abs/1504.04909)

---

## 1. Pacing & the difficulty curve

### The model

The governing idea is the **flow channel**: engagement lives in the narrow band where challenge
tracks the player's rising skill. Below it the player is bored; above it, anxious. This is
Csíkszentmihályi's flow, operationalized for games by Sweetser & Wyeth's **GameFlow** model, whose
eight elements include matching challenge to player skill and supporting skill progression — *"if an
activity is too challenging relative to skill the player becomes anxious; if not challenging enough,
bored"* ([GameFlow, ACM CIE 2005](https://dl.acm.org/doi/10.1145/1077246.1077253);
[full PDF](https://eprints.qut.edu.au/58216/15/JournCT-GameFlow.pdf)). A track's job is to keep the
player inside that channel while the channel itself drifts upward as they learn.

Crucially, designers do **not** implement this as a smooth monotonic ramp. The repeated lesson is
**difficulty as a wave, not a line**: a sawtooth that builds tension, spikes, *releases*, then builds
again from a higher floor. Mike Lopez puts it directly: *"Peaks in intensity occur during exciting
events, and troughs occur during lull periods… It is the contrast between the two which makes the
action riveting"* — and intensity (event magnitude) is separate from pacing (frequency between
equally-intense events) ([Lopez, *Harnessed Pacing & Intensity*](https://www.gamedeveloper.com/design/gameplay-fundamentals-revisited-harnessed-pacing-intensity)).
The Level Design Book makes the same point about rest: downtime is *"a contrast and palette cleanser,
otherwise the player will simply go numb"* — troughs matter as much as peaks
([Level Design Book — Pacing](https://book.leveldesignbook.com/process/preproduction/pacing)). A
track that only climbs flattens the dynamic range so the peaks stop reading as peaks (the
"loudness-war" failure). Schell's *interest curve* is the same shape: deliberate peaks and valleys,
not a straight line ([interest curve after Schell 2019, p.301](https://www.researchgate.net/figure/An-interest-curve-for-part-of-a-game-after-Schell-2019-p301_fig5_368468809)).

The macro shape most tracks follow is a five-act arc. The five-act *framing* is real — *"most AAA
games are broken down into five acts rather than three"* ([gamedesignskills, three-act
structure](https://gamedesignskills.com/game-design/three-act-structure/)) — and the
climax-then-drop is explicit: *"the climax is the highest point of tension… immediately after that,
the tension should drop, likely back to its baseline"* (Level Design Book). The specific five labels
below are a Freytag-style synthesis **[theory]**:

- **Intro / establish** — calm, wide, slow; teach the track's identity and let the player settle.
- **Rising tension** — escalating swells, each peaking higher than the last.
- **Breather** — a deliberate rest beat before the climax (tension needs preceding release).
- **Climax** — the single highest-intensity moment / signature set-piece (see §3).
- **Resolution** — a clean, fast run-out to the finish. Never end on a forced hazard.

This is the same envelope as a 3-minute pop song: one *biggest* final chorus, not eight equal ones.

### Teach → develop → twist → conclude (mechanic introduction)

The cadence for *introducing* difficulty (as opposed to scaling it) is Nintendo's documented
four-step structure — **introduce → develop → twist → conclude** — which Koichi Hayashida explicitly
tied to the Japanese four-act form **Kishōtenketsu** (起承転結). These are *"four-part, self-contained
showcases for new ideas, where a mechanic can be successfully taught, developed, twisted and then
thrown away in about five minutes flat"* ([GMTK, *Super Mario 3D World's 4 Step Level
Design*](https://www.youtube.com/watch?v=dBmIkEvEBtA); coverage:
[MCV](https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/);
[Kishōtenketsu](https://en.wikipedia.org/wiki/Kish%C5%8Dtenketsu)).

1. **Teach (ki):** present the new element in a safe context where failure is free — the new obstacle
   appears over solid ground, not over a gap.
2. **Develop (shō):** same element, raised stakes — now it's over a gap, or faster.
3. **Twist (ten):** recombine it with a previously-taught element, or recontextualize it. This is the
   load-bearing beat — Kishōtenketsu generates interest by *juxtaposition*, not just escalation: the
   mechanic is used in an unexpected way, reframing known material.
4. **Conclude (ketsu):** a mastery-demonstrating arrangement, then move on.

### How named games do it

- **Trackmania:** the 100+ Nadeo campaign tracks *"gradually increase in length, complexity, and
  difficulty,"* each typically built around a single gimmick/section that must be *"mastered
  completely"* and committed to muscle memory
  ([bit-tech, *Trackmaniac*](https://bit-tech.net/reviews/gaming/pc/trackmaniac/1/)). One dominant
  idea per challenge, learned through repetition, then escalated.
- **F-Zero:** high-speed play requires *"a mixture of memorization of the tracks and quick
  reflexes"* ([Wikipedia](https://en.wikipedia.org/wiki/F-Zero)) — early levels lean reflex, later
  ones demand memorization, but only after the vocabulary is taught.
- **Audiosurf:** difficulty *is* the song's energy envelope — loud sections become fast, dense
  downhill; quiet sections become slow, sparse uphill rest beats (see §3).
- **Wipeout / endless runners (Subway Surfers / Temple Run):** the straight-before-the-hard-thing
  structure and distance-tied speed/density ramp are widely used, but I could not source a credible
  design-analysis of these specific titles — treat as **[theory]**.

### ▶ Actionable rules — pacing

1. **Drive a single intensity score per segment** = `f(density, speed, narrowness, forced-reaction count)`.
   Plan the track against this score, not against raw obstacle counts. *(Lopez: intensity = event
   magnitude, distinct from pacing.)*
2. **Difficulty oscillates as a sawtooth.** Cap any uninterrupted intensity climb at **3–4 segments**
   before a mandatory release segment below the running baseline; resume building from a *higher
   floor*. Forbid two spike-class segments back-to-back. *(Lopez peak/trough contrast; Schell interest
   curve.)*
3. **Exactly one global intensity maximum per track**, placed in the **final third (≈60–85% of
   length)**, and force intensity back toward baseline immediately after it (Level Design Book
   climax-drop). Reject/regenerate any layout whose intensity curve is flat or has multiple equal
   peaks.
4. **Mandatory rest beat before every build and before the climax.** Make troughs genuinely easy
   (drop hazard density to baseline, widen track), not merely "less hard" — contrast is the payload.
   Never allow two consecutive segments both at max intensity.
5. **Bookend every track:** a calm establish-segment at the start, and a hazard-free finish run-out at
   the end. Never end on a forced hazard. Suggested five-act length split: establish ~10–15% / rising
   ~35% / breather ~10% / climax ~25–30% / resolution ~10% **[theory]**.
6. **One new mechanic per track-third, maximum** — each must walk the teach→develop→twist→conclude
   arc (safe intro → raised-stakes develop → one unexpected combination → culminating use). The twist
   beat is required, not optional. *(GMTK/Hayashida.)*
7. **One gimmick per segment-group (Trackmania rule).** Build a challenge run around a single dominant
   idea the player can master through repetition before escalating, rather than stacking many at once.
8. **Scale difficulty by re-flavoring, not re-authoring.** Ramp speed/density/spacing-compression
   monotonically with distance so the *same* template vocabulary keeps generating new challenge, and
   keep each segment inside the GameFlow band (never >~1 tier above current player skill → anxiety,
   or below → boredom).

---

## 2. Telegraphing & fairness

### The principle

Fairness at speed is an **information-timing problem, not a difficulty knob.** A death is *fair* when,
on replay, the player can point to the moment they had the information and chose wrong or reacted
late. The canonical maxim, from a 1984 *Computer Gaming World* article, is that failure must feel like
*"the player's fault (not the game's) but can be corrected by playing better the next time"* (exact)
([Wikipedia — Game balance](https://en.wikipedia.org/wiki/Game_balance)). The mechanism is
**telegraph, then punish**: FromSoftware builds every Dark Souls 3 attack as *Opening Pose
(telegraphing) → Attack Signal → Attack*
([Game Developer — DS3 attack anatomy](https://www.gamedeveloper.com/game-platforms/anatomy-of-an-enemy-attack-in-dark-souls-3)),
and telegraphs exist precisely so *"players perceive encounters as fair rather than arbitrary"*
([Game Developer — Readability in games](https://www.gamedeveloper.com/design/the-importance-of-readability-in-games)).
⚑ The original draft's "Extra Credits — Fair vs Unfair" title is unconfirmed; the relevant EC video is
[*Video Game Difficulty is Hard*](https://www.youtube.com/watch?v=_ru5iSgiV84), and the CGW maxim
above is the citable source.

This makes the non-negotiable invariants: (a) the hazard is **visible and unoccluded for the entire
reaction budget**, and (b) the required lead-in **scales linearly with speed**.

### Reaction-time budget (the load-bearing numbers)

Verified against mental-chronometry sources:

- **Simple reaction time** (one stimulus → one prepared response, e.g. "jump when anything appears"):
  *"typical simple RT for visual stimuli is 200–250 ms in young adults"* (exact)
  ([PsyToolkit](https://www.psytoolkit.org/lessons/simple_choice_rts.html);
  [reaction-time-test.io/science](https://www.reaction-time-test.io/science)). Note: Human Benchmark's
  raw web average is ~284 ms, inflated by the slow tail — its "good" cluster is ~220–320 ms
  ([humanbenchmark](https://humanbenchmark.com/tests/reactiontime)).
- **Choice reaction time** (must identify *which* hazard and pick *which* of several responses) is
  *"significantly slower, typically 350 to 500 ms"* (exact)
  ([reaction-time-test.io](https://www.reaction-time-test.io/science)), and grows with the number of
  options per **Hick's Law**: *"increasing the number of choices increases decision time
  logarithmically,"* `RT = a + b·log₂(n + 1)` (the +1 form accounts for the no-signal case),
  attributed to **Hick (1952) and Hyman (1953)**, with `b ≈ 0.155 s/bit` a *typical empirical* value
  (⚑ a and b are fitted, not universal constants) ([Hick's law](https://en.wikipedia.org/wiki/Hick%27s_law)).
- **Latency split** (⚑ corrected from the draft's "~100–200 ms"): *machine* input lag (button → pixel)
  is only **~15–50 ms** at 60 fps, competitive target <30 ms
  ([input lag](https://en.wikipedia.org/wiki/Input_lag)). *Human motor execution* (the move itself)
  adds roughly **~100–150 ms** and is a rule-of-thumb estimate, not a cited constant. Keep these
  separate.
- **Empirical reaction floor:** Dark Souls 3 guarantees a **≥340 ms** window (Attack Signal + Attack)
  *"for players to react,"* and deliberately drops below it to spike difficulty
  ([DS3 attack anatomy](https://www.gamedeveloper.com/game-platforms/anatomy-of-an-enemy-attack-in-dark-souls-3)).
  Treat 340 ms as the minimum fair perceive-decide window for a forced single hazard; reserve sub-340 ms
  only for memorizable/optional content.

**Design to the slow tail, not the mean.** RT distributions are *positively skewed with a long right
tail* — *"the standard deviation can be greatly increased by a relatively low number of slow RTs,"*
which is why researchers report the **median**, not the mean
([RT distribution review, PMC8638535](https://pmc.ncbi.nlm.nih.gov/articles/PMC8638535/)). Targeting
**~2× the median** as the fairness window covers the slow ~10–20% of responses — this multiplier is a
designer heuristic, not a sourced number **[theory]**.

### Speed → minimum lead-in distance

`D_min = ship_speed × T_total` is kinematics (distance = speed × time at constant speed), not a
citable design rule — but the *time* budget is grounded:

```
T_total = T_perceive + T_actuate + T_maneuver + T_buffer
  T_perceive ≈ 0.25 s (single prepared response) / 0.40 s (choice, Hick's Law; floor 0.34 s, DS3)
  T_actuate  ≈ human motor time ~0.10–0.15 s  +  machine input lag ~0.015–0.05 s
  T_maneuver ≈ time for the jump/dodge to physically clear the hazard
  T_buffer   ≈ slow-tail margin → aim T_perceive toward ~2× median for the slow ~10–20%

D_min = ship_speed × T_total          ← scales LINEARLY with speed
```

Worked example: ship at 80 u/s, single-input jump → `T_total ≈ 0.25 + 0.13 + 0.30 + buffer ≈ 0.90 s`
→ **D_min ≈ 72 units** of clear, unoccluded sightline. A forced *multi-lane choice* at speed is a
choice task: budget `T_total ≈ 0.40 (choice) + 0.13 (motor) + 0.03 (input lag) + maneuver ≈ 0.55 s+`.
At 160 u/s every budget doubles in distance. The number must move with speed, or the game becomes
unfair purely by accelerating — the classic auto-runner failure mode.

**The occlusion corollary (most important single constraint):** spawning at `D_min` is not enough. The
hazard must be **unoccluded for the whole window** — hazard visibility is a measurable function of
line-of-sight/occlusion ([architectural hazard-visibility model, PMC8608317](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8608317/)).
An obstacle hidden behind a crest/wall/tunnel until `D_min/3` has given the player only a third of the
budget. Validate against *time-to-first-clear-sightline* (raycast from the approach corridor), not
time-to-spawn.

### Readability at speed (the other half)

- **Reserved danger language:** one hue used *only* for things that matter, never for decoration — the
  Mirror's Edge "runner vision" principle. Producer Owen O'Brien on choosing red: they *"tried doing
  it completely white, but needed something else, so you could judge distances"*
  ([Mirror's Edge runner vision](https://mirrorsedge.fandom.com/wiki/Runner_Vision);
  [EA — Catalyst](https://www.ea.com/news/runners-vision-in-mirrors-edge-catalyst), where red=path,
  yellow=wall-run, orange=swing — one semantic per hue). Use emissive/bloom so hazards pop at distance.
- **Silhouette & value contrast:** at speed the player gets the silhouette first. Apply the *"black out
  line-work and details and check the silhouette remains readable"* test, plus chest-height value
  contrast — the *"Read Hierarchy"* principle from Valve's *How Valve Connects Art Direction to
  Gameplay* (Gamefest 2008) ([80.lv summary](https://80.lv/articles/studying-character-art-silhouette-and-contrast)).
  ⚑ The draft attributed the silhouette test to Blizzard; the verifiable industry source is
  Valve/Gamefest 2008 — re-attribute, or call it "studio practice."
- **Telegraph forced hazards; hide only optional ones.** Blind crests/corners are legitimate
  difficulty tools — the WRC7 rally designer cites Finland's *"blind jumping bends, requiring either
  braking on every crest because you can't see the road behind it, or going flat-out and jumping at
  120 mph in a corner you can't see"* ([rally case](https://www.gamedeveloper.com/design/racing-level-design-the-rally-case)).
  But that is *learnable* difficulty; a first-encounter *forced* hazard may never sit behind a
  sightline break.

### ▶ Actionable rules — telegraphing & fairness

1. **Lead-in law:** never place a forced-reaction obstacle closer than `D_min = ship_speed × T_total`
   at the speed the ship will actually be travelling on arrival. Recompute per segment — **D_min grows
   when speed grows.**
2. **Reaction-budget floors:** `T_perceive ≥ 0.25 s` single prepared response; `≥ 0.40 s` for any
   choice-between-responses hazard (Hick's Law), and never below the **0.34 s** DS3 empirical floor.
   Add a slow-tail buffer (aim ≈2× median).
3. **Hick's-Law fork cap:** choice cost is `RT = a + b·log₂(n+1)` — 2 lanes ≈1 bit, 4 ≈2.3 bits, 8
   ≈3.2 bits (diminishing). Cap simultaneous independent fork choices at **≤3–4** before RT/error
   spikes.
4. **Occlusion ceiling:** a forced hazard must be continuously unoccluded for the **entire** `T_total`
   before contact. Validate by raycast from the approach corridor, not by spawn distance.
5. **Absolute reveal floor:** regardless of speed, every lethal obstacle is on-screen and unoccluded
   for **≥ 0.8 s** (single response) / **≥ 1.1 s** (choice). This floors rule 1 at low speeds.
6. **Reserved danger color + contrast:** lethal obstacles use one reserved emissive hue, used for
   nothing else (Mirror's Edge), AND pass a **silhouette + value-contrast** test against the geometry
   directly behind them at reveal distance (Valve "Read Hierarchy") — don't rely on color alone
   (colorblind + motion blur). Reject e.g. a red obstacle on a red wall; recolor backdrop or add a rim
   light.
7. **Minimum angular size:** scale hazard size with distance/speed so it subtends **≥ ~1.5°** of visual
   angle at reveal — too small to resolve in time is the same as unfair **[theory]**.
8. **No forced hazard within `D_min` downstream of a sightline break.** Push the next forced obstacle
   past `crest_exit + D_min`. Blind hazards are allowed only as optional/learnable content.
9. **One forced demand per reaction window:** within any single `T_total`, present **at most one**
   independent forced reaction; space distinct forced demands by `≥ T_total`. The player cannot
   serially perceive-decide-act twice inside one budget.
10. **Speed-ramp coupling:** when difficulty raises `ship_speed`, proportionally raise reveal distance
    and *lower* obstacle density so forced-obstacles-per-budget stays constant:
    `max_forced_per_second ≤ 1 / T_total`.
11. **Telegraph length scales with consequence** (Game Developer readability): make the
    highest-damage / instant-death hazards the *most*-telegraphed, not the least.
12. **Gap pre-commit visibility:** the far landing edge of any required jump must be visible at the
    jump-commit point (= takeoff − `ship_speed × T_actuate`). Reject gaps whose far edge is occluded at
    commit.
13. **First-encounter grace:** the first instance of any new hazard archetype spawns at **1.3 × D_min**
    (and, if feasible, at locally reduced speed). Later instances may use standard `D_min`.

---

## 3. Rhythm & signature moments

### Signature set-pieces

A "wow moment" reads as special only by **contrast against an established baseline** — establish a
grammar, then break it deliberately and *exactly once* at the peak. The reliable construction pattern
is **telegraph → withhold → deliver**: foreshadow the spectacle, delay arrival to build anticipation
(anticipation is the payload — Schell's *Lens of Anticipation*, one of the ~100 lenses in
[*The Art of Game Design*](https://books.google.com/books/about/The_Art_of_Game_Design.html?id=gXumDwAAQBAJ);
[lens list](https://notesbylex.com/the-art-of-game-design-a-book-of-lenses-2nd-edition-by-jesse-schell)),
then drop the player into it. ⚑ The draft cited Steve Lee's "What Makes a Good Level?" — that exact
title isn't confirmed on his [channel](https://www.youtube.com/channel/UCRT_DdZnWiUryqrOhLL7gyw); cite
the channel generically. The set-piece does something the rest of the track *cannot*: the tunnel opens
into open sky, the floor falls away, the camera pulls back, gravity flips. Spectacle the player
**causes** is remembered; spectacle they watch is not **[theory]**.

**One signature beat per track.** A pacing-budget argument: if every moment is a peak, there are no
peaks. One dominant apex, supported by 2–4 minor swells **[theory]**.

### Music / track synchronization

- **Audiosurf** ("Ride Your Music"): the generator does *real-time frequency and amplitude analysis to
  procedurally generate the racing path* — the track's *"elevation, surface, and layout reflect the
  dynamics of the music"* (intense → fast/downhill, calm → slow/uphill)
  ([Wikipedia](https://en.wikipedia.org/wiki/Audiosurf); [Fitterer
  interview](http://www.charge-shot.com/2009/01/bestrideever-talk-with-dylan-fitterer.html)). Block
  *value* is color-coded (*"blocks in hot colors such as red and yellow are worth more… cool colors
  such as blue and magenta are worth less"*, exact) — ⚑ but the draft's claim that block color maps
  from *pitch/spectral band* is unconfirmed; the safe, sourced mapping is **amplitude/dynamics →
  elevation + speed + density**.
- **Thumper** ("rhythm violence"): Drool's Marc Flury coined the term — *"creating a subgenre which we
  call 'rhythm violence'"* (exact) — hand-authored so obstacles *"loosely coincide with the beat and
  thump of the music"* ([Game Developer Q&A](https://www.gamedeveloper.com/audio/q-a-the-rhythm-violence-of-i-thumper-i-);
  [Wikipedia](https://en.wikipedia.org/wiki/Thumper_(video_game))). Escalation by **layering verbs**
  (tap → add turn → add grind → recombine), apex recombines all — verb-layering is an accurate design
  observation, not a sourced quote **[theory]**.
- **Rez / Tetris Effect** (Mizuguchi, "synesthesia"): a *"quantization mechanic… allowed even players
  without natural rhythm to interact musically"* — *"player actions are usually locked to the rhythm
  of the music, such that shots and hits against enemies occur exactly on each beat (as opposed to
  occurring in real time)"* (exact) ([Rez](https://en.wikipedia.org/wiki/Rez_(video_game));
  [Mizuguchi interview](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/)).
  Raw input is free, but the *feedback* quantizes to the beat grid, so the player always reads as
  on-rhythm.

**Standard beat-mapping pipeline** (verified feasible with real library functions; see notes in
`project_audio_level_gen.md`): BPM/beat-tracking → a bar/beat grid; onset detection (spectral flux) →
discrete spawn timestamps; band-energy envelopes (low/mid/high) → intensity ramp + obstacle-type
selection; then **quantize** every event to the nearest beat subdivision.
[`librosa.beat.beat_track`](https://librosa.org/doc/main/generated/librosa.beat.beat_track.html) is
the Ellis-2007 dynamic-programming tracker (onset strength → tempo from autocorrelation → peak-pick),
[`librosa.onset.onset_strength`](https://librosa.org/doc/main/generated/librosa.onset.onset_strength.html)
*is* a spectral-flux envelope, and per-band flux via `onset_strength_multi` supports band→type mapping.
[aubio](https://aubio.org/manual/latest/cli.html) provides `aubioonset`/`aubiotrack`/`tempo` (tempo
default uses `specflux`).

### Repetition + variation → "groove"

Groove = a repeated pattern with controlled deviation. State a recognizable phrase, repeat it so the
player learns it, then alter one variable — the **AABA / ABAC** structure. Use **call-and-response**
and **tension–release** (groove needs rest phrases). Reuse a learned obstacle *shape* but transpose it
— faster, mirrored, stacked, recolored — so the player feels competent (recognizes it) yet challenged
(it changed) **[theory]**.

### Musical phrasing as level structure

EDM is rigidly 4/4 with phrasing grouped into **8/16/32-bar segments** (4 beats/bar, 4 bars/phrase),
and *section transitions land at the start of a new phrase (the downbeat)*; drops run 8–16 bars, with
end-of-phrase fills signalling progression
([EDM song structure](https://edmtips.com/edm-song-structure/);
[Cymatics](https://cymatics.fm/blogs/production/edm-song-structure)). Apply as a hierarchical grammar:
**bar** = one obstacle gesture; **4-bar phrase** = one motif; **8–16-bar section** = a difficulty
plateau or build. The single most transferable structure is the EDM **build → drop**: a riser phrase
(rising density, narrowing path) that **resolves on the downbeat of the next section** into the
signature moment. Aligning big changes to phrase boundaries is what makes the track *feel* musical.

### ▶ Actionable rules — rhythm & signature moments

1. **Snap every spawn to the beat grid.** Run `librosa.beat.beat_track` (Ellis DP) → BPM + beat frames;
   quantize all obstacle Z-positions to beat (or 1/2-beat) timestamps. With no audio, use a synthetic
   fixed-BPM grid so the game still feels metered. *(librosa; Rez quantization.)*
2. **Derive long-wavelength shape from the loudness/onset envelope** (Audiosurf model): map
   `onset_strength` per frame → density + speed + elevation. Louder → faster/denser/narrower; quiet →
   slow/sparse/wide rest.
3. **Map obstacle *type* from spectral band** via `onset_strength_multi` (low/kick → floor hazards,
   mid → lane-shift/walls, high/hat → overhead/collectibles), consistently within a track so the player
   learns the language. *(Our extension; Audiosurf's spectrum→color link is unconfirmed.)*
4. **Align all major changes to power-of-two phrase boundaries** (biome swap, speed change, set-piece)
   — only on 4/8/16-bar downbeats, never mid-phrase. *(EDM structure.)*
5. **Place the one signature set-piece at the build→drop downbeat,** in the final third; supporting
   swells peak strictly below it. Detect the largest envelope rise→peak and reserve the apex there.
6. **Exactly one signature moment per track** **[theory]** — cap to a single peak so contrast survives.
7. **Telegraph → withhold → deliver:** insert a low-density anticipation run (≥1 full phrase / 4 bars)
   of visual foreshadowing before the set-piece; the withholding *is* the payload (Schell's Lens of
   Anticipation).
8. **The set-piece breaks the established grammar exactly once** and is something the player *causes*
   (couple it to a boost straight / perfect line), not merely watches **[theory]**.
9. **Establish a baseline, then escalate by layering verbs (Thumper):** first 8–16 bars use the
   simplest verb only; at most one new verb per section; the apex recombines all active verbs and
   introduces none. *(On-beat verified; verb-layering [theory].)*
10. **Repeat-then-vary in ABAC over every 4 phrases:** state motif A, repeat A, introduce variation B
    (one variable changed), return-and-cap with C; end each 8/16-bar phrase with a fill cue. No motif
    debuts inside the final apex.
11. **Quantize all player-triggered feedback** (hit SFX, color pulse, screen shake, visualizer flash)
    to the beat grid even though raw input is free (Rez rule).

---

## 4. Track-layout vocabulary

### The building blocks (the "words")

For a lane-based tunnel-racer the axes are **lateral position** (lane), **vertical** (jumps/gaps), and
**width/speed gating**. The primitive set:

- **Straight** — the rest beat; where anticipation and speed are manufactured. Lets the player read
  what's coming.
- **Sweeper** — long gentle high-speed curve; tests holding a line, low stress, high flow.
- **Hairpin** — tight near-reversal; in lane terms, a forced multi-lane shift under tight timing.
- **Chicane** — quick left-right jog that scrubs speed and tests rapid reversal.
- **S-curve / esses** — *linked* alternating curves where each exit sets up the next entry; the
  smallest unit with internal grammar (a mistake compounds).
- **Narrow** — pure-precision width reduction; raises demand without changing direction.
- **Jump** — launch + airtime; spectacle and gap-clearing necessity; needs readable lead-in/landing.
- **Gap** — binary-fail hole; telegraphing is mandatory.
- **Elevation change** — crest (hides what's beyond → suspense) and dip (compress → reveal → re-hide).
  Crests are the best controlled information-hiding tool.
- **Fork / branch** — road split; the key type is the **risk/reward shortcut**.

### Corner theory (the physics under the "words")

Corner difficulty is `f(speed, width, grip, visibility)`, and **width is the primary tuning knob**.
Luke McMillan's *Rational Approach* frames cornering as longitudinal vs. lateral force — players
*"apply as much longitudinal force as possible,"* since *"brakes and lateral force… slow the vehicle
down and make it less predictable"* — and names the two essential metrics: **the clipping point (apex)
and the race line**. Crucially for a generator: *"making the road wider will make corners easier as it
creates a more obtuse angle for the clipping points and also provides some forgiveness… the wider the
road is, the straighter the race line becomes"* (exact-paraphrase)
([A Rational Approach to Racing Game Track Design](https://www.gamedeveloper.com/design/a-rational-approach-to-racing-game-track-design)).
So narrow = sharper clip angle = more lateral force = harder; widening the *exit* grants recovery. The
race line is *"the fastest arc through a corner"* — braking point, turn-in, apex/clipping point, exit —
and "slow in, fast out" with a **late apex** lengthens the exit radius
([Driver61](https://driver61.com/uni/racing-line/); [Racing line](https://en.wikipedia.org/wiki/Racing_line)).

Visibility gates difficulty independently of geometry. The WRC7 rally designer's Finland example —
*"braking on every crest because you can't see the road behind it, or going flat-out and jumping at
120 mph in a corner you can't see"* — and the use of **1–3 long-range landmarks per track** *"to guide
the player… heading from one landmark to the next"* are both explicit
([Racing Level design: the rally case](https://www.gamedeveloper.com/design/racing-level-design-the-rally-case)).

### Sequencing (the "sentence rules")

- **See-before-you-do.** A hard corner/jump must be visible far enough ahead at current speed (ties to
  §2's `D_min`). Crests/blind corners deliberately violate this — so they are *learned* hazards, never
  first-encounter forced ambushes. *(WRC7 blind-crest example — VERIFIED.)*
- **Rhythm: compound combos.** The rally piece deforms road into *"water dips or on-camber roads
  followed by a jump into a narrow corner opening on a wide straight line"* — a concrete
  fast→slow→fast sequence. Bracket a slow corner-combo with fast straights; contrast *is* the
  experience. Linked elements are harder than the sum of parts because each exit dictates the next
  entry.
- **Recovery is a payoff economy, not a free zone.** The rally designer frames choices as *"braking
  results in losing 1 second, or not braking risks losing 10 seconds and damaging the car"* —
  recovery rewards the player who set up correctly.
- **Setup → challenge → recovery** and **one new idea at a time** are sound level-design orthodoxy but
  are *not* stated in the racing articles ⚑ — mark **[theory]** / attribute to general LD references.

### Giving a procedural track "authored intent" / soul

The central modern-PCG insight: **don't randomize per-tile; randomize the arrangement of authored
chunks.** In increasing structure:

1. **Handcrafted chunks stitched together** (Spelunky model). Spelunky's layout is *"selected from a
   set of predefined templates"* in which *"a number of chunks are marked in which randomisation can
   occur"* — a 4×4 grid of 16 rooms whose numbers (0–3) encode connectivity (1 = left+right exits, 2
   adds a drop, 3 adds up) *"with rules guaranteeing that there is always a path from the entrance to
   the exit"* ([Spelunky Generator Lessons, Kazemi](http://tinysubversions.com/spelunkyGen/)). That
   room-number scheme *is* the entry/exit interface contract. (The "4–8 primitives per chunk" count is
   our design choice, not Spelunky's **[theory]**.)
2. **Generative grammars.** Treat the track as a string: `Track → Intro Body Body Climax Outro`;
   `Body → Lead-in Challenge Recovery`. The production rules *are* the authored intent. Dormans'
   graph-grammar rewriting (numbered nodes replaced via right-hand-side equivalents) and his
   **'registers'** that *"change the probability of applying rules with increasingly difficult tasks"*
   give a difficulty curve from the grammar itself, with **missions and spaces generated as two
   separate steps** ([Dormans, *Generating Missions and Spaces*](https://pcgworkshop.com/archive/dormans2010adventures.pdf);
   [PCG Book](https://www.pcgbook.com/)). Design grammars give *"remarkably compact descriptions of
   large spaces of levels"* ([Liapis, PCG-book dungeons chapter](https://antoniosliapis.com/articles/pcgbook_dungeons.php)).
3. **Weighted / probabilistic grammar.** Same, but production weights shift with progression (early →
   gentle, late → spikes) — Dormans' registers.
4. **Constraint-based assembly / WaveFunctionCollapse:** each chunk declares what may follow it; the
   solver emits only locally-legal sequences. WFC *"uses the AC-4 algorithm"* and *"the propagation
   phase… is just adjacency constraint propagation"* (exact)
   ([WFC README](https://github.com/mxgmn/WaveFunctionCollapse/blob/master/README.md);
   [Karth & Smith, *WFC is Constraint Solving in the Wild*, FDG 2017](https://dl.acm.org/doi/10.1145/3102071.3110566)).
   Combine with **search-based PCG**: generate candidates, score against a fitness function
   (pacing/fairness/novelty), keep the best — the generate-and-test paradigm centered on *"what content
   is generated, how it's represented, and how quality/fitness is evaluated"*
   ([Togelius et al., *Search-Based PCG: A Taxonomy and Survey*, IEEE TCIAIG 2011](https://ieeexplore.ieee.org/document/5756645)).
   This is exactly what `worldBuilder.js` already does (static physics solver as the fitness oracle).

**Track-as-sentence model:** segments are words, the grammar is syntax, pacing is prosody. The grammar
guarantees grammaticality; the weighting and climax rules provide the prosody.

### ▶ Actionable rules — track-layout vocabulary

1. **Define corner difficulty as `f(speed, width, grip, visibility)` — width primary.** To raise
   difficulty, narrow the road (sharper clip angle, more lateral force); to grant recovery, widen the
   exit. *(McMillan.)*
2. **Store the clipping point (apex lane) + ideal entry/exit lane per authored corner** as first-class
   data, so the generator can validate the race line stays on-track. *(McMillan: clip point + race
   line are the two essential metrics.)*
3. **Gate difficulty with visibility, not just geometry.** Add a `visibility` flag to crest/dip/jump
   primitives; never place a first-encounter forced hazard blind. Blind/ambush hazards only as
   optional/learnable content (shortcut branches, lap-2+). *(WRC7 Finland.)*
4. **Reference compound combo:** `dip/on-camber → jump → narrow corner → wide straight` — author this
   as a canonical fast→slow→fast chunk rather than vague "rhythm." *(WRC7.)*
5. **Telegraph with 1–3 landmarks per stretch** (visual: tunnel/clearing; or gameplay: a deadly
   descent) that pre-announce the upcoming challenge and aid orientation/memory. *(WRC7.)*
6. **Assemble from authored chunks (~4–8 segments), never per-tile randomness.** Maintain a named-phrase
   library (Esses, Chicane, JumpPhrase, NarrowGate, ForkRiskReward, Sweeper, Recovery); randomize
   *which* chunk and marked sub-fills, not raw tiles. *(Spelunky.)*
7. **Every chunk declares `entryState`/`exitState`** (lane-in/out, width-in/out, speed band, elevation);
   only concatenate chunks with matching interfaces, else insert a transition chunk. *(Spelunky
   room-connectivity contract, generalized.)*
8. **Lay a validated drivable spine first, then decorate** with optional forks/hazards — guarantees
   entrance→exit traversability before adding risk. *(Spelunky path-first; Togelius
   necessary-vs-optional content.)*
9. **Enforce the three-beat phrase (setup → challenge → recovery) as a grammar production** **[theory]**
   — no two challenge-class chunks adjacent without a recovery between; weight chunk selection by
   progression (early gentle → late spikes) so the interest curve emerges from the grammar (Dormans
   registers).
10. **Add WFC-style adjacency constraints on chunk interfaces** so most candidates are valid *by
    construction*, then run the static physics solver on every artifact (search-based PCG) and reject
    failures. Cap repetition: same template not twice in a row, no template exceeds a set share of a
    track; pair with a novelty term in fitness. *(WFC; Togelius 2011.)*

---

## 5. Variety & anti-monotony

### The core levers

- **Decouple visuals from mechanics.** What the player *does* and what they *see* are independent
  variety channels, and the visual channel is far cheaper. *A Game Design Vocabulary* treats
  verbs/objects (mechanics) and scenes/pacing/aesthetic surface (visuals) as distinct layers a
  designer shapes separately ([sample PDF](https://ptgmedia.pearsoncmg.com/images/9780321886927/samplepages/0321886925.pdf);
  [review](https://www.firstpersonscholar.com/a-game-design-vocabulary/)), and Koster's mechanism (below)
  is *why* a reskin can feel new. ⚑ No source states verbatim "reskin = new" — it's a sound synthesis
  **[theory]**.
- **Perceived variety via recombination of a small vocabulary** under an anti-repeat grammar.
  Procedural freshness comes from a small, strong set of "obstacle words" recombined under constraints
  — Spelunky's modular rooms, design grammars that give *"remarkably compact descriptions of large
  spaces of levels"* ([Liapis](https://antoniosliapis.com/articles/pcgbook_dungeons.php)), and WFC,
  where *"the propagation phase… is just adjacency constraint propagation"* over a small tile set
  ([WFC](https://github.com/mxgmn/WaveFunctionCollapse/blob/master/README.md)). The *grammar*, not the
  asset count, defeats monotony — VERIFIED.
- **Mechanic-introduction cadence.** Introduce *one new mechanic at a time*: a safe space to learn it,
  then a real test, then a harder/subverted use
  ([Game Developer — Introducing Mechanics](https://www.gamedeveloper.com/design/game-design-introducing-mechanics);
  [Hierarchy of Learning](https://www.gamedeveloper.com/design/teaching-game-mechanics-a-hierarchy-of-learning);
  [GMTK lessons](https://gmtk.substack.com/p/10-game-design-lessons-from-10-years)). The 3-beat cadence
  is well-supported; the "teach→test→twist" slogan is GMTK-adjacent shorthand, not a verbatim quote.
  Academic formalization: [*Generating Levels That Teach Mechanics*](https://arxiv.org/pdf/1807.06734).
- **Biome transitions: intentional, not jarring.** Anchor a transition on a readable **landmark** — *"a
  unique element of level architecture that stands out… to give a general idea on level directions"*;
  players look toward movement and toward contrast (color/shape/light/motion)
  ([level-design.org landmarks](https://level-design.org/?page_id=2261);
  [Level Design Book — wayfinding](https://book.leveldesignbook.com/process/blockout/wayfinding)).
  ⚑ The draft's "Schell Lens of Foreshadowing" could not be verified verbatim — cite *anticipation*
  generically. Foreshadowing the next biome, and "change one variety channel at a time per seam," are
  sound inferences **[theory]**, not cited rules.
- **Endless-runner freshness toolkit.** The strongest single citation is the **Tetris 7-bag**, which is
  precisely draw-without-replacement: the Random Generator *"generates a sequence of all seven… as if
  drawn from a bag, then deals all seven before generating another bag,"* which *"reduces extreme
  variations"* and bounds droughts (≤12 pieces between I-pieces; S/Z runs ≤4)
  ([Hard Drop — Random Generator](https://harddrop.com/wiki/Random_Generator)). Shuffle-bag selection
  kills both the clusters *and* the droughts players misread as "samey." Also: an early-game difficulty
  ramp should *let the player adapt to speed/art/audio before real challenge*
  ([Game Developer — runners progression](https://www.gamedeveloper.com/design/studying-gameplay-progression-on-runners)).
  Scheduled biome rotation and meta-progression are common practice **[theory]**.

The model beneath all of it (Koster): fun is *"our brain's attempt at learning something new"* — games
go boring when the pattern is already mastered and frustrating/overwhelming when it's unreadable. The
sweet spot is a steady supply of new, *graspable* patterns — small, legible surprises in the gap
between expectation and outcome ([Koster, *A Theory of Fun*](https://www.raphkoster.com/games/a-theory-of-fun/);
[summary](https://game-studies.fandom.com/wiki/A_Theory_of_Fun_for_Game_Design)).

### ▶ Actionable rules — variety & anti-monotony

1. **Two independent variety channels: skin and grammar.** Track `biomeId` (visuals) and `segmentVocab`
   (mechanics) as separate fields; a new biome over old mechanics is a legal, cheap "new" beat. Don't
   gate biome changes on mechanic changes. *(Anthropy/Clark layering; Koster.)*
2. **Small vocabulary, hard anti-repeat grammar.** Author ~6–10 segment archetypes; forbid the same
   archetype twice in a row and cap any archetype to a set share per window. Variety is a property of
   the grammar, not the asset count. *(Spelunky/PCG-book/WFC.)*
3. **Adjacency rules, not free random.** Define allowed predecessor→successor pairs per segment
   (WFC-style) so seams are always legal and solvable.
4. **Shuffle-bag selection, not i.i.d. random.** Pick segments/biomes by draw-without-replacement from
   a bag, refilling only when empty (Tetris 7-bag); minimum re-use cooldown ≥4 segments per template,
   plus explicit drought caps (e.g. "≤ X segments before each required mechanic reappears", mirroring
   Tetris's I ≤12 / S-Z ≤4 bounds). *(Hard Drop — VERIFIED.)*
5. **One new mechanic per introduction, with a teach→test→twist triplet.** When the grammar emits a new
   archetype, force the next ~3 segments isolated-safe → real-test → combined/subverted before it may
   co-occur with other new mechanics. *(Game Developer / GMTK; arXiv 1807.06734.)*
6. **Distance-tied difficulty ramp as a monotone function** (speed, density, gap tightness = f(distance));
   admissible archetype complexity unlocks by distance band. Hold the first band easy so the player
   adapts to speed/art/audio. *(Game Developer runners.)*
7. **Rotate set-dressing/biome on its own shuffle-bag clock** (every ~8–12 segments) even if mechanics
   repeat — perceived variety is the cheap fill between mechanical milestones **[theory]**.
8. **Only one variety channel changes per seam.** Don't simultaneously swap biome, introduce a
   mechanic, and spike difficulty — defer the rest by ≥2 segments. *(Inference from Koster legibility +
   cadence — [theory].)*
9. **Anchor every transition on a readable landmark + foreshadow the next biome** in the final 1–2
   segments (distant silhouette, fog drift, audio motif). Use high-contrast placement (Valve
   composition). Landmarking VERIFIED; foreshadowing = anticipation principle **[theory]**.
10. **Tune novelty into Koster's band.** At least one new graspable pattern every K segments (avoid
    boredom), at most one unfamiliar/never-combined element at a time (avoid overwhelm); a twist
    combines exactly one familiar element with one other familiar element. Optional meta-progression
    extends the curve past mechanical mastery. *(Koster — VERIFIED.)*

---

## 6. Automated / AI playtesting for level quality

### Agents as pre-human playtesters

Human playtesting is slow and high-variance; run automated agents over every generated track first. EA
SEED's deep-RL testing self-learns to explore game mechanics via a user-defined reward to *increase
test coverage, find exploits, **test map difficulty**, and detect common testing problems*
([*Augmenting Automated Game Testing with Deep Reinforcement Learning*, IEEE CoG 2020,
arXiv:2103.15819](https://arxiv.org/abs/2103.15819);
[camera-ready](https://ieee-cog.org/2020/papers/paper_215.pdf)). Agent taxonomy
([Yannakakis & Togelius, *Artificial Intelligence and Games*](https://gameaibook.org/),
[full PDF](https://gameaibook.org/book.pdf)):

- **Scripted / heuristic bots** — cheapest; a controller parameterized by reaction latency `R` and
  steering/brake authority. *The workhorse for solvability + difficulty-band gating in CI.*
  Deterministic and reproducible. **For a tunnel-racer, this is the right default.**
- **Search-based (MCTS / A\*)** — proves near-optimal solvability and measures the skill ceiling; the
  standard PCG-evaluation agent.
- **RL agents** — approximate human/expert play to estimate achievable scores and difficulty (EA SEED).
- **Procedural personas** — agents evolved to capture different decision styles so a track is measured
  against a *population*, not one optimum; a small evolved persona gallery matches human decision-making
  about as well as clones evolved from play-traces ([*Evolving Personas for Player Decision Modeling*,
  ⚑ IEEE **CIG 2014**](http://julian.togelius.com/Holmgard2014Evolving.pdf);
  [MCTS personas, arXiv:1802.06881](https://arxiv.org/pdf/1802.06881)).

### Metrics (telemetry)

- **Death/failure heatmaps** — failure-distance histogram per segment; spikes = difficulty spikes or
  unfair geometry. ⚑ The draft's "Bungie GDC 2008" attribution is unconfirmed; Halo 3's per-map kill/
  death heatmaps are real ([Halo 3 heatmaps](https://halo.fandom.com/wiki/Heatmaps)) — cite the feature
  / Wired 2007 write-up, not a named GDC session.
- **Near-miss detection** — frames within clearance `ε` of an obstacle without colliding; a tension/
  engagement signal **[house heuristic — no direct source]**.
- **Completion-time mean & variance** — variance/CV as a difficulty-discrimination signal (a segment
  everyone clears identically is trivial; spread separates skill). This is psychometrics-by-analogy
  **[theory]**.
- **Stuck / no-progress detection** — position delta below threshold for T seconds, or repeated failure
  at one coordinate → a trap. Derivable from EA SEED coverage exploration **[theory]**.
- **Attempt counts / retries to clear** — Super Meat Boy / Celeste ship visible death counters; a
  classic difficulty proxy (illustrative, not a research claim).
- **Drop-off / funnel** — where players quit; the key retention signal
  ([Seif El-Nasr, Drachen & Canossa (eds.), *Game Analytics*, Springer 2013 ⚑ edited
  volume](https://link.springer.com/book/10.1007/978-1-4471-4769-5)).

### What correlates with "fun"

Backbone: **Flow** + **GameFlow** ([Sweetser & Wyeth, ACM CIE 2005](https://dl.acm.org/doi/10.1145/1077246.1077253),
whose eight elements include challenge, player skills, control, clear goals, feedback) and **DDA**
([Hunicke, *The case for dynamic difficulty adjustment* / the **Hamlet** system, ⚑ **ACE 2005** — not
AIIDE](https://dl.acm.org/doi/10.1145/1178477.1178573)). Measurable correlates:

- **Moderate, not extreme, challenge** — engagement follows an inverted-U: too easy → boredom, too hard
  → anxiety (Flow + optimal-arousal / intrinsic-motivation studies,
  [PMC5368271](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5368271/)). The curve is over *perceived
  challenge*; operationalizing it as a *failure-rate* target is a reasonable proxy **[theory]**.
- **Near-miss frequency in a target band** — steady close calls = tension without unfairness **[theory]**.
- **Completion-time variance in a band** — enough spread that skill matters, not so much that outcomes
  feel random **[theory]**.
- **Rising-but-not-monotone difficulty** (the §1 sawtooth).
- **Low unfair-death rate** — deaths unavoidable at human-plausible latency are the worst signal; one
  such death = the segment is unfair, full stop (violates GameFlow control/feedback).

### PCG quality evaluation

- **Expressive Range Analysis (ERA)** [[Smith & Whitehead, FDG/PCG 2010](https://www.researchgate.net/publication/228411962)]:
  pick cheap level metrics (the original used **linearity, leniency, density**), generate hundreds of
  tracks, plot the 2D heatmap. Reveals coverage, bias, and gaps — does the generator explore the space
  or collapse to a few archetypes?
- **Solvability verification** — run an automated solver on *every* artifact; reject anything it can't
  complete. The A\*-based [Mario AI Framework](http://julian.togelius.com/Karakovskiy2012The.pdf)
  reduces completion to a pathfinding/solvability check; the agent *is* the playability oracle.
- **Simulation-based difficulty** — estimate difficulty from a calibrated agent's failure
  probability/attempts rather than static feature counts. Supported in spirit by EA SEED's "test map
  difficulty"; the precise agent-to-human difficulty correlation is **[theory]** absent a measured study.
- **Quality-Diversity / MAP-Elites** [[Mouret & Clune 2015, arXiv:1504.04909](https://arxiv.org/abs/1504.04909)]
  builds *"a map of high-performing solutions at each point in a space defined by dimensions of
  variation chosen by the user"* — applied to PCG by
  [Gravina, Khalifa, Liapis, Togelius & Yannakakis, *PCG through Quality Diversity*, IEEE CoG 2019](https://arxiv.org/abs/1907.04053).
  Fill a grid over (difficulty × variety) with the best track per cell to guarantee a *spread* of
  beatable, distinct levels.

### The verification pattern (operational heart)

1. **Solvability gate (binary):** strong agent must finish, else reject.
2. **Difficulty-band gate (statistical):** representative agent runs N times; accept only if failure
   rate ∈ `[Y%, X%]` and completion time ∈ the band for that ladder slot.
3. **Skill-tier sweep:** run agents at several reaction latencies; failure rate must be monotone in
   skill (novice ≥ med ≥ expert) — else the track doesn't reward skill or is unfair.
4. **Unfairness check:** flag any death unavoidable within bounded reaction time + actuation.
5. **ERA / QD placement:** tag each accepted track and bin it so the shipped set *spreads*.

### ▶ Actionable rules — automated playtesting

Tag legend: **[S]** sourced · **[T]** theory/heuristic · **[H]** house heuristic.

1. **Hard solvability gate (CI):** every generated track must be completed by a strong reference bot
   (A\*/MCTS or fast scripted bot at `R_expert`) in ≥1 of K runs, or it is rejected. No exceptions.
   **[S — Mario AI Framework.]**
2. **Use a persona gallery, not one bot:** ≥3 archetypes (speedrunner/risk-taker, cautious/safe,
   completionist) so coverage spans play styles. **[S — Evolving Personas, CIG 2014.]**
3. **Reaction-time fairness rule:** every obstacle/gap must be clearable by a bot at human-plausible
   latency `R_human ≈ 250 ms` (simple) / `≥ 340 ms` (forced choice, §2) at local speed — required
   clearance ≥ ship width + `speed × R_human` + actuation. Any death unavoidable at `R_human` = unfair
   → regenerate. **[S — §2 RT sources.]**
4. **Failure-rate band gate:** run a calibrated average-skill bot N≥100 Monte-Carlo runs; accept only
   if death rate ∈ **[15%, 55%]** envelope, targeting the middle (~30–40% *fair*-failure for peak
   engagement). **[T — operationalizes inverted-U; calibrate per slot.]**
5. **Near-miss density target:** ~3–8 near-misses/min for the average bot. **[H — tuning default.]**
6. **Completion-time CV band** across the bot population in ~**[10%, 35%]**; near-zero = non-
   discriminating, very high = feels random. **[T — variance-as-discrimination analogy.]**
7. **Monotone-in-skill rule:** run ≥3 reaction latencies; failure rate must be non-increasing with
   skill, else reject. **[S — implied by GameFlow skill-challenge balance.]**
8. **Death/funnel telemetry:** build a per-segment failure heatmap + attrition funnel; flag any segment
   with concentrated deaths or population collapse. **[S — Halo 3 heatmaps; Game Analytics 2013.]**
9. **Difficulty-ladder placement:** tag each track with a sim-based difficulty score
   (≈ failure-rate × attempts-to-clear); slot only where target difficulty matches, enforce a
   generally-rising ladder with periodic relief. **[T.]**
10. **Expressive-range coverage:** run ERA on ≥500 generated tracks over ≥2 metrics (e.g. density ×
    curvature, or linearity/leniency); the generator must cover the intended region, not collapse —
    re-tune on gaps/clustering. **[S — Smith & Whitehead 2010.]**
11. **Quality-Diversity binning:** maintain a MAP-Elites grid over (difficulty × variety); ship only
    tracks that fill distinct bins; reject near-duplicates landing in a filled cell. **[S — Mouret &
    Clune 2015; Gravina et al. CoG 2019.]**
12. **Cheap static pre-filter before expensive sim:** reject tracks failing analytic affordance checks
    (min gap width vs. speed, max consecutive hazards, no zero-margin sections) before running bots.
    **[H.]**
13. **Human-anchored recalibration:** each milestone, re-fit the bot-to-human difficulty mapping against
    real telemetry (death heatmaps, attempts, drop-off). Treat all numeric bands above as living
    constants re-derived from human data — the bot is a proxy that drifts. **[S/T.]**

---

## Appendix — consolidated "one-screen" constraint sheet

Hard constraints worth wiring straight into the generator + validator:

- **Lead-in:** forced hazard distance ≥ `ship_speed × T_total`; recompute per segment.
  `T_perceive ≥ 0.25 s` single / `≥ 0.40 s` choice (Hick's `RT = a + b·log₂(n+1)`), never below the
  **0.34 s** DS3 floor; split latency into human motor ~0.1–0.15 s + machine input lag ~0.015–0.05 s;
  add a slow-tail buffer (~2× median).
- **Occlusion:** forced hazard unoccluded for the entire `T_total` (raycast check); absolute reveal
  floor ≥ 0.8 s (single) / 1.1 s (choice). Cap simultaneous independent fork choices at ≤3–4.
- **One forced demand per `T_total` window;** `max_forced_per_second ≤ 1/T_total`.
- **Danger = one reserved emissive hue + silhouette/value-contrast pass** (Mirror's Edge + Valve "Read
  Hierarchy"); never color-only.
- **Corner difficulty = f(speed, width, grip, visibility), width primary;** store apex/clip + race line
  per corner; gate hard corners on visibility; blind hazards only as learnable/optional content.
- **Chunks of ~4–8 segments**, interface-matched (entry/exit state); never per-tile random; lay a
  validated drivable spine first.
- **Three-beat phrase** (setup→challenge→recovery) as a grammar rule; weight chunk selection by
  progression (Dormans registers); WFC-style adjacency so candidates are valid by construction.
- **Sawtooth intensity:** cap any climb at 3–4 segments → forced breather; never 3+ tight segments in a
  row; troughs genuinely easy.
- **Exactly one climax/set-piece per track, in the final third, on a phrase boundary, telegraphed 4
  bars ahead, caused by the player.**
- **One new mechanic per track-third;** teach→develop→twist→conclude; safe-intro before lethal/combined.
- **One variety channel changed per seam;** rotate set-dressing every 8–12 segments on its own
  shuffle-bag; draw-without-replacement selection with ≥4-segment cooldown + drought caps; template
  repeat cap.
- **Snap obstacles + feedback to the beat grid** when audio exists (librosa beat_track + spectral-flux
  onset); drive macro shape from band energy; align big changes to 4/8/16-bar downbeats; build→drop
  resolves on the downbeat.
- **Validate every track with bots:** solvable at `R_expert`, fair at `R_human≈250 ms`/`≥340 ms choice`,
  failure rate ∈ [15%, 55%] (target ~30–40%), near-miss 3–8/min, time-CV ∈ [10%, 35%], monotone in
  skill, ≥3 personas. Reject/regenerate on fail.
- **Characterize the generator** with Expressive Range Analysis + MAP-Elites binning; recalibrate all
  numeric bands against human telemetry each milestone (they are living constants).
