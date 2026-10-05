// Readable books (found in houses, ruins, the crypt) and the bestiary.
export const LORE = {
  hearth: { title: 'The Hearth Songs', text: ['Hollowfrost was founded by seven families who followed a single fire north.', 'They sealed that fire in the great hall. As long as it burned, the winter stayed outside the palisade.'] },
  valdrek: { title: 'Jarl Valdrek the Hollow', text: ['Valdrek would not die. He swore an oath to the cold, and the cold took him at his word.', 'They say he sleeps beneath the pines with a crystal that drinks warmth. They are right.'] },
  frostheart: { title: 'On the Frostheart', text: ['A crystal that gathers cold as a lake gathers rain. In the right hands it is a hearthstone; in the wrong ones, a grave.', 'It cannot be destroyed, only given away or kept.'] },
  hunters: { title: "A Hunter's Primer", text: ['Wolves hunt by scent. Crouch, stay downwind, and a pack will walk past you.', 'Never fight an alpha with its pack at its back. Take the pack apart first, in the forest, one at a time.'] },
  herbs: { title: 'Herbal Notes, Vol. 2', text: ['Snowberry mends flesh. Frost lily steadies the mind. Wolf fang quickens the blood.', 'Mix two of the first for a simple draught; a fang with a berry will clear a weary head.'] },
  ward: { title: 'Wards and Wardens', text: ['The draugr wardens carry shields in front only. A heavy blow breaks a guard; a clever flank avoids it.', 'Fire and lightning care nothing for shields.'] },
  grimfang: { title: 'The Pale Alpha', text: ['The wolves of the pass answer to one grey beast, older than the village. Hunters call him Grimfang.', 'Some say a wolf that old understands mercy. Few have tested it.'] },
  bandit: { title: 'Bandit Camp Ledger', text: ['Take: one silver locket, one wolf-hide coat, two sacks of grain.', 'The chief keeps the locket in the iron-banded chest. He says he will give it to his daughter. He has no daughter.'] },
  tower: { title: 'Watchtower Log', text: ['Day 41. The pass is quiet except for the howling. The howling is getting closer.', 'Day 44. I have seen it. It is bigger than a horse.'] },
};

export const BEASTS = {
  wolf: { name: 'Wolf', desc: 'Pack hunter. Growls, then lunges. Roll through the lunge.', weak: 'Burns easily.' },
  alpha: { name: 'Wolf Alpha', desc: 'Leads the pack and howls to call every wolf nearby.', weak: 'Burns easily.' },
  draugr: { name: 'Draugr', desc: 'Slow, hard-hitting dead. Telegraphs every swing.', weak: 'Fire: +50%. Resists frost.' },
  warden: { name: 'Draugr Warden', desc: 'Shielded dead. Blocks frontal hits; a heavy finisher breaks the guard.', weak: 'Fire, lightning, attacks from behind.' },
  wight: { name: 'Frost Wight', desc: 'Hurls frost orbs from a distance. Keeps its distance.', weak: 'Fire and lightning. Immune-ish to frost.' },
  conjurer: { name: 'Hexcaster', desc: 'Marks the ground; the blast lands a second later. Move!', weak: 'Lightning. Squishy.' },
  bandit: { name: 'Bandit', desc: 'Swings quickly; retreats when wounded.', weak: 'None.' },
  archer: { name: 'Bandit Archer', desc: 'Shows a red aim line before every shot. Spotting you, it sounds the alarm for the whole camp.', weak: 'None.' },
  chief: { name: 'Bandit Chief', desc: 'Tough. Calls every bandit nearby to arms.', weak: 'None.' },
  reaver: { name: 'Rime Reaver', desc: 'Waits out your dodge roll and strikes the moment you land. Do not roll early.', weak: 'Fire. Resists frost.' },
  knight: { name: 'Rime Knight', desc: 'Armour turns aside almost every blow. Raise a shield and parry its swing, then strike while it reels.', weak: 'Parry opening, lightning.' },
  fencer: { name: 'Snow Fencer', desc: 'Sidesteps when you swing. Bait the first swing, hit the recovery, or use the bow and spells.', weak: 'Ranged attacks.' },
  deer: { name: 'Deer', desc: 'Skittish. Shoot it from range for venison and hides.', weak: 'Anything sharp.' },
  boss: { name: 'Jarl Valdrek', desc: 'The Hollow King. Two phases; the second adds a frost nova and a charge.', weak: 'Fire. Resists frost.' },
  grimfang: { name: 'Grimfang', desc: 'The Pale Alpha. Leaps, howls, and may yield when beaten.', weak: 'Fire.' },
};
