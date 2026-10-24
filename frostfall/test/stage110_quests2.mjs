// WQ21 (second half): the new quest shapes in the Ashen Peaks (timed beacon relay), the Old Kingdom (a riddle), the Underdeep
// (a rescue), the Embergreen Vale (a trade chain) and the Sunscorch (a stealth theft). Each: the giver offers it, the world
// part works, a marker points at every step, the giver pays 450 gold and a rare piece of gear.
//   node test/stage110_quests2.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const wait = (ms) => h.sleep(ms);
async function stub() {
  const dlg = await import('/src/systems/dialogue.js'), real = dlg.dialogue.hud;
  window.__said = []; window.__pick = 0;
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async () => window.__pick, hideBox() {}, scene: real.scene };
  window.__talk = async (id) => { const D = await import('/src/data/dialogue.js'); await D.SCRIPTS[id](); };
}
const go = async (map, extra = '') => { await h.open(`scene=game&map=${map}&spawn=entry&seed=8919${extra}`); await wait(1500); await G(stub); };
const restart = async (map) => { await G((m) => window.__ff.game.scene.getScene('Game').scene.restart({ map: m, spawn: 'entry' }), map); await wait(1500); await G(stub); };
const target = (id) => G(async (q) => { const Q = await import('/src/data/quests.js'); return Q.TARGETS[q](window.__ff.S.quests[q]); }, id);
const goldItems = () => G(() => ({ g: window.__ff.S.gold, n: Object.keys(window.__ff.S.inv).length + (window.__ff.S.gear?.length || 0) }));

// ---- the Ashen Peaks: the beacons, each lit before the last burns down
await go('emberhold');
await G(async () => { await window.__talk('corvin'); });
await restart('ashen');
const ash0 = await G(() => { const sc = window.__ff.game.scene.getScene('Game'); return { n: sc.rqBeacons?.pts.length, st: window.__ff.S.quests.wallfires.status }; });
const t0 = await target('wallfires');
const lightNext = () => G(() => { const sc = window.__ff.game.scene.getScene("Game"), n = window.__ff.S.quests.wallfires.lit || 0, b = sc.rqBeacons.pts[n]; if (!b) return; sc.player.setPosition((b.x + 0.5) * 16, (b.y + 0.5) * 16 + 4); });
await lightNext(); await wait(400);
const lit1 = await G(() => ({ lit: window.__ff.S.quests.wallfires.lit, left: window.__ff.game.scene.getScene('Game').rqBeacons.left }));
await G(() => { const sc = window.__ff.game.scene.getScene('Game'); sc.player.setPosition(sc.player.x + 120, sc.player.y); sc.rqBeacons.left = 0.05; });       // walk off and let it burn down
await wait(400);
const out = await G(() => window.__ff.S.quests.wallfires.lit);
for (let i = 0; i < 4; i++) { await lightNext(); await wait(350); }
const ash = await G(() => ({ lit: window.__ff.S.quests.wallfires.lit, st: window.__ff.S.quests.wallfires.status }));
const tr = await target('wallfires');
const ag = await goldItems();
await G(async () => { await window.__talk('corvin'); });
const ag2 = await goldItems(), ashDone = await G(() => window.__ff.S.quests.wallfires.status);
check('WQ21 Ashen: Corvin\'s Wall Fires: four beacons with markers, a timer per leg that resets the line, Corvin pays 450 and gear',
  ash0.n === 4 && ash0.st === 'active' && t0.map === 'ashen' && lit1.lit === 1 && lit1.left > 15 && out === 0 && ash.lit === 4 && ash.st === 'ready' && tr.map === 'emberhold' && ashDone === 'done' && ag2.g - ag.g >= 450 && ag2.n > ag.n,
  JSON.stringify({ ash0, t0, lit1, out, ash, tr, ag, ag2, ashDone }));

// ---- the Old Kingdom: three verse-stones and the Scribe's riddle
await go('kingdom');
const before = await G(async () => { await window.__talk('scribe'); return window.__ff.S.quests.unfinishedverse.status; });      // the Scribe's own quest comes first
await G(async () => { await window.__talk('scribe'); });
await restart('kingdom');
const tv = await target('unfinishedverse');
const kin = await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, stones = sc.interactables.filter((i) => i.rqVerse);
  for (const s of stones) await s.interact();
  for (const s of stones) await s.interact();
  return { n: stones.length, verses: S.quests.unfinishedverse.verses, st: S.quests.unfinishedverse.status };
});
const wrong = await G(async () => { window.__pick = 0; await window.__talk('scribe'); return window.__ff.S.quests.unfinishedverse.status; });
const right = await G(async () => { window.__pick = 1; await window.__talk('scribe'); return window.__ff.S.quests.unfinishedverse.status; });
check('WQ21 Kingdom: the Scribe offers the riddle after his own quest; three verse-stones; a wrong answer waits, the right one pays',
  before === 'inactive' && tv.map === 'kingdom' && kin.n === 3 && kin.verses === 3 && kin.st === 'ready' && wrong === 'ready' && right === 'done', JSON.stringify({ before, tv, kin, wrong, right }));

// ---- the Underdeep: three lamp-carriers, each guarded
await go('lanternfall');
await G(async () => { await window.__talk('fall_watch'); });
await restart('underdeep');
const tl = await target('lampsdeep');
const deep = await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, lamps = sc.interactables.filter((i) => i.label?.() === 'E: RELIGHT THE LAMP');
  const foes = lamps.reduce((n, l) => n + l.foes.length, 0);
  lamps[0].interact(); await new Promise((r) => setTimeout(r, 300));
  const guarded = S.quests.lampsdeep.saved || 0;
  for (const l of lamps) for (const e of l.foes) { e.dead = true; e.setActive(false).setVisible(false); }
  for (const l of lamps) { l.interact(); await new Promise((r) => setTimeout(r, 300)); }
  return { n: lamps.length, foes, guarded, saved: S.quests.lampsdeep.saved, st: S.quests.lampsdeep.status };
});
const deepDone = await G(async () => { await window.__talk('fall_watch'); return window.__ff.S.quests.lampsdeep.status; });
check('WQ21 Underdeep: Lamps in the Deep: three guarded lamp-carriers; none can be freed while foes stand; the Guard pays',
  tl.map === 'underdeep' && deep.n === 3 && deep.foes >= 6 && deep.guarded === 0 && deep.saved === 3 && deep.st === 'ready' && deepDone === 'done', JSON.stringify({ tl, deep, deepDone }));

// ---- the Vale: One Good Turn, a trade chain round Greenhollow
await go('greenhollow');
const vale = await G(async () => {
  const S = window.__ff.S, steps = [];
  await window.__talk('vale_watch'); steps.push(S.quests.goodturn.step);
  await window.__talk('vale_gardener'); steps.push(S.quests.goodturn.step);
  await window.__talk('vale_beekeeper'); steps.push(S.quests.goodturn.step);
  return steps;
});
const ts = await target('goodturn');
await restart('vale');
await G(async () => { const sc = window.__ff.game.scene.getScene('Game'); await sc.interactables.find((i) => i.label?.() === 'E: PICK THE MEADOWSWEET')?.interact(); });
const picked = await G(() => window.__ff.S.quests.goodturn.step);
await restart('greenhollow');
const vale2 = await G(async () => {
  const S = window.__ff.S, out = [];
  await window.__talk('vale_beekeeper'); out.push(S.quests.goodturn.step);
  await window.__talk('vale_gardener'); out.push(S.quests.goodturn.status);
  await window.__talk('vale_watch'); out.push(S.quests.goodturn.status);
  return out;
});
check('WQ21 Vale: One Good Turn: watch -> Ash -> Orla -> a meadow sprig -> Orla -> Ash -> watch, with a marker on each',
  JSON.stringify(vale) === '[1,2,3]' && ts.map === 'vale' && picked === 4 && JSON.stringify(vale2) === '[5,"ready","done"]', JSON.stringify({ vale, ts, picked, vale2 }));

// ---- the Sunscorch: The Quiet Ledger
await go('amberwell');
const gated = await G(async () => { const S = window.__ff.S; await window.__talk('dune_guard'); const st = S.quests.quietledger.status; for (const k of Object.keys(S.quests)) if (/^raiders\d$/.test(k)) S.quests[k].status = 'done'; await window.__talk('dune_guard'); return st; });
await restart('sunscorch');
const tq = await target('quietledger');
const seen = await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), h = sc.rqHeist;
  h.sentries[0].alert(true); await new Promise((r) => setTimeout(r, 300));
  const box = sc.interactables.find((i) => /BARRED|LEDGER/.test(i.label?.() || '')); box.interact();
  return { n: h.sentries.length, barred: h.barred, st: window.__ff.S.quests.quietledger.status };
});
await restart('sunscorch');
const took = await G(async () => { const sc = window.__ff.game.scene.getScene('Game'); sc.interactables.find((i) => i.label?.() === 'E: LIFT THE LEDGER').interact(); return window.__ff.S.quests.quietledger.status; });
await restart('amberwell');
const sunDone = await G(async () => { await window.__talk('dune_guard'); return window.__ff.S.quests.quietledger.status; });
check('WQ21 Sunscorch: The Quiet Ledger: a seen theft bars the box until you come back; an unseen one pays at Nadir (offered once his raider hunt is done)',
  gated === 'inactive' && tq.map === 'sunscorch' && seen.n >= 3 && seen.barred && seen.st === 'active' && took === 'ready' && sunDone === 'done', JSON.stringify({ gated, tq, seen, took, sunDone }));

await h.close();
console.log(failCount() ? 'STAGE 110 FAILED' : 'STAGE 110 PASSED');
