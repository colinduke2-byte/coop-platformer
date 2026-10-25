// The simpler menu: five top tabs (GEAR, CHARACTER, JOURNAL, MAP, SYSTEM) whose pages and views are sub-pages in a strip
// (Q / TAB or LT / RT steps along it, A / D or LB / RB changes tab), the last tab and sub-page remembered, the shortcut keys
// landing on the right page, every old page still reachable, and the help line short. Then the pack's gear comparison:
// the card's verdict and rows, the list marks matching the verdict, the WORN sub-page, and everything fitting 320x180 in
// normal and LARGE TEXT, keyboard and pad.
//   node test/stage130_menus.mjs
import { launch, check, failCount, FRAME_MS } from './harness.mjs';
const h = await launch();
await h.page.addInitScript(() => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads;
  window.__mk = (down) => ({ connected: true, id: 'Xbox (STANDARD GAMEPAD)', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })) });
});
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.pause();
const G = (fn, a) => h.ev(fn, a);
const F = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const wait = (ms) => h.frames(F(ms));
const tap = (c) => h.tap(c, F(70), F(70));
await wait(800);
await G(async () => {
  const S = window.__ff.S, { addItem } = await import('/src/systems/inventory.js');
  window.__set = (await import('/src/systems/settings.js')).settings;
  S.flags.introDone = true; S.flags.tutDone = true; S.gold = 4321;
  for (const id of ['iron_sword', 'ember_dagger', 'rusty_sword', 'verdant_mail', 'glyph_shield', 'hp_potion']) addItem(id, 1, true);
  S.equip.weapon = 'iron_sword';
  (await import('/src/systems/stats.js')).recalc();
});
const menu = () => G(() => { const sm = window.__ff.game.scene, m = sm.getScene('Menu'); if (!sm.isActive('Menu')) return null; return { group: m.groups[m.groupOf()].name, page: m.pageName(), tab: m.tabs[m.tab].name, groups: m.groups.map((g) => g.name), strip: m.strip().map((e) => e.label) }; });
const closeMenu = async () => { await G(() => { const sm = window.__ff.game.scene; if (sm.isActive('Menu')) sm.getScene('Menu').close(); }); await wait(200); };
const open = async (name) => { await closeMenu(); await G((n) => window.__ff.game.scene.getScene('Game').openMenu(-1, n), name); await wait(250); return menu(); };
const texts = () => G(() => window.__ff.game.scene.getScene('Menu').dyn.list.filter((t) => t.text).map((t) => t.text).join('|'));

// ---- structure: five tabs, each with its strip
const m0 = await open('ITEMS');
check('five top tabs: GEAR, CHARACTER, JOURNAL, MAP, SYSTEM', m0.groups.join(',') === 'GEAR,CHARACTER,JOURNAL,MAP,SYSTEM', m0.groups.join(','));
check('GEAR\'s strip is the pack views and WORN', m0.group === 'GEAR' && m0.strip.join(',') === 'ALL,ARMS,USE,OTHER,WORN', JSON.stringify(m0));
const strips = {};
for (const n of ['SKILLS', 'QUESTS', 'MAP', 'SYSTEM']) { const m = await open(n); strips[m.group] = m.strip.join(','); }
check('CHARACTER: skills and perks; JOURNAL: quests, log, lore, beasts, guide, feats; SYSTEM: its four pages', strips.CHARACTER === 'SKILLS,PERKS' && strips.JOURNAL === 'QUESTS,LOG,LORE,BEASTS,GUIDE,FEATS' && strips.SYSTEM === 'GAME,SOUND,SCREEN,INPUT' && strips.MAP === 'MAP', JSON.stringify(strips));

// ---- every old tab and every sub-page is still reachable by name
const reach = {};
for (const n of ['ITEMS', 'SKILLS', 'PERKS', 'QUESTS', 'LOG', 'LORE', 'BEASTS', 'GUIDE', 'FEATS', 'MAP', 'SYSTEM', 'WORN', 'ARMS', 'SOUND', 'INPUT']) { const m = await open(n); reach[n] = m.page === n || (n === 'ITEMS' && m.group === 'GEAR') || (n === 'SYSTEM' && m.page === 'GAME'); }
check('every old tab (ITEMS, SKILLS, QUESTS, PERKS, LORE, FEATS, MAP, SYSTEM) and every sub-page opens by name', Object.values(reach).every(Boolean), JSON.stringify(reach));

// ---- keyboard: A / D change tab, Q and TAB step the strip
await open('ALL');
await tap('KeyD'); const d1 = await menu();
await tap('KeyD'); const d2 = await menu();
await tap('KeyA'); await tap('KeyA'); const a2 = await menu();
check('D / A step through the top tabs', d1.group === 'CHARACTER' && d2.group === 'JOURNAL' && a2.group === 'GEAR', [d1.group, d2.group, a2.group].join(' '));
await tap('KeyQ'); const q1 = await menu();
await tap('Tab'); const q2 = await menu();
check('Q and TAB step through the sub-pages', q1.page === 'ARMS' && q2.page === 'USE', q1.page + ' ' + q2.page);
await G(() => { window.__ff.keys.wheel = 1; window.__ff.keys.wheelT = performance.now(); window.__ff.keys._press('WheelDown'); }); await wait(40); await G(() => window.__ff.keys._release('WheelDown')); await wait(60);
check('a mouse wheel turn scrolls, it does not change the sub-page', (await menu()).page === 'USE');
for (let i = 0; i < 3; i++) await tap('KeyQ');
check('the strip wraps round (USE -> OTHER -> WORN -> ALL)', (await menu()).page === 'ALL');
// across pages inside a tab: QUESTS -> LOG -> LORE (another page) -> ... -> FEATS -> QUESTS
await open('QUESTS');
const seen = [];
for (let i = 0; i < 6; i++) { await tap('KeyQ'); seen.push((await menu()).page); }
check('the JOURNAL strip runs over its three pages and wraps', seen.join(',') === 'LOG,LORE,BEASTS,GUIDE,FEATS,QUESTS', seen.join(','));

// ---- the menu remembers the tab and sub-page
await open('BEASTS'); await tap('KeyD'); await tap('KeyA');
check('back on a tab, its sub-page is where you left it', (await menu()).page === 'BEASTS');
await open('SOUND'); await open('JOURNAL');
check('opening a tab by name lands on its remembered sub-page', (await menu()).page === 'BEASTS');
await open('ARMS'); await closeMenu();
check('closing remembers the page for START (ui.lastMenuTab)', (await G(async () => (await import('/src/systems/ui.js')).ui.lastMenuTab)) === 'ARMS');

// ---- shortcut keys from the field and inside the menu
await closeMenu(); await wait(200);
await tap('KeyI'); const ki = await menu();
check('I opens GEAR', ki?.group === 'GEAR', JSON.stringify(ki));
await tap('KeyO'); const ko = await menu();
check('O inside the menu goes to the quest list (not the remembered BEASTS)', ko?.page === 'QUESTS', JSON.stringify(ko));
await tap('KeyO'); await wait(100);
check('O on the quest list closes the menu', (await menu()) === null);
await wait(200); await tap('KeyO');
check('O in the field opens JOURNAL on QUESTS', (await menu())?.page === 'QUESTS');
await tap('KeyM');
check('M goes to MAP', (await menu())?.page === 'MAP');
await tap('KeyM'); await wait(100);
check('M on the map closes it', (await menu()) === null);
await wait(200); await tap('KeyM'); await tap('KeyI');
check('I inside the menu goes to GEAR', (await menu())?.group === 'GEAR');
await tap('KeyI'); await wait(100);
check('I on GEAR closes it', (await menu()) === null);
await wait(200); await tap('Escape');
const esc = await menu();
check('ESC in the field opens SYSTEM at its first row (RESUME)', esc?.group === 'SYSTEM' && esc.page === 'GAME', JSON.stringify(esc));
await tap('KeyQ');
check('Q on SYSTEM jumps to the next of its pages', (await menu()).page === 'SOUND');

// ---- the help line: short (at most four hints, ESC CLOSE among them) on every page and sub-page
const helps = await G(async () => {
  const m = window.__ff.game.scene.getScene('Menu'), out = [];
  for (let i = 0; i < m.tabs.length; i++) for (let s = 0; s < Math.max(1, m.subsOf(i).length); s++) {
    m.go(i); if (m.subsOf(i).length) m.setSub(i, s, true); m.draw();
    out.push(m.pageName() + ': ' + m.dyn.list.filter((t) => t.y === 168).map((t) => t.text).join(' '));
  }
  return out;
});
const segs = (x) => x.split(': ').slice(1).join(': ').split(/\s{2,}/).filter(Boolean).length;
check('every help line has at most four hints and says how to close', helps.every((x) => segs(x) <= 4 && /ESC CLOSE|ESC RESUME|ESC DONE/.test(x)), helps.filter((x) => segs(x) > 4 || !/ESC/.test(x)).join(' | '));
check('the tab bar names the keys that change tab and sub-page', /<A\|/.test(await texts()) && /\|D>/.test(await texts()) && /\|Q>/.test(await texts()), (await texts()).slice(0, 200));

// ---- the gear card
const card = async (id, sub = 'ALL') => {
  await open(sub);
  return G((id) => { const m = window.__ff.game.scene.getScene('Menu'); const l = m.inventory(); m.cursor = l.indexOf(id); m.scroll = Math.max(0, m.cursor - 2); m.info = false; m.draw(); return { all: m.dyn.list.filter((t) => t.text).map((t) => t.text).join('|'), sel: m.selectedId() }; }, id);
};
const ember = await card('ember_dagger');
check('a better weapon: BETTER, against the worn one, with damage / speed rows and green deltas', /\|BETTER\|/.test(ember.all) && /VS IRON SWORD/.test(ember.all) && /\|DAMAGE\|/.test(ember.all) && /\|SPEED\|/.test(ember.all) && /▲\d+/.test(ember.all) && /\|▶\|/.test(ember.all), ember.all.slice(0, 400));
await h.shot('s130_gear_better');
const rusty = await card('rusty_sword');
check('a worse weapon: WORSE, with a red ▼ delta', /\|WORSE\|/.test(rusty.all) && /▼\d/.test(rusty.all), rusty.all.slice(0, 300));
const iron = await card('iron_sword');
check('the worn weapon: EQUIPPED, WORN: WEAPON, no arrows', /\|EQUIPPED\|/.test(iron.all) && /WORN: WEAPON/.test(iron.all) && !/▶/.test(iron.all), iron.all.slice(0, 300));
await G(async () => { window.__ff.S.equip.armor = null; (await import('/src/systems/stats.js')).recalc(); });
const mail = await card('verdant_mail');
check('nothing worn there: compared against NO ARMOUR', /VS NO ARMOUR/.test(mail.all) && /\|ARMOUR\|/.test(mail.all), mail.all.slice(0, 300));
const pot = await card('hp_potion');
check('a potion shows what it is, its weight and worth, and its description (no verdict)', /POTION/.test(pot.all) && /WEIGHT/.test(pot.all) && !/BETTER|WORSE/.test(pot.all), pot.all.slice(0, 300));
// the list marks say the same as the verdict, for every piece of gear in the pack
const marks = await G(async () => {
  const m = window.__ff.game.scene.getScene('Menu'), C = await import('/src/ui/gearCompare.js'), out = [];
  m.go(0); m.setSub(0, 0, true);
  const l = m.inventory();
  for (let i = 0; i < l.length; i++) {
    m.cursor = i; m.scroll = Math.max(0, i - 2); m.draw();
    const cmp = C.compareGear(l[i]); if (!cmp || cmp.worn) continue;
    const y = 31 + (i - m.scroll) * 18, row = m.dyn.list.filter((t) => t.text && t.y >= y && t.y < y + 17 && t.x > 100 && t.x < 146).map((t) => t.text).join('');
    const want = { BETTER: '▲', WORSE: '▼', MIXED: '◆' }[cmp.badge] || '';
    out.push({ id: l[i], badge: cmp.badge, row, ok: want ? row.includes(want) : !/[▲▼◆]/.test(row) });
  }
  return out;
});
check('every list mark matches its verdict (▲ BETTER, ▼ WORSE, ◆ MIXED, none for SAME)', marks.length >= 3 && marks.every((x) => x.ok), JSON.stringify(marks.filter((x) => !x.ok)));
// G swaps the numbers for the description, and back
const info = await G(async () => {
  const m = window.__ff.game.scene.getScene('Menu'), l = m.inventory(); m.cursor = l.indexOf('ember_dagger'); m.dirty = true; m.draw();
  return m.dyn.list.filter((t) => t.text).map((t) => t.text).join('|');
});
await tap('KeyG'); const infoOn = await texts();
await tap('KeyG'); const infoOff = await texts();
check('G shows the description in place of the rows, and G goes back', /G DETAILS/.test(info) && /EMBERHOLD FIRES|EDGE FLICKERS/.test(infoOn.replace(/\n/g, ' ')) && !/\|DAMAGE\|/.test(infoOn) && /\|DAMAGE\|/.test(infoOff), infoOn.slice(0, 300));
// WORN lists every slot; E there takes the piece off
await open('WORN');
const worn = await texts();
check('WORN lists the six slots, empty ones too, and the totals', /\|WEAPON\|/.test(worn) && /\|OFFHAND\|/.test(worn) && /\|EMPTY\|/.test(worn) && /ATTACK/.test(worn) && /EQUIPPED/.test(worn), worn.slice(0, 300));
await tap('KeyE');
check('E on a worn slot takes it off', (await G(() => window.__ff.S.equip.weapon)) === null);
await G(async () => { window.__ff.S.equip.weapon = 'iron_sword'; (await import('/src/systems/stats.js')).recalc(); });

// ---- everything fits 320x180: normal and LARGE TEXT, every page and sub-page, with a busy card selected
const audit = (big) => G(async (big) => {
  window.__set.largeText = big;
  const m = window.__ff.game.scene.getScene('Menu'), bad = [];
  for (let i = 0; i < m.tabs.length; i++) for (let s = 0; s < Math.max(1, m.subsOf(i).length); s++) {
    m.go(i); if (m.subsOf(i).length) m.setSub(i, s, true);
    if (m.tabs[i].name === 'ITEMS') { const l = m.inventory(); m.cursor = Math.max(0, l.indexOf('ember_dagger')); }
    m.draw();
    for (const t of m.dyn.list) {
      if (!t.text || !t.getBounds) continue;
      const b = t.getBounds();
      if (b.right > 317 || b.bottom > 179 || b.x < 3) bad.push(`${m.pageName()}: "${String(t.text).slice(0, 20)}" at ${Math.round(b.x)}..${Math.round(b.right)},${Math.round(b.bottom)}`);
      if (big && b.y >= 160 && b.y < 177) bad.push(`${m.pageName()}: "${String(t.text).slice(0, 20)}" under the big help strip`);
    }
  }
  window.__set.largeText = false;
  return bad;
}, big);
await open('ALL');
const fitN = await audit(false), fitL = await audit(true);
check('normal text: nothing off screen on any page or sub-page', fitN.length === 0, fitN.slice(0, 8).join(' | '));
check('LARGE TEXT: nothing off screen or under the big help line', fitL.length === 0, fitL.slice(0, 8).join(' | '));
await G(() => { window.__set.largeText = true; }); await open('ALL');
await G(() => { const m = window.__ff.game.scene.getScene('Menu'), l = m.inventory(); m.cursor = l.indexOf('ember_dagger'); m.draw(); });
await wait(100); await h.shot('s130_gear_large');
await G(() => { window.__set.largeText = false; });
await open('ARMS'); await closeMenu();

// ---- the pad: LB / RB tabs, LT / RT sub-pages, X offhand, B closes, START reopens where you were; prompts name them
const padTap = async (b) => { await G((b) => { window.__pads = [window.__mk([b])]; }, b); await wait(80); await G(() => { window.__pads = [window.__mk([])]; }); await wait(80); };
await padTap(9); await wait(150);                                // START (the menu opens on the last page: ARMS)
const st = await menu();
check('START reopens the menu on the last tab and sub-page', st?.page === 'ARMS', JSON.stringify(st));
await padTap(7); const rt = await menu();
await padTap(6); await padTap(6); const lt = await menu();
check('RT / LT step the sub-pages forward and back', rt?.page === 'USE' && lt?.page === 'ALL', `${rt?.page} ${lt?.page}`);
await padTap(5); const rb = await menu();
await padTap(4); const lb = await menu();
check('RB / LB change tab', rb?.group === 'CHARACTER' && lb?.group === 'GEAR', `${rb?.group} ${lb?.group}`);
const padText = await G(() => { const m = window.__ff.game.scene.getScene('Menu'), l = m.inventory(); m.cursor = l.indexOf('ember_dagger'); m.draw(); return m.dyn.list.filter((t) => t.text).map((t) => t.text).join('|'); });
check('pad prompts: LB / RB on the tab bar, LT/RT on the strip, A EQUIP, X OFFHAND, Y SORT on the help line', /<LB\|/.test(padText) && /RB>/.test(padText) && /LT\/RT/.test(padText) && /A EQUIP/.test(padText) && /X OFFHAND/.test(padText) && /Y SORT/.test(padText), padText.slice(0, 400));
await h.shot('s130_gear_pad');
await padTap(2);
check('X puts a one-handed weapon in the off hand', (await G(() => window.__ff.S.equip.offhand)) === 'ember_dagger');
await padTap(1); await wait(100);
check('B closes the menu', (await menu()) === null);
check('the pad buttons belong to the game again once the menu is shut (X swings, no sub-page keys)', (await G(async () => (await import('/src/systems/keys.js')).menuPadButton('KeyF'))) === null);

check('no page errors', h.errors.length === 0, h.errors.slice(0, 5).join('\n'));
await h.close();
console.log(failCount() ? 'MENUS FAILED' : 'MENUS PASSED');
process.exit(failCount() ? 1 : 0);
