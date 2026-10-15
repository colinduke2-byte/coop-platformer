# Audit: world, exploration and quest design (prefix WQ)

Reviewer scope: region layout and navigation, point-of-interest density, exploration rewards, dungeons, quests, fast travel,
day/night and weather, settlements, and reasons to revisit. This audit is read-only: no game file was changed.

**How it was checked.** I read the code in `src/world/*` and `src/data/*` (worldgen, landmarks, discovery, events, livingworld,
lighting, nightlife, barrowgen, roomkinds, minesgen, quests, sidequests, contracts, hamlets, every `regions*_story.js`, chapter3)
and the four context docs. The numbers come from building every region in Node on seeds 1000, 8919, 16838 and 424242
(scratch scripts are in the session scratchpad, not in the repo). Walk speed is 72 px/s, which is 4.5 tiles/s, so "s" below
means seconds of walking. Anything not measured is marked *guess*.

## Measured baseline

| Region | Size (tiles) | Places | Places per 1k walkable tiles | Rest fires | Furthest point from a fire (tiles) | Hub walk | Boss-dungeon walk |
|---|---|---|---|---|---|---|---|
| Hollow Reach | 540x378 | 110 | **0.75** | 39 | 88-107 | (village) | Maw 68 s, Keep 114 s, Nest 160 s, Coast Road 183 s |
| Ashen Peaks | 240x180 | 47 | 1.66-1.90 | 20 | 61-71 | Emberhold 23 s | Forge 72 s |
| Frozen Coast | 260x190 | 45 | 1.16-1.23 | 20 | 71-73 | Saltmarket 22 s | Tidebreak 52 s |
| Old Kingdom | 260x190 | 40 | 1.10-1.17 | 14 | 75-99 | - | Sepulchre 67 s |
| Weeping Fens | 260x190 | 43 | 1.15-1.20 | 14 | 79-92 | Reedwick 43 s | Sunken Barrow 58 s |
| Stormcrown | 260x190 | 45 | 1.21-1.33 | 20 | 67-85 | Skarn Hold 39 s | Stormspire 60 s |
| Glasswood | 260x190 | 45 | 1.42-1.49 | 14 | 75-104 | Lantern Glade 42 s | Hart Spire 63 s |
| Underdeep | 240x180 | 42 | 1.61-1.62 | 13 | 79-108 | **Lanternfall 63 s** | **Lode Chasm 48 s** |
| Embergreen Vale | 260x190 | 41 | 1.35-1.39 | 14 | 74-90 | **Greenhollow 55 s** | **Thornroot 53 s** |
| Sunscorch | 260x190 | 42 | 1.27-1.35 | 13 | 87-103 | **Amberwell 65 s** | **Sealed Vault 43 s** |

On roughly 8-9% of the Reach's walkable ground you are more than 30 tiles (about 7 s) from any place. The biggest empty
circle is 56-72 tiles across.

---

## A. Fixes and polish

### WQ1. Every region except the Reach rolls its events, traders, digs and fishing at the Reach's danger tier
- **What is wrong.** `events.js`, `livingworld.js` and `GameScene.js` (dig spots line 292, fish holes line 304) import the
  Reach's `tierAt` from `worldgen.js` and call it with coordinates from *whatever region you are in*. The bands start at
  (4,15) with radii 182/273/360, and a 260x190 region never gets past them. Measured share of tiles at tier 0/1/2/3:
  - Sunscorch: its own tiers are 0/0/19/81%. The Reach formula gives 63/35/2/0%.
  - Underdeep: its own tiers are 0/0/17/83%. The Reach formula gives 69/31/0/0%.
  - The rest are similar.
- **Why it matters.** In the late regions the travelling trader sells tier-0/1 gear, ambushes are tier 0, and the wounded
  traveller, raids and wolf hunts pay tier-0 gold. Treasure-map digs pay `160 + 90*tier` and tier+1 items at tier 0. Ember
  eels need tier >= 1, so they mostly never bite. The best surprises in the hardest regions pay starter rewards.
- **Change.** Add a scene helper `tierHere(x, y) = (REGION_DEFS[region]?.tierAt ?? tierAt)(x, y)` and use it in all six call
  sites. Add a unit test that the Sunscorch trader tier is at least 2.
- Impact **H**. Effort **S**. Files: `src/world/events.js`, `src/world/livingworld.js`, `src/scenes/GameScene.js`.

### WQ2. "The Hunter's Trail" and "The Bridge Troll's Toll" point at an empty spot in the forest
- **What is wrong.** `TARGETS.trail` and `TARGETS.toll` (`quests.js`) both return the fixed tile `{map:'forest', x:60, y:40}`.
  The elk and troll loops are built from tier >= 1 and tier >= 2 places. On four seeds, the nearest elk track was 146-287
  tiles from that spot, and the nearest troll track 225-422 tiles (30-95 s of walking).
- **Why it matters.** The quest is "find the tracks, follow them", and the marker sends you somewhere with no tracks at all.
  Players will decide the quest is broken.
- **Change.** Before `sawTracks`, point at the nearest track spot of that boss (`entities.t==='track' && who===id`). After
  it, point at `routePos(loop, S.playtime, phase)`, or at the nearest track ahead of the boss.
- Impact **H**. Effort **S**. Files: `src/data/quests.js`, `src/world/roamers.js`.

### WQ3. Blizzards, whiteouts and auroras happen in the desert, the warm Vale, the Fens and the Ashen Peaks
- **What is wrong.** `S.weather` is one global value. `updateClock` rolls blizzard, whiteout or aurora for every map with
  `snow || outdoors`. `stormCold` then chills you in the Sunscorch ("THE STORM CHILLS YOU: WEAR WARM ARMOUR"). The screen
  takes the grey blizzard tint or the white whiteout veil, `stealthEnv` changes, and aurora wisps spawn. None of these
  regions has `def.snow`, so there are no snow particles: you get a grey screen and a toast that makes no sense.
- **Why it matters.** It breaks the identity of the two regions that were built to be "where the Winter has not reached"
  (WORLD_EXPANSION_PLAN). It also punishes desert players for not wearing warm armour.
- **Change (now).** Gate blizzard, whiteout and chill on `def.snow`. Non-snow regions get only clear weather and the night.
  For proper regional weather, see WQ19.
- Impact **M-H**. Effort **S**. Files: `src/world/lighting.js`, `src/world/livingworld.js`.

### WQ4. Side-quest markers send you to the first place in the list, not the nearest
- **What is wrong.** `sidequests.js` `nearest()` returns `left[0]`, which is the first place in placement order.
  - "The Restless Barrows", seed 8919: the marked barrow is 537 tiles from the village; another is 121 tiles away.
  - Seed 1000: 440 tiles against 200.
  - "Hamlet Rounds", seed 1000: the marked hamlet is 164 tiles away, while the one placed "near the entrance" (102 tiles)
    is last in the list.
- **Why it matters.** A two-minute detour across tier-2 country for a tier-0 errand. The function's name says nearest.
- **Change.** Sort `left` by distance from the player (`S.x/S.y` when on the forest map, else the village edge).
- Impact **M**. Effort **S**. Files: `src/data/sidequests.js`.

### WQ5. Kill and collect quests have no "where" marker, or one that points at the hub
- **What is wrong.** In the Vale and Sunscorch chains, 19 of 27 steps are `kills` or `have` goals, and their `TARGETS` return
  `null` (`regions4_story.js` line 85+). In the older regions:
  - `TARGETS.leeches` (10 leeches) points at Reedwick itself.
  - `TARGETS.moonlit` is `null`.
  - Glimmerkin, weavers, harpooners and the similar quests point at the hub or nothing.
- **Why it matters.** "Dust devils 0/6" with no idea where dust devils live means aimless wandering in a 260x190 map. This is
  the main quest-clarity gap left after R49.
- **Change.** Add an optional `where: ['sunscorch', 'dustspire']` per step, or derive one from the region's spawn tables.
  Mark the nearest place of that kind (an uncleared one first) while the goal is open. For `have` goals, name the source in
  the objective line ("from scorpions near the oases").
- Impact **M-H**. Effort **S-M**. Files: `src/data/regions4_story.js`, `src/data/regions2_story.js`, `src/data/regions3_story.js`.

### WQ6. Random events overwrite and then delete the player's own waypoint
- **What is wrong.** `spawnTrader`, `spawnWounded` and `spawnRaid` set `S.flags.waypoint`. `removeTrader` and `removeWounded`
  then `delete S.flags.waypoint` for the whole map, whoever set it.
- **Why it matters.** This silently wipes three kinds of waypoint:
  - a treasure-map dig spot;
  - a hermit's rumour or chartmaker waypoint;
  - an accepted contract, or a waypoint you placed yourself.
  It happens every 150-300 s of exploring.
- **Change.** Give events their own transient marker (`S.flags.eventMark`, drawn in a different colour). Never touch the
  player's waypoint.
- Impact **M**. Effort **S**. Files: `src/world/events.js`, `src/world/livingworld.js`, `src/scenes/HudScene.js`.

### WQ7. The town is further from the gate than the boss dungeon in three regions
- **What is wrong.** Measured walk from the region entrance:
  - Sunscorch: Amberwell 65 s, the Sealed Vault 43 s.
  - Underdeep: Lanternfall 63 s, the Lode Chasm 48 s.
  - Vale: Greenhollow 55 s, Thornroot 53 s.

  The hub is placed with `mustHave(hub, 12, 1 or 2)` and no `near`, while the boss has a `near` box. In the Ashen Peaks and
  the Coast, the hub is 22-23 s from the gate.
- **Why it matters.** New players reach the final dungeon before the inn, the smith and the quest givers who explain the
  region. The route reads backwards.
- **Change.** Give each hub a `near: { x: START.x + 45, y: START.y, r: 30 }` like Ashen and Coast. The hub fire is then the
  natural fast-travel anchor.
- Impact **M**. Effort **S** (it changes layouts for existing seeds; `reach.mjs` and `spacing.mjs` still guard it).
  Files: `src/world/regions3.js`, `src/world/regions4.js`. **DESIGN** (layout per seed changes).

### WQ8. Cross-map quest markers say "GO TO X" with no direction
- **What is wrong.** `HudScene.markerAt` stops at a text label when the target is on another map. The worst case is turning
  in a hub chain from the Reach ("Tell Ilse" means "GO TO REEDWICK"). The route is the Fen Road (109 s away in the Reach),
  then the Fens, then the Reedwick gate. No arrow at any stage.
- **Change.** Build a small exit graph once (map, exit, destination). If the target is elsewhere, put the arrow on the first
  exit along the shortest map path and keep the label. The Reach's gates are already known places.
- Impact **M**. Effort **M**. Files: `src/scenes/HudScene.js`, `src/scenes/menuMap.js`, a small helper in `src/data/maps.js`.

### WQ9. Hidden places in warm regions are dressed in snow and pines
- **What is wrong.** In `worldgen.js`, `cache`, `hermit`, `ancient` and `spring` call `clearing(p, ..., TILE.SNOW2)`
  explicitly, and the ancient tree is a ring of `TILE.PINE` with a dead tree. Measured on seed 1000: each cache has about 40
  snow tiles, each hermit about 62, and each ancient tree about 98 snow or pine tiles. This holds in the Sunscorch, Vale,
  Ashen, Underdeep, Fens and Glasswood. A snow square in the dunes gives the hidden place away from a screen off, and it
  looks like a bug.
- **Change.** Use `def.clear` and a per-region "big tree" tile (birch, glass tree, bog tree, cactus, glowcap).
- Impact **L-M**. Effort **S**. Files: `src/world/worldgen.js`.

### WQ10. Hamlets in every region are the Reach's trapper, fisher and prospector, with Reach lines
- **What is wrong.** The generic `hamlet` branch is used in the Ashen Peaks, Coast, Kingdom, Fens, Highlands, Glasswood and
  Vale. The Vale's fisher says "the ice holds till spring", the sign reads "FURS ON EVERY FENCE", and the prospector is
  "saving for the boots" to reach the Peaks.
- **Change.** Give each region's def a `hamletKinds` table with its own sign line, three idle lines and one local ware. Reuse
  the trade code.
- Impact **L-M**. Effort **S**. Files: `src/world/worldgen.js`, `src/data/hamlets.js`.

### WQ11. Lore pages repeat, so hidden places often pay a page you already have
- **What is wrong.** Several kinds draw on just 3 pages each:
  - ruins use `'ruin' + id % 3`;
  - standing stones and ancient trees share `stone0-2`;
  - courtyards use `court%3` and wrecks `wreck%3`.

  In the Reach alone, nine stone and tree sites share three pages. The ancient tree is the hardest find in the game (7-tile
  discovery range, no road), and it usually shows "E: REREAD".
- **Change.**
  - Give hidden places their own pool of 8-10 short pages, or a page that points to another hidden place (WQ22).
  - Never place a page the player has already read when a new one exists: pick from the unread pages at spawn, keyed by
    place id.
- Impact **M**. Effort **M** (mostly writing). Files: `src/world/worldgen.js`, `src/data/lore.js`.

### WQ12. Finding a place pays almost nothing, and finishing a region pays nothing
- **What is wrong.** `discover()` pays `4 + 4*tier` gold (8-16) for a normal place and `20 + 12*tier` for a hidden one. A
  tier-2 chest pays 70+ gold and gear. The map shows `FOUND n/m`, but reaching m does nothing. The only trophies are 25 and
  60 places, out of about 500 in the game.
- **Change.**
  - Keep the small per-place payment.
  - Add milestones per region at 50% and 100% found, plus all landmarks. A chartmaker or hermit pays them: gold, a relic
    roll, or a region trinket.
  - Add a "Cartographer" trophy per region.
  - See WQ24 for the bigger version.
- Impact **M**. Effort **S**. Files: `src/world/discovery.js`, `src/systems/achievements.js`, `src/data/hamlets.js`.

### WQ13. Fast travel takes four steps and leaves out the village and dungeon fires
- **What is wrong.** To fast travel you open the map (M), press E for the cursor, T to cycle fires, then F. You can only
  pick fires in overworld regions, because `viewOf` cycles `unlockedRegions()`. The village fire, the hub interiors and the
  `*in` fires inside the Heart dungeons cannot be chosen. Going home means the forest fire at (46,23) and a walk. Travelling
  between regions always costs a flat 160 tiles of game time. That part is fine.
- **Change.**
  - Add a "TRAVEL" list on the map (F with no cursor): discovered fires grouped by region, plus HOLLOWFROST and each hub.
  - Keep the cursor flow for power users.
- Impact **M**. Effort **S**. Files: `src/scenes/menuMap.js`, `src/world/events.js`.

### WQ14. The barrow "puzzle" prints its answer, and it is the only puzzle in the game
- **What is wrong.** The rune-plate order (moon, crown, wolf) is the only puzzle entity. It is used in every barrow and cave
  trap room (`barrowgen.js`), the mines, the Drowned Chapel and a hidden vault in `maps.js`. In generated dungeons, a sign in
  the same room says "THE RUNES REMEMBER: MOON (BLUE), THEN ...". Spike, flood and ambush rooms also announce themselves on
  a sign.
- **Change (now).** Put the order on a lore page or wall carving in an *earlier* room, or on the boss-room door, so you have
  to notice and remember it. A wrong order could wake one guardian instead of doing nothing.
- For new puzzle types, see WQ23.
- Impact **M**. Effort **S**. Files: `src/world/barrowgen.js`, `src/world/minesgen.js`.

### WQ15. The header of `livingworld.js` promises "camps that get reoccupied", but nothing does that
- **What is wrong.** No code resets `S.bounty`. Every camp, den, ruin, tower and landmark is empty forever once cleared, and
  the bounty board (`contracts.js`) only offers uncleared Reach places. After about 40 clears it offers only hamlet
  deliveries and escorts.
- **Change.** Either fix the comment, or build it (WQ20).
- Impact **L** as a doc fix. Effort **S**. Files: `src/world/livingworld.js`.

### WQ16. Roads are a tree of right-angled spurs with dead ends
- **What is wrong.** `connect()` joins each place to its nearest node with an L-shaped path, so the network is a spanning
  tree: no loops, many dead-end spurs, and right-angle zig-zags (see `docs/world_map.png`). Waystones exist only on segments
  longer than 36 tiles. In dense regions that means almost none: Ashen had 1 on seed 1000.
- **Why it matters.** Going between two neighbouring branches means walking back to the junction, or leaving the road. The
  roads stop being a guide, which is the job the GUIDE gives them ("stay on the roads at first").
- **Change.**
  - After the tree, add 4-8 extra links between near pairs whose road distance is more than 2x the straight-line distance.
  - Draw diagonal or curved segments (Bresenham with a little wobble) instead of an L.
  - Place a waystone at every junction with 3+ branches, naming each direction.
- Impact **M**. Effort **M**. Files: `src/world/worldgen.js` (`reach.mjs` and `spacing.mjs` stay valid).

---

## B. Upgrades and new content

### WQ17. Fill the Reach's empty stretches with small finds
- **What is wrong.** The Reach is the region players spend the most time in, and it has half the density of every other
  region: 0.75 places per 1k walkable tiles, against 1.1-1.9 elsewhere. Some circles are 56-72 tiles across with nothing in
  them. Between places there are only random herbs, deer, nodes and wanderers.
- **Change.** Add a "minor find" kind, with no gap rule against other minor finds, about 40 in the Reach and 10-15 per other
  region. Each is a one-screen vignette with one interaction:
  - a frozen traveller with a note;
  - a broken sled with a crate;
  - a wolf kill with tracks to a den;
  - a cairn (add a stone for a 1-minute buff);
  - an ice-locked chest that needs fire;
  - a trapped fox to free.

  Give them no map icon and no discovery toast. Aim for no walkable point more than 30 tiles from something.
- Impact **H**. Effort **M**. Files: `src/world/worldgen.js` (a new dresser), `src/world/landmarks.js` (the dresser pattern),
  `src/data/lore.js`.

### WQ18. Give each landmark its own secret
- **What is wrong.** Every one of the 25 landmarks has the same kit: a guard, a chest, a lore page and the sign "A LANDMARK.
  YOU CAN SEE IT FROM FAR AWAY; THAT WAS THE POINT." (`landmarks.js` `dresser`). The approved plan promised "a small secret
  or lore reward so they are worth walking to".
- **Change.** Add a per-landmark `secret` hook. The lore text already suggests most of them:
  - Singing Tree: stand in it with the Frost Breath shout, it "sings back", and you get a buff.
  - Sphinx: a riddle with three answers; the right one gives a relic roll.
  - Frozen Fall: hit it with fire and it thaws into a cave with a chest.
  - Prism Arch: at noon (game clock) a light beam points to a buried dig.
  - Ash Bell: ring it for an ambush wave and a reward.
  - Ice Arch: walk under it and your breath hangs (a frost-resist buff).

  Do 2 per region to start.
- Impact **H**. Effort **M**. Files: `src/world/landmarks.js`, `src/entities/Props.js`.

### WQ19. Weather that belongs to each region (follows WQ3)
- **Change.** Each region def carries a weather table:
  - Sunscorch: sandstorm (sight halved, cutpurses bolder) and heat haze at noon.
  - Fens: fog banks (map dims, bogwraiths more active).
  - Ashen Peaks: ashfall (embers burn on contact unless under cover).
  - Vale: warm rain (herbs regrow, fire spells weaker).
  - Glasswood: a chime wind (crystal foes stagger; arrows ring).
  - Highlands: lightning strikes on open heath (telegraphed circles, reusing `addZone`).
  - Underdeep: no weather, but "deep tremors".

  Reuse the toast, tint and stealth pipeline.
- Impact **M-H**. Effort **M**. Files: `src/world/lighting.js`, `src/world/ambient.js`, `src/world/regions*.js`. **DESIGN**.

### WQ20. Let the world change back: reoccupied camps and a board in every hub
- **What is wrong.** There are few reasons to revisit a region once its boss is dead and its camps are cleared (WQ15).
- **Change.**
  - Every 3-5 in-game days, 1-2 cleared camps, towers or ruins in each region are retaken by a tougher crew: tier+1, a
    named lieutenant, a new sign line ("THE HOLLOW BANNER FLIES HERE NOW").
  - This feeds a bounty board in each hub. Emberhold's guildhall and wardpost already have `board` props with no bounty
    use, and Reedwick, Skarn Hold, Lantern Glade, Greenhollow and Amberwell need one each.
  - Never reoccupy dungeons, landmarks or places a quest needs.
- Impact **H**. Effort **M**. Files: `src/data/contracts.js` (per-region), `src/world/livingworld.js`, the `src/data/hubs*.js` files.
  **DESIGN**: it changes "cleared stays cleared".

### WQ21. Break the region quest template
- **What is wrong.** Every region runs the same pattern: find and kill the boss, kill N of a creature (10 leeches, 8
  glimmerkin, 8 weavers, 6 harpooners), and bring N of an item (5 orchids, 5 feathers, 5 glass bloom, 5 glowcaps, 4 pearls,
  4 salt). The Vale and Sunscorch chains are 27 steps of kills (11), collects (9) and clears (8). The memorable quests are the
  exceptions: Grimfang's spare choice, Red Sula, the vault choice and Ragna's company.
- **Change.** Give each region one quest of a new kind, built from systems that already exist:
  - **Investigation** (Fens): three clue signs or lore pages lead to a hidden cache and a culprit NPC. Reuse the `noteTargets`
    from the torn-map quests.
  - **Defence** (Highlands): Skarn Hold is raided at night and you hold the ring for 3 waves. Reuse `spawnRaid` and arena waves.
  - **Escort across the region** (Coast): a pilgrim from Saltmarket to the lighthouse. Reuse `escortTick`, today Reach-only.
  - **Tracking** (Glasswood): follow glass-stag prints to a nest, like the elk tracks.
  - **Night-only** (the Moon-Reader): something that exists only after dark, with a real target instead of `null`.
- Impact **H**. Effort **L**. Files: `src/data/regions2_story.js`, `src/data/regions3_story.js`, `src/data/regions4_story.js`,
  `src/world/livingworld.js`. **DESIGN**.

### WQ22. Treasure trails that link places
- **What is wrong.** Hidden caches, hermits and ancient trees are isolated finds.
- **Change.** A lore page at one hidden place, or the reward for a landmark secret, names the next place in words ("WHERE THE
  WHALE LOOKS, FIFTY PACES SOUTH"), with no waypoint. A trail of 3 per region ends at a relic chest. This gives the
  explorer-type player a goal that markers cannot solve, and it is the natural home for the eight Hollow Relics (today 10%
  digs and 7% chests).
- Impact **M-H**. Effort **M**. Files: `src/systems/treasure.js`, `src/world/discovery.js`, `src/data/lore.js`, `src/data/relics.js`.

### WQ23. Dungeons with a shape: a branch, a hidden room and a way out
- **What is wrong.** A generated barrow or cave is a straight chain of 4-5 rooms, bottom to top, with one exit at the
  entrance (`barrowgen.js`). The 9 Reach barrows and caves, the 24 caves in other regions and the Deep Mines floors all play
  the same way. After the boss you walk back through every room.
- **Change.**
  - Branching: one side room off the corridor, locked by a lever or key found in a later room (`keygate` already exists in
    `minesgen.js`).
  - A breakable wall to a secret room, shown by a crack tile.
  - A one-way drop or stair from the boss room back to the entry ("the shortcut").
  - One more puzzle type, e.g. braziers to light in the order shown by a carving, reusing fire and frost hits.
- Impact **M**. Effort **M**. Files: `src/world/barrowgen.js`, `src/world/roomkinds.js`, `src/world/minesgen.js`.

### WQ24. Regional surveys with the chartmakers
- **What is wrong.** Inns and chartmakers already sell charts and rumours. Nothing rewards a full exploration of a region.
- **Change.** A chartmaker asks you to "survey" a region: discover N places plus all its landmarks. The reward is the region's
  completed chart (all places shown, an item to frame on the Trophy Wall) and a region-themed trinket. This turns `FOUND n/m`
  into a goal and pairs with WQ12.
- Impact **M**. Effort **S-M**. Files: `src/data/hamlets.js` or the hub service files, `src/world/discovery.js`.

### WQ25. Hub people who keep hours
- **What is wrong.** Hub and village NPCs stand still around the clock (`Npc.js` has no schedule, and nothing in the hubs
  reads `hourOf`). The Moon-Reader is the only night-only NPC.
- **Change.**
  - Add a schedule field (`day: {x, y}`, `night: {x, y}` or `away`): smiths at the inn at night, the guard walks the wall, the
    tavern is busy after dusk.
  - Night-only rumours and one night-only vendor per hub.
  - Add `walkTo` (it already exists) at dusk and dawn.
- Impact **M**. Effort **M**. Files: `src/entities/Npc.js`, the `src/data/hubs*.js` files, `src/data/dialogue.js`. Light **DESIGN**.

### WQ26. Regions that show what you did
- **What is wrong.** Killing a region boss only changes dialogue. The world map stays the same. The village ending overlay is
  the only visible world change (`events.js` `applyEnding`).
- **Change.** One cheap visible change per region after its boss:
  - the Vale: blight tiles turn to flowers near Thornroot;
  - the Fens: the fog thins and Reedwick lights more lanterns;
  - the Highlands: the storm breaks for a day;
  - Sunscorch: depends on the vault choice.

  Each can be a tile swap pass in `def.finish` keyed on the flag, plus a hub NPC line. This is a reason to go back and look,
  and it rewards the branching choices that feed the ending.
- Impact **M**. Effort **M**. Files: `src/world/regions*.js`, the story files. *Guess*: tile swaps keyed on flags need a
  region rebuild on load; `getRegion` caching would need the flag in its key.

### WQ27. World events that belong to each region
- **What is wrong.** `rollEvent` uses the same events everywhere:
  - the wounded traveller "on the Hollow Road";
  - wolves hunting a deer, including in the Underdeep and the desert;
  - wolf, bandit and draugr ambushes;
  - raids that need a `hamlet`, so none happen in the Sunscorch or the Underdeep.
- **Change.** Each region def gets an `events` table using its own creatures:
  - Sunscorch: a caravan under raider attack, and a sandstorm cutpurse swarm.
  - Fens: a will-o-wisp lure toward a hag's hut.
  - Glasswood: a glass-stag stampede.
  - Underdeep: a cave-in that seals a passage until it is mined.

  Fix the tier along with WQ1.
- Impact **M**. Effort **M**. Files: `src/world/livingworld.js`, `src/world/regions*.js`.

---

## Top 5

1. **WQ1.** Late regions roll traders, ambushes, treasure digs and fishing at the Reach's tier: the Sunscorch is 63% "tier 0"
   by that formula. A one-helper fix that makes exploring the hard regions pay.
2. **WQ2 + WQ4 + WQ5.** Quest markers that mislead:
   - The Hunter's Trail and the Troll's Toll point at (60,40), 146-422 tiles from any track.
   - Side quests pick the first place in the list, not the nearest (537 tiles against 121).
   - Kill and collect steps have no marker at all.

   All three are small changes.
3. **WQ17 + WQ18.** The Reach has half the place density of every other region, and its landmarks are copy-paste. Add
   minor finds to fill the 60-tile empty stretches, and give each landmark its secret.
4. **WQ3 / WQ19.** Blizzards and storm chill in the desert and the warm Vale. Gate them now; give each region its own
   weather later.
5. **WQ20 + WQ21.** Reasons to come back and quests that are not "kill 8, bring 5": reoccupied camps feeding a board in every
   hub, and one quest of a new kind per region.
