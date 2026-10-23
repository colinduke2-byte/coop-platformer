// Mages stay viable (PR-01), measured in the running game: the tier 3 patrol of the balance bot (test/balance.mjs, "tier 3
// patrol"), but cast at with Fireball by a Destruction 15 mage holding the Staff of the Long Winter +9, the gear the game
// expects there. Every hit goes through the real Enemy.takeHit (armour, weakness, scaling). Before PR-01: about 30 a foe.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=forest&spawn=west&seed=424242');
await h.sleep(900);
const story = ['bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'rootDead', 'kragnarDead', 'sovereignDead', 'admiralDead', 'hollowKingDead', 'mireMotherDead'];
const r = await h.ev(async (story) => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game'), p = g.player;
  S.flags.introDone = true; for (const f of story) S.flags[f] = true;
  S.inv.winter_staff = 1; S.equip.weapon = 'winter_staff'; S.equip.offhand = null; S.upgrades = { winter_staff: 9 }; S.skills.destruction.lvl = 15; S.perks.spellweaver = true; S.perks.pyromancer = true;
  const { recalc } = await import('/src/systems/stats.js'); recalc();
  const { SPELLS } = await import('/src/entities/playerMagic.js'), { spellDamage } = await import('/src/systems/damage.js');
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  const out = {};
  for (const k of ['knight', 'reaver', 'conjurer', 'wight', 'fencer']) {
    const e = g.addEnemy(k, p.x + 60, p.y, { tier: 3 }); e.alerted = true;
    let n = 0; S.spell = 'fire';
    while (!e.dead && n < 200) { n++; const dmg = spellDamage({ base: SPELLS.fire.dmg, skill: p.spellPow(), perk: S.perks.pyromancer ? 1.15 : 1 }); e.iframes = 0; e.inv = 0; e.hurtT = 0; e.takeHit({ dmg, kx: 1, ky: 0, kb: 0, src: 'fire', element: 'fire', stun: 0 }); }
    out[k] = n; e.destroy?.();
  }
  // the melee build the balance bot uses there (Dragonbone Blade +9, One-Handed 15, Keen Edge), plain combo hits
  S.inv.dragonbone_blade = 1; S.equip.weapon = 'dragonbone_blade'; S.upgrades = { dragonbone_blade: 9 }; S.skills.oneHanded.lvl = 15; S.perks.keenedge = true; recalc();
  const { stats } = await import('/src/systems/stats.js'), { bonus } = await import('/src/systems/skills.js');
  const melee = {};
  for (const k of Object.keys(out)) {
    const e = g.addEnemy(k, p.x + 60, p.y, { tier: 3 }); e.alerted = true; let n = 0;
    while (!e.dead && n < 200) { n++; e.iframes = 0; e.inv = 0; e.hurtT = 0; e.takeHit({ dmg: stats.weaponDmg() * bonus.melee() * 1.15, kx: 1, ky: 0, kb: 0, src: 'melee', stun: 0 }); }
    melee[k] = n; e.destroy?.();
  }
  return { out, melee };
}, story);
const mean = (o) => Object.values(o).reduce((a, b) => a + b, 0) / Object.keys(o).length;
const median = (o) => { const v = Object.values(o).sort((a, b) => a - b); return v[v.length >> 1]; };
const avg = mean(r.out);
console.log(`  Fireballs per late ordinary enemy: ${avg.toFixed(1)}  ${JSON.stringify(r.out)}`);
console.log(`  melee hits for the same foes:     ${mean(r.melee).toFixed(1)}  ${JSON.stringify(r.melee)}`);
check('a late ordinary enemy takes at most 14 Fireballs from the expected late mage (16 before PR-01, 39 for an armoured knight)', avg <= 14, JSON.stringify(r));
check('... and for the typical foe (median) a mage needs 0.8x to 1.8x the melee build\'s hits (armoured foes favour spells)', median(r.out) >= 0.8 * median(r.melee) && median(r.out) <= 1.8 * median(r.melee), JSON.stringify(r));
const up = await h.ev(async () => {
  const S = window.__ff.S, { stats } = await import('/src/systems/stats.js'), SP = await import('/src/systems/spellpower.js'), { buyUpgrade, statLines } = await import('/src/data/services.js');
  S.inv.hazel_staff = 1; S.equip.weapon = 'hazel_staff'; S.upgrades = {}; S.sockets = {};
  const p0 = SP.staffPower(), d0 = stats.weaponDmg();
  S.gold = 9999; S.inv.iron_ingot = 9; for (let i = 0; i < 3; i++) buyUpgrade('weapon', 3);
  const p3 = SP.staffPower(), d3 = stats.weaponDmg();
  S.inv.gem_ruby = 1; S.sockets = { hazel_staff: ['gem_ruby'] }; const pr = SP.staffPower();
  const line = statLines('hazel_staff').map((l) => l[0]).find((l) => l.startsWith('SPELLS'));
  S.sockets = {}; S.upgrades = {};
  return { lv: Math.abs(p3 / p0 - 1.15) < 1e-9, poke: d3 === d0, ruby: Math.abs(pr / p3 - 1.045) < 1e-9, line: line === 'SPELLS +26% (+3)', got: [p0, p3, pr, line] };
});
check('a staff\'s forge levels raise its spells (+15% at +3), not its poke; a ruby in it adds 4.5% spell power', up.lv && up.poke && up.ruby && up.line, JSON.stringify(up));
// ---- PR-15: no skill XP for casting at nothing
const xp = await h.ev(async () => {
  const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game'), p = g.player;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  S.equip.weapon = null; S.tomes = { ...(S.tomes || {}), blink: true, nova: true, heal: true }; S.skills.sneak.lvl = 5; S.skills.destruction.lvl = 8;
  const xpOf = (k) => S.skills[k].xp + S.skills[k].lvl * 1e6;
  const out = {};
  S.mp = 999; p.heat = 0; S.spell = 'blink'; let a = xpOf('sneak'); p.cast(); out.blinkAlone = xpOf('sneak') === a;
  S.spell = 'nova'; a = xpOf('destruction'); p.heat = 0; p.cast(); out.novaAlone = xpOf('destruction') === a;
  S.hp = S.maxHp - 3; S.spell = 'heal'; a = S.skills.restoration.xp; p.heat = 0; p.cast(); out.healTopUp = S.skills.restoration.xp - a <= 1;
  const e = g.addEnemy('wolf', p.x + 40, p.y, { tier: 0 }); e.alerted = true;
  S.spell = 'blink'; a = xpOf('sneak'); p.heat = 0; S.mp = 999; p.cast(); out.blinkFight = xpOf('sneak') > a;
  e.destroy();
  return out;
});
check('PR-15: Blink and Frost Nova pay no XP with nobody around (they do in a fight); a heal pays for the health it restores', Object.values(xp).every(Boolean), JSON.stringify(xp));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'MAGE FAILED' : 'MAGE PASSED');
process.exit(failCount() ? 1 : 0);
