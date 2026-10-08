// What happens when things die or wake: bounties, boss adds, nemesis.
// Mixed into GameScene (see the bottom of scenes/GameScene.js).
import Phaser from 'phaser';
import { isGone, markGone } from '../systems/bless.js';
import { makeGenItem } from '../systems/genloot.js';
import { completeContract } from '../data/contracts.js';
import { T } from '../config.js';
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';
import Pickup from '../entities/Pickup.js';
import { maybeRelic, grantRelic } from '../systems/relics.js';
import { OrphanCub } from '../entities/Props.js';
import { sfx, music } from '../audio/sfx.js';
import { tip } from '../systems/tips.js';

export const killMethods = {
  // Persist a world kill; clearing every enemy of a camp pays a bounty.
  markKilled(en) {
    const sp = en.spec || {};
    if (en.spawnKey) markGone(en.spawnKey, sp.champion || sp.elite ? true : sp.camp ? 'camp' : false);
    S.run.kills++;
    if (en.champion) S.run.champions++;
    if (sp.nemesis) this.onNemesisDown(en);
    if (sp.roamRoute) this.onWorldBossDown(en);
    if (sp.mother) this.onMotherDown(en);
    if (sp.camp && !S.bounty[sp.camp]) {
      const left = this.built.entities.some((x) => x.t === 'enemy' && x.camp === sp.camp && !isGone(`${this.mapId}:${x._i}`) && x !== sp && x._i !== sp._i);
      if (!left) this.time.delayedCall(700, () => this.payBounty(sp.camp, sp.tier || 0));
    } else if (sp.camp && S.bounty[sp.camp] && !this.built.entities.some((x) => x.t === 'enemy' && x.camp === sp.camp && !isGone(`${this.mapId}:${x._i}`) && x !== sp && x._i !== sp._i)) {
      const g = 15 + 12 * (sp.tier || 0); S.gold += g;
      this.time.delayedCall(700, () => bus.emit('toast', `CAMP RETAKEN  +${g} GOLD`, 13));
    }
  },
  // A world boss falls: a legendary item, gold and a trophy flag.
  onWorldBossDown(en) {
    const id = en.spec.rid;
    S.flags['rb_' + id] = true;
    S.gold += 150 + 100 * (en.tier || 0);
    this.pickups.push(new Pickup(this, en.x, en.y - 6, { type: 'item', id: makeGenItem((en.tier || 0) + 1, Math.random, 3) }));
    const unique = { cinder: 'cinder_maul', floe: 'harpoon', lastknight: 'kings_signet' }[id];
    if (unique) this.pickups.push(new Pickup(this, en.x + 10, en.y - 6, { type: 'item', id: unique }));
    bus.emit('toast', `${en.displayName.split(',')[0].toUpperCase()} FALLS`, 13); sfx.play('quest');
    this.time.delayedCall(900, () => grantRelic(this));
    this.shake(500, 0.01);
  },
  // The mother bear dies: any cubs still alive are orphaned and can be adopted.
  onMotherDown(en) {
    const cubs = this.enemies.getChildren().filter((c) => c.spec?.cub && c.spec.camp === en.spec.camp && !c.dead);
    if (!cubs.length) return;
    const c = cubs[0];
    for (const x of cubs) { if (x.spawnKey) markGone(x.spawnKey, true); x.despawn?.(); }
    if (S.flags.cubOwned) return;
    this.interactables.push(new OrphanCub(this, c.x, c.y));
    bus.emit('toast', 'A CUB WHIMPERS... (E TO ADOPT)', 13);
  },
  onNemesisDown(en) {
    const k = S.nemesis?.kills || 1, tier = en.tier || 0;
    delete S.nemesis;
    if (S.flags.waypoint && S.flags.waypoint.map === 'forest') delete S.flags.waypoint;
    S.nemesisSlain = (S.nemesisSlain || 0) + 1;
    S.gold += 80 + 60 * k + 40 * tier;
    this.pickups.push(new Pickup(this, en.x, en.y - 6, { type: 'item', id: makeGenItem(tier + 1, Math.random, k >= 3 ? 3 : 2) }));
    bus.emit('toast', 'NEMESIS VANQUISHED', 13); sfx.play('quest');
    maybeRelic(this, 0.4);
  },
  // A barrow champion falling counts as clearing that barrow.
  onChampionDown(en) {
    if (!/^barrow\d/.test(this.mapId) || !en.champion) return;
    S.run.barrows++;
    completeContract(this.mapId, this);
    bus.emit('toast', 'THE BARROW GUARDIAN FALLS', 13);
  },
  payBounty(id, tier) {
    if (S.bounty[id]) return;
    S.bounty[id] = true;
    const kind = (this.built.entities.find((x) => x.t === 'bounty' && x.id === id) || {}).kind || 'camp';
    const gold = Math.round((40 + 30 * tier) * (kind === 'champion' ? 1.6 : 1));
    S.gold += gold; S.run.camps++;
    completeContract(id, this);
    this.pickups.push(new Pickup(this, this.player.x, this.player.y - 10, { type: 'item', id: makeGenItem(tier + (kind === 'champion' ? 1 : 0), Math.random, kind === 'champion' ? 2 : null) }));
    bus.emit('toast', `${kind.toUpperCase()} CLEARED  +${gold} GOLD`, 13);
    sfx.play('levelup'); this.fx.ring(this.player.x, this.player.y + 4, 1.4, 0.7, 'ring', 0xf4d460);
    if (kind === 'camp' || kind === 'den') this.player.gainXp('oneHanded', 12);
  },
  onFirstAlert(en) {
    tip('sneak');
    if (en && ['reaver', 'knight', 'fencer', 'imp', 'necro', 'frostworm', 'wyvern', 'shroom', 'golem', 'lynx', 'bear', 'elk', 'troll', 'bearcub'].includes(en.kind)) tip(en.kind);
    if (this.t - (this.lastCombat || -99) > 8 && !(this.boss && this.boss.engaged)) music.stinger();
  },
  summonAdds(boss) {
    for (const [x, y] of [[9, 5], [22, 5]]) {
      const en = this.addEnemy('draugr', (x + 0.5) * T, (y + 0.5) * T);
      en.alert(true);
      this.fx.puff(en.x, en.y, 15, 10, 50, 0.5);
    }
    sfx.play('nova');
  },
  summonWolves(boss) {
    for (const [dx, dy] of [[-46, 18], [46, 18], [0, -40]]) {
      const x = Phaser.Math.Clamp(boss.x + dx, 40, this.worldW - 40), y = Phaser.Math.Clamp(boss.y + dy, 40, this.worldH - 40);
      if (this.solidAt(x, y)) continue;
      const en = this.addEnemy('wolf', x, y);
      en.alert(true);
      this.fx.puff(x, y, 5, 8, 50, 0.4);
    }
  },
};
