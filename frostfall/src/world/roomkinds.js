// Round 8: three extra dungeon room kinds shared by the barrow and mine generators.
import { TILE } from '../config.js';

// Returns true when the room was dressed here. ctx: { g, add, foe, R, tier, mobs, pick, key }
export function dressSpecialRoom(r, ctx) {
  const { g, add, foe, R, tier, mobs, pick, key } = ctx;
  if (r.kind === 'spikes') {
    // a hall of striking floor: three lanes of spikes with safe floor between, a chest at the far end and two sentries
    for (const ly of [r.y + 2, r.cy, r.y + r.h - 3]) add({ t: 'spiketrap', x: r.x + 2, y: ly, w: r.w - 4, h: 1, tier, dmg: 12, offset: (ly % 3) * 0.9 });
    add({ t: 'sign', x: r.x + 2, y: r.y + r.h - 2, text: ['THE FLOOR IS SCORED WITH SLITS. THEY WINK RED BEFORE THEY BITE.', 'RUN, OR ROLL, WHEN THEY GLOW.'] });
    add({ t: 'chest', id: `${key}_sp`, x: r.cx, y: r.y + 1, lock: tier >= 2 ? 'hard' : 'med', loot: [{ gen: tier + 1 }, { gold: 40 + tier * 30 }, { item: 'hp_potion' }] });
    for (let k = 0; k < 2; k++) foe(pick(mobs), r.x + 2 + k * (r.w - 5), r.y + 1, { camp: `${key}r${r.cx}` });
    return true;
  }
  if (r.kind === 'flood') {
    // a drowned hall: wading is slow, and the water is not empty
    add({ t: 'mire', x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 });
    for (let k = 0; k < 3 + (tier > 1 ? 1 : 0); k++) foe(k % 2 ? 'leech' : pick(mobs), r.x + 2 + Math.floor(R() * (r.w - 4)), r.y + 2 + Math.floor(R() * (r.h - 4)), { camp: `${key}r${r.cx}` });
    add({ t: 'chest', id: `${key}_fl`, x: r.cx, y: r.y + 1, loot: [{ gen: tier }, { gold: 30 + tier * 25 }, { item: 'sp_potion' }] });
    add({ t: 'sign', x: r.x + 2, y: r.y + r.h - 2, text: ['THE WATER WAS UP TO THE KNEE WHEN THEY BUILT IT. IT IS UP TO THE WAIST NOW.', 'SOMETHING IN IT DOES NOT MIND.'] });
    return true;
  }
  if (r.kind === 'ambush') {
    // a quiet room with a chest in the middle. The chest is bait.
    add({ t: 'chest', id: `${key}_am`, x: r.cx, y: r.cy, lock: 'med', loot: [{ gen: tier + 1 }, { gen: tier }, { gold: 50 + tier * 35 }] });
    add({ t: 'ambush', x: r.x + 2, y: r.y + 2, w: r.w - 4, h: r.h - 4, kinds: [pick(mobs), pick(mobs), pick(mobs)], n: 3 + Math.min(3, tier), tier });
    add({ t: 'sign', x: r.x + 2, y: r.y + r.h - 2, text: ['THE DUST ON THE FLOOR IS UNDISTURBED. VERY UNDISTURBED.', 'NOBODY HAS BEEN IN HERE. NOBODY HAS COME OUT, EITHER.'] });
    return true;
  }
  return false;
}
