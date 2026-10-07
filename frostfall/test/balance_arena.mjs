// Arena balance bot: each hero plays Survival in the Hollow Pit with a crude policy for its style.
//   node test/balance_arena.mjs [trials=2] [only=hero] [seconds=90]
// A lower bound on human skill: use it to spot a hero that is far weaker or stronger than the others, not as a target.
import { launch } from './harness.mjs';
const trials = Number(process.argv[2] || 2), only = process.argv[3] || '', limit = Number(process.argv[4] || 90);
const STYLE = { warden: 'melee', reaver: 'melee', shadow: 'melee', ranger: 'bow', frostmage: 'cast', pyromancer: 'cast' };
const h = await launch();
await h.open('scene=title'); await h.sleep(900);
const rows = [];
for (const hero of Object.keys(STYLE)) {
  if (only && hero !== only) continue;
  const res = [];
  for (let t = 0; t < trials; t++) {
    await h.ev(async (hero) => { const H = await import('/src/arena/heroes.js'); H.beginQuickRun(hero, { mode: 'survival', arena: 'pit' }); const g = window.__ff.game; for (const k of ['Title', 'Game', 'Hud', 'ArenaSetup', 'ArenaResults']) if (g.scene.isActive(k)) g.scene.stop(k); g.scene.start('Game', { map: 'pit', spawn: 'in' }); }, hero);
    await h.sleep(1500);
    const r = await h.page.evaluate(async ({ style, limit, trial }) => {
      const S = window.__ff.S, keys = window.__ff.keys, g = window.__ff.game.scene.getScene('Game'), p = g.player;
      const tapK = (c, ms = 60) => { keys._press(c); setTimeout(() => keys._release(c), ms); };
      let t0 = performance.now(), lastPot = 0, drawing = 0;
      const face = (dx, dy) => { const n = Math.hypot(dx, dy) || 1, nx = dx / n, ny = dy / n; p.face = { x: Math.abs(nx) > 0.38 ? Math.sign(nx) : 0, y: Math.abs(ny) > 0.38 ? Math.sign(ny) : 0 }; if (!p.face.x && !p.face.y) p.face = { x: 1, y: 0 }; };
      const move = (vx, vy) => { keys[vx < -0.3 ? '_press' : '_release']('KeyA'); keys[vx > 0.3 ? '_press' : '_release']('KeyD'); keys[vy < -0.3 ? '_press' : '_release']('KeyW'); keys[vy > 0.3 ? '_press' : '_release']('KeyS'); };
      return await new Promise((res) => {
        const iv = setInterval(() => {
          const elapsed = (performance.now() - t0) / 1000;
          if (S.hp <= 0 || p.mode === 'dead' || elapsed > limit) { clearInterval(iv); ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyK'].forEach((c) => keys._release(c)); res({ waves: g.arena?.cleared || 0, pts: S.quick.pts, alive: S.hp > 0, time: Math.round(elapsed), arrows: S.arrows, killed: g.arena?.killed || 0 }); return; }
          if (['lying'].includes(p.mode)) return;
          const foes = g.enemies.getChildren().filter((e) => !e.dead && e.active);
          if (!foes.length) { move(0, 0); return; }
          let tgt = null, td = 1e9; for (const e of foes) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < td) { td = d; tgt = e; } }
          const now = performance.now();
          if (S.hp < S.maxHp * 0.4 && S.inv.hp_potion > 0 && now - lastPot > 1200) { tapK('Digit1', 40); lastPot = now; }
          if (S.mp < 20 && S.inv.mp_potion > 0 && style === 'cast' && now - lastPot > 600) { tapK('Digit2', 40); lastPot = now; }
          const dx = tgt.x - p.x, dy = tgt.y - p.y, d = td, nx = dx / (d || 1), ny = dy / (d || 1);
          let telegraph = false;
          for (const e of foes) { if (e.state === 'windup') { e.__w = e.__w || now; if (now - e.__w > 280 && Math.hypot(e.x - p.x, e.y - p.y) < (e.isBoss ? 80 : 40)) telegraph = true; } else e.__w = 0; }
          if (telegraph && p.rollCd <= 0 && S.sp >= 22 && p.mode === 'free') { move(-ny * (trial % 2 ? 1 : -1), nx * (trial % 2 ? 1 : -1)); tapK('Space', 60); return; }
          if (style === 'melee') {
            if (d > 20) move(nx, ny); else { move(0, 0); face(dx, dy); if (S.sp > 14 && p.lockT <= 0) tapK('KeyJ', 50); }
            if (S.sp > 10 && telegraph && S.equip.offhand === 'iron_shield') keys._press('KeyF'); else keys._release('KeyF');
          } else {
            const R = style === 'bow' ? 80 : 65;
            if (d < R - 18) move(-nx, -ny); else if (d > R + 30) move(nx, ny); else move(0, 0);
            face(dx, dy);
            if (d < 24 && style === 'bow' && S.sp > 14) { tapK('KeyJ', 50); }
            else if (style === 'bow') { if (!drawing) { drawing = now; keys._press('KeyK'); } else if (now - drawing > 700) { keys._release('KeyK'); drawing = 0; } }
            else if (S.mp >= 14 && p.lockT <= 0) tapK('KeyL', 50);
          }
        }, 60);
      });
    }, { style: STYLE[hero], limit, trial: t });
    res.push(r);
  }
  const avg = (k) => Math.round(res.reduce((a, r) => a + r[k], 0) / res.length);
  rows.push({ hero, waves: avg('waves'), pts: avg('pts') });
  console.log(`  ${hero.padEnd(12)} waves cleared ${res.map((r) => r.waves).join('/')}  avg score pts ${avg('pts')}  survived ${res.filter((r) => r.alive).length}/${res.length} (${limit}s) kills ${res.map((r) => r.killed).join('/')} arrows left ${res.map((r) => r.arrows).join('/')}`);
}
await h.close();
