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
// ---- a camp that notices you at once: its floating names stack instead of printing over each other
const names = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), { settings } = await import('/src/systems/settings.js');
  const old = settings.dangerNames; settings.dangerNames = 'always';
  const es = [0, 1, 2].map(() => g.addEnemy('wolf', g.player.x + 60, g.player.y));
  g.dangerNamesShown = [];
  for (const e of es) { e.setPosition(g.player.x + 60, g.player.y); e.alerted = true; e.hudNamed = false; }
  await new Promise((r) => setTimeout(r, 300));
  settings.dangerNames = old;
  for (const e of es) e.destroy();                        // (and they must not bite: a low-health tip would jump the hint queue below)
  window.__ff.S.hp = window.__ff.S.maxHp; g.player.invuln = 999;
  const ys = (g.dangerNamesShown || []).map((n) => Math.round(n.y));
  return { n: es.length, ys };
});
check('floating foe names never print on top of each other', names.n >= 2 && names.ys.length >= 2 && new Set(names.ys).size === names.ys.length, JSON.stringify(names));
// ---- arriving in a region: while the title card shows, the banner, hints and toasts wait; then an urgent hint first,
// then the toasts; nothing overlaps on any frame, in normal and LARGE TEXT
for (const big of [false, true]) {
  const r = await G(async (big) => {
    const hd = window.__ff.game.scene.getScene('Hud'), S = window.__ff.S;
    const { bus } = await import('/src/systems/bus.js'), { settings } = await import('/src/systems/settings.js');
    const oldBig = settings.largeText; settings.largeText = big;
    hd.hint?.destroy(); hd.hint = null; hd.hintQ = []; hd.toasts.forEach((t) => t.t.destroy()); hd.toasts = []; hd.toastHold = [];
    S.flags.regionCards = {};
    bus.emit('area', 'THE HOLLOW REACH');
    bus.emit('discover', { name: 'HAMLET', top: 'DISCOVERED', line: '+12 GOLD  1 PLACES FOUND' });
    bus.emit('hint', 'A QUIET TIP ABOUT SNEAKING');
    bus.emit('toast', 'CAMPFIRE FOUND: TRAVEL BY FIRE OR MAP (M) > F', 12);
    bus.emit('toast', 'FAR BEYOND YOU. GEAR UP FIRST.', 12);
    bus.emit('hint', 'URGENT: DRINK A POTION', true);
    bus.emit('toast', 'SOMETHING TALL ON THE HORIZON... (WATCHTOWER?)', 15);
    const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const out = { card: hd.cardT, frames: 0, during: 0, overlaps: [], firstHint: null, toastsBeforeHint: false };
    await new Promise((done) => {
      const t0 = performance.now();
      const step = () => {
        const cardUp = hd.cardT > 0, rects = [];
        if (cardUp) rects.push(['card', { x: 0, y: 104, w: 320, h: 34 }]);
        if (hd.bannerObj && hd.bannerObj.c.alpha > 0) rects.push(['banner', { x: (320 - hd.bannerObj.w) / 2, y: 40, w: hd.bannerObj.w, h: 45 }]);
        if (hd.hint?.visible && hd.hintRect) rects.push(['hint', hd.hintRect]);
        for (const ts of hd.toasts) if (ts.t.visible) rects.push(['toast', { x: 2, y: ts.t.y - 1, w: ts.t.width + 4, h: ts.t.height }]);
        if (cardUp && rects.length > 1) out.during++;
        for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) if (hit(rects[i][1], rects[j][1])) out.overlaps.push(rects[i][0] + '/' + rects[j][0] + '@' + out.frames);
        if (!cardUp && out.firstHint === null && hd.hint?.visible) out.firstHint = hd.hintText;
        if (!cardUp && out.firstHint === null && hd.toasts.some((t) => t.t.visible)) out.toastsBeforeHint = true;
        out.frames++;
        if (performance.now() - t0 < 4500) requestAnimationFrame(step); else done();
      };
      step();
    });
    settings.largeText = oldBig;
    out.overlaps = out.overlaps.slice(0, 5);
    return out;
  }, big);
  const tag = big ? ' (LARGE TEXT)' : '';
  check('under the title card no banner, hint or toast shows' + tag, r.card > 0 && r.frames > 30 && r.during === 0, JSON.stringify(r));
  check('after it the urgent hint comes first, before the toasts' + tag, r.firstHint === 'URGENT: DRINK A POTION' && !r.toastsBeforeHint, JSON.stringify(r));
  check('nothing overlaps on any frame' + tag, r.overlaps.length === 0, JSON.stringify(r));
}
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join(' | '));
await h.close();
console.log(failCount() ? 'SWEEP FAILED' : 'SWEEP OK');
