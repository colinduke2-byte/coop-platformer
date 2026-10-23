# Frostfall: rules for parallel agents

Read this before you change anything. Several agents work on Frostfall at the same time, each in its own git worktree
and branch, and an integrator merges the branches in a fixed order (see `docs/IMPROVEMENT_PLAN.md`, "How the work is
split"). These rules exist so that your branch merges without touching the same lines as anyone else's. Wave 0 built the
extension points they refer to; `docs/audit/code.md` (section D) has the background.

## 1. Golden rules

1. **Own your files.** Edit only the files your agent owns (table in section 9). For a change in someone else's file,
   send a bus event (section 6) or ask the owner.
2. **Never write `ui.modal`.** Lint fails on it. Take a hold and release only that hold:
   ```js
   const release = ui.hold('myScreen');   // the world freezes
   ...
   release();                             // only your hold goes; others (a conversation, a menu) stay
   ```
   `ui.release(tag)` drops every hold with that tag. `ui.releaseAll()` is for map loads, loading a save, quitting
   to the title and the death safety net only. `ui.modal` stays readable, `ui.holdTags()` lists the holds that are out,
   and `ui.onModal(fn)` hears every change.
3. **Never keep cross-map state on GameScene's `this`.** Every map load deletes every field that was added to the scene
   after its first `create()` (`resetOwnFields`, CH3). That is how an arena trial or a ghost merchant used to leak into the
   next map.
   - Per-map state may live on `this`. Set it in `create()`, a spawner or a ticker.
   - State that must outlive a map goes in `S`, which is saved (section 5).
   - State that must outlive a map but is not saved goes in your module, in a `const memory = {...}`. Reset it with
     `onStateReset(fn)` from `systems/state.js`. `world/livingworld.js` (`bloodDay`) shows how; a getter/setter in a
     mixin makes it look like a scene field.
4. **One conversation at a time.** `runScript(fn)` queues behind a running one. Inside a script, call `say` / `choose` /
   helpers directly; never call `runScript` from inside a script, or it waits for itself.
   - A conversation cut off by a door or a death rejects its pending line with `Cancelled`. `runScript` swallows that
     error.
   - Don't catch every error inside a script. If you must catch, rethrow `Cancelled`.
   - Give rewards before the last line of dialogue, or make the reward safe to repeat.
5. **Fades and waits go through `systems/fade.js`.** Use `fadeOut(sc, ms)`, `fadeIn(sc, ms)`, `delay(sc, ms)` and
   `sleep(sc, ms)`.
   - Each one finishes even if Phaser's event never arrives.
   - Each one rejects with `Cancelled` if the scene shuts down. Inside `runScript` that is handled; elsewhere use
     `.then(go, () => {})`.
   - `pause(sc, ms)` and GameScene's `this.delay(ms)` are the exception: they never reject. Old scripts and the intro
     rely on going on after a quick scene restart.
   - Never hand-write a `setTimeout` fallback.
6. **Scenes listen to the bus with `listen(scene, ev, fn)`** from `systems/bus.js`. Inside GameScene use `this.on(ev, fn)`
   or `registerListener`. A bare `bus.on` in a scene leaks a handler every time the scene relaunches.
7. **No new import cycles, and no top-level use of an import from a cycle module** (section 8).
8. **Behaviour you did not set out to change stays identical.** Never update a baseline (`test/baseline/*.json`) to make a
   test pass. The Reach world (`test/reach_hash`) belongs to the world agent alone.
9. **Lint must have 0 errors** (`npm run lint`). Unused variables are errors in `src/`.

## 2. Adding things to GameScene without editing it (CH9)

GameScene's map entities, its update steps and its bus listeners are registries (`src/scenes/gameHooks.js`). Put a new
feature in **its own file in `src/features/`**. Every `src/features/*.js` is loaded automatically (`import.meta.glob` in
GameScene.js), so you never touch GameScene, its import list or `main.js`.

```js
// src/features/geysers.js
import { registerSpawner, registerTicker, registerListener } from '../scenes/gameHooks.js';

// a map entity { t: 'geyser', x, y, ... } in a built map; wx / wy are the tile's centre in pixels
registerSpawner('geyser', (sc, e, wx, wy) => { (sc.geysers ||= []).push(new Geyser(sc, wx, wy)); });

// runs every frame the world is not frozen, at its place in the update order
registerTicker('geysers', (sc, dt) => { for (const g of sc.geysers || []) g.update(dt, sc.player); }, 1250);

// a bus event, wired on every map load and removed when the scene shuts down
registerListener('weather', (sc, kind, region) => { /* ... */ });
```

- **Spawners**: one per entity type. Registering a type twice throws. The core types are in `scenes/gameSpawners.js`.
- **Tickers**:
  - The update order is the `order` number. The core steps are 100, 200, ... 4400, in `CORE_ORDER` in
    `scenes/gameTickers.js`. Pick a free number between the two steps you belong between.
  - Names and orders are unique; a clash throws at boot.
  - `test/unit/foundation.mjs` pins the core order.
  - A ticker does not run while the world is frozen (any hold on `ui.modal`) or during hit-stop.
- **Listeners**: `fn(scene, ...args)`. Many listeners per event are fine.
- **Map-load setup**: listen to `'scene:game'`, which is emitted at the end of `create()`:
  `registerListener('scene:game', (sc) => ...)`.
- **New scene methods**: put them in your feature file and call them through the scene argument. Prefer plain functions.
  If a method must sit on the scene, add a mixin object through `mixin()` (CH10). `mixin()` throws if the name already
  exists, so pick specific names (`geyserTick`, not `tick`).

## 3. Tuning numbers

Every feel or balance number lives in `TUNE` (`src/data/tuning.js`).
- **Each agent owns its own top-level groups**, named after the feature (`TUNE.weather`, `TUNE.statusFx`...).
  - Add a group as a statement **after** the `TUNE` literal, at the end of `tuning.js`, under a comment naming your
    agent: `// ---- W: world` then `TUNE.weather = { ... };`.
  - Don't put new groups inside the big literal, and never edit another agent's group.
  - Two agents appending at the end of the file is the one expected merge conflict here. It is trivial, and the
    integrator resolves it by keeping both blocks.
  - Check that the name is free first (`grep -n "TUNE.weather\b" -r src`). Two groups with the same name would
    silently replace each other.
- Read it as `TUNE.weather.x` in your code. Never write numbers inline.
- Changing an existing number needs Colin and its owner. Report every change as `field: old -> new`.

## 4. Tile ids

Tile ids are stored in worlds and saves, so they are never renumbered or reused. Each agent has a reserved block in
`src/config.js` (`TILE_BLOCKS`):

| Block | Ids | Agent |
|---|---|---|
| core | 0-74 | existing tiles, nobody adds here |
| spare_low | 75-99 | unassigned: ask the integrator |
| A_art | 100-119 | A: Art |
| W_world | 120-139 | W: World |
| C_combat | 140-149 | C: Combat |
| H_hud | 150-154 | H: HUD and first hour |
| E_economy | 155-159 | E: Economy |
| S_story | 160-164 | S: Story text |
| spare | 165-255 | unassigned: ask the integrator |

The audio agent has no block. Unused ids inside a block draw as plain dark tiles, so leaving gaps costs nothing.

To add a tile:
1. Add `NAME: id` on **your block's line** in `TILE`, taking the next free id of your block.
2. If it is solid, add it on your line in `SOLID_TILES`.
3. Draw it in `drawTile` (`art/sprites.js`). That file belongs to the art agent, so send the drawing to them.

`TILE_COUNT` follows by itself. `test/unit/foundation.mjs` fails on a duplicate id, an id outside every block, or a
solid tile that does not exist.

## 5. Saved state (`S`) and content ids

- **Every field of `S` is declared** in `systems/state.js`:
  - with a real default in `newState()`;
  - or as `null` with its kind in `OPTIONAL_KINDS`, if it starts empty. This is the place for a new optional field.

  `test/unit/state.mjs` fails on any `S.x` used in `src/` that is not declared.
- A value of the wrong kind in a save loads as `null` (or as the default).
- New Game+ keeps the fields listed in `NG_KEEP` / `NG_KEEP_FLAGS`. A field you add starts fresh in NG+ unless you
  list it there.
- `test/stage85_save_roundtrip.mjs` checks that every field survives save -> load.
- **New quests** register from their data module with the `reg(id)` pattern (`EXTRA_QUEST_IDS`, see
  `data/regions4_story.js`), not by editing `newState()`.
- **Content ids are defined once.** `ITEMS`, `ENEMIES`, `MAPS`, `NPC_DEFS`, `SCRIPTS`, `QUESTS` and `TARGETS` are checked
  by a source scan in `test/unit/foundation.mjs`. It fails if the same id is assigned in two places, because the later
  one silently replaces the earlier.
  - Put new content in your own module (as `items4.js` / `enemies4.js` do), not at the end of the big literals.
  - For ids built at run time use `defineOnce(table, id, def, 'ITEMS')` from `util.js`. It throws on a duplicate.
- **Derived state outside `S`** (registries filled at run time, caches, logs) must clear itself in `onStateReset(fn)`.
  Otherwise one save's data shows up in the next.

## 6. Hand-off events (the bus)

Emit these when you own the system, and listen to them when you react to it. Never reach into another agent's file to
react.

| Event | Arguments | Emitted by | When |
|---|---|---|---|
| `status:on` | `(target, kind, duration)` | `systems/status.js` | a status effect is applied to, or refreshed on, a player or an enemy (`duration` = seconds left; a chill's stacks are in `target.statuses.chill.stacks`) |
| `status:off` | `(target, kind)` | `systems/status.js` | it runs out, is cured, or turns into another (chill -> freeze) |
| `weather` | `(kind, region)` | `world/lighting.js` (`applyWeather`) | on every map load and every change of `S.weather`; `region` is a `REGIONS` id (`'reach'`, `'sunscorch'`...) |

A target that dies or despawns gets no `status:off`, so check `target.active` / `target.dead`. Other useful events that
already exist are `toast`, `hint`, `say`, `discover`, `area`, `levelup`, `enemy:killed`, `item:added`, `boss:engaged`,
`boss:phase`, `saved` and `scene:game`. The combat agent emits the status events, and the world agent owns the weather
logic. Art and audio only listen.

## 7. Tests

- **A test is a file, nothing else.** `test/run.mjs` runs every `test/stage*.mjs` and every `test/unit/*.mjs`. Other
  files in `test/` run only if their first lines carry the mark `@suite`.
  - Name a browser test `test/stageNN_<topic>.mjs`, using a number from your agent's range below. See
    `stage84_hygiene.mjs` for the harness (`launch`, `h.open`, `h.ev`, `h.wait`, `check`).

    | Agent | Test numbers |
    |---|---|
    | F: Foundation | 84-89 |
    | E: Economy | 90-92 |
    | S: Story text | 93-95 |
    | U: Audio | 96-97 |
    | A: Art | 98-99 |
    | C: Combat | 100-102 |
    | W: World | 103-105 |
    | H: HUD and first hour | 106-108 |
  - Name a Node test `test/unit/<topic>.mjs`. It prints its result and exits non-zero on failure. Node tests take seconds,
    so prefer them for pure logic.
- **Run only your tests while working:**
  ```
  node test/run.mjs --only=stage84,unit/ --jobs=2      # files whose name contains any of these
  node test/run.mjs --list --only=stage8                # what would run
  node test/unit/foundation.mjs                         # one Node test directly
  npm run lint
  ```
  The full suite (`node test/run.mjs --jobs=4`) takes 10 to 25 minutes on 4 cores, depending on what else runs. Run it before you hand your branch
  back. Leave the full run to the integrator if several agents share a machine.
- **Timing.** A failure under load gets one re-run (the runner retries failed files once by itself) before you
  investigate it. `LONG` (bots, soaks) and `EXCLUSIVE` (`perf`, alone at the end) in `run.mjs` are the only lists.
- **Guard rails that will stop you:**
  - `test/unit/foundation.mjs`: registries, mixins, content ids, tile ids, `listen()`, holds, status/weather events,
    and every `sfx.play` / `music.play` / ambience name existing in `src/audio`.
  - `test/unit/state.mjs`: the save schema.
  - `test/stage84_hygiene.mjs`: map changes, the frozen world, conversations, arena, night.
  - `test/stage85_save_roundtrip.mjs`: every save field survives save -> load.
  - `reach_hash`, `art_baseline`: worldgen and art.

## 8. Import cycles (CH12)

Inside an ES-module cycle, a new top-level use of an import (`const X = ITEMS.foo` at module scope) can throw "Cannot
access before initialization" at boot, depending on load order. One cycle remains, on purpose:
- **`systems/stats` <-> `inventory`, `sockets`, `relics`, `food`.**
  - `stats.recalc()` sums every stat source.
  - The sources call `recalc()` back when they change.
  - These are runtime calls only, so the cycle is harmless as long as none of them uses another at module top level.

Wave 0 broke the other two, and they must stay broken:
- **The menu cycle (12 modules: services, Props, the menu tabs, ShopScene, treasure, contracts).** `panel` lives in
  `ui/panel.js`, so no menu tab or shop imports `MenuScene.js` any more. UI pieces shared by scenes go in `src/ui/`. A
  data module never imports a scene.
- **The maps / quests / notes / discovery cycle.** Discovery tells notes about a found place through
  `onPlaceDiscovered(fn)` instead of importing notes.

`node tools/cycles.mjs` lists the cycles. `test/unit/foundation.mjs` fails on any cycle but the stats one: break the new
cycle with a hook or by moving the shared piece, don't extend the allow-list.

## 9. Who owns which file

One owner per file. A shared file goes through its owner; everyone else sends a bus event or asks.

**Wave 1 (and the same owners in Wave 2):**

| Agent | Owns |
|---|---|
| **F: Foundation** (Wave 0, done) | `scenes/GameScene.js`, `scenes/gameHooks.js`, `scenes/gameSpawners.js`, `scenes/gameTickers.js`, `scenes/gameListeners.js`, `systems/state.js`, `systems/ui.js`, `systems/dialogue.js`, `systems/fade.js`, HUD listener wiring, `config.js` tile table, `test/run.mjs` |
| **C: Combat** | `entities/Player.js`, `playerCombat.js`, `playerBow.js`, `playerMagic.js`, `entities/Enemy.js`, `Boss.js`, `Guardians*.js`, `PatternBoss.js`, `systems/status.js` (it emits `status:on/off`) |
| **E: Economy** | `data/items*.js`, `systems/genloot.js`, `systems/stats.js`, `systems/upgrades.js`, `systems/sockets.js`, `systems/sets.js`, `data/services*.js`, shop data (`data/stock.js`) |
| **W: World** | `world/*` (livingworld, events, regions*, worldgen, landmarks, weather logic in `world/lighting.js`), quest-marker logic, `test/baseline/reach.json` (the Reach hash) |
| **S: Story text** | `data/*_story.js`, NPC lines and scripts, `data/lore.js`, barks, dialogue text |
| **H: HUD and first hour** | `scenes/HudScene.js` (its bus handlers go through `listen()`), `scenes/MenuScene.js` and the menu tabs, `systems/tips.js`, `scenes/TitleScene.js` |
| **A: Art** | `art/*` (sprites, anim, fx, native), lighting visuals, snow / weather visuals, `test/baseline/sprites.json` |
| **U: Audio** | `audio/*` |

**Shared files and their rules** (from `docs/audit/code.md`, section D):

| Shared file | Rule |
|---|---|
| `scenes/GameScene.js` | Don't edit it. Register spawners, tickers and listeners from your own file (section 2). |
| `systems/state.js` (`newState`, `OPTIONAL_KINDS`, `NG_KEEP`) | Append one line per field, rebase often. New quests use `reg()` from their data module. |
| `data/tuning.js` | Your own top-level group only (section 3). Existing numbers need Colin and one owner. |
| `scenes/HudScene.js` | The H agent's. Others emit bus events (`toast`, `hint`, `say`, `discover`...) instead. |
| `entities/Enemy.js` | The C agent's. New enemies are data in `enemies*.js` plus native art. New behaviours are a hook on `cfg` (like `cfg.blink`, `cfg.burrow`, `cfg.heals`). |
| `data/items.js`, `data/enemies.js` | Append-only. Put new content in your own file, registered like `items4.js` / `enemies4.js`. |
| `data/maps.js` | One owner (W). A new map goes in its own module that sets `MAPS.x`, as `regions2-4` do. |
| `config.js` (`TILE`, `SOLID_TILES`, `BINDINGS`) | Your tile block only (section 4). Keys: ask the H agent. |
| `art/sprites.js` + `test/baseline/sprites.json` | A only. |
| `world/worldgen.js`, `world/landmarks.js` + `test/baseline/reach.json` | W only: any change shifts the Reach hash for everyone. |
| `systems/stats.js` (`recalc`) | E owns it. A new stat source is one term in the same expressions: careful merge. |
| `systems/keys.js` | One owner (H) for new actions. |
| `test/run.mjs`, `CHANGELOG.md`, `main.js` | Nobody edits them in parallel: tests are discovered, and the integrator writes the changelog. |

**Independent** (one agent each, little merge risk): per-region story and content files (`data/regions2/3/4_story.js`,
`emberhold.js`, `hamlets.js`, `sidequests.js`, `companionquests.js`, `chapter3.js`, `hubs2/3/4.js`, `emberhold_map.js`),
the region generators (`world/regions2/3/4.js`, but see W above), native art per creature (`art/native/*.js`), boss
classes, `arena/*` with `world/arenaRun.js` and `world/arena.js` (one owner), each menu tab file, `ui/*`, and the small
pure systems (`systems/food`, `elixir`, `relics`, `burden`, `durability`, `bless`, `moon`, `treasure`, `tomes`, `daily`).
