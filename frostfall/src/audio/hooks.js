// The audio listens to the game instead of the game calling the audio: bus events and a 4 Hz watch on the player.
//   weather (kind, region)      ambience layers; a region motif when you cross into a new region (AU20, AU24)
//   status:on / status:off      a cue when a status lands, a soft tick each second for burn / poison / bleed (AU13)
//   player:dead / scene:game    the death phrase, then the respawn phrase when the map comes back (AU24)
//   boss:engaged                the boss's own theme (AU19) and a brass hit with its title card
//   charlevel                   the character-level fanfare, the music ducking under it (AU11)
//   watch: heartbeat and a muffled music bus below 30% health (AU22); music and ambience duck while someone talks
//   (AU23); a muffle on everything while a menu is open.
import { bus } from '../systems/bus.js';
import { S } from '../systems/state.js';
import { ui } from '../systems/ui.js';
import { settings } from '../systems/settings.js';
import { TUNE } from '../data/tuning.js';
import { nodes, ramp, isHidden } from './core.js';
import { sfx, audioLog } from './play.js';
import { music } from './music.js';
import { ambience } from './ambience.js';
import { place, where } from './state.js';

const A = () => TUNE.audio;
const DOT = ['burn', 'poison', 'bleed'];
let player = null;                       // the player target statuses were last seen on
const onPlayer = new Set();              // its statuses now
const onEnemy = new WeakMap();           // enemy -> Set of statuses, so a refresh does not replay the cue
let inGame = false;

bus.on('weather', (kind, region) => {
  const before = where.region;
  where.weather = kind || 'clear';
  where.region = region || null;
  if (before && region && region !== before && place.outdoors && !place.interior) music.regionMotif(region);
  ambience.refresh();
});
bus.on('status:on', (t, kind) => {
  if (!t || !kind) return;
  if (t.isPlayer) {
    player = t;
    if (!onPlayer.has(kind)) { onPlayer.add(kind); sfx.play('status_' + kind); }
    return;
  }
  let set = onEnemy.get(t);
  if (!set) { set = new Set(); onEnemy.set(t, set); }
  if (!set.has(kind)) { set.add(kind); sfx.play('status_' + kind, t); }
});
bus.on('status:off', (t, kind) => {
  if (!t) return;
  if (t.isPlayer) onPlayer.delete(kind);
  else onEnemy.get(t)?.delete(kind);
});
bus.on('player:dead', () => { onPlayer.clear(); music.stinger('death'); });
bus.on('scene:game', () => { inGame = true; onPlayer.clear(); music.respawned(); });
bus.on('scene:title', () => { inGame = false; onPlayer.clear(); music.clearPlace(); });
bus.on('boss:engaged', (boss) => { where.bossKind = boss?.kind || null; music.stinger('boss_intro'); });
bus.on('charlevel', () => { sfx.play('char_level'); music.duck(2.2, 0.3); });

// status ticks: one soft tick per second for each damage-over-time status on the player
setInterval(() => {
  if (!nodes.ctx || isHidden() || !onPlayer.size) return;
  for (const k of DOT) {
    if (!onPlayer.has(k)) continue;
    if (player && player.statuses && !player.statuses[k]) { onPlayer.delete(k); continue; }
    sfx.play('tick_' + k);
  }
}, Math.max(250, A().statusTick * 1000));

// the 4 Hz watch
const mix = { low: false, paused: false, talk: false, nextBeat: 0 };
function watch() {
  if (!nodes.ctx || isHidden()) return;
  const t = performance.now(), H = A().heartbeat, D = A().duck;
  const ratio = S.maxHp > 0 ? S.hp / S.maxHp : 1;
  const low = inGame && S.hp > 0 && ratio < H.below && settings.heartbeat !== false;
  if (low && t >= mix.nextBeat) { sfx.play('heartbeat'); mix.nextBeat = t + 1000 * (ratio < H.fast ? H.everyFast : H.every); }
  if (low !== mix.low) { mix.low = low; ramp(nodes.musicFilter.frequency, low ? H.lowpass : 20000, low ? 0.8 : 1.2); }
  let tags = [];
  try { tags = ui.holdTags(); } catch { /* ignore */ }
  const paused = tags.includes('menu');
  if (paused !== mix.paused) { mix.paused = paused; ramp(nodes.pauseFilter.frequency, paused ? D.pauseLowpass : 20000, 0.25); }
  const talk = tags.includes('script') || t - audioLog.lastTalk < 700;
  if (talk !== mix.talk) { mix.talk = talk; ramp(nodes.musicDuck.gain, talk ? D.talk : 1, D.ramp); ramp(nodes.ambDuck.gain, talk ? D.talk : 1, D.ramp); }
}
setInterval(watch, 250);
export const hookState = () => ({ ...mix, onPlayer: [...onPlayer], inGame });
