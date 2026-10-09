import { createServer } from 'vite';
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' }); await server.listen();
const url = server.resolvedUrls.local[0];
const args = ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args }).catch(() => pw.chromium.launch({ args }));
for (const r of ['webgl', 'canvas']) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(url + 'spike/density.html?renderer=' + r); await page.waitForFunction(() => window.__ready, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  console.log(r, JSON.stringify(await page.evaluate(() => window.__spike)), errs.join('|'));
  console.log(JSON.stringify(await page.evaluate(() => { const l = window.__layer; return { vis: l.visible, a: l.alpha, culled: l.culledTiles.length, x: l.x, y: l.y, pipeline: l.pipeline && l.pipeline.name, tex: l.tileset[0].image.key, ts: l.tileset[0].tileData && Object.keys(l.tileset[0].tileData).length, wv: [l.scene.cameras.main.worldView.x, l.scene.cameras.main.worldView.y, l.scene.cameras.main.worldView.width, l.scene.cameras.main.worldView.height], sc: [l.scene.cameras.main.scrollX, l.scene.cameras.main.scrollY], cull: [l.cullPaddingX, l.cullPaddingY], skip: l.skipCull, tiles: l.layer.data.length }; }))); await page.screenshot({ path: new URL(`./out/spike_${r}.png`, import.meta.url).pathname });
  await page.close();
}
await browser.close(); await server.close();
