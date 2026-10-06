import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { LORE, BEASTS } from '../data/lore.js';
import { wrap } from '../art/font.js';
import { ITEMS } from '../data/items.js';
import { panel } from './MenuScene.js';

// Lore tab: books you have read, then a bestiary that fills in as you meet and defeat creatures.
export function loreTab(m) {
  const entries = () => {
    const out = [];
    for (const [id, b] of Object.entries(LORE)) if (S.lore[id]) out.push({ k: 'book', id, title: b.title, text: b.text.join('\n\n') });
    for (const [id, b] of Object.entries(BEASTS)) {
      if (!S.seen[id] && !(S.kills[id] > 0)) continue;
      const kills = S.kills[id] || 0;
      const text = `${b.desc}\n\n${kills >= 3 ? 'WEAK TO: ' + b.weak : 'DEFEAT 3 TO LEARN ITS WEAKNESS.'}\n\nDEFEATED: ${kills}`;
      out.push({ k: 'beast', id, title: b.name, text });
    }
    for (const [id, it] of Object.entries(ITEMS)) {
      if (it.hidden) continue;
      if (!S.found?.[id] && !S.inv[id]) continue;
      out.push({ k: 'item', id, title: it.name, text: `${(it.type || '').toUpperCase()}${it.desc ? '\n\n' + it.desc : ''}${it.value ? '\n\nWORTH ' + it.value + ' GOLD' : ''}` });
    }
    return out;
  };
  const tally = () => {
    const l = entries();
    return `BEASTS ${l.filter((e) => e.k === 'beast').length}/${Object.keys(BEASTS).length}  ITEMS ${l.filter((e) => e.k === 'item').length}/${Object.values(ITEMS).filter((i) => !i.hidden).length}`;
  };
  const ROWS = 11;
  return {
    name: 'LORE',
    help: 'W/S MOVE  A/D TAB  ESC CLOSE',
    input() {
      const l = entries();
      m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
      m.nav(l.length, ROWS);
    },
    render() {
      const g = m.bg, l = entries();
      panel(g, 6, 22, 116, 134, 2);
      panel(g, 126, 22, W - 132, 134, 2);
      if (!l.length) { m.T(14, 30, 'NOTHING YET.', 4); m.T(14, 42, 'READ BOOKS AND', 4); m.T(14, 51, 'MEET CREATURES.', 4); return; }
      l.slice(m.scroll, m.scroll + ROWS).forEach((e, k) => {
        const i = m.scroll + k, y = 26 + k * 11;
        if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 112, 11); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 11); }
        m.T(14, y, (e.k === 'book' ? '' : e.k === 'item' ? '+ ' : '* ') + e.title.slice(0, 17), e.dim ? 3 : e.k === 'book' ? 6 : e.k === 'item' ? 8 : 15);
      });
      const e = l[m.cursor];
      m.T(132, 27, e.title, e.dim ? 4 : e.k === 'book' ? 13 : 15);
      m.T(132, 38, wrap(e.text, 29), 5);
      m.T(132, 146, tally(), 4);
    },
  };
}
