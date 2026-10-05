// Breakables and loot drops (mixed into GameScene).
import Phaser from 'phaser';
import Pickup from '../entities/Pickup.js';
import { randInt, rand, dist } from '../util.js';

export const lootMethods = {
  // Smash any breakable inside a rectangle / circle.
  breakRect(rect) {
    for (const b of this.breakables) if (!b.broken && Phaser.Geom.Intersects.RectangleToRectangle(rect, new Phaser.Geom.Rectangle(b.x - 6, b.y - 3, 12, 12))) { b.smash(); this.noise(b.x, b.y, 55); }
  },

  // Loud things (shouts, explosions, smashed pots) wake sleeping foes nearby. Sneak kills stay quiet.
  noise(x, y, r) {
    for (const e of this.enemies.getChildren()) {
      if (e.dead || e.alerted || e.isBoss) continue;
      if (dist(e.x, e.y, x, y) < r) { e.alert(true); e.mark('?', 13, 0.6); }
    }
  },

  breakAt(x, y, r) {
    let hit = false;
    for (const b of this.breakables) if (!b.broken && dist(b.cx, b.cy, x, y) <= r) { b.smash(); hit = true; this.noise(b.cx, b.cy, 55); }
    return hit;
  },

  // gold: [min,max], chance for gold; drops: [[id, chance, range?]]
  spawnLoot(x, y, g, drops = []) {
    const at = (spec) => this.pickups.push(new Pickup(this, x + rand(-4, 4), y, spec));
    if (g && Math.random() < (g.chance ?? 1)) at({ type: 'gold', n: randInt(g.gold[0], g.gold[1]) });
    for (const [id, chance, range] of drops) {
      if (Math.random() > chance) continue;
      if (id === 'arrows') at({ type: 'arrows', n: randInt(range[0], range[1]) });
      else at({ type: 'item', id, n: 1 });
    }
  },

  onEnemyKilled(enemy) {
    const loot = enemy.cfg.loot;
    if (!loot) return;
    const at = (spec) => this.pickups.push(new Pickup(this, enemy.x + rand(-4, 4) * (enemy.isBoss ? 3 : 1), enemy.y + 2, enemy.isBoss ? { ...spec, big: true } : spec));
    const g = randInt(loot.gold[0], loot.gold[1]);
    // split gold into a few coins
    const coins = Math.min(3, g);
    for (let i = 0; i < coins; i++) at({ type: 'gold', n: Math.floor(g / coins) + (i === 0 ? g % coins : 0) });
    for (const [id, chance, range] of loot.drops) {
      if (Math.random() > chance) continue;
      if (id === 'arrows') at({ type: 'arrows', n: randInt(range[0], range[1]) });
      else at({ type: 'item', id, n: 1 });
    }
  },
};
