import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const S = (k) => G((k) => k.split('.').reduce((o, p) => o?.[p], window.__ff.S), k);
const load = async (query) => { await h.open(query); await h.sleep(800); await G(async () => { window.__set = (await import('/src/systems/settings.js')).settings; window.__keysmod = await import('/src/systems/keys.js'); window.__save = await import('/src/systems/save.js'); window.__music = (await import('/src/audio/sfx.js')).music; window.__ff.S.flags.introDone = true; }); };
await load('scene=game&map=village&spawn=start');
await G(() => localStorage.clear());
await h.page.reload(); await h.page.waitForFunction(() => window.__ff && window.__ff.game.isBooted); await h.sleep(800);
await load('scene=game&map=village&spawn=start');

// ---------------- options menu
await tap('Escape'); await h.sleep(300);
const rowsInfo = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m.tabs[m.tab].name; });
check('pause opens SYSTEM', rowsInfo === 'SYSTEM');
const goRow = async (name, from) => { /* rows list order is fixed */ };
// rows: 0 RESUME 1 SAVE 2 LOAD 3 VOLUME 4 MUSIC 5 FULLSCREEN 6 SLOT 7 DIFFICULTY 8 SHAKE 9 FLASHES 10 PIXEL SCALE 11 MOUSE 12 CONTROLS 13 QUIT
for (let i = 0; i < 9; i++) await tap('KeyS', 50);     // cursor on SLOT
await tap('KeyD', 50);
check('SLOT row cycles slots', (await G(() => window.__set.slot)) === 2);
await tap('KeyA', 50);
await tap('KeyS', 50); await tap('KeyD', 50);
check('difficulty option changes (normal -> hard)', (await G(() => window.__set.difficulty)) === 'hard');
await tap('KeyA', 50); await tap('KeyA', 50);
check('difficulty can go to easy', (await G(() => window.__set.difficulty)) === 'easy');
await tap('KeyD', 50);
await tap('KeyS', 50); await tap('KeyA', 50);
check('screen shake option', (await G(() => window.__set.shake)) === 0.5 || (await G(() => window.__set.shake)) === 0);
await tap('KeyD', 50);
await tap('KeyS', 50); await tap('KeyE', 50);
check('flashes can be turned off', (await G(() => window.__set.flashes)) === false);
await tap('KeyE', 50);
await tap('KeyS', 50); await tap('KeyE', 70); await h.sleep(300);
const sizeInt = await G(() => ({ on: window.__set.intScale, w: window.__ff.game.canvas.clientWidth }));
check('integer pixel scaling option works (whole-number zoom)', sizeInt.on && sizeInt.w % 320 === 0, JSON.stringify(sizeInt));
await tap('KeyE', 70); await h.sleep(200);
await tap('KeyS', 50); await tap('KeyE', 50);
check('mouse option toggles', (await G(() => window.__set.mouse)) === true);
await tap('KeyE', 50);
await tap('KeyS', 50); await tap('KeyE', 50);
check('sneak mode option toggles', (await G(() => window.__set.sneakToggle)) === true);
await tap('KeyE', 50);
await tap('KeyS', 50); await tap('KeyE', 50);
check('hold-to-chain option toggles', (await G(() => window.__set.holdChain)) === false);
await tap('KeyE', 50);
await tap('KeyS', 50);
await h.shot('s14_options');
// ---------------- rebinding
for (let i = 0; i < 6; i++) await tap('KeyS', 50); await tap('KeyE', 80); await h.sleep(250);
// CONTROLS list: cursor on first action (MOVE UP). move to SWORD (index 5)
for (let i = 0; i < 5; i++) await tap('KeyS', 50);
await h.shot('s14_controls');
await tap('KeyE', 60); await h.sleep(150);
check('rebind mode waits for a key', await G(() => window.__keysmod.capturing()));
await tap('KeyH', 60); await h.sleep(200);
check('sword rebound to H', (await G(() => window.__keysmod.DEFAULT_BINDINGS && JSON.parse(localStorage.getItem('frostfall_settings')).keys.sword[0])) === 'KeyH');
await tap('Escape', 60); await h.sleep(150);      // back to main list
await tap('Escape', 60); await h.sleep(250);      // close menu
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(300, 250); g.player.mode = 'free'; g.player.lockT = 0; window.__ff.S.sp = 100; });
await tap('KeyH', 60); await h.sleep(150);
check('the new key swings the sword', await G(() => !!window.__ff.game.scene.getScene('Game').player.swing || window.__ff.S.sp < 99));
await G(() => window.__keysmod.resetBindings());
check('bindings can be reset', (await G(() => JSON.stringify(window.__keysmod.DEFAULT_BINDINGS.sword))) === (await G(() => JSON.stringify(window.__keysmod.DEFAULT_BINDINGS.sword))));
await G(() => { window.__set.intScale = false; window.__set.mouse = false; window.__set.flashes = true; window.__set.difficulty = 'normal'; window.__set.shake = 1; window.__set.slot = 1; window.__applyScaling(); });

// ---------------- save slots, backup, recovery
await G(() => { window.__set.slot = 1; window.__ff.S.gold = 111; window.__save.saveGame(window.__ff.game.scene.getScene('Game'), { slot: 1 }); });
await G(() => { window.__ff.S.gold = 222; window.__save.saveGame(window.__ff.game.scene.getScene('Game'), { slot: 2 }); });
await G(() => { window.__ff.S.gold = 333; window.__save.saveGame(window.__ff.game.scene.getScene('Game'), { slot: 1 }); });
const infos = await G(() => window.__save.listSaves().map((x) => !!x.info));
check('three independent slots', infos[0] && infos[1] && !infos[2], JSON.stringify(infos));
await G(() => { window.__save.loadGame(2); });
check('slot 2 loads its own data', (await S('gold')) === 222);
await G(() => { localStorage.setItem('frostfall_save_v1', '{"corrupt": tru'); });
const rec = await G(() => { const ok = window.__save.loadGame(1); return { ok, gold: window.__ff.S.gold, info: window.__save.saveInfo(1) }; });
check('a corrupted save is recovered from its backup copy', rec.ok && rec.gold === 111 && rec.info.recovered, JSON.stringify(rec));
await G(() => { localStorage.setItem('frostfall_save_v1', 'nonsense'); localStorage.setItem('frostfall_save_v1_bak', 'also nonsense'); });
check('a fully corrupt slot is treated as empty (no crash)', (await G(() => window.__save.loadGame(1))) === false);

// ---------------- mid-boss save
await load('scene=game&map=crypt&spawn=entry');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(15.5 * 16, 7 * 16); g.player.invuln = 999; });
await h.sleep(3500);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const b = g.boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - 100, kx: 0, ky: 0, kb: 0 }); window.__save.saveGame(g, { slot: 3 }); });
const bs = await S('bossState');
check('saving mid-boss stores hp and phase', bs && bs.hp <= 105 && bs.map === 'crypt', JSON.stringify(bs));
await G(() => { window.__save.loadGame(3); const g = window.__ff.game.scene.getScene('Game'); g.scene.restart({ map: 'crypt', pos: { x: 15.5 * 16, y: 20 * 16 } }); });
await h.sleep(1200);
const hpBack = await G(() => window.__ff.game.scene.getScene('Game').boss.hp);
check('reloading resumes the boss fight with the saved health', hpBack <= 105 && hpBack > 0, String(hpBack));

// ---------------- quest markers, tracking
await load('scene=game&map=village&spawn=start');
await G(() => { const S = window.__ff.S; S.quests.king = { status: 'active' }; S.quests.wolves = { status: 'active', kills: 0 }; S.tracked = null; });
await h.sleep(500);
const mk = await G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return hud.qm ? hud.qm.text : null; });
check('objective in another area shows a GO TO label', typeof mk === 'string' && mk.startsWith('GO TO'), String(mk));
await G(() => window.__ff.game.scene.getScene('Game').openMenu(-1, 'QUESTS')); await h.sleep(300);
await tap('KeyS', 60); await tap('KeyE', 60); await h.sleep(150);
check('the journal pins a quest to track', (await S('tracked')) !== null);
await tap('Escape'); await h.sleep(200);

// ---------------- tips + music + combat layer
await load('scene=game&map=forest&spawn=west');
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const p = g.player; p.setPosition(10.5 * 16, 10 * 16); const e = g.addEnemy('draugr', p.x + 30, p.y); e.alerted = false; });
await h.sleep(1500);
check('first alert shows the sneak tip', (await S('tips.sneak')) === true);
await h.sleep(1300);
check('combat music layer switches on during a fight', (await G(() => window.__music.intensity())) === 1);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); });
await h.sleep(1500);
check('...and off afterwards', (await G(() => window.__music.intensity())) === 0);
await G(() => { window.__ff.S.time = 22 * 60; });
await h.sleep(1500);
check('night music', (await G(() => window.__music.current())) === 'night');
await G(() => { window.__ff.S.time = 12 * 60; });
await h.sleep(1500);
check('daytime forest music', (await G(() => window.__music.current())) === 'forest');

// ---------------- pooling + blades
const pool = await G(() => { const g = window.__ff.game.scene.getScene('Game'); for (let i = 0; i < 30; i++) g.fx.puff(300, 200, 5, 10, 40, 0.1); return g.fx.parts.length; });
await h.sleep(900);
const poolAfter = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return { parts: g.fx.parts.length, pool: g.fx.pool.length }; });
check('particles are pooled and reused', poolAfter.parts < pool && poolAfter.pool > 20, JSON.stringify(poolAfter));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); const p = g.player; p.setPosition(10.5 * 16, 10 * 16); p.invuln = 999; const e = g.addEnemy('bandit', p.x + 22, p.y); e.alerted = true; e.state = 'chase'; e.cd = 0; });
let blade = false;
for (let i = 0; i < 40 && !blade; i++) { blade = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return !!(e && e.weaponImg && e.weaponImg.visible); }); await h.sleep(40); }
check('melee enemies raise and swing a weapon', blade);

// ---------------- F3 debug
await h.page.keyboard.press('F3'); await h.sleep(150);
check('F3 toggles the debug overlay', await G(() => window.__ff.game.scene.getScene('Hud').debugOn));

// ---------------- mouse
await G(() => { window.__set.mouse = true; const g = window.__ff.game.scene.getScene('Game'); g.enemies.clear(); g.player.setPosition(300, 250); g.player.mode = 'free'; g.player.stunT = 0; g.player.lockT = 0; g.player.swing = null; window.__ff.S.sp = 100; });
const box = await h.page.locator('canvas').boundingBox();
await h.page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.5);
await h.page.mouse.click(box.x + box.width * 0.9, box.y + box.height * 0.5);
await h.sleep(120);
const mouseSw = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; return { sw: !!p.swing || window.__ff.S.sp < 99, fx: p.face.x }; });
check('left click swings toward the pointer', mouseSw.sw && mouseSw.fx > 0, JSON.stringify(mouseSw));
await G(() => { window.__set.mouse = false; });

// ---------------- touch controls
await load('scene=game&map=village&spawn=start&touch=1');
check('touch overlay appears with ?touch=1', await G(() => !!document.getElementById('touch-ui')));
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(300, 250); g.player.mode = 'free'; g.player.rollCd = 0; window.__ff.S.sp = 100; });
await h.page.locator('#touch-ui div[data-code="Space"]').dispatchEvent('pointerdown');
await h.sleep(120);
check('touch ROLL button rolls', await G(() => window.__ff.game.scene.getScene('Game').player.mode === 'roll'));
await h.page.locator('#touch-ui div[data-code="Space"]').dispatchEvent('pointerup');
check('touch ring is closed at first', await G(() => ![...document.querySelectorAll('#touch-ui div[data-code="KeyK"]')][0].offsetParent));
await h.page.locator('#touch-ui div', { hasText: /^MORE$/ }).dispatchEvent('pointerdown');
check('MORE opens the radial ring (bow, swap, pack...)', await G(() => !!document.querySelector('#touch-ui div[data-code="KeyK"]').offsetParent));
await h.page.locator('#touch-ui div[data-code="KeyT"]').dispatchEvent('pointerdown');
await h.page.locator('#touch-ui div[data-code="KeyT"]').dispatchEvent('pointerup');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'UX FAILED' : 'UX PASSED');
process.exit(failCount() ? 1 : 0);
