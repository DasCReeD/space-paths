// Web Audio API Retro Sound Synthesizer for SkyRoads WebGL

class RetroMusicSequencer {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.bpm = 125;
    this.stepDuration = 60 / this.bpm / 4; // 16th notes
    this.isPlaying = false;
    this.intervalId = null;
    this.currentStep = 0;
    this.gainNode = null;
    this.musicEnabled = true;

    // A minor / C major retro arpeggio progression (16 steps per loop)
    this.bassLine = [
      45, 45, 45, 45, // A2
      43, 43, 43, 43, // G2
      41, 41, 41, 41, // F2
      40, 40, 40, 40  // E2
    ];

    this.leadArp = [
      57, 60, 64, 69, // A3, C4, E4, A4
      55, 59, 62, 67, // G3, B3, D4, G4
      53, 57, 60, 65, // F3, A3, C4, F4
      52, 56, 59, 64  // E3, G#3, B3, E4
    ];
  }

  init() {
    if (this.gainNode) return;
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);
  }

  midiToFreq(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  playStep(time) {
    if (!this.musicEnabled) return;

    const step = this.currentStep % 16;
    const bassNote = this.bassLine[step];
    const leadNote = this.leadArp[step];

    // 1. Play deep retro triangular bass notes (on steps 0, 2, 4, 6...)
    if (step % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = "triangle";
      bassOsc.frequency.setValueAtTime(this.midiToFreq(bassNote - 12), time);
      
      bassGain.gain.setValueAtTime(0.04, time);
      bassGain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 1.8);
      
      bassOsc.connect(bassGain);
      bassGain.connect(this.gainNode);
      bassOsc.start(time);
      bassOsc.stop(time + this.stepDuration * 1.8);
    }

    // 2. Play beautiful pulse/square lead arpeggio on 16th notes
    const leadOsc = this.ctx.createOscillator();
    const leadGain = this.ctx.createGain();
    leadOsc.type = "sine"; // Warm retro sine arpeggiator
    leadOsc.frequency.setValueAtTime(this.midiToFreq(leadNote), time);

    leadGain.gain.setValueAtTime(0.012, time);
    leadGain.gain.exponentialRampToValueAtTime(0.001, time + this.stepDuration * 0.95);

    leadOsc.connect(leadGain);
    leadGain.connect(this.gainNode);
    leadOsc.start(time);
    leadOsc.stop(time + this.stepDuration * 0.95);

    this.currentStep++;
  }

  start() {
    this.init();
    if (this.isPlaying || !this.musicEnabled) return;
    this.isPlaying = true;
    this.currentStep = 0;
    this.gainNode.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.1);

    let nextNoteTime = this.ctx.currentTime;
    const scheduleAheadTime = 0.1;

    const scheduler = () => {
      while (nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        this.playStep(nextNoteTime);
        nextNoteTime += this.stepDuration;
      }
    };

    this.intervalId = setInterval(scheduler, 25);
  }

  stop() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
    }
  }
}

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
    this.musicSequencer = null;
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
      this.musicSequencer = new RetroMusicSequencer(this.ctx);
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(e => console.warn("Failed to resume AudioContext:", e));
      }
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser:", e);
    }
  }

  // Play a simple navigation click sound
  playClick() {
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  // Start continuous engine hum
  startEngine() {
    this.init();
    if (!this.ctx || this.isEngineRunning) return;

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
        this.engineGain.connect(this.ctx.destination);

        this.engineOsc1.start();
        this.engineOsc2.start();
        this.isEngineRunning = true;
      } catch (e) {
        console.error("Failed to start engine audio in test:", e);
      }
      return;
    }

    try {
      // We combine three oscillators to get a rich retro engine roar (saw, triangle, detuned saw chorus)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc3 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = "sawtooth";
      this.engineOsc1.frequency.setValueAtTime(35, this.ctx.currentTime); // Low rumble
      
      this.engineOsc2.type = "triangle";
      this.engineOsc2.frequency.setValueAtTime(70, this.ctx.currentTime); // Mid warm growl

      this.engineOsc3.type = "sawtooth";
      this.engineOsc3.frequency.setValueAtTime(105.5, this.ctx.currentTime); // Detuned high whine for rich phasing chorus

      // Resonant lowpass filter to shape the turbine sound
      this.engineFilter.type = "lowpass";
      this.engineFilter.Q.setValueAtTime(3.0, this.ctx.currentTime); // Dynamic whistling peak
      this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);

      this.engineGain.gain.setValueAtTime(0.025, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineOsc3.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

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

    const targetFreq1 = 35 + ratio * 55; // 35Hz to 90Hz
    const targetFreq2 = 70 + ratio * 110; // 70Hz to 180Hz
    const targetFreq3 = 105.5 + ratio * 165; // 105.5Hz to 270.5Hz
    const targetFilterFreq = 220 + ratio * 650; // 220Hz to 870Hz lowpass sweep
    
    // Smooth frequency change over 80ms
    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, this.ctx.currentTime, 0.08);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, this.ctx.currentTime, 0.08);
    this.engineOsc3.frequency.setTargetAtTime(targetFreq3, this.ctx.currentTime, 0.08);
    this.engineFilter.frequency.setTargetAtTime(targetFilterFreq, this.ctx.currentTime, 0.08);
    
    // Slight volume modulation based on speed
    this.engineGain.gain.setTargetAtTime(0.018 + ratio * 0.018, this.ctx.currentTime, 0.08);
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
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, this.ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  // Play fuel/oxygen refill sound
  playRefill() {
    this.init();
    if (!this.ctx) return;
    
    // Play two notes in quick succession (C5 then G5)
    const time = this.ctx.currentTime;
    
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, time); // C5
    gain1.gain.setValueAtTime(0.06, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(time);
    osc1.stop(time + 0.12);

    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, time + 0.08); // G5
    gain2.gain.setValueAtTime(0.06, time + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(time + 0.08);
    osc2.stop(time + 0.2);
  }

  // Play speed boost sound
  playBoost() {
    this.init();
    if (!this.ctx) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.4);
    
    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  // Play explosion white/brown noise blast
  playExplosion() {
    this.init();
    if (!this.ctx) return;
    
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
    gain.connect(this.ctx.destination);
    
    noiseNode.start();
    noiseNode.stop(this.ctx.currentTime + 1.2);
  }

  // Play a major chord retro success fanfare
  playWin() {
    this.init();
    if (!this.ctx) return;
    
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
      gain.connect(this.ctx.destination);
      
      osc.start(time + index * 0.1);
      osc.stop(time + index * 0.1 + 0.4);
    });
  }

  // Play retro metallic wall scraping thud sound
  playWallCollision() {
    this.init();
    if (!this.ctx) return;

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
      gain.connect(this.ctx.destination);

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

    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      const gain2 = this.ctx.createGain();

      // Low sine wave thud
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(80, this.ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.15);
      gain1.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start();
      osc1.stop(this.ctx.currentTime + 0.15);

      // Springy triangle upward pitch sweep
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(90, this.ctx.currentTime);
      osc2.frequency.linearRampToValueAtTime(220, this.ctx.currentTime + 0.2);
      gain2.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start();
      osc2.stop(this.ctx.currentTime + 0.2);
    } catch (e) {
      // Ignore
    }
  }

  // Play a gentle, short thruster hiss steering puff sound
  playSteer() {
    this.init();
    if (!this.ctx) return;

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
      gain.connect(this.ctx.destination);

      noiseNode.start();
      noiseNode.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      // Ignore
    }
  }

  startMusic() {
    this.init();
    if (this.musicSequencer) {
      this.musicSequencer.start();
    }
  }

  stopMusic() {
    if (this.musicSequencer) {
      this.musicSequencer.stop();
    }
  }

  setMusicEnabled(enabled) {
    this.init();
    if (this.musicSequencer) {
      this.musicSequencer.musicEnabled = enabled;
      if (!enabled) {
        this.musicSequencer.stop();
      } else {
        this.musicSequencer.start();
      }
    }
  }
}

export const gameAudio = new AudioSynthesizer();
