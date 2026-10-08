// The people and quests of the Weeping Fens (Reedwick) and the Stormcrown Highlands (Skarn Hold).
// Registered into the shared NPC and quest tables (imported once by maps.js).
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { buyMenu, sellMenu } from './services.js';
import { dailyWares } from './stock.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold, count } from '../systems/inventory.js';
import { getRegion } from './maps.js';
import { innMenu, cartographerMenu, smithMenu } from './services2.js';

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

// ============================================================================ Reedwick, the stilt village (Weeping Fens)
NPC_DEFS.wick_elder = { name: 'WARDEN-MOTHER ILSE', tex: 'spr_keeper' };
NPC_DEFS.wick_trader = { name: 'PIM THE LAMP-SELLER', tex: 'spr_trader' };
NPC_DEFS.wick_smith = { name: 'ODDA', tex: 'spr_prospector' };
NPC_DEFS.wick_hunter = { name: 'BRANN', tex: 'spr_trapper' };
NPC_DEFS.wick_herbalist = { name: 'MAUD', tex: 'spr_fisher' };
NPC_DEFS.wick_fisher = { name: 'OLD TOLLE', tex: 'spr_fisher' };
NPC_DEFS.wick_child = { name: 'LISBET', tex: 'spr_child' };
NPC_DEFS.wick_watch = { name: 'LANTERN-WARDEN', tex: 'spr_guard' };

QUESTS.miremother = {
  title: 'The Mire Mother Weeps', giver: 'Warden-Mother Ilse',
  desc: 'The water has risen a hand every year since the Mire Mother began to weep. Reedwick is on its last boards. Ilse asks you to go down into the Sunken Barrow and end it, one way or another.',
  short: () => (S.flags.mireMotherDead ? 'Tell Ilse' : S.flags.mirebarrowEntered ? 'Defeat the Mire Mother' : 'Find the Sunken Barrow'),
  objectives: (q) => [
    { t: 'Find the Sunken Barrow in the Weeping Fens', done: !!S.flags.mirebarrowEntered || q.status === 'done' },
    { t: 'Defeat the Mire Mother', done: !!S.flags.mireMotherDead || q.status === 'done' },
    { t: 'Tell Warden-Mother Ilse', done: q.status === 'done' },
  ],
};
QUESTS.leeches = {
  title: 'Leech Season', giver: 'Brann the hunter',
  desc: 'The fen leeches have grown fat and bold, and they are in the boardwalk pilings. Brann will pay for every one you drive off.',
  short: (q) => (q.status === 'ready' ? 'Tell Brann' : `Leeches ${Math.min(killsSince(q, 'leech'), 10)}/10`),
  objectives: (q) => [{ t: `Slay fen leeches (${Math.min(killsSince(q, 'leech'), 10)}/10)`, done: killsSince(q, 'leech') >= 10 || q.status === 'done' }, { t: 'Tell Brann', done: q.status === 'done' }],
};
QUESTS.orchids = {
  title: 'Night-Blooming', giver: 'Maud the herbalist',
  desc: 'Marsh orchids grow near the old peat fires and drink the warmth. Maud makes a draught from them that holds back the bog-chill. She needs five.',
  short: () => `Marsh orchids ${Math.min(count('marsh_orchid'), 5)}/5`,
  objectives: (q) => [{ t: `Gather marsh orchids (${Math.min(count('marsh_orchid'), 5)}/5)`, done: count('marsh_orchid') >= 5 || q.status === 'done' }, { t: 'Bring them to Maud', done: q.status === 'done' }],
};
TARGETS.miremother = () => { const p = poiOf('fens', S.flags.mireMotherDead ? 'reedwick' : 'mirebarrow'); return p ? { map: 'fens', x: p.x, y: p.y + 2 } : null; };
TARGETS.leeches = () => { const p = poiOf('fens', 'reedwick'); return p ? { map: 'fens', x: p.x, y: p.y + 2 } : null; };
TARGETS.orchids = () => { const p = poiOf('fens', 'peatfire'); return p ? { map: 'fens', x: p.x, y: p.y + 2 } : null; };

SCRIPTS.wick_elder = async function elder() {
  const N = 'Ilse', q = S.quests.miremother;
  if (q.status === 'active' && S.flags.mireMotherDead) {
    await say(N, 'The boards are drying. Listen: no weeping. For the first time in my life, the fens are quiet.');
    addGold(520); addItem('peat_mail'); addItem('drowned_hook'); addItem('gem_emerald', 1, true); finishQuest('miremother'); return;
  }
  if (q.status === 'inactive') {
    await say(N, 'You came on the boards. Good. Most people try to walk the water, and the water does not mind.');
    await say(N, 'There was a woman, once, who lost her children to the fen. The fen kept them and kept her. She is the Mire Mother now, and she weeps, and the water rises to meet her tears.');
    await say(N, 'The Sunken Barrow lies far east, past the peat fires. Take fire. Take friends, if you have them. Go down and end it.');
    const c = await choose(['I will go.', 'Not yet.']);
    if (c === 0) { startQuest('miremother'); await say(N, 'Keep to the lantern poles. If a light calls your name, it is not a lantern.'); }
    return;
  }
  await say(N, cyc('ilseN', ['The lanterns are lit every dusk. We lit them even when we could not afford the oil. Especially then.', 'The wraiths hate green flame. Oil from the lamp-seller will keep them off, a little.', 'Children are told the water weeps because it is sad. The truth is worse. It weeps because it is hungry.']));
};
SCRIPTS.wick_trader = () => trade('Pim', [{ id: 'lantern', price: 150, once: true, name: 'Hooded Lantern' }, { id: 'lantern_oil', price: 40, n: 1 }, { id: 'hp_potion', price: 26 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, ...dailyWares('Pim', 2)],
  cyc('pimN', ['Lamps, oil, wicks and wisdom. The wisdom is free, the wicks are not.', 'Green flame for wraiths, white flame for wolves. Red flame is for people. Do not buy the red.', 'Everything in Reedwick floats, even the prices.']));
SCRIPTS.wick_smith = () => smithMenu('Odda', [{ id: 'iron_sword', price: 90, once: true }, { id: 'steel_sword', price: 190, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'iron_ingot', price: 30, n: 1 }, ...dailyWares('Odda', 2)],
  cyc('oddaN', ['Peat iron: dark, brittle, and it holds an edge like a grudge. What do you need?', 'My forge burns peat. The smoke smells of old summers.', 'Wet steel rusts. Wetter fighters rust faster. Mind your shield.']));
SCRIPTS.wick_hunter = async function hunter() {
  const N = 'Brann', q = S.quests.leeches;
  if (q.status === 'active' && killsSince(q, 'leech') >= 10) { await say(N, 'Ten! The pilings are clean. Here: coin, and something I took off a drowned man.'); addGold(220); addItem('hp_potion_g', 2, true); addItem('marsh_orchid', 2, true); finishQuest('leeches'); return; }
  if (q.status === 'inactive') {
    await say(N, 'Leeches. Ten of them, fat as a fist, in the pilings under my house. I would do it myself, but I am hunting. It is a good excuse.');
    const c = await choose(['I will clear them.', 'Not today.']);
    if (c === 0) { startQuest('leeches'); S.quests.leeches.base = S.kills.leech || 0; await say(N, 'Fire works best. They hate fire. And salt, if you have any.'); }
    return;
  }
  if (q.status === 'active') { await say(N, `${Math.min(killsSince(q, 'leech'), 10)} of ten. They are in the shallows and under the boards, and they hide when you look.`); return; }
  await say(N, cyc('brannN', ['Big things in the fen at dusk. I count the ripples. I do not like the number.', 'Wolves do not come here. Something else does, and the wolves know.']));
};
SCRIPTS.wick_herbalist = async function herbalist() {
  const N = 'Maud', q = S.quests.orchids;
  if (q.status === 'active' && count('marsh_orchid') >= 5) { await say(N, 'Five! Look at the veins: blue as a drowned lip. Here, take the draught I promised, and my thanks.'); S.inv.marsh_orchid -= 5; addGold(180); addItem('hp_potion_g', 3, true); addItem('mp_potion_g', 1, true); finishQuest('orchids'); return; }
  if (q.status === 'inactive') {
    await say(N, 'The marsh orchid blooms near the peat fires, where it is warm. Five of them make a draught that keeps the bog-chill out of your bones.');
    const c = await choose(['I will gather them.', 'Not today.']);
    if (c === 0) { startQuest('orchids'); await say(N, 'They like the dark. Look near the peat fires east of here, and beware what else likes the warmth.'); }
    return;
  }
  await say(N, cyc('maudN', ['Everything grows slowly here. Even grief.', 'I name the orchids. This one is Lisbet. That one is a rude word.']));
};
SCRIPTS.wick_fisher = () => trade('Tolle', [{ id: 'raw_trout', price: 8 }, { id: 'grilled_trout', price: 16 }, { id: 'smoked_pike', price: 44 }, { id: 'hp_potion', price: 26 }],
  cyc('tolleN', ['Fish here have no eyes. They do not need them. Neither do I, in fog.', 'My father fished the Mire Mother\'s cradle-song out of the water once. I will not tell you the tune.']));
SCRIPTS.wick_child = async function child() { await say('Lisbet', cyc('lisbetN', ['If you hear the bell, do not turn around. Not even to check. That is the rule.', 'I counted the lanterns. There are always one more than yesterday.', 'The wraiths are shy. They only come when you are sad.'])); };
SCRIPTS.wick_watch = async function watch() { await say('Lantern-Warden', cyc('wardenN', ['I keep the poles lit. If the lights go out, count to ten and run.', 'No weapons drawn on the boards. The boards are old and so are the grudges.', 'There is a rest-fire by the well. Use it; the watch will not mind.'])); };

// ============================================================================ Skarn Hold (Stormcrown Highlands)
NPC_DEFS.skarn_chief = { name: 'CHIEF ULFAR STORMBROW', tex: 'spr_guard' };
NPC_DEFS.skarn_trader = { name: 'RANNVEIG', tex: 'spr_trader' };
NPC_DEFS.skarn_smith = { name: 'GRIMHILD', tex: 'spr_prospector' };
NPC_DEFS.skarn_shaman = { name: 'SHAMAN VEDA', tex: 'spr_shaman' };
NPC_DEFS.skarn_herder = { name: 'HALLDOR', tex: 'spr_trapper' };
NPC_DEFS.skarn_scout = { name: 'SCOUT ASGER', tex: 'spr_nomad' };
NPC_DEFS.skarn_child = { name: 'TYRA', tex: 'spr_child' };
NPC_DEFS.skarn_bard = { name: 'THE WIND-BARD', tex: 'spr_keeper' };
NPC_DEFS.clantrader = { name: 'CLAN TRADER', tex: 'spr_trader' };

QUESTS.stormgiant = {
  title: 'The Storm That Stayed', giver: 'Chief Ulfar Stormbrow',
  desc: 'A storm has sat on the Stormcrown for a hundred years, and a giant sits in the storm. The clans lose a hand of herders to the lightning every winter. Ulfar wants the giant to hear a word from you, preferably a sharp one.',
  short: () => (S.flags.stormGiantDead ? 'Tell Ulfar' : S.flags.stormspireEntered ? 'Defeat the Storm Giant' : 'Find the Stormspire'),
  objectives: (q) => [
    { t: 'Find the Stormspire in the Highlands', done: !!S.flags.stormspireEntered || q.status === 'done' },
    { t: 'Defeat the Storm Giant', done: !!S.flags.stormGiantDead || q.status === 'done' },
    { t: 'Tell Chief Ulfar', done: q.status === 'done' },
  ],
};
QUESTS.feathers = {
  title: 'Feathers for the Weather', giver: 'Shaman Veda',
  desc: 'Veda reads the weather in storm feathers, and her stock has run out. Thunderbirds shed them when they dive. She needs five.',
  short: () => `Storm feathers ${Math.min(count('storm_feather'), 5)}/5`,
  objectives: (q) => [{ t: `Gather storm feathers (${Math.min(count('storm_feather'), 5)}/5)`, done: count('storm_feather') >= 5 || q.status === 'done' }, { t: 'Bring them to Veda', done: q.status === 'done' }],
};
QUESTS.greytusk = {
  title: 'Old Greytusk', giver: 'Halldor the herder',
  desc: 'A mammoth bull the clans call Greytusk walks the highland roads and flattens everything that does not move. Halldor wants the herds safe, and the tusks for the Hold.',
  short: () => (S.flags.rb_greytusk ? 'Tell Halldor' : 'Slay Old Greytusk'),
  objectives: (q) => [{ t: 'Slay Old Greytusk, the Mammoth King', done: !!S.flags.rb_greytusk || q.status === 'done' }, { t: 'Tell Halldor', done: q.status === 'done' }],
};
TARGETS.stormgiant = () => { const p = poiOf('highlands', S.flags.stormGiantDead ? 'skarnhold' : 'stormspire'); return p ? { map: 'highlands', x: p.x, y: p.y + 2 } : null; };
TARGETS.feathers = () => { const p = poiOf('highlands', 'stormcircle'); return p ? { map: 'highlands', x: p.x, y: p.y + 2 } : null; };
TARGETS.greytusk = () => { const p = poiOf('highlands', 'skarnhold'); return p ? { map: 'highlands', x: p.x, y: p.y + 2 } : null; };

SCRIPTS.skarn_chief = async function chief() {
  const N = 'Ulfar', q = S.quests.stormgiant;
  if (q.status === 'active' && S.flags.stormGiantDead) {
    await say(N, 'Look up. Look up! The clouds are moving. I have not seen a cloud move since I was a boy.');
    addGold(640); addItem('clan_furs'); addItem('giants_maul'); addItem('gem_sapphire', 1, true); finishQuest('stormgiant'); return;
  }
  if (q.status === 'inactive') {
    await say(N, 'A stranger, walking in from the pass without lightning in her hair. Sit. Eat. Then listen.');
    await say(N, 'The Storm Giant keeps the storm. Why, nobody remembers. The Stormspire is in the north-east, where the cloud touches the ground. Break the giant and the storm may follow.');
    const c = await choose(['I will go.', 'Not yet.']);
    if (c === 0) { startQuest('stormgiant'); await say(N, 'Bring a shield and fire. And someone who does not mind being hit by clouds.'); }
    return;
  }
  await say(N, cyc('ulfarN', ['The clans have three laws: feed the fire, feed the guest, and never feed the storm.', 'The lowlanders send us nothing but tax collectors. You are the first I have not wanted to throw off a cliff.', 'Our herds follow the thunder; the grass is greenest where it strikes.']));
};
SCRIPTS.skarn_trader = () => trade('Rannveig', [{ id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'stormcaller_charm', price: 760, once: true, name: "Stormcaller's Charm" }, ...dailyWares('Rannveig', 2)],
  cyc('rannN', ['Furs, feathers and charms. The charms are real. The furs, doubly so.', 'Everything here is priced in what it costs to carry it up the pass.', 'The storm does me favours. Customers arrive wet and desperate.']));
SCRIPTS.skarn_smith = () => smithMenu('Grimhild', [{ id: 'steel_sword', price: 190, once: true }, { id: 'iron_greatsword', price: 230, once: true }, { id: 'hunting_spear', price: 90, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'iron_ingot', price: 30, n: 1 }, ...dailyWares('Grimhild', 2)],
  cyc('grimN', ['Struck by lightning twice. The second time I asked it politely to stop.', 'Fulgurite: glass where lightning struck sand. My best hammerhead is made of it.']));
SCRIPTS.skarn_shaman = async function shaman() {
  const N = 'Veda', q = S.quests.feathers;
  if (q.status === 'active' && count('storm_feather') >= 5) { await say(N, 'Oh, they sing. Listen. These are fresh. Here, take this: the wind will speak well of you.'); S.inv.storm_feather -= 5; addGold(240); addItem('mp_potion_g', 3, true); addItem('gem_sapphire', 1, true); finishQuest('feathers'); return; }
  if (q.status === 'inactive') {
    await say(N, 'I read the weather in feathers. Thunderbirds shed them when they dive. I am out. Five feathers from the birds, and I will read your fortune for free.');
    const c = await choose(['I will fetch them.', 'Not today.']);
    if (c === 0) { startQuest('feathers'); await say(N, 'The storm circles are where they roost. Do not stand in the middle when it rains.'); }
    return;
  }
  await say(N, cyc('vedaN', ['The sky is a slow animal. You learn its habits or it learns yours.', 'Rain from the north: iron. Rain from the south: old iron.']));
};
SCRIPTS.skarn_herder = async function herder() {
  const N = 'Halldor', q = S.quests.greytusk;
  if (q.status === 'active' && S.flags.rb_greytusk) { await say(N, 'You did it. You actually did it. The herd walks again. Take this, from all of us.'); addGold(380); addItem('hp_potion_g', 3, true); addItem('mammoth_tusk', 1, true); finishQuest('greytusk'); return; }
  if (q.status === 'inactive') {
    await say(N, 'Greytusk is on the roads again. Every year he gets bigger, and every year the Hold gets smaller. Slay him, and the herds can move.');
    const c = await choose(['I will hunt him.', 'Not today.']);
    if (c === 0) { startQuest('greytusk'); await say(N, 'Follow the great footprints on the highland roads. He walks a long loop between the stone circles.'); }
    return;
  }
  await say(N, cyc('hallN', ['A mammoth can break a bridge. A mammoth angry can break a cliff.', 'My son rides a goat. The goat has opinions.']));
};
SCRIPTS.skarn_scout = async function scout() { await say('Asger', cyc('asgerN', ['Watch the sky, not the road. The road can only kill you slowly.', 'Giants sleep in cairns when it is quiet. When it is loud, they are not asleep.', 'The pass south goes to the lowlands. The pass north does not go anywhere I would follow.'])); };
SCRIPTS.skarn_child = async function child() { await say('Tyra', cyc('tyraN', ['I touched a lightning bug once. It tickled.', 'My grandfather says the giant is lonely. My grandfather says a lot of things.', 'If you are brave, you can hold your hair up near the stones and it stands by itself.'])); };
SCRIPTS.skarn_bard = async function bard() { await say('Wind-Bard', cyc('bardN', ['Listen. Under the wind there is another sound. That is the giant, humming. He has hummed the same note for a hundred years.', 'I sing the clans their dead. It is a long song. It gets longer.', 'The hearths of the Hold burn old wood and older promises.'])); };
SCRIPTS.clantrader = () => trade('Clan Trader', [{ id: 'hp_potion', price: 26 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'hide', price: 20 }, ...dailyWares('Clan Trader', 2)],
  cyc('clanN', ['Fires and furs. Take both.', 'The Hold is half a day north-east. Say Ulfar sent you, and watch him blush.']));

// ---- inns and cartographers (round 7)
NPC_DEFS.wick_inn = { name: 'MARIT, THE LANTERN INN', tex: 'spr_hilda' };
NPC_DEFS.wick_map = { name: 'JOSS THE CHARTMAKER', tex: 'spr_scribe' };
NPC_DEFS.skarn_inn = { name: 'GUDRUN OF THE LONGHOUSE', tex: 'spr_hilda' };
NPC_DEFS.skarn_map = { name: 'KELDA THE WAYFINDER', tex: 'spr_scribe' };
SCRIPTS.wick_inn = () => innMenu('Marit', { room: 22, meal: 12, news: 28, hello: cyc('maritN', ['The Lantern Inn: dry beds on stilts, soup that has never once been fish. Mostly.', 'No one has complained of the damp since we put the beds up a floor.']) });
SCRIPTS.wick_map = () => cartographerMenu('Joss');
SCRIPTS.skarn_inn = () => innMenu('Gudrun', { room: 25, meal: 14, news: 30, hello: cyc('gudrunN', ['The longhouse is warm and the mead is honest. The beds are for guests; the benches are for friends.', 'Sit. Eat. The storm has not stopped in a hundred years; it will not stop for you.']) });
SCRIPTS.skarn_map = () => cartographerMenu('Kelda');
