/**
 * WipEout-style PBR texture generator using ComfyUI + SD 1.5.
 *
 * Seamless tiling: SeamlessTile ("Modify in place") patches all Conv2d layers
 * to circular padding, CircularVAEDecode does the same for the VAE decoder.
 * SD 1.5 is a UNet — SeamlessTile works fully on it (unlike SD3.5/FLUX DiT).
 *
 * Per theme generates: road_diffuse, road_edge_diffuse, obstacle_diffuse,
 * tunnel_diffuse, then derives normal/roughness/metalness/emissive via Python.
 *
 * Usage:
 *   node tools/generate_comfy_textures.js            # all themes, skip completed
 *   node tools/generate_comfy_textures.js --theme void
 *   node tools/generate_comfy_textures.js --single   # first pending only
 *   node tools/generate_comfy_textures.js --reset    # clear progress and restart
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Jimp } from 'jimp';

const COMFY_URL = 'http://127.0.0.1:8188';
const PYTHON_PATH = 'D:\\AI\\ComfyUI (1)\\standalone-env\\python.exe';
const WORKSPACE_DIR = 'c:\\dev\\Sky roads';
const ASSETS_DIR = path.join(WORKSPACE_DIR, 'assets', 'custom');
const PROGRESS_FILE = path.join(WORKSPACE_DIR, 'tools', 'generation_progress.json');
const CHECKPOINT = 'v1-5-pruned-emaonly-fp16.safetensors';

const STYLE_SUFFIX = 'seamless tileable game texture, flat 2D vector graphic, orthographic projection, no perspective, no vanishing point, crisp clean edges, fills frame edge to edge, video game asset';

const NEGATIVE = [
  'text, watermark, signature, logo, letters',
  'human, person, face, hands, character',
  'perspective, horizon, vanishing point, depth of field',
  '3D render, photorealistic, scene, environment, sky, background',
  'seams, tile borders, visible edges',
  'blurry, noisy, jpeg artifacts, low quality',
  'single object, isolated item, centered hero',
  'diagonal lines, diagonal stripes, slanted patterns, tilted lines, curved messy lines, diagonal orientation, rotated patterns, angled lines, diagonal cracks, diagonal cuts'
].join(', ');

// 14 themes — road (grayscale high-contrast template), road_edge (grayscale mask),
// obstacle (grayscale hazard/boundary mask), tunnel (detailed neon vector design).
// SD1.5 prompts: single positive string, concise keywords.
const THEMES = [
  {
    key: 'core',
    road:      { positive: 'monochrome high-contrast technical grid, strictly parallel vertical lines, clean longitudinal circuit traces, black substrate with white lines' },
    road_edge: { positive: 'monochrome high-contrast solid white border strip, clean vector line, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical warning stripes, vertical bars, tech panel markings, black and white' },
    tunnel:    { positive: 'intricate neon vector tunnel wall, repeating concentric octagonal frames, glowing green wireframe arches, green led indicators' },
  },
  {
    key: 'cyberpunk',
    road:      { positive: 'monochrome high-contrast retro-futuristic grid, parallel horizontal stripes, flat latitudinal panels, black and white' },
    road_edge: { positive: 'monochrome high-contrast neon bar mask, solid white horizontal glow strip, black background' },
    obstacle:  { positive: 'monochrome high-contrast technical grid panels, square wireframe modules, white on black' },
    tunnel:    { positive: 'cyberpunk neon tunnel wall, concentric octagonal arches, cyan and magenta vector grid, glowing neon conduits' },
  },
  {
    key: 'industrial',
    road:      { positive: 'monochrome high-contrast metal deck, parallel vertical vents and cooling slats, vertical industrial panel lines' },
    road_edge: { positive: 'monochrome high-contrast solid white panel, industrial safety border mask, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical hazard bars, warning slats, industrial bolting grid' },
    tunnel:    { positive: 'industrial tunnel interior, vertical structural mechanical ribs, warning light strips, vector wireframe panels' },
  },
  {
    key: 'organic',
    road:      { positive: 'monochrome high-contrast organic cells, strictly vertical organic channels, vertical veins, no diagonal fibers' },
    road_edge: { positive: 'monochrome high-contrast glowing organic margin line, white biological membrane, black background' },
    obstacle:  { positive: 'monochrome high-contrast ribbed biological segments, strictly vertical biological ridges, vertical organic scale segments' },
    tunnel:    { positive: 'organic cavern tunnel wall, ribbed biological arches, bioluminescent green vector nodes, scale patterns' },
  },
  {
    key: 'alien',
    road:      { positive: 'monochrome high-contrast alien crystal lattice, strictly vertical alien crystal panels, vertical mineral lines, no diagonal cracks' },
    road_edge: { positive: 'monochrome high-contrast crystal vein border, glowing white crystal strip, black background' },
    obstacle:  { positive: 'monochrome high-contrast alien glyphs panel, strictly vertical alien crystal ribs, vertical glyph columns' },
    tunnel:    { positive: 'alien temple tunnel interior, glowing purple and gold vector wireframe glyphs, geometric crystal formations' },
  },
  {
    key: 'furnace',
    road:      { positive: 'monochrome high-contrast volcanic basalt joints, strictly horizontal basalt plate borders, parallel horizontal fissure lines, no diagonal cracks' },
    road_edge: { positive: 'monochrome high-contrast solid white lava channel border, glowing edge strip, black background' },
    obstacle:  { positive: 'monochrome high-contrast magma flow vents, strictly vertical geothermal grates, vertical cooling vents' },
    tunnel:    { positive: 'furnace industrial archways, glowing orange vector heat vents, vertical cooling bars, metallic frame' },
  },
  {
    key: 'glitch',
    road:      { positive: 'monochrome high-contrast digital glitch blocks, horizontal scanlines, repeating square pixel errors' },
    road_edge: { positive: 'monochrome high-contrast corrupted data border, white digital noise strip, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical glitch pillars, data distortion columns, horizontal glitch bars' },
    tunnel:    { positive: 'glitch matrix tunnel wall, cascading vertical error pixels, horizontal digital distortion lines' },
  },
  {
    key: 'pulse',
    road:      { positive: 'monochrome high-contrast concentric rings, strictly horizontal pulse wave bars, horizontal soundwave bars, speed grid lines' },
    road_edge: { positive: 'monochrome high-contrast electric wave edge, white pulse line, black background' },
    obstacle:  { positive: 'monochrome high-contrast frequency bands, strictly vertical frequency bands, vertical sound bars' },
    tunnel:    { positive: 'pulse wave corridor tunnel, vertical frequency wave rings, electric blue light channels' },
  },
  {
    key: 'ridge',
    road:      { positive: 'monochrome high-contrast vertical slate panel lines, parallel vertical granite joints, strictly vertical stone grout lines, no diagonal cracks' },
    road_edge: { positive: 'monochrome high-contrast rock margin strip, white granite border line, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical slate slab tiles, vertical stone seams, cracked rocky panels, strictly vertical orientation' },
    tunnel:    { positive: 'rocky cavern archways, vertical geometric stone columns, vertical wireframe rock seams, dark stone gaps' },
  },
  {
    key: 'shallows',
    road:      { positive: 'monochrome high-contrast parallel horizontal ripple bands, strictly horizontal straight wave crest lines, flat horizontal panels, water bar sequence' },
    road_edge: { positive: 'monochrome high-contrast water edge mask, white ripple line, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical sea reed panels, modular coral ribs, aquatic grid' },
    tunnel:    { positive: 'underwater tunnel interior, circular rib cages, glowing turquoise caustics, vector grid coral' },
  },
  {
    key: 'spire',
    road:      { positive: 'monochrome high-contrast polished marble tiles, perfect vertical and horizontal thin grout lines' },
    road_edge: { positive: 'monochrome high-contrast solid gold trim mask, white metallic margin, black background' },
    obstacle:  { positive: 'monochrome high-contrast clean geometric panels, vertical spire pillars, architectural molding' },
    tunnel:    { positive: 'futuristic cathedral archway, gold vector spire rib vaults, white marble wireframe panels' },
  },
  {
    key: 'thrill',
    road:      { positive: 'monochrome high-contrast racing track, parallel vertical speed lines, horizontal expansion bars' },
    road_edge: { positive: 'monochrome high-contrast race track border, white curb markings, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical pit stop warning panels, modular track barrier lines' },
    tunnel:    { positive: 'high-speed speedway tunnel, horizontal orange light bars, carbon fiber structural rib arches' },
  },
  {
    key: 'tundra',
    road:      { positive: 'monochrome high-contrast glacier ice fractures, strictly vertical frost crystal paths, parallel vertical paths, no diagonal cracks' },
    road_edge: { positive: 'monochrome high-contrast frost border, white ice margin, black background' },
    obstacle:  { positive: 'monochrome high-contrast vertical ice shards, strictly vertical icicle columns, fractured ice paneling' },
    tunnel:    { positive: 'ice cavern tunnel interior, vertical frost stalactite arches, geometric ice facets, glowing cold lines' },
  },
  {
    key: 'void',
    road:      { positive: 'monochrome high-contrast space grid, minimal vertical and horizontal lines, dark coordinate system' },
    road_edge: { positive: 'monochrome high-contrast vector margin line, white alignment laser, black background' },
    obstacle:  { positive: 'monochrome high-contrast minimal vector panels, vertical data columns, HUD crosshairs' },
    tunnel:    { positive: 'void minimal corridor tunnel, thin neon vector wireframe lines, floating coordinate grids' },
  },
];

// Deterministic seed from theme key + type string
function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % 4294967291;
}

function buildWorkflow(prompts, seed, isGrayscale = false) {
  const positive = `${prompts.positive}, ${STYLE_SUFFIX}`;
  const negative = isGrayscale 
    ? `${NEGATIVE}, color, yellow, red, blue, green, orange, purple, pink` 
    : NEGATIVE;

  return {
    "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": CHECKPOINT } },
    "2": {
      "class_type": "SeamlessTile",
      "inputs": { "model": ["1", 0], "tiling": "enable", "copy_model": "Make a copy" }
    },
    "3": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": positive } },
    "4": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": negative } },
    "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
    "6": {
      "class_type": "KSampler",
      "inputs": {
        "model": ["2", 0],
        "positive": ["3", 0],
        "negative": ["4", 0],
        "latent_image": ["5", 0],
        "seed": seed,
        "steps": 25,
        "cfg": 7.0,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0
      }
    },
    "7": {
      "class_type": "CircularVAEDecode",
      "inputs": { "samples": ["6", 0], "vae": ["1", 2], "tiling": "enable" }
    },
    "8": { "class_type": "SaveImage", "inputs": { "images": ["7", 0], "filename_prefix": "skyroads" } }
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function queuePrompt(workflow) {
  const response = await fetch(`${COMFY_URL}/api/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ComfyUI queue failed ${response.status}: ${text.slice(0, 200)}`);
  }
  const res = await response.json();
  if (res.error) throw new Error(`ComfyUI error: ${JSON.stringify(res.error)}`);
  return res.prompt_id;
}

async function pollHistory(promptId, timeoutMs = 600000) {
  const deadline = Date.now() + timeoutMs;
  let dots = 0;
  while (Date.now() < deadline) {
    await sleep(3000);
    try {
      const response = await fetch(`${COMFY_URL}/api/history/${promptId}`);
      if (response.ok) {
        const history = await response.json();
        if (history && history[promptId] && history[promptId].outputs) {
          return history[promptId];
        }
        if (history && history[promptId] && history[promptId].status?.status_str === 'error') {
          throw new Error(`ComfyUI prompt errored: ${JSON.stringify(history[promptId].status)}`);
        }
      }
    } catch (e) {
      if (e.message.startsWith('ComfyUI prompt errored')) throw e;
    }
    process.stdout.write(`\r  Waiting${'.'.repeat((++dots % 4) + 1)}   `);
  }
  throw new Error(`Timed out waiting for prompt ${promptId}`);
}

async function downloadImage(filename, destPath) {
  const url = `${COMFY_URL}/view?filename=${encodeURIComponent(filename)}&type=output`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${filename}: ${response.status}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

function runPBRMaps(diffusePath, outputDir, theme) {
  const script = path.join(WORKSPACE_DIR, 'tools', 'generate_pbr_maps.py');
  const cmd = `"${PYTHON_PATH}" "${script}" "${diffusePath}" "${outputDir}" "${theme}"`;
  try {
    execSync(cmd, { cwd: WORKSPACE_DIR, stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error(`  [PBR] Python error: ${e.stderr?.toString().slice(0, 300)}`);
    return false;
  }
}

async function analyzeTextureOrientation(filepath) {
  try {
    const image = await Jimp.read(filepath);
    image.greyscale();
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = image.bitmap.data;

    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1]
    ];
    const sobelY = [
      [-1, -2, -1],
      [ 0,  0,  0],
      [ 1,  2,  1]
    ];

    const getPixel = (x, y) => {
      const idx = (y * width + x) * 4;
      return data[idx];
    };

    let maxMag = 0;
    const magnitudes = new Float32Array((width - 2) * (height - 2));
    const gxArray = new Float32Array((width - 2) * (height - 2));
    const gyArray = new Float32Array((width - 2) * (height - 2));

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const val = getPixel(x + kx, y + ky);
            gx += val * sobelX[ky + 1][kx + 1];
            gy += val * sobelY[ky + 1][kx + 1];
          }
        }
        const mag = Math.sqrt(gx * gx + gy * gy);
        const idx = (y - 1) * (width - 2) + (x - 1);
        magnitudes[idx] = mag;
        gxArray[idx] = gx;
        gyArray[idx] = gy;
        if (mag > maxMag) maxMag = mag;
      }
    }

    const threshold = maxMag * 0.1;
    let vertical = 0;
    let horizontal = 0;
    let diagonal = 0;
    let total = 0;

    for (let i = 0; i < magnitudes.length; i++) {
      const mag = magnitudes[i];
      if (mag > threshold) {
        const gx = gxArray[i];
        const gy = gyArray[i];
        const angle = Math.atan2(gy, gx) * 180 / Math.PI;
        const absAngle = Math.abs(angle);

        if (absAngle < 15 || absAngle > 165) {
          vertical++;
        } else if (absAngle > 75 && absAngle < 105) {
          horizontal++;
        } else if ((absAngle > 30 && absAngle < 60) || (absAngle > 120 && absAngle < 150)) {
          diagonal++;
        }
        total++;
      }
    }

    if (total === 0) return { diagonalPercent: 0, verticalPercent: 0, horizontalPercent: 0 };
    return {
      diagonalPercent: diagonal / total,
      verticalPercent: vertical / total,
      horizontalPercent: horizontal / total
    };
  } catch (err) {
    console.error(`  [Jimp] Error analyzing ${path.basename(filepath)}:`, err.message);
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const args = process.argv.slice(2);
const isSingle = args.includes('--single');
const isReset = args.includes('--reset');
const themeIndex = args.indexOf('--theme');
const filterTheme = args.find(a => a !== '--single' && a !== '--reset' && a !== '--theme' && !a.startsWith('-')) ||
  (themeIndex !== -1 ? args[themeIndex + 1] : undefined);

let progress = {};
if (!isReset && fs.existsSync(PROGRESS_FILE)) {
  try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (_) {}
} else if (isReset) {
  console.log('Resetting progress...');
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// The surface types we generate per theme
const SURFACE_TYPES = ['road', 'road_edge', 'obstacle', 'tunnel'];

async function run() {
  // Verify ComfyUI is reachable
  try {
    const r = await fetch(`${COMFY_URL}/system_stats`);
    if (!r.ok) throw new Error(r.status);
    console.log(`ComfyUI OK (${COMFY_URL})`);
  } catch (e) {
    console.error(`Cannot reach ComfyUI at ${COMFY_URL}: ${e.message}`);
    process.exit(1);
  }

  const themes = filterTheme
    ? THEMES.filter(t => t.key === filterTheme)
    : THEMES;

  if (filterTheme && themes.length === 0) {
    console.error(`Unknown theme: ${filterTheme}. Valid: ${THEMES.map(t => t.key).join(', ')}`);
    process.exit(1);
  }

  let generated = 0;

  for (const theme of themes) {
    for (const surfaceType of SURFACE_TYPES) {
      const key = `${theme.key}_${surfaceType}`;
      if (progress[key]?.status === 'completed') {
        console.log(`[Skip] ${key}`);
        continue;
      }

      const prompts = theme[surfaceType];
      if (!prompts) {
        console.warn(`[Warn] No prompt for ${key}, skipping.`);
        continue;
      }

      let currentSeed = hashSeed(key);
      let attempts = 0;
      const maxAttempts = 6;
      let success = false;
      const isGrayscale = surfaceType === 'road' || surfaceType === 'road_edge' || surfaceType === 'obstacle';
      const needsOrientationCheck = surfaceType === 'road' || surfaceType === 'obstacle' || surfaceType === 'road_edge' || surfaceType === 'tunnel';

      while (attempts < maxAttempts && !success) {
        attempts++;
        console.log(`\n=== ${key} (Attempt ${attempts}, Seed: ${currentSeed}) ===`);
        const workflow = buildWorkflow(prompts, currentSeed, isGrayscale);

        progress[key] = { status: 'queued' };
        saveProgress();

        try {
          const promptId = await queuePrompt(workflow);
          console.log(`  Queued: ${promptId}`);
          progress[key].status = 'processing';
          progress[key].promptId = promptId;
          saveProgress();

          const result = await pollHistory(promptId);
          process.stdout.write('\n');

          const saveNode = result.outputs['8'];
          if (!saveNode?.images?.length) throw new Error('No images in output node 8');
          const filename = saveNode.images[0].filename;
          console.log(`  Generated: ${filename}`);

          const diffuseFile = `${theme.key}_${surfaceType}_diffuse.png`;
          const diffusePath = path.join(ASSETS_DIR, diffuseFile);
          await downloadImage(filename, diffusePath);
          console.log(`  Saved: ${diffusePath}`);

          if (needsOrientationCheck) {
            console.log(`  Analyzing texture orientation...`);
            const analysis = await analyzeTextureOrientation(diffusePath);
            if (analysis) {
              const diagPercent = (analysis.diagonalPercent * 100).toFixed(1);
              const vertPercent = (analysis.verticalPercent * 100).toFixed(1);
              const horizPercent = (analysis.horizontalPercent * 100).toFixed(1);
              console.log(`  Alignment results: Diagonal: ${diagPercent}%, Vertical-pattern: ${horizPercent}%, Horizontal-pattern: ${vertPercent}%`);
              
              if (analysis.diagonalPercent > 0.35 && attempts < maxAttempts) {
                console.warn(`  [Warning] Texture has too many diagonal patterns (${diagPercent}% > 35%). Retrying with new seed...`);
                // Increment seed and delete temporary file
                currentSeed = (currentSeed + 179 + attempts * 7) % 4294967291;
                try { fs.unlinkSync(diffusePath); } catch (_) {}
                continue;
              } else if (analysis.diagonalPercent > 0.35) {
                console.warn(`  [Warning] Maximum attempts reached. Keeping texture with ${diagPercent}% diagonal patterns.`);
              } else {
                console.log(`  [Success] Clean vertical/horizontal alignment verified!`);
              }
            }
          }

          success = true;

          // Also save in alternative format for all themes (e.g., road_diffuse_cyberpunk.png)
          const altDiffuseFile = `${surfaceType}_diffuse_${theme.key}.png`;
          const altDiffusePath = path.join(ASSETS_DIR, altDiffuseFile);
          fs.copyFileSync(diffusePath, altDiffusePath);
          console.log(`  Saved Alt: ${altDiffusePath}`);

          // For cyberpunk legacy compatibility
          if (theme.key === 'cyberpunk' && (surfaceType === 'road' || surfaceType === 'obstacle')) {
            const legacyFile = `${surfaceType}_diffuse.png`;
            fs.copyFileSync(diffusePath, path.join(ASSETS_DIR, legacyFile));
            console.log(`  Saved Legacy: ${path.join(ASSETS_DIR, legacyFile)}`);
          }

          const pbr = runPBRMaps(diffusePath, ASSETS_DIR, theme.key);
          console.log(`  PBR maps: ${pbr ? 'OK' : 'FAILED'}`);

          // Also copy PBR maps to alternative format
          const mapTypes = ['normal', 'roughness', 'metalness', 'emissive'];
          for (const mapType of mapTypes) {
            const srcPbr = path.join(ASSETS_DIR, `${theme.key}_${surfaceType}_${mapType}.png`);
            if (fs.existsSync(srcPbr)) {
              const dstPbr = path.join(ASSETS_DIR, `${surfaceType}_${mapType}_${theme.key}.png`);
              fs.copyFileSync(srcPbr, dstPbr);
              console.log(`  Copied PBR Alt: ${dstPbr}`);
              
              if (theme.key === 'cyberpunk' && (surfaceType === 'road' || surfaceType === 'obstacle')) {
                const legacyPbr = path.join(ASSETS_DIR, `${surfaceType}_${mapType}.png`);
                fs.copyFileSync(srcPbr, legacyPbr);
                console.log(`  Copied PBR Legacy: ${legacyPbr}`);
              }
            }
          }

          progress[key] = { status: 'completed', diffuse: diffusePath };
          saveProgress();
          console.log(`  [Done] ${key}`);
          generated++;

          if (isSingle) {
            console.log('\nSingle mode: exiting after first generation.');
            process.exit(0);
          }

        } catch (err) {
          process.stdout.write('\n');
          console.error(`  [Error] ${key}: ${err.message}`);
          progress[key].status = 'failed';
          progress[key].error = err.message;
          saveProgress();
          success = true;
        }
      }
    }
  }

  console.log(`\nDone. Generated ${generated} new textures.`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
