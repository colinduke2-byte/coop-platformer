import { createServer } from 'vite';
const pw = await import('playwright').catch(() => import('/opt/node-tools/node_modules/playwright/index.mjs'));
const server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { port: 0 }, logLevel: 'error' }); await server.listen();
const url = server.resolvedUrls.local[0];
const args = ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const browser = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args }).catch(() => pw.chromium.launch({ args }));
for (const [hd, n] of [[0, 300], [1, 300], [0, 1500], [1, 1500]]) {
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.goto(url + `spike/perf.html?hd=${hd}&n=${n}`); await page.waitForFunction(() => window.__ready, null, { timeout: 15000 });
  await page.waitForTimeout(3500);
  console.log(hd ? '640x360 HD' : '320x180 1x', n, 'sprites: fps (software GL)', Math.round(await page.evaluate(() => window.__fps())));
  await page.close();
}
await browser.close(); await server.close();
