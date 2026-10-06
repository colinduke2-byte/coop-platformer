import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const TALK = (name) => G(async (n) => { await import('/src/data/emberhold.js'); await import('/src/data/hamlets.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);

// ---- every book on every map is a real book
const lore = await G(async () => {
  const M = await import('/src/data/maps.js'), L = await import('/src/data/lore.js'), St = window.__ff.S, bad = [], seen = new Set();
  const scan = (id, b) => { for (const e of b.entities) if (e.t === 'lore') { seen.add(e.id); if (!L.LORE[e.id]) bad.push(`${id}:${e.id}`); else if (!L.LORE[e.id].title || !L.LORE[e.id].text.length) bad.push(`${id}:${e.id}:empty`); } };
  for (const seed of [2, 424242, 99999]) { St.seed = seed; scan('reach', M.getReach()); for (const r of ['ashen', 'coast', 'kingdom']) scan(r, M.getRegion(r)); for (let f = 0; f < 3; f++) scan('mines' + f, M.getMines(f)); scan('forge', M.getForge()); scan('tide', M.getTidebreak()); scan('sep', M.getSepulchre()); }
  St.seed = 424242;
  for (const id of Object.keys(M.MAPS)) { try { if (!M.MAPS[id].build) continue; if (/^(forest|ashen|coast|kingdom)$|^mines|^forge$|^tidebreak$|^sepulchre$/.test(id)) continue; scan(id, M.MAPS[id].build()); } catch (e) { bad.push(id + ' threw ' + e.message); } }
  return { bad, books: seen.size };
});
check('every book placed anywhere in the world has real text (Reach, regions, city, mines, delves)', lore.bad.length === 0 && lore.books >= 12, JSON.stringify(lore));

// ---- the five side-quest chains
const SIDE = {
  hamlets: { giver: 'bjorn', pre: () => { const S = window.__ff.S; S.quests.wolves.status = 'done'; }, done: () => { const S = window.__ff.S; S.flags.metTrapper = S.flags.metFisher = S.flags.metProspector = true; }, check: (S) => !!S.inv.gem_topaz },
  denmother: { giver: 'bjorn', pre: () => { window.__ff.S.flags.grimfangDone = true; window.__ff.S.quests.hamlets.status = 'done'; }, done: () => { const S = window.__ff.S; S.bounty = { ...S.bounty, den0: true, den1: true, den2: true }; }, check: (S) => !!S.inv.ash_spear },
  circles: { giver: 'sigrid', pre: () => { const S = window.__ff.S; S.hearts = { rime: true }; S.quests.king.status = 'done'; S.flags.ending = null; S.flags.finale = false; S.quests.hearts.status = 'active'; }, done: () => { const S = window.__ff.S; S.shrines = { standing0: 'x', standing1: 'x', standing2: 'x' }; }, check: (S) => S.inv.gem_amber === 2 },
  barrows3: { giver: 'mirra', pre: () => { window.__ff.S.quests.herbs.status = 'done'; }, done: () => { const S = window.__ff.S; S.bounty = { ...S.bounty, barrow0: true, barrow3: true, barrow5: true }; }, check: (S) => S.inv.berserker_draught === 2 },
  towerwatch: { giver: 'guard', pre: () => { window.__ff.S.quests.wolves.status = 'done'; }, done: () => { const S = window.__ff.S; S.bounty = { ...S.bounty, tower0: true, tower1: true, tower2: true }; }, check: (S) => !!S.inv.gem_onyx },
};
for (const [id, d] of Object.entries(SIDE)) {
  await G((f) => { const S = window.__ff.S; S.gold = 0; S.inv = {}; S.bounty = {}; S.shrines = {}; for (const k of ['metTrapper', 'metFisher', 'metProspector']) S.flags[k] = false; eval('(' + f + ')()'); }, d.pre.toString());
  await G((i) => { window.__ff.S.quests[i].status = 'inactive'; }, id);
  await stub([0]); await TALK(d.giver);
  const offered = await G((i) => window.__ff.S.quests[i].status, id);
  await unstub();
  await G((f) => eval('(' + f + ')()'), d.done.toString());
  await stub([]); await TALK(d.giver);
  const after = await G(([i]) => { const S = window.__ff.S; return { q: S.quests[i].status, gold: S.gold, inv: { ...S.inv } }; }, [id]);
  await unstub();
  const rewarded = await G((a) => { const S = window.__ff.S; return eval('(' + a + ')')(S); }, d.check.toString());
  check(`"${id}": offered, counted and rewarded`, offered === 'active' && after.q === 'done' && after.gold >= 200 && rewarded, JSON.stringify({ offered, after }));
}
const sq = await G(async () => { const Q = await import('/src/data/quests.js'); return ['hamlets', 'circles', 'barrows3', 'denmother', 'towerwatch'].map((id) => [id, Q.QUESTS[id].short().length > 5, typeof Q.TARGETS[id]]); });
check('the side quests report progress and have map markers', sq.every(([, ok, t]) => ok && t === 'function'), JSON.stringify(sq));

// ---- Pell the scout
await G(async () => { const S = window.__ff.S; S.follower = false; S.companion = null; S.rep = { anvil: 0, delvers: 30, wardens: 0 }; S.quests.silence.status = 'done'; window.gs().changeMap('emberhold', 'gate', 'door'); });
await h.sleep(2000);
const pre = await G(() => ({ npc: window.gs().npcs.some((n) => n.id === 'pell'), f: !!window.gs().follower }));
await stub([0]); await TALK('pell'); await unstub();
await h.sleep(500);
const post = await G(() => { const g = window.gs(), S = window.__ff.S; return { follower: g.follower?.kind, companion: S.companion, npc: g.npcs.some((n) => n.id === 'pell'), inter: g.interactables.includes(g.follower), flag: S.follower }; });
check('Pell joins you from the city, leaving his post and walking at your heels', pre.npc && !pre.f && post.follower === 'pell' && post.companion === 'pell' && !post.npc && post.inter && post.flag, JSON.stringify({ pre, post }));
const gold = await G(async () => { const S = window.__ff.S, ST = await import('/src/systems/stats.js'); const withPell = ST.stats.mul('goldMul'); S.companion = 'ragna'; const ragna = ST.stats.mul('goldMul'); S.companion = 'pell'; return { withPell, ragna }; });
check('Pell finds a little extra gold (+10%)', Math.abs(gold.withPell - 1.1) < 0.001 && gold.ragna === 1, JSON.stringify(gold));
const fight = await G(async () => {
  const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.player.invuln = 999;
  const e = g.addEnemy('draugr', g.follower.x + 50, g.follower.y); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; e.alert(true); g.follower.cd = 0;
  const hp0 = e.hp;
  for (let i = 0; i < 90; i++) { g.follower.update(1 / 30, g.player); await new Promise((r) => setTimeout(r, 12)); }
  return { lost: hp0 - e.hp, near: Math.hypot(g.follower.x - e.x, g.follower.y - e.y) };
});
check('Pell darts in and stabs enemies (melee, not arrows)', fight.lost >= 9 && fight.near < 40, JSON.stringify(fight));
await G(() => window.__ff.keys._press('Space')); await G(() => window.__ff.keys._release('Space'));
await stub([0]);                                   // "Wait here in Emberhold"
await G(async () => { const g = window.gs(); await g.follower.interact(); });
await unstub();
await h.sleep(500);
const sent = await G(() => { const g = window.gs(), S = window.__ff.S; return { f: !!g.follower, flag: S.follower, npc: g.npcs.some((n) => n.id === 'pell') }; });
check('talking to Pell lets you send him home, and he is back at his post', !sent.f && !sent.flag && sent.npc, JSON.stringify(sent));
// swap with Ragna
await G(async () => { const { setCompanion } = await import('/src/systems/companion.js'); window.__set = setCompanion; const S = window.__ff.S; setCompanion('ragna'); });
await h.sleep(400);
const r1 = await G(() => ({ k: window.gs().follower?.kind }));
await G(() => window.__set('pell')); await h.sleep(400);
const r2 = await G(() => ({ k: window.gs().follower?.kind, n: window.gs().enemies ? 1 : 0, c: window.__ff.S.companion }));
check('hiring a companion replaces the one you had', r1.k === 'ragna' && r2.k === 'pell' && r2.c === 'pell', JSON.stringify({ r1, r2 }));
await h.shot('s47_pell');
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'CAMPAIGN FAILED' : 'CAMPAIGN PASSED');
