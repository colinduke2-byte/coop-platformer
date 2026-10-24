// All art is generated here, in code: characters, tiles, icons, effects.
// Nothing is loaded from disk. Every colour is an index into PAL. The builders live in art/sprites/ (CH16);
// this file is the entry point and keeps the old exports.
import { installBakedTints } from './tintbake.js';
import { buildCharacters } from './sprites/characters.js';
export { STYLES, roleSheet, wornHeroKey } from './sprites/characters.js';
import { buildTiles } from './sprites/tiles.js';
export { PROP_TILES, buildTileset } from './sprites/tiles.js';
import { buildFx } from './sprites/icons.js';
export { DAGGER_SHAPES, HALBERD_SHAPES, STAFF_SHAPES, buildHeld, buildIcon, drawDaggerHeld, drawDaggerIcon, drawHalberdHeld, drawHalberdIcon, drawStaffHeld, drawStaffIcon } from './sprites/icons.js';
export { ring } from './sprites/base.js';

// --------------------------------------------------------------------- entry
export function generateArt(scene) {
  installBakedTints(scene);
  buildCharacters(scene);
  buildTiles(scene);
  buildFx(scene);
}

// Which held-weapon sprite an item uses.
export const heldKind = (it) => (it.type === 'shield' ? (it.icon?.[0]?.startsWith('shield_') ? it.icon[0] : 'shield') : /^(dagger|staff|halberd|sword|axe|spear|mace|hammer|bow|shield|armor|charm)_/.test(it.icon?.[0] || '') && it.type !== 'armor' && it.type !== 'charm' && it.type !== 'bow' ? it.icon[0] : it.style === 'spear' ? 'spear' : it.style === 'mace' || it.style === 'hammer' ? 'mace' : it.style === 'axe' ? 'axe' : it.type === 'weapon2h' ? 'greatblade' : it.type === 'weapon' ? 'blade' : null);
