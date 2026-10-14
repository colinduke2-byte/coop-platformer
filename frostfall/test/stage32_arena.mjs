import { launch, check, failCount, FRAME_MS } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
// From here the real game loop is paused and time only moves through h.frames: wave timers and the hound's hunt get the
// same amount of game time however busy the machine is.
await h.pause();
const F = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const wait = (ms) => h.frames(F(ms));
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// ---- the arena door exists in the village, and the arena loads
check('the village has an arena gate', await G(() => window.gs().interactables.some((i) => i.e && i.e.to === 'arena')));
await G(() => window.gs().changeMap('arena', 'in', 'door'));
await wait(1500);
check('the arena loads with its master', await G(() => window.gs().mapId === 'arena' && window.gs().interactables.some((i) => i.constructor.name === 'ArenaMaster')));
await h.shot('s32_arena');

// ---- waves
await G(() => { const g = window.gs(); g.player.invuln = 999; g.startArena(); });
await wait(4500);
const w1 = await G(() => { const g = window.gs(); return { wave: g.arena.wave, foes: g.arena.foes.length }; });
check('wave 1 spawns', w1.wave === 2 && w1.foes >= 3, JSON.stringify(w1));
await h.shot('s32_wave1');
const gold0 = await G(() => window.__ff.S.gold);
await G(() => { const g = window.gs(); g.arena.foes.forEach((e) => e.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee' })); });
await wait(800);
const cl = await G(() => { const g = window.gs(); return { best: window.__ff.S.arena?.best, gold: window.__ff.S.gold, t: g.arena.t }; });
check('clearing a wave pays gold and records the best', cl.best === 1 && cl.gold > gold0, JSON.stringify(cl));
await wait(4800);
check('the next wave follows', await G(() => window.gs().arena.wave === 3 && window.gs().arena.foes.length > 0));
const comp = await G(async () => { const a = await import('/src/world/arena.js'); return { w1: a.arenaWave(1).length, w5: a.arenaWave(5), w12: a.arenaWave(12).length }; });
check('every fifth wave brings an elite champion', comp.w5.some((f) => f.elite) && comp.w12 > comp.w1, JSON.stringify(comp).slice(0, 200));
await G(() => window.gs().endArena(true));
check('yielding ends the trial', await G(() => !window.gs().arena.active && window.gs().arena.foes.length === 0));

// ---- the frost hound
await G(() => window.gs().changeMap('forest', 'west', 'door'));
await wait(1500);
const hd = await G(() => { const g = window.gs(); return { ent: g.built.entities.some((e) => e.t === 'hound'), prop: g.interactables.some((i) => i.constructor.name === 'WoundedHound') }; });
check('a hungry hound waits by the first road', hd.ent && hd.prop, JSON.stringify(hd));
await G(() => { const S = window.__ff.S, g = window.gs(); S.flags.houndOwned = true; g.spawnHound(); });
await wait(300);
await G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; g.player.setPosition(10 * 16, 15 * 16); g.player.invuln = 999; g.hound.setPosition(10 * 16 - 16, 15 * 16); const e = g.addEnemy('draugr', 10 * 16 + 60, 15 * 16); e.alert(true); e.cfg = { ...e.cfg, speed: 0, chase: 0, dmg: 0 }; window.__foe = e; });
const hunt = await h.until(() => window.__foe.hp < window.__foe.maxHp || window.__foe.dead, F(3500));
check('the hound hunts alongside you', hunt.ok, JSON.stringify(hunt));
// follows through map changes
await G(() => window.gs().changeMap('village', 'east', 'door'));
await wait(1500);
check('the hound follows you between maps', await G(() => !!window.gs().hound));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ARENA FAILED' : 'ARENA PASSED');
