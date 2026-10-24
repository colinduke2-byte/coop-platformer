// Combat finish: CB13 bestiary crush line, CB24 heavy descriptions, VX-05 folded WEAK / RESIST numbers, perfect-dodge
// slow motion on enemy zones and tweens, the nemesis keyed by id.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);

// ---- CB13: the bestiary warns about shield crushers
const cr = await G(async () => {
  const M = await import('/src/entities/enemyMoves.js'), { ENEMIES } = await import('/src/data/enemies.js');
  return { bear: M.crushNote('bear', ENEMIES.bear), mosshulk: M.crushNote('mosshulk', ENEMIES.mosshulk), chief: M.crushNote('chief', ENEMIES.chief), wolf: M.crushNote('wolf', ENEMIES.wolf), archer: M.crushNote('archer', ENEMIES.archer) };
});
check('CB13: crushers (bear, mosshulk) and crushing second moves (bandit chief) get a bestiary line; wolves and archers do not', /^CRUSHES SHIELDS/.test(cr.bear) && /^CRUSHES SHIELDS/.test(cr.mosshulk) && /^CAN CRUSH SHIELDS/.test(cr.chief) && !cr.wolf && !cr.archer, JSON.stringify(cr));
// ---- CB24: every weapon's description says what its heavy does
const hv = await G(async () => {
  const { ITEMS } = await import('/src/data/items.js'), GL = await import('/src/systems/genloot.js'), out = {};
  const weapons = Object.entries(ITEMS).filter(([, it]) => it.type === 'weapon' || it.type === 'weapon2h');
  out.missing = weapons.filter(([, it]) => !/heavy/i.test(it.desc || '')).map(([id]) => id);
  out.twice = weapons.filter(([, it]) => (it.desc.match(/heavy/gi) || []).length > 1).map(([id]) => id);
  out.sword = ITEMS.iron_sword.desc; out.knife = ITEMS.hunting_knife.desc; out.gs = ITEMS.iron_greatsword.desc; out.halberd = ITEMS.iron_halberd.desc; out.staff = ITEMS.hazel_staff.desc;
  let gen = null; for (let i = 0; i < 60 && !gen; i++) { const id = GL.makeGenItem(1); if (/weapon/.test(ITEMS[id].type)) gen = ITEMS[id].desc; }
  out.gen = gen;
  return out;
});
check('CB24: every weapon (fixed and generated) names its heavy once: sword overhead, dagger backstab, greatsword charge, halberd sweep, staff bolt', !hv.missing.length && !hv.twice.length && /overhead/.test(hv.sword) && /back/.test(hv.knife) && /charge/.test(hv.gs) && /sweep/.test(hv.halberd) && /frost bolt/.test(hv.staff) && /HEAVY: /.test(hv.gen || ''), JSON.stringify(hv));
// ---- CB22: the danger colour of a real foe counts its late pace
const dg = await G(async () => {
  const D = await import('/src/systems/danger.js'), g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.flags.sovereignDead = true; S.flags.hollowKingDead = true;
  const e = g.addEnemy('knight', g.player.x + 200, g.player.y, { tier: 3 }); const f = e.progressF;
  // a foe whose cost sits just under a band edge at pace 1 reads one band higher at its late pace
  const out = { f, same: D.dangerOfEnemy(e) === D.dangerOf(e.maxHp, e.cfg.dmg, f) };
  out.never = true; out.up = false;
  for (let hp = 5; hp < 3000; hp += 5) { const a = D.dangerOf(hp, 6, 0), b = D.dangerOf(hp, 6, f); if (b < a) out.never = false; if (b > a) out.up = true; }
  e.destroy(); return out;
});
check('CB22: a late foe\'s danger colour includes its faster attacks (never lower, a band up near each edge)', dg.f > 0.6 && dg.same && dg.up && dg.never, JSON.stringify(dg));
// ---- perfect-dodge slow motion: enemy zones, enemy tweens and enemy delayed blows slow down; the rest does not
await G(async () => {
  const B = await import('/src/entities/bulletTime.js'), g = window.__ff.game.scene.getScene('Game'), p = g.player;
  p.invuln = 99; window.__w = { fired: 0, plain: 0 };
  const e = g.addEnemy('draugr', p.x + 150, p.y + 100, { tier: 0 }); e.update = () => {}; window.__we = e;
  window.__wz = [g.zones.length, g.zones.length + 1];
  g.addZone(p.x + 120, p.y, 10, 1.0, 1, e); g.addZone(p.x - 120, p.y, 10, 1.0, 1, null);
  window.__wt = g.tweens.add({ targets: e, alpha: 0.2, duration: 1000 });
  window.__wc = { v: 0 }; window.__wct = g.tweens.add({ targets: window.__wc, v: 1, duration: 1000 });
  B.enemyTimer(g, 700, () => { window.__w.fired++; }); g.time.delayedCall(400, () => { window.__w.plain++; });
  B.startWarp(g, 0.3, 0.8);
});
await h.frames(30);
const sw = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), [a, b] = window.__wz, zo = g.zones[a], zn = g.zones[b];
  return { owned: zo?.t, plain: zn?.t, foeTween: window.__wt.progress, other: window.__wct.progress, fired: window.__w.fired, plainT: window.__w.plain, ts: window.__wt.timeScale };
});
for (let i = 0; i < 30 && (await G(() => window.__wt.timeScale)) !== 1; i++) await h.frames(10);     // a frozen frame (a tip) delays the end
const sw2 = await G(async () => { const g = window.__ff.game.scene.getScene('Game'), { ui } = await import('/src/systems/ui.js'); const r = { ts: window.__wt.timeScale, fired: window.__w.fired, holds: ui.holdTags?.() }; window.__we.destroy(); g.player.invuln = 0; return r; });
check('slow motion: an enemy zone, an enemy tween and an enemy delayed blow run at 0.3x; a weather zone, other tweens and timers do not', sw.owned > 0.8 && sw.plain < 0.6 && sw.foeTween < 0.25 && sw.other > 0.4 && sw.fired === 0 && sw.plainT === 1 && Math.abs(sw.ts - 0.3) < 1e-6, JSON.stringify(sw));
check('after the slow motion the enemy tween runs at full speed again', sw2.ts === 1, JSON.stringify(sw2));
// ---- VX-05: WEAK / RESIST fold into the damage number
const vx = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), fx = g.fx, { settings } = await import('/src/systems/settings.js');
  const e = g.addEnemy('draugr', g.player.x + 160, g.player.y + 60, { tier: 0 }); e.update = () => {}; e.maxHp = e.hp = 9999;
  const hit = (element, col) => { const d = e.takeHit({ dmg: 20, kx: 1, ky: 0, kb: 0, src: 'fire', element }); fx.text(e.x, e.y - 10, String(d), col); return fx.texts.at(-1); };
  const words = () => fx.texts.filter((o) => o.str === 'WEAK' || o.str === 'RESIST').length;
  const out = {};
  const w = hit('fire', 12); out.weak = { kind: w.kind, col: w.col, scale: w.t.main.scaleX, words: words() };
  for (const o of fx.texts.splice(0)) fx.freeText(o.t);
  const r = hit('frost', 15); out.resist = { kind: r.kind, col: r.col, font: r.t.main.font, words: words() };
  for (const o of fx.texts.splice(0)) fx.freeText(o.t);
  const n = hit(null, 6); out.plain = { kind: n.kind, scale: n.t.main.scaleX, font: n.t.main.font };
  for (const o of fx.texts.splice(0)) fx.freeText(o.t);
  settings.dmgNumbers = false; e.takeHit({ dmg: 20, kx: 1, ky: 0, kb: 0, src: 'fire', element: 'fire' }); out.offWords = words(); settings.dmgNumbers = true;
  e.destroy(); return out;
});
check('VX-05: a weak hit is a bigger orange number, a resisted one a small grey one, with no WEAK / RESIST word stacked on top', vx.weak.kind === 'weak' && vx.weak.col === 12 && vx.weak.scale === 2 && vx.weak.words === 0 && vx.resist.kind === 'resist' && [3, 4].includes(vx.resist.col) && vx.resist.font === 'fsmall' + vx.resist.col && vx.resist.words === 0 && vx.plain.kind === null && vx.plain.scale === 1 && vx.plain.font === 'f6', JSON.stringify(vx));
check('VX-05: with damage numbers off the WEAK word still shows', vx.offWords === 1, JSON.stringify(vx));
await G(() => { const g = window.__ff.game.scene.getScene('Game'), fx = g.fx, p = g.player; fx.markNum(p.x - 30, p.y - 20, 'weak'); fx.text(p.x - 30, p.y - 30, '42', 12, 3); fx.markNum(p.x, p.y - 20, 'resist'); fx.text(p.x, p.y - 30, '7', 15, 3); fx.text(p.x + 30, p.y - 30, '18', 6, 3); });
await h.frames(2); await h.shot('s114_numbers');
// ---- the nemesis card is keyed by the nemesis id, not by a name another foe shares
const card = async (killer) => {
  await G((k) => {
    const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, pl = g.player, hud = window.__ff.game.scene.getScene('Hud');
    window.__nemOld = g.def.stream; g.def.stream = true; S.charLevel = Math.max(3, S.charLevel || 1);
    const a = { kind: 'wolf', tier: 0, x: 5, y: 5, cfg: { name: 'Wolf' }, nemesis: k === 'nemesis' };
    pl.noteKiller(a); pl.lastHitBy = 'Wolf'; hud.deadShown = false; window.__hp = S.hp; S.hp = 0;
  }, killer);
  await h.frames(3);
  return G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, hud = window.__ff.game.scene.getScene('Hud'); const r = { text: hud.deadNem.text, kills: S.nemesis?.kills, id: S.nemesis?.id, mine: g.player.nemesisDeath }; S.hp = window.__hp; g.def.stream = window.__nemOld; return r; });
};
await G(() => { delete window.__ff.S.nemesis; });
const n1 = await card('first'), n2 = await card('sameName'), n3 = await card('nemesis');
await G(() => { delete window.__ff.S.nemesis; });
check('nemesis: the first killer becomes it (with an id) and the card says it remembers you', !!n1.id && n1.mine === n1.id && /REMEMBERS YOU/.test(n1.text), JSON.stringify(n1));
check('nemesis: another wolf with the same name does not feed it, and the card stays quiet', n2.kills === 1 && n2.mine === null && n2.text === '', JSON.stringify(n2));
check('nemesis: the nemesis itself grows stronger, and the card says so', n3.kills === 2 && n3.mine === n1.id && /GROWS STRONGER \(2\)/.test(n3.text), JSON.stringify(n3));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'FINISH COMBAT FAILED' : 'FINISH COMBAT PASSED');
