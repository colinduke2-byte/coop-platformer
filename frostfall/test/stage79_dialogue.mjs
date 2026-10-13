// Dialogue fuzz: every NPC's script, run several times with random answers (shops and services are opened and closed again
// the way a player would), must finish without throwing and without hanging, in every story state we can cheaply set up:
// a fresh game, mid-game and after the main quests are done.
//   node test/stage79_dialogue.mjs [runs=3]
import { launch, check, failCount } from './harness.mjs';
const RUNS = +process.argv[2] || 3;
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.sleep(1200);
const G = (fn, a) => h.ev(fn, a);

await G(async () => {
  const M = await import('/src/data/maps.js'), dlg = await import('/src/systems/dialogue.js');
  await import('/src/data/regions4_story.js');
  window.__ff.S.flags.introDone = true;
  const ids = new Set();
  for (const m of Object.values(M.MAPS)) { if (!m.build) continue; try { for (const e of m.build().entities || []) if (e.t === 'npc') ids.add(e.id); } catch (e) { /* maps that need a scene are covered elsewhere */ } }
  window.__ids = [...ids].sort();
  window.__realHud = dlg.dialogue.hud;
  // random answers; any service screen that opens is closed again a moment later, like a player leaving a shop
  window.__stub = (seed) => {
    let r = seed;
    const rnd = () => { r = (r * 1103515245 + 12345) % 2147483648; return r / 2147483648; };
    let n = 0;
    dlg.dialogue.hud = { say: async () => {}, choose: async (o) => { n++; if (n > 40) return o.length - 1; return Math.floor(rnd() * o.length); }, hideBox() {}, scene: window.__realHud.scene };
  };
  window.__closer = setInterval(() => {
    const sm = window.__ff.game.scene;
    for (const k of ['Shop', 'Lockpick', 'Smith', 'Craft']) if (sm.isActive(k)) { window.__ff.keys._press('Escape'); setTimeout(() => window.__ff.keys._release('Escape'), 40); }
    if (sm.isActive('Menu')) sm.stop('Menu');                  // a stray Escape opened the pause menu: close it so the game clock runs again
    if (sm.isPaused('Game')) sm.resume('Game');
  }, 120);
});
const ids = await G(() => window.__ids);
console.log(`  (${ids.length} NPC scripts, ${RUNS} runs each, 3 story states)`);

const states = {
  fresh: () => {},
  midgame: () => { const S = window.__ff.S; S.gold = 5000; for (const q of Object.values(S.quests)) if (q.status === 'inactive' && Math.random() < 0.5) q.status = 'active'; S.flags.blightMotherDead = true; S.flags.crypt = true; },
  late: () => { const S = window.__ff.S; S.gold = 20000; for (const q of Object.values(S.quests)) q.status = 'done'; S.flags.vaultSovereignDead = true; S.flags.choiceVault = 'seal'; S.flags.choiceGrove = 'replant'; S.flags.finale = true; },
};
const problems = [];
for (const [name, setup] of Object.entries(states)) {
  await G((src) => (0, eval)('(' + src + ')')(), setup.toString());
  for (const id of ids) {
    for (let run = 0; run < RUNS; run++) {
      const r = await G(async ([n, seed]) => {
        window.__stub(seed);
        const D = await import('/src/data/dialogue.js');
        try {
          return await Promise.race([Promise.resolve(D.SCRIPTS[n]()).then(() => 'ok'), new Promise((res) => setTimeout(() => res('hang'), 15000))]);
        } catch (e) { return 'threw: ' + e.message; } finally { window.__ff.game.scene.getScene('Hud')?.dialogue?.hideBox?.(); }
      }, [id, 1 + run * 7919 + id.length * 31]);
      if (r !== 'ok') { problems.push(`${name}/${id}#${run}: ${r}`); break; }
    }
  }
}
check('every NPC script finishes, with any answers, in every story state', problems.length === 0, '\n    ' + problems.join('\n    '));
check('no page errors', h.errors.length === 0, h.errors.slice(0, 8).join('\n'));
await h.close();
console.log(failCount() ? 'DIALOGUE FUZZ FAILED' : 'DIALOGUE FUZZ PASSED');
process.exit(failCount() ? 1 : 0);
