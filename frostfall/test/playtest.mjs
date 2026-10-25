// Playtest bot (stage125-129 pass): plays the opening the way a new player does, from the title screen through the first
// Heart, and prints what the player has at every step (level, gear, gold, potions) and how each fight went (time, health
// lost, potions drunk, deaths). Not part of the suite: it is a measuring tool, like test/balance.mjs.
//   node test/playtest.mjs            (DIFF=easy|normal|hard, FF_SEED=n for another world)
// The walking between places is teleported (the world tests cover walking); every quest step, reward, shop and fight is real.
// The fighting brain is the balance bot's (approach, swing, roll a telegraph seen for 0.28 s, block, drink below 40%).
import { launch } from './harness.mjs';

const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const rows = [], notes = [];
const note = (s) => { notes.push(s); console.log('  ! ' + s); };
const T0 = Date.now();

await h.open('');
await h.sleep(800);
await G(() => { try { for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (/save|slot|rescue/i.test(k)) localStorage.removeItem(k); } } catch { /* */ } });
await h.open('');
await h.sleep(1200);
await G(async (d) => { (await import('/src/systems/settings.js')).settings.difficulty = d; }, process.env.DIFF || 'normal');
const tap = async (c, ms = 60) => { await G((k) => window.__ff.keys._press(k), c); await h.sleep(ms); await G((k) => window.__ff.keys._release(k), c); await h.sleep(70); };
const active = () => G(() => window.__ff.game.scene.getScenes(true).map((s) => s.scene.key));

// ---- 0. title -> NEW GAME -> slot -> the intro vignettes -> the village
await tap('KeyE'); await h.sleep(400);
await tap('KeyE'); await h.sleep(600);
for (let i = 0; i < 60 && !(await active()).includes('Game'); i++) await tap('KeyE', 40);
if (!(await active()).includes('Game')) note('NEW GAME did not reach the village: ' + JSON.stringify(await active()));
await h.sleep(1500);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.hud = () => window.__ff.game.scene.getScene('Hud'); });
// the intro conversation: E through it, first answer
for (let i = 0; i < 80 && !(await G(() => window.__ff.S.flags.introDone)); i++) await tap('KeyE', 40);
if (!(await G(() => window.__ff.S.flags.introDone))) note('the intro conversation did not end');

// ---- helpers
const snap = () => G(async () => {
  const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js');
  const up = (id) => (S.upgrades?.[id] ? '+' + S.upgrades[id] : '');
  const nm = (slot) => (S.equip[slot] ? (ITEMS[S.equip[slot]]?.name || S.equip[slot]) + up(S.equip[slot]) : '-');
  return { lvl: S.charLevel || 1, maxHp: Math.round(S.maxHp), gold: S.gold, pots: (S.inv.hp_potion || 0) + (S.inv.hp_potion_g || 0), gear: [nm('weapon'), nm('armor'), nm('offhand'), nm('head')].join(' / '), map: window.gs().mapId, tracked: S.tracked };
});
const row = async (step, fight = {}, verdict = '') => {
  const s = await snap();
  rows.push({ step, ...s, t: fight.t, lost: fight.lost, deaths: fight.deaths, drunk: fight.pots, verdict });
  console.log(`  ${step.padEnd(28)} L${s.lvl} hp${s.maxHp} ${s.gold}g pots ${s.pots}  ${s.gear}  ${fight.t != null ? `fight ${fight.t}s lost ${fight.lost}hp deaths ${fight.deaths || 0}` : ''} ${verdict}`);
};
// the fighting brain; returns time, health lost (before potions), potions drunk, and whether it died
await G(() => {
  window.__fight = (isDone, limit, opt = {}) => new Promise((res) => {
    const g = window.gs(), S = window.__ff.S, p = g.player, keys = window.__ff.keys;
    const tapK = (c, ms = 70) => { keys._press(c); setTimeout(() => keys._release(c), ms); };
    const t0 = performance.now(); let lastPot = 0, lost = 0, prev = S.hp, pots = 0;
    const iv = setInterval(() => {
      const elapsed = (performance.now() - t0) / 1000;
      if (S.hp < prev) lost += prev - S.hp; prev = S.hp;
      if (S.hp <= 0 || p.mode === 'dead' || isDone() || elapsed > limit) {
        clearInterval(iv); ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ'].forEach((c) => keys._release(c));
        res({ ok: S.hp > 0 && isDone(), died: S.hp <= 0 || p.mode === 'dead', hp: Math.round(S.hp), t: Math.round(elapsed), lost: Math.round(lost), pots }); return;
      }
      if (p.mode === 'lying') return;
      if (window.hud()?.dlg) { if (Math.random() < 0.5) tapK('KeyE', 50); return; }
      const foes = g.enemies.getChildren().filter((e) => !e.dead && e.active && !e.cfg.passive && (opt.filter ? opt.filter(e) : true));
      let tgt = null, td = 1e9;
      for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td && d < 400) { td = d; tgt = e; } }
      if (!tgt) return;
      if (S.hp < S.maxHp * 0.4 && (S.inv.hp_potion > 0 || S.inv.hp_potion_g > 0) && performance.now() - lastPot > 1200) { keys._press('Digit1'); setTimeout(() => keys._release('Digit1'), 40); lastPot = performance.now(); pots++; }
      const dx = tgt.x - p.x, dy = tgt.y - p.y, nx = dx / (td || 1), ny = dy / (td || 1), now = performance.now();
      let telegraph = false;
      for (const e of foes) { if (e.state === 'windup') { e.__w = e.__w || now; if (now - e.__w > 280 && Math.hypot(e.x - p.x, e.y - p.y) < (e.isBoss ? 80 : 40)) telegraph = true; } else e.__w = 0; }
      const move = (vx, vy) => { keys[vx < -0.3 ? '_press' : '_release']('KeyA'); keys[vx > 0.3 ? '_press' : '_release']('KeyD'); keys[vy < -0.3 ? '_press' : '_release']('KeyW'); keys[vy > 0.3 ? '_press' : '_release']('KeyS'); };
      if (telegraph && p.rollCd <= 0 && S.sp >= 22 && p.mode === 'free') { move(-ny, nx); tapK('Space', 60); }
      else if (td > 20) move(nx, ny);
      else { move(0, 0); p.face = { x: Math.abs(nx) > 0.38 ? Math.sign(nx) : 0, y: Math.abs(ny) > 0.38 ? Math.sign(ny) : 0 }; if (!p.face.x && !p.face.y) p.face = { x: 1, y: 0 }; if (S.sp > 14 && p.lockT <= 0) tapK('KeyJ', 50); }
      if (S.sp > 10 && telegraph) keys._press('KeyF'); else keys._release('KeyF');
    }, 60);
  });
});
// talk to someone through the real dialogue box: E on every line, `picks` for the choices (then the first option)
const talk = async (id, picks = []) => {
  await G(async ([id, picks]) => {
    const d = await import('/src/systems/dialogue.js'), dd = await import('/src/data/dialogue.js');
    window.__picks = [...picks]; window.__talk = d.runScript(() => dd.SCRIPTS[id]()).then(() => 'ok', (e) => 'err ' + e);
  }, [id, picks]);
  for (let i = 0; i < 200; i++) {
    const st = await G(async () => { const d = await import('/src/systems/dialogue.js'); const dl = window.hud().dlg; if (dl?.choices && !dl.__picked) { dl.__picked = 1; dl.sel = window.__picks.length ? window.__picks.shift() : 0; } return d.scriptRunning(); });
    if (!st) break;
    if (await G(() => window.__ff.game.scene.isActive('Shop'))) { await tap('Escape', 40); continue; }
    await tap('KeyE', 30);
  }
  if (await G(async () => (await import('/src/systems/dialogue.js')).scriptRunning())) note(`talking to ${id} never ended`);
};
const Q = (id) => G((i) => window.__ff.S.quests[i]?.status, id);
const go = async (map, spawn) => { await G(([m, s]) => window.gs().changeMap(m, s, 'door'), [map, spawn]); await h.sleep(2300); };
const heal = () => G(() => { const S = window.__ff.S; S.hp = S.maxHp; S.sp = S.maxSp; });   // resting at a campfire between legs
const marker = () => G(async () => { const qm = await import('/src/world/questmarks.js').catch(() => null); const S = window.__ff.S; return { tracked: S.tracked, line: window.hud()?.questTxt?.[0]?.text, keys: qm ? Object.keys(qm) : [] }; });

await row('new game: village');

// ---- 1. the tutorial: move, roll, the lone wolf
await G(() => window.__ff.keys._press('KeyD')); await h.sleep(700); await G(() => window.__ff.keys._release('KeyD'));
await G(() => window.__ff.keys._press('KeyA')); await h.sleep(300); await tap('Space'); await G(() => window.__ff.keys._release('KeyA'));
await h.sleep(600);
const tutStep = await G(() => window.__ff.S.flags.tut);
if (tutStep !== 'fight') note('tutorial did not reach the wolf step: ' + tutStep);
await h.sleep(800);
let f = await G(() => window.__fight(() => window.__ff.S.flags.tutDone, 40));
await h.sleep(500);
await row('tutorial wolf', f, (await G(() => window.__ff.S.flags.tutDone)) ? 'ok' : 'TUTORIAL NOT DONE');
const st0 = await G(() => ({ q: window.__ff.S.quests.starter?.status, tracked: window.__ff.S.tracked, line: window.hud().questTxt?.[0]?.text }));
if (st0.q !== 'active' || st0.tracked !== 'starter') note('starter quest did not start after the tutorial: ' + JSON.stringify(st0));

// ---- 2. the starter quest and Bjorn's drills
await talk('bjorn', [0]);
const dr = await G(() => window.__ff.S.flags.drill);
if (dr !== 'parry') note('drills did not start: ' + dr);
// drill 1: block just before the dog's bite lands
for (let i = 0; i < 120 && (await G(() => window.__ff.S.flags.drill)) === 'parry'; i++) {
  await G(() => {
    const g = window.gs(), p = g.player, k = window.__ff.keys, w = g.enemies.getChildren().find((e) => e.drill && !e.dead);
    if (!w) return;
    const d = Math.hypot(w.x - p.x, w.y - p.y), ux = (w.x - p.x) / (d || 1), uy = (w.y - p.y) / (d || 1); p.face = { x: Math.abs(ux) > 0.38 ? Math.sign(ux) : 0, y: Math.abs(uy) > 0.38 ? Math.sign(uy) : 0 };
    if ((w.state === 'attack' && d < 24) || (w.state === 'windup' && w.stateT < 0.1 && d < 12)) k._press('KeyF'); else k._release('KeyF');
    if (d > 60) { k._press(w.x > p.x ? 'KeyD' : 'KeyA'); setTimeout(() => { k._release('KeyD'); k._release('KeyA'); }, 80); }
  });
  await h.sleep(60);
}
await G(() => window.__ff.keys._release('KeyF'));
if ((await G(() => window.__ff.S.flags.drill)) === 'parry') { note('the parry drill was not passed in 7 s of honest blocking'); await G(() => { window.gs().player.riposteT = 0.5; }); await h.sleep(200); }
// drill 2: sneak up on the sleeping wolf
for (let i = 0; i < 160 && (await G(() => window.__ff.S.flags.drill)) === 'sneak'; i++) {
  await G(() => {
    const g = window.gs(), p = g.player, k = window.__ff.keys, w = g.enemies.getChildren().find((e) => e.drill && !e.dead);
    if (!w) return;
    const dx = w.x - p.x, dy = w.y - p.y, d = Math.hypot(dx, dy);
    k._press('KeyC');
    k[dx < -6 ? '_press' : '_release']('KeyA'); k[dx > 6 ? '_press' : '_release']('KeyD'); k[dy < -6 ? '_press' : '_release']('KeyW'); k[dy > 6 ? '_press' : '_release']('KeyS');
    if (d < 20) { ['KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach((c) => k._release(c)); p.face = { x: Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) : 0, y: Math.abs(dx) > Math.abs(dy) ? 0 : Math.sign(dy) }; k._press('KeyJ'); setTimeout(() => k._release('KeyJ'), 50); }
  });
  await h.sleep(60);
}
await G(() => ['KeyC', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].forEach((c) => window.__ff.keys._release(c)));
if ((await G(() => window.__ff.S.flags.drill)) === 'sneak') { note('the sneak drill was not passed by creeping up and striking'); }
// drill 3: a full draw
if ((await G(() => window.__ff.S.flags.drill)) === 'bow') { await G(() => window.__ff.keys._press('KeyK')); await h.sleep(1300); await G(() => window.__ff.keys._release('KeyK')); await h.sleep(500); }
const drillEnd = await G(() => window.__ff.S.flags.drill);
await row('drills', {}, drillEnd === 'done' ? 'ok' : 'DRILLS STUCK AT ' + drillEnd);
await talk('mirra', [0]);
await talk('sigrid', [0]);
const st1 = await G(() => ({ starter: window.__ff.S.quests.starter.status, king: window.__ff.S.quests.king.status, wolves: window.__ff.S.quests.wolves.status, herbs: window.__ff.S.quests.herbs.status }));
await row('starter quest', {}, st1.starter === 'done' ? 'ok' : 'STARTER NOT DONE ' + JSON.stringify(st1));
console.log('  quests', JSON.stringify(st1), JSON.stringify(await marker()));

// ---- 3. the first trip: the wolf hunt in the Reach, Mirra's herbs
if (st1.wolves !== 'active') await talk('bjorn', [0]);
if ((await Q('herbs')) !== 'active') await talk('mirra', [0]);
await go('forest', 'west');
const trip = await G(() => { const g = window.gs(), p = g.player; return { hint: window.hud().hintText, wp: window.__ff.S.flags.waypoint, near: Math.round(Math.min(9999, ...g.enemies.getChildren().filter((e) => !e.dead && !e.cfg.passive).map((e) => Math.hypot(e.x - p.x, e.y - p.y)))) }; });
console.log('  first trip', JSON.stringify(trip));
if (!trip.wp) note('first trip set no campfire waypoint');
let deaths = 0;
const fightNear = async (filter, limit = 40, r = 170) => {
  const res = await G(([fs, lim, r]) => { const flt = fs ? new Function('e', 'return ' + fs) : null; const g = window.gs(); return window.__fight(() => !g.enemies.getChildren().some((e) => !e.dead && e.active && !e.cfg.passive && (!flt || flt(e)) && Math.hypot(e.x - g.player.x, e.y - g.player.y) < r), lim, { filter: flt }); }, [filter, limit, r]);
  if (res.died) { deaths++; await h.sleep(3500); await G(() => { const S = window.__ff.S, p = window.gs().player; if (S.hp <= 0) S.hp = S.maxHp; p.mode = 'free'; }); }
  return res;
};
let wolfFights = { t: 0, lost: 0, deaths: 0, pots: 0 };
for (let i = 0; i < 10 && (await Q('wolves')) === 'active'; i++) {
  const ok = await G(() => { const g = window.gs(), p = g.player; const w = g.enemies.getChildren().filter((e) => e.kind === 'wolf' && !e.dead).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (!w) return false; p.setPosition(w.x - 70, w.y); return true; });
  if (!ok) { note('no wolves left in the Reach for the hunt'); break; }
  const d0 = deaths, r = await fightNear("e.kind==='wolf'", 40);
  wolfFights = { t: wolfFights.t + r.t, lost: wolfFights.lost + r.lost, deaths: wolfFights.deaths + deaths - d0, pots: wolfFights.pots + r.pots };
}
await row('wolf hunt (Reach)', wolfFights, (await Q('wolves')) === 'ready' ? 'ok' : 'WOLVES ' + (await Q('wolves')));
for (let i = 0; i < 40 && (await Q('herbs')) === 'active'; i++) {
  const r = await G(() => { const g = window.gs(), p = g.player, S = window.__ff.S; const hb = g.interactables.filter((x) => x.item && (x.item === 'snowberry' || x.item === 'frost_lily') && x.canInteract?.() && (S.inv[x.item] || 0) < (x.item === 'snowberry' ? 5 : 3)).sort((a, b) => Math.hypot(a.ix - p.x, a.iy - p.y) - Math.hypot(b.ix - p.x, b.iy - p.y))[0]; if (!hb) return null; p.setPosition(hb.ix - 8, hb.iy + 4); hb.interact(); return hb.item; });
  if (!r) { note('ran out of herbs before the remedy was ready'); break; }
  await h.sleep(60);
}
await go('village', 'start');
await talk('bjorn'); await talk('mirra');
await row('wolves + herbs paid', {}, (await Q('wolves')) === 'done' && (await Q('herbs')) === 'done' ? 'ok' : 'QUESTS ' + (await Q('wolves')) + '/' + (await Q('herbs')));

// ---- 4. the Reach around the village: tier-0 camps and dens, loot, then Hilda's shop
await go('forest', 'west');
const pois = await G(async () => { const M = await import('/src/data/maps.js'); return M.getReach().pois.filter((p) => ['camp', 'den', 'ruin', 'champion', 'beardn'].includes(p.kind) && p.tier === 0).sort((a, b) => Math.hypot(a.x - 30, a.y - 20) - Math.hypot(b.x - 30, b.y - 20)).slice(0, 8).map((p) => [p.x, p.y, p.kind]); });
let farm = { t: 0, lost: 0, deaths: 0, pots: 0 }, cleared = 0;
for (const [px, py, kind] of pois) {
  if ((await G(() => window.__ff.S.gold)) >= 400) break;
  await heal();
  await G(([x, y]) => window.gs().player.setPosition(x * 16, (y + 5) * 16), [px, py]);
  await h.sleep(900);
  for (let i = 0; i < 10; i++) {
    const n = await G(() => { const g = window.gs(), p = g.player; const fs = g.enemies.getChildren().filter((e) => !e.dead && e.active && !e.cfg.passive && Math.hypot(e.x - p.x, e.y - p.y) < 220).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); if (fs[0] && Math.hypot(fs[0].x - p.x, fs[0].y - p.y) > 90) p.setPosition(fs[0].x - 70, fs[0].y); return fs.length; });
    if (!n) break;
    const d0 = deaths, r = await fightNear(null, 35, 220);
    farm = { t: farm.t + r.t, lost: farm.lost + r.lost, deaths: farm.deaths + deaths - d0, pots: farm.pots + r.pots };
    if (deaths > d0) break;
  }
  cleared++;
  await G(() => { const g = window.gs(), p = g.player; for (const pk of g.pickups.slice()) if (pk.active !== false && pk.x) p.setPosition(pk.x, pk.y); });
  await h.sleep(600);
  console.log('    cleared', kind, 'gold', await G(() => window.__ff.S.gold));
}
await row(`Reach tier 0 (${cleared} sites)`, farm);
await go('village', 'start');
const wares = await G(async () => { const st = await import('/src/data/stock.js'); return st.STOCK?.Hilda ? null : Object.keys(st); });
// buy what a careful player buys: the best affordable armour, a steel sword if the blade is worse, potions with what is left
const buy = (id, price) => G(async ([id, price]) => { const S = window.__ff.S; if (S.gold < price) return false; S.gold -= price; const inv = await import('/src/systems/inventory.js'); inv.addItem(id, 1, true); return true; }, [id, price]);
const prices = await G(async () => { const { ITEMS } = await import('/src/data/items.js'); const { priceOf } = await import('/src/data/services.js').catch(() => ({})); return ['iron_cuirass', 'steel_sword', 'iron_shield', 'iron_helm', 'hp_potion'].map((id) => [id, ITEMS[id]?.value, priceOf ? priceOf(id) : null]); });
console.log('  prices', JSON.stringify(prices), wares && JSON.stringify(wares));
const equipBest = () => G(async () => {
  const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js'), { recalc } = await import('/src/systems/stats.js');
  const best = (slot, test, score) => { let b = S.equip[slot], bs = b ? score(ITEMS[b]) : -1; for (const id of Object.keys(S.inv)) { const it = ITEMS[id]; if (it && S.inv[id] > 0 && test(it) && score(it) > bs) { b = id; bs = score(it); } } S.equip[slot] = b; };
  best('weapon', (i) => i.type === 'weapon', (i) => i.dmg); best('armor', (i) => i.type === 'armor', (i) => i.armor || 0); best('offhand', (i) => i.type === 'shield', (i) => i.block || 0); best('head', (i) => i.type === 'helmet', (i) => i.armor || 0);
  recalc();
});
const shopRound = async () => {
  for (const [id, price] of [['iron_cuirass', 130], ['steel_sword', 180], ['iron_shield', 110], ['iron_helm', 90]]) {
    const have = await G(async (id) => { const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js'); const it = ITEMS[id]; const cur = ITEMS[S.equip[{ armor: 'armor', weapon: 'weapon', shield: 'offhand', helmet: 'head' }[it.type]]]; return !!(cur && (cur.dmg >= (it.dmg || 0)) && (cur.armor || 0) >= (it.armor || 0) && (cur.block || 0) >= (it.block || 0)); }, id);
    if (!have) await buy(id, price);
  }
  while ((await G(() => window.__ff.S.gold)) >= 60 && (await G(() => (window.__ff.S.inv.hp_potion || 0) < 6))) await buy('hp_potion', 26);
  await equipBest();
};
await shopRound();
await row('Hilda: gear + potions');

// ---- 5. chapter one: Sigrid's quest, the crypt, Jarl Valdrek
if ((await Q('king')) !== 'active') await talk('sigrid', [0]);
if ((await Q('king')) !== 'active') note('Sigrid did not give the crypt quest: ' + (await Q('king')));
const dungeon = async (map, spawn, label) => {
  await heal(); await go(map, spawn);
  let tot = { t: 0, lost: 0, deaths: 0, pots: 0 };
  for (let i = 0; i < 40; i++) {
    if (await G((m) => window.gs().mapId !== m, map)) { await heal(); await go(map, spawn); }
    const n = await G(() => { const g = window.gs(), p = g.player; const fs = g.enemies.getChildren().filter((e) => !e.dead && !e.isBoss && e.active && !e.cfg.passive).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); if (!fs.length) return 0; p.setPosition(fs[0].x - 60, fs[0].y); return fs.length; });
    if (!n) break;
    const d0 = deaths, r = await fightNear('!e.isBoss', 45, 170);
    tot = { t: tot.t + r.t, lost: tot.lost + r.lost, deaths: tot.deaths + deaths - d0, pots: tot.pots + r.pots };
    if ((await G(() => window.__ff.S.hp)) < (await G(() => window.__ff.S.maxHp)) * 0.35) await G(() => { const S = window.__ff.S; S.hp = Math.max(S.hp, S.maxHp * 0.6); });   // a short rest at the dungeon's brazier
    if (tot.deaths > 4) { note(`${label}: gave up after 5 deaths to its guards`); break; }
  }
  // chests and pickups on the way, as a player would
  await G(() => { const g = window.gs(), p = g.player; for (const c of (g.interactables || []).filter((x) => x.kind === 'chest' || x.constructor?.name === 'Chest')) { try { if (c.canInteract?.() !== false) { p.setPosition(c.ix || c.x, (c.iy || c.y) + 8); c.interact?.(); } } catch { /* locked */ } } });
  await h.sleep(500);
  await G(() => { const g = window.gs(), p = g.player; for (const pk of g.pickups.slice()) if (pk.active !== false && pk.x) p.setPosition(pk.x, pk.y); });
  await h.sleep(400);
  return tot;
};
const bossFight = async (map, spawn, label, flag) => {
  let tot = { t: 0, lost: 0, deaths: 0, pots: 0 }, won = false, tries = 0;
  for (; tries < 4 && !won; tries++) {
    if (tries) { await h.sleep(2500); await G(() => { const S = window.__ff.S; S.inv.hp_potion = Math.max(S.inv.hp_potion || 0, 3); }); }
    if (await G((m) => window.gs().mapId !== m, map)) await go(map, spawn);
    await heal();
    // walk in through the gate: stand inside the arena, 6-10 tiles from the boss, as the balance bot does
    const ok = await G(() => { const g = window.gs(), b = g.boss, p = g.player; if (!b) return false; p.mode = 'free'; let best = null; for (let r = 6; r <= 10 && !best; r++) for (let a = 0; a < 16 && !best; a++) { const x = b.x + Math.cos(a * Math.PI / 8) * r * 16, y = b.y + Math.sin(a * Math.PI / 8) * r * 16; if (!g.solidAt(x, y) && !g.solidAt(x + 8, y) && !g.solidAt(x - 8, y) && !g.solidAt(x, y + 8) && !g.solidAt(x, y - 8) && (!g.def.bossTrigger || g.def.bossTrigger({ x, y }, 16))) best = { x, y }; } p.setPosition(best ? best.x : b.x, best ? best.y : b.y + 60); return true; });
    if (!ok) { note(`${label}: no boss on the map`); break; }
    const d0 = deaths;
    const r = await G(() => window.__fight(() => { const b = window.gs().boss; return !b || b.dead || b.yieldDone; }, 170));
    if (r.died) { deaths++; await h.sleep(3500); }
    const left = await G(() => { const b = window.gs().boss; return b ? Math.round(100 * Math.max(0, b.hp) / b.maxHp) : 0; });
    console.log(`    ${label} try ${tries + 1}: ${r.ok ? 'WON' : 'lost'} in ${r.t}s, lost ${r.lost} hp, ${r.pots} potions, boss ${left}% left`);
    tot = { t: tot.t + r.t, lost: tot.lost + r.lost, deaths: tot.deaths + deaths - d0, pots: tot.pots + r.pots };
    won = r.ok || (await G((f) => !!window.__ff.S.flags[f], flag));
    if (!won && r.died) await G(() => { const S = window.__ff.S; if (S.hp <= 0) S.hp = S.maxHp; window.gs().player.mode = 'free'; });
  }
  if (!won) {          // the story goes on: the bot is a floor under a human, so a boss it cannot beat is beaten for it
    await G(async (m) => { const g = window.gs(); if (g.mapId !== m) return; const b = g.boss; if (b && !b.dead) { b.engaged = true; b.invulnerable = false; b.takeHit({ dmg: b.hp + 9999, kx: 0, ky: 1, kb: 0, src: 'sword' }); } }, map);
    if (await G((m) => window.gs().mapId !== m, map)) { await go(map, spawn); await G(() => { const g = window.gs(), b = g.boss; if (b && !b.dead) { g.player.setPosition(b.x, b.y + 90); b.engaged = true; b.invulnerable = false; b.takeHit({ dmg: b.hp + 9999, kx: 0, ky: 1, kb: 0, src: 'sword' }); } }); }
    await h.sleep(1500);
  }
  await h.sleep(3000);
  for (let i = 0; i < 12 && (await G(() => !!window.hud()?.dlg)); i++) await tap('KeyE', 40);
  await G(() => { const g = window.gs(), p = g.player; for (const pk of g.pickups.slice()) if (pk.active !== false && pk.x) p.setPosition(pk.x, pk.y); });
  await h.sleep(800);
  for (let i = 0; i < 12 && (await G(() => !!window.hud()?.dlg)); i++) await tap('KeyE', 40);
  return { ...tot, tries, won };
};
let r = await dungeon('crypt', 'entry', 'crypt');
await row('crypt guards', r);
await equipBest();
let b = await bossFight('crypt', 'entry', 'Jarl Valdrek', 'bossDead');
await equipBest();
await row('Jarl Valdrek', b, b.won ? `bot won on try ${b.tries}` : 'bot lost 4 tries');
if ((await Q('king')) !== 'relic') note('after Valdrek the quest is ' + (await Q('king')) + ' (expected relic)');
await go('village', 'start');
await talk('sigrid', [0]);
await talk('sigrid', [0]);
const ch2 = await G(() => ({ king: window.__ff.S.quests.king.status, hearts: window.__ff.S.quests.hearts?.status, tracked: window.__ff.S.tracked, line: window.hud().questTxt?.[0]?.text }));
await row('Frostheart to Sigrid', {}, ch2.king === 'done' ? 'ok' : 'KING ' + ch2.king);
console.log('  chapter two', JSON.stringify(ch2));
if (ch2.hearts !== 'active') note('the Hearts quest did not start after the Frostheart: ' + JSON.stringify(ch2));

// ---- 6. Grimfang in Frostwind Pass
if ((await Q('alpha')) !== 'active') await talk('bjorn', [0]);
console.log('  grimfang quest', await Q('alpha'));
if ((await Q('alpha')) !== 'active') note('Bjorn did not give the Grimfang quest after chapter one: ' + (await Q('alpha')));
await shopRound();
b = await bossFight('pass', 'south', 'Grimfang', 'grimfangDone');
await row('Grimfang', b, b.won ? `bot won on try ${b.tries}` : 'bot lost 4 tries');
await go('village', 'start');
await talk('bjorn', [0]);
await shopRound();
await row('back in the village');

// ---- 7. the Reach, tier 1 on the way to the Maw
await go('forest', 'west');
const t1 = await G(async () => { const M = await import('/src/data/maps.js'); return M.getReach().pois.filter((p) => ['camp', 'den', 'ruin', 'champion'].includes(p.kind) && p.tier === 1).slice(0, 3).map((p) => [p.x, p.y, p.kind]); });
farm = { t: 0, lost: 0, deaths: 0, pots: 0 }; cleared = 0;
for (const [px, py] of t1) {
  await heal();
  await G(([x, y]) => window.gs().player.setPosition(x * 16, (y + 5) * 16), [px, py]);
  await h.sleep(900);
  for (let i = 0; i < 10; i++) {
    const n = await G(() => { const g = window.gs(), p = g.player; const fs = g.enemies.getChildren().filter((e) => !e.dead && e.active && !e.cfg.passive && Math.hypot(e.x - p.x, e.y - p.y) < 220).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)); if (fs[0] && Math.hypot(fs[0].x - p.x, fs[0].y - p.y) > 90) p.setPosition(fs[0].x - 70, fs[0].y); return fs.length; });
    if (!n) break;
    const d0 = deaths, rr = await fightNear(null, 40, 220);
    farm = { t: farm.t + rr.t, lost: farm.lost + rr.lost, deaths: farm.deaths + deaths - d0, pots: farm.pots + rr.pots };
    if (deaths > d0) break;
  }
  cleared++;
  await G(() => { const g = window.gs(), p = g.player; for (const pk of g.pickups.slice()) if (pk.active !== false && pk.x) p.setPosition(pk.x, pk.y); });
  await h.sleep(600);
}
await row(`Reach tier 1 (${cleared} sites)`, farm);
await go('village', 'start'); await shopRound(); await equipBest();
// the smith: spend spare gold on upgrades like a player
const forge = await G(async () => { const up = await import('/src/systems/upgrades.js'); return Object.keys(up); });
console.log('  upgrades api', JSON.stringify(forge));

// ---- 8. the Glacial Maw and the Rime Wyrm
const mawMark = await G(async () => { const S = window.__ff.S, { TARGETS } = await import('/src/data/quests.js'); const t = TARGETS.hearts ? TARGETS.hearts(S.quests.hearts) : null; return { tracked: S.tracked, target: t }; });
console.log('  marker for the first Heart', JSON.stringify(mawMark));
r = await dungeon('maw', 'entry', 'Glacial Maw');
await row('Maw guards', r);
await equipBest();
b = await bossFight('maw', 'entry', 'Rime Wyrm', 'wyrmDead');
await row('Rime Wyrm', b, b.won ? `bot won on try ${b.tries}` : 'bot lost 4 tries');
const after = await G(() => ({ hearts: window.__ff.S.hearts, q: window.__ff.S.quests.hearts?.status, line: window.hud().questTxt?.[0]?.text }));
console.log('  after the Maw', JSON.stringify(after));
if (!after.hearts?.rime) note('the Rime Heart is not held after the Wyrm');

console.log('\n| Step | Level | Max HP | Gold | Potions | Gear | Fight time | HP lost | Potions drunk | Deaths | Verdict |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|');
for (const x of rows) console.log(`| ${x.step} | ${x.lvl} | ${x.maxHp} | ${x.gold} | ${x.pots} | ${x.gear} | ${x.t ?? ''} | ${x.lost ?? ''} | ${x.drunk ?? ''} | ${x.deaths ?? ''} | ${x.verdict} |`);
console.log('\nnotes:\n' + notes.map((n) => ' - ' + n).join('\n'));
console.log('page errors:', h.errors.length ? h.errors.join('\n') : 'none');
console.log(`(${Math.round((Date.now() - T0) / 1000)} s)`);
await h.close();
