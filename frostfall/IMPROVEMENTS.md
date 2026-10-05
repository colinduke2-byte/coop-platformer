# Frostfall: improvement and feature backlog

Priority: **P1** do next, **P2** worthwhile, **P3** nice to have.

## Verify and tune (nobody has hand-played it yet)
- **P1** Balance pass: bandit camp, boss health (300), potion supply, stamina costs, sword combo damage.
- **P1** Control feel: roll length, bow charge time, telegraph lengths, hit-stop.
- **P1** Test in Firefox and Safari (audio autoplay) and with a real gamepad.
- **P2** Readability in small windows (the 5x7 font gets tiny). Add a UI scale option.

## Combat
- **P1** Block/parry with a shield (timed parry staggers enemies).
- **P2** Enemy variety: shield draugr, wolf alpha, bandit leader, caster.
- **P2** More spells (ward, healing, lightning) and elemental weaknesses.
- **P2** Retrievable arrows stuck in enemies and walls.
- **P3** Two-handed weapons, dual wielding, finishing moves.
- **P3** Enemy group tactics (flanking, retreat when hurt).

## Skyrim-style systems
- **P1** Skill perks chosen at certain levels, plus an overall character level.
- **P2** Selling items to Mirra, weapon upgrades at a forge.
- **P2** Lockpicking and pickpocketing (sneak skill).
- **P3** Alchemy (combine ingredients), enchanting, followers.

## Story and world
- **P1** More quests (3 to 5), with choices that matter beyond the ending.
- **P2** A second boss and a fourth zone (mountain pass, frozen lake).
- **P2** House interiors, a day/night cycle, weather.
- **P3** Lore notes and a bestiary in the journal, NPC schedules.

## Presentation
- **P1** Attack and death animation frames, a held-weapon sprite.
- **P2** More tile variety, a real light system, a longer soundtrack, a combat stinger.
- **P2** Quest markers and first-time tooltips for mechanics.
- **P3** Inventory sort and filter, screenshake and flash toggles.

## Systems
- **P1** Key rebinding, difficulty setting (easy/normal/hard).
- **P2** Multiple save slots, corrupt-save recovery, save mid-boss.
- **P2** Touch and mouse controls.
- **P3** Sprite pooling for particles, performance check on slow machines.

## Code health
- **P2** Split `GameScene` (it does too much); move tuning numbers into one data file.
- **P2** Unit tests for damage and skill math; run `npm test` in CI.
