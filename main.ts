// Platinum Engine — GTA 6 Trophy Guide & Tracker (gta6-trophy-guide-01).
//
// This program hands the guide in. It runs on Node 22 with the standard library
// only: it copies app/ and screenshots/ from beside this file to the output
// directory and writes /output/dossier.json with the vendored make.fun library.
// vendor/makefun-frontend.ts is the kit's copy and must stay unchanged: the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Before copying anything, this entrypoint validates the guide it hands in:
// the trophy file must hold all 55 official trophies with a cited guide each,
// in the official grade split (1 platinum, 2 gold, 6 silver, 46 bronze),
// with 28 hidden and 1 missable flag, in the roadmap split 12/30/8/5,
// and screenshots/ must hold 3 or 4 images inside the gate's size cap.
// A failed check throws before any output is written, so a broken guide
// can never be handed in by accident.
//
// Serve the guide locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The official list, as PlayStation publishes it: 55 trophies, 1 platinum,
// 2 gold, 6 silver and 46 bronze, 28 of them hidden, 1 flagged missable
// (Positive Mental Attitude, the Chapter 1 meditation), in the roadmap
// split 12 story / 30 side and activities / 8 collectibles / 5 cleanup.
const EXPECTED_TROPHIES = 55;
const EXPECTED_GRADES: Record<string, number> = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const EXPECTED_HIDDEN = 28;
const EXPECTED_MISSABLE = 1;
const EXPECTED_STAGES: Record<number, number> = { 1: 12, 2: 30, 3: 8, 4: 5 };
const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;

interface TrophyEntry {
  name: string;
  description: string;
  grade: string;
  guide: string;
  hidden: boolean;
  missable: boolean;
  sources?: Array<{ name: string; url: string }>;
}

function fail(message: string): never {
  throw new Error('Platinum Engine validation failed: ' + message);
}

// Check the trophy data file: count, grades, guides, citations, flags.
function validateTrophies(here: string): TrophyEntry[] {
  const dataPath = join(here, 'app', 'data', 'trophies.json');
  if (!existsSync(dataPath)) fail('app/data/trophies.json is missing');
  const doc = JSON.parse(readFileSync(dataPath, 'utf8')) as { trophies: TrophyEntry[] };
  const list = doc.trophies;
  if (!Array.isArray(list)) fail('app/data/trophies.json holds no trophies array');
  if (list.length !== EXPECTED_TROPHIES) fail('expected ' + EXPECTED_TROPHIES + ' trophies, found ' + list.length);

  const grades: Record<string, number> = {};
  const stages: Record<number, number> = {};
  let hidden = 0;
  let missable = 0;
  const names = new Set<string>();
  for (const t of list) {
    if (typeof t.name !== 'string' || !t.name.trim()) fail('a trophy has no name');
    if (names.has(t.name)) fail('duplicate trophy name: ' + t.name);
    names.add(t.name);
    if (typeof t.description !== 'string' || !t.description.trim()) fail(t.name + ': no official description');
    grades[t.grade] = (grades[t.grade] ?? 0) + 1;
    if (typeof t.guide !== 'string' || !t.guide.trim()) fail(t.name + ': guide is blank');
    if (t.guide.indexOf('Sources:') === -1) fail(t.name + ': guide cites no source');
    for (const label of ['What to do:', 'Where & how:', 'Missable?', 'Roadmap:']) {
      if (t.guide.indexOf(label) === -1) fail(t.name + ': guide is missing its ' + label + ' section');
    }
    if (!Array.isArray(t.sources) || t.sources.length !== 4) fail(t.name + ': expected 4 numbered sources [S1]-[S4]');
    if (typeof t.estimatedTime !== 'string' || !t.estimatedTime.trim()) fail(t.name + ': no time estimate');
    if (t.roadmapStage !== 1 && t.roadmapStage !== 2 && t.roadmapStage !== 3 && t.roadmapStage !== 4) {
      fail(t.name + ': roadmapStage is not 1-4');
    }
    stages[t.roadmapStage] = (stages[t.roadmapStage] ?? 0) + 1;
    if (t.hidden) hidden += 1;
    if (t.missable) missable += 1;
  }
  for (const [grade, count] of Object.entries(EXPECTED_GRADES)) {
    if (grades[grade] !== count) fail('expected ' + count + ' ' + grade + ' trophies, found ' + (grades[grade] ?? 0));
  }
  for (const [stage, count] of Object.entries(EXPECTED_STAGES)) {
    if (stages[Number(stage)] !== count) fail('expected ' + count + ' trophies in stage ' + stage + ', found ' + (stages[Number(stage)] ?? 0));
  }
  if (hidden !== EXPECTED_HIDDEN) fail('expected ' + EXPECTED_HIDDEN + ' hidden trophies, found ' + hidden);
  if (missable !== EXPECTED_MISSABLE) fail('expected ' + EXPECTED_MISSABLE + ' missable trophies, found ' + missable);
  return list;
}

// Check the screenshots: 3 or 4 images, each inside the 256 KiB cap.
function validateScreenshots(here: string): string[] {
  const dir = join(here, 'screenshots');
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const files = readdirSync(dir)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
  if (files.length < 3 || files.length > MAX_SCREENSHOTS) {
    fail('expected 3 or 4 screenshots, found ' + files.length);
  }
  for (const f of files) {
    const size = statSync(join(dir, f)).size;
    if (size > MAX_SCREENSHOT_BYTES) fail('screenshot ' + f + ' is ' + size + ' bytes, over the 256 KiB cap');
  }
  return files;
}

// Check the app shell: index.html exists and no app source reaches for the network.
function validateAppFiles(here: string): void {
  const indexPath = join(here, 'app', 'index.html');
  if (!existsSync(indexPath)) fail('app/index.html is missing');
  if (statSync(indexPath).size > 1048576) fail('app/index.html is over the 1 MiB cap');
  const sources = ['index.html', join('styles', 'main.css'), join('js', 'state.js'), join('js', 'filters.js'), join('js', 'roadmap.js'), join('js', 'app.js')];
  for (const rel of sources) {
    const text = readFileSync(join(here, 'app', rel), 'utf8');
    if (text.indexOf('https://') !== -1 || text.indexOf('http://') !== -1) {
      fail('app/' + rel + ' names a network URL; the guide must be offline');
    }
    if (/\beval\s*\(/.test(text) || /new Function\s*\(/.test(text)) {
      fail('app/' + rel + ' uses eval or new Function');
    }
  }
}

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const trophies = validateTrophies(here);
const shots = validateScreenshots(here);
validateAppFiles(here);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const cited = trophies.filter((t) => t.guide.indexOf('Sources:') !== -1).length;
const missableCount = trophies.filter((t) => t.missable).length;
console.log(
  'Platinum Engine: ' + trophies.length + ' trophies, ' + cited + ' cited guides, ' +
  missableCount + ' missable, ' +
  shots.length + ' screenshots (' + shots.join(', ') + '), dossier ' + dossier.length + ' bytes',
);
