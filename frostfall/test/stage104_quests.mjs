// WQ21: the new quest shapes, played through: the Fens investigation, Skarn Hold's night defence, the Coast escort, and the
// Glasswood tracking quest. Each: the giver offers it, the world part works, the giver pays it.
//   node test/stage104_quests.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const go = async (map, extra = '') => { await h.open(`scene=game&map=${map}&spawn=entry&seed=8919${extra}`); await h.sleep(1500); await G(stub); };
async function stub() {
  const dlg = await import('/src/systems/dialogue.js'), real = dlg.dialogue.hud;
  window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async () => 0, hideBox() {}, scene: real.scene };
  window.__talk = async (id) => { const D = await import('/src/data/dialogue.js'); await D.SCRIPTS[id](); };
}
const kill = () => G(() => { const sc = window.__ff.game.scene.getScene('Game'); for (const e of sc.enemies.getChildren()) if (!e.dead && !e.cfg.passive) { e.dead = true; e.setActive(false).setVisible(false); } });
const wait = (ms) => h.sleep(ms);

// ---- the Fens: three clues, then the thief
await go('fens');
await G(async () => { await window.__talk('wick_watch'); });
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'fens', spawn: 'entry' }));
await wait(1500); await G(stub);
const fens = await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  const clues = sc.interactables.filter((i) => i.label?.() === 'E: LOOK CLOSER' && i.lines);
  for (const c of clues) await c.interact();
  const thief = sc.pend.find((p) => p.key === 'fens:rq_thief');
  const { markGone } = await import('/src/systems/bless.js'); markGone('fens:rq_thief', true);
  return { status: S.quests.lanternthief.status, n: clues.length, clues: S.quests.lanternthief.clues, thief: thief?.spec.named };
});
await wait(600);
const fens2 = await G(async () => { const S = window.__ff.S, g0 = S.gold; const st = S.quests.lanternthief.status; await window.__talk('wick_watch'); return { ready: st, done: S.quests.lanternthief.status, paid: S.gold - g0 }; });
check('WQ21 Fens: the Lantern-Warden gives the investigation; three clues lead to the thief; stopping him pays', fens.n === 3 && fens.clues === 3 && fens.thief === 'Oswin the Oil-Thief' && fens2.ready === 'ready' && fens2.done === 'done' && fens2.paid > 0, JSON.stringify({ fens, fens2 }));

// ---- the Glasswood: the prints and the Shardmother
await go('glasswood');
await G(async () => { await window.__talk('glade_watch'); window.__ff.game.scene.getScene('Game').scene.restart({ map: 'glasswood', spawn: 'entry' }); });
await wait(1500); await G(stub);
for (let i = 0; i < 6; i++) { await G(() => { const sc = window.__ff.game.scene.getScene('Game'), n = window.__ff.S.quests.glassprints.prints || 0, p = sc.rqPrints.pts[n]; sc.player.setPosition((p.x + 0.5) * 16, (p.y + 0.5) * 16); }); await wait(150); }
const glass = await G(() => { const sc = window.__ff.game.scene.getScene('Game'); return { prints: window.__ff.S.quests.glassprints.prints, stag: sc.enemies.getChildren().find((e) => e.displayName === 'The Shardmother')?.kind }; });
await G(async () => { const { markGone } = await import('/src/systems/bless.js'); markGone('glasswood:rq_stag', true); });
await wait(500);
const glass2 = await G(async () => { const S = window.__ff.S; const st = S.quests.glassprints.status; await window.__talk('glade_watch'); return { ready: st, done: S.quests.glassprints.status }; });
check('WQ21 Glasswood: six ringing prints lead to the Shardmother; putting her down finishes the hunt', glass.prints === 6 && glass.stag === 'glassstag' && glass2.ready === 'ready' && glass2.done === 'done', JSON.stringify({ glass, glass2 }));

// ---- the Coast: walk Sister Maren to the lighthouse
await go('coast');
await G(async () => { await window.__talk('salt_watch'); });
await wait(300);
await G(async () => { const M = await import('/src/data/maps.js'), sc = window.__ff.game.scene.getScene('Game'), R = await import('/src/world/regionquests.js'), L = R.lighthouse(); sc.player.setPosition((L.x + 0.5) * 16, (L.y + 2.5) * 16); });
await wait(1500);
const coast = await G(async () => { const S = window.__ff.S, st = S.quests.pilgrimlight.status; await window.__talk('salt_watch'); return { ready: st, done: S.quests.pilgrimlight.status, pilgrim: !!window.__ff.game.scene.getScene('Game').rqPilgrim }; });
check('WQ21 Coast: the pilgrim follows you, and reaching the lighthouse with her finishes the escort', coast.pilgrim && coast.ready === 'ready' && coast.done === 'done', JSON.stringify(coast));

// ---- Skarn Hold: three waves after dark
await go('skarnhold');
await G(async () => { await window.__talk('skarn_scout'); window.__ff.S.time = 23 * 60; });
for (let w = 0; w < 3; w++) { await wait(700); await kill(); await wait(900); }
const hold = await G(async () => { const S = window.__ff.S, st = S.quests.holdhearth.status, waves = S.quests.holdhearth.waves; await window.__talk('skarn_scout'); return { waves, ready: st, done: S.quests.holdhearth.status }; });
check('WQ21 Stormcrown: Asger\'s defence: three waves at Skarn Hold after dark, then he pays', hold.waves === 3 && hold.ready === 'ready' && hold.done === 'done', JSON.stringify(hold));

await h.close();
console.log(failCount() ? 'STAGE 104 FAILED' : 'STAGE 104 PASSED');
