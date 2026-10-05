// Elite enemies: a regular enemy with one or two random affixes that change how the fight plays.
export const AFFIXES = {
  swift: { name: 'Swift', tint: 0x9fe8ff, hint: 'FASTER', apply: (e) => { e.cfg.chase *= 1.3; e.cfg.speed *= 1.2; e.cfg.cooldown *= 0.7; } },
  brutal: { name: 'Brutal', tint: 0xff8a70, hint: 'HITS HARD', apply: (e) => { e.cfg.dmg = Math.round(e.cfg.dmg * 1.45); e.cfg.windup *= 1.1; } },
  juggernaut: { name: 'Juggernaut', tint: 0xcfd6e4, hint: 'ARMOURED', apply: (e) => { e.takenMul = 0.6; e.cfg.kbResist = Math.max(e.cfg.kbResist || 0, 0.7); } },
  vampiric: { name: 'Vampiric', tint: 0xd070d0, hint: 'HEALS ON HIT', apply: (e) => { e.leech = 0.6; } },
  regenerating: { name: 'Regenerating', tint: 0x80f0a0, hint: 'REGENERATES', apply: (e) => { e.regen = 0.04; } },
  explosive: { name: 'Explosive', tint: 0xffb050, hint: 'BLASTS ON DEATH', apply: (e) => { e.explodes = true; } },
  summoner: { name: 'Summoner', tint: 0xb0a0ff, hint: 'CALLS HELP', apply: (e) => { e.summons = 2; } },
};
export const AFFIX_IDS = Object.keys(AFFIXES);

export function applyElite(en, rnd, count = 1) {
  const pool = [...AFFIX_IDS];
  en.affixes = [];
  for (let i = 0; i < count && pool.length; i++) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    en.affixes.push(id);
    AFFIXES[id].apply(en);
  }
  en.elite = true;
  en.cfg = { ...en.cfg, tint: AFFIXES[en.affixes[0]].tint };
  en.displayName = en.affixes.map((a) => AFFIXES[a].name).join(' ') + ' ' + en.cfg.name;
  en.maxHp = Math.round(en.maxHp * 1.8); en.hp = en.maxHp;
  en.cfg.loot = en.cfg.loot ? { ...en.cfg.loot, gold: [en.cfg.loot.gold[0] * 3, en.cfg.loot.gold[1] * 3] } : en.cfg.loot;
}
