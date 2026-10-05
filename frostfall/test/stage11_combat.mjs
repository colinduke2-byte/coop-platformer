import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };
const reset = () => G(() => {
  const g = window.__ff.game.scene.getScene('Game'); const S = window.__ff.S;
  g.enemies.getChildren().slice().forEach((e) => e.destroy()); g.enemies.clear();
  g.shots.clear(true, true); g.eshots.clear(true, true);
  g.zones.forEach((z) => { z.disc.destroy(); z.rg.destroy(); }); g.zones.length = 0;
  const p = g.player; p.setPosition(300, 250); p.body.setVelocity(0, 0); p.mode = 'free'; p.stunT = 0; p.lockT = 0; p.invuln = 0; p.iframes = 0; p.swing = null; p.face = { x: 1, y: 0 }; p.ward = null; p.blocking = false;
  S.hp = 100; S.mp = 100; S.sp = 100; S.arrows = 20;
});
const dummy = (kind, dx = 40, extra = {}) => G(([kind, dx, extra]) => {
  const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy(kind, g.player.x + dx, g.player.y);
  e.cfg = { ...e.cfg, detect: 0, speed: 0, ...extra }; e.hp = e.maxHp; return e.maxHp;
}, [kind, dx, extra]);
const enemy = () => G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; return e && { hp: e.hp, dead: e.dead, stun: e.stun, x: e.x, slow: e.slowT, state: e.state, guard: e.guardBroken || 0 }; });

// ---- elemental weakness: fire hurts draugr more than frost
await reset(); await dummy('draugr', 50);
await tap('KeyL', 60); await h.sleep(1100);
const fire = 40 - (await enemy()).hp;
await reset(); await dummy('draugr', 50);
await tap('KeyQ'); await tap('KeyL', 60); await h.sleep(1100);
const frost = 40 - (await enemy()).hp;
check('draugr take extra fire damage and resist frost', fire > frost * 2, `fire=${fire} frost=${frost}`);

// ---- lightning needs Destruction 4
await reset();
await G(() => { window.__ff.S.skills.destruction.lvl = 1; window.__ff.S.spell = 'fire'; });
await tap('KeyQ'); await tap('KeyQ'); await tap('KeyQ');
const sp1 = await G(() => window.__ff.S.spell);
check('locked spells are skipped when cycling', sp1 !== 'shock', sp1);
await G(() => { window.__ff.S.skills.destruction.lvl = 4; window.__ff.S.spell = 'frost'; });
await tap('KeyQ');
check('Lightning unlocks at Destruction 4', await G(() => window.__ff.S.spell) === 'shock');
await reset(); await dummy('draugr', 50);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.addEnemy('draugr', g.player.x + 75, g.player.y + 4); e.cfg = { ...e.cfg, detect: 0, speed: 0 }; window.__ff.S.spell = 'shock'; });
const mp0 = await G(() => window.__ff.S.mp);
await tap('KeyL', 60); await h.sleep(300);
const hits = await G(() => window.__ff.game.scene.getScene('Game').enemies.getChildren().filter((e) => e.hp < e.maxHp).length);
check('lightning chains between nearby enemies', hits === 2, `hit=${hits}`);
check('lightning costs mana', (await G(() => window.__ff.S.mp)) < mp0 - 10);

// ---- heal + ward
await reset();
await G(() => { window.__ff.S.hp = 30; window.__ff.S.spell = 'heal'; });
await tap('KeyL', 60); await h.sleep(200);
check('Healing restores health', (await G(() => window.__ff.S.hp)) > 55);
await G(() => { window.__ff.S.skills.restoration.lvl = 3; window.__ff.S.spell = 'ward'; window.__ff.S.mp = 100; });
await tap('KeyL', 60); await h.sleep(300);
const ward = await G(() => { const p = window.__ff.game.scene.getScene('Game').player; return p.ward && p.ward.hp; });
check('Ward is raised', ward > 20, String(ward));
const hpW = await G(() => window.__ff.S.hp);
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.hurt(12, p.x + 20, p.y); });
check('Ward absorbs damage', (await G(() => window.__ff.S.hp)) >= hpW - 0.01);

// ---- shield: block, parry, guard break
await reset();
await G(() => { const S = window.__ff.S; S.inv.wooden_shield = 1; S.equip.offhand = 'wooden_shield'; });
await press('KeyF'); await h.sleep(500);
check('F raises the shield', await G(() => window.__ff.game.scene.getScene('Game').player.blocking));
const hp1 = await G(() => window.__ff.S.hp);
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.hurt(20, p.x + 20, p.y); });
const lost = hp1 - (await G(() => window.__ff.S.hp));
check('blocking a frontal hit reduces it', lost > 0 && lost <= 9, `lost=${lost}`);
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.invuln = 0; });
const hp2 = await G(() => window.__ff.S.hp);
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.hurt(20, p.x - 20, p.y); });   // from behind
check('hits from behind are not blocked', hp2 - (await G(() => window.__ff.S.hp)) >= 17);
await rel('KeyF'); await h.sleep(150);
// parry: lower and raise right before a hit
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.invuln = 0; window.__ff.S.hp = 100; });
await press('KeyF'); await h.sleep(400);
const hp3 = await G(() => window.__ff.S.hp);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.player; p.blockT = 0.05; p.hurt(30, p.x + 20, p.y); });
check('a well-timed block parries (no damage)', (await G(() => window.__ff.S.hp)) === hp3);
await rel('KeyF');

// ---- shielded draugr
await reset(); await dummy('warden', 14);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.face = { x: -1, y: 0 }; });
await tap('KeyJ', 60); await h.sleep(250);
check('Draugr Warden blocks frontal sword hits', (await enemy()).hp === 60);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.face = { x: 1, y: 0 }; e.stun = 2; e.guardBroken = 0; window.__ff.S.sp = 100; const p = window.__ff.game.scene.getScene('Game').player; p.lockT = 0; p.swing = null; });
await h.sleep(500);
await G(() => { const e = window.__ff.game.scene.getScene('Game').enemies.getChildren()[0]; e.face = { x: 1, y: 0 }; e.stun = 2; });
await tap('KeyJ', 60); await h.sleep(250);
check('...but takes damage from behind', (await enemy()).hp < 60);

// ---- two-handed weapon & dual wield
await reset();
await G(() => { const S = window.__ff.S; S.inv.iron_greatsword = 1; S.inv.hunting_knife = 1; S.equip.weapon = 'iron_greatsword'; S.equip.offhand = null; });
const w2 = await G(async () => (await import('/src/systems/stats.js')).stats.is2H());
check('greatsword is two-handed', w2);
const refuse = await G(async () => { const m = await import('/src/systems/inventory.js'); return m.equip('hunting_knife', 'offhand'); });
check('cannot dual-wield with a two-handed weapon', refuse === false);
await G(() => { const S = window.__ff.S; S.equip.weapon = 'iron_sword'; S.inv.iron_sword = 1; });
const dual = await G(async () => { const m = await import('/src/systems/inventory.js'); const ok = m.equip('hunting_knife', 'offhand'); const st = (await import('/src/systems/stats.js')).stats; return { ok, off: st.offhandDmg() }; });
check('off-hand weapon adds damage', dual.ok && dual.off === 6, JSON.stringify(dual));

// ---- finisher on a staggered, nearly dead foe
await reset(); await dummy('draugr', 14);
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const e = g.enemies.getChildren()[0]; e.hp = 8; e.stun = 1; window.__ff.S.sp = 100; g.player.lockT = 0; });
await tap('KeyJ', 60); await h.sleep(250);
{ const e = await enemy(); check('staggered low-health enemies are executed', !e || e.dead); }

// ---- arrow recovery
await reset();
await G(() => { window.__ff.S.arrows = 10; window.__rnd = Math.random; Math.random = () => 0.1; });
await press('KeyK'); await h.sleep(900); await rel('KeyK'); await h.sleep(2500);
await G(() => { Math.random = window.__rnd; });
const rec = await G(() => ({ arrows: window.__ff.S.arrows, pk: window.__ff.game.scene.getScene('Game').pickups.filter((p) => p.spec.type === 'arrows').length }));
check('arrows can be recovered', rec.arrows > 9 || rec.pk > 0, JSON.stringify(rec));

// ---- difficulty scaling
await reset();
const norm = await G(() => { const g = window.__ff.game.scene.getScene('Game'); window.__sd = (d) => { localStorage.setItem('x', 1); }; return 1; });
await G(async () => { (await import('/src/systems/settings.js')).settings.difficulty = 'hard'; });
const hardHp = await dummy('draugr', 200);
await G(async () => { (await import('/src/systems/settings.js')).settings.difficulty = 'easy'; });
const easyHp = await dummy('draugr', 220);
await G(async () => { (await import('/src/systems/settings.js')).settings.difficulty = 'normal'; });
check('difficulty scales enemy health', hardHp > 40 && easyHp < 40, `hard=${hardHp} easy=${easyHp}`);

// ---- enemy tactics: only two attack at once
await reset();
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.player; p.invuln = 999; for (let i = 0; i < 5; i++) { const e = g.addEnemy('bandit', p.x + 30 + i * 4, p.y + (i - 2) * 10); e.alerted = true; e.state = 'chase'; e.cd = 0; } });
let maxAtk = 0, strafers = 0;
for (let i = 0; i < 40; i++) {
  const r = await G(() => { const es = window.__ff.game.scene.getScene('Game').enemies.getChildren(); return { a: es.filter((e) => e.state === 'windup' || e.state === 'attack').length, s: es.filter((e) => e.strafeDir).length }; });
  maxAtk = Math.max(maxAtk, r.a); strafers = Math.max(strafers, r.s);
  await h.sleep(60);
}
check('crowds take turns (max 2 attackers, others circle)', maxAtk <= 2 && strafers > 0, `maxAtk=${maxAtk} strafers=${strafers}`);

// ---- bandit retreats when hurt
await reset();
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.player; p.invuln = 999; const e = g.addEnemy('bandit', p.x + 30, p.y); e.alerted = true; e.state = 'chase'; e.hp = 5; });
let fled = false;
for (let i = 0; i < 20 && !fled; i++) { fled = (await enemy()).state === 'flee'; await h.sleep(60); }
check('wounded bandits retreat', fled);

// ---- caster zone
await reset();
await G(() => { const g = window.__ff.game.scene.getScene('Game'); const p = g.player; p.invuln = 0; const e = g.addEnemy('conjurer', p.x + 90, p.y); e.alerted = true; e.state = 'chase'; e.cd = 0; });
let zone = false;
for (let i = 0; i < 60 && !zone; i++) { zone = await G(() => window.__ff.game.scene.getScene('Game').zones.length > 0); await h.sleep(50); }
check('Hexcaster telegraphs a ground blast', zone);

// ---- regen out of combat
await reset();
await G(() => { window.__ff.S.hp = 50; const p = window.__ff.game.scene.getScene('Game').player; p.lastHurt = -99; });
await h.sleep(2500);
check('health slowly regenerates out of combat', (await G(() => window.__ff.S.hp)) > 51);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'COMBAT FAILED' : 'COMBAT PASSED');
process.exit(failCount() ? 1 : 0);
