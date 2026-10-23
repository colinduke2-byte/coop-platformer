// First-minute tutorial taught by doing. Starts when the intro dialogue ends (S.flags.tut = 'move')
// and walks through: move -> roll -> a lone, weakened wolf (lock on, swing, roll its telegraph) -> done.
import { S } from './state.js';
import { bus } from './bus.js';
import { prompt } from './access.js';
import { padActive } from './keys.js';

const TEXT = {
  move: 'MOVE WITH {move}.\nGO ON, STRETCH YOUR LEGS.',
  roll: 'PRESS {Space} TO DODGE ROLL.\nYOU CANNOT BE HIT MID-ROLL.',
  fight: 'A WOLF! PRESS {KeyT} TO LOCK ON,\nTAP {KeyJ} TO SWING (THREE TIMES MAKES A COMBO).',
  windup: 'IT IS WINDING UP TO LUNGE!\nROLL THROUGH IT WITH {Space}, THEN STRIKE BACK.',
  ready: 'WELL FOUGHT.\nTALK TO BJORN AT THE LODGE. PRESS {KeyE}.',
};
// {Code} becomes the key or controller button the player is using right now
const fill = (t) => t.replace(/\{(\w+)\}/g, (_, c) => (c === 'move' ? (padActive() ? 'THE LEFT STICK' : 'WASD OR THE ARROW KEYS') : prompt(c)));

export function startTutorial() { if (!S.flags.tutDone) S.flags.tut = 'move'; }

const tut = { start: null, rolls0: 0, wolf: null, said: '', t: 0, windupShown: false };

// tutorial steps are urgent hints: they replace whatever tip is showing at once, so a lesson arrives when it is needed (NP1)
function say(key) { tut.said = key; tut.t = 10; bus.emit('hint', fill(TEXT[key]), true); }

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
        bus.emit('hint', fill(TEXT.ready), true);
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
