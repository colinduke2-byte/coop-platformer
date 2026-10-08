// Personal quests for the two companions. Told while they walk with you (Chat). Reward: a keepsake and a closer bond.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { QUESTS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { count, removeItem, addItem } from '../systems/inventory.js';
import { addRep } from './factions.js';
import { bus } from '../systems/bus.js';

QUESTS.pelldebt = {
  title: "Pell's Lucky Pebbles", giver: 'Pell Quickpick',
  desc: 'Pell lost his lucky pebbles in the first cave-in and has never been the same. Emberheart ore glows like they did. He swears four pieces will do.',
  short: () => `Bring Pell Emberheart Ore ${Math.min(count('ember_ore'), 4)}/4`,
  objectives: (q) => [{ t: `Find Emberheart Ore (${Math.min(count('ember_ore'), 4)}/4)`, done: count('ember_ore') >= 4 || q.status === 'done' }, { t: 'Give it to Pell (talk to him while he walks with you)', done: q.status === 'done' }],
};
QUESTS.ragnagrave = {
  title: "Ragna's Cairn", giver: 'Ragna',
  desc: 'Ragna wants a cairn raised for Hrolf and the Company, with proper iron. Three ingots, and a promise to say the names.',
  short: () => `Bring Ragna iron ingots ${Math.min(count('iron_ingot'), 3)}/3`,
  objectives: (q) => [{ t: `Gather iron ingots (${Math.min(count('iron_ingot'), 3)}/3)`, done: count('iron_ingot') >= 3 || q.status === 'done' }, { t: 'Give them to Ragna (talk to her while she walks with you)', done: q.status === 'done' }],
};

// Returns true when it handled the chat (so the normal idle line is skipped).
export async function companionStory(who) {
  if (who === 'Pell') {
    const q = S.quests.pelldebt;
    if (q.status === 'inactive') {
      await say(who, 'Can I tell you something? Not a joke. Mostly. I lost my lucky pebbles in the cave-in. I have been unlucky since. Statistically.');
      const c = await choose(['I will find you new ones.', 'Not now.']);
      if (c === 0) { startQuest('pelldebt'); await say(who, 'Emberheart ore! It glows like they did. Four pieces. I will make a charm. A good one.'); }
      return true;
    }
    if (q.status === 'active') {
      if (count('ember_ore') < 4) { await say(who, `Four pieces of Emberheart ore. You have ${count('ember_ore')}. I believe in you. From behind a barrel.`); return true; }
      removeItem('ember_ore', 4); addItem('pell_charm', 1, true); S.flags.pellBond = true; addRep('delvers', 10); finishQuest('pelldebt');
      await say(who, 'It glows! It is warm! I am lucky again. Here, I made you one too. Keep it close; it likes gold.');
      return true;
    }
  } else if (who === 'Ragna') {
    const q = S.quests.ragnagrave;
    if (S.quests.company.status !== 'done') return false;
    if (q.status === 'inactive') {
      await say(who, 'I keep thinking of the Company, lying where they fell. Wood rots. They deserve iron. Three ingots, and I will raise the cairn myself.');
      const c = await choose(['I will bring iron.', 'Not now.']);
      if (c === 0) { startQuest('ragnagrave'); await say(who, 'Thank you, Dreamer. Truly.'); }
      return true;
    }
    if (q.status === 'active') {
      if (count('iron_ingot') < 3) { await say(who, `Three iron ingots. You have ${count('iron_ingot')}. Bandits carry them.`); return true; }
      removeItem('iron_ingot', 3); addItem('company_bow', 1, true); S.flags.ragnaBond = true; finishQuest('ragnagrave');
      await say(who, "There. Forty names, in iron. Hrolf's bow was buried with him, but he would want it carried. Take this one; I made it from the Company's steel.");
      return true;
    }
  }
  return false;
}
