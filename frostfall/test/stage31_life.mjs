import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; window.gs = () => window.__ff.game.scene.getScene('Game'); });

// ---- the world has ice holes, hares and foxes
const w = await G(() => { const g = window.gs(); const ents = g.built.entities; return { fish: ents.filter((e) => e.t === 'fish').length, hare: ents.filter((e) => e.t === 'deer' && e.kind === 'hare').length, fox: ents.filter((e) => e.t === 'deer' && e.kind === 'fox').length, holes: g.interactables.filter((i) => i.st).length }; });
check('the lakes have ice-fishing holes', w.fish >= 3 && w.holes === w.fish, JSON.stringify(w));
check('hares and foxes roam the Reach', w.hare >= 1 && w.fox >= 1, JSON.stringify(w));

// ---- fishing: cast, wait for the bite, reel in
const fish = await G(async () => {
  const g = window.gs(), S = window.__ff.S, hole = g.interactables.find((i) => i.st);
  g.player.setPosition(hole.x, hole.y + 14); g.player.invuln = 999;
  hole.interact(); const st1 = hole.st;
  hole.interact(); const early = hole.st;            // too early spooks it
  hole.interact(); hole.t = 0.01; hole.tick(0.05, g); const bite = hole.st;
  const before = (S.inv.raw_trout || 0) + (S.inv.raw_pike || 0) + (S.inv.raw_eel || 0);
  hole.interact();
  const after = (S.inv.raw_trout || 0) + (S.inv.raw_pike || 0) + (S.inv.raw_eel || 0);
  hole.interact(); hole.t = 0.01; hole.tick(0.05, g); hole.t = 0.01; hole.tick(0.05, g);   // let one get away
  return { st1, early, bite, caught: after - before, away: hole.st, count: S.fish.caught };
});
check('fishing: cast, too-early spooks, bite, reel', fish.st1 === 'wait' && fish.early === 'idle' && fish.bite === 'bite' && fish.caught === 1 && fish.away === 'idle' && fish.count === 1, JSON.stringify(fish));

// ---- cooking and food buffs
const food = await G(async () => {
  const S = window.__ff.S, f = await import('/src/systems/food.js'), st = await import('/src/systems/stats.js');
  S.inv.raw_trout = 2; S.inv.venison = 1; S.inv.snowberry = 1;
  const opts = f.COOKABLE().map((r) => r.to);
  f.cook(f.COOKABLE().find((r) => r.to === 'grilled_trout'));
  f.cook(f.COOKABLE().find((r) => r.to === 'hunters_stew'));
  const have = { trout: S.inv.grilled_trout, stew: S.inv.hunters_stew };
  const base = S.maxHp; S.hp = 50;
  f.eatFood('grilled_trout', window.gs());
  const after = { max: S.maxHp - base, hp: S.hp };
  f.eatFood('hunters_stew', window.gs());
  S.hp = 50; window.gs().player.update(1, null); 
  S.flags.foodUntil = 0; f.foodTick();
  return { opts, have, after, ended: !S.flags.food, maxBack: S.maxHp === base };
});
check('cooking turns fish and venison into meals', food.opts.includes('grilled_trout') && food.opts.includes('hunters_stew') && food.have.trout === 1 && food.have.stew === 1, JSON.stringify(food));
check('a meal heals and raises max health, then wears off', food.after.max === 20 && food.after.hp >= 90 && food.ended && food.maxBack, JSON.stringify(food));

// ---- treasure maps
const map = await G(async () => {
  const S = window.__ff.S, t = await import('/src/systems/treasure.js'), g = window.gs();
  S.inv.treasure_map = 2;
  const ok = t.readMap('treasure_map', g), tr = { ...S.flags.treasure }, wp = { ...S.flags.waypoint };
  const again = t.readMap('treasure_map', g);
  return { ok, tr, wp, again, left: S.inv.treasure_map };
});
check('a treasure map marks a dig site and sets a waypoint', map.ok && map.wp.x === map.tr.x && !map.again && map.left === 1, JSON.stringify(map));
const dug = await G(async () => {
  const g = window.gs(), S = window.__ff.S;
  g.player.setPosition(S.flags.treasure.x * 16 + 8, S.flags.treasure.y * 16 + 8); await new Promise((r) => setTimeout(r, 1500));
  const ts = g.interactables.find((i) => i.constructor.name === 'TreasureSpot');
  if (!ts) return { found: false };
  const gold = S.gold, gen = Object.keys(S.inv).length;
  ts.interact();
  return { found: true, done: S.flags.treasure.done, items: Object.keys(S.inv).length - gen, maps: S.fish.maps };
});
check('digging up the marked spot yields treasure', dug.found && dug.done && dug.items >= 1 && dug.maps === 1, JSON.stringify(dug));

// ---- trophies
const tro = await G(async () => {
  const a = await import('/src/systems/achievements.js'), S = window.__ff.S;
  S.trophies = {}; S.fish.caught = 12; S.kills = { wolf: 25 }; S.flags.dragonDead = true;
  a.checkTrophies();
  return { n: a.trophyCount(), has: ['angler', 'wolfbane', 'dragon', 'first_blood'].every((k) => S.trophies[k]), no: !S.trophies.winter };
});
check('trophies unlock from play', tro.has && tro.no && tro.n >= 4, JSON.stringify(tro));

// menu tab renders
await G(() => { window.__ff.game.scene.getScene('Game').scene.launch('Menu', { name: 'FEATS' }); });
await h.sleep(500);
await h.shot('s31_trophies');
await G(() => { window.__ff.game.scene.stop('Menu'); window.__ff.S && (window.__ff.ui = window.__ff.ui); });

// ---- songs exist
const songs = await G(async () => { const m = await import('/src/audio/sfx.js'); return ['cavern', 'throne', 'dragon'].map((n) => { m.music.play(n); return m.music.current() === n; }); });
check('new music tracks play (cavern, throne, dragon)', songs.every(Boolean), JSON.stringify(songs));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'LIFE FAILED' : 'LIFE PASSED');
