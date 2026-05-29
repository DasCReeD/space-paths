import { describe, it, expect, beforeEach, vi } from 'vitest';
import { gameAudio } from '../audio.js';

// Setup headless mock for Web Audio Context
const mockOscillator = {
  connect: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn()
  }
};

const mockGain = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn()
  }
};

const mockBiquadFilter = {
  connect: vi.fn(),
  frequency: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  }
};

const mockAudioContext = vi.fn().mockImplementation(() => ({
  createOscillator: vi.fn().mockImplementation(() => mockOscillator),
  createGain: vi.fn().mockImplementation(() => mockGain),
  createBiquadFilter: vi.fn().mockImplementation(() => mockBiquadFilter),
  createBuffer: vi.fn().mockImplementation(() => ({
    getChannelData: vi.fn().mockImplementation(() => new Float32Array(100))
  })),
  createBufferSource: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  })),
  destination: {},
  currentTime: 10,
  sampleRate: 44100
}));

if (typeof window !== 'undefined') {
  window.AudioContext = mockAudioContext;
}

describe('AudioSynthesizer Unit Tests', () => {
  beforeEach(() => {
    // Reset singleton instance variables
    gameAudio.ctx = null;
    gameAudio.engineOsc = null;
    gameAudio.engineGain = null;
    gameAudio.isEngineRunning = false;
    
    vi.clearAllMocks();
  });

  it('should initialize audio context successfully', () => {
    gameAudio.init();
    expect(gameAudio.ctx).toBeDefined();
    expect(mockAudioContext).toHaveBeenCalled();
  });

  it('should play clicks and schedule oscillators', () => {
    gameAudio.playClick();
    expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalled();
    expect(mockOscillator.start).toHaveBeenCalled();
  });

  it('should start engine oscillators and growl hum', () => {
    gameAudio.startEngine();
    
    expect(gameAudio.isEngineRunning).toBe(true);
    expect(gameAudio.engineOsc1).toBeDefined();
    expect(gameAudio.engineOsc2).toBeDefined();
    expect(gameAudio.engineGain).toBeDefined();
  });

  it('should modulate engine pitch and volume based on speed ratio', () => {
    gameAudio.startEngine();
    gameAudio.updateEngineSpeed(0.5); // 50% velocity
    
    expect(mockOscillator.frequency.setTargetAtTime).toHaveBeenCalled();
    expect(mockGain.gain.setTargetAtTime).toHaveBeenCalled();
  });

  it('should stop engine hum cleanly', () => {
    gameAudio.startEngine();
    gameAudio.stopEngine();
    
    expect(gameAudio.isEngineRunning).toBe(false);
  });

  it('should successfully trigger sweeps, chimes and explosions', () => {
    gameAudio.playJump();
    gameAudio.playRefill();
    gameAudio.playBoost();
    gameAudio.playExplosion();
    gameAudio.playWin();

    expect(mockOscillator.start).toHaveBeenCalled();
  });
});
