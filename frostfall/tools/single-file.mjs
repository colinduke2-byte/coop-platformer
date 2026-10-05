// Bundles the production build into ONE self-contained HTML page (no other files needed).
//   npm run build && node tools/single-file.mjs out.html
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2] || 'frostfall.html';
const dist = new URL('../dist/', import.meta.url).pathname;
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const m = html.match(/src="\.\/(assets\/[^"]+\.js)"/);
if (!m) throw new Error('run `npm run build` first');
let js = fs.readFileSync(path.join(dist, m[1]), 'utf8');
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const page = `<title>Frostfall</title>
<style>
  :root { --bg:#0b0e1a; --panel:#1c2338; --ink:#eaf2f8; --muted:#7b8fb5; --accent:#f4d460; color-scheme: dark; }
  html, body { height: 100%; }
  body { margin: 0; padding: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; overflow: hidden; }
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
<div id="game"></div>
<div id="start">
  <div class="card">
    <h1>FROSTFALL</h1>
    <p>A top-down 8-bit action RPG of the frozen north.</p>
    <button id="go" type="button">CLICK TO PLAY</button>
    <small>WASD move, Space roll, J sword, K bow, L spell, F block, E interact, Esc menu. Touch controls appear on phones.</small>
  </div>
</div>
<script>
  (function () {
    var s = document.getElementById('start');
    function go() { s.hidden = true; try { window.focus(); } catch (e) {} }
    document.getElementById('go').addEventListener('click', go);
    window.addEventListener('keydown', function (e) { if (!s.hidden && (e.code === 'Enter' || e.code === 'Space')) go(); });
  })();
</script>
<script type="module">
${js}
</script>
`;
fs.writeFileSync(out, page);
console.log('wrote', out, (page.length / 1024).toFixed(0) + ' KB');
