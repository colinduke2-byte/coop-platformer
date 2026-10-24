// PR-24 (rest): Arena Mode unlocks from score and records - cloaks, run modifiers, the arena's own cloak in the campaign.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=title');
await h.sleep(900);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(120); };
const REC = 'frostfall_arena_records';

const lk = await G(async ([REC]) => {
  const H = await import('/src/arena/heroes.js'), U = await import('/src/arena/unlocks.js'), A = await import('/src/systems/achievements.js'), S = window.__ff.S;
  const out = {};
  localStorage.removeItem(REC);
  out.fresh = U.ARENA_CLOAKS.filter((c) => U.cloakOpen(c)).length === 1 && U.ARENA_MODS.filter((m) => U.modOpen(m)).length === 1;
  H.beginQuickRun('warden', { mode: 'survival', cloak: 13, mod: 'glass' });
  out.lockedIgnored = S.quick.cloak == null && !S.quick.mod && !S.mods?.glass && H.quickScore(1, 0, 0) === 100;
  S.quick = null; S.trophies = {};
  out.campaignLocked = !A.unlockedCloaks().some((c) => c.col === 5);
  localStorage.setItem(REC, JSON.stringify({ 'warden:survival': { score: 3500, waves: 20, runs: 3 } }));
  out.campaignOpen = A.unlockedCloaks().some((c) => c.col === 5);
  out.all = U.ARENA_CLOAKS.every((c) => U.cloakOpen(c)) && U.ARENA_MODS.every((m) => U.modOpen(m));
  H.beginQuickRun('warden', { mode: 'survival', cloak: 5, mod: 'glass' });
  out.applied = S.quick.cloak === 5 && A.currentCloak().col === 5 && S.mods.glass === true && S.quick.scoreMul === 1.25 && H.quickScore(1, 0, 0) === 125;
  H.beginQuickRun('reaver', { mode: 'daily' });
  out.dailyKeepsOwn = !S.quick.mod && Object.keys(S.mods).length === 2;
  out.bestWave = H.bestWave() === 20;
  return out;
}, [REC]);
check('nothing is open on a fresh device, and a locked pick is ignored', lk.fresh && lk.lockedIgnored, JSON.stringify(lk));
check('best score 3500 / wave 20 opens every cloak and modifier; the pick is worn and scored (glass x1.25)', lk.all && lk.applied, JSON.stringify(lk));
check("Champion's Pale (Arena Mode wave 15) shows up among the campaign's cloaks, a cosmetic only", lk.campaignLocked && lk.campaignOpen, JSON.stringify(lk));
check('the Daily Arena keeps its own two modifiers', lk.dailyKeepsOwn && lk.bestWave, JSON.stringify(lk));

// ---- Chaos and Emberfall in a real run
await G(async () => {
  const H = await import('/src/arena/heroes.js'); H.beginQuickRun('warden', { mode: 'survival', arena: 'pit', mod: 'chaos' });
  const g = window.__ff.game; for (const k of ['Title', 'Game', 'Hud']) if (g.scene.isActive(k)) g.scene.stop(k);
  g.scene.start('Game', { map: 'pit', spawn: 'in' });
});
await h.sleep(2200);
const md = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S, out = {};
  const a = { wave: 2, mode: 'classic' }, foes = [{ kind: 'draugr', tier: 0, elite: false }];
  g.quickWaveHook(a, foes); out.chaos = !!a.twist; if (a.twist === 'darkness') g.ambientOverride = null;
  S.quick.mod = null; const b = { wave: 2, mode: 'classic' }; g.quickWaveHook(b, foes); out.plain = !b.twist;
  S.quick.mod = 'emberfall'; S.quick.emberT = 0; g.arena.active = true; g.arena.offering = false; g.quickTick(0.016); out.ember = S.quick.emberT > 0;
  S.quick.mod = null; S.quick.emberT = 0; g.quickTick(0.016); out.noEmber = S.quick.emberT <= 0;
  return out;
});
check('Chaos twists wave 2; Emberfall drops embers in the plain pit (and neither runs without its modifier)', md.chaos && md.plain && md.ember && md.noEmber, JSON.stringify(md));

// ---- setup screen: U cycles cloaks, F modifiers; a locked one blocks the start and says what opens it
await G(([REC]) => { localStorage.setItem(REC, JSON.stringify({ 'warden:survival': { score: 700, waves: 6, runs: 1 } })); const g = window.__ff.game; for (const k of ['Game', 'Hud']) if (g.scene.isActive(k)) g.scene.stop(k); g.scene.start('ArenaSetup'); }, [REC]);
await h.sleep(900);
await G(() => { const s = window.__ff.game.scene.getScene('ArenaSetup'); s.cloakI = 0; s.modI = 0; });
await tap('KeyU'); await tap('KeyU'); await tap('KeyF');
const su = await G(() => { const s = window.__ff.game.scene.getScene('ArenaSetup'); return { cloak: s.cloakI, mod: s.modI, text: s.info.map((o) => o.text).join('|') }; });
check('U cycles the cloak, F the modifier; a locked cloak says LOCKED: SCORE 1200', su.cloak === 2 && su.mod === 1 && /CLOAK LOCKED: SCORE 1200/.test(su.text) && /GLASS CANNON/.test(su.text), JSON.stringify(su));
await h.shot('s113_setup');
await tap('KeyE'); await h.sleep(400);
check('a locked cloak does not start the run', await G(() => window.__ff.game.scene.isActive('ArenaSetup')));
await G(() => { const s = window.__ff.game.scene.getScene('ArenaSetup'); s.cloakI = 1; s.modI = 1; s.sel = 0; });
await tap('KeyE'); await h.sleep(2200);
const run = await G(([REC]) => ({ game: window.__ff.game.scene.isActive('Game'), cloak: window.__ff.S.quick?.cloak, mod: window.__ff.S.quick?.mod, pick: JSON.parse(localStorage.getItem(REC))._pick, tex: window.__ff.game.scene.getScene('Game').player?.texture.key }), [REC]);
check('an open cloak and modifier start the run, are worn, and are remembered in the arena records', run.game && run.cloak === 15 && run.mod === 'glass' && run.pick?.cloak === 15 && run.pick?.mod === 'glass' && /15$/.test(run.tex), JSON.stringify(run));

// ---- the results card names what a run just opened
await G(([REC]) => { localStorage.setItem(REC, JSON.stringify({ 'warden:survival': { score: 100, waves: 4, runs: 1 } })); const g = window.__ff.game; for (const k of ['Game', 'Hud']) if (g.scene.isActive(k)) g.scene.stop(k); g.scene.start('ArenaResults', { hero: 'warden', mode: 'survival', arena: 'pit', score: 900, waves: 5, kills: 20, champions: 1, time: 200 }); }, [REC]);
await h.sleep(700);
const res = await G(() => window.__ff.game.scene.getScene('ArenaResults').opened);
check('the results card lists the new unlocks (Frost Blue cloak at score 600, Glass Cannon at wave 5)', res.includes('FROST BLUE CLOAK') && res.includes('GLASS CANNON MODIFIER') && res.length === 2, JSON.stringify(res));
await h.shot('s113_results');
await G(([REC]) => localStorage.removeItem(REC), [REC]);
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ARENA UNLOCKS FAILED' : 'ARENA UNLOCKS PASSED');
