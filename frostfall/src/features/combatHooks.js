// Combat hooks that need the scene's frame loop without editing GameScene (see docs/AGENT_RULES.md, section 2).
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { warpWorld } from '../entities/bulletTime.js';
import { ui } from '../systems/ui.js';

// CB2: GameScene.update returns early during a hit-stop, so Player.update never sees a press made in the freeze, and the
// key's "pressed" flag is cleared after the frame. Phaser's 'preupdate' runs before the scene's update every frame, so the
// player buffers those presses here.
registerListener('scene:game', (sc) => {
  const buffer = () => { if (sc.hitStopT > 0 && !ui.modal) sc.player?.bufferInputs?.(); };
  sc.events.on('preupdate', buffer);
  sc.events.once('shutdown', () => sc.events.off('preupdate', buffer));
});

// CB27 (rest): the perfect dodge's slow motion also slows enemy ground zones, enemy tweens and enemy delayed blows
registerTicker('warpWorld', (sc, dt) => warpWorld(sc, dt), CORE_ORDER.zones - 7);
