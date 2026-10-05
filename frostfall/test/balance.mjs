// Balance bot: a crude auto-player (approach, swing, roll away from telegraphs, drink potions)
// fights each encounter several times. It is a *lower bound* on human skill, so use the
// numbers as a sanity check on difficulty, not as a target.
//   node test/balance.mjs [trials=4] [only=substring]
import { launch } from './harness.mjs';

const trials = Number(process.argv[2] || 4);
const only = process.argv[3] || '';

const SCENARIOS = [
  { name: 'wolf pack (start gear)', map: 'forest', spawn: 'west', pos: [10.5, 10], limit: 40,
    setup: `S.equip.armor='fur_tunic'; S.inv.hp_potion=2;`,
    enemies: [['wolf', 5, -2], ['wolf', 6, 0], ['wolf', 5, 2]] },
  { name: 'bandit camp (iron gear)', map: 'forest', spawn: 'west', pos: [43, 24], limit: 70,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4;`,
    enemies: [['bandit', 5, -2], ['bandit', 6, 2], ['archer', 9, 0], ['chief', 8, 3]] },
  { name: 'crypt hall (steel gear)', map: 'crypt', spawn: 'entry', pos: [15.5, 33], limit: 80,
    setup: `S.inv.steel_sword=1; S.equip.weapon='steel_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.iron_shield=1; S.equip.offhand='iron_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=4;`,
    enemies: [['draugr', 5, -3], ['draugr', 6, 3], ['warden', 8, 0], ['wight', 10, 0]] },
  { name: 'Jarl Valdrek (iron gear)', map: 'crypt', spawn: 'entry', pos: [15.5, 6], limit: 150, boss: true,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=3;`,
    enemies: [] },
  { name: 'Grimfang (iron gear)', map: 'pass', spawn: 'south', pos: [24, 9.5], limit: 150, boss: true,
    setup: `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.skills.oneHanded.lvl=3;`,
    enemies: [] },
];

const h = await launch();
const rows = [];
for (const sc of SCENARIOS) {
  if (only && !sc.name.includes(only)) continue;
  const results = [];
  for (let t = 0; t < trials; t++) {
    await h.open(`scene=game&map=${sc.map}&spawn=${sc.spawn}`);
    await h.sleep(700);
    const r = await h.page.evaluate(async ({ sc, trial }) => {
      const S = window.__ff.S;
      S.flags.introDone = true;
      new Function('S', sc.setup)(S);
      const g = window.__ff.game.scene.getScene('Game');
      const { recalc } = await import('/src/systems/stats.js');
      recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      const p = g.player;
      p.setPosition(sc.pos[0] * 16, sc.pos[1] * 16);
      if (!sc.boss) { g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); }
      else g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy());
      for (const [k, dx, dy] of sc.enemies) { const e = g.addEnemy(k, p.x + dx * 16, p.y + dy * 16); e.alerted = true; e.state = 'chase'; e.cd = 0.5; }
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
            res({ won: hpOK && (sc.boss ? !!(g.boss && (g.boss.dead || g.boss.yieldDone)) : !foes.length), hp: Math.round(S.hp), time: Math.round(elapsed), potions, left: foes.length });
            return;
          }
          if (p.mode === 'dead' || ['lying'].includes(p.mode)) return;
          if (sc.boss && g.boss && !bossEngaged) { bossEngaged = true; }
          // nearest threat
          let tgt = null, td = 1e9;
          for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td) { td = d; tgt = e; } }
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
    }, { sc, trial: t });
    results.push(r);
  }
  const wins = results.filter((r) => r.won).length;
  const avgHp = Math.round(results.filter((r) => r.won).reduce((a, r) => a + r.hp, 0) / Math.max(1, wins));
  const avgT = Math.round(results.reduce((a, r) => a + r.time, 0) / results.length);
  rows.push({ name: sc.name, wins, trials, avgHp, avgT, potions: Math.round(results.reduce((a, r) => a + r.potions, 0) / results.length * 10) / 10 });
  console.log(`  ${sc.name.padEnd(30)} wins ${wins}/${trials}  avg HP left (wins) ${avgHp}  avg time ${avgT}s  avg potions ${rows.at(-1).potions}`);
}
await h.close();
