/**
 * equations.js — Milkdrop preset-equation runtime.
 *
 * Our preset JSONs (public/visualizer-presets/*.json) already carry the
 * preset's per-init / per-frame / per-vertex equations as TRANSLATED
 * JavaScript strings (the milkdrop-preset-converter did the NS-EEL → JS work
 * offline), e.g. frame_eqs_str = "a['zoom']=(1-...); a['rot']=...". So there
 * is no expression parser to write — we just `new Function` the string and
 * run it against a mutable variable bag `a`.
 *
 * The translated JS references standard math as `Math.*` (ambient) plus a
 * handful of milkdrop-specific helpers as BARE identifiers (`div`, `above`,
 * `pow`, …). Those are the functions below, ported verbatim from Butterchurn
 * (node_modules/butterchurn/dist/butterchurn.js lines ~63-184, MIT) — note
 * they are NOT the same as the JS built-ins (e.g. `sqrt` takes abs, `div`
 * is divide-by-zero-safe, `pow` guards non-finite results). The exact set
 * actually used across all 179 presets was confirmed by scanning the
 * translated strings; we provide a superset for safety.
 */

const EPSILON = 0.00001

function isFiniteNumber(num) {
  return Number.isFinite(num) && !Number.isNaN(num)
}

// Ported from Butterchurn's window.* equation helpers.
const HELPERS = {
  sqr: (x) => x * x,
  sqrt: (x) => Math.sqrt(Math.abs(x)),
  log10: (val) => Math.log(val) * Math.LOG10E,
  sign: (x) => (x > 0 ? 1 : x < 0 ? -1 : 0),
  rand: (x) => {
    const xf = Math.floor(x)
    return xf < 1 ? Math.random() : Math.random() * xf
  },
  randint: (x) => Math.floor(HELPERS.rand(x)),
  bnot: (x) => (Math.abs(x) < EPSILON ? 1 : 0),
  pow: (x, y) => {
    const z = Math.pow(x, y)
    return isFiniteNumber(z) ? z : 0 // mostly from complex results
  },
  div: (x, y) => (y === 0 ? 0 : x / y),
  mod: (x, y) => (y === 0 ? 0 : Math.floor(x) % Math.floor(y)),
  bitor: (x, y) => Math.floor(x) | Math.floor(y),
  bitand: (x, y) => Math.floor(x) & Math.floor(y),
  sigmoid: (x, y) => {
    const t = 1 + Math.exp(-x * y)
    return Math.abs(t) > EPSILON ? 1.0 / t : 0
  },
  bor: (x, y) => (Math.abs(x) > EPSILON || Math.abs(y) > EPSILON ? 1 : 0),
  band: (x, y) => (Math.abs(x) > EPSILON && Math.abs(y) > EPSILON ? 1 : 0),
  equal: (x, y) => (Math.abs(x - y) < EPSILON ? 1 : 0),
  above: (x, y) => (x > y ? 1 : 0),
  below: (x, y) => (x < y ? 1 : 0),
  ifcond: (x, y, z) => (Math.abs(x) > EPSILON ? y : z)
}

// Order here defines the positional argument list the compiled function is
// called with; the names must match the bare identifiers in the eq strings.
const HELPER_NAMES = Object.keys(HELPERS)
const HELPER_VALUES = HELPER_NAMES.map((n) => HELPERS[n])

/**
 * Compiles a translated-JS equation string into a function `(a) => void` that
 * mutates the variable bag `a` in place. Empty/blank strings compile to a
 * no-op. A compile failure (malformed preset) also yields a no-op so one bad
 * preset can't take down the visualizer.
 *
 * @param {string} body - the *_eqs_str from a preset JSON
 * @returns {(a: object) => void}
 */
export function compileEq(body) {
  if (!body || !body.trim()) return () => {}
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('a', ...HELPER_NAMES, body)
    return (a) => {
      try {
        fn(a, ...HELPER_VALUES)
      } catch {
        // a runtime error in one frame's eqs shouldn't kill rendering
      }
    }
  } catch (e) {
    console.error('[Milkdrop] failed to compile equation:', e)
    return () => {}
  }
}
