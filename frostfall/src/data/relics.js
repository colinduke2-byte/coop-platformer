// The Hollow Relics: eight keepsakes of the Hollow Kings scattered across the Reach. Each is a lore entry; collecting
// them pays out at 3, 6 and 8 (see systems/relics.js).
export const RELICS = [
  { id: 'relic_signet', name: 'Frozen Signet', col: 15, text: ['A ring of blue ice that never melts. Inside it, a tiny crown.', 'The first Hollow King sealed his oaths with it. The oaths outlived him.'] },
  { id: 'relic_horn', name: 'Cracked War Horn', col: 13, text: ['A horn split along its length. It still sounds, a little, if you breathe on it.', 'It called the Four Wardens to the Winter Throne on the last night of the old world.'] },
  { id: 'relic_mirror', name: 'Black Mirror Shard', col: 14, text: ['A shard of dark glass. You see yourself in it, older.', 'The Long Winter looked into this mirror once. It has not been the same since.'] },
  { id: 'relic_seed', name: 'Ember Seed', col: 12, text: ['A warm stone the size of an acorn. It ticks.', 'The Ember Wyrm dropped it, or perhaps laid it. Nobody in the village will say which.'] },
  { id: 'relic_lantern', name: 'Wardens\' Lantern', col: 13, text: ['A lantern with no flame, only a steady gold glow.', 'The wardens carried it through the blizzards. It always pointed home.'] },
  { id: 'relic_crown', name: 'Antler Circlet', col: 10, text: ['A circlet of pale antlers. It fits any head.', 'Worn by the hunt-queens, who kept the elk and the wolves at peace with each other.'] },
  { id: 'relic_tooth', name: 'Troll Tooth Charm', col: 8, text: ['A tooth as long as your hand, drilled and strung on gut.', 'Bridge trolls collect these from the fallen. This one is somebody\'s trophy. Now it is yours.'] },
  { id: 'relic_map', name: 'Star Chart of the Reach', col: 6, text: ['A chart of the sky as the Kings saw it, with the Hearts marked as stars.', 'One star on it is not on any sky you know. It is marked: still to come.'] },
];
export const RELIC_REWARDS = { 3: '+10 MAX HEALTH', 6: '+15 MAX MANA', 8: 'THE HOLLOW CROWN' };
