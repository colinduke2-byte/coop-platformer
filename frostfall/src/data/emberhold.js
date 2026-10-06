// Emberhold: its people, factions' quests and services (Emberforge, gem sockets). Registers itself into the
// shared NPC_DEFS / SCRIPTS / QUESTS tables, so it is imported once by GameScene.
import { S } from '../systems/state.js';
import { say, choose } from '../systems/dialogue.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { NPC_DEFS, SCRIPTS } from './dialogue.js';
import { QUESTS, TARGETS } from './quests.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { ITEMS } from './items.js';
import { addItem, removeItem, count, addGold } from '../systems/inventory.js';
import { buyMenu, sellMenu, repairMenu, reforgeMenu, upgradeMenu, enchantMenu, pick, statLines } from './services.js';
import { listScreen } from '../scenes/ShopScene.js';
import { addRep, rep, repTier, FACTIONS, FACTION_IDS } from './factions.js';
import { socketCount, socketed, insertGem, removeGem, gemList } from '../systems/sockets.js';
import { recalc } from '../systems/stats.js';
import { EMBERHOLD } from './emberhold_map.js';
import { heartsHeld } from './hearts.js';

const def = (id, name, tex = id) => { NPC_DEFS[id] = { name, tex: 'spr_' + tex }; };
const cyc = (key, lines) => { const n = S.flags[key] || 0; S.flags[key] = n + 1; return lines[n % lines.length]; };
const ending = () => S.flags.ending || null;   // 'give' | 'keep' | 'sell' once the Winter is decided

// ---------------------------------------------------------------------------------------------------- quests
QUESTS.silence = {
  title: 'The Silent Mines', giver: "Orrin Flintbeard", desc: "The lanterns along the Deep Mines went out one by one, and the Delvers who followed them never came back. Orrin wants to know what sleeps below.",
  short: (q) => (S.flags.kragnarDead ? "Tell Orrin what you found" : S.flags.minesEntered ? 'Reach the lair of Kragnar' : 'Descend into the Deep Mines'),
  objectives: (q) => [
    { t: 'Descend into the Deep Mines (the gate by the Delvers\' Quarter)', done: !!S.flags.minesEntered || q.status === 'done' },
    { t: 'Defeat Kragnar the Hollowed', done: !!S.flags.kragnarDead || q.status === 'done' },
    { t: 'Report to Orrin Flintbeard', done: q.status === 'done' },
  ],
};
QUESTS.anvilcore = {
  title: 'A Core for the Anvil', giver: 'Brannoch Redhammer', desc: "Brannoch swears the first Emberforged gear needs a heart of the lode itself: the glowing core that Kragnar carries. Bring it to the Great Anvil and he will teach you the craft.",
  short: () => (count('kragnar_core') > 0 ? 'Bring the core to Brannoch' : 'Take the core from Kragnar'),
  objectives: (q) => [
    { t: "Take Kragnar's Core from the lair under the mines", done: count('kragnar_core') > 0 || q.status === 'done' },
    { t: 'Bring it to Brannoch Redhammer', done: q.status === 'done' },
  ],
};
QUESTS.roadwatch = {
  title: 'The Ashen Road', giver: 'Captain Hesper Vael', desc: 'Bandits and worse have overrun the road between the Hollow Reach and Emberhold. Captain Vael will not rest until three strongholds on the Ashen Peaks are cleared.',
  short: () => `Clear strongholds on the Ashen Peaks ${Math.min(3, ashenCleared())}/3`,
  objectives: () => [{ t: `Clear camps, towers or champions in the Ashen Peaks (${Math.min(3, ashenCleared())}/3)`, done: ashenCleared() >= 3 }, { t: 'Report to Captain Vael', done: S.quests.roadwatch.status === 'done' }],
};
export const ashenCleared = () => Object.keys(S.bounty || {}).filter((k) => k.startsWith('ashen_') && S.bounty[k]).length;
TARGETS.silence = () => (S.flags.kragnarDead ? { map: 'emberhold', x: 59, y: 43 } : { map: 'emberhold', x: EMBERHOLD.mines.x, y: EMBERHOLD.mines.y });
TARGETS.anvilcore = () => (count('kragnar_core') > 0 ? { map: 'emberhold', x: EMBERHOLD.forge.x, y: EMBERHOLD.forge.y } : { map: 'emberhold', x: EMBERHOLD.mines.x, y: EMBERHOLD.mines.y });
TARGETS.roadwatch = () => ({ map: 'emberhold', x: 9, y: 31 });

// ---------------------------------------------------------------------------------------------------- people
def('hesper', 'CAPT. VAEL', 'hesper'); def('corvin', 'WARDEN CORVIN', 'corvin'); def('pell', 'PELL', 'pell'); def('rook', 'ROOK', 'rook');
def('dunmar', 'DUNMAR', 'dunmar'); def('hildsoot', 'HILD SOOT', 'hildsoot'); def('nessa', 'NESSA', 'nessa'); def('varro', 'VARRO', 'varro');
def('ketil', 'KETIL', 'ketil'); def('aurel', 'SISTER AUREL', 'aurel'); def('brisa', 'MOTHER BRISA', 'brisa'); def('goran', 'OLD GORAN', 'goran');
def('garrow', 'GARROW PITT', 'garrow'); def('ysolde', 'MATRIARCH YSOLDE', 'ysolde'); def('thessaly', 'THESSALY', 'thessaly');
def('brannoch', 'BRANNOCH', 'brannoch'); def('isolt', 'ISOLT', 'isolt'); def('tamsin', 'TAMSIN', 'tamsin'); def('orrin', 'ORRIN', 'orrin'); def('maelis', 'MAELIS', 'maelis');

const standing = () => FACTION_IDS.map((f) => `${FACTIONS[f].short}: ${repTier(f)}`).join('   ');

SCRIPTS.hesper = async function hesper() {
  const N = 'Captain Vael', q = S.quests.roadwatch;
  if (q.status === 'active' && ashenCleared() >= 3) {
    await say(N, 'Three strongholds down. The road breathes again. You have the Wardens\' thanks, and something better than thanks.');
    addGold(250); addRep('wardens', 25); addItem('ironwatch_banner'); finishQuest('roadwatch'); return;
  }
  if (q.status === 'inactive') {
    await say(N, S.flags.ending ? 'You wear the mark of the Winter\'s ending. Tell me, which did you choose? ...No. Do not tell me. I want to look at your face when I decide what to think.' : 'Halt. State your business in Emberhold, and your business on the road.');
    await say(N, 'The Ashen road is overrun. Camps, towers, things that do not sleep. Clear three strongholds and I will see the Wardens remember your name.');
    const c = await choose(['I will clear the road.', 'Not today.']);
    if (c === 0) { startQuest('roadwatch'); await say(N, 'Good. Look for smoke, and for fires that do not warm anyone.'); }
    return;
  }
  await say(N, cyc('hesperN', ['The wall holds. It always holds, until the morning it does not.', `Your standing with us: ${repTier('wardens')}.`, 'Corvin lost his company to the last Winter. Be kind to him; he will not ask.']));
};
SCRIPTS.corvin = async function corvin() {
  await say('Corvin', cyc('corvinN', ['I was at the Reach when the Frost came down. We were forty. I walked home with six.', ending() === 'give' ? 'They say the Winter broke. It did not break. It was *let go*. Remember the difference.' : 'The cold does not forget.', 'Do not thank me for the watch. Thank the ones who are not here to keep it.']));
};
SCRIPTS.pell = async function pell() {
  const N = 'Pell';
  await say(N, cyc('pellN', ['Pell Quickpick! Fastest hands in the Delvers! Ask anyone. Well. Ask anyone alive.', 'Shortcut to the mines? Through the market, past the fish stall that does not sell fish. Do not ask.', 'If I had a coin for every cave-in I walked out of, I would have... one coin. A very heavy one.']));
};
SCRIPTS.rook = async function rook() {
  const N = 'Rook', wares = [{ id: 'lockpick', price: 22, n: 2, name: 'Lockpick x2' }, { id: 'hp_potion_g', price: 90 }, { id: 'gem_topaz', price: 160, once: true }, ...(rep('delvers') >= 20 ? [{ id: 'gem_bloodstone', price: 240, once: true }] : [])];
  await say(N, cyc('rookN', ['Quiet. Everyone here is loud, which is how I know who is listening.', 'Honest prices for dishonest goods. Care to look?']));
  const c = await choose(['Buy', 'Sell', 'Leave']);
  if (c === 0) await buyMenu(N, wares); else if (c === 1) await sellMenu(N);
};
SCRIPTS.dunmar = async function dunmar() {
  const N = 'Dunmar', wares = ['gem_ruby', 'gem_sapphire', 'gem_emerald', 'gem_amber', 'gem_onyx'].map((id) => ({ id, price: ITEMS[id].value + 20, once: false }));
  await say(N, 'Every stone has a voice. Rubies shout. Sapphires hum. Onyx just... waits. Tamsin sets them; I cut them. Buy, sell, or just listen.');
  const c = await choose(['Buy gems', 'Sell', 'Leave']);
  if (c === 0) await buyMenu(N, wares); else if (c === 1) await sellMenu(N);
};
SCRIPTS.hildsoot = async function hildsoot() {
  const N = 'Hild Soot', wares = [{ id: 'hp_potion', price: 30 }, { id: 'mp_potion', price: 30 }, { id: 'sp_potion', price: 26 }, { id: 'hp_potion_g', price: 85 }];
  await say(N, 'Soot-black and proud of it. Everything in Emberhold ends up in my cauldron eventually.');
  const c = await choose(['Buy potions', 'Sell', 'Leave']);
  if (c === 0) await buyMenu(N, wares); else if (c === 1) await sellMenu(N);
};
SCRIPTS.nessa = async function nessa() {
  await say('Nessa', cyc('nessaN', ['Stew! Hot stew! The mountain keeps the pot warm for free.', 'Eat something. You look like a candle in a draught.', 'The Delvers swear by my pies. The Wardens swear at them. Everyone comes back.']));
  if (!S.flags.nessaFed) { S.flags.nessaFed = true; S.hp = S.maxHp; bus.emit('toast', 'A WARM BOWL OF STEW', 8); }
};
SCRIPTS.varro = async function varro() {
  await say('Varro', cyc('varroN', ['The pit is closed on holy days. Today is not a holy day. Today is a payday.', 'I fought forty bouts. Won thirty-nine. Do not ask about the fortieth.', 'The Hollow Arena in the village is mine too. Distant cousin. We both like the sound of a crowd.']));
};
SCRIPTS.ketil = async function ketil() {
  const lines = [
    'Sing, O smiths of Emberhold, for the first fire sleeps, and the first fire dreams of you!',
    'Five Hearts the Kings did bind, five chains the Anvil wrought; the Winter wore them, the Winter fought, the Winter lost the fight...',
    ending() === 'keep' ? 'And a Winter King now walks the Reach, with a crown of frost and a heart of cold; I will not sing that song. Not today.' : ending() === 'give' ? 'And the Hearth is lit in the Hollow Reach, and the frost has loosed its hold; that, my friend, is a song worth gold!' : 'Ask me what the Winter cost, and I will tell you in gold. Ask me what it was worth, and I will not answer.',
  ];
  await say('Ketil', cyc('ketilN', lines));
};
SCRIPTS.aurel = async function aurel() {
  const N = 'Sister Aurel';
  await say(N, cyc('aurelN', ['The First Flame does not ask for prayer. Only that someone keeps it company.', 'Every Heart the Kings bound was a flame, once. We are the ones who remember which.', heartsHeld() >= 4 ? 'You carry four Hearts. I can feel them from here. Be gentle with them. They remember being whole.' : 'Go well. Come back with ashes on your boots and a story.']));
};
SCRIPTS.brisa = async function brisa() {
  await say('Mother Brisa', 'A house on Ashfall Street, with a hearth that never dies and a bed that never creaks. Five hundred gold. The door by the stalls.');
};
SCRIPTS.goran = async function goran() {
  const N = 'Old Goran';
  await say(N, cyc('goranN', [
    'I was the Court\'s smith, forty years ago. I made links for the chains. Do you know what we made them from? Not iron.',
    'The Hollow Kings brought us a sack of something grey and warm. They said: bind the Winter. We never asked what it was. Brannoch still does not know.',
    ending() === 'sell' ? 'You sold the Winter, I hear. Gold for a god. That is an old way of ending, and it never ends.' : 'The chains held for a thousand years. Ask yourself what holds a chain that long.',
  ]));
};
SCRIPTS.garrow = async function garrow() {
  const N = 'Garrow Pitt';
  if (S.flags.kragnarDead) { await say(N, 'The lanterns are lit. All of them. I walked the whole shaft and not one went out. I owe you a drink, and my mother owes you a prayer.'); return; }
  await say(N, cyc('garrowN', ['The lift is down. The shaft is dark. We do not send anyone below until the lanterns relight.', 'Something is digging down there. Not us. Not anyone I know.', 'Take a torch. Take two. Do not take Pell.']));
};
SCRIPTS.thessaly = async function thessaly() {
  const N = 'Thessaly';
  await say(N, cyc('thessalyN', ['The archive holds every treaty, every ledger and every lie. Mostly the lies. They are better written.', 'There is a page missing from the Book of Chains. It was cut out, cleanly, by someone who could read it.', ending() ? 'Your choice at the Throne is recorded. In pencil. Everything is pencil until a century passes.' : 'If you decide the Winter\'s fate, I would like to be the one to write it down.']));
};
SCRIPTS.ysolde = async function ysolde() {
  const N = 'Matriarch Ysolde';
  if (!S.flags.metYsolde) {
    S.flags.metYsolde = true;
    await say(N, 'So. The Reach sends a dreamer. I have waited a long while to see what the Hollow Kings left behind.');
    await say(N, ending() === 'give' ? 'You gave the Winter its rest. Our furnaces have burned three days brighter for it. Gratitude is a cheap word; you will have it anyway.' : ending() === 'keep' ? 'You carry the Winter\'s crown. Say nothing. I am deciding whether to be afraid, and I would like to finish.' : ending() === 'sell' ? 'You sold the Winter. For how much? ...Never mind. I can see the answer in your pockets.' : 'The Winter is not decided. How rare, and how brave, to arrive early.');
    return;
  }
  const c = await choose(['What does the Court want?', 'About the chains...', `Standing (${FACTION_IDS.map((f) => repTier(f)[0]).join('/')})`, 'Leave']);
  if (c === 0) await say(N, 'The Anvil Court wants what it has always wanted: that what is forged here holds. The Delvers want ore. The Wardens want rest. I would like all three.');
  else if (c === 1) await say(N, 'Old Goran has been talking. He means well. The chains held. That is all a chain is for.');
  else if (c === 2) await say(N, standing());
};
SCRIPTS.isolt = async function isolt() {
  await say('Isolt', cyc('isoltN', ['Master Brannoch says I hit the metal like I am angry at it. I tell him that is the technique.', 'One day I will forge something that sings. For now I make nails. Excellent nails.']));
};
SCRIPTS.maelis = async function maelis() {
  const N = 'Maelis';
  const rumours = [
    'They say the dragon\'s ash falls on the Peaks every autumn. Good for the soil. Terrible for the laundry.',
    'A Warden swears he saw the Winter itself walking the old road with a lantern. It was Pell. Pell does that.',
    'The Anvil Court has not left the Hall for two nights. Something in the archive has them rattled.',
    'If you want to learn who in this city owes whom, buy a round for the Delvers and sit very still.',
  ];
  await say(N, 'The Last Lantern. We have ale, stew, and secrets, in that order of price.');
  const c = await choose(['Hear a rumour', 'Rest (30G)', 'Leave']);
  if (c === 0) await say(N, cyc('maelisN', rumours));
  else if (c === 1) {
    if (S.gold < 30) { sfx.play('nostamina'); await say(N, 'Thirty. I do not run a charity. I run a tavern.'); return; }
    S.gold -= 30; S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; sfx.play('levelup'); bus.emit('toast', 'YOU REST AT THE LAST LANTERN', 8);
  }
};
SCRIPTS.orrin = async function orrin() {
  const N = 'Orrin', q = S.quests.silence;
  if (q.status === 'active' && S.flags.kragnarDead) {
    await say(N, 'Kragnar. Our King under the Lode. So that is who dug. ...He was not a monster. He was a miner who would not stop.');
    await say(N, 'The Guild owes you a debt that does not fit in a purse. Take this anyway.');
    addGold(300); addItem('gem_ruby', 2); addRep('delvers', 25); finishQuest('silence'); return;
  }
  if (q.status === 'inactive') {
    await say(N, 'You walk like a Delver and look like a ghost. Good. The mines have gone silent, and I have buried enough of my own to know what silence means.');
    await say(N, 'Go down. Find out what took the lanterns. I will make it worth the dark.');
    const c = await choose(['I will go down.', 'Not yet.']);
    if (c === 0) { startQuest('silence'); await say(N, 'The gate is by the quarter\'s east road. Light your lamp. Count your steps back.'); }
    return;
  }
  const c = await choose(['Guild goods', 'Standing', 'Leave']);
  if (c === 0) {
    const wares = [{ id: 'ash_iron', price: 36, n: 3, name: 'Ash Iron x3' }, { id: 'hp_potion_g', price: 85 }, ...(rep('delvers') >= 45 ? [{ id: 'gem_ruby', price: 150 }, { id: 'gem_onyx', price: 160 }] : [])];
    await buyMenu(N, wares);
  } else if (c === 1) await say(N, `${FACTIONS.delvers.name}: ${repTier('delvers')} (${rep('delvers')}). Trust runs deeper than gold, but only by a little.`);
};

// ---------------------------------------------------------------------------------------------------- the Emberforge
export const EMBERFORGE = [
  { id: 'ember_blade', mats: { ash_iron: 6, ember_ore: 2 }, gold: 300, need: null },
  { id: 'ember_axe', mats: { ash_iron: 6, ember_ore: 2 }, gold: 320, need: ['delvers', 20] },
  { id: 'ember_spear', mats: { ash_iron: 5, ember_ore: 2 }, gold: 300, need: ['wardens', 20] },
  { id: 'ember_mail', mats: { ash_iron: 10, ember_ore: 3 }, gold: 480, need: ['anvil', 20] },
  { id: 'ember_bulwark', mats: { ash_iron: 8, ember_ore: 2 }, gold: 340, need: ['anvil', 20] },
];
export const canForge = (r) => !!S.flags.emberforged && (!r.need || rep(r.need[0]) >= r.need[1]);
// Forge one Emberforged item. Returns 'ok', 'locked' (needs the core or the faction's trust) or 'short' (materials / gold).
export function forgeEmber(id) {
  const r = EMBERFORGE.find((x) => x.id === id);
  if (!r || !canForge(r)) return 'locked';
  if (S.gold < r.gold || !Object.entries(r.mats).every(([m, n]) => count(m) >= n)) return 'short';
  S.gold -= r.gold; for (const [m, n] of Object.entries(r.mats)) removeItem(m, n);
  addItem(r.id, 1, true);
  return 'ok';
}
export async function emberforgeMenu(who) {
  await listScreen({
    title: 'THE EMBERFORGE', hint: 'E FORGE   ESC DONE',
    rows: () => EMBERFORGE.map((r) => {
      const it = ITEMS[r.id], have = Object.entries(r.mats).every(([m, n]) => count(m) >= n), ok = canForge(r) && have && S.gold >= r.gold;
      const lock = !S.flags.emberforged ? 'NEEDS THE CORE' : r.need && rep(r.need[0]) < r.need[1] ? `NEEDS ${FACTIONS[r.need[0]].short} ${r.need[1]}` : null;
      return {
        id: r.id, name: it.name, tag: r.gold + 'G', ok, tagCol: ok ? 13 : 11, sub: lock || (ok ? 'READY' : 'NEED MATERIALS'),
        lines: [...statLines(r.id), ...Object.entries(r.mats).map(([m, n]) => [`${ITEMS[m].name.toUpperCase()} ${count(m)}/${n}`, count(m) >= n ? 8 : 11]), [`GOLD ${S.gold}/${r.gold}`, S.gold >= r.gold ? 8 : 11]],
        desc: it.desc,
      };
    }),
    onSelect: (i, ui) => {
      const res = forgeEmber(EMBERFORGE[i].id);
      if (res === 'locked') { sfx.play('nostamina'); ui.say('THE FORGE WILL NOT WAKE FOR YOU YET', 11); }
      else if (res === 'short') { sfx.play('nostamina'); ui.say('NEED MORE MATERIALS OR GOLD', 11); }
      else { sfx.play('levelup'); bus.emit('toast', 'EMBERFORGED: ' + ITEMS[EMBERFORGE[i].id].name.toUpperCase(), 12); ui.say('FORGED', 8); }
    },
  });
}

SCRIPTS.brannoch = async function brannoch() {
  const N = 'Brannoch', q = S.quests.anvilcore;
  if (q.status === 'active' && count('kragnar_core') > 0) {
    await say(N, 'That is it. That is the core. Warm as a heartbeat.');
    removeItem('kragnar_core', 1); S.flags.emberforged = true; addRep('anvil', 25); addItem('ember_blade'); finishQuest('anvilcore');
    await say(N, 'The Great Anvil will wake for you now. Bring me Ash Iron and Emberheart Ore, and I will teach it your name. Take this blade; I made it while I waited.');
    return;
  }
  if (q.status === 'inactive') {
    await say(N, 'Hands like that have never held a hammer. Good. Fewer bad habits.');
    await say(N, 'The Great Anvil sleeps. It wakes for one thing: the core of Kragnar, the king under the lode. Fetch it, and I will give you gear no smith in the Reach can touch.');
    const c = await choose(['I will bring the core.', 'Later.']);
    if (c === 0) { startQuest('anvilcore'); await say(N, 'Kragnar is below the mines. Do not hit him with anything that rusts.'); }
    return;
  }
  for (;;) {
    const c = await choose(['Emberforge', 'Temper gear', 'Repair / reforge', 'Enchant', 'Leave']);
    if (c === 0) await emberforgeMenu(N);
    else if (c === 1) { const s = await choose(['Weapon', 'Armour', 'Back']); if (s < 2) await upgradeMenu(N, s === 0 ? 'weapon' : 'armor'); }
    else if (c === 2) { const s = await choose(['Repair', 'Reforge', 'Back']); if (s === 0) await repairMenu(N); else if (s === 1) await reforgeMenu(N); }
    else if (c === 3) await enchantMenu(N);
    else return;
  }
};

// ---------------------------------------------------------------------------------------------------- gem sockets
export async function socketMenu(who) {
  const slots = ['weapon', 'offhand', 'bow', 'armor'].filter((sl) => S.equip[sl] && socketCount(S.equip[sl]) > 0);
  if (!slots.length) { await say(who, 'Nothing you carry has a socket worth the name. Wear something with some steel in it.'); return; }
  for (;;) {
    const labels = slots.map((sl) => { const id = S.equip[sl]; return `${ITEMS[id].name} (${socketed(id).filter(Boolean).length}/${socketCount(id)})`; });
    const i = await pick(labels, 'Done');
    if (i < 0) return;
    const id = S.equip[slots[i]];
    for (;;) {
      const a = socketed(id), opts = a.map((g, k) => (g ? `Remove ${ITEMS[g].name}` : `Set a gem (socket ${k + 1})`));
      const k = await pick(opts, 'Back');
      if (k < 0) break;
      if (a[k]) { removeGem(id, k); recalc(); sfx.play('equip'); continue; }
      const gems = gemList();
      if (!gems.length) { await say(who, 'You have no gems. Dunmar sells them. The mines give them.'); continue; }
      const g = await pick(gems.map((x) => `${ITEMS[x].name} x${count(x)}`), 'Back');
      if (g < 0) continue;
      if (insertGem(id, gems[g])) { recalc(); sfx.play('levelup'); bus.emit('toast', `${ITEMS[gems[g]].name.toUpperCase()} SET`, 15); }
    }
  }
}
SCRIPTS.tamsin = async function tamsin() {
  const N = 'Tamsin';
  await say(N, cyc('tamsinN', ['A stone is a promise the earth made in a hurry. I just remind it.', 'Rubies for the blade, onyx for the plate, sapphires for the mind. Amber if you are tired of being tired.', 'Do not ask me what the runes say. Ask me what they want.']));
  const c = await choose(['Set or remove gems', 'Buy / sell', 'Leave']);
  if (c === 0) await socketMenu(N);
  else if (c === 1) await buyMenu(N, [{ id: 'gem_topaz', price: 150 }, { id: 'gem_amber', price: 110 }, { id: 'gem_sapphire', price: 120 }]);
};
