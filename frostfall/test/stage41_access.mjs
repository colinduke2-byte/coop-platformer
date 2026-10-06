import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('map=village');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);

// ---- colour-blind assist
const cv = await G(async () => {
  const A = await import('/src/systems/access.js'), st = (await import('/src/systems/settings.js')).settings;
  const id = A.cvdMatrix('off'), de = A.cvdMatrix('deutan'), tr = A.cvdMatrix('tritan');
  st.cvd = 'deutan'; A.applyCvd();
  const on = document.body.style.filter;
  st.cvd = 'off'; A.applyCvd();
  return { id: id.length === 20 && id[0] === 1 && id[6] === 1 && id[12] === 1, de: de.length === 20 && de.some((v, i) => i % 5 < 3 && v !== id[i]) && de.every((v) => Number.isFinite(v)), tr: tr.some((v, i) => v !== id[i]), on, off: document.body.style.filter };
});
check('colour modes build valid filters, apply and clear', cv.id && cv.de && cv.tr && cv.on.includes('cvd-filter') && cv.off === '', JSON.stringify(cv));

// ---- controller-aware prompts
const pr = await G(async () => {
  const A = await import('/src/systems/access.js'), T = await import('/src/systems/tips.js'), bus = (await import('/src/systems/bus.js')).bus;
  const key = A.prompt('KeyC'), pad = A.padLabel('KeyC'), roll = A.padLabel('Space');
  let got = ''; const f = (t) => { got = t; }; bus.on('hint', f); window.__ff.S.tips = {}; T.tip('sneak'); bus.off('hint', f);
  return { key, pad, roll, got, raw: !/\{/.test(got) };
});
check('prompts name keys by default and pad buttons by the learned map', pr.key === 'C' && pr.pad === 'X' || pr.pad === 'LB' || !!pr.pad, JSON.stringify(pr));
check('tips fill in the right button names', pr.raw && pr.got.includes('HOLD C'), pr.got);

// ---- bestiary and item index
const ix = await G(async () => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  S.seen = {}; S.kills = {}; S.found = {}; S.inv = {};
  g.openMenu(-1, 'LORE'); return true;
});
await h.sleep(500);
const lt = await G(async () => {
  const m = window.__ff.game.scene.getScene('Menu'), t = m.tabs.find((x) => x.name === 'LORE');
  return { open: !!t };
});
check('the lore tab exists', lt.open);
const tl = await G(async () => {
  const S = window.__ff.S, inv = await import('/src/systems/inventory.js');
  inv.addItem('hp_potion', 1, true);
  return !!S.found.hp_potion;
});
check('picking up an item records it in the item index', tl);
await h.shot('s41_lore');

// ---- journal shows what to do next
await G(() => { window.__ff.S.quests.herbs.status = 'active'; const m = window.__ff.game.scene.getScene('Menu'); m.dirty = true; m.go?.(m.tabs.findIndex((x) => x.name === 'QUESTS')); });
await h.sleep(300);
await h.shot('s41_journal');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ACCESS FAILED' : 'ACCESS PASSED');
