// One lore canon (ST1, ST2, ST9, ST25; docs/LORE_CANON.md): only the Old Kingdom's king is the Hollow King, five Hearts and
// one chain everywhere, no two speakers' names within one letter of each other, the Missing Page carries the Court's seal,
// and older saves keep a seal they earned the old way.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const SCRIPT = (name) => G(async (n) => { await import('/src/data/emberhold.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);

// ---- ST1: one Hollow King
const hk = await G(async () => {
  const Q = (await import('/src/data/quests.js')).QUESTS, M = (await import('/src/data/maps.js')).MAPS, E = (await import('/src/data/enemies.js')).ENEMIES, L = await import('/src/data/lore.js');
  const files = ['dialogue', 'quests', 'lore', 'maps', 'story', 'sidequests', 'emberhold', 'hamlets'];
  const valdrekKing = [];
  for (const f of files) { const src = await (await fetch('/src/data/' + f + '.js')).text(); for (const l of src.split('\n')) if (/Valdrek/.test(l) && /Hollow King\b/.test(l)) valdrekKing.push(f); }
  return { quest: Q.king.title, crypt: M.crypt.name, title: E.boss.title, beast: L.BEASTS.boss.desc, book: L.LORE.valdrek.title, valdrekKing, hk: E.hollowking.name };
});
check('Jarl Valdrek is the Frostsworn everywhere: quest, crypt, title, bestiary and book', hk.quest === 'The Frostsworn Jarl' && /Frostsworn/.test(hk.crypt) && /FROSTSWORN/.test(hk.title) && /Frostsworn/.test(hk.beast) && /Frostsworn/.test(hk.book) && hk.valdrekKing.length === 0, JSON.stringify(hk));
check('the Old Kingdom keeps the only Hollow King', hk.hk === 'The Hollow King');

// ---- ST2: five Hearts, one chain, forged a thousand years ago
const ch = await G(async () => {
  const L = (await import('/src/data/lore.js')).LORE, out = [];
  const text = Object.values(L).map((b) => b.text.join(' ')).join(' ');
  for (const bad of [/sixth link/i, /five chains/i, /fifth link/i, /ONE OF THE FIVE WAS NEVER A HEART/i]) if (bad.test(text)) out.push(String(bad));
  const em = await (await fetch('/src/data/emberhold.js')).text();
  if (/forty years ago/.test(em) || /five chains the Anvil/.test(em)) out.push('emberhold');
  return out;
});
check('the books and songs agree: five Hearts, one chain, no sixth link, no forty-year-old chain', ch.length === 0, ch.join(', '));

// ---- ST9 / ST25: no two speakers within one letter of each other
const reg = await G(async () => {
  for (const m of ['emberhold', 'hamlets', 'regions2_story', 'regions3_story', 'regions4_story']) await import('/src/data/' + m + '.js');
  const d = await import('/src/data/dialogue.js');
  const names = [...new Set(Object.values(d.NPC_DEFS).map((x) => d.speakerName(x.name)))];
  const ed = (a, b) => { const r = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { let p = r[0]; r[0] = i; for (let j = 1; j <= b.length; j++) { const t = r[j]; r[j] = Math.min(r[j] + 1, r[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } } return r[b.length]; };
  const close = [];
  for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) if (ed(names[i], names[j]) <= 1) close.push(names[i] + '/' + names[j]);
  return { n: names.length, close };
});
check('no two speakers\' names are within one letter of each other', reg.n > 80 && reg.close.length === 0, JSON.stringify(reg));

// ---- ST10 / ST22: the Court's seal is The Missing Page
await G(() => { const S = window.__ff.S; S.flags.chapter3 = true; S.flags.arrivedEmberhold = true; S.flags.metYsolde = false; S.quests.missingpage.status = 'inactive'; S.lore = { ...S.lore }; delete S.lore.foundry; });
await stub([]); await SCRIPT('ysolde');
let t = await G(() => window.__said.join(' '));
check('Ysolde does not give the chain\'s secret away at the first meeting', !/not iron/.test(t) && /Ask the Court/.test(t), t.slice(0, 200));
await stub([0]); await SCRIPT('goran');
const g1 = await G(async () => { const C = await import('/src/data/chapter3.js'), Q = (await import('/src/data/quests.js')); return { q: window.__ff.S.quests.missingpage.status, said: window.__said.join(' '), tg: Q.TARGETS.missingpage(), seals: C.sealCount() }; });
check('Old Goran confesses and starts The Missing Page, pointing at the old foundry on the Ashen Peaks', g1.q === 'active' && /master's master's master/.test(g1.said) && g1.tg?.map === 'ashen' && g1.seals === 0, JSON.stringify(g1));
await G(() => { const S = window.__ff.S; S.lore.foundry = true; S.flags.thessalyN = 1; });
await stub([]); await SCRIPT('brannoch');
const g2 = await G(() => { const S = window.__ff.S; return { q: S.quests.missingpage.status, seal: !!S.inv.seal_court, said: window.__said.join(' ') }; });
check('Brannoch hears the page, tells the truth of the chain and hands over the Court\'s seal', g2.q === 'done' && g2.seal && /First Fire/.test(g2.said) && /seal/.test(g2.said), JSON.stringify(g2).slice(0, 300));
await stub([]); await SCRIPT('thessaly');
t = await G(() => window.__said.join(' '));
check('Thessaly quotes the page only once it is found', /Goran told me where the page went/.test(t), t);
await unstub();

// ---- a save that earned the Court's seal the old way (A Core for the Anvil) keeps it
const mig = await G(async () => {
  const SV = await import('/src/systems/save.js'), St = await import('/src/systems/state.js'), S = St.S;
  S.quests.anvilcore.status = 'done'; S.quests.missingpage.status = 'inactive';
  SV.saveGame(window.gs(), { slot: 3, quiet: true });
  const d = JSON.parse(SV.fromCode(SV.exportSave(3))); d.v = 3; delete d.s.quests.missingpage;
  const err = SV.importSave(JSON.stringify(d), 3);
  S.quests.missingpage.status = 'inactive';
  const ok = SV.loadGame(3);
  const C = await import('/src/data/chapter3.js');
  const r = { err, ok, q: S.quests.missingpage?.status, court: C.sealCount() >= 1 };
  SV.deleteSave(3);
  return r;
});
check('an older save that finished A Core for the Anvil keeps the Court\'s seal', mig.err === '' && mig.ok && mig.q === 'done' && mig.court, JSON.stringify(mig));

check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'CANON FAILED' : 'CANON PASSED');
