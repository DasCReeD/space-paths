// Pure data module for the XMB-style crossbar menus.
// No DOM access, no app.js imports — only plain data + small pure builder
// functions. Items reference an `actionKey` string that app.js resolves to
// a real function/handler when wiring up the CrossbarController (xmbMenu.js).
//
// Item shape:
//   { id, label, kind: 'action' | 'slider' | 'focus', actionKey, [min, max, step] }
//   - 'action' (default): Enter/Confirm invokes actionKey.
//   - 'slider': Left/Right adjusts the value via actionKey instead of changing
//     category (needs numeric min/max/step). Enter is a no-op for sliders.
//   - 'focus': Enter delegates focus to a native DOM control (e.g. a hidden
//     <input type="color">) that app.js owns; actionKey names the opener.

// ── Main Menu ──────────────────────────────────────────────────────────────

export const mainMenuConfig = {
  categories: [
    {
      id: 'play',
      label: 'PLAY',
      items: [
        { id: 'standard', label: 'Standard Pack', kind: 'action', actionKey: 'play-standard' },
        { id: 'generated', label: 'Generated Worlds', kind: 'action', actionKey: 'play-generated' },
        { id: 'xmas', label: 'Xmas Special', kind: 'action', actionKey: 'play-xmas' },
        { id: 'load-custom-level', label: 'Load Custom Level', kind: 'action', actionKey: 'load-custom-level' }
      ]
    },
    {
      id: 'extras',
      label: 'EXTRAS',
      items: [
        { id: 'level-editor', label: 'Level Editor', kind: 'action', actionKey: 'open-editor' },
        { id: 'hovercraft-garage', label: 'Hovercraft Garage', kind: 'action', actionKey: 'open-ship-picker' },
        { id: 'how-to-play', label: 'How To Play', kind: 'action', actionKey: 'open-how-to' }
      ]
    }
  ]
};

// ── Settings ───────────────────────────────────────────────────────────────

export const settingsConfig = {
  categories: [
    {
      id: 'game',
      label: 'GAME',
      items: [
        { id: 'difficulty', label: 'Difficulty', kind: 'action', actionKey: 'toggle-difficulty' },
        { id: 'rewind-on-death', label: 'Rewind on Death', kind: 'action', actionKey: 'toggle-rewind-on-death' },
        { id: 'lane-snap', label: 'Lane Snap', kind: 'action', actionKey: 'toggle-lane-snap' }
      ]
    },
    {
      id: 'audio',
      label: 'AUDIO',
      items: [
        { id: 'sfx-volume', label: 'SFX Volume', kind: 'slider', actionKey: 'adjust-sfx-volume', min: 0, max: 1, step: 0.05 }
      ]
    },
    {
      id: 'visuals',
      label: 'VISUALS',
      items: [
        { id: 'starfield', label: 'Starfield', kind: 'action', actionKey: 'toggle-starfield' },
        { id: 'speed-fov', label: 'Speed FOV', kind: 'action', actionKey: 'toggle-speed-fov' },
        { id: 'ghost-racer', label: 'Ghost Racer', kind: 'action', actionKey: 'toggle-ghost-racer' },
        { id: 'visualizer-mode', label: 'Visualizer Mode', kind: 'action', actionKey: 'toggle-visualizer-mode' },
        { id: 'wall-angle', label: 'Wall Angle', kind: 'slider', actionKey: 'adjust-wall-angle', min: 1, max: 89, step: 1 },
        { id: 'wall-spread', label: 'Wall Spread', kind: 'slider', actionKey: 'adjust-wall-spread', min: 5, max: 40, step: 1 },
        { id: 'wall-height', label: 'Wall Height', kind: 'slider', actionKey: 'adjust-wall-height', min: 50, max: 600, step: 10 },
        { id: 'star-size', label: 'Star Size', kind: 'slider', actionKey: 'adjust-star-size', min: 20, max: 300, step: 10 },
        { id: 'star-density', label: 'Star Density', kind: 'slider', actionKey: 'adjust-star-density', min: 0, max: 5000, step: 100 }
      ]
    },
    {
      id: 'controls',
      label: 'CONTROLS',
      items: [
        { id: 'mouse-play', label: 'Mouse Play', kind: 'action', actionKey: 'toggle-mouse-play' },
        { id: 'touch-hud', label: 'Touch HUD', kind: 'action', actionKey: 'toggle-touch-hud' },
        { id: 'boat-throttle', label: 'Boat Throttle', kind: 'action', actionKey: 'toggle-boat-throttle' },
        { id: 'stick-throttle', label: 'Stick Throttle', kind: 'action', actionKey: 'toggle-stick-throttle' },
        { id: 'gamepad-config', label: 'Gamepad Config', kind: 'action', actionKey: 'open-gamepad-config' }
      ]
    },
    {
      id: 'display',
      label: 'DISPLAY',
      items: [
        { id: 'bottom-hud', label: 'Bottom HUD', kind: 'action', actionKey: 'toggle-bottom-hud' },
        { id: 'collision-view', label: 'Collision View', kind: 'action', actionKey: 'toggle-collision-view' },
        { id: 'hovercraft-garage', label: 'Hovercraft Garage', kind: 'action', actionKey: 'open-ship-picker' },
        { id: 'physics-calibrator', label: 'Physics Calibrator', kind: 'action', actionKey: 'open-physics-calibrator' },
        { id: 'close-settings', label: 'Close Settings', kind: 'action', actionKey: 'close-settings' }
      ]
    },
    {
      id: 'visualizer',
      label: 'VISUALIZER',
      items: [
        { id: 'preset', label: 'Preset', kind: 'slider', actionKey: 'vis-preset', min: 0, max: 1, step: 1 },
        { id: 'lock', label: 'Lock Preset', kind: 'action', actionKey: 'vis-lock' },
        { id: 'favorite', label: 'Favorite', kind: 'action', actionKey: 'vis-fav' },
        { id: 'mode', label: 'Cycle Mode', kind: 'action', actionKey: 'vis-mode' },
        { id: 'webamp', label: 'Webamp Player', kind: 'action', actionKey: 'vis-webamp' }
      ]
    }
  ]
};

// ── Ship Garage ──────────────────────────────────────────────────────────

const HULL_MODELS = [
  { id: 'original', label: 'STARFIRE FIGHTER' },
  { id: 'hauler', label: 'HOVERCRAFT HAULER' },
  { id: 'scout', label: 'HOVERCRAFT SCOUT' },
  { id: 'dreadnought', label: 'HOVERCRAFT DREADNOUGHT' },
  { id: 'cruiser', label: 'HOVERCRAFT CRUISER' },
  { id: 'racer', label: 'COMBAT RACER' },
  { id: 'hovdi', label: 'HOVDI CONCEPT' }
];

const SKIN_TEXTURES = [
  'default', 'freelancer', 'lordshadow', 'psionic', 'shadee', 'thor',
  'spaceship_hull', 'road_metallic', 'skin1', 'skin2', 'skin3', 'skin4'
];

const PAINT_PRESETS = [
  { id: 'white', label: 'White', color: '#ffffff' },
  { id: 'cyber-pink', label: 'Cyber Pink', color: '#ff007f' },
  { id: 'neon-cyan', label: 'Neon Cyan', color: '#00ffff' },
  { id: 'electric-lime', label: 'Electric Lime', color: '#39ff14' },
  { id: 'sun-gold', label: 'Sun Gold', color: '#ffaa00' },
  { id: 'burn-orange', label: 'Burn Orange', color: '#ff3300' },
  { id: 'deep-indigo', label: 'Deep Indigo', color: '#8a2be2' }
];

export const garageConfig = {
  categories: [
    {
      id: 'hull',
      label: 'HULL',
      items: HULL_MODELS.map(({ id, label }) => ({
        id,
        label,
        kind: 'action',
        actionKey: `select-model-${id}`
      }))
    },
    {
      id: 'skin',
      label: 'SKIN',
      items: SKIN_TEXTURES.map((id) => ({
        id,
        label: id,
        kind: 'action',
        actionKey: `select-texture-${id}`
      }))
    },
    {
      id: 'paint',
      label: 'PAINT',
      items: [
        ...PAINT_PRESETS.map(({ id, label }) => ({
          id,
          label,
          kind: 'action',
          actionKey: `select-color-${id}`
        })),
        { id: 'custom', label: 'Custom Color', kind: 'focus', actionKey: 'open-custom-color-picker' }
      ]
    }
  ]
};

// ── Gamepad Config ───────────────────────────────────────────────────────────
// Single-category vertical list: 7 remap rows + reset. Each remap item's
// actionKey is 'remap-<action>' (app.js starts the existing press-any-button
// listen flow); the reset item's actionKey is 'reset-gamepad-mappings'.
// btn-gamepad-close stays outside the crossbar as fixed chrome (Cancel target).

const GAMEPAD_ACTIONS = [
  { id: 'forward', label: 'ACCELERATE' },
  { id: 'backward', label: 'BRAKE' },
  { id: 'jump', label: 'JUMP' },
  { id: 'left', label: 'STEER LEFT' },
  { id: 'right', label: 'STEER RIGHT' },
  { id: 'cycleCamera', label: 'CYCLE CAMERA' },
  { id: 'togglePause', label: 'PAUSE GAME' }
];

export const gamepadConfigConfig = {
  categories: [
    {
      id: 'gamepad-config',
      label: 'GAMEPAD CONFIG',
      items: [
        ...GAMEPAD_ACTIONS.map(({ id, label }) => ({
          id,
          label,
          kind: 'action',
          actionKey: `remap-${id}`
        })),
        { id: 'reset', label: 'RESET TO DEFAULT', kind: 'action', actionKey: 'reset-gamepad-mappings' }
      ]
    }
  ]
};

// ── Level Select (built per pack, not static) ───────────────────────────────

/**
 * Builds a Level Select crossbar config for one level pack.
 * Horizontal categories are decade groups ("Levels 1-10", "Levels 11-20", ...,
 * with a trailing remainder group sized to whatever's left). Vertical items
 * within a group are kind:'action' with actionKey 'play-level-<absoluteIndex>'
 * where <absoluteIndex> is the 0-based index into the original levelNames
 * array (not relative to the group), and label is levelNames[absoluteIndex]
 * (or a "Level N" fallback, 1-based, when the name is missing/undefined).
 *
 * @param {string[]} levelNames
 * @returns {{ categories: Array }}
 */
export function buildLevelSelectConfig(levelNames) {
  const total = levelNames.length;
  const groupCount = Math.ceil(total / 10);
  const categories = [];

  for (let g = 0; g < groupCount; g++) {
    const startIndex = g * 10;
    const endIndex = Math.min(startIndex + 10, total); // exclusive
    const groupSize = endIndex - startIndex;
    const firstLevelNum = startIndex + 1;
    const lastLevelNum = endIndex;
    const label = groupSize === 1
      ? `Levels ${firstLevelNum}`
      : `Levels ${firstLevelNum}-${lastLevelNum}`;

    const items = [];
    for (let absoluteIndex = startIndex; absoluteIndex < endIndex; absoluteIndex++) {
      const name = levelNames[absoluteIndex];
      items.push({
        id: `level-${absoluteIndex}`,
        label: name !== undefined && name !== null ? name : `Level ${absoluteIndex + 1}`,
        kind: 'action',
        actionKey: `play-level-${absoluteIndex}`
      });
    }

    categories.push({
      id: `group-${g}`,
      label,
      items
    });
  }

  return { categories };
}
