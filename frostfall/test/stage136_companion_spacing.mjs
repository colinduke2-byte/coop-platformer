/* global Phaser */
// Companions keep their distance and fight hit-and-run: Pell, the hound and the Spirit Wolf circle a foe, crouch, dart in,
// strike and spring back out about 30 px. None of them sits inside a foe's body for more than a moment.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=forest&spawn=west');
await h.wait(700);
const r = await h.ev(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  S.flags.introDone = true;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  const p = g.player; p.setPosition(10.5 * 16, 10 * 16); p.invuln = 999;
  const en = [];
  for (const [k, dx, dy] of [['bandit', 40, -10], ['wolf', 44, 20]]) { const e = g.addEnemy(k, p.x + dx, p.y + dy); e.alerted = true; e.state = 'chase'; e.hp = e.maxHp = 99999; e.foe = null; en.push(e); }
  S.follower = true; S.companion = 'pell'; g.spawnFollower(); g.follower.setPosition(p.x - 14, p.y + 2);
  S.flags.houndOwned = true; g.spawnHound(true);
  g.summonSpiritWolf(p);
  const comps = () => [g.follower, g.hound, g.spirit].filter((c) => c && c.active && !c.dead);
  const R = (b) => new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height);
  const stats = {};
  for (const c of comps()) stats[c.kind] = { inside: 0, insideMax: 0, seq: [], last: null, backs: [], strikes: 0 };
  const strikes = new Map();
  for (const e of en) { const o = e.takeHit.bind(e); e.takeHit = (i) => { if (i.from && i.ally) { const k = i.from.kind; strikes.set(k, (strikes.get(k) || 0) + 1); } return o(i); }; }
  for (let f = 0; f < 60 * 12; f++) {
    for (const e of en) e.foe = null;                       // keep the foes on you for this test (the aggro test covers the rest)
    await window.__ffStep.frames(1, 1000 / 60);
    if (!g.spirit || g.spirit.dead) { g.spirit = null; g.summonSpiritWolf(p); stats.spirit = stats.spirit || { inside: 0, insideMax: 0, seq: [], last: null, backs: [] }; }
    for (const c of comps()) {
      const s = stats[c.kind] ||= { inside: 0, insideMax: 0, seq: [], last: null, backs: [] };
      const ov = !c.downed && en.some((e) => !e.dead && Phaser.Geom.Intersects.RectangleToRectangle(R(c.body), R(e.body)));
      s.inside = ov ? s.inside + 1 / 60 : 0; s.insideMax = Math.max(s.insideMax, s.inside);
      const st = c.sk?.st || null;
      if (st !== s.last) {
        if (s.last === 'back' && s.backFrom) s.backs.push(Math.round(Math.hypot(c.x - s.backFrom.x, c.y - s.backFrom.y)));
        if (st === 'back') s.backFrom = { x: c.x, y: c.y };
        if (st) s.seq.push(st[0]);
        s.last = st;
      }
    }
  }
  for (const k of Object.keys(stats)) { stats[k].seq = stats[k].seq.join(''); stats[k].strikes = strikes.get(k) || 0; stats[k].insideMax = Math.round(stats[k].insideMax * 100) / 100; }
  return stats;
});
console.log('  ' + Object.entries(r).map(([k, s]) => `${k}: inside max ${s.insideMax}s, ${s.strikes} blows, springs ${s.backs.join(',')}`).join('\n  '));
for (const k of ['pell', 'hound', 'spirit']) {
  const s = r[k] || {};
  check(`${k}: never inside a foe's body for more than a moment`, s.insideMax <= 0.35, JSON.stringify(s));
  check(`${k}: the hit-and-run cycle happens (circle, crouch, dart, back) and lands blows`, /c+w+d+b+c/.test(s.seq || '') && (s.seq.match(/wd/g) || []).length >= 3 && s.strikes >= 3, JSON.stringify(s));
  const backs = s.backs || [];
  const avg = backs.reduce((a, b) => a + b, 0) / Math.max(1, backs.length);
  check(`${k}: springs back out about 30 px after a strike`, backs.length >= 2 && avg >= 15 && avg <= 45, JSON.stringify(backs));
}
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMPANION SPACING FAILED' : 'COMPANION SPACING PASSED');
process.exit(failCount() ? 1 : 0);
