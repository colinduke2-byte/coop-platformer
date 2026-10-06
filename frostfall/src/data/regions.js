// The overworld regions. The Hollow Reach is the first; the others open as the story reaches them.
// Each region is one streamed map (see world/worldgen.js for its definition) with its own fog, campfires and waypoints.
import { S } from '../systems/state.js';

export const REGION_ORDER = ['reach', 'ashen'];
export const REGIONS = {
  reach: { id: 'reach', map: 'forest', name: 'The Hollow Reach', locked: () => false },
  ashen: { id: 'ashen', map: 'ashen', name: 'The Ashen Peaks', locked: () => !S.flags.regions?.ashen },
};
export const unlockRegion = (id) => { S.flags.regions = S.flags.regions || {}; S.flags.regions[id] = true; };
export const regionUnlocked = (id) => !!REGIONS[id] && !REGIONS[id].locked();
export const unlockedRegions = () => REGION_ORDER.filter(regionUnlocked);
// Which region a map belongs to (the village and the Reach's dungeons count as the Reach).
export function regionOfMap(mapId) {
  if (mapId === 'emberhold' || mapId === 'ashen' || mapId.startsWith('mines') || ['forge', 'forgehall', 'runehouse', 'courthall', 'guildhall', 'lantern', 'wardpost', 'emberhouse'].includes(mapId)) return 'ashen';
  for (const id of REGION_ORDER) if (REGIONS[id].map === mapId) return id;
  return 'reach';
}
