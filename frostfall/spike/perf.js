import Phaser from 'phaser';
const q = new URLSearchParams(location.search), HD = q.get('hd') === '1', N = Number(q.get('n') || 600);
const Z = HD ? 2 : 1, S = HD ? 2 : 1;
class P extends Phaser.Scene {
  create() {
    const cv = document.createElement('canvas'); cv.width = 16 * S * 3; cv.height = 16 * S; const c = cv.getContext('2d');
    for (let f = 0; f < 3; f++) { for (let i = 0; i < 40 * S * S; i++) { c.fillStyle = `hsl(${(i * 37) % 360},50%,${30 + (i * 13) % 40}%)`; c.fillRect(f * 16 * S + (i * 7) % (16 * S), (i * 11) % (16 * S), S, S); } }
    const t = this.textures.addCanvas('s', cv); if (HD) { t.source[0].width = 48; t.source[0].height = 16; t.frames.__BASE.setSize(48, 16, 0, 0); }
    for (let f = 0; f < 3; f++) t.add('f' + f, 0, f * 16, 0, 16, 16);
    this.cameras.main.setZoom(Z);
    this.sp = []; for (let i = 0; i < N; i++) this.sp.push(this.add.sprite(Math.random() * 320, Math.random() * 180, 's', 'f' + (i % 3)).setData('v', [Math.random() - .5, Math.random() - .5]));
    this.cameras.main.setScroll(0, 0);
    window.__ready = true;
  }
  update(t, dt) { for (const s of this.sp) { const v = s.getData('v'); s.x += v[0] * dt * .05; s.y += v[1] * dt * .05; if (s.x < 0 || s.x > 320) v[0] *= -1; if (s.y < 0 || s.y > 180) v[1] *= -1; } }
}
const g = new Phaser.Game({ type: Phaser.WEBGL, width: 320 * Z, height: 180 * Z, parent: 'game', pixelArt: true, scene: P });
window.__fps = () => g.loop.actualFps;
