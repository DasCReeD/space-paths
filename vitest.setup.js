import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.resolve(__dirname, 'assets/models');
const customDir = path.resolve(__dirname, 'assets/custom');

// Helper to write stubs
function writeStubs() {
  fs.mkdirSync(modelsDir, { recursive: true });
  fs.mkdirSync(customDir, { recursive: true });

  const models = ['fighter.obj', 'hauler.obj', 'scout.obj', 'dreadnought.obj', 'cruiser.obj', 'tunnel_archway.obj'];
  for (const m of models) {
    const p = path.join(modelsDir, m);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, `# OBJ placeholder\nv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n`);
    }
  }

  const themes = ['cyberpunk', 'industrial', 'organic', 'alien'];
  const types = ['road', 'obstacle', 'tunnel'];
  const decals = ['boost', 'slow', 'explosive', 'refill', 'sticky', 'slippery'];

  // Base decals
  for (const d of decals) {
    const p = path.join(customDir, `decal_${d}.png`);
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, '');
    }
  }

  for (const theme of themes) {
    for (const type of types) {
      const p1 = path.join(customDir, `${theme}_${type}_diffuse.png`);
      const p2 = path.join(customDir, `${theme}_${type}_normal.png`);
      const p3 = path.join(customDir, `${type}_diffuse_${theme}.png`);
      const p4 = path.join(customDir, `${type}_normal_${theme}.png`);
      if (!fs.existsSync(p1)) fs.writeFileSync(p1, '');
      if (!fs.existsSync(p2)) fs.writeFileSync(p2, '');
      if (!fs.existsSync(p3)) fs.writeFileSync(p3, '');
      if (!fs.existsSync(p4)) fs.writeFileSync(p4, '');
    }
    for (const d of decals) {
      const p = path.join(customDir, `decal_${d}_${theme}.png`);
      if (!fs.existsSync(p)) fs.writeFileSync(p, '');
    }
  }
}

try {
  console.log("Vitest setup starting: Writing stubs...");
  writeStubs();
  
  const fighterObjPath = path.join(modelsDir, 'fighter.obj');
  const alreadyGenerated = fs.existsSync(fighterObjPath) && fs.statSync(fighterObjPath).size > 100;
  
  if (!alreadyGenerated) {
    console.log("Vitest setup: Generating real assets...");
    const modelCommands = ['python scratch/generate_models.py', 'python3 scratch/generate_models.py', 'py scratch/generate_models.py'];
    let modelsDone = false;
    for (const cmd of modelCommands) {
      try {
        execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname) });
        modelsDone = true;
        break;
      } catch (e) {
        // Try next
      }
    }
    
    const assetCommands = ['python scratch/generate_comfy_assets.py', 'python3 scratch/generate_comfy_assets.py', 'py scratch/generate_comfy_assets.py'];
    let assetsDone = false;
    for (const cmd of assetCommands) {
      try {
        execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname) });
        assetsDone = true;
        break;
      } catch (e) {
        // Try next
      }
    }
    
    console.log(`Vitest setup complete. Models generated: ${modelsDone}, Assets generated: ${assetsDone}`);
  } else {
    console.log("Vitest setup: Assets already generated, skipping Python run.");
  }
} catch (err) {
  console.warn("Vitest setup failed to run Python generators:", err.message);
}
