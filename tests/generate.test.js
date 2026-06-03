import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Asset Generation Pipelines', () => {
  it('should run python generators to produce 3D models and theme textures', () => {
    const modelsDir = path.resolve(__dirname, '../assets/models');
    const customDir = path.resolve(__dirname, '../assets/custom');

    // Run generate_models.py
    let modelsSuccess = false;
    const modelCommands = ['python scratch/generate_models.py', 'python3 scratch/generate_models.py', 'py scratch/generate_models.py'];
    for (const cmd of modelCommands) {
      try {
        console.log(`Running model generator: ${cmd}`);
        execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
        modelsSuccess = true;
        break;
      } catch (err) {
        console.warn(`Command failed: ${cmd}`, err.message);
      }
    }
    expect(modelsSuccess).toBe(true);

    // Run generate_comfy_assets.py
    let assetsSuccess = false;
    const assetCommands = ['python scratch/generate_comfy_assets.py', 'python3 scratch/generate_comfy_assets.py', 'py scratch/generate_comfy_assets.py'];
    for (const cmd of assetCommands) {
      try {
        console.log(`Running asset generator: ${cmd}`);
        execSync(cmd, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
        assetsSuccess = true;
        break;
      } catch (err) {
        console.warn(`Command failed: ${cmd}`, err.message);
      }
    }
    expect(assetsSuccess).toBe(true);

    // Verify model files exist
    const expectedModels = [
      'fighter.obj',
      'hauler.obj',
      'scout.obj',
      'dreadnought.obj',
      'cruiser.obj',
      'tunnel_archway.obj'
    ];
    for (const model of expectedModels) {
      const p = path.join(modelsDir, model);
      expect(fs.existsSync(p)).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(0);
    }

    // Verify custom textures exist for each theme
    const themes = ['cyberpunk', 'industrial', 'organic', 'alien'];
    const types = ['road', 'obstacle', 'tunnel'];
    for (const theme of themes) {
      for (const type of types) {
        const diff = path.join(customDir, `${theme}_${type}_diffuse.png`);
        const norm = path.join(customDir, `${theme}_${type}_normal.png`);
        expect(fs.existsSync(diff)).toBe(true);
        expect(fs.existsSync(norm)).toBe(true);
      }
    }

    // Verify decals exist
    const decals = [
      'decal_boost.png',
      'decal_slow.png',
      'decal_explosive.png',
      'decal_refill.png',
      'decal_sticky.png',
      'decal_slippery.png'
    ];
    for (const decal of decals) {
      const p = path.join(customDir, decal);
      expect(fs.existsSync(p)).toBe(true);
    }
  });
});
