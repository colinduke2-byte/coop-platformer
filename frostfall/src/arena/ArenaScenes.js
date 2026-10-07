// Arena Mode screens: hero pick and the results card. Both are plain scenes; the fight itself runs in GameScene on the 'pit' map.
import Phaser from 'phaser';
import { W, H } from '../config.js';
import { txt } from '../art/font.js';
import { SnowFx } from '../art/snow.js';
import { keys } from '../systems/keys.js';
import { S } from '../systems/state.js';
import { sfx, music } from '../audio/sfx.js';
import { HEROES, MODES, dailyArena, beginQuickRun, hasOwnHero, loadRecords, submitRecord, heroById, modeById, recordKey, arenaUnlocked, nextRoomAt } from './heroes.js';
import { ARENAS, arenaById } from './arenas.js';

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export class ArenaSetupScene extends Phaser.Scene {
  constructor() { super('ArenaSetup'); }
  create() {
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.add.rectangle(0, 0, W, H, 0x1c2338).setOrigin(0).setAlpha(0.6);
    this.snow = new SnowFx(this, 50);
    txt(this, W / 2, 6, 'ARENA', 11).setScale(2).setOrigin(0.5, 0);
    const s = txt(this, 0, 28, 'PICK YOUR HERO. SURVIVE THE WAVES.', 4); s.x = Math.floor((W - s.width) / 2);
    this.list = [...HEROES.map((h) => ({ id: h.id, label: h.name, col: h.col })), { id: 'own', label: 'YOUR HERO', col: 13, off: !hasOwnHero() }];
    this.rec = loadRecords();
    this.rows = this.list.map((h, i) => txt(this, 24, 44 + i * 16, h.label, 6));
    this.cursor = txt(this, 12, 44, '▶', 13);
    this.panel = this.add.rectangle(104, 42, 208, 118, 0x0b0e1a, 0.7).setOrigin(0);
    this.info = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => txt(this, 110, 47 + i * 11, '', 6));
    this.add.existing(txt(this, 0, 168, 'W/S HERO  A/D MODE  Q ARENA  E GO', 4)).x = 80;
    this.sel = 0; this.modeI = 0; this.arenaI = 0; this.warm = 6; this.t = 0; this.go = false;
    this.input.on('pointermove', (p) => { if (this.warm > 0) return; const i = this.list.findIndex((_, k) => p.y >= 42 + k * 16 && p.y <= 56 + k * 16 && p.x < 100); if (i >= 0 && !this.list[i].off && i !== this.sel) { this.sel = i; sfx.play('move'); } });
    this.input.on('pointerdown', (p) => { if (this.warm > 0 || p.x >= 100) return; const i = this.list.findIndex((_, k) => p.y >= 42 + k * 16 && p.y <= 56 + k * 16); if (i >= 0 && !this.list[i].off) { this.sel = i; this.begin(); } });
    music.play('throne');
    this.refresh();
  }
  refresh() {
    const h = this.list[this.sel], hero = heroById(h.id), mode = MODES[this.modeI], r = this.rec[recordKey(h.id, mode.id)];
    const arena = mode.id === 'daily' ? arenaById(dailyArena()) : ARENAS[this.arenaI];
    this.rows.forEach((o, i) => o.setFont(this.list[i].off ? 'f4' : i === this.sel ? 'f13' : 'f6'));
    this.cursor.y = this.rows[this.sel].y;
    const lines = h.id === 'own' ? [['YOUR HERO', 13], [h.off ? 'NO SAVE FOUND.' : 'YOUR CURRENT SAVE,', 6], [h.off ? 'START A GAME FIRST.' : 'GEAR AND LEVELS AS THEY ARE.', 6], ['NOTHING IS SAVED OR LOST.', 4]] : [[hero.name, hero.col], ...hero.blurb.map((b) => [b, 6])];
    lines.push([r ? `BEST ${r.score}   ${mode.id === 'rush' ? 'BOSSES' : 'WAVE'} ${r.waves}` : 'NO RECORD YET', 15], [r ? `${r.runs} RUN${r.runs > 1 ? 'S' : ''}` : '', 4], [`MODE   < ${mode.name} >`, 12], [mode.blurb, 4], [`ARENA  < ${arena.name} >${mode.id === 'daily' ? ' TODAY' : ''}`, 8], [nextRoomAt() ? `NEXT ROOM AT WAVE ${nextRoomAt()}` : '', 4]);
    this.info.forEach((o, i) => { const l = lines[i] || ['', 6]; o.setText(l[0]); o.setFont(i === 0 ? 'f13' : l[1] === 15 ? 'f15' : l[1] === 4 ? 'f4' : l[1] === 12 ? 'f12' : l[1] === 8 ? 'f8' : 'f6'); });
  }
  begin() {
    if (this.go) return;
    const h = this.list[this.sel]; if (h.off) return;
    const mode = MODES[this.modeI], opts = { mode: mode.id, arena: ARENAS[this.arenaI].id };
    if (!beginQuickRun(h.id, opts)) return;
    this.go = true; sfx.play('select');
    this.scene.start('Game', { map: arenaById(S.quick.arena).map, spawn: 'in' });
  }
  update(_, ms) {
    this.snow.update(ms / 1000);
    if (this.warm > 0) { this.warm--; return; }
    if (this.go) return;
    const n = this.list.length;
    if (keys.pressed('down') || keys.pressed('up')) {
      let s = this.sel; do { s = (s + (keys.pressed('down') ? 1 : n - 1)) % n; } while (this.list[s].off);
      if (s !== this.sel) { this.sel = s; sfx.play('move'); }
    }
    if (keys.pressed('left') || keys.pressed('right')) { this.modeI = (this.modeI + (keys.pressed('right') ? 1 : MODES.length - 1)) % MODES.length; sfx.play('move'); }
    if (keys.pressed('swap')) { let i = this.arenaI; do { i = (i + 1) % ARENAS.length; } while (!arenaUnlocked(ARENAS[i].id)); this.arenaI = i; sfx.play('move'); }
    this.refresh();
    if (keys.pressed('pause')) { sfx.play('back'); this.go = true; this.scene.start('Title'); return; }
    if (keys.pressed('interact') || keys.pressed('roll')) this.begin();
  }
}

export class ArenaResultsScene extends Phaser.Scene {
  constructor() { super('ArenaResults'); }
  init(data) { this.res = data; }
  create() {
    const r = this.res, rec = submitRecord(r.hero, r.score, r.waves, r.mode || 'survival');
    this.cameras.main.setBackgroundColor(0x0b0e1a);
    this.add.rectangle(0, 0, W, H, 0x2a0f18).setOrigin(0).setAlpha(0.5);
    this.snow = new SnowFx(this, 40);
    txt(this, W / 2, 12, 'YOU FELL', 11).setScale(3).setOrigin(0.5, 0);
    const name = r.hero === 'own' ? 'YOUR HERO' : heroById(r.hero).name;
    const rows = [[`${name}  ${modeById(r.mode || 'survival').name}`, 13], [`${r.mode === 'rush' ? 'BOSSES FELLED' : 'WAVES CLEARED'}  ${r.waves}`, 6], [`FOES DEFEATED  ${r.kills}`, 6], [`CHAMPIONS  ${r.champions}`, 6], [`TIME  ${fmtTime(r.time)}`, 6], [`SCORE  ${r.score}`, 13], [rec.isBest ? 'NEW PERSONAL BEST!' : `BEST ${rec.best.score}   WAVE ${rec.best.waves}`, rec.isBest ? 15 : 4]];
    rows.forEach(([s, c], i) => { const o = txt(this, 0, 56 + i * 13, s, c); o.x = Math.floor((W - o.width) / 2); });
    const h = txt(this, 0, 164, 'E AGAIN   H CHANGE HERO   ESC TITLE', 4); h.x = Math.floor((W - h.width) / 2);
    this.warm = 24; this.go = false;
    this.onH = (e) => { if (e.code === 'KeyH' && this.warm <= 0 && !this.go) { this.go = true; this.scene.start('ArenaSetup'); } };
    window.addEventListener('keydown', this.onH);
    this.events.once('shutdown', () => window.removeEventListener('keydown', this.onH));
  }
  update(_, ms) {
    this.snow.update(ms / 1000);
    if (this.warm > 0) { this.warm--; return; }
    if (this.go) return;
    if (keys.pressed('pause')) { this.go = true; sfx.play('back'); music.stop(); this.scene.start('Title'); return; }
    if (keys.pressed('interact') || keys.pressed('roll')) {
      this.go = true; sfx.play('select');
      if (!beginQuickRun(this.res.hero, { mode: this.res.mode, arena: this.res.arena })) { this.scene.start('ArenaSetup'); return; }
      this.scene.start('Game', { map: arenaById(S.quick.arena).map, spawn: 'in' });
    }
  }
}
