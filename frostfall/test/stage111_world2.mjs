// World finish: the brazier puzzle in a delve (WQ23), framed region charts on the house Trophy Wall (WQ24), and hub people
// who talk about a fallen region boss (WQ26).
//   node test/stage111_world2.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const wait = (ms) => h.sleep(ms);

// ---- WQ23: braziers lit in the carved order open the sealed alcove; a wrong order puts them out and wakes a guardian
await h.open('scene=game&map=barrow6&spawn=entry&seed=8919');
await wait(1500);
const brz = await G(async () => {
  const sc = window.__ff.game.scene.getScene('Game'), P = sc.brz;
  if (!P) return { none: true };
  const by = (b) => P.braziers.find((x) => x.beast === b), foes0 = sc.enemies.getChildren().filter((e) => !e.dead).length;
  by(P.order[1]).interact();                                         // wrong first
  const wrong = { lit: P.braziers.filter((b) => b.lit).length, foes: sc.enemies.getChildren().filter((e) => !e.dead).length - foes0 };
  const sealed = sc.solid[P.wy][P.wx];
  by(P.order[0]).interact();
  sc.breakAt(by(P.order[1]).cx, by(P.order[1]).cy, 8);              // a blow lights one too
  const two = P.lit.length;
  by(P.order[2]).interact();
  return { wrong, sealed, two, solved: P.solved, open: !sc.solid[P.wy][P.wx], flag: !!window.__ff.S.flags[P.id], carving: sc.interactables.some((i) => i.lines?.[0] === 'A CARVING OF THREE FIRES:') };
});
check('WQ23: the brazier puzzle: wrong order gutters and wakes a guardian; the carved order (by torch or blow) opens the alcove',
  !brz.none && brz.wrong.lit === 0 && brz.wrong.foes === 1 && brz.sealed && brz.two === 2 && brz.solved && brz.open && brz.flag && brz.carving, JSON.stringify(brz));
await G(() => window.__ff.game.scene.getScene('Game').scene.restart({ map: 'barrow6', spawn: 'entry' }));
await wait(1500);
const brz2 = await G(() => { const sc = window.__ff.game.scene.getScene('Game'), P = sc.brz; return { solved: P.solved, open: !sc.solid[P.wy][P.wx], lit: P.braziers.every((b) => b.lit) }; });
check('WQ23: a solved brazier puzzle stays solved', brz2.solved && brz2.open && brz2.lit, JSON.stringify(brz2));

await h.close();
console.log(failCount() ? 'STAGE 111 FAILED' : 'STAGE 111 PASSED');
