// Treasure maps: reading one marks a buried chest at a faraway dig site in the Hollow Reach.
import { S } from './state.js';
import { bus } from './bus.js';
import { sfx } from '../audio/sfx.js';
import { getReach } from '../data/maps.js';
import { isGone } from './bless.js';
import { TreasureSpot } from '../entities/Props.js';

export function readMap(id, gs) {
  if (S.flags.treasure && !S.flags.treasure.done) { bus.emit('toast', 'YOU ALREADY HOLD A MARKED SITE', 4); sfx.play('nostamina'); return false; }
  if (!S.inv[id]) return false;
  const reach = getReach();
  const px = gs?.mapId === 'forest' ? gs.player.x / 16 : reach.pois?.[0]?.x ?? 60, py = gs?.mapId === 'forest' ? gs.player.y / 16 : reach.pois?.[0]?.y ?? 60;
  const sites = reach.entities.filter((e) => e.t === 'dig' && !isGone(`forest:d${e._i}`));
  if (!sites.length) { bus.emit('toast', 'THE MAP CRUMBLES: NOTHING LEFT TO FIND', 4); return false; }
  // prefer a site 40+ tiles away so it is a proper trip
  const far = sites.filter((e) => Math.hypot(e.x - px, e.y - py) > 40);
  const pool = far.length ? far : sites;
  const e = pool[Math.floor(Math.random() * pool.length)];
  S.inv[id]--; if (S.inv[id] <= 0) delete S.inv[id];
  S.flags.treasure = { i: e._i, x: e.x, y: e.y, done: false };
  // turn the live dig spot into the marked chest right away
  const old = gs?.interactables?.find((i) => i.key === `forest:d${e._i}`);
  if (old) {
    gs.interactables = gs.interactables.filter((i) => i !== old);
    const ts = new TreasureSpot(gs, old.x, old.y, old.key, old.tier);
    gs.interactables.push(ts); old.destroy();
  }
  S.flags.waypoint = { map: 'forest', x: e.x, y: e.y };
  bus.emit('toast', 'TREASURE MARKED ON YOUR MAP!', 13);
  sfx.play('quest');
  return true;
}
