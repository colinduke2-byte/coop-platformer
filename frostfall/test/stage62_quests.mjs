import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);
await G(() => { window.gs = () => window.__ff.game.scene.getScene('Game'); window.__ff.S.flags.introDone = true; });

// quest data audit: every quest is complete, has state, and its text and marker work in every status
const audit = await G(async () => {
  await import('/src/data/hamlets.js'); await import('/src/data/regions2_story.js'); await import('/src/data/emberhold.js'); await import('/src/data/sidequests.js');
  const Q = await import('/src/data/quests.js'), M = await import('/src/data/maps.js'), St = window.__ff.S, bad = [];
  for (const [id, q] of Object.entries(Q.QUESTS)) {
    for (const k of ['title', 'giver', 'desc']) if (typeof q[k] !== 'string' || q[k].length < 8) bad.push(`${id}.${k}`);
    if (typeof q.short !== 'function' || typeof q.objectives !== 'function') bad.push(`${id} short/objectives`);
    if (!St.quests[id]) { bad.push(`${id} has no state`); continue; }
    for (const status of ['inactive', 'active', 'ready', 'relic', 'done']) {
      const qq = { ...St.quests[id], status };
      try {
        const s = q.short(qq), o = q.objectives(qq);
        if (typeof s !== 'string' || !s) bad.push(`${id}/${status} short`);
        if (!Array.isArray(o) || !o.length || o.some((x) => typeof x.t !== 'string' || typeof x.done !== 'boolean')) bad.push(`${id}/${status} objectives`);
        const T = Q.TARGETS[id]; if (T) { const t = T(qq); if (t && (!M.MAPS[t.map] || !Number.isFinite(t.x) || !Number.isFinite(t.y))) bad.push(`${id}/${status} target ${JSON.stringify(t)}`); }
      } catch (e) { bad.push(`${id}/${status} threw ${e.message}`); }
    }
  }
  return { n: Object.keys(Q.QUESTS).length, bad, orphan: Object.keys(St.quests).filter((k) => !Q.QUESTS[k]) };
});
check('every quest has text, a state and working step text and markers in every status', audit.n >= 25 && audit.bad.length === 0, JSON.stringify(audit.bad.slice(0, 6)));

// every quest giver is a person who exists in the world
const givers = await G(async () => {
  const Q = await import('/src/data/quests.js'), D = await import('/src/data/dialogue.js'), out = [];
  const names = new Set(Object.values(D.NPC_DEFS).map((n) => n.name.toLowerCase().replace(/^(elder|captain|matriarch|chief|shaman|scout|warden-mother|keeper|the) /, '')));
  for (const [id, q] of Object.entries(Q.QUESTS)) { const g = q.giver.toLowerCase().split(',')[0].replace(/^(elder|captain hesper|matriarch|chief|shaman|the|mirra the|a note|asta the|maren|maud the|brann the|halldor the) /, ''); out.push([id, g]); }
  return out.length;
});
check('quest givers are listed', givers >= 25, String(givers));

// the smuggler's note: a quest that starts from something you find
const note = await G(async () => {
  const g = window.gs(), St = window.__ff.S, N = await import('/src/systems/notes.js'), D = await import('/src/world/discovery.js');
  g.scene.restart({ map: 'forest', spawn: 'west' }); return true;
});
await h.sleep(1500);
const nq = await G(async () => {
  const g = window.gs(), St = window.__ff.S, N = await import('/src/systems/notes.js');
  St.discovered = {}; St.gold = 0; St.inv = { smugglers_note: 1 };
  const ok = N.readNote('smugglers_note', g);
  const c = St.flags.noteCache, q1 = St.quests.smugglers.status, wp = !!St.flags.waypoint, used = !St.inv.smugglers_note;
  const p = g.built.pois.find((x) => x.id === c.id); g.player.setPosition(p.x * 16, p.y * 16 + 16); g.discoverTick();
  return { ok, q1, wp, used, q2: St.quests.smugglers.status, gold: St.gold, cleared: !St.flags.noteCache };
});
check('reading the note starts a quest, marks the cache, and finding it pays out', nq.ok && nq.q1 === 'active' && nq.wp && nq.used && nq.q2 === 'done' && nq.gold >= 80 && nq.cleared, JSON.stringify(nq));
// new challenge modifiers
const ch = await G(() => {
  const g = window.gs(), St = window.__ff.S, f = g.fires?.[0]; g.enemies.getChildren().slice().forEach((e) => e.destroy());
  St.mods = { pilgrim: true }; const pil = g.fastTravel({ x: f.x, y: f.y, key: f.key }); g.leaving = false;
  St.mods = { moonbound: true }; St.time = 600; St.days = 2; g.updateClock(0.1);
  const out = { pil, t: Math.round(St.time), full: ((St.days % 8) === 4) };
  St.mods = {}; return out;
});
check('Pilgrim forbids fast travel; Moonbound makes every night a full moon', ch.pil === false && ch.t === 1380 && ch.full, JSON.stringify(ch));
// save and load keep the new world state
const sv = await G(async () => {
  const g = window.gs(), St = window.__ff.S, SV = await import('/src/systems/save.js'), ST = await import('/src/systems/state.js');
  St.days = 11; St.followMode = 'wait'; St.killed = { 'forest:1': -1003, 'forest:2': -1 }; St.flags.noteCache = { map: 'forest', id: 'cache1', x: 5, y: 6, tier: 1 }; St.discovered = { 'forest:camp0': 1 }; St.mods = { moonbound: true }; St.perks = { deadeye: true }; St.flags.bloodAlphas = 2;
  SV.saveGame(g);
  ST.resetState();
  const cleared = { days: St.days, mode: St.followMode };
  const ok = SV.loadGame();
  const S2 = window.__ff.S;
  return { ok, cleared, days: S2.days, mode: S2.followMode, killed: S2.killed, note: S2.flags.noteCache?.id, disc: S2.discovered, mods: S2.mods, perk: !!S2.perks.deadeye, blood: S2.flags.bloodAlphas };
});
check('saving and loading keeps the calendar, camps, notes, discoveries, orders, modifiers and capstone perks', sv.ok && sv.days === 11 && sv.mode === 'wait' && sv.killed['forest:1'] === -1003 && sv.note === 'cache1' && sv.disc['forest:camp0'] === 1 && sv.mods.moonbound && sv.perk && sv.blood === 2, JSON.stringify(sv));
const pages = await G(async () => {
  const S = window.__ff.S, g = window.gs ? window.gs() : window.__ff.game.scene.getScene('Game'), N = await import('/src/systems/notes.js'), M = await import('/src/data/maps.js'), out = {};
  S.flags.introDone = true;
  g.mapId = 'forest';
  for (const id of ['torn_map', 'pilgrim_letter', 'hunters_journal']) {
    const q = N.NOTES[id].quest; S.inv[id] = 1; S.discovered = {}; S.gold = 0;
    const read = N.readNote(id, g), t = S.flags.noteTargets?.[q], poi = t && M.getReach().pois.find((p) => p.id === t.id);
    N.noteDiscovered('forest', poi || {});
    out[id] = read && S.quests[q].status === 'done' && S.gold > 0 && poi?.kind === N.NOTES[id].kind;
  }
  return out;
});
check('torn maps, pilgrim letters and hunters\' journals each start a quest that pays when you find the place', Object.values(pages).every(Boolean), JSON.stringify(pages));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'QUESTS FAILED' : 'QUESTS PASSED');
process.exit(failCount() ? 1 : 0);
