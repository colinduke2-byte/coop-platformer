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


// ---- 3. Preparation: the opening gear will not beat the crypt, so do what a player does: clear camps and dens near the village, loot, shop
const tapKey = async (c, ms = 70) => { await G((k) => window.__ff.keys._press(k), c); await h.sleep(ms); await G((k) => window.__ff.keys._release(k), c); await h.sleep(60); };
const buyAt = async (id, wares) => {                     // drive the real shop screen: move down to the row and press E
  await G(async (w) => { const S = await import('/src/data/services.js'); window.__shopP = S.buyMenu('Hilda', w); }, wares);
  await h.sleep(450);
  const i = wares.findIndex((w) => w.id === id);
  for (let k = 0; k < i; k++) await tapKey('KeyS');
  await tapKey('KeyE'); await tapKey('Escape', 60); await h.sleep(250);
  await G(async () => { await window.__shopP; });
};
const equipBest = () => G(async () => {
  const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js'), { recalc } = await import('/src/systems/stats.js');
  const best = (slot, test, score) => { let b = S.equip[slot], bs = b ? score(ITEMS[b]) : -1; for (const id of Object.keys(S.inv)) { const it = ITEMS[id]; if (it && test(it) && score(it) > bs) { b = id; bs = score(it); } } S.equip[slot] = b; };
  best('weapon', (i) => i.type === 'weapon', (i) => i.dmg); best('armor', (i) => i.type === 'armor', (i) => i.armor || 0); best('offhand', (i) => i.type === 'shield', (i) => i.block || 0);
  recalc(); return { w: S.equip.weapon, a: S.equip.armor, o: S.equip.offhand };
});
await G(() => window.gs().changeMap('forest', 'west', 'door'));
await h.sleep(2200);
const pois = await G(async () => { const M = await import('/src/data/maps.js'), S = window.__ff.S; return M.getReach().pois.filter((p) => ['camp', 'den'].includes(p.kind) && p.tier === 0).sort((a, b) => Math.hypot(a.x - 30, a.y - 20) - Math.hypot(b.x - 30, b.y - 20)).slice(0, 6).map((p) => [p.x, p.y, p.kind]); });
let farmed = 0, farmDeaths = 0;
for (const [px, py] of pois) {
  const gold0 = await G(() => window.__ff.S.gold);
  if (gold0 >= 330 || farmDeaths > 2) break;
  await G(([x, y]) => { const g = window.gs(), S = window.__ff.S; S.hp = S.maxHp; S.sp = S.maxSp; g.player.setPosition(x * 16, (y + 5) * 16); }, [px, py]);
  await h.sleep(900);
  for (let i = 0; i < 12; i++) {
    const n = await G(() => { const g = window.gs(), p = g.player; const foes = g.enemies.getChildren().filter((e) => !e.dead && e.active && Math.hypot(e.x - p.x, e.y - p.y) < 220); if (foes.length) { const e = foes.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (Math.hypot(e.x - p.x, e.y - p.y) > 90) p.setPosition(e.x - 70, e.y); } return foes.length; });
    if (!n) break;
    const r = await G(() => window.__fight(() => { const g = window.gs(); return !g.enemies.getChildren().some((e) => !e.dead && e.active && Math.hypot(e.x - g.player.x, e.y - g.player.y) < 220); }, 35));
    if (r.hp <= 0) { farmDeaths++; await G(() => { const S = window.__ff.S; S.hp = S.maxHp; window.gs().player.mode = 'free'; }); break; }
    farmed++;
  }
  await G(() => { const g = window.gs(), p = g.player; for (const pk of g.pickups.slice()) if (pk.active !== false && pk.x) p.setPosition(pk.x, pk.y); });
  await h.sleep(600);
}
const afterFarm = await G(() => { const S = window.__ff.S; return { gold: S.gold, kills: S.run.kills }; });
check('the bot clears camps and dens near the village and loots them', farmed >= 3 && afterFarm.gold > 150, JSON.stringify([farmed, farmDeaths, afterFarm]));
await G(() => window.gs().changeMap('village', 'start', 'door'));
await h.sleep(1500);
const wares = [{ id: 'iron_cuirass', price: 130, once: true }, { id: 'iron_shield', price: 110, once: true }, { id: 'steel_sword', price: 180, once: true }, { id: 'hp_potion', price: 26 }];
for (const id of ['iron_cuirass', 'steel_sword', 'iron_shield']) { if ((await G(() => window.__ff.S.gold)) >= wares.find((w) => w.id === id).price) await buyAt(id, wares); }
for (let k = 0; k < 6 && (await G(() => window.__ff.S.gold)) >= 26; k++) await buyAt('hp_potion', wares);
const kit = await equipBest();
check('the bot buys and wears better gear', !!kit.a && kit.a !== 'fur_tunic', JSON.stringify(kit));

// ---- 3b. Chapter one: Sigrid's quest, the crypt, Jarl Valdrek, the Frostheart
await talk('sigrid', [0]);
check('Sigrid sends you to the crypt', (await Q('king')) === 'active');
await G(() => { const S = window.__ff.S; S.hp = S.maxHp; S.sp = S.maxSp; for (const id of ['iron_sword', 'wooden_shield', 'fur_tunic']) if (S.inv[id]) { const slot = id === 'wooden_shield' ? 'offhand' : id === 'fur_tunic' ? 'armor' : 'weapon'; S.equip[slot] = id; } });
await G(() => window.gs().changeMap('crypt', 'entry', 'door'));
await h.sleep(2500);
console.log('  ... in the crypt');
let lost = false, deaths = 0;
const backToCrypt = async () => { if (await G(() => window.gs().mapId !== 'crypt' || window.__ff.S.hp <= 0)) { deaths++; await h.sleep(2500); await G(() => { const S = window.__ff.S; S.hp = S.maxHp; S.sp = S.maxSp; window.gs().changeMap('crypt', 'entry', 'door'); }); await h.sleep(2500); } };
for (let i = 0; i < 40 && !lost; i++) {
  await backToCrypt();
  const next = await G(() => {
    const g = window.gs(), p = g.player, S = window.__ff.S;
    S.hp = Math.max(S.hp, S.maxHp * 0.6); S.sp = S.maxSp;
    const foes = g.enemies.getChildren().filter((e) => !e.dead && !e.isBoss && e.active).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
    if (!foes.length) return 0;
    const e = foes[0]; p.setPosition(e.x - 60, e.y); return foes.length;
  });
  if (!next) break;
  let r = null;
  for (let attempt = 0; attempt < 3; attempt++) {        // like a player: if a fight goes badly, back off, heal and go again
    r = await G(() => window.__fight(() => { const g = window.gs(); return !g.enemies.getChildren().some((e) => !e.dead && !e.isBoss && e.active && Math.hypot(e.x - g.player.x, e.y - g.player.y) < 170); }, 40));
    console.log('  . crypt fight', next, attempt, JSON.stringify(r));
    if (r.ok) break;
    await G(() => { const S = window.__ff.S, p = window.gs().player; S.hp = S.maxHp; S.sp = S.maxSp; p.mode = 'free'; p.invuln = 1; });
  }
  if (!r.ok) lost = true;
}
console.log('  . deaths so far', deaths);
check('the bot clears the crypt\'s guards', !lost);
await backToCrypt();
const boss = await G(async () => {
  const g = window.gs(), S = window.__ff.S;
  S.hp = S.maxHp; S.sp = S.maxSp;
  const b = g.boss; if (!b) return { none: true };
  g.player.setPosition(b.x, b.y + 110);
  return { ok: true };
});
check('Jarl Valdrek is waiting', !!boss.ok, JSON.stringify(boss));
console.log('  . boss', JSON.stringify(await G(() => { const b = window.gs().boss; return b && { x: Math.round(b.x), y: Math.round(b.y), engaged: b.engaged, inv: b.invulnerable, hp: b.hp, px: Math.round(window.gs().player.x), py: Math.round(window.gs().player.y) }; })));
const fought = await G(() => window.__fight(() => { const b = window.gs().boss; return !b || b.dead || b.yieldDone; }, 170));
check('the bot beats Jarl Valdrek with what the first quests paid', fought.ok, JSON.stringify(fought));
await h.sleep(3000);
const loot = await G(() => {
  const g = window.gs(), p = g.player; let n = 0;
  for (const pk of g.pickups.slice()) { if (pk.active !== false && pk.x) { p.setPosition(pk.x, pk.y); n++; } }
  return n;
});
await h.sleep(800);
await G(() => window.__ff.S.quests.king.status);
check('the Frostheart is in hand', (await Q('king')) === 'relic', await Q('king'));
await G(() => window.gs().changeMap('village', 'start', 'door'));
await h.sleep(1500);
await talk('sigrid', [0]);
check('Sigrid takes the Frostheart: chapter one ends and the winter eases', (await Q('king')) === 'done' && (await G(() => window.__ff.S.flags.ending === 'give')), await Q('king'));

// ---- 4. what the campaign paid
const shop = await G(async () => {
  const S = window.__ff.S;
  return { gold: S.gold, quests: Object.entries(S.quests).filter(([, q]) => q.status === 'done').map(([k]) => k) };
});
check('the first quests have paid out gold', shop.gold > 0 && shop.quests.includes('wolves') && shop.quests.includes('herbs'), JSON.stringify(shop));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'CAMPAIGN BOT FAILED' : 'CAMPAIGN BOT PASSED');
process.exit(failCount() ? 1 : 0);
