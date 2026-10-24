// WQ21: one quest of a new shape per region (not kill N, bring N, or a boss): an investigation in the Fens, a night defence of
// Skarn Hold, an escort across the Frozen Coast, and tracking prints through the Glasswood. Quest data, givers and markers
// here; what happens in the world is in features/world_quests.js. State lives in S.quests[id] (registered like the region
// chains, with EXTRA_QUEST_IDS).
import { S, EXTRA_QUEST_IDS } from '../systems/state.js';
import { QUESTS, TARGETS } from '../data/quests.js';
import { getRegion } from '../data/maps.js';

const reg = (id) => { if (!EXTRA_QUEST_IDS.includes(id)) EXTRA_QUEST_IDS.push(id); S.quests[id] ||= { status: 'inactive' }; };
export const RQ = ['lanternthief', 'holdhearth', 'pilgrimlight', 'glassprints'];
RQ.forEach(reg);

const poi = (rid, kind, from) => { const ps = getRegion(rid).pois.filter((p) => p.kind === kind); if (!from) return ps[0]; return ps.sort((a, b) => Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y))[0]; };
const at = (map, p, dy = 3) => (p ? { map, x: p.x, y: p.y + dy } : null);

// ---- the Fens: three clues, then the thief's hideout (a hidden cache)
export function thiefClues() {
  const wick = poi('fens', 'reedwick');
  return ['peatfire', 'drownedshrine', 'ruin'].map((k) => poi('fens', k, wick)).filter(Boolean);
}
export const thiefLair = () => poi('fens', 'cache', poi('fens', 'reedwick')) || poi('fens', 'camp');
QUESTS.lanternthief = {
  title: 'The Lantern Thief', giver: 'The Lantern-Warden',
  desc: 'Someone is draining the oil from Reedwick\'s lanterns, and in the Fens a dark lantern pole is an invitation. The Lantern-Warden has found three places the thief stopped. Read what was left there, and find where the thief hides.',
  short: (q) => (q.status === 'ready' ? 'Tell the Lantern-Warden' : (q.clues || 0) < 3 ? `Clues ${q.clues || 0}/3` : 'Find the thief\'s hideout'),
  objectives: (q) => [{ t: `Read the thief's traces (${Math.min(3, q.clues || 0)}/3)`, done: (q.clues || 0) >= 3 || q.status !== 'active' }, { t: 'Find and stop the thief', done: q.status === 'ready' || q.status === 'done' }, { t: 'Tell the Lantern-Warden', done: q.status === 'done' }],
};
TARGETS.lanternthief = (q) => {
  if (q?.status === 'ready') return at('fens', poi('fens', 'reedwick'));
  const c = thiefClues(), n = q?.clues || 0;
  return n < c.length ? at('fens', c[n], 4) : at('fens', thiefLair(), 0);
};

// ---- the Stormcrown: hold Skarn Hold through a night of raids (three waves)
QUESTS.holdhearth = {
  title: 'Hold the Hearth', giver: 'Asger the Scout',
  desc: 'Asger has seen raiders gathering on the heath. They will come to Skarn Hold after dark. Be at the Hold at night and hold the ring of fires through three waves.',
  short: (q) => (q.status === 'ready' ? 'Tell Asger' : `Hold Skarn Hold at night (wave ${Math.min(3, q.waves || 0)}/3)`),
  objectives: (q) => [{ t: `Hold Skarn Hold after dark (${Math.min(3, q.waves || 0)}/3 waves)`, done: (q.waves || 0) >= 3 || q.status === 'done' }, { t: 'Tell Asger', done: q.status === 'done' }],
};
TARGETS.holdhearth = () => ({ map: 'skarnhold', x: 36, y: 28 });

// ---- the Frozen Coast: walk a pilgrim from the Saltmarket gate to the lighthouse
QUESTS.pilgrimlight = {
  title: 'The Pilgrim\'s Light', giver: 'The Harbour Watch',
  desc: 'Sister Maren has walked from the far south to see the Last Light. The Harbour Watch will not let her cross the ice alone. Take her from the Saltmarket gate to the lighthouse, and keep her close.',
  short: (q) => (q.status === 'ready' ? 'Tell the Harbour Watch' : 'Walk Sister Maren to the lighthouse'),
  objectives: (q) => [{ t: 'Walk Sister Maren to the lighthouse (stay close)', done: q.status === 'ready' || q.status === 'done' }, { t: 'Tell the Harbour Watch', done: q.status === 'done' }],
};
export const lighthouse = () => poi('coast', 'lighthouse', poi('coast', 'saltgate'));
TARGETS.pilgrimlight = (q) => (q?.status === 'ready' ? at('coast', poi('coast', 'saltgate')) : at('coast', lighthouse(), 2));

// ---- the Glasswood: follow a great glass-stag's prints to where it beds down
export function glassTrail() {
  const glade = poi('glasswood', 'lanternglade'), end = getRegion('glasswood').pois.filter((p) => ['champion', 'cave', 'ruin', 'den'].includes(p.kind)).sort((a, b) => Math.hypot(b.x - glade.x, b.y - glade.y) - Math.hypot(a.x - glade.x, a.y - glade.y))[1] || glade;
  const pts = [];
  for (let i = 1; i <= 6; i++) pts.push({ x: Math.round(glade.x + (end.x - glade.x) * i / 7 + Math.sin(i * 1.7) * 6), y: Math.round(glade.y + (end.y - glade.y) * i / 7 + Math.cos(i * 1.3) * 5) });
  return { pts, end };
}
QUESTS.glassprints = {
  title: 'Prints in the Glass', giver: 'The Glade Watch',
  desc: 'Something with hooves of glass walks round the glade at night and leaves prints that ring when you step in them. The Glade Watch wants to know where it beds down. Follow the prints.',
  short: (q) => (q.status === 'ready' ? 'Tell the Glade Watch' : `Prints followed ${Math.min(6, q.prints || 0)}/6`),
  objectives: (q) => [{ t: `Follow the ringing prints (${Math.min(6, q.prints || 0)}/6)`, done: (q.prints || 0) >= 6 || q.status !== 'active' }, { t: 'Face what made them', done: q.status === 'ready' || q.status === 'done' }, { t: 'Tell the Glade Watch', done: q.status === 'done' }],
};
TARGETS.glassprints = (q) => {
  if (q?.status === 'ready') return at('glasswood', poi('glasswood', 'lanternglade'));
  const t = glassTrail(), n = q?.prints || 0;
  return n < t.pts.length ? { map: 'glasswood', x: t.pts[n].x, y: t.pts[n].y } : at('glasswood', t.end, 2);
};

// who gives what (their own talk stays after the quest line)
export const RQ_GIVER = {
  wick_watch: { id: 'lanternthief', who: 'Lantern-Warden', offer: ['Somebody is stealing our lantern oil. Three poles went dark this week. In the Fens, that is how people drown.', 'I found traces in three places. A peat fire, the drowned shrine, an old ruin. Read them for me. Find the thief.'], yes: 'I will find your thief.', thanks: 'Oil-Thief Oswin. I knew the name, I never knew the face. The poles are lit tonight because of you.' },
  skarn_scout: { id: 'holdhearth', who: 'Asger', offer: ['Raiders on the heath, thirty at least. They will come for the Hold after dark, when the wind covers their feet.', 'Be here at night. Hold the ring of fires with us through three waves, and the clans will remember it.'], yes: 'I will hold the hearth.', thanks: 'Three waves, and the fires still burn. The elders will sing about tonight. Badly, but they will.' },
  salt_watch: { id: 'pilgrimlight', who: 'Harbour Watch', offer: ['There is a pilgrim at the gate, Sister Maren. She wants to see the lighthouse before she dies, and the ice wants her to see it sooner.', 'Walk her there. Keep her close: she stops to pray at every crack in the ice.'], yes: 'I will walk her there.', thanks: 'She sent word: she saw the Light, and it saw her. Whatever that means, she sounded happy.' },
  glade_watch: { id: 'glassprints', who: 'Glade Watch', offer: ['Prints round the glade every night. Hooves, but glass. They ring when you step in them.', 'Follow them for me. I want to know where it sleeps, and whether it is going to stop.'], yes: 'I will follow the prints.', thanks: 'A stag of glass, as tall as a hut, and you put it down. The prints will stop ringing now. I will almost miss them.' },
};
