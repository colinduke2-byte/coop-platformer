import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const scene = () => `window.__ff.game.scene.getScene('Game')`;
const S = (k) => G((k) => k.split('.').reduce((o, p) => o?.[p], window.__ff.S), k);
const stub = (answers) => G((a) => {
  const dlg = window.__dlg;
  if (!window.__realHud) window.__realHud = dlg.hud;
  window.__answers = [...a];
  dlg.hud = { say: async () => {}, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, lockpick: async () => true };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const load = async (map, spawn, extra = '') => { await h.open(`scene=game&map=${map}&spawn=${spawn}${extra}`); await h.sleep(800); await G(async () => { window.__dlg = (await import('/src/systems/dialogue.js')).dialogue; window.__dia = await import('/src/data/dialogue.js'); window.__ff.S.flags.introDone = true; }); };
const restart = async (map, spawn) => { await G(([m, s]) => window.__ff.game.scene.getScene('Game').scene.restart({ map: m, spawn: s }), [map, spawn]); await h.sleep(900); };

// ---------------- every map: entities on free tiles, tile variety, connectivity
await load('village', 'start');
const info = await G(async () => {
  const { MAPS } = await import('/src/data/maps.js');
  const { SOLID_TILES } = await import('/src/config.js');
  const out = {};
  for (const id of Object.keys(MAPS)) {
    const b = MAPS[id].build();
    const solid = (x, y) => SOLID_TILES.includes(b.grid[y]?.[x]) || b.grid[y]?.[x] === undefined;
    const bad = b.entities.filter((e) => e.x != null && ['enemy', 'chest', 'pickup', 'spawn', 'boss', 'pot', 'sign', 'npc', 'herb', 'lore', 'bed', 'cauldron', 'door'].includes(e.t) && !['door', 'prop'].includes(e.t) && solid(e.x, e.y)).map((e) => `${id}:${e.t}${e.kind || e.id || e.name || ''}@${e.x},${e.y}`);
    const tiles = new Set(b.grid.flat());
    out[id] = { bad, tiles: tiles.size, w: b.w, h: b.h };
  }
  return out;
});
for (const [id, r] of Object.entries(info)) check(`${id}: all entities on walkable tiles`, r.bad.length === 0, r.bad.join(' '));
check('outdoor maps use many tile variants', info.village.tiles >= 12 && info.forest.tiles >= 10 && info.pass.tiles >= 10, `${info.village.tiles}/${info.forest.tiles}/${info.pass.tiles}`);

// ---------------- interiors + doors
await load('village', 'start');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const d = g.interactables.find((i) => i.e && i.e.to === 'hall'); g.player.setPosition(d.ix, d.iy + 10); g.player.mode = 'free'; });
await h.sleep(250);
check('door shows an ENTER prompt', (await G(() => window.__ff.game.scene.getScene('Game').target?.label())).includes('ENTER'));
await tap('KeyE'); await h.sleep(1300);
check('E on a door enters the hall', (await S('map')) === 'hall');
await h.shot('s13_hall');
const inside = await G(() => window.__ff.game.scene.getScene('Game').npcs.map((n) => n.id));
check('Sigrid is not indoors by day', !inside.includes('sigrid'));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(10.5 * 16 + 8, 12 * 16 + 4); g.t = 1; });
await press('KeyS'); await h.sleep(1300); await rel('KeyS');
check('walking out of the door returns to the village', (await S('map')) === 'village');

// ---------------- night schedule
await G(() => { window.__ff.S.time = 22 * 60; });
await h.sleep(1500);
const away = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.npcs.filter((n) => n.sched).map((n) => [n.id, n.away, n.visible]); });
check('at night villagers go indoors (hidden outside)', away.length >= 3 && away.every(([, a, v]) => a && !v), JSON.stringify(away));
await restart('hall', 'in');
const hallN = await G(() => window.__ff.game.scene.getScene('Game').npcs.map((n) => n.id));
check('...and Sigrid is in her hall at night', hallN.includes('sigrid'), hallN.join());
const amb = await G(() => 0);
await restart('village', 'start');
await h.shot('s13_night');
const nightAmb = await G(() => window.__ff.game.scene.getScene('Game').ambient().alpha);
check('night darkens the world', nightAmb > 0.4, String(nightAmb));
check('darkness layer is rendered with light cut-outs', await G(() => !!window.__ff.game.scene.getScene('Game').darkRT));
await G(() => { window.__ff.S.time = 12 * 60; });
check('day is bright', (await G(() => window.__ff.game.scene.getScene('Game').ambient().alpha)) < 0.01);
const clock0 = await S('time');
await h.sleep(2000);
check('the clock advances outdoors', (await S('time')) > clock0 + 1);

// ---------------- weather
await G(() => { window.__ff.S.weather = 'blizzard'; window.__ff.game.scene.getScene('Game').applyWeather(); });
const wz = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { n: g.snow.n, env: g.stealthEnv() }; });
check('blizzard: heavy snow and better stealth', wz.n >= 150 && wz.env < 0.8, JSON.stringify(wz));
await h.shot('s13_blizzard');
await G(() => { window.__ff.S.weather = 'snow'; window.__ff.game.scene.getScene('Game').applyWeather(); });

// ---------------- sleeping
await restart('lodge', 'in');
await G(() => { window.__ff.S.time = 23 * 60; window.__ff.S.hp = 10; });
await stub([0]);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.interactables.find((i) => i.label && i.label() === 'E: SLEEP'); g.player.setPosition(b.ix + 16, b.iy); g.player.mode = 'free'; g.player.stunT = 0; });
await h.sleep(250);
await tap('KeyE'); await h.sleep(3200);
unstub();
const slept = await G(() => ({ t: window.__ff.S.time, hp: window.__ff.S.hp, r: window.__ff.S.respawn.map }));
check('sleeping skips to morning, heals and sets the respawn point', Math.abs(slept.t - 7 * 60) < 5 && slept.hp === 100 && slept.r === 'lodge', JSON.stringify(slept));

// ---------------- books / lore / bestiary
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const lb = g.interactables.find((i) => i.id === 'herbs'); g.player.setPosition(lb.ix, lb.iy + 16); g.player.mode = 'free'; });
await h.sleep(250);
await stub([]);
await tap('KeyE'); await h.sleep(400);
unstub();
check('reading a book records lore', await S('lore.herbs') === true);
await G(async () => { const { bus } = await import('/src/systems/bus.js'); for (let i = 0; i < 3; i++) bus.emit('enemy:killed', 'wolf'); window.__ff.S.seen.wolf = true; });
await G(() => window.__ff.game.scene.getScene('Game').openMenu(-1, 'LORE'));
await h.sleep(400);
const lt = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m && m.tabs[m.tab].name; });
check('Lore tab opens', lt === 'LORE', lt);
await h.shot('s13_lore');
check('bestiary tracks kills', (await S('kills.wolf')) >= 3);
await tap('Escape'); await h.sleep(250);

// ---------------- Frostwind Pass + Grimfang
await restart('forest', 'north');
check('forest has a northern exit to the pass', await G(() => window.__ff.game.scene.getScene('Game').exits.some((e) => e.to === 'pass')));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(31.5 * 16, 1.2 * 16); g.t = 1; g.enemies.clear(); });
await press('KeyW'); await h.sleep(1500); await rel('KeyW');
check('walking north enters Frostwind Pass', (await S('map')) === 'pass' && (await S('flags.pass')) === true);
await G(() => { window.__ff.S.quests.alpha = { status: 'active' }; });
const conn = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { boss: !!g.nextWaypoint(24 * 16, 36 * 16, 24 * 16, 5 * 16), tower: !!g.nextWaypoint(24 * 16, 36 * 16, 8 * 16, 21 * 16) }; });
check('the pass connects the entrance to the den and the tower', conn.boss && conn.tower, JSON.stringify(conn));
// engage the boss
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(24 * 16, 11.2 * 16); g.player.invuln = 999; });
await h.sleep(500);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(24 * 16, 9.5 * 16); });
await h.sleep(800);
check('Grimfang engages when you enter his den', await G(() => window.__ff.game.scene.getScene('Game').boss.engaged));
await h.sleep(2300);
const seen = new Set();
for (let i = 0; i < 400 && seen.size < 3; i++) {
  const r = await G(() => { const b = window.__ff.game.scene.getScene('Game').boss; return b && { st: b.state, a: b.atk }; });
  if (r && r.st === 'windup') seen.add(r.a);
  await h.sleep(60);
  if (i % 12 === 0) await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(24 * 16, 9 * 16 + 30 * Math.random()); window.__ff.S.hp = 100; g.player.invuln = 999; });
}
check('Grimfang uses several telegraphed attacks', seen.size >= 2, [...seen].join());
// phase 2
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.45, kx: 0, ky: 0, kb: 0 }); });
await h.sleep(300);
check('boss enters phase 2 and the arena turns red', await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.boss.bphase === 2 && !!g.ambientOverride; }));
await h.shot('s13_grimfang');
// bring him to the yield point -> choose to spare
await stub([1]);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2500);
const spared = await G(() => ({ f: window.__ff.S.flags.alphaSpared, q: window.__ff.S.quests.alpha.status, done: window.__ff.S.flags.grimfangDone, left: window.__ff.game.scene.getScene('Game').enemies.getChildren().includes(window.__ff.game.scene.getScene('Game').boss) }));
check('mortally wounded Grimfang yields; sparing him is possible', spared.f === true && spared.q === 'ready' && spared.done && !spared.left, JSON.stringify(spared));
await h.sleep(3500);
check('sparing him earns Alpha\'s Fang', (await S('inv.alpha_fang')) === 1);
unstub();
// Bjorn reaction + calmer wolves
await G(() => { window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }); });
await h.sleep(900);
const calm = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.kind === 'wolf').every((e) => e.cfg.detect === 0));
check('wolves in the forest are calmer after Grimfang was spared', calm);
await stub([]);
await G(async () => { window.__ff.S.gold = 0; await window.__dia.bjorn(); });
check('Bjorn pays less but the quest completes', (await S('quests.alpha.status')) === 'done' && (await S('gold')) === 40);
unstub();
// kill path
await G(() => { const S = window.__ff.S; S.flags.alphaSpared = false; S.flags.grimfangDone = false; S.flags.alphaSlain = false; S.quests.alpha = { status: 'active' }; delete S.inv.pale_pelt; });
await restart('pass', 'south');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(24 * 16, 9.5 * 16); g.player.invuln = 999; });
await h.sleep(3200);
await stub([0]);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(5000);
const killed = await G(() => ({ pelt: window.__ff.S.inv.pale_pelt || 0, q: window.__ff.S.quests.alpha.status, slain: window.__ff.S.flags.alphaSlain }));
check('finishing Grimfang drops the Pale Pelt and completes the objective', killed.pelt === 1 && killed.q === 'ready' && killed.slain, JSON.stringify(killed));
unstub();

// ---------------- respawn at the last campfire
await restart('forest', 'west');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); g.pend.length = 0; const f = g.interactables.find((i) => i.label && i.label() === 'E: REST'); g.player.setPosition(f.ix, f.iy + 16); g.player.mode = 'free'; });
await h.sleep(250);
await stub([0]);
await tap('KeyE'); await h.sleep(2800);
await unstub();
check('resting sets the respawn point', (await S('respawn.map')) === 'forest');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(100, 400); g.player.invuln = 0; g.player.iframes = 0; window.__ff.S.hp = 1; g.player.hurt(50, 0, 0); });
await h.sleep(4500);
const resp = await G(() => ({ map: window.__ff.S.map, x: Math.round(window.__ff.game.scene.getScene('Game').player.x) }));
check('dying respawns at the last campfire, not the village', resp.map === 'forest' && resp.x > 500, JSON.stringify(resp));

// ---------------- slippery ice
await restart('pass', 'south');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); g.boss && (g.boss.engaged = true); const p = g.player; p.setPosition(24 * 16, 20 * 16); p.invuln = 999; p.body.setVelocity(0, 0); });
await press('KeyD'); await h.sleep(120);
const vIce = await G(() => window.__ff.game.scene.getScene('Game').player.body.velocity.x);
await rel('KeyD'); await h.sleep(300);
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.setPosition(24 * 16, 34 * 16); p.body.setVelocity(0, 0); });
await press('KeyD'); await h.sleep(120);
const vSnow = await G(() => window.__ff.game.scene.getScene('Game').player.body.velocity.x);
await rel('KeyD');
check('ice is slippery (slow to accelerate)', vIce < vSnow * 0.6, `ice=${vIce.toFixed(1)} snow=${vSnow.toFixed(1)}`);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'WORLD FAILED' : 'WORLD PASSED');
process.exit(failCount() ? 1 : 0);
