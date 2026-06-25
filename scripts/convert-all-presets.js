import puppeteer from 'puppeteer';
import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONVERTER_PATH = 'C:/dev/BrainBlur/node_modules/milkdrop-preset-converter-aws/dist/milkdrop-preset-converter-aws.min.js';
const RAW_DIR = path.resolve(__dirname, '../scratch/presets-repo/Waveform');
const PUBLIC_PRESETS_DIR = path.resolve(__dirname, '../public/visualizer-presets');
const PRESETS_JS_PATH = path.resolve(__dirname, '../visualizer/presets.js');

async function walk(dir) {
  const files = [];
  const list = await readdir(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const s = await stat(fullPath);
    if (s.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (file.endsWith('.milk')) {
      files.push(fullPath);
    }
  }
  return files;
}

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
}

async function main() {
  console.log('Scanning Waveform presets repository...');
  let allFiles;
  try {
    allFiles = await walk(RAW_DIR);
  } catch (err) {
    console.error(`Error walking Waveform directory at ${RAW_DIR}:`, err.message);
    process.exit(1);
  }
  console.log("Found " + allFiles.length + " .milk files in total.");

  // Filter out files containing custom pixel shaders
  const nonShaderFiles = [];
  for (const file of allFiles) {
    const text = await readFile(file, 'utf-8');
    const hasShader = text.includes('`') || text.includes('shader_body') || text.includes('warp_1') || text.includes('comp_1');
    if (!hasShader) {
      nonShaderFiles.push({ file, text });
    }
  }
  console.log(`Filtered out ${allFiles.length - nonShaderFiles.length} presets with custom shaders.`);
  console.log(`Proceeding to convert ${nonShaderFiles.length} compatible presets...`);

  // Ensure public directory exists
  await mkdir(PUBLIC_PRESETS_DIR, { recursive: true });

  const converterSrc = await readFile(CONVERTER_PATH, 'utf-8');

  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: converterSrc });
  console.log('Converter library successfully injected.');

  const metadataList = [];
  let successCount = 0;
  let failCount = 0;

  const start = Date.now();
  for (let i = 0; i < nonShaderFiles.length; i++) {
    const { file, text } = nonShaderFiles[i];
    const relPath = path.relative(RAW_DIR, file);
    const category = path.dirname(relPath);
    const basename = path.basename(relPath, '.milk');
    
    const displayName = `${category}: ${basename}`;
    const filename = sanitizeFilename(`${category} - ${basename}`);

    try {
      const presetObject = await page.evaluate(async (txt) => {
        const { convertPreset } = window.milkdropPresetConverterAWS;
        return convertPreset(txt, '');
      }, text);

      if (presetObject && presetObject.error) {
        failCount++;
        console.warn(`[FAIL] ${displayName} (error during conversion: ${presetObject.error})`);
      } else if (presetObject) {
        successCount++;
        const targetPath = path.join(PUBLIC_PRESETS_DIR, `${filename}.json`);
        await writeFile(targetPath, JSON.stringify(presetObject, null, 2), 'utf-8');
        metadataList.push({ name: displayName, file: filename });
      } else {
        failCount++;
        console.warn(`[FAIL] ${displayName} (returned null/empty)`);
      }
    } catch (err) {
      failCount++;
      console.warn(`[FAIL] ${displayName} (exception: ${err.message})`);
    }

    if ((i + 1) % 20 === 0 || i === nonShaderFiles.length - 1) {
      console.log(`Processed ${i + 1}/${nonShaderFiles.length} presets... (Success: ${successCount}, Fail: ${failCount})`);
    }
  }

  await browser.close();
  const duration = Date.now() - start;
  console.log(`\nConversion completed in ${duration}ms.`);
  console.log(`Converted: ${successCount}, Failed: ${failCount}`);

  // Write presets metadata JS file
  const presetsJsContent = `/**
 * presets.js — List of all pre-converted Butterchurn presets, loaded dynamically on demand.
 * 
 * Generated dynamically by scripts/convert-all-presets.js
 */

export const presets = ${JSON.stringify(metadataList, null, 2)};

export default presets;
`;

  await writeFile(PRESETS_JS_PATH, presetsJsContent, 'utf-8');
  console.log(`Wrote visualizer registry with ${metadataList.length} presets to ${PRESETS_JS_PATH}`);
}

main().catch((err) => {
  console.error('Fatal error during preset conversion:', err);
  process.exit(1);
});
