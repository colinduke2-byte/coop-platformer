// NPC scripts: async functions. `say` shows typewriter text, `choose` returns the picked index.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addItem, addGold, addArrows, removeItem, count } from '../systems/inventory.js';
import { ITEMS } from './items.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';

const SIGRID = 'Sigrid', BJORN = 'Bjorn', MIRRA = 'Mirra';

export async function intro() {
  await say(SIGRID, 'Easy, easy. Do not rise too fast. The frost very nearly had you.');
  await say(SIGRID, 'My hunters found you half buried on the north road. Do you remember your name?');
  const c = await choose(['Not a thing.', 'Only fragments.', 'Where am I?']);
  if (c === 0) await say(SIGRID, 'Then you are in good company. Half this village has forgotten its own name in the cold.');
  else if (c === 1) await say(SIGRID, 'Fragments are a start. Hold on to them.');
  else await say(SIGRID, 'Hollowfrost, the last hearth south of the pines.');
  await say(SIGRID, 'I am Sigrid, elder here. You have a sword and a bow, and you survived what should have killed you. That makes you the most useful stranger we have met this winter.');
  await say(SIGRID, 'Talk to Bjorn at the lodge. Wolves have been thinning our flocks. Mirra sells potions at her stall. Then come and see me.');
  await say(SIGRID, 'Hold C or Shift to creep. Press I for your pack, O for your journal. And mind the cold.');
  S.flags.introDone = true;
}

export async function sigrid() {
  const k = S.quests.king;
  const end = S.flags.ending;
  if (end === 'give') {
    await say(SIGRID, 'The Frostheart burns warm in our hearth. Look at the children, they are playing in the snow again. We owe you everything.');
    return;
  }
  if (end === 'keep' || end === 'sell') {
    await say(SIGRID, end === 'keep' ? 'I can feel the cold in you from here. Keep your distance, Dreamer.' : 'Mirra counts her gold while the snow deepens. Was it worth it?');
    return;
  }
  if (k.status === 'inactive') {
    await say(SIGRID, 'You return. Good. Hollowfrost is dying by inches, and I think I know why.');
    await say(SIGRID, 'Beneath the pines lies the crypt of Jarl Valdrek, the Hollow King. Our grandmothers said he sleeps with the Frostheart in his hands. Now the draugr walk and the winter has not broken in three years.');
    for (;;) {
      const c = await choose(['I will go.', 'Tell me more about the Frostheart.', 'Not yet.']);
      if (c === 0) {
        startQuest('king');
        await say(SIGRID, 'Follow the forest trail north-east to the stone gate. Take Bjorn\'s counsel, and potions. The dead hit harder than they look.');
        return;
      }
      if (c === 1) await say(SIGRID, 'A crystal older than the jarls. It drinks warmth and gives back strength to whoever holds it. In the right hands it could be sealed to ease the winter. In the wrong ones...');
      else { await say(SIGRID, 'Then prepare. The cold does not wait, but it is patient.'); return; }
    }
  }
  if (k.status === 'active') {
    await say(SIGRID, S.flags.crypt ? 'The crypt waits beneath the stone gate. Valdrek will not give up the Frostheart easily.' : 'Follow the forest trail north-east, to the stone gate beyond the bandit camp.');
    return;
  }
  if (k.status === 'relic') {
    await say(SIGRID, 'By the old gods... you carry the Frostheart. I feel the cold rolling off it.');
    await say(SIGRID, 'If we seal it in the hearth of the great hall, the winter will ease. But it would be lost to you forever. Its power is not small.');
    await say(SIGRID, 'It is yours by right. What will you do?');
    const c = await choose(['Take it. Ease the winter.', 'No. It is mine now.', 'I need a moment.']);
    if (c === 0) {
      await say(SIGRID, 'Thank you. May the hearth remember you.');
      removeItem('frostheart', 1);
      addGold(150); addItem('warm_amulet');
      finishQuest('king');
      S.flags.ending = 'give';
      bus.emit('ending', 'give');
    } else if (c === 1) {
      await say(SIGRID, 'I see. Then Hollowfrost will freeze with the rest of the north. I hope it keeps you warm.');
      finishQuest('king');
      S.flags.ending = 'keep';
      bus.emit('ending', 'keep');
    } else await say(SIGRID, 'Take your time. But the snow does not.');
    return;
  }
  await say(SIGRID, 'Hollowfrost is in your debt.');
}

export async function bjorn() {
  const q = S.quests.wolves;
  if (q.status === 'inactive') {
    await say(BJORN, 'Hah. You are the one we dragged out of the snow. You look better than you smell.');
    await say(BJORN, 'Wolves. Three of them, big as ponies, hunting the north trail. They took my best dog. Kill them for me and I will make it worth your while.');
    const c = await choose(['I will hunt them.', 'Any advice?', 'Not now.']);
    if (c === 0) {
      startQuest('wolves');
      addArrows(10);
      await say(BJORN, 'Take these arrows. Draw the bow slowly, a held shot hits hard but costs breath. Wolves lunge after a growl. Roll through it with Space.');
    } else if (c === 1) {
      await say(BJORN, 'Crouch with C and move slow. Wolves notice you late, and a blade in an unaware back does triple damage.');
    } else await say(BJORN, 'The wolves are not going anywhere. Neither are our sheep, for now.');
    return;
  }
  if (q.status === 'active') {
    await say(BJORN, `Still ${3 - Math.min(q.kills, 3)} to go. Follow the forest trail east of the village.`);
    return;
  }
  if (q.status === 'ready') {
    await say(BJORN, 'Three pelts! Ha! You have earned this, friend.');
    addGold(60); addItem('iron_sword'); addItem('hp_potion', 2);
    finishQuest('wolves');
    await say(BJORN, 'If you are going to the crypt, take plenty of potions. The dead do not tire.');
    return;
  }
  await say(BJORN, S.flags.ending === 'give' ? 'Warm hearth, full pelts. Life is good.' : 'Wolves are quiet. The draugr, less so. Keep your blade sharp.');
}

const WARES = [
  { id: 'hp_potion', price: 25 },
  { id: 'mp_potion', price: 25 },
  { id: 'sp_potion', price: 20 },
  { id: 'arrows', price: 15, n: 10, name: 'Arrows x10' },
  { id: 'long_bow', price: 150 },
];
export async function mirra() {
  if (S.quests.king.status === 'relic' && !S.flags.ending) {
    await say(MIRRA, 'Is that... a Frostheart? Do not give it to the old woman. I will pay 400 gold, cash, right now. Think what that buys.');
    const c = await choose(['Sell it to Mirra.', 'No deal.']);
    if (c === 0) {
      removeItem('frostheart', 1);
      addGold(400);
      await say(MIRRA, 'Pleasure. Do not look so sad. Gold is warm, too.');
      finishQuest('king');
      S.flags.ending = 'sell';
      bus.emit('ending', 'sell');
      return;
    }
    await say(MIRRA, 'Your loss. The offer stands.');
  }
  await say(MIRRA, S.flags.ending === 'give' ? 'Business is booming now that people can feel their fingers!' : 'Potions, arrows, and the occasional bargain. What do you need?');
  for (;;) {
    const labels = WARES.map((w) => `${w.name || ITEMS[w.id].name}  ${w.price}G`);
    const c = await choose([...labels, 'Leave']);
    if (c === WARES.length) { await say(MIRRA, 'Stay warm.'); return; }
    const w = WARES[c];
    if (w.id === 'long_bow' && count('long_bow')) { await say(MIRRA, 'You already carry one.'); continue; }
    if (S.gold < w.price) { sfx.play('nostamina'); await say(MIRRA, 'Come back when you have the coin.'); continue; }
    S.gold -= w.price;
    if (w.id === 'arrows') { S.arrows += w.n; bus.emit('toast', `+${w.n} ARROWS`, 5); }
    else addItem(w.id);
    sfx.play('coin');
  }
}

export const SCRIPTS = { sigrid, bjorn, mirra };
export const NPC_DEFS = {
  sigrid: { name: 'ELDER SIGRID', tex: 'spr_sigrid' },
  bjorn: { name: 'BJORN', tex: 'spr_bjorn' },
  mirra: { name: 'MIRRA', tex: 'spr_mirra' },
};
