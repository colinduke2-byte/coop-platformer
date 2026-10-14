# Frostfall: making it run better and play smoother (no mechanics, visuals or story)

An audit in four parts, done 2026-10-14 against the current `frostfall` branch:
1. Measurements of the real build in headless Chromium (desktop CPU, and the CPU throttled 4x to stand in for a weaker laptop or phone).
2. A code review of the hot paths.
3. Screenshots of every screen.
4. Experiments that break saves and storage on purpose.

Nothing in this list changes how the game plays, looks or what happens in the story. Each item has an id, the impact
(**H**igh / **M**edium / **L**ow) and the effort (**S** = an hour or two, **M** = about a day, **L** = several days).

## Status (done 2026-10-14)

**Done: 95 of 101.** Every item except the six below; A1 is partly done.

| Measured | Before | After |
|---|---|---|
| Hollow Reach frame, canvas fallback | 22.4 ms | 1.9 ms |
| Hollow Reach frame, WebGL | 2.5 ms | 1.7 ms |
| Worst hitch running across the Reach | 140 ms | 10 ms |
| Save size (fog of war) | 55 KB | run-length encoded; generated items pruned |
| Map tab reopen | 130 ms | cached bake |
| Autosave | on map change only | also every 240 s when safe (TUNE.autosave) |
| Memory after 16 map changes | flat | flat (no leak) |

**Not done, and why:**
- **P13** (bake prop shadows): off-screen culling (P1) already removes almost all of that cost.
- **P22** (chunked Reach tilemap): replaced by the cheaper fix (cached solid-tile lookup).
- **P26** (custom Phaser build): replaced by Phaser's arcade-only build (P25).
- **P27** (lazy-load on Pages): the game must stay a single file for the artifact. The service worker caches it after the first visit instead.
- **T8** (split the largest files): a refactor with no player-facing gain. It is left for a quiet week.
- **T9** needs a person on real hardware.
- **A1** is partly done: Large UI now says what it does (bigger bars and bar numbers). Real 2x text would need a second font size throughout and was not done.

## Where things stand (measured)

| What | Now | Note |
|---|---|---|
| Boot to title (desktop / 4x slower CPU) | 0.8 s / 3.1 s | first paint at 0.17 s; 265 ms of boot is generating ~580 textures |
| Town, interior, dungeon frame | 1-2 ms | fine |
| Hollow Reach frame, WebGL | 2.5 ms | fine on a GPU, but see P1 |
| Hollow Reach frame, canvas fallback | **22 ms** (below 60 fps) | what players without WebGL get: 1,200 scenery images drawn, ~25 on screen |
| Hitches while running across the Reach | **up to 140 ms**, 21 of 258 frames over 8 ms | streaming plus pathfinding garbage |
| Memory churn in a 25-enemy Reach fight | **37 MB/s** | causes garbage-collection pauses (30-40 ms frames) |
| Memory after 16 map changes | 19.8 -> 22.9 MB, flat | **no leak** |
| First entry to the Reach | 0.8-1.1 s (worldgen 344 ms) | later entries 0.4 s |
| Opening the Map tab after exploring the Reach | 130 ms frame | re-bakes the whole terrain each time |
| Save size | 55 KB, 94% of it fog of war | grows with every region and every generated item |
| CI | **37 of the last 40 runs red** | timing-based tests, not real bugs |

## Top 15 (the order I would do them in)

1. **S1**: one error freezes the game forever. Keep the loop alive and show a crash screen.
2. **S2**: the Daily Challenge overwrites your campaign save.
3. **S3**: NEW GAME silently overwrites the active slot. Add a slot picker and delete/overwrite confirmations.
4. **S4**: a damaged save freezes the title on CONTINUE. Sanitise on load.
5. **P1**: hide off-screen scenery. The canvas renderer goes from 22 ms to about 4 ms, and GPU work drops too.
6. **P2 + P3 + P6**: the three biggest sources of garbage and hitching. All small changes.
7. **U1**: the lockpick panel has no text (the text is drawn underneath the panel).
8. **U2**: the Quests tab doesn't scroll (72 quests run off the screen).
9. **U3**: dialogue with 7 choices hides the 7th ("Leave" at the smith).
10. **U5**: the boss bar covers your health bars, and toasts collide with boss lines.
11. **C1**: rebinding a key breaks the controller and touch controls for that action.
12. **C2**: on a controller, A doesn't confirm in menus (it's B), and there is no button for pack, journal or map.
13. **S5**: autosave when the tab is hidden or closed, plus a timed autosave in the open world.
14. **T1**: make CI trustworthy (frame-exact test input, seeded randomness) and run tests in parallel (45 min down to about 12).
15. **S8**: export and import saves, so progress survives cleared browser data and moves between PC and phone.

---

## 1. Performance

### Frame time and stutter
- **P1 [H/S-M] Hide off-screen scenery.** Phaser only culls tilemaps; every Image is processed every frame. In the Reach,
  ~1,190 of 1,212 objects are off screen (shadows 271, herbs 191, paw prints 153, signs 128, glows 107...). Bucket static
  decor into ~256 px cells and toggle `visible` per cell when the camera changes cell. Measured: render 1.06 -> 0.30 ms
  (WebGL), 2.75 -> 0.83 ms (canvas, dev), and the full canvas frame from 22 ms to roughly 4 ms. Also skip the per-frame flame
  and light updates for hidden cells (`GameScene.js:674, 683`).
- **P2 [H/S] Pathfinding allocates a whole-map array on every call.** `world/pathing.js:46`:
  `new Int32Array(w*h).fill(-2)` is 816 KB per call in the Reach, about 37 calls/s in a fight, which is about 30 MB/s of garbage.
  Reuse module-level buffers with a generation stamp: 0.2 ms -> 0.03 ms per call.
- **P3 [H/S] Four separate static collider groups.** `GameScene.js:193-195` collides the player and enemies with npc,
  breakable, prop and chest bodies separately. Each one searches the same physics tree, so it is 4x the work and the #2 garbage source.
  Merge them into one static group (or mark grid-aligned props solid in the tile layer and drop their bodies).
- **P4 [H/S] Every moving thing calls `setDepth` every frame**, forcing a full re-sort of ~1,200 objects every frame
  (Enemy, Player, Pickup, Npc, Projectile, critters). Only set depth when the rounded value changes.
- **P5 [M/S-M] GameScene loops over the whole map every frame.** It checks interactability on 572 interactables, swaps the
  texture on 46 flames, sets alpha on 107 lights, and runs `breakables.filter`. Use the P1 cells, so only nearby cells are scanned.
- **P6 [M/S] Gamepad polling allocates every frame even with no pad** (`keys.js:120-153`): new Sets, a spread `padMap()`
  and a new info object. Skip it when no pad is connected, and cache the map.
- **P7 [M/M] The HUD rebuilds itself every frame.** It clears and redraws all of its graphics, calls `setFont` every frame
  (which, unlike `setText`, is never skipped), sends ~20 strings through upper-casing regexes, and calls `activeQuestIds()`
  twice. Draw static parts once and redraw only on change.
- **P8 [M/S] Lighting** clears its render texture every frame even at noon, and computes `ambient()` 2-3 times per frame.
  Hide the overlay in daylight and cache the value per frame.
- **P9 [L/S] Hot-path garbage.** `dir8`/`norm` return new objects, the hit-rectangle getters build a Rectangle per call,
  and `bus.emit` copies its listener set on every emit. Use reused temporaries.
- **P10 [L/S-M] Effects are not pooled.** Each damage number creates and destroys 2 bitmap texts; slashes, rings, bolts,
  projectiles and enemy markers are not pooled either.
- **P11 [L/S] Idle enemies** compute stealth detection (which allocates) before the cheap range test (`Enemy.js:249`).
  Dungeon enemies run full AI however far away they are.
- **P12 [L/S] Snow** draws up to 160 rectangles per frame into a Graphics. Two scrolling tile sprites would be cheaper.
- **P13 [L/S-M] Every prop has its own shadow Image** (271 in the Reach). Baking the shadow into the prop texture halves
  the object count.

### Frame pacing, battery and fast screens
- **P14 [H/S] Phaser starts a second, unused AudioContext** that runs all session (an audio thread, so battery).
  Add `audio: { noAudio: true }` to the game config.
- **P15 [H/S] Physics steps at a fixed 60 Hz while everything else uses frame time.** On 120/144 Hz screens (MacBook
  ProMotion) bodies move every other frame, which looks like judder. Use `fixedStep: false` (or match the display rate),
  then re-run the combat tests. Needs a check on a real 120 Hz screen.
- **P16 [M/S] No frame cap and no power hint.** Add a FRAME RATE option (Auto / 60 / 30) and `powerPreference: 'low-power'`
  (a 320x180 game never needs the discrete GPU).
- **P17 [M/S] Music and the drip ambience keep running in a hidden tab** (a `setInterval` scheduler).
  On `visibilitychange`, suspend the audio context. Skip scheduling music notes when music is off.
- **P18 [M/S] Every footstep allocates a fresh noise buffer** (53 buffers in 5 s). Build one 2 s noise buffer and start
  at random offsets. Rate-limit each sound to once per 30-40 ms in crowd fights.
- **P19 [L/S] Two polling timers run forever** (`main.js:77` every 300 ms, `touch.js:98` every 250 ms). Make them event-driven.

### Loading and transitions
- **P20 [M/M] Boot generates every texture up front.** That is 119 character sheets, 293 icons, 84 held weapons
  (~265 ms desktop, ~1 s on a slow CPU), plus a GPU read-back of every sheet for outlines. Build icons and sheets on first use
  (the native creature art already works this way), outline in a byte buffer, and pack small textures into atlases.
- **P21 [M/M] Worldgen runs on first entry to each overworld** (344 ms in the Reach), and again when the Map tab shows
  another region. Pre-build the save's region during the title screen when idle, or in a Web Worker.
- **P22 [M/S] The Reach tilemap** holds 204,120 tile objects (about 40 MB of the 51 MB heap), and re-entry spends 25 ms
  on `setCollision` plus 9 ms building the solid grid with `Array.includes`. Use a lookup table and cache per region (quick).
  Chunked tilemaps are the big fix (L).
- **P23 [M/S] The Map tab re-bakes the terrain on every open and zoom** (130 ms frame). Write the bake as one ImageData,
  and keep it until the fog changes.
- **P24 [L/S] The System tab and title parse each save file 2-3 times per redraw.** Store a small per-slot summary.

### Download size
- **P25 [L/S] Use Phaser's arcade-only build** (`phaser-arcade-physics.min.js`): -110 KB raw, -32 KB gzip, no code changes.
- **P26 [L/L] A custom Phaser build** with only the parts used (no Matter, video, DOM, mesh, FX pipelines) cuts Phaser
  by ~40-50%, which means faster script parsing on phones.
- **P27 [L/M] Pages only: lazy-load** the ending, arena, intro and lore data (doesn't help the single-file artifact).

---

## 2. Saves, errors and robustness

- **S1 [H/M] One exception stops the game loop for good.** Phaser schedules the next frame only after the step returns, so a
  single throw freezes the screen. Verified: the frame counter stuck at 64. The "THE GAME KEPT GOING" toast can never show.
  - Wrap the step in try/catch and count errors.
  - If the same error repeats, show a crash card: COPY REPORT / SAVE TO A RESCUE SLOT AND RELOAD / BACK TO TITLE.
  - Add a test that injects a throw.
- **S2 [H/S] The Daily Challenge overwrites the campaign save.** `saveGame` only skips Arena runs (`S.quick`), not daily runs.
  Verified: slot 1's seed changed and the slot became a daily run. Add `|| S.daily` and a test.
- **S3 [H/M] NEW GAME writes over the active slot without asking**, and after two saves the backup is gone too.
  - NEW GAME should open the slot picker: empty slots first, "OVERWRITE SLOT 2 (LV 14, 6H 20M)?" for full ones.
  - Add DELETE SLOT (`deleteSave` exists but nothing calls it).
- **S4 [H/M] A save with one bad field freezes the title.** Verified with `flags: null`: `recalc` throws inside the title
  update, and then S1 freezes the game.
  - Sanitise every field against `newState()` on load.
  - On failure fall back to the backup, keep the raw text as `_corrupt`, and tell the player.
- **S5 [H/S-M] Autosave gaps.**
  - Today it saves only on map changes, fast travel and story events, so a long session in the open world can be lost by
    closing the tab, or by iOS killing a background tab.
  - Save on `pagehide` and when the tab is hidden.
  - Add a quiet autosave every 3-5 minutes when out of combat (keeping your position).
  - Show a small save icon when it happens.
- **S6 [H/S] The error log is useless for the shipped build.** It records the message and line only, and in the single file
  everything is on line 1.
  - Record the stack and column.
  - Build hidden source maps and keep one per release.
  - Put the version and build id in the F4 report.
- **S7 [H/S-M] Generated loot definitions pile up in the save forever** (~280 bytes each, never pruned). After a long game
  that's several hundred KB per slot; with 3 slots and 3 backups it approaches the 5 MB browser limit.
  - Keep only definitions still referenced by inventory, equipment or the stash.
  - Store fog as a bitset: 51 KB -> ~8 KB.
- **S8 [H/M] Export and import saves.**
  - EXPORT downloads a `.json` file. COPY SAVE CODE is a fallback for the artifact frame, which blocks downloads.
  - IMPORT takes a file or a pasted code.
  - Call `navigator.storage.persist()`.
  - This protects against Safari wiping storage after 7 days without a visit, and against cleared site data. It also lets
    you move a save between PC and phone.
- **S9 [M/S] The save version is written but never read.** A save from a newer build loads without complaint. Add a
  version check and a migration chain, which matters once cached old code can meet new saves.
- **S10 [M/S] Blocked storage is silent.** The game boots, but every save fails quietly. Probe storage at boot. If it's blocked,
  say "SAVES ARE OFF IN THIS BROWSER - USE EXPORT". Tell "STORAGE FULL" apart from "BLOCKED".
- **S11 [M/S] A corrupt slot just shows as empty**, and the next save destroys the evidence. List it as "SLOT 1 DAMAGED"
  and offer to export the raw data.
- **S12 [M/S] Two tabs overwrite each other's saves.** Detect a second tab and show a banner; save read-only in that tab.
- **S13 [M/S] Settings are trusted blindly.** A bad stored volume makes audio throw. Clamp each field.
- **S14 [M/S] One backup isn't enough** if a bug corrupts the state in memory. Keep a once-per-session snapshot too, and
  read back each write to check it.
- **S15 [M/S] F4 bug report** only works in-game on a keyboard, and its clipboard fallback prints nothing.
  - Add COPY BUG REPORT to Pause > System and the title screen.
  - Show the text in a selectable box.
  - Include the version, save size and storage status.

---

## 3. Screens and UI

### Broken or hidden things
- **U1 [H/S] Lockpicking panel has no text.** The text is drawn under the panel graphics (`HudScene.js:161` vs `:77`).
  Fix the depth and label the pins ("PINS 1/3") and lockpicks left.
- **U2 [H/S] Quests tab doesn't scroll.** With many quests the list runs over the help line and off the screen, and the
  selected quest can be invisible. "NEXT:" is pinned at y=136 and overprints long objective lists. Scroll like the
  Items tab, and lay out the detail pane top-down.
- **U3 [H/S] Dialogue shows at most 6 choices.** The 7th is invisible but selectable ("Leave" on the smith's 7-option menu).
  Long choices run off the right edge, and the question disappears when the choices appear.
  Fix: scroll the choices, wrap long ones, and keep the question visible.
- **U4 [H/S] Selected locked rows are invisible** in Perks and Feats (grey text on a grey highlight). Unselected locked rows
  are barely readable.
- **U5 [H/S] The boss bar covers your HP/MP bars**, and toasts, spoken lines and the quest marker all share the bottom strip
  and overprint each other. Give each its own zone, or move the boss bar to the bottom centre.
- **U6 [H/S] "E: TALK" is drawn on top of the NPC's name.** Move it above the name, on a dark plate.
- **U7 [M/S] The tip/tutorial banner covers the health bars and gold for 12 s**; a new tip replaces the old one silently.
  The area name and the level-up banner overlap. The sneak indicator and lock-on bar can overlap.
- **U8 [M/S] Status row**: 6 fixed slots, buffs listed first, so harmful effects (burn, slow) silently drop off. Show harmful
  effects first, "+N" on overflow, and timers.
- **U9 [M/S] System tab**: on keyboard, row hints run off the screen (the fit-to-width only applies on a controller). Page
  labels don't match the row order, so "Q NEXT" jumps backwards. LOAD GAME and QUIT TO TITLE act instantly, with no
  confirmation and no "save first?".
- **U10 [M/S] Title screen**:
  - The last menu item sits on the snow, and the footer is pale-on-white.
  - The footer and menu box show through every overlay.
  - The slot picker has no header, no empty slots, no date, no delete, and cuts names at 14 characters.

### Information players need but can't get
- **U11 [H/S-M] The death screen** says only "YOU DIED" for 2.4 s. It never mentions the 10% gold loss, what killed you,
  or where you'll wake, and HUD overlays keep drawing over it. Show "SLAIN BY X  -N GOLD  WAKING AT ...".
- **U12 [M/S] No numbers on bars**: HP/MP/SP, skill XP and in-game volume sliders. Add an optional "HP 87/135" style readout,
  at least with Large UI.
- **U13 [M/S] Perk points available**: no marker on the PERKS tab or in the HUD. Add "!" markers for new perk points, lore
  and quests.
- **U14 [M/M] Toasts vanish after 2.4 s and only 5 fit**; loot spam pushes quest updates off. Merge duplicates and add a
  RECENT MESSAGES log in the journal.
- **U15 [M/S] Silent autosave**, and the System tab says "SLOT 1 IS EMPTY" after you've played a while. Show a save icon
  and "NOT SAVED YET" in a clear colour.
- **U16 [L/S-M] Dialogue**: no text-speed option, the advance key isn't shown, and the cast key silently skips the rest of a
  conversation. Add a conversation log.

### Truncation and readability
- **U17 [M/S] Names are cut with no ellipsis** almost everywhere. Examples:
  - item list "STAFF OF THE LONG WI";
  - shop titles at 13 characters ("RUSTY SWORD +");
  - quest titles ("AN UNDELIVERED");
  - lore titles at 17 characters;
  - quest tracker at 34 characters;
  - faction tiers at 4 characters;
  - food buffs at 9 characters.

  Use one shared `fit(text, chars)` helper with "...", and wrap where there is room.
- **U18 [M/M] Item descriptions are cut at 3 lines** with no way to read the rest. Make the panel scroll, or widen it.
- **U19 [M/S] The Items help line never changes** with the selection. It shows "F OFFHAND" on armour and "E USE" for
  equipping. Build it from the selected item (EQUIP / DRINK / READ...). The "E" (equipped) and "O" (offhand) tags have no
  legend. The CHARM row is clipped by its panel.
- **U20 [M/S] Lore tab**:
  - 275 entries in one list, marked only by `*` and `+`.
  - Long books don't scroll.
  - Add BOOKS / BESTIARY / ITEMS filters and a scrolling body.
- **U21 [M/S] Shops**:
  - Costs read like fractions ("GOLD 2374/50"); write "50 GOLD (HAVE 2374)".
  - Enchant shows the price in red when it's the materials that are missing.
  - The forge doesn't show before -> after values.
  - "OR CLICK" reads as a stray fragment.
- **U22 [M/M] Shop quantities**: buying 10 potions takes 10 presses. Add x1 / x5 / MAX with left/right.
- **U23 [M/M] The smith is a 7-option dialogue, paging 4 at a time** with "More...". Turn it into one tabbed screen
  (BUY / SELL / REPAIR / UPGRADE / ENCHANT / BUYBACK).
- **U24 [M/M] Map tab**:
  - Legend colours clash (exit = quest, you = chest, fire = brazier), and NPCs and chests aren't in the legend.
  - The player marker blinks off half the time.
  - Small hub maps open at 1x when 2x fits.
  - ESC in cursor mode closes the whole menu.
  - Fast travel only works with the cursor on a fire. Add a list of known campfires.
- **U25 [L/S] Cheat-sheet rows** in the System tab touch each other (8 px spacing). The arena daily screen wastes space.
- **U26 [L/S] Sell screen** has no sort or filter, and no confirmation for selling the last unique item.
- **U27 [L/S] Mouse**: clicking a row immediately uses the item (a stray click drinks a potion). The wheel only scrolls when
  the MOUSE option is on.

---

## 4. Controls

- **C1 [H/M] Rebinding a keyboard key breaks the controller and touch for that action.** The pad and touch buttons press
  fixed keyboard codes. Verified: after binding MOVE UP to H, stick-up stopped working. Have the pad and touch press
  actions, not keys.
- **C2 [H/M] Controller menu buttons.**
  - Confirm is B and A is roll, so A does nothing in the pause menu and shops (but does on the title screen).
  - There is no button for the pack, journal or map, yet tips say "OPEN THE PACK (I)" to pad players.
  - Make A confirm and B go back in every menu, and put the pack on View/Back.
- **C3 [H/M] Prompts ignore rebinding.** Every help line, tip and How To Play shows the default letters. Add one
  `keyFor(action)` helper that reads the current bindings; the pad version from this week already does this for buttons.
- **C4 [M/S] The close/back hint gets dropped first** when a pad help line is too long. Drop optional hints instead,
  and use clearer short names than "RS D".
- **C5 [M/S] No key repeat in menus.** Holding down doesn't scroll long lists on the keyboard or pad. Repeat after 300 ms,
  every 80 ms.
- **C6 [M/S] Controller unplugged**: no reaction. Pause with a toast. Rumble goes to the first pad, not the one in use.
- **C7 [M/S-M] AZERTY/QWERTZ prompts.** Movement works (physical keys), but prompts say "W" where an AZERTY player presses
  Z. Read the layout with `navigator.keyboard.getLayoutMap()` where available.
- **C8 [M/S] Rebinding feedback**: a silent swap with another action, no scrollbar on the 33-row list, and mouse bindings
  shown while the mouse option is off. The controller screen shows "BTN 0" with no pad connected.
- **C9 [L/S] Store only changed bindings**, so future default changes reach players who rebound something.
- **C10 [L/S] Stick deadzone option** (fixed at 0.45/0.55 today).
- **C11 [L/S] Arena**: "H CHANGE HERO" is keyboard-only, locked arenas are skipped silently, and its hints aren't adapted
  for the pad. The intro's "E: SKIP" only advances one line and is nearly invisible.

### Touch and phones
- **C12 [H/M] Touch layout**:
  - No potion buttons.
  - The stick and buttons sit over the spell and potion slots.
  - The gameplay buttons stay on top of the pause menu and shops.
  - Make HUD slots tappable, hide the action buttons in menus, and keep slots out of thumb zones.
- **C13 [M/S] Notch and home bar**: the touch buttons ignore safe areas.
  - Use `env(safe-area-inset-*)`.
  - Add `-webkit-touch-callout:none`, `user-select:none` and `overscroll-behavior:none`.
- **C14 [M/S] iOS audio unlock** listens only to `pointerdown` (which doesn't count on iOS) and doesn't handle the
  "interrupted" state after a phone call. Needs a real iPhone to confirm.
- **C15 [M/S] Fullscreen fails silently** on iPhone and inside the artifact. Hide or explain it, and lock landscape on Android.
- **C16 [M/S] Phone held upright**: show a "rotate your phone" card instead of a tiny strip.
- **C17 [L/S] Screen dims** when playing on a phone with a controller. Request a wake lock while in game.
- **C18 [L/S] The start card works before boot finishes**, leaving a black screen on slow phones. Show LOADING until ready.

---

## 5. Accessibility

- **A1 [M/M] Large UI only enlarges the bars**, yet its hint promises bigger text. Either make a real 2x HUD/text option or
  change the wording.
- **A2 [M/S-M] No reduced-motion option.** Things that move: the blinking map marker, the bobbing quest marker, the low-HP
  pulse, snow over menus and the blinking dialogue arrow. FLASHES only covers camera flashes.
- **A3 [M/M] Colour is the only cue** in map markers, status chips, rarity, perk state and danger colours. The colour-blind
  filters can't fix that. Add letters or shapes.
- **A4 [M/S] The title Options lack FLASHES, SHAKE and controls**, so a sensitive player meets the intro and first fight
  before they can turn them off. CHALLENGE shows a name with no description.
- **A5 [L/M] High contrast**: grey-on-slate text (help lines, locked rows, "EMPTY") is hard to read. Offer a high-contrast
  text option.

---

## 6. Publishing, versions and tooling

- **T1 [H/M] CI is red 37 of 40 runs** from timing-based tests (stage6, stage14_ux, stage32, stage60; stage58 line 105 still
  has the fixed-gold problem fixed at line 116).
  - Drive tests frame by frame instead of with wall-clock sleeps.
  - Seed `Math.random` from `?seed=`.
  - Retry a failed file once and flag it as flaky.
- **T2 [H/M] Parallel tests.** Each file already runs its own server and browser. Run 4-6 at once, with a per-file timeout and
  `--only`. Move campaign_bot (13 min alone) and the monkey tests to a nightly job. Expected time: about 45 min -> about 12 min.
- **T3 [H/M] The live Pages site has no offline mode and can't be installed.**
  - The bundle registers `sw.js`, which isn't published (the 404 is swallowed).
  - There is no manifest, favicon, theme colour or description/share tags.
  - The offline test checks the local build, not what's published.
  - The Pages workflow lives only on the `frostfall` branch and has never run.
  - Fix: one `tools/publish.mjs` that builds, writes `index.html`, `sw.js`, the manifest and icons to the Pages repo, stamps the
    version, commits and pushes, and prints the artifact path. Point the offline test at that output, and delete the dead
    workflow.
- **T4 [H/S-M] Builds can't be identified.**
  - `VERSION` is a hand-set 'V1.0' and never changes, and the service-worker cache never changes either.
  - Stamp a build id (git hash and date) on the title screen and in F4.
  - Name the cache after it and delete old caches.
  - Show "UPDATE READY - RELOAD" when a new version installs.
  - The service worker also re-downloads the 2.2 MB bundle on every launch; serve hashed files cache-first.
- **T5 [M/S] Add a perf test that would catch regressions**: render time, depth sorts per frame and allocation rate. Today's
  perf test only times the update, on the canvas renderer, so P1/P3/P4 problems would never show up.
- **T6 [M/S-M] Lint** (ESLint, ~10 s in CI: undefined names, unused variables, import cycles) and gradual `// @ts-check`.
  958 source lines are over 200 characters long, and 68 are over 400.
- **T7 [L/S] `?pack=` URLs** can load any URL as a content pack. Restrict this to same-origin or dev builds.
- **T8 [L/L] Split the largest files** (sprites 91 KB, worldgen 58 KB, maps 54 KB, items 48 KB, GameScene and Enemy 41 KB)
  along their existing seams.
- **T9 [needs a human] Check the artifact frame once on real hardware** (gamepad, fullscreen, clipboard), plus Firefox, Safari and an iPhone.

---

## Already good (not proposed again)
- No memory leaks across map changes: textures, listeners and scene objects all stay flat.
- Region generation is cached per seed.
- Creature art is built lazily.
- Effects particles are pooled.
- Streaming spawns enemies within 300 px and despawns them at 520 px.
- Background ticks are throttled (fog, fires, quests, trophies).
- Menus redraw only when something changed.
- Saves are tiny and fast to write (0.3 ms), with backups and validation.
- Arena runs never write saves.
- Input uses physical key codes.
- Controller learn mode works for odd pads.
- Prompts already follow the last device used.
- Blur opens the pause menu.
- Integer scaling and colour-blind filters exist.
- Separate volume channels persist.
