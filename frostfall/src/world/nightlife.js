// Night changes what lives in the world. Streamed spawns are swapped when they come into being: wolves become
// werewolves, the restless dead of old places turn to ghosts, and bandit crews sleep (they notice you far less).
// The choice is made once per spawn from the seed and the day, so it is stable while you watch.
import { S } from '../systems/state.js';
import { hourOf, isNightHour } from './lighting.js';
import { wolfChance, ghostChance } from '../systems/moon.js';

const hash = (str) => { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13; h = Math.imul(h, 3266489917); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

export function isNightNow(scene) { return !!(scene.def.snow || scene.def.outdoors) && isNightHour(hourOf()); }

// Which creature actually appears for a spawn that would normally be `kind`.
export function nightKind(scene, kind, p) {
  if (!scene.def.stream || !isNightNow(scene) || scene.def.quick) return kind;
  const r = hash(`${S.seed}:${Math.floor(S.days || 0)}:${p.key || p.wx + ',' + p.wy}`);
  const tierMul = [0.35, 0.7, 1, 1][Math.min(3, p.spec.tier || 0)];          // the gentle country keeps most of its wolves
  if (kind === 'wolf' && !p.spec.cub && r < wolfChance() * tierMul) return 'werewolf';
  if ((kind === 'draugr' || kind === 'wight') && r < ghostChance()) return 'ghost';
  return kind;
}

// Bandit crews are asleep at night: far shorter sight until you wake them.
export function sleepyCrew(en) {
  if (en.kind === 'bandit' && en.spec?.camp) en.cfg = { ...en.cfg, detect: Math.round(en.cfg.detect * 0.5) };
}
