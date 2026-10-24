// H: HUD and first hour. Crowd fights stay readable (VX-05): an enemy's small HP bar shows only while it is your
// lock-on target or for a moment after it was last hurt (GameScene.drawBars reads e.barT).
import { registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { TUNE } from '../data/tuning.js';

registerTicker('hudBarTimers', (sc, dt) => {
  for (const e of sc.enemies.getChildren()) {
    if (e.dead) continue;
    if (e.hudHp !== undefined && e.hp < e.hudHp) e.barT = TUNE.hud.barHold;
    else if (e.barT > 0) e.barT -= dt;
    e.hudHp = e.hp;
  }
}, CORE_ORDER.bars - 10);
