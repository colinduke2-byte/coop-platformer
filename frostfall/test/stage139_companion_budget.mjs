// The companion damage budget: in a typical fight (the bandit camp with iron gear, fought by a simple bot that walks in,
// swings, rolls from tells and drinks potions) each companion adds roughly 15-25% to your own damage, not more.
// Measured before the companion pass: Pell 65%, the Spirit Wolf 90%, the hound 35%, Ragna 22% (clamped to the foe's HP).
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
const KIT = `S.inv.iron_sword=1; S.equip.weapon='iron_sword'; S.inv.iron_cuirass=1; S.equip.armor='iron_cuirass'; S.inv.wooden_shield=1; S.equip.offhand='wooden_shield'; S.inv.hp_potion=4; S.inv.leather_cap=1; S.equip.head='leather_cap'; S.upgrades={iron_sword:1,iron_cuirass:1};`;
const FOES = [['bandit', 5, -2], ['bandit', 6, 2], ['archer', 9, 0], ['chief', 8, 3]];
const TRIALS = 2;
const shares = {};
for (const comp of ['pell', 'ragna', 'hound', 'wolf']) {
  const tot = { ally: 0, player: 0 };
  for (let t = 0; t < TRIALS; t++) {
    await h.open('scene=game&map=forest&spawn=west');
    await h.frames(42);
    const r = await h.page.evaluate(async ({ KIT, FOES, trial, comp }) => {
      const S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
      let a = (0x9e3779b9 * (trial + 1)) >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
      S.flags.introDone = true; new Function('S', KIT)(S);
      const { recalc } = await import('/src/systems/stats.js'); recalc(); S.hp = S.maxHp; S.sp = S.maxSp;
      const p = g.player; p.setPosition(10.5 * 16, 10 * 16);
      g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
      const dmg = { player: 0, ally: 0 }, en = [];
      for (const [k, dx, dy] of FOES) {
        const e = g.addEnemy(k, p.x + dx * 16, p.y + dy * 16, { tier: 0 }); e.alerted = true; e.state = 'chase'; e.cd = 0.5; en.push(e);
        const o = e.takeHit.bind(e);
        e.takeHit = (i) => { const hp0 = Math.max(0, e.hp), d = Math.min(hp0, o(i)); if (i.ally) dmg.ally += d; else if (i.src === 'melee') dmg.player += d; return d; };
      }
      if (comp === 'pell' || comp === 'ragna') { S.follower = true; S.companion = comp; g.spawnFollower(); g.follower.setPosition(p.x - 14, p.y + 2); }
      if (comp === 'hound') { S.flags.houndOwned = true; g.spawnHound(true); }
      const keys = window.__ff.keys, pending = [];
      let tick = 0, el = 0, lastPot = -9;
      const tapK = (c, ms = 70) => { keys._press(c); pending.push([c, tick + Math.max(1, Math.round(ms / 67))]); };
      const move = (vx, vy) => { keys[vx < -0.3 ? '_press' : '_release']('KeyA'); keys[vx > 0.3 ? '_press' : '_release']('KeyD'); keys[vy < -0.3 ? '_press' : '_release']('KeyW'); keys[vy > 0.3 ? '_press' : '_release']('KeyS'); };
      for (;;) {
        await window.__ffStep.frames(4, 1000 / 60); tick++; el += 4 / 60;
        for (let i = pending.length - 1; i >= 0; i--) if (pending[i][1] <= tick) { keys._release(pending[i][0]); pending.splice(i, 1); }
        if (comp === 'wolf' && (!g.spirit || g.spirit.dead)) g.summonSpiritWolf(p);       // the wolf is kept up, as a player re-casting it would
        const foes = en.filter((e) => !e.dead);
        if (S.hp <= 0 || !foes.length || el > 60) { ['KeyW', 'KeyA', 'KeyS', 'KeyD'].forEach((c) => keys._release(c)); break; }
        if (p.mode === 'dead' || p.mode === 'lying') continue;
        let tgt = null, td = 1e9; for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td) { td = d; tgt = e; } }
        if (S.hp < S.maxHp * 0.4 && S.inv.hp_potion > 0 && el - lastPot > 1.2) { tapK('Digit1', 40); lastPot = el; }
        const nx = (tgt.x - p.x) / (td || 1), ny = (tgt.y - p.y) / (td || 1);
        let tele = false; for (const e of foes) { if (e.state === 'windup') { e.__w ??= el; if (el - e.__w > 0.28 && Math.hypot(e.x - p.x, e.y - p.y) < 40) tele = true; } else e.__w = null; }
        if (tele && p.rollCd <= 0 && S.sp >= 22 && p.mode === 'free') { move(-ny * (trial % 2 ? 1 : -1), nx * (trial % 2 ? 1 : -1)); tapK('Space', 60); }
        else if (td > 20) move(nx, ny);
        else { move(0, 0); p.face = { x: Math.abs(nx) > 0.38 ? Math.sign(nx) : 0, y: Math.abs(ny) > 0.38 ? Math.sign(ny) : 0 }; if (!p.face.x && !p.face.y) p.face = { x: 1, y: 0 }; if (S.sp > 14 && p.lockT <= 0) tapK('KeyJ', 50); }
      }
      return dmg;
    }, { KIT, FOES, trial: t, comp });
    tot.ally += r.ally; tot.player += r.player;
  }
  shares[comp] = Math.round((tot.ally / Math.max(1, tot.player)) * 100) / 100;
}
console.log('  companion damage / your damage: ' + JSON.stringify(shares));
for (const [k, s] of Object.entries(shares)) check(`${k} adds roughly 15-25% to your damage (allowed 8-35% for one short fight)`, s >= 0.08 && s <= 0.35, String(s));
const avg = Object.values(shares).reduce((a, b) => a + b, 0) / Object.keys(shares).length;
check('on average a companion adds 15-25%', avg >= 0.13 && avg <= 0.27, String(avg));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMPANION BUDGET FAILED' : 'COMPANION BUDGET PASSED');
process.exit(failCount() ? 1 : 0);
