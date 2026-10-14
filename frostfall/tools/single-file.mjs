// Bundles the production build into ONE self-contained HTML document (no other files needed): the claude.ai artifact and the
// GitHub Pages index.html are both made by this.
//   npm run build && node tools/single-file.mjs out.html [--manifest] [--build <id>]
//   --manifest   also link manifest.webmanifest + apple-touch-icon.png (only for Pages, where those files sit next to the page;
//                the artifact has no neighbouring files, so it leaves them out)
//   --build id   the build id written into <meta name="frostfall-build"> (default: $FROSTFALL_BUILD, else the vite config's)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { faviconDataUri } from './icons.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const TITLE = 'Frostfall';
const DESC = 'Frostfall: a top-down 8-bit action RPG of the frozen north. Play in the browser with a keyboard, a controller or touch.';
const OG_DESC = 'A top-down 8-bit action RPG of the frozen north: an open world, a moon that changes who hunts, three difficulties, and a winter to break.';

export function singleFileHtml({ manifest = false, build = 'dev', dist = path.join(ROOT, 'dist') } = {}) {
  const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  const m = html.match(/src="\.\/(assets\/[^"]+\.js)"/);
  if (!m) throw new Error('run `npm run build` first');
  let js = fs.readFileSync(path.join(dist, m[1]), 'utf8');
  js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
  const pwa = manifest ? `
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="${esc(DESC)}">
<meta name="theme-color" content="#0b0e1a">
<meta name="color-scheme" content="dark">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="${TITLE}">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta property="og:type" content="website">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${esc(OG_DESC)}">
<meta name="frostfall-build" content="${esc(build)}">
<link rel="icon" type="image/png" href="${faviconDataUri()}">${pwa}
<style>
  :root { --bg:#0b0e1a; --panel:#1c2338; --ink:#eaf2f8; --muted:#7b8fb5; --accent:#f4d460; color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; overflow: hidden; }
  /* a game, not a page: no long-press menus, no text selection, no pull-to-refresh or bounce */
  html, body, #game { touch-action: none; overscroll-behavior: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; }
  #start button[disabled] { opacity: .6; cursor: wait; }
  /* a phone held upright without a controller: ask for landscape (the game turns itself sideways when a controller is used) */
  #rotate { display: none; position: fixed; inset: 0; z-index: 40; align-items: center; justify-content: center; text-align: center; padding: 24px; background: var(--bg); color: var(--ink); letter-spacing: .08em; }
  #rotate b { display: block; font-size: 2.4rem; color: var(--accent); margin-bottom: 12px; }
  @media (orientation: portrait) and (pointer: coarse) { body:not(.pad) #rotate { display: flex; } }
  #game { position: fixed; inset: 0; }
  canvas { image-rendering: pixelated; image-rendering: crisp-edges; display: block; }
  #start { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(11,14,26,.78); z-index: 30; padding-inline: 16px; }
  #start[hidden] { display: none !important; }
  #start .card { max-width: 30rem; text-align: center; display: grid; gap: 14px; }
  #start h1 { margin: 0; font-size: clamp(2rem, 9vw, 3.4rem); letter-spacing: .12em; text-wrap: balance; }
  #start p { margin: 0; color: var(--muted); }
  #start button { justify-self: center; font: inherit; font-weight: 700; letter-spacing: .1em; color: var(--bg); background: var(--accent); border: 0; padding: 12px 26px; cursor: pointer; }
  #start button:focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
  #start small { color: var(--muted); }
</style>
</head>
<body>
<div id="game"></div>
<div id="rotate"><div><b>&#x21bb;</b>TURN YOUR PHONE SIDEWAYS<br><small>OR CONNECT A CONTROLLER</small></div></div>
<div id="start">
  <div class="card">
    <h1>FROSTFALL</h1>
    <p>A top-down 8-bit action RPG of the frozen north.</p>
    <button id="go" type="button" disabled>LOADING...</button>
    <small>WASD move, Space roll, J sword, K bow, L spell, F block, E interact, Esc menu. Touch controls appear on phones.</small>
  </div>
</div>
<script>
  (function () {
    var s = document.getElementById('start'), b = document.getElementById('go');
    // the button wakes up once the game has booted (a slow phone would otherwise show a black screen after the click)
    (function wait() { if (window.__ff && window.__ff.game && window.__ff.game.isBooted) { b.disabled = false; b.textContent = 'CLICK TO PLAY'; } else requestAnimationFrame(wait); })();
    function go() { if (b.disabled) return; s.hidden = true; try { window.focus(); } catch (e) {} }
    b.addEventListener('click', go);
    window.addEventListener('keydown', function (e) { if (!s.hidden && (e.code === 'Enter' || e.code === 'Space')) go(); });
  })();
</script>
<script type="module">
${js}
</script>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const flag = (name) => { const i = args.indexOf(name); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const manifest = flag('--manifest');
  let build = opt('--build') || process.env.FROSTFALL_BUILD;
  if (!build) build = (await import('../vite.config.js')).buildId();
  const out = args[0] || 'frostfall.html';
  const page = singleFileHtml({ manifest, build });
  fs.writeFileSync(out, page);
  console.log('wrote', out, (Buffer.byteLength(page) / 1024).toFixed(0) + ' KB', 'build ' + build + (manifest ? ' (with manifest link)' : ''));
}
