// WQ10: the people of the small hamlets outside the Reach. The Reach (and the Frozen Coast, which is just as cold) keeps its
// trapper, fisher and prospector; every other region has its own folk, sign, talk and one local ware. Pure data: worldgen
// reads the npc ids and signs, features/world.js registers the people and their trade.
//   { id, name, tex, sign, lines: [3 idle lines], wares: [{ id, price, n?, name? }] }
export const HAMLET_FOLK = {
  ashen: [
    { id: 'hf_smelter', name: 'SMELTER', tex: 'spr_prospector', sign: "A SMELTERS' CAMP. THE SLAG STILL GLOWS AT NIGHT.",
      lines: ['Ash iron, fresh from the pot. Do not touch it for an hour. Do not touch me for longer.', 'The lava moves a pace a year. My grandfather built here. I will build further up.', 'The forge-city buys everything we make, and sells it back to us with a crest on it.'],
      wares: [{ id: 'ash_iron', price: 30 }, { id: 'ember_ore', price: 45 }] },
    { id: 'hf_ashherd', name: 'ASH-HERDER', tex: 'spr_trapper', sign: "A HERDERS' HOLD. GOATS THAT EAT CINDERS, AND THRIVE.",
      lines: ['The goats eat ash. I do not ask how. Their milk tastes of smoke and it keeps a week.', 'Hounds of ash on the ridge last night. They do not bark. That is the worst of it.', 'When the ash falls thick, sit by a fire. Embers burn through anything but stone and luck.'],
      wares: [{ id: 'venison', price: 18 }, { id: 'hp_potion', price: 28 }] },
  ],
  kingdom: [
    { id: 'hf_gravekeep', name: 'GRAVE-KEEPER', tex: 'spr_scribe', sign: "A GRAVE-KEEPERS' COTTAGE. EVERY STONE HAS A NAME.",
      lines: ['I keep the names clean. Somebody should remember them, and the kings will not.', 'The knights walk at night. They do not want anything. They are only doing their rounds.', 'Bone dust for the alchemists. It is all that is left of the people who would have minded.'],
      wares: [{ id: 'bone_dust', price: 20 }, { id: 'mp_potion', price: 30 }] },
  ],
  fens: [
    { id: 'hf_peatcutter', name: 'PEAT-CUTTER', tex: 'spr_trapper', sign: "A PEAT-CUTTERS' HOLT. THE STACKS SMOKE ALL WINTER.",
      lines: ['Peat burns slow and warm. A fen fire outlasts a marriage, my mother said. She had two of each.', 'Do not follow the little lights. They know where they are going. You do not.', 'Orchids grow where the peat is warm. I sell them. I do not sell where.'],
      wares: [{ id: 'marsh_orchid', price: 22 }, { id: 'hp_potion', price: 28 }] },
  ],
  highlands: [
    { id: 'hf_shepherd', name: 'SHEPHERD', tex: 'spr_nomad', sign: "A SHEPHERDS' STEADING. THE DOGS SLEEP WITH ONE EAR UP.",
      lines: ['The flock knows when the thunder comes before I do. When they lie down, so do I.', 'Feathers fall when the storm-birds dive. I gather them. The shamans pay in silver.', 'Keep off the open heath when the sky goes green. The stone circles are safe. Mostly.'],
      wares: [{ id: 'storm_feather', price: 34 }, { id: 'venison', price: 18 }] },
  ],
  glasswood: [
    { id: 'hf_glazier', name: 'GLAZIER', tex: 'spr_fisher', sign: "A GLAZIERS' GLADE. THE TREES ARE CUT, NOT FELLED.",
      lines: ['I take a sliver from each tree and thank it. The ones I forget to thank grow back sharper.', 'When the wind rings, the crystal beasts stumble. That is when you run, or strike.', 'Glass bloom keeps for ever. So do I, if you count the bad years.'],
      wares: [{ id: 'glass_bloom', price: 30 }, { id: 'mp_potion', price: 30 }] },
  ],
  vale: [
    { id: 'hf_orchard', name: 'ORCHARD-KEEPER', tex: 'spr_fisher', sign: "AN ORCHARD STEADING. APPLES IN WINTER. DO NOT ASK.",
      lines: ['Warm rain tonight, maybe. The herbs come back after it. So do the hornets.', 'The Vale was never cold. The rest of you were. We did not like to say.', 'Honey from the wild hives, if you want it. I lost two fingers for this jar.'],
      wares: [{ id: 'honeycomb', price: 30 }, { id: 'valeroot', price: 18 }] },
  ],
};
// the hamlet person for a hamlet place in region `rid` (its number picks one), or null for the Reach's own three
export const hamletFolk = (rid, n) => { const k = HAMLET_FOLK[rid]; return k ? k[n % k.length] : null; };
