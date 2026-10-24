// WQ25: hub people who keep hours. At dusk (20:30) the smiths, traders, tailors and mapmakers of each hub walk over to the
// inn (you can still find them and trade there), children go home, and the watch walks a round between the gate and the
// fire; at dawn (5:30) everyone walks back. The bard at the inn tells a night rumour about a place you have not found yet.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { say } from '../systems/dialogue.js';
import { SCRIPTS } from '../data/dialogue.js';
import { getRegion } from '../data/maps.js';
import { REGIONS, regionOfMap } from '../data/regions.js';
import { hourOf, isNightHour } from '../world/lighting.js';
import { placeName, HIDDEN } from '../world/discovery.js';
import { TUNE } from '../data/tuning.js';

const HUBS = new Set(['reedwick', 'skarnhold', 'lanternglade', 'lanternfall', 'greenhollow', 'amberwell', 'saltmarket']);
const TO_INN = /_(smith|trader|tailor|map|herbalist|bard|fisher|hunter)$/, HOME = /_child$/, WATCH = /_(watch|scout|guard)$/;
export const roleOf = (id) => (HOME.test(id) ? 'home' : WATCH.test(id) ? 'watch' : TO_INN.test(id) ? 'inn' : null);

registerListener('scene:game', (sc) => {
  if (!HUBS.has(sc.mapId)) return;
  const inn = sc.npcs.find((n) => /_inn$/.test(n.id)), fire = sc.fires?.[0];
  let k = 0;
  for (const n of sc.npcs) {
    const role = roleOf(n.id); if (!role) continue;
    const day = { x: n.x, y: n.y };
    const night = role === 'inn' && inn ? { x: inn.x + ((k % 4) - 1.5) * 18, y: inn.y + 22 + Math.floor(k++ / 4) * 14 } : role === 'watch' && fire ? { x: fire.x, y: fire.y + 24 } : day;
    n.hours = { role, day, night, at: 'day' };
  }
  sc.hoursT = 0;
  hoursTick(sc, true);
}, 'worldHours');

function hoursTick(sc, instant) {
  const night = isNightHour(hourOf());
  for (const n of sc.npcs) {
    const h = n.hours; if (!h) continue;
    const want = night ? 'night' : 'day';
    if (h.role === 'watch' && night && h.at === 'night' && !n.walking && Math.random() < 0.25) { const to = h.leg ? h.night : h.day; h.leg = !h.leg; n.walkTo(to.x, to.y, 28); continue; }   // the round
    if (h.at === want) continue;
    h.at = want;
    if (h.role === 'home') { n.setAway(night); continue; }
    const to = h[want];
    if (instant) { n.setPosition(to.x, to.y); n.ix = to.x; n.iy = to.y; n.body.updateFromGameObject(); n.shadow.setPosition(to.x, to.y + 7); }
    else n.walkTo(to.x, to.y, 60);
  }
}
registerTicker('worldHours', (sc, dt) => {
  if (!HUBS.has(sc.mapId)) return;
  sc.hoursT = (sc.hoursT || 0) - dt; if (sc.hoursT > 0) return; sc.hoursT = TUNE.world.hours.every;
  hoursTick(sc, false);
}, 1850);

// the bards' night rumour: a place of this region you have not found yet
let wrapped = false;
registerListener('scene:game', () => {
  if (wrapped) return; wrapped = true;
  for (const id of Object.keys(SCRIPTS).filter((x) => /_bard$/.test(x))) {
    const orig = SCRIPTS[id];
    SCRIPTS[id] = async (...a) => {
      if (!isNightHour(hourOf())) return orig(...a);
      const rid = regionOfMap(S.map), map = REGIONS[rid]?.map, reg = map && getRegion(rid);
      const p = reg?.pois.find((q) => !HIDDEN.has(q.kind) && !S.discovered?.[map + ':' + q.id] && q.kind !== 'rest');
      if (!p) return orig(...a);
      const DIRS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'], st = { x: 6, y: 64 };
      const dir = DIRS[(Math.round(Math.atan2(p.y - st.y, p.x - st.x) / (Math.PI / 4)) + 8) % 8];
      await say('Bard', `A song for the night, then. It goes: there is ${placeName(p).toLowerCase().replace(/^(?!a |an |the )/, 'a ')} out to the ${dir}, and nobody from here has been to it. The rest of the song is about a goat.`);
      return orig(...a);
    };
  }
}, 'worldHoursBards');
