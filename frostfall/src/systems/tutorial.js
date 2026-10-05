// First-minute tutorial taught by doing. Starts when the intro dialogue ends (S.flags.tut = 'move')
// and walks through: move -> roll -> a lone, weakened wolf (lock on, swing, roll its telegraph) -> done.
import { S } from './state.js';
import { bus } from './bus.js';

export const TUT_STEPS = ['move', 'roll', 'fight', 'done'];
const TEXT = {
  move: 'MOVE WITH WASD OR THE ARROW KEYS.\nGO ON, STRETCH YOUR LEGS.',
  roll: 'PRESS SPACE TO DODGE ROLL.\nYOU CANNOT BE HIT MID-ROLL.',
  fight: 'A WOLF! PRESS T TO LOCK ON,\nTAP J TO SWING (THREE TIMES MAKES A COMBO).',
  windup: 'IT IS WINDING UP TO LUNGE!\nROLL THROUGH IT WITH SPACE, THEN STRIKE BACK.',
};

export function startTutorial() { if (!S.flags.tutDone) S.flags.tut = 'move'; }
export const tutorialActive = () => !!S.flags.tut && S.flags.tut !== 'done';

const tut = { start: null, rolls0: 0, wolf: null, said: '', t: 0, windupShown: false };

function say(key) { tut.said = key; tut.t = 10; bus.emit('hint', TEXT[key]); }

export function updateTutorial(gs, dt) {
  const step = S.flags.tut;
  if (!step || step === 'done' || gs.mapId !== 'village') return;
  const pl = gs.player;
  if (!pl || pl.mode === 'dead' || pl.mode === 'lying') return;
  tut.t -= dt;
  if (tut.said !== step && !(step === 'fight' && tut.said === 'windup')) say(step);
  else if (tut.t <= 0) say(tut.said);       // keep the hint on screen until it is done
  if (step === 'move') {
    if (!tut.start) tut.start = { x: pl.x, y: pl.y };
    if (Math.hypot(pl.x - tut.start.x, pl.y - tut.start.y) > 28) { S.flags.tut = 'roll'; tut.rolls0 = pl.rollCount || 0; bus.emit('toast', 'GOOD', 8); }
  } else if (step === 'roll') {
    if ((pl.rollCount || 0) > tut.rolls0) { S.flags.tut = 'fight'; tut.wolf = null; tut.windupShown = false; bus.emit('toast', 'NICE ROLL', 8); }
  } else if (step === 'fight') {
    if (!tut.wolf || tut.wolf.dead || !tut.wolf.active) {
      if (tut.wolf && tut.wolf.dead) {
        S.flags.tut = 'done'; S.flags.tutDone = true; tut.wolf = null;
        bus.emit('toast', 'YOU ARE READY. SEE SIGRID AND BJORN', 13);
        bus.emit('hint', 'WELL FOUGHT.\nTALK TO BJORN AT THE LODGE. PRESS E.');
        return;
      }
      // spawn the lone wolf a short way off, weakened so the first fight is about learning
      const dx = pl.face.x || 1, dy = pl.face.y || 0;
      let wx = pl.x + dx * 120, wy = pl.y + dy * 120;
      if (gs.solidAt && gs.solidAt(wx, wy)) { wx = pl.x - dx * 120; wy = pl.y - dy * 120; }
      const w = gs.addEnemy('wolf', wx, wy);
      w.maxHp = Math.round(w.maxHp * 0.6); w.hp = w.maxHp; w.tutorial = true;
      w.alert(); tut.wolf = w;
    } else if (!tut.windupShown && tut.wolf.state === 'windup') {
      tut.windupShown = true; say('windup');
    }
  }
}
