import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=gate&seed=424242'); await h.sleep(2000);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.__ff.S.flags.introDone = true; });
await h.sleep(800);
const c = await G(() => {
  const g = window.__ff.game.scene.getScene('Game');
  return { n: g.critters?.length || 0, kinds: (g.critters || []).map((x) => x.kind).join(',') };
});
check('the village keeps hens and a dog', c.n >= 2, JSON.stringify(c));
const x0 = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.critters.map((q) => [q.x, q.y]); });
await h.sleep(3000);
const x1 = await G(() => { const g = window.__ff.game.scene.getScene('Game'); return g.critters.map((q) => [q.x, q.y]); });
check('the critters wander', JSON.stringify(x0) !== JSON.stringify(x1), '');

// errands on the bounty board
await G(() => { window.__ff.S.contracts = null; });
const er = await G(async () => {
  const C = await import('/src/data/contracts.js'), S = window.__ff.S;
  const kinds = {};
  for (let d = 0; d < 40; d++) { S.contracts = null; S.playtime = d * 720 + 5; const o = C.ensureContracts(); for (const q of o.offers) kinds[q.kind] = (kinds[q.kind] || 0) + 1; }
  return kinds;
});
check('the board never breaks and offers a mix of jobs', Object.keys(er).length >= 3, JSON.stringify(er));

// lost satchel completes when you reach it; escort completes when the pilgrim arrives with you
const done = await G(async () => {
  const C = await import('/src/data/contracts.js'), S = window.__ff.S, g = window.__ff.game.scene.getScene('Game');
  const out = {}; g.PickupClass = g.PickupClass || (await import('/src/entities/Pickup.js')).default;
  const T = 16;
  S.contracts = { day: (await import('/src/systems/bless.js')).today(), active: ['lost_x', 'escort_y'], done: {}, offers: [
    { id: 'lost_x', kind: 'lost', x: 30, y: 30, tier: 0, gold: 70, gear: 0 }, { id: 'escort_y', kind: 'escort', x: 31, y: 31, tier: 0, gold: 70, gear: 0 }] };
  const g0 = S.gold;
  g.mapId = 'forest'; g.player.setPosition(30 * T, 30 * T); g.livingTick(0.1);
  out.lost = !!S.contracts.done.lost_x;
  g.livingTick(0.1); out.spawned = !!g.escortSprite;
  g.player.setPosition(31 * T, 31 * T); g.escortSprite.img.setPosition(31 * T, 31 * T); g.livingTick(0.1);
  out.escort = !!S.contracts.done.escort_y; out.gold = S.gold - g0 >= 140;
  g.livingTick(0.1); out.cleaned = !g.escortSprite;
  return out;
});
check('lost-item and escort jobs complete and pay', Object.values(done).every(Boolean), JSON.stringify(done));
// landmarks are sighted from afar
await h.open('scene=game&map=forest&spawn=west&seed=424242'); await h.sleep(1500);
const sg = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, D = await import('/src/world/discovery.js');
  window.__ff.S.flags.introDone = true; S.sighted = {}; S.discovered = {};
  const lm = g.built.pois.find((p) => D.LANDMARKS.has(p.kind));
  if (!lm) return { none: true };
  g.player.setPosition((lm.x - 30) * 16, lm.y * 16); g.discoverTick();
  const sighted = !!S.sighted['forest:' + lm.id], found = !!S.discovered['forest:' + lm.id];
  g.player.setPosition(lm.x * 16, lm.y * 16); g.discoverTick();
  return { sighted, found, now: !!S.discovered['forest:' + lm.id] };
});
check('tall landmarks are sighted from afar, found up close', (sg.sighted && !sg.found && sg.now), JSON.stringify(sg));
const sk = await G(async () => {
  const K = await import('/src/systems/keys.js'); const o = {};
  K.stick.kb = false; K.stick.mag = 0.6; o.gentle = K.stickWalk() < 0.7 && K.stickWalk() >= 0.5;
  K.stick.mag = 1; o.full = K.stickWalk() === 1; K.stick.mag = 0.6; K.stick.kb = true; o.kb = K.stickWalk() === 1; K.stick.mag = 0; K.stick.kb = false;
  return o;
});
check('a gentle stick push walks slower, a full push runs, the keyboard is unaffected', Object.values(sk).every(Boolean), JSON.stringify(sk));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'TOWN FAILED' : 'TOWN PASSED');
process.exit(failCount() ? 1 : 0);
