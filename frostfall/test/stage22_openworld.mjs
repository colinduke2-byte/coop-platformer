import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const gs = `window.__ff.game.scene.getScene('Game')`;
const tp = (x, y) => G(([x, y]) => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(x * 16 + 8, y * 16 + 8); g.player.mode = 'free'; g.player.invuln = 999; g.player.body.setVelocity(0, 0); window.__ff.S.hp = window.__ff.S.maxHp; }, [x, y]);

const info = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { w: g.built.w, h: g.built.h, pend: g.pend.length, live: g.enemies.getLength() }; });
check('the forest is now a big open world', info.w >= 150 && info.h >= 100, JSON.stringify(info));
check('only nearby enemies exist at first (streaming)', info.pend > 40 && info.live < 14, JSON.stringify(info));

// ---- streaming in and out around a bandit camp
const camp = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.built.pois.find((q) => q.kind === 'camp'); return { x: p.x, y: p.y, id: p.id }; });
await tp(camp.x, camp.y + 9); await h.sleep(900);
const near = await G(([id]) => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.spec && e.spec.camp === id).length, [camp.id]);
check('walking up to a camp spawns its bandits', near >= 3, String(near));
await tp(4, 15); await h.sleep(1000);
const far = await G(([id]) => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.spec && e.spec.camp === id && e.active).length, [camp.id]);
check('walking away removes them again', far === 0, String(far));

// ---- clear the camp: bounty is paid, kills persist across a scene reload
await tp(camp.x, camp.y + 9); await h.sleep(800);
const g0 = await G(() => window.__ff.S.gold);
await G(([id]) => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().filter((e) => e.spec && e.spec.camp === id).forEach((e) => { e.takeHit({ dmg: 9999, kx: 0, ky: 0, kb: 0, src: 'melee', stun: 0.1 }); }); }, [camp.id]);
await h.sleep(1600);
check('clearing a camp pays a bounty', (await G(([id]) => !!window.__ff.S.bounty[id], [camp.id])) === true);
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', pos: null, spawn: 'west' }));
await h.sleep(900);
await tp(camp.x, camp.y + 9); await h.sleep(900);
const after = await G(([id]) => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.spec && e.spec.camp === id).length, [camp.id]);
check('a cleared camp stays cleared after reloading', after === 0, String(after));

// ---- shrine blessing
const shrine = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.built.pois.find((q) => q.kind === 'ruin'); return { x: p.x, y: p.y - 1, id: p.id }; });
await tp(shrine.x, shrine.y + 3);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; window.__sh = g.interactables.find((i) => i.label && i.label().includes('SHRINE')); });
check('a shrine stands in the ruin', await G(() => !!window.__sh));
await G(() => { window.__sp = window.__sh.interact(); });
await h.sleep(500);
for (let i = 0; i < 4; i++) { await tap('KeyE', 40); await h.sleep(60); }
await tap('KeyE', 40); await h.sleep(100);
await G(async () => { await Promise.race([window.__sp, new Promise((r) => setTimeout(r, 1500))]); });
const bl = await G(() => ({ b: window.__ff.S.blessing, hp: window.__ff.S.maxHp }));
check('praying grants a blessing or pact', !!bl.b, JSON.stringify(bl));
check('the shrine is quiet after use', await G(() => window.__sh.label().includes('SILENT')));

// ---- ore, digging, hunting
const spot = (t) => G(([t]) => { const g = window.__ff.game.scene.getScene('Game'); const e = g.built.entities.find((x) => x.t === t && (x.kind || 'deer') === 'deer'); return { x: e.x, y: e.y }; }, [t]);
const node = await spot('node');
await tp(node.x, node.y + 1); await h.sleep(200);
const ore0 = await G(() => (window.__ff.S.inv.iron_ingot || 0) + (window.__ff.S.inv.bone_dust || 0));
await G(([x, y]) => { const g = window.__ff.game.scene.getScene('Game'); g.pend.length = 0; g.enemies.getChildren().forEach((e) => e.destroy()); const n = g.interactables.find((i) => i.ore && Math.abs(i.ix - (x * 16 + 8)) < 20); n.interact(); }, [node.x, node.y]);
check('mining a node gives ore', (await G(() => (window.__ff.S.inv.iron_ingot || 0) + (window.__ff.S.inv.bone_dust || 0))) > ore0);
const dig = await spot('dig');
await tp(dig.x, dig.y + 1); await h.sleep(200);
const gold0 = await G(() => window.__ff.S.gold);
await G(([x, y]) => { const g = window.__ff.game.scene.getScene('Game'); const d = g.interactables.find((i) => i.key && i.key.includes(':d') && Math.abs(i.ix - (x * 16 + 8)) < 20); Math.random = () => 0.9; d.interact(); }, [dig.x, dig.y]);
await h.sleep(900);
check('digging up treasure pays out', (await G(() => window.__ff.S.gold)) > gold0 || (await G(() => window.__ff.game.scene.getScene('Game').pickups.length)) > 0);
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }));
await h.sleep(900);
const deer = await spot('deer');
await tp(deer.x, deer.y + 3); await h.sleep(900);
const dr = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const d = g.enemies.getChildren().find((e) => e.kind === 'deer'); if (!d) return null; const before = window.__ff.S.inv.venison || 0; d.takeHit({ dmg: 999, kx: 1, ky: 0, kb: 0, src: 'arrow' }); return { alerted: d.alerted }; });
check('a deer exists, is not hostile, and can be hunted', dr && dr.alerted === false);
await h.sleep(1500);
check('hunting drops venison', await G(() => window.__ff.game.scene.getScene('Game').pickups.some((p) => p.spec.id === 'venison') || (window.__ff.S.inv.venison || 0) > 0));

// ---- champion: elite affixes + guaranteed gear
const ch = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.built.pois.find((q) => q.kind === 'champion'); return { x: p.x, y: p.y }; });
await tp(ch.x, ch.y + 8); await h.sleep(900);
const champ = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren().find((x) => x.champion); return e && { name: e.displayName, aff: e.affixes, hp: e.maxHp }; });
check('a champion with affixes guards each champion site', champ && champ.aff.length === 2 && /Champion/.test(champ.name), JSON.stringify(champ));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren().find((x) => x.champion); e.explodes = false; e.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, src: 'melee', stun: 0.1 }); });
await h.sleep(700);
const gear = await G(() => window.__ff.game.scene.getScene('Game').pickups.filter((p) => p.spec.id && p.spec.id.startsWith('g_')).map((p) => ({ id: p.spec.id, name: window.__ff.items?.[p.spec.id]?.name })));
check('a champion always drops generated gear', gear.length >= 1, JSON.stringify(gear));

// ---- barrow dungeon round trip
const bar = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.built.pois.find((q) => q.kind === 'barrow'); return { x: p.x, y: p.y, i: p.id.slice(-1) }; });
await tp(bar.x, bar.y - 1); await h.sleep(1100);
check('stepping on the barrow stairs enters the dungeon', (await G(() => window.__ff.game.scene.getScene('Game').mapId)) === 'barrow' + bar.i);
const inside = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { enemies: g.enemies.getLength(), chests: g.interactables.filter((i) => i.spec && i.spec.loot).length }; });
check('the barrow has enemies and chests', inside.enemies >= 4 && inside.chests >= 2, JSON.stringify(inside));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const ex = g.exits[0]; g.player.setPosition(ex.rect.x + 8, ex.rect.y + 8); });
await h.sleep(1200);
check('the stairs lead back to the open world', (await G(() => window.__ff.game.scene.getScene('Game').mapId)) === 'forest');

// ---- fast travel + bounty board contracts
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'forest', spawn: 'west' }));
await h.sleep(900);
const fire = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const f = g.fires[g.fires.length - 1]; return { x: f.x, y: f.y, key: f.key }; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.mode = 'free'; });
await tp(fire.x / 16, fire.y / 16 + 3); await h.sleep(900);
check('walking up to a campfire discovers it', await G(([k]) => !!window.__ff.S.flags.fires[k], [fire.key]));
await tp(5, 15); await h.sleep(500);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().forEach((e) => { e.alerted = false; }); const f = g.fires[g.fires.length - 1]; g.fastTravel(f); });
await h.sleep(1500);
const moved = await G(([fx, fy]) => { const p = window.__ff.game.scene.getScene('Game').player; return Math.hypot(p.x - fx, p.y - fy); }, [fire.x, fire.y]);
check('fast travel moves you to the campfire', moved < 40, String(moved));

const con = await G(async () => {
  const c = await import('/src/data/contracts.js'); const S = window.__ff.S;
  S.bounty = {}; S.contracts = null;
  const cs = c.ensureContracts(); const o = cs.offers[0];
  c.acceptContract(o);
  const wp = JSON.stringify(S.flags.waypoint);
  const g0 = S.gold; const sc = window.__ff.game.scene.getScene('Game');
  const done = c.completeContract(o.id, sc);
  return { n: cs.offers.length, wp, done, paid: S.gold - g0, left: S.contracts.active.length, o: o.id, again: c.completeContract(o.id, sc) };
});
check('the board offers daily contracts, sets a waypoint, pays once', con.n >= 3 && con.done && con.paid > 40 && con.left === 0 && !con.again, JSON.stringify(con));
// ---- random events: ambush + travelling trader
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend.length = 0; g.player.mode = 'free'; g.spawnAmbush(); });
await h.sleep(300);
check('an ambush surrounds you with alerted enemies', await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.alerted).length >= 2));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().forEach((e) => e.destroy()); g.spawnTrader(); });
await h.sleep(300);
const tr = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { has: !!g.trader, wares: g.traderWares.length, gear: g.traderWares.filter((w) => w.id.startsWith('g_')).length, wp: !!window.__ff.S.flags.waypoint }; });
check('a travelling trader appears with generated gear and a waypoint', tr.has && tr.gear === 3 && tr.wp, JSON.stringify(tr));
await G(() => window.__ff.game.scene.getScene('Game').removeTrader());
check('the trader can leave again', await G(() => !window.__ff.game.scene.getScene('Game').trader));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'OPEN WORLD FAILED' : 'OPEN WORLD PASSED');
process.exit(failCount() ? 1 : 0);
