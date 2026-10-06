import { C, W } from '../config.js';
import { S } from '../systems/state.js';
import { TROPHIES, trophyCount } from '../systems/achievements.js';
import { wrap } from '../art/font.js';
import { panel } from './MenuScene.js';
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
        m.T(14, y, (got ? '* ' : '- ') + t.name.slice(0, 17), got ? 13 : 3);
      });
      const t = TROPHIES[m.cursor], got = S.trophies?.[t.id];
      m.T(132, 27, t.name, got ? 13 : 4);
      m.T(132, 38, wrap(t.desc, 29), got ? 5 : 4);
      m.T(132, 70, got ? 'EARNED' : 'LOCKED', got ? 8 : 3);
      if (S.flags.regions?.ashen || S.flags.metYsolde || FACTION_IDS.some((f) => rep(f) > 0)) {
        m.T(132, 92, 'EMBERHOLD STANDING', 13);
        FACTION_IDS.forEach((f, k) => {
          const y = 103 + k * 13, v = rep(f);
          m.T(132, y, FACTIONS[f].short, FACTIONS[f].col);
          g.fillStyle(C[0]); g.fillRect(212, y, 64, 7); g.fillStyle(C[1]); g.fillRect(213, y + 1, 62, 5); g.fillStyle(C[FACTIONS[f].col]); g.fillRect(213, y + 1, Math.round(62 * v / 100), 5);
          m.T(280, y, repTier(f).slice(0, 4), 5);
        });
      }
      m.T(132, 146, `${trophyCount()} / ${TROPHIES.length}`, 15);
    },
  };
}
