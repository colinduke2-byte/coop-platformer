// GameScene's update, step by step (CH9). These ran inline in GameScene.update() in exactly this order; they run every
// frame the world is not frozen (no hold on ui.modal, no hit-stop), after S.playtime and scene.t have advanced.
// Core steps are numbered 100, 200, 300...: a feature slots in between with its own number from its own file, e.g.
//   registerTicker('weatherFx', (sc, dt) => ..., 3050)       // after 'lighting' (3000), before 'bars' (3100)
// tickerOrder() (gameHooks.js) lists the order; test/unit/hooks.mjs pins the core part of it.
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { ui } from '../systems/ui.js';
import { TUNE } from '../data/tuning.js';
import { T } from '../config.js';
import { updateTutorial } from '../systems/tutorial.js';
import { foodTick } from '../systems/food.js';
import { elixirTick } from '../systems/elixir.js';
import { recalc } from '../systems/stats.js';
import { checkTrophies } from '../systems/achievements.js';
import { culled } from '../systems/perf.js';
import { keys, padActive } from '../systems/keys.js';
import { sfx, music } from '../audio/sfx.js';
import { hourOf, isNightHour } from '../world/lighting.js';
import { GATES } from '../data/chapter3.js';
import { registerTicker } from './gameHooks.js';

const FLAME_KEYS = ['flame0', 'flame1', 'flame2'];

const CORE = [
  ['player', (sc, dt) => sc.player.update(dt)],
  ['tutorial', (sc, dt) => updateTutorial(sc, dt)],
  ['worldEvents', (sc, dt) => sc.worldEvents(dt)],
  ['foodElixir', () => { foodTick(); elixirTick(); }],
  ['quests', (sc, dt) => sc.questTick(dt)],
  ['ambientLife', (sc, dt) => sc.ambientLife(dt)],
  ['ambientSounds', (sc, dt) => sc.ambientTick(dt)],
  ['interactables', (sc, dt) => { for (const i of sc.interactables) if (i.tick) i.tick(dt, sc); }],
  ['trophies', (sc, dt) => { sc.trophyT = (sc.trophyT || 0) - dt; if (sc.trophyT <= 0) { sc.trophyT = 2; checkTrophies(); } }],
  ['stream', (sc, dt) => { if (sc.def.stream) { sc.fireT = (sc.fireT || 0) - dt; if (sc.fireT <= 0) { sc.fireT = 0.6; sc.discoverFires(); sc.discoverTick(); } sc.streamT = (sc.streamT || 0) - dt; if (sc.streamT <= 0) { sc.streamT = 0.35; sc.streamTick(); } } }],
  ['rested', () => { if (S.flags.restedUntil && S.playtime > S.flags.restedUntil) { delete S.flags.restedUntil; recalc(); bus.emit('toast', 'NO LONGER WELL RESTED', 4); } }],
  ['plates', (sc) => { for (const p of sc.plates) p.update(sc.player); }],
  ['setPieces', (sc, dt) => sc.setPieceTick(dt)],
  ['checkpoints', (sc) => {
    for (const c of sc.autoCheckpoints) {
      if (!c.lit && Math.hypot(sc.player.x - c.x, sc.player.y - c.y) < 30) {
        c.lit = true;
        if (!S.respawn || S.respawn.map !== sc.mapId || Math.hypot((S.respawn.x ?? 0) - c.x, (S.respawn.y ?? 0) - c.y) > 40) {
          S.respawn = { map: sc.mapId, x: Math.round(c.x), y: Math.round(c.y + 12) };
          bus.emit('toast', 'CHECKPOINT: BRAZIER LIT', 12); sfx.play('quest');
        }
      }
    }
  }],
  ['fog', (sc, dt) => { sc.fogT -= dt; if (sc.fogT <= 0) { sc.fogT = 0.3; sc.revealFog(); } }],
  ['flames', (sc, dt) => {
    for (const f of sc.flames) {           // animate only the flames on screen, and only when their frame changes
      f.ph += dt * 9;
      const fr = Math.floor(f.ph) % 3;
      if (fr !== f.fr && !culled(f.f)) { f.fr = fr; f.f.setTexture(FLAME_KEYS[fr]); }
    }
  }],
  ['clock', (sc, dt) => sc.updateClock(dt)],
  ['npcSchedule', (sc, dt) => {
    sc.schedT = (sc.schedT || 0) - dt;
    if (sc.schedT <= 0 && sc.npcs.length) {
      sc.schedT = 1;
      const night = isNightHour(hourOf());
      for (const n of sc.npcs) if (n.sched && n.away !== night) { n.setAway(night); if (night) sc.fx.puff(n.x, n.y, 5, 4, 20, 0.4); }
    }
  }],
  ['lights', (sc, dt) => { const night = sc.nightness(); for (const l of sc.lights) { l.ph += dt * 7; if (!culled(l.l)) l.l.setAlpha((l.base + Math.sin(l.ph) * 0.05 + Math.sin(l.ph * 2.3) * 0.03) * (0.55 + 0.9 * night)); } }],
  ['npcs', (sc, dt) => { for (const n of sc.npcs) n.update(dt, sc.player); }],
  ['follower', (sc, dt) => sc.follower?.update(dt, sc.player)],
  ['hound', (sc, dt) => sc.hound?.update(dt, sc.player)],
  ['arena', (sc, dt) => sc.arenaTick(dt)],
  ['quickRun', (sc, dt) => sc.quickTick?.(dt)],
  ['pony', (sc, dt) => sc.pony?.update(dt, sc.player)],
  ['spiritWolf', (sc, dt) => { if (sc.spirit && !sc.spirit.dead) sc.spirit.update(dt, sc.player); }],
  ['pickups', (sc, dt) => {
    for (let i = sc.pickups.length - 1; i >= 0; i--) {
      const p = sc.pickups[i];
      p.update(dt, sc.player);
      if (p.done) sc.pickups.splice(i, 1);
    }
  }],
  ['interact', (sc) => sc.updateInteract()],
  ['autosave', (sc, dt) => sc.autosaveTick(dt)],
  ['statPrompt', (sc) => {
    if ((S.pendingStat || 0) > 0 && !sc.askingStat && sc.player.mode === 'free' && !sc.leaving
      && !sc.enemies.getChildren().some((e) => e.alerted && !e.dead)) sc.askStat();
  }],
  ['ending', (sc) => {
    if (sc.pendingEnding && !ui.modal) {
      const k = sc.pendingEnding; sc.pendingEnding = null;
      ui.hold('ending:launch');                              // EndingScene takes over with its own hold
      sc.scene.launch('Ending', { kind: k });
    }
  }],
  ['menuKeys', (sc) => {
    if (sc.player.mode === 'free' && !sc.leaving) {
      if (keys.pressed('inventory')) sc.openMenu(0);
      else if (keys.pressed('journal')) sc.openMenu(-1, 'QUESTS');
      else if (keys.pressed('map')) sc.openMenu(-1, 'MAP');
      else if (keys.pressed('pause')) sc.openMenu(-1, padActive() ? ui.lastMenuTab || 'ITEMS' : 'SYSTEM');   // START: the tab you used last
    }
  }],
  ['exits', (sc) => {
    if (sc.t > 0.5 && !sc.leaving) {
      const c = sc.player.body.center;
      for (const ex of sc.exits) {
        if (!ex.rect.contains(c.x, c.y)) continue;
        if (ex.needs && GATES[ex.needs] && !GATES[ex.needs].ok()) {
          if (sc.t - (sc.lastGate || -9) > 3) { bus.emit('toast', GATES[ex.needs].msg(), 11); sfx.play('nostamina'); sc.lastGate = sc.t; }
          sc.player.body.setVelocity(0, 40); sc.player.y += 2;
          break;
        }
        sc.changeMap(ex.to, ex.spawn, ex.fx || 'door'); break;
      }
    }
  }],
  ['enemies', (sc, dt) => { for (const e of sc.enemies.getChildren()) e.update(dt, sc.player); }],
  ['shots', (sc, dt) => {
    for (const sh of sc.shots.getChildren()) {
      sh.update(dt);
      if (!sh.done && sc.breakables.length && sc.breakAt(sh.x, sh.y, 8)) { if (sh.kind === 'fire') sh.explode(); else sh.finish(); }
    }
    for (let i = sc.breakables.length - 1; i >= 0; i--) if (sc.breakables[i].broken) sc.breakables.splice(i, 1);
  }],
  ['enemyShots', (sc, dt) => { for (const sh of sc.eshots.getChildren()) sh.update(dt); }],
  ['bossTrigger', (sc) => {
    if (sc.boss && !sc.boss.engaged && !sc.boss.dead && !sc.boss.yieldDone) {
      const pc = sc.player.body.center;
      if (sc.def.bossTrigger?.(pc, T)) {
        if (sc.gate) sc.setGate(true);
        sc.boss.engage();
        music.play(sc.def.bossMusic || 'boss');
      }
    }
  }],
  ['zones', (sc, dt) => sc.updateZones(dt)],
  ['music', (sc, dt) => sc.updateMusic(dt)],
  ['fx', (sc, dt) => sc.fx.update(dt)],
  ['snow', (sc, dt) => sc.snow?.update(dt)],
  ['lighting', (sc, dt) => sc.updateLighting(dt)],
  ['bars', (sc) => sc.drawBars()],
  ['death', (sc, dt) => {
    if (sc.deadT > 0) {
      sc.deadT += dt;
      // a hired companion drags you out of the fight once in a while instead of letting you fall
      if (sc.follower && !sc.respawning && sc.deadT > 1.1 && (S.flags.reviveAt ?? -999) + TUNE.follower.reviveCooldown < S.playtime) sc.reviveByFollower();
      else if (sc.deadT > 2.4 && !sc.respawning) { if (S.quick) sc.endQuickRun(); else sc.respawn(); }
    }
  }],
];

// name -> order (100, 200, ...): the numbers features slot in between
export const CORE_ORDER = Object.fromEntries(CORE.map(([name], i) => [name, (i + 1) * 100]));
for (const [name, fn] of CORE) registerTicker(name, fn, CORE_ORDER[name]);
