// Web Audio API Retro Sound Synthesizer for SkyRoads WebGL

class AudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
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

    try {
      // We combine two oscillators to get a rich retro engine roar (a saw wave and a triangle wave)
      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = "sawtooth";
      this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime); // Low growl
      
      this.engineOsc2.type = "triangle";
      this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime); // Higher overtone

      this.engineGain.gain.setValueAtTime(0.03, this.ctx.currentTime);

      this.engineOsc1.connect(this.engineGain);
      this.engineOsc2.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc1.start();
      this.engineOsc2.start();
      this.isEngineRunning = true;
    } catch (e) {
      console.error("Failed to start engine audio:", e);
    }
  }

  // Adjust engine pitch based on ship velocity ratio (0 to 1)
  updateEngineSpeed(ratio) {
    if (!this.ctx || !this.isEngineRunning) return;
    
    const targetFreq1 = 45 + ratio * 60; // 45Hz to 105Hz
    const targetFreq2 = 90 + ratio * 120; // 90Hz to 210Hz
    
    // Smooth frequency change over 100ms
    this.engineOsc1.frequency.setTargetAtTime(targetFreq1, this.ctx.currentTime, 0.1);
    this.engineOsc2.frequency.setTargetAtTime(targetFreq2, this.ctx.currentTime, 0.1);
    
    // Slight volume modulation based on speed
    this.engineGain.gain.setTargetAtTime(0.02 + ratio * 0.02, this.ctx.currentTime, 0.1);
  }

  // Stop engine hum
  stopEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc1.stop();
      this.engineOsc2.stop();
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
}

export const gameAudio = new AudioSynthesizer();
