// Audio in the running game (the fixes and upgrades of docs/audit/audio.md). Nothing can be heard here, so each check
// reads the audio engine's state: which song and variant plays, the drum layer, ambience layers, ducks and cues.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });
// the game's own music picker and campfire crackles would talk over these checks
await G(() => { const g = window.gs(); g.updateMusic = () => {}; g.ambientTick = () => {}; });
const A = async (fn, arg) => G(async ([src, a]) => {
  const m = await import('/src/audio/sfx.js'), core = await import('/src/audio/core.js'), play = await import('/src/audio/play.js');
  const music = await import('/src/audio/music.js'), amb = await import('/src/audio/ambience.js'), hooks = await import('/src/audio/hooks.js');
  const bus = (await import('/src/systems/bus.js')).bus;
  m.unlock();
  return new Function('X', 'a', `return (async () => { ${src} })()`)({ ...m, core, play, musicM: music, amb, hooks, bus, gs: window.gs(), S: window.__ff.S }, a);
}, [fn, arg]);

// ---- AU01, AU08: the smith's sound exists; the limiter sits on the master bus
const base = await A(`X.sfx.play('upgrade'); return { has: X.sfx.has('upgrade'), last: X.play.audioLog.last?.name, lim: X.core.nodes.limiter?.constructor?.name, thr: X.core.nodes.limiter?.threshold?.value };`);
check('AU01 repair / reforge play the new upgrade sound', base.has && base.last === 'upgrade', JSON.stringify(base));
check('AU08 a compressor-limiter sits on the master bus', base.lim === 'DynamicsCompressorNode' && base.thr <= -6, JSON.stringify(base));

// ---- AU05: variation for hits and steps, none for UI
const vary = await A(`const out = []; for (let i = 0; i < 6; i++) { X.sfx.play('hit'); out.push(X.play.audioLog.last.pitch); await new Promise((r) => setTimeout(r, 45)); }
  X.sfx.play('select'); return { hits: out, ui: X.play.audioLog.last.pitch };`);
check('AU05 repeated hits vary in pitch; menu clicks do not', new Set(vary.hits.map((p) => p.toFixed(4))).size >= 4 && vary.ui === 1, JSON.stringify(vary));

// ---- AU21: distance and pan
const pos = await A(`const g = X.gs, v = g.cameras.main.worldView, cx = v.centerX, cy = v.centerY, P = X.play.audioLog;
  await new Promise((r) => setTimeout(r, 40)); X.sfx.play('shoot', { x: cx + 10, y: cy, scene: g }); const near = P.last.gain;
  await new Promise((r) => setTimeout(r, 40)); X.sfx.play('shoot', { x: cx + 200, y: cy, scene: g }); const mid = P.last.gain;
  await new Promise((r) => setTimeout(r, 40)); const n0 = P.plays; X.sfx.play('shoot', { x: cx + 3000, y: cy, scene: g }); return { near, mid, farPlayed: P.plays !== n0 };`);
check('AU21 an enemy sound is full nearby, quieter further away and silent off in the distance', pos.near === 1 && pos.mid > 0 && pos.mid < 1 && !pos.farPlayed, JSON.stringify(pos));

// ---- names the helpers give
const names = await A(`return { dag: X.sfx.swing({ style: 'dagger' }), hal: X.sfx.swing({ style: 'halberd' }, true), golem: X.sfx.voice({ tex: 'spr_golem', bark: 'undead' }, 'kill'), spider: X.sfx.voice({ tex: 'spr_spider', bark: 'wolf' }, 'bark'),
  metal: X.sfx.hitOn({ cfg: { armored: true } }), bone: X.sfx.hitOn({ cfg: { tex: 'spr_draugr', bark: 'undead' } }), elder: X.sfx.talk('ELDER BJORN'), king: X.sfx.talk('THE HOLLOW KING') };`);
check('AU10 a dagger flicks and a halberd finisher cleaves', names.dag === 'swing_dagger' && names.hal === 'swing_great_heavy', JSON.stringify(names));
check('AU12 golems die like stone, spiders chitter, knights ring, draugr rattle', names.golem === 'kill_construct' && names.spider === 'bark_crawler' && names.metal === 'hit_metal' && names.bone === 'hit_bone', JSON.stringify(names));
check('AU23 an elder and a boss speak in different voices', names.elder === 'talk_low' && names.king === 'talk_boss', JSON.stringify(names));

// ---- AU03, AU04: the drum layer holds; songs crossfade
const fight = await A(`const M = X.music; M.play('forest'); await new Promise((r) => setTimeout(r, 400));
  M.setIntensity(true); const on = X.musicM.music.debug().want; M.setIntensity(false); const held = X.musicM.music.debug().want;
  const T = (await import('/src/data/tuning.js')).TUNE.audio, keep = T.combatHold; T.combatHold = 0.05; await new Promise((r) => setTimeout(r, 120)); const off = X.musicM.music.debug().want; T.combatHold = keep;
  M.play('pass'); await new Promise((r) => setTimeout(r, 400)); const d = X.musicM.music.debug();
  return { on, held, off, playing: d.key, fading: d.fading };`);
check('AU03 the combat layer stays on after the last fight tick, then lets go', fight.on === 1 && fight.held === 1 && fight.off === 0, JSON.stringify(fight));
check('AU04 a new song fades in while the old one fades out', fight.playing === 'pass' && fight.fading >= 1, JSON.stringify(fight));

// ---- AU04 victory: a fanfare, no bounce through the crypt song
const vic = await A(`const M = X.music; M.play('boss'); await new Promise((r) => setTimeout(r, 300)); M.play('victory'); const a = X.musicM.music.debug();
  M.play('throne'); await new Promise((r) => setTimeout(r, 400)); const b = X.musicM.music.debug(); return { a, b };`);
check('AU04 a boss victory plays a fanfare and holds the next song until it ends', vic.a.key === null && vic.a.hold > 2.5 && vic.b.key === null && vic.b.req === 'throne', JSON.stringify(vic));

// ---- AU17, AU19: variants by place
const vars = await A(`const M = X.music, D = () => X.musicM.music.debug().key, tick = () => new Promise((r) => setTimeout(r, 60)); X.musicM.music.clearPlace(); X.musicM.music.stop();
  const out = {}, go = (map, def, w, region) => { X.musicM.music.clearPlace(); M.setPlace(map, def); X.bus.emit('weather', w, region); };
  M.setPlace('fens', { music: 'fens', outdoors: true }); X.bus.emit('weather', 'clear', 'fens'); M.play('night'); await tick(); out.fensNight = D();
  go('village', { music: 'village', snow: true }, 'clear', 'reach'); M.play('fens'); await tick(); M.play('night'); await tick(); out.villageNight = D();
  go('tidebreak', { music: 'throne', cave: true }, 'clear', 'coast'); M.play('throne'); await tick(); out.dungeon = D();
  M.play('boss'); await tick(); out.boss = D();
  X.bus.emit('boss:engaged', { kind: 'sovereign' }); M.play('cavern'); await tick(); M.play('boss'); await tick(); out.final = D();
  go('arena', { music: 'throne', cave: true, arena: true }, 'clear', 'reach'); M.play('cavern'); await tick(); M.play('throne'); await tick(); out.arena = D();
  return out;`);
check('AU17 night in the Fens plays the Fens at night; the village keeps its own night tune', vars.fensNight === 'night:fens' && vars.villageNight === 'night', JSON.stringify(vars));
check('AU19 a coast dungeon plays the coast in a dungeon mode, its boss the coast boss version', vars.dungeon === 'dungeon:coast' && vars.boss === 'boss:coast', JSON.stringify(vars));
check('AU19 the Ashen Sovereign has its own theme; the arena keeps throne', vars.final === 'sovereign' && vars.arena === 'throne', JSON.stringify(vars));

// ---- AU20: ambience layers by region, map and weather
const amb = await A(`const M = X.music, L = () => X.ambience.layers().sort().join(','), tick = () => new Promise((r) => setTimeout(r, 40)); const out = {};
  M.setPlace('fens', { music: 'fens', outdoors: true }); X.ambience.play('wind'); X.bus.emit('weather', 'clear', 'fens'); await tick(); out.fens = L();
  X.bus.emit('weather', 'fog', 'fens'); await tick(); out.fog = L();
  M.setPlace('sunscorch', { music: 'sunscorch', outdoors: true }); X.ambience.play('wind'); X.bus.emit('weather', 'sandstorm', 'sunscorch'); await tick(); out.sand = L();
  M.setPlace('ashen', { music: 'ashen', outdoors: true }); X.ambience.play('wind'); X.bus.emit('weather', 'ash', 'ashen'); await tick(); out.ash = L();
  M.setPlace('forest', { music: 'forest', snow: true }); X.ambience.play('wind'); X.bus.emit('weather', 'blizzard', 'reach'); await tick(); out.blizzard = L();
  M.setPlace('emberhold', { music: 'emberhold', outdoors: true }); X.ambience.play('wind'); X.bus.emit('weather', 'clear', 'ashen'); await tick(); out.emberhold = L();
  M.setPlace('cottage', { music: 'village', interior: true }); X.ambience.play(null); X.bus.emit('weather', 'snow', 'reach'); await tick(); out.inside = L();
  M.setPlace('coast_cave0', { music: 'crypt', crypt: true }); X.ambience.play('crypt'); X.bus.emit('weather', 'snow', 'coast'); await tick(); out.cave = L();
  return out;`);
check('AU20 the Fens croak; fog adds its own layer', amb.fens === 'marsh' && amb.fog === 'fog,marsh', JSON.stringify(amb));
check('AU20 sandstorm, ash and blizzard each sound different', amb.sand === 'desert,sandstorm' && amb.ash === 'ash,lava' && amb.blizzard === 'blizzard', JSON.stringify(amb));
check('AU20 Emberhold is a town with a forge; houses have a fire; caves keep the drone', amb.emberhold === 'forge,lava,town' && amb.inside === 'interior' && amb.cave === 'crypt', JSON.stringify(amb));

// ---- AU13: status cues and ticks
const stat = await A(`const p = X.gs.player; p.statuses = { burn: { t: 3 } }; X.bus.emit('status:on', p, 'burn', 3); const cue = X.play.audioLog.last.name, on = X.hooks.hookState().onPlayer.slice();
  await new Promise((r) => setTimeout(r, 1150)); const tick = X.play.audioLog.recent.includes('tick_burn') ? 'tick_burn' : X.play.audioLog.recent.join(' ');
  delete p.statuses.burn; X.bus.emit('status:off', p, 'burn'); return { cue, on, tick, after: X.hooks.hookState().onPlayer };`);
check('AU13 catching fire crackles, then ticks each second, and stops when it ends', stat.cue === 'status_burn' && stat.on.includes('burn') && stat.tick === 'tick_burn' && stat.after.length === 0, JSON.stringify(stat));

// ---- AU22: heartbeat below 30% health
const hb = await A(`const S = X.S, hp = S.hp; S.hp = Math.ceil(S.maxHp * 0.2); await new Promise((r) => setTimeout(r, 700)); const low = X.hooks.hookState().low, freq = X.core.nodes.musicFilter.frequency.value;
  S.hp = hp; await new Promise((r) => setTimeout(r, 400)); return { low, after: X.hooks.hookState().low, freq };`);
check('AU22 a heartbeat and muffled music below 30% health, gone above it', hb.low && !hb.after, JSON.stringify(hb));

// ---- AU23: dialogue ducks music and ambience
const duck = await A(`X.sfx.play(X.sfx.talk('MIRRA')); await new Promise((r) => setTimeout(r, 300)); const t = X.hooks.hookState().talk; await new Promise((r) => setTimeout(r, 1100)); return { t, after: X.hooks.hookState().talk };`);
check('AU23 music and ambience duck while someone talks', duck.t && !duck.after, JSON.stringify(duck));

// ---- AU24: death and respawn
const dead = await A(`const M = X.musicM.music; X.music.play('forest'); await new Promise((r) => setTimeout(r, 300)); X.bus.emit('player:dead'); const a = M.debug(); X.bus.emit('scene:game'); return { a, b: M.debug() };`);
check('AU24 dying stops the song with a falling phrase; the map loading again brings it back', dead.a.dead && dead.a.key === null && !dead.b.dead, JSON.stringify(dead));
await G(() => { window.__ff.S.hp = window.__ff.S.maxHp; });

// ---- AU16: the title Options has the ambience level
await G(() => { window.gs().scene.start('Title'); });
await h.sleep(900);
const title = await G(async () => { const t = window.__ff.game.scene.getScene('Title'); t.openOptions(); const i = t.optRows.indexOf('AMB LVL'); const st = (await import('/src/audio/sfx.js')).settings, before = st.ambVol; t.optSel = i; t.optAdjust(-1); const after = st.ambVol; t.optAdjust(1); return { i, before, after, now: st.ambVol }; });
check('AU16 the title Options lists AMB LVL and it changes the ambience level', title.i > 0 && title.after < title.before && title.now === title.before, JSON.stringify(title));
await h.shot('s96_title_options');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'AUDIO96 FAILED' : 'AUDIO96 PASSED');
