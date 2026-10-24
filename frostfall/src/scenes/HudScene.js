import { ITEMS } from '../data/items.js';
import { burden } from '../systems/burden.js';
import { dangerOfEnemy, dangerName, DANGER_COL } from '../systems/danger.js';
import { BOSS_TAUNTS } from '../data/story.js';
import { STATUS as STATUS_INFO } from '../systems/status.js';
import { copyDebugInfo } from '../systems/debug.js';
import Phaser from 'phaser';
import { W, H, C } from '../config.js';
import { txt, textW, wrap, normText, fit, fontKey, bigKey, largeText, BIG_W } from '../art/font.js';
import { padHint, prompt, keyText, tinyPad } from '../systems/access.js';
import { logLine } from '../systems/msglog.js';
import { keys } from '../systems/keys.js';
import { ui } from '../systems/ui.js';
import { dialogue, Cancelled } from '../systems/dialogue.js';
import { sfx } from '../audio/sfx.js';
import { QUESTS, activeQuestIds, TARGETS, trackedId } from '../data/quests.js';
import { eventMark, EVENT_MARK_COL } from '../world/questmarks.js';
import { exitToward } from '../world/exitgraph.js';
import { MAPS } from '../data/maps.js';
import { removeItem, count } from '../systems/inventory.js';
import { S } from '../systems/state.js';
import { bus, listen } from '../systems/bus.js';
import { moonPhase, isBlood } from '../systems/moon.js';
import { SPELLS, SPELL_ORDER, P } from '../entities/Player.js';
import { iconKey } from '../data/items.js';
import { SKILL_DEFS } from '../systems/skills.js';
import { settings } from '../systems/settings.js';
import { currentShout } from '../systems/shouts.js';
import { TUNE } from '../data/tuning.js';
import { stats } from '../systems/stats.js';
import { BLESSINGS } from '../systems/bless.js';
import { quickScore } from '../arena/heroes.js';
import { tip, takeTip } from '../systems/tips.js';

const BARS = [
  { key: 'hp', max: 'maxHp', col: 11, hi: 12, label: 'HP', flash: 'nohp' },
  { key: 'mp', max: 'maxMp', col: 15, hi: 6, label: 'MP', flash: 'nomana' },
  { key: 'sp', max: 'maxSp', col: 8, hi: 5, label: 'SP', flash: 'nostamina' },
];
const SHOP_TIPS = [[/^CAMPFIRE/, 'cook'], [/^ALCHEMY/, 'brew'], [/^FORGE/, 'forge'], [/^ENCHANT/, 'enchant'], [/^REFORGE/, 'reforge'], [/^FLETCHING/, 'fletch'], [/^FURNISH/, 'furnish'], [/^REPAIR/, 'repair']];
// a cancelled line that nobody awaited must not show up as an unhandled rejection (awaiting it still sees Cancelled)
const quiet = (p) => { p.catch(() => {}); return p; };
const POTIONS = [['hp_potion', '1'], ['mp_potion', '2'], ['sp_potion', '3']];
// A1: LARGE TEXT. The font key, line height and characters per line of the important HUD text in the current mode.
const fk = (col) => (largeText() ? bigKey(col) : fontKey(col));
const LH = () => (largeText() ? TUNE.hud.bigLine : 9);
const FS = () => (largeText() ? BIG_W : 6);        // a bitmap text keeps its old size when its font changes, so pass it

export default class HudScene extends Phaser.Scene {
  constructor() { super('Hud'); }

  get gs() { return this.scene.get('Game'); }

  create() {
    // Scene instances are reused on relaunch, but their display objects are not: drop every lazily created text from the last run.
    this.quickTxt = null; this.clockTxt = null; this.lockTxt = this.statTxt = this.qm = this.ammoTxt = this.cdTxt = this.tgtTxt = this.sneakTxt = this.slotKeys = null;
    this.g = this.add.graphics();
    this.flash = { hp: 0, mp: 0, sp: 0 };
    this.labels = BARS.map((b, i) => txt(this, 3, 3 + i * 8, b.label, 5));
    this.goldTxt = txt(this, 0, 3, '', 13);
    this.arrowTxt = txt(this, 0, 13, '', 5);
    this.coinImg = this.add.image(0, 4, 'mini_coin').setOrigin(0);
    this.arrImg = this.add.image(0, 15, 'mini_arrow').setOrigin(0);

    // bottom-left: spell + shout slots
    this.spellIcons = Object.fromEntries(SPELL_ORDER.map((k) => [k, this.add.image(4, H - 20, 'icon_' + k).setOrigin(0)]));
    this.shoutIcon = this.add.image(25, H - 20, 'icon_shout').setOrigin(0);
    // potions
    this.potIcons = POTIONS.map(([id, k], i) => {
      const x = W - 3 * 21 + i * 20 - 2;
      const img = this.add.image(x + 1, H - 20, iconKey(id)).setOrigin(0);
      return { id, img, cnt: txt(this, x + 10, H - 9, '', 6), x };
    });

    this.toasts = [];
    this.area = null; this.cardFor = null;
    // the same message twice in a row stacks ("x2") instead of pushing older news off the screen
    this.toastHold = [];
    this.onToast = (text, col = 6) => {
      if (this.intro) { this.toastHold.push([text, col]); return; }    // VX-13: news waits until the boss card has gone
      const same = this.toasts.find((ts) => ts.text === text && ts.life > 0.3);
      const big = largeText(), show = (s) => wrap(s, big ? TUNE.hud.bigChars - 1 : 52);      // a long one takes two lines
      if (same) { same.n++; same.life = 2.4; same.t.setText(show(`${text} X${same.n}`)); return; }
      this.toasts.push({ t: txt(this, 4, 0, show(text), col).setFont(fk(col), FS()), life: 2.4, text, n: 1 });
      if (this.toasts.length > (big ? TUNE.hud.bigToasts : 5)) this.toasts.shift().t.destroy();
    };
    // the place name on arrival: snow-white on a dark plate with thin rules, readable over snow and dark ground alike (VX-14)
    this.onArea = (name) => {
      if (this.cardFor === name) { this.cardFor = null; return; }          // art's region title card already shows this name
      this.area?.destroy(); this.area = txt(this, 0, 36, name, 6); this.area.x = Math.round((W - this.area.width) / 2); this.areaT = 3; this.areaName = name;
    };
    // a region's title card (features/art_titlecard.js, bus 'titlecard') replaces the plate: one banner on arrival, whichever
    // of the two 'area' listeners runs first
    this.onCard = (name) => { if (this.area && this.areaName === name) { this.area.destroy(); this.area = null; } else this.cardFor = name; };
    listen(this, 'titlecard', this.onCard);
    // a small "saved" mark (top right, under the clock) whenever progress is written, quiet autosaves included
    this.savedT = 0; this.savedTxt = txt(this, 0, 35, 'SAVED', 8).setVisible(false);
    this.onSaved = () => { this.savedT = 1.6; };
    listen(this, 'saved', this.onSaved);
    listen(this, 'toast', this.onToast); listen(this, 'area', this.onArea);
    this.banners = [];
    this.bannerObj = null;
    this.onLevel = (skill, lv) => this.banners.push({ skill, lv });
    listen(this, 'levelup', this.onLevel);
    this.onChar = (n) => this.banners.push({ custom: true, title: 'LEVEL ' + n, top: 'CHARACTER LEVEL UP', line: '+1 PERK POINT  -  PRESS ' + prompt('KeyI') + ', THEN PERKS' });
    listen(this, 'charlevel', this.onChar);
    this.onDiscover = (d) => this.banners.push({ custom: true, title: d.name, top: d.top, line: d.line });
    listen(this, 'discover', this.onDiscover);
    // dialogue box (a relaunched HUD cancels whatever the old one was still asking)
    this.dlg?.rej?.(new Cancelled());
    this.dlg = null;
    this.dg = this.add.graphics().setDepth(10);
    this.dName = txt(this, 14, H - 61, '', 13).setDepth(11);
    this.dBody = txt(this, 14, H - 49, '', 6).setDepth(11);
    this.dChoice = [0, 1, 2, 3, 4, 5].map((i) => txt(this, 22, H - 52 + i * 9, '', 6).setDepth(11));
    this.dMore = txt(this, W - 22, H - 15, '\u25B6', 13).setDepth(11);
    this.dQ = txt(this, 14, 0, '', 4).setDepth(11);             // the question stays in view while you choose
    this.dKeys = txt(this, 0, 0, '', 3).setDepth(11);           // which keys advance / leave, in the box corner
    this.dArrows = [txt(this, 0, 0, '\u25B2', 13).setDepth(11), txt(this, 0, 0, '\u25BC', 13).setDepth(11)];
    dialogue.hud = this;
    // touch and mouse in conversations: a tap moves the text on; a tap on an option picks it
    this.input.on('pointerdown', (p) => {
      const d = this.dlg; if (!d || this.lock || d.age < 3) return;
      if (d.choices) {
        const hit = (this.choiceRows || []).find((r) => p.y >= r.y - 1 && p.y < r.y + (r.h || 9));
        if (!hit) return;
        if (d.sel !== hit.i) { d.sel = hit.i; sfx.play('move'); return; }
      }
      keys._press('V:KeyE'); setTimeout(() => keys._release('V:KeyE'), 60);
    });
    this.questTxt = [txt(this, 0, 26, '', 4), txt(this, 0, 35, '', 4)];
    this.hint = null; this.hintRect = null;
    // tips wait their turn instead of replacing one another; they sit under the status row, clear of the bars and the purse.
    // An urgent hint (the tutorial's steps, the low-health potion tip) replaces what is showing at once (NP1): a tip it
    // pushes aside comes back after it, and an older urgent line still waiting in the queue is dropped (it is stale).
    this.hintQ = [];
    this.showHint = (text, urgent = false) => {
      const shown = wrap(text, largeText() ? TUNE.hud.bigChars - 1 : 52);     // LARGE TEXT: twice the size (A1); never off the screen
      this.hint?.destroy(); this.hint = txt(this, 0, 0, shown, 5).setFont(fk(5), FS()); this.hint.x = Math.round((W - this.hint.width) / 2);
      this.hintT = TUNE.hud.hintLife; this.hintH = shown.split('\n').length * LH() + 3; this.hintText = text; this.hintUrgent = !!urgent;
    };
    this.onHint = (text, urgent = false) => {
      if (this.hint && this.hintText === text) { this.hintT = TUNE.hud.hintLife; return; }
      if (urgent) {
        this.hintQ = this.hintQ.filter((q) => !q.urgent && q.text !== text);
        if (this.hint && !this.hintUrgent && this.hintT > TUNE.hud.hintKeep) this.hintQ.unshift({ text: this.hintText, urgent: false });
        this.showHint(text, true); return;
      }
      if (this.hint && (this.hintUrgent || this.hintT > TUNE.hud.hintKeep)) {
        if (!this.hintQ.some((q) => q.text === text)) this.hintQ.push({ text, urgent: false });
        if (this.hintQ.length > TUNE.hud.hintQueue) this.hintQ.shift();
        if (!this.hintUrgent) this.hintT = Math.min(this.hintT, TUNE.hud.hintTrim);
        return;
      }
      this.showHint(text);
    };
    listen(this, 'hint', this.onHint);
    this.debugTxt = txt(this, 4, 32, '', 15).setVisible(false);
    this.onKey = (e) => { if (e.code === 'F3') { e.preventDefault(); this.debugOn = !this.debugOn; this.debugTxt.setVisible(this.debugOn); }
      if (e.code === 'F4') { e.preventDefault(); copyDebugInfo(this).then((ok) => { if (ok) bus.emit('toast', 'BUG REPORT COPIED', 13); }); } };
    window.addEventListener('keydown', this.onKey);
    this.dead = this.add.container(0, 0).setVisible(false);
    this.dead.add(this.add.rectangle(0, 0, W, H, 0x0b0e1a, 0.6).setOrigin(0));
    const d1 = txt(this, W / 2, 60, 'YOU DIED', 11).setScale(3).setOrigin(0.5, 0);
    // what happened and what it costs: who did it, the gold you drop, where you wake
    this.deadWhy = txt(this, 0, 92, '', 6); this.deadCost = txt(this, 0, 104, '', 12); this.deadWake = txt(this, 0, 116, '', 4); this.deadNem = txt(this, 0, 128, '', 11);
    this.dead.add([d1, this.deadWhy, this.deadCost, this.deadWake, this.deadNem]);
    this.deadShown = false;

    // boss intro card: letterbox bars slide in and the boss's name appears
    this.intro = null;
    this.introG = this.add.graphics().setDepth(900);
    this.introTxt = txt(this, 0, 0, '', 13).setVisible(false).setDepth(901);
    this.introSub = txt(this, 0, 0, '', 4).setVisible(false).setDepth(901);
    this.sub = null; this.subTxt = txt(this, 0, 0, '', 6).setVisible(false).setDepth(902); this.subWho = txt(this, 0, 0, '', 13).setVisible(false).setDepth(902);
    this.onSay = (who, text, col = 6) => { this.sub = { who, text, t: 0, col }; };
    listen(this, 'say', this.onSay);
    this.onBossPhase = (p) => { const b = this.gs?.boss; const tz = b && BOSS_TAUNTS[b.kind]; if (tz && tz[p]) this.onSay(tz.name, tz[p]); };
    listen(this, 'boss:phase', this.onBossPhase);
    this.onKilled = (kind, en) => { const tz = en?.isBoss && BOSS_TAUNTS[kind]; if (tz?.death) this.onSay(tz.name, tz.death); };
    listen(this, 'enemy:killed', this.onKilled);
    this.onBossIntro = (b) => { const tz = b && BOSS_TAUNTS[b.kind]; if (tz) this.onSay(tz.name, tz.engage); if (b?.cfg) this.intro = { t: 0, title: b.cfg.title || b.cfg.name.toUpperCase(), sub: (MAPS[this.gs?.mapId]?.name || '').toUpperCase() }; };
    listen(this, 'boss:engaged', this.onBossIntro);
    this.handlers = {};
    for (const b of BARS) { this.handlers[b.flash] = () => { this.flash[b.key] = 0.3; }; listen(this, b.flash, this.handlers[b.flash]); }
    // NP16: the first visit to a crafting service explains it, once, on that service's own message line
    const shop = this.scene.get('Shop');
    const onShop = (sh) => { const hit = SHOP_TIPS.find(([re]) => re.test(sh.cfg?.title || '')); const t = hit && takeTip(hit[1]); if (t) { sh.say(t, 13); sh.msgT = TUNE.hud.shopTip; } };
    shop?.events.on('create', onShop);
    this.events.once('shutdown', () => shop?.events.off('create', onShop));
    // bus handlers above go through listen(), which removes them on shutdown by itself (CH13): never bus.on in a scene
    this.events.once('shutdown', () => { if (dialogue.hud === this) dialogue.hud = null; window.removeEventListener('keydown', this.onKey); });
  }

  // ------------------------------------------------------- dialogue API
  say(name, text) {
    if (this.skipTalk) return Promise.resolve();        // the cast button was pressed: read nothing more until a choice or the end
    text = keyText(text);                               // {KeyC} -> the player's own key or pad button
    this.lastSay = text;
    logLine('talk', (name ? name + ': ' : '') + text, 6);
    return quiet(new Promise((res, rej) => {
      const big = largeText(), per = big ? 2 : 3;                         // LARGE TEXT: two big lines a page (A1)
      const lines = wrap(normText(text), big ? TUNE.hud.bigChars - 2 : 47).split('\n');
      const pages = [];
      for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per).join('\n'));
      this.name = name;
      this.dlg = { name, pages, p: 0, n: 0, t: 0, res, rej, choices: null, age: 0 };
    }));
  }

  choose(opts) {
    this.skipTalk = false;
    return quiet(new Promise((res, rej) => {
      // long options wrap with a hanging indent; the window scrolls when there are more than fit
      const rows = opts.map((o) => wrap(normText(String(o)), largeText() ? TUNE.hud.bigChars - 5 : 44).split('\n'));
      const q = this.lastSay ? fit(normText(this.lastSay).replace(/\s+/g, ' '), 47) : '';
      this.dlg = { name: this.name || '', pages: [''], p: 0, n: 0, t: 0, res, choices: opts, rows, q, sel: 0, top: 0, age: 0, rej };
    }));
  }

  // ------------------------------------------------------- lockpicking
  // difficulty: easy (1 hit) | med (2 hits) | hard (3 hits). Press E inside the green zone.
  lockpick(diff) {
    const need = { easy: 1, med: 2, hard: 3 }[diff] || 2;
    const sneak = S.skills.sneak.lvl;
    return new Promise((res) => {
      this.lock = { need, hits: 0, pos: 0, dir: 1, speed: 0.9 + need * 0.25, w: Math.max(0.06, 0.16 - need * 0.025 + sneak * 0.006), c: Math.random() * 0.7 + 0.15, res, age: 0, flash: 0, msg: '' };
    });
  }

  updateLock(dt) {
    const L = this.lock, g = this.dg;
    g.clear();
    if (!L) { if (this.lockTxt) { this.lockTxt.forEach((t) => t.setText('')); } return; }
    L.age++;
    L.pos += L.dir * L.speed * dt;
    if (L.pos > 1) { L.pos = 1; L.dir = -1; } else if (L.pos < 0) { L.pos = 0; L.dir = 1; }
    L.flash -= dt;
    const bx = 60, by = 78, bw = 200, bh = 16;
    g.fillStyle(C[0], 0.85); g.fillRect(bx - 10, by - 28, bw + 20, 72);
    g.fillStyle(C[3]); g.fillRect(bx - 9, by - 27, bw + 18, 70);
    g.fillStyle(C[1]); g.fillRect(bx - 8, by - 26, bw + 16, 68);
    g.fillStyle(C[0]); g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    g.fillStyle(C[2]); g.fillRect(bx, by, bw, bh);
    g.fillStyle(C[8]); g.fillRect(Math.round(bx + (L.c - L.w) * bw), by, Math.round(L.w * 2 * bw), bh);
    g.fillStyle(C[13]); g.fillRect(Math.round(bx + L.pos * bw) - 1, by - 3, 3, bh + 6);
    for (let i = 0; i < L.need; i++) { g.fillStyle(i < L.hits ? C[13] : C[3]); g.fillRect(bx + 40 + i * 12, by + 22, 9, 5); }
    // the words sit above the panel (depth 11 over the panel's 10): title, pins done, picks left and the keys
    if (!this.lockTxt) this.lockTxt = [txt(this, 0, 0, '', 13).setDepth(11), txt(this, 0, 0, '', 6).setDepth(11), txt(this, 0, 0, '', 4).setDepth(11), txt(this, 0, 0, '', 5).setDepth(11)];
    this.lockTxt[0].setText('PICKING THE LOCK'); this.lockTxt[0].setPosition(Math.round((W - this.lockTxt[0].width) / 2), by - 20);
    this.lockTxt[1].setText('PINS').setPosition(bx, by + 21);
    this.lockTxt[3].setText(`LOCKPICKS ${count('lockpick')}`); this.lockTxt[3].setPosition(bx + bw - this.lockTxt[3].width, by + 21);
    const lh = padHint(`E PICK IN THE GREEN   ESC STOP`, 34);
    this.lockTxt[2].setText(lh); this.lockTxt[2].setPosition(Math.round((W - this.lockTxt[2].width) / 2), by + 32);
    if (L.age < 4) return;
    if (keys.pressed('pause') || keys.back()) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); L.res(false); return; }
    if (keys.pressed('interact')) {
      if (Math.abs(L.pos - L.c) <= L.w) {
        L.hits++; sfx.play('select');
        if (L.hits >= L.need) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); sfx.play('chest'); L.res(true); return; }
        L.c = Math.random() * 0.7 + 0.15; L.w *= 0.85; L.speed *= 1.12;
      } else {
        sfx.play('guardbreak');
        removeItem('lockpick', 1);
        bus.emit('toast', 'LOCKPICK BROKE', 11);
        L.hits = 0;
        if (!count('lockpick')) { this.lock = null; g.clear(); this.lockTxt.forEach((t) => t.setText('')); L.res(false); }
      }
    }
  }

  // Small status row under the bars: ward / weapon enchant / lock-on, each with its remaining time.
  drawStatus(g, pl, y0) {
    if (!this.statTxt) this.statTxt = Array.from({ length: 12 }, () => txt(this, 0, 0, '', 15));
    // harmful things first (burning, bleeding, slowed...), so a long list of buffs can never hide them
    const bad = [], good = [];
    { const bl2 = burden.level(); if (bl2 !== 'ok') bad.push([bl2 === 'over' ? 'OVERLOADED' : 'BURDENED', bl2 === 'over' ? 11 : 12]); }
    for (const [k, v] of Object.entries(pl.statuses || {})) {
      const st = STATUS_INFO[k]; if (!st) continue;
      bad.push([st.name + (k === 'chill' ? ' ' + v.stacks : '') + (v.t > 0 ? ' ' + Math.ceil(v.t) : ''), st.col]);
    }
    if (pl.counterT > 0) good.push(['COUNTER ' + pl.counterT.toFixed(1), 15]);
    if (pl.riposteT > 0) good.push(['RIPOSTE ' + pl.riposteT.toFixed(1), 13]);
    if (S.blessing) good.push([BLESSINGS[S.blessing].name.toUpperCase(), BLESSINGS[S.blessing].kind === 'pact' ? 11 : 13]);
    if (pl.ward) good.push(['WARD ' + Math.ceil(pl.ward.t), 15]);
    const en = stats.enchant();
    if (en) good.push([en.type.toUpperCase(), { fire: 12, frost: 15, shock: 13 }[en.type] || 5]);
    if (S.flags.restedUntil > S.playtime) good.push(['RESTED ' + Math.ceil((S.flags.restedUntil - S.playtime) / 60) + 'M', 8]);
    if (S.flags.elixir && S.flags.elixirUntil > S.playtime) good.push([fit((ITEMS[S.flags.elixir]?.name || 'ELIXIR').toUpperCase(), 12) + ' ' + Math.ceil(S.flags.elixirUntil - S.playtime) + 'S', 14]);
    if (S.flags.food && S.flags.foodUntil > S.playtime) good.push([fit((ITEMS[S.flags.food]?.name || 'MEAL').toUpperCase(), 12) + ' ' + Math.ceil((S.flags.foodUntil - S.playtime) / 60) + 'M', 12]);
    if (pl.sneaking) good.push(['SNEAK', 4]);
    if (pl.blocking) good.push(['GUARD', 7]);
    if ((S.perkPoints || 0) > 0 && !S.quick) good.push([`PERK POINT${S.perkPoints > 1 ? 'S ' + S.perkPoints : ''}`, 13]);
    const list = [...bad, ...good];
    // up to two rows, left half of the screen (the quest tracker owns the right); anything more is counted
    const maxX = W / 2 + 40;
    let x = 3, row = 0, shown = 0;
    this.statTxt.forEach((t) => t.setText(''));
    for (let i = 0; i < list.length && shown < this.statTxt.length - 1; i++) {
      const [label, col] = list[i];
      const w = textW(label) + 4;
      if (x + w > maxX) { if (row === 1) break; row = 1; x = 3; }
      const t = this.statTxt[shown++];
      t.setText(label).setFont(fontKey(col)); t.x = x + 2; t.y = y0 + 1 + row * 10;
      g.fillStyle(C[0], 0.62); g.fillRect(x, y0 + row * 10, t.width + 4, 9);
      x += t.width + 6;
    }
    if (shown < list.length) {
      const t = this.statTxt[this.statTxt.length - 1];
      t.setText('+' + (list.length - shown)).setFont('f6'); t.x = x + 2; t.y = y0 + 1 + row * 10;
      g.fillStyle(C[0], 0.62); g.fillRect(x, y0 + row * 10, t.width + 4, 9);
    }
    this.statRows = list.length ? row + 1 : 0;
  }

  // Diamond over the objective when it is on screen, an edge arrow when it is not, a label when it is in another area.
  drawQuestMarker(g, tid, dt) {
    if (!this.qm) { this.qm = txt(this, 0, 0, '', 15); }
    this.qm.setText('');
    if (!tid || ui.modal || this.dlg) return;
    const gs = this.gs, T = TARGETS[tid]?.(S.quests[tid]);
    if (!T || !gs.player) return;
    this.markerAt(g, T, 15, dt);
  }

  markerAt(g, T, col, dt) {
    const gs = this.gs;
    if (T.map !== gs.mapId) {
      if (this.bossOn) return;                       // the boss bar owns the bottom centre during a fight
      const label = fit('GO TO ' + (MAPS[T.map]?.name || T.map).toUpperCase(), 34);
      this.qm.setText(label).setFont('f15'); this.qm.x = Math.round((W - this.qm.width) / 2); this.qm.y = H - 13;
      g.fillStyle(C[0], 0.6); g.fillRect(this.qm.x - 3, this.qm.y - 2, this.qm.width + 6, 11);
      const ex = exitToward(gs.mapId, T.map);       // WQ8: and an arrow to the first door or road on the way there
      if (!ex) return;
      T = { map: gs.mapId, x: ex.x, y: ex.y };
    }
    const cam = gs.cameras.main.worldView;
    const wx = (T.x + 0.5) * 16, wy = (T.y + 0.5) * 16;
    const sx = wx - cam.x, sy = wy - cam.y;
    const bob = settings.reduceMotion ? 0 : Math.sin(this.time.now / 220) * 2;
    if (sx > 6 && sx < W - 6 && sy > 14 && sy < H - 6) {
      const x = Math.round(sx);
      let y = Math.round(sy - 16 + bob);
      // never hidden under the hint plate: the diamond steps just below it (or above it, near the bottom of the screen)
      const hr = this.hintRect;
      if (hr && x + 5 > hr.x && x - 4 < hr.x + hr.w && y + 11 > hr.y && y - 4 < hr.y + hr.h) {
        const below = hr.y + hr.h + 5, above = hr.y - 12;
        y = below + 12 <= H - 24 && (above < 14 || Math.abs(below - y) <= Math.abs(above - y)) ? below : above;
      }
      g.fillStyle(C[0]); g.fillRect(x - 4, y - 1, 9, 9); g.fillRect(x - 1, y - 4, 3, 15);
      g.fillStyle(C[col]); g.fillRect(x - 3, y, 7, 7); g.fillRect(x - 1, y - 3, 3, 13);
      g.fillStyle(C[6]); g.fillRect(x - 1, y + 1, 2, 2);
      return { x, y };
    } else {
      const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy;
      const k = Math.min((W / 2 - 14) / Math.abs(dx || 1e-6), (H / 2 - 14) / Math.abs(dy || 1e-6));
      const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
      const p = (r, off) => [ax + Math.cos(a + off) * r, ay + Math.sin(a + off) * r];
      const [x1, y1] = p(7, 0), [x2, y2] = p(6, 2.5), [x3, y3] = p(6, -2.5);
      g.fillStyle(C[0]); g.fillTriangle(x1 + Math.cos(a) * 1.5, y1 + Math.sin(a) * 1.5, x2 - Math.cos(a), y2 - Math.sin(a), x3 - Math.cos(a), y3 - Math.sin(a));
      g.fillStyle(C[col]); g.fillTriangle(x1, y1, x2, y2, x3, y3);
    }
  }

  // Closes the box. A line or choice still waiting for the player is cancelled (its promise rejects with Cancelled, which
  // runScript swallows), so a conversation cut off by a door or a death never leaves a script hanging (CH6).
  hideBox() {
    this.skipTalk = false;
    this.name = ''; this.lastSay = '';       // the next conversation's first choice never shows this one's speaker and line (NP7)
    const d = this.dlg;
    this.dlg = null;
    d?.rej?.(new Cancelled());
    this.dg.clear();
    this.dName.setText(''); this.dBody.setText(''); this.dMore.setVisible(false);
    this.dChoice.forEach((c) => c.setText(''));
  }

  updateDialogue(dt) {
    const d = this.dlg, g = this.dg;
    g.clear();
    if (!d) { this.dMore.setVisible(false); this.dQ.setText(''); this.dKeys.setText(''); this.dArrows.forEach((a) => a.setVisible(false)); return; }
    d.age++;
    const big = largeText(), RH = LH();
    const VIS = big ? 3 : 5;                                // choice lines shown at once (the window scrolls past that)
    let h = big ? 56 : 52, lines = 0;
    if (d.choices) {
      const all = d.rows.flat().length;
      lines = Math.min(VIS, all);
      h = 16 + (d.q ? 10 : 0) + lines * RH;
    }
    const top = H - 6 - h;
    g.fillStyle(C[0]); g.fillRect(6, top, W - 12, h);
    g.fillStyle(C[3]); g.fillRect(7, top + 1, W - 14, h - 2);
    g.fillStyle(C[1]); g.fillRect(8, top + 2, W - 16, h - 4);
    const nh = big ? 18 : 12;                               // the name tab (taller for the big font)
    if (d.name) {
      const w = (big ? d.name.length * BIG_W : textW(d.name)) + 10;
      g.fillStyle(C[0]); g.fillRect(10, top + 4 - nh, w, nh);
      g.fillStyle(C[3]); g.fillRect(11, top + 5 - nh, w - 2, nh - 2);
      g.fillStyle(C[2]); g.fillRect(12, top + 6 - nh, w - 4, nh - 4);
    }
    this.dName.setText(d.name || '').setFont(fk(13), FS()).setPosition(15, top + 7 - nh);
    if (d.choices) {
      this.dBody.setText('');
      this.dMore.setVisible(false);
      this.dQ.setText(d.q).setPosition(14, top + 5);
      // which option rows are visible: keep the selected option (all of its lines) inside the window
      const startOf = (i) => d.rows.slice(0, i).reduce((n, r) => n + r.length, 0);
      const selStart = startOf(d.sel), selEnd = selStart + d.rows[d.sel].length;
      if (selStart < d.top) d.top = selStart;
      if (selEnd > d.top + VIS) d.top = selEnd - VIS;
      const flat = [];
      d.rows.forEach((r, i) => r.forEach((ln, k) => flat.push({ i, text: (k === 0 ? (i === d.sel ? '\u25B6 ' : '  ') : '  ') + ln })));
      const y0 = top + 6 + (d.q ? 10 : 0);
      this.choiceRows = [];
      this.dChoice.forEach((c, k) => {
        const f = flat[d.top + k];
        if (!f || k >= VIS) { c.setText(''); return; }
        c.setText(f.text).setFont(fk(f.i === d.sel ? 13 : 6), FS()).setPosition(14, y0 + k * RH);
        this.choiceRows.push({ y: y0 + k * RH, i: f.i, h: RH });
      });
      this.dArrows[0].setVisible(d.top > 0).setPosition(W - 20, y0);
      this.dArrows[1].setVisible(d.top + VIS < flat.length).setPosition(W - 20, y0 + (VIS - 1) * RH + (big ? 8 : 0));
      this.dKeys.setText('');
      if (d.age < 3) return;
      if (keys.repeat('down')) { d.sel = (d.sel + 1) % d.choices.length; sfx.play('move'); }
      if (keys.repeat('up')) { d.sel = (d.sel + d.choices.length - 1) % d.choices.length; sfx.play('move'); }
      if (keys.pressed('interact')) { sfx.play('select'); const r = d.res, s = d.sel; logLine('talk', '> ' + d.choices[s], 4); this.dlg = null; this.dChoice.forEach((c) => c.setText('')); this.dQ.setText(''); this.dArrows.forEach((a) => a.setVisible(false)); r(s); }
      else if (keys.back()) {       // back (B, ESC's cast key): take the "leave" option if there is one
        const out = d.choices.map((o, i) => [o, i]).reverse().find(([o]) => /^(leave|goodbye|bye|never ?mind|nothing|back|cancel|no thanks|not now|farewell|later|done)\b/i.test(String(o).trim()));
        if (out) { sfx.play('back'); const r = d.res; this.dlg = null; this.dChoice.forEach((c) => c.setText('')); this.dQ.setText(''); this.dArrows.forEach((a) => a.setVisible(false)); r(out[1]); }
      }
      return;
    }
    this.dChoice.forEach((c) => c.setText('')); this.dQ.setText(''); this.dArrows.forEach((a) => a.setVisible(false));
    const page = d.pages[d.p];
    // the keys, small in the corner: what advances, what leaves
    const kh = padHint(`E NEXT  ${prompt('KeyL')} SKIP`, 20);
    this.dKeys.setText(kh).setPosition(W - 26 - textW(kh), H - 15);
    if (d.age > 2 && keys.skipTalk()) {   // the cast key leaves the talk: this and every later line is skipped, choices still ask
      this.skipTalk = true; const r = d.res; this.dlg = null; this.dMore.setVisible(false); this.dKeys.setText(''); sfx.play('back'); r(); return;
    }
    const step = { slow: 0.04, normal: 0.022, fast: 0.011, instant: 0 }[settings.textSpeed] ?? 0.022;
    if (d.n < page.length) {
      if (step === 0) d.n = page.length;
      d.t += dt;
      while (d.t > step && d.n < page.length) { d.t -= step; d.n++; if (d.n % 2 === 0 && page[d.n - 1] !== ' ' && page[d.n - 1] !== '\n') sfx.play(sfx.talk(d.name)); }
      if (d.age > 2 && keys.pressed('interact')) d.n = page.length;
    } else if (d.age > 2) {
      this.dMore.setVisible(settings.reduceMotion || Math.floor(this.time.now / 300) % 2 === 0).setPosition(W - 22, H - 16);
      if (keys.pressed('interact')) {
        if (d.p < d.pages.length - 1) { d.p++; d.n = 0; d.t = 0; sfx.play('select'); }
        else { const r = d.res; this.dlg = null; this.dMore.setVisible(false); this.dKeys.setText(''); r(); }
      }
    }
    this.dBody.setText(page.slice(0, d.n)).setFont(fk(6), FS()).setPosition(15, top + 6);
    if (d.n < page.length) this.dMore.setVisible(false);
  }

  // The boss intro card: bars slide in over 0.4 s, hold, then slide out (2.6 s total).
  // Spoken lines: a name and a sentence over the bottom of the screen for a few seconds.
  updateSub(dt) {
    const s = this.sub;
    this.subRect = null;
    // a line waits for the boss card (VX-13), and for a conversation box to close (it would print over the box)
    if (!s || S.hp <= 0 || this.intro || this.dlg) { this.subTxt.setVisible(false); this.subWho.setVisible(false); return; }
    s.t += dt;
    const big = largeText(), lines = wrap(s.text, big ? TUNE.hud.bigChars - 1 : 52);
    this.subTxt.setVisible(true).setText(lines).setFont(fk(6), FS()); this.subWho.setVisible(true).setText(s.who).setFont(fk(s.col), FS());
    const h = lines.split('\n').length * LH();
    // above the boss bar and above the newest toasts, so the three never print over each other
    const floor = Math.min(this.bossOn ? H - 30 : H - 24, this.toasts.length ? (this.toastTop ?? H - 36) - 4 : H, this.hintDock ? (this.bossOn ? H - 26 : H - 22) - this.hintDock : H);
    this.subWho.x = Math.round((W - this.subWho.width) / 2); this.subWho.y = floor - (big ? 19 : 10) - h;
    this.subTxt.x = Math.round((W - this.subTxt.width) / 2); this.subTxt.y = floor - h;
    const a = s.t < 0.3 ? s.t / 0.3 : s.t > 3.4 ? Math.max(0, (3.8 - s.t) / 0.4) : 1;
    this.subTxt.setAlpha(a); this.subWho.setAlpha(a);
    if (big) {           // LARGE TEXT: a dark plate behind the line, as the hints and toasts have (A1)
      const pw = Math.max(this.subTxt.width, this.subWho.width) + 8;
      this.introG.fillStyle(C[0], 0.6 * a); this.introG.fillRect(Math.round((W - pw) / 2), this.subWho.y - 2, pw, floor - this.subWho.y + 2);
      this.subRect = { x: Math.round((W - pw) / 2), y: this.subWho.y - 2, w: pw, h: floor - this.subWho.y + 2 };
    }
    if (s.t > 3.8) this.sub = null;
  }

  updateIntro(dt) {
    const g = this.introG; g.clear();
    const it = this.intro;
    if (!it) { this.introTxt.setVisible(false); this.introSub.setVisible(false); return; }
    it.t += dt;
    const T = 2.6, a = it.t < 0.4 ? it.t / 0.4 : it.t > T - 0.4 ? Math.max(0, (T - it.t) / 0.4) : 1;
    const bar = Math.round(18 * a);
    g.fillStyle(C[0], 1); g.fillRect(0, 0, W, bar); g.fillRect(0, H - bar, W, bar);
    const show = a > 0.9;
    this.introTxt.setVisible(show).setText(it.title); this.introSub.setVisible(show && !!it.sub).setText(it.sub);
    this.introTxt.x = Math.round((W - this.introTxt.width) / 2); this.introTxt.y = 5;
    this.introSub.x = Math.round((W - this.introSub.width) / 2); this.introSub.y = H - 13;
    if (it.t >= T) { this.intro = null; for (const [t, c] of this.toastHold.splice(0)) this.onToast(t, c); }
  }

  nextStep() {
    const Q = S.quests;
    if (Q.king?.status === 'inactive') return 'NEXT: TALK TO ELDER SIGRID';
    if (Q.wolves?.status === 'inactive') return 'NEXT: BJORN NEEDS A HUNTER';
    if (Q.herbs?.status === 'inactive') return 'NEXT: MIRRA NEEDS HERBS';
    return 'NEXT: EXPLORE. CAMPFIRES ARE SAFE';
  }

  // A fight is on when an alerted foe is close (or you are locked on); it lingers a moment so the hint does not jump about.
  inFight(pl, dt) {
    const gs = this.gs, R = TUNE.hud.fightR;
    const foes = gs.enemies?.children ? gs.enemies.getChildren() : [];      // the group is gone while the Game scene restarts
    const now = !!pl && (!!pl.target || this.bossOn || foes.some((e) => e.alerted && !e.dead && Math.abs(e.x - pl.x) < R && Math.abs(e.y - pl.y) < R));
    this.fightT = now ? TUNE.hud.fightHold : Math.max(0, (this.fightT || 0) - dt);
    return this.fightT > 0;
  }

  // Time of day and the moon, top right under the purse (outdoors only, since time stands still inside).
  drawClock(g) {
    const gs = this.gs, out = gs.def && (gs.def.snow || gs.def.outdoors) && !gs.def.quick;
    if (!this.clockTxt) this.clockTxt = txt(this, 0, 25, '', 5);
    if (!out || ui.modal) { this.clockTxt.setVisible(false); return; }
    const hh = Math.floor((S.time % 1440) / 60), mm = Math.floor(S.time % 60), ph = moonPhase(), night = hh >= 20 || hh < 6;
    const label = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    this.clockTxt.setVisible(true).setText(label); this.clockTxt.x = W - 4 - textW(label);
    const mx = this.clockTxt.x - 9, my = 25;
    g.fillStyle(C[0], 0.62); g.fillRect(mx - 2, my - 1, textW(label) + 15, 9);
    // the moon: a disc, lit according to the phase (a dark disc on the new moon)
    const col = isBlood() ? 8 : night ? 15 : 13;
    g.fillStyle(C[1]); g.fillRect(mx, my, 6, 6);
    const lit = [0, 1, 3, 5, 6, 5, 3, 1][ph];
    if (night || ph) { g.fillStyle(C[col]); const w = Math.min(6, lit); if (ph <= 4) g.fillRect(mx + 6 - w, my, w, 6); else g.fillRect(mx, my, w, 6); }
    if (!night) { g.fillStyle(C[13]); g.fillRect(mx + 1, my + 1, 4, 4); }
  }

  update(_, ms) {
    const dt = ms / 1000;
    this.updateIntro(dt); this.updateSub(dt);
    if (this.lock) this.updateLock(dt); else { if (this.lockTxt && this.lockTxt[0]._raw) this.lockTxt.forEach((t) => t.setText('')); this.updateDialogue(dt); }
    const g = this.g;
    const pl = this.gs.player;
    g.clear();
    const dead = S.hp <= 0;
    this.dead.setVisible(dead);
    if (dead && !this.deadShown) {
      // the death card says what happened and what it costs, once, when it appears
      this.deadShown = true;
      const by = pl?.lastHitBy, loss = S.quick ? 0 : S.gold - Math.floor(S.gold * TUNE.economy.deathGoldKeep), r = S.respawn || { map: 'village' };
      const lines = [[this.deadWhy, by ? fit('SLAIN BY ' + String(by).toUpperCase(), 48) : 'YOU FELL'], [this.deadCost, S.quick ? '' : loss > 0 ? `YOU DROP ${loss} GOLD (10%)` : ''], [this.deadWake, S.quick ? 'THE RUN IS OVER' : fit('YOU WAKE AT ' + (r.x != null ? 'THE LAST BRAZIER IN ' : '') + (MAPS[r.map]?.name || 'THE VILLAGE').toUpperCase(), 48)]];
      // NP10: when the killer becomes (or feeds) your nemesis, the card says so
      const nm = S.nemesis, nemNew = nm && !S.quick && by && String(by).toUpperCase() === String(nm.name || '').toUpperCase();
      lines.push([this.deadNem, nemNew ? fit(nm.kills > 1 ? `YOUR NEMESIS GROWS STRONGER (${nm.kills})` : `THE ${String(nm.name).toUpperCase()} REMEMBERS YOU. IT WILL WAIT, STRONGER.`, 52) : '']);
      for (const [t, v] of lines) { t.setText(v); t.x = Math.round((W - t.width) / 2); }
    } else if (!dead) this.deadShown = false;
    if (S.quick) {
      const q = S.quick, a = this.gs.arena || {}, mult = Math.min(3, 1 + Math.floor(Math.max(0, q.combo - 1) / 4) * 0.25);
      const score = quickScore(a.cleared || 0, q.pts || 0, a.champs || 0, q.mode);   // the same number the results card shows (CH7)
      const lines = [[`${q.mode === 'rush' ? 'BOSS' : 'WAVE'} ${Math.max(1, a.wave - (q.mode === 'rush' ? 0 : 1))}   SCORE ${score}`, 6]];
      if (q.combo >= 2) lines.push([`COMBO ${q.combo}  x${mult.toFixed(2).replace(/0$/, '')}`, mult >= 2 ? 11 : 13]);
      if (q.rageT > 0) lines.push([`RAGE ${Math.ceil(q.rageT)}`, 12]);
      const key = lines.map((l) => l[0]).join('|');
      if (this.quickKey !== key) {
        this.quickKey = key; (this.quickTxt || []).forEach((t) => t.destroy());
        this.quickTxt = lines.map(([t, c], i) => { const o = txt(this, 0, 4 + i * 9, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
      }
    } else if (this.quickTxt) { this.quickTxt.forEach((t) => t.destroy()); this.quickTxt = null; this.quickKey = null; }

    // the boss fight owns the bottom centre (its bar) and pushes spoken lines up; see updateSub
    const bs = this.gs.boss;
    this.bossOn = !!(bs && bs.engaged && !bs.dead);
    this.fightNow = this.inFight(pl, dt);
    // panels
    const big = !!settings.largeUi, rs = big ? 11 : 8, bh = big ? 8 : 5, wk = big ? 0.8 : 0.62;
    const nums = settings.hudNumbers || big;
    if (!this.barNums) this.barNums = BARS.map(() => txt(this, 0, 0, '', 6));
    let numsRight = 0;
    g.fillStyle(C[0], 0.62); g.fillRect(0, 1, 16, rs * BARS.length + 1);       // the same translucent grey as behind the gold and arrow counts
    BARS.forEach((b, i) => {
      this.flash[b.key] -= dt;
      const x = 17, y = 3 + i * rs;
      const w = Math.min(big ? 126 : 110, Math.round(S[b.max] * wk));
      const frac = Math.max(0, S[b.key] / S[b.max]);
      this.labels[i].y = y - (big ? 0 : 0);
      g.fillStyle(C[0]); g.fillRect(x - 1, y - 1, w + 2, bh + 2);
      g.fillStyle(C[1]); g.fillRect(x, y, w, bh);
      const fw = Math.round(w * frac);
      const low = this.flash[b.key] > 0 && Math.floor(this.flash[b.key] * 20) % 2 === 0;
      g.fillStyle(low ? C[11] : C[b.col]); g.fillRect(x, y, fw, bh);
      g.fillStyle(C[b.hi]); g.fillRect(x, y, fw, 1);
      // numbers beside the bar (Bar Numbers or Large UI)
      const nt = this.barNums[i];
      if (nums) {
        nt.setText(`${Math.max(0, Math.ceil(S[b.key]))}/${S[b.max]}`).setVisible(true); nt.x = x + w + 4; nt.y = y + (big ? 1 : -1);
        g.fillStyle(C[0], 0.62); g.fillRect(nt.x - 2, nt.y - 1, nt.width + 4, 8);
        numsRight = Math.max(numsRight, nt.x + nt.width + 2);
      } else nt.setVisible(false);
    });
    this.drawStatus(g, pl, big ? 38 : 30);
    const statBottom = (big ? 38 : 30) + (this.statRows || 0) * 10;

    // gold + arrows
    const gold = String(S.gold), ar = String(S.arrows);
    const gw = textW(gold), aw = textW(ar);
    this.purseX = W - 14 - Math.max(gw, aw) - 6;
    // gold means nothing in an Arena or Daily run: only the arrows show there (NP17)
    const noGold = !!S.quick;
    this.goldTxt.setVisible(!noGold); this.coinImg.setVisible(!noGold);
    g.fillStyle(C[0], 0.62); g.fillRect(this.purseX, noGold ? 11 : 0, Math.max(gw, aw) + 20, noGold ? 12 : 23);
    if (!this.ammoTxt) this.ammoTxt = txt(this, 0, 23, '', 12);
    const ak = pl.curAmmo();
    if (ak !== 'arrow') {
      const lab = (ak === 'fire_arrow' ? 'FIRE ' : 'BARB ') + S.inv[ak];
      this.ammoTxt.setText(lab).setFont(ak === 'fire_arrow' ? 'f12' : 'f11').setVisible(true);
      this.ammoTxt.x = W - 22 - Math.max(gw, aw) - 6 - this.ammoTxt.width; this.ammoTxt.y = 13; g.fillStyle(C[0], 0.62); g.fillRect(this.ammoTxt.x - 3, 12, this.ammoTxt.width + 6, 10);
    } else this.ammoTxt.setVisible(false);
    this.drawClock(g);
    this.goldTxt.setText(gold).x = W - 4 - gw;
    this.arrowTxt.setText(ar).x = W - 4 - aw;
    this.coinImg.x = W - 13 - Math.max(gw, aw);
    this.arrImg.x = W - 16 - Math.max(gw, aw);

    // spell + shout slots
    const sp = SPELLS[S.spell];
    const box = (x, y) => { g.fillStyle(C[0], 0.7); g.fillRect(x - 1, y - 1, 18, 18); g.lineStyle(1, C[3]); g.strokeRect(x - 0.5, y - 0.5, 17, 17); };
    box(4, H - 20); box(25, H - 20);
    for (const k of SPELL_ORDER) this.spellIcons[k].setVisible(S.spell === k);
    const afford = S.mp >= pl.spellCost(sp);
    if (pl.heat > 0.05) { g.fillStyle(C[0]); g.fillRect(4, H - 3, 16, 2); g.fillStyle(pl.heat > 1.8 ? C[11] : C[12]); g.fillRect(4, H - 3, Math.round(16 * pl.heat / P.cast.heatMax), 2); }
    this.spellIcons[S.spell].setAlpha(afford ? 1 : 0.4);
    const sid = currentShout(), SH = TUNE.player.shouts[sid];
    this.shoutIcon.setTint(sid === 'force' ? 0xffffff : C[SH.col]);
    const cdFrac = Math.max(0, pl.shoutCd / (pl.shoutCdMax || P.shout.cooldown));
    if (cdFrac > 0) { g.fillStyle(C[0], 0.75); g.fillRect(25, H - 20, 16, Math.ceil(16 * cdFrac)); }
    if (!this.cdTxt) this.cdTxt = txt(this, 0, H - 16, '', 6);
    this.cdTxt.setText(cdFrac > 0 ? String(Math.ceil(pl.shoutCd)) : '');
    this.cdTxt.x = 25 + Math.round((16 - this.cdTxt.width) / 2); this.cdTxt.y = H - 16;

    // potions
    this.potIcons.forEach((p) => {
      box(p.x + 1, H - 20);
      const n = (S.inv[p.id] || 0) + (S.inv[p.id + '_g'] || 0);
      p.img.setAlpha(n ? 1 : 0.3);
      p.cnt.setText(n ? String(n) : ''); p.cnt.x = p.x + 18 - p.cnt.width; p.cnt.y = H - 10;      // inside the slot, bottom right
    });

    // each slot names its key (or pad button) in its top-left corner (NP14)
    if (!this.slotKeys) this.slotKeys = [0, 1, 2, 3, 4].map(() => txt(this, 0, 0, '', 13));
    [[4, 'KeyL'], [25, 'KeyR'], ...this.potIcons.map((p, i) => [p.x + 1, 'Digit' + (i + 1)])].forEach(([x, code], i) => {
      const t = this.slotKeys[i];
      t.setText(fit(tinyPad(prompt(code)), 3)).setVisible(!dead); t.x = x; t.y = H - 20;
      if (t.visible) { g.fillStyle(C[0], 0.8); g.fillRect(x - 1, H - 21, t.width + 2, 8); }
    });

    // toasts stack above the bottom-left slots
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const ts = this.toasts[i];
      ts.life -= dt;
      if (ts.life <= 0) { ts.t.destroy(); this.toasts.splice(i, 1); }
    }
    // newest at the bottom; a LARGE TEXT toast can take two lines, so each one is as tall as its text (A1)
    let tBase = H - 27 - (this.hintDock || 0);
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const ts = this.toasts[i];
      ts.t.setVisible(!dead);
      if (dead) continue;
      const th = String(ts.t._raw).split('\n').length * LH();
      ts.t.y = tBase - th; tBase = ts.t.y;
      // LARGE TEXT: a big hint can reach down to the toasts; an older toast that would run into it waits off screen
      const hr = this.hintRect;
      if (hr && largeText() && ts.t.y < hr.y + hr.h + 1 && ts.t.y + th > hr.y && ts.t.width + 6 > hr.x) { ts.t.setVisible(false); continue; }
      ts.t.setAlpha(Math.min(1, ts.life * 2.5));
      g.fillStyle(C[0], 0.5 * Math.min(1, ts.life * 2.5)); g.fillRect(2, ts.t.y - 1, ts.t.width + 4, th);
    }
    this.toastTop = tBase;
    if (this.area) {
      if (!this.bannerObj) this.areaT -= dt;          // waits while a level-up banner holds the middle of the screen
      this.area.setVisible(!this.bannerObj && !dead);
      this.area.setAlpha(Math.max(0, Math.min(1, this.areaT)));
      if (this.area.visible) {
        const aa = Math.max(0, Math.min(1, this.areaT)), ax = this.area.x - 6, aw = this.area.width + 12;
        g.fillStyle(C[0], 0.78 * aa); g.fillRect(ax, 33, aw, 13);
        g.fillStyle(C[4], aa); g.fillRect(ax + 2, 33, aw - 4, 1); g.fillRect(ax + 2, 45, aw - 4, 1);
      }
      if (this.areaT <= 0) { this.area.destroy(); this.area = null; }
    }

    // low-health warning pulse
    if (S.hp > 0 && S.hp / S.maxHp < 0.3) {
      const steady = settings.reduceMotion || settings.flashes === false;     // no pulsing for those who asked for calm
      const a = steady ? 0.22 : 0.18 + 0.14 * Math.sin(this.time.now / 160);
      g.fillStyle(C[11], a);
      g.fillRect(0, 0, W, 3); g.fillRect(0, H - 3, W, 3); g.fillRect(0, 0, 3, H); g.fillRect(W - 3, 0, 3, H);
    }

    if (this.debugOn) {
      const gs = this.gs;
      this.debugTxt.setText(`FPS ${Math.round(this.game.loop.actualFps)}  ENEMIES ${gs.enemies.getLength()}  PARTS ${gs.fx.parts.length}/${gs.fx.pool.length}  PICKUPS ${gs.pickups.length}  T ${Math.floor(S.time / 60)}:${String(Math.floor(S.time % 60)).padStart(2, '0')}`);
    }

    // quest tracker
    const tid = trackedId();
    const act = activeQuestIds();
    const ids = [tid, ...act.filter((x) => x !== tid)].filter(Boolean).slice(0, 2);
    // the tracker starts under the clock when the clock is showing (outdoors), never on top of it (NP2)
    const ty0 = this.clockTxt?.visible ? 36 : 26;
    let shownQ = 0;
    this.questTxt.forEach((t, i) => {
      const id = ids[i];
      if (!id || ui.modal || dead) { t.setText(''); return; }
      const line = fit((id === tid ? '> ' : '') + QUESTS[id].short(S.quests[id]), 30);
      t.setText(line); t.setFont(id === tid ? 'f13' : fontKey(4)); t.x = W - 4 - t.width; t.y = ty0 + i * 9;
      g.fillStyle(C[0], 0.5); g.fillRect(t.x - 2, t.y - 1, t.width + 4, 9);
      shownQ = i + 1;
    });
    // NP20: the tracker is never empty: with nothing active it suggests a next step
    if (!shownQ && !S.quick && !S.daily && !ui.modal && !dead && S.flags.tutDone) {
      const t = this.questTxt[0], line = fit(this.nextStep(), 32);
      t.setText(line).setFont(fontKey(4)); t.x = W - 4 - t.width; t.y = ty0;
      g.fillStyle(C[0], 0.5); g.fillRect(t.x - 2, t.y - 1, t.width + 4, 9);
      shownQ = 1;
    }
    this.trackBottom = shownQ ? ty0 + shownQ * 9 : 0;
    this.drawQuestMarker(g, tid, dt);
    const wp = S.flags.waypoint;
    if (wp && wp.map === this.gs.mapId && !ui.modal && !this.dlg) {
      if (Math.hypot(this.gs.player.x - (wp.x + 0.5) * 16, this.gs.player.y - (wp.y + 0.5) * 16) < 20) { delete S.flags.waypoint; bus.emit('toast', 'WAYPOINT REACHED', 8); }
      else this.markerAt(g, { map: wp.map, x: wp.x, y: wp.y }, 8, dt);
    }
    const em = eventMark();                       // WQ6: a trader / traveller / raid, in its own colour
    if (em && em.map === this.gs.mapId && !ui.modal && !this.dlg) this.markerAt(g, em, EVENT_MARK_COL, dt);
    if (this.hint) {
      this.hintT -= dt;
      // under the status row and the quest tracker; below the banner while one is showing. During a fight it docks at the
      // bottom, clear of the action and the telegraphs (VX-05); it stays hidden under the lockpick panel (NP15).
      const fight = this.fightNow;
      const hy = fight ? (this.bossOn ? H - 26 : H - 22) - this.hintH : this.bannerObj ? 88 : Math.max(statBottom + 3, this.trackBottom + 2, 46);
      this.hintDock = fight ? this.hintH + 2 : 0;
      const sr = this.subRect, under = !!sr && hy < sr.y + sr.h && hy + this.hintH > sr.y;   // LARGE TEXT: a spoken line goes first
      const show = !dead && !this.lock && !this.intro && !under;
      if (under) this.hintT += dt;                 // and the hint waits for it
      this.hint.y = hy + 2; this.hint.setVisible(show);
      if (show) { g.fillStyle(C[0], 0.6 * Math.min(1, this.hintT)); g.fillRect(this.hint.x - 4, hy, this.hint.width + 8, this.hintH); }
      this.hintRect = show ? { x: this.hint.x - 4, y: hy, w: this.hint.width + 8, h: this.hintH } : null;
      this.hint.setAlpha(Math.min(1, this.hintT));
      if (this.hintT <= 0) { this.hint.destroy(); this.hint = null; this.hintText = null; this.hintUrgent = false; this.hintDock = 0; this.hintRect = null; const nx = this.hintQ.shift(); if (nx) this.showHint(nx.text, nx.urgent); }
    } else { this.hintDock = 0; this.hintRect = null; }
    // the "saved" mark
    if (this.savedT > 0) {
      this.savedT -= dt;
      const st = this.savedTxt; st.setVisible(!dead && !ui.modal).setAlpha(Math.min(1, this.savedT * 2)); st.x = this.purseX - 4 - st.width; st.y = 3;      // left of the purse, clear of the clock and the tracker (NP2)
      if (st.visible) { g.fillStyle(C[0], 0.6 * Math.min(1, this.savedT * 2)); g.fillRect(st.x - 9, st.y - 1, st.width + 11, 9); g.fillStyle(C[8], Math.min(1, this.savedT * 2)); g.fillRect(st.x - 7, st.y + 1, 5, 5); }
    } else this.savedTxt.setVisible(false);

    // level-up banner (queue)
    // one thing at a time (NP9): a banner waits while a conversation or choice box is open, and pauses if one opens
    if (!this.bannerObj && this.banners.length && !this.dlg) {
      const b = this.banners.shift();
      const d = b.custom ? { name: b.title, perk: b.line } : SKILL_DEFS[b.skill];
      const c = this.add.container(0, 0);
      const t1 = txt(this, W / 2, 54, b.custom ? d.name : d.name + ' ' + b.lv, b.custom ? 15 : 13).setScale(2).setOrigin(0.5, 0);
      const t0 = txt(this, 0, 44, b.custom ? b.top : 'SKILL INCREASED', b.custom ? 13 : 15); t0.x = Math.round((W - t0.width) / 2);
      const t2 = txt(this, 0, 73, d.perk, 5); t2.x = Math.round((W - t2.width) / 2);
      c.add([t0, t1, t2]);
      this.bannerObj = { c, t: 3.2, w: Math.max(t1.displayWidth, t2.width) + 20 };
    }
    if (this.bannerObj) {
      const b = this.bannerObj;
      if (!this.dlg) b.t -= dt;
      const a = this.dlg ? 0 : Math.max(0, Math.min(1, b.t * 2, (3.2 - b.t) * 4));
      b.c.setAlpha(dead ? 0 : a);
      g.fillStyle(C[0], 0.7 * a); g.fillRect((W - b.w) / 2, 40, b.w, 44);
      g.fillStyle(C[13], a); g.fillRect((W - b.w) / 2, 40, b.w, 1); g.fillRect((W - b.w) / 2, 83, b.w, 1);
      if (b.t <= 0) { b.c.destroy(); this.bannerObj = null; }
    }

    // boss bar: bottom centre, between the spell and potion slots, clear of your own bars
    if (this.bossOn && !dead && !this.intro) {        // the bar waits for the intro card to finish (VX-13)
      const bw = 170, bx = Math.round((W - bw) / 2), by0 = H - 24;
      g.fillStyle(C[0], 0.75); g.fillRect(bx - 6, by0, bw + 12, 22);
      g.fillStyle(C[0]); g.fillRect(bx - 1, by0 + 11, bw + 2, 9);
      g.fillStyle(C[1]); g.fillRect(bx, by0 + 12, bw, 7);
      g.fillStyle(bs.bphase === 2 ? C[11] : C[14]); g.fillRect(bx, by0 + 12, Math.round(bw * bs.hpFrac), 7);
      g.fillStyle(bs.bphase === 2 ? C[12] : C[5]); g.fillRect(bx, by0 + 12, Math.round(bw * bs.hpFrac), 1);
      g.fillStyle(C[13]); g.fillRect(bx + bw / 2, by0 + 11, 1, 9);
      if (this.bossFor !== bs) { this.bossName?.destroy(); this.bossName = txt(this, 0, by0 + 2, fit(bs.cfg.title || bs.cfg.name, 28), 13); this.bossName.x = Math.round((W - this.bossName.width) / 2); this.bossFor = bs; }
      this.bossName.setVisible(true);
    } else this.bossName?.setVisible(false);

    // target bar: lock-on target, or whoever the bow is aimed at
    const tg = !this.bossOn && !dead ? (pl.target || (pl.drawing ? pl.pickTarget(190) : null)) : null;
    this.tgtOn = !!(tg && !tg.dead);
    if (tg && !tg.dead) {
      // below the Arena score lines; right of the bar numbers when those are on
      const oy = this.quickTxt ? this.quickTxt.length * 9 + 2 : 0, tw = settings.largeUi ? 120 : 90;
      const tx = Math.max(Math.round((W - tw) / 2), numsRight + 6), frac = Math.max(0, tg.hp / tg.maxHp);
      g.fillStyle(C[0], 0.7); g.fillRect(tx - 4, 2 + oy, tw + 8, 17);
      g.fillStyle(C[0]); g.fillRect(tx - 1, 11 + oy, tw + 2, 7);
      g.fillStyle(C[1]); g.fillRect(tx, 12 + oy, tw, 5);
      g.fillStyle(C[11]); g.fillRect(tx, 12 + oy, Math.round(tw * frac), 5);
      g.fillStyle(C[12]); g.fillRect(tx, 12 + oy, Math.round(tw * frac), 1);
      if (!this.tgtTxt) this.tgtTxt = txt(this, 0, 3, '', 6);
      const dg = tg.isBoss ? 0 : dangerOfEnemy(tg);
      if (dg && dg !== 2) tip('danger');            // the first foe that is not a fair fight explains the colours (NP6)
      this.tgtTxt.setText(((tg.displayName || tg.cfg.name) + (dg && dg !== 2 ? '  ' + dangerName(dg) : '')).toUpperCase()).setFont(fontKey(dg ? DANGER_COL[dg] : 6)).setVisible(true);
      const ev = stats.elemVs(tg.cfg); if (ev) { const was = this.tgtTxt.text; this.tgtTxt.setText(was + '  ' + ev); if (this.tgtTxt.width > tw + 6) this.tgtTxt.setText(was); }   // PR-13: your weapon's element against it
      this.tgtTxt.x = Math.round(tx + (tw - this.tgtTxt.width) / 2); this.tgtTxt.y = 3 + oy;
    } else this.tgtTxt?.setVisible(false);

    // sneak indicator
    if (pl.sneaking && !this.bossOn && !dead) {
      const seen = this.gs.enemies.getChildren().some((e) => e.alerted && !e.dead);
      const sy = (this.quickTxt ? this.quickTxt.length * 9 + 2 : 0) + (this.tgtOn ? 21 : 3);        // under the target bar when there is one
      g.fillStyle(C[0], 0.65); g.fillRect(W / 2 - 25, sy, 50, 10);
      if (!this.sneakTxt) this.sneakTxt = txt(this, 0, 5, '', 4);
      this.sneakTxt.setText(seen ? 'DETECTED' : 'HIDDEN').setVisible(true);
      this.sneakTxt.x = Math.round(W / 2 - this.sneakTxt.width / 2);
      this.sneakTxt.y = sy + 2;
      this.sneakTxt.setFont(seen ? 'f11' : 'f15');
    } else this.sneakTxt?.setVisible(false);
  }
}
