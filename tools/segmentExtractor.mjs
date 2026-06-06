// ==========================================================================
// SEGMENT EXTRACTOR — Mines original SkyRoads levels for reusable chunks
// Uses flood-fill connected components to never break contiguous geometry
// ==========================================================================
import fs from 'fs';
import path from 'path';

const ROAD_WIDTH_LANES = 7;

// ---- Load original levels ----
function loadLevels() {
  const stdPath = path.resolve('data/standard_levels.json');
  const xmasPath = path.resolve('data/xmas_levels.json');
  const levels = [];
  if (fs.existsSync(stdPath)) {
    levels.push(...JSON.parse(fs.readFileSync(stdPath, 'utf8')));
  }
  if (fs.existsSync(xmasPath)) {
    levels.push(...JSON.parse(fs.readFileSync(xmasPath, 'utf8')));
  }
  return levels;
}

// ---- Flood-fill connected region detection ----
function findConnectedRegions(rows) {
  const numRows = rows.length;
  const regionMap = Array.from({ length: numRows }, () => new Array(ROAD_WIDTH_LANES).fill(-1));
  let regionId = 0;
  const regions = []; // { id, tiles: [{r,l}], minRow, maxRow }

  for (let r = 0; r < numRows; r++) {
    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      if (regionMap[r][l] !== -1) continue;
      if (!rows[r][l]) continue;

      // BFS flood fill
      const tiles = [];
      const queue = [{ r, l }];
      regionMap[r][l] = regionId;
      let minRow = r, maxRow = r;

      while (queue.length > 0) {
        const { r: cr, l: cl } = queue.shift();
        tiles.push({ r: cr, l: cl });
        minRow = Math.min(minRow, cr);
        maxRow = Math.max(maxRow, cr);

        // Check 4 neighbors (up, down, left, right)
        const neighbors = [
          { r: cr - 1, l: cl },
          { r: cr + 1, l: cl },
          { r: cr, l: cl - 1 },
          { r: cr, l: cl + 1 },
        ];
        for (const n of neighbors) {
          if (n.r < 0 || n.r >= numRows || n.l < 0 || n.l >= ROAD_WIDTH_LANES) continue;
          if (regionMap[n.r][n.l] !== -1) continue;
          if (!rows[n.r][n.l]) continue;
          regionMap[n.r][n.l] = regionId;
          queue.push(n);
        }
      }

      regions.push({ id: regionId, tiles, minRow, maxRow });
      regionId++;
    }
  }

  return { regionMap, regions };
}

// ---- Find valid cut rows (no connected region straddles both sides) ----
function findValidCuts(rows, regions) {
  const numRows = rows.length;
  const validCuts = [];

  for (let cutAfter = 0; cutAfter < numRows - 1; cutAfter++) {
    // Check: does any region have tiles on both sides of this cut?
    let straddled = false;
    for (const region of regions) {
      if (region.minRow <= cutAfter && region.maxRow > cutAfter) {
        straddled = true;
        break;
      }
    }

    if (!straddled) {
      // Score this cut point
      let score = 0;
      const rowAbove = rows[cutAfter];
      const rowBelow = rows[cutAfter + 1];
      const aboveEmpty = rowAbove.every(t => t === null);
      const belowEmpty = rowBelow.every(t => t === null);

      if (aboveEmpty || belowEmpty) score += 10; // Gap = strongest break

      // Width change
      const widthAbove = rowAbove.filter(t => t !== null).length;
      const widthBelow = rowBelow.filter(t => t !== null).length;
      if (Math.abs(widthAbove - widthBelow) >= 2) score += 5;

      // Height change (check for ramps)
      const hasRampAbove = rowAbove.some(t => t && (t.startY !== undefined || t.endY !== undefined));
      const hasRampBelow = rowBelow.some(t => t && (t.startY !== undefined || t.endY !== undefined));
      if (hasRampAbove !== hasRampBelow) score += 3;

      // Tunnel boundary
      const hasTunnelAbove = rowAbove.some(t => t && t.tunnel);
      const hasTunnelBelow = rowBelow.some(t => t && t.tunnel);
      if (hasTunnelAbove !== hasTunnelBelow) score += 4;

      score += 1; // Base score for being valid

      validCuts.push({ cutAfter, score });
    }
  }

  return validCuts;
}

// ---- Select best cuts to produce segments of target size ----
function selectCuts(validCuts, numRows, minLen = 4, targetLen = 20) {
  if (validCuts.length === 0) return [];

  // Sort by score descending (prefer strongest breaks)
  const sorted = [...validCuts].sort((a, b) => b.score - a.score);

  // Greedily select cuts that produce segments >= minLen
  const selectedCuts = [];
  const usedCuts = new Set();

  for (const cut of sorted) {
    // Check if this cut would produce segments that are too small
    const prevCut = [...selectedCuts, -1].sort((a, b) => a - b);
    const nextCut = [...selectedCuts, numRows - 1].sort((a, b) => a - b);

    // Find where this cut would sit in the sorted order
    const allCuts = [...selectedCuts, cut.cutAfter].sort((a, b) => a - b);
    const idx = allCuts.indexOf(cut.cutAfter);

    const leftBound = idx > 0 ? allCuts[idx - 1] : -1;
    const rightBound = idx < allCuts.length - 1 ? allCuts[idx + 1] : numRows - 1;

    const leftSegLen = cut.cutAfter - leftBound;
    const rightSegLen = rightBound - cut.cutAfter;

    if (leftSegLen >= minLen && rightSegLen >= minLen) {
      selectedCuts.push(cut.cutAfter);
    }
  }

  return selectedCuts.sort((a, b) => a - b);
}

// ---- Analyze a segment's interface (entry/exit) ----
function analyzeInterface(rows) {
  if (rows.length === 0) return { width: 0, lanes: [], height: 0, center: 3 };

  const row = rows[rows.length === 1 ? 0 : rows.length - 1];
  const lanes = [];
  let height = 0;

  for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
    if (row[l]) {
      lanes.push(l);
      // Get height from tile
      if (row[l].startY !== undefined) {
        height = row[l].endY || row[l].startY || 0;
      } else if (row[l].full && row[l].half) {
        height = 3.0;
      } else if (row[l].full) {
        height = 2.0;
      } else if (row[l].half) {
        height = 1.0;
      }
    }
  }

  const center = lanes.length > 0 ? Math.round(lanes.reduce((a, b) => a + b, 0) / lanes.length) : 3;
  return { width: lanes.length, lanes, height, center };
}

function analyzeEntryInterface(rows) {
  if (rows.length === 0) return { width: 0, lanes: [], height: 0, center: 3 };
  const row = rows[0];
  const lanes = [];
  let height = 0;

  for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
    if (row[l]) {
      lanes.push(l);
      if (row[l].startY !== undefined) {
        height = row[l].startY || 0;
      }
    }
  }

  const center = lanes.length > 0 ? Math.round(lanes.reduce((a, b) => a + b, 0) / lanes.length) : 3;
  return { width: lanes.length, lanes, height, center };
}

// ---- Classify a segment by its tile content ----
function classifySegment(rows) {
  let tiles = 0, gaps = 0, obstacles = 0, tunnels = 0, ramps = 0;
  let boosts = 0, burns = 0, sticky = 0, slippery = 0;
  let halfObsLeft = 0, halfObsRight = 0;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const isGap = row.every(t => t === null);
    if (isGap) { gaps++; continue; }

    for (let l = 0; l < ROAD_WIDTH_LANES; l++) {
      const t = row[l];
      if (!t) continue;
      tiles++;
      if (t.full || t.half) {
        obstacles++;
        if (t.half && !t.full) {
          if (l < 3) halfObsLeft++;
          else if (l > 3) halfObsRight++;
        }
      }
      if (t.tunnel) tunnels++;
      if (t.startY !== undefined || t.endY !== undefined) ramps++;
      if (t.top_color === 11 || t.top_color === 12) boosts++;
      if (t.top_color === 10) boosts++; // refills count as resource
      if (t.top_color === 13 || t.bottom_color === 13) burns++;
      if (t.top_color === 3 || t.bottom_color === 3) sticky++;
      if (t.bottom_color === 9) slippery++;
    }
  }

  const totalRows = rows.length;
  const gapRatio = gaps / totalRows;
  const obsDensity = tiles > 0 ? obstacles / tiles : 0;
  const tunnelRatio = tiles > 0 ? tunnels / tiles : 0;
  const rampRatio = tiles > 0 ? ramps / tiles : 0;
  const boostRatio = tiles > 0 ? boosts / tiles : 0;
  const burnRatio = tiles > 0 ? burns / tiles : 0;

  // Classify by dominant feature
  if (gapRatio > 0.15) return 'jump';
  if (tunnelRatio > 0.4) return 'tunnel';
  if (rampRatio > 0.3) return 'elevation_change';
  if (halfObsLeft > 1 && halfObsRight > 1) return 'slalom';
  if (obsDensity > 0.08) return 'obstacle_course';
  if (burnRatio > 0.1) return 'hazard_zone';
  if (boostRatio > 0.15) return 'speed_section';
  if (slippery > tiles * 0.3) return 'hazard_zone';

  // Check if it's a narrow passage
  const avgWidth = rows.reduce((sum, row) => {
    return sum + row.filter(t => t !== null).length;
  }, 0) / totalRows;
  if (avgWidth <= 3 && avgWidth > 0) return 'narrow_passage';

  if (obsDensity < 0.02 && gapRatio < 0.05) return 'runway';

  return 'mixed';
}

// ---- Rate difficulty of a segment ----
function rateDifficulty(rows) {
  let tiles = 0, obstacles = 0, gaps = 0, burns = 0;
  let minWidth = 7;

  for (const row of rows) {
    const isGap = row.every(t => t === null);
    if (isGap) { gaps++; continue; }
    const w = row.filter(t => t !== null).length;
    if (w > 0) minWidth = Math.min(minWidth, w);
    for (const t of row) {
      if (!t) continue;
      tiles++;
      if (t.full || t.half) obstacles++;
      if (t.top_color === 13 || t.bottom_color === 13) burns++;
    }
  }

  // Difficulty 1-5 scale
  let score = 1;
  if (gaps > 0) score += 1;
  if (gaps > 2) score += 1;
  if (obstacles > 3) score += 1;
  if (minWidth <= 2) score += 1;
  if (burns > 0) score += 1;
  const obsDensity = tiles > 0 ? obstacles / tiles : 0;
  if (obsDensity > 0.1) score += 1;

  return Math.min(5, score);
}

// ---- MAIN EXTRACTION PIPELINE ----
function extractSegments() {
  const levels = loadLevels();
  console.log('Loaded ' + levels.length + ' original levels');

  const allSegments = [];
  let segId = 0;

  for (const level of levels) {
    const rows = level.rows;
    if (!rows || rows.length < 4) continue;

    // Step 1: Find connected regions
    const { regionMap, regions } = findConnectedRegions(rows);

    // Step 2: Find valid cut points
    const validCuts = findValidCuts(rows, regions);

    // Step 3: Select best cuts
    const cuts = selectCuts(validCuts, rows.length, 4, 25);

    // Step 4: Extract segments between cuts
    const boundaries = [-1, ...cuts, rows.length - 1];

    for (let i = 0; i < boundaries.length - 1; i++) {
      const startRow = boundaries[i] + 1;
      const endRow = boundaries[i + 1];
      if (endRow - startRow + 1 < 4) continue; // Skip micro-segments

      const segRows = rows.slice(startRow, endRow + 1);

      // Deep clone to avoid mutation
      const clonedRows = segRows.map(row =>
        row.map(t => t ? { ...t } : null)
      );

      const entry = analyzeEntryInterface(clonedRows);
      const exit = analyzeInterface(clonedRows);
      const category = classifySegment(clonedRows);
      const difficulty = rateDifficulty(clonedRows);

      allSegments.push({
        id: segId++,
        source: { level: level.level_index, startRow, endRow },
        length: clonedRows.length,
        category,
        difficulty,
        entry,
        exit,
        rows: clonedRows,
      });
    }
  }

  console.log('Extracted ' + allSegments.length + ' segments total');

  // Print category breakdown
  const cats = {};
  for (const seg of allSegments) {
    cats[seg.category] = (cats[seg.category] || 0) + 1;
  }
  console.log('\nCategory breakdown:');
  for (const [cat, count] of Object.entries(cats).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + cat + ': ' + count);
  }

  // Print difficulty breakdown
  const diffs = {};
  for (const seg of allSegments) {
    diffs[seg.difficulty] = (diffs[seg.difficulty] || 0) + 1;
  }
  console.log('\nDifficulty breakdown:');
  for (const [d, count] of Object.entries(diffs).sort((a, b) => a[0] - b[0])) {
    console.log('  Level ' + d + ': ' + count);
  }

  // Print length stats
  const lengths = allSegments.map(s => s.length);
  console.log('\nLength stats:');
  console.log('  Min: ' + Math.min(...lengths));
  console.log('  Max: ' + Math.max(...lengths));
  console.log('  Avg: ' + Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length));

  return allSegments;
}

// ---- Run and save ----
const segments = extractSegments();

const outPath = path.resolve('data/segment_library.json');
fs.writeFileSync(outPath, JSON.stringify(segments, null, 2), 'utf8');
console.log('\nSaved segment library to ' + outPath);
console.log('File size: ' + (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB');
