// H: HUD and first hour. Tips at the moment they matter (NP5), and danger shown without locking on (NP24).
import { registerTicker, registerListener } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { S } from '../systems/state.js';
import { tip, controlsCard } from '../systems/tips.js';
import { bus } from '../systems/bus.js';
import { settings } from '../systems/settings.js';
import { dangerOfEnemy, dangerName, DANGER_COL } from '../systems/danger.js';
import { TUNE } from '../data/tuning.js';

// NP5: the sneak tip comes while a foe is still unaware of you and close, before it notices (not after)
let sneakLook = 0;
registerTicker('hudSneakTip', (sc, dt) => {
  if (S.tips.sneak || S.quick || (sneakLook -= dt) > 0) return;
  sneakLook = 0.25;
  const pl = sc.player;
  if (!pl || pl.sneaking || pl.mode === 'dead') return;
  const R = TUNE.hud.sneakTipR;
  if (sc.enemies.getChildren().some((e) => !e.dead && !e.alerted && !e.cfg.passive && !e.tutorial && Math.abs(e.x - pl.x) < R && Math.abs(e.y - pl.y) < R && Math.hypot(e.x - pl.x, e.y - pl.y) < R)) tip('sneak');
}, CORE_ORDER.enemies + 10);

// NP5: the journal tip comes with the first quest you take, whichever it is
registerListener('toast', (sc, text) => { if (/^QUEST STARTED/.test(String(text))) tip('quest'); });

// NP24: when a foe first notices you, its name floats over it for a moment in its danger colour. AUTO shows it for the
// first few character levels (and always for foes beyond you), ALWAYS for every foe, OFF never.
export function dangerNameOn(e) {
  const mode = settings.dangerNames || 'auto';
  if (mode === 'off' || e.isBoss || e.cfg.passive || S.quick) return null;
  const dg = dangerOfEnemy(e);
  if (mode === 'auto' && (S.charLevel || 1) > TUNE.hud.dangerNamesLevel && dg < 4) return null;
  return dg;
}
registerTicker('hudDangerNames', (sc) => {
  for (const e of sc.enemies.getChildren()) {
    if (e.dead || !e.alerted || e.hudNamed) continue;
    e.hudNamed = true;
    const dg = dangerNameOn(e);
    if (!dg) continue;
    const name = (e.displayName || e.cfg.name || '').toUpperCase();
    sc.fx.text(e.x, e.y - 30, dg === 2 ? name : name + ' ' + dangerName(dg), DANGER_COL[dg], TUNE.hud.dangerNameLife);
    if (dg !== 2) tip('danger');
  }
}, CORE_ORDER.enemies + 20);

// NP17: the first Arena or Daily run shows the controls card too (those runs skip the intro and the tutorial). Remembered
// on this device, not in the save: a quick run starts from a fresh state every time.
registerListener('scene:game', (sc) => {
  if (!S.quick && !S.daily) return;
  try { if (localStorage.getItem('frostfall_quick_card')) return; localStorage.setItem('frostfall_quick_card', '1'); } catch { return; }
  bus.emit('hint', controlsCard());
});
