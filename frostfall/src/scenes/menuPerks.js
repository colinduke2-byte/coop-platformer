import { W } from '../config.js';
import { S } from '../systems/state.js';
import { keys } from '../systems/keys.js';
import { PERKS, perkById, forkMate } from '../data/perks.js';
import { SKILL_DEFS, perkState, buyPerk, lvl } from '../systems/skills.js';
import { wrap, textW, fit } from '../art/font.js';
import { settings } from '../systems/settings.js';
import { sfx } from '../audio/sfx.js';
import { panel } from '../ui/panel.js';
import { LAYOUT } from '../ui/menuLayout.js';
import { MAX_CHAR_LEVEL } from '../systems/damage.js';

export function perksTab(m) {
  const ROWS = 11;
  return {
    name: 'PERKS',
    badge: () => (S.perkPoints || 0) > 0,
    get help() { return 'W/S MOVE  E BUY'; },
    input() {
      m.cursor = Math.min(m.cursor, PERKS.length - 1);
      m.nav(PERKS.length, ROWS);
      if (keys.pressed('interact')) {
        if (buyPerk(PERKS[m.cursor].id)) sfx.play('levelup'); else sfx.play('deny');
        m.dirty = true;
      }
    },
    render() {
      const g = m.bg;
      const T0 = LAYOUT.top, D = T0 - 22, ph = LAYOUT.bottom - T0;     // D: how far below the old top the pages start now
      panel(g, 6, T0, 168, ph, 2);
      panel(g, 178, T0, W - 184, ph, 2);
      PERKS.slice(m.scroll, m.scroll + ROWS).forEach((p, k) => {
        const i = m.scroll + k, y = T0 + 4 + k * 11, st = perkState(p.id);
        if (i === m.cursor) m.hi(8, y - 2, 164, 11);
        // locked rows stay readable (a lock mark and mid-grey), and the selected row is always bright on its highlight
        const sel = i === m.cursor, hc = settings.highContrast;
        const col = st === 'owned' ? 8 : st === 'available' ? 13 : st === 'nopoints' ? 5 : st === 'taken' ? (sel ? 5 : 3) : sel ? 6 : hc ? 5 : 4;
        // a fork's two options sit together; the second is indented under the first (PR-18)
        const second = p.fork && PERKS.findIndex((q) => q.fork === p.fork) !== PERKS.indexOf(p);
        m.T(second ? 20 : 14, y, (st === 'locked' ? '■ ' : st === 'owned' ? '✓ ' : st === 'taken' ? '- ' : '') + fit((second ? 'OR ' : '') + p.name, second ? 18 : 19), col);
        const tag = SKILL_DEFS[p.skill].short + ' ' + p.lvl;
        m.T(170 - textW(tag), y, tag, st === 'owned' ? 8 : sel ? 6 : 4);
      });
      const p = PERKS[m.cursor], st = perkState(p.id);
      // details flow top-down: name, what it does, what it needs, whether you can take it
      const nm = wrap(p.name, 20).split('\n').slice(0, 2);
      m.T(184, 27 + D, nm.join('\n'), 13);
      let y = 27 + D + nm.length * 9 + 2;
      const dl = wrap(p.desc, 20).split('\n');
      m.T(184, y, dl.slice(0, 5).join('\n'), 5); y += Math.min(5, dl.length) * 9 + 3;
      const need = wrap('NEEDS ' + SKILL_DEFS[p.skill].name.toUpperCase() + ' ' + p.lvl, 20).split('\n');
      m.T(184, y, need.join('\n'), lvl(p.skill) >= p.lvl ? 8 : 11); y += need.length * 9;
      if (p.req) { const rq = [].concat(p.req), af = wrap('AFTER ' + rq.map((r) => perkById[r].name.toUpperCase()).join(' OR '), 20).split('\n'); m.T(184, y, af.slice(0, 2).join('\n'), rq.some((r) => S.perks[r]) ? 8 : 11); y += Math.min(2, af.length) * 9; }
      const mate = forkMate(p.id);
      m.T(184, Math.min(112 + D, y + 4), st === 'owned' ? 'OWNED' : st === 'available' ? 'E: BUY' : st === 'nopoints' ? 'NO PERK POINTS' : st === 'taken' ? 'YOU TOOK ' + fit(perkById[mate].name.toUpperCase(), 11) : mate ? 'LOCKED. ONE OF TWO' : 'LOCKED', st === 'available' ? 15 : st === 'owned' ? 8 : 4);
      m.T(184, 113 + D, 'SHRINES UNLEARN PERKS', 3);
      m.T(184, 124 + D, 'LEVEL ' + (S.charLevel || 1), 13);
      m.T(184, 133 + D, 'PERK POINTS ' + (S.perkPoints || 0), (S.perkPoints || 0) > 0 ? 15 : 4);
      // NP18: every third skill level-up is a character level (and a perk point); say how many are still to go
      const togo = 3 - ((S.skillUps || 0) % 3);
      m.T(184, 142 + D, (S.charLevel || 1) >= MAX_CHAR_LEVEL ? 'TOP LEVEL' : `NEXT: ${togo} SKILL LEVEL${togo > 1 ? 'S' : ''}`, 4);
    },
  };
}
