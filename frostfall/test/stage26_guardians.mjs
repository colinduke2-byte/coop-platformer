import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await h.ev(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

const DUNGEONS = [
  { map: 'keep', boss: 'warlord', heart: 'iron', flag: 'warlordDead' },
  { map: 'chapel', boss: 'tide', heart: 'tide', flag: 'tideDead' },
  { map: 'rootvault', boss: 'root', heart: 'root', flag: 'rootDead' },
];
for (const d of DUNGEONS) {
  await G((m) => { window.gs().changeMap(m, 'entry', 'door'); }, d.map);
  await h.sleep(1500);
  const info = await G(() => { const g = window.gs(); return { map: g.mapId, boss: g.boss && g.boss.kind, enemies: g.enemies.getLength(), chests: g.interactables.filter((i) => i.spec && i.spec.loot).length }; });
  check(`${d.map}: has its boss, a garrison and chests`, info.map === d.map && info.boss === d.boss && info.enemies >= 12 && info.chests >= 2, JSON.stringify(info));
  await h.shot('s26_' + d.map);
  await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; g.player.setPosition(b.x, 7.5 * 16); g.player.invuln = 999; window.__ff.S.hp = window.__ff.S.maxHp; });
  await h.sleep(900);
  check(`${d.map}: the arena gate closes and the guardian wakes`, await G(() => window.gs().boss.engaged && window.gs().gate.closed));
  await h.sleep(2400);
  // every move in the pool runs cleanly
  const pool = await G(() => { const b = window.gs().boss; const set = new Set(); for (const ph of [1, 2, 3]) for (const dist of [20, 90]) { b.bphase = Math.min(ph, 2); for (let i = 0; i < 40; i++) b.attackPool(dist).forEach((a) => set.add(a)); } b.bphase = 1; return [...set]; });
  for (const a of pool) {
    await G((a) => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.atk = a; const p = window.gs().player.body.center; const l = Math.hypot(p.x - b.cx, p.y - b.cy) || 1; b.dir = { x: (p.x - b.cx) / l, y: (p.y - b.cy) / l }; b.setState('windup', 0.3); b.windTotal = 0.3; b.makeTele(a); }, a);
    await h.sleep(1300);
  }
  check(`${d.map}: all ${pool.length} moves run cleanly (${pool.join(' ')})`, h.errors.length === 0, h.errors.join('\n'));
  await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.4, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(2700);
  check(`${d.map}: phase two begins`, await G(() => window.gs().boss.bphase === 2));
  await G(() => { const b = window.gs().boss; b.invulnerable = false; b.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
  await h.sleep(5200);
  check(`${d.map}: the Heart of ${d.heart} is claimed`, await G(([hh, f]) => !!window.__ff.S.hearts[hh] && !!window.__ff.S.flags[f], [d.heart, d.flag]));
  await G(() => { window.gs().pickups.length = 0; });
}
// Heart powers
const pow = await G(() => { const S = window.__ff.S; const st = window.__ff.stats; return { hearts: Object.keys(S.hearts).sort().join() }; });
check('three more Hearts held', pow.hearts.includes('iron') && pow.hearts.includes('root') && pow.hearts.includes('tide'), JSON.stringify(pow));
const armor = await G(async () => { const { stats } = await import('/src/systems/stats.js'); return stats.armor(); });
check('the Iron Heart adds 8% armour', armor >= 0.08, String(armor));

// ---- the Winter Throne
await G(() => { window.__ff.S.hearts = { rime: true, iron: true, tide: true, root: false }; });
await G(() => { const g = window.gs(); g.changeMap('forest', 'throne', 'door'); });
await h.sleep(1500);
const gate = await G(() => { const g = window.gs(); const ex = g.exits.find((e) => e.to === 'throne'); return ex && { needs: ex.needs, x: ex.rect.x, y: ex.rect.y }; });
check('the throne door is marked as sealed until all four Hearts', gate && gate.needs === 'hearts4', JSON.stringify(gate));
await G((g) => { const p = window.gs().player; p.setPosition(g.x + 16, g.y + 8); p.invuln = 999; }, gate);
await h.sleep(900);
check('with three Hearts the door will not open', (await G(() => window.gs().mapId)) === 'forest');
await G(() => { window.__ff.S.hearts.root = true; });
await G((g) => { const p = window.gs().player; p.setPosition(g.x + 16, g.y + 40); }, gate);
await h.sleep(300);
await G((g) => { const p = window.gs().player; p.setPosition(g.x + 16, g.y + 8); }, gate);
await h.sleep(1500);
check('with all four Hearts the throne opens', (await G(() => window.gs().mapId)) === 'throne');
await h.shot('s26_throne');
await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); const b = g.boss; g.player.setPosition(b.x, 13 * 16); g.player.invuln = 999; window.__ff.S.hp = window.__ff.S.maxHp; });
await h.sleep(900);
await h.sleep(2600);
// three phases
await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.6, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2700);
check('final boss: second face', await G(() => window.gs().boss.bphase === 2));
await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.3, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2700);
check('final boss: third face', await G(() => window.gs().boss.bphase === 3));
await h.shot('s26_winter');
await G(() => { window.__dlg = null; });
await G(async () => { const dlg = (await import('/src/systems/dialogue.js')).dialogue; window.__real = dlg.hud; dlg.hud = { say: async () => {}, choose: async () => 1, hideBox() {} }; });
await G(() => { const b = window.gs().boss; b.invulnerable = false; b.takeHit({ dmg: 99999, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(5500);
check('the Long Winter falls and the choice is made', await G(() => window.__ff.S.flags.winterDead === true && window.__ff.S.flags.finale === 'warden'), await G(() => JSON.stringify(window.__ff.S.flags)));
await h.sleep(800);
check('an ending plays', await G(() => window.__ff.game.scene.getScenes(true).some((s) => s.scene.key === 'Ending')));
await h.shot('s26_ending');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'GUARDIANS FAILED' : 'GUARDIANS PASSED');
process.exit(failCount() ? 1 : 0);
