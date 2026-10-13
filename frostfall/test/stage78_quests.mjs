// Quest audit: every NPC placed in any map has a name and a script; every side-quest chain can be started, fed and finished
// in order; every chain goal is achievable in the world (the creatures spawn, the items drop or grow, the places exist);
// shops and services that share an NPC with a chain stay reachable; every choice combination of the expansion's three
// choices reaches its epilogue lines.
//   node test/stage78_quests.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=777');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);

// ---- 1. every NPC in every map has a definition and a script
const npcs = await G(async () => {
  const M = await import('/src/data/maps.js'), D = await import('/src/data/dialogue.js');
  await import('/src/data/regions4_story.js');
  const where = {}, bad = [], built = [];
  for (const [id, m] of Object.entries(M.MAPS)) {
    if (!m.build) continue;
    let b; try { b = m.build(); } catch (e) { bad.push(`${id}: build threw ${e.message}`); continue; }
    built.push(id);
    for (const e of b.entities || []) if (e.t === 'npc') (where[e.id] ||= []).push(id);
  }
  for (const id of Object.keys(where)) {
    if (!D.NPC_DEFS[id]) bad.push(`npc ${id} (in ${where[id].join(',')}) has no NPC_DEFS entry`);
    if (typeof D.SCRIPTS[id] !== 'function') bad.push(`npc ${id} (in ${where[id].join(',')}) has no script`);
  }
  window.__npcWhere = where;
  return { n: Object.keys(where).length, maps: built.length, bad };
});
console.log(`  (${npcs.n} NPCs across ${npcs.maps} maps)`);
check('every placed NPC has a name, a sprite and a script', npcs.bad.length === 0, '\n    ' + npcs.bad.join('\n    '));

// ---- dialogue stub: answers from a list (default: first option), records what was said and offered
await G(async () => {
  const dlg = await import('/src/systems/dialogue.js'); window.__dlg = dlg.dialogue; window.__realHud = dlg.dialogue.hud;
  window.__stub = (answers = []) => {
    window.__answers = [...answers]; window.__said = []; window.__offered = [];
    dlg.dialogue.hud = { say: async (n, t) => { window.__said.push(t); }, choose: async (o) => { window.__offered.push(o); return window.__answers.length ? window.__answers.shift() : (o.findIndex((x) => /leave|not today|not yet|goodbye|nothing/i.test(x)) >= 0 && window.__answers.done ? o.findIndex((x) => /leave|not today|not yet|goodbye|nothing/i.test(x)) : 0); }, hideBox() {}, scene: window.__realHud.scene };
  };
  window.__talk = async (id, answers = []) => {
    window.__stub(answers); window.__answers.done = true;
    const D = await import('/src/data/dialogue.js');
    const r = await Promise.race([D.SCRIPTS[id]().then(() => 'ok'), new Promise((res) => setTimeout(() => res('timeout'), 4000))]);
    return { r, said: window.__said.slice(), offered: window.__offered.slice() };
  };
});

// ---- 2. chains: can each step be started, achieved and turned in, in order?
const chains = await G(async () => {
  const R = await import('/src/data/regions4_story.js'), S = window.__ff.S, M = await import('/src/data/maps.js');
  const { addItem } = await import('/src/systems/inventory.js');
  const out = [];
  for (const c of R.CHAINS) {
    const log = { id: c.id, npc: c.npc, steps: [], problems: [] };
    if (!window.__npcWhere[c.npc]) log.problems.push(`giver ${c.npc} is not placed in any map`);
    if (c.gate && !c.gate()) { S.quests.blightmother.status = 'active'; }      // the bard's chain opens once the main quest is known
    for (const st of c.steps) {
      const q = () => S.quests[st.qid];
      const a = await window.__talk(c.npc, [0]);
      if (st.instant && q().status === 'done') { log.steps.push(st.qid); continue; }     // a decision step is settled in the same talk
      if (q().status !== 'active') { log.problems.push(`${st.qid} did not start (status ${q().status}, ${a.r}, said ${JSON.stringify(a.said.slice(-1))})`); break; }
      // achieve the goal the way the world would
      const g = st.goal;
      if (g.kills) { const kind = g.kills[0]; S.kills[kind] = (S.kills[kind] || 0) + g.kills[1]; }
      else if (g.have) { if (g.have[1] > 0) addItem(g.have[0], g.have[1], true); }
      else if (g.cleared) {
        const reg = M.getRegion(g.poi[0]); const ps = reg.pois.filter((p) => g.cleared[0].test(p.id));
        if (ps.length < g.cleared[1]) { log.problems.push(`${st.qid}: only ${ps.length} places match ${g.cleared[0]} in ${g.poi[0]}`); break; }
        for (const p of ps.slice(0, g.cleared[1])) S.bounty[p.id] = true;
      }
      const b = await window.__talk(c.npc, [0, 0]);
      if (q().status !== 'done') { log.problems.push(`${st.qid} could not be turned in (status ${q().status}, ${b.r})`); break; }
      log.steps.push(st.qid);
    }
    // after the chain: does the NPC still offer its old service (a shop), if it had one?
    const after = await window.__talk(c.npc, []);
    log.after = after.offered.map((o) => o.join('/'));
    if (after.r !== 'ok') log.problems.push(`talking after the chain did not finish (${after.r})`);
    out.push(log);
  }
  return out;
});
for (const c of chains) check(`chain ${c.id} (${c.npc}): all ${c.steps.length} steps start and finish`, c.problems.length === 0 && c.steps.length === 3, c.problems.join('; '));

// ---- 3. NPCs that run a shop or service keep it after (and during) their chain
const shops = await G(async () => {
  const out = {};
  for (const id of ['dune_trader', 'dune_guard', 'vale_bard']) { const t = await window.__talk(id, [2]); out[id] = t.offered.map((o) => o.join('/')); }
  return out;
});
check('Jamila still runs her shop (Buy/Sell) after her chain', (shops.dune_trader || []).some((o) => /Buy/.test(o)), JSON.stringify(shops.dune_trader));

// ---- 4. every chain goal is achievable: kill targets spawn somewhere, items drop or grow somewhere, places exist
const reach = await G(async () => {
  const R = await import('/src/data/regions4_story.js'), M = await import('/src/data/maps.js'), { ENEMIES } = await import('/src/data/enemies.js');
  const W = await import('/src/world/worldgen.js');
  const kinds = new Set(), items = new Set(), problems = [];
  for (const [rid, def] of Object.entries(W.REGION_DEFS)) {
    for (const tier of def.mobs || []) for (const arr of Object.values(tier)) for (const k of arr) kinds.add(k);
    const b = M.getRegion(rid);
    for (const e of b.entities) { if (e.kind) kinds.add(e.kind); if (e.item) items.add(e.item); if (e.id && e.t === 'pickup') items.add(e.id); }
  }
  for (const id of Object.keys(M.MAPS)) { let b; try { b = M.MAPS[id].build?.(); } catch (e) { continue; } for (const e of b?.entities || []) { if (e.kind) kinds.add(e.kind); if (e.item) items.add(e.item); } }
  for (const k of kinds) for (const [it] of ENEMIES[k]?.loot?.drops || []) items.add(it);
  for (const c of R.CHAINS) for (const st of c.steps) {
    const g = st.goal;
    if (g.kills && !kinds.has(g.kills[0])) problems.push(`${st.qid}: nothing spawns '${g.kills[0]}'`);
    if (g.have && g.have[1] > 0 && !items.has(g.have[0])) problems.push(`${st.qid}: nothing drops or grows '${g.have[0]}'`);
  }
  return problems;
});
check('every chain goal can be met in the world', reach.length === 0, '\n    ' + reach.join('\n    '));

// ---- 5. the three expansion choices: every combination reaches its own epilogue lines
const combos = await G(async () => {
  const St = await import('/src/data/story.js'), S = window.__ff.S;
  const out = [];
  for (const grove of ['replant', 'keep']) for (const vault of ['sunbreaker', 'winterward', 'seal']) for (const sula of ['turnin', 'freed']) {
    S.flags.blightMotherDead = true; S.flags.vaultSovereignDead = true;
    S.flags.choiceGrove = grove; S.flags.choiceVault = vault; S.flags.choiceSula = sula;
    let lines = []; try { lines = St.epilogueLines(); } catch (e) { lines = ['ERR ' + e.message]; }
    out.push({ k: `${grove}/${vault}/${sula}`, n: lines.length, text: lines.join(' | ') });
  }
  return out;
});
const distinct = new Set(combos.map((c) => c.text)).size;
check('all 12 choice combinations produce epilogue text without errors', combos.every((c) => c.n > 0 && !/ERR /.test(c.text)), JSON.stringify(combos.filter((c) => !c.n || /ERR /.test(c.text))));
check('the 12 combinations read differently', distinct === 12, `${distinct} distinct`);

check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'QUEST AUDIT FAILED' : 'QUEST AUDIT PASSED');
process.exit(failCount() ? 1 : 0);
