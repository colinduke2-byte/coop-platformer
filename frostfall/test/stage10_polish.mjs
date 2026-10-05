import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const dlg = () => G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return hud.dlg ? { name: hud.dlg.name, text: hud.dlg.pages?.[hud.dlg.p] } : null; });
async function finish() { for (let i = 0; i < 60; i++) { if (!(await dlg())) { await h.sleep(100); if (!(await dlg())) return; } await tap('KeyE', 40); await h.sleep(40); await tap('KeyE', 40); } }

for (const [map, spawn] of [['village', 'start'], ['forest', 'west'], ['crypt', 'entry']]) {
  await h.open(`scene=game&map=${map}&spawn=${spawn}`);
  await h.sleep(700);
  const bad = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.built.entities.filter((e) => e.x != null && ['enemy', 'chest', 'pickup', 'spawn', 'boss', 'pot', 'sign', 'npc'].includes(e.t) && g.solid[e.y][e.x]).map((e) => `${e.t}@${e.x},${e.y}`); });
  check(`${map}: props, signs, NPCs all on free tiles`, bad.length === 0, bad.join(' '));
}

// ---- breakables
await h.open('scene=game&map=village&spawn=start');
await h.sleep(700);
const nPots = await G(() => window.__ff.game.scene.getScene('Game').breakables.length);
check('village has breakable pots/barrels', nPots >= 8, `n=${nPots}`);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.breakables[0]; g.player.setPosition(b.x - 14, b.y); g.player.face = { x: 1, y: 0 }; window.__ff.S.sp = 100; });
await tap('KeyJ', 60);
await h.sleep(300);
const after = await G(() => window.__ff.game.scene.getScene('Game').breakables.length);
check('sword smashes a pot', after === nPots - 1, `${nPots}->${after}`);
// arrow smashes another
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.breakables[0]; g.player.setPosition(b.x - 40, b.y); g.player.face = { x: 1, y: 0 }; g.player.stunT = 0; window.__ff.S.sp = 100; });
await press('KeyK'); await h.sleep(500); await rel('KeyK'); await h.sleep(1200);
const after2 = await G(() => window.__ff.game.scene.getScene('Game').breakables.length);
check('arrow smashes a pot', after2 <= after - 1, `${after}->${after2}`);

// ---- sign
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const s = g.interactables.find((i) => i.lines); g.player.setPosition(s.x, s.y + 17); g.player.mode = 'free'; });
await h.sleep(250);
await tap('KeyE'); await h.sleep(250);
const sd = await dlg();
check('signs show text', sd && sd.name === 'SIGN' && /PINE FOREST/.test(sd.text), JSON.stringify(sd));
await finish();

// ---- guard hint (ambient NPC)
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const n = g.npcs.find((n) => n.id === 'guard'); g.player.setPosition(n.x, n.y + 17); g.player.mode = 'free'; });
await h.sleep(250);
await tap('KeyE'); await h.sleep(250);
const gd = await dlg();
check('guard talks', gd && gd.name === 'Haldor', JSON.stringify(gd));
await finish();

// ---- combo: three taps -> heavy finisher
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const e = g.addEnemy('draugr', 380, 250); e.cfg = { ...e.cfg, detect: 0, speed: 0, hp: 999 }; e.hp = e.maxHp = 999; g.player.setPosition(366, 250); g.player.face = { x: 1, y: 0 }; g.player.stunT = 0; g.player.lockT = 0; g.player.comboT = 0; window.__ff.S.sp = 100; });
const seq = [];
for (let i = 0; i < 3; i++) {
  await tap('KeyJ', 50);
  seq.push(await G(() => window.__ff.game.scene.getScene('Game').player.comboN));
  await h.sleep(320);
  await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.setPosition(380, 250); e.body.setVelocity(0, 0); g.player.setPosition(366, 250); window.__ff.S.sp = 100; });
}
check('3 quick swings chain into the finisher', seq.join() === '0,1,2', seq.join());

// ---- suspicion "?" before detection
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); window.__ff.S.flags.x = 1; const e = g.addEnemy('draugr', 500, 250); e.cfg = { ...e.cfg, speed: 0 }; g.player.setPosition(450, 250); g.player.invuln = 99; });
let q = false;
for (let i = 0; i < 25 && !q; i++) { q = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e.markStr === '?' || e.alerted; }); await h.sleep(40); }
check('enemies show a ? (or alert) as they notice you', q);

// ---- rest at the campfire heals and saves
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const S = window.__ff.S; S.hp = 20; S.mp = 5; S.sp = 5; g.player.setPosition(19.5 * 16, 14.5 * 16 + 2); g.player.mode = 'free'; localStorage.removeItem('frostfall_save_v1'); });
await h.sleep(250);
await tap('KeyE');
await h.sleep(2600);
const rest = await G(() => ({ hp: window.__ff.S.hp, mp: window.__ff.S.mp, saved: !!localStorage.getItem('frostfall_save_v1'), modal: window.__ff.game.scene.getScene('Game').cameras.main.alpha }));
check('resting at a fire restores everything and saves', rest.hp === 100 && rest.mp === 100 && rest.saved, JSON.stringify(rest));

// ---- map screen with fog
await tap('KeyM');
await h.sleep(400);
const mt = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m && m.tabs[m.tab].name; });
check('M opens the map', mt === 'MAP', mt);
const fogged = await G(() => { const f = window.__ff.S.fog.village; return { ones: [...f].filter((c) => c === '1').length, zeros: [...f].filter((c) => c === '0').length }; });
check('map is fogged: some explored, most unexplored', fogged.ones > 5 && fogged.zeros > fogged.ones, JSON.stringify(fogged));
await h.shot('s10_map');
await tap('KeyM'); await h.sleep(200);

// ---- gamepad mapping
await G(() => { window.__pad = { connected: true, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] }; navigator.getGamepads = () => [window.__pad]; });
const x0 = await G(() => window.__ff.game.scene.getScene('Game').player.x);
await G(() => { window.__pad.axes = [1, 0]; });
await h.sleep(600);
await G(() => { window.__pad.axes = [0, 0]; });
const x1 = await G(() => window.__ff.game.scene.getScene('Game').player.x);
check('gamepad stick moves the player', x1 > x0 + 15, `${x0}->${x1}`);

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'POLISH FAILED' : 'POLISH PASSED');
process.exit(failCount() ? 1 : 0);
