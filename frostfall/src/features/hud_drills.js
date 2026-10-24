// H: HUD and first hour (NP22). An optional "first steps" round with Bjorn: three short drills the tutorial never touches.
//   1. parry: a slow wolf swings at you; raise the shield just before it lands (Bjorn lends a wooden shield)
//   2. sneak: a sleeping wolf; creep up and strike it before it wakes
//   3. bow: a full draw, then loose
// Each pays a little (a potion, arrows). Bjorn asks once; "Skip" is always fine. State is S.flags.drill.
import { registerTicker } from '../scenes/gameHooks.js';
import { CORE_ORDER } from '../scenes/gameTickers.js';
import { SCRIPTS } from '../data/dialogue.js';
import { say, choose } from '../systems/dialogue.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import { prompt } from '../systems/access.js';
import { addItem, addArrows, equip } from '../systems/inventory.js';
import { sfx } from '../audio/sfx.js';

const TEXT = {
  parry: 'DRILL 1/3: HOLD {KeyF} TO BLOCK. RAISE IT JUST BEFORE\nTHE WOLF LANDS ITS BITE TO PARRY.',
  sneak: 'DRILL 2/3: HOLD {KeyC} TO SNEAK UP ON THE SLEEPING WOLF,\nTHEN STRIKE WITH {KeyJ} BEFORE IT WAKES.',
  bow: 'DRILL 3/3: HOLD {KeyK} UNTIL THE BOW IS FULLY DRAWN,\nTHEN LET GO.',
};
const fill = (t) => t.replace(/\{(\w+)\}/g, (_, c) => prompt(c));
const NEXT = { parry: 'sneak', sneak: 'bow', bow: 'done' };
const PAY = { parry: () => addItem('hp_potion', 1), sneak: () => addItem('hp_potion', 1), bow: () => addArrows(10) };
const drill = { foe: null, shown: '', wasRip: 0, full: false, arrows: 0 };

const orig = SCRIPTS.bjorn;
if (orig) {
  SCRIPTS.bjorn = async () => {
    if (S.flags.tutDone && !S.flags.drill && !S.quick && !S.daily) {
      await say('Bjorn', 'Before you walk into the trees: a few drills? Block, creep, and the bow. Three minutes, and you keep what I give you.');
      const c = await choose(['Show me.', 'Skip it.']);
      if (c === 0) {
        S.flags.drill = 'parry';
        if (!S.equip.offhand) { addItem('wooden_shield', 1, true); equip('wooden_shield'); }
        await say('Bjorn', 'Take this old shield. Now, my dog here thinks it is a wolf. Do not hurt him too much.');
        return;
      }
      S.flags.drill = 'skipped';
    }
    return orig();
  };
}

function finish(sc, step) {
  PAY[step](); sfx.play('quest');
  S.flags.drill = NEXT[step];
  drill.foe?.active && !drill.foe.dead && (drill.foe.hp = 0, drill.foe.dead = true, drill.foe.destroy());
  drill.foe = null; drill.shown = '';
  bus.emit('toast', S.flags.drill === 'done' ? 'DRILLS DONE. BJORN NODS.' : 'GOOD. NEXT DRILL', 8);
  if (S.flags.drill === 'done') bus.emit('hint', 'DRILLS DONE. THE GUIDE (LORE > GUIDE) KEEPS EVERY TIP.', true);
}

function spawn(sc, sleeping) {
  const pl = sc.player, dx = pl.face.x || 1, dy = pl.face.y || 0;
  let x = pl.x + dx * 90, y = pl.y + dy * 90;
  if (sc.solidAt?.(x, y)) { x = pl.x - dx * 90; y = pl.y - dy * 90; }
  const w = sc.addEnemy('wolf', x, y);
  w.maxHp = Math.round(w.maxHp * 0.6); w.hp = w.maxHp; w.tutorial = true; w.drill = true;
  if (!sleeping) w.alert(true);
  return w;
}

registerTicker('hudDrills', (sc) => {
  const step = S.flags.drill;
  if (!step || step === 'done' || step === 'skipped' || sc.mapId !== 'village' || S.quick) return;
  const pl = sc.player;
  if (!pl || pl.mode === 'dead' || pl.mode === 'lying' || sc.leaving) return;
  if (drill.shown !== step) { drill.shown = step; bus.emit('hint', fill(TEXT[step]), true); drill.full = false; drill.arrows = S.arrows; drill.wasRip = 0; }
  if (step === 'parry') {
    if (!drill.foe || drill.foe.dead || !drill.foe.active) drill.foe = spawn(sc, false);
    if (pl.riposteT > 0 && !(drill.wasRip > 0)) finish(sc, 'parry');
    drill.wasRip = pl.riposteT;
  } else if (step === 'sneak') {
    const w = drill.foe;
    if (!w || w.dead || !w.active) { drill.foe = spawn(sc, true); drill.hp = drill.foe.hp; return; }
    if (w.hp < drill.hp) {
      if (drill.unaware) finish(sc, 'sneak');
      else { bus.emit('toast', 'IT HEARD YOU. TRY AGAIN, SLOWER', 11); w.hp = 0; w.dead = true; w.destroy(); drill.foe = null; }
      return;
    }
    drill.unaware = !w.alerted;
  } else if (step === 'bow') {
    if (pl.drawing && pl.drawFull) drill.full = true;
    if (!pl.drawing && drill.full && S.arrows < drill.arrows) finish(sc, 'bow');
    else if (!pl.drawing) { drill.full = false; drill.arrows = S.arrows; }
  }
}, CORE_ORDER.enemies + 30);
