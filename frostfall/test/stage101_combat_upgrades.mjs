// Combat pass, upgrades (docs/audit/combat.md): CB24 style heavies and rules, CB27 bullet time for foes only, CB22 smarter
// late foes, CB23 second attacks, CB17 the controller layouts.
import { launch, check, failCount, FRAME_MS } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.pause();
const F = (ms) => Math.max(1, Math.round(ms / FRAME_MS));
const wait = (ms) => h.frames(F(ms));
await wait(700);
const G = (fn, a) => h.ev(fn, a);
const reset = (w) => G((w) => {
  const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear(); g.pend.length = 0;
  g.shots.clear(true, true); g.eshots.clear(true, true);
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 99; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.blocking = false; p.target = null; p.charging = null; p.comboT = 0; p.counterT = 0;
  S.hp = 100; S.sp = 100; S.mp = 100; S.inv[w] = 1; S.equip.weapon = w; S.equip.offhand = null; g.hitStopT = 0;
}, w);
const add = (kind, dx, dy = 0, extra = {}) => G(([kind, dx, dy, extra]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy(kind, g.player.x + dx, g.player.y + dy, extra.tier ? { tier: extra.tier } : {});
  e.cfg = { ...e.cfg, detect: 0, speed: 0, chase: 0, ...extra }; e.hp = e.maxHp = 5000; if (e.wander) { e.wander.t = 99; e.wander.dx = 0; e.wander.dy = 0; }
  return true;
}, [kind, dx, dy, extra]);
const hp = () => G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().map((e) => e.maxHp - e.hp));

// ---- CB24 greatsword: holding heavy charges it; a full charge hits much harder than a tap
await reset('iron_greatsword'); await add('draugr', 22);
await h.tap('KeyU', 2, 0); await wait(1000);
const tapDmg = (await hp())[0];
await reset('iron_greatsword'); await add('draugr', 22);
await h.tap('KeyU', F(1000), 0); await wait(1000);
const chargedDmg = (await hp())[0];
check('a fully charged greatsword heavy hits far harder than a tapped one (CB24)', tapDmg > 0 && chargedDmg > tapDmg * 1.4, `${tapDmg} vs ${chargedDmg}`);

// ---- CB24 halberd: the heavy sweeps all the way round
await reset('iron_halberd'); await add('draugr', 22); await add('draugr', -22);
await h.tap('KeyU', 2, 0); await wait(1000);
const hal = await hp();
check('a halberd heavy hits the foe behind you too (CB24)', hal[0] > 0 && hal[1] > 0, JSON.stringify(hal));

// ---- CB24 mace: the heavy is a ground shock that stuns everything near the blow
await reset('iron_mace'); await add('draugr', 18, -10); await add('draugr', 18, 12);
await h.tap('KeyU', 2, 0);
await h.until(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().every((e) => e.hp < e.maxHp), 60);
const mace = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().map((e) => e.stun > 0.5));
check('a mace heavy shocks the ground and stuns both foes (CB24)', mace.every(Boolean), JSON.stringify(mace));
await wait(800);

// ---- CB24 axe: blows on one foe stack its bleeding
await reset('hand_axe'); await add('draugr', 16);
for (let i = 0; i < 3; i++) { await G(() => { const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0]; e.setPosition(g.player.x + 16, g.player.y); e.body.reset(e.x, e.y); e.body.setVelocity(0, 0); }); await h.tap('KeyJ', 2, 0); await wait(560); }
const axe = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return { stacks: e.axeStacks, bleed: e.statuses?.bleed?.dps }; });
check('axe blows stack bleeding on the same foe (CB24)', axe.stacks >= 3 && axe.bleed >= 4, JSON.stringify(axe));

// ---- CB24 dagger: the heavy steps behind the foe and counts as a backstab
await reset('skinning_knife'); await add('draugr', 30);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.face = { x: -1, y: 0 }; });
await h.tap('KeyU', 2, 0);
await h.until(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e.hp < e.maxHp; }, 60);
const dag = await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; return { behind: g.player.x > e.x, back: g.fx.texts.some((t) => t.t.main && t.t.main.text === 'BACKSTAB') }; });
check('a dagger heavy slips behind the foe for a backstab (CB24)', dag.behind && dag.back, JSON.stringify(dag));
await wait(600);

// ---- CB27: a perfect dodge slows the foes, not the player
await reset('iron_sword'); await add('draugr', 60);
const warp = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0], p = g.player;
  e.alerted = true; e.setState('recover', 1);
  p.perfectDodge(e, true);
  return { sceneSlow: g.slowT > 0, physics: g.physics.world.timeScale };
});
await wait(200);
const after = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].stateT);
check('the perfect dodge slows foes (their timers run at 0.3x), not the scene (CB27)', !warp.sceneSlow && warp.physics === 1 && after > 0.9, JSON.stringify({ warp, after }));
await wait(600);

// ---- CB22: late foes get a third attack slot and shorter cooldowns
const late = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S;
  const keep = { ...S.flags };
  return import('/src/systems/enemyscale.js').then(({ STORY_FLAGS }) => {
    for (const f of STORY_FLAGS) S.flags[f] = true;
    const a = g.addEnemy('bandit', 400, 260, { tier: 3 }); S.flags = keep;
    const b = g.addEnemy('bandit', 400, 290, { tier: 0 });
    return { slotsLate: a.attackSlots(), slotsEarly: b.attackSlots(), cdLate: a.cfg.cooldown, cdEarly: b.cfg.cooldown };
  });
});
check('late foes may strike three at a time and attack more often (CB22)', late.slotsLate === 3 && late.slotsEarly === 2 && late.cdLate < late.cdEarly, JSON.stringify(late));

// ---- CB22: a Relentless foe swings twice
await reset('iron_sword'); await add('bandit', 14);
const rel = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0];
  const { LATE_AFFIXES } = await import('/src/entities/enemyMoves.js'); LATE_AFFIXES.relentless.apply(e);
  e.alerted = true; e.startWindup({ x: -1, y: 0 }); window.__wind = 0; return true;
});
let winds = 0, last = '';
for (let i = 0; i < 90; i++) { const st = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren()[0].state); if (st === 'windup' && last !== 'windup') winds++; last = st; if (st === 'recover') break; await h.frames(1); }
check('a Relentless foe follows its swing with a second one (CB22)', rel && winds >= 2, String(winds));

// ---- CB23: a troll's third attack up close is a crushing ground slam
await reset('iron_sword'); await add('troll', 20);
const slam = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), e = g.enemies.getChildren()[0];
  e.alerted = true; e.atkN = 2; e.startWindup({ x: -1, y: 0 });
  return { alt: e.alt, mark: e.markStr, zones0: g.zones.length };
});
await wait(1300);
const zones = await G(() => window.__ff.game.scene.getScene('Game').zones.length);
check('a troll\'s third blow is a "!!" ground slam zone (CB23)', slam.alt === 'slam' && slam.mark === '!!', JSON.stringify({ slam, zones }));

// ---- CB23: wolves feint (the tell is called off)
await reset('iron_sword'); await add('wolf', 30);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.alerted = true; e.atkN = 1; e.startWindup({ x: -1, y: 0 }); });
await wait(600);
const feint = await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return { st: e.state, mark: e.markStr }; });
check('a wolf feints: its second tell is called off (CB23)', feint.st !== 'attack' && feint.mark === '?', JSON.stringify(feint));

// ---- CB23: an archer's third shot leads a moving target
const lead = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'), p = g.player;
  const { shotDir } = await import('/src/entities/enemyMoves.js');
  const e = g.addEnemy('archer', p.x + 80, p.y); e.dashDir = { x: -1, y: 0 }; e.alt = 'lead';
  p.body.velocity.y = 70;
  const d = shotDir(e, p, 125); p.body.velocity.y = 0;
  return d.y > 0.2;
});
check('an archer\'s aimed shot leads a moving player (CB23)', lead);

// ---- CB17: the default pad layout: LB block, RB heavy; CLASSIC keeps L3 block and the stick heavy
const pad = await G(async () => {
  const k = await import('/src/systems/keys.js'), { settings } = await import('/src/systems/settings.js');
  const m = { ...k.padMap() }; settings.padLayout = 'classic'; const c = { ...k.padMap() }; settings.padLayout = 'modern';
  return { lb: m.b4, rb: m.b5, l3: m.b10 || null, cl3: c.b10, crs: c['a3-'] };
});
check('controller: LB blocks and RB is the heavy by default; CLASSIC keeps L3 / right stick (CB17)', pad.lb === 'KeyF' && pad.rb === 'KeyU' && !pad.l3 && pad.cl3 === 'KeyF' && pad.crs === 'KeyU', JSON.stringify(pad));

check('no page errors', h.errors.length === 0, h.errors.join(' | '));
await h.close();
process.exit(failCount() ? 1 : 0);
