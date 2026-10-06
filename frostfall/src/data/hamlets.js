// The small settlements scattered across the Hollow Reach: a trapper, a fisher and a prospector, each with a little stock
// and a word about the road. Registered into the shared NPC tables (imported once by GameScene).
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { buyMenu, sellMenu } from './services.js';
import { dailyWares } from './stock.js';

NPC_DEFS.trapper = { name: 'TRAPPER', tex: 'spr_trapper' };
NPC_DEFS.fisher = { name: 'FISHER', tex: 'spr_fisher' };
NPC_DEFS.prospector = { name: 'PROSPECTOR', tex: 'spr_prospector' };

const cyc = (key, lines) => { const n = S.flags[key] || 0; S.flags[key] = n + 1; return lines[n % lines.length]; };
const trade = async (who, wares, hello) => {
  await say(who, hello);
  for (;;) {
    const c = await choose(['Buy', 'Sell', 'Leave']);
    if (c === 0) await buyMenu(who, wares); else if (c === 1) await sellMenu(who); else return;
  }
};

SCRIPTS.trapper = () => trade('Trapper', [{ id: 'arrows', price: 14, n: 10, name: 'Arrows x10' }, { id: 'hp_potion', price: 26 }, { id: 'hunting_spear', price: 60, once: true }, ...dailyWares('Trapper', 1)],
  cyc('trapperN', ['Furs, arrows, and advice. The advice is free; the other two are not.', 'Tracks near the north fork. Big. Heavier than a bear and walking upright. I am staying inside tonight.', 'You hear the wolves at dusk? That is not hunting. That is a roll call.']));
SCRIPTS.fisher = () => trade('Fisher', [{ id: 'grilled_trout', price: 16 }, { id: 'fish_stew', price: 40 }, { id: 'smoked_pike', price: 44 }, { id: 'hp_potion', price: 26 }],
  cyc('fisherN', ['The ice holds till spring, if spring comes. Cut a hole, wait, say nothing. That is the whole craft.', 'Pike near the east lakes. Eels in the south, if you can bear the taste. I cannot.', 'My grandmother said the lakes remember every name that fell in. I do not fish after dark.']));
SCRIPTS.prospector = () => trade('Prospector', [{ id: 'iron_ingot', price: 18 }, { id: 'bone_dust', price: 22 }, { id: 'gem_amber', price: 100 }, { id: 'gem_emerald', price: 110 }],
  cyc('prospectorN', ['Iron under the grey rock, bone dust where the old battles were. I sell what the mountain gives me.', 'There is a city of smiths up in the Peaks, they say. Past the great road. I have never been. I am saving for the boots.', 'Rock sings before it falls. If you hear it, run.']));
