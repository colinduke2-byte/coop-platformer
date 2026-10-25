// UI overflow audit: with a busy late-game character (long item names, six-figure gold, a full pack), every menu tab and
// the shop are drawn, and no text may run off the screen, and no text in the left column may run into the right column.
//   node test/stage81_ui.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=amberwell&spawn=entry&seed=4242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(async () => {
  const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js'), { addItem } = await import('/src/systems/inventory.js');
  await import('/src/data/items4.js');
  S.flags.introDone = true; S.gold = 987654; S.charLevel = 50;
  const long = Object.keys(ITEMS).filter((id) => !ITEMS[id].gen).sort((a, b) => ITEMS[b].name.length - ITEMS[a].name.length).slice(0, 40);
  for (const id of long) addItem(id, ['potion', 'ingredient', 'food', 'ammo', 'misc'].includes(ITEMS[id].type) ? 99 : 1, true);
  for (const id of long) { S.lore = S.lore || {}; S.found = S.found || {}; S.found[id] = true; }
  for (const k of ['sandburrower', 'tombscorpion', 'captainkarrow', 'grovewarden']) S.kills[k] = 5;
  window.__long = long.slice(0, 5).map((id) => ITEMS[id].name);
});
const W = 320;
const audit = (tag) => G(([tag, W]) => {
  const m = window.__ff.game.scene.getScene('Menu') || {}, bad = [];
  const kids = m.dyn ? m.dyn.list : [];
  for (const t of kids) {
    if (t.type !== 'BitmapText' && t.type !== 'Text' && t.text == null) continue;
    const b = t.getBounds ? t.getBounds() : null; if (!b || !t.text) continue;
    if (b.right > W - 3) bad.push(`${tag}: "${String(t.text).slice(0, 30)}" ends at ${Math.round(b.right)} (screen ${W})`);
    const page = tag.split('+')[0], split = page === 'QUESTS/LOG' ? null : { ITEMS: 147, LORE: 123, QUESTS: 119 }[page.split('/')[0]];   // the log is one wide panel          // where the left panel ends on two-column tabs
    if (split && b.x < split && b.x > 6 && b.y > 22 && b.y < 156 && b.right > split + 1) bad.push(`${tag}: "${String(t.text).slice(0, 30)}" runs from the left column into the right (${Math.round(b.right)})`);
  }
  return bad;
}, [tag, W]);
const problems = [];
await G(() => { const g = window.__ff.game.scene.getScene('Game'); g.openMenu(0); return true; });
await h.sleep(500);
const names = await G(() => window.__ff.game.scene.getScene('Menu').tabs.map((t) => t.name));
// every page, and every sub-page of a page that has them (the pack's filters, the journal's views, the SYSTEM pages)
for (let i = 0; i < names.length; i++) {
  const subs = await G((i) => window.__ff.game.scene.getScene('Menu').subsOf(i), i);
  for (let s = 0; s < Math.max(1, subs.length); s++) {
    const tag = names[i] + (subs.length ? '/' + subs[s] : '');
    await G(([i, s, n]) => { const m = window.__ff.game.scene.getScene('Menu'); m.go(i); if (n) m.setSub(i, s, true); m.draw(); }, [i, s, subs.length]);
    await h.sleep(150);
    problems.push(...await audit(tag));
    // a few rows down too, so the description panes show long entries
    for (let k = 0; k < 6; k++) { await G(() => { const m = window.__ff.game.scene.getScene('Menu'); m.cursor = (m.cursor || 0) + 3; m.dirty = true; m.draw(); }); problems.push(...await audit(tag + '+' + k)); }
  }
}
await G(() => window.__ff.game.scene.stop('Menu'));
check('no menu text runs off the screen or across into the other column', problems.length === 0, '\n    ' + [...new Set(problems)].slice(0, 25).join('\n    '));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 5).join('\n'));
await h.close();
console.log(failCount() ? 'UI AUDIT FAILED' : 'UI AUDIT PASSED');
process.exit(failCount() ? 1 : 0);
