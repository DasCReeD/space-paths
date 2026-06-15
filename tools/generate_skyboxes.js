/**
 * Theme-matched skybox generator using ComfyUI + SD 1.5 + Real-ESRGAN.
 *
 * Pipeline per theme:
 *   SD 1.5 KSampler (512×512) → VAEDecode → Real-ESRGAN 4× → 2048×2048 PNG
 *
 * Sky images do NOT tile so we skip SeamlessTile / CircularVAEDecode.
 * Real-ESRGAN is run inside ComfyUI via UpscaleModelLoader so detail is
 * hallucinated by AI, not just interpolated.
 *
 * Usage:
 *   node tools/generate_skyboxes.js              # all themes, skip completed
 *   node tools/generate_skyboxes.js --theme void  # single theme
 *   node tools/generate_skyboxes.js --reset       # clear progress and restart
 */

import fs from 'fs';
import path from 'path';

const COMFY_URL = 'http://127.0.0.1:8188';
const WORKSPACE_DIR = 'c:\\dev\\Sky roads';
const SKYBOX_DIR = path.join(WORKSPACE_DIR, 'assets', 'custom', 'skybox');
const PROGRESS_FILE = path.join(WORKSPACE_DIR, 'tools', 'skybox_progress.json');
const CHECKPOINT = 'v1-5-pruned-emaonly-fp16.safetensors';

// Preference list — first model found in ComfyUI wins (clear/sharp models before anime ones)
const UPSCALE_MODEL_PREFERENCES = [
  '4x-UltraSharp.pt',
  '4x-ClearRealityV1.pth',
  'RealESRGAN_x4plus.pt',
  '4x_NMKD-Superscale-SP_178000_G.pt',
  'ESRGAN_4x.pth',
  'Remacri_4x.pth',
  '4x_foolhardy_Remacri.pth',
  'RealESRGAN_x4plus_anime_6B.pth',
  'lollypop.pth',
];

// Shared negative — no roads/characters/text, keep purely atmospheric
const NEGATIVE = [
  'text, watermark, signature, logo, letters, numbers',
  'human, person, face, hands, character, figure',
  'road, track, car, vehicle, spaceship, ground, floor',
  'blurry, noisy, jpeg artifacts, low quality, pixelated',
  'flat, boring, plain, empty, white background',
].join(', ');

// 14 themes: 10 generated biomes + 4 classic
const THEMES = [
  // ── Generated biomes ─────────────────────────────────────────────────────
  {
    key: 'void',
    positive: 'deep space void panorama, swirling purple cyan energy nebula tendrils, dark matter clouds, glowing neon violet wisps, cosmic abyss, dramatic dark galaxy skybox, volumetric light rays, space art',
  },
  {
    key: 'ridge',
    positive: 'dramatic blue mountain ridge sunrise panorama, misty alpine peaks silhouette, sweeping mountain vista, soft blue atmospheric haze, cool glacier sky, nature landscape skybox, majestic peaks',
  },
  {
    key: 'thrill',
    positive: 'neon racing city dusk panorama, urban skyline silhouette, dramatic orange magenta sunset, neon billboard glow, city lights reflecting in clouds, race circuit atmosphere, high speed sky',
  },
  {
    key: 'core',
    positive: 'green circuit board cosmos skybox, emerald data stream clouds, matrix digital rain sky, glowing neon green network nodes on black, sci-fi tech void panorama, binary code atmosphere',
  },
  {
    key: 'glitch',
    positive: 'glitch art digital sky panorama, magenta cyan pixel corruption, chromatic aberration digital distortion, vaporwave glitch atmosphere, data corruption noise skybox, RGB shift error sky',
  },
  {
    key: 'tundra',
    positive: 'arctic aurora borealis panorama, vivid emerald green northern lights dancing, polar night starry sky, tundra ice plains horizon, shimmering aurora curtains, icy blue cold atmosphere skybox',
  },
  {
    key: 'furnace',
    positive: 'volcanic eruption sky panorama, glowing orange lava glow clouds, hellscape dramatic horizon, pyroclastic ash clouds, fire and ember atmosphere, inferno sky, dramatic volcanic skybox, scorched heavens',
  },
  {
    key: 'shallows',
    positive: 'deep space aqua nebula panorama, bioluminescent cosmic sea of stars, turquoise cyan teal nebula clouds, deep azure blue space vista, underwater light caustics in space, glowing teal galaxy skybox',
  },
  {
    key: 'spire',
    positive: 'ethereal white marble sky temple panorama, golden divine god rays, misty mountain peaks in clouds, heavenly light shafts, pure white and gold atmospheric sky, spiritual transcendent skybox, divine luminance',
  },
  {
    key: 'pulse',
    positive: 'electric plasma storm sky panorama, vivid blue lightning bolts, kinetic energy vortex clouds, electric plasma discharge atmosphere, blue energy storm skybox, tesla coil sky, electric arc horizon',
  },
  // ── Classic themes ────────────────────────────────────────────────────────
  {
    key: 'cyberpunk',
    positive: 'cyberpunk neon city night sky panorama, rain-soaked neon pink magenta reflections, hazy neon glow above cityscape, blade runner atmosphere, blue and magenta neon haze skybox, dark sci-fi night',
  },
  {
    key: 'industrial',
    positive: 'industrial factory sky panorama, steel grey overcast sky, dramatic smokestack silhouettes, industrial twilight glow, grey orange atmospheric haze, heavy machinery skybox, moody industrial atmosphere',
  },
  {
    key: 'alien',
    positive: 'alien planet sky panorama, purple violet alien atmosphere, twin moons on horizon, alien nebula clouds, bioluminescent alien flora silhouettes, exotic extraterrestrial skybox, strange planet vista',
  },
  {
    key: 'organic',
    positive: 'warm organic forest sky panorama, ancient redwood canopy silhouette, warm amber golden hour light, mystical forest atmosphere, god rays through ancient trees, warm earthy nature skybox, twilight forest sky',
  },
];

// ── ComfyUI helpers ───────────────────────────────────────────────────────────

function hashSeed(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h % 4294967291;
}

async function getUpscaleModel() {
  try {
    const res = await fetch(`${COMFY_URL}/object_info/UpscaleModelLoader`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info = await res.json();
    // ComfyUI format: model_name is ["COMBO", { options: [...model names...] }]
    const modelNameDef = info?.UpscaleModelLoader?.input?.required?.model_name;
    const available = modelNameDef?.[1]?.options ?? [];
    for (const pref of UPSCALE_MODEL_PREFERENCES) {
      if (available.includes(pref)) return pref;
    }
    if (available.length > 0) {
      console.warn(`  No preferred upscale model found — using first available: ${available[0]}`);
      return available[0];
    }
  } catch (e) {
    console.warn(`  Could not query ComfyUI upscale models: ${e.message}`);
  }
  return null;
}

function buildWorkflow(positive, seed, upscaleModel) {
  const nodes = {
    "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": CHECKPOINT } },
    "3": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": positive } },
    "4": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": NEGATIVE } },
    // 512×512 — SD1.5 native; Real-ESRGAN will 4× to 2048×2048
    "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
    "6": {
      "class_type": "KSampler",
      "inputs": {
        "model": ["1", 0],
        "positive": ["3", 0],
        "negative": ["4", 0],
        "latent_image": ["5", 0],
        "seed": seed,
        "steps": 30,
        "cfg": 8.5,
        "sampler_name": "dpm_2_ancestral",
        "scheduler": "karras",
        "denoise": 1.0
      }
    },
    "7": { "class_type": "VAEDecode", "inputs": { "samples": ["6", 0], "vae": ["1", 2] } },
  };

  if (upscaleModel) {
    // Real-ESRGAN 4× upscale inside ComfyUI — AI detail hallucination, not interpolation
    nodes["9"] = { "class_type": "UpscaleModelLoader", "inputs": { "model_name": upscaleModel } };
    nodes["10"] = { "class_type": "ImageUpscaleWithModel", "inputs": { "upscale_model": ["9", 0], "image": ["7", 0] } };
    nodes["8"] = { "class_type": "SaveImage", "inputs": { "images": ["10", 0], "filename_prefix": "skybox" } };
  } else {
    // Fallback: save at 512×512 without upscaling (warn user)
    nodes["8"] = { "class_type": "SaveImage", "inputs": { "images": ["7", 0], "filename_prefix": "skybox" } };
  }

  return nodes;
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

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); }
  catch { return {}; }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function generateTheme(theme, upscaleModel) {
  const destPath = path.join(SKYBOX_DIR, `${theme.key}_sky.png`);
  const seed = hashSeed(`skybox_${theme.key}`);

  const sizeLabel = upscaleModel ? '512→2048 (4× Real-ESRGAN)' : '512×512 (no upscaler found)';
  console.log(`\n[${theme.key}] Generating sky — ${sizeLabel} — seed ${seed}...`);

  const workflow = buildWorkflow(theme.positive, seed, upscaleModel);
  const promptId = await queuePrompt(workflow);
  console.log(`  Prompt ID: ${promptId}`);

  const result = await pollHistory(promptId);
  process.stdout.write('\n');

  const outputs = result.outputs;
  const nodeKey = Object.keys(outputs).find(k => outputs[k].images?.length > 0);
  if (!nodeKey) throw new Error('No image output found in ComfyUI response');

  const imgInfo = outputs[nodeKey].images[0];
  await downloadImage(imgInfo.filename, destPath);
  console.log(`  ✓ Saved ${destPath}`);
  return destPath;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const resetMode = args.includes('--reset');
const singleTheme = args.includes('--theme') ? args[args.indexOf('--theme') + 1] : null;

if (!fs.existsSync(SKYBOX_DIR)) {
  fs.mkdirSync(SKYBOX_DIR, { recursive: true });
  console.log(`Created ${SKYBOX_DIR}`);
}

if (resetMode) {
  if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
  console.log('Progress reset.\n');
}

const progress = loadProgress();
const targets = singleTheme
  ? THEMES.filter(t => t.key === singleTheme)
  : THEMES;

if (singleTheme && targets.length === 0) {
  console.error(`Unknown theme key: ${singleTheme}`);
  console.error(`Valid keys: ${THEMES.map(t => t.key).join(', ')}`);
  process.exit(1);
}

console.log('Sky Roads Skybox Generator (ComfyUI + Real-ESRGAN)');
console.log('Checking available upscale models...');
const upscaleModel = await getUpscaleModel();
if (upscaleModel) {
  console.log(`  Using upscaler: ${upscaleModel}`);
} else {
  console.warn('  WARNING: No Real-ESRGAN model found in ComfyUI — images will be 512×512 only.');
  console.warn('  Install an upscale model at ComfyUI/models/upscale_models/ and retry.');
}

console.log(`\nGenerating ${targets.length} theme skybox(es) → ${SKYBOX_DIR}\n`);

let generated = 0;
let skipped = 0;

for (const theme of targets) {
  const destPath = path.join(SKYBOX_DIR, `${theme.key}_sky.png`);
  if (!resetMode && (progress[theme.key] === 'done' || fs.existsSync(destPath))) {
    console.log(`[${theme.key}] Already exists — skipping.`);
    skipped++;
    continue;
  }

  try {
    progress[theme.key] = 'generating';
    saveProgress(progress);

    await generateTheme(theme, upscaleModel);

    progress[theme.key] = 'done';
    saveProgress(progress);
    generated++;
  } catch (err) {
    console.error(`\n[${theme.key}] FAILED: ${err.message}`);
    progress[theme.key] = 'error';
    saveProgress(progress);
  }
}

console.log(`\nDone — generated ${generated}, skipped ${skipped}.`);
