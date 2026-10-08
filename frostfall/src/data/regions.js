// The overworld regions. The Hollow Reach is the first; the others open as the story reaches them.
// Each region is one streamed map (see world/worldgen.js for its definition) with its own fog, campfires and waypoints.
import { S } from '../systems/state.js';

import { MAPS } from './maps.js';

export const REGION_ORDER = ['reach', 'ashen', 'coast', 'kingdom', 'fens', 'highlands'];
export const REGIONS = {
  reach: { id: 'reach', map: 'forest', name: 'The Hollow Reach', locked: () => false },
  ashen: { id: 'ashen', map: 'ashen', name: 'The Ashen Peaks', locked: () => !S.flags.regions?.ashen },
  coast: { id: 'coast', map: 'coast', name: 'The Frozen Coast', locked: () => !S.flags.regions?.coast },
  kingdom: { id: 'kingdom', map: 'kingdom', name: 'The Old Kingdom', locked: () => !S.flags.regions?.kingdom },
  fens: { id: 'fens', map: 'fens', name: 'The Weeping Fens', locked: () => false },
  highlands: { id: 'highlands', map: 'highlands', name: 'The Stormcrown Highlands', locked: () => false },
};
export const unlockRegion = (id) => { S.flags.regions = S.flags.regions || {}; S.flags.regions[id] = true; };
export const regionUnlocked = (id) => !!REGIONS[id] && !REGIONS[id].locked();
export const unlockedRegions = () => REGION_ORDER.filter(regionUnlocked);
// Which region a map belongs to (the village and the Reach's dungeons count as the Reach).
const ASHEN_MAPS = new Set(['emberhold', 'forge', 'forgehall', 'runehouse', 'courthall', 'guildhall', 'lantern', 'wardpost', 'emberhouse']);
export function regionOfMap(mapId) {
  const m = MAPS[mapId];
  if (m?.region) return m.region;
  if (ASHEN_MAPS.has(mapId) || mapId.startsWith('mines')) return 'ashen';
  for (const id of REGION_ORDER) if (REGIONS[id].map === mapId) return id;
  return 'reach';
}
