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
