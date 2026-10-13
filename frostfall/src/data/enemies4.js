// Creatures of the Embergreen Vale and the Sunscorch Reach, plus region variants of familiar enemies and a handful of named mini-bosses.
// Registered into ENEMIES / INFLICTS / IMMUNE / BEASTS (imported once from world/regions4.js). Stat blocks follow enemies.js.
import { ENEMIES } from './enemies.js';
import { BEASTS } from './lore.js';
import { nativeSpec, registerNative } from '../art/native_registry.js';
import '../art/native/index.js';
import './items4.js';

const loot = (gold, drops) => ({ gold, drops });

Object.assign(ENEMIES, {
  // ======================================================================= the Embergreen Vale
  thornling: {
    name: 'Thornling', tex: 'spr_spider', sideOnly: true, ambush: true, bark: 'wolf', weak: { fire: 1.8, frost: 0.9 }, hp: 50, speed: 34, chase: 80, dmg: 13, detect: 70,
    kind: 'lunge', range: 40, windup: 0.42, atkDur: 0.25, recover: 0.7, cooldown: 0.9, kbResist: 0.2, lunge: 165,
    body: [10, 8, 3, 7], loot: loot([8, 20], [['thornvine', 0.6], ['hide', 0.1], ['hp_potion', 0.1]]),
  },
  hornet: {
    name: 'Meadow Hornet', tex: 'spr_wisp', sideOnly: true, fly: true, bark: 'wolf', weak: { fire: 1.5, frost: 1.2 }, hp: 14, speed: 58, chase: 118, dmg: 7, detect: 110,
    kind: 'lunge', range: 54, windup: 0.3, atkDur: 0.2, recover: 0.5, cooldown: 0.7, kbResist: 0, lunge: 230,
    body: [8, 6, 4, 6], loot: loot([1, 5], [['honeycomb', 0.2], ['stinger', 0.1]]),
  },
  blightbloom: {
    name: 'Blightbloom', tex: 'spr_shroom', sideOnly: true, stationary: true, bark: 'undead', weak: { fire: 1.8, frost: 0.9 }, hp: 58, speed: 0, chase: 0, dmg: 14, detect: 104,
    kind: 'cast', range: 110, keep: 0, zoneR: 20, zoneN: 3, zoneDelay: 0.95, windup: 0.8, atkDur: 0.1, recover: 0.6, cooldown: 2.4, kbResist: 0.9,
    body: [12, 8, 2, 7], loot: loot([8, 20], [['bloom_petal', 0.7], ['thornvine', 0.2]]),
  },
  dewsprite: {
    name: 'Dew Sprite', tex: 'spr_wisp', sideOnly: true, fly: true, bark: 'undead', weak: { shock: 1.4, fire: 1.2 }, hp: 24, speed: 30, chase: 52, dmg: 8, detect: 108,
    kind: 'cast', range: 104, keep: 72, zoneR: 14, zoneN: 1, zoneDelay: 0.8, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.6, kbResist: 0.1, heals: { every: 3, range: 100, pct: 0.1 },
    body: [8, 7, 4, 7], loot: loot([8, 18], [['dew_essence', 0.5], ['mp_potion', 0.2]]),
  },
  hedgeknight: {
    name: 'Hedge Knight', tex: 'spr_hedgeknight', shield: true, bark: 'human', weak: { fire: 1.5, shock: 1.1 }, hp: 72, speed: 26, chase: 40, dmg: 16, detect: 70,
    kind: 'melee', range: 21, windup: 0.62, atkDur: 0.16, recover: 0.65, cooldown: 0.75, kbResist: 0.5,
    body: [8, 7, 4, 9], loot: loot([14, 30], [['thornvine', 0.3], ['iron_ingot', 0.3], ['hp_potion', 0.25]]),
  },
  mosshulk: {
    name: 'Mosshulk', tex: 'spr_golem', sideOnly: true, regenRate: 0.02, bark: 'undead', weak: { fire: 1.6, frost: 1.1, shock: 0.8 }, hp: 190, speed: 18, chase: 30, dmg: 28, detect: 66,
    kind: 'melee', range: 26, windup: 1.0, atkDur: 0.18, recover: 0.9, cooldown: 0.9, kbResist: 0.8, crush: true,
    body: [12, 9, 2, 7], loot: loot([22, 44], [['moss_heart', 0.4], ['iron_ingot', 0.4], ['hp_potion_g', 0.1]]),
  },
  // ======================================================================= the Sunscorch Reach
  sandburrower: {
    name: 'Sand Burrower', tex: 'spr_worm', sideOnly: true, burrow: true, bark: 'wolf', weak: { frost: 1.3, shock: 1.1 }, hp: 74, speed: 40, chase: 86, dmg: 22, detect: 130,
    kind: 'melee', range: 22, windup: 0.5, atkDur: 0.2, recover: 0.7, cooldown: 0.8, kbResist: 0.5,
    body: [12, 8, 2, 7], loot: loot([10, 22], [['sand_glass', 0.3], ['bone_dust', 0.4], ['stinger', 0.1]]),
  },
  scorpion: {
    name: 'Sunscorch Scorpion', tex: 'spr_spider', sideOnly: true, bark: 'wolf', weak: { frost: 1.3, shock: 1.1 }, hp: 62, speed: 40, chase: 88, dmg: 17, detect: 86,
    kind: 'lunge', range: 40, windup: 0.4, atkDur: 0.25, recover: 0.7, cooldown: 0.9, kbResist: 0.3, lunge: 185,
    body: [10, 7, 3, 8], loot: loot([8, 20], [['stinger', 0.6], ['bone_dust', 0.2]]),
  },
  dustdevil: {
    name: 'Dust Devil', tex: 'spr_wisp', sideOnly: true, bark: 'wolf', weak: { frost: 1.3, shock: 1.2, fire: 0.8 }, hp: 42, speed: 44, chase: 100, dmg: 12, detect: 100,
    kind: 'melee', range: 20, windup: 0.3, atkDur: 0.2, recover: 0.5, cooldown: 0.4, kbResist: 0.05,
    body: [10, 12, 3, 3], loot: loot([6, 16], [['dust_shard', 0.5], ['sand_glass', 0.1]]),
  },
  sunsentinel: {
    name: 'Sun Sentinel', tex: 'spr_sunsentinel', scale: 1.35, armored: true, bark: 'undead', weak: { shock: 1.4, frost: 1.0, fire: 0.4 }, hp: 140, speed: 18, chase: 32, dmg: 28, detect: 70,
    kind: 'melee', range: 26, windup: 0.95, atkDur: 0.18, recover: 0.9, cooldown: 0.9, kbResist: 0.8, crush: true,
    body: [8, 7, 4, 9], loot: loot([22, 44], [['sun_gold', 0.3], ['sand_glass', 0.3], ['iron_ingot', 0.3]]),
  },
  cutpurse: {
    name: 'Cutpurse', tex: 'spr_cutpurse', bark: 'human', weak: { fire: 1.2, shock: 1.2 }, hp: 36, speed: 44, chase: 92, dmg: 9, detect: 90, steals: 0.2,
    kind: 'melee', range: 19, windup: 0.3, atkDur: 0.14, recover: 0.4, cooldown: 0.4, kbResist: 0.1,
    body: [8, 7, 4, 9], loot: loot([14, 36], [['lockpick', 0.3], ['hp_potion', 0.2], ['gem_amber', 0.05]]),
  },
  warchanter: {
    name: 'Warchanter', tex: 'spr_warchanter', aura: true, bark: 'human', weak: { fire: 1.2, shock: 1.3 }, hp: 56, speed: 24, chase: 36, dmg: 11, detect: 110,
    kind: 'shoot', proj: 'eshot', projSpeed: 92, range: 116, keep: 74, windup: 0.8, atkDur: 0.1, recover: 0.7, cooldown: 2.2, kbResist: 0.3,
    body: [8, 7, 4, 9], loot: loot([20, 40], [['sun_gold', 0.15], ['mp_potion', 0.4], ['gem_amber', 0.08]]),
  },
  wrapped: {
    name: 'Tomb Wrapped', tex: 'spr_wrapped', bark: 'undead', weak: { fire: 2.0, shock: 1.1, frost: 0.6 }, hp: 84, speed: 22, chase: 40, dmg: 19, detect: 76,
    kind: 'melee', range: 21, windup: 0.7, atkDur: 0.16, recover: 0.7, cooldown: 0.8, kbResist: 0.4,
    body: [8, 7, 4, 9], loot: loot([12, 28], [['linen_wrap', 0.7], ['bone_dust', 0.3], ['sun_gold', 0.08]]),
  },
  duneraider: {
    name: 'Dune Raider', tex: 'spr_duneraider', bark: 'human', weak: { fire: 1.2, shock: 1.2 }, hp: 52, speed: 40, chase: 60, dmg: 16, detect: 80, flee: true, drinks: true,
    kind: 'melee', range: 21, windup: 0.38, atkDur: 0.14, recover: 0.6, cooldown: 0.4, kbResist: 0.25,
    body: [8, 7, 4, 9], loot: loot([14, 30], [['sand_glass', 0.15], ['hp_potion', 0.3], ['arrows', 0.2, [2, 4]]]),
  },

  // ======================================================================= bosses
  blightmother: {
    name: 'The Blight Mother', title: 'THE BLIGHT MOTHER, KEEPER OF THE ROT', tex: 'spr_blightmother', bark: 'undead', weak: { fire: 1.6, shock: 1.1, frost: 0.8 },
    hp: 900, speed: 36, chase: 46, dmg: 24, detect: 9999,
    kind: 'boss', range: 42, windup: 0.7, atkDur: 0.2, recover: 0.7, cooldown: 0.9, kbResist: 0.96,
    body: [8, 7, 4, 9], loot: { gold: [380, 520], drops: [['blight_heart', 1], ['hp_potion_g', 1, [2, 2]], ['thornvine', 1, [4, 4]], ['bloom_petal', 1, [3, 3]]] },
  },
  vaultsovereign: {
    name: 'The Vault Sovereign', title: 'THE VAULT SOVEREIGN, LAST OF THE SUN KINGS', tex: 'spr_vaultsovereign', bark: 'undead', weak: { shock: 1.3, frost: 1.0, fire: 0.5 },
    hp: 1150, speed: 36, chase: 46, dmg: 28, detect: 9999,
    kind: 'boss', range: 44, windup: 0.75, atkDur: 0.2, recover: 0.75, cooldown: 0.85, kbResist: 0.97,
    body: [8, 7, 4, 9], loot: { gold: [440, 600], drops: [['vault_seal', 1], ['hp_potion_g', 1, [2, 2]], ['sun_gold', 1, [4, 4]], ['sand_glass', 1, [3, 3]]] },
  },
});

// ============================================================================= region variants: a familiar creature, a different element
const variant = (base, id, over) => {
  const b = ENEMIES[base];
  ENEMIES[id] = { ...b, ...over, loot: { gold: over.gold || b.loot.gold, drops: over.drops || b.loot.drops } };
  delete ENEMIES[id].gold; delete ENEMIES[id].drops;
  const nat = nativeSpec(base);
  if (nat) registerNative(id, nat);
};
variant('wolf', 'ashwolf', { name: 'Ash Wolf', tint: 0xff9a60, hp: 36, dmg: 12, weak: { frost: 1.5, fire: 0.3 }, gold: [3, 9], drops: [['wolf_fang', 0.3], ['bone_dust', 0.2]] });
variant('wolf', 'bogwolf', { name: 'Bog Wolf', tint: 0x80b060, hp: 34, dmg: 11, weak: { fire: 1.4 }, gold: [3, 9], drops: [['wolf_fang', 0.3], ['hide', 0.3]] });
variant('wolf', 'jackal', { name: 'Dune Jackal', tint: 0xe0c070, hp: 24, dmg: 10, speed: 50, chase: 104, weak: { frost: 1.3 }, gold: [2, 6], drops: [['hide', 0.3], ['bone_dust', 0.2]] });
variant('boar', 'thornboar', { name: 'Thornboar', tint: 0x70a050, hp: 70, dmg: 18, weak: { fire: 1.5 }, gold: [4, 12], drops: [['thornvine', 0.5], ['hide', 0.3], ['bone_dust', 0.2]] });
variant('draugr', 'marshdraugr', { name: 'Marsh Draugr', tint: 0x80a080, hp: 52, dmg: 15, weak: { fire: 1.4, frost: 0.8 }, gold: [8, 18], drops: [['bone_dust', 0.4], ['hp_potion', 0.2]] });
variant('wight', 'sandwight', { name: 'Sand Wight', tint: 0xe0c080, hp: 40, dmg: 16, weak: { frost: 1.2, shock: 1.2 }, gold: [12, 26], drops: [['linen_wrap', 0.4], ['sand_glass', 0.2], ['mp_potion', 0.3]] });
variant('knight', 'emberknight', { name: 'Ember Knight', tint: 0xff8060, hp: 96, dmg: 22, weak: { frost: 1.5, fire: 0.3 }, gold: [18, 36], drops: [['iron_ingot', 0.4], ['ember_ore', 0.05], ['hp_potion', 0.3]] });
variant('bear', 'frostbear', { name: 'Frost Bear', tint: 0xa0d8f0, hp: 120, dmg: 22, weak: { fire: 1.6, frost: 0.2 }, gold: [6, 16], drops: [['pale_pelt', 0.4], ['hide', 0.5]] });
variant('lynx', 'mirelynx', { name: 'Mire Lynx', tint: 0x60a070, hp: 30, dmg: 16, weak: { fire: 1.4 }, gold: [3, 9], drops: [['hide', 0.5], ['wolf_fang', 0.2]] });
variant('fencer', 'sunfencer', { name: 'Sun Fencer', tint: 0xf0c060, hp: 46, dmg: 14, weak: { frost: 1.2, shock: 1.2 }, gold: [12, 28], drops: [['sand_glass', 0.2], ['hp_potion', 0.3]] });

variant('blightbloom', 'blightpod', { name: 'Rootbound Pod', noLoot: true, gold: [0, 0], drops: [] });

const INFLICTS = {
  thornling: [{ type: 'bleed', chance: 0.35, t: 4, dps: 2 }], hornet: [{ type: 'poison', chance: 0.4, t: 4, dps: 1 }], blightbloom: [{ type: 'poison', chance: 0.7, t: 6, dps: 2 }], blightpod: [{ type: 'poison', chance: 0.7, t: 6, dps: 2 }],
  scorpion: [{ type: 'poison', chance: 0.6, t: 6, dps: 3 }], sandburrower: [{ type: 'bleed', chance: 0.3, t: 4, dps: 3 }], tombscorpion: [{ type: 'poison', chance: 0.7, t: 7, dps: 4 }],
  ashwolf: [{ type: 'burn', chance: 0.3, t: 3, dps: 2 }], bogwolf: [{ type: 'poison', chance: 0.3, t: 4, dps: 2 }], emberknight: [{ type: 'burn', chance: 0.3, t: 3, dps: 3 }],
  thornboar: [{ type: 'bleed', chance: 0.3, t: 4, dps: 2 }], marshdraugr: [{ type: 'poison', chance: 0.3, t: 4, dps: 2 }], mirelynx: [{ type: 'poison', chance: 0.3, t: 4, dps: 2 }],
  elderthorn: [{ type: 'bleed', chance: 0.5, t: 5, dps: 3 }], hornetqueen: [{ type: 'poison', chance: 0.5, t: 5, dps: 2 }],
};
const IMMUNE = { thornling: ['poison'], blightbloom: ['poison'], blightpod: ['poison'], mosshulk: ['poison', 'bleed'], scorpion: ['poison'], tombscorpion: ['poison'], sunsentinel: ['poison', 'bleed', 'fear'], wrapped: ['poison', 'bleed'], dustdevil: ['bleed', 'poison'], ashwolf: ['burn'], emberknight: ['burn'], frostbear: ['chill', 'freeze'], grovewarden: ['poison', 'bleed'], elderthorn: ['poison'] };
const applyStatus = () => {
  for (const k of ['mosshulk', 'sunsentinel', 'grovewarden']) if (ENEMIES[k]) ENEMIES[k].crush = true;
  for (const k of ['ashwolf', 'bogwolf', 'jackal', 'mirelynx']) if (ENEMIES[k]) ENEMIES[k].flank = true;
  for (const [k, v] of Object.entries(INFLICTS)) if (ENEMIES[k]) ENEMIES[k].inflicts = v;
  for (const [k, v] of Object.entries(IMMUNE)) if (ENEMIES[k]) ENEMIES[k].immune = v;
};
applyStatus();                                   // bases first, so the mini-bosses below inherit them

// ============================================================================= mini-bosses: named, tougher, one unique prize each
const mini = (base, id, over) => {
  const b = ENEMIES[base];
  ENEMIES[id] = { ...b, ...over, mini: true, kbResist: Math.max(b.kbResist || 0, 0.6), loot: over.loot };
  const nat = nativeSpec(id) || nativeSpec(base);
  if (nat) registerNative(id, nat);
};
mini('thornling', 'elderthorn', { name: 'Elder Thornwood', hp: 280, dmg: 22, speed: 30, chase: 70, detect: 90, ambush: false, loot: loot([90, 160], [['thorn_crown', 1], ['thornvine', 1, [4, 4]], ['hp_potion_g', 1]]) });
mini('hornet', 'hornetqueen', { name: 'Queen Vespera', hp: 160, dmg: 12, speed: 40, chase: 80, detect: 120, summons: 3, summonKind: 'hornet', loot: loot([90, 160], [['queens_sting', 1], ['honeycomb', 1, [4, 4]], ['hp_potion_g', 1]]) });
mini('mosshulk', 'grovewarden', { name: 'Grove Warden Moss', tint: 0xb8f0a0, hp: 520, dmg: 34, speed: 20, chase: 34, detect: 80, loot: loot([120, 200], [['hulk_heart', 1], ['moss_heart', 1, [3, 3]], ['hp_potion_g', 1, [2, 2]]]) });
mini('sandburrower', 'sandmaw', { name: 'The Sandmaw', hp: 300, dmg: 30, speed: 40, chase: 90, detect: 150, loot: loot([100, 180], [['maw_tooth', 1], ['sand_glass', 1, [3, 3]], ['hp_potion_g', 1]]) });
mini('scorpion', 'tombscorpion', { name: 'Ankhet, the Tomb Scorpion', hp: 280, dmg: 25, speed: 42, chase: 90, detect: 100, loot: loot([100, 180], [['ankhet_ring', 1], ['stinger', 1, [4, 4]], ['hp_potion_g', 1]]) });
mini('dustdevil', 'dustlord', { name: 'Kharn, the Dust Lord', hp: 220, dmg: 19, speed: 46, chase: 104, detect: 120, loot: loot([100, 180], [['dust_cloak', 1], ['dust_shard', 1, [4, 4]], ['hp_potion_g', 1]]) });
mini('cutpurse', 'redsula', { name: 'Red Sula', scale: 1.25, hp: 180, dmg: 14, steals: 0.35, speed: 46, chase: 96, detect: 110, loot: loot([160, 300], [['sula_dagger', 1], ['gem_amber', 1], ['lockpick', 1, [3, 3]]]) });
mini('duneraider', 'captainkarrow', { name: 'Captain Karrow', scale: 1.3, hp: 300, dmg: 24, aura: true, speed: 38, chase: 64, detect: 110, flee: false, drinks: false, loot: loot([140, 260], [['karrow_blade', 1], ['sun_gold', 1, [2, 2]], ['hp_potion_g', 1, [2, 2]]]) });


applyStatus();                                   // and the mini-bosses' own entries

Object.assign(BEASTS, {
  thornling: { name: 'Thornling', desc: 'A briar that learned to walk. Lies still among the hedges until you are close, then lunges. Bleeding barbs.', weak: 'Fire.' },
  hornet: { name: 'Meadow Hornet', desc: 'Fast, small and always in company. Poisonous. Fight with your back to a wall.', weak: 'Fire, frost.' },
  blightbloom: { name: 'Blightbloom', desc: 'A beautiful rooted flower that spits poison clouds. Never moves; never needs to.', weak: 'Fire.' },
  dewsprite: { name: 'Dew Sprite', desc: 'A drop of living water that mends its friends. Kill it first, or the fight never ends.', weak: 'Lightning.' },
  hedgeknight: { name: 'Hedge Knight', desc: 'A knight grown through with ivy. Holds a shield wall with others; break the guard with a heavy blow.', weak: 'Fire.' },
  mosshulk: { name: 'Mosshulk', desc: 'A boulder wearing a mantle of moss. Slow, heals itself, and each blow crushes a raised shield.', weak: 'Fire.' },
  sandburrower: { name: 'Sand Burrower', desc: 'Tunnels toward you unseen and untouchable, marks the spot, then bites. Move when the sand swells.', weak: 'Frost.' },
  scorpion: { name: 'Sunscorch Scorpion', desc: 'Fast, armoured and venomous. The tail comes over the back on a lunge.', weak: 'Frost.' },
  blightpod: { name: 'Rootbound Pod', desc: 'A bloom the Blight Mother grows to guard her while she roots. Destroy every pod to tear her loose.', weak: 'Fire.' },
  dustdevil: { name: 'Dust Devil', desc: 'A whirl of sand with a face. Quick and hard to pin down; it dies in a few good hits.', weak: 'Frost, lightning.' },
  sunsentinel: { name: 'Sun Sentinel', desc: 'A gold-plated guardian of the old desert kings. Armoured; only a parry, a stagger or lightning gets through.', weak: 'Lightning.' },
  cutpurse: { name: 'Cutpurse', desc: 'Hits you, takes a fifth of your gold and runs. Catch it and the gold drops. Let it go and it is gone.', weak: 'Anything. It is fast.' },
  warchanter: { name: 'Warchanter', desc: 'Drums up allies within its voice: they hit 25% harder. Silence it first.', weak: 'Lightning.' },
  wrapped: { name: 'Tomb Wrapped', desc: 'A dried body bound in linen. Slow, strong, and flammable.', weak: 'Fire.' },
  duneraider: { name: 'Dune Raider', desc: 'A desert bandit in sand colours. Slips away to drink a healing draught.', weak: 'Fire, lightning.' },
  ashwolf: { name: 'Ash Wolf', desc: 'A wolf of the Ashen Peaks, coat grey with cinder. Its bite can burn.', weak: 'Frost.' },
  bogwolf: { name: 'Bog Wolf', desc: 'A sodden fen wolf with a poisonous bite.', weak: 'Fire.' },
  jackal: { name: 'Dune Jackal', desc: 'Lean, quick and in a pack. Poor armour, plenty of nerve.', weak: 'Frost.' },
  thornboar: { name: 'Thornboar', desc: 'A boar with briars in its hide. Charges like any boar, and bleeds you for it.', weak: 'Fire.' },
  marshdraugr: { name: 'Marsh Draugr', desc: 'A draugr drowned in the fens: poison on its blade.', weak: 'Fire.' },
  sandwight: { name: 'Sand Wight', desc: 'A wight of the desert dead, dry as paper.', weak: 'Frost, lightning.' },
  emberknight: { name: 'Ember Knight', desc: 'A knight whose armour is still hot from the forge that made it. Burns on contact.', weak: 'Frost.' },
  frostbear: { name: 'Frost Bear', desc: 'A white bear of the high cold. Nothing makes it flinch but fire.', weak: 'Fire.' },
  mirelynx: { name: 'Mire Lynx', desc: 'A swamp cat that pounces from the reeds. Poison claws.', weak: 'Fire.' },
  sunfencer: { name: 'Sun Fencer', desc: 'A duellist of the sand courts. Dodges a swing; punish the recovery.', weak: 'Frost, lightning.' },
  elderthorn: { name: 'Elder Thornwood', desc: 'The oldest briar in the Vale. Lashes with whole vines.', weak: 'Fire.' },
  hornetqueen: { name: 'Queen Vespera', desc: 'A hornet queen the size of a hound, with a court of her own. Kill her workers or kill her; she will call more.', weak: 'Fire.' },
  grovewarden: { name: 'Grove Warden Moss', desc: 'The great mosshulk of the grove. Patient, enormous and regenerating.', weak: 'Fire.' },
  sandmaw: { name: 'The Sandmaw', desc: 'A burrower older than the Reach\'s roads. Everyone who hunts it digs a new grave.', weak: 'Frost.' },
  tombscorpion: { name: 'Ankhet, the Tomb Scorpion', desc: 'A scorpion that guards a tomb nobody else is willing to enter. Heavily poisonous.', weak: 'Frost.' },
  dustlord: { name: 'Kharn, the Dust Lord', desc: 'A storm in the shape of a man, with a score to settle.', weak: 'Frost, lightning.' },
  redsula: { name: 'Red Sula', desc: 'A thief queen who takes a third of your purse and leaves her calling card. Catch her and you take it back, with interest.', weak: 'Anything sharp.' },
  captainkarrow: { name: 'Captain Karrow', desc: 'A desert captain with a loud voice and a good sword. Allies near him hit harder.', weak: 'Lightning.' },
});
