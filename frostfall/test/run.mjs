// Runs every test file in a parallel worker pool.
//   npm test                        everything
//   npm run test:fast               skips the long bots and soak tests (LONG below)
//   node test/run.mjs --jobs=4 --only=stage1,unit/ --timeout=10 --no-retry --list
// Options:
//   --jobs=N        files run at once (default max(2, cores / 2))
//   --only=a,b      only files whose name contains one of these substrings
//   --skip=a,b      leave out files whose name contains one of these substrings
//   --fast          leave out LONG
//   --long          only LONG (npm run test:long)
//   --timeout=MIN   per-file timeout in minutes (default 15; LONG files get TIMEOUT_LONG)
//   --no-retry      a failed file is not run a second time
//   --list          print the files that would run and exit
// Every browser test shares one Vite server started here (FF_URL), so N files do not each compile the game.
// A file that fails is run once more at the end; if it then passes it is reported as FLAKY (exit code stays 0).
// EXCLUSIVE files (timing budgets) run alone after everything else.
import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';

// Test files are discovered, not listed (CH20): every test/stage*.mjs, every test/unit/*.mjs, and any other test/*.mjs whose
// first lines carry the mark `@suite`. A new test is a new file; nothing here needs editing.
const here0 = new URL('.', import.meta.url).pathname;
const isSuite = (f) => { try { return fs.readFileSync(here0 + f, 'utf8').slice(0, 300).includes('@suite'); } catch { return false; } };
const byNum = (a, b) => a.localeCompare(b, 'en', { numeric: true });
const TESTS = [
  ...fs.readdirSync(here0 + 'unit').filter((f) => f.endsWith('.mjs')).sort(byNum).map((f) => 'unit/' + f.slice(0, -4)),
  ...fs.readdirSync(here0).filter((f) => /^stage\d.*\.mjs$/.test(f)).sort(byNum).map((f) => f.slice(0, -4)),
  ...fs.readdirSync(here0).filter((f) => f.endsWith('.mjs') && !f.startsWith('stage') && isSuite(f)).sort(byNum).map((f) => f.slice(0, -4)),
];
// Long bots / soak runs: skipped by --fast (npm run test:fast), run in their own CI job.
// (measured: campaign_bot ~15 min, stage79_dialogue fuzz ~3.5 min, monkey_arena ~2.5 min; everything else is under 1.5 min)
const LONG = ['campaign_bot', 'stage79_dialogue', 'monkey_arena'];
// Timing budgets: measured with nothing else running.
const EXCLUSIVE = ['perf'];
const TIMEOUT_LONG = 45;            // minutes

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);
const jobs = Math.max(1, Number(args.jobs) || Math.max(2, Math.floor(os.cpus().length / 2)));
const timeoutMin = Number(args.timeout) || 15;
const only = list(args.only), skip = list(args.skip);
let files = TESTS.filter((t) => (!only.length || only.some((s) => t.includes(s))) && !skip.some((s) => t.includes(s)) && !(args.fast && LONG.includes(t)) && !(args.long && !LONG.includes(t)));
if (args.list) { console.log(files.join('\n')); process.exit(0); }
if (!files.length) { console.log('no test files match'); process.exit(1); }

const here = here0;
const timingsFile = here + 'out/timings.json';
let timings = {};
try { timings = JSON.parse(fs.readFileSync(timingsFile, 'utf8')); } catch { /* first run */ }
// longest first (from the last run), so a slow file does not start last and hold up the end of the run
const order = (a, b) => (timings[b] ?? (LONG.includes(b) ? 1e6 : 0)) - (timings[a] ?? (LONG.includes(a) ? 1e6 : 0));
const queue = files.filter((t) => !EXCLUSIVE.includes(t)).sort(order);
const exclusive = files.filter((t) => EXCLUSIVE.includes(t));

// one dev server for everybody: pre-bundle dependencies once, then warm the module graph
const needsBrowser = files.some((t) => !t.startsWith('unit/'));
let server = null;
const env = { ...process.env };
if (needsBrowser && !process.env.FF_URL) {
  const { createServer } = await import('vite');
  server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0, warmup: { clientFiles: ['./src/main.js'] } }, logLevel: 'error' });
  await server.listen();
  env.FF_URL = server.resolvedUrls.local[0];
  // load the page once so the dependency optimizer and the transform cache are ready before N browsers ask at once
  const t0 = Date.now();
  await import('./harness.mjs').then(async ({ launchBrowser }) => {
    const b = await launchBrowser();
    const p = await b.newPage();
    await p.goto(env.FF_URL + '?renderer=canvas', { timeout: 180000 });
    await p.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 120000 }).catch(() => {});
    await b.close();
  });
  console.log(`dev server ${env.FF_URL} warmed in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
console.log(`${files.length} files, ${jobs} at a time` + (exclusive.length ? `, then ${exclusive.join(', ')} alone` : ''));

function runFile(t) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const limit = (LONG.includes(t) ? Math.max(TIMEOUT_LONG, timeoutMin) : timeoutMin) * 60000;
    const child = spawn(process.execPath, [here + t + '.mjs'], { env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const out = [];
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => out.push(d));
    let timedOut = false;
    const killAll = () => { try { process.kill(-child.pid, 'SIGKILL'); } catch { try { child.kill('SIGKILL'); } catch { /* gone */ } } };
    const timer = setTimeout(() => { timedOut = true; killAll(); }, limit);
    child.on('close', (code) => {
      clearTimeout(timer);
      killAll();                      // stray browsers left behind by a crashed file
      const secs = (Date.now() - t0) / 1000;
      let text = Buffer.concat(out).toString();
      if (timedOut) text += `\n  TIMEOUT after ${limit / 60000} min\n`;
      resolve({ t, ok: code === 0 && !timedOut, secs, text, timedOut });
    });
  });
}

const results = new Map();          // name -> { ok, secs, flaky }
let running = 0, done = 0;
const total = files.length;
function report(r, attempt) {
  const tag = r.ok ? (attempt > 1 ? 'PASS (2nd try)' : 'PASS') : (r.timedOut ? 'TIMEOUT' : 'FAIL') + (attempt > 1 ? ' (2nd try)' : '');
  if (attempt === 1) done++;
  console.log(`\n=== ${r.t} - ${tag} in ${r.secs.toFixed(1)}s` + (attempt === 1 ? ` [${done}/${total}]` : '') + ' ===');
  process.stdout.write(r.text.endsWith('\n') ? r.text : r.text + '\n');
}
async function pool(names, width, attempt) {
  const q = [...names];
  const failed = [];
  await new Promise((resolveAll) => {
    const next = () => {
      if (!q.length && !running) return resolveAll();
      while (running < width && q.length) {
        const t = q.shift(); running++;
        runFile(t).then((r) => {
          running--;
          report(r, attempt);
          const prev = results.get(t);
          results.set(t, { ok: r.ok, secs: prev ? prev.secs : r.secs, flaky: attempt > 1 && r.ok });
          if (!r.ok) failed.push(t);
          next();
        });
      }
    };
    next();
  });
  return failed;
}

const wall = Date.now();
let failed = await pool(queue, jobs, 1);
failed.push(...(await pool(exclusive, 1, 1)));
if (failed.length && !args['no-retry']) {
  console.log(`\nretrying ${failed.length} failed file(s) one at a time: ${failed.join(', ')}`);
  for (const t of failed) await pool([t], 1, 2);
}
if (server) await server.close();

// remember durations for next time's scheduling
try {
  for (const [t, r] of results) timings[t] = Math.round(r.secs);
  fs.mkdirSync(here + 'out', { recursive: true });
  fs.writeFileSync(timingsFile, JSON.stringify(timings, null, 1));
} catch { /* read-only checkout */ }

const slow = [...results].sort((a, b) => b[1].secs - a[1].secs).slice(0, 10);
console.log('\nslowest files:');
for (const [t, r] of slow) console.log(`  ${r.secs.toFixed(1).padStart(7)}s  ${t}`);
const flaky = [...results].filter(([, r]) => r.flaky).map(([t]) => t);
const bad = [...results].filter(([, r]) => !r.ok).map(([t]) => t);
const mins = ((Date.now() - wall) / 60000).toFixed(1);
if (flaky.length) console.log(`\nFLAKY (failed once, passed on retry): ${flaky.join(', ')}`);
if (bad.length) console.log(`\n${bad.length} test file(s) FAILED: ${bad.join(', ')}`);
console.log(bad.length ? `\nFAILED after ${mins} min` : `\nALL STAGE TESTS PASSED (${results.size} files in ${mins} min, ${jobs} jobs)`);
process.exit(bad.length ? 1 : 0);
