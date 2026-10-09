// The people and quests of Lantern Glade (Glasswood), Lanternfall (the Underdeep) and Saltmarket (the Frozen Coast).
// Registered into the shared NPC and quest tables (imported once by GameScene). Same recipe as regions2_story.js.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { buyMenu, sellMenu } from './services.js';
import { dailyWares } from './stock.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold, count, removeItem } from '../systems/inventory.js';
import { getRegion } from './maps.js';
import { innMenu, cartographerMenu, smithMenu, tailorMenu } from './services2.js';
import { addRep, rep, repTier, FACTIONS } from './factions.js';
import { armouryMenu } from './emberhold.js';
import { isNightHour, hourOf } from '../world/lighting.js';

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
const target = (rid, kind) => () => { const p = poiOf(rid, kind); return p ? { map: rid === 'coast' ? 'coast' : rid, x: p.x, y: p.y + 2 } : null; };

// A quest-giving villager: offers the quest, takes the hand-in, and chats the rest of the time.
//   cfg: { who, id, intro: [lines], yes, go, ready(), thanks: [lines], pay(), idle: [lines], key, onStart?, gate?() }
function giver(cfg) {
  return async function () {
    const q = S.quests[cfg.id];
    if (q.status === 'active' && cfg.ready()) {
      for (const l of cfg.thanks) await say(cfg.who, l);
      cfg.pay(); finishQuest(cfg.id); return;
    }
    if (q.status === 'inactive' && (!cfg.gate || cfg.gate())) {
      for (const l of cfg.intro) await say(cfg.who, l);
      const c = await choose([cfg.yes || 'I will do it.', 'Not today.']);
      if (c === 0) { startQuest(cfg.id); cfg.onStart?.(S.quests[cfg.id]); await say(cfg.who, cfg.go); }
      return;
    }
    if (q.status === 'active' && cfg.progress) { await say(cfg.who, cfg.progress()); return; }
    await say(cfg.who, cyc(cfg.key, cfg.idle));
  };
}

// ============================================================================ Lantern Glade (Glasswood)
NPC_DEFS.glade_warden = { name: 'WARDEN YSOLT', tex: 'spr_keeper' };
NPC_DEFS.glade_trader = { name: 'FENN LANTERNWRIGHT', tex: 'spr_trader' };
NPC_DEFS.glade_smith = { name: 'TAMSIN GLASSBLOWER', tex: 'spr_prospector' };
NPC_DEFS.glade_hunter = { name: 'KESTREL', tex: 'spr_trapper' };
NPC_DEFS.glade_herbalist = { name: 'ORREL DEWKEEPER', tex: 'spr_fisher' };
NPC_DEFS.glade_child = { name: 'PIP', tex: 'spr_child' };
NPC_DEFS.glade_watch = { name: 'GLADE WATCH', tex: 'spr_guard' };
NPC_DEFS.glade_inn = { name: 'MARROW, THE SINGING INN', tex: 'spr_hilda' };
NPC_DEFS.glade_map = { name: 'SPINDLE THE MAPMAKER', tex: 'spr_scribe' };
NPC_DEFS.glade_sage = { name: 'THE MOON-READER', tex: 'spr_shaman' };

QUESTS.hartking = {
  title: 'The Hartking Wears the Wood', giver: 'Warden Ysolt',
  desc: 'The Hartking was the forest\'s guardian before the glass took the trees. Now the glass wears him. Every winter his antlers grow, and more of the wood goes to crystal. Ysolt asks you to end it, one way or another.',
  short: () => (S.flags.hartKingDead ? 'Tell Ysolt' : S.flags.hartspireEntered ? 'Defeat the Hartking' : 'Find the Hart Spire'),
  objectives: (q) => [
    { t: 'Find the Hart Spire in the Glasswood', done: !!S.flags.hartspireEntered || q.status === 'done' },
    { t: 'Defeat the Hartking', done: !!S.flags.hartKingDead || q.status === 'done' },
    { t: 'Tell Warden Ysolt', done: q.status === 'done' },
  ],
};
QUESTS.glimmers = {
  title: 'Too Many Lights', giver: 'Kestrel the hunter',
  desc: 'The glimmerkin used to be shy. Now they swarm the lantern roads and spit light at anyone who carries a torch. Kestrel will pay for every eight you put out.',
  short: (q) => (q.status === 'ready' ? 'Tell Kestrel' : `Glimmerkin ${Math.min(killsSince(q, 'glimmerkin'), 8)}/8`),
  objectives: (q) => [{ t: `Put out glimmerkin (${Math.min(killsSince(q, 'glimmerkin'), 8)}/8)`, done: killsSince(q, 'glimmerkin') >= 8 || q.status === 'done' }, { t: 'Tell Kestrel', done: q.status === 'done' }],
};
QUESTS.bloom = {
  title: 'Glass Bloom for the Dew', giver: 'Orrel Dewkeeper',
  desc: 'Glass bloom grows at the rim of glimmering pools, and Orrel brews a draught from it that keeps the wood from getting into your lungs. He needs five.',
  short: () => `Glass bloom ${Math.min(count('glass_bloom'), 5)}/5`,
  objectives: (q) => [{ t: `Gather glass bloom (${Math.min(count('glass_bloom'), 5)}/5)`, done: count('glass_bloom') >= 5 || q.status === 'done' }, { t: 'Bring them to Orrel', done: q.status === 'done' }],
};
QUESTS.moonlit = {
  title: 'What the Moon Wants', giver: 'The Moon-Reader',
  desc: 'The Moon-Reader only speaks after dark. She says the moon wants three moonpetals, which open in the forest of the Hollow Reach only at night, and that you will understand why when you hold them.',
  short: () => `Moonpetals ${Math.min(count('moonpetal'), 3)}/3`,
  objectives: (q) => [{ t: `Gather moonpetals at night (${Math.min(count('moonpetal'), 3)}/3)`, done: count('moonpetal') >= 3 || q.status === 'done' }, { t: 'Bring them to the Moon-Reader (after dark)', done: q.status === 'done' }],
};
TARGETS.hartking = () => { const p = poiOf('glasswood', S.flags.hartKingDead ? 'lanternglade' : 'hartspire'); return p ? { map: 'glasswood', x: p.x, y: p.y + 2 } : null; };
TARGETS.glimmers = target('glasswood', 'lanternglade');
TARGETS.bloom = target('glasswood', 'glimmerpool');
TARGETS.moonlit = () => null;

SCRIPTS.glade_warden = giver({
  who: 'Ysolt', id: 'hartking', key: 'ysoltN',
  intro: ['You came through the trees with your face intact. Good. They like faces here.', 'The Hartking was our guardian before the glass took the wood. He grew crystal on his antlers to hold the trees up, and the crystal grew back, and now the crystal wears him.', 'The Hart Spire is east, past the antler stones. Go up and end it. Take someone who can take a hit.'],
  yes: 'I will go.', go: 'Keep to the lantern roads. The wood hates the dark more than you do.',
  ready: () => !!S.flags.hartKingDead,
  thanks: ['The trees are quiet. I do not know the last time I heard them quiet.'],
  pay() { addGold(660); addItem('prism_mail'); addItem('prism_helm'); addItem('shardblade'); addItem('gem_topaz', 1, true); },
  idle: ['The glass remembers what it grew around. Mind what you leave lying.', 'The lanterns are lit by hand every dusk. We do not talk about the one at the end of the south road.', 'You are always welcome at the Glade. The trees may disagree.'],
});
SCRIPTS.glade_trader = () => trade('Fenn', [{ id: 'lantern', price: 150, once: true, name: 'Hooded Lantern' }, { id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, ...dailyWares('Fenn', 2)],
  cyc('fennN', ['Lanterns, wicks, and one very good pair of boots that are not for sale.', 'Every lamp on the roads is mine. Every moth is also mine, by extension.', 'I charge for light. Darkness is free. Make of that what you will.']));
SCRIPTS.glade_smith = () => smithMenu('Tamsin', [{ id: 'iron_sword', price: 90, once: true }, { id: 'steel_sword', price: 190, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'iron_ingot', price: 28 }],
  cyc('tamsinN', ['I blow glass, and sometimes I forge. The glass is prettier. The forging pays.', 'Prism steel holds an edge for a week and a grudge for a year.', 'Do not drop my glass. I will know.']));
SCRIPTS.glade_hunter = giver({
  who: 'Kestrel', id: 'glimmers', key: 'kestrelN',
  intro: ['The glimmerkin are getting bold. Eight on the road last night, spitting light at my hounds. They never used to come this close.', 'Put out eight and I will make it worth the oil.'],
  yes: 'I will thin them.', go: 'They flicker. Hit them when they stop flickering.',
  onStart(q) { q.base = S.kills.glimmerkin || 0; },
  ready: () => killsSince(S.quests.glimmers, 'glimmerkin') >= 8,
  progress: () => `${Math.min(killsSince(S.quests.glimmers, 'glimmerkin'), 8)} of eight. They hide among the crystal trees.`,
  thanks: ['Eight! The road is dark again, and I never thought I would call that good news.'],
  pay() { addGold(240); addItem('hp_potion_g', 2, true); addItem('glimmer_dust', 3, true); },
  idle: ['Stags in the wood have glass in their antlers. Do not shoot the shiny ones; they are the ones that remember.', 'A fox followed me home once. It was made of light. I let it stay.'],
});
SCRIPTS.glade_herbalist = giver({
  who: 'Orrel', id: 'bloom', key: 'orrelN',
  intro: ['Glass bloom opens at the rim of the glimmering pools. Five blooms make a draught that keeps the shards out of your lungs.', 'The pools are fey places. Be polite.'],
  yes: 'I will gather them.', go: 'Look for the pale blue ones. The yellow ones bite.',
  ready: () => count('glass_bloom') >= 5,
  thanks: ['Five! Look at the veins: bright as a window. Here, take the draught I promised, and my thanks.'],
  pay() { removeItem('glass_bloom', 5); addGold(190); addItem('hp_potion_g', 3, true); addItem('mp_potion_g', 2, true); },
  idle: ['I talk to the plants. The plants rarely answer. This is a mercy.', 'Dewdrop tea is for the brave. Or the thirsty.'],
});
SCRIPTS.glade_child = talk('Pip', 'pipN', ['The trees sing a little louder if you whistle the tune back.', 'I found a feather made of glass. It cut my thumb. I like it.', 'The Hartking used to walk through the Glade at midwinter. Everyone hid, and everyone peeked.']);
SCRIPTS.glade_watch = talk('Glade Watch', 'gwatchN', ['Lanterns lit, roads clear. If the lamps go out, count to twenty and shout.', 'No fires outside the Glade. The trees take it personally.']);
SCRIPTS.glade_inn = () => innMenu('Marrow', { room: 24, meal: 12, news: 28, hello: cyc('marrowN', ['The Singing Inn: the walls hum a little when you are asleep. Nobody complains.', 'Soup. Bed. A song if you want one. The song is not a joke.']) });
SCRIPTS.glade_map = () => cartographerMenu('Spindle');
SCRIPTS.glade_sage = giver({
  who: 'Moon-Reader', id: 'moonlit', key: 'moonN',
  gate: () => isNightHour(hourOf()),
  intro: ['You come at the right hour. Few do.', 'The moon wants three moonpetals, from the forest of the Reach, the flowers that open in the dark. When you hold them, you will understand why.'],
  yes: 'I will bring them.', go: 'They will not open in daylight. Do not try to make them.',
  ready: () => count('moonpetal') >= 3,
  progress: () => `Moonpetals ${Math.min(count('moonpetal'), 3)} of three.`,
  thanks: ['Cold petals, quiet scent. Yes. This is what the moon wanted.'],
  pay() { removeItem('moonpetal', 3); addGold(260); addItem('moonlit_draught', 3, true); addItem('silver_sword', 1, true); },
  idle: ['Come back after dusk. The day-voice is only for small talk, and I do not do small talk.', 'The moon listens more closely in the Glasswood. We are very polite about it.'],
});

// ============================================================================ Lanternfall (the Underdeep)
NPC_DEFS.fall_foreman = { name: 'FOREMAN DAGNA', tex: 'spr_guard' };
NPC_DEFS.fall_trader = { name: 'BOLLARD THE LAMPMAN', tex: 'spr_trader' };
NPC_DEFS.fall_smith = { name: 'IRMA DEEPFORGE', tex: 'spr_prospector' };
NPC_DEFS.fall_fungalist = { name: 'CAP THE FUNGALIST', tex: 'spr_fisher' };
NPC_DEFS.fall_scout = { name: 'TALLOW', tex: 'spr_trapper' };
NPC_DEFS.fall_child = { name: 'GRIT', tex: 'spr_child' };
NPC_DEFS.fall_watch = { name: 'LANTERN GUARD', tex: 'spr_guard' };
NPC_DEFS.fall_inn = { name: 'ODDRUN OF THE LONG BENCH', tex: 'spr_hilda' };
NPC_DEFS.fall_map = { name: 'QUILL THE TUNNEL-CHARTER', tex: 'spr_scribe' };
NPC_DEFS.fall_ferry = { name: 'ORM THE FERRYMAN', tex: 'spr_fisher' };

QUESTS.lodecolossus = {
  title: 'The Colossus in the Lode', giver: 'Foreman Dagna',
  desc: 'Something has been eating the ore at the bottom of the Underdeep. It has eaten the lanterns, then the tunnels, and now the miners. Dagna wants the Lode Colossus gone before the Delvers lose their last floor.',
  short: () => (S.flags.lodeColossusDead ? 'Tell Dagna' : S.flags.lodenestEntered ? 'Defeat the Lode Colossus' : 'Find the Lode Chasm'),
  objectives: (q) => [
    { t: 'Find the Lode Chasm in the Underdeep', done: !!S.flags.lodenestEntered || q.status === 'done' },
    { t: 'Defeat the Lode Colossus', done: !!S.flags.lodeColossusDead || q.status === 'done' },
    { t: 'Tell Foreman Dagna', done: q.status === 'done' },
  ],
};
QUESTS.weavers = {
  title: 'Silk and Teeth', giver: 'Tallow the scout',
  desc: 'The cave weavers have strung the east tunnels with silk, and the silk is full of people. Tallow will pay for every eight you cut down.',
  short: (q) => (q.status === 'ready' ? 'Tell Tallow' : `Cave weavers ${Math.min(killsSince(q, 'caveweaver'), 8)}/8`),
  objectives: (q) => [{ t: `Slay cave weavers (${Math.min(killsSince(q, 'caveweaver'), 8)}/8)`, done: killsSince(q, 'caveweaver') >= 8 || q.status === 'done' }, { t: 'Tell Tallow', done: q.status === 'done' }],
};
QUESTS.glowcaps = {
  title: 'Lanterns Made of Mushrooms', giver: 'Cap the fungalist',
  desc: 'When the oil ran out, the Delvers began lighting Lanternfall with glowcaps. They are running low. Cap needs five more, and he is not going into the grove himself.',
  short: () => `Glowcaps ${Math.min(count('glowcap'), 5)}/5`,
  objectives: (q) => [{ t: `Gather glowcaps (${Math.min(count('glowcap'), 5)}/5)`, done: count('glowcap') >= 5 || q.status === 'done' }, { t: 'Bring them to Cap', done: q.status === 'done' }],
};
TARGETS.lodecolossus = () => { const p = poiOf('underdeep', S.flags.lodeColossusDead ? 'lanternfall' : 'lodenest'); return p ? { map: 'underdeep', x: p.x, y: p.y + 2 } : null; };
TARGETS.weavers = target('underdeep', 'weavernest');
TARGETS.glowcaps = target('underdeep', 'glowcapgrove');

SCRIPTS.fall_foreman = giver({
  who: 'Dagna', id: 'lodecolossus', key: 'dagnaN',
  intro: ['A surface-walker. In my town. Sit. Eat. You look like someone who hits things.', 'Below Lanternfall there is a chasm of raw ore, and in the ore there is something that was never a man and never a stone. It eats the rock and the rock grows back wrong.', 'The Lode Chasm is east, past the weaver tunnels. Kill it, or the Delvers lose their last floor.'],
  yes: 'I will go down.', go: 'Take torches. The glowcaps lie, a little, about where the ground is.',
  ready: () => !!S.flags.lodeColossusDead,
  thanks: ['The floor stopped humming. Do you hear that? That is silence. I had forgotten it.'],
  pay() { addGold(780); addItem('deep_plate'); addItem('deep_helm'); addItem('lode_pick'); addItem('deep_lamp'); addItem('gem_onyx', 1, true); addRep('delvers', 20); },
  idle: ['The Delvers do not retire. We go down until we are the tunnel.', 'The lamps burn glowcap oil now. It smells of old cellars and good decisions.', 'Lanternfall has never fallen. We are very careful with the word.'],
});
SCRIPTS.fall_trader = () => trade('Bollard', [{ id: 'lantern', price: 150, once: true, name: 'Hooded Lantern' }, { id: 'lantern_oil', price: 40, n: 1 }, { id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, ...dailyWares('Bollard', 2)],
  cyc('bollardN', ['Lamps. Oil. Rope. A small amount of hope, sold by weight.', 'Everything in Lanternfall is priced by how far you have to carry it down.', 'The glowcap oil is cheaper. It is also slightly alive.']));
SCRIPTS.fall_smith = () => smithMenu('Irma', [{ id: 'steel_sword', price: 190, once: true }, { id: 'iron_greatsword', price: 230, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'iron_ingot', price: 28 }, { id: 'ember_ore', price: 120 }],
  cyc('irmaN', ['Deepforge: coal from the lode, hammer from the surface, patience from nowhere.', 'The anvil rings differently down here. I have stopped asking why.', 'Bring me ore and I will make it into something that argues back.']));
SCRIPTS.fall_fungalist = giver({
  who: 'Cap', id: 'glowcaps', key: 'capN',
  intro: ['Do you know what glowcaps eat? Neither do I. They have been growing for a hundred years and we have never seen one hungry.', 'Five of them would light the east wall for a month. I will not go into the grove. They hum when you walk in.'],
  yes: 'I will fetch them.', go: 'Pick the blue-lit ones. The red-lit ones are saying something.',
  ready: () => count('glowcap') >= 5,
  thanks: ['Five! The wall will glow like a church. Take this, and my thanks, and my solemn promise not to ask what you heard in there.'],
  pay() { removeItem('glowcap', 5); addGold(200); addItem('hp_potion_g', 3, true); addItem('mp_potion_g', 2, true); },
  idle: ['Mushrooms do not scream. They only sound like it.', 'I have named every cap in the east grove. They do not answer to the names.'],
});
SCRIPTS.fall_scout = giver({
  who: 'Tallow', id: 'weavers', key: 'tallowN',
  intro: ['The weavers nest in the east tunnels. Eight of them, at least, and I think a champion beneath them. They wrap what they catch and keep it.', 'Cut eight down and I will pay what I can. It is not nothing.'],
  yes: 'I will clear the tunnels.', go: 'Fire cuts silk. So does a good blade. Mind the poison.',
  onStart(q) { q.base = S.kills.caveweaver || 0; },
  ready: () => killsSince(S.quests.weavers, 'caveweaver') >= 8,
  progress: () => `${Math.min(killsSince(S.quests.weavers, 'caveweaver'), 8)} of eight. They hang from the roof.`,
  thanks: ['Eight! You are a hard one to catch in a web.'],
  pay() { addGold(260); addItem('hp_potion_g', 2, true); addItem('weaver_silk', 3, true); },
  idle: ['Walk lightly. A weaver feels the ground, not the air.', 'Silk burns blue. If it burns blue, run.'],
});
SCRIPTS.fall_child = talk('Grit', 'gritN', ['I have never seen the sun. Dagna says it is like a lantern that hates you.', 'The big lantern went out once. We all held hands. It was fine. It was not fine.', 'Orm says the ferry goes up to the sun. I do not believe him.']);
SCRIPTS.fall_watch = talk('Lantern Guard', 'lguardN', ['Keep the light between you and the dark. That is the entire job.', 'Anything that walks out of the east tunnels without a lamp gets a very short conversation.']);
SCRIPTS.fall_inn = () => innMenu('Oddrun', { room: 25, meal: 14, news: 30, hello: cyc('oddrunN', ['The Long Bench: a bed for every Delver who comes home. You may be the first stranger.', 'Soup. Beer. Bench. The benches are older than the town.']) });
SCRIPTS.fall_map = () => cartographerMenu('Quill');
// The underground ferry: across the black water and up the long stair to Emberhold, or onward to the Ashen Peaks
SCRIPTS.fall_ferry = async function ferry() {
  const N = 'Orm';
  await say(N, cyc('ormN', ['The black water carries more than boats. Hold the rail and do not look down.', 'I have taken a hundred crossings and one passenger twice. Not you. Not yet.']));
  const c = await choose(['Ride to Emberhold (20g)', 'Ride up to the Ashen Peaks (free)', 'Stay']);
  if (c === 2) return;
  if (c === 0) {
    if (S.gold < 20) { await say(N, 'The ferry runs on coin or a good story. You have neither.'); return; }
    S.gold -= 20;
  }
  const gs = (await import('../systems/dialogue.js')).dialogue.hud.scene.get('Game');
  await say(N, 'Hold on.');
  gs.changeMap(c === 0 ? 'emberhold' : 'ashen', c === 0 ? 'gate' : 'deepdoor', 'door');
};

// ============================================================================ Saltmarket (the Frozen Coast)
NPC_DEFS.salt_harbourmaster = { name: 'HARBOURMASTER VESS', tex: 'spr_guard' };
NPC_DEFS.salt_trader = { name: 'ROSALIND SEA-GOODS', tex: 'spr_trader' };
NPC_DEFS.salt_smith = { name: 'CORMAC SHIPWRIGHT', tex: 'spr_prospector' };
NPC_DEFS.salt_tailor = { name: 'MADAM PERPETUA, TAILOR', tex: 'spr_hilda' };
NPC_DEFS.salt_guildmaster = { name: 'GUILDMASTER ANNEKE', tex: 'spr_keeper' };
NPC_DEFS.salt_smuggler = { name: 'NIM THE FENCE', tex: 'spr_stalker' };
NPC_DEFS.salt_sailor = { name: 'OLD CAP\'N BRYN', tex: 'spr_fisher' };
NPC_DEFS.salt_inn = { name: 'GULL & ANCHOR, NELL', tex: 'spr_hilda' };
NPC_DEFS.salt_map = { name: 'ISOLDE SEA-CHARTS', tex: 'spr_scribe' };
NPC_DEFS.salt_child = { name: 'MINNOW', tex: 'spr_child' };
NPC_DEFS.salt_watch = { name: 'HARBOUR WATCH', tex: 'spr_guard' };
NPC_DEFS.salt_bard = { name: 'THE SHANTY-MAN', tex: 'spr_keeper' };

QUESTS.brinegut = {
  title: 'Captain Brinegut\'s Cargo', giver: 'Harbourmaster Vess',
  desc: 'Captain Brinegut runs half the Coast\'s contraband out of Seaweed Cove, and the Harbour Watch cannot touch him without losing a hand of sailors. Vess wants the Cove closed, the Captain stopped, and his ledger brought back.',
  short: () => (S.flags.brinegutDead ? 'Tell Vess' : S.flags.smugglercoveEntered ? 'Defeat Captain Brinegut' : 'Find Seaweed Cove'),
  objectives: (q) => [
    { t: 'Find Seaweed Cove on the Frozen Coast', done: !!S.flags.smugglercoveEntered || q.status === 'done' },
    { t: 'Defeat Captain Brinegut', done: !!S.flags.brinegutDead || q.status === 'done' },
    { t: 'Tell Harbourmaster Vess', done: q.status === 'done' },
  ],
};
QUESTS.pearls = {
  title: 'Pearls for a Wedding', giver: 'Old Cap\'n Bryn',
  desc: 'Bryn\'s granddaughter weds at the turn of the year and he swore he would give her pearls. Wreck crabs and barnacles on the coast carry them in their shells. He needs four.',
  short: () => `Pearls ${Math.min(count('pearl'), 4)}/4`,
  objectives: (q) => [{ t: `Gather pearls from crabs and barnacles (${Math.min(count('pearl'), 4)}/4)`, done: count('pearl') >= 4 || q.status === 'done' }, { t: 'Bring them to Bryn', done: q.status === 'done' }],
};
QUESTS.channel = {
  title: 'Clear the Channel', giver: 'Guildmaster Anneke',
  desc: 'Pirates harry the shipping lane with harpoons and pull sailors from their decks. The Tide Guild pays for every six harpooners you put down.',
  short: (q) => (q.status === 'ready' ? 'Tell Anneke' : `Harpooners ${Math.min(killsSince(q, 'harpooner'), 6)}/6`),
  objectives: (q) => [{ t: `Slay ice harpooners (${Math.min(killsSince(q, 'harpooner'), 6)}/6)`, done: killsSince(q, 'harpooner') >= 6 || q.status === 'done' }, { t: 'Tell Guildmaster Anneke', done: q.status === 'done' }],
};
QUESTS.saltrun = {
  title: 'A Quiet Run', giver: 'Nim the Fence',
  desc: 'The Smugglers\' Guild wants four salt crystals, pulled out of the shingle, and no questions. Nim does not say what they are for. The Tide Guild will not like it.',
  short: () => `Salt crystals ${Math.min(count('salt_crystal'), 4)}/4`,
  objectives: (q) => [{ t: `Gather salt crystals (${Math.min(count('salt_crystal'), 4)}/4)`, done: count('salt_crystal') >= 4 || q.status === 'done' }, { t: 'Bring them to Nim', done: q.status === 'done' }],
};
TARGETS.brinegut = () => { const p = poiOf('coast', S.flags.brinegutDead ? 'saltgate' : 'smugglercove'); return p ? { map: 'coast', x: p.x, y: p.y + 2 } : null; };
TARGETS.pearls = target('coast', 'saltgate');
TARGETS.channel = target('coast', 'saltgate');
TARGETS.saltrun = target('coast', 'saltgate');

SCRIPTS.salt_harbourmaster = giver({
  who: 'Vess', id: 'brinegut', key: 'vessN',
  intro: ['Stay to the quays, stranger, and you will not need me.', 'Brinegut is a captain with a ship he never takes out. His crew works under the cliff, in a cove he calls a warehouse. Half the Coast\'s contraband goes through it.', 'Close it. Bring me his ledger and I will see the Guild pays what it should.'],
  yes: 'I will close the Cove.', go: 'It is on the coast, under the cliff, east of here. The tide hides the door.',
  ready: () => !!S.flags.brinegutDead,
  thanks: ['The Cove is quiet. Brinegut is the colour of the harbour water. That is what I wanted.'],
  pay() { addGold(720); addItem('tide_blade'); addItem('tide_coat'); addItem('gem_sapphire', 1, true); addRep('tide', 30); },
  idle: ['Every ship that docks has paid. Every ship that does not will.', 'If you want rank in the Guild, talk to Anneke. If you want a drink, talk to Nell.'],
});
SCRIPTS.salt_trader = () => trade('Rosalind', [{ id: 'hp_potion', price: 26 }, { id: 'hp_potion_g', price: 90 }, { id: 'mp_potion', price: 30 }, { id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'smoked_pike', price: 44 }, { id: 'grilled_trout', price: 16 }, ...dailyWares('Rosalind', 3)],
  cyc('rosN', ['Sea-goods: salt, tar, rope and rumour. The rumour is on the house.', 'Everything here has been somewhere you have not.', 'Prices are fixed by the tide. The tide is a hard negotiator.']));
SCRIPTS.salt_smith = () => smithMenu('Cormac', [{ id: 'steel_sword', price: 190, once: true }, { id: 'iron_greatsword', price: 230, once: true }, { id: 'iron_cuirass', price: 140, once: true }, { id: 'iron_shield', price: 120, once: true }, { id: 'harpoon', price: 280, once: true }, { id: 'iron_ingot', price: 28 }],
  cyc('cormacN', ['Ships, spears, anchors. If it floats or hurts, I made it.', 'Salt water eats steel. I coat mine in whale-oil and good wishes.', 'Bring me a broken hull and I will bring you a better one.']));
// the tailor: light and medium cloth gear, plus the Guild and Smugglers' own garments at the right standing
SCRIPTS.salt_tailor = () => tailorMenu('Perpetua', cyc('perpN', ['Wool, oilcloth, and the occasional coat that is better than it looks.', 'Heavy armour keeps you alive. Good tailoring keeps you from being noticed. Which do you need?']));
// guild ranks: each faction awards a rank gift once per standing reached
const RANK_GIFTS = {
  tide: [[20, 'KNOWN: Deckhand', { gold: 120 }], [45, 'TRUSTED: First Mate', { item: 'tide_charm' }], [75, 'HONOURED: Admiral\'s Hand', { gold: 500, item: 'gem_sapphire' }]],
  smugglers: [[20, 'KNOWN: Runner', { gold: 150 }], [45, 'TRUSTED: Quartermaster', { item: 'smuggler_cloak' }], [75, "HONOURED: Captain's Ear", { gold: 600, item: 'gem_onyx' }]],
};
export async function guildRankMenu(who, fid) {
  const gifts = RANK_GIFTS[fid], r = rep(fid), claimed = (S.flags.rankGifts ||= {});
  await say(who, `Your standing with ${FACTIONS[fid].name}: ${repTier(fid)} (${r}).`);
  let given = 0;
  for (const [need, title, g] of gifts) {
    const key = fid + need;
    if (r >= need && !claimed[key]) {
      claimed[key] = true; given++;
      if (g.gold) addGold(g.gold); if (g.item) addItem(g.item, 1, true);
      await say(who, `Rank: ${title}. ${g.gold ? g.gold + ' gold' : ''}${g.gold && g.item ? ' and ' : ''}${g.item ? 'a keepsake' : ''}, as the custom is.`);
    }
  }
  if (!given) { const next = gifts.find(([need]) => r < need); await say(who, next ? `Next rank at ${next[0]}: ${next[1].split(': ')[1]}. Do us some favours.` : 'You have the highest rank we give.'); }
}
SCRIPTS.salt_guildmaster = async function guildmaster() {
  const N = 'Anneke', q = S.quests.channel;
  if (q.status === 'active' && killsSince(q, 'harpooner') >= 6) {
    await say(N, 'Six! The lane is clear and the sailors are alive. The Guild pays its debts.');
    addGold(300); addItem('hp_potion_g', 2, true); addRep('tide', 20); finishQuest('channel');
    return;
  }
  if (q.status === 'inactive') {
    await say(N, 'The Tide Guild keeps the shipping lanes open and the sailors counted. Lately, pirates have been pulling them overboard with harpoons.');
    await say(N, 'Put down six of the harpooners and the Guild will remember you. We remember well.');
    const c = await choose(['I will clear the lane.', 'Not today.']);
    if (c === 0) { startQuest('channel'); q.base = S.kills.harpooner || 0; await say(N, 'They lurk on the ice shelf. Watch for the line: it pulls.'); }
    return;
  }
  await say(N, cyc('annekeN', ['The Guild is older than the ice. Mostly.', 'We do not ask where you came from. We do ask whether you will stay.']));
  for (;;) {
    const c = await choose(['Guild rank', 'Guild armoury', 'Leave']);
    if (c === 0) await guildRankMenu(N, 'tide'); else if (c === 1) await armouryMenu(N, ['tide']); else return;
  }
};
SCRIPTS.salt_smuggler = async function fence() {
  const N = 'Nim', q = S.quests.saltrun;
  if (q.status === 'active' && count('salt_crystal') >= 4) {
    await say(N, 'Four. Clean. You did not ask what they are for. I like you more every minute.');
    removeItem('salt_crystal', 4); addGold(340); addItem('smuggler_knife', 1, true); addRep('smugglers', 20); finishQuest('saltrun');
    return;
  }
  if (q.status === 'inactive') {
    await say(N, 'I am not here. You are not here. The salt crystals under the shingle are not here either, but four of them would be worth a great deal to some people.');
    const c = await choose(['I will fetch them.', 'Not today.']);
    if (c === 0) { startQuest('saltrun'); await say(N, 'They glint in the shingle at low tide. Take them in a bag, not your hands.'); }
    return;
  }
  await say(N, cyc('nimN', ['I sell nothing. Everything is on the table. Do not touch the table.', 'The Guild calls us pirates. We call them customers.']));
  for (;;) {
    const c = await choose(['Smugglers\' standing', 'Smugglers\' armoury', 'Buy contraband', 'Leave']);
    if (c === 0) await guildRankMenu(N, 'smugglers'); else if (c === 1) await armouryMenu(N, ['smugglers']);
    else if (c === 2) await buyMenu(N, [{ id: 'lockpick', price: 20, n: 3, name: 'Lockpicks x3' }, { id: 'hp_potion', price: 26 }, { id: 'moonlit_draught', price: 110 }]);
    else return;
  }
};
SCRIPTS.salt_sailor = giver({
  who: 'Bryn', id: 'pearls', key: 'brynN',
  intro: ['My granddaughter weds at the turn of the year. I told her she would have pearls. She said, Grandfather, you cannot afford pearls. I said, I will get them from a crab.', 'Four pearls, from the crabs and barnacles on the ice shelf. I would go myself, but my knees are in the harbour already.'],
  yes: 'I will bring pearls.', go: 'Crack the shells gently. They pay by lustre.',
  ready: () => count('pearl') >= 4,
  thanks: ['Four! Look at that. Round as a promise. She will weep. I will pretend I have something in my eye.'],
  pay() { removeItem('pearl', 4); addGold(280); addItem('smoked_pike', 3, true); addItem('hp_potion_g', 2, true); },
  idle: ['The sea has a sense of humour. It is not a good one.', 'Ships do not sink. They go somewhere else. Sailors learn this slowly.'],
});
SCRIPTS.salt_inn = () => innMenu('Nell', { room: 26, meal: 14, news: 30, hello: cyc('nellN', ['The Gull & Anchor: warm beds, hot chowder, and a window that looks at the harbour so you can watch your ship leave without you.', 'Rooms for the weary, rumours for the curious. Both cost.']) });
SCRIPTS.salt_map = () => cartographerMenu('Isolde');
SCRIPTS.salt_child = talk('Minnow', 'minnowN', ['I can tell what the tide will do by smelling it. It will do whatever it wants.', 'My dad says the smugglers are bad. My uncle is a smuggler. Dad and uncle do not talk at the holidays.', 'If you drop a coin off the quay, a seal catches it. I have counted.']);
SCRIPTS.salt_watch = talk('Harbour Watch', 'swatchN', ['Papers? No, not really. Just do not start anything.', 'The east quay is closed. It is always closed. Do not ask what is on it.']);
SCRIPTS.salt_bard = talk('Shanty-Man', 'shantyN', ['Haul away, my heart, haul away. The ice is thin and the debts are deep.', 'Seven bells, and the cargo is wrong. Seven bells, and the cargo is singing.', 'I know a song about a Hartking and a song about a lode. The one about Brinegut has fewer verses and a rude refrain.']);

// ---- tailors for the older hubs
for (const [id, name, tex] of [['ember_tailor', 'WREN THE SEAMSTRESS', 'spr_hilda'], ['wick_tailor', 'SEDGE THE NETTER', 'spr_hilda'], ['skarn_tailor', 'FRIDA FURRIER', 'spr_hilda'], ['glade_tailor', 'LUMEN THE WEAVER', 'spr_hilda'], ['fall_tailor', 'DARNING DOT', 'spr_hilda']]) {
  NPC_DEFS[id] = { name, tex };
  SCRIPTS[id] = () => tailorMenu(name.split(' ')[0].charAt(0) + name.split(' ')[0].slice(1).toLowerCase(), cyc(id + 'N', ['Cloth, thread and a good eye. What can I make you?', 'Armour keeps you alive. A coat that fits keeps you warm. Both matter.']));
}
