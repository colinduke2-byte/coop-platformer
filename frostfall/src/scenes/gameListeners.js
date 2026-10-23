// GameScene's bus listeners (CH9), wired on every map load and removed when the scene shuts down. Moved here unchanged
// from GameScene.create(). A feature adds its own with registerListener(ev, (scene, ...args) => ...) from its own file.
import { S } from '../systems/state.js';
import { sfx } from '../audio/sfx.js';
import { submitScore } from '../systems/daily.js';
import { tip } from '../systems/tips.js';
import { registerListener } from './gameHooks.js';

registerListener('follower', (sc, on) => {
  const hide = (id) => { const rn = sc.npcs.find((n) => n.id === id); if (rn) { sc.npcs = sc.npcs.filter((n) => n !== rn); sc.interactables = sc.interactables.filter((i) => i !== rn); rn.shadow.destroy(); rn.nameTxt.destroy(); rn.destroy(); } };
  if (on) {
    hide(S.companion === 'pell' ? 'pell' : 'ragna');
    sc.spawnFollower();
  } else if (sc.follower) {
    const kind = sc.follower.kind;
    sc.interactables = sc.interactables.filter((i) => i !== sc.follower);
    sc.follower.destroy(); sc.follower = null;
    const spec = sc.built.entities.find((x) => x.t === 'npc' && x.id === kind);
    if (spec && (kind === 'ragna' ? sc.mapId === 'village' : sc.mapId === 'emberhold')) sc.spawnEntity(spec);
  }
});
registerListener('player:dead', (sc) => { sc.deadT = 0.001; S.run.deaths = (S.run.deaths || 0) + 1; submitScore(); });
registerListener('nostamina', () => tip('stamina'));
registerListener('charlevel', () => tip('perks'));
registerListener('item:added', (sc, id) => { if (id === 'lockpick') tip('lock'); if (S.quests.wolves.status === 'active') tip('quest'); });
registerListener('ending', (sc, kind) => { sc.pendingEnding = kind; });
registerListener('levelup', (sc) => {
  sfx.play('levelup');
  sc.fx.ring(sc.player.x, sc.player.y + 4, 0.8, 0.6, 'ring', 0xf4d460);
  sc.fx.puff(sc.player.x, sc.player.y, 13, 14, 55, 0.7, -20);
});
