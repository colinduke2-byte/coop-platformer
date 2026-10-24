// WQ21 (scene side, second half): the beacon relay on the Ashen Peaks, the verse-stones of the Old Kingdom, the lost
// lamp-carriers of the Underdeep, the Vale's trade chain and the Sunscorch theft. Data and givers in world/regionquests2.js.
import { registerListener, registerTicker } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { T, C } from '../config.js';
import { bus } from '../systems/bus.js';
import { sfx } from '../audio/sfx.js';
import { say, choose, runScript } from '../systems/dialogue.js';
import { SCRIPTS } from '../data/dialogue.js';
import { startQuest, finishQuest } from '../systems/quests.js';
import { addGold, addItem } from '../systems/inventory.js';
import { makeGenItem } from '../systems/genloot.js';
import { TUNE } from '../data/tuning.js';
import { Sign } from '../entities/Props.js';
import { RQ2_GIVER, GOODTURN_STEPS, beacons, legSecs, verseStones, VERSES, RIDDLE, lostLamps, sprigAt, ledgerAt } from '../world/regionquests2.js';

const Q = (id) => S.quests[id];
const ready = (id, who) => { Q(id).status = 'ready'; bus.emit('toast', `QUEST READY: ${who.toUpperCase()}`, 13); sfx.play('quest'); };
const W = (x) => (x + 0.5) * T;
const pay = () => { const R = TUNE.world.rquest; addGold(R.gold); addItem(makeGenItem(R.tier, Math.random, 2)); };

// ---- givers: the quest comes first (when it is on offer), then their usual talk
let wrapped = false;
registerListener('scene:game', () => {
  if (wrapped) return; wrapped = true;
  for (const [npc, g] of Object.entries(RQ2_GIVER)) {
    const orig = SCRIPTS[npc];
    SCRIPTS[npc] = async (...a) => {
      const q = Q(g.id);
      if (q.status === 'ready') {
        if (g.id === 'unfinishedverse') {                    // the riddle: the answer is asked for, not handed over
          await say(g.who, 'Well? What did the stones say I am?');
          if (await choose(RIDDLE.choices) !== RIDDLE.answer) { await say(g.who, 'No... no, that is not it. I would remember that. Read the stones again, slowly.'); return; }
        }
        pay(); finishQuest(g.id);
        await say(g.who, g.thanks); return;
      }
      if (q.status === 'inactive' && (!g.when || g.when())) {
        for (const l of g.offer) await say(g.who, l);
        if (await choose([g.yes, 'Not now.']) === 0) { startQuest(g.id); Object.assign(q, { lit: 0, verses: 0, saved: 0, lost: [], step: 1 }); }
        return;
      }
      return orig?.(...a);
    };
  }
  // the Vale trade chain: Ash and Orla take their turn in it, then go back to their own business
  for (const [npc, steps] of Object.entries(GOODTURN_STEPS)) {
    const orig = SCRIPTS[npc];
    SCRIPTS[npc] = async (...a) => {
      const q = Q('goodturn'), st = q.status === 'active' && steps[q.step || 1];
      if (!st) return orig?.(...a);
      const [who, lines, next] = st;
      if (next === 'ready') ready('goodturn', 'the Greenhollow Watch'); else { q.step = next; sfx.play('quest'); }
      for (const l of lines) await say(who, l);
    };
  }
}, 'worldQuestGivers2');

// ---- the Ashen Peaks: the beacons
function drawBeacon(sc, b, lit) {
  const x = W(b.x), y = W(b.y), g = sc.add.graphics().setDepth(y + 6);
  g.fillStyle(C[0]); g.fillRect(x - 6, y - 2, 12, 7);
  g.fillStyle(C[2]); g.fillRect(x - 5, y - 1, 10, 5); g.fillStyle(C[3]); g.fillRect(x - 4, y - 1, 8, 2);
  if (lit) { g.fillStyle(C[11]); g.fillRect(x - 3, y - 7, 6, 6); g.fillStyle(C[12]); g.fillRect(x - 2, y - 10, 4, 6); g.fillStyle(C[13]); g.fillRect(x - 1, y - 6, 2, 3); }
  else { g.fillStyle(C[1]); g.fillRect(x - 3, y - 4, 6, 3); }
  return g;
}
registerListener('scene:game', (sc) => {
  const q = Q('wallfires');
  if (sc.mapId !== 'ashen' || q.status !== 'active') return;
  if ((q.lit || 0) < 4) q.lit = 0;                  // a relay cut off by leaving the Peaks starts again from the first fire
  sc.rqBeacons = { pts: beacons(), g: beacons().map((b) => drawBeacon(sc, b, false)), left: 0, warned: 0 };
}, 'worldQuestBeacons');
function beaconTick(sc, dt, p) {
  const q = Q('wallfires'), B = sc.rqBeacons;
  if (!B || q.status !== 'active') return;
  const n = q.lit || 0, R = TUNE.world.rquest.relay;
  if (n > 0 && n < B.pts.length) {
    B.left -= dt;
    const s = Math.ceil(B.left);
    if (s <= 10 && B.warned !== 10 && s > 0) { B.warned = 10; bus.emit('toast', `THE BEACON IS BURNING LOW: ${s} S`, 11); }
    if (B.left <= 0) {
      q.lit = 0; B.warned = 0;
      B.g.forEach((g, i) => { g.destroy(); B.g[i] = drawBeacon(sc, B.pts[i], false); });
      bus.emit('toast', 'THE LAST BEACON DIED BEFORE THE NEXT WAS LIT. START AGAIN FROM THE FIRST', 11); sfx.play('nostamina');
      return;
    }
  }
  const b = B.pts[n];
  if (b && Math.hypot(W(b.x) - p.x, W(b.y) - p.y) < R.near) {
    q.lit = n + 1; B.g[n].destroy(); B.g[n] = drawBeacon(sc, b, true); sc.fx?.puff(W(b.x), W(b.y) - 6, 12, 10, -30, 0.6); sfx.play('quest');
    if (q.lit >= B.pts.length) { ready('wallfires', 'tell Corvin'); bus.emit('toast', 'THE FOURTH BEACON BURNS. THE WALL CAN SEE IT', 15); return; }
    B.left = legSecs(q.lit); B.warned = 0;
    bus.emit('toast', `BEACON ${q.lit} OF 4 LIT. LIGHT THE NEXT WITHIN ${B.left} S`, 13);
  }
}

// ---- the Old Kingdom: the verse-stones
registerListener('scene:game', (sc) => {
  const q = Q('unfinishedverse');
  if (sc.mapId !== 'kingdom' || q.status !== 'active') return;
  verseStones().forEach((p, i) => {
    const sg = new Sign(sc, W(p.x), W(p.y), VERSES[i]);
    const read = sg.interact.bind(sg);
    sg.interact = async (...a) => {
      const r = await read(...a);
      if ((q.verses || 0) === i && q.status === 'active') { q.verses = i + 1; sfx.play('quest'); if (q.verses >= 3) ready('unfinishedverse', 'answer the Scribe'); else bus.emit('toast', `A VERSE-STONE (${q.verses}/3)`, 13); }
      return r;
    };
    sg.rqVerse = i + 1; sg.label = () => ((q.verses || 0) === i ? 'E: READ THE VERSE' : 'E: READ');
    sc.interactables.push(sg);
  });
}, 'worldQuestVerses');

// ---- the Underdeep: the lost lamp-carriers and what sits with them
class LostLamp {
  constructor(sc, p, i, q) {
    this.scene = sc; this.i = i; this.q = q; this.ix = W(p.x); this.iy = W(p.y);
    this.img = sc.add.sprite(this.ix, this.iy, 'spr_prospector', 'down0').setDepth(this.iy + 6).setTint(0xb0a890);
    this.lamp = sc.add.graphics().setDepth(this.iy + 7); this.lamp.fillStyle(C[1]); this.lamp.fillRect(this.ix + 5, this.iy - 1, 3, 4);
    this.foes = [];
    const R = TUNE.world.rquest.rescue, kinds = ['caveweaver', 'lodeling', 'gloomcap'];
    for (let k = 0; k < R.foes; k++) {
      const a = (k / R.foes) * Math.PI * 2 + i, x = this.ix + Math.cos(a) * R.ring * T, y = this.iy + Math.sin(a) * R.ring * T;
      if (!sc.solidAt(x, y)) this.foes.push(sc.addEnemy(kinds[(k + i) % kinds.length], x, y, { tier: 2 }));
    }
  }
  canInteract() { return !this.done; }
  label() { return 'E: RELIGHT THE LAMP'; }
  interact() {
    runScript(async () => {
      if (this.foes.some((e) => e.active && !e.dead)) { await say('Lamp-carrier', 'Not yet! They are still out there. I can hear them breathing.'); return; }
      this.done = true;
      const q = this.q; q.lost = [...(q.lost || []), this.i]; q.saved = q.lost.length;
      this.lamp.clear(); this.lamp.fillStyle(C[13]); this.lamp.fillRect(this.ix + 5, this.iy - 1, 3, 4);
      sfx.play('quest');
      await say('Lamp-carrier', ['Light! Oh, light. I can see the line from here. I will walk it home.', 'I sat so still they thought I was a rock. I nearly believed it myself.', 'You came for us. Nobody comes for lamp-carriers. Thank you.'][this.i % 3]);
      this.scene.tweens.add({ targets: [this.img, this.lamp], alpha: 0, duration: 1200 });
      if (q.saved >= 3) ready('lampsdeep', 'tell the Lantern Guard'); else bus.emit('toast', `A LAMP-CARRIER WALKS HOME (${q.saved}/3)`, 13);
    });
  }
}
registerListener('scene:game', (sc) => {
  const q = Q('lampsdeep');
  if (sc.mapId !== 'underdeep' || q.status !== 'active') return;
  lostLamps().forEach((p, i) => { if (!(q.lost || []).includes(i)) sc.interactables.push(new LostLamp(sc, p, i, q)); });
}, 'worldQuestLamps');

// ---- the Vale: the meadowsweet sprig
registerListener('scene:game', (sc) => {
  const q = Q('goodturn'), p = sprigAt();
  if (sc.mapId !== 'vale' || q.status !== 'active' || (q.step || 1) > 3 || !p) return;
  const x = W(p.x), y = W(p.y), g = sc.add.graphics().setDepth(y + 6);
  g.fillStyle(C[8]); g.fillRect(x - 1, y - 6, 2, 8); g.fillStyle(C[6]); for (const [dx, dy] of [[-3, -8], [1, -9], [-1, -11], [2, -6]]) g.fillRect(x + dx, y + dy, 2, 2);
  sc.interactables.push({
    ix: x, iy: y,
    canInteract: () => q.status === 'active' && q.step === 3,
    label: () => 'E: PICK THE MEADOWSWEET',
    interact: () => { q.step = 4; g.destroy(); sfx.play('pickup'); bus.emit('toast', 'A SPRIG OF WILD MEADOWSWEET. BACK TO ORLA', 13); },
  });
}, 'worldQuestSprig');

// ---- the Sunscorch: the strongbox and its sentries
registerListener('scene:game', (sc) => {
  const q = Q('quietledger'), p = ledgerAt();
  if (sc.mapId !== 'sunscorch' || q.status !== 'active' || !p) return;
  const x = W(p.x), y = W(p.y), H = TUNE.world.rquest.heist, box = sc.add.image(x, y, 'chest').setDepth(y + 6).setTint(0xb08850);
  const sentries = [];
  for (let k = 0; k < H.sentries; k++) {
    const a = (k / H.sentries) * Math.PI * 2 + 0.4, ex = x + Math.cos(a) * H.ring * T, ey = y + Math.sin(a) * H.ring * T;
    if (sc.solidAt(ex, ey)) continue;
    const e = sc.addEnemy('duneraider', ex, ey, { tier: 2 }); e.cfg = { ...e.cfg, leash: H.leash }; e.home = { x: ex, y: ey }; sentries.push(e);
  }
  const heist = sc.rqHeist = { sentries, barred: false, box };
  sc.interactables.push({
    ix: x, iy: y,
    canInteract: () => q.status === 'active',
    label: () => (heist.barred ? 'E: THE BOX IS BARRED' : 'E: LIFT THE LEDGER'),
    interact: () => {
      if (heist.barred) { bus.emit('toast', 'BARRED AND CHAINED. LEAVE, AND TRY ANOTHER TIME', 11); sfx.play('nostamina'); return; }
      box.setAlpha(0.5); ready('quietledger', 'bring the ledger to Nadir'); bus.emit('toast', 'THE LEDGER IS YOURS. NOBODY SAW A THING', 15);
    },
  });
}, 'worldQuestHeist');
function heistTick(sc) {
  const h = sc.rqHeist;
  if (!h || h.barred || Q('quietledger').status !== 'active') return;
  if (h.sentries.some((e) => e.alerted && !e.dead)) { h.barred = true; h.box.setTint(0x806040); bus.emit('toast', 'SPOTTED! A SENTRY BARS THE STRONGBOX', 11); sfx.play('alert'); }
}

registerTicker('worldQuests2', (sc, dt) => {
  const p = sc.player; if (!p) return;
  if (sc.rqBeacons) beaconTick(sc, dt, p);
  if (sc.rqHeist) heistTick(sc);
}, 2365);
