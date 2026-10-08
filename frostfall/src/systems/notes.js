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

// Four kinds of found page, each names one kind of place near you; finding that place pays out.
export const NOTES = {
  smugglers_note: { quest: 'smugglers', kind: 'cache', one: 1, bad: 'THE NOTE NAMES A HIDDEN CACHE. IT IS MARKED.', gold: [80, 50] },
  torn_map: { quest: 'tornmap', kind: 'ruin', one: 0, bad: 'THE MAP SHOWS A RUIN. IT IS MARKED.', gold: [100, 60] },
  pilgrim_letter: { quest: 'letter', kind: 'hamlet', one: 0, bad: 'THE LETTER IS ADDRESSED TO A HAMLET. IT IS MARKED.', gold: [70, 40] },
  hunters_journal: { quest: 'journal', kind: 'champion', one: 0, bad: 'THE JOURNAL DESCRIBES A BEAST LAIR. IT IS MARKED.', gold: [130, 70] },
};
const targets = () => (S.flags.noteTargets ||= {});
export function readNote(id, gs) {
  const N = NOTES[id];
  if (!N || !S.inv[id]) return false;
  if (S.quests[N.quest].status === 'active') { bus.emit('toast', 'YOU ARE ALREADY FOLLOWING THAT PAGE', 4); sfx.play('nostamina'); return false; }
  const map = gs?.mapId || S.map, rid = regionOfMap(map), reg = getRegion(rid);
  const left = (reg.pois || []).filter((p) => p.kind === N.kind && !S.discovered?.[map + ':' + p.id]);
  if (!left.length) { bus.emit('toast', 'THE INK IS TOO FADED TO READ HERE', 4); sfx.play('nostamina'); return false; }
  const px = gs ? gs.player.x / 16 : reg.w / 2, py = gs ? gs.player.y / 16 : reg.h / 2;
  left.sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py));
  const p = left[Math.min(left.length - 1, N.one)];
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  const t = { map, id: p.id, x: p.x, y: p.y, tier: p.tier };
  targets()[N.quest] = t;
  if (N.quest === 'smugglers') S.flags.noteCache = t;
  startQuest(N.quest);
  S.flags.waypoint = { map, x: p.x, y: p.y };
  bus.emit('toast', N.bad, 13); sfx.play('quest');
  return true;
}
// Called when a place is discovered: finding the named place pays out the page.
export function noteDiscovered(mapId, p) {
  for (const N of Object.values(NOTES)) {
    const t = targets()[N.quest] || (N.quest === 'smugglers' ? S.flags.noteCache : null);
    if (!t || S.quests[N.quest].status !== 'active' || t.map !== mapId || t.id !== p.id) continue;
    addGold(N.gold[0] + N.gold[1] * (p.tier || 0)); addItem(makeGenItem((p.tier || 0) + 1, Math.random, 1));
    finishQuest(N.quest); delete targets()[N.quest]; if (N.quest === 'smugglers') delete S.flags.noteCache;
    if (S.flags.waypoint && S.flags.waypoint.x === p.x && S.flags.waypoint.y === p.y) delete S.flags.waypoint;
  }
}
export { HIDDEN };
