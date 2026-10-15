# Frostfall audit: combat feel, enemies and bosses (prefix CB)

Reviewer area: melee, bow, magic and shout feel; how readable and fair enemy attacks are; enemy AI; boss patterns; weapon class identity; the difficulty curve.
Branch `frostfall`. Read-only review: nothing under `src/`, `test/` or `tools/` was changed.

**How each finding was checked.** Every item is marked:
- **Verified (probe):** measured in the headless game with `test/harness.mjs`. The scratch scripts are in `/tmp/claude-0/-home-user-coop-platformer/e2dc7b36-8c57-5ea6-8d29-2ac487f30b30/scratchpad/audit_combat/` (`probe1.mjs`, `probe2.mjs`).
- **Verified (code):** read in the source, with the file and line given.
- **Guess:** likely from reading the code, but not reproduced.

Not repeated here: the items fixed in `docs/REFINEMENT_LOG.md` (R5-R68) and the performance/UI/saves pass in `docs/RUN_AND_UI_IMPROVEMENTS.md`.

Impact: H / M / L. Effort: S = hours, M = a day, L = days. **DESIGN** = the change alters a design decision, so Colin should approve it first.

---

## Key measurements

**Stun-lock probe (probe1).** The player swings on cooldown for 8 s, stopping only when stamina is low. The control run is the same enemy with the player standing still.

| Enemy (HP at Normal, tier 0) | Weapon | Wind-ups started | Attacks landed on the player | Control: attacks landed |
|---|---|---|---|---|
| Troll (1035) | Iron Sword | 10 | **0** | 4 |
| Troll | Hunting Knife (6 dmg) | 11 | **0** | 4 |
| Troll | Warhammer | 3 | **0** | 4 |
| Stone Giant | Iron Sword | 10 | **0** | 3 |
| Bear | Iron Sword | 8 | 3 | 5 |
| Draugr | Iron Sword | 6 | 2 | 6 |

**When each weapon's hit lands (probe1).** Time from pressing the swing to the first damage:

| Weapon | Swing length | Damage lands at |
|---|---|---|
| Hunting Knife | 0.16 s | 0.067 s |
| Iron Sword | 0.30 s | 0.067 s |
| Iron Mace | 0.50 s | 0.067 s |
| Warhammer | 0.62 s | 0.067 s |
| Iron Greatsword | 0.62 s | 0.067 s |
| Iron Halberd | 0.63 s | 0.067 s |

**Weapons by the numbers.** Worked out from `TUNE.player.styles` and `ITEMS`, ignoring crits and hit-stop:

| Weapon | Style | DPS | Damage per stamina | Hit-stop per combo |
|---|---|---|---|---|
| Steel Sword | sword | 63 | 1.38 | 0.18 s |
| Nordic Greatsword | great | 73 | 1.72 | 0.43 s |
| Packbreaker | great | 88 | 2.14 | 0.43 s |
| **Dragonbone Greatsword** | great | **127** | **3.33** | 0.43 s |
| **Giant's Maul** | great | **172** | **4.50** | 0.43 s |
| Warhammer | hammer | 126 | 3.37 | 0.32 s |

---

## Fixes and polish (ranked by value)

### CB1: Every ordinary enemy can be stun-locked, even by a dagger poke (trolls, giants, golems, mini-bosses)
- **Status:** Verified (probe and code).
- **What's wrong:** Any hit on a non-boss enemy sets `stun >= 0.12` and cancels its wind-up (`Enemy.takeHit`, `src/entities/Enemy.js:723-725`: `if (!this.superArmor ...) { ... if (this.state === 'windup') this.setState('chase') }`). Only `Boss` sets `superArmor`.
  - A 1035-HP Bridge Troll started 10-11 wind-ups in 8 s against a sword, or a 6-damage hunting knife, and landed **none**.
  - A Stone Giant was the same.
  - `settings.holdChain` is on by default, so holding J is enough.
- **Why it matters:** The guide's core lesson ("learn the telegraph, roll sideways") does not apply against the game's biggest regular threats. The rule is "stand in front and mash". Big creatures feel weightless, and a bot's high win rate in some fights may come from this.
- **Suggested change:** Give heavy enemies hyper-armour during the wind-up.
  - New per-enemy field `cfg.poiseWindup`, a damage threshold. A wind-up is only cancelled when one hit's poise damage passes it, or by `heavy`, `breaker` or `forceStun`.
  - Default: on for `kbResist >= 0.6` (troll, golem, stonegiant, crystalgolem, sentinel, mosshulk, mammoth, cindersmith and every mini-boss). Off for wolves, bandits and draugr, so they still feel interruptible.
  - Keep the hit-flash and damage so hits still read.
  - Add a test: a troll mid-wind-up and three sword taps, the attack still fires.
- **Impact** H. **Effort** S-M. **Files:** `src/entities/Enemy.js` (`takeHit`), `src/data/enemies.js`, `src/data/enemies4.js`, `test/stage23_combat2.mjs`. **DESIGN**

### CB2: Button presses during hit-stop are thrown away
- **Status:** Verified (probe2).
- **What's wrong:** `GameScene.update` returns early while `hitStopT > 0` (`src/scenes/GameScene.js:682`). `keys.endFrame()` still clears `pressedSet` every `postrender`. `Player.update`, which fills `bufRoll` and `bufSword`, never runs.
  - A 2-frame Space tap inside a 0.144 s freeze (one greatsword hit) gave no roll. The same tap with no freeze rolled at once.
  - Freezes are long: greatsword 0.144 s per hit, hammer 0.16 s, crit ×1.25. See CB4.
- **Why it matters:** "I pressed roll and nothing happened" right after landing a hit, which is exactly when an enemy's counter-swing arrives. It feels like dropped input, the worst kind of feel bug.
- **Suggested change:** While hit-stop is running, keep collecting presses into the player's buffers. Add a small `player.bufferInputs()` called before the early return: set `bufRoll`, `bufSword` and a new `bufHeavy`, and do not count down the buffer timers during the stop. Add a test like probe2.
- **Impact** H. **Effort** S. **Files:** `src/scenes/GameScene.js`, `src/entities/Player.js`.

### CB3: All weapons hit 4 frames after the press; heavy weapons get no wind-up, only recovery, and the blade art lags behind the hit
- **Status:** Verified (probe and code).
- **What's wrong:** Combo steps never set `hs`/`he`, so every style uses `P.sword.hitStart 0.06 / hitEnd 0.2` (`src/entities/playerCombat.js:104`). `w.swing` only lengthens `total`.
  - Every weapon, from knife to warhammer, does its damage at 0.067 s.
  - The held-blade sprite sweeps over the whole `total` (`tickSwing`, k = t / total). On a 0.8 s hammer swing the damage is done when the blade has moved about 10% of its arc. The visible "impact" lands after nothing happens.
- **Why it matters:** Greatswords, hammers and maces feel like a fast poke followed by a stall, not a heavy blow. Weapon identity depends on commitment before the hit; here all the commitment comes after it. Hit-stop and shake fire at the wrong moment of the animation.
- **Suggested change:** Give each style step `hs`/`he` as fractions of `total`, scaled by `w.swing`. Suggested starting values:

  | Style | Hit window (fraction of `total`) |
  |---|---|
  | dagger | 0.25-0.6 |
  | sword | 0.2-0.6 |
  | spear | 0.3-0.6 |
  | axe / mace | 0.35-0.65 |
  | great | 0.4-0.7 |
  | hammer | 0.5-0.75 |

  Drive the blade arc from the same numbers, so the arc crosses its middle when the hit lands. Then retune `total` so DPS barely moves. Re-run `test/balance.mjs`.
- **Impact** H. **Effort** M. **Files:** `src/data/tuning.js` (styles), `src/entities/playerCombat.js` (`tickSwing`, `swordHit`). **DESIGN** (changes feel)

### CB4: Every hit from a greatsword, axe, mace or hammer counts as "heavy" (perk effects on every swing, HEAVY text spam, extra-long hit-stop)
- **Status:** Verified (code).
- **What's wrong:** `swordHit` uses `const heavy = s.c.scale > 1` (`src/entities/playerCombat.js:125`). Every swing with scale above 1 counts: all `great` swings (1.5-1.8), both axe swings (1.2/1.5), both mace swings and both hammer swings. Each of those hits:
  - gets **Rending Blow** +25%, whose description is "Heavy finisher deals +25%";
  - refunds **Unbroken**'s 12 stamina, whose description is "Every combo finisher gives back 12 stamina". With the Dragonbone Greatsword a swing costs 16.8 stamina and refunds 12, so combos are close to free;
  - shows a "HEAVY" popup;
  - triggers hit-stop ×1.6. One greatsword hit freezes 0.144 s and a hammer 0.16 s, which is longer than a **parry** (0.1 s) and about equal to an **execution** (0.16 s). The special moments lose their weight. A greatsword combo spends 0.43 s frozen per 1.5-2 s cycle.
- **Suggested change:**
  - Mark the finisher step explicitly: `fin: true` on the last step of each style, plus `heavyAtk`. Use that for Rending, Unbroken, the HEAVY text and the ×1.6 hit-stop.
  - Keep `breaker` for guard-breaking.
  - Cap ordinary-hit hit-stop at about 0.09 s, so parry, finisher and execution stay the biggest.
- **Impact** H. **Effort** S. **Files:** `src/entities/playerCombat.js`, `src/data/tuning.js`.

### CB5: The legendary greatswords are faster, cheaper and smaller than the iron greatsword
- **Status:** Verified (code).
- **What's wrong:** These weapons have `style: 'great'` but no `swing`, `costMul` or `sizeAdd`: `dragonbone_blade`, `giants_maul`, `kings_blade` and `lode_pick` (`src/data/items.js:77, 100, 169, 210`).
  - The Iron, Nordic and Packbreaker greatswords have swing 1.3-1.35, costMul 1.4-1.5 and sizeAdd +5/+6.
  - So the late blades swing about 26% faster, cost about 33% less stamina and have a smaller hitbox. Damage per stamina is 3.3-4.5, against 1.2-2.1 for the others.
  - "Giant's Maul" (a hammer) and "Lode Pick" (a pick) also play as greatswords.
- **Suggested change:**
  - Add the usual multipliers (swing 1.3, costMul 1.4, sizeAdd 6).
  - Move `giants_maul` to `style: 'hammer'` and `lode_pick` to `'axe'`, so the only hammer (Warhammer) gets company. Re-run `test/balance.mjs` for the Dragon and late bosses.
- **Impact** M. **Effort** S. **Files:** `src/data/items.js`. **DESIGN** (for the style moves)

### CB6: Arrows, Fireball, Frost Bolt and staff bolts only fly in 8 directions, even when locked on
- **Status:** Verified (code).
- **What's wrong:** `releaseBow` (`src/entities/playerBow.js:62`), `cast` (`src/entities/playerMagic.js:79`) and `staffBolt` (`:372`) fire along `this.face`. `face` is always `dir8(...)` (`src/util.js:16`), including when it is set from the lock-on target or the mouse (`Player.js:176, 257, 259`).
  - A target 20° off a 45° line at 120 px is passed by about 40 px. That is three body widths.
  - Meteor and Sunbeam use the target position, so the bolt spells are the odd ones out.
- **Why it matters:** Lock-on promises "I aim at that". The archery build, a fifth of the skill tree, misses for reasons the player cannot see.
- **Suggested change:** Keep `face` 8-way for sprites, but give projectiles an exact `aimVec`: the target vector when locked on, the pointer vector with the mouse, and `face` otherwise. Optionally add a gentle stick aim-assist cone of ±12°. Add a test: lock on a target at 30° and check that the arrow hits.
- **Impact** H. **Effort** S. **Files:** `src/entities/playerBow.js`, `src/entities/playerMagic.js`, `src/entities/Player.js`.

### CB7: Three-phase bosses get slower wind-ups in their final phase
- **Status:** Verified (code).
- **What's wrong:** `Boss.pickAttack` scales the wind-up by `(this.bphase === 2 ? 0.8 : 1)` (`src/entities/Boss.js:155`) and recovery by `(this.bphase === 2 ? 0.75 : 1)` (`:120`). Grimfang copies this (`src/entities/Grimfang.js:65`).
  - In phase 3 both go back to 1.0: wind-ups are **25% longer** and recovery **33% longer** than in phase 2. `cdMul` drops to 0.5 at the same time.
  - This affects eight bosses: Long Winter, Ember Dragon, Ashen Sovereign, Hollow King, Storm Giant, Hartking, Lode Colossus and Vault Sovereign.
- **Why it matters:** The "final face" of the last boss becomes easier to read than its middle phase, which flattens the climax.
- **Suggested change:** Change the checks to `bphase >= 2` and add a phase-3 step: wind-up ×0.75 with a floor of 0.38 s, recovery ×0.7. Then re-run the balance bot on those eight fights, because their win rates will drop.
- **Impact** M-H. **Effort** S. **Files:** `src/entities/Boss.js`, `src/entities/Grimfang.js`, `src/data/tuning.js` (`TUNE.bosses` hp if needed).

### CB8: Boss sweeps and all projectiles carry no attacker (no perfect dodge, a parry does not stagger, wrong "SLAIN BY")
- **Status:** Verified (code).
- **What's wrong:** `player.hurt` decides perfect dodge, parry stagger, thorns and the killer's name from `opts.attacker`. These calls pass none:
  - every boss **sweep**: `Boss.js:231`, `{ kb: 150 }`;
  - every enemy and boss **projectile**: `Projectile.hitPlayer`, `src/entities/Projectile.js:146`.
- **Effects:**
  - Rolling through a sweep or a volley never gives a PERFECT DODGE.
  - Parrying a sweep gives the riposte but leaves the boss un-staggered.
  - The Thorns rune does nothing to archers.
  - Dying to a projectile shows the last melee attacker as the killer.
  - Bosses built mostly on projectiles (Tidemother, Ashen Root, the Ember Dragon's breath) hardly reward the perfect-dodge skill.
- **Suggested change:**
  - Pass `attacker: this` in the sweep.
  - Give projectiles an `owner` and pass `attacker: owner`, with a flag `ranged: true`.
  - A perfect dodge against a ranged attacker gives the slow-mo, the stamina and the counter buff, but no stun at range.
- **Impact** M-H. **Effort** S. **Files:** `src/entities/Boss.js`, `src/entities/Projectile.js`, `src/entities/Enemy.js`, `src/entities/playerCombat.js`.

### CB9: Mini-bosses are treated as ordinary mobs (one-shot from stealth, executed at 28%)
- **Status:** Verified (code).
- **What's wrong:** The named mini-bosses from `mini()` (`src/data/enemies4.js:138-150`) have `mini: true`, which nothing reads, and no `title`. The list: Grove Warden Moss, Elder Thornwood, Queen Vespera, the Sandmaw, Ankhet, Kharn, Red Sula and Captain Karrow. So:
  - **Nightshade's assassinate** one-shots them from sneak. It only excludes `cfg.title` (`playerCombat.js:141`).
  - **FINISHER** kills them outright under 28% HP after any stun. Only `isBoss` is excluded (`:143`).
  - They are stun-locked like any mob (CB1) and poise-staggered at 42% of max HP.
  - They also get the `TUNE.mobs` ×1.3 HP / ×1.15 damage meant for ordinary monsters.
- **Why it matters:** The named fights with unique prizes can end in one hit or one heavy-then-tap, and the late ones are trivial.
- **Suggested change:** A shared `isNamed(e)` helper (`isBoss || cfg.title || cfg.mini`):
  - no assassinate (a big sneak hit instead);
  - finisher threshold 10% with a "FINISHER" kill only when staggered;
  - wind-up hyper-armour (CB1);
  - poise threshold ×2.
- **Impact** H. **Effort** S. **Files:** `src/entities/playerCombat.js`, `src/entities/Enemy.js`, `src/data/enemies4.js`. **DESIGN** (light)

### CB10: Parry can be spammed: every tap of block opens a fresh parry window
- **Status:** Verified (code).
- **What's wrong:** `tickBlock` resets `blockT = 0` every time blocking starts (`src/entities/playerCombat.js:310`), with no cooldown and no penalty for a parry that catches nothing. Tapping F about 5 times a second keeps a 0.18 s window open most of the time, or 0.28 s with Duelist. A parry costs no stamina and beats crushing blows.
- **Why it matters:** Parry is meant to be the high-skill option. Mashing turns it into a near-permanent invulnerable stance, against bosses too.
- **Suggested change:** A whiffed parry, meaning released inside the window without a hit, locks out a new parry window for 0.4 s. A plain block still works during the lockout. Optionally add a "clang" sound for a late parry. Add a unit test in `test/unit` for `blockResult` with the lockout.
- **Impact** M. **Effort** S. **Files:** `src/entities/playerCombat.js`, `src/data/tuning.js` (`block.parryLockout`). **DESIGN**

### CB11: The heavy attack loses spear and halberd reach
- **Status:** Verified (code).
- **What's wrong:** `startHeavy` builds its swing without `reach`, `narrow` or `wide` (`src/entities/playerCombat.js:83`), so it uses the sword's `reach 13`. A spear's jabs reach 22-28 px, but its heavy blow lands at sword range, and the guide sells the heavy as the guard-breaker.
- **Suggested change:** Copy `reach`, `narrow` and `wide` from the style's finisher step, or add a per-style `heavy` entry in `TUNE.player.styles` (see CB24).
- **Impact** M. **Effort** S. **Files:** `src/entities/playerCombat.js`, `src/data/tuning.js`.

### CB12: Some regular enemies give only 0.3 s of warning (0.255 s on Hard)
- **Status:** Verified (data).
- **What's wrong:** These enemies wind up for 0.3 s: lynx, mirelynx, stalker, mudlurker, dustdevil, cutpurse, fencer, sunfencer, leech, hornet, and the mini-bosses Kharn and Red Sula. Hard multiplies wind-ups by 0.85. Several also chase at 86-104 px/s.
  - The perfect-dodge window is 0.17 s from the start of the roll.
  - Human visual reaction plus a key press is about 0.25-0.3 s.
- **Why it matters:** These hits are effectively not reactable, which breaks the "every enemy winds up" promise. They are spread through the regions where the game expects players to have learned dodging.
- **Suggested change:** Set a floor of 0.4 s on Normal and 0.36 s on Hard. Keep these enemies dangerous through speed, number or feints instead. Or add a 0.15 s pre-tell (a crouch frame) before the red blink.
- **Impact** M. **Effort** S. **Files:** `src/data/enemies.js`, `src/data/enemies4.js`, `src/entities/Enemy.js` (`startWindup`). **DESIGN**

### CB13: Unblockable (crush) attacks look the same as every other attack
- **Status:** Verified (code).
- **What's wrong:** `startWindup` always shows the same `'!'` (colour 11) and red blink. Attacks with `crush`, the ones that break a raised shield (troll, bear, golem, knight, reaver, boar, mammoth, sentinel, mosshulk and more), look the same as ordinary ones. Only the bear-cub tip and one lore line mention crushing.
- **Why it matters:** A shield player cannot tell "block this" from "roll this" until they take a GUARD CRUSHED.
- **Suggested change:** Use a distinct marker for crush wind-ups, such as `'!!'` in orange or white with a thicker blink and a lower-pitched telegraph sound. Add a one-time tip the first time a crush is shown, and a bestiary line "Crushes shields".
- **Impact** M. **Effort** S. **Files:** `src/entities/Enemy.js`, `src/systems/tips.js`, `src/audio/sfx.js`.

### CB14: The Ember Dragon's breath re-aims at you with no warning
- **Status:** Verified (code).
- **What's wrong:** `EmberDragon.fireAttack` fires two extra cones at 0.3 s and 0.6 s, aimed at the player's position at that moment ±0.24 rad (`src/entities/Guardians.js:110-115`). Only the first cone was telegraphed. Dodging the first cone sideways is punished by the next one.
- **Suggested change:** Rake a fixed arc around the telegraphed direction (−0.24, then +0.24), or show a short cone telegraph before each extra cone.
- **Impact** M. **Effort** S. **Files:** `src/entities/Guardians.js`.

### CB15: Ranged enemies shoot from off-screen
- **Status:** Verified (code); not measured in play.
- **What's wrong:** The view is 320×180, so ±90 px vertically from a centred player (`src/config.js:2-3`). Ranges are much longer:
  - archers 118 px;
  - wight and ghost 108-112 px;
  - harpooner and barnacle 124 px;
  - conjurers and hags 118-120 px;
  - wyverns and thunderbirds 150 px.
  `archerMove` fires whenever `d <= range` with a clear line, and does not check the camera.
- **Why it matters:** The player cannot see the wind-up, so the hit is unfair.
- **Suggested change:** Only start a ranged wind-up when the enemy is inside `cameras.main.worldView` (inset 6 px). Otherwise keep moving in. Or show an edge-of-screen arrow while it winds up.
- **Impact** M. **Effort** S. **Files:** `src/entities/Enemy.js` (`archerMove`, the `orbit` branch).

### CB16: Lock-on cannot switch targets, drops on a kill and picks deer
- **Status:** Verified (code).
- **What's wrong:**
  - T toggles lock-on (`Player.updateLock`); there is no way to move to the next target. `pickTarget`'s `skip` parameter is unused.
  - When the target dies, the lock clears and nothing replaces it.
  - `pickTarget` considers passive animals (deer, hare, fox) and stationary prisms, and ignores line of sight.
- **Suggested change:**
  - Pressing T again while holding a direction cycles to the best target that way; a plain press releases.
  - Auto-retarget the nearest hostile within 0.4 s of a kill.
  - Skip `cfg.passive` and `prism` unless nothing else is near.
  - Require `hasLOS`.
- **Impact** M. **Effort** S. **Files:** `src/entities/Player.js`.

### CB17: Controller layout: block is on the left-stick click and heavy is on the right stick
- **Status:** Verified (code: `src/systems/keys.js:111, 114`).
- **What's wrong:** `b10` (L3) = block, `b11` (R3) = lock-on, right stick up = heavy. To block or parry you hold the stick you are moving with pressed down. Precise parry timing on L3 is very hard, and the heavy attack sits on a stick direction.
- **Why it matters:** Parry and heavy, two of the three skill moves, are much worse on a pad than on a keyboard.
- **Suggested change:** Default pad layout: LB block/parry, RB heavy, LT sneak, RT shout, Y bow, X sword, R3 lock-on. Move spell-swap and quick-cast to the d-pad. Coordinate with the controls reviewer.
- **Impact** M. **Effort** S. **Files:** `src/systems/keys.js`. **DESIGN**

### CB18: Bosses fire alongside their adds with no shared attack slot
- **Status:** Verified (code).
- **What's wrong:** `takeToken` skips bosses (`src/world/zones.js`), and bosses never take a token. In phase 2, a boss sweep or spike field and two summoned adds can all wind up in the same frame. Much of the "potions used 12-16" in `docs/BALANCE_TABLE.md` is probably this overlap (guess).
- **Suggested change:** A boss in `windup` or `attack` counts as one token. Adds then wait, at most one at a time, while the boss is committed.
- **Impact** M. **Effort** S. **Files:** `src/world/zones.js`, `src/entities/Boss.js`.

### CB19: Waiting enemies may jitter against walls
- **Status:** Guess (code).
- **What's wrong:** `Enemy.strafe` flips `strafeDir` on **every** frame that `body.blocked.none === false` (`src/entities/Enemy.js:484`). An enemy pressed against a wall or tree while waiting for its turn would reverse every frame and vibrate in place.
- **Suggested change:** Flip at most every 0.5 s (`this.strafeFlipT`), and add a small radial step away from the wall.
- **Impact** L-M. **Effort** S. **Files:** `src/entities/Enemy.js`.

### CB20: Dead values in the boss code
- **Status:** Verified (code).
- **What's wrong:**
  - `perfectDodge` sets a boss's `stun = 0.25` and `onParry` sets 0.5, but `Boss.update` never reads `stun`. Only the `recover` state change does anything.
  - `attacker.staggered = true` is never read anywhere.
- **Suggested change:** Remove them, or make the boss honour `stun` as a "recover" extension, so a tuner changing them is not misled.
- **Impact** L. **Effort** S. **Files:** `src/entities/playerCombat.js`, `src/entities/Boss.js`.

---

## Upgrades and new content (ranked by value)

### CB21: Give each boss its own signature, not the shared nine-move list
- **What's wrong:** Ten of the eighteen bosses draw at random from the **same nine moves**: slam, sweep, volley, nova, charge, tail, breath, spikes, leap. They differ only in weights, numbers and a `special()`. The only anti-repeat rule is "re-roll once with 60% chance" (`Boss.pickAttack`). Phases add moves to the pool; they rarely change the fight's shape.
- **Why it matters:** By the fifth boss the player has seen every pattern. Identity comes from tint, size and adds.
- **Suggested change:** Per boss, add:
  1. one **signature move** no other boss has. Examples: the Hollow King's "court" (two ghost knights mirroring his sweep), Brinegut's harpoon pull into a slam, the Hartking's crystal-wall corridor, the Storm Giant's lightning line that follows your path;
  2. two or three **scripted strings**, such as sweep→sweep→slam or leap→nova, with a readable rhythm;
  3. for phase 3, a **new rule** rather than just more of everything.

  Keep the shared moves as filler.
- **Impact** H. **Effort** L. **Files:** `src/entities/Guardians.js`, `src/entities/Guardians4.js`, `src/entities/PatternBoss.js`, `src/data/tuning.js`. **DESIGN**

### CB22: Late regular enemies get tougher but never smarter
- **What's wrong:** `enemyscale.js` scales only HP (up to ×6.2) and damage (up to ×3.9). Wind-ups, cooldowns, the two-attacker limit and AI stay the same as in the starting forest.
  - The balance table already flags tier-2 and tier-3 patrols as 20/20 wins with 0-0.4 potions.
  - Raising `TUNE.scaling` alone only makes enemies take longer to kill.
- **Suggested change:** Scale behaviour with the same progress value `f`:
  - attack slots 2 → 3 at f > 0.6;
  - cooldown ×(1 − 0.25f);
  - chance of a second attack after the first (a follow-up string) at f > 0.4;
  - elite affixes that change behaviour, not just stats: **Unflinching** (wind-up hyper-armour), **Relentless** (two-swing string), **Duellist** (parries your third combo hit), **Marksman** (leads its shots).

  Then trim the HP scaling about 15% so fights get harder but not longer. Re-tune `powercurve.js` together with this, as the balance table notes.
- **Impact** H. **Effort** M. **Files:** `src/systems/enemyscale.js`, `src/entities/elite.js`, `src/entities/Enemy.js`, `src/world/zones.js`, `src/systems/powercurve.js`. **DESIGN**

### CB23: Give key regular enemies a second attack
- **What's wrong:** Every melee regular has exactly one attack: the same 18×18 box 12 px ahead (`Enemy.hitRect`) after one wind-up.
- **Suggested change:** Add a second move to each archetype, chosen by distance:
  - Troll and Stone Giant: a ground-slam zone (`addZone`, crush).
  - Bandit Chief and Captain Karrow: an overhead crush plus a 2-hit string.
  - Knight and Hedge Knight: a shield bash that breaks your block.
  - Wolves: a feint, a short wind-up that is cancelled half the time to bait a roll.
  - Archers: an aimed shot that leads the player once every 3 shots.
  - Casters: a ring zone, not only a circle on your feet.
- **Impact** H. **Effort** M-L. **Files:** `src/entities/Enemy.js`, `src/data/enemies.js`, `src/data/enemies4.js`. **DESIGN**

### CB24: Weapon classes need their own heavy attack and one rule each
- **What's wrong:** Today all eight melee styles share one heavy attack (`TUNE.player.heavy`); only the staff fires a bolt instead. Several styles have no identity of their own:
  - **Sword** has no unique trait; its role is "can carry a shield".
  - **Axe** plays like a mace without guard-breaking.
- **Suggested change:** Add a `heavy` entry per style and one unique rule:
  - **Sword:** a riposte window +0.4 s and a parry-cancel out of any combo step.
  - **Dagger:** heavy = a short step behind the target, which counts as a backstab.
  - **Axe:** each hit on the same target adds bleed stacks; the heavy cleaves 270°.
  - **Spear:** heavy = a lunge thrust with 34 px reach that pins (roots 0.6 s).
  - **Halberd:** heavy = a 360° sweep; it keeps foes at range (bonus damage at the tip).
  - **Greatsword:** hold heavy to charge 2 levels with hyper-armour while charging.
  - **Mace and hammer:** heavy = a ground shock (small AoE stagger); the hammer adds a crush on any guard.
- **Impact** H. **Effort** M. **Files:** `src/data/tuning.js`, `src/entities/playerCombat.js`, `src/data/items.js` (descriptions), `test/stage67_daggers.mjs`, `test/stage68_staves_halberds.mjs`. **DESIGN**

### CB25: Parrying a projectile deflects it
- **What's wrong:** A parry against a projectile only grants the riposte timer. The projectile is destroyed and nothing comes back.
- **Suggested change:** A parried projectile (a perfect-timing block) flies back at its owner with ×1 damage and `src: 'arrow'`. Boss orbs return at ×0.5. This gives shield builds an answer to archers and to projectile-heavy bosses (CB8), and it is a strong "skill moment".
- **Impact** M. **Effort** M. **Files:** `src/entities/playerCombat.js`, `src/entities/Projectile.js`. **DESIGN**

### CB26: Hard difficulty only makes bosses hit harder
- **What's wrong:** `TUNE.difficulty.hard.windup 0.85` is skipped for `kind === 'boss'` ("bosses keep their own timing", `Enemy.js` constructor). Hard bosses differ from Normal only by ×1.46 damage taken and ×2.15/1.73 HP.
- **Suggested change:** On Hard:
  - boss wind-up ×0.9 with a floor of 0.38 s;
  - the phase-2 threshold at 60% instead of 50%;
  - one extra move or string from CB21 per boss.

  Damage stays where it is. Hard then asks for more mastery, not more potions.
- **Impact** M. **Effort** S. **Files:** `src/entities/Boss.js`, `src/entities/PatternBoss.js`, `src/data/tuning.js`. **DESIGN**

### CB27: The perfect dodge slows you down too
- **What's wrong:** `slowmo(0.3, 480)` scales the whole scene's `dt` (`GameScene.update:674`), so the player is slowed as well. The slow-mo is only a cinematic pause, not a reward window.
- **Suggested change:** Slow the enemies and projectiles only, at ×0.3 for 0.5 s, while the player moves at full speed. The 2 s ×1.6 counter buff then becomes something you can use. Optional: dim the screen edges. Respect `reduceMotion`.
- **Impact** M. **Effort** M. **Files:** `src/scenes/GameScene.js`, `src/entities/Enemy.js`, `src/entities/Projectile.js`. **DESIGN**

### CB28: Difficulty curve: smooth the mid-game wall and give the late game a spike
- **What's wrong:** From `docs/BALANCE_TABLE.md` plus the code:
  - The early game is gentle: the wolf pack 18/20 and Jarl Valdrek 11/20 for the bot.
  - The **mid-game spikes hard**: the Blight Mother (7/20 after a fix, still the wall) and the Ashen Sovereign.
  - Late regular patrols go **flat** (20/20, CB22).
  - Late bosses get shorter wind-ups: the fastest phase-2 tells drop from 0.48 s (Valdrek) to 0.32-0.36 s (Brinegut, Hartking, Blight Mother).
  - Phase 3 is softer than phase 2 (CB7).
  - The bot cannot measure CB1 stun-locking, which may hide how easy late regular fights really are for a human.
- **Suggested change:**
  1. Fix CB1, CB7 and CB9 first, then re-run the 20-trial matrix. Those three move the numbers the most.
  2. Set a floor of 0.4 s on boss phase-2 wind-ups for melee moves. Get late difficulty from strings (CB21) instead of shorter tells.
  3. Add a "bot mashes" profile to `test/balance.mjs`, so stun-lock exploits show up in the numbers.
  4. Target bot win rates of 50-70% (early), 30-50% (mid) and 20-40% (late), with the last boss the lowest.
- **Impact** M-H. **Effort** M. **Files:** `test/balance.mjs`, `src/data/tuning.js`, `docs/BALANCE_TABLE.md`. **DESIGN**

---

## Top 5

1. **CB1 Stun-lock:** any hit, even a 6-damage knife, cancels any regular enemy's wind-up. A 1035-HP troll landed 0 attacks in 8 s of swinging. Hyper-armour for heavy enemies and mini-bosses restores "read the tell".
2. **CB2 Input lost during hit-stop:** a roll tapped during a 0.144 s greatsword freeze never happens (probe2). Buffering presses through the freeze is a few lines and removes a "dropped input" feeling.
3. **CB3 + CB4 Heavy weapons do not feel heavy:** every weapon hits 4 frames after the press, the blade art arrives after the damage, and every greatsword, axe, mace and hammer swing gets the finisher-only perks and the ×1.6 hit-stop. Per-style hit windows plus an explicit finisher flag fix both.
4. **CB6 Projectiles aim 8-way even when locked on:** arrows and bolts miss targets that are not on a 45° line. Aim with the exact target or pointer vector.
5. **CB7 Final boss phases are slower than phase 2:** the `bphase === 2` checks give eight three-phase bosses 25% longer wind-ups and 33% longer recovery in phase 3. Change to `>= 2`, add a phase-3 step and re-run the balance bot.
