import { S } from '../systems/state.js';
import { count } from '../systems/inventory.js';

import { heartsHeld, HEART_COUNT, HEART_ORDER, HEARTS, HEART_SITE } from './hearts.js';
import { getReach } from './maps.js';
import { routePos } from '../world/roamers.js';
import { fromOn, nearestOf } from '../world/questmarks.js';

// The Heart to go for next: of those you do not hold, the one whose site lies in the easiest land of this world
// (lowest danger tier), so the marker never sends you into tier-3 country while a gentler Heart is waiting.
// Ties keep the story order.
export function nextHeart() {
  if (!S.hearts?.rime) return 'rime';                     // the story starts at the Maw (Sigrid sends you there first)
  const left = HEART_ORDER.filter((k) => !S.hearts?.[k]);
  if (left.length < 2) return left[0];
  const pois = getReach()?.pois || [];
  const tier = (k) => pois.find((p) => p.id === HEART_SITE[k].poi)?.tier ?? 9;
  return left.reduce((best, k) => (tier(k) < tier(best) ? k : best));
}

export const QUESTS = {
  tornmap: {
    title: 'Half a Map', giver: 'A torn map',
    desc: 'A half-burnt map with a ruin circled in charcoal. Whatever the owner hid there, they never came back for it.',
    short: () => 'Find the ruin the map shows',
    objectives: (q) => [{ t: 'Find the ruin the map circles (it is marked on your map)', done: q.status === 'done' }],
  },
  letter: {
    title: 'An Undelivered Letter', giver: 'A sealed letter',
    desc: 'A pilgrim carried this to a hamlet and never arrived. The seal is unbroken. Somebody there is still waiting.',
    short: () => 'Carry the letter to its hamlet',
    objectives: (q) => [{ t: 'Reach the hamlet the letter is addressed to (it is marked)', done: q.status === 'done' }],
  },
  journal: {
    title: "The Hunter's Last Page", giver: "A hunter's journal",
    desc: 'The last page sketches the lair of whatever killed the writer. The sketch is very good. The hunter was not lucky, but was careful.',
    short: () => 'Find the lair the journal sketches',
    objectives: (q) => [{ t: 'Find the beast lair the journal sketches (it is marked)', done: q.status === 'done' }],
  },
  smugglers: {
    title: 'The Smuggler\'s Note', giver: 'A note taken off a bandit chief',
    desc: 'A scrawled page from a bandit chief\'s belt names a cache hidden in the wild: someone\'s savings, left under a rock. Whoever wrote it did not come back for it.',
    short: () => 'Find the hidden cache the note names',
    objectives: (q) => [{ t: 'Find the cache the note names (it is marked on your map)', done: q.status === 'done' }],
  },
  hearts: {
    title: 'The Four Hearts',
    giver: 'Elder Sigrid',
    desc: 'The Frostheart was only the first of five. The Hollow Kings bound the Long Winter with five Hearts and set a guardian over each. Whatever you chose for the first, the cold will not break until the rest are found. Four more lie in the Reach, and past them waits the Winter Throne.',
    short: () => {
      if (S.flags.finale) return 'The Winter has been decided';
      if (heartsHeld() >= 4) return 'Open the Winter Throne';
      const n = nextHeart();
      return `Hearts ${heartsHeld()}/${HEART_COUNT}  -  ${HEARTS[n].place}`;
    },
    objectives: () => [
      ...HEART_ORDER.map((k) => ({ t: `${HEARTS[k].name}: ${HEARTS[k].place}${S.hearts?.[k] ? '' : (k === 'rime' || k === nextHeart() || S.hearts?.[HEART_ORDER[HEART_ORDER.indexOf(k) - 1]] || S.flags['seen_' + HEART_SITE[k].map]) ? '' : ' (not yet marked)'}`, done: !!S.hearts?.[k] })),
      { t: 'Break into the Winter Throne and face the Long Winter', done: !!S.flags.winterDead },
      { t: 'Decide what becomes of the Winter', done: !!S.flags.finale },
    ],
  },
  herbs: {
    title: "Mirra's Remedy",
    giver: 'Mirra the Alchemist',
    desc: 'Mirra is out of snowberries and frost lilies, and the village is out of medicine. Gather herbs in the Pine Forest and she will teach you to brew.',
    short: (q) => (q.status === 'ready' ? 'Bring herbs to Mirra' : `Herbs ${Math.min(count('snowberry'), 5)}/5 ${Math.min(count('frost_lily'), 3)}/3`),
    objectives: (q) => [
      { t: `Gather snowberries (${Math.min(count('snowberry'), 5)}/5)`, done: count('snowberry') >= 5 || q.status === 'done' },
      { t: `Gather frost lilies (${Math.min(count('frost_lily'), 3)}/3)`, done: count('frost_lily') >= 3 || q.status === 'done' },
      { t: 'Bring them to Mirra', done: q.status === 'done' },
    ],
  },
  locket: {
    title: "Asta's Locket",
    giver: 'Asta the child',
    desc: 'Bandits took a silver locket from Asta\'s mother. Find it in the bandit camp. What you do with it is up to you.',
    short: (q) => (q.status === 'relic' ? 'Decide the locket\'s fate' : 'Find the locket in the camp'),
    objectives: (q) => [
      { t: 'Find the locket in the bandit camp', done: q.status === 'relic' || q.status === 'done' },
      { t: 'Return it to Asta... or not', done: q.status === 'done' },
    ],
  },
  alpha: {
    title: 'The Pale Alpha',
    giver: 'Bjorn the Hunter',
    desc: 'A great grey wolf called Grimfang leads the pack from Frostwind Pass. Bjorn wants the threat ended. You may find the choice harder than he expects.',
    short: (q) => (q.status === 'ready' ? 'Tell Bjorn' : 'Find Grimfang in the Pass'),
    objectives: (q) => [
      { t: 'Reach Frostwind Pass (north of the forest)', done: !!S.flags.pass },
      { t: 'Face Grimfang, the Pale Alpha', done: q.status === 'ready' || q.status === 'done' },
      { t: 'Report to Bjorn', done: q.status === 'done' },
    ],
  },
  wolves: {
    title: 'Wolves at the Gate',
    giver: 'Bjorn the Hunter',
    desc: 'A starving pack stalks the Pine Forest and the village flocks are dwindling. Bjorn wants three wolves put down.',
    short: (q) => (q.status === 'ready' ? 'Return to Bjorn' : `Slay wolves ${Math.min(q.kills, 3)}/3`),
    objectives: (q) => [
      { t: `Slay wolves in the Pine Forest (${Math.min(q.kills, 3)}/3)`, done: q.kills >= 3 },
      { t: 'Return to Bjorn the Hunter', done: q.status === 'done' },
    ],
  },
  company: {
    title: "Ragna's Company",
    giver: 'Ragna the Archer',
    desc: 'Ragna rode with the Ironwatch Company until the Keep fell. She wants its warlord, Hrolf Ironmarch, put to rest, and her old banner back.',
    short: (q) => (q.status === 'ready' ? 'Ragna wants a word' : 'Defeat the Warlord of Ironwatch Keep'),
    objectives: (q) => [
      { t: 'Travel with Ragna to Ironwatch Keep', done: !!S.flags.seen_keep || q.status === 'done' },
      { t: 'Defeat Hrolf Ironmarch', done: !!S.flags.warlordDead || q.status === 'done' },
      { t: 'Let Ragna lay her company to rest', done: q.status === 'done' },
    ],
  },
  trail: {
    title: "The Hunter's Trail",
    giver: 'Bjorn the Hunter',
    desc: 'Giant tracks cross the Reach on a long loop between the camps. Bjorn thinks they belong to Frostbrow, a winter elk older than the village. Find the tracks. Follow them.',
    short: (q) => (q.status === 'ready' ? 'Bring word to Bjorn' : 'Find and fell Frostbrow, the Winter Elk'),
    objectives: (q) => [
      { t: 'Find the huge hoofprints in the snow', done: !!S.flags.sawTracks || q.status === 'done' },
      { t: 'Fell Frostbrow, the Winter Elk', done: !!S.flags.rb_elk || q.status === 'done' },
      { t: 'Tell Bjorn what you did', done: q.status === 'done' },
    ],
  },
  toll: {
    title: "The Bridge Troll's Toll",
    giver: 'Hilda the Smith',
    desc: 'Hilda swears there is a metal in troll bone that no forge in the north can make. She will trade a weapon for the beast that walks the old roads.',
    short: (q) => (q.status === 'ready' ? 'Show Hilda the troll bone' : 'Fell Grungnir, the Bridge Troll'),
    objectives: (q) => [
      { t: 'Follow the troll tracks', done: !!S.flags.sawTracks || q.status === 'done' },
      { t: 'Fell Grungnir, the Bridge Troll', done: !!S.flags.rb_troll || q.status === 'done' },
      { t: 'Bring the bone to Hilda', done: q.status === 'done' },
    ],
  },
  king: {
    title: 'The Frostsworn Jarl',
    giver: 'Elder Sigrid',
    desc: 'Something old has woken in the crypt beneath the pines, and the winter will not break. Sigrid believes Jarl Valdrek, who swore himself to the cold, holds the Frostheart, the crystal that feeds the cold.',
    short: (q) => (q.status === 'relic' ? 'Bring the Frostheart to Sigrid' : S.flags.crypt ? 'Defeat Jarl Valdrek' : 'Find the crypt in the forest'),
    objectives: (q) => [
      { t: 'Find the crypt gate in the Pine Forest', done: !!S.flags.crypt },
      { t: 'Defeat Jarl Valdrek and take the Frostheart', done: q.status === 'relic' || q.status === 'done' },
      { t: 'Decide the Frostheart\'s fate with Sigrid', done: q.status === 'done' },
    ],
  },
};

// WQ2: a hunt points at the beast's own footprints: the nearest of its tracks until you have seen them, then at the beast
// itself (where its loop puts it right now, the same clock the world uses).
export function roamTarget(who) {
  const r = getReach(), boss = r.entities.find((e) => e.t === 'roamboss' && e.id === who);
  if (!boss) return null;
  if (S.flags.sawTracks) { const p = routePos(boss.route, S.playtime || 0, boss.phase); return { map: 'forest', x: Math.floor(p.x / 16), y: Math.floor(p.y / 16) }; }
  const t = nearestOf(r.entities.filter((e) => e.t === 'track' && e.who === who), fromOn('forest'));
  return t ? { map: 'forest', x: t.x, y: t.y } : null;
}

// Quest targets for the map markers / HUD arrow: { map, x, y } in tiles.
export const TARGETS = {
  tornmap: () => S.flags.noteTargets?.tornmap || null,
  letter: () => S.flags.noteTargets?.letter || null,
  journal: () => S.flags.noteTargets?.journal || null,
  smugglers: () => (S.flags.noteCache ? { map: S.flags.noteCache.map, x: S.flags.noteCache.x, y: S.flags.noteCache.y } : null),
  hearts: () => {
    const reach = getReach();
    const ARENA = { maw: [18, 4], keep: [20, 4], chapel: [18, 4], rootvault: [20, 4], throne: [20, 6] };
    if (S.flags.finale) return { map: 'village', x: 19, y: 9 };
    // the easiest remaining Heart's site (the throne once you have all four)
    const next = nextHeart();
    const site = next ? HEART_SITE[next] : { poi: 'throne0', map: 'throne' };
    if (S.flags['seen_' + site.map]) return { map: site.map, x: ARENA[site.map][0], y: ARENA[site.map][1] };
    const p = reach.pois.find((x) => x.id === site.poi);
    return p ? { map: 'forest', x: p.x, y: p.y - 1 } : { map: 'village', x: 19, y: 9 };
  },
  wolves: (q) => (q.status === 'ready' ? { map: 'village', x: 7, y: 11 } : { map: 'forest', x: 12, y: 10 }),
  king: (q) => (q.status === 'relic' ? { map: 'village', x: 19, y: 9 } : S.flags.crypt ? { map: 'crypt', x: 15, y: 4 } : { map: 'forest', x: 46, y: 3 }),
  herbs: (q) => (q.status === 'ready' ? { map: 'village', x: 32, y: 10 } : { map: 'forest', x: 20, y: 17 }),
  locket: (q) => (q.status === 'relic' ? { map: 'village', x: 24, y: 19 } : { map: 'forest', x: 50, y: 26 }),
  company: (q) => (q.status === 'ready' ? { map: 'village', x: 10, y: 12 } : { map: 'keep', x: 20, y: 4 }),
  trail: (q) => (q.status === 'ready' ? { map: 'village', x: 7, y: 11 } : roamTarget('elk')),
  toll: (q) => (q.status === 'ready' ? { map: 'village', x: 10, y: 16 } : roamTarget('troll')),
  alpha: (q) => (q.status === 'ready' ? { map: 'village', x: 7, y: 11 } : { map: 'pass', x: 24, y: 6 }),     // Grimfang's den at the top of the pass (was 36, 8: the east side corridor)
};

// Which quest the HUD arrow follows: the one you pinned, else the first active.
export function trackedId() {
  const act = activeQuestIds();
  if (S.tracked && act.includes(S.tracked)) return S.tracked;
  return act[0] || null;
}

export const quest = (id) => S.quests[id];
export const activeQuestIds = () => Object.keys(QUESTS).filter((id) => ['active', 'ready', 'relic'].includes(S.quests[id]?.status));
