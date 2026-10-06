import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); });
await G(async () => { window.__dlg = (await import('/src/systems/dialogue.js')).dialogue; window.__dia = await import('/src/data/dialogue.js'); window.__ff.S.flags.introDone = true; });

// ---- Sigrid starts the Four Hearts once the Frostheart is dealt with
await G(() => { const S = window.__ff.S; S.quests.king.status = 'done'; S.flags.ending = 'give'; window.__real = window.__dlg.hud; window.__dlg.hud = { say: async () => {}, choose: async () => 0, hideBox() {} }; });
await G(async () => { await window.__dia.sigrid(); });
check('Sigrid offers the Four Hearts after the Frostheart', (await G(() => window.__ff.S.quests.hearts.status)) === 'active');
await G(() => { window.__dlg.hud = window.__real; });
const tgt = await G(async () => { const q = await import('/src/data/quests.js'); return q.TARGETS.hearts(window.__ff.S.quests.hearts); });
check('the quest marker points at the Glacial Maw in the open world', tgt.map === 'forest', JSON.stringify(tgt));

// ---- the Maw, the Wyrm
await G(() => { gs().changeMap('maw', 'entry', 'door'); });
await h.sleep(1500);
const info = await G(() => { const g = gs(); return { map: g.mapId, boss: g.boss && g.boss.kind, hp: g.boss && g.boss.maxHp, enemies: g.enemies.getLength(), flag: window.__ff.S.flags.maw }; });
check('the Maw has a Rime Wyrm and its guards', info.map === 'maw' && info.boss === 'wyrm' && info.enemies >= 10 && info.flag, JSON.stringify(info));
await h.shot('s25_maw_entry');

// walk into the arena: gate closes and the boss wakes
await G(() => { const g = gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(18 * 16 + 8, 10 * 16); g.player.invuln = 999; window.__ff.S.hp = window.__ff.S.maxHp; });
await h.sleep(900);
check('stepping into the arena engages the Wyrm and shuts the gate', await G(() => gs().boss.engaged && gs().gate.closed));
await h.sleep(2300);
await h.shot('s25_wyrm');
// every attack runs without errors
for (const a of ['breath', 'tail', 'spikes', 'charge', 'nova']) {
  await G((a) => { const b = gs().boss; b.invulnerable = false; b.state = 'chase'; b.atk = a; const p = gs().player.body.center; b.dir = { x: p.x - b.cx, y: p.y - b.cy }; const l = Math.hypot(b.dir.x, b.dir.y) || 1; b.dir.x /= l; b.dir.y /= l; b.setState('windup', 0.35); b.windTotal = 0.35; b.makeTele(a); }, a);
  await h.sleep(1500);
  if (a === 'spikes') await h.shot('s25_spikes');
}
check('all five wyrm attacks run cleanly', h.errors.length === 0, h.errors.join('\n'));
// phase 2 summons wights
await G(() => { const b = gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.45, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2500);
check('phase two: the Wyrm shrieks and calls frost wights', await G(() => gs().boss.bphase === 2 && gs().enemies.getChildren().some((e) => e.kind === 'wight')));
// kill it
await G(() => { const b = gs().boss; b.invulnerable = false; b.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(5200);
check('the Wyrm dies and the Rime Heart flies to you', await G(() => !!window.__ff.S.hearts.rime && !!window.__ff.S.flags.wyrmDead));
check('the arena gate opens again', await G(() => !gs().gate.closed));
check('taking the Rime Heart grants +20 max stamina', (await G(() => window.__ff.S.maxSp)) === 120);

// ---- the Heart's power: a perfect dodge freezes everything nearby
await G(() => {
  const g = gs(); g.enemies.getChildren().slice().forEach((e) => e.destroy());
  const e = g.addEnemy('draugr', g.player.x + 30, g.player.y); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0 };
  g.player.perfectDodge(e); window.__fe = e;
});
check('a perfect dodge now freezes foes (slow + stun)', await G(() => window.__fe.slowT > 2 && window.__fe.stun > 0.5));

// ---- the Wyrm stays dead; re-entering the Maw keeps it open and offers nothing twice
await G(() => { gs().changeMap('maw', 'entry', 'door'); });
await h.sleep(1500);
check('a defeated Wyrm does not return', await G(() => !gs().boss));

// ---- journal text works
await G(() => gs().openMenu(-1, 'QUESTS'));
await h.sleep(500);
await h.shot('s25_journal');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'MAW FAILED' : 'MAW PASSED');
process.exit(failCount() ? 1 : 0);
