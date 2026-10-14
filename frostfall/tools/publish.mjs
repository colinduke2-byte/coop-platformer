// Publishes Frostfall: builds once, then writes
//   <out>/index.html            the single-file game WITH the manifest link (GitHub Pages)
//   <out>/sw.js                 the offline worker, build id + extra precache list stamped in
//   <out>/manifest.webmanifest  + icon-192.png, icon-512.png, apple-touch-icon.png, .nojekyll
//   frostfall/frostfall.html    the same game WITHOUT the manifest link (the claude.ai artifact)
// Usage:  npm run publish [-- --out <dir>] [-- --push]
//   --out <dir>   Pages checkout to write into (default /home/user/frostfall)
//   --push        then commit "Publish <build>" in that checkout and push origin main
//   --no-build    reuse the current dist/ (it must have been built with the same FROSTFALL_BUILD)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { singleFileHtml } from './single-file.mjs';
import { stampServiceWorker } from './sw-stamp.mjs';
import { writeIcons, ICONS } from './icons.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PAGES_REMOTE = 'https://github.com/colinduke2-byte/FrostFall.git';
const TRAILER = 'Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_012wRrd6fzsquLaYooPzVoAN';

export function manifest() {
  return {
    name: 'Frostfall',
    short_name: 'Frostfall',
    description: 'A top-down 8-bit action RPG of the frozen north.',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    orientation: 'landscape',
    background_color: '#0b0e1a',
    theme_color: '#0b0e1a',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

const kb = (f) => (fs.statSync(f).size / 1024).toFixed(0).padStart(6) + ' KB';
const git = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();

export async function publish({ out = '/home/user/frostfall', artifact = path.join(ROOT, 'frostfall.html'), build: doBuild = true, log = console.log } = {}) {
  const { buildId } = await import('../vite.config.js');
  const build = buildId();
  process.env.FROSTFALL_BUILD = build;                    // the bundle's __BUILD__, the page meta and the worker cache all agree
  if (doBuild) {
    const { build: viteBuild } = await import('vite');
    await viteBuild({ root: ROOT, logLevel: 'error' });
  }
  fs.mkdirSync(out, { recursive: true });
  const written = [];
  const write = (name, data) => { const f = path.join(out, name); fs.writeFileSync(f, data); written.push(f); };
  write('index.html', singleFileHtml({ manifest: true, build }));
  write('manifest.webmanifest', JSON.stringify(manifest(), null, 2) + '\n');
  written.push(...writeIcons(out));
  const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
  write('sw.js', stampServiceWorker(sw, build, ['manifest.webmanifest', ...ICONS.map(([n]) => n)]));
  if (!fs.existsSync(path.join(out, '.nojekyll'))) write('.nojekyll', '');
  fs.writeFileSync(artifact, singleFileHtml({ manifest: false, build }));
  log(`Frostfall build ${build}`);
  log(`Pages (${out}):`);
  for (const f of written) log(`  ${kb(f)}  ${f}`);
  log(`Artifact (no manifest link):\n  ${kb(artifact)}  ${artifact}`);
  return { build, out, artifact, files: written };
}

export function push(out, build, log = console.log) {
  if (!fs.existsSync(path.join(out, '.git'))) throw new Error(`${out} is not a git checkout`);
  if (git(out, 'remote', 'get-url', 'origin') !== PAGES_REMOTE) { git(out, 'remote', 'set-url', 'origin', PAGES_REMOTE); log(`origin -> ${PAGES_REMOTE}`); }
  git(out, 'add', '--', 'index.html', 'sw.js', 'manifest.webmanifest', '.nojekyll', ...ICONS.map(([n]) => n));
  if (!git(out, 'status', '--porcelain')) { log('nothing changed, nothing to push'); return; }
  execFileSync('git', ['commit', '-q', '-m', `Publish ${build}\n\n${TRAILER}`], { cwd: out, stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', 'HEAD:main'], { cwd: out, stdio: 'inherit' });
  log(`pushed ${build} to ${PAGES_REMOTE} main`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--out');
  const out = path.resolve(i >= 0 ? args[i + 1] : '/home/user/frostfall');
  const r = await publish({ out, build: !args.includes('--no-build') });
  if (args.includes('--push')) push(out, r.build);
  else console.log(`(not pushed; add --push to commit and push ${out})`);
}
