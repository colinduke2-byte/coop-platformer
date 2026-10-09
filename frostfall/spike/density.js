// Spike: can 2x-density art display at the old logical size, in WebGL?
import Phaser from 'phaser';
const q = new URLSearchParams(location.search);
const ZOOM = 2;
function fig(ctx, s, ox = 0) {          // a little hooded traveller; at s=2 it gets outline, shading and highlights
  const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(ox + x, y, w, h); };
  if (s === 1) {
    R('#1f4e5f', 4, 4, 8, 10); R('#e3b79a', 6, 5, 4, 3); R('#b63a34', 5, 8, 6, 1); R('#2a1f19', 5, 13, 2, 2); R('#2a1f19', 9, 13, 2, 2); R('#eaf2f8', 12, 2, 1, 8);
  } else {
    R('#0a1b24', 7, 3, 18, 28);                                            // outline
    R('#1f4e5f', 8, 4, 16, 26); R('#2f7287', 8, 6, 5, 22); R('#173a49', 20, 8, 4, 20);   // cloak, light side, shade side
    R('#1c4455', 10, 4, 12, 9); R('#0a1b24', 12, 6, 8, 7); R('#e3b79a', 13, 7, 6, 6); R('#c79878', 13, 11, 6, 2);
    R('#13242c', 14, 9, 1, 1); R('#13242c', 17, 9, 1, 1);                     // eyes
    R('#f5efe3', 9, 13, 14, 3); R('#c9bda6', 9, 15, 14, 1);                   // fur collar
    R('#b63a34', 11, 16, 10, 2); R('#9c2f2b', 19, 18, 3, 6);                  // scarf
    R('#6e4a28', 9, 21, 14, 2); R('#e2b350', 15, 21, 2, 2);                   // belt
    R('#2a1f19', 10, 28, 5, 3); R('#2a1f19', 17, 28, 5, 3);                   // boots
    R('#9fb2c0', 26, 2, 2, 18); R('#f1f7fb', 26, 2, 1, 16); R('#c89a3c', 24, 19, 6, 1);   // sword
  }
}
class Spike extends Phaser.Scene {
  create() {
    const mk = (key, s, frames = 1, hd = false) => {
      const cv = document.createElement('canvas'); cv.width = 16 * s * frames; cv.height = 16 * s;
      const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
      for (let f = 0; f < frames; f++) { c.save(); c.translate(0, (f % 2) * s); c.beginPath(); c.rect(f * 16 * s, 0, 16 * s, 16 * s); c.clip(); fig(c, s, f * 16 * s); c.restore(); }
      const tex = this.textures.addCanvas(key, cv);
      if (hd) {                                                           // THE TRICK: tell the engine the source is 1x so frames and UVs are in logical units
        const src = tex.source[0]; src.width = cv.width / s; src.height = cv.height / s;
        tex.frames.__BASE.setSize(src.width, src.height, 0, 0);
        for (let f = 0; f < frames; f++) tex.add('f' + f, 0, f * 16, 0, 16, 16);
      } else for (let f = 0; f < frames; f++) tex.add('f' + f, 0, f * 16, 0, 16, 16);
      return tex;
    };
    mk('lo', 1, 3); mk('hi', 2, 3, true);
    const cam = this.cameras.main; cam.setZoom(ZOOM); cam.setScroll(0, 0);
    this.add.rectangle(320, 180, 330, 190, 0x3a5468).setDepth(-1);
    const out = {};
    const row = (key, y) => {
      const a = this.add.sprite(210, y, key, 'f0');
      const b = this.add.sprite(240, y, key, 'f0').setFlipX(true);
      const c = this.add.sprite(280, y, key, 'f0').setScale(2.6);
      const d = this.add.sprite(330, y, key, 'f0').setRotation(0.4).setTint(0xffc0c0);
      this.anims.create({ key: 'run_' + key, frames: [{ key, frame: 'f0' }, { key, frame: 'f1' }, { key, frame: 'f2' }], frameRate: 6, repeat: -1 });
      const e = this.add.sprite(380, y, key, 'f0').play('run_' + key);
      this.physics.add.existing(e); e.body.setSize(10, 7).setOffset(3, 9);
      out[key] = { w: a.width, h: a.height, dw: c.displayWidth, bodyW: e.body.width, off: e.body.offset.x, cut: a.frame.cutWidth, srcW: a.texture.source[0].width, realW: a.texture.source[0].image.width };
    };
    row('lo', 140); row('hi', 190);
    this.add.text(170, 108, 'LOW  16px art', { fontSize: '8px', color: '#fff' }); this.add.text(170, 160, 'HIGH 32px art (same logical size)', { fontSize: '8px', color: '#fff' });
    // fixed-to-screen HUD marker in logical coordinates: must hug the top-left corner of the picture
    this.add.rectangle(0, 0, 30, 14, 0xff3030).setOrigin(0, 0).setScrollFactor(0).setDepth(50);
    this.add.rectangle(320, 180, 30, 14, 0x30ff30).setOrigin(1, 1).setScrollFactor(0).setDepth(50);
    // tilemap with a 32px tileset presented as 16-unit tiles
    const tw = 32, cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const c = cv.getContext('2d');
    c.fillStyle = '#5b7f99'; c.fillRect(0, 0, 32, 32); c.fillStyle = '#9fc0d6'; for (let i = 0; i < 40; i++) c.fillRect((i * 7) % 30, (i * 13) % 30, 2, 2); c.fillStyle = '#2d4b61'; c.fillRect(0, 30, 32, 2);
    c.fillStyle = '#6b5a3c'; c.fillRect(32, 0, 32, 32); c.fillStyle = '#9a8556'; for (let i = 0; i < 30; i++) c.fillRect(32 + (i * 11) % 30, (i * 5) % 30, 3, 1);
    this.textures.addCanvas('tiles_hi', cv);
    const map = this.make.tilemap({ data: [[0, 1, 0, 1], [1, 0, 1, 0]], tileWidth: tw, tileHeight: tw });
    const ts = map.addTilesetImage('t', 'tiles_hi', tw, tw, 0, 0);
    const layer = map.createLayer(0, ts, 170, 100); layer.setDepth(5).setScale(0.5); layer.setPosition(170, 100);
    out.tile = { tw: ts.tileWidth, layerW: layer.displayWidth };
    window.__layer = layer;
    window.__spike = out; window.__ready = true;
  }
}
new Phaser.Game({ type: q.get('renderer') === 'canvas' ? Phaser.CANVAS : Phaser.WEBGL, width: 640, height: 360, parent: 'game', backgroundColor: '#0b0e1a', pixelArt: true, antialias: false, roundPixels: true, physics: { default: 'arcade' }, scene: Spike });
