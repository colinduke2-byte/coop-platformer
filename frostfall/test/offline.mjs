// Offline mode: build the game, serve it, visit once so the service worker caches it, go offline, reload: the game must still start.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import { check, failCount } from './harness.mjs';
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const root = new URL('..', import.meta.url).pathname, out = '/tmp/frostfall-offline-dist';
fs.rmSync(out, { recursive: true, force: true });
await build({ root, logLevel: 'error', build: { outDir: out, emptyOutDir: true, chunkSizeWarningLimit: 4000 } });
check('the build ships the service worker', fs.existsSync(path.join(out, 'sw.js')));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const f = path.join(out, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(() => pw.chromium.launch({ args: ['--no-sandbox'] }));
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url + '?renderer=canvas');
await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 20000 });
await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r?.active && !!navigator.serviceWorker.controller; }, null, { timeout: 15000 }).catch(() => {});
await page.reload(); await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 20000 });
await page.waitForTimeout(1500);                       // let the worker store everything the game loaded
const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
check('the service worker is running and controls the page', controlled);
await ctx.setOffline(true);
await page.reload();
const booted = await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 20000 }).then(() => true).catch(() => false);
check('with no connection the game still starts from the cache', booted);
check('no page errors while offline', errs.length === 0, errs.join('\n'));
await browser.close(); server.close();
console.log(failCount() ? 'OFFLINE FAILED' : 'OFFLINE PASSED');
process.exit(failCount() ? 1 : 0);
