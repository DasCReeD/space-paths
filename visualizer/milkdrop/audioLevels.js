/**
 * audioLevels.js — bass/mid/treb analysis with attack-smoothing.
 *
 * Ported from Butterchurn's AudioLevels class
 * (node_modules/butterchurn/dist/butterchurn.js ~3175-3301, MIT). Milkdrop
 * presets read six audio variables in their equations: bass/mid/treb
 * (instantaneous, normalized to a long-running average so they hover ~1.0)
 * and bass_att/mid_att/treb_att (the same but attack/decay smoothed — what
 * gives the "pumps on the beat, eases off" feel).
 *
 * We read a standard Web Audio AnalyserNode (the one Webamp exposes via
 * media.getAnalyser()) with getByteFrequencyData. Butterchurn runs its own
 * FFT, but because every value here is normalized by its own long-term
 * average (a ratio), the absolute magnitude scale of the source doesn't
 * matter — getByteFrequencyData's 0-255 bytes produce the same ~1.0-centered
 * ratios.
 */

function clamp(x, lo, hi) {
  return Math.min(hi, Math.max(lo, x))
}

function adjustRateToFPS(rate, baseFPS, fps) {
  return rate ** (baseFPS / fps)
}

export class AudioLevels {
  /**
   * @param {AnalyserNode} analyser - fftSize should be 1024 (512 freq bins)
   */
  constructor(analyser) {
    this.analyser = analyser
    this.binCount = analyser.frequencyBinCount // 512 for fftSize 1024
    this.freqArray = new Uint8Array(this.binCount)
    // Time-domain PCM for the basic waveform seed (0-255, silence = 128).
    this.timeArray = new Uint8Array(analyser.fftSize)

    const sampleRate = (analyser.context && analyser.context.sampleRate) || 44100
    // Butterchurn uses fftSize = numSamps*2; with numSamps = binCount the
    // per-bin width matches getByteFrequencyData's (i * sampleRate/fftSize).
    const fftSize = this.binCount * 2
    const bucketHz = sampleRate / fftSize

    const bassLow = clamp(Math.round(20 / bucketHz) - 1, 0, this.binCount - 1)
    const bassHigh = clamp(Math.round(320 / bucketHz) - 1, 0, this.binCount - 1)
    const midHigh = clamp(Math.round(2800 / bucketHz) - 1, 0, this.binCount - 1)
    const trebHigh = clamp(Math.round(11025 / bucketHz) - 1, 0, this.binCount - 1)

    this.starts = [bassLow, bassHigh, midHigh]
    this.stops = [bassHigh, midHigh, trebHigh]

    this.imm = new Float32Array(3)
    this.avg = new Float32Array(3)
    this.longAvg = new Float32Array(3)
    this.val = new Float32Array(3) // bass, mid, treb
    this.att = new Float32Array(3) // bass_att, mid_att, treb_att

    this.avg.fill(1)
    this.longAvg.fill(1)
    this.val.fill(1)
    this.att.fill(1)
    this.frame = 0
  }

  /** Samples the analyser and updates the smoothed levels. Call once per frame. */
  update(fps) {
    this.frame += 1
    this.analyser.getByteFrequencyData(this.freqArray)
    this.analyser.getByteTimeDomainData(this.timeArray)

    let effectiveFPS = fps
    if (!Number.isFinite(effectiveFPS) || effectiveFPS < 15) effectiveFPS = 15
    else if (effectiveFPS > 144) effectiveFPS = 144

    this.imm.fill(0)
    for (let i = 0; i < 3; i++) {
      for (let j = this.starts[i]; j < this.stops[i]; j++) {
        this.imm[i] += this.freqArray[j]
      }
    }

    for (let i = 0; i < 3; i++) {
      let rate = this.imm[i] > this.avg[i] ? 0.2 : 0.5
      rate = adjustRateToFPS(rate, 30.0, effectiveFPS)
      this.avg[i] = this.avg[i] * rate + this.imm[i] * (1 - rate)

      rate = this.frame < 50 ? 0.9 : 0.992
      rate = adjustRateToFPS(rate, 30.0, effectiveFPS)
      this.longAvg[i] = this.longAvg[i] * rate + this.imm[i] * (1 - rate)

      if (this.longAvg[i] < 0.001) {
        this.val[i] = 1.0
        this.att[i] = 1.0
      } else {
        this.val[i] = this.imm[i] / this.longAvg[i]
        this.att[i] = this.avg[i] / this.longAvg[i]
      }
    }
  }

  get bass() { return this.val[0] }
  get mid() { return this.val[1] }
  get treb() { return this.val[2] }
  get bass_att() { return this.att[0] }
  get mid_att() { return this.att[1] }
  get treb_att() { return this.att[2] }
}
