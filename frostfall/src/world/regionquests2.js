// WQ21 (second half): a quest of a new shape for the regions that had none: a timed beacon relay on the Ashen Peaks, a riddle
// in the Old Kingdom, a rescue in the Underdeep, a trade chain in the Embergreen Vale and a stealth theft in the Sunscorch.
// Quest data, givers and markers here; what happens in the world is in features/world_quests2.js. Same machinery as
// world/regionquests.js: state in S.quests[id], registered with EXTRA_QUEST_IDS, paid TUNE.world.rquest.
import { S, EXTRA_QUEST_IDS } from '../systems/state.js';
import { QUESTS, TARGETS } from '../data/quests.js';
import { getRegion } from '../data/maps.js';
import { SOLID_TILES } from '../config.js';
import { TUNE } from '../data/tuning.js';

const reg = (id) => { if (!EXTRA_QUEST_IDS.includes(id)) EXTRA_QUEST_IDS.push(id); S.quests[id] ||= { status: 'inactive' }; };
export const RQ2 = ['wallfires', 'unfinishedverse', 'lampsdeep', 'goodturn', 'quietledger'];
RQ2.forEach(reg);

const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const poi = (rid, kind) => getRegion(rid).pois.find((p) => p.kind === kind);
// the nearest places of these kinds to `from`, at least `min` tiles away, in order of distance
const nearest = (rid, kinds, from, min, n) => getRegion(rid).pois.filter((p) => kinds.includes(p.kind) && d2(p, from) >= min).sort((a, b) => d2(a, from) - d2(b, from)).slice(0, n);
// a walkable tile next to a place (its centre is often a pillar, a hut or a fire), with open ground round it
export function openNear(rid, x, y, from = 2) {
  const r = getRegion(rid), ok = (cx, cy) => { for (let yy = cy - 1; yy <= cy + 1; yy++) for (let xx = cx - 1; xx <= cx + 1; xx++) { const t = r.grid[yy]?.[xx]; if (t === undefined || SOLID_TILES.includes(t)) return false; } return true; };
  for (let rad = from; rad < 10; rad++) for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const cx = x + dx * rad, cy = y + dy * rad; if (ok(cx, cy)) return { x: cx, y: cy }; }
  return { x, y: y + 3 };
}
const tile = (map, p) => (p ? { map, x: p.x, y: p.y } : null);

// ---- the Ashen Peaks: light the Wardens' old beacon line, each fire before the last one burns down
const memo = {};
const cached = (key, fn) => { const k = key + ':' + (S.seed || 1); return (memo[k] ||= fn()); };
export function beacons() {
  return cached('beacons', () => {
    let at = poi('ashen', 'city') || { x: 12, y: 64 };
    const out = [], used = new Set();
    for (let i = 0; i < 4; i++) {
      const next = getRegion('ashen').pois.filter((p) => ['tower', 'ruin', 'standing', 'rest'].includes(p.kind) && !used.has(p.id) && d2(p, at) >= 18).sort((a, b) => d2(a, at) - d2(b, at))[0];
      if (!next) break;
      used.add(next.id); out.push(openNear('ashen', next.x, next.y, 3)); at = next;
    }
    return out;
  });
}
// seconds to reach beacon i (1..3) from beacon i-1
export const legSecs = (i) => { const b = beacons(), R = TUNE.world.rquest.relay; return Math.round(R.base + R.perTile * d2(b[i - 1], b[i])); };
QUESTS.wallfires = {
  title: 'The Wall Fires', giver: 'Warden Corvin',
  desc: 'Before the cold came, the Wardens kept a line of beacons across the Ashen Peaks: when one burned, the next was lit. Corvin wants the line lit once more, for the fifty-one who did not walk home. Light the first beacon, then each of the others before the last one burns down.',
  short: (q) => (q.status === 'ready' ? 'Tell Corvin' : `Light the beacons in turn (${Math.min(4, q.lit || 0)}/4)`),
  objectives: (q) => [{ t: `Light the four beacons, each before the last burns down (${Math.min(4, q.lit || 0)}/4)`, done: q.status !== 'active' }, { t: 'Tell Corvin', done: q.status === 'done' }],
};
TARGETS.wallfires = (q) => (q?.status === 'ready' ? { map: 'emberhold', x: 11, y: 27 } : tile('ashen', beacons()[Math.min(3, q?.lit || 0)]));

// ---- the Old Kingdom: three verse-stones hold the lines of a riddle the Scribe never finished
export const verseStones = () => cached('verses', () => { const h = poi('kingdom', 'hamlet') || { x: 12, y: 64 }; return nearest('kingdom', ['courtyard', 'ruin'], h, 16, 3).map((p) => openNear('kingdom', p.x, p.y, 3)); });
export const scribeAt = () => { const h = poi('kingdom', 'hamlet'); return h ? { x: h.x - 4, y: h.y + 4 } : null; };
export const VERSES = [
  ['A STONE WITH A LINE OF VERSE, THE LETTERS STILL SHARP:', '"THE KINGS GAVE ME TO EVERY CHILD, AND KEPT ME ALL THE SAME."'],
  ['THE SECOND STONE. SOMEONE HAS SCRUBBED THE MOSS OFF IT:', '"I AM CUT ON EVERY TOMB HERE, AND NO ONE READS ME NOW."'],
  ['THE LAST STONE, HALF SUNK IN THE MARBLE:', '"SAY ME ALOUD AND THE DEAD WILL TURN THEIR HEADS. WHAT AM I?"'],
];
export const RIDDLE = { choices: ['A crown.', 'A name.', 'The Winter.', 'A promise.'], answer: 1 };
QUESTS.unfinishedverse = {
  title: 'The Unfinished Verse', giver: 'The Scribe',
  desc: 'The Scribe once set a riddle in three stones round the Old Kingdom, and then forgot the answer. Read the three verse-stones, then bring the Scribe the answer.',
  short: (q) => (q.status === 'ready' ? 'Answer the Scribe\'s riddle' : `Verse-stones read ${Math.min(3, q.verses || 0)}/3`),
  objectives: (q) => [{ t: `Read the verse-stones (${Math.min(3, q.verses || 0)}/3)`, done: (q.verses || 0) >= 3 || q.status !== 'active' }, { t: 'Answer the riddle', done: q.status === 'done' }],
};
TARGETS.unfinishedverse = (q) => (q?.status === 'ready' ? tile('kingdom', scribeAt()) : tile('kingdom', verseStones()[Math.min(2, q?.verses || 0)]));

// ---- the Underdeep: three lamp-carriers lost in the dark, each with something waiting round them
export const lostLamps = () => cached('lamps', () => { const f = poi('underdeep', 'lanternfall') || { x: 39, y: 67 }; return nearest('underdeep', ['ruin', 'glowcapgrove', 'lodevein'], f, 20, 3).map((p) => openNear('underdeep', p.x, p.y, 3)); });
QUESTS.lampsdeep = {
  title: 'Lamps in the Deep', giver: 'The Lantern Guard',
  desc: 'Three lamp-carriers went out to trim the far lamps and have not come back. Their lamps are out; something is keeping them company in the dark. Find each one, drive off what waits round them, and relight their lamp so they can walk home.',
  short: (q) => (q.status === 'ready' ? 'Tell the Lantern Guard' : `Lamp-carriers found ${Math.min(3, q.saved || 0)}/3`),
  objectives: (q) => [{ t: `Find and free the lost lamp-carriers (${Math.min(3, q.saved || 0)}/3)`, done: q.status !== 'active' }, { t: 'Tell the Lantern Guard', done: q.status === 'done' }],
};
TARGETS.lampsdeep = (q) => {
  if (q?.status === 'ready') return { map: 'lanternfall', x: 12, y: 26 };
  const saved = q?.lost || [], i = lostLamps().findIndex((_, k) => !saved.includes(k));
  return tile('underdeep', lostLamps()[i < 0 ? 0 : i]);
};

// ---- the Embergreen Vale: a horn for the watch, by way of a gardener, a beekeeper and a sprig from a far meadow
export const sprigAt = () => cached('sprig', () => { const g = poi('vale', 'greenhollow') || { x: 32, y: 87 }; const f = nearest('vale', ['flowerfield'], g, 24, 1)[0] || nearest('vale', ['flowerfield'], g, 0, 1)[0]; return f ? openNear('vale', f.x, f.y, 2) : null; });
// step: 1 ask Ash, 2 ask Orla, 3 pick the sprig, 4 back to Orla, 5 back to Ash (then ready: the watch)
const STEP_AT = { 1: { map: 'greenhollow', x: 50, y: 28 }, 2: { map: 'greenhollow', x: 26, y: 26 }, 4: { map: 'greenhollow', x: 26, y: 26 }, 5: { map: 'greenhollow', x: 50, y: 28 } };
const STEP_T = { 1: 'Ask Gardener Ash for a horn', 2: 'Ask Beekeeper Orla for wax', 3: 'Pick a meadowsweet sprig in the far meadow', 4: 'Lay the sprig on Orla\'s hive', 5: 'Bring the wax to Gardener Ash' };
QUESTS.goodturn = {
  title: 'One Good Turn', giver: 'The Greenhollow Watch',
  desc: 'The watch\'s horn split in the night frost, and a watch without a horn is two people standing in a field. Gardener Ash carves horns, but nothing in Greenhollow is ever done for nothing. Follow the favours round the village.',
  short: (q) => (q.status === 'ready' ? 'Bring the horn to the watch' : STEP_T[q.step || 1]),
  objectives: (q) => [1, 2, 3, 4, 5].map((s) => ({ t: STEP_T[s], done: (q.step || 1) > s || q.status !== 'active' })).concat([{ t: 'Bring the horn to the watch', done: q.status === 'done' }]),
};
TARGETS.goodturn = (q) => (q?.status === 'ready' ? { map: 'greenhollow', x: 12, y: 26 } : (q?.step || 1) === 3 ? tile('vale', sprigAt()) : STEP_AT[q?.step || 1]);

// ---- the Sunscorch: lift the raiders' ledger from under their noses; if a sentry sees you, the box is barred
export const ledgerAt = () => cached('ledger', () => { const a = poi('sunscorch', 'amberwell') || { x: 65, y: 75 }; const p = nearest('sunscorch', ['ruin', 'courtyard'], a, 25, 1)[0]; return p ? openNear('sunscorch', p.x, p.y, 2) : null; });
QUESTS.quietledger = {
  title: 'The Quiet Ledger', giver: 'Captain Nadir',
  desc: 'Someone in Amberwell is selling caravan routes to the raiders, and the raiders write everything down. Nadir wants their ledger. Take it from the strongbox at their ruin without one sentry seeing you. If they spot you, they bar the box: leave, and try again another time. The dark helps; so does crouching.',
  short: (q) => (q.status === 'ready' ? 'Bring the ledger to Nadir' : 'Steal the ledger unseen'),
  objectives: (q) => [{ t: 'Take the ledger from the strongbox unseen', done: q.status !== 'active' }, { t: 'Bring it to Nadir', done: q.status === 'done' }],
};
TARGETS.quietledger = (q) => (q?.status === 'ready' ? { map: 'amberwell', x: 12, y: 26 } : tile('sunscorch', ledgerAt()));

// who gives what. when: only offer then (the Scribe's own quest comes first). Their own talk stays after the quest line.
export const RQ2_GIVER = {
  corvin: { id: 'wallfires', who: 'Corvin', offer: ['There was a line of beacons across the Peaks. When one burned, the next was lit, and the wall knew trouble was coming before it came.', 'Nobody has lit them since we were sixty. Light them for me. All four, each before the last one dies. They will see it from the wall.'], yes: 'I will light the line.', thanks: 'I saw them from the wall. Four fires, one after another, like the old days. Fifty-one men would have liked that. Take this. I have no one else to give it to.' },
  scribe: { id: 'unfinishedverse', who: 'The Scribe', when: () => S.quests.hollowking?.status !== 'inactive' && !(S.quests.hollowking?.status === 'active' && S.flags.hollowKingDead), offer: ['Before I forgot nearly everything, I set a riddle in three stones round the Kingdom, for the children of the court.', 'I remember the riddle. I do not remember the answer. That is a kind of torment only a scribe can know. Read the stones, and tell me.'], yes: 'I will read the stones.', thanks: 'A name. Of course. The thing they gave to every child, and kept, and cut on every tomb. The thing you do not have, Dreamer. Here. For the answer, and for the irony.' },
  fall_watch: { id: 'lampsdeep', who: 'Lantern Guard', offer: ['Three of our lamp-carriers went out to trim the far lamps. Their lamps went dark one after another. They have not come back.', 'Something is sitting with them in the dark. Find them, clear it off, relight their lamps. They know the way home by the light.'], yes: 'I will bring the light to them.', thanks: 'All three walked in on their own feet. Grit counted them twice. Take this, and a seat at the Long Bench for as long as you want it.' },
  vale_watch: { id: 'goodturn', who: 'Greenhollow Watch', offer: ['My horn split in the frost last night. Split right down the bell. A watch without a horn is two people standing in a field.', 'Gardener Ash carves them from heartwood. She will not do it for nothing; nobody here does anything for nothing. Ask her for me?'], yes: 'I will see what Ash wants.', thanks: 'Listen to that. You could wake the whole Vale with it. I may, just to try. Here, from the watch, with thanks.' },
  dune_guard: { id: 'quietledger', who: 'Nadir', offer: ['Someone in Amberwell sells our caravan routes to the raiders. The raiders keep a ledger of every coin they pay. I want it.', 'It is in a strongbox at their ruin out on the sand. Take it without being seen, or they will bar the box and burn the pages. Go at night. Keep low.'], yes: 'I will lift the ledger.', thanks: 'Three names. One of them pours my tea. Well. He will be pouring it somewhere colder soon. Take your pay; you earned it quietly.' },
};
// the middle of the Vale trade chain, by step
export const GOODTURN_STEPS = {
  vale_gardener: {
    1: ['Ash', ['A horn? I have heartwood seasoned three winters. I have no wax to seal it, and an unsealed horn plays like a wet sock.', 'Orla\'s wax is the only kind that holds in the rain. Bring me a cake of it and I will carve tonight.'], 2],
    5: ['Ash', ['That is Orla\'s wax, I can smell the clover. Give me an hour.', 'There. Carved, sealed, and tuned to a note the hedges will not like. Take it to the watch.'], 'ready'],
  },
  vale_beekeeper: {
    2: ['Orla', ['Wax for Ash? Gladly, if you do me a turn. My queen will not settle since the frost. She wants meadowsweet.', 'Not the garden kind. The wild kind, from the far meadow. A single sprig laid on the hive and she will forgive us all.'], 3],
    4: ['Orla', ['Meadowsweet! Wild, too. Listen: the hum is changing already.', 'Here is your wax, a whole cake. Tell Ash it is from the good comb.'], 5],
  },
};
