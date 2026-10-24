// Regression tests for game loops no other test calls by name (CH18):
//  - the nemesis loop: summonNemesis -> it waits with a waypoint -> onNemesisDown pays and clears it
//  - payBounty: a cleared camp pays once
//  - reviveByFollower: Ragna pulls you up with part of your health
//  - summonSpiritWolf: one spirit wolf at a time
//   node test/stage88_loops.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=forest&spawn=west&seed=4242');
await h.wait(1500);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// ---- the nemesis loop
const nem = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player, { TUNE } = await import('/src/data/tuning.js');
  S.nemesis = { kind: 'wolf', kills: 2, tier: 0, x: p.x + 80, y: p.y };
  delete S.flags.waypoint;
  const pend0 = g.pend.length;
  g.summonNemesis();
  const spec = g.pend.slice(pend0).find((q) => q.spec?.nemesis)?.spec;
  const wp = S.flags.waypoint;
  const gold0 = S.gold, slain0 = S.nemesisSlain || 0, picks0 = g.pickups.length;
  g.onNemesisDown({ tier: 0, x: p.x, y: p.y });
  const R = TUNE.economy.rewards.nemesis;
  return { spec: spec && { kind: spec.kind, tier: spec.tier, kills: spec.kills, elite: spec.elite }, wp: !!wp && wp.map === 'forest',
    gone: !S.nemesis, slain: (S.nemesisSlain || 0) - slain0, gold: S.gold - gold0, want: R[0] + R[1] * 2, picks: g.pickups.length - picks0, wpAfter: !!S.flags.waypoint };
});
check('a nemesis waits where you fell, one tier up, with a waypoint', nem.spec?.kind === 'wolf' && nem.spec.tier === 1 && nem.spec.kills === 2 && nem.spec.elite && nem.wp, JSON.stringify(nem));
check('killing it clears it, counts it, pays gold and drops gear', nem.gone && nem.slain === 1 && nem.gold >= nem.want && nem.picks >= 1 && !nem.wpAfter, JSON.stringify(nem));
const bad = await G(() => { const g = window.gs(), S = window.__ff.S; S.nemesis = { kind: 'no_such_foe', kills: 1, x: 10, y: 10 }; g.summonNemesis(); return !S.nemesis; });
check('a nemesis of an unknown kind is dropped, not spawned', bad);

// ---- payBounty
const b = await G(() => {
  const g = window.gs(), S = window.__ff.S, gold0 = S.gold, picks0 = g.pickups.length;
  delete S.bounty.test_camp;
  g.payBounty('test_camp', 1); const g1 = S.gold - gold0, p1 = g.pickups.length - picks0;
  g.payBounty('test_camp', 1);
  return { once: S.bounty.test_camp === true, g1, again: S.gold - gold0 - g1, p1 };
});
check('a cleared camp pays its bounty and a drop once', b.once && b.g1 > 0 && b.again === 0 && b.p1 === 1, JSON.stringify(b));

// ---- reviveByFollower
const rv = await G(async () => {
  const g = window.gs(), S = window.__ff.S, p = g.player, { TUNE } = await import('/src/data/tuning.js');
  S.companion = 'ragna'; S.follower = true; g.spawnFollower();
  S.hp = 0; p.mode = 'dead'; g.deadT = 2;
  g.reviveByFollower();
  return { hp: S.hp, want: Math.round(S.maxHp * TUNE.follower.reviveHp), mode: p.mode, at: S.flags.reviveAt === S.playtime, near: Math.hypot(p.x - g.follower.x, p.y - g.follower.y) < 12 };
});
check('the follower revives you with part of your health, beside her', rv.hp === rv.want && rv.mode === 'free' && rv.at && rv.near, JSON.stringify(rv));

// ---- summonSpiritWolf
const sw = await G(() => {
  const g = window.gs(), p = g.player;
  g.summonSpiritWolf(p); const a = g.spirit;
  g.summonSpiritWolf(p); const b = g.spirit;
  return { a: !!a, b: !!b, other: a !== b };
});
check('the spirit wolf comes, and a second call replaces it', sw.a && sw.b && sw.other, JSON.stringify(sw));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
console.log(failCount() ? 'LOOPS FAILED' : 'LOOPS PASSED');
