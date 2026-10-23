// The framed panel every menu and shop screen draws (moved out of MenuScene.js so the menu tabs and the shop do not
// import a scene: that import made a 12-module cycle, CH12). Shared UI pieces for scenes belong in src/ui/.
import { C } from '../config.js';

export function panel(g, x, y, w, h, fill = 1) {
  g.fillStyle(C[0]); g.fillRect(x, y, w, h);
  g.fillStyle(C[3]); g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle(C[fill]); g.fillRect(x + 2, y + 2, w - 4, h - 4);
}
