// Takes the entry's screenshots with headless Chromium (Playwright): serves
// app/ on http://localhost:8080, opens each scene from shots.json, waits for
// window.__shotReady, and saves a JPEG into screenshots/. Run it as:
//   node serve.ts & node render-shots.mjs; kill %1
// (playwright-core is installed in /tmp/shots; the browser lives in the
// Playwright cache under ~/.cache/ms-playwright.)
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const repo = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
const shots = JSON.parse(readFileSync(join(repo, 'shots.json'), 'utf8'));
const outDir = join(repo, 'screenshots');
mkdirSync(outDir, { recursive: true });

const exe = join(homedir(), '.cache/ms-playwright/chromium-1187/chrome-linux/chrome');
if (!existsSync(exe)) throw new Error(`Chromium not found at ${exe}`);

const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
for (const shot of shots) {
  const page = await browser.newPage({ viewport: { width: shot.w, height: shot.h }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.goto(`http://localhost:8080/${shot.query}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 15000 });
  } catch {
    console.log(`${shot.name}: __shotReady never fired — screenshotting anyway`);
  }
  await page.waitForTimeout(300);
  const file = join(outDir, shot.name);
  await page.screenshot({ path: file, type: 'jpeg', quality: shot.quality ?? 82 });
  console.log(`${shot.name}: ${shot.w}x${shot.h}${errors.length ? ` (page errors: ${errors.join(' | ')})` : ''}`);
  await page.close();
}
await browser.close();
console.log('done');
