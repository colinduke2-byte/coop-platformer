import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=barrow0&spawn=entry&seed=424242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// the generators produce the new room kinds
const gen = await G(async () => {
  const BG = await import('/src/world/barrowgen.js'), MG = await import('/src/world/minesgen.js'), out = { spiketrap: 0, mire: 0, ambush: 0, builds: 0 };
  for (let seed = 1; seed <= 40; seed++) {
    for (const b of [BG.buildBarrow(seed * 7919, seed % 8, seed % 4), MG.buildMines(seed * 104729, seed % 2)]) {
      out.builds++;
      for (const e of b.entities) if (out[e.t] !== undefined && e.t !== 'builds') out[e.t]++;
    }
  }
  return out;
});
check('barrows and mines now contain spike halls, flooded halls and ambush rooms', gen.spiketrap >= 8 && gen.mire >= 5 && gen.ambush >= 5, JSON.stringify(gen));

// a spike lane: warns, then strikes; standing in it costs health, standing beside it does not
const sp = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  p.invuln = 0; p.iframes = 0; S.hp = S.maxHp = 100;
  const x = Math.floor(p.x / 16), y = Math.floor(p.y / 16);
  g.addSetPiece({ t: 'spiketrap', x: x - 2, y, w: 5, h: 1, tier: 0, dmg: 12, offset: 0 });
  const s = g.spikeTraps[g.spikeTraps.length - 1];
  p.setPosition(s.x0 + s.w / 2, s.y0 + 6);
  const out = { phases: new Set() };
  const t0 = performance.now();
  await new Promise((res) => { const iv = setInterval(() => { out.phases.add(s.phase = (s.drawn || '').replace(/[ab]$/, '')); if (performance.now() - t0 > 2600) { clearInterval(iv); res(); } }, 40); });
  out.phases = [...out.phases]; out.hp = S.hp;
  return out;
});
check('spikes cycle idle, warning and strike', ['idle', 'warn', 'strike'].every((k) => sp.phases.includes(k)), JSON.stringify(sp));
check('standing in the lane when it strikes hurts', sp.hp < 100, JSON.stringify(sp));
const sp2 = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player, s = g.spikeTraps[g.spikeTraps.length - 1];
  p.invuln = 0; p.iframes = 0; S.hp = 100; p.setPosition(s.x0 + s.w / 2, s.y0 + 40);
  await new Promise((res) => setTimeout(res, 2800));
  return S.hp;
});
check('standing beside the lane is safe', sp2 === 100, String(sp2));

// the flooded hall slows you
const mire = await G(async () => {
  const g = window.gs(), p = g.player, x = Math.floor(p.x / 16), y = Math.floor(p.y / 16) - 4;
  const before = g.mireMul();
  g.addSetPiece({ t: 'mire', x: x - 2, y: y - 2, w: 5, h: 5 });
  p.setPosition((x + 0.5) * 16, (y + 0.5) * 16);
  return { before, inside: g.mireMul(), speedNote: p.speedNow };
});
check('wading through a flooded hall slows you to 55%', mire.before === 1 && Math.abs(mire.inside - 0.55) < 0.001, JSON.stringify(mire));

// the ambush springs once
const amb = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S;
  const x = Math.floor(p.x / 16) - 3, y = Math.floor(p.y / 16) - 3;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  g.addSetPiece({ t: 'ambush', x, y, w: 7, h: 7, kinds: ['draugr', 'wight'], n: 4, tier: 1 });
  const before = g.enemies.getChildren().length;
  p.setPosition((x + 0.5) * 16 + 4, (y + 0.5) * 16 + 4);
  g.setPieceTick(0.1);
  const after = g.enemies.getChildren().length, alerted = g.enemies.getChildren().filter((e) => e.alerted).length;
  g.enemies.getChildren().slice().forEach((e) => e.destroy());
  g.setPieceTick(0.1);
  return { before, after, alerted, again: g.enemies.getChildren().length };
});
check('stepping into an ambush room fills it with alerted foes, once', amb.before === 0 && amb.after >= 3 && amb.alerted >= 3 && amb.again === 0, JSON.stringify(amb));

// a whole generated dungeon with the new rooms still loads, with every foe and chest reachable
const reach = await G(async () => {
  const BG = await import('/src/world/barrowgen.js'), CF = await import('/src/config.js'), solid = new Set(CF.SOLID_TILES), bad = [];
  for (let seed = 1; seed <= 24; seed++) {
    const b = BG.buildBarrow(seed * 7919, seed % 8, seed % 4), start = b.entities.find((e) => e.t === 'spawn');
    const seen = new Uint8Array(b.w * b.h), q = [[start.x, start.y]]; seen[start.y * b.w + start.x] = 1;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = q[i][0] + dx, y = q[i][1] + dy; if (x < 0 || y < 0 || x >= b.w || y >= b.h || seen[y * b.w + x] || solid.has(b.grid[y][x])) continue; seen[y * b.w + x] = 1; q.push([x, y]); }
    for (const e of b.entities) if (['enemy', 'chest', 'spiketrap', 'mire', 'ambush'].includes(e.t) && !(e.t === 'chest' && /^bt\d+_\d+$/.test(e.id)) && !seen[(e.y + (e.t === 'mire' ? 2 : 0)) * b.w + e.x + (e.t === 'mire' ? 2 : 0)]) bad.push(seed + ':' + e.t + ':' + e.id);
  }
  return bad;
});
check('every foe, chest and trap in 24 generated barrows is reachable', reach.length === 0, JSON.stringify(reach.slice(0, 6)));
const uniq = await G(async () => {
  const BG = await import('/src/world/barrowgen.js'), { ITEMS } = await import('/src/data/items.js'), out = {};
  for (let i = 0; i < 24; i++) { const b = BG.buildBarrow(1000 + i, 0, 1), th = BG.barrowTheme(1000 + i, 0), c = b.entities.find((e) => e.t === 'chest' && /boss/.test(e.id)); out[th.id] = c?.loot.some((l) => l.item === BG.THEME_UNIQUE[th.id]) && !!ITEMS[BG.THEME_UNIQUE[th.id]]; }
  const all = Object.values(BG.THEME_UNIQUE).every((id) => ITEMS[id]);
  return { out, all };
});
check('every dungeon theme ends in its own named item', uniq.all && Object.values(uniq.out).every(Boolean) && Object.keys(uniq.out).length >= 5, JSON.stringify(uniq));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'SETPIECES FAILED' : 'SETPIECES PASSED');
process.exit(failCount() ? 1 : 0);
