// The small settlements scattered across the Hollow Reach: a trapper, a fisher and a prospector, each with a little stock
// and a word about the road. Registered into the shared NPC tables (imported once by GameScene).
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { buyMenu, sellMenu } from './services.js';
import { dailyWares } from './stock.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold } from '../systems/inventory.js';
import { getRegion } from './maps.js';

NPC_DEFS.trapper = { name: 'TRAPPER', tex: 'spr_trapper' };
NPC_DEFS.fisher = { name: 'FISHER', tex: 'spr_fisher' };
NPC_DEFS.prospector = { name: 'PROSPECTOR', tex: 'spr_prospector' };

const cyc = (key, lines) => { const n = S.flags[key] || 0; S.flags[key] = n + 1; return lines[n % lines.length]; };
const trade = async (who, wares, hello) => {
  S.flags['met' + who] = true;
  await say(who, hello);
  for (;;) {
    const c = await choose(['Buy', 'Sell', 'Leave']);
    if (c === 0) await buyMenu(who, wares); else if (c === 1) await sellMenu(who); else return;
  }
};

SCRIPTS.trapper = () => trade('Trapper', [{ id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'hp_potion', price: 26 }, { id: 'hunting_spear', price: 60, once: true }, ...dailyWares('Trapper', 1)],
  cyc('trapperN', ['Furs, arrows, and advice. The advice is free; the other two are not.', 'Tracks near the north fork. Big. Heavier than a bear and walking upright. I am staying inside tonight.', 'You hear the wolves at dusk? That is not hunting. That is a roll call.']));
const fisherTrade = () => trade('Fisher', [{ id: 'grilled_trout', price: 16 }, { id: 'fish_stew', price: 40 }, { id: 'smoked_pike', price: 44 }, { id: 'hp_potion', price: 26 }],
  cyc('fisherN', ['The ice holds till spring, if spring comes. Cut a hole, wait, say nothing. That is the whole craft.', 'Pike near the east lakes. Eels in the south, if you can bear the taste. I cannot.', 'My grandmother said the lakes remember every name that fell in. I do not fish after dark.']));
SCRIPTS.fisher = async () => {
  if (!S.flags.skates) {
    const c = await choose(["Whaler's Skates (250G)", 'Trade', 'Leave']);
    if (c === 0) {
      if (S.gold < 250) { await say('Fisher', 'Not enough. A good pair is worth a good price. Come back.'); return; }
      S.gold -= 250; S.flags.skates = true; await say('Fisher', 'Bone runners, strapped to boots. On ice or the shelf you will fly 30% faster, and the ice will not throw you around. Mind the holes.'); return;
    }
    if (c === 2) return;
  }
  return fisherTrade();
};
SCRIPTS.prospector = () => trade('Prospector', [{ id: 'iron_ingot', price: 18 }, { id: 'bone_dust', price: 22 }, { id: 'gem_amber', price: 100 }, { id: 'gem_emerald', price: 110 }],
  cyc('prospectorN', ['Iron under the grey rock, bone dust where the old battles were. I sell what the mountain gives me.', 'There is a city of smiths up in the Peaks, they say. Past the great road. I have never been. I am saving for the boots.', 'Rock sings before it falls. If you hear it, run.']));

// ---- the Frozen Coast and the Old Kingdom: two keepers of old stories, one quest each
NPC_DEFS.keeper = { name: 'KEEPER MAREN', tex: 'spr_keeper' };
NPC_DEFS.scribe = { name: 'THE SCRIBE', tex: 'spr_scribe' };
QUESTS.admiral = {
  title: 'The Drowned Admiral', giver: 'Maren, Keeper of the Last Light',
  desc: 'A ship\'s bell rings under the ice every night, and the Keeper has stopped sleeping. She asks you to find the Admiral who never gave the order to abandon ship, and let his crew go home.',
  short: () => (S.flags.admiralDead ? 'Tell Maren it is done' : S.flags.tidebreakEntered ? 'Defeat Admiral Veyl' : 'Find Tidebreak Cavern on the coast'),
  objectives: (q) => [
    { t: 'Find Tidebreak Cavern in the Frozen Coast', done: !!S.flags.tidebreakEntered || q.status === 'done' },
    { t: 'Defeat Admiral Veyl', done: !!S.flags.admiralDead || q.status === 'done' },
    { t: 'Tell Maren, Keeper of the Last Light', done: q.status === 'done' },
  ],
};
QUESTS.hollowking = {
  title: "The Hollow King's Rest", giver: 'The Scribe of the Old Kingdom',
  desc: 'The last of the Hollow Kings sits under his ruined realm, waiting for someone to say his name. The Scribe, who wrote it, cannot say it any more.',
  short: () => (S.flags.hollowKingDead ? 'Tell the Scribe' : S.flags.sepulchreEntered ? 'Defeat the Hollow King' : 'Find the Hollow Sepulchre'),
  objectives: (q) => [
    { t: 'Find the Hollow Sepulchre in the Old Kingdom', done: !!S.flags.sepulchreEntered || q.status === 'done' },
    { t: 'Defeat the Hollow King', done: !!S.flags.hollowKingDead || q.status === 'done' },
    { t: 'Tell the Scribe', done: q.status === 'done' },
  ],
};
const poiOf = (rid, kind) => getRegion(rid).pois.find((p) => p.kind === kind);
TARGETS.admiral = () => { const p = poiOf('coast', S.flags.admiralDead ? 'lighthouse' : 'tidebreak'); return p ? { map: 'coast', x: p.x, y: p.y + 2 } : null; };
TARGETS.hollowking = () => { const p = poiOf('kingdom', 'sepulchre'); return p ? { map: 'kingdom', x: p.x, y: p.y + 2 } : null; };

SCRIPTS.keeper = async function keeper() {
  const N = 'Maren', q = S.quests.admiral;
  if (q.status === 'active' && S.flags.admiralDead) {
    await say(N, 'The bell has stopped. Listen. Do you hear it? No. Nothing. Oh, nothing at all. Thank you, stranger.');
    addGold(450); addItem('sealskin_mail'); addItem('gem_sapphire', 1, true); finishQuest('admiral'); return;
  }
  if (q.status === 'inactive') {
    await say(N, 'You came by the ice. Few do. I keep this light for ships that will never come, and for one that never left.');
    await say(N, 'Admiral Veyl went down in Tidebreak Cavern with his crew still at their stations. He keeps ringing the bell. Go down. Tell him the ship is lost, and the crew forgives him.');
    const c = await choose(['I will go.', 'Not today.']);
    if (c === 0) { startQuest('admiral'); await say(N, 'The cave is far to the east, where the pack ice meets the sea. Bring a warm cloak. And do not listen to the bell.'); }
    return;
  }
  await say(N, cyc('keeperN', ['The light has burned since before the Kings forgot their own names. I trim the wick. That is the whole of it.', 'On clear nights you can see the Ashen Peaks glow. Fire on one horizon, ice on the other. We live between.', 'Do not trust the ice when it is silent. It is only quiet when it is listening.']));
};
SCRIPTS.scribe = async function scribe() {
  const N = 'The Scribe', q = S.quests.hollowking;
  if (q.status === 'active' && S.flags.hollowKingDead) {
    await say(N, 'He is remembered. I can feel it. The ink in my hand is wet again, for the first time in a thousand years.');
    addGold(600); addItem('gem_ruby', 2, true); S.flags.kingRemembered = true; finishQuest('hollowking'); return;
  }
  if (q.status === 'inactive') {
    await say(N, 'You can see me. Good. Most visitors walk through me and mutter about the cold.');
    await say(N, 'I wrote the Kings\' names into the Book of Chains. The last one, I could not finish. He waits in the Hollow Sepulchre, at the end of the road. Say his name for me. Say it to his face, with a sword in your hand.');
    const c = await choose(['I will remember him.', 'The dead should stay dead.']);
    if (c === 0) { startQuest('hollowking'); await say(N, 'He will test you. He tests everyone. It is the last thing he remembers how to do.'); }
    return;
  }
  await say(N, cyc('scribeN', ['A kingdom is a promise that outlasts the people who made it. Ours outlasted us by a long time.', 'The marble was white once. The moss is only the world, remembering how to grow.', 'There are three crowns in the stories: Frost, Ember and Memory. I only ever wrote about the third.']));
};

// ---- The hermits: people who have walked every road. Ask one for a rumour and a place you have not found yet is revealed, with a waypoint.
NPC_DEFS.hermit = { name: 'HERMIT', tex: 'spr_prospector' };
const DIRS8 = ['EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST', 'NORTH', 'NORTH-EAST'];
SCRIPTS.hermit = async () => {
  const g = window.__ff?.game?.scene?.getScene('Game');
  const { regionOfMap } = await import('./regions.js'), { placeName, HIDDEN } = await import('../world/discovery.js');
  await say('Hermit', cyc('hermitN', ['Sit. The fire is free. Everything else I know has a price: your attention.', 'You came a long way to find a man in a hole. Good. Most people never look.', 'The land is bigger than the maps say. It always has been.']));
  for (;;) {
    const c = await choose(['Ask for a rumour', 'Trade', 'Leave']);
    if (c === 2) return;
    if (c === 1) { await trade('Hermit', [{ id: 'hp_potion', price: 24 }, { id: 'sp_potion', price: 18 }, { id: 'frost_lily', price: 10, n: 2, name: 'Frost lily x2' }, ...dailyWares('Hermit', 2)], 'What I have, I have carried a long way.'); continue; }
    const reg = getRegion(regionOfMap(S.map));
    const left = (reg.pois || []).filter((p) => !HIDDEN.has(p.kind) && p.kind !== 'rest' && !S.discovered?.[S.map + ':' + p.id]);
    if (!left.length || !g) { await say('Hermit', 'I have told you every place I know in these lands. The rest is for you to find.'); continue; }
    const px = g.player.x / 16, py = g.player.y / 16;
    left.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
    const p = left[Math.min(left.length - 1, Math.floor(Math.random() * 3))];
    const ang = Math.atan2(p.y - py, p.x - px), dir = DIRS8[(Math.round(ang / (Math.PI / 4)) + 8) % 8], paces = Math.round(Math.hypot(p.x - px, p.y - py) / 5) * 5;
    await say('Hermit', `${dir.charAt(0) + dir.slice(1).toLowerCase()}, about ${paces} paces from here: ${placeName(p).toLowerCase()}. I marked it for you.`);
    g.discover(p, S.map + ':' + p.id, 'A RUMOUR');
    S.flags.waypoint = { map: S.map, x: p.x, y: p.y };
  }
};
