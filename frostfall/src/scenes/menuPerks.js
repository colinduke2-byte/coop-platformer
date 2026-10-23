import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { keys } from '../systems/keys.js';
import { PERKS } from '../data/perks.js';
import { SKILL_DEFS, perkState, buyPerk, lvl } from '../systems/skills.js';
import { wrap, textW, fit } from '../art/font.js';
import { settings } from '../systems/settings.js';
import { sfx } from '../audio/sfx.js';
import { panel } from './MenuScene.js';

export function perksTab(m) {
  const ROWS = 11;
  return {
    name: 'PERKS',
    badge: () => (S.perkPoints || 0) > 0,
    get help() { return `W/S MOVE  E BUY PERK${m.paneMore ? '  G MORE' : ''}  A/D TAB`; },
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
      panel(g, 6, 22, 168, 134, 2);
      panel(g, 178, 22, W - 184, 134, 2);
      PERKS.slice(m.scroll, m.scroll + ROWS).forEach((p, k) => {
        const i = m.scroll + k, y = 26 + k * 11, st = perkState(p.id);
        if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 164, 11); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 11); }
        // locked rows stay readable (a lock mark and mid-grey), and the selected row is always bright on its highlight
        const sel = i === m.cursor, hc = settings.highContrast;
        const col = st === 'owned' ? 8 : st === 'available' ? 13 : st === 'nopoints' ? 5 : sel ? 6 : hc ? 5 : 4;
        m.T(14, y, (st === 'locked' ? '■ ' : st === 'owned' ? '✓ ' : '') + fit(p.name, 19), col);
        const tag = SKILL_DEFS[p.skill].short + ' ' + p.lvl;
        m.T(170 - textW(tag), y, tag, st === 'owned' ? 8 : sel ? 6 : 4);
      });
      const p = PERKS[m.cursor], st = perkState(p.id);
      // details flow top-down: name, what it does, what it needs, whether you can take it
      const nm = wrap(p.name, 20).split('\n').slice(0, 2);
      m.T(184, 27, nm.join('\n'), 13);
      let y = 27 + nm.length * 9 + 2;
      const dl = wrap(p.desc, 20).split('\n');
      m.T(184, y, dl.slice(0, 5).join('\n'), 5); y += Math.min(5, dl.length) * 9 + 3;
      const need = wrap('NEEDS ' + SKILL_DEFS[p.skill].name.toUpperCase() + ' ' + p.lvl, 20).split('\n');
      m.T(184, y, need.join('\n'), lvl(p.skill) >= p.lvl ? 8 : 11); y += need.length * 9;
      if (p.req) { const af = wrap('AFTER ' + PERKS.find((q) => q.id === p.req).name.toUpperCase(), 20).split('\n'); m.T(184, y, af.join('\n'), S.perks[p.req] ? 8 : 11); y += af.length * 9; }
      m.T(184, Math.min(112, y + 4), st === 'owned' ? 'OWNED' : st === 'available' ? 'E: BUY' : st === 'nopoints' ? 'NO PERK POINTS' : 'LOCKED', st === 'available' ? 15 : st === 'owned' ? 8 : 4);
      m.T(184, 124, 'LEVEL ' + (S.charLevel || 1), 13);
      m.T(184, 133, 'PERK POINTS ' + (S.perkPoints || 0), (S.perkPoints || 0) > 0 ? 15 : 4);
      m.T(184, 142, 'SKILL-UPS ' + (S.skillUps || 0), 4);
    },
  };
}
