import { launch, check, failCount } from './harness.mjs';

const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const scenes = () => G(() => window.__ff.game.scene.getScenes(true).map((s) => s.scene.key));

// ---- title: no save -> Continue disabled
await h.open('');
await G(() => localStorage.clear());
await h.page.reload(); await h.page.waitForFunction(() => window.__ff && window.__ff.game.isBooted);
await h.sleep(600);
let t = await G(() => { const s = window.__ff.game.scene.getScene('Title'); return s && { sel: s.sel, off: s.items[1].off }; });
check('title shows with Continue disabled when no save exists', t && t.off === true && t.sel === 0, JSON.stringify(t));
await h.shot('s8_title');

// ---- new game -> play -> save via pause menu
await tap('KeyE');
await h.sleep(800);
check('New Game starts the intro', (await scenes()).includes('Intro'));
await G(() => window.__ff.game.scene.getScene('Intro').scene.start('Game', { map: 'village', spawn: 'start' }));
await h.sleep(900);
await G(() => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  S.gold = 321; S.arrows = 33; S.inv.iron_sword = 1; S.equip.weapon = 'iron_sword'; S.skills.archery = { lvl: 4, xp: 7 };
  S.quests.wolves = { status: 'active', kills: 2 }; S.flags.testflag = true; S.hp = 77;
  g.player.setPosition(250, 260);
});
await tap('Escape');
await h.sleep(300);
let mt = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m && m.tabs[m.tab].name; });
check('Esc opens the pause menu on the SYSTEM tab', mt === 'SYSTEM', mt);
await h.shot('s8_pause');
const frozen = await G(() => window.__ff.game.scene.getScene('Game').physics.world.isPaused);
// move to SAVE GAME and confirm
await tap('KeyS'); await tap('KeyE');
await h.sleep(200);
const raw = await G(() => localStorage.getItem('frostfall_save_v1'));
check('Save writes to localStorage', !!raw && JSON.parse(raw).s.gold === 321, raw && raw.slice(0, 60));
const sv = JSON.parse(raw);
check('save captures position, map, inventory, quests, skills', sv.s.x === 250 && sv.s.map === 'village' && sv.s.inv.iron_sword === 1 && sv.s.quests.wolves.kills === 2 && sv.s.skills.archery.lvl === 4);

// ---- mess up state, then load from the pause menu
await G(() => { const S = window.__ff.S; S.gold = 0; S.arrows = 1; S.quests.wolves = { status: 'inactive', kills: 0 }; S.equip.weapon = null; });
await tap('KeyS'); await tap('KeyE');   // LOAD GAME
await h.sleep(900);
const back = await G(() => { const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game'); return { gold: S.gold, arrows: S.arrows, w: S.equip.weapon, kills: S.quests.wolves.kills, lvl: S.skills.archery.lvl, x: Math.round(g.player.x), hp: S.hp, flag: S.flags.testflag, menu: window.__ff.game.scene.isActive('Menu') }; });
check('Load restores gold, arrows, equipment, quest, skills', back.gold === 321 && back.arrows === 33 && back.w === 'iron_sword' && back.kills === 2 && back.lvl === 4, JSON.stringify(back));
check('Load restores position and closes the menu', Math.abs(back.x - 250) < 6 && !back.menu, JSON.stringify(back));

// ---- map change autosaves
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.player.setPosition(38 * 16, 13 * 16 + 8); g.t = 1; });
await press('KeyD'); await h.sleep(1500); await rel('KeyD');
const auto = await G(() => JSON.parse(localStorage.getItem('frostfall_save_v1')).s.map);
check('travelling autosaves', auto === 'forest', auto);

// ---- volume / music settings persist
await tap('Escape'); await h.sleep(300);
for (let i = 0; i < 3; i++) await tap('KeyS');   // VOLUME row
const v0 = await G(() => JSON.parse(localStorage.getItem('frostfall_settings') || '{}').volume ?? null);
await tap('KeyA'); await tap('KeyA');
const v1 = await G(() => JSON.parse(localStorage.getItem('frostfall_settings')).volume);
check('A/D change volume and it persists', v1 < (v0 ?? 0.6), `${v0}->${v1}`);
await tap('KeyS'); await tap('KeyE');
const mus = await G(() => JSON.parse(localStorage.getItem('frostfall_settings')).music);
check('music toggle persists', mus === false);
await tap('KeyE'); // back on
await tap('Escape'); await h.sleep(300);
check('Esc resumes play', !(await scenes()).includes('Menu'));

// ---- audio engine runs without errors
const au = await G(async () => { const { sfx } = await import('/src/audio/sfx.js'); const names = ['sword', 'hit', 'crit', 'hurt', 'roll', 'draw', 'shoot', 'fire', 'frost', 'shout', 'pickup', 'coin', 'potion', 'levelup', 'blip', 'die', 'roar', 'chest', 'quest', 'nova', 'save', 'ending']; names.forEach((n) => sfx.play(n)); return names.length; });
check('all sound effects play without throwing', au > 15);

// ---- title Continue works from a fresh page load
await h.page.reload(); await h.page.waitForFunction(() => window.__ff && window.__ff.game.isBooted);
await h.sleep(700);
t = await G(() => { const s = window.__ff.game.scene.getScene('Title'); return s && { sel: s.sel, off: s.items[1].off }; });
check('Continue is enabled after saving', t && t.off === false && t.sel === 1, JSON.stringify(t));
await tap('KeyE');
await h.sleep(1200);
const cont = await G(() => ({ map: window.__ff.S.map, gold: window.__ff.S.gold, sc: window.__ff.game.scene.getScenes(true).map((s) => s.scene.key) }));
check('Continue resumes the saved game', cont.gold === 321 && cont.sc.includes('Game') && cont.map === 'forest', JSON.stringify(cont));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 8 FAILED' : 'STAGE 8 PASSED');
process.exit(failCount() ? 1 : 0);
