/**
 * Stage 1 of the audio→level pipeline: offline music analysis.
 *
 * Decodes each synthwave track to mono PCM via ffmpeg, then runs a hand-rolled
 * DSP pass (no npm deps) to extract everything the level generator needs:
 *   - BPM            (autocorrelation of a spectral-flux onset envelope)
 *   - onset times    (adaptive-threshold peak picking on the flux envelope)
 *   - band energies  (bass / mid / treble envelopes, per frame)
 *   - melody pitch   (Harmonic Product Spectrum per frame + confidence)
 *   - sections       (energy-based segmentation: low / mid / high)
 *
 * Results are cached to tools/audio_analysis/<track>.json for stage 2 to reuse,
 * and the 12 tracks are ranked to auto-pick the clearest candidate (steady BPM
 * + prominent melody + good dynamic range between fast/slow sections).
 *
 * Usage:
 *   node tools/analyze_audio.js                 # analyze all tracks, print ranking
 *   node tools/analyze_audio.js --track 11      # analyze one track by number
 *   node tools/analyze_audio.js --force         # ignore cache, re-analyze
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TRACKS_DIR = path.join(ROOT, 'assets', 'Music', 'tracks');
const OUT_DIR = path.join(__dirname, 'audio_analysis');

// ── Analysis parameters ───────────────────────────────────────────────────────
const SR = 22050;          // analysis sample rate (plenty for music; halves the work)
const FRAME = 2048;        // FFT window size
const HOP = 512;           // hop → frame rate = SR/HOP ≈ 43.07 fps
const FPS = SR / HOP;
const BPM_MIN = 70;
const BPM_MAX = 180;
const PITCH_MIN_HZ = 110;  // melody search range (A2..)
const PITCH_MAX_HZ = 1200; // ..D6
const MIN_SECTION_SEC = 6; // sections shorter than this get merged into a neighbor

// ── ffmpeg decode → Float32Array (mono) ───────────────────────────────────────
function decodeToPCM(mp3Path) {
  const tmp = path.join(os.tmpdir(), `skyroads_pcm_${Date.now()}_${Math.random().toString(36).slice(2)}.f32`);
  try {
    execSync(
      `ffmpeg -v error -y -i "${mp3Path}" -ac 1 -ar ${SR} -f f32le "${tmp}"`,
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    const buf = fs.readFileSync(tmp);
    // Float32Array view over the raw little-endian f32 bytes
    return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  } finally {
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}

// ── Iterative radix-2 FFT (in-place, complex) ─────────────────────────────────
function fft(re, im) {
  const n = re.length;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr;        im[a] += ti;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

// Precomputed Hann window
const HANN = new Float32Array(FRAME);
for (let i = 0; i < FRAME; i++) HANN[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (FRAME - 1)));

const HALF = FRAME / 2;
const binToHz = (k) => (k * SR) / FRAME;
const BASS_BIN = Math.floor((250 * FRAME) / SR);
const MID_BIN = Math.floor((4000 * FRAME) / SR);

// Harmonic Product Spectrum melody estimate from one magnitude frame.
// Returns { hz, confidence } where confidence is the HPS peak share of energy.
const HPS_HARMONICS = 4;
const PITCH_MIN_BIN = Math.max(2, Math.floor((PITCH_MIN_HZ * FRAME) / SR));
const PITCH_MAX_BIN = Math.min(Math.floor(HALF / HPS_HARMONICS), Math.ceil((PITCH_MAX_HZ * FRAME) / SR));
function estimatePitch(mag) {
  let bestBin = -1, bestVal = 0, total = 1e-9;
  for (let k = PITCH_MIN_BIN; k <= PITCH_MAX_BIN; k++) {
    let prod = mag[k];
    for (let h = 2; h <= HPS_HARMONICS; h++) prod *= mag[k * h];
    if (prod > bestVal) { bestVal = prod; bestBin = k; }
    total += prod;
  }
  if (bestBin < 0) return { hz: 0, confidence: 0 };
  // confidence: how concentrated the HPS is at its peak (0..1)
  const confidence = Math.min(1, bestVal / total);
  return { hz: binToHz(bestBin), confidence };
}

// ── Main per-track analysis ───────────────────────────────────────────────────
function analyze(pcm) {
  const nFrames = Math.max(1, Math.floor((pcm.length - FRAME) / HOP) + 1);
  const flux = new Float32Array(nFrames);
  const bass = new Float32Array(nFrames);
  const mid = new Float32Array(nFrames);
  const treble = new Float32Array(nFrames);
  const energy = new Float32Array(nFrames);     // total spectral energy (for sections)
  const pitchHz = new Float32Array(nFrames);
  const pitchConf = new Float32Array(nFrames);

  const re = new Float64Array(FRAME);
  const im = new Float64Array(FRAME);
  const mag = new Float32Array(HALF);
  let prevMag = new Float32Array(HALF);

  for (let f = 0; f < nFrames; f++) {
    const off = f * HOP;
    for (let i = 0; i < FRAME; i++) { re[i] = pcm[off + i] * HANN[i]; im[i] = 0; }
    fft(re, im);

    let b = 0, m = 0, t = 0, e = 0, fl = 0;
    for (let k = 0; k < HALF; k++) {
      const v = Math.sqrt(re[k] * re[k] + im[k] * im[k]);
      mag[k] = v;
      e += v;
      if (k < BASS_BIN) b += v; else if (k < MID_BIN) m += v; else t += v;
      const d = v - prevMag[k];
      if (d > 0) fl += d;           // half-wave rectified spectral flux
    }
    flux[f] = fl; bass[f] = b; mid[f] = m; treble[f] = t; energy[f] = e;

    const p = estimatePitch(mag);
    pitchHz[f] = p.hz; pitchConf[f] = p.confidence;

    const tmp = prevMag; prevMag = mag.slice ? mag.slice() : Float32Array.from(mag); // keep copy
    void tmp;
  }

  const durationSec = pcm.length / SR;
  const { bpm, bpmConfidence } = estimateBPM(flux);
  const onsets = pickOnsets(flux);
  const sections = segmentSections(energy, durationSec);

  // Melody prominence: mean pitch confidence over the louder half of frames
  const medE = median(energy);
  let pc = 0, pcN = 0;
  for (let f = 0; f < nFrames; f++) if (energy[f] >= medE) { pc += pitchConf[f]; pcN++; }
  const melodyProminence = pcN ? pc / pcN : 0;

  // Dynamic range across sections (favours tracks with distinct fast/slow parts)
  const secE = sections.map(s => s.avgEnergy);
  const dynamicRange = secE.length > 1 ? std(secE) / (mean(secE) + 1e-9) : 0;

  return {
    sampleRate: SR, frame: FRAME, hop: HOP, fps: FPS,
    durationSec: round(durationSec, 2),
    bpm: round(bpm, 2),
    bpmConfidence: round(bpmConfidence, 4),
    beatPeriodSec: round(60 / bpm, 4),
    melodyProminence: round(melodyProminence, 4),
    dynamicRange: round(dynamicRange, 4),
    onsetCount: onsets.length,
    onsets: onsets.map(t => round(t, 3)),
    sections,
    // per-frame envelopes (downsampled-friendly; rounded to keep cache small)
    envelopes: {
      flux: toRounded(normalize(flux)),
      bass: toRounded(normalize(bass)),
      mid: toRounded(normalize(mid)),
      treble: toRounded(normalize(treble)),
      energy: toRounded(normalize(energy)),
      pitchHz: toRounded(pitchHz, 1),
      pitchConf: toRounded(pitchConf, 3),
    },
  };
}

// ── BPM: autocorrelation of the onset (flux) envelope ─────────────────────────
function estimateBPM(flux) {
  // Detrend: subtract a local moving average so steady energy doesn't dominate ACF
  const env = new Float32Array(flux.length);
  const W = Math.round(FPS * 0.5);
  for (let i = 0; i < flux.length; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(flux.length - 1, i + W); j++) { s += flux[j]; c++; }
    env[i] = Math.max(0, flux[i] - s / c);
  }
  const lagMin = Math.floor((FPS * 60) / BPM_MAX);
  const lagMax = Math.ceil((FPS * 60) / BPM_MIN);
  let bestLag = lagMin, bestVal = -Infinity;
  const acf = new Float64Array(lagMax + 1);
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let s = 0;
    for (let i = 0; i + lag < env.length; i++) s += env[i] * env[i + lag];
    acf[lag] = s;
    if (s > bestVal) { bestVal = s; bestLag = lag; }
  }
  // Parabolic interpolation around the peak for sub-frame lag resolution
  let lag = bestLag;
  if (bestLag > lagMin && bestLag < lagMax) {
    const a = acf[bestLag - 1], b = acf[bestLag], c = acf[bestLag + 1];
    const denom = a - 2 * b + c;
    if (denom !== 0) lag = bestLag + (0.5 * (a - c)) / denom;
  }
  const bpm = (FPS * 60) / lag;
  // Confidence: peak height vs mean ACF over the search band
  let m = 0, n = 0;
  for (let l = lagMin; l <= lagMax; l++) { m += acf[l]; n++; }
  const meanAcf = m / n;
  const bpmConfidence = meanAcf > 0 ? Math.min(1, (bestVal / meanAcf - 1) / 3) : 0;
  return { bpm, bpmConfidence };
}

// ── Onset peak picking (adaptive threshold) ───────────────────────────────────
function pickOnsets(flux) {
  const n = flux.length;
  const norm = normalize(flux);
  const W = Math.round(FPS * 0.15);   // local window ~150ms
  const onsets = [];
  let lastOnset = -Infinity;
  const minGap = Math.round(FPS * 0.10); // no two onsets within 100ms
  for (let i = 1; i < n - 1; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) { s += norm[j]; c++; }
    const thresh = s / c + 0.12;
    if (norm[i] > thresh && norm[i] >= norm[i - 1] && norm[i] >= norm[i + 1] && i - lastOnset >= minGap) {
      onsets.push(i / FPS);
      lastOnset = i;
    }
  }
  return onsets;
}

// ── Section segmentation by smoothed energy → low / mid / high ─────────────────
function segmentSections(energy, durationSec) {
  const n = energy.length;
  // Smooth energy over ~2s
  const W = Math.round(FPS * 1.0);
  const sm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) { s += energy[j]; c++; }
    sm[i] = s / c;
  }
  const lo = percentile(sm, 0.40);
  const hi = percentile(sm, 0.70);
  const levelOf = (v) => (v < lo ? 0 : v < hi ? 1 : 2);

  // Build raw contiguous runs of equal level
  let runs = [];
  let start = 0, lvl = levelOf(sm[0]);
  for (let i = 1; i < n; i++) {
    const L = levelOf(sm[i]);
    if (L !== lvl) { runs.push({ s: start, e: i, lvl }); start = i; lvl = L; }
  }
  runs.push({ s: start, e: n, lvl });

  // Merge runs shorter than MIN_SECTION_SEC into the neighbour with closer energy
  const minFrames = Math.round(MIN_SECTION_SEC * FPS);
  let changed = true;
  while (changed && runs.length > 1) {
    changed = false;
    for (let i = 0; i < runs.length; i++) {
      if (runs[i].e - runs[i].s < minFrames) {
        // merge with the longer neighbour
        const prev = runs[i - 1], next = runs[i + 1];
        let target = null;
        if (prev && next) target = (prev.e - prev.s) >= (next.e - next.s) ? prev : next;
        else target = prev || next;
        if (target === prev) { prev.e = runs[i].e; }
        else { next.s = runs[i].s; }
        runs.splice(i, 1);
        changed = true;
        break;
      }
    }
  }

  // Coalesce any adjacent runs that ended up at the same level after merging
  for (let i = runs.length - 1; i > 0; i--) {
    if (runs[i].lvl === runs[i - 1].lvl) { runs[i - 1].e = runs[i].e; runs.splice(i, 1); }
  }

  const labels = ['low', 'mid', 'high'];
  return runs.map(r => {
    let e = 0;
    for (let i = r.s; i < r.e; i++) e += sm[i];
    return {
      startSec: round(r.s / FPS, 2),
      endSec: round(r.e / FPS, 2),
      durationSec: round((r.e - r.s) / FPS, 2),
      level: labels[r.lvl],
      avgEnergy: round(e / Math.max(1, r.e - r.s), 4),
    };
  });
}

// ── small math helpers ────────────────────────────────────────────────────────
function normalize(arr) {
  let max = 0;
  for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  const out = new Float32Array(arr.length);
  if (max > 0) for (let i = 0; i < arr.length; i++) out[i] = arr[i] / max;
  return out;
}
function mean(a) { let s = 0; for (const v of a) s += v; return a.length ? s / a.length : 0; }
function std(a) { const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(a.length ? s / a.length : 0); }
function median(a) { return percentile(a, 0.5); }
function percentile(a, p) {
  const arr = Array.from(a).sort((x, y) => x - y);
  if (!arr.length) return 0;
  const idx = Math.min(arr.length - 1, Math.max(0, Math.floor(p * (arr.length - 1))));
  return arr[idx];
}
function round(v, d = 2) { const m = 10 ** d; return Math.round(v * m) / m; }
function toRounded(arr, d = 4) { const m = 10 ** d; const out = new Array(arr.length); for (let i = 0; i < arr.length; i++) out[i] = Math.round(arr[i] * m) / m; return out; }

// ── Track list / CLI ──────────────────────────────────────────────────────────
function listTracks() {
  return fs.readdirSync(TRACKS_DIR)
    .filter(f => f.endsWith('.mp3'))
    .sort();
}

function scoreTrack(a) {
  // Weighted: melody clarity + steady BPM + distinct fast/slow sections
  const dyn = Math.min(1, a.dynamicRange / 0.6);
  return round(0.45 * a.melodyProminence + 0.35 * a.bpmConfidence + 0.20 * dyn, 4);
}

function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const trackArg = args.includes('--track') ? args[args.indexOf('--track') + 1] : null;

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  let tracks = listTracks();
  if (trackArg) {
    const num = String(trackArg).padStart(2, '0');
    tracks = tracks.filter(t => t.startsWith(num));
    if (!tracks.length) { console.error(`No track matching "${trackArg}"`); process.exit(1); }
  }
  if (!tracks.length) { console.error(`No .mp3 files in ${TRACKS_DIR}`); process.exit(1); }

  const results = [];
  for (const file of tracks) {
    const name = file.replace(/\.mp3$/, '');
    const cachePath = path.join(OUT_DIR, `${name}.json`);
    let analysis;
    if (!force && fs.existsSync(cachePath)) {
      analysis = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      process.stdout.write(`  CACHED  ${file}\n`);
    } else {
      process.stdout.write(`  ANALYZE ${file} ... `);
      const t0 = Date.now();
      const pcm = decodeToPCM(path.join(TRACKS_DIR, file));
      analysis = analyze(pcm);
      analysis.file = file;
      analysis.name = name;
      fs.writeFileSync(cachePath, JSON.stringify(analysis));
      console.log(`done (${((Date.now() - t0) / 1000).toFixed(1)}s, ${analysis.durationSec}s audio, ${(fs.statSync(cachePath).size / 1024 | 0)} KB)`);
    }
    analysis.score = scoreTrack(analysis);
    results.push(analysis);
  }

  // Ranking table
  results.sort((a, b) => b.score - a.score);
  console.log('\n  RANKING (clearest melody + steadiest BPM + most dynamic):');
  console.log('  ' + 'track'.padEnd(26) + 'score  bpm    bpmConf  melody  dynRange  sections  dur');
  console.log('  ' + '-'.repeat(86));
  for (const a of results) {
    const secSummary = `${a.sections.length}`.padStart(3);
    console.log('  ' +
      (a.name || a.file).padEnd(26) +
      String(a.score).padEnd(7) +
      String(a.bpm).padEnd(7) +
      String(a.bpmConfidence).padEnd(9) +
      String(a.melodyProminence).padEnd(8) +
      String(a.dynamicRange).padEnd(10) +
      secSummary.padEnd(10) +
      `${a.durationSec}s`);
  }
  const winner = results[0];
  console.log('\n  ► AUTO-PICK: ' + (winner.name || winner.file));
  console.log(`    bpm ${winner.bpm} (conf ${winner.bpmConfidence}), melody ${winner.melodyProminence}, ` +
    `${winner.sections.length} sections, ${winner.durationSec}s`);
  console.log('    section map: ' + winner.sections.map(s => `${s.level}[${s.startSec}-${s.endSec}]`).join(' '));
  console.log(`\n  Cache written to ${path.relative(ROOT, OUT_DIR)}/`);
}

main();
