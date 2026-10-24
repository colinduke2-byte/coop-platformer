// CB24: what each weapon class's heavy attack does, added to every weapon's description (the numbers are in
// TUNE.combat.heavy / TUNE.combat.great, the moves in entities/playerCombat.js). Pure text, no imports: genloot uses it too.
export const HEAVY_TEXT = {
  sword: 'Heavy: an overhead blow that staggers and breaks a guard.',
  dagger: 'Heavy: slip behind the foe in front of you and stab its back.',
  axe: 'Heavy: a wide cleave that hits all around your front.',
  spear: 'Heavy: a long lunging thrust that pins the foe in place.',
  halberd: 'Heavy: a full sweep around you; the tip hits harder.',
  mace: 'Heavy: a ground shock ahead that stuns all it hits.',
  hammer: 'Heavy: a great ground shock that stuns and smashes guards open.',
  great: 'Heavy: hold to charge two levels, release to swing harder.',
};
const styleOf = (it) => it.style || (it.type === 'weapon2h' ? 'great' : 'sword');
// the heavy line of a weapon ('' for anything else, or when its description already says it)
export function heavyLine(it) {
  if (!it || (it.type !== 'weapon' && it.type !== 'weapon2h') || /heavy/i.test(it.desc || '')) return '';
  if (styleOf(it) === 'staff') return `Heavy: a ${it.bolt || 'frost'} bolt for stamina, not mana.`;
  return HEAVY_TEXT[styleOf(it)] || '';
}
// add it to every fixed weapon in a table of items
export function addHeavyLines(items) {
  for (const it of Object.values(items)) { const l = heavyLine(it); if (l) it.desc = `${it.desc ? it.desc + ' ' : ''}${l}`; }
}
