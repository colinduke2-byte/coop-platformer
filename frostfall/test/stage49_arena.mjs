import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=title');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(120); };

// a real save must stay untouched by an arena run
await G(() => { const S = window.__ff.S; localStorage.setItem('frostfall_save_v1', JSON.stringify({ v: 2, t: 1, s: { ...S, gold: 777, map: 'village' } })); localStorage.removeItem('frostfall_arena_records'); });
const before = await G(() => localStorage.getItem('frostfall_save_v1'));

check('the title screen has an ARENA entry', await G(() => window.__ff.game.scene.getScene('Title').items.some((i) => i.id === 'arena')));
await G(() => { const t = window.__ff.game.scene.getScene('Title'); t.sel = t.items.findIndex((i) => i.id === 'arena'); });
await tap('KeyE'); await h.sleep(700);
check('it opens the hero pick screen', await G(() => window.__ff.game.scene.isActive('ArenaSetup')));
const heroes = await G(async () => (await import('/src/arena/heroes.js')).HEROES.map((x) => x.id).join());
check('six heroes are offered', heroes.split(',').length === 6, heroes);
await h.shot('s49_setup');

// every hero is built from items, spells and perks that exist
const bad = await G(async () => {
  const H = await import('/src/arena/heroes.js'), I = await import('/src/data/items.js'), P = await import('/src/data/perks.js'), M = await import('/src/entities/playerMagic.js'), sh = await import('/src/systems/shouts.js'), S = window.__ff.S;
  const out = [];
  for (const hero of H.HEROES) {
    for (const id of Object.values(hero.equip)) if (!I.ITEMS[id]) out.push(`${hero.id}: item ${id}`);
    for (const p of hero.perks) if (!P.perkById[p]) out.push(`${hero.id}: perk ${p}`);
    if (!M.SPELLS[hero.spell]) out.push(`${hero.id}: spell ${hero.spell}`);
    H.beginQuickRun(hero.id);
    if (!M.spellUnlocked(hero.spell)) out.push(`${hero.id}: spell ${hero.spell} locked`);
    if (hero.shout && !sh.shoutUnlocked(hero.shout)) out.push(`${hero.id}: shout ${hero.shout} locked`);
    if (S.maxHp < 100 || !S.quick) out.push(`${hero.id}: state`);
  }
  return out;
});
check('every hero loadout is valid (items, perks, spells, shouts)', bad.length === 0, bad.join('; '));

// begin the first hero
await G(() => { const s = window.__ff.game.scene.getScene('ArenaSetup'); s.sel = 0; });
await tap('KeyE'); await h.sleep(2500);
const run = await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; return { map: g.mapId, quick: !!S.quick, arena: !!(g.arena && g.arena.active), weapon: S.equip.weapon, master: g.interactables.some((i) => i.constructor?.name === 'ArenaMaster'), exits: g.exits.length }; });
check('the hero starts in the pit with the arena running, no door out', run.map === 'pit' && run.quick && run.arena && !run.master && run.exits === 0, JSON.stringify(run));
check('the warden carries an iron sword', run.weapon === 'iron_sword');

// saving is blocked and the pause menu hides it
const sv = await G(async () => { const { saveGame } = await import('/src/systems/save.js'); return saveGame(window.__ff.game.scene.getScene('Game')); });
check('saving does nothing in Arena Mode', sv === false && (await G(() => localStorage.getItem('frostfall_save_v1'))) === before);

// waves arrive and are cleared; kills are counted
await h.sleep(4500);
const w1 = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { foes: g.arena.foes.length, wave: g.arena.wave }; });
check('wave 1 spawns', w1.foes > 0 && w1.wave >= 2, JSON.stringify(w1));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.invuln = 999; g.arena.foes.forEach((e) => e.takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0 })); });
await h.sleep(1500);
const cl = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { cleared: g.arena.cleared, kills: g.arena.killed }; });
check('clearing wave 1 is counted with its kills', cl.cleared === 1 && cl.kills >= 1, JSON.stringify(cl));

// die -> results card
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.invuln = 0; g.player.iframes = 0; g.player.mode = 'free'; window.__ff.S.hp = 1; g.player.hurt(500, g.player.x + 10, g.player.y, {}); });
await h.sleep(4200);
const res = await G(() => { const s = window.__ff.game.scene.getScene('ArenaResults'); return { active: window.__ff.game.scene.isActive('ArenaResults'), hud: window.__ff.game.scene.isActive('Hud') }; });
check('falling ends the run and shows the results card', res.active && !res.hud, JSON.stringify(res));
await h.shot('s49_results');
const rec = await G(() => JSON.parse(localStorage.getItem('frostfall_arena_records') || '{}'));
check('the run is recorded as a personal best', rec['warden:survival'] && rec['warden:survival'].score >= 100 && rec['warden:survival'].runs === 1, JSON.stringify(rec));

// again -> a fresh run; the real save is still untouched
await h.sleep(900);
await tap('KeyE'); await h.sleep(2500);
check('E on the results card starts a fresh run', await G(() => window.__ff.game.scene.getScene('Game')?.mapId === 'pit' && window.__ff.S.quick.hero === 'warden' && window.__ff.S.hp === window.__ff.S.maxHp));
check('the real save file was never changed', (await G(() => localStorage.getItem('frostfall_save_v1'))) === before);

// your own hero: uses the saved character, still writes nothing
const own = await G(async () => { const H = await import('/src/arena/heroes.js'); const ok = H.hasOwnHero() && H.beginQuickRun('own'); return { ok, gold: window.__ff.S.gold, quick: !!window.__ff.S.quick }; });
check('"your hero" loads the saved character for a quick run', own.ok && own.gold === 777 && own.quick, JSON.stringify(own));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ARENA FAILED' : 'ARENA PASSED');
