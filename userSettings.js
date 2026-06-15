// Durable user preferences, loaded from a committed file so they survive dev
// rebuilds and fresh/incognito browser contexts.
//
// On import (before any engine constructor reads localStorage) we seed
// localStorage from this file for any key that isn't already set. We never
// overwrite an existing key, so runtime changes the player makes still persist
// and take precedence. To change a durable default, edit userSettings.json.
import defaults from './userSettings.json';

if (typeof localStorage !== 'undefined') {
  try {
    for (const [key, value] of Object.entries(defaults)) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    }
  } catch (e) {
    // localStorage may be unavailable (private mode / quota) — non-fatal
  }
}

export default defaults;
