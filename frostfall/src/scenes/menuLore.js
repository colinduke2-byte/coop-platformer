import { C, W } from '../config.js';
import { TUNE } from '../data/tuning.js';
import { ENEMIES } from '../data/enemies.js';
import { dangerOf, dangerName, readyTierNow } from '../systems/danger.js';
import { progress, hpMul, dmgMul } from '../systems/enemyscale.js';
import { S } from '../systems/state.js';
import { LORE, BEASTS } from '../data/lore.js';
import { wrap, fit } from '../art/font.js';
import { ITEMS } from '../data/items.js';
import { panel } from '../ui/panel.js';
import { LAYOUT } from '../ui/menuLayout.js';
import { crushNote } from '../entities/enemyMoves.js';
import { diff } from '../systems/difficulty.js';
import { TIPS, tipText, tipGroup, GROUP_ORDER, TIP_TITLE, controlsCard } from '../systems/tips.js';

// the danger-colour legend (NP6), in the bestiary and the Field Guide
const DANGER_TEXT = 'NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU NOW: GREEN EASY, WHITE FAIR, YELLOW TOUGH, ORANGE DEADLY, RED HOPELESS.';

// Lore tab: books you have read, then a bestiary that fills in as you meet and defeat creatures.
// The controls card's hints packed into lines of the pane's width, so a key never parts from its action ("C" / "SNEAK")
const packHints = (card, n) => card.split('\n').map((l) => l.split(/\s{2,}/).reduce((out, seg) => {
  const last = out[out.length - 1];
  if (last != null && (last + '  ' + seg).length <= n) out[out.length - 1] = last + '  ' + seg; else out.push(seg);
  return out;
}, []).join('\n')).join('\n\n');

export function loreTab(m) {
  const entries = () => {
    const out = [];
    for (const [id, b] of Object.entries(LORE)) if (S.lore[id]) out.push({ k: 'book', id, title: b.title, text: b.text.join('\n\n') });
    for (const [id, b] of Object.entries(BEASTS)) {
      if (!S.seen[id] && !(S.kills[id] > 0)) continue;
      const kills = S.kills[id] || 0;
      const cfgE = ENEMIES[id], dg = cfgE && kills > 0 ? dangerName(dangerOf(cfgE.hp * diff().enemyHp * (cfgE.title ? 1 : TUNE.mobs.hp * hpMul(progress(readyTierNow()))), cfgE.dmg * (cfgE.title ? 1 : TUNE.mobs.dmg * dmgMul(progress(readyTierNow()))), cfgE.title ? 0 : progress(readyTierNow()))) : '';
      const crush = crushNote(id, cfgE);      // CB13
      const text = `${b.desc}${crush ? '\n\n' + crush : ''}\n\n${kills >= 3 ? 'WEAK TO: ' + b.weak : 'DEFEAT 3 TO LEARN ITS WEAKNESS.'}${dg ? '\n\nDANGER TO YOU NOW: ' + dg : ''}\n\nDEFEATED: ${kills}\n\n${DANGER_TEXT}`;
      out.push({ k: 'beast', id, title: b.name, text });
    }
    // the Field Guide (NP21): the controls, the danger colours and every tip you have seen, grouped, to read again
    out.push({ k: 'guide', id: 'controls', title: 'CONTROLS', group: 'BASICS', text: packHints(controlsCard(), Math.floor((W - 144) / 6)) });
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
  // three sub-pages: books and the items you have found, the bestiary, and the Field Guide. Unread entries carry a dot.
  const KINDS = [['book', 'item'], ['beast'], ['guide']];
  const sub = () => m.subIndex(m.tabs.findIndex((t) => t.name === 'LORE'));
  const shown = () => entries().filter((e) => KINDS[sub()].includes(e.k));
  const read = () => (S.flags.loreRead ||= {});
  const ROWS = 11;
  return {
    name: 'LORE',
    subs: ['LORE', 'BEASTS', 'GUIDE'],
    badge: () => entries().some((e) => e.k !== 'item' && !read()[e.k + ':' + e.id]),
    get help() { return `W/S MOVE${m.paneMore ? '  G MORE' : ''}`; },
    input() {
      const l = shown();
      m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
      m.nav(l.length, ROWS);
    },
    render() {
      const g = m.bg, l = shown(), T0 = LAYOUT.top, B = LAYOUT.bottom;
      panel(g, 6, T0, 116, B - T0, 2);
      panel(g, 126, T0, W - 132, B - T0, 2);
      m.cursor = Math.min(m.cursor, Math.max(0, l.length - 1));
      if (!l.length) { m.T(14, T0 + 6, 'NOTHING YET.', 4); m.T(14, T0 + 18, ['READ BOOKS AND', 'MEET CREATURES.', 'TIPS GATHER HERE.'][sub()], 4); return; }
      const KIND = { book: ['', 6], beast: ['', 15], item: ['', 8], guide: ['', 13] };
      l.slice(m.scroll, m.scroll + ROWS).forEach((e, k) => {
        const i = m.scroll + k, y = T0 + 4 + k * 11;
        if (i === m.cursor) m.hi(8, y - 2, 112, 11);
        const unread = e.k !== 'item' && !read()[e.k + ':' + e.id];
        if (unread) { g.fillStyle(C[13]); g.fillRect(11, y + 2, 2, 2); }
        m.T(14, y, fit(e.title, 17), e.dim ? 3 : KIND[e.k][1]);
      });
      if (l.length > ROWS) { const frac = m.scroll / (l.length - ROWS); g.fillStyle(C[3]); g.fillRect(119, T0 + 2, 2, 124); g.fillStyle(C[13]); g.fillRect(119, T0 + 2 + Math.round(frac * 112), 2, 12); }
      const e = l[m.cursor];
      read()[e.k + ':' + e.id] = true;
      const tl = wrap(e.title, 29).split('\n').slice(0, 2);
      const ty = T0 + 5;
      m.T(132, ty, tl.join('\n'), e.dim ? 4 : e.k === 'book' ? 13 : 15);
      m.T(132, ty + 1 + tl.length * 9, e.k === 'guide' ? 'FIELD GUIDE: ' + e.group : { book: 'BOOK', beast: 'BESTIARY', item: 'ITEM' }[e.k], 3);
      m.pane(132, ty + 13 + tl.length * 9, W - 144, B - 16 - (ty + 13 + tl.length * 9), e.text, 5);
      m.T(132, B - 12, tally(), 4);
    },
  };
}
