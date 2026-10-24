import { C, W } from '../config.js';
import { settings } from '../systems/settings.js';
import { TUNE } from '../data/tuning.js';
import { ENEMIES } from '../data/enemies.js';
import { dangerOf, dangerName, readyTierNow } from '../systems/danger.js';
import { progress, hpMul, dmgMul } from '../systems/enemyscale.js';
import { S } from '../systems/state.js';
import { LORE, BEASTS } from '../data/lore.js';
import { wrap, fit, textW } from '../art/font.js';
import { keys } from '../systems/keys.js';
import { sfx } from '../audio/sfx.js';
import { ITEMS } from '../data/items.js';
import { panel } from '../ui/panel.js';
import { TIPS, tipText, tipGroup, GROUP_ORDER, TIP_TITLE, controlsCard } from '../systems/tips.js';

// the danger-colour legend (NP6), in the bestiary and the Field Guide
const DANGER_TEXT = 'NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU NOW: GREEN EASY, WHITE FAIR, YELLOW TOUGH, ORANGE DEADLY, RED HOPELESS.';

// Lore tab: books you have read, then a bestiary that fills in as you meet and defeat creatures.
export function loreTab(m) {
  const entries = () => {
    const out = [];
    for (const [id, b] of Object.entries(LORE)) if (S.lore[id]) out.push({ k: 'book', id, title: b.title, text: b.text.join('\n\n') });
    for (const [id, b] of Object.entries(BEASTS)) {
      if (!S.seen[id] && !(S.kills[id] > 0)) continue;
      const kills = S.kills[id] || 0;
      const cfgE = ENEMIES[id], dg = cfgE && kills > 0 ? dangerName(dangerOf(cfgE.hp * TUNE.difficulty[settings.difficulty].enemyHp * (cfgE.title ? 1 : TUNE.mobs.hp * hpMul(progress(readyTierNow()))), cfgE.dmg * (cfgE.title ? 1 : TUNE.mobs.dmg * dmgMul(progress(readyTierNow()))))) : '';
      const text = `${b.desc}\n\n${kills >= 3 ? 'WEAK TO: ' + b.weak : 'DEFEAT 3 TO LEARN ITS WEAKNESS.'}${dg ? '\n\nDANGER TO YOU NOW: ' + dg : ''}\n\nDEFEATED: ${kills}\n\n${DANGER_TEXT}`;
      out.push({ k: 'beast', id, title: b.name, text });
    }
    // the Field Guide (NP21): the controls, the danger colours and every tip you have seen, grouped, to read again
    out.push({ k: 'guide', id: 'controls', title: 'CONTROLS', group: 'BASICS', text: controlsCard().replace(/\n/g, '\n\n') });
    out.push({ k: 'guide', id: 'danger', title: 'DANGER COLOURS', group: 'BASICS', text: DANGER_TEXT });
    const seen = Object.keys(TIPS).filter((id) => S.tips?.[id] && id !== 'danger');
    seen.sort((a, b) => GROUP_ORDER.indexOf(tipGroup(a)) - GROUP_ORDER.indexOf(tipGroup(b)));
    for (const id of seen) out.push({ k: 'guide', id, group: tipGroup(id), title: TIP_TITLE[id] || (ENEMIES[id]?.name || id).toUpperCase(), text: tipText(id).replace(/\n/g, ' ') });
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
  // Q filters the list: everything, books, beasts, or items found. Unread entries carry a dot until you look at them.
  const FILTERS = [['ALL', null], ['BOOK', 'book'], ['BEAST', 'beast'], ['ITEM', 'item'], ['GUIDE', 'guide']];
  let filter = 0;
  const shown = () => { const k = FILTERS[filter][1]; return k ? entries().filter((e) => e.k === k) : entries(); };
  const read = () => (S.flags.loreRead ||= {});
  const ROWS = 10;
  return {
    name: 'LORE',
    badge: () => entries().some((e) => e.k !== 'item' && !read()[e.k + ':' + e.id]),
    get help() { return `W/S MOVE  Q ${FILTERS[(filter + 1) % FILTERS.length][0]}${m.paneMore ? '  G MORE' : ''}  A/D TAB  ESC CLOSE`; },
    input() {
      if (keys.pressed('swap')) { filter = (filter + 1) % FILTERS.length; m.cursor = 0; m.scroll = 0; m.dirty = true; sfx.play('move'); return; }
      const l = shown();
      m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
      m.nav(l.length, ROWS);
    },
    render() {
      const g = m.bg, l = shown();
      panel(g, 6, 22, 116, 134, 2);
      panel(g, 126, 22, W - 132, 134, 2);
      let fx = 10;
      // the row fits four names: on the guide it names just that one (Q still cycles all five)
      (filter === 4 ? [['FIELD GUIDE', 4]] : FILTERS.slice(0, 4).map(([n], i) => [n, i])).forEach(([n, i]) => { if (i === filter) { g.fillStyle(C[13]); g.fillRect(fx - 1, 25, textW(n) + 2, 9); } m.T(fx, 26, n, i === filter ? 0 : 4); fx += textW(n) + 3; });
      if (!l.length) { m.T(14, 40, 'NOTHING YET.', 4); m.T(14, 52, 'READ BOOKS AND', 4); m.T(14, 61, 'MEET CREATURES.', 4); return; }
      const KIND = { book: ['', 6], beast: ['', 15], item: ['', 8], guide: ['', 13] };
      l.slice(m.scroll, m.scroll + ROWS).forEach((e, k) => {
        const i = m.scroll + k, y = 38 + k * 11;
        if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 112, 11); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 11); }
        const unread = e.k !== 'item' && !read()[e.k + ':' + e.id];
        if (unread) { g.fillStyle(C[13]); g.fillRect(11, y + 2, 2, 2); }
        m.T(14, y, fit(e.title, 17), e.dim ? 3 : KIND[e.k][1]);
      });
      if (l.length > ROWS) { const frac = m.scroll / (l.length - ROWS); g.fillStyle(C[3]); g.fillRect(119, 37, 2, 114); g.fillStyle(C[13]); g.fillRect(119, 37 + Math.round(frac * 102), 2, 12); }
      const e = l[m.cursor];
      read()[e.k + ':' + e.id] = true;
      const tl = wrap(e.title, 29).split('\n').slice(0, 2);
      m.T(132, 27, tl.join('\n'), e.dim ? 4 : e.k === 'book' ? 13 : 15);
      m.T(132, 28 + tl.length * 9, e.k === 'guide' ? 'FIELD GUIDE: ' + e.group : { book: 'BOOK', beast: 'BESTIARY', item: 'ITEM' }[e.k], 3);
      m.pane(132, 40 + tl.length * 9, W - 144, 140 - (40 + tl.length * 9), e.text, 5);
      m.T(132, 146, tally(), 4);
    },
  };
}
