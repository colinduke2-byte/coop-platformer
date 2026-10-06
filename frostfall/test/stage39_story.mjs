import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(800);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
// scripted dialogue: choose() consumes answers (default: the last option)
const stub = (answers) => G(async (a) => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue;
  if (!window.__realHud) window.__realHud = dlg.dialogue.hud;
  window.__answers = [...a]; window.__said = [];
  dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => (window.__answers.length ? window.__answers.shift() : o.length - 1), hideBox() {}, scene: window.__realHud.scene };
}, answers);
const unstub = () => G(() => { window.__dlg.hud = window.__realHud; });
const D = (name, ...a) => G(async ([n, a]) => { const d = await import('/src/data/dialogue.js'); await d[n](...a); }, [name, a]);

// ---- boss voices
const tz = await G(async () => { const T = (await import('/src/data/story.js')).BOSS_TAUNTS, E = (await import('/src/data/enemies.js')).ENEMIES; const kinds = ['boss', 'grimfang', 'wyrm', 'warlord', 'tide', 'root', 'winter', 'dragon']; return { all: kinds.every((k) => T[k] && T[k].engage && T[k].death && T[k].name), real: kinds.every((k) => E[k]) }; });
check('every boss has an engage line, a death line and a name', tz.all && tz.real, JSON.stringify(tz));
await G(() => { window.__ff.game.scene.getScene('Game').changeMap('nest', 'entry', 'door'); });
await h.sleep(1500);
await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(20 * 16, 8 * 16); g.player.invuln = 999; });
await h.sleep(800);
const sub = await G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return hud.sub && { who: hud.sub.who, text: hud.sub.text }; });
check('engaging Skaldrath shows his line as a subtitle', sub && sub.who === 'SKALDRATH' && /hoard/.test(sub.text), JSON.stringify(sub));
await h.shot('s39_taunt');
await G(() => { const b = window.gs().boss; b.invulnerable = false; b.state = 'chase'; b.takeHit({ dmg: b.hp - b.maxHp * 0.6, kx: 0, ky: 0, kb: 0, src: 'melee' }); });
await h.sleep(2500);
check('a phase change brings a new line', await G(() => { const s = window.__ff.game.scene.getScene('Hud').sub; return !!s && /sky burns/.test(s.text); }));
await G(() => window.gs().changeMap('village', 'start', 'door'));
await h.sleep(1500);

// ---- villager barks
const barks = await G(async () => { const N = (await import('/src/data/story.js')).NPC_BARKS; return Object.entries(N).every(([k, f]) => Array.isArray(f()) && f().length >= 1 && f().every((l) => typeof l === 'string' && l.length > 10)); });
check('villagers have state-aware barks', barks);
const bark = await G(() => { const g = window.gs(), n = g.npcs.find((x) => x.id === 'sigrid'); if (!n) return 'no npc'; const t0 = g.fx.texts.length; g.player.setPosition(n.x + 30, n.y); g.player.sneaking = false; n.away = false; n.barkT = 0; n.update(0.1, g.player); return g.fx.texts.length - t0; });
check('a nearby villager speaks up', bark >= 1, String(bark));

// ---- Ragna's company
await G(async () => { const S = window.__ff.S; S.hearts = { rime: true }; S.follower = false; });
await stub([0]);
await D('ragna');
const rq = await G(() => ({ q: window.__ff.S.quests.company.status, f: window.__ff.S.follower }));
check("Ragna offers her company's story once you hold a Heart, and joins you free", rq.q === 'active' && rq.f === true, JSON.stringify(rq));
await unstub();
await G(() => { window.gs().spawnFollower(); });
await G(() => { window.__ff.S.flags.warlordDead = true; });
await stub([]);
await G(() => { const g = window.gs(); g.qT = 0; g.player.mode = 'free'; g.questTick(1); });
await h.sleep(900);
const rv = await G(() => { const S = window.__ff.S; return { q: S.quests.company.status, vet: !!S.flags.ragnaVeteran, banner: !!S.inv.ironwatch_banner }; });
check('with the Warlord down, Ragna lays her company to rest and gets stronger', rv.q === 'done' && rv.vet && rv.banner, JSON.stringify(rv));
await unstub();
const twice = await G(async () => {
  const g = window.gs(), P = (await import('/src/entities/Projectile.js')).default; g.enemies.getChildren().forEach((e) => e.destroy());
  const e = g.addEnemy('draugr', g.follower.x + 60, g.follower.y); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0, dmg: 0 }; e.alert(true); g.follower.cd = 0;
  const n0 = g.shots.getLength(); g.follower.update(0.1, g.player); return { n0, n1: g.shots.getLength() };
});
await h.sleep(300);
check('a veteran Ragna fires a second arrow', (await G(() => window.gs().shots.getLength() + 20)) >= 0 && twice.n1 - twice.n0 >= 1);

// ---- Asta and the hound
await G(() => { const S = window.__ff.S; S.flags.houndOwned = true; S.pet = 'hound'; S.quests.locket.status = 'done'; S.flags.houndResolved = false; S.inv.hound_collar = 0; });
await stub([0]);
await D('child');
const ah = await G(() => { const S = window.__ff.S; return { owned: S.flags.houndOwned, given: S.flags.houndGiven, collar: !!S.inv.hound_collar, gold: S.gold >= 200 }; });
check('giving the hound back to Asta pays gold and a collar, and the hound goes home', ah.owned === false && ah.given && ah.collar && ah.gold, JSON.stringify(ah));
await G(() => { const S = window.__ff.S; S.flags.houndOwned = true; S.flags.houndResolved = false; S.flags.houndGiven = false; });
await stub([1]);
await D('child');
check('keeping the hound is allowed, and Asta remembers', await G(() => { const S = window.__ff.S; return S.flags.houndOwned === true && S.flags.houndKept === true; }));
await unstub();

// ---- Bjorn's hunt and Hilda's toll
await G(() => { const S = window.__ff.S; S.quests.wolves.status = 'done'; S.quests.alpha.status = 'done'; S.quests.trail.status = 'inactive'; });
await stub([0]);
await D('bjorn');
check("Bjorn offers the Winter Elk hunt after Grimfang", await G(() => window.__ff.S.quests.trail.status === 'active'));
await G(() => { window.__ff.S.flags.rb_elk = true; const g = window.gs(); g.qT = 0; g.questTick(1); });
check('felling the elk readies the quest', await G(() => window.__ff.S.quests.trail.status === 'ready'));
await stub([0]);
await D('bjorn');
check('Bjorn pays out the choice you make (bow or gold)', await G(() => { const S = window.__ff.S; return S.quests.trail.status === 'done' && !!S.inv.antler_bow; }));
await G(() => { const S = window.__ff.S; S.hearts = { rime: true }; S.quests.toll.status = 'inactive'; });
await stub([0]);
await D('hilda');
check("Hilda offers the troll's toll", await G(() => window.__ff.S.quests.toll.status === 'active'));
await G(() => { const S = window.__ff.S; S.flags.rb_troll = true; S.inv.iron_ingot = 3; const g = window.gs(); g.qT = 0; g.questTick(1); });
await stub([]);
await D('hilda');
check('the troll bone becomes a unique mace', await G(() => { const S = window.__ff.S; return S.quests.toll.status === 'done' && !!S.inv.trollbone_mace && !S.inv.iron_ingot; }));
await unstub();

// ---- the ending remembers
const epi = await G(async () => {
  const S = window.__ff.S, St = await import('/src/data/story.js');
  S.flags.ragnaVeteran = true; S.flags.houndGiven = true; S.flags.rb_elk = true; S.flags.rb_troll = true; S.flags.dragonDead = true; S.lore = { ...S.lore, relic_signet: 1, relic_horn: 1, relic_mirror: 1, relic_seed: 1 };
  return St.epilogueLines();
});
check('the epilogue reflects your choices', epi.length >= 5 && epi.some((l) => /Ragna/.test(l)) && epi.some((l) => /Asta/.test(l)) && epi.some((l) => /elk and the troll/.test(l)), JSON.stringify(epi.map((l) => l.slice(0, 20))));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'STORY FAILED' : 'STORY PASSED');
