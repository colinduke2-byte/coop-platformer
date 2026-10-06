import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=title');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(90); };

// ---- daily challenge: deterministic seed and modifiers
const dd = await G(async () => {
  const D = await import('/src/systems/daily.js'), M = await import('/src/data/mods.js');
  const a = D.dailyMods(20260101), b = D.dailyMods(20260101), c = D.dailyMods(20260102);
  return { same: a.join() === b.join(), two: a.length === 2 && a[0] !== a[1] && a.every((m) => M.MODS[m]), seed: D.dailySeed(20260101) === D.dailySeed(20260101) && D.dailySeed(20260101) !== D.dailySeed(20260102), varied: [1, 2, 3, 4, 5, 6, 7].map((i) => D.dailyMods(20260100 + i).join()).filter((v, i, ar) => ar.indexOf(v) === i).length >= 3 };
});
check('the daily seed and its two modifiers are fixed for a day and change daily', dd.same && dd.two && dd.seed && dd.varied, JSON.stringify(dd));

// ---- the title offers it, shows the day, and starts the run
await G(() => { localStorage.removeItem('frostfall_board'); });
const itemsN = await G(() => window.__ff.game.scene.getScene('Title').items.map((i) => i.id).join());
check('the title screen has a DAILY CHALLENGE entry', itemsN.includes('daily'), itemsN);
await G(() => { const t = window.__ff.game.scene.getScene('Title'); t.sel = t.items.findIndex((i) => i.id === 'daily'); });
await tap('KeyE');
await h.sleep(500);
check('it opens a screen with today\'s modifiers', await G(() => !!window.__ff.game.scene.getScene('Title').dailyMode));
await h.shot('s40_daily');
await tap('KeyE', 90);
await h.sleep(1800);
const run = await G(async () => { const S = window.__ff.S, D = await import('/src/systems/daily.js'); return { map: window.__ff.game.scene.getScene('Game')?.mapId, seed: S.seed === D.dailySeed(), daily: !!S.daily, mods: Object.keys(S.mods || {}).length }; });
check('beginning it starts a fresh run in the daily world with both modifiers', run.map === 'village' && run.seed && run.daily && run.mods === 2, JSON.stringify(run));

// ---- modifiers do what they say
const mods = await G(async () => {
  const S = window.__ff.S, M = await import('/src/data/mods.js'), st = await import('/src/systems/stats.js'), g = window.__ff.game.scene.getScene('Game');
  const out = {}; S.mods = {};
  out.base = M.modMul('dealMul'); S.mods = { glass: true }; out.glass = M.modMul('dealMul') * M.modMul('takenMul');
  S.hp = S.maxHp; g.player.invuln = 0; g.player.iframes = 0; g.player.mode = 'free'; g.player.stunT = 0; g.player.hurt(20, g.player.x + 20, g.player.y, {}); out.glassHit = S.maxHp - S.hp;
  S.mods = {}; S.hp = S.maxHp; g.player.invuln = 0; g.player.iframes = 0; g.player.mode = 'free'; g.player.stunT = 0; g.player.hurt(20, g.player.x + 20, g.player.y, {}); out.plainHit = S.maxHp - S.hp;
  S.mods = { frail: true }; st.recalc(); out.frailHp = S.maxHp; S.mods = { famine: true }; st.recalc(); out.famineSp = S.maxSp; S.mods = {}; st.recalc(); out.plainSp = S.maxSp; out.plainHp = S.maxHp;
  S.mods = { hunted: true }; out.eliteMul = M.modMul('eliteMul'); S.mods = {};
  return out;
});
check('Glass Cannon doubles the risk, Frail trims health, Famine adds stamina, Hunted doubles elites', mods.base === 1 && mods.glass === 2.25 && mods.glassHit > mods.plainHit * 1.3 && mods.frailHp < mods.plainHp && mods.famineSp === mods.plainSp + 25 && mods.eliteMul === 2, JSON.stringify(mods));
check('Endless Winter keeps the blizzard up', await G(async () => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; S.mods = { winter: true }; S.weather = 'snow'; g.weatherT = 0; g.def.snow = true; g.updateClock(0.1); const w = S.weather; S.mods = {}; return w === 'blizzard'; }));

// ---- scoring and the board
const sc = await G(async () => {
  const S = window.__ff.S, D = await import('/src/systems/daily.js'); localStorage.removeItem('frostfall_board');
  S.run = { kills: 10, camps: 0, barrows: 1, champions: 2, chests: 3, deaths: 0 }; S.gold = 100; S.flags.wyrmDead = true; S.hearts = { rime: true };
  const s1 = D.runScore(); const row = D.submitScore(); S.run.kills = 50; const s2 = D.runScore(); D.submitScore(); S.run.kills = 5; D.submitScore();
  const board = D.loadBoard();
  S.run.deaths = 3; const s3 = D.runScore();
  return { s1, s2, s3, rows: board.length, best: board[0].score === s2, today: D.todaysBest() === s2 };
});
check('score rises with deeds, falls with deaths; the board keeps your best for the day', sc.s2 > sc.s1 && sc.s3 < sc.s2 && sc.rows === 1 && sc.best && sc.today, JSON.stringify(sc));

// ---- arena: new modes and boons
const ar = await G(async () => {
  const A = await import('/src/world/arena.js'), M = await import('/src/data/mods.js');
  const g1 = A.arenaWave(1, Math.random, 'gauntlet'), g6 = A.arenaWave(6, Math.random, 'gauntlet');
  return { champ1: g1.filter((f) => f.elite).length === 1, champ6: g6.filter((f) => f.elite).length === 1 && g6.length > g1.length, boons: Object.keys(M.BOONS).length >= 8, classic: A.arenaWave(3, Math.random, 'classic').length >= 3 };
});
check('the Champion Gauntlet sends one elite per wave with a growing escort', ar.champ1 && ar.champ6 && ar.boons && ar.classic, JSON.stringify(ar));
await G(() => window.__ff.game.scene.getScene('Game').changeMap('arena', 'in', 'door'));
await h.sleep(1500);
const boon = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, M = await import('/src/data/mods.js'), dlg = await import('/src/systems/dialogue.js');
  const real = dlg.dialogue.hud; window.__real = real; dlg.dialogue.hud = { say: async () => {}, choose: async (o) => 0, hideBox() {}, scene: real.scene };
  g.player.invuln = 999; g.startArena('boon'); const a = g.arena;
  a.wave = 2; a.cleared = 0; a.foes = []; a.t = 0; g.arenaTick(0.1);       // wave 1 cleared -> offers boons
  return { offering: a.offering, mode: a.mode };
});
await h.sleep(600);
const boon2 = await G(async () => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, M = await import('/src/data/mods.js'); const n = Object.values(S.boons || {}).reduce((x, y) => x + y, 0); return { n, off: g.arena.offering, mul: M.modMul('dealMul') * M.modMul('takenMul') * M.modMul('moveMul') }; });
check('the Boon Trial offers three boons between waves and applies your pick', boon.offering && boon2.n === 1 && boon2.off === false, JSON.stringify({ boon, boon2 }));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.endArena(true); });
check('boons end with the trial', await G(() => Object.keys(window.__ff.S.boons || {}).length === 0));
await G(async () => { (await import('/src/systems/dialogue.js')).dialogue.hud = window.__real; });

// ---- cloaks
const cl = await G(async () => {
  const A = await import('/src/systems/achievements.js'), S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  S.trophies = {}; const base = A.unlockedCloaks().length; S.trophies = { first_blood: true, dragon: true }; const more = A.unlockedCloaks().length;
  S.cloak = 13; g.player.applyCloak(); const tex = g.player.texture.key; S.cloak = 11; g.player.applyCloak(); const back = g.player.texture.key;
  S.cloak = 6; const locked = A.currentCloak().col; S.cloak = 11;
  return { base, more, tex, back, locked };
});
check('trophies unlock cloak colours and the player sprite changes', cl.base === 1 && cl.more === 3 && cl.tex === 'spr_cloak_13' && cl.back === 'spr_player' && cl.locked === 11, JSON.stringify(cl));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'REPLAY FAILED' : 'REPLAY PASSED');
