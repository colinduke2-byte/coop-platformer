import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { QUESTS, trackedId } from '../data/quests.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { keys } from '../systems/keys.js';
import { wrap, textW } from '../art/font.js';
import { panel } from './MenuScene.js';
import { systemTab } from './menuSystem.js';
import { mapTab } from './menuMap.js';
import { perksTab } from './menuPerks.js';
import { loreTab } from './menuLore.js';
import { trophyTab } from './menuTrophies.js';

const STATUS = { active: 'ACTIVE', ready: 'READY', relic: 'ACTIVE', sell: 'ACTIVE', done: 'DONE' };

// Extra tabs registered into the menu. Each: { name, render, input, help }.
export function tabs(m) {
  const list = () => Object.keys(QUESTS).filter((id) => S.quests[id].status !== 'inactive')
    .sort((a, b) => (S.quests[a].status === 'done') - (S.quests[b].status === 'done'));
  return [
    {
      name: 'QUESTS',
      help: 'W/S MOVE  E TRACK QUEST  A/D TAB  ESC CLOSE',
      input() {
        const l = list();
        m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
        m.nav(l.length);
        if (keys.pressed('interact') && l.length) {
          const id = l[m.cursor];
          if (['active', 'ready', 'relic'].includes(S.quests[id].status)) { S.tracked = id; sfx.play('select'); bus.emit('toast', 'TRACKING: ' + QUESTS[id].title.toUpperCase(), 15); m.dirty = true; }
        }
      },
      render() {
        const g = m.bg, l = list();
        panel(g, 6, 22, 112, 134, 2);
        panel(g, 122, 22, W - 128, 134, 2);
        if (!l.length) { m.T(14, 30, 'NO QUESTS YET.', 4); m.T(14, 42, 'TALK TO THE', 4); m.T(14, 51, 'VILLAGERS.', 4); return; }
        l.forEach((id, i) => {
          const y = 27 + i * 22, q = S.quests[id];
          if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 108, 21); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 21); }
          m.T(14, y, wrap(QUESTS[id].title, 17).split('\n')[0], q.status === 'done' ? 5 : 6);
          m.T(14, y + 9, STATUS[q.status] + (id === trackedId() ? ' >' : ''), q.status === 'done' ? 4 : q.status === 'ready' ? 13 : 15);
        });
        const id = l[m.cursor], def = QUESTS[id], q = S.quests[id];
        m.T(128, 27, def.title, 13);
        m.T(128, 37, 'FROM ' + def.giver, 4);
        m.T(128, 48, wrap(def.desc, 31), 5);
        const lines = wrap(def.desc, 31).split('\n').length;
        let y = 48 + lines * 9 + 6;
        def.objectives(q).forEach((o) => {
          m.T(128, y, o.done ? '[X]' : '[ ]', o.done ? 8 : 6);
          const w = wrap(o.t, 27);
          m.T(152, y, w, o.done ? 3 : 6);
          y += w.split('\n').length * 9 + 2;
        });
        if (q.status !== 'done' && def.short) m.T(128, 136, wrap('NEXT: ' + def.short(q), 31), 13);
        if (S.flags.ending && id === 'king') m.T(128, 146, 'ENDING: ' + { give: 'THE HEARTH', keep: 'THE WINTER KING', sell: 'A COLD BARGAIN' }[S.flags.ending], 15);
      },
    },
    perksTab(m),
    loreTab(m),
    trophyTab(m),
    mapTab(m),
    systemTab(m),
  ];
}
