// The people and quests of Greenhollow (Embergreen Vale) and Amberwell (Sunscorch Reach): two main quests with a choice each,
// eight side-quest chains of three steps, and the three choices that shape the epilogue. Same recipe as regions3_story.js.
import { S, EXTRA_QUEST_IDS } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { buyMenu, sellMenu } from './services.js';
import { dailyWares } from './stock.js';
import { QUESTS, TARGETS } from './quests.js';
import { goalWhere } from '../world/questwhere.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold, count, removeItem } from '../systems/inventory.js';
import { getRegion, MAPS } from './maps.js';
import { bus } from '../systems/bus.js';
import { innMenu, cartographerMenu, smithMenu } from './services2.js';
import { LORE } from './lore.js';
import { recalc } from '../systems/stats.js';
import './items4.js';

const cyc = (key, lines) => { const n = S.flags[key] || 0; S.flags[key] = n + 1; return lines[n % lines.length]; };
const poiOf = (rid, kind) => getRegion(rid).pois.find((p) => p.kind === kind);
const trade = async (who, wares, hello) => {
  await say(who, hello);
  for (;;) {
    const c = await choose(['Buy', 'Sell', 'Leave']);
    if (c === 0) await buyMenu(who, wares); else if (c === 1) await sellMenu(who); else return;
  }
};
const killsSince = (q, kind) => Math.max(0, (S.kills[kind] || 0) - (q.base || 0));
const talk = (who, key, lines) => async function () { await say(who, cyc(key, lines)); };
const reg = (id) => { if (!EXTRA_QUEST_IDS.includes(id)) EXTRA_QUEST_IDS.push(id); S.quests[id] ||= { status: 'inactive' }; };
const cleared = (re) => Object.keys(S.bounty || {}).filter((k) => re.test(k) && S.bounty[k]).length;

// ----------------------------------------------------------------------------------------------- books
Object.assign(LORE, {
  greenhollow: { title: 'The Greenhollow Almanac', text: ['Planted the first spring: the grove tree, and a promise. Harvested: all of us.', 'Rule one of the Vale: if it blooms in winter, thank it. Rule two: never ask it why.'] },
  grove0: { title: 'On the Grove Tree', text: ['The great tree is older than the Vale. It was a seed in the first spring, and the seed has not finished deciding what to be.'] },
  grove1: { title: "A Gardener's Warning", text: ['Do not prune near the Warden. He is the grove\'s idea of a hedge, and he takes it personally.'] },
  grove2: { title: 'The Heartwood', text: ['Every tree has a heart, and this one has a second. The second one beats. Do not put your ear to the bark; you will hear your own name.'] },
  amberwell: { title: 'The Well of Amberwell', text: ['The sun kings dug the well to prove they could. It has never run dry, and the kings have never explained why.', 'Do not drop anything into it. It sends things back.'] },
  tomb0: { title: 'A Noble Burial', text: ['Buried with: three wives, two chariots, a library, and one bodyguard who was not asked.'] },
  tomb1: { title: 'Linen Account', text: ['Eleven hundred ells of linen to wrap one man. The treasury noted, in the margin, that the man himself did not seem worth it.'] },
  tomb2: { title: 'The Scorpion Queen', text: ['She was a pet, then a guard, then a goddess. The order of those was decided by the scorpion.'] },
});

// ----------------------------------------------------------------------------------------------- people
for (const [id, name, tex] of [
  ['vale_elder', 'ELDER MAEVE', 'spr_vale_elder'], ['vale_trader', 'HAZEL HEDGEROW', 'spr_trader'], ['vale_smith', 'BRAMBLE THE SMITH', 'spr_prospector'], ['vale_hunter', 'FERN', 'spr_trapper'],
  ['vale_herbalist', 'DAHLIA', 'spr_fisher'], ['vale_child', 'CLOVER', 'spr_child'], ['vale_watch', 'GREENHOLLOW WATCH', 'spr_guard'], ['vale_inn', 'MOTHER MARIGOLD', 'spr_hilda'],
  ['vale_map', 'THISTLE THE MAPMAKER', 'spr_scribe'], ['vale_beekeeper', 'BEEKEEPER ORLA', 'spr_vale_beekeeper'], ['vale_bard', 'LARK THE BARD', 'spr_vale_bard'], ['vale_gardener', 'GARDENER ASH', 'spr_vale_gardener'],
  ['dune_sheikh', 'SHEIKH RASHID', 'spr_dune_sheikh'], ['dune_trader', 'JAMILA OF THE WELL', 'spr_dune_trader'], ['dune_smith', 'KHALID SUNFORGE', 'spr_prospector'], ['dune_hunter', 'TARIQ SANDWALKER', 'spr_nomad'],
  ['dune_scholar', 'SCHOLAR NEFER', 'spr_dune_scholar'], ['dune_child', 'SAMIRA', 'spr_child'], ['dune_guard', 'CAPTAIN NADIR', 'spr_dune_guard'], ['dune_inn', 'UMM HASSAN', 'spr_hilda'],
  ['dune_map', 'IBRAHIM THE CARTOGRAPHER', 'spr_scribe'], ['dune_thief', 'A QUIET MAN', 'spr_cutpurse'], ['dune_bard', 'WANDERING SONGSTRESS', 'spr_dune_trader'], ['dune_caravan', 'CARAVAN MASTER BASIL', 'spr_nomad'],
]) NPC_DEFS[id] = { name, tex };

// ----------------------------------------------------------------------------------------------- the chain factory
// A chain is 3 linked quests from one giver. goal kinds: { kills: [kind, n] } { have: [item, n] } { cleared: [regex, n, label] } { sula: true }
const goalDone = (g, q) => (g.kills ? killsSince(q, g.kills[0]) >= g.kills[1] : g.have ? count(g.have[0]) >= g.have[1] : g.cleared ? cleared(g.cleared[0]) >= g.cleared[1] : false);
const goalText = (g, q) => (g.kills ? `${Math.min(killsSince(q, g.kills[0]), g.kills[1])}/${g.kills[1]} ${g.kills[2] || g.kills[0]}` : g.have ? `${Math.min(count(g.have[0]), g.have[1])}/${g.have[1]} ${g.have[2] || g.have[0]}` : `${Math.min(cleared(g.cleared[0]), g.cleared[1])}/${g.cleared[1]} ${g.cleared[2]}`);
export const CHAINS = [];
// where a chain's giver stands (hub layouts are fixed, so this is worked out once)
const spots = {};
const giverSpot = (npc) => {
  const map = npc.startsWith('vale_') ? 'greenhollow' : 'amberwell';
  if (!spots[map]) { spots[map] = {}; for (const e of MAPS[map].build().entities) if (e.t === 'npc') spots[map][e.id] = { map, x: e.x, y: e.y + 1 }; }
  return spots[map][npc] || null;
};
// a chain step whose goal is met says so once, so you know to go back
bus.on('enemy:killed', () => queueMicrotask(readyCheck)); bus.on('item:added', () => queueMicrotask(readyCheck));   // after the kill or item is counted
function readyCheck() {
  for (const c of CHAINS) for (const st of c.steps) {
    const q = S.quests[st.qid];
    if (q?.status === 'active' && !q.told && goalDone(st.goal, q)) { q.told = true; bus.emit('toast', `QUEST READY: TELL ${c.who.toUpperCase()}`, 13); }
  }
}
function chain(c) {
  CHAINS.push(c);
  const prev = SCRIPTS[c.npc];                   // a shop or service the giver already runs stays reachable
  c.steps.forEach((st, i) => {
    const id = `${c.id}${i + 1}`; reg(id); st.qid = id;
    QUESTS[id] = {
      title: st.title, giver: c.giver || c.who, desc: st.desc,
      short: (q) => (q.status === 'ready' || goalDone(st.goal, q) ? `Tell ${c.who}` : goalText(st.goal, q)),
      objectives: (q) => [{ t: `${st.label} (${goalText(st.goal, q)})`, done: goalDone(st.goal, q) || q.status === 'done' }, { t: `Tell ${c.who}`, done: q.status === 'done' }],
    };
    // the marker: back to the giver once the goal is met, else the nearest uncleared place for a "clear" step
    TARGETS[id] = (q) => {
      if (q && goalDone(st.goal, q)) return giverSpot(c.npc);
      if (st.goal.cleared && st.goal.poi) { const p = getRegion(st.goal.poi[0]).pois.find((x) => x.kind === st.goal.poi[1] && !S.bounty[x.id]); return p ? { map: st.goal.poi[0], x: p.x, y: p.y + 2 } : null; }
      return goalWhere(st.goal, c.npc.startsWith('vale_') ? 'vale' : 'sunscorch');     // WQ5: where that creature lives, or where that item grows or drops
    };
  });
  SCRIPTS[c.npc] = async function () {
    const cur = c.steps.find((st) => S.quests[st.qid].status !== 'done');
    if (!cur) { if (prev) return prev(); await say(c.who, cyc(c.key, c.idle)); return; }
    const q = S.quests[cur.qid], prevDone = cur === c.steps[0] ? (!c.gate || c.gate()) : true;
    if (q.status === 'active' && goalDone(cur.goal, q)) {
      for (const l of cur.thanks) await say(c.who, l);
      if (cur.goal.have && cur.goal.have[1] > 0) removeItem(cur.goal.have[0], cur.goal.have[1]);
      if (cur.after) await cur.after();
      cur.pay(); finishQuest(cur.qid); return;
    }
    if (q.status === 'inactive' && prevDone) {
      for (const l of cur.intro) await say(c.who, l);
      const yes = await choose([cur.yes || 'I will do it.', 'Not today.']);
      if (yes === 0) {
        startQuest(cur.qid); S.quests[cur.qid].base = cur.goal.kills ? (S.kills[cur.goal.kills[0]] || 0) : 0; await say(c.who, cur.go);
        if (cur.instant) { for (const l of cur.thanks) await say(c.who, l); if (cur.after) await cur.after(); cur.pay(); finishQuest(cur.qid); }   // a decision step: decide now, no second visit
      }
      return;
    }
    if (q.status === 'active') { await say(c.who, cur.progress); if (prev) await prev(); return; }
    if (prev) return prev();
    await say(c.who, cyc(c.key, c.idle));
  };
}

// ============================================================================ Greenhollow (the Embergreen Vale)
reg('blightmother');
QUESTS.blightmother = {
  title: 'The Heart of the Grove', giver: 'Elder Maeve',
  desc: 'The Vale is green because of the grove tree, and the grove tree is dying from the inside. The Blight Mother, its old guardian, has taken the heart for herself. Maeve asks you to go into the Thornroot Hollow, end it, and bring the heart back.',
  short: () => (S.flags.blightMotherDead ? 'Tell Maeve' : S.flags.thornrootEntered ? 'Defeat the Blight Mother' : 'Find the Thornroot Hollow'),
  objectives: (q) => [
    { t: 'Find the Thornroot Hollow', done: !!S.flags.thornrootEntered || q.status === 'done' },
    { t: 'Defeat the Blight Mother', done: !!S.flags.blightMotherDead || q.status === 'done' },
    { t: 'Tell Elder Maeve', done: q.status === 'done' },
  ],
};
TARGETS.blightmother = () => { const p = poiOf('vale', S.flags.blightMotherDead ? 'greenhollow' : 'thornroot'); return p ? { map: 'vale', x: p.x, y: p.y + 2 } : null; };
SCRIPTS.vale_elder = async function () {
  const q = S.quests.blightmother;
  if (q.status === 'inactive' && S.flags.blightMotherDead) {            // you found the Hollow before you found Maeve
    await say('Maeve', 'Welcome to Greenhollow. You smell of rot and fire, and the grove tree stopped shaking an hour ago. You have been in the Thornroot Hollow.');
    startQuest('blightmother');
  }
  if (q.status === 'active' && S.flags.blightMotherDead) {
    await say('Maeve', 'You are back. The tree stopped shaking an hour ago, and I did not dare to hope.');
    await say('Maeve', 'The heart of the grove is in your hands, and I am old, and it is not my place to say what happens to it. But it is yours to decide.');
    const c = await choose(['Replant it in the grove', 'Keep it. Its strength is mine']);
    if (c === 0) {
      S.flags.choiceGrove = 'replant'; removeItem('blight_heart', count('blight_heart'));
      await say('Maeve', 'Then the Vale will live. Take this, and a word: the grove will remember who gave it back.');
      addGold(650); addItem('bloom_charm'); addItem('hp_potion_g', 3, true);
    } else {
      S.flags.choiceGrove = 'keep'; recalc();
      await say('Maeve', 'Then the Vale will fade slowly instead of quickly, and you will carry what it was. I understand. I do not forgive it, but I understand.');
      addGold(1000); addItem('hp_potion_g', 3, true);
    }
    finishQuest('blightmother'); return;
  }
  if (q.status === 'inactive') {
    for (const l of ['Welcome to Greenhollow. Mind the grass. It is listening.', 'The grove tree is dying from the inside, and the Winter is not the cause. The Blight Mother, who was its guardian, has closed her roots around its heart and will not let go.', 'The way in is the Thornroot Hollow, a door in the oldest tree. Bring the heart back, and the Vale will be green again.']) await say('Maeve', l);
    if ((await choose(['I will go.', 'Not yet.'])) === 0) { startQuest('blightmother'); await say('Maeve', 'Thank you. Take the thorn road. It hates strangers a little less than the rest.'); }
    return;
  }
  if (q.status === 'active') { await say('Maeve', 'The Thornroot Hollow is east, where the trees lean in. Mind the pods. Then mind the Mother.'); return; }
  await say('Maeve', S.flags.choiceGrove === 'keep' ? cyc('maeveN', ['The Vale is a little greyer each day. I will not say whose fault it is.', 'Do you ever hear it beating, in your pack? I do, from here.']) : cyc('maeveN', ['The grove tree put out a leaf last night. In winter! I wept like a child.', 'Everyone asks what you did. I tell them: you gave it back.']));
};
SCRIPTS.vale_trader = () => trade('Hazel', [{ id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'moss_shield', price: 520, once: true }, { id: 'leaf_cowl', price: 380, once: true }, ...dailyWares('Hazel', 2)],
  cyc('hazelN', ['Everything is fresh, locally grown and possibly alive.', 'I do not sell flowers. I sell what you do with flowers.', 'Weighed by the handful, in the old manner. My hand is larger than yours.']));
SCRIPTS.vale_smith = () => smithMenu('Bramble', [{ id: 'iron_sword', price: 90, once: true }, { id: 'steel_sword', price: 190, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'iron_ingot', price: 28 }],
  cyc('brambleN', ['Heartwood handles, iron heads. I bend nothing the wood does not agree to.', 'A good sword is a decision. A great sword is a decision the sword also made.']));
SCRIPTS.vale_inn = () => innMenu('Marigold', { room: 22, meal: 12, news: 28, hello: cyc('marigoldN', ['Every bed has a flower on the pillow. Do not eat it. Probably.', 'Soup of the day: whatever the garden gave. It is usually generous.']) });
SCRIPTS.vale_map = () => cartographerMenu('Thistle');
SCRIPTS.vale_child = talk('Clover', 'cloverN', ['I can tell what the bees are thinking. They are thinking about flowers. Mostly.', 'The Warden let me sit on his shoulder once. He is very warm and very mossy.', 'If you lie in the grass long enough, it tells you its name. Mine is Clover. It is a bit of a coincidence.']);
SCRIPTS.vale_watch = talk('Greenhollow Watch', 'vwatchN', ['Hedges are in good order. Nothing has eaten anyone since Tuesday.', 'The briars come closer every night. We trim them in the morning. It is a perfectly civilised arrangement.']);
SCRIPTS.vale_hunter = talk('Fern', 'fernN', ['Boar with briars in the hide: aim for the eyes. The briars do not scare me. The boar does.', 'The hornets nest in the birch rings. Take fire, or take stairs.']);
SCRIPTS.vale_bard = talk('Lark', 'larkN', ['I am working on a song about the grove tree. It has eleven verses and one very long rest.', 'The best songs are the ones that make you want to put your sword down. The second best are the ones that make you pick it up.']);

chain({ id: 'hornets', npc: 'vale_beekeeper', who: 'Orla', giver: 'Beekeeper Orla', key: 'orlaN', idle: ['The hum is back to normal. Thank you. I could weep.', 'My bees named a flower after you. I will not tell you which one.'], steps: [
  { title: 'Too Many Wings', label: 'Swat meadow hornets', goal: { kills: ['hornet', 6, 'hornets'] }, desc: 'The hornets of the Vale have grown bold. Orla needs six of them swatted before they reach the hives.',
    intro: ['The hornets have been through the apiary again. They do not eat the honey; they just break it.', 'Six should teach the rest. Please.'], go: 'Fire is best. Do not run; they like it when you run.', progress: 'Six hornets. Keep your back to a wall.', thanks: ['That is the sound I like: quiet.'], pay() { addGold(180); addItem('honeycomb', 2, true); } },
  { title: 'The Queen\'s Court', label: 'Clear a hornet hive', goal: { cleared: [/^vale_hive\d+$/, 1, 'hives'], poi: ['vale', 'hive'] }, desc: 'The hornets follow a queen. If she falls, the wasps scatter. Find a hornet hive and clear it.',
    intro: ['They answer to a queen. She lives in a ring of birches, and she is the size of a hound.', 'Clear the hive and the Vale gets its summer back.'], go: 'Take a shield. The wasps do not care about shields but the queen does.', progress: 'A hornet hive. Look for birch rings and a hum.', thanks: ['She is gone? The sky feels larger.'], pay() { addGold(300); addItem('hp_potion_g', 2, true); } },
  { title: 'Honey for the Winter', label: 'Bring wild honeycomb', goal: { have: ['honeycomb', 4, 'honeycomb'] }, desc: 'The honey stores are low for the cold months. Orla needs four fresh combs, from the hornets\' own stores.',
    intro: ['One more thing, if you are willing. The winter is coming and my stores are low.', 'Four combs. Hornets keep their honey in the most inconvenient places.'], go: 'The queen\'s hive, the flower fields. They carry some. I will not ask where.', progress: 'Four combs. The hornets are not generous.', thanks: ['Gold from the flowers. Thank you, dreamer.'], pay() { addGold(260); addItem('quicksilver_tonic', 1, true); } },
] });
chain({ id: 'dew', npc: 'vale_herbalist', who: 'Dahlia', giver: 'Dahlia the herbalist', key: 'dahliaN', idle: ['The garden is happier. So am I.', 'Your dew potion helped the Warden\'s knee. He has not forgiven me for noticing.'], steps: [
  { title: 'Roots for the Dew', label: 'Gather valeroot', goal: { have: ['valeroot', 5, 'valeroot'] }, desc: 'Dahlia brews a draught from valeroot that keeps the Winter out of the lungs. She needs five roots from the meadows.',
    intro: ['I brew a dew that keeps the cold out of the bones. I am out of valeroot.', 'Five, from the meadows. They look like weeds. They are, but sweet ones.'], go: 'Look in the flower fields, at the edge of the paths.', progress: 'Five valeroot.', thanks: ['Fresh! You have the eye.'], pay() { addGold(120); addItem('hp_potion', 3, true); } },
  { title: 'Sunpetals at Noon', label: 'Gather sunpetals', goal: { have: ['sunpetal', 5, 'sunpetal'] }, desc: 'Sunpetals follow the light and make the draught sing. Five are needed.',
    intro: ['Now the second ingredient. Sunpetals. They face the sun, so look where the light falls.', 'Five more. And thank you for the first five.'], go: 'Noon is best. They sulk at dusk.', progress: 'Five sunpetals.', thanks: ['Golden! Not a bruise on them.'], pay() { addGold(160); addItem('mp_potion_g', 2, true); } },
  { title: 'The Thieving Sprites', label: 'Catch dew sprites', goal: { kills: ['dewsprite', 6, 'dew sprites'] }, desc: 'Dew sprites steal the morning dew from the garden to mend their wounded. Dahlia wants six of them gone.',
    intro: ['Something has been drinking the garden\'s dew. It is the sprites. Healing each other with my dew!', 'Six should do. Kill them first when you see them in a group.'], go: 'They keep their distance. Corner them.', progress: 'Six dew sprites.', thanks: ['The dew will gather again. You are kind to those who need it.'], pay() { addGold(240); addItem('dew_essence', 3, true); addItem('mp_potion_g', 2, true); } },
] });
chain({ id: 'thorns', npc: 'vale_gardener', who: 'Ash', giver: 'Gardener Ash', key: 'ashN', idle: ['The hedges are my business again. A beautiful feeling.', 'The thorns grow back. So do I.'], steps: [
  { title: 'Thorns in the Hedge', label: 'Cut thornlings', goal: { kills: ['thornling', 8, 'thornlings'] }, desc: 'Thornlings have been waking in the hedges. Ash wants eight cut down before they reach the village.',
    intro: ['The hedges walk. Not all of them, but enough to be worrying.', 'Eight thornlings. Cut them at the knee; fire if you have it.'], go: 'They lie still in the bushes until you are close. Watch the hedges.', progress: 'Eight thornlings.', thanks: ['The hedge is just a hedge again. For now.'], pay() { addGold(200); addItem('hp_potion', 3, true); } },
  { title: 'The Thorn Patch', label: 'Clear a thorn patch', goal: { cleared: [/^vale_thornpatch\d+$/, 1, 'thorn patches'], poi: ['vale', 'thornpatch'] }, desc: 'The oldest briar in the Vale has woken. Ash asks you to clear a thorn patch and its elder.',
    intro: ['The patch to the east has an old briar in it. Older than the village. It has woken, and it is not happy.', 'End it, if you can.'], go: 'Stay on the path. The briars do not draw a difference between walkers and prey.', progress: 'A thorn patch, east of here.', thanks: ['The Elder Thornwood, down! The garden cheers.'], pay() { addGold(340); addItem('hp_potion_g', 2, true); } },
  { title: 'Cuttings', label: 'Bring thornvine', goal: { have: ['thornvine', 6, 'thornvine'] }, desc: 'Ash makes a rope of thornvine that nothing can chew. Six lengths, please.',
    intro: ['The rope I make from thornvine is the best you can buy. I need six lengths.', 'They drop from thornlings, thornboar and the elders.'], go: 'Gloves help.', progress: 'Six lengths of thornvine.', thanks: ['Strong as anything. You have my thanks and my best rope.'], pay() { addGold(260); addItem('leaf_cowl'); } },
] });
chain({ id: 'grovesong', npc: 'vale_bard', who: 'Lark', giver: 'Lark the bard', key: 'larkN2', gate: () => S.quests.blightmother.status !== 'inactive', idle: ['The song is finished. I will sing it for you at the next feast.'], steps: [
  { title: 'Verses of the Grove', label: 'Quiet a sacred grove', goal: { cleared: [/^vale_heartgrove\d+$/, 1, 'groves'], poi: ['vale', 'heartgrove'] }, desc: 'Lark is writing a song about the grove tree. A sacred grove\'s warden has gone wild; quiet it, and tell Lark what it sounded like.',
    intro: ['I need a verse about the heart of the Vale, and I cannot write about a place I have not stood in.', 'There is a sacred grove, with a warden. Go, listen, and tell me what he sounds like.'], go: 'Do not sing there. He is a critic.', progress: 'A sacred grove, with a moss-green warden.', thanks: ['A hum? A very low hum? Marvellous.'], pay() { addGold(240); addItem('mp_potion_g', 2, true); } },
  { title: 'A Moss Heart', label: 'Bring a moss heart', goal: { have: ['moss_heart', 1, 'moss heart'] }, desc: 'The warden\'s kin carry moss hearts. Lark wants one for the chorus.',
    intro: ['The chorus needs a heartbeat. Specifically, a moss heart, from a mosshulk.', 'Do not tell me how you get it.'], go: 'Fire, then run.', progress: 'One moss heart, from a mosshulk.', thanks: ['It is warm! It is beating! It is perfect.'], pay() { addGold(260); addItem('hp_potion_g', 2, true); } },
  { title: 'The Last Verse', label: 'Defeat mosshulks', goal: { kills: ['mosshulk', 3, 'mosshulks'] }, desc: 'The last verse is a battle verse. Lark needs three mosshulks defeated to describe the sound.',
    intro: ['The last verse is a fight. I have not seen one. Will you humour a poet?', 'Three mosshulks. Just three. Please.'], go: 'Shields do not help. Dodge, and hit what recovers.', progress: 'Three mosshulks.', thanks: ['The sound! The ringing! I have it.'], pay() { addGold(340); addItem('bloom_charm'); } },
] });

// ============================================================================ Amberwell (the Sunscorch Reach)
reg('sunvault');
QUESTS.sunvault = {
  title: 'The Sealed Vault', giver: 'Sheikh Rashid',
  desc: 'The sun kings sealed something in a vault under the dunes, the answer to the Winter that they never lived to use. Rashid asks you to open it, face its guardian, and decide what to do with what is inside.',
  short: () => (S.flags.vaultSovereignDead ? 'Tell Rashid' : S.flags.sealedvaultEntered ? 'Defeat the Vault Sovereign' : 'Find the Sealed Vault'),
  objectives: (q) => [
    { t: 'Find the Sealed Vault', done: !!S.flags.sealedvaultEntered || q.status === 'done' },
    { t: 'Defeat the Vault Sovereign', done: !!S.flags.vaultSovereignDead || q.status === 'done' },
    { t: 'Tell Sheikh Rashid', done: q.status === 'done' },
  ],
};
TARGETS.sunvault = () => { const p = poiOf('sunscorch', S.flags.vaultSovereignDead ? 'amberwell' : 'sealedvault'); return p ? { map: 'sunscorch', x: p.x, y: p.y + 2 } : null; };
SCRIPTS.dune_sheikh = async function () {
  const q = S.quests.sunvault;
  if (q.status === 'inactive' && S.flags.vaultSovereignDead) {          // you opened the vault before anyone asked you to
    await say('Rashid', 'Peace on you, traveller. They say a stranger walked out of the Sealed Vault with the Sovereign\'s seal in hand. Let us talk about what lies inside.');
    startQuest('sunvault');
  }
  if (q.status === 'active' && S.flags.vaultSovereignDead) {
    await say('Rashid', 'The Sovereign is down, and the vault stands open. I felt the sand shift from here.');
    await say('Rashid', 'Two things lie inside. A sword that burns, and a ward that cools. The kings made both and used neither. What will you take?');
    const c = await choose(['Sunbreaker: the sword', 'Winterward: the ward', 'Neither. Seal it again']);
    if (c === 0) { S.flags.choiceVault = 'sunbreaker'; addItem('sunbreaker'); await say('Rashid', 'It is a weapon that will melt the Winter and the ice with it. The kings feared it. Perhaps they were right to.'); addGold(700); }
    else if (c === 1) { S.flags.choiceVault = 'winterward'; addItem('winterward'); await say('Rashid', 'It lets the cold pass through you instead of over you. A gentler answer. Let us hope the Winter agrees.'); addGold(700); }
    else { S.flags.choiceVault = 'seal'; await say('Rashid', 'Seal it. A wise man leaves a power in the dark and sleeps better for it. Take this for your trouble.'); addGold(1100); }
    finishQuest('sunvault'); return;
  }
  if (q.status === 'inactive') {
    for (const l of ['Peace on you, traveller. The well is free; the rest of Amberwell is not.', 'The sun kings sealed a vault under the dunes. It holds the answer to the Winter, and its guardian has stopped sleeping.', 'Open the Sealed Vault. Face the Sovereign. Then tell me what you want to do with what you find.']) await say('Rashid', l);
    if ((await choose(['I will go.', 'Not yet.'])) === 0) { startQuest('sunvault'); await say('Rashid', 'The vault is east, among the sandstone. Take water. Take more water than you think.'); }
    return;
  }
  if (q.status === 'active') { await say('Rashid', 'The Sealed Vault. East, in the tall stone. The Sovereign is old and patient.'); return; }
  const ch = S.flags.choiceVault;
  await say('Rashid', ch === 'sunbreaker' ? cyc('rashidN', ['The sword is in your hand and the desert is a little warmer. I do not know if that is the sword or the weather.']) : ch === 'winterward' ? cyc('rashidN', ['The ward hums when the wind turns. I sleep better. So does the well.']) : cyc('rashidN', ['The vault is sealed. I think of it often. I do not think of it at night.']));
};
SCRIPTS.dune_trader = () => trade('Jamila', [{ id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'veil_helm', price: 400, once: true }, { id: 'tome_sunbeam', price: 640, once: true }, { id: 'dune_bow', price: 560, once: true }, ...dailyWares('Jamila', 2)],
  cyc('jamilaN', ['Water costs nothing here. Carrying it costs a great deal.', 'Spice, silk, scorpion antidote. Do you want to haggle, or shall we pretend?', 'I sell to everyone. Even the people who say they will not buy.']));
SCRIPTS.dune_smith = () => smithMenu('Khalid', [{ id: 'iron_sword', price: 90, once: true }, { id: 'steel_sword', price: 190, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'glyph_shield', price: 760, once: true }, { id: 'iron_ingot', price: 28 }],
  cyc('khalidN', ['Gold is soft. Iron is honest. I use both, according to the customer.', 'The sun does half my smithing for me. I charge for the other half.']));
SCRIPTS.dune_inn = () => innMenu('Umm Hassan', { room: 24, meal: 12, news: 28, hello: cyc('hassanN', ['Tea, bread, a bed. The bed is cooler than the room, because it is on the roof.', 'Everyone sleeps better at Amberwell. Nobody asks why. It is not rude, it is wise.']) });
SCRIPTS.dune_map = () => cartographerMenu('Ibrahim');
SCRIPTS.dune_child = talk('Samira', 'samiraN', ['The jackals are not scary. The dust devils are scary. The dust devils are also funny.', 'I have a scorpion. He is called Mr Pinch. He is very friendly and very small.']);
SCRIPTS.dune_bard = talk('Songstress', 'songN', ['I sing the old songs of the sun kings, the ones with the long words and the short endings.', 'Every verse ends with the same line: and then the sand came.']);
SCRIPTS.dune_caravan = talk('Basil', 'basilN', ['I have crossed this desert two hundred times. I could not tell you what is in the middle. Nobody ever stays.', 'Caravans never stop at the sand pits. The sand is not hungry. It just remembers.']);
SCRIPTS.dune_guard = talk('Nadir', 'dguardN', ['Gates are open, walls are manned, the well is full. A good day.', 'Raiders, cutpurses, burrowers. Pick a thing to fear and you will be right.']);

chain({ id: 'water', npc: 'dune_trader', who: 'Jamila', giver: 'Jamila of the Well', key: 'jamilaN2', idle: ['The oasis is clear and the caravans are happy. I could sing.'], steps: [
  { title: 'The Oasis Road', label: 'Clear an oasis', goal: { cleared: [/^sunscorch_oasis\d+$/, 1, 'oases'], poi: ['sunscorch', 'oasis'] }, desc: 'Jackals and scorpions have taken the nearest oasis. Jamila needs the caravan road open again.',
    intro: ['Caravans need water, water needs oases, and the oases have teeth.', 'Clear one of them, will you?'], go: 'Shade, water, and a great many things that want both.', progress: 'An oasis. Look for palms and water.', thanks: ['The road is open. I will fill your pouch.'], pay() { addGold(260); addItem('hp_potion_g', 2, true); } },
  { title: 'Venom for the Healers', label: 'Bring scorpion stingers', goal: { have: ['stinger', 4, 'stingers'] }, desc: 'Scorpion stingers make antivenom. Jamila needs four.',
    intro: ['We need antivenom, and I need stingers. Four, cut clean.', 'Do not get stung to collect them. It defeats the purpose.'], go: 'Frost slows them. Strike from range if you can.', progress: 'Four stingers.', thanks: ['Beautiful. The antivenom will save a caravan.'], pay() { addGold(300); addItem('hp_potion_g', 2, true); } },
  { title: 'The Scorpion Plague', label: 'Cull scorpions', goal: { kills: ['scorpion', 6, 'scorpions'] }, desc: 'The scorpions are breeding. Six must go before the caravan season.',
    intro: ['Last one. The scorpions are breeding in the shade of the old walls.', 'Six should do. Then the road is safe.'], go: 'They lunge. Dodge to the side.', progress: 'Six scorpions.', thanks: ['The road is safe. You have done Amberwell a great service.'], pay() { addGold(380); addItem('scarab_charm'); } },
] });
chain({ id: 'tombs', npc: 'dune_scholar', who: 'Nefer', giver: 'Scholar Nefer', key: 'neferN', idle: ['The tombs are catalogued. The kings will be remembered, for better or worse.'], steps: [
  { title: 'The Lost Tomb', label: 'Clear a tomb mouth', goal: { cleared: [/^sunscorch_tombmouth\d+$/, 1, 'tombs'], poi: ['sunscorch', 'tombmouth'] }, desc: 'Nefer wants a tomb entrance cleared so she can read what is written inside.',
    intro: ['There are tombs under the dunes, and nobody has read them since the kings fell.', 'Clear a tomb mouth, and I will do the reading.'], go: 'Fire for the wrapped. Frost for the scorpions.', progress: 'A tomb mouth. Look for glyphs and statues.', thanks: ['The inscriptions! The beautiful, terrible inscriptions.'], pay() { addGold(280); addItem('mp_potion_g', 2, true); } },
  { title: 'Tomb Linen', label: 'Bring tomb linen', goal: { have: ['linen_wrap', 5, 'tomb linen'] }, desc: 'The wrapped dead keep linen bound with gold thread. Nefer needs five strips to date the burials.',
    intro: ['The linen binds the dead, and the dead are the best record. Five strips, please.', 'You will find them on the wrapped.'], go: 'Burn them, then take what is left.', progress: 'Five strips of tomb linen.', thanks: ['Thread-count of the twelfth dynasty. I could weep.'], pay() { addGold(300); addItem('hp_potion_g', 2, true); } },
  { title: 'Sunglass Lens', label: 'Bring sunglass', goal: { have: ['sand_glass', 4, 'sunglass'] }, desc: 'Nefer needs four lumps of sunglass to read the vault glyphs by sunlight.',
    intro: ['One more. Sunglass focuses the glyphs so they can be read. Four lumps.', 'It is in the sand where the old fires burned.'], go: 'Sentinels and burrowers carry it.', progress: 'Four lumps of sunglass.', thanks: ['Clear! The glyphs are as clear as day. They say: do not open this door.'], pay() { addGold(380); addItem('ankhet_ring'); } },
] });
chain({ id: 'raiders', npc: 'dune_guard', who: 'Captain Nadir', giver: 'Captain Nadir', key: 'nadirN', idle: ['The roads are quiet. I hear you did that.'], steps: [
  { title: 'Raiders on the Road', label: 'Defeat dune raiders', goal: { kills: ['duneraider', 6, 'raiders'] }, desc: 'Dune raiders have been taking caravans. Captain Nadir wants six of them dealt with.',
    intro: ['Raiders on the road. Sand-coloured, fast, and they run when hurt. Six, if you can.', 'I pay by the head.'], go: 'Do not chase the ones who flee. They come back.', progress: 'Six raiders.', thanks: ['Six! The caravan master sends his thanks and a bottle.'], pay() { addGold(240); addItem('hp_potion_g', 2, true); } },
  { title: 'The Raider Camp', label: 'Clear a raider camp', goal: { cleared: [/^sunscorch_raidercamp\d+$/, 1, 'camps'], poi: ['sunscorch', 'raidercamp'] }, desc: 'The raiders have a camp under a captain\'s banner. Clear it.',
    intro: ['Their camp is under a banner. The captain is a man called Karrow. He is good, and he is loud.', 'Take the camp. Take the banner.'], go: 'Kill the warchanters first. They shout the others stronger.', progress: 'A raider camp. Look for a banner on a column.', thanks: ['Karrow\'s banner, in the sand. Amberwell breathes.'], pay() { addGold(420); addItem('hp_potion_g', 3, true); } },
  { title: 'Silence the Chanters', label: 'Defeat warchanters', goal: { kills: ['warchanter', 3, 'warchanters'] }, desc: 'The last of the war-drummers must go. Three warchanters.',
    intro: ['Three more drummers remain. They bring the others back.', 'Cut them down and the desert is quiet.'], go: 'They keep their distance. Use arrows.', progress: 'Three warchanters.', thanks: ['Silence. At last.'], pay() { addGold(460); addItem('karrow_blade'); } },
] });
chain({ id: 'purse', npc: 'dune_thief', who: 'The quiet man', giver: 'The quiet man of Amberwell', key: 'quietN', idle: ['I see nothing, hear nothing, and keep my hand on my purse. Wise, yes?'], steps: [
  { title: 'The Red Purse', label: 'Catch cutpurses', goal: { kills: ['cutpurse', 4, 'cutpurses'] }, desc: 'A quiet man in Amberwell says Red Sula\'s cutpurses took his savings. He wants four of them caught.',
    intro: ['I was robbed. I do not like to say by whom. Red Sula\'s children.', 'Catch four of them. Make them drop what they hold.'], go: 'They run. Stun them. Hit hard.', progress: 'Four cutpurses.', thanks: ['That is a start. I hear they are not happy.'], pay() { addGold(220); addItem('lockpick', 3, true); } },
  { title: 'The Thieves\' Den', label: 'Clear Sula\'s den', goal: { cleared: [/^sunscorch_thiefden\d+$/, 1, 'dens'], poi: ['sunscorch', 'thiefden'] }, desc: 'Red Sula\'s den holds what the cutpurses took. Clear it.',
    intro: ['Sula keeps her den south-east, behind a false sign. Clear it. She will not go quietly.', 'Beat her, but leave her breathing if you can. There is a matter of justice.'], go: 'She takes a third of what you carry. Do not carry much.', progress: 'The thieves\' den.', thanks: ['Sula is beaten. Now: the question.'], pay() { addGold(360); addItem('hp_potion_g', 2, true); } },
  { title: 'A Matter of Justice', label: 'Decide Sula\'s fate', instant: true, goal: { have: ['lockpick', 0, ''] }, desc: 'Red Sula is beaten. The quiet man asks what to do with her.',
    intro: ['I know where she is, now. The guard would hang her. I would not.', 'You decide. I only keep the purse.'], go: 'Well? What will it be?', progress: 'Decide.', thanks: [], after: async () => {
      const c = await choose(['Turn her over to the guard', 'Let her go']);
      if (c === 0) { S.flags.choiceSula = 'turnin'; addGold(500); await say('The quiet man', 'The guard thanks you. So do I. Mostly.'); }
      else { S.flags.choiceSula = 'freed'; addItem('gem_amber', 2); addItem('lockpick', 5, true); await say('The quiet man', 'She left these for whoever let her walk. She will remember it. That is either very good or very bad.'); }
    }, pay() { addGold(200); } },
] });
chain({ id: 'burrowers', npc: 'dune_hunter', who: 'Tariq', giver: 'Tariq Sandwalker', key: 'tariqN', idle: ['The sand is quieter. I owe you a drink and a story.'], steps: [
  { title: 'The Shifting Sand', label: 'Slay sand burrowers', goal: { kills: ['sandburrower', 5, 'burrowers'] }, desc: 'Sand burrowers have been dragging camels down. Tariq needs five of them dead.',
    intro: ['The sand moves against the wind. That is a burrower. Five, if you can.', 'They dig in, mark the spot, and bite. Move when the sand swells.'], go: 'When you see the ring, roll out of it.', progress: 'Five burrowers.', thanks: ['Five! My camels will live.'], pay() { addGold(280); addItem('hp_potion_g', 2, true); } },
  { title: 'The Sand Pit', label: 'Clear a sand pit', goal: { cleared: [/^sunscorch_burrowpit\d+$/, 1, 'sand pits'], poi: ['sunscorch', 'burrowpit'] }, desc: 'The Sandmaw hunts in a sand pit. Clear one and end it.',
    intro: ['There is an old one. The Sandmaw. It has been eating caravans since before my grandfather.', 'Find its pit. End it.'], go: 'Keep moving. It never sleeps.', progress: 'A sand pit, in the open dunes.', thanks: ['The Sandmaw, dead! I never thought I would live to see it.'], pay() { addGold(420); addItem('maw_tooth'); } },
  { title: 'A Dust Devil Season', label: 'Quell dust devils', goal: { kills: ['dustdevil', 6, 'dust devils'] }, desc: 'The dust devils have come for the harvest. Six must go.',
    intro: ['And now the dust devils. Six of them, please. They are quick and silly, and they break the harvest.', 'Frost makes them stumble.'], go: 'Hit and run.', progress: 'Six dust devils.', thanks: ['The harvest is saved. Come, have dates.'], pay() { addGold(340); addItem('dust_cloak'); } },
] });
