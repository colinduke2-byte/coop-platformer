# Frostfall audit: code health, latent bugs and maintainability (prefix CH)

Reviewed 2026-10-15 on the `frostfall` branch (HEAD `b27ce8e`). This builds on the run/UI pass in
`docs/RUN_AND_UI_IMPROVEMENTS.md` and does not repeat it: crash guard, save sanitising, autosave, the parallel runner and
lint are already in place. Its T8 ("split the largest files") was left open, and CH16 gives concrete seams for it.

**How things were checked.** Items marked **[verified]** were reproduced in headless Chromium with the project harness
(`test/harness.mjs`, frame-stepped and seeded) or measured with a script. The scripts are in
`/tmp/claude-0/-home-user-coop-platformer/e2dc7b36-8c57-5ea6-8d29-2ac487f30b30/scratchpad/audit_code/`: `arena.mjs`,
`ghost.mjs`, `modal.mjs`, `dusk.mjs`, `fields.mjs`, `sfields.mjs`, `mixins.mjs`, `graph.mjs`, `deadexp.mjs` and
`longfn.mjs`. Items marked **[code reading]** were not run, and guesses are labelled as guesses. Nothing under
`src/`, `test/` or `tools/` was changed.

Each item gives impact **H/M/L** and effort **S** (hours), **M** (a day) or **L** (days).

---

## A. Latent bugs (ranked)

### CH1 [H/S] An arena trial keeps running after you leave the arena, including into another save **[verified]**
- **What's wrong.** `this.arena` lives on the GameScene instance (`world/arenaRun.js:19`, `arena/quickRun.js:54`). Phaser
  reuses that one instance for every map load and every run. Nothing clears the arena on a map change, a death, quitting
  to the title or loading a save: `endArena` is only called from the Arena Master's "Yield" (`entities/Props.js:545`).
  `arenaTick` (`arenaRun.js:45`) runs on every map (`GameScene.js:727`).
- **What happens.** Repro (`arena.mjs`): start a classic trial, wait for wave 1, then load `village`. Eight seconds later
  the village has 4 arena bandits and wolves at the arena's tile coordinates, the trial is on wave 3, and the player
  received 32 gold for "wave cleared".
- **Real routes.** All three happen in normal play:
  - walking out through the arena door mid-trial;
  - dying in the arena (respawn);
  - every Arena Mode run, which always ends in death and then the results screen. Continuing the campaign after that
    spawns waves (seeded with the daily's RNG when it was a daily) in the campaign map.
- **Fix.** In `create()`, end any trial that does not belong to this map: `if (this.arena && !this.def.arena) this.arena = null;`.
  Better: the general reset in CH3. Add a test: start a trial, change map, assert no enemies spawn and gold is unchanged.
- **Files:** `scenes/GameScene.js`, `world/arenaRun.js`, plus a new test.

### CH2 [H/S] Closing a shop screen inside a conversation unfreezes the world while the dialogue is still open **[verified]**
- **What's wrong.** `ui.modal` is one shared boolean (`systems/ui.js`) with at least 9 writers.
  `ShopScene.js:48` and `MenuScene.js:71` set it to `false` on shutdown, whoever opened them. Smith, merchant and inn
  menus run list screens from inside `runScript` (for example `data/services2.js:114-135`) and then return to a
  `choose()` loop.
- **What happens.** Repro (`modal.mjs`): `runScript(listScreen(...) then choose(...))`, then leave the shop. Afterwards
  `ui.modal === false` while the choice box is on screen, and `GameScene.t` keeps advancing (1.90 s, then 2.20 s). The
  world runs during every smith or merchant visit after the first sub-screen: enemies move and attack, burns tick and
  timers run. This needs no unusual setup.
- **Fix.** Make modal a reference count or a set of owners:
  - `ui.hold(tag)` returns a release function, and `modal` is true while any hold is outstanding;
  - `runScript`, Shop, Menu, Ending and `changeMap` each take and release their own hold;
  - `GameScene.create` clears all holds;
  - as a stopgap, `ShopScene` restores the value it found in `create()` instead of writing `false`.
- **Files:** `systems/ui.js`, `systems/dialogue.js`, `scenes/ShopScene.js`, `scenes/MenuScene.js`, `scenes/EndingScene.js`,
  `scenes/menuSystem.js:127,153`, `scenes/GameScene.js:101,679`.

### CH3 [H/S] Scene fields leak from one map to the next (and from one save to the next) **[verified]**
- **What's wrong.** `create()` resets most per-map fields by hand (`GameScene.js:100-266`, for example
  `this.trader = this.woundedEvt = ... = null` at `:178`). A scan (`fields.mjs`) finds 31 `this.*` fields, set in
  GameScene or its 14 mixins, that are never reset. The ones that change behaviour:
  - **`ghostEvt`** (`world/livingworld.js:103`):
    - Change map while the Pale Merchant is up and the field keeps pointing at a destroyed NPC.
    - On the next overworld, `removeGhostMerchant` runs `npc.body.enable = false` on a destroyed sprite and throws:
      `TypeError: Cannot set properties of undefined (setting 'enable')` at `livingworld.js:110` (repro `ghost.mjs`).
    - The crash guard catches it, but the player sees "SOMETHING WENT WRONG", and the rest of that frame's `update()`
      is skipped.
    - Until then, `!this.ghostEvt` at `livingworld.js:62` blocks every new ghost merchant.
  - **`trackPts`** (`GameScene.js:296`): the Reach's 153 hoofprints are still there in the village (verified). They are
    appended again on every Reach visit, so the array grows without limit, and the "HUGE TRACKS" toast
    (`world/events.js:33`) can fire anywhere whose coordinates match.
  - **`arena`**: see CH1. **`spirit`**: the spirit wolf of the previous map. **`bloodDay`**, **`traderWares`**,
    **`slowT`/`slowScale`** (slow motion carries over), **`askingStat`**, **`lastGate`**, **`endOverlay`**,
    **`_cold`** and the event timers (`eventT`, `stormT`, `qT`, `howlT`).
  - **`S.flags.waypoint`** still points at a trader or wounded traveller that the map change removed. `create()` nulls
    `this.trader` without calling `removeTrader()`.
  - **Dead fields:** `springs` is written but never read. `isNightPre` (`:203`) is read but never written, so its
    "night music on entry" branch is dead.
- **Fix.** On the first `create()`, record the scene's own keys: `this.__base ??= new Set(Object.keys(this))`. At the top
  of every later `create()`, delete every key not in that set. State that is meant to persist belongs in `S` or a
  module, never on the scene. Then test it: change map 3 times and assert that the set of own keys of the Game scene
  equals the set after a fresh load, and that no arena or ghost event survives.
- **Files:** `scenes/GameScene.js`; `world/livingworld.js` and `world/events.js` (waypoint cleanup); a new test.

### CH4 [M/S] Two definitions of "night" disagree, so the Pale Merchant appears and vanishes in the same moment **[verified]**
- **What's wrong.** `rollEvent` decides "night" with `nightness() > 0.5` (`livingworld.js:60`), which comes from
  darkness alpha. The merchant is removed when `!this.isNight()` (`livingworld.js:180`), which uses the hour (20:30-05:30).
- **What happens.**
  - Repro (`dusk.mjs`): at 19:30 `nightness` is 0.624 and `isNight` is false. The merchant spawns with its toast and is
    gone within 3 frames.
  - The same happens all day in whiteout (alpha ≥ 0.56) and at dawn and dusk. The Blood Alpha check uses the same
    flawed `night`.
  - There are 4 notions of night in the code: `isNight()` ×8, `isNightHour(hourOf())` ×7, `nightness() > 0.4/0.45/0.5` ×4
    and `isNightNow()` ×1.
- **Fix.** Use one predicate (`isNight()`) for gameplay decisions. Keep `nightness()` for visuals and audio only.
- **Files:** `world/livingworld.js`, `world/lighting.js`, `world/nightlife.js`, `scenes/GameScene.js:410`.

### CH5 [M/S] The save schema is implicit: 23 fields of `S` are not declared in `newState()` **[verified, script]**
- **What's wrong.** `sfields.mjs` lists `S.*` fields used in `src/` but missing from `systems/state.js:newState()`:
  `ammo, arena, blessing, boons, buyback, cloak, companion, contracts, daily, dur, fish, followMode, mods, mounted,
  nemesis, nemesisSlain, pet, quick, runes, shout, stash, tomes, trophies`.
- **Consequences.**
  - `loadInto` keeps undeclared keys "as they are" (`state.js:73`), so none of them is type-checked on load. A damaged
    `S.buyback`, `S.contracts` or `S.dur` gets past the S4 sanitiser.
  - The NG+ keep-list (`state.js:89-96`) is maintained by hand. Today it silently drops `arena` (arena best scores),
    `fish` (fishing records), `dur`, `shout`, `ammo` and `companion`. Whether each should carry over is a design call;
    right now nobody decided.
  - Transient run modes (`quick`, `daily`, `boons`, `mounted`) sit in the persisted object next to campaign state.
- **Fix.**
  - Declare every field in `newState()` with its default.
  - Move transient fields to a separate `RUN` object that is never serialised.
  - Mark each field `ngPlus: keep|drop` in one table.
  - Add a Node test that `newState()` keys ⊇ every `S.x` used in `src` (`sfields.mjs` is the start of one), and a
    serialise/load round-trip test.
- **Files:** `systems/state.js`, `systems/save.js`, a new unit test.

### CH6 [M/S] Conversations can't be cancelled, and two at once orphan the first **[code reading]**
- **What's wrong.** `runScript` (`systems/dialogue.js:8`) has no cancellation and no overlap guard. `hideBox()`
  (`HudScene.js:308`) drops `this.dlg` without resolving its promise. A second `say()`/`choose()` overwrites `dlg.res`.
- **What can happen.**
  - A script cut off by a death or a door (the case `GameScene.js:106` documents) never finishes. Any reward written
    after an `await` is lost.
  - `companionScene` (`world/events.js:40-52`) sets the quest to `ready` *before* its `await`s, so an interrupted scene
    would leave that quest unfinishable. This is a guess: reaching it needs a death on the same frame, while `ui.modal`
    pauses the world.
  - Two scripts started together, for example a timer-started finale (`GameScene.js:239`) and a player interaction,
    orphan the first one.
- **Fix.** Give `runScript` a token. `hideBox` rejects pending promises with a `Cancelled` error that `runScript`
  swallows. Refuse to start a script while another is running (or queue it). Give rewards before the final line of
  dialogue.
- **Files:** `systems/dialogue.js`, `scenes/HudScene.js`.

### CH7 [L/S] The Arena Mode live score differs from the final score **[verified, code]**
- **What's wrong.** The HUD (`HudScene.js:465`) computes `cleared*(rush?500:100) + pts`. The results card uses
  `quickScore` (`arena/heroes.js:77`), which adds `+ champions*40`. Players see one number during the run and a higher
  one at the end.
- **Fix.** The HUD calls `quickScore(a.cleared, q.pts, a.champs, q.mode)`.
- **Files:** `scenes/HudScene.js`.

### CH8 [L/S] Smaller hazards on hot paths **[code reading]**
- **Unknown enemy kind.** `new Enemy(kind)` dereferences `ENEMIES[kind].tex` with no guard (`entities/Enemy.js:30-32`).
  Spawn sources from data include roamboss specs, `nightKind` swaps, content packs and arena waves. A typo in a new
  enemy id becomes a TypeError on spawn rather than a clear message. Add `if (!cfg) throw new Error('unknown enemy ' + kind)`
  in dev, or fall back to `wolf` in production.
- **Registries never reset between saves.**
  - `rehydrateGen()` (`systems/genloot.js:129`) only adds to `ITEMS`, so loading slot B keeps slot A's generated items
    registered.
  - `msglog` (`systems/msglog.js:6`) shows the previous character's message log after you load another slot.
  - Clear both on load or New Game.

---

## B. Maintainability and parallel-work blockers

### CH9 [H/M] GameScene is the merge bottleneck: turn its switch and its update list into registries
- **What's in it.** `scenes/GameScene.js`: 826 lines, 44 KB, 85 imports (the highest fan-out), 67 commits this year
  (the most churned file).
- **Why every feature touches it.**
  - `spawnEntity` (`:270-394`) is a 40-case `switch` on entity type. Every new prop or event adds a case.
  - `create()` (`:100-266`) wires colliders, bus listeners, music, story checks and intro timers.
  - `update()` (`:671-792`) is a fixed sequence of about 35 subsystem ticks.
  - It also holds 14 mixins: `Object.assign` at `:826`, 126 methods in total.
- **Fix** (about a day, no behaviour change):
  1. `ENTITY_SPAWNERS[t] = (scene, e, wx, wy) => ...`, registered by the module that owns the prop (Props.js, kills,
     arena...).
  2. `scene.addTicker(name, fn, { every })` for the update steps, with the order kept in one short array.
  3. `scene.addListener(ev, fn)` (it already exists as `this.on`) for bus wiring from feature modules.

  After that, a new feature adds a file rather than editing GameScene.
- **Files:** `scenes/GameScene.js`, `entities/Props.js`, `world/*.js`.

### CH10 [M/S] Mixins are merged with `Object.assign` and nothing checks for name collisions **[verified: none today]**
- **What's wrong.** `GameScene.prototype` gets 14 objects (126 methods) and `Player.prototype` gets 3 (46 methods,
  `Player.js:338`). `mixins.mjs` finds no collision today. If two agents each add a method with a common name
  (`tick`, `reset`, `spawnBoss`...), the later object silently wins.
- **Fix.** A `mixin(target, ...objs)` helper that throws on a duplicate key, plus a unit test that imports the method
  objects (they are plain objects).
- **Files:** `scenes/GameScene.js`, `entities/Player.js`, a new `util` helper.

### CH11 [M/S] Registries are filled from 16 files with no check for duplicate ids, and tile ids are numbered by hand
- **Shared tables.** `ITEMS`, `ENEMIES`, `MAPS`, `NPC_DEFS`, `SCRIPTS` and `QUESTS` are mutated at import time from 16
  modules:
  - regions3_story: 66 assignments;
  - maps: 47;
  - regions2_story: 42;
  - regions4_story: 21;
  - emberhold: 21;
  - hamlets: 12;
  - dialogue: 10;
  - livingworld: 4.

  A static scan finds no duplicate today. But a later `NPC_DEFS.x = ...` silently replaces an earlier one, and
  `no-dupe-keys` only checks a single literal.
- **Tiles.** `config.js:31-58` numbers tiles by hand (0-74, `TILE_COUNT = 75`). Two agents who each append a tile will
  both pick 75. Git merges the identical `TILE_COUNT = 76` edit cleanly, which leaves two tiles with id 75. The
  tilemap draws the wrong tile, and the collision LUT (`GameScene.js:17`) may make it solid.
- **Fix.**
  - A `register(table, id, def, where)` helper that throws on a duplicate (dev builds and tests).
  - A unit test asserting that TILE values are unique, contiguous and `< TILE_COUNT`, and that `SOLID_TILES` ⊂ TILE.
  - Derive `TILE_COUNT` from the table.
- **Files:** `config.js`, `data/registry.js`, the story/data modules, `test/unit/unit.mjs`.

### CH12 [M/M] Three import cycles, and the "data" layer imports scenes **[verified, `graph.mjs`]**
- **The cycles** (strongly connected components):
  1. A 12-module cycle: `data/services.js ↔ entities/Props.js ↔ scenes/MenuScene.js ↔ menuSystem/menuMap/menuLore/menuPerks/menuTrophies/menuTabs ↔ ShopScene ↔ systems/treasure ↔ data/contracts`.
  2. `systems/stats ↔ inventory ↔ sockets ↔ relics ↔ food`.
  3. `data/maps ↔ data/quests ↔ systems/quests ↔ notes ↔ world/discovery ↔ world/landmarks ↔ data/regions`.
- **Why it matters.** Inside an ES-module cycle, any new *top-level* use of an import (a `const X = ITEMS.foo` or
  `QUESTS[...]` at module scope) can throw "Cannot access before initialization" at boot. Which import comes first
  decides it, and parallel edits change that order.
- **Data cannot be tested in Node.** The story modules (`emberhold`, `hamlets`, `regions2/3/4_story`, `sidequests`) fail
  to import there (`window is not defined`), because data pulls in Shop/Menu scenes. The unit-test registry check sees
  113 enemies and 275 items, without the story additions; stage48 covers the rest in a browser.
- **Fix.**
  - Move shared UI pieces (`panel`, `listScreen`) out of scene files into `ui/`.
  - Have `Props.js` call services through a callback registry instead of importing them.
  - Add `import/no-cycle` (eslint-plugin-import) as a warning to stop new cycles.
- **Files:** `scenes/MenuScene.js`, `scenes/ShopScene.js`, `data/services*.js`, `entities/Props.js`, `eslint.config.js`.

### CH13 [M/S] The HUD removes its bus listeners from a hand-kept list
- **What's wrong.** `HudScene.create()` registers 12 bus handlers (`:77-146`). The `shutdown` line (`:147`) has to name
  every one again. They match today, but the next agent who adds `bus.on` to the HUD must remember to edit a 900-char
  line. Missing it leaks a handler into a destroyed scene on each HUD relaunch, and `stress_transitions` relaunches the
  HUD 4 times.
- **Fix.** Use the same `this.on(ev, fn)` pattern as GameScene (`GameScene.js:268`), shared as
  `listen(scene, ev, fn)` in `systems/bus.js`, which removes itself on shutdown.
- **Files:** `scenes/HudScene.js`, `systems/bus.js`.

### CH14 [M/S] Gold rewards bypass `addGold`, and economy numbers are written inline
- **Bypassing `addGold`.** `addGold` (`systems/inventory.js:37`) applies `goldMul` from gear and the companion plus
  run modifiers. 16 places write `S.gold +=` directly, so gold-find gear does nothing for them:
  - bounties, `world/kills.js:26,31,39,62,79`;
  - raid, wounded and hunt rewards, `world/livingworld.js:31,186,195`;
  - arena waves, `world/arenaRun.js:62`, which applies `modMul` only;
  - dig spots, `entities/Props.js:325`.
- **Inline numbers.** None of these formulas (`45+35*tier`, `60+40*tier`, `20+12*w`...) is in `TUNE`.
  `world/livingworld.js`, `events.js`, `arenaRun.js` and `kills.js` read `TUNE` zero times. The death penalty `0.9` is
  written twice, in `GameScene.js:817` and in the death card `HudScene.js:459`.
- **Fix.** Add `TUNE.rewards = {...}` and `TUNE.death.goldKeep`, and route rewards through `addGold(n, { mul: false })`
  where a reward is meant to be flat. Ask Colin which rewards should scale.
- **Files:** `data/tuning.js`, the `world/*.js` files above, `scenes/HudScene.js`.

### CH15 [L/S] Duplicated formulas, and a unit test that tests code the game doesn't use
- **`arrowDamage`.** `arrowDamage` (`systems/damage.js:11`) is unit-tested, but the game never calls it. The bow
  computes damage inline (`entities/playerBow.js:61`, which adds a crossbow and deadeye path). The test guards dead
  code. Fix: call `arrowDamage` from the bow, or delete it.
- **Difficulty lookups.** Four places index `TUNE.difficulty[settings.difficulty]` directly instead of `diff()`:
  `Enemy.js:47`, `Player.js:306`, `playerCombat.js:228`, `menuLore.js:23`.
- **Files:** `entities/playerBow.js`, `systems/damage.js`, the four files above.

### CH16 [M/M] The largest files and functions, with the seams to split them along (T8 from the run/UI pass, made concrete)
- **Largest functions** (`longfn.mjs`):
  - `worldgen.buildRegion`: 429 lines, 34 KB, `world/worldgen.js:63`.
  - `menuSystem.systemTab`: 282 lines, `scenes/menuSystem.js:62`.
  - `HudScene.update`: 233 lines, `:447`.
  - `menuMap.mapTab`: 194 lines.
  - `sprites.buildFx`: 177 lines.
  - `playerMagic.cast`: 173 lines, one `switch` per spell.
  - `GameScene.create`: 167 lines.
- **Seams:**
  - **`art/sprites.js` (91 KB).** It already has section banners: characters (`:19`), creature frames (`:210-464`),
    tiles (`:590`), fx/icons (`:731`). Split it into `art/sprites/{characters,creatures,tiles,fx,icons}.js` behind the
    same `buildAll` entry. This is pure code motion, guarded by `test/baseline/sprites.json`.
  - **`world/worldgen.js`.** `buildRegion` has phases: terrain noise → biomes → POI placement → roads → entities. Make
    each phase a function taking `(ctx)`. Move the region defs (`REACH :497`, `ASHEN :643`, `COAST :693`,
    `KINGDOM :741`) to `world/regions1.js` to match `regions2-4.js`. Guarded by `test/baseline/reach.json`.
  - **`data/maps.js`.** Hand-built maps (`buildVillage`, `buildMaw`, `buildKeep`...) go to `data/maps/*.js`. The nine
    copy-pasted `get*` caches (`:503-511`) become one `cachedBySeed(build)` helper.
  - **`scenes/HudScene.js`.** Split out death card, quick-run panel, bars, status row, dialogue box and lockpick as
    `hud/*.js` draw functions called from `update`.
  - **`playerMagic.cast`.** Use a `SPELL_CAST[id] = (player, sp, f) => ...` table, so each spell is its own function
    and one spell can be added without touching the others.
- **Files:** the ones named. Do these **before** the parallel push, or give each one a single owner during it.

### CH17 [L/S] Dead code and unused imports
- **Lint.** 217 `no-unused-vars` warnings, 115 of them in `src/`. GameScene has 27 unused imports, including 5
  Guardian classes, `RimeWyrm`, `Hound` and `Follower`; Player has 15, left over from moving code to mixins.
- **Unused exports.** 30 exports are referenced nowhere in `src` (`deadexp.mjs`). Examples: `isEquipable`, `hasSave`,
  `storageBytes`, `rarityOf`, `repAtLeast`, `hasHeart`, `RELIC_REWARDS`, `tutorialActive`, `TUT_STEPS`, `isSighted`,
  `NEW_FAUNA`, `companionName`, `logStamp`, `capturingPad`.
- **Dead fields.** `springs` and `isNightPre` (CH3).
- **Caution.** Before removing an "unused" import, check that it has no side effect. `sceneConsts.js` imports the
  Guardian classes, so GameScene's copies are truly unused. Side-effect-only imports (`import '../data/emberhold.js'`)
  must stay.
- **Fix.** After one cleanup pass, set `no-unused-vars` to `error` for `src/**` so warnings stop piling up while
  several agents work.
- **Files:** `eslint.config.js`, plus mechanical edits. Do it in one commit before the parallel work.

### CH18 [M/M] Test coverage gaps
- **No test checks state after a map change.** `stress_transitions.mjs` only asserts "no exception", which is why CH1
  and CH3 survived. Add a "state hygiene" test: Game own keys, arena, ghost and trader state, waypoint, `ui.modal`
  after shop or menu inside a script, and `trackPts` length.
- **Methods no test calls by name:** `summonSpiritWolf`, `reviveByFollower`, `payBounty`, `onNemesisDown`,
  `summonNemesis`, `escortTick`, `findPath`, `updateZones` and `revealFog`. The nemesis loop (death → nemesis waits →
  kill → reward) and follower revive have no regression test.
- **No test covers the whole save.** stage83 checks selected fields; nothing asserts that *every* `S` field survives
  serialise → load (see CH5).
- **Unit tests are thin.** The Node tests are 423 lines (damage, skills, bus, status, registry, worldgen). Stats
  `recalc`, burden, contracts, genloot/reforge, quest progression and save serialise are pure enough for Node, but they
  are only tested through browser tests (about 6 minutes for the suite). Cheap Node tests would give parallel agents
  feedback in seconds.
- **Untested modules:** `ui/crash.js` and `ui/savetools.js` beyond stage83, `systems/rotate.js`, `systems/msglog.js`,
  and `arena/ArenaScenes.js` (only through monkey runs).
- **Files:** new `test/unit/*.mjs`, a new `test/stage84_hygiene.mjs`, `test/run.mjs`.

### CH19 [L/S] Wall-clock fallbacks are hand-written in 10 places
- **What's wrong.** The pattern "fade with a `setTimeout` fallback, in case the fade event never arrives" is written
  separately at:
  - `GameScene.js:576`, `:606` and `:800`;
  - `world/events.js:158`;
  - `data/services2.js:75,80,82`;
  - `entities/Props.js:65,70,73,82,218,226`.

  Some check `alive()` and some don't. The Props and services ones go on using the old `cam` and scene after the
  await. This is safe today only because `ui.modal` pauses the world during them, and CH2 shows that the flag is not
  reliable.
- **Fix.** One `scene.fadeOut(ms)` / `fadeIn(ms)` / `delay(ms)` helper, returning a promise that rejects when the scene
  shuts down.
- **Files:** `scenes/GameScene.js`, `entities/Props.js`, `data/services2.js`, `world/events.js`.

### CH20 [L/S] Test infrastructure files that every agent will edit
- **The test list.** `test/run.mjs:21` keeps `TESTS` as a hand-written array. Every new test file adds to the same
  line, so parallel branches conflict, and a forgotten entry is silently not run. Discover files by glob
  (`stage*.mjs`, `unit/*.mjs`) and keep `LONG` and `EXCLUSIVE` as the only lists.
- **Baselines.** `test/baseline/reach.json` and `sprites.json` are global hash baselines. Any worldgen or art change
  must regenerate them (`UPDATE=1`), so two agents touching art or worldgen always conflict there. Serialise those
  changes or give them one owner.
- **Shared output.** `test/out/` (screenshots, `timings.json`) is shared output. Agents in the same checkout overwrite
  each other's screenshots, so use one worktree per agent.
- **Files:** `test/run.mjs`.

---

## C. Hot-spot files (what lives in them)

| File | Size / churn | What lives there | Why features touch it |
|---|---|---|---|
| `scenes/GameScene.js` | 826 lines, 44 KB, 67 commits, 85 imports | map load (`create`), `spawnEntity` switch (40 types), main `update` order, map change/respawn/death, bars, intro, stat prompt, vault/plates/gates, exits | any new entity, tick, scene-level rule |
| GameScene mixins (`world/*.js`, `arena/quickRun.js`) | 14 files, 126 methods | fog, pathing, loot, zones, lighting, ambient, arena, quick run, discovery, companions, kills, events, living world, set pieces | fairly separable, but they share `this.*` state (CH3) |
| `scenes/HudScene.js` | 680 lines, 45 commits | dialogue box API (`say`/`choose`), lockpick, bars, status row, toasts, banners, boss intro, death card, quick-run panel, clock, quest marker | any new feedback on screen |
| `entities/Player.js` + `playerCombat.js` / `playerMagic.js` / `playerBow.js` | 338 + 321 + 394 + 114 lines, 40 commits | movement, roll, lock-on, regen, animation; melee, block/parry, damage taken (`playerCombat.js:228`); spells (one big `cast` switch); bow | combat, gear, perk and spell work |
| `entities/Enemy.js` | 794 lines, 35 commits | the shared AI for every non-boss enemy: idle/alert/combat, flank, archer, burrow, blink, raise, attacks, `takeHit`, `die` | every new enemy behaviour |
| `systems/state.js` | 108 lines, 27 commits | `newState()` = the save schema plus the quest list, `loadInto` sanitiser, NG+ keep-list | every new persistent field or quest |
| `data/tuning.js` (`TUNE`) | 298 lines, 44 commits | player feel, combat, bosses, difficulty, burden, autosave | every balance change |
| `data/items.js`, `data/enemies.js` (+`items4`, `enemies4`) | 48 KB / 40 KB | content tables | appends at the end of the same literal: conflicts |
| `data/maps.js` | 736 lines, 34 commits | `MAPS` table, hand-built maps, region/dungeon caches | new maps and dungeons |
| `data/dialogue.js` / `services.js` / `services2.js` | 429 / 455 / 136 lines | `NPC_DEFS` and `SCRIPTS` base, shop/smith menus | NPC and shop work |
| `art/sprites.js` | 91 KB, 42 commits | all procedural textures: characters, creatures, tiles (`drawTile` switch), fx, icons | new tiles, creatures, icons |
| `config.js` | 89 lines | palette, `TILE` ids, `SOLID_TILES`, `BINDINGS` | new tile or key (CH11) |
| `systems/keys.js` | 279 lines | input actions, pad, rebinding | a new action |
| `systems/stats.js` | 54 lines, fan-in 25 | `recalc` and every stat source (gear, food, relics, gems, sets, blessings) | every new stat source |
| `main.js`, `test/run.mjs`, `CHANGELOG.md` | | boot, the test list, notes | touched by almost every change |

The most-imported modules (fan-in) are `state.js` (91), `sfx.js` (62), `config.js` (61), `bus.js` (60), `items.js` (29)
and `inventory.js` (28). Changing their exported API is a cross-cutting change.

---

## D. Parallel-work map

**Before fanning out (one agent, about 1-2 days, no gameplay change).** This turns most shared files into append-only
or registry files:
1. CH3 + CH1 + CH2 (state reset, arena, modal hold): fixes real bugs and removes the shared-state hazards.
2. CH9 (spawner, ticker and listener registries in GameScene) and CH13 (HUD `listen`).
3. CH10 + CH11 (mixin collision check, `register()`, TILE uniqueness test) and CH20 (test auto-discovery).
4. CH17 (unused-import cleanup, then make the lint rule an error for `src`).
5. Optionally CH16's pure code-motion splits of `sprites.js` and `maps.js`.

**Independent: can be owned per agent with little merge risk.**
- **Per-region story and content:**
  - `data/regions2_story.js`, `regions3_story.js`, `regions4_story.js`;
  - `data/emberhold.js`, `hamlets.js`, `sidequests.js`, `companionquests.js`, `chapter3.js`;
  - hub maps: `data/hubs2/3/4.js`, `emberhold_map.js`.

  One agent per region works, as long as new quests go through `reg()` (`EXTRA_QUEST_IDS`) instead of `newState()`,
  and ids are unique (CH11).
- **Region generators:** `world/regions2.js`, `regions3.js` and `regions4.js` (but see the worldgen owner below).
- **Native pixel art per creature:** `art/native/*.js` (animals, bosses_a-d, newfauna, humanoid, special). Each
  registers via `native_registry.js`.
- **Boss classes:** `entities/Guardians.js` and `Guardians4.js` (one class per boss), `PatternBoss.js`. Adding a boss
  also needs one line each in `world/sceneConsts.js` (`BOSS_CLASS`, `BOSS_FLAG`) and a `TUNE.boss` group. Those are
  small append-only merges.
- **Arena:** `arena/*` plus `world/arenaRun.js` and `world/arena.js` (one owner).
- **Menu tabs:** each of `scenes/menuMap.js`, `menuLore.js`, `menuPerks.js`, `menuTrophies.js` and `menuSystem.js` can
  have its own owner. `MenuScene.js` and `menuTabs.js` are shared.
- **Shell UI:** `ui/*` (crash, overlay, savetools, touch).
- **Audio:** `audio/sfx.js`. It is self-contained, but has one owner because everything is in one file.
- **Small pure systems:** `systems/food`, `elixir`, `relics`, `sockets`, `sets`, `burden`, `durability`, `status`,
  `bless`, `moon`, `treasure`, `tomes`, `daily`. Independent, except that each new stat source ends in `stats.js`.

**Shared: one owner, or merge with care.**

| Shared file | Rule |
|---|---|
| `scenes/GameScene.js` | **Single owner** until CH9 is done; after it, features register spawners and tickers from their own files. |
| `systems/state.js` (`newState`, NG+ list) | Single owner, or "append one line per field, rebase often". New quests use `reg()` from their data module instead. |
| `data/tuning.js` | Each agent adds its **own top-level group** (`TUNE.myFeature = {...}`) at a different place. Changing existing numbers needs Colin and one owner. |
| `scenes/HudScene.js` | Single owner (UI agent). Others emit bus events (`toast`, `hint`, `say`, `discover`) instead of editing the HUD. |
| `entities/Enemy.js` | Single owner (AI agent). New enemies should be data in `enemies*.js` plus native art. New behaviours are a hook on `cfg` (pattern: `cfg.blink`, `cfg.burrow`, `cfg.heals`). |
| `entities/Player.js` + `playerCombat.js` | Single owner (combat agent). `playerMagic.js` can be split off once CH16's spell table exists. |
| `data/items.js`, `data/enemies.js` | Append-only. New content goes in the agent's own file registered like `items4.js`/`enemies4.js`, not at the end of the big literals. |
| `data/maps.js` | Single owner; new maps go in their own module that sets `MAPS.x` (as regions2-4 do). |
| `config.js` (`TILE`, `SOLID_TILES`, `BINDINGS`) | Single owner. Allocate tile ids up front, one block per agent (75-79, 80-84...), until the CH11 test exists. |
| `art/sprites.js` + `test/baseline/sprites.json` | Single owner (art), or split first (CH16). |
| `world/worldgen.js`, `world/landmarks.js` + `test/baseline/reach.json` | Single owner: any change shifts the Reach hash for everyone. |
| `systems/stats.js` (`recalc`) | Careful merge: each new stat source is one term in the same expressions. |
| `systems/keys.js` | Single owner for new actions. |
| `test/run.mjs` (`TESTS`), `CHANGELOG.md`, `main.js` | Conflict on every branch: auto-discover tests (CH20), and let one integrator write the changelog. |

**Ground rules for parallel agents.**
- Use one git worktree per agent (`test/out` and Vite's cache are shared otherwise).
- Never keep cross-map state on `this` in GameScene.
- Never write `ui.modal = false` directly; use a hold (CH2).
- Never put a top-level use of an import from a cycle module (CH12).
- Run `node test/run.mjs --only=<your files>,unit/ --jobs=2` plus lint before merging.

---

## Top 5

1. **CH1**: an arena trial follows you out of the arena, after death, and from every Arena Mode run into the campaign,
   spawning waves and paying gold in the village. A one-line reset plus a test.
2. **CH2**: one shared `ui.modal` boolean is cleared by every shop or menu close, so the world runs while smith and
   merchant conversations are still on screen. Switch it to a reference-counted hold.
3. **CH3**: 31 GameScene fields are never reset between maps or saves. One of them makes a TypeError on the next
   overworld (ghost merchant), and the hoofprint array grows forever. A generic reset in `create()` and a state-hygiene
   test.
4. **CH9 + CH20 + CH11**: before going parallel, turn GameScene's `spawnEntity` switch and update list, the hand-kept
   test list and the hand-numbered tile ids into registries with duplicate checks. Otherwise every agent edits the same
   lines.
5. **CH5**: 23 save fields are undeclared in `newState()`, so they are unchecked on load and dropped arbitrarily by NG+.
   Declare them all and add a full serialise/load round-trip test, so parallel agents can add state safely.
