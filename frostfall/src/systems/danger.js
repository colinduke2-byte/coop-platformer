// How dangerous something is for YOU right now, from your real gear and level (the power model in powercurve.js).
import { S } from './state.js';
import { stats } from './stats.js';
import { bonus } from './skills.js';
import { armorEffect } from './damage.js';
import { costAgainst, dangerFromCost, readyTier, DANGER_NAMES } from './powercurve.js';
import { settings } from './settings.js';
import { TUNE } from '../data/tuning.js';

// Your damage per swing (best of sword, bow, spell), health, armour and shield, as the power model wants them.
export function playerNow() {
  const melee = stats.weaponDmg() * bonus.melee() * (S.perks?.keenedge ? 1.15 : 1);
  const bow = stats.bowDmg() * 1.1 * bonus.arrow();
  const spell = 17 * bonus.spell() * 0.8;
  const sh = stats.shield();
  return { hp: Math.max(40, S.maxHp), armor: armorEffect(stats.armor()), dmg: Math.max(melee, bow, spell), block: sh ? 0.45 * sh.block : 0 };
}
// 1 (easy) to 5 (hopeless) for fighting two of this enemy: `hp` is its full health, `dmg` its hit.
export function dangerOf(hp, dmg) {
  const d = settings.difficulty;
  return dangerFromCost(costAgainst(playerNow(), { hp, dmg }, d), d);
}
export const dangerOfEnemy = (e) => dangerOf(e.maxHp, e.cfg.dmg);
export const dangerName = (n) => DANGER_NAMES[n] || '';
// Danger band colours (palette indexes): easy green, fair white, tough yellow, deadly orange, hopeless red.
export const DANGER_COL = [0, 8, 6, 13, 12, 11];
export const readyTierNow = () => readyTier(playerNow(), settings.difficulty);
// What tier of enemies does a map mostly hold near where you arrive?
export function mapTier(def, entities, px, py) {
  const list = entities.filter((e) => e.t === 'enemy' && e.x != null && (!def.stream || Math.hypot(e.x - px, e.y - py) < 45)).map((e) => e.tier || 0).sort((a, b) => a - b);
  return list.length ? list[Math.floor(list.length / 2)] : 0;
}
// A warning when the place you arrive in is tougher than you are ready for. Shown once per place and tier.
export function dangerWarning(scene) {
  const def = scene.def, pl = scene.player;
  if (def.interior || def.arena || def.safe) return null;
  const tier = mapTier(def, scene.built.entities, Math.floor(pl.x / 16), Math.floor(pl.y / 16));
  const gap = tier - readyTierNow();
  const key = `warned_${scene.mapId}_${tier}`;
  if (gap < 1 || S.flags[key]) return null;
  S.flags[key] = true;
  return gap >= 2 ? 'FAR BEYOND YOU. GEAR UP FIRST.' : 'DANGEROUS FOR YOU. PREPARE.';
}
