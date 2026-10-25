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
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
await h.close();
console.log(failCount() ? 'SWEEP FAILED' : 'SWEEP OK');
