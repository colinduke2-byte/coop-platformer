import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; window.__ff.S.weather = 'snow'; window.__ff.S.time = 12 * 60; });
const arena = () => G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; const p = g.player; p.setPosition(300, 250); p.mode = 'free'; p.face = { x: 1, y: 0 }; p.invuln = 999; p.iframes = 0; p.stunT = 0; p.statuses = {}; const S = window.__ff.S; S.hp = S.maxHp; S.sp = S.maxSp; });

// ---- new weapons exist, have art and styles
const wp = await G(async () => {
  const I = (await import('/src/data/items.js')).ITEMS, T = (await import('/src/data/tuning.js')).TUNE.player, tx = window.__ff.game.textures;
  const out = {};
  for (const id of ['hand_axe', 'bearded_axe', 'hunting_spear', 'ash_spear', 'iron_mace', 'war_mace']) out[id] = !!I[id] && !!T.styles[I[id].style] && tx.exists('held_' + id) && tx.exists('icon_' + id);
  return out;
});
check('axes, spears and maces exist with icons, held sprites and move sets', Object.values(wp).every(Boolean), JSON.stringify(wp));

// ---- spear reach: hits a foe a sword cannot
const reach = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player; const out = {};
  for (const w of ['rusty_sword', 'hunting_spear']) {
    S.equip.weapon = w; S.inv[w] = 1;
    g.enemies.getChildren().forEach((e) => e.destroy());
    p.setPosition(300, 250); p.face = { x: 1, y: 0 };
    const e = g.addEnemy('draugr', 300 + 36, 250); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; e.statuses = {}; e.alerted = false;
    p.swing = null; p.comboT = 0; p.startSwing();
    for (let i = 0; i < 20; i++) { p.tickSwing(0.02); }
    out[w] = e.hp < e.maxHp;
    e.destroy();
  }
  S.equip.weapon = 'rusty_sword';
  return out;
});
check('a spear reaches a foe 36px away; a sword does not', reach.hunting_spear === true && reach.rusty_sword === false, JSON.stringify(reach));

// ---- mace breaks an armoured knight's guard faster than a sword
const mace = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player; const out = {};
  for (const w of ['rusty_sword', 'iron_mace']) {
    S.equip.weapon = w;
    g.enemies.getChildren().forEach((e) => e.destroy());
    p.setPosition(300, 250); p.face = { x: 1, y: 0 };
    const k = g.addEnemy('knight', 300 + 14, 250); k.cfg = { ...k.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; k.statuses = {}; k.alerted = true; k.openT = 0;
    p.swing = null; p.comboT = 0; p.startSwing(); for (let i = 0; i < 20; i++) { p.tickSwing(0.02); }
    const dmg = k.maxHp - k.hp; k.destroy();
    g.enemies.getChildren().forEach((e) => e.destroy());
    const e = g.addEnemy('warden', 300 + 14, 250); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; e.statuses = {}; e.alerted = true; e.face = { x: -1, y: 0 }; e.guardBroken = 0;
    p.swing = null; p.comboT = 0; p.startSwing(); for (let i = 0; i < 20; i++) { p.tickSwing(0.02); }
    out[w] = { hp: dmg, broken: e.guardBroken > 0 };
    e.destroy();
  }
  S.equip.weapon = 'rusty_sword';
  return out;
});
check('a mace breaks a knight\'s guard and bites through armour', mace.iron_mace.broken && !mace.rusty_sword.broken && mace.iron_mace.hp > mace.rusty_sword.hp, JSON.stringify(mace));

// ---- riposte after a parry
await arena();
const rip = await G(() => {
  const g = window.gs(), p = g.player, S = window.__ff.S; const R0 = Math.random; Math.random = () => 0.5;      // no damage noise, no crits
  const e = g.addEnemy('draugr', 300 + 14, 250); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; e.statuses = {}; e.alerted = true;
  p.onParry(e, e.x, e.y);
  const armed = p.riposteT > 0;
  e.stun = 0; const hp0 = e.hp; p.swing = null; p.comboT = 0; p.startSwing(); for (let i = 0; i < 20; i++) p.tickSwing(0.02);
  const first = hp0 - e.hp, used = p.riposteT === 0;
  e.hp = e.maxHp; e.stun = 0; e.statuses = {}; p.swing = null; p.comboT = 0; p.startSwing(); for (let i = 0; i < 20; i++) p.tickSwing(0.02);
  const second = e.maxHp - e.hp;
  Math.random = R0;
  return { armed, first, second, used };
});
check('a parry arms a riposte that hits much harder, once', rip.armed && rip.used && rip.first > rip.second * 1.4, JSON.stringify(rip));

// ---- guard crush
await arena();
const crush = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, I = (await import('/src/data/items.js')).ITEMS;
  S.equip.offhand = 'iron_shield'; S.inv.iron_shield = 1;
  p.invuln = 0; p.iframes = 0; p.mode = 'free'; p.blocking = true; p.blockT = 1; S.hp = S.maxHp; S.sp = S.maxSp;
  const bear = g.addEnemy('bear', p.x + 20, p.y); bear.cfg = { ...bear.cfg, speed: 0, chase: 0, detect: 0 };
  const a = (() => { p.hurt(20, p.x + 20, p.y, { attacker: bear }); return { blocking: p.blocking, sp: S.sp, hp: S.maxHp - S.hp }; })();
  p.invuln = 0; p.iframes = 0; p.blocking = true; p.blockT = 1; S.hp = S.maxHp; S.sp = S.maxSp;
  const wolf = g.addEnemy('wolf', p.x + 20, p.y); wolf.cfg = { ...wolf.cfg, speed: 0, chase: 0, detect: 0 };
  p.hurt(8, p.x + 20, p.y, { attacker: wolf });
  const b = { blocking: p.blocking };
  S.equip.offhand = null; bear.destroy(); wolf.destroy();
  return { a, b };
});
check('a bear crushes a raised shield; a wolf bounces off it', !crush.a.blocking && crush.a.sp < 90 && crush.b.blocking === true, JSON.stringify(crush));

// ---- stamina exhaustion
await arena();
const wind = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, m = await import('/src/systems/status.js');
  S.sp = 2; p.spend(50);
  const winded = !!p.statuses.winded, slow = m.statusMods(p).speed;
  return { winded, slow };
});
check('running dry of stamina leaves you winded (slower)', wind.winded && wind.slow < 0.9, JSON.stringify(wind));

// ---- armour weight
const weights = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S; const out = {};
  for (const a of ['hunter_garb', 'iron_cuirass', 'bulwark_plate']) { S.equip.armor = a; S.inv[a] = 1; const st = (await import('/src/systems/stats.js')).stats; const T = (await import('/src/data/tuning.js')).TUNE.player; out[a] = [st.weight(), T.weights[st.weight()].roll, T.weights[st.weight()].knock]; }
  S.equip.armor = 'fur_tunic';
  return out;
});
check('light armour rolls cheaply and slides; heavy rolls dearly and stands firm', weights.hunter_garb[1] < weights.iron_cuirass[1] && weights.iron_cuirass[1] < weights.bulwark_plate[1] && weights.bulwark_plate[2] < weights.hunter_garb[2], JSON.stringify(weights));

// ---- AI: flanking wolves take opposite sides
await arena();
const flank = await G(async () => {
  const g = window.gs(), p = g.player; const ws = [];
  for (let i = 0; i < 3; i++) { const w = g.addEnemy('wolf', p.x + 90 + i * 4, p.y + (i - 1) * 6); w.statuses = {}; w.alert(true); ws.push(w); }
  return 1;
});
await h.sleep(900);
const sides = await G(() => { const g = window.gs(); const s = g.enemies.getChildren().filter((e) => e.kind === 'wolf').map((e) => e.flankSide); return { s, mixed: new Set(s).size === 2 }; });
check('a wolf pack circles to both sides of you', sides.mixed, JSON.stringify(sides));

// ---- AI: shield wall
await arena();
await G(() => { const g = window.gs(), p = g.player; const a = g.addEnemy('knight', p.x + 100, p.y); const b = g.addEnemy('knight', p.x + 120, p.y); for (const e of [a, b]) { e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0 }; e.alert(true); } });
await h.sleep(900);
check('knights standing together form a shield wall (take less damage)', await G(() => window.gs().enemies.getChildren().filter((e) => e.kind === 'knight').every((e) => e.wallMul === 0.75)));

// ---- AI: a hurt bandit slips away and drinks
await arena();
const drink = await G(() => { const g = window.gs(), p = g.player; const b = g.addEnemy('bandit', p.x + 60, p.y); b.alert(true); b.hp = Math.round(b.maxHp * 0.2); window.__b = b; return true; });
await h.sleep(500);
await G(() => { const b = window.__b; b.stateT = 0.05; });
await h.sleep(900);
check('a badly hurt bandit flees, then drinks a healing draught', await G(() => window.__b.drank === true && window.__b.hp > window.__b.maxHp * 0.4), await G(() => JSON.stringify({ drank: window.__b.drank, hp: window.__b.hp, st: window.__b.state })));

// ---- nemesis
await arena();
const nem = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S;
  delete S.nemesis;
  const e = g.addEnemy('bear', p.x + 20, p.y); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0 };
  p.invuln = 0; p.iframes = 0; p.mode = 'free'; S.hp = 1; p.hurt(60, e.x, e.y, { attacker: e });
  const made = S.nemesis ? { kind: S.nemesis.kind, kills: S.nemesis.kills } : null;
  return { made, dead: p.mode === 'dead' };
});
check('the creature that kills you becomes your nemesis', nem.dead && nem.made && nem.made.kind === 'bear' && nem.made.kills === 1, JSON.stringify(nem));
await G(() => window.gs().scene.restart({ map: 'forest', spawn: 'west' }));
await h.sleep(1400);
const nem2 = await G(() => { const g = window.gs(), S = window.__ff.S; return { pend: g.pend.some((q) => q.spec && q.spec.nemesis), wp: !!S.flags.waypoint }; });
check('the nemesis waits in the world and a waypoint marks it', nem2.pend && nem2.wp, JSON.stringify(nem2));
const nem3 = await G(() => {
  const g = window.gs(), S = window.__ff.S, p = g.player; g.pend.length = 0; g.enemies.getChildren().forEach((e) => e.destroy());
  p.setPosition(400, 300); p.invuln = 999;
  const e = g.addEnemy('bear', 440, 300, { kind: 'bear', tier: 1, elite: true, nemesis: true, kills: 2 });
  const stats = { name: e.displayName, hp: e.maxHp, nem: e.nemesis };
  const gold0 = S.gold;
  e.takeHit({ dmg: 99999, kx: 1, ky: 0, kb: 0, src: 'melee' });
  return { stats, gone: !S.nemesis, gold: S.gold - gold0, slain: S.nemesisSlain };
});
check('defeating it pays gold and loot, and clears the grudge', nem3.gone && nem3.gold > 100 && nem3.slain === 1 && /Nemesis/.test(nem3.stats.name), JSON.stringify(nem3));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMBAT3 FAILED' : 'COMBAT3 PASSED');
