import { S } from './state.js';
import { bus } from './bus.js';
import { QUESTS } from '../data/quests.js';
import { sfx } from '../audio/sfx.js';

let wired = false;
export function wireQuests() {
  if (wired) return;
  wired = true;
  bus.on('enemy:killed', (kind) => {
    const q = S.quests.wolves;
    if (q.status === 'active' && kind === 'wolf') {
      q.kills++;
      if (q.kills >= 3) { q.status = 'ready'; bus.emit('toast', 'QUEST READY: RETURN TO BJORN', 13); sfx.play('quest'); }
      else bus.emit('toast', `WOLVES SLAIN ${q.kills}/3`, 13);
    }
  });
  bus.on('item:added', (id) => {
    if (id === 'snowberry' || id === 'frost_lily') checkHerbs();
    if (id === 'silver_locket') {
      const lq = S.quests.locket;
      if (lq.status === 'inactive' || lq.status === 'active') { lq.status = 'relic'; bus.emit('toast', 'YOU FOUND THE LOCKET', 13); sfx.play('quest'); }
    }
    const q = S.quests.king;
    if (id === 'frostheart' && q.status === 'active') {
      q.status = 'relic';
      bus.emit('toast', 'QUEST UPDATED: THE HOLLOW KING', 13);
      sfx.play('quest');
    }
  });
}

export function checkHerbs() {
  const q = S.quests.herbs;
  if (q.status === 'active' && (S.inv.snowberry || 0) >= 5 && (S.inv.frost_lily || 0) >= 3) {
    q.status = 'ready'; bus.emit('toast', 'QUEST READY: RETURN TO MIRRA', 13); sfx.play('quest');
  }
}

export function startQuest(id) {
  const q = S.quests[id];
  q.status = 'active';
  if (id === 'wolves') q.kills = 0;
  bus.emit('toast', 'QUEST STARTED: ' + QUESTS[id].title.toUpperCase(), 13);
  sfx.play('quest');
}
export function finishQuest(id) {
  S.quests[id].status = 'done';
  bus.emit('toast', 'QUEST COMPLETE: ' + QUESTS[id].title.toUpperCase(), 13);
  sfx.play('quest');
}
