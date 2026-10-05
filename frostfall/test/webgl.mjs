// Smoke test with the default (WebGL) renderer.
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { createServer } from 'vite';
const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
for (const [name, q] of [['village', 'scene=game'], ['forest', 'scene=game&map=forest&spawn=west'], ['crypt', 'scene=game&map=crypt&spawn=entry']]) {
  await page.goto(url + '?' + q);
  await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => ({ type: window.__ff.game.renderer.type, gl: !!window.__ff.game.renderer.gl, w: window.__ff.game.canvas.width, h: window.__ff.game.canvas.height, cssW: window.__ff.game.canvas.clientWidth, cssH: window.__ff.game.canvas.clientHeight }));
  console.log(name, JSON.stringify(info));
  await page.locator('canvas').screenshot({ path: new URL(`./out/gl_${name}.png`, import.meta.url).pathname });
}
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no errors');
await browser.close(); await server.close();
process.exit(errors.length ? 1 : 0);
