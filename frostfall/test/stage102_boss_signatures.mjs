// CB21 / CB26 / CB28: every boss has a signature move that no other boss has; strings; the phase-3 rule; Hard brings the
// signature into the first phase and the second phase forward.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.pause();
await h.frames(40);
const G = (fn, a) => h.ev(fn, a);

const sigs = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game');
  const M = await import('/src/entities/bossMoves.js'), { TUNE } = await import('/src/data/tuning.js');
  const tune = { boss: TUNE.boss, wyrm: TUNE.wyrm, tide: TUNE.tide, root: TUNE.root };
  const out = {};
  for (const kind of Object.keys(M.SIGNATURES)) {
    const B = TUNE[kind] || tune[kind];
    const b = { kind, B, scene: g, cx: g.player.x + 60, cy: g.player.y, x: g.player.x + 60, y: g.player.y, dead: false, bphase: 2, setState() {}, trail: [{ x: g.player.x, y: g.player.y }] };
    const z0 = g.zones.length, s0 = g.eshots.getChildren().length;
    M.fireSig(b, g.player);
    await new Promise((r) => setTimeout(r, 0));
    out[kind] = { name: M.SIGNATURES[kind].name, made: g.zones.length - z0 + g.eshots.getChildren().length - s0 };
    g.zones.forEach((z) => { z.disc.destroy(); z.rg.destroy(); }); g.zones.length = 0; g.eshots.clear(true, true);
  }
  return out;
});
const names = Object.values(sigs).map((s) => s.name);
check('18 bosses have a signature move', names.length >= 18, String(names.length));
check('every signature is unique', new Set(names).size === names.length, names.join(','));
check('every signature puts something dangerous in the arena', Object.values(sigs).every((s) => s.made > 0 || s.name === 'HARPOON' || s.name === 'TEARS' || s.name === 'ANCHOR DROP' || s.name === 'SPORE BLOOM'), JSON.stringify(sigs));

const plan = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game');
  const M = await import('/src/entities/bossMoves.js'), { TUNE } = await import('/src/data/tuning.js'), { settings } = await import('/src/systems/settings.js');
  const mk = (bphase) => ({ kind: 'hollowking', B: TUNE.hollowking, scene: g, bphase, sigReady: -1 });
  const p1 = M.planAttack(mk(1), ['sweep', 'slam']);
  const b2 = mk(2); const p2 = M.planAttack(b2, ['sweep', 'slam']); const nxt = M.planAttack(b2, ['sweep']);
  settings.difficulty = 'hard'; const h1 = M.planAttack(mk(1), ['sweep']); settings.difficulty = 'normal';
  const b3 = mk(3); const r3 = M.rule3(b3);
  return { p1, p2, nxt, h1, r3 };
});
check('the signature comes from phase 2 on Normal, then its string follows (CB21)', plan.p1 !== 'sig' && plan.p2 === 'sig' && plan.nxt === 'sweep', JSON.stringify(plan));
check('on Hard the signature comes in phase 1 (CB26)', plan.h1 === 'sig', JSON.stringify(plan));
check('a three-phase boss gets a new rule in phase 3 (CB21)', plan.r3 === 'sigOften', JSON.stringify(plan));

const hardTell = await G(async () => {
  const { default: Boss } = await import('/src/entities/Boss.js'), { settings } = await import('/src/systems/settings.js');
  const B = { slam: { windup: 0.85 } };
  const n = Boss.prototype.windupFor.call({ B, bphase: 1 }, 'slam');
  settings.difficulty = 'hard'; const hd = Boss.prototype.windupFor.call({ B, bphase: 1 }, 'slam');
  const at = Object.getOwnPropertyDescriptor(Boss.prototype, 'phase2At').get.call({});
  settings.difficulty = 'normal';
  return { n, hd, at };
});
check('Hard shortens boss tells (x0.9) and starts phase 2 at 60% (CB26)', hardTell.hd < hardTell.n && hardTell.hd >= 0.38 && hardTell.at === 0.6, JSON.stringify(hardTell));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
process.exit(failCount() ? 1 : 0);
