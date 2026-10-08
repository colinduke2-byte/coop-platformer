// Quests that start from something you find, not from a person: a note taken off a bandit chief names a hidden cache.
import { S } from './state.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { startQuest, finishQuest } from './quests.js';
import { getRegion } from '../data/maps.js';
import { regionOfMap } from '../data/regions.js';
import { HIDDEN } from '../world/discovery.js';
import { addGold, addItem } from './inventory.js';
import { makeGenItem } from './genloot.js';

export function readNote(id, gs) {
  if (id !== 'smugglers_note' || !S.inv[id]) return false;
  if (S.quests.smugglers.status === 'active') { bus.emit('toast', 'YOU ARE ALREADY FOLLOWING A NOTE', 4); sfx.play('nostamina'); return false; }
  const rid = regionOfMap(gs?.mapId || S.map), reg = getRegion(rid);
  const left = (reg.pois || []).filter((p) => p.kind === 'cache' && !S.discovered?.[(gs?.mapId || S.map) + ':' + p.id]);
  if (!left.length) { bus.emit('toast', 'THE INK IS TOO FADED TO READ HERE', 4); sfx.play('nostamina'); return false; }
  const px = gs ? gs.player.x / 16 : reg.w / 2, py = gs ? gs.player.y / 16 : reg.h / 2;
  left.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  const p = left[Math.min(left.length - 1, 1)];
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  S.flags.noteCache = { map: gs?.mapId || S.map, id: p.id, x: p.x, y: p.y, tier: p.tier };
  startQuest('smugglers');
  S.flags.waypoint = { map: S.flags.noteCache.map, x: p.x, y: p.y };
  bus.emit('toast', 'THE NOTE NAMES A HIDDEN CACHE. IT IS MARKED.', 13); sfx.play('quest');
  return true;
}
// Called when a place is discovered: finding the named cache pays out the note.
export function noteDiscovered(mapId, p) {
  const n = S.flags.noteCache;
  if (!n || S.quests.smugglers.status !== 'active' || n.map !== mapId || n.id !== p.id) return;
  addGold(80 + 50 * (p.tier || 0)); addItem(makeGenItem((p.tier || 0) + 1, Math.random, 1));
  finishQuest('smugglers'); delete S.flags.noteCache;
  if (S.flags.waypoint && S.flags.waypoint.x === p.x && S.flags.waypoint.y === p.y) delete S.flags.waypoint;
}
export { HIDDEN };
