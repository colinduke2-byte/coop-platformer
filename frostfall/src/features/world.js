// World agent (W) features that hook into GameScene without editing it (see docs/AGENT_RULES.md, section 2).
import { registerTicker, registerListener } from '../scenes/gameHooks.js';
import { T } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { TUNE } from '../data/tuning.js';
import { applyStatus } from '../systems/status.js';
import { Herb, Lore } from '../entities/Props.js';
import { ART_SKY } from '../world/weather.js';
import { HAMLET_FOLK } from '../world/hamletfolk.js';
import { freshPages } from '../world/lorepool.js';
import { onPlaceDiscovered } from '../world/discovery.js';
import { REGIONS, regionOfMap } from '../data/regions.js';
import { newMilestones, owed, payOf, markPaid, surveyOf, reached, fullySurveyed } from '../world/survey.js';
import { addGold, addItem } from '../systems/inventory.js';
import { makeGenItem } from '../systems/genloot.js';
import { sfx } from '../audio/sfx.js';
import { TROPHIES } from '../systems/achievements.js';
import { NPC_DEFS, SCRIPTS } from '../data/dialogue.js';
import { say, choose } from '../systems/dialogue.js';
import { buyMenu, sellMenu } from '../data/services.js';
import { restRoom } from '../data/services2.js';
import { dailyWares } from '../data/stock.js';
import { notePlayer, clearEventMark } from '../world/questmarks.js';

// quest markers measure "nearest" from where you stand (WQ2, WQ4, WQ5)
registerTicker('worldMarks', (sc) => { if (sc.player) notePlayer(sc.mapId, sc.player.x / T, sc.player.y / T); }, 150);

// WQ6: an event's marker belongs to the map it happened on
registerListener('scene:game', () => clearEventMark());

// ---- WQ19: what each region's weather does to you (the toast, the tint and the stealth are in world/lighting.js)
const CRYSTAL = new Set(['crystalgolem', 'glimmerkin', 'glassstag']);
const between = ([a, b]) => a + Math.random() * (b - a);
registerTicker('worldWeather', (sc, dt) => {
  if (!sc.def.stream || !sc.player || sc.player.mode !== 'free' || sc.leaving || S.hp <= 0) return;
  const W = TUNE.world.weather, region = regionOfMap(sc.mapId), p = sc.player, tier = sc.tierHere(p.x / T, p.y / T);
  const m = (sc.wxMem ||= { ember: between(W.ember.every), bolt: between(W.lightning.every), tremor: between(W.tremor.every), chime: W.chime.every, regrow: W.rainRegrow.every });
  const near = (d) => ({ x: p.x + (Math.random() - 0.5) * d, y: p.y + (Math.random() - 0.5) * d });
  if (S.weather === 'ash' && (m.ember -= dt) <= 0) {          // embers drift down: a telegraphed burn, unless you shelter by a fire
    m.ember = between(W.ember.every);
    if (!sc.nearFire(70)) { const q = near(40); sc.addZone(q.x, q.y, W.ember.r, W.ember.delay, W.ember.dmg + W.ember.perTier * tier); }
  }
  if (S.weather === 'storm' && (m.bolt -= dt) <= 0) {          // lightning walks the heath; the storm circles are safe
    m.bolt = between(W.lightning.every);
    const safe = sc.built?.pois?.some((q) => q.kind === 'stormcircle' && Math.hypot(q.x * T - p.x, q.y * T - p.y) < W.lightning.safeR * T);
    if (!safe) { const q = near(56); sc.addZone(q.x, q.y, W.lightning.r, W.lightning.delay, W.lightning.dmg + W.lightning.perTier * tier); }
  }
  if (region === 'underdeep' && (m.tremor -= dt) <= 0) {        // the Underdeep has no sky, but the rock moves
    m.tremor = between(W.tremor.every);
    sc.shake(600, 0.006);
    bus.emit('toast', 'A DEEP TREMOR: ROCKS FALL', 11);
    for (let i = 0; i < W.tremor.rocks; i++) { const q = near(110); if (!sc.solidAt(q.x, q.y)) sc.addZone(q.x, q.y, W.tremor.r, W.tremor.delay + i * 0.25, W.tremor.dmg + W.tremor.perTier * tier); }
  }
  if (S.weather === 'chime' && (m.chime -= dt) <= 0) {          // the ringing wind shakes the crystal creatures
    m.chime = W.chime.every;
    for (const e of sc.enemies.getChildren()) if (!e.dead && CRYSTAL.has(e.kind) && Math.hypot(e.x - p.x, e.y - p.y) < W.chime.r) applyStatus(e, 'slow', { t: W.chime.slow });
  }
  if (S.weather === 'rain' && (m.regrow -= dt) <= 0) {          // warm rain: picked herbs grow back near you
    m.regrow = W.rainRegrow.every;
    const live = sc.interactables.filter((i) => i instanceof Herb);
    let n = 0;
    for (const e of sc.built?.entities || []) {
      if (n >= W.rainRegrow.max) break;
      if (e.t !== 'herb') continue;
      const wx = (e.x + 0.5) * T, wy = (e.y + 0.5) * T;
      if (Math.hypot(wx - p.x, wy - p.y) > W.rainRegrow.r || Math.hypot(wx - p.x, wy - p.y) < 60 || live.some((h) => h.ix === wx && h.iy === wy)) continue;
      sc.interactables.push(new Herb(sc, wx, wy, e.item)); n++;
    }
  }
}, 1750);

// The art overlay of the snowless regions (art/weather.js, when that branch is in) knows each region's modes by weather kind:
// teach it the region kinds of world/weather.js (sandstorm, ash, rain, fog, chime) so they are drawn and not clamped to clear.
const ART = Object.values(import.meta.glob('../art/weather.js', { eager: true }))[0];
if (ART?.REGION_SKY) for (const [rid, modes] of Object.entries(ART_SKY)) {
  const r = ART.REGION_SKY[rid]; if (!r) continue;
  for (const [kind, mode] of Object.entries(modes)) { r[kind] ??= mode; if (r.kinds && !r.kinds.includes(kind)) r.kinds.push(kind); }
}

// ---- WQ10: the hamlet folk of the other regions (data in world/hamletfolk.js)
for (const folk of Object.values(HAMLET_FOLK).flat()) {
  NPC_DEFS[folk.id] = { name: folk.name, tex: folk.tex };
  SCRIPTS[folk.id] = async () => {
    const who = folk.name.charAt(0) + folk.name.slice(1).toLowerCase(), key = folk.id + 'N';
    const n = S.flags[key] || 0; S.flags[key] = n + 1;
    await say(who, folk.lines[n % folk.lines.length]);
    for (;;) {
      const c = await choose(['Buy', 'Sell', 'Rent a bed (20g)', 'Leave']);
      if (c === 0) await buyMenu(who, [...folk.wares, ...dailyWares(who, 1)]); else if (c === 1) await sellMenu(who); else if (c === 2) { if (await restRoom(who, 20)) return; } else return;
    }
  };
}

// ---- WQ11: a lore book you have read shows an unread page of its family instead, when one is left
registerListener('scene:game', (sc) => freshPages(sc.interactables.filter((i) => i instanceof Lore)));

// ---- WQ12 / WQ24: region surveys. A milestone is announced when it is reached; chartmakers and hermits pay what is owed.
onPlaceDiscovered((mapId) => {
  const rid = regionOfMap(mapId);
  if (REGIONS[rid]?.map !== mapId) return;
  for (const m of newMilestones(rid)) bus.emit('toast', `${REGIONS[rid].name.toUpperCase()}: ${{ half: 'HALF CHARTED', landmarks: 'EVERY LANDMARK FOUND', full: 'FULLY CHARTED' }[m]}. A CHARTMAKER WILL PAY`, 13);
});
async function paySurveys(who) {
  for (const [rid, m] of owed()) {
    const pay = payOf(rid, m), name = REGIONS[rid].name;
    await say(who, { half: `Half of ${name} walked and noted. That is worth paper and coin.`, landmarks: `Every landmark of ${name}. You have the eye for it.`, full: `All of ${name}, every place, charted. I will frame a copy. Take this, and the finished chart.` }[m]);
    addGold(pay.gold);
    if (pay.gear) addItem(makeGenItem(pay.tier + 1, Math.random, 2));
    markPaid(rid, m);
    bus.emit('toast', `SURVEY PAID: +${pay.gold} GOLD${pay.gear ? ' AND A RARE FIND' : ''}`, 13); sfx.play('quest');
  }
}
const CHARTMAKERS = { vale_map: 'Thistle', dune_map: 'Ibrahim', wick_map: 'Joss', skarn_map: 'Kelda', glade_map: 'Spindle', fall_map: 'Quill', salt_map: 'Isolde', hermit: 'Hermit' };
let wrapped = false;
registerListener('scene:game', () => {
  if (wrapped) return; wrapped = true;
  for (const [id, who] of Object.entries(CHARTMAKERS)) {
    const orig = SCRIPTS[id]; if (!orig) continue;
    SCRIPTS[id] = async (...a) => {
      await paySurveys(who);
      if (id !== 'hermit') { const rid = regionOfMap(S.map), s = surveyOf(rid); if (!reached(rid).includes('full')) await say(who, `Your survey of ${REGIONS[rid].name}: ${s.found} of ${s.total} places, ${s.lmFound} of ${s.lmTotal} landmarks. Find them all and I pay well.`); }
      return orig(...a);
    };
  }
}, 'worldSurveyWrap');
TROPHIES.push(
  { id: 'surveyor', name: 'Surveyor', desc: 'Chart every place of one region.', test: () => fullySurveyed() >= 1 },
  { id: 'cartographer', name: 'Cartographer', desc: 'Chart every place of five regions.', test: () => fullySurveyed() >= 5 },
);
