import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start');
await h.sleep(700);
const G = (fn, a) => h.ev(fn, a);
const press = (c) => h.ev((c) => window.__ff.keys._press(c), c);
const rel = (c) => h.ev((c) => window.__ff.keys._release(c), c);
const tap = async (c, ms = 80) => { await press(c); await h.sleep(ms); await rel(c); await h.sleep(70); };

// ---- damage numbers merge
const merged = await G(() => {
  const g = window.__ff.game.scene.getScene('Game'); g.fx.texts.length && g.fx.texts.splice(0).forEach((t) => t.t.destroy());
  g.fx.text(100, 100, '5'); g.fx.text(104, 102, '7'); g.fx.text(300, 300, '4');
  return { n: g.fx.texts.length, first: g.fx.texts[0].num };
});
check('nearby damage numbers merge into one running total', merged.n === 2 && merged.first === 12, JSON.stringify(merged));
const capped = await G(() => { const g = window.__ff.game.scene.getScene('Game'); for (let i = 0; i < 40; i++) g.fx.text(i * 40, i * 30, '3'); return g.fx.texts.length; });
check('crowd fights cap the number of floating texts', capped <= 12, String(capped));

// ---- shout cooldown number + status row exist
await G(() => { const p = window.__ff.game.scene.getScene('Game').player; p.shoutCd = 7.2; p.ward = { hp: 20, t: 5 }; });
await h.sleep(250);
const hud = await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); return { cd: hd.cdTxt?.text, stat: hd.statTxt?.map((t) => t.text).filter(Boolean) }; });
check('shout cooldown shows seconds left', hud.cd === '8' || hud.cd === '7', JSON.stringify(hud));
check('ward shows up in the status row with its timer', hud.stat?.some((t) => t.startsWith('WARD')), JSON.stringify(hud));
await G(() => { window.__ff.game.scene.getScene('Game').player.ward = null; window.__ff.game.scene.getScene('Game').player.shoutCd = 0; });

// ---- large UI makes the bars bigger
const wide = async () => { await h.sleep(150); await h.shot('s17_hud'); };
await G(async () => { (await import('/src/systems/settings.js')).settings.largeUi = true; });
await wide();
await G(async () => { (await import('/src/systems/settings.js')).settings.largeUi = false; });

// ---- map: zoom, cursor, waypoint
await tap('KeyM', 80); await h.sleep(300);
check('map opens', await G(() => window.__ff.game.scene.getScene('Menu').tabs[window.__ff.game.scene.getScene('Menu').tab].name === 'MAP'));
await h.shot('s17_map1');
await tap('KeyQ', 60); await h.sleep(200);
await h.shot('s17_map2');
await tap('KeyE', 60); await h.sleep(100);
await tap('KeyD', 60); await tap('KeyD', 60); await tap('KeyE', 60); await h.sleep(200);
const wp = await G(() => window.__ff.S.flags.waypoint);
check('a waypoint can be placed from the map', !!wp && wp.map === 'village', JSON.stringify(wp));
await tap('Escape', 60); await h.sleep(300);
await h.sleep(200);
await h.shot('s17_waypoint');
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
console.log(failCount() ? 'UI FAILED' : 'UI PASSED');
process.exit(failCount() ? 1 : 0);
