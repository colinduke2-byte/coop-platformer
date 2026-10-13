# Frostfall refinement pass: plan for Opus

Written for a fresh session that has never seen this project. Read this whole file first, then `docs/GUIDE.md`, `docs/WORLD_EXPANSION_PLAN.md` ("What was built"), `docs/POWER_CURVE.md`, `docs/ENEMY_SCALING_PLAN.md` and `IMPROVEMENTS.md`.

Colin is the designer and director; you are the engineer. He plays the published build and sends notes. He has not found specific bugs yet ("played a bit, nothing specific"), so **this pass finds the problems itself**. It then fixes them, tunes the numbers and polishes. Do not wait for his notes; leave a slot for them (workstream 9).

## 1. Decisions already made by Colin

| Question | Answer | What it means |
|---|---|---|
| What may you change? | Everything: bugs and tests, balance numbers, and polish with small features | You may retune and add small quality-of-life features without asking. Still no new regions, bosses, classes or systems. |
| Balance target | **Normal is fair, not easy** | A decent player wins most fights with sensible gear and some potions; bosses take a few tries. Easy is gentle, Hard is demanding. |
| Worry areas | **Quest and story soft-locks; art and UI consistency** | These are workstreams 2 and 3 and get the most time. |
| Old saves | **Do not care** | You may change world generation, save layout and ids freely. Bump the save version and show "start a new game" instead of crashing; never write migration code. |
| Not worried about | Performance and mobile | Still do a sanity check (workstream 7), but it is not a priority. |
| Story | "Keep the story as is" (earlier) | Do not change plot, characters, endings or the design pillars. Fix wording, typos and logic only. |

Standing rule from earlier: **report every number you change as `field: old -> new`** in the commit message and in the final report, so Colin can revert any of them.

## 2. Ground rules

1. Work in `/home/user/coop-platformer/frostfall`, branch `frostfall`. Commit after each workstream step and push (`git push -u origin frostfall`). Never create a pull request unless Colin asks.
2. Verify with `npm test` (runs `test/run.mjs`, about 100 stages) and `npm run test:unit`. Keep both green. The known failure is `campaign_bot` (workstream 1 fixes it).
3. **Do not edit `src/` while a test run is in progress.** Wait with an until-loop, never a foreground `sleep`.
4. **Never `pkill -f` or `pgrep -f` with a pattern that matches your own command line** (it killed the shell once). Kill by pid.
5. Golden art rules: procedural pixel art on the 16-colour palette; hero is 16x16; no image files in the game. Native-pixel creatures use the helpers in `src/art/native/`.
6. Feel and balance numbers live in `src/data/tuning.js` and the data files (`enemies*.js`, `items*.js`), not as literals in code.
7. If you add a tile id, creature, item, spell or region, extend the matching test and re-baseline with `UPDATE=1` only after you have looked at the diff images (`test/baseline`, `test/out`).
8. Time-box: a fix that fails twice is reverted and logged under "Not fixed" in the report, with the reason. Do not sink hours into one problem.
9. Keep a running log in `docs/REFINEMENT_LOG.md`: date, workstream, what you found, what you changed, numbers old -> new.

## 3. Order of work and exit checks

Each workstream ends with: `npm test` green, committed and pushed. Publish (workstream 10) only at the end, or after workstreams 2, 4 and 6 if Colin wants to play mid-way.

| # | Workstream | Why this order |
|---|---|---|
| 0 | Baseline and tooling | Know the starting state and have the instruments. |
| 1 | Cold review of the expansion and test-suite health | The newest code has had the least scrutiny. |
| 2 | Quest and story soft-lock audit | Colin's top worry. |
| 3 | World reachability and placement audit | Soft-locks also come from unreachable things. |
| 4 | Art and UI consistency audit | Colin's other top worry. |
| 5 | Balance (Normal is fair, not easy) | Needs bugs and placement fixed first or the numbers mislead. |
| 6 | Combat feel, enemy behaviour and bosses | Checks that the new tricks and boss patterns are fair and readable. |
| 7 | Performance and robustness sanity | Cheap insurance. |
| 8 | Polish and small quality-of-life features | Last, once the base is stable. |
| 9 | Slot for Colin's play notes | Fold in whatever he sends, top priority when it arrives. |
| 10 | Docs, regression, publish | The same procedure as before. |

## 4. Workstreams in detail

### 0. Baseline and tooling (first hour)
- `npm install` if `node_modules` is missing. Run `npm test`, `npm run test:unit`, `node test/monkey.mjs 40` and record pass/fail and run time in the log.
- Read `test/harness.mjs` (launch/open/ev/shot/close) and `test/run.mjs`. Note the baselines: `test/reach_hash.mjs` and `test/art_baseline.mjs` (`UPDATE=1` re-baselines).
- Build a **single issue list** (`docs/REFINEMENT_LOG.md`, table: id, area, severity, status). Every finding goes in it, even ones fixed immediately.
- Severity scale: S1 crash, soft-lock or unwinnable quest; S2 wrong behaviour or visible glitch; S3 inconsistency or rough edge; S4 nit.

### 1. Cold review of the expansion and test-suite health
Review the diff from the commit before `0c4d967` (start of the scatter-terrain work) through `HEAD`, plus the earlier expansion commits (`git log --oneline` for "Embergreen", "Sunscorch", "burden", "Enemy tricks"). Do this review **without trusting the author's notes**; read the code and try to break it.
- Look for: null access on missing entities, off-by-one in tile ids (TILE ids 55 to 74, `TILE_COUNT=75`, `SOLID_TILES`), duplicated ids across item/quest/NPC tables, quest flags written but never read (or read but never written), `EXTRA_QUEST_IDS` merge order, event listeners never removed on scene restart, timers that survive a scene change, `Enemy.js` hooks (`heals`, `steals`/`fleeT`/`stolen`) when the actor dies, is frozen, or the player dies mid-steal.
- Thief edge cases: gold returned on kill only; what if the thief leaves the map, despawns by streaming, or is killed by another enemy or by a trap? Gold must never vanish or duplicate.
- Healer edge cases: heals a dead or despawned ally, heals past max health, heals an enemy that is mid-death animation.
- Burden: a player at the exact capacity boundary, equipping and unequipping repeatedly, selling while burdened, quest items (weight 0) in bulk, negative or NaN weights from items with no type. Burden and Pony mount interactions.
- Spells: Regrowth, Thorn Snare, Sandstorm, Sunbeam: mana cost under armour class, cast while stunned, cast during dialogue/menus, target dies mid-cast, cooldown after scene change.
- **Fix `campaign_bot`** (`test/campaign_bot.mjs`, `test/stage47_campaign.mjs`). It fails since the enemy-health increase. Teach it to use potions and dodge, or revise its thresholds so it still proves "the campaign is completable". Colin said to ignore it until he played more; he has now played a bit, so fix it. If a fix needs more than a few hours, replace it with a quest-graph completion test (workstream 2) and document that decision.
- Run the monkey/fuzz (`test/monkey.mjs`, `test/monkey_arena.mjs`, `test/stress_transitions.mjs`) with at least 200 random seeds each and fix every console error, `pageerror` and stuck state.
- Test-suite health: record the slowest stages, find flaky ones (run the full suite three times), and make every test deterministic (seeded). Remove tests that assert on constants that exist only to pin tuning numbers (they block retuning in workstream 5); replace them with relationship checks (for example "tier 2 enemies out-damage tier 1").

### 2. Quest and story soft-lock audit (top priority)
Goal from `docs/POLISH_PLAN.md`: **every quest finishable, in any order, with any choice, on any seed.**
- **Build a quest-graph validator** as a unit test. From `QUESTS`, `TARGETS`, `SCRIPTS`, `NPC_DEFS`, `EXTRA_QUEST_IDS`, `chain()` output and the dialogue trees, derive for each quest: giver, prerequisites, objective type, target entity, reward, flags set, flags required. Assert:
  - the giver NPC exists, is placed in a reachable town or camp, and has dialogue that can start the quest;
  - the target (kill, fetch, escort, talk, discover) exists in the generated world for the quest's region;
  - every prerequisite quest or item can be obtained earlier;
  - no quest requires an item that only drops from something gated behind that same quest;
  - no flag is a dead end (written never read, read never written);
  - turning in rewards cannot fail on a full or overweight pack (rewards must still be added when Burdened, per the burden rules).
- **Branch matrix.** Enumerate every choice: Heart of the Grove (replant or keep), Vault (Sunbreaker, Winterward, seal), Red Sula (turn in or let go), plus earlier choices in the older chapters. Run every combination (at least 3 x 2 x 2 x whatever else applies) through the epilogue and the final fight. Each combination must reach an ending, produce its epilogue lines, and apply or skip the final-fight modifier correctly. Add `test/stage78_branches.mjs`.
- **Order independence.** Randomise the order in which main quests, hubs, regions and chains are done (100 shuffles with a seeded bot that teleports between quest points, not walks). Verify no state where the next required step is impossible: an NPC that has left, a door that is locked with the key already used, a boss already dead whose flag is not set, a quest started twice, a quest offered after it was resolved by the other branch.
- **Failure paths.** Test dying, quitting and reloading at every quest step (save at each step, reload, finish). Test dropping, selling, or stashing a quest item (should be impossible or recoverable); test a target killed before the quest is accepted (the objective must still be satisfiable, either by retroactive credit or a respawn or alternative route).
- **New Game+.** Confirm quests, flags and choices reset, carry over or persist exactly as the design says; no half-state.
- **Dialogue.** Walk every dialogue tree of all 24 new NPCs and the old ones: no dead-end node that leaves the player unable to close the box, no node that references an unset variable, no choice with an empty body, no line longer than the box. Check `say`/`choose` with keyboard, gamepad, touch and mouse.
- **Journal.** Every active quest shows a correct objective text and marker; completed and failed quests are listed; a resolved branch's alternative is shown as closed, not stuck active.
- Output: a table in the log of every quest, its status (verified by test / bot / by hand), and every issue found.

### 3. World reachability and placement audit
- Fuzz at least **200 seeds** (the `test/dbg_world.mjs` and spacing unit tests are the starting point; extend them). For each seed and each region, assert by flood-fill from the region entrance over walkable tiles: every town, gate, dungeon entrance, landmark, chest, quest target, shrine, camp and boss arena is reachable on foot without crossing water or solids, and none sits on a solid tile or within the spacing limits.
- Check the gates between regions (`valegate`, `dunegate`, and every older gate) work in both directions, and that the player cannot be trapped by walking into a pocket with no exit (`docs` mention an UNSTUCK action; verify it still frees the player at region borders, inside landmarks, and inside the new solid scatter tiles BOULDER, CACTUS, BIRCH and others).
- Check the **scatter terrain** and landmarks for readability problems: a landmark chest behind a solid ring, a guard camp placed so that the enemy spawns inside a wall, a pond or oasis with no walkable shore.
- Dungeons (Thornroot, Sealed Vault and the older ones): a path exists from the entrance to the boss and back; keys and levers are reachable before the doors they open; the boss room cannot be left until the boss is dead if that is the design (and can be left if it is not).
- Streaming: walk a long route across all regions and check entities do not duplicate, vanish or reset when they stream back in (killed enemies stay dead; opened chests stay open; thief gold stays consistent).
- Determinism: the same seed generates the same world twice and across reloads (`reach_hash`).

### 4. Art and UI consistency audit
**Art**
- Generate a contact sheet of **every** tile (ids 0 to 74), every creature (including variants and mini-bosses), every NPC style, every item icon, every spell icon and every landmark. Look at each one (use the Read tool on the PNGs). Record anything off-palette, mis-sized, clipped, unreadable at 1x, or too similar to another asset.
- Palette conformance test: every pixel of every generated asset is one of the 16 palette colours (or transparent). Add it as a unit test if it is not already enforced.
- Creature sizing: compare footprints and hitboxes with the sprite (`test/audit_sizes.mjs`); the hitbox must match what the player sees. Check the new creatures face and animate in all four directions, have hurt/death/attack frames, and use consistent shading direction.
- Region identity: standing in each region, the ground, trees, rocks, water and building tiles must clearly read as that region, with enough variety that no screen looks like a repeated stamp. Vale should look warm and green, Sunscorch sandy and bright, and neither should have stray snow tiles. Check region borders and transitions between tile sets for visible seams.
- Day/night and weather tinting on every new tile and creature: not unreadably dark at night, no clashing tints.
- Item icon uniqueness: no two different items share an icon at 1x; rarity tiers read apart. (`stage69` covers gear; extend to the 40+ new items and the four new spells.)
- Worn-armour layering: all new armour and helmet pieces render on the hero in all poses with no clipping through shields, weapons or hair; check each armour class.

**UI**
- Text overflow: for every item name, NPC name, quest title, quest text, dialogue line, tooltip, lore page, bestiary entry, hub name and place name, measure the rendered width against its container at the standard and Large UI sizes. Write a test that fails on overflow. Fix by shortening copy or wrapping, not by shrinking fonts.
- Screens: title, character select, HUD (including BURDENED/OVERLOADED, status icons, boss bar), inventory (WT column, WEIGHT sort), equipment, tooltips (class line), map and compass (new regions and landmarks have names and markers), journal, bestiary, lore, shops, smith, alchemy, stash, pause, settings, arena menus, death and ending screens. Screenshot each at standard and Large UI, on keyboard, gamepad, mouse and touch input, and verify every screen can be opened, navigated and **closed** with every input device. No focus trap.
- Controls: rebinding still works for the four new spells; spell-slot UI handles the longer `SPELL_ORDER`; quick-cast cycling does not skip or loop wrongly.
- Consistency: the same wording for the same thing everywhere ("HP" versus "Health", "WT" versus "Weight", gold symbol), consistent casing, no placeholder or debug text, no untranslated ids shown to the player (for example `lm_*`, `valegate`, `EXTRA_KIND_NAME` fallbacks).
- Typo and grammar pass over all player-facing strings in the new data files (`regions4_story.js`, `hubs4.js`, `items4.js`, `enemies4.js`, `landmarks.js`, `story.js`): run a spell-check script over extracted strings, then read the flagged ones.
- Accessibility: colour-blind safe cues on the burden states, the boss telegraphs (Sunbeam lines, Rootbound pods) and elite markers; none depends on colour alone.

### 5. Balance: "Normal is fair, not easy"
Tools: `npm run balance` (`test/balance.mjs [trials] [name]`), `test/balance_arena.mjs`, `tools/power_table.mjs`, `docs/POWER_CURVE.md`. **The bot is a crude lower bound on a human**; Colin says he is very good at his own game. So balance to bot results with a stated human offset, and say so.

Targets (propose these in the log first; adjust if the numbers show they are unreasonable):
| Fight | Bot win rate on Normal, recommended gear for the tier | Notes |
|---|---|---|
| Regular tier patrol, correct level and gear | 50% to 80% | A bot loss costs potions, a human should usually win. |
| Under-geared by about 2 upgrade levels | 15% to 40% | Preparation matters. |
| Over-geared by about 3 upgrade levels | at least 85% | Grinding pays off but does not trivialise bosses. |
| Boss at correct gear | 15% to 50%, with 20% to 60% boss health left on a loss | Learnable, a few tries for a human. |
| Boss at 2 levels under | under 10% | Walls you into preparing. |
| Mini-boss | 35% to 70% | Between a patrol and a boss. |

Work:
1. Run the matrix at **at least 20 trials per cell** (the last pass used 3 or 4, which is far too few): every region patrol, every boss, every mini-boss, every difficulty (Easy, Normal, Hard), every armour class, each of the four new spells, and day versus night. Output one table to `docs/BALANCE_TABLE.md`.
2. Known suspects from the last pass: Blight Mother (bot lost 4 of 4, about 30% health left), Vault Sovereign (1 of 3), Vale patrol (2 of 4), Sunscorch patrol (2 of 3). Do not assume these are wrong; measure with proper sample sizes first.
3. Dominance check: no single weapon class, spell, armour class, perk or companion should win more than about 15 points above the median in the same tier. Light, medium and heavy armour must each be the best choice in some situation (heavy vs. hard hitters, light vs. kiting, medium as the default). Re-check the speed cap x0.7 and the "heavy -8% speed" decision against fights where the player must dodge (Sunbeam, Rootbound pods).
4. Economy: gold income per hour of play against prices, repair and upgrade costs to +10, potion costs. Simulate a full run per difficulty and report time and gold at each boss. Flag any region where the player is broke or swimming in gold. Flag any item that is strictly dominated by a cheaper or earlier item.
5. Burden: a typical full-adventure pack should land around 85% to 110% of capacity without the stash. Count where players actually get Burdened in a simulated run; if it happens before the first town, raise capacity.
6. XP and level curve: levels at each boss against the enemy scaling `TUNE.scaling` (regionW .7, storyW .3, curve 1.6). Check no region is skippable by level alone and no region needs grinding.
7. Do the **spot checks by hand** that the bot cannot do: write a short list for Colin ("fight X at level Y with gear Z; expect to win with 1 or 2 potions") in the log.
8. After tuning, fix or relax the stage tests that pinned old numbers, with relationship-style assertions.

### 6. Combat feel, enemy behaviour and bosses
- Read every boss move table in `TUNE.<boss>` against the fight; check telegraph lengths are long enough to read (suggest at least 0.5 s for any move that can take more than 25% of health on Normal), recovery windows exist, and no move chain is unavoidable. Verify each of the 8 older bosses and 2 new bosses can be beaten by melee, bow and magic builds (some weaknesses are intended; none should make a build unable to win).
- Phase transitions: no invulnerable window longer than needed; no softlock when the player is outside the arena or dies during a transition; the boss resets cleanly on player death and the arena door state is right after retry.
- New creature tricks: healer priority is fair (kill the healer first is possible, healer is not unreachable); thief steals an amount capped at a sane share of gold and tells the player (message and sound); warchanter buff has a visible aura and a duration; burrowers and ambushers surface with a warning.
- Status effects: poison, burn, freeze, stun and the new Thorn Snare and Sandstorm effects stack, expire and cure correctly; `IMMUNE` rules are applied for the new creatures (note: `INFLICTS` and `IMMUNE` are local copies in `enemies4.js`; confirm they match the originals, or export them from one place).
- Enemy AI: stuck on corners, walking into water or lava, chasing forever across region borders, ignoring the player in sneak, sleeping enemies waking from far away, enemies attacking through walls. Run a long soak (20 minutes of game time with the monkey) and log any enemy that stops moving while aggro'd.
- Player feel: roll i-frames, stamina, knockback by armour class, hit-stop and screen-shake level on all attacks, sound on every hit and miss, parity of controls between keyboard and gamepad.

### 7. Performance and robustness sanity (not a priority)
- Run `test/perf.mjs`, `test/spike_perf.mjs` and `node test/stress_transitions.mjs`. Record frame time and memory in each region with the maximum number of enemies. Fix only regressions larger than about 20% against the previous baseline.
- The single-file build is about 2.2 MB: check it still loads within a few seconds on a mid-range laptop and does not freeze while generating art on first launch (consider a progress bar if the generation takes more than about two seconds).
- Check for leaks across 50 scene transitions (listeners, tweens, textures created per run).
- Test the browser build in Chromium for console errors during a 10-minute monkey run. Firefox and Safari cannot be tested in this environment; list them under "Needs a human".

### 8. Polish and small quality-of-life features
Allowed because Colin said "all 3". Keep each small and tested. Candidates, in priority order; skip any that prove costly:
1. **Drop / stash from the pack screen** (the burden system left this out; the plan said "sell or stash instead"). A quick Drop or "send to stash" action when you are Overloaded, with a confirmation for equipped or valuable items.
2. Mouse-wheel scrolling and Items-tab right-click (listed as not wired in `IMPROVEMENTS.md`).
3. Large UI also enlarging dialogue text and the pause menu (`IMPROVEMENTS.md`).
4. Compass and map markers for the new landmarks, hubs and gates; fast-travel or at least "return to last town" if it already exists for other regions.
5. Bestiary and lore pages: every new creature and landmark appears after it is met; completion percentage includes them.
6. Short, clear tutorial hints for the new mechanics (burden, armour classes, healers, thieves), shown once.
7. Audio: confirm the two new region songs loop without clicks and the combat layer works; add sound cues for steal, heal, Rootbound pod destroyed, Sunbeam warning.
8. Death screen tips that mention the cause (for example "A cutpurse stole 40 gold").
9. Anything the audit finds that is a one-line fix and plainly improves the game.

Out of scope unless Colin asks: new regions, new bosses, new weapon classes, mounts beyond the Pony, online features, resolution upgrade (parked in `POLISH_PLAN.md`), story changes.

### 9. Slot for Colin's play notes
When Colin sends notes, they go to the top of the log as "Colin" items with priority over everything above except an S1 crash. Reply to each with what you changed (`old -> new`) and how to re-check it. Map feel words to specific numbers ("too floaty" -> roll length, move speed; "hits feel weak" -> hit-stop, screen shake, damage numbers; "boss unfair" -> telegraph length, damage, recovery).

### 10. Docs, regression and publish
- Update `CHANGELOG.md`, `docs/GUIDE.md` (new numbers, drop/stash, any changed behaviour), `IMPROVEMENTS.md` (move finished items out, add "needs a human" items), `docs/POWER_CURVE.md` and the "What was built" sections where numbers changed.
- Full regression: `npm test`, `npm run test:unit`, monkey, balance matrix, fuzzed worlds. Re-baseline `reach_hash` and `art_baseline` only after reviewing the diffs.
- Build: `npm run build:single` produces `frostfall.html`. Publish to the artifact `https://claude.ai/artifact/4wShcY5s7U5KkoYbGeqcuZ` (update in place with the Artifact tool) and to GitHub Pages: `/home/user/frostfall` is the Pages clone; `index.html` there is `frostfall.html` wrapped with a doctype and meta tags; push to `origin main`. Check Pages serves the new build.
- Final report to Colin (chat, plain language, no jargon dumps): what was found and fixed (counts by severity), the full list of number changes `old -> new`, anything not fixed and why, the spot-check list for him to play, and what still needs a human (other browsers, real gamepad, real phone).

## 5. Definition of done

- `npm test` and `npm run test:unit` pass with zero failures, including a working `campaign_bot` or its documented replacement.
- The quest-graph validator and the branch matrix pass: every quest and every choice combination reaches an ending on every fuzzed seed.
- The reachability fuzz (200+ seeds) reports zero unreachable or mis-placed points of interest.
- The art and UI audits report zero overflow, off-palette or duplicate-icon findings, and every screen opens and closes with every input.
- The balance table exists with at least 20 trials per cell and meets the targets in workstream 5, or each miss is explained.
- 200+ monkey seeds with zero console errors.
- `docs/REFINEMENT_LOG.md` lists every finding with its status; docs and changelog are current; both published copies are updated and checked.

## 6. Questions that remain open (defaults chosen so you do not block)

1. **Drop action.** Default: build it (workstream 8, item 1). Colin can veto.
2. **Bot-based balance targets.** Default: the table in workstream 5, with the caveat that a bot understates a skilled human. If Colin's playtest says "too easy", raise enemy health and damage in `TUNE.scaling` by 10% steps; if "too hard", lower them.
3. **Typos and wording.** Default: fix silently, but do not change story beats.
4. **Publishing mid-way.** Default: publish after workstreams 2 and 5 if they pass, so Colin can play a more stable build while the rest continues; otherwise once at the end.
5. **Needs hardware you do not have.** Firefox, Safari, a real gamepad and a real phone cannot be tested here; list them for Colin.
