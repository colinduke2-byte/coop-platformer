// Menu screenshots for a before/after look: every top tab in keyboard and pad prompts, normal and LARGE TEXT.
//   node test/menu_shots.mjs <prefix>        -> test/out/<prefix>_<mode>_<page>.png
import { launch } from './harness.mjs';
const pre = process.argv[2] || 'menu';
const h = await launch();
await h.page.addInitScript(() => {
  window.__pads = [];
  navigator.getGamepads = () => window.__pads;
  window.__mk = (down) => ({ connected: true, id: 'Xbox (STANDARD GAMEPAD)', mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: down.includes(i), value: down.includes(i) ? 1 : 0 })) });
});
await h.open('scene=game&map=greenhollow&spawn=entry&seed=777');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(async () => {
  const S = window.__ff.S, { addItem } = await import('/src/systems/inventory.js');
  window.__set = (await import('/src/systems/settings.js')).settings;
  S.flags.introDone = true; S.gold = 12345; S.charLevel = 12; S.perkPoints = 1;
  for (const id of ['iron_sword', 'steel_sword', 'ember_dagger', 'sunplate', 'verdant_mail', 'veil_helm', 'glyph_shield', 'dune_bow', 'hp_potion', 'thornvine', 'honeycomb']) addItem(id, id === 'hp_potion' ? 5 : 1, true);
  S.equip.weapon = 'iron_sword'; S.equip.armor = 'verdant_mail';
  (await import('/src/systems/stats.js')).recalc();
});
const PAGES = ['ITEMS', 'SKILLS', 'PERKS', 'QUESTS', 'LORE', 'FEATS', 'MAP', 'SYSTEM'];
for (const mode of ['kb', 'kb_large', 'pad', 'pad_large']) {
  await G((big) => { window.__set.largeText = big; }, mode.endsWith('large'));
  if (mode.startsWith('pad')) { await G(() => { window.__pads = [window.__mk([10])]; }); await h.sleep(150); await G(() => { window.__pads = [window.__mk([])]; }); await h.sleep(150); }
  for (const p of PAGES) {
    await G((n) => { const g = window.__ff.game.scene.getScene('Game'); if (window.__ff.game.scene.isActive('Menu')) window.__ff.game.scene.stop('Menu'); g.openMenu(-1, n); }, p);
    await h.sleep(400);
    if (p === 'ITEMS') await G(() => { const m = window.__ff.game.scene.getScene('Menu'); const l = m.inventory(); m.cursor = Math.max(0, l.indexOf('ember_dagger')); m.dirty = true; });
    await h.sleep(250);
    await h.shot(`${pre}_${mode}_${p.toLowerCase()}`);
  }
  await G(() => window.__ff.game.scene.stop('Menu'));
  await h.sleep(200);
}
console.log(h.errors.length ? 'ERRORS ' + h.errors.join('\n') : 'shots done');
await h.close();
