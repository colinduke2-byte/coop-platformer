// Published build: run tools/publish.mjs into a fresh temp dir (exactly what goes to GitHub Pages), serve it, play once so the
// service worker caches it, go offline, reload: the game must still start. Also boots the artifact copy from file:// and
// enters the Game scene, so a broken Phaser alias or bundle shows up here.
//   node test/offline.mjs
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { check, failCount } from './harness.mjs';
import { publish } from '../tools/publish.mjs';
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));

const out = fs.mkdtempSync(path.join(os.tmpdir(), 'frostfall-publish-'));
const artifact = path.join(out, '..', path.basename(out) + '-artifact.html');
const pub = await publish({ out, artifact, log: () => {} });
console.log(`published build ${pub.build} to ${out}`);
for (const f of ['index.html', 'sw.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'])
  check(`publish wrote ${f}`, fs.existsSync(path.join(out, f)));
const index = fs.readFileSync(path.join(out, 'index.html'), 'utf8'), art = fs.readFileSync(artifact, 'utf8');
const sw = fs.readFileSync(path.join(out, 'sw.js'), 'utf8');
check('index.html is a full document with the manifest link', index.startsWith('<!doctype html>') && index.includes('<link rel="manifest" href="manifest.webmanifest">'));
check('the artifact copy has no manifest link', art.startsWith('<!doctype html>') && !art.includes('rel="manifest"'));
check('the worker carries the build id', sw.includes(JSON.stringify(pub.build)) && !sw.includes("'__BUILD__'"));
const mf = JSON.parse(fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
check('manifest: fullscreen landscape, navy, 192+512 icons', mf.display === 'fullscreen' && mf.orientation === 'landscape' && mf.background_color === '#0b0e1a' && mf.icons.some((i) => i.sizes === '512x512'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const f = path.join(out, decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/\/$/, '/index.html'));
  if (!f.startsWith(out) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
const url = `http://localhost:${server.address().port}/`;
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(() => pw.chromium.launch({ args: ['--no-sandbox'] }));
const booted = (page) => page.waitForFunction(() => window.__ff && window.__ff.game.isBooted && window.__ff.game.scene.isActive('Title'), null, { timeout: 20000 }).then(() => true).catch(() => false);

// 1. The artifact: one file, no server, no worker.
{
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('file://' + artifact + '?renderer=canvas');
  check('the artifact boots to the title screen from file://', await booted(page));
  await page.evaluate(() => { const g = window.__ff.game; g.scene.stop('Title'); g.scene.start('Game', { map: 'forest', spawn: 'west' }); });
  const inGame = await page.waitForFunction(() => { const g = window.__ff.game; return g.scene.isActive('Game') && !!g.scene.getScene('Game').player; }, null, { timeout: 20000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(1500);
  check('the Game scene starts in the forest (west)', inGame);
  check('no page errors in the artifact', errs.length === 0, errs.join('\n'));
  await page.close();
}

// 2. GitHub Pages copy: online, then offline from the service worker.
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(url + '?renderer=canvas');
check('the Pages copy boots online', await booted(page));
// waitForFunction does not wait on an async predicate's promise, so poll from here until the worker controls the page.
const swReady = () => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!r?.active && !!navigator.serviceWorker.controller; });
for (let t = 0; t < 120 && !(await swReady()); t++) await page.waitForTimeout(250);
check('the service worker is running and controls the page', await page.evaluate(() => !!navigator.serviceWorker.controller));
const cache = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys.find((k) => k.startsWith('frostfall-'))); return { keys, urls: (await c.keys()).map((r) => new URL(r.url).pathname) }; });
check('the cache is named after the build', cache.keys.includes('frostfall-' + pub.build), JSON.stringify(cache.keys));
check('the page, manifest and icons are precached', ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png'].every((u) => cache.urls.includes(u)), JSON.stringify(cache.urls));
await ctx.setOffline(true);
await page.reload();
check('with no connection the game still starts from the cache', await booted(page));
await page.goto(url + '?renderer=canvas&offline=2');          // a different query string still finds the cached page
check('offline, another URL query also starts the game', await booted(page));
check('no page errors on the Pages copy', errs.length === 0, errs.join('\n'));

// 3. A newer publish: the page (network-first) is new at once; the new worker waits until the page says SKIP_WAITING, then it
//    takes over and deletes the old build's cache.
await ctx.setOffline(false);
process.env.FROSTFALL_BUILD = pub.build + '-next';
await publish({ out, artifact, build: false, log: () => {} });
await page.goto(url + '?renderer=canvas');
check('online again, the newer page arrives at once', await page.evaluate(() => document.querySelector('meta[name="frostfall-build"]').content) === pub.build + '-next');
const waiting = () => page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update().catch(() => {}); return r.waiting?.state === 'installed'; });
let w = false; for (let t = 0; t < 80 && !(w = await waiting()); t++) await page.waitForTimeout(250);
check('the new worker waits (installed) while the old one controls the page', w);
const waitingBuild = await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => new Promise((res) => {
  const ch = new MessageChannel(); ch.port1.onmessage = (e) => res(e.data && e.data.build); r.waiting.postMessage({ type: 'GET_BUILD' }, [ch.port2]); setTimeout(() => res(null), 3000);
})));
check('the waiting worker reports its build id (GET_BUILD)', waitingBuild === pub.build + '-next', String(waitingBuild));
await page.evaluate(() => new Promise((res) => { navigator.serviceWorker.addEventListener('controllerchange', res, { once: true }); navigator.serviceWorker.getRegistration().then((r) => r.waiting.postMessage({ type: 'SKIP_WAITING' })); }));
let keys = []; for (let t = 0; t < 40; t++) { keys = await page.evaluate(() => caches.keys()); if (keys.length === 1) break; await page.waitForTimeout(250); }
check('SKIP_WAITING switches workers and only the new cache is left', keys.length === 1 && keys[0] === 'frostfall-' + pub.build + '-next', JSON.stringify(keys));
await browser.close(); server.close();
fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(artifact, { force: true });
console.log(failCount() ? 'OFFLINE FAILED' : 'OFFLINE PASSED');
process.exit(failCount() ? 1 : 0);
