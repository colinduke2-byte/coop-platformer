# Balance table (refinement pass)

Measured with the balance bot (`test/balance.mjs`), 20 trials per fight, on Normal, after Normal was made about 10% harder
(`TUNE.difficulty.normal`: damage taken 0.99 -> 1.04, enemy health 1.65 -> 1.73).

**The bot is a lower bound on a human.** It walks straight in, swings, rolls away from telegraphs it has seen for 0.28 s and
drinks a potion below 40% health. It never kites, never uses the bow or spells, never targets a healer or a pod first, and
never learns a pattern. A practised human wins clearly more often. So a bot win rate of 15-50% on a boss means "a few
tries" for a human, and 50-80% on an ordinary fight means "a decent player wins, with some potions".

## Round 1 (all 16 fights)

| Fight | Expected gear | Bot wins | Boss health left on losses | Potions used | Verdict |
|---|---|---|---|---|---|
| Wolf pack | start | 18/20 | | 3.5 | ok (first fight, gentle) |
| Bandit camp | iron | 16/20 | | 6.4 | ok |
| Crypt hall | steel | 16/20 | | 3.8 | ok |
| Tier 1 patrol | nordic +3 | 15/20 | | 4.5 | ok |
| Vale patrol | nordic +4 | 6/20 | | 9.2 | **too hard** (Hedge Knights) |
| Sunscorch patrol | forged +6 | 13/20 | | 5.7 | ok |
| Tier 2 patrol | forged +6 | 20/20 | | 0.4 | too easy (see note) |
| Tier 3 patrol | legendary +9 | 20/20 | | 0 | too easy (see note) |
| Jarl Valdrek | iron | 11/20 | 16% | 8.5 | ok (first boss) |
| Grimfang | iron | 8/20 | 33% | 8.3 | ok |
| Kragnar | ember mail | 4/20 | 20% | 12.6 | ok, hard |
| Admiral Veyl | ember gear | 6/20 | 15% | 11.4 | ok |
| Hollow King | ember mail | 5/20 | 25% | 15.8 | ok, hard |
| Ashen Sovereign | ember mail | 2/20 | 31% | 15.3 | **too hard** |
| Blight Mother | nordic +5 | 0/20 | 42% | 12.8 | **a wall** |
| Vault Sovereign | forged +7 | 5/20 | 32% | 14.8 | ok, hard |

Changes from round 1:
- `TUNE.bosses.blightmother.hp`: 0.45 -> 0.35
- `TUNE.bosses.sovereign.hp`: 0.7 -> 0.62
- Hedge Knight: health 80 -> 72, damage 19 -> 16

**Not changed, flagged for Colin:** ordinary patrols at tier 2 and 3 with the expected gear are trivial for the bot (20/20, almost
no potions), while the new Sunscorch creatures at tier 2 are fair (13/20). The old tier 2/3 creature types (knights, reavers,
conjurers, fencers, wights) fall behind the gear curve late in the game. The knob is `TUNE.scaling` (`hp` 5.2, `dmg` 2.9 at the
end of the game); a step to 5.6 / 3.3 makes them about 10% tougher late on, but it also moves the in-game danger warnings
(the power model in `systems/powercurve.js`), which would need re-tuning together. Left alone because Colin judged the overall
level about right; worth a look if the late game feels easy.

## Round 2 (the three tuned fights)

| Fight | Change | Bot wins | Boss health left on losses | Verdict |
|---|---|---|---|---|
| Ashen Sovereign | health x0.7 -> x0.62 | 8/20 | 17% | ok |
| Vale patrol | Hedge Knight 80 -> 72 health, 19 -> 16 damage | 13/20 | | ok |
| Blight Mother, bot ignores pods | health x0.35 | 0/20 | 28% | the pods are the fight |
| Blight Mother, bot kills pods first (as the fight tells you) | health x0.35 | 15/20 | 3% | too easy |
| same | health x0.42 | 16/20 | 7% | too easy |
| same | **health x0.5** (final) | **7/20** | 11% | ok |

The Blight Mother is a fight you learn: a player who ignores the pods will not win; one who destroys them each time she roots
wins with a few tries. If that first wall feels unfair, the knobs are her rooted damage taken (`takenMul = 0.25` in
`entities/Guardians4.js`) and her root timer (12-14 s, 10 s in phase 2).

## Combat pass (CB28), 2026-10-24

Balance bot (`node test/balance.mjs N "name"`, Normal), before the combat pass and after it (signatures, strings, phase-3 rules,
phase-2 melee tell floor 0.4 s, hyper-armour, then the boss HP retune below). The bot is noisy at these trial counts.

| Fight | Before | After |
|---|---|---|
| Jarl Valdrek (iron) | 2/4 | 4/6 |
| Blight Mother (nordic +5) | 3/6 | 2/6 (boss 17% left) |
| Ashen Sovereign (ember) | 0/6 (boss 26% left) | 4/6 |
| Hollow King (ember) | 2/4 | 2/6 |
| Vault Sovereign (forged +7) | 1/6 | 2/4 |
| tier 2 patrol (forged +6) | 1/4 | 1/4 |

Boss HP: boss 0.92 -> 0.8, sovereign 0.62 -> 0.42, hollowking 0.5 -> 0.36, blightmother 0.5 -> 0.46, vaultsovereign 0.65 -> 0.6,
winter (new) 1.1: the Long Winter is the late spike (no bot scenario yet). The bot only reacts to wind-ups, not to ground
zones, so the zone-based signatures cost it more than they cost a player.

## Finish pass: the masher profile (CB28), 2026-10-24

`test/balance.mjs` has a second profile: `PROFILE=masher node test/balance.mjs N` walks in and mashes the sword key, never rolls
and never raises the shield (it still drinks potions below 40%). It is the floor under the floor. Both profiles, 4 trials each
on Normal, after the combat pass (CB22 smarter late foes, CB23 second moves, boss signatures). "HP left" is the bot's health
on wins; "boss left" is the boss's health on losses.

| Fight | Normal bot | Masher | Notes |
|---|---|---|---|
| Wolf pack (start) | 4/4 | 4/4 | |
| Bandit camp (iron) | 2/4 | 4/4 | masher better |
| Crypt hall (steel) | 3/4 | 3/4 | |
| Jarl Valdrek (iron) | 1/4, boss 24% left | 3/4, boss 11% left | masher better |
| Grimfang (iron) | 0/4, boss 36% left | 1/4, boss 37% left | hard first-act boss; watch it |
| Kragnar (ember) | 1/4, boss 10% left | 2/4, boss 9% left | |
| Ashen Sovereign (ember) | 3/4 | 1/4 | the one fight dodging clearly pays |
| Admiral Veyl (ember) | 2/4 | 1/4 | |
| Hollow King (ember) | 0/4, boss 25% left | 2/4, boss 10% left | masher better |
| Vale patrol (nordic +4) | 2/4 | 1/4 | |
| Sunscorch patrol (forged +6) | 0/4 (87 s, time-outs) | 3/4 | the normal bot rolls out of reach and times out |
| Blight Mother (nordic +5) | 1/4, boss 26% left | 2/4, boss 17% left | |
| Vault Sovereign (forged +7) | **0/4, boss 49% left** | **0/4, boss 51% left** | out of line: retuned below |
| Tier 1 patrol (nordic +3) | 3/4 | 3/4 | |
| Tier 2 patrol (forged +6) | 2/4 | 2/4 | was 20/20 before CB22 |
| Tier 3 patrol (legendary +9) | 0/4 (120 s, time-outs) | 0/4 (120 s, time-outs) | no deaths and no potions: the bot never finishes the conjurer before the limit |

Retune, re-run at 8 trials:
- `TUNE.bosses.vaultsovereign.hp`: 0.6 -> 0.42: normal 1/8 (boss 36% left), still a wall.
- `TUNE.bosses.vaultsovereign.hp`: 0.42 -> **0.32** (kept): normal 3/8 (boss 25% left), masher 3/8 (boss 21% left). Inside the
  late target of 20-40%. The fights are short (31 s): the bot dies to his damage, so if he still feels like a wall the next knob
  is his damage (`TUNE.bosses.vaultsovereign.dmg`), not more health.

**Flagged for Colin (not changed):** the masher wins as often as, or more often than, the dodging bot in most fights (bandit
camp, Valdrek, Hollow King, Sunscorch). Mashing still pays: hits interrupt wind-ups often enough that rolling costs more damage
than it saves. Only the Ashen Sovereign clearly rewards dodging. The knobs are `TUNE.combat.windupArmor` (hyper-armour share,
now 0.12) and `armorKb`, so more foes keep their swing through a flurry. The tier 3 patrol needs a longer limit in the bot (or a
bot that chases casters) before its numbers mean anything.

## Playtest pass (stage125-127), 2026-10-25

Where Colin is (the first Heart taken) and the next stretch (Ironwatch Keep, the Drowned Chapel, the Rootvault, the Reach
around them). Three changes to the tools first, because they change how to read every number above:

- **The balance bot now runs on a stepped clock.** It thinks every 4 frames of the harness's stepped time instead of on a
  60 ms wall-clock timer, so a busy machine (7 agents on 4 cores) no longer drops frames under it. `REALTIME=1` brings back
  the old loop. The machine's load had been flattering the masher: see "Mashing" below.
- **A third profile, `PROFILE=careful`**: rolls in the last 0.22 s of a tell it has watched for 0.28 s (the normal bot rolls
  as soon as it reacts, and its 0.27 s of i-frames often end before the blow lands), keeps a roll's stamina in reserve,
  fights unarmoured foes first, parries an armoured one (shield up in the last 0.1 s of its wind-up) and breaks a raised
  shield with a heavy blow. It is the "careful player" of the targets. It still never kites, shoots or casts.
- **"REAL" kit**: the earlier Heart scenarios assumed Nordic Plate +4/+5, but nothing sells or drops Nordic Plate before
  Emberhold and the village smith stops at +3. The REAL scenarios use what a player can have: Nordic Blade, Shield and Helm
  +3, Iron Cuirass +3, 6 potions, the Hearts taken so far.

6 trials each unless noted, Normal. normal / masher / careful.

### The opening (where Colin is)

| Fight | Kit | normal | masher | careful | Verdict |
|---|---|---|---|---|---|
| Wolf pack | start | 6/6 | 3/6 | 5/6 | ok, gentle |
| Bandit camp | iron | 6/6 | 2/6 | 6/6 | ok |
| Crypt hall | steel | 6/6 | 6/6 | 6/6 | ok, easy in steel; hard in iron (playtest bot: 5 deaths in iron + Fur Tunic) |
| Jarl Valdrek | iron | 4/6 (12% left) | 0/6 (32%) | 3/6 (15%) | ok, first boss: a few tries |
| Grimfang | iron (before the crypt) | 2/6 (26%) | 0/6 (45%) | 1/6 (43%) | hard if you go before the crypt |
| Grimfang REAL | Valdrek's drops (most players) | 6/6 (12%) | | 5/6 | ok |
| Tier 1 patrol | nordic +3 | 3/6 | 0/6 | 3/6 | ok |
| Vale patrol | nordic +4 | 4/6 | 4/6 | 3/6 | ok |
| Maw hall (tier 2 reavers, wights, wolves) | nordic +1 | 6/6 | 6/6 | 6/6 | ok, easy in a group of three |
| Rime Wyrm | nordic +1 | 3/6 (16%) | 4/6 (1%) | 6/6 | ok: a careful player beats it |

### One run of the playtest bot (`node test/playtest.mjs`, title screen to the Rime Heart, Normal)

The walking is teleported and the bot is crude in dungeons (it charges the nearest guard and pulls whole groups, never uses
the smith), so deaths in the crypt and the Maw halls are high; the boss rows are the meaningful ones.

| Step | Level | Gold | Potions | Gear | Fight | Deaths |
|---|---|---|---|---|---|---|
| Tutorial wolf, drills, starter quest | 1 | 4 | 4 | Rusty Sword, Fur Tunic, Wooden Shield | 1 s | 0 |
| Wolf hunt, Mirra's herbs | 1 | 128 | 8 | same | 43 s, 77 HP lost | 0 |
| 8 tier-0 camps and dens | 2 | 196 | 8 | same | 27 s, 162 HP | 0 |
| Hilda | 2 | 66 | 8 | Iron Sword, Iron Cuirass | | |
| Crypt guards | 2 | 95 | 0 | same | 199 s, 1092 HP | 5 |
| Jarl Valdrek | 3 | 210 | 2 | Nordic Blade and Helm (his drops) | won on try 2 | 1 |
| Grimfang | 3 | 158 | 3 | + Iron Shield | won on try 1, 27 s | 0 |
| Maw guards | 3 | 64 | 0 | Pale Pelt Mantle | 116 s, 814 HP | 5 |
| Rime Wyrm | 3 | 183 | 3 | same | won on try 2 | 1 |

No soft-lock, no page error, every quest step advanced (starter quest, drills, wolves, herbs, the crypt, the Frostheart, the
Hearts quest, the Rime Heart), and the first trip warned and marked a campfire with no foe within 300 px of the exit.

### The next stretch

| Fight | normal | careful | Verdict / change |
|---|---|---|---|
| Keep yard (knight, warden, bandit), tier 2, REAL | 0/4 | 1/4, then 2/8 | **a spike**: the Maw's hall 6/6, the Chapel's nave 4/4 |
| same at tier 1 | 0/4 | 4/4 | **changed: the Keep's courtyard is tier 1** (the barracks and the Warlord stay tier 2) |
| Warlord REAL | 1/4 (21%) | 5/6 | ok |
| Chapel nave (draugr, wight, reaver), tier 2, REAL | 4/4 | 4/4 | ok |
| Tide REAL | 3/4 (3%) | 5/6 | ok |
| Rootvault wound (reaver, knight, alpha), tier 3, REAL | 0/4 | 0/4 | **a wall** (dead in 13-46 s) |
| same at tier 2 | 0/4 | 4/4 (7.5 potions a fight) | **changed: the Rootvault's guards are tier 2** |
| Root REAL | 1/4 (17%) | 5/6 | ok |
| Reach tier 2 camp (reaver, warden, wight), REAL + Rime Heart | 0/4 | 4/4 | ok for a careful player |
| Reach tier 3 camp (reaver, knight, wight), REAL + Rime Heart | 0/4 | 0/4 | **a wall: flagged, not changed** (see below) |

The normal bot cannot beat a Rime Knight or a Draugr Warden at any tier (it never parries or uses heavies), so read its 0s
against those as "this fight asks for the parry", not as "too hard". Whole-room fights (every guard of a room alerted at
once) are lost by every profile in every Heart dungeon (the Maw's first chamber 1/4 careful): pull two or three at a time.

### Mashing

Measured on the stepped clock, **mashing does not pay** and no feel change was made: the masher loses Valdrek 0/6 (normal
4/6), Grimfang 0/6 (2/6), the tier 1 patrol 0/6 (3/6), the bandit camp 2/6 (6/6), the Warlord 0/6 (1/6). It only matches the
dodging bots in soft rooms (crypt hall, Maw hall) and against the two slowest bosses (Rime Wyrm 4/6, Tide 4/6). The old table's
"masher as good as the dodging bot" came from the wall-clock loop on a loaded machine; even on the old loop today the masher
loses (bandit camp 1/4 vs 3/4, Valdrek 0/4 vs 1/4, Grimfang 0/4 vs 2/4). If mashing still feels strong in play, the knobs are
the same as before (`TUNE.combat.windupArmor`, `armorKb`).

### Flagged for Colin (not changed)

- **The Heart sites sit in tier 2-3 land.** Over 24 world seeds: the Maw is tier 1 in 14, tier 2 in 5 and **tier 3 in 5**;
  Ironwatch Keep tier 2 in 9, tier 3 in 15; the Drowned Chapel tier 2 in 6, tier 3 in 18; the Rootvault tier 3 in all 24. With
  the kit a player can have before Emberhold, a tier-3 camp kills even the careful bot in 13 s. The marker sends you there
  anyway. Options: place the Heart sites at tier 1-2 in worldgen (the world agent's file; it moves the Reach hash), or lean
  ordinary-enemy scaling more on the story (`TUNE.scaling` regionW 0.7 / storyW 0.3, for example 0.6 / 0.4: about 12% less
  health and damage in tier-3 land early, the same at the end).
- **Order of the Hearts.** The marker and Sigrid follow a fixed order (Maw, Keep, Chapel, Rootvault). In 4 of 24 worlds the
  Keep is in tier-3 land while the Chapel is tier 2; sorting the remaining Hearts by the tier of their land would send players
  to the easier one first.
