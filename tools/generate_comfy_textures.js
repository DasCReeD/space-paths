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

const COMFY_URL = 'http://127.0.0.1:8188';
const PYTHON_PATH = 'D:\\AI\\ComfyUI (1)\\standalone-env\\python.exe';
const WORKSPACE_DIR = 'c:\\dev\\Sky roads';
const ASSETS_DIR = path.join(WORKSPACE_DIR, 'assets', 'custom');
const PROGRESS_FILE = path.join(WORKSPACE_DIR, 'tools', 'generation_progress.json');
const CHECKPOINT = 'v1-5-pruned-emaonly-fp16.safetensors';

const STYLE_SUFFIX = 'seamless tileable game texture, WipEout sci-fi racing, flat abstract pattern, top-down view, no perspective, fills frame edge to edge';

const NEGATIVE = [
  'text, watermark, signature, logo, letters',
  'human, person, face, hands, character',
  'perspective, horizon, vanishing point, depth of field',
  '3D render, photorealistic, scene, environment, sky, background',
  'seams, tile borders, visible edges',
  'blurry, noisy, jpeg artifacts, low quality',
  'single object, isolated item, centered hero',
].join(', ');

// 14 themes — road (center surface), road_edge (WipEout colored trim strip),
// obstacle (hazard-marked wall face), tunnel (interior wall).
// SD1.5 prompts: single positive string, concise keywords.
const THEMES = [
  {
    key: 'core',
    road:      { positive: 'green circuit board PCB traces pattern, solder pads, dark substrate, neon green lines, sci-fi electronic surface' },
    road_edge: { positive: 'solid neon green flat panel, uniform lime green color, matte material' },
    obstacle:  { positive: 'black and green hazard chevrons, warning stripes, sci-fi warning panel, green LEDs' },
    tunnel:    { positive: 'dark server rack wall, green LED grid indicators, vented metal panels, sci-fi data center' },
  },
  {
    key: 'cyberpunk',
    road:      { positive: 'neon pink and cyan grid lines on black surface, flat abstract repeating pattern, holographic hex grid' },
    road_edge: { positive: 'solid hot pink neon flat panel, uniform magenta color, glossy material' },
    obstacle:  { positive: 'neon pink hazard chevrons on dark panel, cyberpunk warning stripes, chrome border' },
    tunnel:    { positive: 'cyberpunk interior wall, pink and cyan neon strip lights, dark concrete, urban grunge' },
  },
  {
    key: 'industrial',
    road:      { positive: 'steel diamond plate tread pattern, dark iron floor, industrial metal texture, repeating lozenge shapes' },
    road_edge: { positive: 'solid orange safety panel, flat industrial color, uniform orange material' },
    obstacle:  { positive: 'yellow and black hazard chevrons, industrial warning stripes, caution markings, safety barrier' },
    tunnel:    { positive: 'riveted corrugated steel wall, industrial interior, metal panels, bolt grid pattern' },
  },
  {
    key: 'organic',
    road:      { positive: 'bioluminescent hexagonal cell pattern, dark organic surface, green glowing veins, alien biology texture' },
    road_edge: { positive: 'solid bioluminescent lime green panel, organic cell pattern, flat green material' },
    obstacle:  { positive: 'biomechanical warning pattern, organic green glow hazard markings, alien bio texture' },
    tunnel:    { positive: 'alien organic tunnel wall, bioluminescent nodes, dark wet membrane, ribbed bio-tissue panels' },
  },
  {
    key: 'alien',
    road:      { positive: 'purple crystal lattice pattern, alien mineral surface, geometric gem facets, iridescent polygon tiles' },
    road_edge: { positive: 'solid violet purple panel, alien crystal material, flat iridescent surface' },
    obstacle:  { positive: 'purple crystal hazard pattern, alien warning glyphs, iridescent danger markings' },
    tunnel:    { positive: 'alien crystal cavern wall, purple and gold gem clusters, carved alien stone, bioluminescent formations' },
  },
  {
    key: 'furnace',
    road:      { positive: 'black volcanic basalt with glowing orange lava cracks, magma fissure network, volcanic rock surface' },
    road_edge: { positive: 'solid deep orange lava panel, volcanic rock material, flat orange color' },
    obstacle:  { positive: 'orange hazard chevrons on dark basalt panel, volcanic warning stripes, lava glow border' },
    tunnel:    { positive: 'volcanic cave wall, glowing orange heat vents, scorched dark rock, foundry interior' },
  },
  {
    key: 'glitch',
    road:      { positive: 'digital glitch art texture, magenta and cyan pixel noise, horizontal scan lines, data corruption pattern' },
    road_edge: { positive: 'solid magenta glitch panel, digital pixel art, flat corrupted material' },
    obstacle:  { positive: 'glitch artifact warning pattern, corrupted pixel hazard markings, magenta and cyan blocks' },
    tunnel:    { positive: 'corrupted matrix tunnel wall, cascading error pixels, magenta cyan data columns, scanline distortion' },
  },
  {
    key: 'pulse',
    road:      { positive: 'electric blue concentric rings pattern, pulse wave circles, energy ripple on black surface, abstract' },
    road_edge: { positive: 'solid electric blue panel, flat neon blue material, energy pulse color' },
    obstacle:  { positive: 'blue energy wave hazard chevrons, electric pulse warning pattern, dark panel with blue markings' },
    tunnel:    { positive: 'blue energy waveform corridor walls, frequency bands repeating pattern, electric blue light bars' },
  },
  {
    key: 'ridge',
    road:      { positive: 'grey granite rock surface, stone ridge texture, cracked bedrock pattern, rugged mountain terrain' },
    road_edge: { positive: 'solid grey stone panel, flat rock material, granite color' },
    obstacle:  { positive: 'grey stone hazard markings, rocky warning pattern, granite obstacle panel' },
    tunnel:    { positive: 'stone cave wall texture, rocky interior, rough granite surface, cavern rock panels' },
  },
  {
    key: 'shallows',
    road:      { positive: 'shallow turquoise water surface, ripple pattern, aqua blue water texture, underwater caustics' },
    road_edge: { positive: 'solid turquoise teal panel, flat water blue material, aquatic color' },
    obstacle:  { positive: 'turquoise water hazard pattern, aquatic warning markings, coral danger indicators' },
    tunnel:    { positive: 'underwater cave wall, turquoise coral texture, aquatic interior, sea life formations' },
  },
  {
    key: 'spire',
    road:      { positive: 'white polished marble with gold veins, clean geometric pattern, pristine sci-fi floor tile, elegant surface' },
    road_edge: { positive: 'solid gold metallic panel, brushed gold material, warm yellow metal color' },
    obstacle:  { positive: 'white and gold hazard chevrons, clean warning panel, pristine clinical markings' },
    tunnel:    { positive: 'white marble corridor wall, gold trim accents, clean futuristic interior, pristine panels' },
  },
  {
    key: 'thrill',
    road:      { positive: 'dark asphalt racing track surface, yellow center line markings, orange speed chevrons, rubber skid marks' },
    road_edge: { positive: 'solid orange and black diagonal speed stripe panel, racing material, flat bold pattern' },
    obstacle:  { positive: 'racing barrier with black and yellow hazard chevrons, high-speed warning markings, carbon fiber' },
    tunnel:    { positive: 'speedway tunnel wall, orange light bars, carbon fiber panels, racing speed stripe accents' },
  },
  {
    key: 'tundra',
    road:      { positive: 'cracked glacier ice surface, blue-white frost crystal pattern, frozen tundra ground, ice fracture network' },
    road_edge: { positive: 'solid pale ice blue panel, frost crystal material, translucent frozen color' },
    obstacle:  { positive: 'ice shard warning pattern, frosted hazard markings, pale blue frozen obstacle panel' },
    tunnel:    { positive: 'ice cavern wall, frost crystal formations, frozen interior, pale blue ice panels, stalactites' },
  },
  {
    key: 'void',
    road:      { positive: 'dark space floor with neon cyan and violet grid lines, digital void pattern, dark carbon fiber, sci-fi' },
    road_edge: { positive: 'solid deep violet purple panel, dark neon material, digital void color' },
    obstacle:  { positive: 'neon cyan grid lines on near-black panel, void energy hazard pattern, dark space warning' },
    tunnel:    { positive: 'dark space corridor walls, neon cyan and violet line panels, minimal void aesthetic, grid geometry' },
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

function buildWorkflow(prompts, seed) {
  const positive = `${prompts.positive}, ${STYLE_SUFFIX}`;

  return {
    // Checkpoint — outputs MODEL[0], CLIP[1], VAE[2]
    "1": { "class_type": "CheckpointLoaderSimple", "inputs": { "ckpt_name": CHECKPOINT } },
    // SeamlessTile: patches all Conv2d layers to circular padding.
    // "Make a copy" — safe for SD1.5 (~2GB), avoids double-patching the cached model on
    // subsequent runs which crashes ComfyUI when "Modify in place" is used.
    "2": {
      "class_type": "SeamlessTile",
      "inputs": { "model": ["1", 0], "tiling": "enable", "copy_model": "Make a copy" }
    },
    // Standard CLIP text encoding for SD1.5
    "3": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": positive } },
    "4": { "class_type": "CLIPTextEncode", "inputs": { "clip": ["1", 1], "text": NEGATIVE } },
    // 512x512 — SD1.5 native resolution, avoids VRAM pressure from larger sizes
    "5": { "class_type": "EmptyLatentImage", "inputs": { "width": 512, "height": 512, "batch_size": 1 } },
    // euler + normal at CFG 7 is reliable for SD1.5 texture generation
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
    // CircularVAEDecode: circular padding in VAE decoder — fully convolutional, full effect.
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

// ── Main ────────────────────────────────────────────────────────────────────

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const args = process.argv.slice(2);
const isSingle = args.includes('--single');
const isReset = args.includes('--reset');
const filterTheme = args.find(a => a !== '--single' && a !== '--reset' && !a.startsWith('-')) ||
  args[args.indexOf('--theme') + 1];

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

      console.log(`\n=== ${key} ===`);

      const seed = hashSeed(key);
      const workflow = buildWorkflow(prompts, seed);

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
        if (!saveNode?.images?.length) throw new Error('No images in output node 9');
        const filename = saveNode.images[0].filename;
        console.log(`  Generated: ${filename}`);

        const diffuseFile = `${theme.key}_${surfaceType}_diffuse.png`;
        const diffusePath = path.join(ASSETS_DIR, diffuseFile);
        await downloadImage(filename, diffusePath);
        console.log(`  Saved: ${diffusePath}`);

        const pbr = runPBRMaps(diffusePath, ASSETS_DIR, theme.key);
        console.log(`  PBR maps: ${pbr ? 'OK' : 'FAILED'}`);

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
        // Continue with next rather than aborting entire run
      }
    }
  }

  console.log(`\nDone. Generated ${generated} new textures.`);
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
