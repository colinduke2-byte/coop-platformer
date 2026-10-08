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
const SCRIPT = (name) => G(async (n) => { await import('/src/data/emberhold.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);
const S = (fn, a) => G(fn, a);

// ---- the world: the Peak Road in the Reach, the forge on the Ashen Peaks
const w = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), St = window.__ff.S, solid = new Set(CF.SOLID_TILES), out = [];
  for (const seed of [3, 424242, 777, 31337, 99999, 182137]) {
    St.seed = seed; const r = M.getReach(), a = M.getRegion('ashen');
    const pr = r.pois.find((p) => p.kind === 'peakroad'), ex = r.entities.find((e) => e.t === 'exit' && e.to === 'ashen'), sp = r.entities.find((e) => e.t === 'spawn' && e.name === 'peakroad');
    const fg = a.pois.find((p) => p.kind === 'forge'), fx = a.entities.find((e) => e.t === 'exit' && e.to === 'forge'), back = a.entities.find((e) => e.t === 'exit' && e.to === 'forest');
    const seen = new Uint8Array(r.w * r.h), q = [[4, 15]]; seen[15 * r.w + 4] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= r.w || y >= r.h || seen[y * r.w + x] || solid.has(r.grid[y][x])) continue; seen[y * r.w + x] = 1; q.push([x, y]); }
    out.push({ seed, pr: !!pr, ne: pr && pr.x > 240 && pr.y < 180, needs: ex?.needs, spawn: ex?.spawn, sp: !!sp, walk: !!ex && (seen[ex.y * r.w + ex.x] || seen[(ex.y + 1) * r.w + ex.x]), forge: !!fg, fneeds: fx?.needs, back: back?.spawn });
  }
  St.seed = 424242;
  return out;
});
check('every seed has a Peak Road gate in the north-east of the Reach, reachable, closed until Chapter 3', w.every((r) => r.pr && r.ne && r.needs === 'chapter3' && r.spawn === 'entry' && r.sp && r.walk), JSON.stringify(w));
check('the Ashen Peaks hold the sealed Forge door and a road back to the Peak Road', w.every((r) => r.forge && r.fneeds === 'forgeOpen' && r.back === 'peakroad'), JSON.stringify(w[0]));

// ---- gates
const gates = await G(async () => {
  const C3 = await import('/src/data/chapter3.js'), St = window.__ff.S; St.flags.chapter3 = false; St.flags.forgeOpen = false;
  St.quests.silence.status = 'inactive'; St.quests.anvilcore.status = 'inactive'; St.quests.roadwatch.status = 'inactive';
  const a = { road: C3.GATES.chapter3.ok(), forge: C3.GATES.forgeOpen.ok(), seals: C3.sealCount(), msg: C3.GATES.forgeOpen.msg() };
  St.flags.chapter3 = true; St.quests.silence.status = 'done'; St.quests.anvilcore.status = 'done';
  return { a, road: C3.GATES.chapter3.ok(), seals: C3.sealCount() };
});
check('the road and the forge stay shut until their conditions are met', !gates.a.road && !gates.a.forge && gates.a.seals === 0 && /SEALS 0\/3/.test(gates.a.msg) && gates.road && gates.seals === 2, JSON.stringify(gates));

// ---- ending the Winter closes Chapter 2 and opens Chapter 3
await S(() => { const St = window.__ff.S; St.flags.chapter3 = false; St.flags.arrivedEmberhold = false; St.flags.metYsolde = false; St.flags.forgeOpen = false; St.flags.finale = 'thaw'; St.flags.regions = {}; St.quests.crown.status = 'inactive'; St.quests.silence.status = 'inactive'; St.quests.anvilcore.status = 'inactive'; });
await S(() => { const g = window.gs(); g.pendingEnding = 'thaw'; });
await h.sleep(1200);
const card = await S(() => { const e = window.__ff.game.scene.getScene('Ending'); return e && { ch2: e.ch2, pages: e.pages.length, text: e.pages.join(' ') }; });
check('the Winter ending is now a Chapter Two card that mentions the open Peak Road', card && card.ch2 && /Peak Road/.test(card.text), JSON.stringify(card && { ch2: card.ch2, pages: card.pages }));
await h.shot('s45_card');
for (let i = 0; i < 24; i++) { await S(() => window.__ff.keys._press('KeyE')); await h.sleep(160); await S(() => window.__ff.keys._release('KeyE')); await h.sleep(120); if (!(await S(() => window.__ff.game.scene.isActive('Ending')))) break; }
const c3 = await S(() => { const St = window.__ff.S; return { ch3: !!St.flags.chapter3, ashen: !!St.flags.regions?.ashen, crown: St.quests.crown.status, active: window.__ff.game.scene.isActive('Ending') }; });
check('dismissing it opens Chapter 3: the Ashen Peaks unlock and The Ember Crown begins', c3.ch3 && c3.ashen && c3.crown === 'active' && !c3.active, JSON.stringify(c3));

// ---- the quest reads its stages
const stages = await S(async () => {
  const Q = await import('/src/data/quests.js'), St = window.__ff.S, q = Q.QUESTS.crown, out = [];
  out.push(q.short());
  St.flags.arrivedEmberhold = true; out.push(q.short());
  St.flags.metYsolde = true; St.quests.silence.status = 'done'; out.push(q.short());
  St.quests.anvilcore.status = 'done'; St.quests.roadwatch.status = 'done'; St.flags.forgeOpen = true; out.push(q.short());
  St.flags.forgeEntered = true; out.push(q.short());
  St.flags.sovereignDead = true; out.push(q.short());
  const objs = q.objectives(St.quests.crown).filter((o) => o.done).length;
  St.flags.sovereignDead = false; St.flags.forgeEntered = false; St.flags.forgeOpen = false;
  return { out, objs, tg: !!Q.TARGETS.crown() };
});
check('the crown quest points at the next step every time', stages.out[0].includes('Peak Road') && stages.out[1].includes('Ysolde') && stages.out[2].includes('seals 1/3') && stages.out[3].includes('Enter the Forge') && stages.out[4].includes('Sovereign') && stages.out[5].includes('Decide') && stages.objs >= 6 && stages.tg, JSON.stringify(stages));

// ---- Ysolde: the briefing, the seals and opening the forge
await S(() => { const St = window.__ff.S; St.flags.metYsolde = false; St.flags.forgeOpen = false; St.quests.silence.status = 'done'; St.quests.anvilcore.status = 'inactive'; St.quests.roadwatch.status = 'inactive'; });
await stub([]); await SCRIPT('ysolde');
check('Ysolde greets you, tells the truth of the chains and names the three seals', (await S(() => window.__ff.S.flags.metYsolde)) && (await S(() => window.__said.join(' '))).includes('First Fire') && (await S(() => window.__said.join(' '))).includes('seal'));
await unstub();
await stub([1]); await SCRIPT('ysolde');
check('with seals missing she says which', (await S(() => window.__said.join(' '))).includes('Seals 1 of 3') && !(await S(() => window.__ff.S.flags.forgeOpen)));
await unstub();
await S(() => { const St = window.__ff.S; St.quests.anvilcore.status = 'done'; St.quests.roadwatch.status = 'done'; });
await stub([1]); await SCRIPT('ysolde');
check('with all three seals she opens the Forge of the First Fire', await S(() => !!window.__ff.S.flags.forgeOpen));
await unstub();

// ---- the Forge dungeon
const forge = await G(async () => {
  const M = await import('/src/data/maps.js'), CF = await import('/src/config.js'), St = window.__ff.S, solid = new Set(CF.SOLID_TILES), out = [];
  for (const seed of [3, 424242, 99]) {
    St.seed = seed; const b = M.getForge(), sp = b.entities.find((e) => e.t === 'spawn' && e.name === 'entry'), seen = new Uint8Array(b.w * b.h), q = [[sp.x, sp.y]]; seen[sp.y * b.w + sp.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    const boss = b.entities.find((e) => e.t === 'boss'), ex = b.entities.find((e) => e.t === 'exit');
    const near = (e) => { for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (seen[(e.y + dy) * b.w + e.x + dx]) return true; return false; };
    out.push({ seed, boss: boss?.kind, exit: ex?.to + '/' + ex?.spawn, bossReach: boss && near(boss), foes: b.entities.filter((e) => e.t === 'enemy').length, room: !!b.bossRoom });
  }
  St.seed = 424242; return out;
});
check('the Forge builds on every seed: five rooms, the Sovereign at the end, a door back to the Peaks', forge.every((f) => f.boss === 'sovereign' && f.exit === 'ashen/forge' && f.bossReach && f.foes >= 8 && f.room), JSON.stringify(forge));

// ---- the Ashen Sovereign: three phases and the house that helps
const fight = async (rep) => {
  await S((r) => { const St = window.__ff.S; St.rep = r; St.flags.sovereignDead = false; St.hp = St.maxHp; }, rep);
  await S(() => { window.gs().changeMap('forge', 'entry', 'door'); });
  await h.sleep(2000);
  await S(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.invuln = 999; g.player.setPosition(g.boss.x, g.boss.y + 90); });
  await h.sleep(1500);
  return S(() => { const g = window.gs(), b = g.boss, St = window.__ff.S; const slam = b.B.slam.dmg; b.invulnerable = false; const h0 = b.hp; b.takeHit({ dmg: 100, kx: 0, ky: 0, kb: 0, src: 'melee' }); const loss = h0 - b.hp; St.sp = 10; b.invulnerable = false; b.enterPhase(); return { has: !!b, engaged: !!b.engaged, name: b.cfg.name, help: b.help, slam, loss, sp: St.sp, phase: b.bphase }; });
};
const f0 = await fight({ anvil: 0, delvers: 0, wardens: 0 });
check('the Sovereign wakes when you enter its hall', f0.has && f0.engaged && f0.name === 'The Ashen Sovereign' && f0.help === null && f0.slam === 28 && f0.sp === 10 && f0.phase >= 2, JSON.stringify(f0));
await h.shot('s45_sovereign');
const fa = await fight({ anvil: 60, delvers: 10, wardens: 10 });
const fd = await fight({ anvil: 0, delvers: 60, wardens: 10 });
const fw = await fight({ anvil: 0, delvers: 0, wardens: 60 });
check('the Anvil Court sharpens your blows (+15%)', fa.help === 'anvil' && fa.loss > f0.loss * 1.1, JSON.stringify({ f0: f0.loss, fa: fa.loss }));
check('the Delvers soften the Sovereign\'s fire (-25% damage)', fd.help === 'delvers' && fd.slam === 21, JSON.stringify(fd));
check('the Wardens restore stamina at every phase change', fw.help === 'wardens' && fw.sp >= 34, JSON.stringify(fw));

// ---- the last choice
await S(() => { const St = window.__ff.S; St.rep = { anvil: 0, delvers: 0, wardens: 0 }; St.flags.finale = 'crown'; St.flags.finalChoice = null; St.quests.crown.status = 'active'; St.inv = {}; });
await stub([2, 1]);                      // bind (refused: no house trusts you), then wear the crown
await G(async () => { const C3 = await import('/src/data/chapter3.js'); await C3.finalChoice(); });
const fin = await S(() => { const St = window.__ff.S; return { choice: St.flags.finalChoice, crown: !!St.inv.ember_crown, q: St.quests.crown.status, said: window.__said.join(' ').includes('A binding needs hands'), ending: window.gs().pendingEnding }; });
check('binding is refused without a house behind you; wearing the crown grants the Ember Crown', fin.said && fin.choice === 'crown' && fin.crown && fin.q === 'done' && fin.ending === 'c3_crown', JSON.stringify(fin));
await unstub();
await h.sleep(1500);
const endc = await S(() => { const e = window.__ff.game.scene.getScene('Ending'); return e && { title: e.children?.list?.find?.((c) => c.text && /LORD|EMBER|LAST|BALANCE/.test(c.text))?.text, pages: e.pages.length, text: e.pages.join(' ') }; });
check('the final ending shows its own title, spans several pages and echoes your Winter choice', endc && /LORD OF FIRE AND FROST/.test(endc.title || '') && endc.pages >= 2 && /Crown of Rime and Crown of Ember/.test(endc.text), JSON.stringify(endc && { t: endc.title, p: endc.pages }));
await h.shot('s45_ending');
await S(() => { window.__ff.game.scene.stop('Ending'); window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.finalChoice = 'crown'; });

// ---- every combination of ending reads well
const combos = await S(async () => {
  const ST = await import('/src/data/story.js'), St = window.__ff.S, out = new Set(), problems = [];
  const orig = { f: St.flags.finale, r: { ...St.rep } };
  for (const choice of ['quench', 'crown', 'bind']) for (const winter of ['thaw', 'warden', 'crown']) for (const house of [null, 'anvil', 'delvers', 'wardens']) {
    St.flags.finale = winter; St.rep = { anvil: house === 'anvil' ? 60 : 0, delvers: house === 'delvers' ? 60 : 0, wardens: house === 'wardens' ? 60 : 0 };
    const e = ST.chapter3Ending('c3_' + choice);
    if (!e || !e.title || e.text.length < 300) problems.push([choice, winter, house]); out.add(e.text);
  }
  St.flags.finale = orig.f; St.rep = orig.r;
  return { variants: out.size, problems };
});
check('all 36 final-ending combinations exist and are distinct', combos.variants === 36 && combos.problems.length === 0, JSON.stringify(combos));

// ---- trophies for the new beats
const tr = await S(async () => { const A = await import('/src/systems/achievements.js'), St = window.__ff.S; St.flags.arrivedEmberhold = true; St.flags.kragnarDead = true; St.flags.sovereignDead = true; St.flags.finalChoice = 'quench'; St.quests.silence.status = 'done'; St.quests.anvilcore.status = 'done'; St.quests.roadwatch.status = 'done'; A.checkTrophies?.(); return ['emberhold', 'kragnar', 'threeseals', 'sovereign', 'ember_end'].map((id) => !!St.trophies?.[id]); });
check('the new milestones earn trophies', tr.every(Boolean), JSON.stringify(tr));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'CHAPTER3 FAILED' : 'CHAPTER3 PASSED');
