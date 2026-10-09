# Game Design — working title: *DREAMERS*

> Colin owns this doc. Claude reads it before building features and asks before
> changing the pillars. Fill in the TODOs over time; defaults are placeholders.

## Pitch
A bright, hand-painted, 1–4 player local co-op platformer on one screen,
where movement feels fluid and floaty-but-precise, levels flow at speed,
and friends save each other constantly. (TODO: Colin, one sentence in your words.)

## Pillars
1. **Movement is the joy.** Running and jumping alone should feel good in an empty room.
2. **Co-op is chaotic and generous.** Nobody waits long; bubbles, revives, drop-in/out.
3. **Flow over punishment.** Frequent checkpoints, fast restarts, collectibles reward mastery.
4. TODO

## Players & characters
- 1–4 players, keyboard (2 layouts) or gamepads, join anytime.
- Characters (original, "goofy dreamers"; see `characters/*.tres`, preview in `characters/character_gallery.tscn`):
  - **P1 Mumbleby**: sleepy wizard, purple robe, bent star hat, long copper hair. Casts spells only in her sleep.
  - **P2 Sir Dinkworth**: tiny knight lost inside a huge bucket helm with a red plume. Never sees where he's going.
  - **P3 Tootle**: bard in a green tunic, red beret with a yellow feather, fluttering scarf. Knows one song, about himself.
  - **P4 Gribble**: portly bandit, orange coat, eye mask, pink polka-dot bandana. Steals only things nobody wanted.
  - Glide: each one's headwear twirls like a propeller.
  - Idle quirks (stand still ~2.5 s): Mumbleby snores, Dinkworth wags his plume, Tootle hums, Gribble's eyes dart.
- Do all characters play the same? (Default: yes, cosmetic difference only.)

## Moveset (current)
| Move | Input | Notes |
|---|---|---|
| Run | stick / WASD / arrows | analog speed on sticks |
| Sprint | hold Ctrl / RT, or double-tap a direction | 430 -> 610 px/s; enables wall runs and long sprint jumps. `auto_sprint` brings back run-to-sprint |
| Jump | A / Space / Enter | tap = short hop (always `jump_min_height`), hold = full jump; coyote time, jump buffer, apex hang |
| Glide | `glide_mode` (PlayerTuning, default SECOND_PRESS) | press jump again in the air + hold; starts at once. HOLD_THROUGH (old default): keep holding past the apex. SEPARATE_BUTTON: hold G / Numpad 0 / RB |
| Wall jump | JUMP beside a wall | works rising or falling. Toward the wall = climbing hop (climb one wall), otherwise kick away |
| Punch | X or B / Left Shift / Right Shift | tap = quick jab (90 px reach); HOLD = charge, release = mega punch (1.6x reach, bigger hitbox, 1.8x knockback, breaks iron crates); pops teammate bubbles |
| Stomp | land on enemy | bounces; hold jump to bounce higher. Chain stomps without landing = bigger bounces, x2/x3 pops, bonus Lum from x3 |
| Crouch / slide | DOWN / DOWN while running | crawl under low gaps; slide knocks enemies over; slide + jump = long jump |
| Ground pound | DOWN + PUNCH in the air | smashes breakables, launches off seesaws and bounce pads; pound-jump goes higher |
| Ledge grab | automatic | catch ledge edges and pull up |
| Wall run | sprint into a wall | runs up it a little way |
| Air punch | punch in the air | hangs you briefly in the air (`air_punch_fall_cap`) |
| Parachute | jump into a dandelion head | float down slowly, steer; wind carries you far, updrafts lift you |
| Climb / swim / swing / zipline | vines + nets, water, flower rings, ropes | see `player/states/` |

Full button list: `docs/CONTROLS.md`.

World toys: ~45 pieces - see `docs/LEVEL_BUILDING.md` for the full catalogue.
Ideas backlog: air dash, carrying teammates, throwable items. TODO: pick.

## Co-op rules
- Hit once = bubble. Teammate touches or punches bubble = revived.
- Everyone bubbled = restart at checkpoint. Checkpoint also frees bubbles.
- Fall off-screen behind the group for 1.5 s = bubble.
- Shared Lum counter (TODO: per-player scores? end-of-level ranking?)
- Friendly fire: off. TODO: slap teammates for fun?

## World & levels
- Structure (current): Title -> character select -> **world map** (walk the gang
  between level nodes; beating a level unlocks the next) + a Bonus Dreams island.
- **World 1 - The Lullaby Woods**: 1-1 Pillow Meadow, 1-2 Dandelion Drift,
  1-3 Mossy Hollow, 1-4 Bramble Bridges, 1-5 Millstream Rush, 1-6 Thornwood Keep
  (boss: **Baron Bristleback**, a giant hedgehog knight).
- **World 2 - Frostwhistle Peaks**: 2-1 Snowball Slopes, 2-2 Cablecar Cliffs,
  2-3 Crystal Caverns, 2-4 Avalanche Alley (chase), 2-5 Hot Spring Hollow,
  2-6 Grumblefrost's Summit (boss: **Grumblefrost**, the Snowball King yeti).
  Reached by the gondola at the end of World 1's map once the Baron is beaten.
- **World 3 - Rainbloom Jungle**: 3-1 Drizzle Thicket, 3-2 Canopy Highway,
  3-3 Sunken Temple, 3-4 Rumbletide Rapids, 3-5 Firefly Bog (dark),
  3-6 Chamelia's Temple (boss: **Chamelia**, the Colour Queen chameleon - her
  tongue sticks in walls, then stomp her). New: swinging lianas, flytraps,
  monkeys, toucans and piranhas. Reached from the top of World 2's map.
- **World 4 - Clockwhirl Works**: 4-1 Cogwheel Courtyard, 4-2 Conveyor Chaos,
  4-3 Steam Pipes, 4-4 Tick-Tock Tower (vertical), 4-5 Night Shift (dark),
  4-6 Cuckoolossus Clocktower (boss: **Cuckoolossus**, a giant cuckoo clock -
  jump its pendulum, stomp the cuckoo when it sticks in the floor). New:
  tick-tock blocks that swap on the beat, zap arcs, factory scenery, wind-up
  soldiers, sparkbots and springbots. Reached from the top of World 3's map.
- **World 5 - Deep Sea Dream**: 5-1 Seashell Shore, 5-2 Coral Kingdom,
  5-3 Shipwreck Cove, 5-4 Kelp Forest Rapids, 5-5 Midnight Trench (dark),
  5-6 The Drowned Palace (boss: **Inkabella**, a giant octopus - when a
  tentacle slams down and sticks, stomp or punch its tip; she floods the hall
  when she's angry). Mixed land and swimming, no air meter. New: bubble
  columns, giant clams, tides, kelp, pufferfins, crabbits, jellybobs, eels and
  anglerlings. Reached from the top of World 4's map.
- **World 6 - Midnight Carnival**: 6-1 Ticket Booth Promenade, 6-2 Carousel
  Crossing, 6-3 Hall of Mirrors, 6-4 Rollercoaster Ruckus, 6-5 Ferris Wheel
  Heights, 6-6 The Big Top (boss: **Madame Topsy-Turvy**, a ringmaster who
  whacks the arena's lever to flip gravity - and gets dizzy when she does). THE
  SPIN: gravity flips, always by a PHYSICAL switch (never a controller button):
  punchable **levers**, **pressure plates**, **bumpers** and **arches** (which SET
  gravity). Every level is a corridor with a walkable floor AND ceiling; flipped,
  the ceiling is the floor. New: Jack-in-the-bonk, Unicyclops, Popcorn Pufflet,
  Balloonatic, Marionette. Reached from the top of World 5's map.
- **World 7 - Nightmare Nebula (secret)**: 7-1 Starfall Gardens, 7-2 Comet
  Clockworks, 7-3 Abyssal Canopy, 7-4 The Nightmare Core. Short, hard remix
  levels mixing every world's pieces over a starry void; the finale is a boss
  rush (Cuckoolossus, then Inkabella). Opens from the top of World 6's map once
  World 6 is beaten AND 75% of the Dream Gems in Worlds 1-6 are found (81 of 108).
  (It used to be World 6; old saves move over automatically.)
- Bonus Dreams: the movement playground, Candy Canopy, Sunset Gusts, Glacier Grotto.
- Level types so far: standard, dark cave, river/water, vertical climb, chase (avalanche), boss. TODO: music levels.
- Target level length: 3–5 min.

## Collectibles & progression
- **Lums** (common, shared counter; best count saved per level). Every Lum from
  a finished run is also saved up for the **Lum Shop** (World 1 map, below the
  Bonus balloon): 7 outfits for sale, some with their own hat; your dreamer tries
  each one on before you buy. Wear them from the character select (UP / DOWN). A **Dream Bell**
  in each W1 level starts a Lum Rush: 10 s where every Lum is gold and worth 2.
- **3 gems** per level (at least one behind a secret wall / hidden room).
- **1 Snoozling** per level: a sleepy dream-critter in a cage - punch it open.
- Map badges show gems + Snoozling per level; results show records; beating
  1-6 shows World 1 totals.
- **Dream Wardrobe**: gems and Snoozlings unlock outfits (Sunset 6 gems, Minty 12,
  Snoozling PJs 6 Snoozlings, Frostbite 20, Midnight 28, Golden Dreamer = everything).
  Pick with UP / DOWN on character select. Edit the list in `characters/wardrobe.gd`.

## Art & audio direction
- Painted, storybook look (see docs/VISUAL_OVERHAUL.md): shapes drawn in code with baked
  painterly textures, hand-inked tapered outlines, per-world colour grades, layered parallax
  with mist and framing foreground silhouettes, rim-lit cutout characters, paper-card UI in
  Fredoka. Quality presets (Low / Medium / High) scale it from phones to desktops.
- Music: generated chiptune-ish tracks per level (`tools/audio/gen_music.py`),
  boss theme, map theme. TODO: Colin's taste - replace with composed tracks later?

## Open questions for Colin
- Name of the game and characters?
- Difficulty target: kid-friendly, or tough optional challenges?
- Any online play ever, or strictly couch co-op?
