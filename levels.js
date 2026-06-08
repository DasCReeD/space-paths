import standardLevelsUrl from './data/standard_levels.json?url';
import xmasLevelsUrl from './data/xmas_levels.json?url';
import generatedLevelsUrl from './data/generated_levels.json?url';

// Cache for loaded packs (prevents duplicate fetches)
const packCache = {};

/**
 * Load a level pack by name. Returns an array of level data objects.
 * Fetches the JSON file on first call, then returns from cache.
 *
 * @param {'standard' | 'xmas' | 'generated'} packName - The pack to load.
 * @returns {Promise<Array>} Array of parsed level data objects.
 */
export async function loadLevelPack(packName) {
  if (packCache[packName]) {
    return packCache[packName];
  }

  const fileMap = {
    standard: standardLevelsUrl,
    xmas: xmasLevelsUrl,
    generated: generatedLevelsUrl,
  };


  if (packName === 'standard') {
    const resStandard = await fetch(`${fileMap.standard}?v=${Date.now()}`);
    const resXmas = await fetch(`${fileMap.xmas}?v=${Date.now()}`);
    if (!resStandard.ok || !resXmas.ok) {
      throw new Error(`Failed to load standard or xmas level pack`);
    }
    const standardLevels = await resStandard.json();
    const xmasLevels = await resXmas.json();

    const combinedLevels = [
      ...standardLevels,
      ...xmasLevels.map((lvl, idx) => ({
        ...lvl,
        level_index: standardLevels.length + idx
      }))
    ];
    packCache['standard'] = combinedLevels;
    return combinedLevels;
  }

  const url = fileMap[packName];
  if (!url) {
    throw new Error(`Unknown level pack: "${packName}"`);
  }

  const response = await fetch(`${url}?v=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to load level pack "${packName}": ${response.status} ${response.statusText}`);
  }

  const levels = await response.json();
  packCache[packName] = levels;
  return levels;
}

/**
 * Synchronous access to already-loaded packs.
 * Returns undefined if the pack hasn't been loaded yet.
 *
 * @param {'standard' | 'xmas'} packName
 * @returns {Array | undefined}
 */
export function getCachedPack(packName) {
  return packCache[packName];
}

/**
 * Dynamically register a custom pack in the pack cache.
 *
 * @param {Array} levels - Array of level data objects.
 */
export function registerCustomPack(levels) {
  packCache['custom'] = levels;
}

/**
 * Legacy compatibility: LEVEL_PACKS object that will be populated as packs load.
 * Code that expects `LEVEL_PACKS[packName]` can still access it after loading.
 */
export const LEVEL_PACKS = packCache;
