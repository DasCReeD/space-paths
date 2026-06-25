// Tests for menuConfig.js — pure data module for the XMB crossbar menus.
import { describe, it, expect } from 'vitest';
import { mainMenuConfig, settingsConfig, garageConfig, buildLevelSelectConfig } from '../menuConfig.js';

// ── Shared helpers ───────────────────────────────────────────────────────

function assertUniqueIdsAndActionKeys(categories) {
  for (const category of categories) {
    const ids = category.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of category.items) {
      expect(typeof item.actionKey).toBe('string');
      expect(item.actionKey.length).toBeGreaterThan(0);
    }
  }
}

function assertSliderBounds(categories) {
  for (const category of categories) {
    for (const item of category.items) {
      if (item.kind === 'slider') {
        expect(typeof item.min).toBe('number');
        expect(typeof item.max).toBe('number');
        expect(typeof item.step).toBe('number');
        expect(item.min).toBeLessThan(item.max);
      }
    }
  }
}

// ── Main Menu ────────────────────────────────────────────────────────────

describe('mainMenuConfig', () => {
  it('has 2 categories: PLAY and EXTRAS', () => {
    expect(mainMenuConfig.categories).toHaveLength(2);
    expect(mainMenuConfig.categories.map((c) => c.id)).toEqual(['play', 'extras']);
  });

  it('PLAY has 4 items, EXTRAS has 3 items', () => {
    const play = mainMenuConfig.categories.find((c) => c.id === 'play');
    const extras = mainMenuConfig.categories.find((c) => c.id === 'extras');
    expect(play.items).toHaveLength(4);
    expect(extras.items).toHaveLength(3);
  });

  it('has unique ids and non-empty actionKeys per category', () => {
    assertUniqueIdsAndActionKeys(mainMenuConfig.categories);
  });

  it('has no slider items (none required)', () => {
    assertSliderBounds(mainMenuConfig.categories);
  });
});

// ── Settings ─────────────────────────────────────────────────────────────

describe('settingsConfig', () => {
  it('has 6 categories: GAME, AUDIO, VISUALS, CONTROLS, DISPLAY, VISUALIZER', () => {
    expect(settingsConfig.categories).toHaveLength(6);
    expect(settingsConfig.categories.map((c) => c.id)).toEqual([
      'game', 'audio', 'visuals', 'controls', 'display', 'visualizer'
    ]);
  });

  it('has the expected item counts per category', () => {
    const counts = Object.fromEntries(
      settingsConfig.categories.map((c) => [c.id, c.items.length])
    );
    expect(counts).toEqual({
      game: 3,
      audio: 1,
      visuals: 9,
      controls: 5,
      display: 5, // bottom-hud, collision-view, garage, calibrator, close
      visualizer: 5 // preset, lock, fav, mode, webamp
    });
  });

  it('has unique ids and non-empty actionKeys per category', () => {
    assertUniqueIdsAndActionKeys(settingsConfig.categories);
  });

  it('every slider item has numeric min/max/step with min < max', () => {
    assertSliderBounds(settingsConfig.categories);
  });

  it('marks exactly the expected items as kind:slider', () => {
    const sliderIds = settingsConfig.categories
      .flatMap((c) => c.items)
      .filter((item) => item.kind === 'slider')
      .map((item) => item.id);
    expect(sliderIds.sort()).toEqual(
      ['preset', 'sfx-volume', 'star-density', 'star-size', 'wall-angle', 'wall-height', 'wall-spread'].sort()
    );
  });

  it('DISPLAY includes the physics-calibrator and close items (now XMB items)', () => {
    const display = settingsConfig.categories.find((c) => c.id === 'display');
    const keys = display.items.map((i) => i.actionKey);
    expect(keys).toContain('open-physics-calibrator');
    expect(keys).toContain('close-settings');
  });

  it('VISUALIZER category exposes the preset slider + toggles', () => {
    const vis = settingsConfig.categories.find((c) => c.id === 'visualizer');
    expect(vis.items.map((i) => i.actionKey)).toEqual([
      'vis-preset', 'vis-lock', 'vis-fav', 'vis-mode', 'vis-webamp'
    ]);
  });
});

// ── Ship Garage ──────────────────────────────────────────────────────────

describe('garageConfig', () => {
  it('has 3 categories: HULL, SKIN, PAINT', () => {
    expect(garageConfig.categories).toHaveLength(3);
    expect(garageConfig.categories.map((c) => c.id)).toEqual(['hull', 'skin', 'paint']);
  });

  it('HULL has 7 items, SKIN has 12 items, PAINT has 8 items (7 presets + custom)', () => {
    const hull = garageConfig.categories.find((c) => c.id === 'hull');
    const skin = garageConfig.categories.find((c) => c.id === 'skin');
    const paint = garageConfig.categories.find((c) => c.id === 'paint');
    expect(hull.items).toHaveLength(7);
    expect(skin.items).toHaveLength(12);
    expect(paint.items).toHaveLength(8);
  });

  it('has unique ids and non-empty actionKeys per category', () => {
    assertUniqueIdsAndActionKeys(garageConfig.categories);
  });

  it('the final PAINT item is the custom color focus item', () => {
    const paint = garageConfig.categories.find((c) => c.id === 'paint');
    const last = paint.items[paint.items.length - 1];
    expect(last).toEqual({
      id: 'custom',
      label: 'Custom Color',
      kind: 'focus',
      actionKey: 'open-custom-color-picker'
    });
  });

  it('has no slider items (none required)', () => {
    assertSliderBounds(garageConfig.categories);
  });
});

// ── buildLevelSelectConfig ───────────────────────────────────────────────

describe('buildLevelSelectConfig', () => {
  it('groups a 31-length array into 4 categories sized 10/10/10/1', () => {
    const names = Array.from({ length: 31 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    expect(config.categories).toHaveLength(4);
    expect(config.categories.map((c) => c.items.length)).toEqual([10, 10, 10, 1]);
  });

  it('groups a 30-length array into 3 categories of 10/10/10', () => {
    const names = Array.from({ length: 30 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    expect(config.categories).toHaveLength(3);
    expect(config.categories.map((c) => c.items.length)).toEqual([10, 10, 10]);
  });

  it('groups a 5-length array into 1 category of 5', () => {
    const names = Array.from({ length: 5 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    expect(config.categories).toHaveLength(1);
    expect(config.categories[0].items).toHaveLength(5);
  });

  it('uses absolute (not relative) indices in actionKeys — group 2 starts at index 10', () => {
    const names = Array.from({ length: 31 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    const group2 = config.categories[1]; // "Levels 11-20"
    expect(group2.items[0].actionKey).toBe('play-level-10');
    expect(group2.items[0].id).toBe('level-10');
    expect(group2.items[9].actionKey).toBe('play-level-19');
  });

  it('pulls labels from the input array at the absolute index', () => {
    const names = Array.from({ length: 15 }, (_, i) => `Custom Name ${i}`);
    const config = buildLevelSelectConfig(names);
    expect(config.categories[0].items[3].label).toBe('Custom Name 3');
    expect(config.categories[1].items[2].label).toBe('Custom Name 12');
  });

  it('falls back to "Level N" (1-based) when a name entry is undefined', () => {
    const names = Array.from({ length: 12 }, (_, i) => (i === 5 ? undefined : `Name ${i}`));
    const config = buildLevelSelectConfig(names);
    const item = config.categories[0].items[5];
    expect(item.label).toBe('Level 6');
    expect(item.actionKey).toBe('play-level-5');
  });

  it('the trailing remainder group label reflects its actual size', () => {
    const names = Array.from({ length: 31 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    expect(config.categories[3].label).toBe('Levels 31');
    expect(config.categories[0].label).toBe('Levels 1-10');
  });

  it('every generated item is kind:action with a unique id', () => {
    const names = Array.from({ length: 31 }, (_, i) => `Level ${i}`);
    const config = buildLevelSelectConfig(names);
    const allItems = config.categories.flatMap((c) => c.items);
    expect(allItems.every((item) => item.kind === 'action')).toBe(true);
    const ids = allItems.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
