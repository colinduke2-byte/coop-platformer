// WQ18: the landmarks' secrets (data and hints in world/lmsecrets.js). One per landmark, once per save.
import { registerSpawner } from '../scenes/gameHooks.js';
import { S } from '../systems/state.js';
import { T } from '../config.js';
import { bus } from '../systems/bus.js';
import { sfx, music } from '../audio/sfx.js';
import { runScript, say, choose } from '../systems/dialogue.js';
import { addGold, addItem, removeItem, count } from '../systems/inventory.js';
import { makeGenItem } from '../systems/genloot.js';
import { recalc } from '../systems/stats.js';
import { ITEMS } from '../data/items.js';
import { TUNE } from '../data/tuning.js';
import { regionOfMap } from '../data/regions.js';
import { REGION_DEFS } from '../world/worldgen.js';
import { SECRETS } from '../world/lmsecrets.js';
import { hourOf } from '../world/lighting.js';

const solved = (id) => !!S.flags.lmSecret?.[id];
const inHours = ([a, b]) => { const h = hourOf(); return a <= b ? h >= a && h < b : h >= a || h < b; };

class LmSecret {
  constructor(sc, x, y, e) { this.scene = sc; this.ix = x; this.iy = y; this.e = e; this.s = SECRETS[e.lm]; this.wave = null; }
  canInteract() { return !solved(this.e.id) && !this.wave && !['fire', 'under'].includes(this.s.kind); }
  label() { return this.s.kind === 'ring' ? 'E: RING IT' : this.s.kind === 'gift' ? 'E: LEAVE A GIFT' : 'E: LOOK CLOSER'; }
  reward(big = true) {
    const W = TUNE.world.secret, tier = this.e.tier || 0, gold = W.gold + W.perTier * tier;
    (S.flags.lmSecret ||= {})[this.e.id] = 1;
    addGold(gold);
    if (big) addItem(makeGenItem(tier + 1, Math.random, 2));
    sfx.play('levelup'); this.scene.fx.puff(this.ix, this.iy, 13, 14, 40, 0.7);
    bus.emit('toast', `A LANDMARK'S SECRET: +${gold} GOLD${big ? ' AND A RARE FIND' : ''}`, 13);
  }
  bless(kind) {
    const W = TUNE.world.secret;
    (S.flags.lmSecret ||= {})[this.e.id] = 1;
    if (kind === 'heal') { S.hp = S.maxHp; S.mp = S.maxMp; S.sp = S.maxSp; bus.emit('toast', 'THE DAYLIGHT HEALS YOU', 13); }
    else { S.flags.warmUntil = (S.playtime || 0) + W.warmSecs; bus.emit('toast', `WARMED THROUGH: NO STORM CAN CHILL YOU FOR ${Math.round(W.warmSecs / 60)} MIN`, 12); }
    addGold(W.gold >> 1); recalc(); sfx.play('potion');
  }
  tick(dt, sc) {
    if (solved(this.e.id)) return;
    const p = sc.player, d = Math.hypot(p.x - this.ix, p.y - this.iy);
    if (this.s.kind === 'under' && d < 26) this.bless(this.s.buff);
    if (this.s.kind === 'fire' && sc.shots.getChildren().some((sh) => sh.kind === 'fire' && Math.hypot(sh.x - this.ix, sh.y - this.iy) < 40)) {
      bus.emit('toast', 'THE ICE CRACKS AND THAWS: SOMETHING WAS FROZEN INSIDE', 15); this.reward();
    }
    if (this.wave) {
      const live = this.wave.filter((e) => e.active && !e.dead);
      if (!live.length) { this.wave = null; this.reward(); }
      else if (d > 520) { for (const e of live) e.despawn?.(); this.wave = null; bus.emit('toast', 'THE GUARDIANS RETURN TO THEIR REST', 8); }
    }
  }
  async interact() {
    const sc = this.scene, s = this.s, who = 'Landmark';
    if (s.kind === 'ring') {
      const rid = regionOfMap(sc.mapId), tier = Math.min(3, this.e.tier || 0), mobs = REGION_DEFS[rid]?.mobs?.[tier]?.melee || ['draugr'];
      this.wave = [];
      for (let i = 0; i < 3 + Math.min(2, tier); i++) { const a = (i / 5) * Math.PI * 2, e = sc.addEnemy(mobs[i % mobs.length], this.ix + Math.cos(a) * 70, this.iy + Math.sin(a) * 50, { tier: tier + 1, roam: true }); e.alert?.(true); this.wave.push(e); }
      sc.shake(300, 0.006); sfx.play('alert'); music.stinger?.();
      bus.emit('toast', 'SOMETHING ANSWERS THE BELL!', 11);
      return;
    }
    await runScript(async () => {
      if (s.kind === 'riddle') {
        await say(who, s.q);
        const c = await choose([...s.a, 'Say nothing']);
        if (c === s.right) { await say(who, 'A low sound, almost a laugh. Something rolls out from the stone.'); this.reward(); }
        else if (c < s.a.length) { await say(who, 'Silence. The question will wait for a better answer.'); }
      } else if (s.kind === 'gift') {
        if (count(s.item) < 1) { await say(who, `${s.hint} (YOU NEED ${(ITEMS[s.item]?.name || s.item).toUpperCase()})`); return; }
        const c = await choose([`Leave ${ITEMS[s.item]?.name || s.item}`, 'Leave nothing']);
        if (c === 0) { removeItem(s.item, 1); this.reward(); }
      } else if (s.kind === 'time') {
        const ok = s.hours ? inHours(s.hours) : S.weather === s.weather;
        if (ok) this.reward(); else await say(who, s.hint);
      } else if (s.kind === 'dig') {
        if (!inHours(s.hours)) { await say(who, s.hint); return; }
        const tx = this.ix / T, ty = this.iy / T, dig = (sc.built?.entities || []).filter((e) => e.t === 'dig').sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty))[0];
        if (dig) S.flags.waypoint = { map: sc.mapId, x: dig.x, y: dig.y };
        await say(who, 'A line of light falls across the ground and stops on a patch of earth. The spot is marked on your map.');
        this.reward(false);
      }
    });
  }
}
registerSpawner('lmsecret', (sc, e, wx, wy) => { if (!solved(e.id)) sc.interactables.push(new LmSecret(sc, wx, wy, e)); });
