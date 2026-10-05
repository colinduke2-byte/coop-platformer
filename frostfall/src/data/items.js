// Item database. icon = [drawing kind, colour index] (see art/sprites.js buildIcon).
export const ITEMS = {
  hp_potion: { name: 'Health Potion', type: 'potion', icon: ['potion', 11], restore: 'hp', amount: 50, value: 25, desc: 'Restores 50 health.' },
  mp_potion: { name: 'Mana Potion', type: 'potion', icon: ['potion', 15], restore: 'mp', amount: 60, value: 25, desc: 'Restores 60 mana.' },
  sp_potion: { name: 'Stamina Potion', type: 'potion', icon: ['potion', 8], restore: 'sp', amount: 70, value: 20, desc: 'Restores 70 stamina.' },

  rusty_sword: { name: 'Rusty Sword', type: 'weapon', icon: ['sword', 3], dmg: 9, value: 8, desc: 'Pitted and dull. Still a sword.' },
  iron_sword: { name: 'Iron Sword', type: 'weapon', icon: ['sword', 4], dmg: 13, value: 40, desc: 'A sturdy blade of the north.' },
  steel_sword: { name: 'Steel Sword', type: 'weapon', icon: ['sword', 5], dmg: 17, value: 90, desc: 'Well-forged and keen.' },
  nordic_blade: { name: 'Nordic Blade', type: 'weapon', icon: ['sword', 15], dmg: 22, value: 200, desc: 'Etched with frost runes.' },

  hunting_bow: { name: 'Hunting Bow', type: 'bow', icon: ['bow', 10], dmg: 8, value: 20, desc: 'Light and quiet.' },
  long_bow: { name: 'Elder Longbow', type: 'bow', icon: ['bow', 8], dmg: 13, value: 120, desc: 'Pulls hard, flies far.' },

  fur_tunic: { name: 'Fur Tunic', type: 'armor', icon: ['armor', 9], armor: 0.08, value: 15, desc: 'Warm. Absorbs 8% damage.' },
  iron_cuirass: { name: 'Iron Cuirass', type: 'armor', icon: ['armor', 4], armor: 0.18, value: 70, desc: 'Absorbs 18% damage.' },
  nordic_plate: { name: 'Nordic Plate', type: 'armor', icon: ['armor', 15], armor: 0.28, value: 220, desc: 'Absorbs 28% damage.' },

  warm_amulet: { name: 'Amulet of Warmth', type: 'charm', icon: ['charm', 12], maxHp: 25, value: 60, desc: '+25 max health.' },
  mana_ring: { name: 'Ring of Insight', type: 'charm', icon: ['charm', 14], maxMp: 30, value: 60, desc: '+30 max mana.' },
  bear_charm: { name: 'Bear Charm', type: 'charm', icon: ['charm', 10], maxSp: 30, value: 60, desc: '+30 max stamina.' },

  frostheart: { name: 'Frostheart', type: 'quest', icon: ['relic', 15], value: 0, desc: 'A crystal that never stops being cold.' },
};

export const SLOT_OF = { weapon: 'weapon', bow: 'bow', armor: 'armor', charm: 'charm' };
export const SLOT_NAMES = { weapon: 'SWORD', bow: 'BOW', armor: 'ARMOR', charm: 'CHARM' };
export const isEquipable = (id) => !!SLOT_OF[ITEMS[id]?.type];
export const iconKey = (id) => 'icon_' + id;
