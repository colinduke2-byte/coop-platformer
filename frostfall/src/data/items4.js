// Items of the Embergreen Vale and the Sunscorch Reach: materials, boss and mini-boss gear, shop stock. Same shapes as items.js (icons reuse the
// generated gear shapes with a palette colour: ['sword_nordic', 15] is that sword in cyan).
import { ITEMS } from './items.js';

Object.assign(ITEMS, {
  // ---- materials
  thornvine: { name: 'Thornvine', type: 'ingredient', icon: ['lily', 8], value: 18, desc: 'Springy green cord with a barb every inch. Crafting and trade.' },
  honeycomb: { name: 'Wild Honeycomb', type: 'ingredient', icon: ['dust', 13], value: 22, desc: 'Alchemy: warm, sticky and defended. Sells well.' },
  bloom_petal: { name: 'Blightbloom Petal', type: 'ingredient', icon: ['lily', 14], value: 20, desc: 'Alchemy: a deep purple petal that smells faintly of rot and sugar.' },
  dew_essence: { name: 'Dew Essence', type: 'ingredient', icon: ['dust', 15], value: 28, desc: 'A drop that does not evaporate. Alchemy and trade.' },
  moss_heart: { name: 'Moss Heart', type: 'ingredient', icon: ['ore', 8], value: 40, desc: 'A fist of living moss from a hulk. It is warm. Crafting and trade.' },
  sand_glass: { name: 'Sunglass', type: 'ingredient', icon: ['gem', 13], value: 30, desc: 'Sand fused by something far hotter than the sun. Crafting and trade.' },
  stinger: { name: 'Scorpion Stinger', type: 'ingredient', icon: ['fang', 11], value: 24, desc: 'Alchemy: a curved black barb. Poison and trade.' },
  dust_shard: { name: 'Whirl Shard', type: 'ingredient', icon: ['dust', 10], value: 20, desc: 'A scrap of wind that decided to stay. Alchemy and trade.' },
  sun_gold: { name: 'Sun Gold', type: 'ingredient', icon: ['ingot', 13], value: 60, desc: 'Soft bright metal from the old desert kings. Crafting and trade.' },
  linen_wrap: { name: 'Tomb Linen', type: 'ingredient', icon: ['dust', 5], value: 14, desc: 'Strips of dry cloth that still smell of cedar. Crafting and trade.' },
  valeroot: { name: 'Valeroot', type: 'ingredient', icon: ['lily', 8], value: 14, desc: 'Alchemy: a sweet green root from the Embergreen Vale. Sells well.' },
  sunpetal: { name: 'Sunpetal', type: 'ingredient', icon: ['lily', 13], value: 16, desc: 'Alchemy: a gold flower that turns to follow the light. Sells well.' },
  // ---- the Blight Mother
  blight_heart: { name: 'Heart of the Grove', type: 'quest', icon: ['gem', 8], value: 0, desc: 'A green seed the size of a fist, beating very slowly. The Blight Mother kept it the way a mother keeps a child.' },
  bramble_blade: { name: 'Bramble Blade', type: 'weapon', icon: ['sword_nordic', 8], dmg: 33, crit: 0.06, inflict: [{ type: 'bleed', chance: 0.3, t: 4, dps: 3 }], sockets: 2, value: 640, desc: 'A sword grown, not forged. Thorns along the spine make wounds that keep bleeding.' },
  heartwood_bow: { name: 'Heartwood Bow', type: 'bow', icon: ['bow_hunting', 8], dmg: 22, value: 600, desc: 'Cut from the grove tree. It wants to be drawn, and it wants to be released.' },
  verdant_mail: { name: 'Verdant Mail', type: 'armor', weight: 'light', icon: ['armor_wardencuir', 8], armor: 0.2, maxHp: 25, moveMul: 1.05, sockets: 2, value: 620, desc: 'Light. Absorbs 20%, +25 health, +5% speed. Overlapping leaves that harden when struck.' },
  leaf_cowl: { name: 'Leaf Cowl', type: 'helmet', weight: 'light', icon: ['helm_hood', 8], armor: 0.05, maxHp: 10, detectMul: 0.9, value: 420, desc: 'A hood of living leaves. Absorbs 5%, +10 health, harder to spot.' },
  moss_shield: { name: 'Mossback Shield', type: 'shield', icon: ['shield_bulwark', 8], block: 0.78, cost: 0.7, value: 560, desc: 'A shield of bark and moss. Blocks 78% and costs little stamina to hold.' },
  bloom_charm: { name: 'Everbloom Charm', type: 'charm', icon: ['charm_clover', 14], maxHp: 20, maxMp: 20, value: 520, desc: '+20 health and mana. The flower inside has never wilted.' },
  // ---- the Vault Sovereign
  vault_seal: { name: 'Seal of the Vault', type: 'quest', icon: ['gem', 13], value: 0, desc: 'A gold disc worn smooth by a thousand hands. It opens what the desert kings closed.' },
  sun_scimitar: { name: 'Sunbrand Scimitar', type: 'weapon', icon: ['sword_cutlass', 13], dmg: 34, crit: 0.08, elem: { type: 'fire', power: 6 }, sockets: 2, value: 700, desc: 'A curved blade that stays warm in the cold. Every cut sears.' },
  dune_bow: { name: 'Dunerunner Bow', type: 'bow', icon: ['bow_long', 10], dmg: 23, value: 620, desc: 'Light, recurved, and fast to draw. Made for hunting from a moving camel.' },
  sunplate: { name: 'Sunplate', type: 'armor', weight: 'heavy', icon: ['armor_courtplate', 13], armor: 0.4, maxHp: 25, moveMul: 0.92, sockets: 2, value: 780, desc: 'Absorbs 40%, +25 health, -8% speed. Gold-washed plate that shrugs off heat and cold.' },
  veil_helm: { name: 'Desert Veil', type: 'helmet', weight: 'light', icon: ['helm_hood', 10], armor: 0.05, moveMul: 1.04, detectMul: 0.88, value: 440, desc: 'A scarf and a cap in sand colours. Absorbs 5%, +4% speed, harder to spot.' },
  glyph_shield: { name: 'Glyphward', type: 'shield', icon: ['shield_warden', 13], block: 0.84, cost: 0.8, value: 640, desc: 'Gold glyphs ward the face. Blocks 84%.' },
  scarab_charm: { name: 'Golden Scarab', type: 'charm', icon: ['charm_sun', 13], goldMul: 1.15, crit: 0.04, value: 560, desc: '+15% gold found, +4% crit. Fortune favours the shiny.' },
  // ---- the ending choice: the weapon in the vault
  sunbreaker: { name: 'Sunbreaker', type: 'weapon2h', style: 'great', icon: ['sword_gs_king', 13], dmg: 58, elem: { type: 'fire', power: 12 }, sockets: 3, value: 1800, desc: 'Two-handed. The desert kings\' answer to the cold: a sword that burns as it falls. It will melt the Winter, and the ice with it.' },
  winterward: { name: 'Winterward', type: 'charm', icon: ['charm_manaring', 15], maxHp: 40, maxMp: 40, value: 1500, desc: '+40 health and mana. The vault\'s second gift: a quiet ward that lets the Winter pass through you instead of over you.' },
  tome_sunbeam: { name: 'Tome of the Sunbeam', type: 'tome', teach: 'sunbeam', icon: ['scroll', 13], value: 420, desc: 'Read (E): learn Sunbeam, a column of light that falls where you aim.' },
  // ---- mini-boss prizes (one each)
  thorn_crown: { name: 'Thorncrown', type: 'helmet', weight: 'medium', icon: ['helm_circlet', 8], armor: 0.07, crit: 0.04, maxHp: 10, value: 520, desc: 'Absorbs 7%, +10 health, +4% crit. Taken from the Elder Thornwood; it still tries to take root.' },
  queens_sting: { name: "Vespera's Sting", type: 'weapon', style: 'dagger', icon: ['dagger_stiletto', 13], dmg: 22, swing: 0.7, costMul: 0.75, crit: 0.2, inflict: [{ type: 'poison', chance: 0.4, t: 5, dps: 3 }], value: 560, desc: 'A hornet queen\'s barb on a handle of wax. Fast, and the poison lingers.' },
  hulk_heart: { name: 'Hulkheart Plate', type: 'armor', weight: 'heavy', icon: ['armor_bulwark', 8], armor: 0.38, maxHp: 30, moveMul: 0.92, value: 720, desc: 'Absorbs 38%, +30 health, -8% speed. Moss still grows in the seams.' },
  maw_tooth: { name: 'Sandmaw Tooth', type: 'weapon2h', style: 'halberd', icon: ['halberd_reaper', 12], dmg: 46, swing: 1.2, costMul: 1.35, pierce: 0.4, sockets: 2, value: 900, desc: 'Two-handed. A fang as long as a spear. The plant pierces 40% of armour.' },
  ankhet_ring: { name: 'Ring of Ankhet', type: 'charm', icon: ['charm_signet', 11], maxHp: 15, crit: 0.05, value: 500, desc: '+15 health, +5% crit. A tomb queen\'s signet; the scorpion engraved on it blinks.' },
  dust_cloak: { name: 'Dustlord Cloak', type: 'armor', weight: 'light', icon: ['armor_cloak', 10], armor: 0.17, moveMul: 1.12, detectMul: 0.8, sockets: 1, value: 600, desc: 'Light. Absorbs 17%, +12% speed, harder to notice. It moves a little even when you do not.' },
  sula_dagger: { name: "Red Sula's Kris", type: 'weapon', style: 'dagger', icon: ['dagger_kris', 11], dmg: 21, swing: 0.7, costMul: 0.75, crit: 0.22, goldMul: 1.1, value: 540, desc: 'A wavy blade for reaching into purses. +10% gold found.' },
  karrow_blade: { name: "Karrow's Talwar", type: 'weapon', icon: ['sword_steel', 13], dmg: 35, crit: 0.06, value: 620, desc: 'A well-kept captain\'s sword with a gold-wrapped hilt.' },
});
