import { S } from '../systems/state.js';

export const QUESTS = {
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

export const quest = (id) => S.quests[id];
export const activeQuestIds = () => Object.keys(QUESTS).filter((id) => ['active', 'ready', 'relic'].includes(S.quests[id].status));
