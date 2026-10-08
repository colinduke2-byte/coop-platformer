import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// input buffer: a sword press during a roll still swings the moment the roll ends
const buf = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player, keys = window.__ff.keys;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  S.sp = S.maxSp; p.mode = 'free'; p.swing = null; p.invuln = 99; p.rollCd = 0; let n = 0; const orig = p.startSwing.bind(p); p.startSwing = () => { n++; return orig(); };
  keys._press('Space'); await new Promise((r) => { const t0 = performance.now(); const iv = setInterval(() => { if (p.mode === 'roll' || performance.now() - t0 > 1500) { clearInterval(iv); r(); } }, 5); }); keys._release('Space');
  const rolling = p.mode === 'roll'; window.__dbg = { mode: p.mode, stun: p.stunT, mounted: S.mounted, sp: S.sp, rollCd: p.rollCd, swing: !!p.swing, lock: p.lockT, drawing: p.drawing, hp: S.hp, perks: Object.keys(S.perks) };
  await new Promise((r) => setTimeout(r, 210));
  keys._press('KeyJ'); await new Promise((r) => setTimeout(r, 30)); keys._release('KeyJ');        // a moment before the roll ends: still rolling
  const stillRolling = p.mode === 'roll', swungDuring = !!p.swing;
  await new Promise((r) => setTimeout(r, 420));
  p.startSwing = orig; return { rolling, stillRolling, swungDuring, swings: n, dbg: window.__dbg };
});
check('a swing pressed mid-roll is remembered and happens when the roll ends', buf.rolling && buf.stillRolling && !buf.swungDuring && buf.swings === 1, JSON.stringify(buf));

// capstone perks exist, need the end of their chain and skill 12
const pk = await G(async () => {
  const P = await import('/src/data/perks.js'), SK = await import('/src/systems/skills.js'), S = window.__ff.S;
  const caps = P.PERKS.filter((p) => p.lvl === 12), out = { n: caps.length, chain: caps.every((c) => P.perkById[c.req]), states: [] };
  S.perks = {}; S.perkPoints = 10; for (const k of Object.keys(S.skills)) S.skills[k].lvl = 1;
  out.states.push(SK.perkState('deadeye'));                                     // locked: skill too low
  S.skills.archery.lvl = 12; out.states.push(SK.perkState('deadeye'));          // locked: chain missing
  S.perks.steadyhand = S.perks.eagleeye = S.perks.piercing = true; out.states.push(SK.perkState('deadeye'));
  out.bought = SK.buyPerk('deadeye') && !!S.perks.deadeye;
  return out;
});
check('five capstone perks sit at skill 12 behind the last perk of each chain', pk.n === 5 && pk.chain && pk.states.join() === 'locked,locked,available' && pk.bought, JSON.stringify(pk));

// Second Wind saves you once per 90 seconds
const sw = await G(() => {
  const g = window.gs(), S = window.__ff.S, p = g.player;
  S.perks = { secondwind: true }; S.flags.windAt = -999; S.maxHp = 100; S.hp = 40; S.playtime = 1000; p.invuln = 0; p.iframes = 0; p.mode = 'free';
  p.hurt(30, p.x + 5, p.y, {});
  const a = { hp: S.hp, alive: p.mode !== 'dead' };
  p.invuln = 0; p.iframes = 0; S.hp = 40; p.hurt(30, p.x + 5, p.y, {});
  const b = { hp: S.hp };
  S.playtime = 1200; p.invuln = 0; p.iframes = 0; S.hp = 40; p.hurt(30, p.x + 5, p.y, {});
  return { a, b, c: S.hp };
});
check('Second Wind heals instead of the killing blow, then rests for 90 seconds', sw.a.hp === 75 && sw.a.alive && sw.b.hp < 40 && sw.c === 75, JSON.stringify(sw));

// Archmage makes every fourth cast free
const am = await G(() => {
  const g = window.gs(), S = window.__ff.S, p = g.player;
  S.perks = { archmage: true }; S.spell = 'fire'; p.castN = 0; const used = [];
  for (let i = 0; i < 4; i++) { S.mp = 100; p.cooldown = 0; p.castCd = 0; p.mpDelay = 0; try { p.cast(); } catch (e) { return String(e); } used.push(Math.round(100 - S.mp)); }
  return used;
});
check('every fourth spell costs no mana', Array.isArray(am) && am[0] > 0 && am[1] > 0 && am[2] > 0 && am[3] === 0, JSON.stringify(am));

// Companion orders change how a follower behaves
const ord = await G(async () => {
  const g = window.gs(), S = window.__ff.S, D = await import('/src/data/dialogue.js'), dlg = await import('/src/systems/dialogue.js');
  S.follower = true; S.companion = 'ragna'; g.spawnFollower();
  const real = dlg.dialogue.hud; const seen = []; dlg.dialogue.hud = { say: async (n, t) => seen.push(t), choose: async (o) => { seen.push(o.join('|')); return o.indexOf('Hold this spot'); }, hideBox() {}, scene: real.scene };
  await D.giveOrders('Ragna'); dlg.dialogue.hud = real;
  const p = g.player, f = g.follower; f.setPosition(p.x - 200, p.y); const x0 = f.x; f.update(0.2, p);
  const waited = Math.abs(f.x - x0) < 8;                // on hold, a follower far behind does not teleport to you
  S.followMode = 'follow'; f.setPosition(p.x - 200, p.y); f.update(0.2, p);
  const joined = Math.abs(f.x - p.x) < 40;
  return { mode: S.followMode, waited, joined, menu: seen[0] };
});
check('orders: a companion told to hold stays put; told to follow, catches up', ord.waited && ord.joined && /Stay close/.test(ord.menu), JSON.stringify(ord));

// the new region recipes
const rc = await G(async () => {
  const SV = await import('/src/data/services.js'), { ITEMS } = await import('/src/data/items.js');
  return SV.RECIPES.filter((r) => ['fen_tonic', 'bogward_brew', 'storm_brew'].includes(r.id)).map((r) => [r.id, !!ITEMS[r.id], Object.keys(r.needs).every((k) => !!ITEMS[k])]);
});
check('fen and storm recipes brew from fen and storm finds', rc.length === 3 && rc.every((r) => r[1] && r[2]), JSON.stringify(rc));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'BUILDS FAILED' : 'BUILDS PASSED');
process.exit(failCount() ? 1 : 0);
