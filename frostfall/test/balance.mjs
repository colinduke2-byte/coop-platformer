// Balance bot: a crude auto-player (approach, swing, roll away from telegraphs, drink potions)
// fights each encounter several times. It is a *lower bound* on human skill, so use the
// numbers as a sanity check on difficulty, not as a target.
//   node test/balance.mjs [trials=4] [only=substring]      (DIFF=easy|normal|hard picks the difficulty)
import { launch } from './harness.mjs';

const trials = Number(process.argv[2] || 4);
const only = process.argv[3] || '';

const SCENARIOS = [
  { name: 'wolf pack (start gear)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 40,
    setup: `S.equip.armor='fur_tunic'; S.inv.hp_potion=2;`,
    enemies: [['wolf', 5, -2], ['wolf', 6, 0], ['wolf', 5, 2]] },
  { name: 'bandit camp (iron gear)', map: 'forest', spawn: 'west', pos: [43, 24], limit: 70,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.inv.leather_cap=1; S.equip.head='leather_cap'; S.upgrades={iron_sword:1,iron_cuirass:1};`,
    enemies: [['bandit', 5, -2], ['bandit', 6, 2], ['archer', 9, 0], ['chief', 8, 3]] },
  { name: 'crypt hall (steel gear)', map: 'crypt', spawn: 'entry', pos: [15.5, 33], limit: 80,
    setup: `S.inv.steel_sword=1; S.equip.weapon='steel_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.iron_shield=1; S.equip.offhand='iron_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=4; S.inv.iron_helm=1; S.equip.head='iron_helm'; S.upgrades={steel_sword:2,iron_cuirass:2,iron_shield:2};`,
    enemies: [['draugr', 5, -3], ['draugr', 6, 3], ['warden', 8, 0], ['wight', 10, 0]] },
  { name: 'Jarl Valdrek (iron gear)', map: 'crypt', spawn: 'entry', pos: [15.5, 6], limit: 150, boss: true,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=3; S.inv.leather_cap=1; S.equip.head='leather_cap'; S.upgrades={iron_sword:1,iron_cuirass:1};`,
    enemies: [] },
  { name: 'Grimfang (iron gear)', map: 'pass', spawn: 'south', pos: [24, 9.5], limit: 150, boss: true,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=3; S.inv.leather_cap=1; S.equip.head='leather_cap'; S.upgrades={iron_sword:1,iron_cuirass:1};`,
    enemies: [] },
  { name: 'Kragnar (ember mail)', map: 'mines2', spawn: 'in', nearBoss: true, limit: 170, boss: true,
    setup: `S.inv.steel_sword=1; S.equip.weapon='steel_sword'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.hp_potion=6; S.bonusHp=30; S.skills.oneHanded.lvl=6; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.upgrades={steel_sword:3,ember_mail:3,ember_bulwark:3,ember_helm:3};`,
    enemies: [] },
  { name: 'Ashen Sovereign (ember mail)', map: 'forge', spawn: 'in', nearBoss: true, limit: 170, boss: true,
    setup: `S.inv.steel_sword=1; S.equip.weapon='steel_sword'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.hp_potion=8; S.bonusHp=80; S.skills.oneHanded.lvl=12; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.upgrades={steel_sword:4,ember_mail:4,ember_bulwark:4,ember_helm:4};`,
    enemies: [] },
  { name: 'Admiral Veyl (ember gear)', map: 'tidebreak', spawn: 'in', nearBoss: true, limit: 170, boss: true,
    setup: `S.inv.ember_blade=1; S.equip.weapon='ember_blade'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.hp_potion=6; S.skills.oneHanded.lvl=6; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.upgrades={ember_blade:5,ember_mail:5,ember_bulwark:5,ember_helm:5};`,
    enemies: [] },
  { name: 'Hollow King (ember mail)', map: 'sepulchre', spawn: 'in', nearBoss: true, limit: 170, boss: true,
    setup: `S.inv.steel_sword=1; S.equip.weapon='steel_sword'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.hp_potion=8; S.bonusHp=80; S.skills.oneHanded.lvl=12; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.upgrades={steel_sword:6,ember_mail:6,ember_bulwark:6,ember_helm:6};`,
    enemies: [] },
  // the Embergreen Vale (tier 1-2, nordic gear around +4) and the Sunscorch Reach (tier 2-3, forged gear around +6)
  { name: 'Vale patrol (nordic +4)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 100, story: ['bossDead', 'grimfangDone', 'wyrmDead'],
    setup: `S.inv.nordic_blade=1; S.equip.weapon='nordic_blade'; S.inv.nordic_plate=1; S.equip.armor='nordic_plate'; S.inv.nordic_shield=1; S.equip.offhand='nordic_shield'; S.inv.nordic_helm=1; S.equip.head='nordic_helm'; S.inv.hp_potion=5; S.skills.oneHanded.lvl=8; S.upgrades={nordic_blade:4,nordic_plate:4,nordic_shield:4,nordic_helm:4};`,
    enemies: [['hedgeknight', 5, -2, 1], ['thornling', 6, 2, 1], ['hornet', 7, 3, 1]] },
  { name: 'Sunscorch patrol (forged +6)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 110, story: ['bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'kragnarDead', 'sovereignDead'],
    setup: `S.inv.ember_blade=1; S.equip.weapon='ember_blade'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.inv.hp_potion=6; S.bonusHp=60; S.skills.oneHanded.lvl=12; S.upgrades={ember_blade:6,ember_mail:6,ember_bulwark:6,ember_helm:6};`,
    enemies: [['wrapped', 5, -2, 2], ['wrapped', 6, 3, 2], ['scorpion', 7, 0, 2], ['duneraider', 8, 3, 2], ['warchanter', 9, -2, 2], ['sandburrower', 10, 0, 2]] },
  { name: 'Blight Mother (nordic +5)', map: 'thornroot', spawn: 'in', nearBoss: true, limit: 170, boss: true, story: ['bossDead', 'grimfangDone', 'wyrmDead'],
    setup: `S.inv.nordic_blade=1; S.equip.weapon='nordic_blade'; S.inv.nordic_plate=1; S.equip.armor='nordic_plate'; S.inv.nordic_shield=1; S.equip.offhand='nordic_shield'; S.inv.nordic_helm=1; S.equip.head='nordic_helm'; S.inv.hp_potion=7; S.bonusHp=40; S.skills.oneHanded.lvl=9; S.upgrades={nordic_blade:5,nordic_plate:5,nordic_shield:5,nordic_helm:5};`,
    enemies: [] },
  { name: 'Vault Sovereign (forged +7)', map: 'sealedvault', spawn: 'in', nearBoss: true, limit: 170, boss: true, story: ['bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'kragnarDead', 'sovereignDead'],
    setup: `S.inv.ember_blade=1; S.equip.weapon='ember_blade'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.inv.hp_potion=8; S.bonusHp=70; S.skills.oneHanded.lvl=13; S.upgrades={ember_blade:7,ember_mail:7,ember_bulwark:7,ember_helm:7};`,
    enemies: [] },
  // ordinary patrols deeper in the game, with the gear and upgrades a player is expected to have there (region tier 1, 2, 3 at about 30%, 55%, 80% through the story)
  { name: 'tier 1 patrol (nordic +3)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 90, story: ['bossDead', 'grimfangDone', 'wyrmDead'],
    setup: `S.inv.nordic_blade=1; S.equip.weapon='nordic_blade'; S.inv.nordic_plate=1; S.equip.armor='nordic_plate'; S.inv.nordic_shield=1; S.equip.offhand='nordic_shield'; S.inv.nordic_helm=1; S.equip.head='nordic_helm'; S.inv.hp_potion=5; S.skills.oneHanded.lvl=7; S.upgrades={nordic_blade:3,nordic_plate:3,nordic_shield:3,nordic_helm:3};`,
    enemies: [['knight', 5, -2, 1], ['reaver', 6, 2, 1], ['wight', 8, 0, 1]] },
  { name: 'tier 2 patrol (forged +6)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 110, story: ['bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'kragnarDead', 'sovereignDead'],
    setup: `S.inv.ember_blade=1; S.equip.weapon='ember_blade'; S.inv.ember_mail=1; S.equip.armor='ember_mail'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.ember_helm=1; S.equip.head='ember_helm'; S.inv.hp_potion=6; S.bonusHp=60; S.skills.oneHanded.lvl=12; S.upgrades={ember_blade:6,ember_mail:6,ember_bulwark:6,ember_helm:6};`,
    enemies: [['knight', 5, -2, 2], ['reaver', 6, 2, 2], ['conjurer', 9, 0, 2], ['fencer', 7, 3, 2]] },
  { name: 'tier 3 patrol (legendary +9)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 120, story: ['bossDead', 'grimfangDone', 'wyrmDead', 'warlordDead', 'tideDead', 'rootDead', 'kragnarDead', 'sovereignDead', 'admiralDead', 'hollowKingDead', 'mireMotherDead'],
    setup: `S.inv.dragonbone_blade=1; S.equip.weapon='dragonbone_blade'; S.inv.dragonscale_armor=1; S.equip.armor='dragonscale_armor'; S.inv.ember_bulwark=1; S.equip.offhand='ember_bulwark'; S.inv.scale_helm=1; S.equip.head='scale_helm'; S.inv.hp_potion=8; S.bonusHp=100; S.skills.oneHanded.lvl=15; S.upgrades={dragonbone_blade:9,dragonscale_armor:9,ember_bulwark:9,scale_helm:9};`,
    enemies: [['knight', 5, -2, 3], ['reaver', 6, 2, 3], ['conjurer', 9, 0, 3], ['wight', 7, 3, 3], ['fencer', 8, -3, 3]] },
];

const h = await launch();
const rows = [];
for (const sc of SCENARIOS) {
  if (only && !sc.name.includes(only)) continue;
  const results = [];
  for (let t = 0; t < trials; t++) {
    await h.open(`scene=game&map=${sc.map}&spawn=${sc.spawn}`);
    await h.sleep(700);
    await h.page.evaluate(async (d) => { (await import('/src/systems/settings.js')).settings.difficulty = d; }, process.env.DIFF || 'normal');
    const r = await h.page.evaluate(async ({ sc, trial }) => {
      const S = window.__ff.S;
      S.flags.introDone = true;
      new Function('S', sc.setup)(S); for (const f of sc.story || []) S.flags[f] = true;
      const g = window.__ff.game.scene.getScene('Game');
      const { recalc } = await import('/src/systems/stats.js');
      recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      const p = g.player;
      if (sc.nearBoss) { const b = g.enemies.getChildren().find((e) => e.isBoss); if (b) { let best = null; for (let r = 6; r <= 10 && !best; r++) for (let a = 0; a < 16 && !best; a++) { const x = b.x + Math.cos(a * Math.PI / 8) * r * 16, y = b.y + Math.sin(a * Math.PI / 8) * r * 16; if (!g.solidAt(x, y) && !g.solidAt(x + 8, y) && !g.solidAt(x - 8, y) && !g.solidAt(x, y + 8) && !g.solidAt(x, y - 8)) best = { x, y }; } if (best) p.setPosition(best.x, best.y); } } else p.setPosition(sc.pos[0] * 16, sc.pos[1] * 16);
      if (!sc.boss) { g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0; }
      else g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy());
      for (const [k, dx, dy, tr] of sc.enemies) { const e = g.addEnemy(k, p.x + dx * 16, p.y + dy * 16, { tier: tr || 0 }); e.alerted = true; (window.__dbg = window.__dbg || []).push([k, tr, e.maxHp, e.cfg.dmg]); (window.__en = window.__en || []).push(e); if (!window.__wrapped) { window.__wrapped = 1; const P = e.constructor.prototype, o = P.takeHit; window.__hits = []; P.takeHit = function (i) { const d = o.call(this, i); if (window.__hits.length < 12) window.__hits.push([this.cfg.name || "", i.src, Math.round(i.dmg), d]); return d; }; } e.state = 'chase'; e.cd = 0.5; }
      const keys = window.__ff.keys;
      const tapK = (c, ms = 70) => { keys._press(c); setTimeout(() => keys._release(c), ms); };
      let bossEngaged = false, t0 = performance.now(), potions = 0, lastPot = 0;
      return await new Promise((res) => {
        const iv = setInterval(() => {
          const hpOK = S.hp > 0;
          const foes = g.enemies.getChildren().filter((e) => !e.dead && !e.yieldDone);
          const elapsed = (performance.now() - t0) / 1000;
          if (!hpOK || (!foes.length && elapsed > 2) || elapsed > sc.limit || (sc.boss && g.boss && (g.boss.dead || g.boss.yieldDone))) {
            clearInterval(iv); ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF'].forEach((c) => keys._release(c));
            res({ hits: window.__hits, dbg: window.__dbg, fin: (window.__en||[]).map((e)=>[e.dead, Math.round(e.hp), e.active, Math.round(e.x), Math.round(e.y)]), px: [Math.round(p.x), Math.round(p.y)], maxHp: Math.round(S.maxHp), won: hpOK && (sc.boss ? !!(g.boss && (g.boss.dead || g.boss.yieldDone)) : !foes.length), hp: Math.round(S.hp), time: Math.round(elapsed), potions, left: foes.length, bossLeft: g.boss ? Math.round(100 * Math.max(0, g.boss.hp) / g.boss.maxHp) : null });
            return;
          }
          if (p.mode === 'dead' || ['lying'].includes(p.mode)) return;
          if (sc.boss && g.boss && !bossEngaged) { bossEngaged = true; }
          // nearest threat
          let tgt = null, td = 1e9;
          for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td) { td = d; tgt = e; } }
          { const pod = foes.filter((e) => e.kind === 'blightpod').sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0]; if (pod) { tgt = pod; td = Math.hypot(pod.x - p.x, pod.y - p.y); } }   // do what the game says: destroy the pods
          if (!tgt) return;
          const now2 = performance.now();
          if (S.hp < S.maxHp * 0.4 && (S.inv.hp_potion > 0 || S.inv.hp_potion_g > 0) && now2 - lastPot > 1200) { keys._press('Digit1'); setTimeout(() => keys._release('Digit1'), 40); potions++; lastPot = now2; }
          const dx = tgt.x - p.x, dy = tgt.y - p.y, d = td, nx = dx / (d || 1), ny = dy / (d || 1);
          // human-like reaction: only react once a telegraph has been visible for 0.28s
          const now = performance.now();
          let telegraph = false;
          for (const e of foes) {
            if (e.state === 'windup') { e.__w = e.__w || now; if (now - e.__w > 280 && Math.hypot(e.x - p.x, e.y - p.y) < (e.isBoss ? 80 : 40)) telegraph = true; }
            else e.__w = 0;
          }
          const move = (vx, vy) => { keys[vx < -0.3 ? '_press' : '_release']('KeyA'); keys[vx > 0.3 ? '_press' : '_release']('KeyD'); keys[vy < -0.3 ? '_press' : '_release']('KeyW'); keys[vy > 0.3 ? '_press' : '_release']('KeyS'); };
          const dodgeRange = tgt.isBoss ? 70 : 34;
          if (telegraph && p.rollCd <= 0 && S.sp >= 22 && p.mode === 'free') {
            move(-ny * (trial % 2 ? 1 : -1), nx * (trial % 2 ? 1 : -1)); tapK('Space', 60);       // roll sideways
          } else if (d > 20) move(nx, ny);
          else {
            move(0, 0);
            p.face = { x: Math.abs(nx) > 0.38 ? Math.sign(nx) : 0, y: Math.abs(ny) > 0.38 ? Math.sign(ny) : 0 };
            if (p.face.x === 0 && p.face.y === 0) p.face = { x: 1, y: 0 };
            if (S.sp > 14 && p.lockT <= 0) tapK('KeyJ', 50);
          }
          // raise the shield while waiting for a telegraph
          if (S.sp > 10 && telegraph) { keys._press('KeyF'); } else keys._release('KeyF');
        }, 60);
      });
    }, { sc, trial: t }).catch((e) => /navigation|destroyed/.test(String(e)) ? { won: true, hp: 0, time: 0, potions: 0, left: 0, nav: true } : Promise.reject(e));
    results.push(r); if (process.env.BALDBG) console.log("  dbg", JSON.stringify(r.dbg), "maxHp", r.maxHp, "fin", JSON.stringify(r.fin), r.px, "hits", JSON.stringify(r.hits));
  }
  const wins = results.filter((r) => r.won).length;
  const avgHp = Math.round(results.filter((r) => r.won).reduce((a, r) => a + r.hp, 0) / Math.max(1, wins));
  const avgT = Math.round(results.reduce((a, r) => a + r.time, 0) / results.length);
  rows.push({ name: sc.name, wins, trials, avgHp, avgT, potions: Math.round(results.reduce((a, r) => a + r.potions, 0) / results.length * 10) / 10 });
  const bl = results.filter((r) => r.bossLeft != null); const bossNote = bl.length ? `  boss HP left ${Math.round(bl.reduce((a, r) => a + r.bossLeft, 0) / bl.length)}%` : '';
  console.log(`  ${sc.name.padEnd(30)} wins ${wins}/${trials}  avg HP left (wins) ${avgHp}  avg time ${avgT}s  avg potions ${rows.at(-1).potions}${bossNote}`);
}
await h.close();
