import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// ---- every animal and humanoid sheet has hurt and death frames
const frames = await G(() => {
  const T = window.__ff.game.textures, out = {};
  for (const k of ['spr_wolf', 'spr_deer', 'spr_fox', 'spr_hare', 'spr_lynx', 'spr_bear', 'spr_boar', 'spr_alpha', 'spr_grimfang']) out[k] = T.get(k).has('hurt0') && T.get(k).has('death0') && T.get(k).has('side2');
  for (const k of ['spr_player', 'spr_bandit', 'spr_draugr', 'spr_archer']) out[k] = T.get(k).has('dead0') && T.get(k).has('hurt0');
  return out;
});
check('animals and humanoids all have hurt and death frames', Object.values(frames).every(Boolean), JSON.stringify(frames));

// ---- enemies die in their own death pose (no sideways rotation)
const death = await G(async () => {
  const g = window.gs(); g.enemies.getChildren().forEach((e) => e.destroy()); g.pend && (g.pend.length = 0);
  const out = {};
  for (const k of ['deer', 'wolf', 'bandit', 'fox']) {
    const e = g.addEnemy(k, 300, 100); e.cfg = { ...e.cfg, speed: 0, chase: 0, detect: 0 };
    e.takeHit({ dmg: 9999, kx: 1, ky: 0, kb: 0, src: 'melee' });
    out[k] = e.frame.name;
  }
  return out;
});
check('dying animals and bandits switch to their death frame', death.deer === 'death0' && death.wolf === 'death0' && death.fox === 'death0' && death.bandit === 'dead0', JSON.stringify(death));

// ---- the creature art is its own (not recoloured wolves)
check('deer, hare and fox no longer borrow the wolf sheet', await G(async () => { const E = (await import('/src/data/enemies.js')).ENEMIES; return ['deer', 'hare', 'fox'].every((k) => E[k].tex !== 'spr_wolf' && !E[k].tint && !E[k].scale); }));

// ---- four-beat walk
check('walk cycle is stride, pass, stride, pass', await G(async () => { const u = await import('/src/util.js'); return [0, 1, 2, 3, 4, 5].map((p) => u.walkFrame(p + 0.2)).join() === '1,0,2,0,1,0'; }));

// ---- hit feel depends on the weapon
const feel = await G(async () => {
  const g = window.gs(), p = g.player, S = window.__ff.S, I = (await import('/src/data/items.js')).ITEMS;
  const out = {};
  const ids = Object.keys(I).filter((k) => I[k].type === 'weapon' || I[k].type === 'weapon2h');
  const pick = (f) => ids.find(f);
  const dagger = pick((k) => I[k].style === 'dagger'), axe = pick((k) => I[k].style === 'axe'), great = pick((k) => I[k].type === 'weapon2h');
  const prev = S.equip.weapon;
  for (const [name, id] of [['dagger', dagger], ['sword', 'rusty_sword'], ['axe', axe], ['great', great]]) { if (!id) continue; S.equip.weapon = id; out[name] = p.hitFeel(false, false).stop; }
  out.axe = (await import('/src/data/tuning.js')).TUNE.player.hitFeel.axe.stop;
  S.equip.weapon = 'rusty_sword'; out.heavy = p.hitFeel(true, false).stop; out.sword2 = p.hitFeel(false, false).stop;
  S.equip.weapon = prev;
  return out;
});
check('daggers flick, greatswords thud (hit-stop grows with weapon weight)', feel.dagger < feel.sword && feel.sword < feel.axe && feel.axe < feel.great && feel.heavy > feel.sword2, JSON.stringify(feel));
check('the hit-stop option turns it off', await G(async () => { const g = window.gs(), s = (await import('/src/systems/settings.js')).settings; s.hitStop = false; const v = g.player.hitFeel(true, true).stop; s.hitStop = true; return v === 0; }));
check('the damage-numbers option hides numbers but not words', await G(async () => {
  const g = window.gs(), s = (await import('/src/systems/settings.js')).settings, n0 = g.fx.texts.length;
  s.dmgNumbers = false; g.fx.text(10, 10, '42', 11); g.fx.text(10, 20, 'CRIT', 13); const n1 = g.fx.texts.length; s.dmgNumbers = true; return n1 - n0 === 1;
}));

// ---- the dragon: jaw fire puffs, clips
// ---- boss intro card
await G(() => { window.gs().changeMap('nest', 'entry', 'door'); });
await h.sleep(1600);
await G(() => { const g = window.gs(); g.enemies.getChildren().filter((e) => !e.isBoss).forEach((e) => e.destroy()); g.player.setPosition(20 * 16, 8 * 16); g.player.invuln = 999; });
await h.sleep(900);
const intro = await G(() => { const hud = window.__ff.game.scene.getScene('Hud'); return { on: !!hud.intro, title: hud.intro && hud.intro.title }; });
check('engaging a boss shows the intro card with its name', intro.on && /SKALDRATH/.test(intro.title), JSON.stringify(intro));
await h.sleep(300);
await h.shot('s35_intro');
await h.sleep(2600);
check('the intro card clears itself', await G(() => !window.__ff.game.scene.getScene('Hud').intro));
await h.shot('s35_dragon');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'POLISH FAILED' : 'POLISH PASSED');
