// Discovery: places on the overworld are unknown until you come close enough to see them. Finding one shows a banner, adds it to the map
// and the compass, pays a small reward and counts toward the Wanderer trophies. Hidden places (caches, hermits, ancient trees) have a short range:
// you only find them by looking.
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { modMul } from '../data/mods.js';
import { addGold } from '../systems/inventory.js';
import { noteDiscovered } from '../systems/notes.js';

export const HIDDEN = new Set(['cache', 'hermit', 'ancient']);
export const PLACE_NAME = {
  camp: 'BANDIT CAMP', den: 'WOLF DEN', ruin: 'OLD RUINS', tower: 'WATCHTOWER', grove: 'QUIET GROVE', hamlet: 'HAMLET', standing: 'STANDING STONES', barrow: 'BARROW', champion: 'BEAST LAIR', beardn: 'BEAR DEN',
  cave: 'CAVE', foundry: 'OLD FOUNDRY', wreck: 'SHIPWRECK', lighthouse: 'LIGHTHOUSE', courtyard: 'BROKEN COURTYARD', fort: 'IRONWATCH KEEP', temple: 'THE DROWNED CHAPEL', rootvault: 'THE ROOTVAULT', throne: 'THE WINTER THRONE',
  maw: 'THE GLACIAL MAW', nest: "SKALDRATH'S NEST", city: 'EMBERHOLD', forge: 'FORGE OF THE FIRST FIRE', peakroad: 'THE PEAK ROAD', coastroad: 'THE COAST ROAD', kingroad: "THE KINGS' ROAD", tidebreak: 'TIDEBREAK CAVERN',
  sepulchre: 'THE HOLLOW SEPULCHRE', fenroad: 'THE FEN ROAD', stormroad: 'THE STORMCROWN PASS', reedwick: 'REEDWICK', mirebarrow: 'THE SUNKEN BARROW', skarnhold: 'SKARN HOLD', stormspire: 'THE STORMSPIRE',
  glassroad: 'THE GLASSWOOD ROAD', lanternglade: 'LANTERN GLADE', hartspire: 'THE HART SPIRE', deepdoor: 'THE DEEP STAIR', lanternfall: 'LANTERNFALL', lodenest: 'THE LODE CHASM', saltgate: 'SALTMARKET', smugglercove: 'SEAWEED COVE',
  crystalgrove: 'CRYSTAL GROVE', glimmerpool: 'GLIMMERING POOL', antlerstone: 'ANTLER STONE', glowcapgrove: 'GLOWCAP GROVE', weavernest: 'WEAVER NEST', lodevein: 'RICH VEIN',
  peatfire: 'PEAT FIRE', hagshut: "HAG'S HUT", drownedshrine: 'DROWNED SHRINE', hearthcamp: 'CLAN HEARTH', giantcairn: "GIANT'S CAIRN", stormcircle: 'STORM CIRCLE', spring: 'HOT SPRING', rest: "TRAVELLERS' FIRE", cache: 'HIDDEN CACHE', hermit: "HERMIT'S HOLLOW", ancient: 'ANCIENT TREE',
};
// What a place looks like on the map: a colour index and whether it is hostile.
export const PLACE_COL = { camp: 11, den: 11, champion: 11, beardn: 11, ruin: 6, tower: 6, grove: 8, hamlet: 13, standing: 14, barrow: 14, cave: 6, foundry: 11, wreck: 6, lighthouse: 13, courtyard: 6, spring: 15, rest: 12, cache: 13, hermit: 8, ancient: 14 };
// Tall things you can see from a long way off: a place on this list is "sighted" (compass and map show a ? for it) from far away.
export const LANDMARKS = new Set(['tower', 'lighthouse', 'standing', 'giantcairn', 'stormspire', 'stormcircle', 'fort', 'city', 'skarnhold', 'reedwick', 'throne', 'maw', 'nest', 'hartspire', 'saltgate']);
export const SIGHT_RANGE = 42;
export const isSighted = (mapId, p) => !!S.sighted?.[mapId + ':' + p.id];
export const placeName = (p) => PLACE_NAME[p.kind] || p.kind.toUpperCase();
export const discoveredCount = () => Object.keys(S.discovered || {}).length;
const rangeOf = (p) => (HIDDEN.has(p.kind) ? 7 : p.kind === 'rest' || p.kind === 'spring' ? 12 : Math.max(15, (p.r || 8) + 4));

export const discoveryMethods = {
  discoverTick() {
    const pois = this.built.pois;
    if (!pois || !this.def.stream) return;
    S.discovered = S.discovered || {};
    const px = this.player.x / 16, py = this.player.y / 16;
    for (const p of pois) {
      const id = this.mapId + ':' + p.id;
      const d = Math.hypot(p.x - px, p.y - py);
      if (S.discovered[id]) continue;
      if (d > rangeOf(p)) {
        if (LANDMARKS.has(p.kind) && d < SIGHT_RANGE && !S.sighted?.[id]) {
          (S.sighted ||= {})[id] = 1;
          bus.emit('toast', 'SOMETHING TALL ON THE HORIZON... (' + placeName(p) + '?)', 15);
        }
        continue;
      }
      this.discover(p, id);
    }
  },
  discover(p, id = this.mapId + ':' + p.id, how = 'DISCOVERED') {
    S.discovered = S.discovered || {};
    if (S.discovered[id]) return false;
    S.discovered[id] = 1;
    const reward = HIDDEN.has(p.kind) ? 20 + 12 * (p.tier || 0) : 4 + 4 * (p.tier || 0);
    addGold(Math.round(reward * modMul('goldMul')));
    bus.emit('discover', { name: placeName(p), top: how, line: `+${Math.round(reward * modMul('goldMul'))} GOLD  ${discoveredCount()} PLACES FOUND` });
    sfx.play('quest');
    noteDiscovered(this.mapId, p);
    return true;
  },
};
