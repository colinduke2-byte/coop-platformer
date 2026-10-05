import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { keys } from '../systems/keys.js';
import { PERKS } from '../data/perks.js';
import { SKILL_DEFS, perkState, buyPerk, lvl } from '../systems/skills.js';
import { wrap, textW } from '../art/font.js';
import { sfx } from '../audio/sfx.js';
import { panel } from './MenuScene.js';

export function perksTab(m) {
  const ROWS = 11;
  return {
    name: 'PERKS',
    help: 'W/S MOVE  E BUY PERK  A/D TAB',
    input() {
      m.cursor = Math.min(m.cursor, PERKS.length - 1);
      m.nav(PERKS.length, ROWS);
      if (keys.pressed('interact')) {
        if (buyPerk(PERKS[m.cursor].id)) sfx.play('levelup'); else sfx.play('nostamina');
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
        const col = st === 'owned' ? 8 : st === 'available' ? 13 : st === 'nopoints' ? 5 : 3;
        m.T(14, y, p.name, col);
        const tag = SKILL_DEFS[p.skill].short + ' ' + p.lvl;
        m.T(170 - textW(tag), y, tag, st === 'owned' ? 8 : 4);
      });
      const p = PERKS[m.cursor], st = perkState(p.id);
      m.T(184, 27, p.name, 13);
      m.T(184, 37, wrap(p.desc, 20), 5);
      m.T(184, 62, 'NEEDS ' + SKILL_DEFS[p.skill].name.toUpperCase() + ' ' + p.lvl, lvl(p.skill) >= p.lvl ? 8 : 11);
      if (p.req) m.T(184, 71, 'AFTER ' + PERKS.find((q) => q.id === p.req).name.toUpperCase(), S.perks[p.req] ? 8 : 11);
      m.T(184, 90, st === 'owned' ? 'OWNED' : st === 'available' ? 'E: BUY' : st === 'nopoints' ? 'NO PERK POINTS' : 'LOCKED', st === 'available' ? 15 : st === 'owned' ? 8 : 4);
      m.T(184, 124, 'LEVEL ' + (S.charLevel || 1), 13);
      m.T(184, 133, 'PERK POINTS ' + (S.perkPoints || 0), (S.perkPoints || 0) > 0 ? 15 : 4);
      m.T(184, 142, 'SKILL-UPS ' + (S.skillUps || 0), 4);
    },
  };
}
