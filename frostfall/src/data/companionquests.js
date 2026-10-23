// Personal quests for the two companions. Told while they walk with you (Chat). Reward: a keepsake and a closer bond.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { QUESTS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { count, removeItem, addItem } from '../systems/inventory.js';
import { addRep } from './factions.js';
import { bus } from '../systems/bus.js';
import { TUNE } from './tuning.js';

QUESTS.pelldebt = {
  title: "Pell's Lucky Pebbles", giver: 'Pell Quickpick',
  desc: 'Pell lost his lucky pebbles in the first cave-in and has never been the same. Emberheart ore glows like they did. He swears four pieces will do.',
  short: () => `Bring Pell Emberheart Ore ${Math.min(count('ember_ore'), 4)}/4`,
  objectives: (q) => [{ t: `Find Emberheart Ore (${Math.min(count('ember_ore'), 4)}/4)`, done: count('ember_ore') >= 4 || q.status === 'done' }, { t: 'Give it to Pell (talk to him while he walks with you)', done: q.status === 'done' }],
};
QUESTS.ragnagrave = {
  title: "Ragna's Cairn", giver: 'Ragna the archer',
  desc: 'Ragna wants a cairn raised for Hrolf and the Company, with proper iron. Three ingots, and a promise to say the names.',
  short: () => `Bring Ragna iron ingots ${Math.min(count('iron_ingot'), 3)}/3`,
  objectives: (q) => [{ t: `Gather iron ingots (${Math.min(count('iron_ingot'), 3)}/3)`, done: count('iron_ingot') >= 3 || q.status === 'done' }, { t: 'Give them to Ragna (talk to her while she walks with you)', done: q.status === 'done' }],
};

// A companion walking with you speaks up a few seconds into the great fights. boss kind -> { Ragna, Pell }
export const COMPANION_ASIDES = {
  warlord: { Ragna: 'Hrolf! It is Ragna! ...He does not know me. Then we do this the hard way.' },
  winter: { Ragna: 'Breathe out before you loose. It hates warm breath.', Pell: 'It is snowing indoors. I would like to file a complaint.' },
  kragnar: { Ragna: 'Big. Slow. Hits like a rockfall. My favourite kind.', Pell: 'That is Kragnar? I used to fetch his tea. ...I am staying back here.' },
  sovereign: { Ragna: 'Two arrows, one breath, Dreamer. Then the choice is yours.', Pell: 'I am behind a pillar. A very brave pillar.' },
  hollowking: { Ragna: 'A king who kept his post after he died. I know the type. Make it quick; that is a kindness.', Pell: 'He looks lonely. I mean that. Hit him anyway.' },
};

// Story beats a companion remarks on once each, in Chat, before the idle lines: [flag, when, line].
const hearts = () => Object.values(S.hearts || {}).filter(Boolean).length;
const BEATS = {
  Ragna: [
    ['r_jarl', () => S.quests.king?.status !== 'done', 'Valdrek swore himself to the cold. Hrolf swore himself to a gate. I swore myself to nothing. I sleep better than both.'],
    ['r_hearts', () => hearts() >= 1 && hearts() < 4 && !S.flags.finale, 'Every Heart you take, the snow gets softer under my boots. I noticed. I am not saying anything. I noticed.'],
    ['r_throne', () => hearts() >= 4 && !S.flags.finale, 'The Throne. If it talks to you, do not answer the first thing it says. Make it ask twice.'],
    ['r_thaw', () => S.flags.finale === 'thaw' && !S.flags.finalChoice, 'Summer. I had forgotten I own a summer shirt. I do not, it turns out.'],
    ['r_warden', () => S.flags.finale === 'warden' && !S.flags.finalChoice, 'You hold the Winter on a leash now. Hold it like a bowstring: firm, not tight.'],
    ['r_crown', () => S.flags.finale === 'crown' && !S.flags.finalChoice, 'You feel colder. Not to the touch. When you talk.'],
    ['r_ember', () => !!S.flags.arrivedEmberhold && !S.flags.forgeOpen, 'Smiths. All of them. I have never felt so badly dressed.'],
    ['r_forge', () => !!S.flags.forgeOpen && !S.flags.finalChoice, 'Thirty-nine names, and now a mountain. If I fall in there, say mine last. It is the shortest.'],
    ['r_after', () => !!S.flags.finalChoice && !S.flags.kingRemembered, 'It is quiet. I keep reaching for an arrow. Give me a few weeks.'],
    ['r_king', () => !!S.flags.kingRemembered, 'So the Kings dreamed you. Then they dreamed well. Do not let it go to your head.'],
  ],
  Pell: [
    ['p_ember', () => !S.flags.forgeOpen && S.map === 'emberhold', 'Emberhold is lovely. Every street is uphill. Both ways. I have measured.'],
    ['p_mines', () => S.quests.silence?.status === 'done' && !S.flags.forgeOpen, 'I went back down the shaft yesterday. Only to the first lantern. It was lit. I sat with it a while.'],
    ['p_reach', () => S.map !== 'emberhold' && !S.flags.finalChoice, 'So this is the Reach. It is very flat. Where do you all hide?'],
    ['p_forge', () => !!S.flags.forgeOpen && !S.flags.finalChoice, 'I counted the steps to the Forge door. I would rather not say the number. It is not a lucky number.'],
    ['p_after', () => !!S.flags.finalChoice && !S.flags.kingRemembered, 'I was there. Behind a pillar, but I was there. That counts. I have decided it counts.'],
    ['p_king', () => !!S.flags.kingRemembered, 'A king who only wanted remembering. I would like to be remembered as someone who was not hiding. Do not check.'],
  ],
};
async function storyBeat(who) {
  const b = (BEATS[who] || []).find(([f, when]) => !S.flags['beat_' + f] && when());
  if (!b) return false;
  S.flags['beat_' + b[0]] = true;
  await say(who, b[2]);
  return true;
}
export const companionName = () => (S.follower ? (S.companion === 'pell' ? 'Pell' : 'Ragna') : null);
bus.on('boss:engaged', (b) => {
  const who = companionName(), line = who && COMPANION_ASIDES[b?.kind]?.[who];
  if (line) b.scene?.time?.delayedCall(TUNE.story.asideDelay * 1000, () => { if (b.active && !b.dead) bus.emit('say', who.toUpperCase(), line); });
});

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
    if (S.quests.company.status !== 'done') return storyBeat(who);
    if (q.status === 'inactive') {
      await say(who, 'I keep thinking of the Company, lying where they fell. Wood rots. They deserve iron. Three ingots, and I will raise the cairn myself.');
      const c = await choose(['I will bring iron.', 'Not now.']);
      if (c === 0) { startQuest('ragnagrave'); await say(who, 'Thank you, Dreamer. Truly.'); }
      return true;
    }
    if (q.status === 'active') {
      if (count('iron_ingot') < 3) { await say(who, `Three iron ingots. You have ${count('iron_ingot')}. Bandits carry them.`); return true; }
      removeItem('iron_ingot', 3); addItem('company_bow', 1, true); S.flags.ragnaBond = true; finishQuest('ragnagrave');
      await say(who, "There. Thirty-nine names, in iron, and a space at the bottom. Not yet. Hrolf's bow was buried with him, but he would want it carried. Take this one; I made it from the Company's steel.");
      return true;
    }
  }
  return storyBeat(who);
}
