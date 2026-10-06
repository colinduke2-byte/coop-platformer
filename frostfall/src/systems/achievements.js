// Trophies: milestones that unlock on their own as you play. Checked a couple of times a second.
import { S } from './state.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';

const kills = (k) => S.kills?.[k] || 0;
const total = () => Object.values(S.kills || {}).reduce((a, b) => a + b, 0);
const hearts = () => Object.values(S.hearts || {}).filter(Boolean).length;

export const TROPHIES = [
  { id: 'first_blood', name: 'First Blood', desc: 'Defeat your first foe.', test: () => total() >= 1 },
  { id: 'hundred', name: 'Hundred Fallen', desc: 'Defeat 100 foes.', test: () => total() >= 100 },
  { id: 'wolfbane', name: 'Wolfbane', desc: 'Defeat 20 wolves.', test: () => kills('wolf') >= 20 },
  { id: 'bearslayer', name: 'Bear Slayer', desc: 'Fell a snow bear.', test: () => kills('bear') >= 1 },
  { id: 'wyvernbane', name: 'Wyvernbane', desc: 'Bring down 5 wyverns.', test: () => kills('wyvern') >= 5 },
  { id: 'grimfang', name: 'Pack Breaker', desc: 'Face Grimfang.', test: () => !!S.flags.grimfangDone },
  { id: 'wyrm', name: 'Heart of Ice', desc: 'Defeat the Rime Wyrm.', test: () => !!S.flags.wyrmDead },
  { id: 'keep', name: 'Keep Breaker', desc: 'Defeat the Warlord of Ironwatch.', test: () => !!S.flags.warlordDead },
  { id: 'chapel', name: 'Deep Calm', desc: 'Defeat the Tidemother.', test: () => !!S.flags.tideDead },
  { id: 'root', name: 'Root and Branch', desc: 'Defeat the Ashen Root.', test: () => !!S.flags.rootDead },
  { id: 'hearts4', name: 'Four Hearts', desc: 'Claim all four Hearts of the Hollow.', test: () => hearts() >= 4 },
  { id: 'winter', name: 'Break the Winter', desc: 'Defeat the Long Winter.', test: () => !!S.flags.winterDead },
  { id: 'emberhold', name: 'City of Embers', desc: 'Climb the Peak Road and enter Emberhold.', test: () => !!S.flags.arrivedEmberhold },
  { id: 'kragnar', name: 'Under the Lode', desc: 'Defeat Kragnar the Hollowed.', test: () => !!S.flags.kragnarDead },
  { id: 'threeseals', name: 'Three Houses', desc: 'Win a seal from the Delvers, the Anvil Court and the Wardens.', test: () => ['silence', 'anvilcore', 'roadwatch'].every((q) => S.quests[q]?.status === 'done') },
  { id: 'sovereign', name: 'Crown of Cinders', desc: 'Defeat the Ashen Sovereign in the Forge of the First Fire.', test: () => !!S.flags.sovereignDead },
  { id: 'ember_end', name: 'The Last Choice', desc: 'Decide the fate of the First Fire.', test: () => !!S.flags.finalChoice },
  { id: 'coastgone', name: 'Down With the Ship', desc: 'Defeat Admiral Veyl in Tidebreak Cavern.', test: () => !!S.flags.admiralDead },
  { id: 'kingrest', name: 'Remembered', desc: 'Defeat the Hollow King in the Hollow Sepulchre.', test: () => !!S.flags.hollowKingDead },
  { id: 'regions4', name: 'Far Horizons', desc: 'Set foot in the Reach, the Peaks, the Coast and the Old Kingdom.', test: () => !!S.flags.arrivedEmberhold && !!S.flags.arrivedCoast && !!S.flags.arrivedKingdom },
  { id: 'dragon', name: 'Dragonslayer', desc: 'Defeat Skaldrath, the Ember Wyrm.', test: () => !!S.flags.dragonDead },
  { id: 'camps', name: 'Camp Cleaner', desc: 'Clear 3 bandit camps.', test: () => (S.run?.camps || 0) >= 3 },
  { id: 'barrows', name: 'Grave Robber', desc: 'Conquer 2 barrows.', test: () => (S.run?.barrows || 0) >= 2 },
  { id: 'chests', name: 'Treasure Hunter', desc: 'Open 10 chests.', test: () => (S.run?.chests || 0) >= 10 },
  { id: 'angler', name: 'Patient Angler', desc: 'Catch 10 fish.', test: () => (S.fish?.caught || 0) >= 10 },
  { id: 'glasspike', name: 'Glass Pike', desc: 'Land a rare Glass Pike.', test: () => (S.fish?.rare || 0) >= 1 },
  { id: 'chef', name: 'Camp Cook', desc: 'Cook 5 meals at a campfire.', test: () => (S.fish?.cooked || 0) >= 5 },
  { id: 'mapped', name: 'X Marks the Spot', desc: 'Dig up a treasure map.', test: () => (S.fish?.maps || 0) >= 1 },
  { id: 'arena5', name: 'Arena Contender', desc: 'Survive 5 waves in the Hollow Arena.', test: () => (S.arena?.best || 0) >= 5 },
  { id: 'arena10', name: 'Arena Champion', desc: 'Survive 10 waves in the Hollow Arena.', test: () => (S.arena?.best || 0) >= 10 },
  { id: 'hound', name: "Winter's Best Friend", desc: 'Befriend a frost hound.', test: () => !!S.flags.houndOwned },
  { id: 'rich', name: 'Dragon Hoard', desc: 'Hold 2000 gold at once.', test: () => S.gold >= 2000 },
  { id: 'level10', name: 'Seasoned', desc: 'Reach character level 10.', test: () => (S.charLevel || 1) >= 10 },
  { id: 'nemesis', name: 'Settled Scores', desc: 'Defeat the creature that killed you.', test: () => (S.nemesisSlain || 0) >= 1 },
  { id: 'ngplus', name: 'Another Winter', desc: 'Begin New Game+.', test: () => (S.ngPlus || 0) >= 1 },
];

export const trophyCount = () => TROPHIES.filter((t) => S.trophies?.[t.id]).length;

export function checkTrophies() {
  S.trophies ||= {};
  for (const t of TROPHIES) {
    if (S.trophies[t.id]) continue;
    let ok = false;
    try { ok = t.test(); } catch { ok = false; }
    if (ok) {
      S.trophies[t.id] = true;
      bus.emit('toast', 'TROPHY: ' + t.name.toUpperCase(), 13);
      sfx.play('quest');
    }
  }
}

// Cloak colours, unlocked by trophies (Pause > System > CLOAK).
export const CLOAKS = [
  { col: 11, name: 'Ember Red', trophy: null },
  { col: 15, name: 'Frost Blue', trophy: 'first_blood' },
  { col: 8, name: 'Pine Green', trophy: 'wolfbane' },
  { col: 13, name: 'Dragon Gold', trophy: 'dragon' },
  { col: 14, name: 'Heart Violet', trophy: 'hearts4' },
  { col: 6, name: 'Winterwhite', trophy: 'winter' },
];
export const cloakUnlocked = (c) => !c.trophy || !!S.trophies?.[c.trophy];
export const unlockedCloaks = () => CLOAKS.filter(cloakUnlocked);
export const currentCloak = () => { const c = CLOAKS.find((x) => x.col === S.cloak); return c && cloakUnlocked(c) ? c : CLOAKS[0]; };
