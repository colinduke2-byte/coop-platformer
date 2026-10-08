// The power model: how strong a player is for a given level and gear tier, how strong the enemies of each region tier are,
// and what a regular fight costs. Pure maths (no game state) so tests and docs/POWER_CURVE.md can use it.
// Design rule: power comes mostly from GEAR; levels add a modest amount. See docs/POLISH_PLAN.md round 1.
import { TUNE } from '../data/tuning.js';
import { armorEffect } from './damage.js';

// Typical gear for each tier of progress (weapon damage, armour, extra health) with its upgrade steps (+2 damage / +2% armour each).
export const GEAR = [
  { name: 'Starter', weapon: 9, armor: 0.08, hp: 0, shield: 0 },
  { name: 'Iron', weapon: 13, armor: 0.18, hp: 0, shield: 0.6 },
  { name: 'Steel', weapon: 17, armor: 0.24, hp: 0, shield: 0.72 },
  { name: 'Nordic', weapon: 22, armor: 0.30, hp: 0, shield: 0.82 },
  { name: 'Forged', weapon: 30, armor: 0.38, hp: 20, shield: 0.9 },
  { name: 'Legendary', weapon: 42, armor: 0.40, hp: 30, shield: 0.9 },
];
// A typical ordinary enemy of each region tier before the tier scaling the game applies (health, damage).
const MOB = [[35, 13], [50, 16], [70, 20], [80, 24]];
export const mobOf = (tier, diff = 'normal') => {
  const D = TUNE.difficulty[diff];
  const [hp, dmg] = MOB[Math.min(3, tier)];
  return { hp: hp * D.enemyHp * (1 + 0.28 * tier), dmg: dmg * (1 + 0.13 * tier) };
};
// What the game expects a player to have when they reach a region tier.
export const EXPECTED = [
  { gear: 1, upg: 0, level: 3 }, { gear: 2, upg: 1, level: 7 }, { gear: 3, upg: 2, level: 12 }, { gear: 4, upg: 3, level: 15 },
];

// Player strength: level L is the level of the main weapon skill; the character level and attribute points follow from the sum of skills.
export function playerOf({ level = 1, gear = 0, upg = 0, shield = true }) {
  const g = GEAR[gear];
  const cl = Math.min(25, 1 + Math.floor((3 * (level - 1)) / 3));            // about one character level per skill level for a focused player
  const hp = 100 + g.hp + 3 * (cl - 1);                                          // half the attribute points go to health
  const armor = armorEffect(g.armor + 0.02 * upg);
  const skill = 1 + 0.05 * (level - 1);
  const perk = level >= 2 ? 1.15 : 1;                                            // Keen Edge
  const dmg = (g.weapon + 2 * upg) * skill * perk;
  const block = shield && g.shield ? 0.45 * g.shield : 0;                       // a shield soaks part of the hits you cannot dodge
  return { hp, armor, dmg, block, level };
}

// What an ordinary fight (two ordinary enemies, one after the other with some overlap) costs, as a fraction of the player's health.
const SWINGS_PER_SEC = 1.2, CYCLE = 1.8, FIGHT_MOBS = 2, OVERLAP = 1.5;
let K = 1;
function rawCost(p, mob, diff) {
  const D = TUNE.difficulty[diff];
  const ttk = mob.hp / (p.dmg * SWINGS_PER_SEC);
  const perHit = Math.max(1, mob.dmg * (1 - p.armor) * D.dmgTaken * (1 - p.block));
  const dps = (perHit / CYCLE) * OVERLAP;
  return (FIGHT_MOBS * ttk * dps) / p.hp;
}
// The tuning constant stands for how often hits land: calibrated so the expected player on Normal in the first tier loses a third of their health.
K = 0.33 / rawCost(playerOf({ level: EXPECTED[0].level, gear: EXPECTED[0].gear, upg: EXPECTED[0].upg }), mobOf(0), 'normal');

export const fightCost = (player, tier, diff = 'normal') => K * rawCost(player, mobOf(tier, diff), diff);
// The same for one specific enemy (its real health and damage; difficulty health is already in `hp`).
export const costAgainst = (player, mob, diff = 'normal') => K * rawCost(player, mob, diff);
export const costFor = (tier, { dLevel = 0, dGear = 0, diff = 'normal', upg } = {}) => {
  const e = EXPECTED[tier];
  const gear = Math.max(0, Math.min(GEAR.length - 1, e.gear + dGear));
  return fightCost(playerOf({ level: Math.max(1, e.level + dLevel), gear, upg: upg ?? e.upg }), tier, diff);
};

// ---- danger: a number for "how hard is this for me right now" (1 = easy ... 5 = deadly) from a fight cost
export const dangerFromCost = (c) => (c < 0.12 ? 1 : c < 0.28 ? 2 : c < 0.5 ? 3 : c < 0.9 ? 4 : 5);
export const DANGER_NAMES = ['', 'EASY', 'FAIR', 'TOUGH', 'DEADLY', 'HOPELESS'];
// Which region tier is the player ready for? The tier whose ordinary fight costs them closest to a third of their health.
export function readyTier(player, diff = 'normal') {
  let best = 0, bd = 9;
  for (let t = 0; t <= 3; t++) { const d = Math.abs(fightCost(player, t, diff) - 0.33); if (d < bd) { bd = d; best = t; } }
  return best;
}
