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
//@@MORE@@
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'FINISH COMBAT FAILED' : 'FINISH COMBAT PASSED');
