import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { QUESTS, trackedId } from '../data/quests.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { keys } from '../systems/keys.js';
import { wrap, fit } from '../art/font.js';
import { logLines } from '../systems/msglog.js';
import { panel } from '../ui/panel.js';
import { LAYOUT } from '../ui/menuLayout.js';
import { systemTab } from './menuSystem.js';
import { mapTab } from './menuMap.js';
import { perksTab } from './menuPerks.js';
import { loreTab } from './menuLore.js';
import { trophyTab } from './menuTrophies.js';

const STATUS = { active: 'ACTIVE', ready: 'READY', relic: 'ACTIVE', sell: 'ACTIVE', done: 'DONE' };

// Extra tabs registered into the menu. Each: { name, render, input, help }.
export function tabs(m) {
  // two sub-pages: the quests (open ones first, the finished ones after them) and the message log of this session
  const view = () => m.subIndex(m.tabs.findIndex((t) => t.name === 'QUESTS'));
  const rank = (id) => (S.quests[id].status === 'done' ? 2 : S.quests[id].status === 'ready' ? 0 : 1);
  const list = () => Object.keys(QUESTS).filter((id) => S.quests[id].status !== 'inactive')
    .sort((a, b) => rank(a) - rank(b) || (b === trackedId()) - (a === trackedId()));
  const ROWS = 5, L = LAYOUT;
  return [
    {
      name: 'QUESTS',
      subs: ['QUESTS', 'LOG'],
      badge: () => Object.values(S.quests).some((q) => q.status === 'ready'),
      get help() { return view() === 1 ? 'W/S SCROLL' : `W/S MOVE  E TRACK${m.paneMore ? '  G MORE' : ''}`; },
      input() {
        if (view() === 1) { const n = logLines().length; m.cursor = Math.min(m.cursor, Math.max(0, n - 1)); m.nav(n, 1); return; }
        const l = list();
        m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
        m.nav(l.length, ROWS);
        if (keys.pressed('interact') && l.length) {
          const id = l[m.cursor];
          if (['active', 'ready', 'relic'].includes(S.quests[id].status)) { S.tracked = id; sfx.play('select'); bus.emit('toast', 'TRACKING: ' + QUESTS[id].title.toUpperCase(), 15); m.dirty = true; }
        }
      },
      render() {
        const g = m.bg;
        if (view() === 1) {
          panel(g, 6, L.top, W - 12, L.bottom - L.top, 2);
          const lines = logLines().slice().reverse();
          if (!lines.length) { m.T(14, L.top + 6, 'NOTHING HAS HAPPENED YET THIS SESSION.', 4); return; }
          let y = L.top + 4;
          for (let i = m.cursor; i < lines.length && y < L.bottom - 9; i++) {
            const ln = lines[i], w = wrap(ln.text + (ln.n > 1 ? '  X' + ln.n : ''), 48).split('\n');
            for (const part of w) { if (y >= L.bottom - 9) break; m.T(14, y, part, ln.kind === 'talk' ? 6 : ln.kind === 'say' ? 13 : ln.col ?? 5); y += 9; }
            y += 2;
          }
          return;
        }
        const l = list();
        m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
        panel(g, 6, L.top, 112, L.bottom - L.top, 2);
        panel(g, 122, L.top, W - 128, L.bottom - L.top, 2);
        if (!l.length) {
          m.T(14, L.top + 6, 'NO QUESTS YET.', 4);
          m.T(14, L.top + 18, 'TALK TO THE', 4); m.T(14, L.top + 27, 'VILLAGERS.', 4);
          return;
        }
        const y0 = L.top + 5, firstDone = l.findIndex((id) => S.quests[id].status === 'done');
        l.slice(m.scroll, m.scroll + ROWS).forEach((id, k) => {
          const i = m.scroll + k, y = y0 + k * 24, q = S.quests[id];
          if (i === m.cursor) m.hi(8, y - 2, 108, 21);
          else if (i === firstDone && i > 0) { g.fillStyle(C[3]); g.fillRect(10, y - 3, 104, 1); }     // the finished ones start here
          m.T(14, y, fit(QUESTS[id].title, 16), q.status === 'done' ? 5 : 6);
          m.T(14, y + 9, STATUS[q.status] + (id === trackedId() ? '  TRACKED' : ''), q.status === 'done' ? 4 : q.status === 'ready' ? 13 : 15);
        });
        if (l.length > ROWS) {         // scrollbar
          const frac = m.scroll / (l.length - ROWS);
          g.fillStyle(C[3]); g.fillRect(115, L.top + 2, 2, 124); g.fillStyle(C[13]); g.fillRect(115, L.top + 2 + Math.round(frac * 112), 2, 12);
        }
        // details: everything flows top-down in one text pane (G pages through a long one)
        const id = l[m.cursor], def = QUESTS[id], q = S.quests[id];
        const title = wrap(def.title, 30).split('\n');
        m.T(128, L.top + 5, title.slice(0, 2).join('\n'), 13);
        const ty = L.top + 5 + Math.min(2, title.length) * 9;
        m.T(128, ty, fit('FROM ' + def.giver, 30), 4);
        const obj = def.objectives(q).map((o) => (o.done ? '✓ ' : '■ ') + o.t).join('\n');
        let body = def.desc + '\n\n' + obj;
        if (q.status !== 'done' && def.short) body += '\n\nNEXT: ' + def.short(q);
        if (S.flags.ending && id === 'king') body += '\n\nENDING: ' + { give: 'THE HEARTH', keep: 'THE WINTER KING', sell: 'A COLD BARGAIN' }[S.flags.ending];
        m.pane(128, ty + 11, W - 140, L.bottom - 4 - (ty + 11), body, 5);
      },
    },
    perksTab(m),
    loreTab(m),
    trophyTab(m),
    mapTab(m),
    systemTab(m),
  ];
}
