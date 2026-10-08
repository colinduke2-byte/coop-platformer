// Campaign bot: plays the opening of the real campaign with the real scripts and the real world, no quest flags faked.
//   new game -> Elder Sigrid -> Bjorn's wolf hunt (the bot walks up to real wolves and fights them with the balance bot's
//   fighting loop) -> back to Bjorn -> Mirra's herbs (picks real herbs) -> back to Mirra -> Hilda's shop.
// It teleports between legs of the walk (the walking itself is covered by the monkey and world tests) but every quest step,
// reward and state change comes from the game.
//   node test/campaign_bot.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// answer every dialogue with the first option (accept), and remember what was said
const stub = (answers = []) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const talk = async (id, answers) => {
  await stub(answers);
  const r = await Promise.race([G(async (n) => { const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); return 'ok'; }, id), new Promise((res) => setTimeout(() => res('timeout'), 15000))]);
  if (r === 'timeout') { console.log('  ! ' + id + ' did not finish; said so far: ' + JSON.stringify(await G(() => window.__said.slice(-4)))); }
  await unstub();
};
const Q = (id) => G((i) => window.__ff.S.quests[i].status, id);

// the bot's brain: approach the nearest foe, swing, roll away from telegraphs, drink potions (same as test/balance.mjs)
await G(() => {
  window.__fight = (isDone, limit) => new Promise((res) => {
    const g = window.gs(), S = window.__ff.S, p = g.player, keys = window.__ff.keys;
    const tapK = (c, ms = 70) => { keys._press(c); setTimeout(() => keys._release(c), ms); };
    const t0 = performance.now(); let lastPot = 0;
    const iv = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      if (S.hp <= 0 || isDone() || elapsed > limit) { clearInterval(iv); ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF'].forEach((c) => keys._release(c)); res({ ok: S.hp > 0 && isDone(), hp: Math.round(S.hp), t: Math.round(elapsed) }); return; }
      if (p.mode === 'dead' || p.mode === 'lying') return;
      const foes = g.enemies.getChildren().filter((e) => !e.dead && e.active);
      let tgt = null, td = 1e9;
      for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td && d < 400) { td = d; tgt = e; } }
      if (!tgt) return;
      if (S.hp < S.maxHp * 0.4 && S.inv.hp_potion > 0 && performance.now() - lastPot > 1200) { keys._press('Digit1'); setTimeout(() => keys._release('Digit1'), 40); lastPot = performance.now(); }
      const dx = tgt.x - p.x, dy = tgt.y - p.y, nx = dx / (td || 1), ny = dy / (td || 1), now = performance.now();
      let telegraph = false;
      for (const e of foes) { if (e.state === 'windup') { e.__w = e.__w || now; if (now - e.__w > 280 && Math.hypot(e.x - p.x, e.y - p.y) < 40) telegraph = true; } else e.__w = 0; }
      const move = (vx, vy) => { keys[vx < -0.3 ? '_press' : '_release']('KeyA'); keys[vx > 0.3 ? '_press' : '_release']('KeyD'); keys[vy < -0.3 ? '_press' : '_release']('KeyW'); keys[vy > 0.3 ? '_press' : '_release']('KeyS'); };
      if (telegraph && p.rollCd <= 0 && S.sp >= 22 && p.mode === 'free') { move(-ny, nx); tapK('Space', 60); }
      else if (td > 20) move(nx, ny);
      else { move(0, 0); p.face = { x: Math.abs(nx) > 0.38 ? Math.sign(nx) : 0, y: Math.abs(ny) > 0.38 ? Math.sign(ny) : 0 }; if (!p.face.x && !p.face.y) p.face = { x: 1, y: 0 }; if (S.sp > 14 && p.lockT <= 0) tapK('KeyJ', 50); }
      if (S.sp > 10 && telegraph) keys._press('KeyF'); else keys._release('KeyF');
    }, 60);
  });
});

// ---- 1. Sigrid, then Bjorn: the wolf hunt
await talk('sigrid', []);
await talk('bjorn', [0]);
check('Bjorn gives the wolf hunt and the arrows', (await Q('wolves')) === 'active' && (await G(() => (window.__ff.S.arrows ?? window.__ff.S.inv.arrows ?? 0) > 0)));
await G(() => window.gs().changeMap('forest', 'west', 'door'));
await h.sleep(2200);
let guard = 0;
while ((await Q('wolves')) === 'active' && guard++ < 8) {
  const spot = await G(() => {
    const g = window.gs(), p = g.player, S = window.__ff.S;
    S.hp = S.maxHp; S.sp = S.maxSp;
    const wolves = g.enemies.getChildren().filter((e) => e.kind === 'wolf' && !e.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (!wolves.length) return null;
    const w = wolves[0]; p.setPosition(w.x - 70, w.y); return { n: wolves.length };
  });
  if (!spot) break;
  await G(() => window.__fight(() => window.__ff.S.quests.wolves.status !== 'active' || window.gs().enemies.getChildren().filter((e) => e.kind === 'wolf' && !e.dead && Math.hypot(e.x - window.gs().player.x, e.y - window.gs().player.y) < 160).length === 0, 40));
}
check('the bot kills wolves in the real forest until the quest is ready', (await Q('wolves')) === 'ready', await Q('wolves'));
await G(() => window.gs().changeMap('village', 'start', 'door'));
await h.sleep(1500);
await talk('bjorn', []);
check('Bjorn pays the iron sword, shield and potions', (await Q('wolves')) === 'done' && (await G(() => !!window.__ff.S.inv.iron_sword && !!window.__ff.S.inv.wooden_shield)));

// ---- 2. Mirra's remedy: pick real herbs
await talk('mirra', [0]);
check('Mirra asks for herbs', (await Q('herbs')) === 'active');
await G(() => window.gs().changeMap('forest', 'west', 'door'));
await h.sleep(2200);
let picked = 0;
for (let i = 0; i < 40 && (await Q('herbs')) === 'active'; i++) {
  const r = await G(() => {
    const g = window.gs(), p = g.player, S = window.__ff.S;
    const herbs = g.interactables.filter((x) => x.item && (x.item === 'snowberry' || x.item === 'frost_lily') && x.canInteract?.() && (S.inv[x.item] || 0) < (x.item === 'snowberry' ? 5 : 3)).sort((a, b) => Math.hypot(a.ix - p.x, a.iy - p.y) - Math.hypot(b.ix - p.x, b.iy - p.y));
    if (!herbs.length) return null;
    const hb = herbs[0]; p.setPosition(hb.ix - 8, hb.iy + 4); hb.interact(); return hb.item;
  });
  if (!r) break;
  picked++; await h.sleep(60);
}
check('the bot gathers real herbs', picked >= 6, `picked ${picked}, quest ${await Q('herbs')}`);
console.log('  ... back in the village with herbs');
await G(() => window.gs().changeMap('village', 'start', 'door'));
await h.sleep(1500);
console.log('  ... talking to Mirra');
await talk('mirra', []);
check('Mirra teaches brewing and pays', (await Q('herbs')) === 'done');

// ---- 3. shopping with the gold the campaign paid
const shop = await G(async () => {
  const S = window.__ff.S;
  return { gold: S.gold, quests: Object.entries(S.quests).filter(([, q]) => q.status === 'done').map(([k]) => k) };
});
check('the first quests have paid out gold', shop.gold > 0 && shop.quests.includes('wolves') && shop.quests.includes('herbs'), JSON.stringify(shop));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'CAMPAIGN BOT FAILED' : 'CAMPAIGN BOT PASSED');
process.exit(failCount() ? 1 : 0);
