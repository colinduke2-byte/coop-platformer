// What the Hollow Arena throws at you on wave n.
const POOLS = [
  [['draugr', 1], ['wolf', 1], ['bandit', 1], ['imp', 1]],
  [['fencer', 2], ['wight', 2], ['boar', 2], ['lynx', 2], ['necro', 3]],
  [['knight', 3], ['bear', 4], ['wyvern', 3], ['reaver', 2], ['shroom', 2]],
  [['golem', 5], ['bear', 4], ['wyvern', 3], ['knight', 3], ['necro', 3]],
];
const CHAMPS = ['bear', 'knight', 'golem', 'wyvern'];

// mode: 'classic' | 'boon' (same waves, pick a boon between them) | 'gauntlet' (a champion every wave, escorted by a few foes)
export function arenaWave(n, rnd = Math.random, mode = 'classic') {
  if (mode === 'gauntlet') {
    const tier = Math.min(3, Math.floor((n - 1) / 2));
    const out = [{ kind: CHAMPS[Math.min(3, Math.floor((n - 1) / 3))], tier: Math.min(3, tier + 1), elite: true }];
    const pool = [...POOLS[0], ...(n >= 2 ? POOLS[1] : []), ...(n >= 5 ? POOLS[2] : [])];
    for (let i = 0; i < Math.min(5, 1 + Math.floor(n / 2)); i++) out.push({ kind: pool[Math.floor(rnd() * pool.length)][0], tier, elite: false });
    return out;
  }
  const tier = Math.min(3, Math.floor((n - 1) / 3));
  let budget = 3 + Math.round(n * 1.7);
  const out = [];
  const pool = [...POOLS[0], ...(n >= 3 ? POOLS[1] : []), ...(n >= 6 ? POOLS[2] : []), ...(n >= 9 ? POOLS[3] : [])];
  while (budget > 0 && out.length < 14) {
    const c = pool[Math.floor(rnd() * pool.length)];
    if (c[1] > budget && out.length) break;
    out.push({ kind: c[0], tier, elite: false });
    budget -= c[1];
  }
  if (n % 5 === 0) out.push({ kind: CHAMPS[Math.min(3, Math.floor(n / 5) - 1)], tier: Math.min(3, tier + 1), elite: true });
  return out;
}
