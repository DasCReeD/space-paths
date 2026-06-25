// Durable user preferences, loaded from a committed file so they survive dev
// rebuilds and fresh/incognito browser contexts.
//
// On import (before any engine constructor reads localStorage) we seed
// localStorage from this file, overwriting any previous values to ensure
// the saved defaults from the file are applied.
import staticDefaults from './userSettings.json';

if (typeof localStorage !== 'undefined') {
  try {
    for (const [key, value] of Object.entries(staticDefaults)) {
      const valStr = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, valStr);
      
      // If this is a baseline physics preset, also sync the active preset configuration
      // so it takes effect immediately on page load/reload.
      if (key.startsWith('skyroads_physics_preset_baseline_')) {
        const activeKey = key.replace('_baseline_', '_');
        localStorage.setItem(activeKey, valStr);
      }
    }
  } catch (e) {
    // localStorage may be unavailable (private mode / quota) — non-fatal
  }
}

export default staticDefaults;
