import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const WIDTH = 1024;
const HEIGHT = 1024;

// --- Seedable PRNG (Mulberry32) to ensure deterministic, high-quality results ---
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- CRC32 for PNG compliance ---
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  
  const crcBuf = Buffer.alloc(4 + len);
  crcBuf.write(type, 0, 4, 'ascii');
  data.copy(crcBuf, 4);
  
  const crcVal = crc32(crcBuf);
  buf.writeUInt32BE(crcVal >>> 0, 8 + len);
  return buf;
}

function encodePNG(width, height, pixels) {
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth (8 bits per channel)
  ihdr[9] = 6; // color type (6 = RGBA)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const scanlineSize = 1 + width * 4;
  const uncompressed = Buffer.alloc(height * scanlineSize);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    uncompressed[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      uncompressed[offset++] = pixels[idx];
      uncompressed[offset++] = pixels[idx + 1];
      uncompressed[offset++] = pixels[idx + 2];
      uncompressed[offset++] = pixels[idx + 3];
    }
  }

  const compressed = zlib.deflateSync(uncompressed, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, makeChunk('IHDR', ihdr), idat, iend]);
}

// Helper to smooth / blur a 1D array to make seamless noise gradients
function generateSeamlessNoise1D(seed, size, blurRadius) {
  const rand = mulberry32(seed);
  const raw = Array.from({ length: size }, () => rand());
  const smoothed = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    let sum = 0;
    let count = 0;
    for (let d = -blurRadius; d <= blurRadius; d++) {
      const idx = (i + d + size) % size;
      sum += raw[idx];
      count++;
    }
    smoothed[i] = sum / count;
  }
  return smoothed;
}

// Generate road_metallic_plate.png
function generateRoadPlate() {
  console.log("Generating road_metallic_plate.png texture...");
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  const rand = mulberry32(888);

  // Generate 1D horizontal scratch noise (seamless)
  const metalStriations = generateSeamlessNoise1D(101, HEIGHT, 4);
  const metalStriationsFine = generateSeamlessNoise1D(202, HEIGHT, 1);

  // Base setup
  for (let y = 0; y < HEIGHT; y++) {
    const row = Math.floor(y / 128);
    const offsetX = (row % 2) * 256;
    
    for (let x = 0; x < WIDTH; x++) {
      const idx = (y * WIDTH + x) * 4;

      // 1. Dark metallic charcoal base gray
      let r = 28;
      let g = 30;
      let b = 36;

      // 2. Add horizontal brushed metal details
      const striation = metalStriations[y];
      const striationFine = metalStriationsFine[y];
      const roughness = (rand() - 0.5) * 8; // micro noise

      const brushEffect = (striation * 14) + (striationFine * 6) + roughness;
      r += brushEffect;
      g += brushEffect;
      b += brushEffect;

      // 3. Staggered horizontal panels (512x128 pixels each)
      const px = (x + offsetX) % 512;
      const py = y % 128;

      // Make panels alternate slightly in tone/brightness to emphasize the pattern
      const panelCol = Math.floor((x + offsetX) / 512);
      const panelId = row * 7 + panelCol * 13;
      const panelRand = mulberry32(panelId);
      const altFactor = (panelRand() - 0.5) * 16;
      r += altFactor;
      g += altFactor;
      b += altFactor;

      // Bevel & groove for the staggered panels
      const grooveWidth = 4;
      const bevelWidth = 8;
      
      const distL = px;
      const distR = 512 - px;
      const distT = py;
      const distB = 128 - py;
      const distEdge = Math.min(distL, distR, distT, distB);

      if (distEdge < grooveWidth) {
        // Deep panel border grooves
        r = 10;
        g = 11;
        b = 14;
      } else if (distEdge < bevelWidth) {
        // Staggered panel bevel highlight / shadow
        const isHighlight = (distL === distEdge || distT === distEdge);
        const factor = isHighlight ? 35 : -35;
        r += factor;
        g += factor;
        b += factor;
      } else {
        // Let's add a subtle diagonal ribbed slip-resistant tread texture inside the slats!
        // Alternates directions every panel row for a highly tactile industrial aesthetic!
        const treadDir = (row % 2 === 0) ? (px - py) : (px + py);
        if (treadDir % 32 < 3) {
          // Dark tread line
          r -= 10;
          g -= 10;
          b -= 10;
        } else if (treadDir % 32 < 5) {
          // Highlight tread edge
          r += 8;
          g += 8;
          b += 8;
        }
      }

      // Clamp intermediate values
      pixels[idx] = Math.max(0, Math.min(255, r));
      pixels[idx + 1] = Math.max(0, Math.min(255, g));
      pixels[idx + 2] = Math.max(0, Math.min(255, b));
      pixels[idx + 3] = 255; // Alpha
    }
  }

  // 5. Draw 3D Rivets at staggered plate corners (22px offset from boundaries)
  const rivets = [];
  for (let r = 0; r < 8; r++) {
    const shift = (r % 2) * 256;
    const yLine = r * 128;
    for (let c = 0; c <= 2; c++) {
      const xLine = (c * 512 - shift + 1024) % 1024;
      rivets.push({ x: (xLine + 22) % 1024, y: (yLine + 22) % 1024 });
      rivets.push({ x: (xLine - 22 + 1024) % 1024, y: (yLine + 22) % 1024 });
      rivets.push({ x: (xLine + 22) % 1024, y: (yLine - 22 + 1024) % 1024 });
      rivets.push({ x: (xLine - 22 + 1024) % 1024, y: (yLine - 22 + 1024) % 1024 });
    }
  }

  for (const rivet of rivets) {
    const cx = rivet.x;
    const cy = rivet.y;
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        const tx = (cx + dx + WIDTH) % WIDTH;
        const ty = (cy + dy + HEIGHT) % HEIGHT;
        const r = Math.hypot(dx, dy);
        if (r < 5) {
          const idx = (ty * WIDTH + tx) * 4;
          if (r < 3.5) {
            // Rivet dome shading
            const shine = (dx / 3.5) * 40;
            pixels[idx] = Math.max(0, Math.min(255, pixels[idx] + 20 + shine));
            pixels[idx + 1] = Math.max(0, Math.min(255, pixels[idx + 1] + 20 + shine));
            pixels[idx + 2] = Math.max(0, Math.min(255, pixels[idx + 2] + 25 + shine));
            
            // Add a screw head slit
            if (Math.abs(dy) < 1 && Math.abs(dx) < 2.5) {
              pixels[idx] = Math.max(0, pixels[idx] - 70);
              pixels[idx + 1] = Math.max(0, pixels[idx + 1] - 70);
              pixels[idx + 2] = Math.max(0, pixels[idx + 2] - 70);
            }
          } else {
            // Outer shadow ring
            pixels[idx] = Math.max(0, pixels[idx] - 50);
            pixels[idx + 1] = Math.max(0, pixels[idx + 1] - 50);
            pixels[idx + 2] = Math.max(0, pixels[idx + 2] - 50);
          }
        }
      }
    }
  }

  // 6. Neon Grid lines removed to clean up red/blue cross patterns on road blocks.

  return encodePNG(WIDTH, HEIGHT, pixels);
}

// Generate spaceship_hull_plating.png
function generateSpaceshipHull() {
  console.log("Generating spaceship_hull_plating.png texture...");
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
  const rand = mulberry32(999);

  // Asymmetric but perfectly seamless column and row layout
  const cols = [0, 180, 440, 700, WIDTH];
  const rows = [
    [0, 300, 600, 900, HEIGHT], // col 0 rows
    [0, 250, 550, 800, HEIGHT], // col 1 rows
    [0, 400, 750, HEIGHT],      // col 2 rows
    [0, 200, 500, 850, HEIGHT]   // col 3 rows
  ];

  // Helper to determine containing column index
  function getColumnIndex(x) {
    if (x < 180) return 0;
    if (x < 440) return 1;
    if (x < 700) return 2;
    return 3;
  }

  // Pre-generate vertical seamless scratch noise
  const metalStriations = generateSeamlessNoise1D(333, WIDTH, 3);
  const metalStriationsFine = generateSeamlessNoise1D(444, WIDTH, 1);

  // Surface scratch lines for spacecraft battle-wear
  const scratches = [];
  const scratchRand = mulberry32(777);
  for (let i = 0; i < 40; i++) {
    scratches.push({
      x: Math.floor(scratchRand() * WIDTH),
      y: Math.floor(scratchRand() * HEIGHT),
      length: 40 + Math.floor(scratchRand() * 120),
      dx: scratchRand() > 0.5 ? 1 : -1,
      dy: scratchRand() > 0.5 ? 1 : -1,
      opacity: 0.15 + scratchRand() * 0.3
    });
  }

  // Helper to check if a pixel lies on a scratch
  // Scratches are represented as short diagonal line segments (rendered seamlessly)
  const scratchMask = new Float32Array(WIDTH * HEIGHT);
  for (const s of scratches) {
    for (let step = 0; step < s.length; step++) {
      const sx = (s.x + step * s.dx + WIDTH) % WIDTH;
      const sy = (s.y + step * s.dy + HEIGHT) % HEIGHT;
      // Draw a thin scratch line with a tiny bit of thickness
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const px = (sx + ox + WIDTH) % WIDTH;
          const py = (sy + oy + HEIGHT) % HEIGHT;
          const dist = Math.hypot(ox, oy);
          const val = (1 - dist / 1.5) * s.opacity;
          if (val > 0) {
            scratchMask[py * WIDTH + px] = Math.max(scratchMask[py * WIDTH + px], val);
          }
        }
      }
    }
  }

  // Generate background plates and bevels
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const idx = (y * WIDTH + x) * 4;

      const c = getColumnIndex(x);
      
      // Horizontal bounds of this column
      const xLeft = cols[c];
      const xRight = cols[c + 1];

      // Vertical bounds of the panel containing y in this column
      const rList = rows[c];
      let rIdx = 0;
      for (let i = 0; i < rList.length - 1; i++) {
        if (y >= rList[i] && y < rList[i + 1]) {
          rIdx = i;
          break;
        }
      }
      const yTop = rList[rIdx];
      const yBottom = rList[rIdx + 1];

      // Distances to panel boundaries (considering seamless wrapping for boundaries at 0 or WIDTH/HEIGHT)
      let distL = Math.abs(x - xLeft); if (xLeft === 0) distL = Math.min(distL, WIDTH - x);
      let distR = Math.abs(x - xRight); if (xRight === WIDTH) distR = Math.min(distR, x);
      let distT = Math.abs(y - yTop); if (yTop === 0) distT = Math.min(distT, HEIGHT - y);
      let distB = Math.abs(y - yBottom); if (yBottom === HEIGHT) distB = Math.min(distB, y);

      const distEdge = Math.min(distL, distR, distT, distB);

      // Unique panel ID for color variations
      const panelId = c * 13 + rIdx * 7;
      const panelRand = mulberry32(panelId);
      
      // Base premium steel-titanium gray
      let r = 135;
      let g = 142;
      let b = 152;

      // Add a subtle unique tint to each panel for that modular metal sci-fi plating look
      const tintVal = (panelRand() - 0.5) * 22;
      r += tintVal + (panelRand() > 0.6 ? 6 : -4);
      g += tintVal + (panelRand() < 0.4 ? 4 : -2);
      b += tintVal + (panelRand() > 0.8 ? 10 : 0); // slightly blueish titanium

      // Add vertical brushed lines (striations)
      const striation = metalStriations[x];
      const striationFine = metalStriationsFine[x];
      const roughness = (rand() - 0.5) * 10;
      const brushEffect = (striation * 16) + (striationFine * 6) + roughness;
      r += brushEffect;
      g += brushEffect;
      b += brushEffect;

      // Handle groove, bevel, and shading
      const grooveWidth = 4;
      const bevelWidth = 8;

      if (distEdge < grooveWidth) {
        // Deep panel line (dark void)
        r = 24;
        g = 25;
        b = 28;
      } else if (distEdge < bevelWidth) {
        // Beveled plate edge with directional 3D light shader
        const isHighlight = (distL === distEdge || distT === distEdge);
        const factor = isHighlight ? 45 : -45;
        r += factor;
        g += factor;
        b += factor;
      }

      // Apply the scratches mask (metal wear)
      const sFactor = scratchMask[y * WIDTH + x];
      if (sFactor > 0 && distEdge >= grooveWidth) {
        // Scratches are a combination of a dark groove and a bright highlight side-by-side
        // Create a bright highlight beneath the scratch
        const isScratchHighlight = ((x + y) % 2 === 0);
        if (isScratchHighlight) {
          r = Math.min(255, r + sFactor * 100);
          g = Math.min(255, g + sFactor * 100);
          b = Math.min(255, b + sFactor * 100);
        } else {
          r = Math.max(0, r - sFactor * 90);
          g = Math.max(0, g - sFactor * 90);
          b = Math.max(0, b - sFactor * 90);
        }
      }

      pixels[idx] = Math.max(0, Math.min(255, r));
      pixels[idx + 1] = Math.max(0, Math.min(255, g));
      pixels[idx + 2] = Math.max(0, Math.min(255, b));
      pixels[idx + 3] = 255;
    }
  }

  // Draw 3D Rivets alongside panel borders
  const rivets = [];
  
  // Rivets offset along vertical panel edges
  for (let i = 0; i < cols.length; i++) {
    const cx = cols[i];
    for (let yVal = 16; yVal < HEIGHT; yVal += 64) {
      // Add rivets on left and right sides of column boundary, wrapped seamlessly
      rivets.push({ x: (cx - 12 + WIDTH) % WIDTH, y: yVal });
      rivets.push({ x: (cx + 12 + WIDTH) % WIDTH, y: yVal });
    }
  }

  // Rivets offset along horizontal panel edges
  for (let c = 0; c < 4; c++) {
    const xLeft = cols[c];
    const xRight = cols[c + 1];
    for (const ry of rows[c]) {
      // Skip bounds to prevent duplicates near vertical seams
      for (let xVal = xLeft + 24; xVal < xRight - 16; xVal += 64) {
        rivets.push({ x: xVal % WIDTH, y: (ry - 12 + HEIGHT) % HEIGHT });
        rivets.push({ x: xVal % WIDTH, y: (ry + 12 + HEIGHT) % HEIGHT });
      }
    }
  }

  // Draw the rivet list onto the pixel canvas
  for (const rivet of rivets) {
    const cx = rivet.x;
    const cy = rivet.y;

    // Check distance to panel borders to avoid rivets overlapping the deep grooves
    // Find column containing rivet x
    const c = getColumnIndex(cx);
    const xLeft = cols[c];
    const xRight = cols[c + 1];
    const rList = rows[c];
    let rIdx = 0;
    for (let i = 0; i < rList.length - 1; i++) {
      if (cy >= rList[i] && cy < rList[i + 1]) {
        rIdx = i;
        break;
      }
    }
    const yTop = rList[rIdx];
    const yBottom = rList[rIdx + 1];

    let distL = Math.abs(cx - xLeft); if (xLeft === 0) distL = Math.min(distL, WIDTH - cx);
    let distR = Math.abs(cx - xRight); if (xRight === WIDTH) distR = Math.min(distR, cx);
    let distT = Math.abs(cy - yTop); if (yTop === 0) distT = Math.min(distT, HEIGHT - cy);
    let distB = Math.abs(cy - yBottom); if (yBottom === HEIGHT) distB = Math.min(distB, cy);

    const distEdge = Math.min(distL, distR, distT, distB);

    // Only draw rivets that aren't landing inside deep panel lines (must be reasonably inside the panels)
    if (distEdge >= 6) {
      for (let dy = -4; dy <= 4; dy++) {
        for (let dx = -4; dx <= 4; dx++) {
          const tx = (cx + dx + WIDTH) % WIDTH;
          const ty = (cy + dy + HEIGHT) % HEIGHT;
          const r = Math.hypot(dx, dy);
          if (r < 4) {
            const idx = (ty * WIDTH + tx) * 4;
            if (r < 2.5) {
              const shine = (dx / 2.5) * 35;
              pixels[idx] = Math.max(0, Math.min(255, pixels[idx] + 25 + shine));
              pixels[idx + 1] = Math.max(0, Math.min(255, pixels[idx + 1] + 25 + shine));
              pixels[idx + 2] = Math.max(0, Math.min(255, pixels[idx + 2] + 30 + shine));
            } else {
              // Outer inset rivet shadow
              pixels[idx] = Math.max(0, pixels[idx] - 60);
              pixels[idx + 1] = Math.max(0, pixels[idx + 1] - 60);
              pixels[idx + 2] = Math.max(0, pixels[idx + 2] - 60);
            }
          }
        }
      }
    }
  }

  return encodePNG(WIDTH, HEIGHT, pixels);
}

// Ensure target directory exists and write textures
const outDir = 'c:\\dev\\Sky roads\\';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const roadBuf = generateRoadPlate();
fs.writeFileSync(path.join(outDir, 'road_metallic_plate.png'), roadBuf);
console.log("Successfully saved road_metallic_plate.png");

const hullBuf = generateSpaceshipHull();
fs.writeFileSync(path.join(outDir, 'spaceship_hull_plating.png'), hullBuf);
console.log("Successfully saved spaceship_hull_plating.png");

console.log("All texture files generated and saved successfully!");
