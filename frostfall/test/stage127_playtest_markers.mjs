// Playtest pass: quest markers that send you to a guardian point at the guardian.
// Found by test/playtest.mjs: "Find Grimfang in the Pass" pointed 12 tiles east of Grimfang, into the side corridor.
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start');
await h.frames(20);
const r = await h.ev(async () => {
  const S = window.__ff.S, { MAPS } = await import('/src/data/maps.js'), { TARGETS, nextHeart } = await import('/src/data/quests.js'), { HEART_SITE } = await import('/src/data/hearts.js');
  const bossAt = (map) => { const b = MAPS[map].build().entities.find((e) => e.t === 'boss'); return b ? { x: b.x, y: b.y } : null; };
  const out = [];
  const near = (name, t, map) => { const b = bossAt(map); out.push({ name, t, b, d: t && b && t.map === map ? Math.round(Math.hypot(t.x - b.x, t.y - b.y) * 10) / 10 : null }); };
  S.flags.crypt = true; near('king: defeat Jarl Valdrek', TARGETS.king({ status: 'active' }), 'crypt');
  near('alpha: find Grimfang in the Pass', TARGETS.alpha({ status: 'active' }), 'pass');
  // the marker goes to the easiest remaining Heart (nextHeart), so follow the order it picks
  S.hearts = {};
  for (let i = 0; i < 4; i++) { const k = nextHeart(), map = HEART_SITE[k].map; S.flags['seen_' + map] = true; near(`hearts: the guardian of ${map}`, TARGETS.hearts(), map); S.hearts[k] = true; }
  return out;
});
for (const x of r) check(`${x.name}: the marker is within 4 tiles of the guardian`, x.d != null && x.d <= 4, JSON.stringify(x));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'PLAYTEST MARKERS FAILED' : 'PLAYTEST MARKERS PASSED');
process.exit(failCount() ? 1 : 0);
