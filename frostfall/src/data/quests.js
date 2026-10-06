import { S } from '../systems/state.js';
import { count } from '../systems/inventory.js';

import { heartsHeld, HEART_COUNT, HEART_ORDER, HEARTS, HEART_SITE } from './hearts.js';
import { getReach } from './maps.js';

export const QUESTS = {
  hearts: {
    title: 'The Four Hearts',
    giver: 'Elder Sigrid',
    desc: 'The Frostheart was only the first of five. The Hollow Kings bound the Long Winter with five Hearts and set a guardian over each. Whatever you chose for the first, the cold will not break until the rest are found. Four more lie in the Reach, and past them waits the Winter Throne.',
    short: () => {
      if (S.flags.finale) return 'The Winter has been decided';
      if (heartsHeld() >= 4) return 'Open the Winter Throne';
      const n = HEART_ORDER.find((k) => !S.hearts?.[k]);
      return `Hearts ${heartsHeld()}/${HEART_COUNT}  -  ${HEARTS[n].place}`;
    },
    objectives: () => [
      ...HEART_ORDER.map((k) => ({ t: `${HEARTS[k].name}: ${HEARTS[k].place}${S.hearts?.[k] ? '' : (k === 'rime' || S.hearts?.[HEART_ORDER[HEART_ORDER.indexOf(k) - 1]] || S.flags['seen_' + HEART_SITE[k].map]) ? '' : ' (not yet marked)'}`, done: !!S.hearts?.[k] })),
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
  king: {
    title: 'The Hollow King',
    giver: 'Elder Sigrid',
    desc: 'Something old has woken in the crypt beneath the pines, and the winter will not break. Sigrid believes the Draugr lord Valdrek holds the Frostheart, the crystal that feeds the cold.',
    short: (q) => (q.status === 'relic' ? 'Bring the Frostheart to Sigrid' : S.flags.crypt ? 'Defeat Jarl Valdrek' : 'Find the crypt in the forest'),
    objectives: (q) => [
      { t: 'Find the crypt gate in the Pine Forest', done: !!S.flags.crypt },
      { t: 'Defeat Jarl Valdrek and take the Frostheart', done: q.status === 'relic' || q.status === 'done' },
      { t: 'Decide the Frostheart\'s fate with Sigrid', done: q.status === 'done' },
    ],
  },
};

// Quest targets for the map markers / HUD arrow: { map, x, y } in tiles.
export const TARGETS = {
  hearts: () => {
    const reach = getReach();
    const ARENA = { maw: [18, 4], keep: [20, 4], chapel: [18, 4], rootvault: [20, 4], throne: [20, 6] };
    if (S.flags.finale) return { map: 'village', x: 19, y: 9 };
    // next site in story order that you do not hold yet (the throne once you have all four)
    const next = HEART_ORDER.find((k) => !S.hearts?.[k]);
    const site = next ? HEART_SITE[next] : { poi: 'throne0', map: 'throne' };
    if (S.flags['seen_' + site.map]) return { map: site.map, x: ARENA[site.map][0], y: ARENA[site.map][1] };
    const p = reach.pois.find((x) => x.id === site.poi);
    return p ? { map: 'forest', x: p.x, y: p.y - 1 } : { map: 'village', x: 19, y: 9 };
  },
  wolves: (q) => (q.status === 'ready' ? { map: 'village', x: 7, y: 11 } : { map: 'forest', x: 12, y: 10 }),
  king: (q) => (q.status === 'relic' ? { map: 'village', x: 19, y: 9 } : S.flags.crypt ? { map: 'crypt', x: 15, y: 4 } : { map: 'forest', x: 46, y: 3 }),
  herbs: (q) => (q.status === 'ready' ? { map: 'village', x: 32, y: 10 } : { map: 'forest', x: 20, y: 17 }),
  locket: (q) => (q.status === 'relic' ? { map: 'village', x: 24, y: 19 } : { map: 'forest', x: 50, y: 26 }),
  alpha: (q) => (q.status === 'ready' ? { map: 'village', x: 7, y: 11 } : { map: 'pass', x: 36, y: 8 }),
};

// Which quest the HUD arrow follows: the one you pinned, else the first active.
export function trackedId() {
  const act = activeQuestIds();
  if (S.tracked && act.includes(S.tracked)) return S.tracked;
  return act[0] || null;
}

export const quest = (id) => S.quests[id];
export const activeQuestIds = () => Object.keys(QUESTS).filter((id) => ['active', 'ready', 'relic'].includes(S.quests[id]?.status));
