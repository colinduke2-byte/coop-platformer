import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { TROPHIES, trophyCount } from '../systems/achievements.js';
import { wrap, fit } from '../art/font.js';
import { settings } from '../systems/settings.js';
import { panel } from '../ui/panel.js';
import { FACTIONS, FACTION_IDS, rep, repTier } from '../data/factions.js';

// Trophies tab: every milestone, greyed out until earned.
export function trophyTab(m) {
  const ROWS = 11;
  return {
    name: 'FEATS',
    help: 'W/S MOVE  A/D TAB  ESC CLOSE',
    input() { m.cursor = Math.min(m.cursor, TROPHIES.length - 1); m.nav(TROPHIES.length, ROWS); },
    render() {
      const g = m.bg;
      panel(g, 6, 22, 116, 134, 2);
      panel(g, 126, 22, W - 132, 134, 2);
      TROPHIES.slice(m.scroll, m.scroll + ROWS).forEach((t, k) => {
        const i = m.scroll + k, y = 26 + k * 11, got = S.trophies?.[t.id];
        if (i === m.cursor) { g.fillStyle(C[3]); g.fillRect(8, y - 2, 112, 11); g.fillStyle(C[13]); g.fillRect(8, y - 2, 2, 11); }
        m.T(14, y, (got ? '✓ ' : '■ ') + fit(t.name, 16), got ? 13 : i === m.cursor ? 6 : settings.highContrast ? 5 : 4);
      });
      const t = TROPHIES[m.cursor], got = S.trophies?.[t.id];
      const tn = wrap(t.name, 29).split('\n').slice(0, 2);
      m.T(132, 27, tn.join('\n'), got ? 13 : 6);
      m.T(132, 28 + tn.length * 9, wrap(t.desc, 29).split('\n').slice(0, 3).join('\n'), 5);
      m.T(132, 70, got ? 'EARNED' : 'NOT YET', got ? 8 : 4);
      if (S.flags.regions?.ashen || S.flags.metYsolde || FACTION_IDS.some((f) => rep(f) > 0)) {
        m.T(132, 80, 'STANDING', 13);
        FACTION_IDS.forEach((f, k) => {
          const y = 91 + k * 10, v = rep(f);
          m.T(132, y, fit(FACTIONS[f].short, 8), FACTIONS[f].col);
          m.T(184, y, fit(repTier(f).toUpperCase(), 10), 5);                     // the full standing name
          g.fillStyle(C[0]); g.fillRect(246, y, 62, 7); g.fillStyle(C[1]); g.fillRect(247, y + 1, 60, 5); g.fillStyle(C[FACTIONS[f].col]); g.fillRect(247, y + 1, Math.round(60 * v / 100), 5);
        });
      }
      m.T(132, 146, `${trophyCount()} / ${TROPHIES.length}`, 15);
    },
  };
}
