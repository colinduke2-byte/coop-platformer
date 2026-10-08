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
const SCRIPT = (name) => G(async (n) => { await import('/src/data/hamlets.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);

// ---- the new terrain exists and looks distinct
const tiles = await G(async () => {
  const CF = await import('/src/config.js'), tex = window.__ff.game.textures.get('tiles').getSourceImage(), T = CF.T, sig = [];
  const cv = document.createElement('canvas'); cv.width = tex.width; cv.height = tex.height; const x = cv.getContext('2d'); x.drawImage(tex, 0, 0);
  for (let i = 0; i < CF.TILE_COUNT; i++) { const d = x.getImageData(i * T, 0, T, T).data; let h = 0; for (let k = 0; k < d.length; k += 4) h = (h * 31 + d[k] + d[k + 1] * 3 + d[k + 2] * 7 + d[k + 3]) >>> 0; sig.push(h); }
  const fresh = ['ASH', 'BASALT', 'LAVA', 'ICESHELF', 'PACKICE', 'SHINGLE', 'WRECK', 'MARBLE', 'RUINWALL', 'MOSS'].map((k) => CF.TILE[k]);
  return { n: CF.TILE_COUNT, distinct: new Set(sig).size, solid: ['BASALT', 'LAVA', 'PACKICE', 'WRECK', 'RUINWALL'].every((k) => CF.SOLID_TILES.includes(CF.TILE[k])), walk: ['ASH', 'ICESHELF', 'SHINGLE', 'MARBLE', 'MOSS'].every((k) => !CF.SOLID_TILES.includes(CF.TILE[k])), fresh: fresh.every((id) => id < CF.TILE_COUNT) };
});
check('ten new terrain tiles are drawn, distinct, and solid or walkable as intended', tiles.n === 49 && tiles.distinct === 49 && tiles.solid && tiles.walk && tiles.fresh, JSON.stringify(tiles));

// ---- each region builds, is reachable, and has what it promises
const gen = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), WG = await import('/src/world/worldgen.js'), St = window.__ff.S, solid = new Set(CF.SOLID_TILES), out = [];
  for (const seed of [2, 77, 424242, 31337, 99999]) for (const rid of ['ashen', 'coast', 'kingdom']) {
    St.seed = seed; const t0 = performance.now(), b = M.getRegion(rid), ms = Math.round(performance.now() - t0), def = WG.REGION_DEFS[rid], st = def.start;
    const seen = new Uint8Array(b.w * b.h), q = [[st.x, st.y]]; seen[st.y * b.w + st.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const near = (p) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (seen[(p.y + dy) * b.w + p.x + dx]) return true; return false; };
    const k = {}; b.pois.forEach((p) => { k[p.kind] = (k[p.kind] || 0) + 1; });
    out.push({ seed, rid, w: b.w, h: b.h, ms, k, stranded: b.pois.filter((p) => !near(p)).map((p) => p.id), entry: b.entities.some((e) => e.t === 'spawn' && e.name === 'entry'), exit: b.entities.find((e) => e.t === 'exit' && e.x === 3)?.to, roam: b.entities.filter((e) => e.t === 'roamboss').length, ids: b.pois.every((p) => p.id.startsWith(rid + '_')) });
  }
  St.seed = 424242; return out;
});
check('every region builds on every seed with an entrance, a road home and region-prefixed places', gen.every((r) => r.entry && r.exit && r.ids && r.w >= 160 && r.ms < 1200), JSON.stringify(gen.filter((r) => !(r.entry && r.exit && r.ids && r.ms < 1200))));
check('all of their places can be walked to', gen.every((r) => r.stranded.length === 0), JSON.stringify(gen.filter((r) => r.stranded.length).map((r) => [r.seed, r.rid, r.stranded])));
const need = { ashen: { city: 1, forge: 1, kingroad: 1, foundry: 3, cave: 2, camp: 4, rest: 6 }, coast: { tidebreak: 1, lighthouse: 1, wreck: 3, cave: 2, camp: 3, hamlet: 2, rest: 6 }, kingdom: { sepulchre: 1, courtyard: 4, cave: 2, champion: 3, rest: 6 } };
const lacking = gen.flatMap((r) => Object.entries(need[r.rid]).filter(([kind, n]) => (r.k[kind] || 0) < n).map(([kind, n]) => `${r.seed}/${r.rid}/${kind}<${n}`));
check('each region holds its own kinds of place (foundries, wrecks, lighthouses, courtyards, boss dungeons...)', lacking.length === 0, JSON.stringify(lacking.slice(0, 8)));
check('every region has a roaming world boss', gen.every((r) => r.roam >= 1), JSON.stringify(gen.map((r) => [r.rid, r.roam]).slice(0, 6)));

// ---- the gates between regions
const gates = await G(async () => {
  const M = await import('/src/data/maps.js'), St = window.__ff.S, C3 = await import('/src/data/chapter3.js'), R = await import('/src/data/regions.js');
  St.seed = 424242; const reach = M.getReach(), ash = M.getRegion('ashen'), coast = M.getRegion('coast'), king = M.getRegion('kingdom');
  const cr = reach.entities.find((e) => e.t === 'exit' && e.to === 'coast'), kr = ash.entities.find((e) => e.t === 'exit' && e.to === 'kingdom');
  const back = { coast: coast.entities.find((e) => e.t === 'exit' && e.to === 'forest')?.spawn, king: king.entities.find((e) => e.t === 'exit' && e.to === 'ashen')?.spawn };
  const sp = { coast: reach.entities.some((e) => e.t === 'spawn' && e.name === 'coastroad'), king: ash.entities.some((e) => e.t === 'spawn' && e.name === 'kingroad') };
  St.flags.regions = {}; St.flags.chapter3 = false; St.flags.sovereignDead = false;
  const locked = R.unlockedRegions().join();
  St.flags.chapter3 = true; C3.startChapter3 ? 0 : 0; R.unlockRegion('ashen'); R.unlockRegion('coast'); R.unlockRegion('kingdom');
  return { cr: cr?.needs, kr: kr?.needs, back, sp, locked, all: R.unlockedRegions().join(), g1: C3.GATES.sovereignDead.ok(), reachGate: reach.pois.some((p) => p.kind === 'coastroad' && p.x > 200 && p.y > 120) };
});
check('the Coast road opens with Chapter 3, the Old Road only once the First Fire is answered', gates.cr === 'chapter3' && gates.kr === 'sovereignDead' && !gates.g1 && gates.reachGate && gates.locked === 'reach,fens,highlands', JSON.stringify(gates));
check('each road home lands on a matching spawn', gates.back.coast === 'coastroad' && gates.back.king === 'kingroad' && gates.sp.coast && gates.sp.king && gates.all === 'reach,ashen,coast,kingdom,fens,highlands', JSON.stringify(gates));

// ---- caves and boss dungeons
const delves = await G(async () => {
  const M = await import('/src/data/maps.js'), St = window.__ff.S, out = [];
  for (const rid of ['ashen', 'coast', 'kingdom']) {
    const b = M.getRegion(rid);
    for (const p of b.pois.filter((q) => q.kind === 'cave')) { const m = M.MAPS[p.id]; const d = m?.build(); out.push({ id: p.id, ok: !!d, back: d?.entities.some((e) => e.t === 'exit' && e.to === ({ ashen: 'ashen', coast: 'coast', kingdom: 'kingdom' })[rid] && e.spawn === p.id), spawn: b.entities.some((e) => e.t === 'spawn' && e.name === p.id), foes: d?.entities.filter((e) => e.t === 'enemy').length }); }
  }
  const tb = M.getTidebreak(), sp = M.getSepulchre();
  return { caves: out, tb: { boss: tb.entities.find((e) => e.t === 'boss')?.kind, exit: tb.entities.find((e) => e.t === 'exit')?.to, room: !!tb.bossRoom, foes: tb.entities.filter((e) => e.t === 'enemy').length }, sp: { boss: sp.entities.find((e) => e.t === 'boss')?.kind, exit: sp.entities.find((e) => e.t === 'exit')?.to, room: !!sp.bossRoom, foes: sp.entities.filter((e) => e.t === 'enemy').length } };
});
check('every cave builds, has foes, leads home and has a matching door spawn', delves.caves.length >= 6 && delves.caves.every((c) => c.ok && c.back && c.spawn && c.foes >= 4), JSON.stringify(delves.caves));
check('Tidebreak Cavern ends in Admiral Veyl and the Sepulchre in the Hollow King', delves.tb.boss === 'admiral' && delves.tb.exit === 'coast' && delves.tb.room && delves.tb.foes >= 8 && delves.sp.boss === 'hollowking' && delves.sp.exit === 'kingdom' && delves.sp.room && delves.sp.foes >= 8, JSON.stringify(delves));

// ---- the two bosses
const boss = async (map, kind, flag) => {
  await G((f) => { const St = window.__ff.S; St.flags.sovereignDead = true; St.flags[f] = false; }, flag);
  await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, map);
  await h.sleep(2000);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.invuln = 999; g.player.setPosition(g.boss.x, g.boss.y + 90); });
  await h.sleep(1500);
  const a = await G(() => { const b = window.gs().boss; return { has: !!b, engaged: !!b?.engaged, name: b?.cfg?.name, hp: b?.maxHp }; });
  await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.3, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  const ph = await G(() => window.gs().boss.bphase);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; b.invulnerable = false; b.takeHit({ dmg: 999999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2200);
  return { ...a, ph, dead: await G((f) => !!window.__ff.S.flags[f], flag) };
};
const ad = await boss('tidebreak', 'admiral', 'admiralDead');
check('Admiral Veyl wakes, changes phase and falls', ad.has && ad.engaged && ad.name === 'Admiral Veyl' && ad.ph >= 2 && ad.dead, JSON.stringify(ad));
await h.shot('s46_admiral');
const hk = await boss('sepulchre', 'hollowking', 'hollowKingDead');
check('the Hollow King wakes, changes phase and falls', hk.has && hk.engaged && hk.name === 'The Hollow King' && hk.ph >= 2 && hk.dead && hk.hp >= 1400, JSON.stringify(hk));
await h.shot('s46_hollowking');

// ---- quests
await G(() => { const St = window.__ff.S; St.quests.admiral.status = 'inactive'; St.quests.hollowking.status = 'inactive'; St.flags.admiralDead = false; St.flags.hollowKingDead = false; St.gold = 0; St.inv = {}; });
await stub([0]); await SCRIPT('keeper'); await unstub();
check('the Keeper sends you to Tidebreak', await G(() => window.__ff.S.quests.admiral.status === 'active'));
await G(() => { window.__ff.S.flags.admiralDead = true; });
await stub([]); await SCRIPT('keeper'); await unstub();
const kq = await G(() => { const s = window.__ff.S; return { q: s.quests.admiral.status, mail: !!s.inv.sealskin_mail, gold: s.gold }; });
check('telling her it is done pays Sealskin Mail and gold', kq.q === 'done' && kq.mail && kq.gold === 450, JSON.stringify(kq));
await stub([0]); await SCRIPT('scribe'); await unstub();
check('the Scribe asks you to remember the last King', await G(() => window.__ff.S.quests.hollowking.status === 'active'));
await G(() => { window.__ff.S.flags.hollowKingDead = true; });
await stub([]); await SCRIPT('scribe'); await unstub();
const sq = await G(() => { const s = window.__ff.S; return { q: s.quests.hollowking.status, rem: !!s.flags.kingRemembered, gold: s.gold }; });
check('the Scribe finishes the last name, and the epilogue remembers it', sq.q === 'done' && sq.rem && sq.gold === 1050, JSON.stringify(sq));
const epi = await G(async () => (await import('/src/data/story.js')).epilogueLines().join(' '));
check('the ending epilogue mentions the coast and the Scribe', /Last Light/.test(epi) && /Scribe/.test(epi), epi.slice(0, 120));

// ---- roaming bosses leave unique loot
const uniq = await G(async () => {
  const g = window.gs(), out = {};
  for (const [rid, item] of [['cinder', 'cinder_maul'], ['floe', 'harpoon'], ['lastknight', 'kings_signet']]) {
    const before = g.pickups.length; g.onWorldBossDown({ spec: { rid }, x: g.player.x, y: g.player.y, tier: 3, displayName: 'X, the Test' });
    out[rid] = g.pickups.slice(before).some((p) => p.spec?.id === item || p.spec?.item === item);
  }
  return out;
});
check('the three new roaming bosses each drop a unique weapon or charm', Object.values(uniq).every(Boolean), JSON.stringify(uniq));

// ---- the map switcher now cycles four regions
await G(async () => { const R = await import('/src/data/regions.js'); ['ashen', 'coast', 'kingdom'].forEach(R.unlockRegion); window.gs().changeMap('forest', 'west', 'door'); });
await h.sleep(2000);
await G(() => window.gs().openMenu(-1, 'MAP')); await h.sleep(700);
const views = [];
for (let i = 0; i < 7; i++) { views.push(await G(() => window.__ff.game.scene.getScene('Menu').tabs.find((t) => t.name === 'MAP').viewId())); await G(() => window.__ff.keys._press('KeyR')); await h.sleep(110); await G(() => window.__ff.keys._release('KeyR')); await h.sleep(220); }
check('R cycles the map through all six regions and back', JSON.stringify(views) === JSON.stringify(['forest', 'ashen', 'coast', 'kingdom', 'fens', 'highlands', 'forest']), JSON.stringify(views));
await h.shot('s46_map_regions');
await G(() => window.__ff.game.scene.getScene('Menu').close?.()); await h.sleep(300);

// ---- performance in each new region
const perf = {};
for (const rid of ['ashen', 'coast', 'kingdom']) {
  await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, rid); await h.sleep(2000);
  perf[rid] = await G(async () => {
    const g = window.gs(); g.player.hurt = () => {};
    const kinds = ['golem', 'imp', 'draugr', 'wight'];
    for (let i = 0; i < 30; i++) g.addEnemy(kinds[i % 4], g.player.x + 60 + (i % 10) * 24, g.player.y + 40 + Math.floor(i / 10) * 30);
    const orig = g.sys.sceneUpdate; let n = 0, tot = 0;
    g.sys.sceneUpdate = function (t, ms) { const a = performance.now(); orig.call(g, t, ms); tot += performance.now() - a; n++; };
    await new Promise((r) => setTimeout(r, 3000));
    g.sys.sceneUpdate = orig;
    return { frames: n, avg: +(tot / Math.max(1, n)).toFixed(2), objs: g.children.list.length };
  });
}
check('each new region stays under the update budget with 30 enemies', Object.values(perf).every((p) => p.frames > 25 && p.avg < 4 && p.objs < 4000), JSON.stringify(perf));
const tr = await G(async () => { const A = await import('/src/systems/achievements.js'), St = window.__ff.S; St.flags.arrivedEmberhold = true; St.flags.arrivedCoast = true; St.flags.arrivedKingdom = true; A.checkTrophies?.(); return ['coastgone', 'kingrest', 'regions4'].map((id) => !!St.trophies?.[id]); });
check('the new milestones earn trophies', tr.every(Boolean), JSON.stringify(tr));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'REGIONS3 FAILED' : 'REGIONS3 PASSED');
