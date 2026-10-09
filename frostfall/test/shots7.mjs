// WebGL screenshots (swiftshader) of Standard and High for the lighting comparison.
import { createServer } from 'vite';
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' }); await server.listen();
const url = server.resolvedUrls.local[0];
const args = ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args }).catch(() => pw.chromium.launch({ args }));
const errors = [];
for (const gfx of ['std', 'high']) for (const [name, q, fn] of [
  ['night', 'scene=game&map=forest&spawn=west&seed=424242', () => { const S = window.__ff.S; S.flags.introDone = true; S.time = 22 * 60; }],
  ['crypt', 'scene=game&map=crypt&spawn=entry&seed=424242', () => { window.__ff.S.flags.introDone = true; }],
  ['village', 'scene=game&map=village&spawn=start&seed=424242', () => { const S = window.__ff.S; S.flags.introDone = true; S.time = 20.6 * 60; }],
]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url + '?' + q + '&gfx=' + gfx); await page.waitForFunction(() => window.__ff && window.__ff.game.isBooted, null, { timeout: 20000 });
  await page.evaluate(fn); await page.waitForTimeout(1800);
  await page.locator('canvas').screenshot({ path: new URL(`./out/s7_${gfx}_${name}.png`, import.meta.url).pathname });
  console.log(gfx, name, await page.evaluate(() => [window.__ff.game.renderer.type, window.__ff.game.canvas.width]));
  await page.close();
}
console.log(errors.length ? errors.join('\n') : 'no errors');
await browser.close(); await server.close();
