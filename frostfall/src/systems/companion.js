// Who walks with you. One companion at a time: Ragna the archer or Pell the scout.
import { S } from './state.js';
import { bus } from './bus.js';
import { dialogue } from './dialogue.js';

export const companionName = () => (S.follower ? (S.companion === 'pell' ? 'Pell' : 'Ragna') : null);
// Swap (or dismiss, with null) the companion. The scene follows through the 'follower' event.
export function setCompanion(who) {
  const g = dialogue.hud?.scene?.get?.('Game');
  if (who) { S.companion = who; S.follower = true; } else S.follower = false;
  // swapping: the old companion steps aside here; dismissing (who = null) is handled by the scene's 'follower' event
  if (g?.follower && who && g.follower.kind !== who) { const old = g.follower; g.interactables = g.interactables.filter((i) => i !== old); old.destroy(); g.follower = null; }
  bus.emit('follower', !!who);
}
