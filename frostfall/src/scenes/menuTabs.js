import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { QUESTS, trackedId } from '../data/quests.js';
import { sfx } from '../audio/sfx.js';
import { bus } from '../systems/bus.js';
import { keys } from '../systems/keys.js';
import { wrap, textW, fit } from '../art/font.js';
import { logLines } from '../systems/msglog.js';
import { panel } from '../ui/panel.js';
import { systemTab } from './menuSystem.js';
import { mapTab } from './menuMap.js';
import { perksTab } from './menuPerks.js';
import { loreTab } from './menuLore.js';
import { trophyTab } from './menuTrophies.js';

const STATUS = { active: 'ACTIVE', ready: 'READY', relic: 'ACTIVE', sell: 'ACTIVE', done: 'DONE' };

// Extra tabs registered into the menu. Each: { name, render, input, help }.
export function tabs(m) {
  // Q switches what the left list shows: quests still open, quests finished, or the message log of this session
  const VIEWS = ['ACTIVE', 'DONE', 'LOG'];
  let view = 0;
  const list = () => Object.keys(QUESTS).filter((id) => S.quests[id].status !== 'inactive' && (view === 1) === (S.quests[id].status === 'done'))
    .sort((a, b) => (S.quests[b].status === 'ready') - (S.quests[a].status === 'ready') || (b === trackedId()) - (a === trackedId()));
  const ROWS = 5;
  return [
    {
      name: 'QUESTS',
      badge: () => Object.values(S.quests).some((q) => q.status === 'ready'),
      get help() { return view === 2 ? 'W/S SCROLL  Q VIEW  A/D TAB  ESC CLOSE' : `W/S MOVE  E TRACK  Q VIEW${m.paneMore ? '  G MORE' : ''}  ESC CLOSE`; },
      input() {
        if (keys.pressed('swap')) { view = (view + 1) % VIEWS.length; m.cursor = 0; m.scroll = 0; m.dirty = true; sfx.play('move'); return; }
        if (view === 2) { const n = logLines().length; m.cursor = Math.min(m.cursor, Math.max(0, n - 1)); m.nav(n, 1); return; }
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
        // view switch along the top of the list, like the pack's filters
        let vx = 12;
        VIEWS.forEach((v, i) => { if (i === view) { g.fillStyle(C[13]); g.fillRect(vx - 2, 25, textW(v) + 4, 9); } m.T(vx, 26, v, i === view ? 0 : 4); vx += textW(v) + 8; });
        if (view === 2) {
          panel(g, 6, 36, W - 12, 120, 2);
          const lines = logLines().slice().reverse();
          if (!lines.length) { m.T(14, 44, 'NOTHING HAS HAPPENED YET THIS SESSION.', 4); return; }
          let y = 40;
          for (let i = m.cursor; i < lines.length && y < 148; i++) {
            const ln = lines[i], w = wrap(ln.text + (ln.n > 1 ? '  X' + ln.n : ''), 48).split('\n');
            for (const part of w) { if (y >= 148) break; m.T(14, y, part, ln.kind === 'talk' ? 6 : ln.kind === 'say' ? 13 : ln.col ?? 5); y += 9; }
            y += 2;
          }
          return;
        }
        const l = list();
        panel(g, 6, 36, 112, 120, 2);
        panel(g, 122, 22, W - 128, 134, 2);
        if (!l.length) {
          m.T(14, 44, view === 1 ? 'NONE FINISHED' : 'NO QUESTS YET.', 4);
          if (view === 0) { m.T(14, 56, 'TALK TO THE', 4); m.T(14, 65, 'VILLAGERS.', 4); }
          return;
        }
        l.slice(m.scroll, m.scroll + ROWS).forEach((id, k) => {
          const i = m.scroll + k, y = 41 + k * 22, q = S.quests[id];
          if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 108, 21); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 21); }
          m.T(14, y, fit(QUESTS[id].title, 16), q.status === 'done' ? 5 : 6);
          m.T(14, y + 9, STATUS[q.status] + (id === trackedId() ? '  TRACKED' : ''), q.status === 'done' ? 4 : q.status === 'ready' ? 13 : 15);
        });
        if (l.length > ROWS) {         // scrollbar
          const frac = m.scroll / (l.length - ROWS);
          g.fillStyle(C[3]); g.fillRect(115, 38, 2, 116); g.fillStyle(C[13]); g.fillRect(115, 38 + Math.round(frac * 104), 2, 12);
        }
        // details: everything flows top-down in one text pane (G pages through a long one)
        const id = l[m.cursor], def = QUESTS[id], q = S.quests[id];
        const title = wrap(def.title, 30).split('\n');
        m.T(128, 27, title.slice(0, 2).join('\n'), 13);
        const y0 = 27 + Math.min(2, title.length) * 9;
        m.T(128, y0, fit('FROM ' + def.giver, 30), 4);
        const obj = def.objectives(q).map((o) => (o.done ? '✓ ' : '■ ') + o.t).join('\n');
        let body = def.desc + '\n\n' + obj;
        if (q.status !== 'done' && def.short) body += '\n\nNEXT: ' + def.short(q);
        if (S.flags.ending && id === 'king') body += '\n\nENDING: ' + { give: 'THE HEARTH', keep: 'THE WINTER KING', sell: 'A COLD BARGAIN' }[S.flags.ending];
        m.pane(128, y0 + 11, W - 140, 152 - (y0 + 11), body, 5);
      },
    },
    perksTab(m),
    loreTab(m),
    trophyTab(m),
    mapTab(m),
    systemTab(m),
  ];
}
