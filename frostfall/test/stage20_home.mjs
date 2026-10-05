import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=cottage');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
await G(async () => { window.__svc = await import('/src/data/services.js'); window.__ff.S.flags.introDone = true; });

// ---- the cottage is for sale
const door = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const d = g.interactables.find((i) => i.e && i.e.price); return d && { label: d.label(), sale: d.forSale }; });
check('a cottage door is for sale in the village', door && door.sale && door.label.includes('FOR SALE'), JSON.stringify(door));
await h.shot('s20_village');
await G(() => { window.__ff.S.gold = 100; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const d = g.interactables.find((i) => i.e && i.e.price); window.__dp = d.interact(); });
await h.sleep(400);
for (let i = 0; i < 6; i++) { await tap('KeyE', 40); await h.sleep(60); }     // read the notice, accept "Buy it"
await G(async () => { await window.__dp; });
check('cannot buy without enough gold', !(await G(() => window.__ff.S.flags.houseBought)));
await G(() => { window.__ff.S.gold = 500; });
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const d = g.interactables.find((i) => i.e && i.e.price); window.__dp = d.interact(); });
await h.sleep(400);
for (let i = 0; i < 4; i++) { await tap('KeyE', 40); await h.sleep(80); }
await G(async () => { await window.__dp; });
check('buying the cottage spends 300 gold and sets the flag', (await G(() => window.__ff.S.flags.houseBought)) === true && (await G(() => window.__ff.S.gold)) === 200);

// ---- inside: furnish
await G(() => window.__ff.game.scene.getScene('Game').changeMap('cottage', 'in', 'door'));
await h.sleep(1500);
check('inside the cottage', (await G(() => window.__ff.game.scene.getScene('Game').mapId)) === 'cottage');
await G(() => { window.__fs = window.__svc.furnishMenu(window.__ff.game.scene.getScene('Game')); });
await h.sleep(400);
await tap('KeyS', 50); await tap('KeyS', 50); await tap('KeyS', 50); await tap('KeyE', 60);   // cauldron (120G)
await h.sleep(150);
await h.shot('s20_furnish');
await tap('Escape', 60); await h.sleep(300);
await G(async () => { await window.__fs; });
const owned = await G(() => ({ f: window.__ff.S.flags.furn, gold: window.__ff.S.gold, stations: window.__ff.game.scene.getScene('Game').interactables.filter((i) => i.label && i.label() === 'E: BREW').length }));
check('furniture can be bought and appears with its station', owned.f.cauldron && owned.gold === 80 && owned.stations === 1, JSON.stringify(owned));

// ---- sleeping at home gives Well Rested (+25 max health)
const before = await G(() => window.__ff.S.maxHp);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.interactables.find((i) => i.label && i.label() === 'E: SLEEP'); window.__sl = b.interact(); });
await h.sleep(400);
await tap('KeyE', 40); await h.sleep(3500);
await G(async () => { await window.__sl; });
const after = await G(() => window.__ff.S.maxHp);
check('sleeping in your own bed makes you well rested', after === before + 25, `${before} -> ${after}`);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'HOME FAILED' : 'HOME PASSED');
process.exit(failCount() ? 1 : 0);
