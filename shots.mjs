// Platinum Engine — take the four entry screenshots with Playwright.
// Serves app/ with serve.ts, opens each view from shots.json at 1280x800,
// and saves JPEGs to screenshots/. Run from the repository root:
//   node shots.mjs
// Playwright is resolved from the local npx cache when it is not installed
// in this repository, so the entry itself stays dependency-free.
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const MAX_BYTES = 262144;

function resolvePlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    // Fall back to the npx cache: ~/.npm/_npx/<hash>/node_modules/playwright
    const home = process.env.HOME || '';
    const npxDir = join(home, '.npm', '_npx');
    if (existsSync(npxDir)) {
      for (const hash of readdirSync(npxDir)) {
        const candidate = join(npxDir, hash, 'node_modules', 'playwright');
        if (existsSync(join(candidate, 'package.json'))) {
          try {
            return require(candidate);
          } catch {
            // Try the next cached copy.
          }
        }
      }
    }
    throw new Error('Playwright not found: run npx playwright --version once, or install it');
  }
}

function waitForServer(url, tries = 40) {
  return new Promise((resolve, reject) => {
    const attempt = (left) => {
      fetch(url)
        .then((r) => (r.ok ? resolve() : retry(left)))
        .catch(() => retry(left));
    };
    const retry = (left) => {
      if (left <= 0) return reject(new Error('server did not start at ' + url));
      setTimeout(() => attempt(left - 1), 250);
    };
    attempt(tries);
  });
}

async function takeShot(browser, base, shot) {
  const page = await browser.newPage({ viewport: { width: shot.viewport.width, height: shot.viewport.height } });
  await page.goto(base + shot.path, { waitUntil: 'load' });
  await page.waitForSelector('.trophy-row', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(500);
  const out = join(here, 'screenshots', shot.file);
  let quality = 82;
  for (;;) {
    await page.screenshot({ path: out, type: 'jpeg', quality });
    const size = statSync(out).size;
    console.log(shot.file + ': ' + size + ' bytes at quality ' + quality);
    if (size <= MAX_BYTES || quality <= 30) break;
    quality -= 20;
  }
  await page.close();
  return statSync(out).size;
}

const server = spawn(process.execPath, [join(here, 'serve.ts'), '--port', '8080'], { cwd: here, stdio: 'ignore' });
try {
  await waitForServer('http://localhost:8080/');
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch();
  try {
    for (const shot of shots) {
      await takeShot(browser, 'http://localhost:8080', shot);
    }
  } finally {
    await browser.close();
  }
  const sizes = shots.map((s) => s.file + ' ' + statSync(join(here, 'screenshots', s.file)).size + ' bytes');
  console.log('Screenshots done:\n' + sizes.join('\n'));
} finally {
  server.kill();
}
