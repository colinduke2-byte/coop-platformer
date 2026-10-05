// Pure damage math (no Phaser, no globals) so it can be unit-tested in Node.

export const sneakMult = (kind, sneakBonus = 0) => (kind === 'melee' ? 3 + sneakBonus : 2 + sneakBonus * 0.5);

// weapon: base damage; skill: skill multiplier; combo: combo-step multiplier;
// perk: extra multiplier from perks; noise: random spread (0.9..1.1).
export function meleeDamage({ weapon = 3, skill = 1, combo = 1, perk = 1, sneak = false, sneakBonus = 0, noise = 1, bonusFlat = 0 }) {
  return (weapon + bonusFlat) * skill * combo * perk * (sneak ? sneakMult('melee', sneakBonus) : 1) * noise;
}

export function arrowDamage({ bow = 4, charge = 0, skill = 1, perk = 1, dmgMin = 0.45, dmgMax = 1.7 }) {
  return bow * (dmgMin + (dmgMax - dmgMin) * Math.max(0, Math.min(1, charge))) * skill * perk;
}

export function spellDamage({ base = 10, skill = 1, perk = 1 }) { return base * skill * perk; }

// cfg.weak = { fire: 1.5, frost: 0.5 } on an enemy definition.
export function elementMult(cfg, element) {
  if (!element) return 1;
  return cfg?.weak?.[element] ?? 1;
}

// Damage the player takes after armour and difficulty (always at least 1).
export function damageTaken(dmg, armor = 0, difficultyMult = 1) {
  return Math.max(1, Math.round(dmg * (1 - Math.min(0.85, armor)) * difficultyMult));
}

// Shield block: returns { taken, parried, blocked }.
// facing: unit vector the player faces; from: unit vector pointing from player toward the attacker.
export function blockResult({ dmg, blocking, blockT = 0, parryWindow = 0.18, facing, from, reduction = 0.7, arc = 0.2 }) {
  if (!blocking || !facing || !from) return { taken: dmg, parried: false, blocked: false };
  const dot = facing.x * from.x + facing.y * from.y;
  if (dot < arc) return { taken: dmg, parried: false, blocked: false };
  if (blockT <= parryWindow) return { taken: 0, parried: true, blocked: true };
  return { taken: dmg * (1 - reduction), parried: false, blocked: true };
}

// Character level from total skill levels gained (each 2 skill-ups = 1 character level).
export const charLevelFor = (skillUps) => 1 + Math.floor(skillUps / 2);

// Stamina needed to block a hit.
export const blockStaminaCost = (dmg, shieldCost = 0.9) => Math.round(dmg * shieldCost);
