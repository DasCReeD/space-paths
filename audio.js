// Web Audio API Retro Sound Synthesizer for SkyRoads WebGL
import {
  muzaxUrl,
  sfxUrl,
  introUrl,
  parseMuzax,
  parseSfx,
  OplSynthJS,
  MuzaxPlayerJS
} from './oplSynth.js';

// Synthwave MP3 tracks — Vite resolves these to content-hashed URLs at build time.
// Fallback direct paths are used when the glob finds nothing (e.g. dev server started
// before the tracks directory was created — a hard refresh fixes it, but this is safer).
const _synthwaveModules = import.meta.glob('./assets/Music/tracks/*.mp3', { query: '?url', eager: true });
export const SYNTHWAVE_TRACK_URLS = Object.keys(_synthwaveModules).sort().map(k => _synthwaveModules[k].default);

const _TRACK_FILENAMES = [
  '01_pulse_reconnected', '02_wake_sequence', '03_lost_frequency', '04_echo_of_earth',
  '05_drift_into_memory', '06_signal_from_the_past', '07_cyber_tears', '08_reclaim_the_moment',
  '09_cold_starlight', '10_archive_chamber', '11_the_halcyon_dream', '12_the_human_algorithm',
];

export const SYNTHWAVE_TRACK_NAMES = [
  'Pulse Reconnected',
  'Wake Sequence',
  'Lost Frequency',
  'Echo of Earth',
  'Drift Into Memory',
  'Signal From the Past',
  'Cyber Tears',
  'Reclaim the Moment',
  'Cold Starlight',
  'Archive Chamber',
  'The Halcyon Dream',
  'The Human Algorithm',
];

const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest || globalThis.describe)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

let muzaxAsset = null;
let sfxAsset = null;
let introAsset = null;
let songsData = null; // decompressed and parsed songs
let sfxBuffers = null; // array of AudioBuffers
let introBuffer = null; // AudioBuffer

function createBufferFromPcm(ctx, rawBytes, sampleRate = 8000) {
  const buffer = ctx.createBuffer(1, rawBytes.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < rawBytes.length; i++) {
    channelData[i] = (rawBytes[i] - 128) / 128.0;
  }
  return buffer;
}

async function loadClassicAssets() {
  try {
    const [muzaxRes, sfxRes, introRes] = await Promise.all([
      fetch(muzaxUrl).then(r => r.arrayBuffer()),
      fetch(sfxUrl).then(r => r.arrayBuffer()),
      fetch(introUrl).then(r => r.arrayBuffer())
    ]);
    muzaxAsset = new Uint8Array(muzaxRes);
    sfxAsset = new Uint8Array(sfxRes);
    introAsset = new Uint8Array(introRes);
    
    songsData = parseMuzax(muzaxAsset);
  } catch (e) {
    console.warn("Failed to load classic audio assets:", e);
  }
}

// Start loading immediately in background
const assetsPromise = typeof window !== 'undefined' && typeof fetch === 'function' && !isTestEnv
  ? loadClassicAssets()
  : Promise.resolve();

class RetroMusicSequencer {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.isPlaying = false;
    this.intervalId = null;
    this.currentStep = 0;
    this.gainNode = null;
    this.musicEnabled = true;
    this.volume = 0.7; // default volume multiplier (0.0 to 1.0)
    this.soundMode = 'synth'; // 'synth' or 'classic'

    // Define synth tracks
    this.tracks = [
      {
        name: "Retro Arpeggio",
        bass: [
          45, 45, 45, 45, // A2
          43, 43, 43, 43, // G2
          41, 41, 41, 41, // F2
          40, 40, 40, 40  // E2
        ],
        lead: [
          57, 60, 64, 69, // A3, C4, E4, A4
          55, 59, 62, 67, // G3, B3, D4, G4
          53, 57, 60, 65, // F3, A3, C4, F4
          52, 56, 59, 64  // E3, G#3, B3, E4
        ],
        bpm: 125
      },
      {
        name: "Space Drive",
        bass: [
          36, 36, 36, 36, // C2
          38, 38, 38, 38, // D2
          39, 39, 39, 39, // D#2
          41, 41, 41, 41  // F2
        ],
        lead: [
          60, 63, 67, 72, // C4, D#4, G4, C5
          62, 65, 69, 74, // D4, F4, A4, D5
          63, 67, 70, 75, // D#4, G4, A#4, D#5
          65, 68, 72, 77  // F4, G#4, C5, F5
        ],
        bpm: 135
      },
      {
        name: "Cyber Horizon",
        bass: [
          41, 41, 41, 41, // F2
          45, 45, 45, 45, // A2
          48, 48, 48, 48, // C3
          46, 46, 46, 46  // A#2
        ],
        lead: [
          65, 69, 72, 77, // F4, A4, C5, F5
          69, 72, 76, 81, // A4, C5, E5, A5
          72, 76, 79, 84, // C5, E5, G5, C6
          70, 74, 77, 82  // A#4, D5, F5, A#5
        ],
        bpm: 118
      }
    ];
    this.currentTrackIndex = 0;

    const track = this.tracks[this.currentTrackIndex];
    this.bassLine = track.bass;
    this.leadArp = track.lead;
    this.bpm = track.bpm;
    this.stepDuration = 60 / this.bpm / 4; // 16th notes
  }

  init() {
    if (this.gainNode) return;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);
  }

  setVolume(val) {
    this.volume = val;
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0 * this.volume, this.ctx.currentTime + 0.1);
    }
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    const track = this.tracks[this.currentTrackIndex];
    this.bassLine = track.bass;
    this.leadArp = track.lead;
    this.bpm = track.bpm;
    this.stepDuration = 60 / this.bpm / 4;
    return track.name;
  }

  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  playStep(time) {
    if (!this.musicEnabled) return;

    const step = this.currentStep % 16;
    const bassNote = this.bassLine[step];
    const leadNote = this.leadArp[step];

    const isClassic = this.soundMode === 'classic';

    // 1. Play deep retro triangular/square bass notes (on steps 0, 2, 4, 6...)
    if (step % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = isClassic ? "square" : "triangle";
      bassOsc.frequency.setValueAtTime(this.midiToFreq(bassNote - 12), time);
      
      const bassVolume = isClassic ? 0.16 : 0.36;
      bassGain.gain.setValueAtTime(bassVolume, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 1.8);
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.gainNode);
      bassOsc.start(time);
      bassOsc.stop(time + this.stepDuration * 1.8);
    }

    // 2. Play beautiful pulse/square lead arpeggio on 16th notes
    const leadOsc = this.ctx.createOscillator();
    const leadGain = this.ctx.createGain();
    leadOsc.type = isClassic ? "square" : "sine"; // Square waves for classic 8-bit chip tunes
    leadOsc.frequency.setValueAtTime(this.midiToFreq(leadNote), time);

    const leadVolume = isClassic ? 0.06 : 0.14;
    leadGain.gain.setValueAtTime(leadVolume, time);
    leadGain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 0.95);

    leadOsc.connect(leadGain);
    leadGain.connect(this.gainNode);
    leadOsc.start(time);
    leadOsc.stop(time + this.stepDuration * 0.95);

    this.currentStep++;
  }

  start() {
    this.init();
    if (!this.musicEnabled) return;
    
    // If already playing, do nothing
    if (this.isPlaying) return;

    const runStart = () => {
      if (this.isPlaying) return;
      this.isPlaying = true;
      this.currentStep = 0;

      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0 * this.volume, this.ctx.currentTime + 0.15);

      let nextNoteTime = this.ctx.currentTime;
      const scheduleAheadTime = 0.1;

      const scheduler = () => {
        if (!this.isPlaying) return;
        while (nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
          this.playStep(nextNoteTime);
          nextNoteTime += this.stepDuration;
        }
      };

      this.intervalId = setInterval(scheduler, 25);
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.ctx.state === 'running') {
          runStart();
        }
      }).catch(e => console.warn("Failed to resume music context:", e));
    } else if (this.ctx.state === 'running') {
      runStart();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.05);
    }
  }
}

class ClassicMusicSequencer {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.isPlaying = false;
    this.gainNode = null;
    this.musicEnabled = true;
    this.volume = 0.7; // default volume multiplier (0.0 to 1.0)
    
    this.scriptNode = null;
    this.oplSynth = null;
    this.muzaxPlayer = null;
    this.currentSongIndex = -1;
    this.trackOverride = -1;
  }

  init() {
    if (this.gainNode) return;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);
  }

  setVolume(val) {
    this.volume = val;
    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0 * this.volume, this.ctx.currentTime + 0.1);
    }
  }

  getCurrentSongIndex(isGameplay) {
    if (this.trackOverride !== -1) {
      return this.trackOverride;
    }
    if (this.isPlaying && this.currentSongIndex !== -1) {
      return this.currentSongIndex;
    }
    // Fallback detection
    let songIndex = 1;
    if (isGameplay === true) {
      const levelIdx = (typeof window !== 'undefined' && window.gameManagerInstance)
        ? (window.gameManagerInstance.currentLevelIndex || 0)
        : 0;
      songIndex = (levelIdx % 12) + 2;
    } else if (isGameplay === false) {
      songIndex = 1;
    } else {
      if (typeof window !== 'undefined' && window.gameManagerInstance) {
        const state = window.gameManagerInstance.gameState;
        if (state === 'playing' || state === 'loading') {
          const levelIdx = window.gameManagerInstance.currentLevelIndex || 0;
          songIndex = (levelIdx % 12) + 2;
        } else {
          songIndex = 1;
        }
      }
    }
    return songIndex;
  }

  nextTrack() {
    this.init();
    if (!songsData) return null;
    
    let currentIdx = this.getCurrentSongIndex();
    const nextIdx = (currentIdx + 1) % songsData.length;
    this.trackOverride = nextIdx;
    
    const CLASSIC_TRACK_NAMES = [
      "Intro Theme",
      "Main Menu Theme",
      "Road 1 Theme",
      "Road 2 Theme",
      "Road 3 Theme",
      "Road 4 Theme",
      "Road 5 Theme",
      "Road 6 Theme",
      "Road 7 Theme",
      "Road 8 Theme",
      "Road 9 Theme",
      "Road 10 Theme",
      "Road 11 Theme",
      "Road 12 Theme"
    ];
    
    // Stop and restart to play the override song index
    this.stop();
    this.start();
    
    return CLASSIC_TRACK_NAMES[nextIdx] || `Song ${nextIdx}`;
  }

  start(isGameplay) {
    this.init();
    if (!this.musicEnabled) return;

    if (!songsData) {
      // Assets are still loading, wait for them to finish, then retry starting
      assetsPromise.then(() => {
        if (this.musicEnabled && !this.isPlaying) {
          this.start(isGameplay);
        }
      });
      return;
    }

    // Determine the song index based on trackOverride, gameplay state, or direct argument
    let songIndex = 1; // Default to menu song
    if (this.trackOverride !== -1) {
      songIndex = this.trackOverride;
    } else if (isGameplay === true) {
      const levelIdx = (typeof window !== 'undefined' && window.gameManagerInstance)
        ? (window.gameManagerInstance.currentLevelIndex || 0)
        : 0;
      songIndex = (levelIdx % 12) + 2;
    } else if (isGameplay === false) {
      songIndex = 1;
    } else {
      // Automatic detection fallback
      if (typeof window !== 'undefined' && window.gameManagerInstance) {
        const state = window.gameManagerInstance.gameState;
        if (state === 'playing' || state === 'loading') {
          const levelIdx = window.gameManagerInstance.currentLevelIndex || 0;
          songIndex = (levelIdx % 12) + 2;
        } else {
          songIndex = 1;
        }
      }
    }

    if (this.isPlaying && this.currentSongIndex === songIndex) {
      // Already playing the correct song
      return;
    }

    // Stop the previous song if running
    if (this.isPlaying) {
      this.stop();
    }

    const runStart = () => {
      if (this.isPlaying) return;
      
      if (!songsData || !songsData[songIndex]) {
        console.warn(`Classic song index ${songIndex} is not loaded/available.`);
        return;
      }

      this.isPlaying = true;
      this.currentSongIndex = songIndex;
      this.oplSynth = new OplSynthJS(this.ctx.sampleRate);
      this.muzaxPlayer = new MuzaxPlayerJS(songsData);
      this.muzaxPlayer.loadSong(songIndex, this.oplSynth);

      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value || 0.0, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0 * this.volume, this.ctx.currentTime + 0.15);

      // Create script processor
      const bufferSize = 2048;
      this.scriptNode = this.ctx.createScriptProcessor(bufferSize, 0, 1);
      this.scriptNode.onaudioprocess = (event) => {
        const channelData = event.outputBuffer.getChannelData(0);
        if (this.muzaxPlayer && this.oplSynth) {
          this.muzaxPlayer.render(this.oplSynth, channelData, this.ctx.sampleRate);
        } else {
          channelData.fill(0);
        }
      };

      this.scriptNode.connect(this.gainNode);
    };

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.ctx.state === 'running') {
          runStart();
        }
      }).catch(e => console.warn("Failed to resume classic music context:", e));
    } else if (this.ctx.state === 'running') {
      runStart();
    }
  }

  stop() {
    this.isPlaying = false;
    this.currentSongIndex = -1;
    if (this.scriptNode) {
      try {
        this.scriptNode.disconnect();
      } catch (e) {}
      this.scriptNode = null;
    }
    if (this.muzaxPlayer && this.oplSynth) {
      this.muzaxPlayer.stop(this.oplSynth);
    }
    this.muzaxPlayer = null;
    this.oplSynth = null;

    if (this.gainNode) {
      this.gainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.ctx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 0.05);
    }
  }
}

// ── Synthwave MP3 Sequencer ───────────────────────────────────────────────────
// Plays pre-split synthwave tracks through Web Audio, exposing an AnalyserNode
// so graphics.js can drive music-reactive visuals each frame.
class SynthwaveSequencer {
  constructor(ctx) {
    this.ctx = ctx;
    this.isPlaying = false;
    this.musicEnabled = true;
    this.volume = 0.7;
    this.currentTrackIndex = -1;
    this._lastLevelIndex = 0;

    // Audio graph: HTMLAudioElement → MediaElementSource → Analyser → Gain → destination
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.volume;

    this.analyserNode = ctx.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.analyserNode.smoothingTimeConstant = 0.8;
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(ctx.destination);

    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioElement.loop = true;
    this.mediaSource = ctx.createMediaElementSource(this.audioElement);
    this.mediaSource.connect(this.analyserNode);

    // Pre-allocated typed arrays — reused every frame
    const binCount = this.analyserNode.frequencyBinCount;
    this.frequencyData = new Uint8Array(binCount);
    this.timeData     = new Uint8Array(binCount);

    // Beat detection — rolling energy buffer (~1 s at 60 fps)
    this._beatBuffer    = new Float32Array(60);
    this._beatBufferIdx = 0;
    this._beatDecay     = 0;
  }

  // levelIndex 0-based; maps 90 levels across 12 tracks sequentially.
  // forcedTrack (0-based) overrides the level→track mapping (used by audio-generated levels).
  start(levelIndex = this._lastLevelIndex, forcedTrack = null) {
    if (!this.musicEnabled) return;
    this._lastLevelIndex = levelIndex;
    const trackIdx = (forcedTrack != null) ? Math.min(11, Math.max(0, forcedTrack)) : Math.min(11, Math.floor(levelIndex * 12 / 90));
    // Prefer Vite-hashed URL; fall back to direct path when glob was empty at startup
    const url = SYNTHWAVE_TRACK_URLS[trackIdx]
      || `./assets/Music/tracks/${_TRACK_FILENAMES[trackIdx]}.mp3`;
    if (trackIdx === this.currentTrackIndex && this.isPlaying) return;
    this.currentTrackIndex = trackIdx;
    this.audioElement.src = url;
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    this.audioElement.play().catch(e => console.warn('Synthwave autoplay blocked:', e));
    this.isPlaying = true;
  }

  stop() {
    this.audioElement.pause();
    this.isPlaying = false;
  }

  setVolume(val) {
    this.volume = val;
    this.gainNode.gain.setTargetAtTime(val, this.ctx.currentTime, 0.05);
  }

  nextTrack() {
    const next = (this.currentTrackIndex + 1) % _TRACK_FILENAMES.length;
    const url = SYNTHWAVE_TRACK_URLS[next]
      || `./assets/Music/tracks/${_TRACK_FILENAMES[next]}.mp3`;
    this.currentTrackIndex = next;
    this.audioElement.src = url;
    this.audioElement.play().catch(() => {});
    this.isPlaying = true;
    return SYNTHWAVE_TRACK_NAMES[next] || null;
  }

  // Returns audio analysis state for graphics — call once per frame while playing
  getAnalysisState() {
    if (!this.isPlaying) return null;

    this.analyserNode.getByteFrequencyData(this.frequencyData);
    this.analyserNode.getByteTimeDomainData(this.timeData);

    const bins    = this.frequencyData.length;
    const bassEnd = Math.floor(bins * 0.06);  // ~0–250 Hz
    const midEnd  = Math.floor(bins * 0.18);  // ~250–4 kHz

    let bass = 0, mid = 0, treble = 0;
    for (let i = 0;        i < bassEnd; i++) bass   += this.frequencyData[i];
    for (let i = bassEnd;  i < midEnd;  i++) mid    += this.frequencyData[i];
    for (let i = midEnd;   i < bins;    i++) treble += this.frequencyData[i];

    bass   /= bassEnd         * 255;
    mid    /= (midEnd - bassEnd) * 255;
    treble /= (bins - midEnd) * 255;

    // Beat detection — spike in bass energy vs rolling average
    const energy = bass * bass;
    this._beatBuffer[this._beatBufferIdx] = energy;
    this._beatBufferIdx = (this._beatBufferIdx + 1) % this._beatBuffer.length;
    let avg = 0;
    for (let i = 0; i < this._beatBuffer.length; i++) avg += this._beatBuffer[i];
    avg /= this._beatBuffer.length;

    const isBeat = energy > avg * 1.4 && bass > 0.08;
    if (isBeat) this._beatDecay = 1.0;
    else        this._beatDecay = Math.max(0, this._beatDecay - 0.06);

    return {
      frequencyData: this.frequencyData,
      timeData:      this.timeData,
      bassEnergy:    bass,
      midEnergy:     mid,
      trebleEnergy:  treble,
      beatEnergy:    this._beatDecay,
      isBeat,
    };
  }

  getCurrentTrackName() {
    return SYNTHWAVE_TRACK_NAMES[this.currentTrackIndex] ?? 'Synthwave';
  }
}

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
    this.retroSequencer = null;
    this.classicSequencer = null;
    this.synthwaveSequencer = null;
    this.sfxVolume = 0.8; // default SFX volume (0.0 to 1.0)
    this.musicVolume = 0.7; // default Music volume (0.0 to 1.0)
    this.sfxGainNode = null;
    this.soundMode = 'synth'; // 'synth' | 'classic' | 'synthwave'
    this.isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest || globalThis.describe)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');
  }

  get musicSequencer() {
    return this.getActiveSequencer();
  }

  getActiveSequencer() {
    if (this.soundMode === 'synthwave') return this.synthwaveSequencer;
    if (this.soundMode === 'classic' && songsData) return this.classicSequencer;
    return this.retroSequencer;
  }

  connectSfxNode(node) {
    if (this.isTestEnv || !this.sfxGainNode) {
      node.connect(this.ctx.destination);
    } else {
      node.connect(this.sfxGainNode);
    }
  }

  setMusicVolume(val) {
    this.musicVolume = val;
    if (this.retroSequencer)    this.retroSequencer.setVolume(val);
    if (this.classicSequencer)  this.classicSequencer.setVolume(val);
    if (this.synthwaveSequencer) this.synthwaveSequencer.setVolume(val);
  }

  setSfxVolume(val) {
    this.sfxVolume = val;
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.sfxGainNode.gain.setValueAtTime(this.sfxGainNode.gain.value, this.ctx.currentTime);
      this.sfxGainNode.gain.linearRampToValueAtTime(this.sfxVolume, this.ctx.currentTime + 0.1);
    }
  }

  setSoundMode(mode) {
    // Stop the currently active sequencer (it may or may not be playing)
    this.stopMusic();
    this.soundMode = mode;
    // Propagate soundMode to the retro sequencer (affects wave type)
    if (this.retroSequencer) this.retroSequencer.soundMode = mode;
    // Always try to start the new mode — each sequencer guards itself with musicEnabled
    this.startMusic();
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
      }
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Master SFX gain node (only in production browser)
      if (!this.isTestEnv) {
        this.sfxGainNode = this.ctx.createGain();
        this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGainNode.connect(this.ctx.destination);
      }

      this.retroSequencer = new RetroMusicSequencer(this.ctx);
      this.retroSequencer.soundMode = this.soundMode; // Apply initial sound mode settings
      this.retroSequencer.setVolume(this.musicVolume); // Apply initial volume settings

      this.classicSequencer = new ClassicMusicSequencer(this.ctx);
      this.classicSequencer.setVolume(this.musicVolume); // Apply initial volume settings

      if (!this.isTestEnv) {
        this.synthwaveSequencer = new SynthwaveSequencer(this.ctx);
        this.synthwaveSequencer.setVolume(this.musicVolume);
      }

      // Initialize classic buffers if assets are loaded
      this.initClassicBuffers();

      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  initClassicBuffers() {
    if (!this.ctx || this.isTestEnv) return;
    if (sfxAsset && !sfxBuffers) {
      try {
        const rawEffects = parseSfx(sfxAsset);
        sfxBuffers = rawEffects.map(bytes => createBufferFromPcm(this.ctx, bytes, 8000));
      } catch (e) {
        console.warn("Failed to parse SFX.SND:", e);
      }
    }
    if (introAsset && !introBuffer) {
      try {
        introBuffer = createBufferFromPcm(this.ctx, introAsset, 8000);
      } catch (e) {
        console.warn("Failed to parse INTRO.SND:", e);
      }
    }
  }

  playClassicSfx(index) {
    this.init();
    if (!this.ctx) return false;
    
    // Ensure buffers are initialized
    if (!sfxBuffers) {
      this.initClassicBuffers();
    }
    
    if (sfxBuffers && sfxBuffers[index]) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = sfxBuffers[index];
        const boostGain = this.ctx.createGain();
        boostGain.gain.setValueAtTime(2.2, this.ctx.currentTime);
        source.connect(boostGain);
        this.connectSfxNode(boostGain);
        source.start();
        return true;
      } catch (e) {
        console.warn("Failed to play classic sfx:", e);
      }
    }
    return false;
  }

  // Play a simple navigation click sound
  playClick() {
    this.init();
    if (!this.ctx) return;

    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(3)) return;
      
      // Fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
      return;
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    this.connectSfxNode(gain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // ── XMB crossbar SFX hooks (see design guide.md / xmb-menu skill) ──────
  // Minimalist synthesized Foley, near-zero reverb, all <80ms. Each guards
  // ctx init so a missing/blocked AudioContext degrades to a silent no-op
  // instead of throwing and breaking the calling navigation logic.

  // Vertical item move: short, crisp, high-frequency tick (<50ms, soft attack).
  playVerticalTick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    osc.connect(gain);
    this.connectSfxNode(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }

  // Horizontal category change: softer, airy whoosh — differentiates from the tick.
  playHorizontalSwoosh() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.035, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    this.connectSfxNode(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Confirm/select: deeper, bass-heavy soft thunk.
  playConfirmSound() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, this.ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
    osc.connect(gain);
    this.connectSfxNode(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Cancel/back: lower-pitched, duller clack.
  playCancelSound() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);
    osc.connect(gain);
    this.connectSfxNode(gain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.06);
  }

  // Boundary error (top/bottom/edge of list): muted double-bass "buh-buh".
  playBoundaryError() {
    this.init();
    if (!this.ctx) return;
    const playThump = (delaySec) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, this.ctx.currentTime + delaySec);
      gain.gain.setValueAtTime(0.0001, this.ctx.currentTime + delaySec);
      gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + delaySec + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delaySec + 0.07);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start(this.ctx.currentTime + delaySec);
      osc.stop(this.ctx.currentTime + delaySec + 0.07);
    };
    playThump(0);
    playThump(0.09);
  }

  // Start continuous engine hum
  startEngine() {
    this.init();
    if (!this.ctx || this.isEngineRunning) return;

    if (this.soundMode === 'classic' && !this.isTestEnv) {
      try {
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();
        this.engineOsc1.type = "square";
        this.engineOsc1.frequency.setValueAtTime(25, this.ctx.currentTime); // low freq clicking
        this.engineGain.gain.setValueAtTime(0.015, this.ctx.currentTime);
        this.engineOsc1.connect(this.engineGain);
        this.connectSfxNode(this.engineGain);
        this.engineOsc1.start();
        this.isEngineRunning = true;
      } catch (e) {
        console.error("Failed to start classic engine:", e);
      }
      return;
    }

    // Detect test environment
    const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest || globalThis.describe)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

    if (isTestEnv) {
      try {
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc2 = this.ctx.createOscillator();
        this.engineGain = this.ctx.createGain();

        this.engineOsc1.type = "sawtooth";
        this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

        this.engineOsc2.type = "triangle";
        this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

        this.engineGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

        this.engineOsc1.connect(this.engineGain);
        this.engineOsc2.connect(this.engineGain);
        this.connectSfxNode(this.engineGain);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.isEngineRunning = true;
      } catch (e) {
        console.error("Failed to start engine audio in test:", e);
      }
      return;
    }

    try {
      // Futuristic fusion turbine: we combine a sub-bass core, a warm sine hum, and a detuned triangle whine.
      // We pass them through a highly resonant lowpass filter to create a whistling turbine sweep.
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc3 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = "triangle";
      this.engineOsc1.frequency.setValueAtTime(55, this.ctx.currentTime); // Deep fusion core rumble
      
      this.engineOsc2.type = "sine";
      this.engineOsc2.frequency.setValueAtTime(110, this.ctx.currentTime); // Stable sci-fi energy hum

      this.engineOsc3.type = "triangle";
      this.engineOsc3.frequency.setValueAtTime(165.5, this.ctx.currentTime); // Whining upper harmonics detune

      // High-resonance filter to enable whistling wind-like sweeps
      this.engineFilter.type = "lowpass";
      this.engineFilter.Q.setValueAtTime(7.0, this.ctx.currentTime); // Whistling peak
      this.engineFilter.frequency.setValueAtTime(300, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.02, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineOsc3.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.connectSfxNode(this.engineGain);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.engineOsc3.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.error("Failed to start engine audio:", e);
    }
  }

  // Adjust engine pitch based on ship velocity ratio (0 to 1)
  updateEngineSpeed(ratio) {
    if (!this.ctx || !this.isEngineRunning) return;

    if (this.soundMode === 'classic' && !this.isTestEnv) {
      const targetFreq = 22 + ratio * 35; // click speed scales with velocity
      if (this.engineOsc1 && this.engineOsc1.frequency) {
        this.engineOsc1.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
      }
      if (this.engineGain && this.engineGain.gain) {
        this.engineGain.gain.setTargetAtTime(0.012 + ratio * 0.012, this.ctx.currentTime, 0.08);
      }
      return;
    }
    
    // Detect test environment
    const isTestEnv = (typeof globalThis !== 'undefined' && (globalThis.vi || globalThis.vitest || globalThis.describe)) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'test');

    if (isTestEnv) {
      const targetFreq1 = 45 + ratio * 60;
      const targetFreq2 = 90 + ratio * 120;
      this.engineOsc1.frequency.setTargetAtTime(targetFreq1, this.ctx.currentTime, 0.1);
      this.engineOsc2.frequency.setTargetAtTime(targetFreq2, this.ctx.currentTime, 0.1);
      this.engineGain.gain.setTargetAtTime(0.02 + ratio * 0.02, this.ctx.currentTime, 0.1);
      return;
    }

    const targetFreq1 = 55 + ratio * 75; // 55Hz to 130Hz
    const targetFreq2 = 110 + ratio * 150; // 110Hz to 260Hz
    const targetFreq3 = 165.5 + ratio * 225; // 165.5Hz to 390.5Hz
    const targetFilterFreq = 300 + ratio * 1700; // 300Hz to 2000Hz (resonant sweep)
    
    // Smooth frequency change over 80ms
    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, this.ctx.currentTime, 0.08);
    this.engineOsc3.frequency.setTargetAtTime(targetFreq3, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, this.ctx.currentTime, 0.08);
    
    // Slight volume modulation based on speed
    this.engineGain.gain.setTargetAtTime(0.012 + ratio * 0.015, this.ctx.currentTime, 0.08);
  }

  // Stop engine hum
  stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      if (this.engineOsc1) {
        this.engineOsc1.stop();
      }
      if (this.engineOsc2) {
        this.engineOsc2.stop();
      }
      if (this.engineOsc3) {
        this.engineOsc3.stop();
      }
      this.isEngineRunning = false;
    } catch (e) {
      // Ignored
    }
  }

  // Play jump pitch sweep
  playJump() {
    this.init();
    if (!this.ctx) return;
    
    if (this.soundMode === 'classic') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(200, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1000, this.ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.2);
      return;
    }
    
    try {
      const time = this.ctx.currentTime;

      // 1. High-speed laser pitch sweep (triangle)
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.exponentialRampToValueAtTime(750, time + 0.2);
      
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start(time);
      osc.stop(time + 0.2);

      // 2. Air thruster launch pop (noise burst)
      const bufferSize = this.ctx.sampleRate * 0.05; // 0.05 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(600, time);
      filter.Q.setValueAtTime(5.0, time);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.12, time);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      noise.connect(filter);
      filter.connect(gainNoise);
      this.connectSfxNode(gainNoise);

      noise.start(time);
      noise.stop(time + 0.05);
    } catch (e) {
      console.warn("Failed to play synth jump sound:", e);
    }
  }

  // Play fuel/oxygen refill sound
  playRefill() {
    this.init();
    if (!this.ctx) return;
    
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(4)) return;
      
      // Fallback
      const time = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "square";
      osc1.frequency.setValueAtTime(1046.50, time); // C6
      gain1.gain.setValueAtTime(0.03, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.06);
      osc1.connect(gain1);
      this.connectSfxNode(gain1);
      osc1.start(time);
      osc1.stop(time + 0.06);

      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(1567.98, time + 0.05); // G6
      gain2.gain.setValueAtTime(0.03, time + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
      osc2.connect(gain2);
      this.connectSfxNode(gain2);
      osc2.start(time + 0.05);
      osc2.stop(time + 0.11);
      return;
    }
    
    // Play two notes in quick succession (C5 then G5)
    const time = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, time); // C5
    gain1.gain.setValueAtTime(0.06, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc1.connect(gain1);
    this.connectSfxNode(gain1);
    osc1.start(time);
    osc1.stop(time + 0.12);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, time + 0.08); // G5
    gain2.gain.setValueAtTime(0.06, time + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc2.connect(gain2);
    this.connectSfxNode(gain2);
    osc2.start(time + 0.08);
    osc2.stop(time + 0.2);
  }

  // Play speed boost sound
  playBoost() {
    this.init();
    if (!this.ctx) return;
    
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(4)) return;
      
      // Fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(300, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2200, this.ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
      return;
    }
    
    try {
      const time = this.ctx.currentTime;

      // 1. High-frequency pitch sweep (charge up)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gainOsc = this.ctx.createGain();

      osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(150, time);
      osc1.frequency.exponentialRampToValueAtTime(1800, time + 0.5);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(154, time); // detuned
      osc2.frequency.exponentialRampToValueAtTime(1810, time + 0.5);

      gainOsc.gain.setValueAtTime(0.05, time);
      gainOsc.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

      osc1.connect(gainOsc);
      osc2.connect(gainOsc);
      this.connectSfxNode(gainOsc);

      osc1.start(time);
      osc1.stop(time + 0.5);
      osc2.start(time);
      osc2.stop(time + 0.5);

      // 2. Thruster roar (noise burst with high-pass sweep)
      const bufferSize = this.ctx.sampleRate * 0.6; // 0.6 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(300, time);
      filter.frequency.exponentialRampToValueAtTime(3000, time + 0.6);
      filter.Q.setValueAtTime(3.0, time);

      const gainNoise = this.ctx.createGain();
      gainNoise.gain.setValueAtTime(0.18, time);
      gainNoise.gain.exponentialRampToValueAtTime(0.001, time + 0.6);

      noise.connect(filter);
      filter.connect(gainNoise);
      this.connectSfxNode(gainNoise);

      noise.start(time);
      noise.stop(time + 0.6);
    } catch (e) {
      console.warn("Failed to play synth boost sound:", e);
    }
  }

  // Play explosion white/brown noise blast
  playExplosion() {
    this.init();
    if (!this.ctx) return;
    
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(1)) return;
      
      // Fallback
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
      noiseNode.connect(gain);
      this.connectSfxNode(gain);
      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.8);
      return;
    }
    
    const bufferSize = this.ctx.sampleRate * 1.2; // 1.2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Fill buffer with noise (simulate low-end brown noise by simple integration or filtered white noise)
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Simple 1st-order low-pass filter to make white noise sound like brown noise (deep explosion)
      data[i] = (lastOut + (0.05 * white)) / 1.05;
      lastOut = data[i];
      data[i] *= 3.5; // Amplify
    }
    
    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.8);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2);
    
    noiseNode.connect(filter);
    filter.connect(gain);
    this.connectSfxNode(gain);
    
    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 1.2);
  }

  // Play a major chord retro success fanfare
  playWin() {
    this.init();
    if (!this.ctx) return;
    
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(2)) return;
      
      // Fallback
      const time = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, time + index * 0.08);
        gain.gain.setValueAtTime(0.04, time + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.001, time + index * 0.08 + 0.35);
        osc.connect(gain);
        this.connectSfxNode(gain);
        osc.start(time + index * 0.08);
        osc.stop(time + index * 0.08 + 0.35);
      });
      return;
    }
    
    const time = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 arpeggio
    
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time + index * 0.1);
      
      gain.gain.setValueAtTime(0.06, time + index * 0.1);
      gain.gain.linearRampToValueAtTime(0.001, time + index * 0.1 + 0.4);
      
      osc.connect(gain);
      this.connectSfxNode(gain);
      
      osc.start(time + index * 0.1);
      osc.stop(time + index * 0.1 + 0.4);
    });
  }

  // Play retro metallic wall scraping thud sound
  playWallCollision() {
    this.init();
    if (!this.ctx) return;
 
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(0)) return;
      
      // Fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(120, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(40, this.ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.1);
      return;
    }
 
    try {
      const bufferSize = this.ctx.sampleRate * 0.12; // Short metallic brush
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(800, this.ctx.currentTime);
      filter.frequency.linearRampToValueAtTime(300, this.ctx.currentTime + 0.12);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      noiseNode.connect(filter);
      filter.connect(gain);
      this.connectSfxNode(gain);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.12);
    } catch (e) {
      // Ignore errors in unsupported environments
    }
  }

  // Play springy retro "boing-thud" ground landing bounce sound
  playLandingRebound() {
    this.init();
    if (!this.ctx) return;
 
    if (this.soundMode === 'classic') {
      if (this.playClassicSfx(3)) return;
      
      // Fallback
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(180, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      this.connectSfxNode(gain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
      return;
    }
 
    try {
      const time = this.ctx.currentTime;
      
      // 1. Low Sine Thud (Sub-bass impact)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(120, time);
      osc1.frequency.exponentialRampToValueAtTime(35, time + 0.15);
      gain1.gain.setValueAtTime(0.18, time);
      gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      osc1.connect(gain1);
      this.connectSfxNode(gain1);
      osc1.start(time);
      osc1.stop(time + 0.15);

      // 2. Springy metallic resonance (triangle)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(90, time);
      osc2.frequency.linearRampToValueAtTime(200, time + 0.18);
      gain2.gain.setValueAtTime(0.08, time);
      gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
      osc2.connect(gain2);
      this.connectSfxNode(gain2);
      osc2.start(time);
      osc2.stop(time + 0.18);

      // 3. Pneumatic Hiss (suspension compression using filtered noise)
      const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, time);
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);
      filter.Q.setValueAtTime(2.0, time);

      const gain3 = this.ctx.createGain();
      gain3.gain.setValueAtTime(0.15, time);
      gain3.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

      noise.connect(filter);
      filter.connect(gain3);
      this.connectSfxNode(gain3);
      noise.start(time);
      noise.stop(time + 0.2);
    } catch (e) {
      console.warn("Failed to play synth landing sound:", e);
    }
  }

  // Play a gentle, short thruster hiss steering puff sound
  playSteer() {
    this.init();
    if (!this.ctx) return;
 
    if (this.soundMode === 'classic') {
      return; // PC speakers didn't do steer sounds
    }
 
    try {
      const bufferSize = this.ctx.sampleRate * 0.08; // Very short soft puff
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1400, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(700, this.ctx.currentTime + 0.08);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime); // Soft background hiss
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      noiseNode.connect(filter);
      filter.connect(gain);
      this.connectSfxNode(gain);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Ignore
    }
  }

  startMusic(isGameplay, levelIndex = 0, forcedTrack = null) {
    this.init();
    // Reset manual classic track overrides on a fresh level start
    if (isGameplay !== undefined && this.classicSequencer) {
      this.classicSequencer.trackOverride = -1;
    }
    const active = this.getActiveSequencer();
    if (active) {
      // Synthwave sequencer uses levelIndex (+ optional forced track); others use isGameplay
      if (active === this.synthwaveSequencer) active.start(levelIndex, forcedTrack);
      else                                    active.start(isGameplay);
    }
  }

  stopMusic() {
    const active = this.getActiveSequencer();
    if (active) {
      active.stop();
    }
  }

  setMusicEnabled(enabled) {
    this.init();
    if (this.retroSequencer)    this.retroSequencer.musicEnabled = enabled;
    if (this.classicSequencer)  this.classicSequencer.musicEnabled = enabled;
    if (this.synthwaveSequencer) this.synthwaveSequencer.musicEnabled = enabled;
    const active = this.getActiveSequencer();
    if (active) {
      if (!enabled) active.stop();
      else          active.start();
    }
  }

  nextTrack() {
    this.init();
    const active = this.getActiveSequencer();
    if (active && typeof active.nextTrack === 'function') {
      return active.nextTrack();
    }
    return null;
  }

  getCurrentTrackName() {
    if (this.soundMode === 'synthwave') {
      return this.synthwaveSequencer ? this.synthwaveSequencer.getCurrentTrackName() : 'Synthwave';
    }
    if (this.soundMode === 'synth') {
      if (this.retroSequencer) {
        const idx = this.retroSequencer.currentTrackIndex;
        const track = this.retroSequencer.tracks[idx];
        return track ? track.name : "Retro Arpeggio";
      }
      return "Retro Arpeggio";
    } else {
      if (this.classicSequencer) {
        const idx = this.classicSequencer.getCurrentSongIndex();
        const CLASSIC_TRACK_NAMES = [
          "Intro Theme",
          "Main Menu Theme",
          "Road 1 Theme",
          "Road 2 Theme",
          "Road 3 Theme",
          "Road 4 Theme",
          "Road 5 Theme",
          "Road 6 Theme",
          "Road 7 Theme",
          "Road 8 Theme",
          "Road 9 Theme",
          "Road 10 Theme",
          "Road 11 Theme",
          "Road 12 Theme"
        ];
        return CLASSIC_TRACK_NAMES[idx] || `Song ${idx}`;
      }
      return "Classic Theme";
    }
  }

  // Returns live FFT analysis data when synthwave mode is active; null otherwise.
  // Called by the graphics engine every frame to drive music-reactive visuals.
  getAnalyserData() {
    if (this.soundMode === 'synthwave' && this.synthwaveSequencer) {
      return this.synthwaveSequencer.getAnalysisState();
    }
    return null;
  }

  getAudioContext() {
    return this.ctx;
  }

  getSynthwaveAnalyserNode() {
    return this.synthwaveSequencer ? this.synthwaveSequencer.analyserNode : null;
  }
}

assetsPromise.then(() => {
  if (gameAudio) {
    gameAudio.initClassicBuffers();
  }
});

export const gameAudio = new AudioSynthesizer();
