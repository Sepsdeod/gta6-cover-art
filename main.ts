// Neon Coast Cover Studio — the entry program for gta6-cover-art-01 (Node 22,
// standard library only). It hands the app in: copies the app's static files and
// the maker's screenshots from beside this file into /output (or the directory
// MAKEFUN_OUTPUT_DIR names outside the grader), then writes /output/dossier.json
// with the vendored make.fun library, the summary the judge reads.
//
// The app itself is plain files under app/: index.html opens in desktop Chrome
// and works with no network request, every file it loads lives under app/, and
// its fonts ship under the SIL Open Font License. Nothing here is installed or
// fetched at run time, so the program is deterministic: two runs write the same
// bytes.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// Outside the grader's sandbox, MAKEFUN_OUTPUT_DIR stands in for /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(repoRoot, name);
  const to = join(outputDir, name);
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

// The gate's own caps (reference/gate.json): text_max_bytes is the only one
// that shapes the dossier's bytes; the rest refuse an entry the scorer would
// refuse anyway — more than 4 screenshots, one over 256 KiB, more than 993
// files in app/ or 48 MiB of app files in all, or a path under app/ over
// 1000 bytes. app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// One line on stdout, so a run's result is visible without opening the output.
console.log(`wrote ${outputDir} (app/ + screenshots/ + dossier.json)`);
