import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { TROPHIES, trophyCount } from '../systems/achievements.js';
import { wrap, fit } from '../art/font.js';
import { settings } from '../systems/settings.js';
import { panel } from '../ui/panel.js';
import { LAYOUT } from '../ui/menuLayout.js';
import { FACTIONS, FACTION_IDS, rep, repTier } from '../data/factions.js';

// Trophies tab: every milestone, greyed out until earned.
export function trophyTab(m) {
  const ROWS = 11;
  return {
    name: 'FEATS',
    help: 'W/S MOVE',
    input() { m.cursor = Math.min(m.cursor, TROPHIES.length - 1); m.nav(TROPHIES.length, ROWS); },
    render() {
      const g = m.bg;
      const T0 = LAYOUT.top, D = T0 - 22, ph = LAYOUT.bottom - T0;     // D: how far below the old top the pages start now
      panel(g, 6, T0, 116, ph, 2);
      panel(g, 126, T0, W - 132, ph, 2);
      TROPHIES.slice(m.scroll, m.scroll + ROWS).forEach((t, k) => {
        const i = m.scroll + k, y = T0 + 4 + k * 11, got = S.trophies?.[t.id];
        if (i === m.cursor) m.hi(8, y - 2, 112, 11);
        m.T(14, y, (got ? '✓ ' : '■ ') + fit(t.name, 16), got ? 13 : i === m.cursor ? 6 : settings.highContrast ? 5 : 4);
      });
      const t = TROPHIES[m.cursor], got = S.trophies?.[t.id];
      const tn = wrap(t.name, 29).split('\n').slice(0, 2);
      m.T(132, 27 + D, tn.join('\n'), got ? 13 : 6);
      m.T(132, 28 + D + tn.length * 9, wrap(t.desc, 29).split('\n').slice(0, 3).join('\n'), 5);
      m.T(132, 70 + D, got ? 'EARNED' : 'NOT YET', got ? 8 : 4);
      if (S.flags.regions?.ashen || S.flags.metYsolde || FACTION_IDS.some((f) => rep(f) > 0)) {
        m.T(132, 80 + D, 'STANDING', 13);
        FACTION_IDS.forEach((f, k) => {
          const y = 91 + D + k * 10, v = rep(f);
          m.T(132, y, fit(FACTIONS[f].short, 8), FACTIONS[f].col);
          m.T(184, y, fit(repTier(f).toUpperCase(), 10), 5);                     // the full standing name
          g.fillStyle(C[0]); g.fillRect(246, y, 62, 7); g.fillStyle(C[1]); g.fillRect(247, y + 1, 60, 5); g.fillStyle(C[FACTIONS[f].col]); g.fillRect(247, y + 1, Math.round(60 * v / 100), 5);
        });
      }
      m.T(132, 146 + D, `${trophyCount()} / ${TROPHIES.length}`, 15);
    },
  };
}
