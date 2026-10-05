// Item database. icon = [drawing kind, colour index] (see art/sprites.js buildIcon).
export const ITEMS = {
  hp_potion: { name: 'Health Potion', type: 'potion', icon: ['potion', 11], restore: 'hp', amount: 50, value: 25, desc: 'Restores 50 health.' },
  mp_potion: { name: 'Mana Potion', type: 'potion', icon: ['potion', 15], restore: 'mp', amount: 60, value: 25, desc: 'Restores 60 mana.' },
  sp_potion: { name: 'Stamina Potion', type: 'potion', icon: ['potion', 8], restore: 'sp', amount: 70, value: 20, desc: 'Restores 70 stamina.' },

  rusty_sword: { name: 'Rusty Sword', type: 'weapon', icon: ['sword', 3], dmg: 9, value: 8, desc: 'Pitted and dull. Still a sword.' },
  iron_sword: { name: 'Iron Sword', type: 'weapon', icon: ['sword', 4], dmg: 13, value: 40, desc: 'A sturdy blade of the north.' },
  steel_sword: { name: 'Steel Sword', type: 'weapon', icon: ['sword', 5], dmg: 17, value: 90, desc: 'Well-forged and keen.' },
  nordic_blade: { name: 'Nordic Blade', type: 'weapon', icon: ['sword', 15], dmg: 22, value: 200, desc: 'Etched with frost runes.' },

  hunting_knife: { name: 'Hunting Knife', type: 'weapon', icon: ['sword', 10], dmg: 6, swing: 0.8, costMul: 0.8, value: 18, desc: 'Quick and light. Fine in the off-hand.' },
  iron_greatsword: { name: 'Iron Greatsword', type: 'weapon2h', icon: ['sword', 4], dmg: 21, swing: 1.35, costMul: 1.5, sizeAdd: 5, value: 120, desc: 'Two-handed. Slow, wide, brutal.' },
  nordic_greatsword: { name: 'Nordic Greatsword', type: 'weapon2h', icon: ['sword', 15], dmg: 31, swing: 1.35, costMul: 1.5, sizeAdd: 6, value: 320, desc: 'Two-handed. Frost-etched steel.' },

  wooden_shield: { name: 'Wooden Shield', type: 'shield', icon: ['shield', 9], block: 0.6, cost: 0.9, value: 30, desc: 'Hold F to block. Absorbs 60%.' },
  iron_shield: { name: 'Iron Shield', type: 'shield', icon: ['shield', 4], block: 0.72, cost: 0.8, value: 85, desc: 'Hold F to block. Absorbs 72%.' },
  nordic_shield: { name: 'Nordic Shield', type: 'shield', icon: ['shield', 15], block: 0.82, cost: 0.7, value: 240, desc: 'Hold F to block. Absorbs 82%.' },

  hunting_bow: { name: 'Hunting Bow', type: 'bow', icon: ['bow', 10], dmg: 8, value: 20, desc: 'Light and quiet.' },
  long_bow: { name: 'Elder Longbow', type: 'bow', icon: ['bow', 8], dmg: 13, value: 120, desc: 'Pulls hard, flies far.' },

  fur_tunic: { name: 'Fur Tunic', type: 'armor', icon: ['armor', 9], armor: 0.08, value: 15, desc: 'Warm. Absorbs 8% damage.' },
  iron_cuirass: { name: 'Iron Cuirass', type: 'armor', icon: ['armor', 4], armor: 0.18, value: 70, desc: 'Absorbs 18% damage.' },
  nordic_plate: { name: 'Nordic Plate', type: 'armor', icon: ['armor', 15], armor: 0.28, value: 220, desc: 'Absorbs 28% damage.' },

  warm_amulet: { name: 'Amulet of Warmth', type: 'charm', icon: ['charm', 12], maxHp: 25, value: 60, desc: '+25 max health.' },
  mana_ring: { name: 'Ring of Insight', type: 'charm', icon: ['charm', 14], maxMp: 30, value: 60, desc: '+30 max mana.' },
  bear_charm: { name: 'Bear Charm', type: 'charm', icon: ['charm', 10], maxSp: 30, value: 60, desc: '+30 max stamina.' },

  lockpick: { name: 'Lockpick', type: 'misc', icon: ['pick', 5], value: 6, desc: 'For locked chests. Breaks on a bad pick.' },
  iron_ingot: { name: 'Iron Ingot', type: 'misc', icon: ['ingot', 4], value: 12, desc: 'Smiths use these to temper gear.' },
  wolf_fang: { name: 'Wolf Fang', type: 'ingredient', icon: ['fang', 6], value: 8, desc: 'Alchemy: restores stamina.' },
  bone_dust: { name: 'Bone Dust', type: 'ingredient', icon: ['dust', 5], value: 6, desc: 'Alchemy: used for ward and stamina brews.' },
  snowberry: { name: 'Snowberry', type: 'ingredient', icon: ['berry', 11], value: 4, desc: 'Alchemy: restores health.' },
  frost_lily: { name: 'Frost Lily', type: 'ingredient', icon: ['lily', 15], value: 7, desc: 'Alchemy: restores mana.' },
  frostheart: { name: 'Frostheart', type: 'quest', icon: ['relic', 15], value: 0, desc: 'A crystal that never stops being cold.' },
};

export const SLOT_OF = { weapon: 'weapon', weapon2h: 'weapon', shield: 'offhand', bow: 'bow', armor: 'armor', charm: 'charm' };
export const SLOT_NAMES = { weapon: 'WEAPON', offhand: 'OFFHAND', bow: 'BOW', armor: 'ARMOR', charm: 'CHARM' };
export const isEquipable = (id) => !!SLOT_OF[ITEMS[id]?.type];
export const iconKey = (id) => 'icon_' + id;
