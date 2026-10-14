import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { stampServiceWorker } from './tools/sw-stamp.mjs';

// Build id shown in the game and baked into the service worker cache name: <git short hash>-<yyyymmdd>, e.g. "682c97b-20261014".
// FROSTFALL_BUILD overrides it (tools/publish.mjs sets it so the page, the worker and the log all agree); 'dev' outside git.
export function buildId() {
  if (process.env.FROSTFALL_BUILD) return process.env.FROSTFALL_BUILD;
  try {
    const hash = execSync('git rev-parse --short HEAD', { cwd: fileURLToPath(new URL('.', import.meta.url)), stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const d = new Date();
    const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    return hash ? `${hash}-${day}` : 'dev';
  } catch (e) {
    return 'dev';
  }
}

// dist/sw.js is copied from public/ with placeholders: stamp the build id (cache name) and precache the hashed bundle files.
function stampWorker(build) {
  let files = [];
  return {
    name: 'frostfall-stamp-sw',
    apply: 'build',
    writeBundle(options, bundle) { files = Object.keys(bundle).filter((f) => f !== 'index.html'); },
    closeBundle() {
      const outDir = this.environment?.config?.build?.outDir;
      const f = outDir && path.resolve(this.environment.config.root, outDir, 'sw.js');
      if (f && fs.existsSync(f)) {
        const src = fs.readFileSync(f, 'utf8');
        if (src.includes("'__BUILD__'")) fs.writeFileSync(f, stampServiceWorker(src, build, files));
      }
    },
  };
}

const BUILD = buildId();

export default defineConfig({
  base: './',
  plugins: [stampWorker(BUILD)],
  server: { host: true, port: 5173 },
  define: { __BUILD__: JSON.stringify(BUILD) },
  resolve: {
    // The game only uses Arcade physics: the arcade-only Phaser build drops Matter.js (about 110 KB smaller).
    // Exact match only, so 'phaser/src/...' style imports would still reach the real package.
    alias: [{ find: /^phaser$/, replacement: 'phaser/dist/phaser-arcade-physics.min.js' }],
  },
  build: { chunkSizeWarningLimit: 2200 },
});
