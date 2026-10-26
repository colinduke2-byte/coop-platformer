// The map tab keeps drawing after the menu is closed and opened again, however you reach it (M, Esc then A, I then D...),
// and exit labels never spill out of the map box. Before the fix every reopened map was blank: its layers belonged to the
// previous, destroyed menu.
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
const G = (fn, a) => h.ev(fn, a);
const tap = async (k) => { await G((k) => window.__ff.keys._press(k), k); await h.wait(120); await G((k) => window.__ff.keys._release(k), k); await h.wait(450); };
await h.open('scene=game&map=forest&spawn=west'); await h.wait(2000);
// a well explored Reach
await G(() => { const g = window.__ff.game.scene.getScene('Game'), S = window.__ff.S; const arr = S.fog.forest.split(''); const cw = Math.ceil(g.built.w / 2); for (let cy = 20; cy < 120; cy++) for (let cx = 0; cx < 150; cx++) arr[cy * cw + cx] = '1'; S.fog.forest = arr.join(''); g.fogArr = arr; });
const drawn = () => G(() => {
  const m = window.__ff.game.scene.getScene('Menu');
  const t = m.mapTerrain, o = m.mapOver;
  return { tab: m.tabs[m.tab]?.name, terrainAlive: !!t?.scene, overAlive: !!o?.scene, images: t?.scene ? t.list.length : 0, marks: o?.scene ? o.commandBuffer.length : 0 };
});
const ways = [['M', ['KeyM']], ['M again', ['KeyM']], ['Esc then A', ['Escape', 'KeyA']], ['I then D x3', ['KeyI', 'KeyD', 'KeyD', 'KeyD']]];
for (const [name, keysSeq] of ways) {
  for (const k of keysSeq) await tap(k);
  const d = await drawn();
  check(`map opened by ${name} draws terrain and markers`, d.tab === 'MAP' && d.terrainAlive && d.overAlive && d.images >= 1 && d.marks > 10, JSON.stringify(d));
  await tap('Escape'); await h.wait(300);
  if (await G(() => window.__ff.game.scene.isActive('Menu'))) { await tap('Escape'); await h.wait(300); }
}
// labels: every exit label lies inside the map box
await tap('KeyM');
for (const z of [0, 1, 2, 3]) {
  const out = await G(() => {
    const m = window.__ff.game.scene.getScene('Menu'); const bad = [];
    const walk = (l) => l.forEach((c) => { if (c.list) walk(c.list); else if (c.type === 'BitmapText' && /^TO /.test(c.text) && (c.y < 30 || c.y > 136)) bad.push(c.text + '@' + Math.round(c.y)); });
    walk(m.children.list); return bad;
  });
  check(`zoom step ${z}: no exit label outside the map box`, out.length === 0, JSON.stringify(out));
  await tap('KeyS');
}
console.log(failCount() ? 'MAP REOPEN FAILED' : 'MAP REOPEN PASSED');
process.exit(failCount() ? 1 : 0);
