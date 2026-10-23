// Perks (PR-18): spend one perk point (earned each character level) when the skill is high enough. Every skill has a starting
// perk at 2, a fork at 5 and a fork at 8 (two options, take one: `fork` names the pair), and a capstone at 12 that follows
// either branch. The first branch of each fork is the perk the old straight chains had, so old saves keep exactly what they
// bought. A shrine can unlearn them all for gold (systems/skills.js respec). Mastery rewards at 15 and 20 come by themselves.
export const PERKS = [
  { id: 'keenedge', skill: 'oneHanded', lvl: 2, name: 'Keen Edge', desc: 'Melee damage +15%.' },
  { id: 'duelist', skill: 'oneHanded', lvl: 5, fork: 'oh5', name: 'Duelist', desc: 'Parry window +0.1 seconds.', req: ['keenedge'] },
  { id: 'guardian', skill: 'oneHanded', lvl: 5, fork: 'oh5', name: 'Guardian', desc: 'Your shield blocks 10 points more.', req: ['keenedge'] },
  { id: 'rending', skill: 'oneHanded', lvl: 8, fork: 'oh8', name: 'Rending Blow', desc: 'Heavy finisher deals +25%.', req: ['duelist', 'guardian'] },
  { id: 'cleave', skill: 'oneHanded', lvl: 8, fork: 'oh8', name: 'Cleave', desc: 'Two-handed weapons hit 20% harder.', req: ['duelist', 'guardian'] },
  { id: 'steadyhand', skill: 'archery', lvl: 2, name: 'Steady Hand', desc: 'The bow draws 20% faster.' },
  { id: 'eagleeye', skill: 'archery', lvl: 5, fork: 'ar5', name: 'Eagle Eye', desc: 'Arrows deal +25% to unaware foes.', req: ['steadyhand'] },
  { id: 'quickdraw', skill: 'archery', lvl: 5, fork: 'ar5', name: 'Quick Draw', desc: 'The bow draws a further 15% faster.', req: ['steadyhand'] },
  { id: 'piercing', skill: 'archery', lvl: 8, fork: 'ar8', name: 'Piercing Shot', desc: 'Arrows pass through one enemy.', req: ['eagleeye', 'quickdraw'] },
  { id: 'longshot', skill: 'archery', lvl: 8, fork: 'ar8', name: 'Long Shot', desc: 'A fully drawn arrow hits 20% harder.', req: ['eagleeye', 'quickdraw'] },
  { id: 'spellweaver', skill: 'destruction', lvl: 2, name: 'Spellweaver', desc: 'Spells cost 20% less mana.' },
  { id: 'pyromancer', skill: 'destruction', lvl: 5, fork: 'de5', name: 'Pyromancer', desc: 'Fire spells deal +15%.', req: ['spellweaver'] },
  { id: 'cryomancer', skill: 'destruction', lvl: 5, fork: 'de5', name: 'Cryomancer', desc: 'Frost spells deal +15%.', req: ['spellweaver'] },
  { id: 'frostbite', skill: 'destruction', lvl: 8, fork: 'de8', name: 'Frostbite', desc: 'Every frost spell slows for 2 seconds longer.', req: ['pyromancer', 'cryomancer'] },
  { id: 'conflux', skill: 'destruction', lvl: 8, fork: 'de8', name: 'Conflux', desc: 'Lightning chains to one more foe.', req: ['pyromancer', 'cryomancer'] },
  { id: 'mender', skill: 'restoration', lvl: 2, name: 'Mender', desc: 'Healing spells restore 30% more.' },
  { id: 'warding', skill: 'restoration', lvl: 5, fork: 're5', name: 'Greater Ward', desc: 'Wards absorb 35% more and last 3s longer.', req: ['mender'] },
  { id: 'bastion', skill: 'restoration', lvl: 5, fork: 're5', name: 'Bastion', desc: 'Blocking costs 25% less stamina.', req: ['mender'] },
  { id: 'hardy', skill: 'restoration', lvl: 8, fork: 're8', name: 'Hardy', desc: 'Health regenerates 80% faster.', req: ['warding', 'bastion'] },
  { id: 'ironskin', skill: 'restoration', lvl: 8, fork: 're8', name: 'Ironskin', desc: 'Armour absorbs 5 points more.', req: ['warding', 'bastion'] },
  { id: 'shadowstep', skill: 'sneak', lvl: 2, name: 'Shadow Step', desc: 'Sneaking shrinks detection a further 20%.' },
  { id: 'ghost', skill: 'sneak', lvl: 5, fork: 'sn5', name: 'Ghost', desc: 'Enemies take 60% longer to notice you.', req: ['shadowstep'] },
  { id: 'hunter', skill: 'sneak', lvl: 5, fork: 'sn5', name: 'Hunter', desc: 'Sneak arrows deal a further +1.0x damage.', req: ['shadowstep'] },
  { id: 'backstab', skill: 'sneak', lvl: 8, fork: 'sn8', name: 'Backstab', desc: 'Sneak attacks deal +0.5x damage (arrows half of that).', req: ['ghost', 'hunter'] },
  { id: 'nightblade', skill: 'sneak', lvl: 8, fork: 'sn8', name: 'Nightblade', desc: 'Daggers deal 15% more damage.', req: ['ghost', 'hunter'] },
  // Capstones: a skill level of 12 and either perk of the fork at 8. Each changes how the build plays.
  { id: 'unbroken', skill: 'oneHanded', lvl: 12, name: 'Unbroken', desc: 'Every combo finisher gives back 12 stamina.', req: ['rending', 'cleave'] },
  { id: 'deadeye', skill: 'archery', lvl: 12, name: 'Deadeye', desc: 'A fully drawn arrow hits 35% harder.', req: ['piercing', 'longshot'] },
  { id: 'archmage', skill: 'destruction', lvl: 12, name: 'Archmage', desc: 'Every fourth spell you cast is free.', req: ['frostbite', 'conflux'] },
  { id: 'secondwind', skill: 'restoration', lvl: 12, name: 'Second Wind', desc: 'A blow that would leave you under a quarter of your health heals you for 35% instead. Once per 90 seconds.', req: ['hardy', 'ironskin'] },
  { id: 'assassin', skill: 'sneak', lvl: 12, name: 'Assassin', desc: 'Sneak attacks deal a further +1.0x damage (arrows half of that).', req: ['backstab', 'nightblade'] },
];
export const perkById = Object.fromEntries(PERKS.map((p) => [p.id, p]));
// The other option of a fork, or null.
export const forkMate = (id) => { const p = perkById[id]; return p?.fork ? PERKS.find((q) => q.fork === p.fork && q.id !== id)?.id || null : null; };

// PR-20: mastery rewards at skill 15 and 20, granted by the level itself (systems/skills.js mastery()).
export const MASTERY = {
  oneHanded: [{ lvl: 15, text: 'Swings cost 15% less stamina', fx: { swingCost: 0.85 } }, { lvl: 20, text: 'Melee damage +10%', fx: { melee: 1.1 } }],
  archery: [{ lvl: 15, text: 'The bow draws 15% faster', fx: { draw: 0.85 } }, { lvl: 20, text: 'Arrows crit 10% more often', fx: { bowCrit: 0.1 } }],
  destruction: [{ lvl: 15, text: 'Spells cost 10% less mana', fx: { manaCost: 0.9 } }, { lvl: 20, text: 'Spell damage +10%', fx: { spell: 1.1 } }],
  restoration: [{ lvl: 15, text: 'Healing +25%', fx: { heal: 1.25 } }, { lvl: 20, text: 'Wards absorb 50% more', fx: { ward: 1.5 } }],
  sneak: [{ lvl: 15, text: 'Foes see you 15% less far', fx: { detect: 0.85 } }, { lvl: 20, text: 'Sneak attacks +0.5x damage', fx: { sneakAttack: 0.5 } }],
};
