import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
await G(() => { const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend && (g.pend.length = 0); g.player.setPosition(300, 100); const e = g.addEnemy('bandit', 360, 100); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; window.__e = e; });
const st = (s) => G(async (s) => { const m = await import('/src/systems/status.js'); const e = window.__e; return s(m, e); }, null);

// ---- enemy statuses
let r = await G(async () => { const m = await import('/src/systems/status.js'); const e = window.__e; const hp = e.hp; m.applyStatus(e, 'burn', { t: 2, dps: 10 }); return { has: m.hasStatus(e, 'burn'), dot: !!e.dot, hp }; });
check('burn applies and shows as a dot', r.has && r.dot);
await h.sleep(1500);
check('burn deals damage over time', await G(() => window.__e.hp < window.__e.maxHp));
await h.sleep(1500);
check('burn expires', await G(() => !window.__e.statuses.burn));

r = await G(async () => { const m = await import('/src/systems/status.js'); const e = window.__e; m.applyStatus(e, 'chill'); m.applyStatus(e, 'chill'); const two = { ...e.statuses.chill }; m.applyStatus(e, 'chill'); return { two: two.stacks, frozen: m.hasStatus(e, 'freeze'), chillGone: !m.hasStatus(e, 'chill'), mods: m.statusMods(e) }; });
check('three chills freeze, and freeze stops action', r.two === 2 && r.frozen && r.chillGone && !r.mods.act && r.mods.speed === 0, JSON.stringify(r));

r = await G(async () => { const m = await import('/src/systems/status.js'); const e = window.__e; m.clearStatus(e, 'all'); m.applyStatus(e, 'freeze'); m.applyStatus(e, 'burn'); return { thawed: !m.hasStatus(e, 'freeze'), burning: m.hasStatus(e, 'burn') }; });
check('fire thaws ice instead of burning', r.thawed && !r.burning, JSON.stringify(r));

r = await G(async () => { const m = await import('/src/systems/status.js'); const g = window.gs(); const e = window.__e; m.clearStatus(e, 'all'); const imp = g.addEnemy('imp', 400, 100); const ok = m.applyStatus(imp, 'burn'); const go = g.addEnemy('golem', 420, 100); const ok2 = m.applyStatus(go, 'freeze'); imp.destroy(); go.destroy(); return { ok, ok2 }; });
check('immune creatures ignore their immunities', r.ok === false && r.ok2 === false, JSON.stringify(r));

r = await G(async () => { const m = await import('/src/systems/status.js'); const e = window.__e; m.clearStatus(e, 'all'); m.applyStatus(e, 'fear', { t: 2 }); return 1; });
await h.sleep(600);
check('a frightened enemy runs away', await G(() => { const e = window.__e, p = window.gs().player; return Math.hypot(e.x - p.x, e.y - p.y) > 62; }));

// ---- player statuses
r = await G(async () => { const m = await import('/src/systems/status.js'); const g = window.gs(), S = window.__ff.S, p = g.player; p.invuln = 0; p.iframes = 0; S.hp = S.maxHp; m.applyStatus(p, 'bleed', { t: 3, dps: 8 }); return { hp: S.hp }; });
await h.sleep(1300);
check('bleeding hurts the player', await G(() => window.__ff.S.hp < window.__ff.S.maxHp));
check('the status row shows it', await G(async () => { const m = await import('/src/systems/status.js'); return m.statusList(window.gs().player).some((x) => x[0] === 'BLEED'); }));
r = await G(async () => { const g = window.gs(), S = window.__ff.S, p = g.player; S.inv.hp_potion = 1; S.hp = 40; p.statuses.poison = { t: 5, dps: 1, acc: 0 }; p.usePotion('hp_potion'); return { bleed: !!p.statuses.bleed, poison: !!p.statuses.poison }; });
check('a health potion cures bleeding and poison', !r.bleed && !r.poison, JSON.stringify(r));
r = await G(async () => { const m = await import('/src/systems/status.js'); const g = window.gs(), S = window.__ff.S, p = g.player; m.clearStatus(p, 'all'); const e = g.addEnemy('bear', p.x + 20, p.y); e.cfg = { ...e.cfg, inflicts: [{ type: 'bleed', chance: 1, t: 3, dps: 3 }] }; S.hp = S.maxHp; p.invuln = 0; p.iframes = 0; p.hurt(5, e.x, e.y, { attacker: e }); const out = { bleed: !!p.statuses?.bleed }; e.destroy(); return out; });
check('creature hits can inflict statuses on the player', r.bleed, JSON.stringify(r));
r = await G(async () => { const m = await import('/src/systems/status.js'); const g = window.gs(), S = window.__ff.S, p = g.player; m.clearStatus(p, 'all'); p.invuln = 0; p.iframes = 0; S.hp = S.maxHp; p.hurt(20, p.x + 30, p.y, {}); const a = S.maxHp - S.hp; m.applyStatus(p, 'shock'); S.hp = S.maxHp; p.invuln = 0; p.iframes = 0; p.stunT = 0; p.mode = 'free'; p.hurt(20, p.x + 30, p.y, {}); const b = S.maxHp - S.hp; return { a, b }; });
check('shock makes you take more damage', r.b > r.a, JSON.stringify(r));
const clips = await G(async () => {
  const g = window.gs(), tex = g.textures.get('spr_dragon');
  const d = g.addEnemy('dragon', 200, 120); d.cfg = { ...d.cfg, speed: 0, chase: 0, detect: 0 };
  const seen = {};
  d.state = 'idle'; d.finish(0.016, 1); seen.idle = d.frame.name;
  d.state = 'windup'; d.finish(0.016, 1); seen.windup = d.frame.name;
  d.state = 'attack'; d.finish(0.016, 1); seen.attack = d.frame.name;
  d.state = 'chase'; d.flashT = 0.1; d.finish(0.016, 1); seen.hurt = d.frame.name;
  d.destroy();
  return { has: ['side0', 'side1', 'side2', 'attack0', 'hurt0', 'death0'].every((f) => tex.has(f)), seen };
});
check('the dragon has idle, windup, attack, hurt and death frames and uses them', clips.has && clips.seen.attack === 'attack0' && clips.seen.hurt === 'hurt0' && clips.seen.windup === 'side1', JSON.stringify(clips));
const dbg = await G(async () => { const d = await import('/src/systems/debug.js'); return d.debugInfo(window.gs()); });
check('the debug report names the seed, map and errors', dbg.includes('seed:') && dbg.includes('map: village') && dbg.includes('recent errors'), dbg.slice(0, 80));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STATUS FAILED' : 'STATUS PASSED');
