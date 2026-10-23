// CH19: camera fades and waits that always finish, in one place.
// Each promise settles once: on Phaser's event (fade complete, scene timer) or, if that never comes (a throttled tab, a
// paused scene clock), on a wall-clock fallback timer. If the scene shuts down first (a map change, quit to title) it
// rejects with Cancelled instead, so code after the await never touches a dead scene; inside runScript that rejection
// is swallowed and the script just stops. Outside a script, catch it:  fadeOut(sc, 300).then(go, () => {})
//   await fadeOut(sc, 600);                    // fade to the night colour, then go on
//   await fadeIn(sc, 900, [0, 0, 0], 1600);   // from black, fallback after 1.6 s of wall-clock time
//   await delay(sc, 500);                      // scene time (with a wall-clock fallback of ms + 400)
//   await sleep(sc, 700);                      // wall-clock time only
import { Cancelled } from './dialogue.js';

const NIGHT = [11, 14, 26];
const alive = (sc) => !!(sc?.sys && sc.cameras?.main && (sc.sys.isActive() || sc.sys.isPaused()));

function settle(sc, start, fallbackMs) {
  return new Promise((resolve, reject) => {
    if (!alive(sc)) { reject(new Cancelled()); return; }
    let done = false, timer = null;
    const finish = () => {
      if (done) return;
      done = true; clearTimeout(timer); sc.events.off('shutdown', down);
      if (alive(sc)) resolve(true); else reject(new Cancelled());
    };
    const down = () => { if (done) return; done = true; clearTimeout(timer); reject(new Cancelled()); };
    sc.events.once('shutdown', down);
    timer = setTimeout(finish, fallbackMs);
    start(finish);
  });
}

export const fadeOut = (sc, ms, [r, g, b] = NIGHT, fallbackMs = ms + 700) =>
  settle(sc, (done) => { const cam = sc.cameras.main; cam.once('camerafadeoutcomplete', done); cam.fadeOut(ms, r, g, b); }, fallbackMs);
export const fadeIn = (sc, ms, [r, g, b] = NIGHT, fallbackMs = ms + 700) =>
  settle(sc, (done) => { const cam = sc.cameras.main; cam.once('camerafadeincomplete', done); cam.fadeIn(ms, r, g, b); }, fallbackMs);
export const delay = (sc, ms, fallbackMs = ms + 400) => settle(sc, (done) => sc.time.delayedCall(ms, done), fallbackMs);
export const sleep = (sc, ms) => settle(sc, () => {}, ms);
