// Story fixes (ST4-ST18, ST24, NP12): keys in speech follow the bindings, Emberhold reacts to the right choice, Sigrid
// follows the Hearts you hold, the Sovereign greets you by your Winter choice, barks fit the creature, thieves are named
// properly, each giver says their own thank-you, the bestiary knows every story boss.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = []; window.__who = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); window.__who.push(n); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const SCRIPT = (name) => G(async (n) => { await import('/src/data/emberhold.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS[n](); }, name);
const said = () => G(() => window.__said.join(' | '));

// ---- NP12 / ST14: key names come from the player's bindings
const keysOut = await G(async () => {
  const A = await import('/src/systems/access.js'), C = await import('/src/config.js'), I = await import('/src/data/items.js');
  const old = { sneak: [...C.BINDINGS.sneak], block: [...C.BINDINGS.block] };
  const before = { talk: A.keyText('Hold {KeyC} to sneak.'), shield: I.ITEMS.wooden_shield.desc };
  C.BINDINGS.sneak[0] = 'KeyZ'; C.BINDINGS.block[0] = 'KeyB';
  const after = { talk: A.keyText('Hold {KeyC} to sneak.'), shield: I.ITEMS.wooden_shield.desc };
  // the real dialogue box fills the tokens too
  const hud = window.__ff.game.scene.getScene('Hud'); hud.say('Sigrid', 'Hold {KeyC} to sneak.');
  const page = hud.dlg?.pages?.[0] || ''; hud.dlg?.res?.(); hud.dlg = null;
  C.BINDINGS.sneak.splice(0, 9, ...old.sneak); C.BINDINGS.block.splice(0, 9, ...old.block);
  return { before, after, page };
});
check('speech and item text name the default keys', /Hold C to sneak/.test(keysOut.before.talk) && /Hold F to block/.test(keysOut.before.shield), JSON.stringify(keysOut.before));
check('after rebinding, speech and item text follow the new keys', /Hold Z to sneak/.test(keysOut.after.talk) && /Hold B to block/.test(keysOut.after.shield), JSON.stringify(keysOut.after));
check('the dialogue box itself shows the bound key', /HOLD Z TO SNEAK/i.test(keysOut.page) && !/\{Key/.test(keysOut.page), keysOut.page);
const hard = await G(async () => {
  const files = ['dialogue', 'items', 'emberhold', 'hamlets', 'sidequests', 'companionquests', 'regions2_story', 'regions3_story', 'regions4_story'];
  const bad = [];
  for (const f of files) {
    const src = await (await fetch('/src/data/' + f + '.js')).text();
    for (const m of src.matchAll(/'[^'\n]*\b(?:Hold|Press|press|with) (?:[A-Z]|Space|Shift)\b[ .,][^'\n]*'/g)) bad.push(f + ': ' + m[0].slice(0, 60));
  }
  return bad;
});
check('no speech or item text hard-codes a key letter', hard.length === 0, hard.join(' / '));

// ---- ST5: Emberhold reacts to the Winter choice, not the Frostheart choice
await G(() => { const S = window.__ff.S; S.flags.ending = 'give'; S.flags.finale = 'crown'; S.flags.corvinN = 1; S.flags.ketilN = 2; S.flags.goranN = 2; });
await stub([]); await SCRIPT('corvin'); await SCRIPT('ketil');
let t = await said();
check('Corvin and Ketil speak of the crowned Winter, not of a Winter let go', !/let go/.test(t) && /crown of rime/.test(t) && !/\*/.test(t), t);
await G(() => { const S = window.__ff.S; S.flags.ending = 'sell'; S.flags.finale = 'thaw'; S.flags.ketilN = 2; S.flags.goranN = 2; S.quests.missingpage.status = 'inactive'; S.flags.metYsolde = false; });
await stub([]); await SCRIPT('ketil'); await SCRIPT('goran');
t = await said();
check('Ketil sings the thaw; Goran knows you sold the Frostheart, not the Winter', /summer/.test(t) && /Frostheart to a potion-seller/.test(t), t);
await unstub();

// ---- ST8: Sigrid names the first Heart you do not hold yet
await stub([]);
const sig = await G(async () => {
  const S = window.__ff.S, d = await import('/src/data/dialogue.js'), out = [];
  S.quests.king.status = 'done'; S.quests.hearts.status = 'active'; S.flags.chapter3 = false; S.flags.finale = undefined;
  for (const hs of [{ tide: true }, { rime: true, tide: true }, { rime: true, iron: true, root: true }]) {
    S.hearts = hs; window.__said = []; await d.sigrid(); out.push(window.__said.join(' '));
  }
  return out;
});
check('Sigrid guides by the Hearts you hold, in any order', /Glacial Maw/.test(sig[0]) && /Ironwatch/.test(sig[1]) && /Drowned Chapel/.test(sig[2]) && /^The cold bends/.test(sig[0]) && /^Two Hearts/.test(sig[1]), JSON.stringify(sig));
await unstub();

// ---- ST13: the Sovereign greets you by what you did with the Winter
const sov = await G(async () => { const T = (await import('/src/data/story.js')).BOSS_TAUNTS, S = window.__ff.S, o = {}; for (const f of ['thaw', 'warden', 'crown']) { S.flags.finale = f; o[f] = T.sovereign.engage; } return o; });
check('the Sovereign\'s greeting follows the Winter choice', /walk free/.test(sov.thaw) && /leash/.test(sov.warden) && /wear my brother/.test(sov.crown) && Object.values(sov).every((l) => /ask my question/.test(l)), JSON.stringify(sov));

// ---- ST15: barks fit the creature, and none assumes the player's gender
const bk = await G(async () => {
  const { ENEMIES, BARKS } = await import('/src/data/enemies.js');
  const lines = Object.values(BARKS).flatMap((b) => [...(b.alert || []), ...(b.flee || [])]);
  return { missing: Object.entries(ENEMIES).filter(([, e]) => e.bark && !BARKS[e.bark]).map(([k]) => k), him: lines.filter((l) => /\bHIM\b|\bHER\b/.test(l)), stars: lines.filter((l) => l.includes('*')),
    kinds: Object.fromEntries(['glimmerkin', 'golem', 'leech', 'mudlurker', 'troll', 'shroom', 'imp', 'draugr', 'wolf', 'bandit', 'sovereign'].map((k) => [k, ENEMIES[k]?.bark || null])) };
});
check('every bark set exists, none says HIM or uses asterisks', !bk.missing.length && !bk.him.length && !bk.stars.length, JSON.stringify(bk));
check('fey, constructs, critters, beasts and plants have their own barks', bk.kinds.glimmerkin === 'fey' && bk.kinds.golem === 'construct' && bk.kinds.leech === 'critter' && bk.kinds.mudlurker === 'beast' && bk.kinds.troll === 'beast' && bk.kinds.shroom === 'plant' && bk.kinds.imp === 'fey' && bk.kinds.draugr === 'undead' && bk.kinds.wolf === 'wolf' && bk.kinds.bandit === 'human' && bk.kinds.sovereign === null, JSON.stringify(bk.kinds));

// ---- ST18: a thief is shouted at by the person's name, not the last word of their sign
const sp = await G(async () => { const d = await import('/src/data/dialogue.js'); return ['MARIT, THE LANTERN INN', 'GUDRUN OF THE LONGHOUSE', 'ODDRUN OF THE LONG BENCH', 'TOBIN THE LAMP-SELLER', 'ORM THE FERRYMAN', 'ELDER SIGRID', 'GUARD HALDOR', 'HARBOUR WATCH', 'MADAM PERPETUA, TAILOR', 'GULL & ANCHOR, MADDY'].map(d.speakerName); });
check('thieves are named by their first name', sp.join(',') === 'MARIT,GUDRUN,ODDRUN,TOBIN,ORM,SIGRID,HALDOR,HARBOUR WATCH,PERPETUA,MADDY', sp.join(','));

// ---- ST17: each Hollowfrost side quest has its giver's own thank-you
await G(() => { const S = window.__ff.S; S.quests.hamlets.status = 'active'; S.flags.metTrapper = S.flags.metFisher = S.flags.metProspector = true; S.quests.wolves.status = 'done'; });
await stub([]); await G(async () => { await import('/src/data/sidequests.js'); const d = await import('/src/data/dialogue.js'); await d.SCRIPTS.bjorn(); });
t = await said();
check('Bjorn thanks you for the hamlet rounds in his own words', /rounds are walked/.test(t) && !/You did it. All of it/.test(t) && (await G(() => window.__ff.S.quests.hamlets.status)) === 'done', t);
await unstub();

// ---- ST24: the bestiary knows the story bosses; ST7: the Wardens give a pennant, not a second banner
const be = await G(async () => { const { BEASTS } = await import('/src/data/lore.js'); await import('/src/data/enemies4.js'); const { ITEMS } = await import('/src/data/items.js'); return { miss: ['kragnar', 'admiral', 'sovereign', 'hollowking', 'blightmother', 'vaultsovereign', 'prism'].filter((k) => !BEASTS[k]?.desc || !BEASTS[k]?.weak), pennant: ITEMS.warden_pennant?.type }; });
check('seven story bosses have bestiary entries', be.miss.length === 0, be.miss.join(','));
check("the Warden's Pennant is its own charm", be.pennant === 'charm');
const epi = await G(async () => { const S = window.__ff.S; S.flags.ragnaVeteran = true; return (await import('/src/data/story.js')).epilogueLines().join(' '); });
check('Ragna burns the rafter in the epilogue instead of hanging the banner she gave away', /burned a rafter/.test(epi) && !/banner/.test(epi), epi.slice(0, 160));

check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'STORY FIXES FAILED' : 'STORY FIXES PASSED');
