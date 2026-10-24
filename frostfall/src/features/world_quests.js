// WQ21 (scene side): the new quest shapes in the world. Data and givers in world/regionquests.js.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { T } from '../config.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { say, choose } from '../systems/dialogue.js';
import { SCRIPTS } from '../data/dialogue.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addGold, addItem } from '../systems/inventory.js';
import { makeGenItem } from '../systems/genloot.js';
import { isGone } from '../systems/bless.js';
import { TUNE } from '../data/tuning.js';
import { Sign } from '../entities/Props.js';
import { RQ_GIVER, thiefClues, thiefLair, lighthouse, glassTrail } from '../world/regionquests.js';

const Q = (id) => S.quests[id];
const ready = (id, who) => { Q(id).status = 'ready'; bus.emit('toast', `QUEST READY: TELL ${who.toUpperCase()}`, 13); sfx.play('quest'); };

// ---- givers: the quest comes first, then their usual talk
let wrapped = false;
registerListener('scene:game', () => {
  if (wrapped) return; wrapped = true;
  for (const [npc, g] of Object.entries(RQ_GIVER)) {
    const orig = SCRIPTS[npc];
    SCRIPTS[npc] = async (...a) => {
      const q = Q(g.id);
      if (q.status === 'ready') {
        await say(g.who, g.thanks);
        const R = TUNE.world.rquest; addGold(R.gold); addItem(makeGenItem(R.tier, Math.random, 2));
        finishQuest(g.id); return;
      }
      if (q.status === 'inactive') {
        for (const l of g.offer) await say(g.who, l);
        if (await choose([g.yes, 'Not now.']) === 0) { startQuest(g.id); Object.assign(q, { clues: 0, waves: 0, prints: 0 }); }
        return;
      }
      return orig?.(...a);
    };
  }
}, 'worldQuestGivers');

// ---- the Fens: the clues and the thief
const CLUE_TEXT = [
  ['A SPILT OIL FLASK BY THE PEAT FIRE.', 'BOOT PRINTS, ONE HEEL WORN DOWN. WHOEVER IT IS LIMPS, AND IS IN NO HURRY.'],
  ['OFFERINGS MOVED AT THE DROWNED SHRINE.', 'A LANTERN WICK, AND A NAME SCRATCHED ON THE STONE: OSWIN. HE ASKED THE SHRINE TO FORGIVE HIM IN ADVANCE.'],
  ['A TALLY ON THE RUIN WALL: THIRTY-ONE FLASKS.', 'AND A NOTE: "THE STASH IS WHERE NO ROAD GOES." THE SMELL OF OIL LEADS AWAY FROM THE PATHS.'],
];
registerListener('scene:game', (sc) => {
  const q = Q('lanternthief');
  if (sc.mapId !== 'fens' || q.status !== 'active') return;
  thiefClues().forEach((p, i) => {
    if (i < (q.clues || 0)) return;
    const sg = new Sign(sc, (p.x + 0.5) * T, (p.y + 4.5) * T, CLUE_TEXT[i]);
    const read = sg.interact.bind(sg);
    sg.interact = async (...a) => { const r = await read(...a); if ((q.clues || 0) === i) { q.clues = i + 1; bus.emit('toast', `A CLUE (${q.clues}/3)`, 13); sfx.play('quest'); if (q.clues === 3) sc.rqThief?.(); } return r; };
    sg.label = () => 'E: LOOK CLOSER';
    sc.interactables.push(sg);
  });
  sc.rqThief = () => {
    const l = thiefLair(); if (!l || isGone('fens:rq_thief')) return;
    if (!sc.pend.some((p) => p.key === 'fens:rq_thief')) sc.pend.push({ spec: { kind: 'bandit', tier: 2, elite: true, champion: true, named: 'Oswin the Oil-Thief', rq: 'lanternthief' }, key: 'fens:rq_thief', wx: (l.x + 0.5) * T, wy: (l.y + 1.5) * T, live: null });
  };
  if ((q.clues || 0) >= 3) sc.rqThief();
}, 'worldQuestFens');

// ---- the Glasswood: the prints and the stag
registerListener('scene:game', (sc) => {
  const q = Q('glassprints');
  if (sc.mapId !== 'glasswood' || q.status !== 'active') return;
  const t = glassTrail();
  const marks = t.pts.map((p) => { const g = sc.add.graphics().setDepth((p.y + 0.5) * T + 1); g.fillStyle(0x9ad8e8, 0.9); for (const [dx, dy] of [[-3, 0], [3, -3], [-3, -6]]) g.fillRect((p.x + 0.5) * T + dx, (p.y + 0.5) * T + dy, 2, 3); return g; });
  sc.rqPrints = { pts: t.pts, end: t.end, marks };
}, 'worldQuestGlass');

// ---- the Coast: the pilgrim; the Stormcrown: the waves
registerTicker('worldQuests', (sc, dt) => {
  const p = sc.player; if (!p) return;
  // glass prints: walk to each in turn
  const gq = Q('glassprints'), pr = sc.rqPrints;
  if (pr && gq.status === 'active') {
    const n = gq.prints || 0;
    if (n < pr.pts.length && Math.hypot((pr.pts[n].x + 0.5) * T - p.x, (pr.pts[n].y + 0.5) * T - p.y) < 40) {
      gq.prints = n + 1; pr.marks[n].setAlpha(0.35); sfx.play('select');
      bus.emit('toast', gq.prints < pr.pts.length ? `THE PRINT RINGS UNDER YOUR FOOT (${gq.prints}/6)` : 'THE PRINTS END HERE. SOMETHING HUGE IS BREATHING NEARBY', 15);
      if (gq.prints >= pr.pts.length && !isGone('glasswood:rq_stag')) {
        const e = sc.addEnemy('glassstag', (pr.end.x + 0.5) * T, (pr.end.y + 3.5) * T, { tier: 3, elite: true, champion: true, rq: 'glassprints' }, 'glasswood:rq_stag');
        e.displayName = 'The Shardmother'; e.alert?.(true); music.stinger?.();
      }
    }
  }
  // the named quest foes: when they are down, the quest is ready
  for (const [id, key, who] of [['lanternthief', 'fens:rq_thief', 'the Lantern-Warden'], ['glassprints', 'glasswood:rq_stag', 'the Glade Watch']]) {
    if (Q(id).status === 'active' && isGone(key)) ready(id, who);
  }
  for (const pe of sc.pend) if (pe.spec.named && pe.live && !pe.live.rqNamed) { pe.live.displayName = pe.spec.named; pe.live.rqNamed = true; }
  // the pilgrim
  const pq = Q('pilgrimlight');
  if (sc.mapId === 'coast' && pq.status === 'active') {
    let m = sc.rqPilgrim;
    if (!m) { const img = sc.add.sprite(p.x - 16, p.y, 'spr_child', 'down0').setTint(0xd8d0f0), shadow = sc.add.image(p.x - 16, p.y + 7, 'shadow'); m = sc.rqPilgrim = { img, shadow }; }
    const d = Math.hypot(m.img.x - p.x, m.img.y - p.y);
    if (d > 26) { const sp = Math.min(d * 2, 90) * dt, nx = m.img.x + (p.x - m.img.x) / d * sp, ny = m.img.y + (p.y - m.img.y) / d * sp; if (!sc.solidAt(nx, ny)) { m.img.x = nx; m.img.y = ny; } else if (!sc.solidAt(nx, m.img.y)) m.img.x = nx; else if (!sc.solidAt(m.img.x, ny)) m.img.y = ny; }
    if (d > 240) { m.img.x = p.x - 18; m.img.y = p.y; }
    m.img.setDepth(m.img.y + 8); m.shadow.setPosition(m.img.x, m.img.y + 7).setDepth(m.img.y + 6);
    const L = lighthouse();
    if (L && Math.hypot((L.x + 0.5) * T - m.img.x, (L.y + 1.5) * T - m.img.y) < 70) { ready('pilgrimlight', 'the Harbour Watch'); bus.emit('toast', 'SISTER MAREN KNEELS BEFORE THE LAST LIGHT', 15); }
  }
  // Skarn Hold at night: three waves at the ring of fires
  const hq = Q('holdhearth');
  if (sc.mapId === 'skarnhold' && hq.status === 'active') {
    const w = sc.rqWave;
    if (!w && sc.isNight()) {
      const n = (hq.waves || 0), foes = [];
      for (let i = 0; i < 3 + n; i++) { const a = (i / (3 + n)) * Math.PI * 2, x = (36 + Math.cos(a) * 18 + 0.5) * T, y = (26 + Math.sin(a) * 13 + 0.5) * T; if (sc.solidAt(x, y)) continue; const e = sc.addEnemy(i % 3 === 2 ? 'nomadshaman' : 'nomad', x, y, { tier: 2, roam: true }); e.alert?.(true); foes.push(e); }
      sc.rqWave = { foes };
      bus.emit('toast', `RAIDERS AT THE FIRES! WAVE ${n + 1} OF 3`, 11); sfx.play('alert');
    } else if (w && !w.foes.some((e) => e.active && !e.dead)) {
      hq.waves = (hq.waves || 0) + 1; sc.rqWave = null;
      if (hq.waves >= 3) ready('holdhearth', 'Asger'); else bus.emit('toast', 'THE WAVE BREAKS. MORE ARE COMING', 13);
    }
  }
}, 2360);
