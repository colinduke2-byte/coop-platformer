import { S } from '../systems/state.js';
import { ITEMS } from '../data/items.js';
import { bus } from '../systems/bus.js';
import { say, choose, runScript } from '../systems/dialogue.js';
import { saveGame } from '../systems/save.js';
import { sfx } from '../audio/sfx.js';
import Phaser from 'phaser';
import { addItem } from '../systems/inventory.js';
import { recalc } from '../systems/stats.js';
import { LORE } from '../data/lore.js';
import { tip } from '../systems/tips.js';
import { brewMenu, upgradeMenu, furnishMenu, cookMenu } from '../data/services.js';
import { C } from '../config.js';
import { BLESSINGS, offersFor, today, markGone } from '../systems/bless.js';
import { makeGenItem } from '../systems/genloot.js';
import { boardMenu } from '../data/contracts.js';
import { recalc as recalcStats } from '../systems/stats.js';
import { COOKABLE } from '../systems/food.js';

// A readable wooden sign.
export class Sign extends Phaser.GameObjects.Image {
  constructor(scene, x, y, lines) {
    super(scene, x, y, 'sign');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(8, 6).setOffset(4, 9);
    this.ix = x; this.iy = y;
    this.lines = lines;
    this.setDepth(y + 6);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 5).setScale(0.7);
  }
  canInteract() { return true; }
  label() { return 'E: READ'; }
  async interact() {
    await runScript(async () => { for (const l of this.lines) await say('SIGN', l); });
  }
}

// Sit by a campfire: restore everything and save.
export class RestSpot {
  constructor(scene, x, y) {
    this.scene = scene; this.ix = x; this.iy = y;
  }
  canInteract() {
    const sc = this.scene;
    return !sc.enemies.getChildren().some((e) => e.alerted && !e.dead);
  }
  label() { return 'E: REST'; }
  async interact() {
    const sc = this.scene, cam = sc.cameras.main;
    await runScript(async () => {
      if (COOKABLE().length) {
        const c = await choose(['Rest by the fire', 'Cook a meal', 'Cancel']);
        if (c === 1) { await cookMenu(); return; }
        if (c !== 0) return;
      }
      sfx.play('select');
      await new Promise((r) => { cam.once('camerafadeoutcomplete', r); cam.fadeOut(600, 11, 14, 26); });
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      sc.player.invuln = 0.5;
      await sc.delay(500);
      S.respawn = { map: sc.mapId, x: Math.round(sc.player.x), y: Math.round(sc.player.y) };
      saveGame(sc);
      bus.emit('toast', 'RESTED BY THE FIRE', 12);
      tip('rest');
      await new Promise((r) => { cam.once('camerafadeincomplete', r); cam.fadeIn(600, 11, 14, 26); });
      sfx.play('potion');
      sc.fx.puff(sc.player.x, sc.player.y, 12, 8, 30, 0.6, -20);
    });
  }
}

// Decorative solid prop (anvil, table...).
export class Prop extends Phaser.GameObjects.Image {
  constructor(scene, x, y, tex, body = [12, 8, 2, 7]) {
    super(scene, x, y, tex);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(body[0], body[1]).setOffset(body[2], body[3]);
    this.setDepth(y + 6);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 5).setScale(0.9);
  }
}

// A plant you can pick for alchemy.
export class Herb extends Phaser.GameObjects.Image {
  constructor(scene, x, y, item) {
    super(scene, x, y, item === 'snowberry' ? 'herb_berry' : 'herb_lily');
    scene.add.existing(this);
    this.item = item; this.ix = x; this.iy = y;
    this.setDepth(y + 4);
    this.gone = false;
  }
  canInteract() { return !this.gone; }
  label() { return 'E: GATHER'; }
  interact() {
    this.gone = true;
    addItem(this.item);
    sfx.play('pickup');
    this.scene.fx.puff(this.x, this.y, this.item === 'snowberry' ? 11 : 15, 6, 30, 0.4);
    this.scene.interactables = this.scene.interactables.filter((i) => i !== this);
    this.destroy();
  }
}

// Enter a building / go through a door by pressing E.
export class Door {
  constructor(scene, x, y, e) { this.scene = scene; this.ix = x; this.iy = y; this.e = e; }
  get forSale() { return !!this.e.price && !S.flags[this.e.flag]; }
  canInteract() { return true; }
  label() { return this.forSale ? `E: COTTAGE FOR SALE ${this.e.price}G` : (this.e.label || 'E: ENTER'); }
  async interact() {
    if (!this.forSale) { this.scene.changeMap(this.e.to, this.e.spawn, 'door'); return; }
    await runScript(async () => {
      await say('Notice', 'FOR SALE: SNOWDRIFT COTTAGE. A bed, a hearth, room to furnish. Yours for ' + this.e.price + ' gold.');
      const c = await choose([`Buy it (${this.e.price}G)`, 'Not now']);
      if (c !== 0) return;
      if (S.gold < this.e.price) { sfx.play('nostamina'); await say('Notice', 'You cannot afford it yet.'); return; }
      S.gold -= this.e.price; S.flags[this.e.flag] = true;
      sfx.play('levelup'); bus.emit('toast', 'YOU OWN SNOWDRIFT COTTAGE', 13);
    });
  }
}

// Cottage ledger: buy furnishings. Each purchase appears in the room (and some give you a station at home).
export class Furnisher extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'book');
    scene.add.existing(this); scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 7);
    this.ix = x; this.iy = y; this.setDepth(y + 6);
  }
  canInteract() { return true; }
  label() { return 'E: FURNISH'; }
  async interact() {
    await runScript(async () => {
      await furnishMenu(this.scene);
    });
  }
}

// Furniture that does something: the anvil at home.
export class HomeAnvil {
  constructor(scene, x, y) { this.scene = scene; this.ix = x; this.iy = y; }
  canInteract() { return true; }
  label() { return 'E: FORGE'; }
  async interact() {
    await runScript(async () => {
      for (;;) {
        const c = await choose(['Upgrade weapon', 'Upgrade armor', 'Done']);
        if (c === 0) await upgradeMenu('Anvil', 'weapon'); else if (c === 1) await upgradeMenu('Anvil', 'armor'); else return;
      }
    });
  }
}

// A readable book / bookshelf. Learning it adds an entry to the Lore tab.
export class Lore extends Phaser.GameObjects.Image {
  constructor(scene, x, y, e) {
    super(scene, x, y, e.tex || 'book');
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 7);
    this.ix = x; this.iy = y; this.id = e.id;
    this.setDepth(y + 6);
  }
  canInteract() { return true; }
  label() { return S.lore[this.id] ? 'E: REREAD' : 'E: READ'; }
  async interact() {
    const b = LORE[this.id];
    const first = !S.lore[this.id];
    S.lore[this.id] = true;
    if (first) { bus.emit('toast', 'NEW LORE: ' + b.title.toUpperCase(), 15); sfx.play('quest'); }
    await runScript(async () => { for (const l of b.text) await say(b.title, l); });
  }
}

// Sleep in a bed: heals, saves, sets your respawn point and skips to morning.
export class Bed {
  constructor(scene, x, y) { this.scene = scene; this.ix = x; this.iy = y; }
  canInteract() { return !this.scene.enemies.getChildren().some((e) => e.alerted && !e.dead); }
  label() { return 'E: SLEEP'; }
  async interact() {
    const sc = this.scene, cam = sc.cameras.main;
    await runScript(async () => {
      const c = await choose(['Sleep until morning', 'Cancel']);
      if (c !== 0) return;
      await new Promise((r) => { cam.once('camerafadeoutcomplete', r); cam.fadeOut(900, 0, 0, 0); });
      S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp;
      S.time = (S.time >= 7 * 60 ? S.time + (1440 - S.time) : 0) + 7 * 60; S.time %= 1440;
      S.respawn = { map: sc.mapId, x: Math.round(sc.player.x), y: Math.round(sc.player.y) };
      saveGame(sc);
      await sc.delay(700);
      bus.emit('toast', 'YOU SLEPT WELL. GAME SAVED', 13);
      if (sc.mapId === 'cottage') { S.flags.restedUntil = S.playtime + 600; recalc(); bus.emit('toast', 'WELL RESTED: +25 MAX HEALTH FOR 10 MIN', 8); }
      await new Promise((r) => { cam.once('camerafadeincomplete', r); cam.fadeIn(900, 0, 0, 0); });
    });
  }
}

// An alchemy station (the cauldron in the lodge).
export class Cauldron {
  constructor(scene, x, y) { this.scene = scene; this.ix = x; this.iy = y; }
  canInteract() { return true; }
  label() { return 'E: BREW'; }
  async interact() {
    await runScript(async () => {
      if (!S.flags.alchemy) { await say('Cauldron', 'You do not know how to brew yet. Mirra teaches alchemy to anyone who brings her herbs.'); return; }
      await brewMenu('Cauldron');
    });
  }
}

// Rune pressure plate: step on the plates in the right order to open the vault.
export const PLATE_COL = { moon: 0x5cc8d8, crown: 0xf4d460, wolf: 0xc8383c };
export class Plate extends Phaser.GameObjects.Image {
  constructor(scene, x, y, rune) {
    super(scene, x, y, 'plate');
    scene.add.existing(this);
    this.rune = rune; this.lit = false; this.down = false;
    this.setTint(PLATE_COL[rune]).setDepth(2);
  }
  light(on) { this.lit = on; this.setTexture(on ? 'plate_on' : 'plate').setTint(PLATE_COL[this.rune]); }
  update(player) {
    const c = player.body.center, near = Math.abs(c.x - this.x) < 7 && Math.abs(c.y + 3 - this.y) < 8 && player.mode !== 'roll';
    if (near && !this.down) { this.down = true; this.scene.plateStep(this); }
    else if (!near) this.down = false;
  }
}

// A rune shrine: pray for a blessing or take a pact. Offers change daily; each shrine answers once a day.
export class Shrine extends Phaser.GameObjects.Image {
  constructor(scene, x, y, id) {
    super(scene, x, y, 'shrine');
    scene.add.existing(this); scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 16);
    this.id = id; this.ix = x; this.iy = y; this.setDepth(y + 10);
    scene.add.image(x, y + 11, 'shadow').setDepth(y + 5);
  }
  canInteract() { return true; }
  label() { return S.shrines?.[this.id] === today() ? 'SHRINE: SILENT TODAY' : 'E: PRAY AT SHRINE'; }
  async interact() {
    if (S.shrines?.[this.id] === today()) { bus.emit('toast', 'THE SHRINE IS QUIET. COME BACK TOMORROW', 4); return; }
    await runScript(async () => {
      const offers = offersFor(this.id, today());
      const cur = S.blessing ? BLESSINGS[S.blessing].name : 'nothing';
      await say('Shrine', `The stone hums. You carry: ${cur}. Three voices offer a gift.`);
      const labels = offers.map((o) => `${BLESSINGS[o].kind === 'pact' ? 'PACT' : 'BLESSING'}: ${BLESSINGS[o].name} - ${BLESSINGS[o].desc}`);
      const c = await choose([...labels, 'Walk away']);
      if (c >= offers.length) return;
      S.blessing = offers[c];
      S.shrines = S.shrines || {}; S.shrines[this.id] = today();
      recalcStats();
      sfx.play('levelup'); this.scene.fx.ring(this.x, this.y + 8, 1.4, 0.7, 'ring', 0x5cc8d8);
      bus.emit('toast', `${BLESSINGS[S.blessing].name.toUpperCase()} GRANTED`, 15);
    });
  }
}

// Ore node: mine for iron or bone dust. Regrows the next day.
export class OreNode extends Phaser.GameObjects.Image {
  constructor(scene, x, y, ore, key) {
    super(scene, x, y, 'node');
    scene.add.existing(this); scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 7);
    this.ore = ore; this.key = key; this.ix = x; this.iy = y; this.setDepth(y + 6);
  }
  canInteract() { return true; }
  label() { return 'E: MINE'; }
  interact() {
    const sc = this.scene;
    addItem(this.ore, 1 + (Math.random() < 0.35 ? 1 : 0));
    if (Math.random() < 0.12) addItem('mp_potion');
    sfx.play('smash'); sc.fx.puff(this.x, this.y, 5, 8, 40, 0.4);
    markGone(this.key, false);
    sc.interactables = sc.interactables.filter((i) => i !== this);
    this.body.enable = false; this.destroy();
  }
}

// Buried treasure. Dig it up; sometimes something digs back.
export class DigSpot extends Phaser.GameObjects.Image {
  constructor(scene, x, y, key, tier) {
    super(scene, x, y, 'mound');
    scene.add.existing(this);
    this.key = key; this.tier = tier; this.ix = x; this.iy = y; this.setDepth(y + 3);
  }
  canInteract() { return true; }
  label() { return 'E: DIG'; }
  interact() {
    const sc = this.scene, r = Math.random();
    markGone(this.key, true);
    sc.fx.puff(this.x, this.y, 10, 10, 45, 0.5); sfx.play('smash');
    sc.interactables = sc.interactables.filter((i) => i !== this);
    const gold = 20 + Math.round(Math.random() * 30) + this.tier * 25;
    if (r < 0.25) {
      bus.emit('toast', 'SOMETHING STIRS BELOW!', 11);
      for (let i = 0; i < 2 + (this.tier > 1 ? 1 : 0); i++) { const e = sc.addEnemy('draugr', this.x + (i - 1) * 14, this.y + 10, { tier: this.tier }); e.alert(true); }
      sc.pickups.push(new (sc.PickupClass)(sc, this.x, this.y, { type: 'gold', n: gold }));
    } else if (r < 0.5) {
      addItem(makeGenItem(this.tier)); bus.emit('toast', 'A BURIED CACHE!', 13);
      sc.pickups.push(new (sc.PickupClass)(sc, this.x, this.y, { type: 'gold', n: gold }));
    } else {
      bus.emit('toast', 'DUG UP SOME COIN', 13);
      sc.pickups.push(new (sc.PickupClass)(sc, this.x, this.y, { type: 'gold', n: gold * 2 }));
      if (Math.random() < 0.5) addItem('lockpick', 2);
      if (Math.random() < 0.12) { addItem('treasure_map'); bus.emit('toast', 'YOU FOUND A TREASURE MAP!', 13); }
    }
    this.destroy();
  }
}

// The buried chest a treasure map points to.
export class TreasureSpot extends DigSpot {
  constructor(scene, x, y, key, tier) { super(scene, x, y, key, tier); this.setTint(0xf4d460); }
  label() { return 'E: DIG (TREASURE!)'; }
  interact() {
    const sc = this.scene;
    markGone(this.key, true);
    sc.fx.puff(this.x, this.y, 14, 10, 55, 0.6); sfx.play('smash');
    sc.interactables = sc.interactables.filter((i) => i !== this);
    S.run.chests++; S.fish ||= {}; S.fish.maps = (S.fish.maps || 0) + 1;
    if (S.flags.treasure) S.flags.treasure.done = true;
    if (S.flags.waypoint && S.flags.waypoint.x === S.flags.treasure?.x) delete S.flags.waypoint;
    addItem(makeGenItem(this.tier + 1, Math.random, 1)); addItem(makeGenItem(this.tier + 1));
    sc.pickups.push(new (sc.PickupClass)(sc, this.x, this.y, { type: 'gold', n: 160 + this.tier * 90 }));
    bus.emit('toast', 'THE TREASURE IS YOURS!', 13);
    sfx.play('quest');
    this.destroy();
  }
}

// A hole in the ice: press E to cast, press E again the moment it bites.
export class FishHole extends Phaser.GameObjects.Image {
  constructor(scene, x, y, tier) {
    super(scene, x, y, 'icehole');
    scene.add.existing(this);
    this.ix = x; this.iy = y; this.tier = tier; this.setDepth(y - 2);
    this.st = 'idle'; this.t = 0;
  }
  canInteract() { return true; }
  label() { return this.st === 'bite' ? 'E: REEL IN!' : this.st === 'wait' ? 'E: WAITING...' : 'E: FISH'; }
  interact() {
    const sc = this.scene;
    if (this.st === 'idle') { this.st = 'wait'; this.t = 1.6 + Math.random() * 3.4; bus.emit('toast', 'YOU CAST YOUR LINE...', 15); sfx.play('select'); }
    else if (this.st === 'wait') { this.st = 'idle'; bus.emit('toast', 'TOO EARLY! THE FISH SPOOKED', 4); sfx.play('nostamina'); }
    else this.reel(sc);
  }
  reel(sc) {
    this.st = 'idle';
    const r = Math.random(), S_ = (S.fish ||= {});
    let id = 'raw_trout';
    if (r > 0.9 && this.tier >= 1) id = 'raw_eel'; else if (r > 0.72) id = 'raw_pike';
    S_.caught = (S_.caught || 0) + 1; if (id !== 'raw_trout') S_.rare = (S_.rare || 0) + 1;
    if (Math.random() < 0.05) { addItem('treasure_map'); bus.emit('toast', 'A SOGGY TREASURE MAP!', 13); }
    addItem(id);
    sc.fx.puff(this.x, this.y, 15, 8, 40, 0.5); sfx.play('potion');
    bus.emit('toast', 'CAUGHT: ' + ITEMS[id].name.toUpperCase(), id === 'raw_trout' ? 15 : 13);
  }
  tick(dt, sc) {
    if (this.st === 'wait') {
      this.t -= dt;
      if (this.t <= 0) { this.st = 'bite'; this.t = 0.9; bus.emit('toast', '! BITE !', 13); sfx.play('hit'); sc.fx.puff(this.x, this.y, 15, 6, 24, 0.4); }
    } else if (this.st === 'bite') {
      this.t -= dt;
      if (this.t <= 0) { this.st = 'idle'; bus.emit('toast', 'IT GOT AWAY...', 4); }
    }
    if (this.st !== 'idle' && Math.hypot(sc.player.x - this.x, sc.player.y - this.y) > 40) this.st = 'idle';
  }
}

// A starving frost hound by the road. Feed it venison and it is yours.
export class WoundedHound extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_wolf', 'side0');
    scene.add.existing(this);
    this.ix = x; this.iy = y; this.setTint(0xcfe8ff).setScale(0.85).setAngle(-8).setDepth(y + 6);
    this.sh = scene.add.image(x, y + 6, 'shadow').setDepth(y + 5);
  }
  canInteract() { return !S.flags.houndOwned; }
  label() { return 'E: THE HOUND'; }
  async interact() {
    const sc = this.scene;
    await runScript(async () => {
      await say('Hound', 'A frost hound lies by the road, ribs showing. It lifts its head and watches your pack.');
      if (!S.inv.venison && !S.inv.grilled_trout && !S.inv.hunters_stew) { await say('Hound', 'It is too weak to follow. Bring it something to eat: venison, or a cooked meal.'); return; }
      const c = await choose(['Share your food', 'Leave it']);
      if (c !== 0) return;
      const food = S.inv.venison ? 'venison' : S.inv.hunters_stew ? 'hunters_stew' : 'grilled_trout';
      S.inv[food]--; if (S.inv[food] <= 0) delete S.inv[food];
      S.flags.houndOwned = true;
      await say('Hound', 'It wolfs the meal down, then presses its cold nose into your palm. It rises to follow.');
      bus.emit('toast', 'A FROST HOUND JOINS YOU!', 15);
      sfx.play('quest');
      sc.spawnHound();
      this.sh.destroy(); sc.interactables = sc.interactables.filter((i) => i !== this); this.destroy();
    });
  }
}

// The Arena Master: starts the wave challenge and pays out.
export class ArenaMaster extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'spr_trader', 'down0');
    scene.add.existing(this); scene.physics.add.existing(this, true);
    this.body.setSize(10, 8).setOffset(3, 7);
    this.ix = x; this.iy = y; this.setDepth(y + 8).setTint(0xffd0a0);
    scene.add.image(x, y + 7, 'shadow').setDepth(y + 6);
  }
  canInteract() { return true; }
  label() { return this.scene.arena?.active ? 'E: ARENA MASTER' : 'E: ENTER THE ARENA'; }
  async interact() {
    const sc = this.scene;
    await runScript(async () => {
      const best = S.arena?.best || 0;
      if (sc.arena?.active) {
        const c = await choose(['Keep fighting', 'Yield and collect']);
        if (c === 1) { sc.endArena(true); await say('Arena Master', `A fine showing: ${sc.arena.cleared || 0} waves cleared.`); }
        return;
      }
      await say('Arena Master', best ? `Your best is ${best} waves. Think you can beat it?` : 'Waves of the Hollow\'s worst, one after another. Every wave pays. Every fifth wave brings a champion.');
      const c = await choose(['Begin the trial', 'Not today']);
      if (c === 0) sc.startArena();
    });
  }
}

// The bounty board in the village plaza.
export class BountyBoard extends Phaser.GameObjects.Image {
  constructor(scene, x, y) {
    super(scene, x, y, 'sign');
    scene.add.existing(this); scene.physics.add.existing(this, true);
    this.body.setSize(12, 8).setOffset(2, 7);
    this.ix = x; this.iy = y; this.setDepth(y + 6).setTint(0xf4d460);
  }
  canInteract() { return true; }
  label() { return 'E: BOUNTY BOARD'; }
  async interact() { await runScript(async () => { await boardMenu(); }); }
}
