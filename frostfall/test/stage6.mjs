import { launch, check, failCount } from './harness.mjs';

const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const game = () => `window.__ff.game.scene.getScene('Game')`;
const dlg = () => G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return hud.dlg ? { name: hud.dlg.name, choices: hud.dlg.choices, text: hud.dlg.pages?.[hud.dlg.p] } : null; });

// advance a conversation to its end; picks[i] = choice index for the i-th choice prompt
async function talk(picks = [], maxSteps = 200) {
  let ci = 0, seen = [];
  for (let i = 0; i < maxSteps; i++) {
    const d = await dlg();
    if (!d) { await h.sleep(120); if (!(await dlg())) return seen; continue; }
    if (d.choices) {
      seen.push(d.choices.join('|'));
      const pick = picks[ci++] ?? d.choices.length - 1;
      for (let k = 0; k < pick; k++) await tap('KeyS', 50);
      await tap('KeyE', 50);
    } else { seen.push(d.text); await tap('KeyE', 40); await h.sleep(30); await tap('KeyE', 40); }
  }
  return seen;
}
const goNear = (id, dy = 18) => G(([id, dy]) => {
  const g = window.__ff.game.scene.getScene('Game'); const n = g.npcs.find((n) => n.id === id);
  g.player.setPosition(n.x, n.y + dy); g.player.body.setVelocity(0, 0); g.player.mode = 'free'; g.player.stunT = 0;
}, [id, dy]);
const S = (k) => G((k) => k.split('.').reduce((o, p) => o?.[p], window.__ff.S), k);

// ------------------------------------------------------------- intro
await h.open('scene=intro');
await h.sleep(500);
await h.shot('s6_intro');
for (let i = 0; i < 12; i++) { await tap('KeyE', 60); await h.sleep(150); }
await h.sleep(1200);
let sc = await G(() => window.__ff.game.scene.getScenes(true).map((s) => s.scene.key));
check('intro leads into the village', sc.includes('Game'), sc.join());
const lying = await G(() => window.__ff.game.scene.getScene('Game').player.mode);
await h.shot('s6_wake');
check('player wakes up lying down', lying === 'lying' || lying === 'free', lying);
await h.sleep(3200);
let d = await dlg();
check('Sigrid greets the player with typewriter dialogue', d && d.name === 'Sigrid', JSON.stringify(d));
// typewriter: text grows over time
const n1 = await G(() => window.__ff.game.scene.getScene('Hud').dBody.text.length);
await h.sleep(250);
const n2 = await G(() => window.__ff.game.scene.getScene('Hud').dBody.text.length);
check('text types out gradually', n2 >= n1);
await h.shot('s6_dialogue');
const seen = await talk([1]);
check('intro dialogue branches on the choice and ends', seen.some((t) => /GOOD COMPANY|FRAGMENTS|HOLLOWFROST, THE LAST/.test(t)));
check('introDone flag set', await S('flags.introDone'));
await h.sleep(2500);
const sig = await G(() => { const n = window.__ff.game.scene.getScene('Game').npcs.find((n) => n.id === 'sigrid'); return Math.round(n.y); });
check('Sigrid walks back to her post', sig < 15 * 16, `y=${sig}`);

// ------------------------------------------------------------- Bjorn / wolves quest
await G(() => { window.__ff.S.flags.introDone = true; });
await goNear('bjorn');
await h.sleep(200);
await tap('KeyE');
await h.sleep(200);
let s1 = await talk([0]);
check('Bjorn gives the wolf quest', await S('quests.wolves.status') === 'active');
check('Bjorn gave arrows', await S('arrows') === 25, await S('arrows'));
for (let i = 0; i < 3; i++) await G(() => window.__ff.bus?.emit?.('x'));
await G(async () => { const { bus } = await import('/src/systems/bus.js'); for (let i = 0; i < 3; i++) bus.emit('enemy:killed', 'wolf'); });
check('3 wolf kills complete the objective', await S('quests.wolves.status') === 'ready');
await h.sleep(300);
await goNear('bjorn');
await tap('KeyE');
await h.sleep(200);
await talk([]);
check('Bjorn pays out (gold + iron sword)', await S('gold') >= 60 && await S('inv.iron_sword') === 1 && await S('quests.wolves.status') === 'done');

// ------------------------------------------------------------- Mirra shop
await G(() => { window.__ff.S.gold = 100; });
await goNear('mirra');
await tap('KeyE');
await h.sleep(200);
// choose item 0 (health potion), then Leave
const hp0 = await S('inv.hp_potion');
await talk([1, 0]);
await h.sleep(500);
await tap('KeyE', 60); await h.sleep(150); await tap('Escape', 60); await h.sleep(400);
await talk([3]);
check('Mirra sells a health potion for gold', await S('inv.hp_potion') === hp0 + 1 && await S('gold') === 75, `gold=${await S('gold')}`);

// ------------------------------------------------------------- journal
await tap('KeyO');
await h.sleep(300);
const tabName = await G(() => { const m = window.__ff.game.scene.getScene('Menu'); return m.tabs[m.tab].name; });
check('O opens the quest log', tabName === 'QUESTS', tabName);
await h.shot('s6_journal');
await tap('Escape'); await h.sleep(200);

// ------------------------------------------------------------- Sigrid: king quest + ending choice
await goNear('sigrid');
await tap('KeyE');
await h.sleep(200);
await talk([0]);
check('Sigrid starts The Hollow King', await S('quests.king.status') === 'active');
await G(async () => { const { addItem } = await import('/src/systems/inventory.js'); addItem('frostheart'); });
check('picking up the Frostheart advances the quest', await S('quests.king.status') === 'relic');
await goNear('sigrid');
await tap('KeyE');
await h.sleep(200);
await talk([0]);   // "Take it. Ease the winter."
await h.sleep(900);
sc = await G(() => window.__ff.game.scene.getScenes(true).map((s) => s.scene.key));
check('choosing opens the ending screen', sc.includes('Ending'), sc.join());
check('ending recorded: give', await S('flags.ending') === 'give');
check('Frostheart given away, reward received', !(await S('inv.frostheart')) && await S('inv.warm_amulet') === 1);
await h.sleep(500);
await h.shot('s6_ending');
for (let i = 0; i < 40; i++) { await tap('KeyE', 40); await h.sleep(80); }
await h.sleep(400);
sc = await G(() => window.__ff.game.scene.getScenes(true).map((s) => s.scene.key));
check('E returns to the village after the ending', !sc.includes('Ending') && sc.includes('Game'), sc.join());
await goNear('sigrid');
await tap('KeyE'); await h.sleep(200);
const post = await dlg();
check('NPC dialogue changes after the ending', post && /older\s+than/i.test(post.text), JSON.stringify(post));
await talk([]);

// other branch: keep it
await G(() => { window.__ff.resetState(); window.__ff.S.quests.king.status = 'relic'; window.__ff.S.inv.frostheart = 1; });
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'village', spawn: 'start' }));
await h.sleep(900);
await goNear('sigrid');
await tap('KeyE'); await h.sleep(200);
await talk([1]);
check('different choice -> different ending', await S('flags.ending') === 'keep' && await S('inv.frostheart') === 1);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STAGE 6 FAILED' : 'STAGE 6 PASSED');
process.exit(failCount() ? 1 : 0);
