import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const COMFY_URL = "http://127.0.0.1:8000";
const COMFY_OUTPUT_DIR = "D:\\AI\\ComfyUI_windows_portable\\ComfyUI\\output";
const PYTHON_PATH = "D:\\AI\\ComfyUI_windows_portable\\python_embeded\\python.exe";
const WORKSPACE_DIR = "c:\\dev\\Sky roads";
const ASSETS_DIR = path.join(WORKSPACE_DIR, "assets", "custom");
const PROGRESS_FILE = path.join(WORKSPACE_DIR, "tools", "generation_progress.json");

const STYLE_SUFFIX = ", flat color, hand-painted 2D game asset, clean lines, vibrant palette, vector game texture, no shadows, no perspective, top-down flat lay, tiling, seamless";
const NEGATIVE_PROMPT = "blurry, edges, seams, border, text, watermark, perspective, 3d, realistic, shadow, photographic, noise, grainy";

const biomes = [
  {
    key: "void",
    road: "retro-future digital space grid, neon cyan and violet geometric lines on a dark purple-black carbon fiber plate",
    obstacle: "glowing futuristic energy cube, retro neon grid lines, voxel tech panel",
    tunnel: "minimalist glowing digital vector blocks, neon line panels"
  },
  {
    key: "ridge",
    road: "stylized blue cobblestone tiles, sapphire mineral rock textures, glowing azure crystal veins",
    obstacle: "glowing sapphire crystal cluster, blue stone monolith, faceted mineral block",
    tunnel: "sci-fi cavern wall texture with embedded bright blue crystals"
  },
  {
    key: "thrill",
    road: "dark charcoal metal highway plates, yellow and neon orange chevron hazard arrows",
    obstacle: "industrial barrier block, yellow-black hazard stripes, high contrast metal frame",
    tunnel: "futuristic speedway tunnel panels, orange light bars on dark carbon fiber"
  },
  {
    key: "core",
    road: "green computer circuit board, glowing neon green circuit traces, microchip copper contacts",
    obstacle: "heavily detailed microchip processor, tech nodes, green server hardware block",
    tunnel: "high-tech mainframe rack server plating, glowing server grid lines"
  },
  {
    key: "glitch",
    road: "cyberpunk digital glitch static, horizontal magenta laser strips, glowing cyan pixel noise grid",
    obstacle: "fragmented hologram cube, purple laser light block, glitched data panel",
    tunnel: "corrupted matrix terminal texture, magenta and cyan pixelated data streams"
  },
  {
    key: "tundra",
    road: "cracked blue glacier ice sheet, frosty white snow crystals, glowing pale cyan ice fractures",
    obstacle: "large crystalline ice pillar block, frosted ice chunk, glacier monolith",
    tunnel: "frozen ice cavern walls, translucent frosty crystal panels"
  },
  {
    key: "furnace",
    road: "cooling black volcanic basalt rock, glowing bright orange magma fissures, yellow lava veins",
    obstacle: "molten lava rock chunk, glowing volcanic obsidian block, magma vent",
    tunnel: "molten steel foundry plates, dark hot iron walls with glowing orange heat vents"
  },
  {
    key: "shallows",
    road: "mystical nebula cloud texture, deep space navy blue background, glowing pink and violet stardust nebulae",
    obstacle: "cosmic meteor rock, glowing pink stardust crystal block",
    tunnel: "interstellar warp tunnel walls, swirling pink and navy blue space dust clouds"
  },
  {
    key: "spire",
    road: "clean white porcelain futuristic floor tiles, glowing gold and cyan energy circuit lines",
    obstacle: "high-tech ivory laboratory pedestal, sleek gold trim panels, white composite block",
    tunnel: "sleek white corporate sci-fi research facility wall paneling, cyan indicator lights"
  },
  {
    key: "pulse",
    road: "acoustic equalizer paneling, matte black metal grid, glowing electric blue soundwave rings",
    obstacle: "futuristic speaker audio block, glowing blue sub-woofer panel",
    tunnel: "kinetic music visualizer tunnel casing, dark panels with glowing blue wave bars"
  }
];

// Ensure output custom assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Load progress if exists
let progress = {};
if (fs.existsSync(PROGRESS_FILE)) {
  try {
    progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
  } catch (e) {
    console.error("Error parsing progress file, starting fresh", e);
  }
}

function saveProgress() {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

// Construct API Workflow JSON
function buildWorkflow(positivePrompt, seed) {
  return {
    "1": {
      "class_type": "KSampler",
      "inputs": {
        "seed": seed,
        "steps": 25,
        "cfg": 7.5,
        "sampler_name": "euler",
        "scheduler": "normal",
        "denoise": 1.0,
        "model": ["4", 0],
        "positive": ["2", 0],
        "negative": ["3", 0],
        "latent_image": ["5", 0]
      }
    },
    "2": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": positivePrompt + STYLE_SUFFIX,
        "clip": ["10", 1]
      }
    },
    "3": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "text": NEGATIVE_PROMPT,
        "clip": ["10", 1]
      }
    },
    "4": {
      "class_type": "SeamlessTile",
      "inputs": {
        "model": ["10", 0],
        "tiling": "enable",
        "copy_model": "Make a copy"
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "width": 1024,
        "height": 1024,
        "batch_size": 1
      }
    },
    "6": {
      "class_type": "MakeCircularVAE",
      "inputs": {
        "vae": ["10", 2],
        "tiling": "enable",
        "copy_vae": "Make a copy"
      }
    },
    "7": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["1", 0],
        "vae": ["6", 0]
      }
    },
    "8": {
      "class_type": "SaveImage",
      "inputs": {
        "images": ["7", 0],
        "filename_prefix": "skyroads_texture"
      }
    },
    "10": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": "juggernautXL_juggXIByRundiffusion.safetensors"
      }
    }
  };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Queue prompt and return prompt_id
async function queuePrompt(workflow) {
  const response = await fetch(`${COMFY_URL}/api/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow })
  });
  if (!response.ok) {
    throw new Error(`ComfyUI queue failed: ${response.statusText}`);
  }
  const res = await response.json();
  return res.prompt_id;
}

// Poll history for prompt completion
async function pollHistory(promptId) {
  console.log(`Polling history for prompt ${promptId}...`);
  while (true) {
    const response = await fetch(`${COMFY_URL}/api/history/${promptId}`);
    if (response.ok) {
      const history = await response.json();
      if (history && history[promptId]) {
        return history[promptId];
      }
    }
    await sleep(2000);
  }
}

// Main execution loop
async function run() {
  const isSingleTest = process.argv.includes('--single');
  console.log(`Starting texture generation pipeline... Single test mode: ${isSingleTest}`);
  
  for (const biome of biomes) {
    const biomeKey = biome.key;
    
    // We generate: road, obstacle, tunnel
    const types = ["road", "obstacle", "tunnel"];
    
    for (const type of types) {
      const progressKey = `${biomeKey}_${type}`;
      
      if (progress[progressKey] && progress[progressKey].status === "completed") {
        console.log(`[Skipping] ${progressKey} already completed.`);
        continue;
      }
      
      console.log(`\n=== Generating: ${biomeKey} (${type}) ===`);
      const promptText = biome[type];
      console.log(`Prompt: "${promptText}"`);
      
      const seed = Math.floor(Math.random() * 1000000000);
      const workflow = buildWorkflow(promptText, seed);
      
      try {
        progress[progressKey] = { status: "queued", timestamp: new Date().toISOString() };
        saveProgress();
        
        const promptId = await queuePrompt(workflow);
        console.log(`Prompt queued successfully. Prompt ID: ${promptId}`);
        progress[progressKey].promptId = promptId;
        progress[progressKey].status = "processing";
        saveProgress();
        
        const historyData = await pollHistory(promptId);
        
        // Find output image details
        const saveImageNode = historyData.outputs["8"];
        if (!saveImageNode || !saveImageNode.images || saveImageNode.images.length === 0) {
          throw new Error("No image output found in history.");
        }
        
        const generatedImageName = saveImageNode.images[0].filename;
        console.log(`Generated image: ${generatedImageName}`);
        
        // Copy file to workspace
        const sourcePath = path.join(COMFY_OUTPUT_DIR, generatedImageName);
        const destFileName = `${biomeKey}_${type}_diffuse.png`;
        const destPath = path.join(ASSETS_DIR, destFileName);
        
        if (!fs.existsSync(sourcePath)) {
          throw new Error(`Generated image file not found at ${sourcePath}`);
        }
        
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied diffuse texture to: ${destPath}`);
        
        // Generate normal map using python script
        console.log(`Generating normal map...`);
        const normalFileName = `${biomeKey}_${type}_normal.png`;
        const normalPath = path.join(ASSETS_DIR, normalFileName);
        
        const pythonCommand = `"${PYTHON_PATH}" tools/generate_normal_map.py "${destPath}" "${normalPath}" 2.5`;
        execSync(pythonCommand, { cwd: WORKSPACE_DIR });
        
        progress[progressKey].status = "completed";
        progress[progressKey].diffuse = destPath;
        progress[progressKey].normal = normalPath;
        progress[progressKey].finishedAt = new Date().toISOString();
        saveProgress();
        console.log(`[Success] Finished ${progressKey}!`);
        
        if (isSingleTest) {
          console.log("Single test run completed. Exiting.");
          process.exit(0);
        }
        
      } catch (err) {
        console.error(`[Error] Failed to generate ${progressKey}:`, err);
        progress[progressKey].status = "failed";
        progress[progressKey].error = err.message;
        saveProgress();
        process.exit(1);
      }
    }
  }
  
  console.log("\nAll biomes processed successfully!");
}

run().catch(err => {
  console.error("Fatal error in run loop:", err);
  process.exit(1);
});
