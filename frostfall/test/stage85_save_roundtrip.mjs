// Save round trip (CH5): every field of S survives saveGame -> localStorage -> loadGame unchanged, and saves written
// before CH5 (no optional fields, older version) still load.   node test/stage85_save_roundtrip.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch({ paused: true });
await h.open('scene=game&map=village&spawn=start&seed=4242');
await h.wait(1200);
const G = (fn, a) => h.ev(fn, a);

const r = await G(async () => {
  const sv = await import('/src/systems/save.js'), st = await import('/src/systems/state.js'), { settings } = await import('/src/systems/settings.js');
  const gl = await import('/src/systems/genloot.js');
  const S = window.__ff.S;
  S.flags.introDone = true;
  // give every field a value that differs from its default, of the right kind
  const probe = { string: (k) => 'probe_' + k, object: (k) => ({ probe: k, n: 3 }), array: (k) => [{ id: 'probe_' + k, price: 5 }], boolean: () => true, number: () => 7 };
  for (const [k, kind] of Object.entries(st.OPTIONAL_KINDS)) if (k !== 'quick' && k !== 'daily') S[k] = probe[kind](k);   // Arena Mode / daily runs never save
  S.gold = 4321; S.arrows = 33; S.time = 777; S.days = 5; S.weather = 'blizzard'; S.tracked = 'wolves'; S.follower = true; S.ngPlus = 2;
  S.skills.archery = { lvl: 9, xp: 12 }; S.perks.keen = 1; S.flags.someFlag = { a: [1, 2] }; S.quests.wolves = { status: 'active', kills: 2 };
  S.fog.village = '0011100001111' + '0'.repeat(40);
  const gid = gl.makeGenItem(1, Math.random, null); S.inv[gid] = 1;          // a generated item that something refers to
  S.bossState = null;                                                        // saveGame(no scene) clears it
  const before = JSON.parse(JSON.stringify(S));
  settings.slot = 3;
  const saved = sv.saveGame(null, { quiet: true });
  st.resetState();
  const loaded = sv.loadGame(3);
  const after = JSON.parse(JSON.stringify(S));
  const diff = [];
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) diff.push(k);
  return { saved, loaded, diff, n: keys.size, declared: Object.keys(st.newState()).length };
});
console.log(JSON.stringify(r));
check('every field of S survives save -> load unchanged', r.saved && r.loaded && r.diff.length === 0 && r.n === r.declared, JSON.stringify(r));

// a save written before CH5 (version 2, no optional fields at all) still loads
const old = await G(async () => {
  const sv = await import('/src/systems/save.js'), st = await import('/src/systems/state.js');
  const s = st.newState(); for (const k of Object.keys(st.OPTIONAL_KINDS)) delete s[k];
  s.gold = 55; s.stash = undefined;
  localStorage.setItem('frostfall_save_s3', JSON.stringify({ v: 2, t: Date.now(), s }));
  const ok = sv.loadGame(3); const S = window.__ff.S;
  return { ok, gold: S.gold, stash: S.stash, quick: S.quick };
});
check('an old version-2 save without the new fields still loads', old.ok && old.gold === 55 && old.stash === null && old.quick === null, JSON.stringify(old));

await G(async () => { (await import('/src/systems/save.js')).deleteSave(3); (await import('/src/systems/settings.js')).settings.slot = 1; });
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'ROUNDTRIP FAILED' : 'ROUNDTRIP PASSED');
process.exit(failCount() ? 1 : 0);
