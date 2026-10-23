// World agent (W) features that hook into GameScene without editing it (see docs/AGENT_RULES.md, section 2).
import { registerTicker } from '../scenes/gameHooks.js';
import { T } from '../config.js';
import { notePlayer } from '../world/questmarks.js';

// quest markers measure "nearest" from where you stand (WQ2, WQ4, WQ5)
registerTicker('worldMarks', (sc) => { if (sc.player) notePlayer(sc.mapId, sc.player.x / T, sc.player.y / T); }, 150);
