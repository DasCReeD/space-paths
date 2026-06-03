import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Playtest Script Execution', () => {
  it('should run run_playtest.js successfully and generate all 12 screenshots', { timeout: 120000 }, () => {
    const playtestScript = path.resolve(__dirname, '../playtests/run_playtest.js');
    console.log(`Executing playtest script: ${playtestScript}`);
    
    // Execute the playtest script using node
    execSync(`node "${playtestScript}"`, { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    
    // Verify that the 12 screenshots exist in c:\dev\Sky roads\playtests\
    const playtestsDir = path.resolve(__dirname, '../playtests');
    const expectedScreenshots = [
      'menu_main.png', 'menu_main_mobile.png',
      'menu_settings.png', 'menu_settings_mobile.png',
      'menu_garage.png', 'menu_garage_mobile.png',
      'menu_levels.png', 'menu_levels_mobile.png',
      'gameplay_active.png', 'gameplay_active_mobile.png',
      'touch_customizer.png', 'touch_customizer_mobile.png'
    ];
    
    for (const screenshot of expectedScreenshots) {
      const p = path.join(playtestsDir, screenshot);
      const exists = fs.existsSync(p);
      console.log(`Checking screenshot ${screenshot}: ${exists ? 'EXISTS' : 'MISSING'}`);
      expect(exists).toBe(true);
      expect(fs.statSync(p).size).toBeGreaterThan(0);
    }
  });
});
