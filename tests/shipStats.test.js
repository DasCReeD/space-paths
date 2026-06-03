import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PhysicsEngine, CLASS_PRESETS } from '../physics.js';

describe('Hovercraft Class Stats & Handling', () => {
  let physics;

  beforeEach(() => {
    // Clear localStorage mock
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    physics = new PhysicsEngine();
    physics.reset(100, 100);
  });

  it('should have CLASS_PRESETS defined for the 5 hovercraft classes', () => {
    expect(CLASS_PRESETS).toBeDefined();
    expect(CLASS_PRESETS.fighter).toBeDefined();
    expect(CLASS_PRESETS.hauler).toBeDefined();
    expect(CLASS_PRESETS.scout).toBeDefined();
    expect(CLASS_PRESETS.dreadnought).toBeDefined();
    expect(CLASS_PRESETS.cruiser).toBeDefined();
  });

  it('should default to original ship stats initially', () => {
    expect(physics.settings.maxSpeedNormal).toBe(32.0);
    expect(physics.settings.accelForward).toBe(18.0);
    expect(physics.settings.maxSteerSpeed).toBe(10.0);
  });

  it('should dynamically update settings when applying fighter class', () => {
    physics.applyShipClass('fighter');
    
    expect(physics.settings.maxSpeedNormal).toBe(CLASS_PRESETS.fighter.maxSpeedNormal);
    expect(physics.settings.accelForward).toBe(CLASS_PRESETS.fighter.accelForward);
    expect(physics.settings.maxSteerSpeed).toBe(CLASS_PRESETS.fighter.maxSteerSpeed);
    expect(physics.settings.steerAccel).toBe(CLASS_PRESETS.fighter.steerAccel);
    expect(physics.settings.dragZ).toBe(CLASS_PRESETS.fighter.dragZ);
  });

  it('should dynamically update settings when applying hauler class', () => {
    physics.applyShipClass('hauler');
    
    expect(physics.settings.maxSpeedNormal).toBe(CLASS_PRESETS.hauler.maxSpeedNormal);
    expect(physics.settings.accelForward).toBe(CLASS_PRESETS.hauler.accelForward);
    expect(physics.settings.maxSteerSpeed).toBe(CLASS_PRESETS.hauler.maxSteerSpeed);
    expect(physics.settings.steerAccel).toBe(CLASS_PRESETS.hauler.steerAccel);
  });

  it('should save class name and physics preset values in localStorage', () => {
    if (typeof localStorage === 'undefined') {
      // Stub localStorage if not present (Vitest runs in JSDOM so it is present)
      return;
    }
    
    localStorage.setItem('skyroads_physics_active_preset', 'snappy');
    physics.applyShipClass('scout');

    expect(localStorage.getItem('skyroads_selected_model')).toBe('scout');
    
    const savedPresetStr = localStorage.getItem('skyroads_physics_preset_snappy');
    expect(savedPresetStr).toBeDefined();
    
    const presetData = JSON.parse(savedPresetStr);
    expect(presetData.maxSpeedNormal).toBe(CLASS_PRESETS.scout.maxSpeedNormal);
    expect(presetData.accelForward).toBe(CLASS_PRESETS.scout.accelForward);
    expect(presetData.maxSteerSpeed).toBe(CLASS_PRESETS.scout.maxSteerSpeed);
    expect(presetData.steerAccel).toBe(CLASS_PRESETS.scout.steerAccel);
  });

  it('should fall back to original stats if an unknown class is supplied', () => {
    physics.applyShipClass('unknown_space_object');
    
    expect(physics.settings.maxSpeedNormal).toBe(CLASS_PRESETS.original.maxSpeedNormal);
    expect(physics.settings.accelForward).toBe(CLASS_PRESETS.original.accelForward);
  });
});
