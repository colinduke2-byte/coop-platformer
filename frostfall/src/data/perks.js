// Perks: spend one perk point (earned each character level) when the skill is high enough.
export const PERKS = [
  { id: 'keenedge', skill: 'oneHanded', lvl: 2, name: 'Keen Edge', desc: 'Sword damage +15%.' },
  { id: 'duelist', skill: 'oneHanded', lvl: 5, name: 'Duelist', desc: 'Parry window +0.1 seconds.', req: 'keenedge' },
  { id: 'rending', skill: 'oneHanded', lvl: 8, name: 'Rending Blow', desc: 'Heavy finisher deals +25%.', req: 'duelist' },
  { id: 'steadyhand', skill: 'archery', lvl: 2, name: 'Steady Hand', desc: 'The bow draws 20% faster.' },
  { id: 'eagleeye', skill: 'archery', lvl: 5, name: 'Eagle Eye', desc: 'Arrows deal +25% to unaware foes.', req: 'steadyhand' },
  { id: 'piercing', skill: 'archery', lvl: 8, name: 'Piercing Shot', desc: 'Arrows pass through one enemy.', req: 'eagleeye' },
  { id: 'spellweaver', skill: 'destruction', lvl: 2, name: 'Spellweaver', desc: 'Spells cost 20% less mana.' },
  { id: 'pyromancer', skill: 'destruction', lvl: 5, name: 'Pyromancer', desc: 'Fire damage +15%.', req: 'spellweaver' },
  { id: 'frostbite', skill: 'destruction', lvl: 8, name: 'Frostbite', desc: 'Frost slows for 2 seconds longer.', req: 'pyromancer' },
  { id: 'mender', skill: 'restoration', lvl: 2, name: 'Mender', desc: 'Healing spells restore 30% more.' },
  { id: 'warding', skill: 'restoration', lvl: 5, name: 'Greater Ward', desc: 'Wards absorb 35% more and last 3s longer.', req: 'mender' },
  { id: 'hardy', skill: 'restoration', lvl: 8, name: 'Hardy', desc: 'Health regenerates 80% faster.', req: 'warding' },
  { id: 'shadowstep', skill: 'sneak', lvl: 2, name: 'Shadow Step', desc: 'Sneaking shrinks detection a further 20%.' },
  { id: 'ghost', skill: 'sneak', lvl: 5, name: 'Ghost', desc: 'Enemies take 60% longer to notice you.', req: 'shadowstep' },
  { id: 'backstab', skill: 'sneak', lvl: 8, name: 'Backstab', desc: 'Sneak attacks deal +0.5x damage.', req: 'ghost' },
];
export const perkById = Object.fromEntries(PERKS.map((p) => [p.id, p]));
