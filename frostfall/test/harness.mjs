// Shared Playwright harness: boots vite, opens the game in headless Chromium.
// Use the project's Playwright when installed (CI), else the sandbox copy.
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const { chromium } = pw;
import { createServer } from 'vite';
import fs from 'node:fs';

export async function launch(opts = {}) {
  const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' });
  await server.listen();
  const url = server.resolvedUrls.local[0];
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }).catch(async () => chromium.launch({ args: ['--no-sandbox'] }));
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + (process.env.STACK ? '\n' + e.stack : '')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  fs.mkdirSync(new URL('./out/', import.meta.url).pathname, { recursive: true });
  const open = async (query = '') => {
    await page.goto(url + '?renderer=canvas&' + query);
    await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 15000 });
  };
  const shot = (name) => page.locator('canvas').screenshot({ path: new URL(`./out/${name}.png`, import.meta.url).pathname });
  const close = async () => { await browser.close(); await server.close(); };
  const sleep = (ms) => page.waitForTimeout(ms);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  return { page, errors, open, shot, close, sleep, ev };
}

let fails = 0;
export function check(name, cond, extra = '') {
  if (cond) console.log('  ok   ' + name);
  else { fails++; console.log('  FAIL ' + name + ' ' + extra); }
}
export const failCount = () => fails;
