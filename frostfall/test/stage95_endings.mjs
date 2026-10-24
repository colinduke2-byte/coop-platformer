// Endings and the last road (ST3, ST4, ST11, ST12, ST19-ST23, NP13): chapter cards say CHAPTER n COMPLETE, the epilogue
// shows only on the last cards, the Scribe's turn-in plays the Crown of Memory, companions speak across the story,
// New Game+ waits for Chapter 3, and the shout's word is our own.
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

// open an ending card, jump to its last page, and read the whole text and the footer
const card = (kind) => G(async (k) => {
  const game = window.__ff.game; game.scene.start('Ending', { kind: k });
  await new Promise((r) => setTimeout(r, 400));
  const e = game.scene.getScene('Ending');
  const all = e.pages.join('\n');
  e.warm = 0; e.pi = e.pages.length - 1; e.full = e.pages[e.pi]; e.n = e.full.length; e.update(0, 16);
  const out = { title: e.children.list.find((c) => c.y === 18)?.text || '', text: all.replace(/\n/g, ' '), foot: e.end.text, pages: e.pages.length };
  e.releaseHold?.(); game.scene.stop('Ending');
  await new Promise((r) => setTimeout(r, 150));
  return out;
}, kind);

await G(() => { const S = window.__ff.S; S.flags.houndOwned = true; S.flags.alphaSpared = true; S.flags.locketKind = true; S.flags.ending = 'keep'; S.flags.finale = 'warden'; S.flags.finalChoice = 'bind'; S.flags.pellBond = true; });
const c1 = await card('keep'), c2 = await card('warden'), c3 = await card('c3_bind'), cm = await card('memory');
check('Chapter 1 ends with CHAPTER 1 COMPLETE, not THE END', /CHAPTER 1 COMPLETE/.test(c1.foot) && !/THE END/.test(c1.foot), c1.foot);
check('Chapter 2 and 3 cards say so; only the Crown of Memory says THE END', /CHAPTER 2 COMPLETE/.test(c2.foot) && /ONE ROAD REMAINS/.test(c3.foot) && /THE END/.test(cm.foot), [c2.foot, c3.foot, cm.foot].join(' | '));
check('the epilogue is not on the Chapter 1 and 2 cards', !/frost hound/i.test(c1.text) && !/frost hound/i.test(c2.text), c1.text.slice(-120));
check('the epilogue is on the Chapter 3 card and the Crown of Memory', /frost hound/i.test(c3.text) && /frost hound/i.test(cm.text));
check('the KEEP card no longer says Hollowfrost shut its doors for a hundred years', !/hundred years/i.test(c1.text) && /shut its eyes/i.test(c1.text), c1.text.slice(0, 200));
check('the Warden card lets the warden come and go', /whenever its warden is away/i.test(c2.text), c2.text.slice(0, 200));
check('the epilogue remembers Grimfang, the locket, the Frostheart and Pell', /grey wolf watches/i.test(c3.text) && /locket/i.test(c3.text) && /still carry the Frostheart/i.test(c3.text) && /Pell Quickpick now tells/i.test(c3.text), c3.text.slice(-400));
check('the Crown of Memory closes the Dreamer thread and echoes the Winter and the Fire', /dreamed someone who could/i.test(cm.text) && /hand on the chain/i.test(cm.text) && /Court of Anvils/i.test(cm.text) && cm.pages >= 2, cm.text.slice(0, 200));
const fire = await G(async () => { const T = await import('/src/data/story.js'), S = window.__ff.S; S.flags.finale = 'thaw'; return T.chapter3Ending('c3_crown').text; });
check('the crowned Fire stays on the mountain, not in the south', /stayed on the mountain/.test(fire) && !/stayed south/.test(fire));

// ---- ST20: the Scribe's turn-in plays the Crown of Memory; ST19: Sigrid names the Dreamer
await G(() => { const S = window.__ff.S; S.quests.hollowking.status = 'active'; S.flags.hollowKingDead = true; S.flags.memoryEnd = false; });
await stub([]);
const sc = await G(async () => { await import('/src/data/hamlets.js'); const d = await import('/src/data/dialogue.js'), g = window.gs(); g.pendingEnding = null; await d.SCRIPTS.scribe(); const r = { q: window.__ff.S.quests.hollowking.status, end: g.pendingEnding, mem: window.__ff.S.flags.memoryEnd, said: window.__said.join(' ') }; g.pendingEnding = null; return r; });
check('the Scribe reads the last line and the Crown of Memory follows', sc.q === 'done' && sc.end === 'memory' && sc.mem && /They dreamed you/.test(sc.said), JSON.stringify(sc).slice(0, 300));
const sg = await G(async () => { const S = window.__ff.S, d = await import('/src/data/dialogue.js'); S.quests.king.status = 'done'; S.quests.hearts.status = 'inactive'; S.flags.chapter3 = false; window.__answers = [2]; window.__said = []; await d.sigrid(); return window.__said.join(' '); });
check('Sigrid tells why the hunters call you the Dreamer', /talked in your sleep/.test(sg), sg.slice(0, 200));

// ---- ST21: the Winter's offer remembers the Frostheart; Mirra sleeps upstairs
const wo = await G(async () => { const T = await import('/src/data/story.js'), S = window.__ff.S, o = {}; for (const e of ['keep', 'sell', 'give']) { S.flags.ending = e; o[e] = T.winterOffer(); } return o; });
check('the Winter counts five Hearts if you kept the first, and knows where a sold one went', /Five Hearts/.test(wo.keep) && /potion-seller/.test(wo.sell) && /village hearth/.test(wo.give), JSON.stringify(wo));

// ---- ST23: companions remark on the story once each, and speak up at the great fights
const cp = await G(async () => {
  const S = window.__ff.S, C = await import('/src/data/companionquests.js');
  S.quests.company.status = 'active'; S.flags.arrivedEmberhold = true; S.flags.forgeOpen = false; S.flags.finalChoice = undefined; S.flags.finale = 'crown'; S.hearts = { rime: true, iron: true, tide: true, root: true }; S.quests.king.status = 'done';
  window.__said = []; await C.companionStory('Ragna'); await C.companionStory('Ragna'); await C.companionStory('Ragna');
  const r = window.__said.slice();
  S.follower = true; S.companion = 'ragna';
  const g = window.gs(), b = { kind: 'sovereign', scene: g, active: true, dead: false };
  let heard = null; const { bus } = await import('/src/systems/bus.js'); const on = (who, text) => { heard = [who, text]; }; bus.on('say', on);
  bus.emit('boss:engaged', b); await new Promise((res) => setTimeout(res, 5200)); bus.off('say', on);
  S.follower = false;
  return { r, heard };
});
check('Ragna remarks on the crowned Winter and on Emberhold, each once', cp.r.some((l) => /colder/.test(l)) && cp.r.some((l) => /badly dressed/.test(l)) && new Set(cp.r).size === cp.r.length, JSON.stringify(cp.r));
check('a companion speaks up a few seconds into the Sovereign fight', cp.heard && cp.heard[0] === 'RAGNA' && /Two arrows/.test(cp.heard[1]), JSON.stringify(cp.heard));
await unstub();

// ---- ST3: New Game+ and the slot tick wait for Chapter 3
const ng = await G(async () => {
  const SV = await import('/src/systems/save.js'), S = window.__ff.S;
  const f3 = S.flags.ending3; S.flags.ending = 'give'; S.flags.ending3 = undefined;
  SV.saveGame(window.gs(), { slot: 3, quiet: true }); SV.forgetInfo(); const a = SV.saveInfo(3).ending;
  S.flags.ending3 = 'quench'; SV.saveGame(window.gs(), { slot: 3, quiet: true }); SV.forgetInfo(); const b = SV.saveInfo(3).ending;
  SV.deleteSave(3); S.flags.ending3 = f3;
  return { a, b };
});
check('a save that only finished Chapter 1 does not count as an ending; Chapter 3 does', ng.a === false && ng.b === true, JSON.stringify(ng));

// ---- NP13: the shout's own word
const word = await G(async () => (await (await fetch('/src/entities/playerBow.js')).text()).match(/fx\.text\([^)]*'([A-Z]+!)'/)?.[1]);
check('the shout pops up HROM!, not a borrowed word', word === 'HROM!', word);

check('no page errors', h.errors.length === 0, h.errors.slice(0, 3).join('\n'));
await h.close();
console.log(failCount() ? 'ENDINGS FAILED' : 'ENDINGS PASSED');
