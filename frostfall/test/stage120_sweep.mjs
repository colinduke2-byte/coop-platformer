// World sweep (in the running game): small rooms sit in the middle of the screen, a hamlet's houses are drawn whole,
// and the campfire toast fits on the screen.
//   node test/stage120_sweep.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);

// ---- a room smaller than the screen is centred, not tucked under the health bars
await h.open('scene=game&map=cottage&spawn=in&seed=1');
await h.sleep(900);
const room = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), cam = g.cameras.main, v = cam.worldView;
  return { worldW: g.worldW, worldH: g.worldH, vx: v.x, vy: v.y, vw: v.width, vh: v.height };
});
const midX = room.vx + room.vw / 2, midY = room.vy + room.vh / 2;
check('a small room sits in the middle of the screen', room.worldW < room.vw && Math.abs(midX - room.worldW / 2) <= 1 && (room.worldH >= room.vh || Math.abs(midY - room.worldH / 2) <= 1), JSON.stringify(room));

// ---- a Reach hamlet's houses are drawn whole: every roof row over full wall rows, in the tilemap the player sees
await h.open('scene=game&map=forest&spawn=west&seed=1');
await h.sleep(900);
const ham = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), M = await import('/src/data/maps.js'), { TILE } = await import('/src/config.js');
  const out = [];
  for (const p of M.getReach().pois.filter((q) => q.kind === 'hamlet')) {
    g.player.setPosition((p.x + 0.5) * 16, (p.y + 0.5) * 16);
    for (const dx of [-7, 3]) for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) {
      const t = g.built.grid[p.y - 5 + y][p.x + dx + x];
      const ok = y < 2 ? t === TILE.ROOF : [TILE.WOODWALL, TILE.WINDOW, TILE.DOOR].includes(t);
      if (!ok) out.push(`${p.id} ${dx} ${x},${y}:${t}`);
    }
  }
  return out;
});
check('every Reach hamlet house is whole (no snow in a roof or a wall)', ham.length === 0, ham.slice(0, 6).join(' '));

// ---- the campfire toast fits on the screen with a margin
const toast = await G(async () => {
  const { textW } = await import('/src/art/font.js'), { prompt } = await import('/src/systems/access.js');
  return textW(`CAMPFIRE FOUND: TRAVEL BY FIRE OR MAP (${prompt('KeyM')}) > ${prompt('KeyF')}`);
});
check('the campfire toast fits on the 320-wide screen', toast > 0 && toast <= 308, String(toast));
// ---- landmarks sighted on arrival: marked at once, one toast after the title card, not a stack under it
const sight = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, D = await import('/src/world/discovery.js'), { bus } = await import('/src/systems/bus.js');
  const lms = g.built.pois.filter((p) => D.LANDMARKS.has(p.kind));
  const lm = lms.find((p) => lms.filter((q) => q !== p && Math.hypot(q.x - p.x, q.y - p.y) < 40).length >= 1) || lms[0];
  const heard = [], fn = (t) => { if (/HORIZON/.test(t)) heard.push(t); };
  bus.on('toast', fn);
  S.sighted = {}; S.discovered = {};
  g.sightHoldUntil = g.time.now + 3000;
  g.player.setPosition((lm.x - 20) * 16, lm.y * 16); g.discoverTick();
  const marked = Object.keys(S.sighted).length, during = heard.length;
  g.sightHoldUntil = 0; g.discoverTick(); g.discoverTick();
  bus.off('toast', fn);
  return { marked, during, after: heard.length, text: heard[0] || '' };
});
check('landmarks are sighted at once but stay quiet under the title card', sight.marked >= 1 && sight.during === 0, JSON.stringify(sight));
check('then one toast names them (it fits)', sight.after === 1 && sight.text.length <= 47, JSON.stringify(sight));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
await h.close();
console.log(failCount() ? 'SWEEP FAILED' : 'SWEEP OK');
