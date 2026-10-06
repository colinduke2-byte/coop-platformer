// Guards world generation: the Hollow Reach must come out identical for a given seed.
// UPDATE=1 node test/reach_hash.mjs  rewrites test/baseline/reach.json after an intentional change.
import fs from 'fs';
import { launch, check, failCount } from './harness.mjs';
const SEEDS = [1, 7, 424242, 99999];
const FILE = new URL('./baseline/reach.json', import.meta.url).pathname;
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=1');
await h.sleep(800);
const got = await h.ev(async (seeds) => {
  const M = await import('/src/data/maps.js'), S = window.__ff.S;
  const fnv = (str) => { let x = 0x811c9dc5; for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(16); };
  const out = {};
  for (const s of seeds) { S.seed = s; const r = M.getReach(); out[s] = { grid: fnv(r.grid.map((row) => row.join(',')).join(';')), ents: fnv(JSON.stringify(r.entities)), pois: fnv(JSON.stringify(r.pois)), bio: fnv(r.bio.map((row) => row.join(',')).join(';')) }; }
  return out;
}, SEEDS);
if (process.env.UPDATE) { fs.writeFileSync(FILE, JSON.stringify(got, null, 1)); console.log('baseline written'); }
else {
  const want = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  for (const s of SEEDS) for (const k of ['grid', 'ents', 'pois', 'bio']) check(`seed ${s} ${k} unchanged`, want[s]?.[k] === got[s][k], `${want[s]?.[k]} vs ${got[s][k]}`);
}
await h.close();
console.log(failCount() ? 'REACH HASH FAILED' : 'REACH HASH OK');
