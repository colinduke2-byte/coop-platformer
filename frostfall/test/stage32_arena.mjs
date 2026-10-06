import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// ---- the arena door exists in the village, and the arena loads
check('the village has an arena gate', await G(() => window.gs().interactables.some((i) => i.e && i.e.to === 'arena')));
await G(() => window.gs().changeMap('arena', 'in', 'door'));
await h.sleep(1500);
check('the arena loads with its master', await G(() => window.gs().mapId === 'arena' && window.gs().interactables.some((i) => i.constructor.name === 'ArenaMaster')));
await h.shot('s32_arena');

// ---- waves
await G(() => { const g = window.gs(); g.player.invuln = 999; g.startArena(); });
await h.sleep(4500);
const w1 = await G(() => { const g = window.gs(); return { wave: g.arena.wave, foes: g.arena.foes.length }; });
check('wave 1 spawns', w1.wave === 2 && w1.foes >= 3, JSON.stringify(w1));
await h.shot('s32_wave1');
const gold0 = await G(() => window.__ff.S.gold);
await G(() => { const g = window.gs(); g.arena.foes.forEach((e) => e.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee' })); });
await h.sleep(800);
const cl = await G(() => { const g = window.gs(); return { best: window.__ff.S.arena?.best, gold: window.__ff.S.gold, t: g.arena.t }; });
check('clearing a wave pays gold and records the best', cl.best === 1 && cl.gold > gold0, JSON.stringify(cl));
await h.sleep(4800);
check('the next wave follows', await G(() => window.gs().arena.wave === 3 && window.gs().arena.foes.length > 0));
const comp = await G(async () => { const a = await import('/src/world/arena.js'); return { w1: a.arenaWave(1).length, w5: a.arenaWave(5), w12: a.arenaWave(12).length }; });
check('every fifth wave brings an elite champion', comp.w5.some((f) => f.elite) && comp.w12 > comp.w1, JSON.stringify(comp).slice(0, 200));
await G(() => window.gs().endArena(true));
check('yielding ends the trial', await G(() => !window.gs().arena.active && window.gs().arena.foes.length === 0));

// ---- the frost hound
await G(() => window.gs().changeMap('forest', 'west', 'door'));
await h.sleep(1500);
const hd = await G(() => { const g = window.gs(); return { ent: g.built.entities.some((e) => e.t === 'hound'), prop: g.interactables.some((i) => i.constructor.name === 'WoundedHound') }; });
check('a hungry hound waits by the first road', hd.ent && hd.prop, JSON.stringify(hd));
await G(() => { const S = window.__ff.S, g = window.gs(); S.flags.houndOwned = true; g.spawnHound(); });
await h.sleep(300);
await G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; g.player.setPosition(10 * 16, 15 * 16); g.player.invuln = 999; g.hound.setPosition(10 * 16 - 16, 15 * 16); const e = g.addEnemy('draugr', 10 * 16 + 60, 15 * 16); e.alert(true); e.cfg = { ...e.cfg, speed: 0, chase: 0, dmg: 0 }; window.__foe = e; });
await h.sleep(3500);
check('the hound hunts alongside you', await G(() => window.__foe.hp < window.__foe.maxHp || window.__foe.dead));
// follows through map changes
await G(() => window.gs().changeMap('village', 'east', 'door'));
await h.sleep(1500);
check('the hound follows you between maps', await G(() => !!window.gs().hound));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ARENA FAILED' : 'ARENA PASSED');
