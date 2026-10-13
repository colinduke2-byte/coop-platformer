// UI audit screenshots: every menu tab and a few busy states, written to test/out/ui_*.png for a human (or Claude) to look at.
//   node test/ui_shots.mjs [filter]
import { launch } from './harness.mjs';
const only = process.argv[2] || '';
const h = await launch();
await h.open('scene=game&map=greenhollow&spawn=entry&seed=777');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
// a busy mid-game character: lots of gold, a full pack, heavy gear, a few buffs
await G(async () => {
  const S = window.__ff.S, { addItem } = await import('/src/systems/inventory.js');
  S.flags.introDone = true; S.gold = 123456; S.charLevel = 37;
  for (const id of ['sunplate', 'hulk_heart', 'verdant_mail', 'dust_cloak', 'veil_helm', 'leaf_cowl', 'glyph_shield', 'karrow_blade', 'sunbreaker', 'winterward', 'tome_sunbeam', 'dune_bow', 'iron_sword', 'steel_sword', 'hp_potion', 'hp_potion_g', 'thornvine', 'honeycomb', 'stinger', 'sand_glass', 'linen_wrap', 'moss_heart', 'valeroot', 'sunpetal']) addItem(id, id.includes('potion') || ['thornvine', 'honeycomb', 'stinger', 'sand_glass', 'linen_wrap', 'valeroot', 'sunpetal'].includes(id) ? 12 : 1, true);
  S.equip.armor = 'sunplate'; S.equip.head = 'veil_helm';
  (await import('/src/systems/stats.js')).recalc();
});
const shots = [];
const shot = async (name) => { if (name.includes(only)) { await h.shot('ui_' + name); shots.push(name); } };
for (const [tab, name] of [[0, 'pack'], [1, 'gear'], [-1, 'QUESTS'], [-1, 'MAP'], [-1, 'SYSTEM'], [-1, 'LORE'], [-1, 'PERKS']]) {
  await G(([t, n]) => { const g = window.__ff.game.scene.getScene('Game'); if (window.__ff.game.scene.isActive('Menu')) window.__ff.game.scene.stop('Menu'); g.openMenu(t, n === 'pack' || n === 'gear' ? undefined : n); }, [tab, name]);
  await h.sleep(500);
  await shot(name.toLowerCase());
  for (const k of ['KeyR', 'KeyR', 'KeyR']) { if (name !== 'pack') break; await G((c) => window.__ff.keys._press(c), k); await h.sleep(60); await G((c) => window.__ff.keys._release(c), k); await h.sleep(120); }
  if (name === 'pack') await shot('pack_sorted');
}
await G(() => window.__ff.game.scene.stop('Menu'));
// shop with a heavy armour selected
await G(async () => { const Sv = await import('/src/data/services.js'); window.__shop = Sv.buyMenu('Khalid', [{ id: 'sunplate', price: 900, once: true }, { id: 'glyph_shield', price: 760, once: true }, { id: 'hp_potion', price: 26 }]); });
await h.sleep(600); await shot('shop_heavy');
await G(() => window.__ff.keys._press('Escape')); await h.sleep(80); await G(() => window.__ff.keys._release('Escape')); await h.sleep(300);
// HUD with burdened state and buffs
await G(async () => { const S = window.__ff.S; S.inv.iron_ingot = 60; (await import('/src/systems/burden.js')).invalidate(); });
await h.sleep(800); await shot('hud_burdened');
console.log('shots:', shots.join(', '), h.errors.length ? '\nERRORS ' + h.errors.join('\n') : '');
await h.close();
