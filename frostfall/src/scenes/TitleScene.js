import Phaser from 'phaser';
import { W, H, BINDINGS, VERSION } from '../config.js';
import { txt } from '../art/font.js';
import { SnowFx } from '../art/snow.js';
import { keys } from '../systems/keys.js';
import { S, resetState, startNgPlus } from '../systems/state.js';
import { recalc } from '../systems/stats.js';
import { anySave, loadGame, listSaves, fmtTime, readSlot } from '../systems/save.js';
import { MAPS } from '../data/maps.js';
import { music, sfx } from '../audio/sfx.js';
import { dayStamp, dailySeed, dailyMods, startDaily, todaysBest, topBoard } from '../systems/daily.js';
import { MODS, MOD_IDS } from '../data/mods.js';
import { settings, saveSettings } from '../systems/settings.js';
import { setVolume, setChannel } from '../audio/sfx.js';
import { CVD_MODES, applyCvd } from '../systems/access.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.add.rectangle(0, 0, W, H, 0x1c2338).setOrigin(0).setAlpha(0.6);
    // distant mountains, drawn in code
    const g = this.add.graphics();
    g.fillStyle(0x2e3a5c);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 100 - Math.abs(((x * 0.7) % 60) - 30) - 8 * Math.sin(x / 23), 2, 90);
    g.fillStyle(0x4a5c86);
    for (let x = 0; x < W; x += 2) g.fillRect(x, 125 - Math.abs(((x * 1.1 + 20) % 80) - 40) * 0.6, 2, 90);
    g.fillStyle(0xeaf2f8); g.fillRect(0, 160, W, 20);
    g.fillStyle(0xb4c7e0); g.fillRect(0, 160, W, 2);
    const sh = txt(this, W / 2 + 2, 26, 'FROSTFALL', 2).setScale(4).setOrigin(0.5, 0);
    const t1 = txt(this, W / 2, 24, 'FROSTFALL', 6).setScale(4).setOrigin(0.5, 0);
    const t2 = txt(this, 0, 60, 'A TALE OF THE FROZEN NORTH', 4);
    t2.x = Math.floor((W - t2.width) / 2);
    this.add.rectangle(W / 2, 128, 120, 80, 0x0b0e1a, 0.55);
    const done = listSaves().find((x) => readSlot(x.slot)?.data.s.flags?.ending);
    this.ngSlot = done ? done.slot : null;
    this.items = [{ id: 'new', label: 'NEW GAME' }, { id: 'continue', label: 'CONTINUE', off: !anySave() }, ...(done ? [{ id: 'ng', label: 'NEW GAME+' }] : []), { id: 'arena', label: 'ARENA' }, { id: 'daily', label: 'DAILY CHALLENGE' }, { id: 'options', label: 'OPTIONS' }, { id: 'howto', label: 'HOW TO PLAY' }];
    this.sel = this.items[1].off ? 0 : 1;
    this.texts = this.items.map((it, i) => {
      const t = txt(this, 0, 92 + i * 11, it.label, 6);
      t.x = Math.floor((W - t.width) / 2);
      return t;
    });
    this.cursor = txt(this, 0, 92, '\u25B6', 13);
    const hint = txt(this, 0, 172, 'W/S SELECT   E CONFIRM', 4);
    hint.x = Math.floor((W - hint.width) / 2);
    const ver = txt(this, 0, 172, VERSION, 3); ver.x = W - 4 - ver.width;
    // mouse: hover to pick, click to confirm
    const rowAt = (p) => this.texts.findIndex((t) => p.x >= t.x - 14 && p.x <= t.x + t.width + 6 && p.y >= t.y - 2 && p.y <= t.y + 11);
    this.input.on('pointermove', (p) => { if (this.slotMode || this.warm > 0) return; const i = rowAt(p); if (i >= 0 && !this.items[i].off && i !== this.sel) { this.sel = i; sfx.play('move'); } });
    this.input.on('pointerdown', (p) => {
      if (this.warm > 0) return;
      if (this.slotMode) { const i = this.slotTxt.findIndex((t) => p.y >= t.y - 2 && p.y <= t.y + 10); if (i >= 0) { this.slotSel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); } return; }
      const i = rowAt(p);
      if (i >= 0 && !this.items[i].off) { this.sel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); }
    });
    this.snow = new SnowFx(this, 80);
    this.t = 0;
    this.warm = 6;
    this.go = false;
    music.play('village');
  }

  // Daily challenge screen: today's modifiers, your best, and the top scores on this device.
  openDaily() {
    this.dailyMode = true;
    const day = dayStamp(), mods = dailyMods(day);
    const rows = [['DAILY CHALLENGE', 13], [`${Math.floor(day / 10000)}-${String(Math.floor(day / 100) % 100).padStart(2, '0')}-${String(day % 100).padStart(2, '0')}   SEED ${dailySeed(day)}`, 4]];
    for (const m of mods) rows.push([`${MODS[m].name.toUpperCase()}: ${MODS[m].desc.toUpperCase()}`.slice(0, 54), 11]);
    rows.push([`YOUR BEST TODAY: ${todaysBest()}`, 15]);
    const top = topBoard(4);
    rows.push(['TOP SCORES', 6]);
    if (!top.length) rows.push(['NONE YET. BE THE FIRST.', 4]);
    top.forEach((e, i) => rows.push([`${i + 1}. ${e.score}   ${String(e.day).slice(4, 6)}/${String(e.day).slice(6)}   ${e.mods.map((m) => MODS[m].name.split(' ')[0]).join('+')}`.toUpperCase(), 5]));
    rows.push(['E BEGIN   ESC BACK', 4]);
    this.dailyBox = this.add.rectangle(W / 2, 90, 280, 160, 0x0b0e1a, 0.92);
    this.dailyTxt = rows.map(([t, c], i) => { const o = txt(this, 0, 16 + i * 11, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
    this.texts.forEach((t) => t.setVisible(false)); this.cursor.setVisible(false);
  }
  closeDaily() {
    this.dailyMode = false; this.dailyBox?.destroy(); this.dailyTxt?.forEach((t) => t.destroy());
    this.texts.forEach((t) => t.setVisible(true)); this.cursor.setVisible(true);
  }

  // Options: the settings a first-time player needs before they begin (the full list lives in Pause > System).
  openOptions() {
    this.optMode = true; this.optSel = 0; this.warm = 4;
    this.optRows = ['DIFFICULTY', 'CHALLENGE', 'VOLUME', 'MUSIC LVL', 'SFX LVL', 'FULLSCREEN', 'LARGE UI', 'COLOUR MODE'];
    this.optBox = this.add.rectangle(W / 2, 90, 280, 150, 0x0b0e1a, 0.94);
    this.optHead = txt(this, 0, 22, 'OPTIONS', 13); this.optHead.x = Math.floor((W - this.optHead.width) / 2);
    this.optTxt = this.optRows.map((r, i) => txt(this, 50, 34 + i * 12, r, 6));
    this.optVal = this.optRows.map((r, i) => txt(this, 0, 34 + i * 12, '', 5));
    this.optFoot = txt(this, 0, 150, 'W/S MOVE   A/D ADJUST   ESC BACK', 4); this.optFoot.x = Math.floor((W - this.optFoot.width) / 2);
    this.texts.forEach((t) => t.setVisible(false)); this.cursor.setVisible(false);
    this.refreshOptions();
  }
  optValue(r) {
    const lvl = (k) => String(Math.round((settings[k] ?? 1) * 10));
    switch (r) {
      case 'DIFFICULTY': return [settings.difficulty.toUpperCase(), { easy: 8, normal: 5, hard: 11 }[settings.difficulty]];
      case 'CHALLENGE': return [settings.challenge ? MODS[settings.challenge].name.toUpperCase() : 'NONE', settings.challenge ? 11 : 4];
      case 'VOLUME': return [lvl('volume') + '/10', 15]; case 'MUSIC LVL': return [lvl('musicVol') + '/10', 15]; case 'SFX LVL': return [lvl('sfxVol') + '/10', 15];
      case 'FULLSCREEN': return [document.fullscreenElement ? 'ON' : 'OFF', 4]; case 'LARGE UI': return [settings.largeUi ? 'ON' : 'OFF', settings.largeUi ? 8 : 4];
      default: return [String(settings.cvd).toUpperCase(), settings.cvd === 'off' ? 4 : 8];
    }
  }
  refreshOptions() {
    this.optRows.forEach((r, i) => {
      this.optTxt[i].setFont(i === this.optSel ? 'f13' : 'f6');
      const [v, c] = this.optValue(r); this.optVal[i].setText(v).setFont('f' + c); this.optVal[i].x = W - 50 - this.optVal[i].width;
    });
  }
  optAdjust(dir) {
    const r = this.optRows[this.optSel], DIFFS = ['easy', 'normal', 'hard'];
    if (r === 'DIFFICULTY') settings.difficulty = DIFFS[(DIFFS.indexOf(settings.difficulty) + dir + 3) % 3];
    else if (r === 'CHALLENGE') { const l = [null, ...MOD_IDS], i = Math.max(0, l.indexOf(settings.challenge || null)); settings.challenge = l[(i + dir + l.length) % l.length]; }
    else if (r === 'VOLUME') setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10);
    else if (r === 'MUSIC LVL') setChannel('music', Math.round(((settings.musicVol ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'SFX LVL') setChannel('sfx', Math.round(((settings.sfxVol ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'FULLSCREEN') { this.scale.toggleFullscreen(); }
    else if (r === 'LARGE UI') settings.largeUi = !settings.largeUi;
    else { settings.cvd = CVD_MODES[(CVD_MODES.indexOf(settings.cvd) + dir + CVD_MODES.length) % CVD_MODES.length]; applyCvd(); }
    saveSettings(); sfx.play('select'); this.refreshOptions();
  }
  closeOptions() {
    this.optMode = false; [this.optBox, this.optHead, this.optFoot, ...this.optTxt, ...this.optVal].forEach((o) => o.destroy());
    this.texts.forEach((t) => t.setVisible(true)); this.cursor.setVisible(true);
  }

  // How to play: a one-page card for people who have never seen the game.
  openHowTo() {
    this.howMode = true; this.warm = 4;
    const rows = [['HOW TO PLAY', 13], ['', 4], ['MOVE  WASD / STICK / TOUCH PAD', 6], ['SWORD J   BOW K (HOLD)   SPELL L', 6], ['DODGE ROLL  SPACE  (SLIPS THROUGH BLOWS)', 6], ['BLOCK F (HOLD)   RAISE IT LATE TO PARRY', 6], ['SNEAK C   TALK / OPEN / REST  E', 6], ['PACK I   JOURNAL O   MAP M   PAUSE ESC', 6], ['', 4],
      ['STAMINA IS YOUR REAL HEALTH BAR. FIGHT IN BURSTS.', 15], ['NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU.', 15], ['GEAR AND PREPARATION MATTER MORE THAN LEVELS.', 15], ['REST AT CAMPFIRES TO SAVE AND FAST TRAVEL.', 15], ['', 4], ['EVERY PICTURE, SONG AND WORLD IS MADE IN CODE.', 3], ['E OR ESC TO GO BACK', 4]];
    this.howBox = this.add.rectangle(W / 2, 90, 300, 164, 0x0b0e1a, 0.94);
    this.howTxt = rows.map(([t, c], i) => { const o = txt(this, 0, 14 + i * 10, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
    this.texts.forEach((t) => t.setVisible(false)); this.cursor.setVisible(false);
  }
  closeHowTo() {
    this.howMode = false; this.howBox.destroy(); this.howTxt.forEach((t) => t.destroy());
    this.texts.forEach((t) => t.setVisible(true)); this.cursor.setVisible(true);
  }

  startSaved() {
    this.scene.start('Game', { map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
  }

  openSlots(have) {
    this.slotMode = true; this.slotSel = 0; this.have = have;
    this.slotTxt = have.map((h, i) => {
      const t = txt(this, 0, 96 + i * 12, `SLOT ${h.slot}  ${MAPS[h.info.map].name.slice(0, 14)}  LV${h.info.level}  ${fmtTime(h.info.playtime)}`, 6);
      t.x = Math.floor((W - t.width) / 2);
      return t;
    });
    this.texts.forEach((t) => t.setVisible(false)); this.cursor.setVisible(false);
  }

  updateSlots() {
    if (this.warm > 0) { this.warm--; return; }
    this.slotTxt.forEach((t, i) => { t.setFont(i === this.slotSel ? 'f13' : 'f6'); });
    const t = this.slotTxt[this.slotSel];
    this.slotCursor = this.slotCursor || txt(this, 0, 0, '\u25B6', 13);
    this.slotCursor.setPosition(t.x - 12, t.y).setVisible(true);
    if (keys.pressed('down')) { this.slotSel = (this.slotSel + 1) % this.have.length; sfx.play('move'); }
    if (keys.pressed('up')) { this.slotSel = (this.slotSel + this.have.length - 1) % this.have.length; sfx.play('move'); }
    if (keys.pressed('pause')) { this.slotMode = false; this.slotTxt.forEach((x) => x.destroy()); this.slotCursor.setVisible(false); this.texts.forEach((x) => x.setVisible(true)); this.cursor.setVisible(true); sfx.play('back'); this.warm = 3; return; }
    if (keys.pressed('interact')) { if (loadGame(this.have[this.slotSel].slot)) { sfx.play('select'); this.startSaved(); } }
  }

  update(_, ms) {
    const dt = ms / 1000;
    this.t += dt;
    this.snow.update(dt);
    if (this.slotMode) { this.updateSlots(); return; }
    if (this.optMode) {
      if (this.warm > 0) { this.warm--; return; }
      if (keys.pressed('pause') || keys.pressed('roll')) { this.closeOptions(); sfx.play('back'); return; }
      const n = this.optRows.length;
      if (keys.pressed('down')) { this.optSel = (this.optSel + 1) % n; sfx.play('move'); }
      if (keys.pressed('up')) { this.optSel = (this.optSel + n - 1) % n; sfx.play('move'); }
      if (keys.pressed('left')) this.optAdjust(-1);
      if (keys.pressed('right') || keys.pressed('interact')) this.optAdjust(1);
      this.refreshOptions();
      return;
    }
    if (this.howMode) {
      if (this.warm > 0) { this.warm--; return; }
      if (keys.pressed('pause') || keys.pressed('interact') || keys.pressed('roll')) { this.closeHowTo(); sfx.play('back'); }
      return;
    }
    if (this.dailyMode) {
      if (this.warm > 0) { this.warm--; return; }
      if (keys.pressed('pause')) { this.closeDaily(); sfx.play('back'); }
      else if (keys.pressed('interact')) { sfx.play('select'); startDaily(); recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; this.go = true; this.scene.start('Game', { map: 'village', spawn: 'start' }); }
      return;
    }
    this.items.forEach((it, i) => this.texts[i].setFont(it.off ? 'f4' : i === this.sel ? 'f13' : 'f6'));
    const t = this.texts[this.sel];
    this.cursor.setPosition(t.x - 12, t.y).setVisible(true);
    if (this.warm > 0) { this.warm--; return; }
    if (this.go) return;
    if (keys.pressed('down') || keys.pressed('up')) {
      const n = this.items.length;
      let s = this.sel;
      do { s = (s + (keys.pressed('down') ? 1 : n - 1)) % n; } while (this.items[s].off);
      if (s !== this.sel) { this.sel = s; sfx.play('move'); }
    }
    if (keys.pressed('interact') || keys.pressed('roll')) {
      sfx.play('select');
      this.go = true;
      if (this.items[this.sel].id === 'arena') { music.stop(); this.scene.start('ArenaSetup'); return; }
      if (this.items[this.sel].id === 'daily') { this.go = false; this.openDaily(); return; }
      if (this.items[this.sel].id === 'options') { this.go = false; this.openOptions(); return; }
      if (this.items[this.sel].id === 'howto') { this.go = false; this.openHowTo(); return; }
      if (this.items[this.sel].id === 'ng') {
        if (loadGame(this.ngSlot)) { startNgPlus(); recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; this.scene.start('Game', { map: 'village', spawn: 'start' }); } else this.go = false;
      } else if (this.items[this.sel].id === 'new') {
        resetState();
        if (settings.challenge && MODS[settings.challenge]) S.mods = { [settings.challenge]: true };
        this.scene.start('Intro');
      } else {
        const have = listSaves().filter((x) => x.info);
        if (have.length > 1) { this.go = false; this.openSlots(have); }
        else if (have.length === 1 && loadGame(have[0].slot)) this.startSaved();
        else this.go = false;
      }
    }
  }
}
