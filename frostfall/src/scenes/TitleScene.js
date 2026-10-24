import Phaser from 'phaser';
import { W, BINDINGS, VERSION, BUILD } from '../config.js';
import { txt } from '../art/font.js';
import { SnowFx } from '../art/snow.js';
import { TitleBackdrop, frostLogo } from '../art/scenery.js';
import { keys, padActive } from '../systems/keys.js';
import { S, resetState, startNgPlus } from '../systems/state.js';
import { recalc } from '../systems/stats.js';
import { anySave, loadGame, listSaves, fmtTime, slotState, deleteSave, rescueInfo, loadRescue, dropRescue, storage, tabs, SLOTS } from '../systems/save.js';
import { openSaveTools } from '../ui/savetools.js';
import { overlayOpen } from '../ui/overlay.js';
import { bus } from '../systems/bus.js';
import { fit, fontKey } from '../art/font.js';
import { MAPS, prebuildRegion } from '../data/maps.js';
import { regionOfMap } from '../data/regions.js';
import { readSlot } from '../systems/save.js';
import { music, sfx } from '../audio/sfx.js';
import { dayStamp, dailySeed, dailyMods, startDaily, todaysBest, topBoard } from '../systems/daily.js';
import { MODS, MOD_IDS } from '../data/mods.js';
import { settings, saveSettings } from '../systems/settings.js';
import { setVolume, setChannel } from '../audio/sfx.js';
import { CVD_MODES, applyCvd, padHint, prompt } from '../systems/access.js';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    // VX-24: drifting mountains, an aurora, the hero by a campfire on a rise, and a hand-shaded logo (art/scenery.js)
    this.backdrop = new TitleBackdrop(this);
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(0xeaf2f8); g.fillRect(0, 160, W, 20);
    g.fillStyle(0xb4c7e0); g.fillRect(0, 160, W, 2);
    this.add.image(W / 2, 20, frostLogo(this)).setOrigin(0.5, 0);
    const t2 = txt(this, 0, 60, 'A TALE OF THE FROZEN NORTH', 4);
    t2.x = Math.floor((W - t2.width) / 2);
    const done = listSaves().find((x) => x.info?.ending);
    this.ngSlot = done ? done.slot : null;
    this.items = [{ id: 'new', label: 'NEW GAME' }, { id: 'continue', label: 'CONTINUE', off: !anySave() && !rescueInfo() }, ...(done ? [{ id: 'ng', label: 'NEW GAME+' }] : []), { id: 'arena', label: 'ARENA' }, { id: 'daily', label: 'DAILY CHALLENGE' }, { id: 'options', label: 'OPTIONS' }, { id: 'howto', label: 'HOW TO PLAY' }];
    // the menu sits above the snow line (y 160) however many entries there are
    const top = 76, step = this.items.length > 7 ? 10 : 11;
    this.menuBox = this.add.rectangle(W / 2, top + (this.items.length * step) / 2 - 1, 128, this.items.length * step + 8, 0x0b0e1a, 0.6);
    this.sel = this.items[1].off ? 0 : 1;
    this.texts = this.items.map((it, i) => {
      const t = txt(this, 0, top + i * step, it.label, 6);
      t.x = Math.floor((W - t.width) / 2);
      return t;
    });
    this.cursor = txt(this, 0, top, '\u25B6', 13);
    // why saving may not work here, said up front
    const warn = !storage.ok ? 'SAVES ARE OFF IN THIS BROWSER: USE OPTIONS > SAVES' : tabs.other ? 'OPEN IN ANOTHER TAB: THIS TAB WILL NOT SAVE' : '';
    if (warn) { const w = txt(this, 0, 66, warn, 11); w.x = Math.floor((W - w.width) / 2); }
    const hint = txt(this, 0, 172, '', 2);           // dark text: it sits on the snow
    this.hintTxt = hint;
    this.footPad = null;                        // the footer follows the device in use (redrawn in update when it changes)
    this.footer = () => { if (this.footPad === padActive()) return; this.footPad = padActive(); hint.setText(padHint('W/S SELECT   E CONFIRM')); hint.x = Math.floor((W - hint.width) / 2); };
    this.footer();
    const ver = txt(this, 0, 172, `${VERSION} ${BUILD.split('-')[0]}`, 2); ver.x = W - 4 - ver.width;
    this.verTxt = ver;
    // mouse: hover to pick, click to confirm
    const rowAt = (p) => this.texts.findIndex((t) => p.x >= t.x - 14 && p.x <= t.x + t.width + 6 && p.y >= t.y - 2 && p.y <= t.y + 11);
    this.input.on('pointermove', (p) => { if (this.slotMode || this.ngMode || this.warm > 0) return; const i = rowAt(p); if (i >= 0 && !this.items[i].off && i !== this.sel) { this.sel = i; sfx.play('move'); } });
    this.input.on('pointerdown', (p) => {
      if (this.warm > 0) return;
      if (this.ngMode) { const i = this.ngRows.findIndex((t) => p.y >= t.y - 2 && p.y <= t.y + 10); if (i >= 0) { this.ngSel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); } return; }
      if (this.slotMode) { const i = this.slotTxt.findIndex((t) => p.y >= t.y - 2 && p.y <= t.y + 19); if (i >= 0) { if (i !== this.slotSel) { this.slotSel = i; this.slotArm = null; this.refreshSlots(); return; } keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); } return; }
      const i = rowAt(p);
      if (i >= 0 && !this.items[i].off) { this.sel = i; keys._press(BINDINGS.interact[0]); setTimeout(() => keys._release(BINDINGS.interact[0]), 60); }
    });
    // while the menu is up, build the saved game's overworld region so CONTINUE drops you straight in
    this.time.delayedCall(1500, () => {
      if (!this.scene.isActive()) return;
      try { const d = readSlot(settings.slot)?.data?.s; if (d?.seed != null) prebuildRegion(regionOfMap(d.map), d.seed); } catch (e) { console.warn('prebuild skipped', e); }
    });
    bus.emit('scene:title');
    this.snow = new SnowFx(this, 80);
    this.snow.g.setDepth(5);                  // behind every overlay box on this screen
    this.t = 0;
    this.warm = 6;
    this.go = false;
    music.play('village');
  }

  // Overlay boxes draw above the snow and hide the main menu, its box and footer underneath.
  lift(...objs) { for (const o of objs.flat()) o?.setDepth?.(o.type === 'Rectangle' ? 20 : 21); }
  showMain(v) { this.texts.forEach((t) => t.setVisible(v)); this.cursor.setVisible(v); this.menuBox.setVisible(v); this.hintTxt.setVisible(v); }

  // Daily challenge screen: today's modifiers, your best, and the top scores on this device.
  openDaily() {
    this.dailyMode = true;
    const day = dayStamp(), mods = dailyMods(day);
    const rows = [['DAILY CHALLENGE', 13], [`${Math.floor(day / 10000)}-${String(Math.floor(day / 100) % 100).padStart(2, '0')}-${String(day % 100).padStart(2, '0')}   SEED ${dailySeed(day)}`, 4]];
    for (const m of mods) rows.push([fit(`${MODS[m].name.toUpperCase()}: ${MODS[m].desc.toUpperCase()}`, 44), 11]);
    rows.push([`YOUR BEST TODAY: ${todaysBest()}`, 15]);
    const top = topBoard(4);
    rows.push(['TOP SCORES', 6]);
    if (!top.length) rows.push(['NONE YET. BE THE FIRST.', 4]);
    top.forEach((e, i) => rows.push([`${i + 1}. ${e.score}   ${String(e.day).slice(4, 6)}/${String(e.day).slice(6)}   ${e.mods.map((m) => MODS[m].name.split(' ')[0]).join('+')}`.toUpperCase(), 5]));
    rows.push([padHint('E BEGIN   ESC BACK'), 4]);
    this.dailyBox = this.add.rectangle(W / 2, 90, 280, 160, 0x0b0e1a, 0.92);
    this.dailyTxt = rows.map(([t, c], i) => { const o = txt(this, 0, 16 + i * 11, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
    this.lift(this.dailyBox, this.dailyTxt);
    this.showMain(false);
  }
  // New Game+ asks first: it starts the story over with your character, so it should never happen by accident.
  openNgConfirm() {
    this.ngMode = true; this.ngSel = 0; this.warm = 4;
    this.ngBox = this.add.rectangle(W / 2, 90, 280, 110, 0x0b0e1a, 0.94);
    const lines = [['START NEW GAME+?', 13, 38], ['YOUR CHARACTER AND GEAR CARRY OVER.', 6, 54], ['THE WORLD AND QUESTS START AGAIN, AND', 6, 65], ['ENEMIES ARE TOUGHER.', 6, 76]];
    this.ngTxt = lines.map(([t, c, y]) => { const o = txt(this, 0, y, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
    this.ngRows = ['NO, GO BACK', 'YES, START NEW GAME+'].map((t, i) => { const o = txt(this, 0, 94 + i * 12, t, 6); o.x = Math.floor((W - o.width) / 2); return o; });
    this.ngFoot = txt(this, 0, 126, padHint('W/S MOVE   E CHOOSE   ESC BACK'), 4); this.ngFoot.x = Math.floor((W - this.ngFoot.width) / 2);
    this.lift(this.ngBox, this.ngTxt, this.ngRows, this.ngFoot);
    this.showMain(false);
  }
  closeNgConfirm() {
    this.ngMode = false; this.ngBox?.destroy(); this.ngTxt?.forEach((t) => t.destroy()); this.ngRows?.forEach((t) => t.destroy()); this.ngFoot?.destroy(); this.ngCursor?.destroy(); this.ngCursor = null;
    this.showMain(true);
  }
  startNg() {
    if (loadGame(this.ngSlot)) { startNgPlus(); recalc(); S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; this.go = true; this.scene.start('Game', { map: 'village', spawn: 'start' }); } else { this.go = false; this.closeNgConfirm(); }
  }
  closeDaily() {
    this.dailyMode = false; this.dailyBox?.destroy(); this.dailyTxt?.forEach((t) => t.destroy());
    this.showMain(true);
  }

  // Options: the settings a first-time player needs before they begin, including the comfort ones (flashes, shake, motion)
  // that matter before the first fight. The full list lives in Pause > System.
  openOptions() {
    this.optMode = true; this.optSel = 0; this.warm = 4;
    this.optRows = ['DIFFICULTY', 'CHALLENGE', 'VOLUME', 'MUSIC LVL', 'SFX LVL', 'AMB LVL', 'FULLSCREEN', 'LARGE UI', 'COLOUR MODE', 'FLASHES', 'SCREEN SHAKE', 'REDUCE MOTION', 'SAVES & BUG REPORT'];
    this.optBox = this.add.rectangle(W / 2, 89, 290, 160, 0x0b0e1a, 0.96);
    this.optHead = txt(this, 0, 14, 'OPTIONS', 13); this.optHead.x = Math.floor((W - this.optHead.width) / 2);
    this.optTxt = this.optRows.map((r, i) => txt(this, 44, 26 + i * 9, r, 6));
    this.optVal = this.optRows.map((r, i) => txt(this, 0, 26 + i * 9, '', 5));
    this.optDesc = txt(this, 44, 148, '', 3);
    this.optFoot = txt(this, 0, 158, padHint('W/S MOVE   A/D ADJUST   ESC BACK'), 4); this.optFoot.x = Math.floor((W - this.optFoot.width) / 2);
    this.lift(this.optBox, this.optHead, this.optTxt, this.optVal, this.optDesc, this.optFoot);
    this.showMain(false);
    this.refreshOptions();
  }
  optValue(r) {
    const lvl = (k) => String(Math.round((settings[k] ?? 1) * 10));
    switch (r) {
      case 'DIFFICULTY': return [settings.difficulty.toUpperCase(), { easy: 8, normal: 5, hard: 11 }[settings.difficulty]];
      case 'CHALLENGE': return [settings.challenge ? MODS[settings.challenge].name.toUpperCase() : 'NONE', settings.challenge ? 11 : 4];
      case 'VOLUME': return [lvl('volume') + '/10', 15]; case 'MUSIC LVL': return [lvl('musicVol') + '/10', 15]; case 'SFX LVL': return [lvl('sfxVol') + '/10', 15]; case 'AMB LVL': return [lvl('ambVol') + '/10', 15];
      case 'FULLSCREEN': return document.fullscreenEnabled === false ? ['NOT HERE', 3] : [document.fullscreenElement ? 'ON' : 'OFF', 4];
      case 'LARGE UI': return [settings.largeUi ? 'ON' : 'OFF', settings.largeUi ? 8 : 4];
      case 'COLOUR MODE': return [String(settings.cvd).toUpperCase(), settings.cvd === 'off' ? 4 : 8];
      case 'FLASHES': return [settings.flashes ? 'ON' : 'OFF', settings.flashes ? 4 : 8];
      case 'SCREEN SHAKE': return [settings.shake >= 1 ? 'FULL' : settings.shake > 0 ? 'HALF' : 'OFF', settings.shake >= 1 ? 4 : 8];
      case 'REDUCE MOTION': return [settings.reduceMotion ? 'ON' : 'OFF', settings.reduceMotion ? 8 : 4];
      default: return ['OPEN', 15];
    }
  }
  optHelp(r) {
    switch (r) {
      case 'DIFFICULTY': return 'EASY / NORMAL / HARD. CHANGE IT ANY TIME IN PAUSE.';
      case 'CHALLENGE': return settings.challenge ? fit(MODS[settings.challenge].desc.toUpperCase(), 40) : 'AN OPTIONAL TWIST FOR THE NEXT NEW GAME.';
      case 'FULLSCREEN': return document.fullscreenEnabled === false ? 'NOT AVAILABLE HERE. ADD TO HOME SCREEN.' : '';
      case 'AMB LVL': return 'WIND, WATER, BIRDS AND TOWN SOUNDS.';
      case 'LARGE UI': return 'BIGGER BARS AND NUMBERS ON THE HUD.';
      case 'COLOUR MODE': return 'COLOUR-BLIND FRIENDLY PALETTES.';
      case 'FLASHES': return 'SCREEN FLASHES AND THE LOW-HEALTH PULSE.';
      case 'SCREEN SHAKE': return 'HOW MUCH THE SCREEN SHAKES ON BIG HITS.';
      case 'REDUCE MOTION': return 'STILL MARKERS, NO BLINKING, LESS SNOW.';
      case 'SAVES & BUG REPORT': return 'EXPORT / IMPORT SAVES, COPY A BUG REPORT.';
      default: return '';
    }
  }
  refreshOptions() {
    this.optRows.forEach((r, i) => {
      this.optTxt[i].setFont(i === this.optSel ? 'f13' : 'f6');
      const [v, c] = this.optValue(r); this.optVal[i].setText(v).setFont(fontKey(c)); this.optVal[i].x = W - 44 - this.optVal[i].width;
    });
    this.optDesc.setText(this.optHelp(this.optRows[this.optSel]));
  }
  optAdjust(dir) {
    const r = this.optRows[this.optSel], DIFFS = ['easy', 'normal', 'hard'];
    if (r === 'DIFFICULTY') settings.difficulty = DIFFS[(DIFFS.indexOf(settings.difficulty) + dir + 3) % 3];
    else if (r === 'CHALLENGE') { const l = [null, ...MOD_IDS], i = Math.max(0, l.indexOf(settings.challenge || null)); settings.challenge = l[(i + dir + l.length) % l.length]; }
    else if (r === 'VOLUME') setVolume(Math.round((settings.volume + dir * 0.1) * 10) / 10);
    else if (r === 'MUSIC LVL') setChannel('music', Math.round(((settings.musicVol ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'SFX LVL') setChannel('sfx', Math.round(((settings.sfxVol ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'AMB LVL') setChannel('amb', Math.round(((settings.ambVol ?? 1) + dir * 0.1) * 10) / 10);
    else if (r === 'FULLSCREEN') { if (document.fullscreenEnabled !== false) this.scale.toggleFullscreen(); }
    else if (r === 'LARGE UI') settings.largeUi = !settings.largeUi;
    else if (r === 'COLOUR MODE') { settings.cvd = CVD_MODES[(CVD_MODES.indexOf(settings.cvd) + dir + CVD_MODES.length) % CVD_MODES.length]; applyCvd(); }
    else if (r === 'FLASHES') settings.flashes = !settings.flashes;
    else if (r === 'SCREEN SHAKE') { const L = [0, 0.5, 1]; settings.shake = L[(L.indexOf(settings.shake) + (dir > 0 ? 1 : 2)) % 3]; }
    else if (r === 'REDUCE MOTION') settings.reduceMotion = !settings.reduceMotion;
    else if (r === 'SAVES & BUG REPORT') { if (dir > 0) openSaveTools(this, { onImported: () => { this.closeOptions(); this.scene.restart(); } }); return; }
    saveSettings(); sfx.play('select'); this.refreshOptions();
  }
  closeOptions() {
    this.optMode = false; [this.optBox, this.optHead, this.optFoot, this.optDesc, ...this.optTxt, ...this.optVal].forEach((o) => o.destroy());
    this.showMain(true);
  }

  // How to play: a one-page card for people who have never seen the game.
  openHowTo() {
    this.howMode = true; this.warm = 4;
    const rows = [['HOW TO PLAY', 13], ['', 4], ...(padActive() ? [['MOVE  LEFT STICK', 6], [`SWORD ${prompt('KeyJ')}   BOW ${prompt('KeyK')} (HOLD)   SPELL ${prompt('KeyL')}`, 6], [`DODGE ROLL  ${prompt('Space')}  (SLIPS THROUGH BLOWS)`, 6], [`BLOCK ${prompt('KeyF')} (HOLD)   RAISE IT LATE TO PARRY`, 6], [`SNEAK ${prompt('KeyC')}   TALK / OPEN / REST  ${prompt('KeyE')}`, 6], [`MENU ${prompt('Escape')}   (PACK, JOURNAL, MAP)`, 6]]
        : [[`MOVE  ${['KeyW', 'KeyA', 'KeyS', 'KeyD'].map(prompt).join('')} / STICK / TOUCH PAD`, 6], [`SWORD ${prompt('KeyJ')}   BOW ${prompt('KeyK')} (HOLD)   SPELL ${prompt('KeyL')}`, 6], [`DODGE ROLL  ${prompt('Space')}  (SLIPS THROUGH BLOWS)`, 6], [`BLOCK ${prompt('KeyF')} (HOLD)   RAISE IT LATE TO PARRY`, 6], [`SNEAK ${prompt('KeyC')}   TALK / OPEN / REST  ${prompt('KeyE')}`, 6], [`PACK ${prompt('KeyI')}   JOURNAL ${prompt('KeyO')}   MAP ${prompt('KeyM')}   PAUSE ${prompt('Escape')}`, 6]]), ['', 4],
      ['STAMINA IS YOUR REAL HEALTH BAR. FIGHT IN BURSTS.', 15], ['NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU.', 15], ['GEAR AND PREPARATION MATTER MORE THAN LEVELS.', 15], ['REST AT CAMPFIRES TO SAVE AND FAST TRAVEL.', 15], ['', 4], ['EVERY PICTURE, SONG AND WORLD IS MADE IN CODE.', 3], [`${prompt('KeyE')} OR ${prompt('Escape')} TO GO BACK`, 4]];
    this.howBox = this.add.rectangle(W / 2, 90, 300, 164, 0x0b0e1a, 0.94);
    this.howTxt = rows.map(([t, c], i) => { const o = txt(this, 0, 14 + i * 10, t, c); o.x = Math.floor((W - o.width) / 2); return o; });
    this.lift(this.howBox, this.howTxt);
    this.showMain(false); this.verTxt.setVisible(false);
  }
  closeHowTo() {
    this.howMode = false; this.howBox.destroy(); this.howTxt.forEach((t) => t.destroy());
    this.showMain(true); this.verTxt.setVisible(true);
  }

  startSaved() {
    this.scene.start('Game', { map: S.map, spawn: S.spawn, pos: S.x != null ? { x: S.x, y: S.y } : null });
  }

  // The slot picker, for CONTINUE (mode 'load') and NEW GAME (mode 'new'). Every slot is listed with where, level,
  // playtime and when it was saved; an occupied slot asks before NEW GAME overwrites it; DELETE asks too.
  openSlots(mode) {
    this.slotMode = mode; this.slotSel = 0; this.slotArm = null; this.warm = 4;
    const rows = [];
    const res = mode === 'load' ? rescueInfo() : null;
    if (res) rows.push({ rescue: true, info: res });
    for (let i = 1; i <= SLOTS; i++) rows.push({ slot: i, info: listSaves()[i - 1].info, state: slotState(i) });
    this.slotRows = rows;
    if (mode === 'load') { const i = rows.findIndex((r) => r.slot === settings.slot && r.info); this.slotSel = i >= 0 ? i : Math.max(0, rows.findIndex((r) => r.info)); }
    else { const i = rows.findIndex((r) => r.state === 'empty'); this.slotSel = i >= 0 ? i : 0; }
    const h = 34 + rows.length * 22;
    this.slotBox = this.add.rectangle(W / 2, 84, 292, h, 0x0b0e1a, 0.96);
    const y0 = 84 - h / 2;
    this.slotHead = txt(this, 0, y0 + 6, mode === 'load' ? 'CONTINUE WHICH GAME?' : 'START A NEW GAME IN WHICH SLOT?', 13); this.slotHead.x = Math.floor((W - this.slotHead.width) / 2);
    const when = (t) => { if (!t) return ''; const d = new Date(t); return `${d.getDate()} ${'JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC'.split(' ')[d.getMonth()]} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
    this.slotTxt = []; this.slotSub = [];
    rows.forEach((r, i) => {
      const y = y0 + 20 + i * 22;
      let a, b;
      if (r.rescue) { a = `RESCUE  ${fit(MAPS[r.info.map]?.name || r.info.map, 18)}  LV ${r.info.level}`; b = `KEPT AFTER A CRASH ${when(r.t || r.info.t)}`; }
      else if (r.info) { a = `SLOT ${r.slot}  ${fit(MAPS[r.info.map]?.name || r.info.map, 20)}  LV ${r.info.level}`; b = `${fmtTime(r.info.playtime)}  SAVED ${when(r.info.t)}${r.info.ending ? '  ✓ ENDING' : ''}${r.info.ngPlus ? '  NG+' + r.info.ngPlus : ''}${r.info.recovered ? '  (BACKUP)' : ''}`; }
      else if (r.state === 'damaged') { a = `SLOT ${r.slot}  DAMAGED`; b = 'CANNOT BE READ. THE FILE IS KEPT'; }
      else { a = `SLOT ${r.slot}  EMPTY`; b = ''; }
      this.slotTxt.push(txt(this, 40, y, a, 6)); this.slotSub.push(txt(this, 40, y + 9, b, r.state === 'damaged' ? 11 : 4));
    });
    this.slotFoot = txt(this, 0, y0 + h - 12, '', 4);
    this.slotCursor = txt(this, 28, 0, '\u25B6', 13);
    this.lift(this.slotBox, this.slotHead, this.slotTxt, this.slotSub, this.slotFoot, this.slotCursor);
    this.showMain(false);
    this.refreshSlots();
  }
  refreshSlots() {
    const r = this.slotRows[this.slotSel];
    this.slotTxt.forEach((t, i) => t.setFont(i === this.slotSel ? 'f13' : (this.slotRows[i].info || this.slotMode === 'new') ? 'f6' : fontKey(3)));
    this.slotCursor.setPosition(28, this.slotTxt[this.slotSel].y);
    let foot;
    if (this.slotArm === 'delete') foot = `DELETE ${r.rescue ? 'THE RESCUE SAVE' : 'SLOT ' + r.slot}? V AGAIN TO DELETE`;
    else if (this.slotArm === 'overwrite') foot = `OVERWRITE SLOT ${r.slot}? E AGAIN TO START OVER`;
    else foot = `W/S SLOT  E ${this.slotMode === 'load' ? 'LOAD' : 'START'}${r.info || r.state === 'damaged' ? '  V DELETE' : ''}  ESC BACK`;
    this.slotFoot.setText(padHint(foot, 46)).setFont(this.slotArm ? 'f11' : fontKey(4));
    this.slotFoot.x = Math.floor((W - this.slotFoot.width) / 2);
  }
  closeSlots() {
    this.slotMode = null;
    [this.slotBox, this.slotHead, this.slotFoot, this.slotCursor, ...this.slotTxt, ...this.slotSub].forEach((o) => o.destroy());
    this.showMain(true); this.warm = 3;
  }
  updateSlots() {
    if (this.warm > 0) { this.warm--; return; }
    const n = this.slotRows.length, r = this.slotRows[this.slotSel];
    if (keys.repeat('down') || keys.repeat('up')) { this.slotSel = (this.slotSel + (keys.repeat('down') ? 1 : n - 1)) % n; this.slotArm = null; sfx.play('move'); this.refreshSlots(); return; }
    if (keys.pressed('pause') || keys.back()) { if (this.slotArm) { this.slotArm = null; this.refreshSlots(); } else this.closeSlots(); sfx.play('back'); return; }
    if (keys.pressed('ammo') && (r.info || r.state === 'damaged')) {
      if (this.slotArm !== 'delete') { this.slotArm = 'delete'; sfx.play('alert'); this.refreshSlots(); return; }
      if (r.rescue) dropRescue(); else deleteSave(r.slot);
      sfx.play('back'); const mode = this.slotMode; this.closeSlots();
      if (mode === 'load' && !anySave() && !rescueInfo()) { this.scene.restart(); return; }
      this.openSlots(mode); return;
    }
    if (!keys.pressed('interact')) return;
    if (this.slotMode === 'load') {
      if (r.rescue) { if (loadRescue()) { sfx.play('select'); this.startSaved(); } return; }
      if (!r.info) { sfx.play('nostamina'); return; }
      if (loadGame(r.slot)) { sfx.play('select'); this.startSaved(); }
      return;
    }
    // NEW GAME into this slot
    if ((r.info || r.state === 'damaged') && this.slotArm !== 'overwrite') { this.slotArm = 'overwrite'; sfx.play('alert'); this.refreshSlots(); return; }
    settings.slot = r.slot; saveSettings();
    sfx.play('select');
    this.go = true;
    resetState();
    if (settings.challenge && MODS[settings.challenge]) S.mods = { [settings.challenge]: true };
    this.scene.start('Intro');
  }

  update(_, ms) {
    const dt = ms / 1000;
    this.t += dt;
    this.snow.update(dt);
    this.backdrop.update(dt);
    this.footer();
    if (overlayOpen()) return;                       // a save-tools panel is open over the canvas
    if (this.slotMode) { this.updateSlots(); return; }
    if (this.optMode) {
      if (this.warm > 0) { this.warm--; return; }
      if (keys.pressed('pause') || keys.pressed('roll')) { this.closeOptions(); sfx.play('back'); return; }
      const n = this.optRows.length;
      if (keys.repeat('down')) { this.optSel = (this.optSel + 1) % n; sfx.play('move'); }
      if (keys.repeat('up')) { this.optSel = (this.optSel + n - 1) % n; sfx.play('move'); }
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
    if (this.ngMode) {
      if (this.warm > 0) { this.warm--; return; }
      this.ngRows.forEach((o, i) => o.setFont(i === this.ngSel ? 'f13' : 'f6'));
      this.ngCursor = this.ngCursor || txt(this, 0, 0, '\u25B6', 13);
      this.ngCursor.setPosition(this.ngRows[this.ngSel].x - 12, this.ngRows[this.ngSel].y);
      if (keys.repeat('down') || keys.repeat('up')) { this.ngSel = 1 - this.ngSel; sfx.play('move'); }
      if (keys.pressed('pause') || keys.back()) { this.closeNgConfirm(); sfx.play('back'); }
      else if (keys.pressed('interact')) { if (this.ngSel === 1) { sfx.play('select'); this.startNg(); } else { this.closeNgConfirm(); sfx.play('back'); } }
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
    if (keys.repeat('down') || keys.repeat('up')) {
      const n = this.items.length;
      let s = this.sel;
      do { s = (s + (keys.repeat('down') ? 1 : n - 1)) % n; } while (this.items[s].off);
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
        this.go = false; this.openNgConfirm(); return;
      } else if (this.items[this.sel].id === 'new') {
        // no saves yet: straight in (slot 1). Otherwise choose a slot, so an old game is never overwritten by accident.
        if (!listSaves().some((x) => x.info || slotState(x.slot) === 'damaged')) {
          settings.slot = 1; saveSettings(); resetState();
          if (settings.challenge && MODS[settings.challenge]) S.mods = { [settings.challenge]: true };
          this.scene.start('Intro');
        } else { this.go = false; this.openSlots('new'); }
      } else {
        const have = listSaves().filter((x) => x.info);
        if (have.length === 1 && !rescueInfo()) { if (loadGame(have[0].slot)) this.startSaved(); else this.go = false; }
        else { this.go = false; this.openSlots('load'); }
      }
    }
  }
}
