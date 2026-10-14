// Shared Playwright harness: boots vite, opens the game in headless Chromium.
// Use the project's Playwright when installed (CI), else the sandbox copy.
//
// Determinism:
//  - Math.random is replaced by a seeded PRNG (mulberry32) on every page load. The seed is the `seed` query param when
//    present (the same one the game uses for its world), else FF_SEED from the environment, else DEFAULT_SEED.
//    Opt out with launch({ realRandom: true }).
//  - h.frames(n) steps the game exactly n frames of 1/60 s with the real loop paused, so a check does not depend on how
//    fast the machine is. While stepping, performance.now and Date.now (tweens use it) follow the stepped time.
//    h.tap / h.hold press keys for an exact number of frames. h.until(pred, maxFrames) steps frame by frame until a page-side
//    predicate holds. The old wall-clock API (h.sleep) still works and can be mixed with these.
//    launch({ paused: true }) pauses the real loop after every h.open(), so the whole file runs on stepped frames
//    (use h.wait(ms) where it used h.sleep(ms)).
//
// When FF_URL is set (test/run.mjs does this) the tests share one already running Vite server instead of starting their own.
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import fs from 'node:fs';

export const DEFAULT_SEED = 0x5eed;
export const FRAME_MS = 1000 / 60;
const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

export async function launchBrowser(args = ['--no-sandbox']) {
  return chromium.launch({ executablePath: CHROME, args }).catch(() => chromium.launch({ args }));
}

// Start (or reuse) the dev server. Returns { url, close }.
export async function devServer() {
  if (process.env.FF_URL) return { url: process.env.FF_URL, close: async () => {} };
  const { createServer } = await import('vite');
  const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' });
  await server.listen();
  return { url: server.resolvedUrls.local[0], close: () => server.close() };
}

// Runs in the page before any game script (page.addInitScript). Must be self-contained.
function seedRandom(fallback) {
  const q = new URLSearchParams(location.search);
  const raw = q.get('seed');
  let s = fallback;
  if (raw !== null && raw !== '') {
    s = Number(raw);
    if (!Number.isFinite(s)) { s = 0; for (let i = 0; i < raw.length; i++) s = Math.imul(s ^ raw.charCodeAt(i), 2654435761); }
  }
  let a = s >>> 0;
  Math.random = function random() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  window.__ffSeed = s >>> 0;
}

// Page-side frame stepping. Installed as window.__ffStep by an init script.
// One virtual clock drives performance.now, Date.now (Phaser's tweens run on Date.now) and the game loop: it follows real time
// while the game runs, stands still while paused, and moves exactly dt per stepped frame. It never runs backwards.
function installStepper() {
  const realPerf = performance.now.bind(performance);
  const dateBase = Date.now() - realPerf();
  const clock = { off: 0, frozen: null };
  const vnow = () => (clock.frozen !== null ? clock.frozen : realPerf() + clock.off);
  performance.now = vnow;
  Date.now = () => Math.floor(dateBase + vnow());
  // yield to the event loop without setTimeout's 4 ms clamp, so promises / message events / due timers can run between frames
  const ch = new MessageChannel(); const waiting = [];
  ch.port1.onmessage = () => { const r = waiting.shift(); if (r) r(); };
  const yieldNow = () => new Promise((r) => { waiting.push(r); ch.port2.postMessage(0); });
  const S = (window.__ffStep = {
    paused: false,
    clock,
    // The loop's RAF timestamps are real time: make it read the virtual clock instead.
    hook(loop) {
      if (loop.__ffHooked) return;
      loop.__ffHooked = true;
      const orig = loop.step;
      loop.step = function () { return orig.call(this, vnow()); };
      // the RAF callback was bound to the old step: rebind it by cycling the loop
      if (loop.running) { loop.sleep(); loop.wake(); }
    },
    pause() {
      const loop = window.__ff.game.loop; S.hook(loop); loop.sleep();
      if (clock.frozen === null) clock.frozen = vnow();
      S.paused = true;
    },
    resume() {
      const loop = window.__ff.game.loop; S.hook(loop); S.paused = false;
      if (clock.frozen !== null) { clock.off = clock.frozen - realPerf(); clock.frozen = null; }
      loop.wake();
    },
    // Step exactly n frames. stop(): optional predicate checked after every frame; stepping ends early when it returns true.
    async frames(n, dt, stop) {
      const game = window.__ff.game, loop = game.loop;
      const wasPaused = S.paused;
      S.pause();
      let i = 0;
      try {
        for (; i < n; i++) {
          const t = (clock.frozen = Math.max(clock.frozen, loop.lastTime) + dt);
          loop.now = t; loop.rawDelta = dt; loop.delta = dt; loop.time += dt;
          game.step(t, dt);
          loop.lastTime = t; loop.frame++;
          if (stop && stop()) { i++; break; }
          await yieldNow();
        }
      } finally {
        if (!wasPaused) S.resume();
      }
      return i;
    },
  });
}

export async function launch(opts = {}) {
  if (process.env.FF_SEED && !opts.realRandom) console.log(`  (Math.random seed ${process.env.FF_SEED} from FF_SEED unless the page URL has ?seed=)`);
  const srv = await devServer();
  const url = srv.url;
  const browser = await launchBrowser(opts.args || ['--no-sandbox']);
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  if (!opts.realRandom) await page.addInitScript(seedRandom, Number(process.env.FF_SEED ?? opts.seed ?? DEFAULT_SEED));
  await page.addInitScript(installStepper);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (process.env.STACK ? '\n' + e.stack : '')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  fs.mkdirSync(new URL('./out/', import.meta.url).pathname, { recursive: true });
  // Generous timeouts: with several test files running in parallel a cold page load can take a while.
  const open = async (query = '') => {
    await page.goto(url + '?renderer=canvas&' + query, { timeout: 90000 });
    await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 60000 });
    if (opts.paused) await page.evaluate(() => window.__ffStep.pause());
  };
  const shot = (name) => page.locator('canvas').screenshot({ path: new URL(`./out/${name}.png`, import.meta.url).pathname });
  const close = async () => { await browser.close(); await srv.close(); };
  const sleep = (ms) => page.waitForTimeout(ms);
  // Results are sanitised in the page: a test that accidentally returns a Phaser object (e.g. scene.restart() returns the scene plugin)
  // would otherwise make Playwright serialise the whole game graph, which takes minutes.
  const ev = (fn, arg) => page.evaluate(async ([src, a]) => {
    const r = await (0, eval)('(' + src + ')')(a);
    if (r === null || typeof r !== 'object') return r;
    try { return JSON.parse(JSON.stringify(r)); } catch (e) { return null; }
  }, [fn.toString(), arg]);

  // ---- frame-exact API
  // Step exactly n game frames (dt = 1/60 s by default). Resolves to the number of frames stepped.
  const frames = (n = 1, dt = FRAME_MS) => page.evaluate(([n, dt]) => window.__ffStep.frames(n, dt), [n, dt]);
  // Stop / restart the real game loop. While paused nothing moves except through h.frames / h.tap / h.hold / h.until.
  const pause = () => page.evaluate(() => window.__ffStep.pause());
  const resume = () => page.evaluate(() => window.__ffStep.resume());
  const press = (code) => page.evaluate((c) => window.__ff.keys._press(c), code);
  const release = (code) => page.evaluate((c) => window.__ff.keys._release(c), code);
  // Hold a key for exactly `n` frames, release it, then step `after` more frames so the release is seen.
  // Press, stepping and release happen in one page call, so the real loop cannot slip a frame in between.
  const hold = (code, n = 4, after = 2) => page.evaluate(async ([c, n, after, dt]) => {
    const st = window.__ffStep, k = window.__ff.keys, wasPaused = st.paused;
    st.pause();
    try { k._press(c); await st.frames(n, dt); k._release(c); await st.frames(after, dt); } finally { if (!wasPaused) st.resume(); }
  }, [code, n, after, FRAME_MS]);
  const tap = (code, n = 4, after = 2) => hold(code, n, after);
  // Wall-clock milliseconds as game frames: h.wait(500) steps 30 frames. For converting h.sleep in frame-exact tests.
  const wait = (ms) => frames(Math.max(1, Math.round(ms / FRAME_MS)));
  const msFrames = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
  // Step frame by frame (at most maxFrames) until pred (a page-side function, like ev's) returns truthy.
  // Resolves to { ok, frames }.
  const until = (pred, maxFrames = 600, arg) => page.evaluate(async ([src, max, a, dt]) => {
    const f = (0, eval)('(' + src + ')');
    if (f(a)) return { ok: true, frames: 0 };
    let ok = false;
    const n = await window.__ffStep.frames(max, dt, () => (ok = !!f(a)));
    return { ok, frames: n };
  }, [pred.toString(), maxFrames, arg, FRAME_MS]);

  return { page, errors, open, shot, close, sleep, ev, frames, pause, resume, press, release, hold, tap, until, wait, msFrames, url };
}

let fails = 0;
export function check(name, cond, extra = '') {
  if (cond) console.log('  ok   ' + name);
  else { fails++; console.log('  FAIL ' + name + ' ' + extra); }
}
export const failCount = () => fails;
// Many files end without process.exit(failCount() ? 1 : 0), so their failed checks used to exit 0 and never failed the run.
// Whatever a file does at the end, a failed check now makes its exit code non-zero.
process.on('exit', (code) => { if (fails && !code) process.exitCode = 1; });
