/**
 * Splits the 1999 Drift Into Memory synthwave playlist into 12 individual tracks.
 * Uses ffmpeg with stream copy (-acodec copy) so it's instant and lossless.
 *
 * Usage:
 *   node tools/split_soundtrack.js
 *
 * Output: assets/Music/tracks/01_pulse_reconnected.mp3 ... 12_the_human_algorithm.mp3
 */

import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROOT = path.resolve(__dirname, '..');
const MUSIC_DIR = path.join(ROOT, 'assets', 'Music');
const OUT_DIR = path.join(ROOT, 'assets', 'Music', 'tracks');

const TRACKS = [
  { n: '01', name: 'pulse_reconnected',   start: '00:00:00', end: '00:03:27' },
  { n: '02', name: 'wake_sequence',        start: '00:03:27', end: '00:06:46' },
  { n: '03', name: 'lost_frequency',       start: '00:06:46', end: '00:10:14' },
  { n: '04', name: 'echo_of_earth',        start: '00:10:14', end: '00:13:29' },
  { n: '05', name: 'drift_into_memory',    start: '00:13:29', end: '00:17:12' },
  { n: '06', name: 'signal_from_the_past', start: '00:17:12', end: '00:21:01' },
  { n: '07', name: 'cyber_tears',          start: '00:21:01', end: '00:24:35' },
  { n: '08', name: 'reclaim_the_moment',   start: '00:24:35', end: '00:28:35' },
  { n: '09', name: 'cold_starlight',       start: '00:28:35', end: '00:32:22' },
  { n: '10', name: 'archive_chamber',      start: '00:32:22', end: '00:34:34' },
  { n: '11', name: 'the_halcyon_dream',    start: '00:34:34', end: '00:39:14' },
  { n: '12', name: 'the_human_algorithm',  start: '00:39:14', end: '00:42:21' },
];

function mmssToSeconds(ts) {
  const parts = ts.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] * 60 + parts[1];
}

// Find the source MP3 — the filename has complex unicode so we discover it
const allFiles = fs.readdirSync(MUSIC_DIR);
const srcFile  = allFiles.find(f => f.endsWith('.mp3') && !f.startsWith('0'));
if (!srcFile) {
  console.error('ERROR: No source MP3 found in assets/Music/');
  console.error('Files found:', allFiles);
  process.exit(1);
}
const SRC = path.join(MUSIC_DIR, srcFile);
console.log('Source:', srcFile);
console.log('');

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('Created:', OUT_DIR);
}

let successCount = 0;
let skipCount    = 0;

for (const t of TRACKS) {
  const outFile = path.join(OUT_DIR, `${t.n}_${t.name}.mp3`);

  if (fs.existsSync(outFile)) {
    const size = fs.statSync(outFile).size;
    if (size > 10000) {
      console.log(`  SKIP  ${t.n}_${t.name}.mp3  (already exists, ${Math.round(size / 1024)} KB)`);
      skipCount++;
      continue;
    }
  }

  const toFlag  = t.end ? `-to ${t.end}` : '';
  const startSec = mmssToSeconds(t.start);
  const endSec   = t.end ? mmssToSeconds(t.end) : null;
  const durStr   = endSec ? `${Math.round(endSec - startSec)}s` : 'to end';

  // -ss before -i = fast keyframe seek; -acodec copy = lossless, no re-encode
  const cmd = `ffmpeg -y -ss ${t.start} ${toFlag} -i "${SRC}" -acodec copy "${outFile}"`;

  process.stdout.write(`  CUT   ${t.n}_${t.name}.mp3  (${durStr}) ... `);
  try {
    execSync(cmd, { stdio: ['ignore', 'ignore', 'pipe'] });
    const size = fs.statSync(outFile).size;
    console.log(`done  (${Math.round(size / 1024)} KB)`);
    successCount++;
  } catch (err) {
    console.log('FAILED');
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    console.error('       ffmpeg:', stderr.split('\n').slice(-5).join('\n       '));
  }
}

console.log('');
console.log(`Done. ${successCount} cut, ${skipCount} skipped.`);
if (successCount + skipCount === TRACKS.length) {
  console.log(`Tracks ready in: ${OUT_DIR}`);
}
