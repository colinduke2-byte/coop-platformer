// NPC scripts: async functions. `say` shows typewriter text, `choose` returns the picked index.
import { S } from '../systems/state.js';
import { say, choose, dialogue } from '../systems/dialogue.js';
import { dailyWares, noteSold } from './stock.js';
import { heartsHeld } from './hearts.js';
import { startQuest, finishQuest, checkHerbs } from '../systems/quests.js';
import { addItem, addGold, addArrows, removeItem, count } from '../systems/inventory.js';
import { ITEMS } from './items.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { buyMenu, sellMenu, brewMenu, upgradeMenu, enchantMenu, fletchMenu, repairMenu, reforgeMenu, buybackMenu } from './services.js';
import { startTutorial } from '../systems/tutorial.js';
import { stats as pstats } from '../systems/stats.js';

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
  startTutorial();
}

// Chapter two: the five Hearts. Returns true when it handled the conversation.
async function heartsTalk() {
  const q = S.quests.hearts;
  if (S.quests.king.status !== 'done') return false;
  if (S.flags.chapter3) {
    if (S.flags.finalChoice) { await say(SIGRID, 'The smoke has cleared from the Peaks. Whatever you decided up there, the sky is quiet. That is a gift I did not expect to live to see.'); return true; }
    if (!S.flags.arrivedEmberhold) {
      await say(SIGRID, 'Smoke on the Peaks, Dreamer. The Winter loosed its hold, and something older than the Winter has woken to fill the silence.');
      await say(SIGRID, 'The Peak Road runs from the north-east of the Reach up to Emberhold, the forge-city of the Anvil Court. It has been drifted shut for a thousand years. It is open now. Go, and ask them what the chains were made of.');
    } else await say(SIGRID, 'Emberhold is not Hollowfrost. Its people measure trust in what you will hold for them. Win their seals, and mind the fire.');
    return true;
  }
  if (q.status === 'inactive') {
    await say(SIGRID, 'Dreamer. Sit. What I have to tell you is older than the village.');
    await say(SIGRID, 'The Frostheart was never alone. The Hollow Kings bound the Long Winter, a thing older than snow, with five Hearts, and set a guardian to keep each one.');
    await say(SIGRID, S.flags.ending === 'give' ? 'Our hearth is warm tonight, but only because one Heart is spent. The other four still hold the cold in place, and the Winter is waking.' : 'You carry the first, and the cold follows you for it. The other four still hold the Winter in place, and it is waking.');
    await say(SIGRID, 'The old maps are faded. I can read only the nearest: the Glacial Maw, where the east freezes under the mountain. A serpent of rime sleeps there with the second Heart.');
    const c = await choose(['I will find it.', 'What is the Winter?', 'Not yet.']);
    if (c === 1) { await say(SIGRID, 'Some say a god the kings betrayed. Some say a hunger the kings fed. The Hearts keep it asleep, or keep it chained. I have never known which.'); }
    if (c === 2) { await say(SIGRID, 'Then rest. But the snow is already deeper than yesterday.'); return true; }
    startQuest('hearts');
    await say(SIGRID, 'Go east, past the lakes, to where the mountains close in. Take the best gear you have. The thing in the Maw is no draugr.');
    return true;
  }
  if (q.status === 'active') {
    const n = heartsHeld();
    if (S.flags.finale) { await say(SIGRID, 'It is done. Whatever you chose, you chose it with open eyes. That is more than the kings ever did.'); return true; }
    if (n >= 4) {
      await say(SIGRID, 'Four Hearts. I can hear them beating from across the room. The old maps are clear at last: the Winter Throne, in the far corner of the Reach.');
      await say(SIGRID, 'Its door opens only to someone who holds all four. Go. And whatever the Winter asks of you... remember that it is older than mercy.');
    } else if (n === 0) await say(SIGRID, 'The Glacial Maw lies far to the east, where the ice meets the mountains. Follow the roads and the fires. The marker on your map will help.');
    else {
      const lines = {
        1: 'The cold bends around you now. My maps show Ironwatch Keep next, a fortress the Hollow Kings left to a warden who never stopped marching. Look for black stone and old banners.',
        2: 'Two Hearts. The ground trembles less, I think. The third lies under the lakes: the Drowned Chapel, where a congregation prayed until the water took them.',
        3: 'Three. The last Heart lies where the trees have died and keep growing anyway: the Rootvault, in the blight. Be ready. It is the largest of the guardians.',
      };
      await say(SIGRID, lines[n]);
    }
    return true;
  }
  return false;
}

export async function sigrid() {
  if (await heartsTalk()) return;
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
  const aq = S.quests.alpha;
  if (aq.status === 'ready') {
    if (S.flags.alphaSpared) {
      await say(BJORN, 'You LET HIM GO? ...Hm. The wolves have gone quiet, I will give you that. The trails are safer already. I do not understand it, but I will not argue with results.');
      addGold(40);
    } else {
      await say(BJORN, 'Grimfang is dead? Ha! The pack will scatter now. Take this, you have earned it.');
      addGold(150);
    }
    finishQuest('alpha');
    return;
  }

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
    addGold(60); addItem('iron_sword'); addItem('wooden_shield'); addItem('hp_potion', 2);
    finishQuest('wolves');
    await say(BJORN, 'If you are going to the crypt, take plenty of potions. The dead do not tire.');
    return;
  }
  const tq = S.quests.trail;
  if (tq.status === 'ready') {
    await say(BJORN, 'You did it. You actually did it. Frostbrow himself.');
    await say(BJORN, 'The antlers are a hundred winters old. I can make you a bow from that, or I can sell the antlers to Mirra\'s stranger friends for four hundred gold. Your kill, your pick.');
    const c = await choose(['Make me a bow.', 'Sell them. Gold is gold.']);
    if (c === 0) { addItem('antler_bow'); await say(BJORN, 'Come back in an hour and it will be strung. ...No, I lied. It is already strung. I started the moment you left.'); S.flags.trailBow = true; }
    else { addGold(400); await say(BJORN, 'Four hundred. Hm. Practical. The old hunters will be sad; I will tell them it was a clean kill.'); }
    finishQuest('trail');
    return;
  }
  if (tq.status === 'active') { await say(BJORN, 'Tracks the size of a shield, in a loop between the camps. Follow them and keep your shield low. Frostbrow charges in a straight line.'); return; }
  if (tq.status === 'inactive' && aq.status === 'done') {
    await say(BJORN, 'One more, if you have the stomach. Something has been walking the Reach in a long loop between the camps. Tracks the size of a shield. My grandfather called it Frostbrow, the Winter Elk.');
    const c = await choose(['I will find it.', 'Not today.']);
    if (c === 0) { startQuest('trail'); await say(BJORN, 'Watch the snow near the camps and the old roads. When you see the prints, you are close. And it does not sleep.'); return; }
  }
  if (aq.status === 'inactive' && q.status === 'done') {
    await say(BJORN, 'There is one more thing. The pack has a leader. Grimfang, the Pale Alpha, big as a bear, lives up in Frostwind Pass. Kill him and the wolves never bother us again.');
    const c = await choose(['I will deal with him.', 'Later.']);
    if (c === 0) { startQuest('alpha'); await say(BJORN, 'The pass opens north of the forest, past the wolf den. Take plenty of arrows. And do not corner him; a cornered wolf is the worst kind.'); }
    return;
  }
  if (aq.status === 'active') { await say(BJORN, 'Frostwind Pass, north of the forest. Grimfang will be near the old watchtower.'); return; }
  await say(BJORN, S.flags.ending === 'give' ? 'Warm hearth, full pelts. Life is good.' : S.flags.alphaSpared ? 'Odd. The wolves watch me from the treeline now and do not come closer.' : 'Wolves are quiet. The draugr, less so. Keep your blade sharp.');
}

const MIRRA_WARES = [
  { id: 'hp_potion', price: 25 }, { id: 'mp_potion', price: 25 }, { id: 'sp_potion', price: 20 },
  { id: 'arrows', price: 15, n: 10, name: 'Arrows x10' }, { id: 'lockpick', price: 8, n: 3, name: 'Lockpicks x3' },
  { id: 'wooden_shield', price: 40, once: true }, { id: 'hunting_knife', price: 28, once: true }, { id: 'long_bow', price: 150, once: true },
  { id: 'mage_robe', price: 160, once: true }, { id: 'hunter_garb', price: 110, once: true },
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
  if (S.quests.locket.status === 'sell' && S.inv.silver_locket) {
    await say(MIRRA, 'That locket... silver, wolf-engraved. I will give you 120 gold for it, no questions.');
    const c = await choose(['Sell the locket (120G)', 'Not now']);
    if (c === 0) { removeItem('silver_locket', 1); addGold(120); finishQuest('locket'); S.flags.locketKind = false; await say(MIRRA, 'Pleasure doing business.'); }
  }
  // Herb quest
  const hq = S.quests.herbs;
  if (hq.status === 'inactive') {
    await say(MIRRA, 'You look like someone who walks into the woods on purpose. Good. I am out of snowberries and frost lilies, and half the village is coughing.');
    const c = await choose(['I will gather them.', 'Just browsing.']);
    if (c === 0) {
      startQuest('herbs');
      await say(MIRRA, 'Five snowberries and three frost lilies. They grow on the forest trails, small and bright. Pick them with E.');
      checkHerbs();
      return;
    }
  } else if (hq.status === 'ready') {
    await say(MIRRA, 'Oh, bless you. Let me see... perfect.');
    removeItem('snowberry', 5); removeItem('frost_lily', 3);
    addGold(60); addItem('hp_potion_g', 2);
    finishQuest('herbs');
    S.flags.alchemy = true;
    await say(MIRRA, 'Here, for your trouble. And since you have a good eye for herbs, I will teach you to brew. Use the alchemy option at my stall.');
  }
  await say(MIRRA, S.flags.ending === 'give' ? 'Business is booming now that people can feel their fingers!' : 'Potions, arrows, and the occasional bargain. What do you need?');
  for (;;) {
    const opts = ['Buy', 'Sell', S.flags.alchemy ? 'Brew potions' : 'Brew (learn first)', 'Buy back', 'Leave'];
    const c = await choose(opts);
    if (c === 0) await buyMenu(MIRRA, [...MIRRA_WARES, ...dailyWares('Mirra', 3)]);
    else if (c === 1) await sellMenu(MIRRA);
    else if (c === 2) {
      if (!S.flags.alchemy) await say(MIRRA, 'Bring me five snowberries and three frost lilies and I will teach you.');
      else await brewMenu(MIRRA);
    } else if (c === 3) await buybackMenu(MIRRA);
    else { await say(MIRRA, 'Stay warm.'); return; }
  }
}

export async function hilda() {
  const H = 'Hilda';
  const tl = S.quests.toll;
  if (tl.status === 'ready') {
    await say(H, 'That is it. That is troll bone. Look at the grain. It is like iron that has learned to be angry.');
    await say(H, 'Give me three ingots and a night at the anvil, and I will give you a mace that remembers this.');
    if (count('iron_ingot') < 3) { await say(H, '...You do not have three ingots. Come back with them. The bone will keep.'); }
    else { removeItem('iron_ingot', 3); addItem('trollbone_mace'); finishQuest('toll'); await say(H, 'There. Hold it. It hums. Do not let it hum at me.'); return; }
  } else if (tl.status === 'inactive' && heartsHeld() >= 1) {
    await say(H, 'You have the look of someone who has stood in front of something large. Tell me, have you seen the tracks? Big, round, a stride like a barn door?');
    await say(H, 'A bridge troll. Walks the old roads. There is a metal in its bones no forge in the north can make. Bring me the troll and I will bring you the weapon.');
    const c = await choose(['I will hunt Grungnir.', 'That sounds insane.']);
    if (c === 0) { startQuest('toll'); await say(H, 'Good. Fire hurts it most. Do not let it rest; it knits itself up while you stand there thinking.'); }
  }
  await say(H, S.flags.ending === 'give' ? 'The forge has never run so hot. Everyone wants new blades!' : 'Steel does not care about the cold. What do you need?');
  for (;;) {
    const c = await choose(['Forge (upgrade, enchant)', 'Repair, reforge, buy back', 'Fletch arrows', 'Buy gear', 'Sell', 'Leave']);
    if (c === 0) {
      const f = await choose(['Upgrade weapon', 'Upgrade armor', 'Enchant weapon', 'Back']);
      if (f === 0) await upgradeMenu(H, 'weapon'); else if (f === 1) await upgradeMenu(H, 'armor'); else if (f === 2) await enchantMenu(H);
    } else if (c === 1) {
      const f = await choose(['Repair gear', 'Reforge a found item', 'Buy back what you sold', 'Back']);
      if (f === 0) await repairMenu(H); else if (f === 1) await reforgeMenu(H); else if (f === 2) await buybackMenu(H);
    }
    else if (c === 2) await fletchMenu();
    else if (c === 3) await buyMenu(H, [...dailyWares('Hilda', 3),
      { id: 'iron_sword', price: 80, once: true }, { id: 'steel_sword', price: 180, once: true }, { id: 'iron_greatsword', price: 220, once: true },
      { id: 'hand_axe', price: 100, once: true }, { id: 'hunting_spear', price: 90, once: true }, { id: 'iron_mace', price: 140, once: true },
      { id: 'iron_cuirass', price: 130, once: true }, { id: 'iron_shield', price: 110, once: true }, { id: 'bulwark_plate', price: 340, once: true }, { id: 'iron_ingot', price: 30, n: 1 },
    ]);
    else if (c === 4) await sellMenu(H);
    else { await say(H, 'Keep your edge sharp.'); return; }
  }
}

export async function ragna() {
  const R = 'Ragna';
  if (S.follower) {
    const c = await choose(['Stay in the village', 'Keep following', 'Chat']);
    if (c === 0) { S.follower = false; bus.emit('follower', false); await say(R, 'I will be at the lodge. Whistle if you want me.'); }
    else if (c === 2) await say(R, cycleLine('ragnaN', ['I never miss twice.', 'Wolves smell fear. I do not give it off.', 'The crypt? I would rather fight a hundred wolves.']));
    return;
  }
  if (heartsHeld() >= 1 && S.quests.company.status === 'inactive') {
    await say(R, 'You carry a Heart. I can smell the winter on it, and under that, Ironwatch.');
    await say(R, 'I rode with the Company. Forty of us. Hrolf Ironmarch held the gate when the cold came, and the gate held him. He is still up there, wearing the dead like armour.');
    const q = await choose(['I will take you to him. Free of charge.', 'I will think about it.']);
    if (q === 0) {
      startQuest('company');
      S.gold += 0;
      if (!S.follower) { S.follower = true; bus.emit('follower', true); }
      await say(R, 'Then my bow is yours, for nothing. Bring me to the Keep, Dreamer. Let me lay them down.');
      return;
    }
    await say(R, 'The Keep is not going anywhere. Neither, I fear, are they.');
  }
  await say(R, 'Sellsword. Archer. Cheap, for what I do. 150 gold and I will follow you and shoot anything that bites.');
  const c = await choose(['Hire Ragna (150G)', 'Not now']);
  if (c !== 0) return;
  if (S.gold < 150) { sfx.play('nostamina'); await say(R, 'Come back with coin.'); return; }
  S.gold -= 150; S.follower = true; bus.emit('follower', true);
  await say(R, 'Lead on. I will keep to your heels and my arrows will keep to their throats.');
}
function cycleLine(key, lines) { const n = S.flags[key] || 0; S.flags[key] = n + 1; return lines[n % lines.length]; }

export const SCRIPTS = { sigrid, bjorn, mirra };
export const NPC_DEFS = {
  sigrid: { name: 'ELDER SIGRID', tex: 'spr_sigrid' },
  bjorn: { name: 'BJORN', tex: 'spr_bjorn' },
  mirra: { name: 'MIRRA', tex: 'spr_mirra' },
};

// ---- ambient villagers: short, state-aware lines (and a few gameplay hints)
function cycle(key, lines) {
  const n = (S.flags[key] || 0);
  S.flags[key] = n + 1;
  return lines[n % lines.length];
}
export async function guard() {
  const G = 'Haldor';
  if (S.flags.ending === 'give') return say(G, 'No frost on the palisade this morning. I may even take up gardening.');
  if (S.flags.ending) return say(G, 'Eyes on the pines, friend. Something is watching the village.');
  await say(G, cycle('guardN', [
    'The east gate leads to the Pine Forest. Wolves on the trail, bandits in the camp past the bend.',
    'Hold Shift or C to creep. Enemies spot a sneaking dreamer from half as far, and a blade in the back hits three times as hard.',
    'Warm yourself at a campfire. Press E beside the flames to rest, heal and save your progress.',
    'The stone gate in the north-east of the forest is the crypt of the Hollow King. Do not go in underequipped.',
    'Crates and pots sometimes hold coin. Smash them with your sword.',
  ]));
}
export async function child() {
  const C = 'Asta';
  const lq = S.quests.locket;
  if (S.flags.houndOwned && !S.flags.houndResolved && lq.status !== 'inactive' && lq.status !== 'active') {
    await say(C, 'That dog! That is PUP! He went missing the night the bandits came!');
    await say(C, 'He is thin. But he is looking at you like he looks at me.');
    const hc = await choose(['He is yours. Take him home.', 'He chose me. He is staying.']);
    S.flags.houndResolved = true;
    if (hc === 0) {
      S.flags.houndGiven = true; S.flags.houndOwned = false; if (S.pet === 'hound') S.pet = S.flags.cubOwned ? 'cub' : null;
      S.gold += 200; addItem('hound_collar');
      bus.emit('toast', 'THE HOUND GOES HOME', 13);
      await say(C, 'Thank you thank you thank you! Here, this is his collar. He will wear a new one. He will always be yours too, a little.');
      const gs = dialogue.hud?.scene?.get?.('Game'); gs?.hound?.destroy?.(); if (gs) gs.hound = null;
    } else {
      S.flags.houndKept = true;
      await say(C, '...Oh. Okay. He does look happy. Look after him? Please?');
      await say(C, '(She wipes her nose on her sleeve and walks away very straight.)');
    }
    return;
  }
  if (lq.status === 'inactive') {
    await say(C, 'Please... the bandits took my mama\'s silver locket when they raided the road. It has a little wolf on it. I would give anything to have it back.');
    const c = await choose(['I will find it.', 'Sorry, kid.']);
    if (c === 0) { startQuest('locket'); await say(C, 'Thank you! They keep their loot in the camp, in the forest, the one with the fire.'); }
    return;
  }
  if (lq.status === 'active') return say(C, 'Did you find it? The camp in the forest, past the bend...');
  if (lq.status === 'relic') {
    await say(C, 'That is... that is MAMA\'S LOCKET!');
    const c = await choose(['Give it back to Asta.', 'Keep it. It is worth 120 gold.']);
    if (c === 0) {
      removeItem('silver_locket', 1); addItem('asta_charm'); addGold(25);
      finishQuest('locket'); S.flags.locketKind = true;
      await say(C, 'Thank you thank you! Here, this is my lucky charm. It is not much, but it is everything I have.');
    } else {
      S.flags.locketKind = false;
      await say(C, '...Oh. I understand. Everyone needs gold.');
      await say(C, '(Her eyes are wet. You can sell the locket to Mirra when you like.)');
      lq.status = 'sell';
    }
    return;
  }
  if (lq.status === 'sell') { await say(C, 'Mama says some people only see the price of things.'); return; }
  if (S.flags.ending === 'give') return say(C, 'The snow is melting! Look, it is puddles!');
  if (S.flags.locketKind) return say(C, 'Mama wears the locket every day now. She says you are a hero!');
  if (S.quests.wolves.status === 'done') return say(C, 'Bjorn says you hunted the wolves! Were they big? Bigger than me?');
  await say(C, cycle('childN', [
    'I am not scared of wolves. I am scared of the dark. And wolves in the dark.',
    'The pond is frozen solid. Mirra says you can skate on it if you do not mind the cold.',
    'Elder Sigrid tells the best stories. Mostly about the Hollow King. Mostly the scary parts.',
  ]));
}
SCRIPTS.guard = guard;
SCRIPTS.hilda = hilda;
SCRIPTS.ragna = ragna;
SCRIPTS.child = child;
NPC_DEFS.hilda = { name: 'HILDA', tex: 'spr_hilda' };
NPC_DEFS.ragna = { name: 'RAGNA', tex: 'spr_ragna' };
NPC_DEFS.guard = { name: 'GUARD HALDOR', tex: 'spr_guard' };
NPC_DEFS.child = { name: 'ASTA', tex: 'spr_child' };

// ---- the travelling trader (a random world event): rare gear at a price
NPC_DEFS.trader = { name: 'TRADER', tex: 'spr_trader' };
SCRIPTS.trader = async function trader() {
  const T = 'Trader';
  const sc = dialogue.hud.scene.get('Game');
  await say(T, S.run.kills > 40 ? 'You have the look of someone who has been busy. Care to spend what you took?' : 'Roads are dangerous, friend. My prices are not. Much.');
  for (;;) {
    const c = await choose(['Browse wares', 'Sell', 'Leave']);
    if (c === 0) await buyMenu(T, sc.traderWares || []);
    else if (c === 1) await sellMenu(T);
    else { await say(T, 'Safe roads.'); return; }
  }
};
