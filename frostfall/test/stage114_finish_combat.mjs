// Combat finish: CB13 bestiary crush line, CB24 heavy descriptions, VX-05 folded WEAK / RESIST numbers, perfect-dodge
// slow motion on enemy zones and tweens, the nemesis keyed by id.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('map=village');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);

// ---- CB13: the bestiary warns about shield crushers
const cr = await G(async () => {
  const M = await import('/src/entities/enemyMoves.js'), { ENEMIES } = await import('/src/data/enemies.js');
  return { bear: M.crushNote('bear', ENEMIES.bear), mosshulk: M.crushNote('mosshulk', ENEMIES.mosshulk), chief: M.crushNote('chief', ENEMIES.chief), wolf: M.crushNote('wolf', ENEMIES.wolf), archer: M.crushNote('archer', ENEMIES.archer) };
});
check('CB13: crushers (bear, mosshulk) and crushing second moves (bandit chief) get a bestiary line; wolves and archers do not', /^CRUSHES SHIELDS/.test(cr.bear) && /^CRUSHES SHIELDS/.test(cr.mosshulk) && /^CAN CRUSH SHIELDS/.test(cr.chief) && !cr.wolf && !cr.archer, JSON.stringify(cr));
// ---- CB24: every weapon's description says what its heavy does
const hv = await G(async () => {
  const { ITEMS } = await import('/src/data/items.js'), GL = await import('/src/systems/genloot.js'), out = {};
  const weapons = Object.entries(ITEMS).filter(([, it]) => it.type === 'weapon' || it.type === 'weapon2h');
  out.missing = weapons.filter(([, it]) => !/heavy/i.test(it.desc || '')).map(([id]) => id);
  out.twice = weapons.filter(([, it]) => (it.desc.match(/heavy/gi) || []).length > 1).map(([id]) => id);
  out.sword = ITEMS.iron_sword.desc; out.knife = ITEMS.hunting_knife.desc; out.gs = ITEMS.iron_greatsword.desc; out.halberd = ITEMS.iron_halberd.desc; out.staff = ITEMS.hazel_staff.desc;
  let gen = null; for (let i = 0; i < 60 && !gen; i++) { const id = GL.makeGenItem(1); if (/weapon/.test(ITEMS[id].type)) gen = ITEMS[id].desc; }
  out.gen = gen;
  return out;
});
check('CB24: every weapon (fixed and generated) names its heavy once: sword overhead, dagger backstab, greatsword charge, halberd sweep, staff bolt', !hv.missing.length && !hv.twice.length && /overhead/.test(hv.sword) && /back/.test(hv.knife) && /charge/.test(hv.gs) && /sweep/.test(hv.halberd) && /frost bolt/.test(hv.staff) && /HEAVY: /.test(hv.gen || ''), JSON.stringify(hv));
//@@MORE@@
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'FINISH COMBAT FAILED' : 'FINISH COMBAT PASSED');
