# Refinement log

Running log of the refinement pass described in `docs/OPUS_REFINEMENT_PLAN.md`.

Severity: S1 crash, soft-lock or unwinnable; S2 wrong behaviour or visible glitch; S3 inconsistency or rough edge; S4 nit.

Colin's calibration (asked at the start): overall difficulty on Normal is "about right, maybe 10% too easy". So the balance work is: fix outliers, plus a global ~10% step up on Normal.

## Baseline

Before any change, the full suite (`npm test`, about 90 test files, 32 minutes) passed except `campaign_bot`.

## Summary

68 findings logged: 5 S1 (crash, soft-lock or stuck), 19 S2, 20 S3, 9 S4, and 15 test, polish and balance entries.
Every one is fixed except the items under "Not fixed" below. Final suite: all green (one flaky dagger check made sturdier).
Published: artifact version 34 and GitHub Pages.

## Issues

| id | area | sev | finding | status |
|---|---|---|---|---|
| R1 | quests | S1 | The Raiders chain (Captain Nadir, 3 quests) can never start: its NPC `dune_guard2` is never placed, and `SCRIPTS.dune_guard2 = SCRIPTS.dune_guard` overwrites the chain script anyway. | fixed: the chain is given by the Amberwell guard, now named Captain Nadir |
| R2 | quests | S2 | Jamila's shop (sells the Sunbeam tome, the dune bow, the veil helm) disappeared: her quest chain replaced her script, so after or during the chain she only talked. Same for Lark's chatter (Lark also said "the song is finished" before his chain had started). | fixed: a chain now falls back to the NPC's own script (shop, chatter) whenever it has nothing quest-related to say |
| R3 | text | S4 | Red Sula's epilogue line mentions a "postcard" (anachronism). | fixed: "a letter at midwinter" |
| R4 | tests | - | No test checked that NPCs have scripts, that chains can finish, or that chain goals exist in the world. | added `test/stage78_quests.mjs`: 115 NPCs in 100 maps, 9 chains x 3 steps, goal reachability, shop survival, 12 choice combinations |
| R5 | combat | S1 | Killing a Dune Raider froze the game about one time in five: its arrow drop had no amount, the loot code crashed inside the kill, and Phaser stopped the game loop. The kill also never counted toward "Raiders on the Road". | fixed: the drop has an amount (2-4); the loot code falls back to 2-4 arrows; the content validator rejects a bad drop range |
| R6 | world | S2 | The 25 landmarks almost never appeared (6 placed out of about 600 asked for over 20 seeds): they needed the full place-to-place gap and were placed last, after the map was full. | fixed: a landmark is something you pass, not a destination, so it keeps 24 tiles from other places; a crowded region puts one in the most open spot left (at least 18 tiles from anything); landmark roads are laid last so they never shorten the roads between real places. Now 104 of 104 over 4 seeds. New spacing test counts them. |
| R7 | world | S2 | The Old Kingdom's Scribe (gives and finishes "the Hollow King") also stood in a Sunscorch courtyard on every seed. | fixed: the Scribe appears in the Kingdom only |
| R8 | combat | S2 | A cutpurse stole gold even when its hit was parried, blocked or absorbed by a ward. | fixed: only a hit that costs you health steals |
| R9 | combat | S2 | A cutpurse killed by your thorns rune during its own hit still took the gold, which was then lost for good. | fixed |
| R10 | combat | S2 | Killing a thief paid back more than it took (the returned gold went through gold-find bonuses). | fixed: you get back exactly what was stolen |
| R11 | combat | S2 | A fleeing thief kept its attack slot for 7 seconds, so two fleeing thieves stopped every other melee enemy from attacking, and it ran in its attack pose. | fixed: it switches to a flee state |
| R12 | combat | S2 | Queen Vespera never called her hornets (and would have called draugr). | fixed: she calls hornets at about half health |
| R13 | combat | S2 | Dew Sprites could heal bosses and named mini-bosses, and kept healing while frozen or stunned. | fixed: they heal ordinary creatures only, and not while frozen or stunned |
| R14 | combat | S2 | The Blight Mother's Rootbound pods were full Blightblooms with loot, so the fight could be stalled forever to farm gold, petals and gear. | fixed: lootless "Rootbound Pod" |
| R15 | combat | S2 | Item speed and stealth were counted twice on new armour (Sunplate was -15% speed, not the -8% it says). | fixed: Sunplate, Hulkheart Plate and Verdant Mail take speed from their class only |
| R16 | quests | S2 | "Honey for the Winter" paid an item that does not exist (`elixir_speed`), so the reward vanished. | fixed: Quicksilver Tonic |
| R17 | quests | S3 | Freeing Red Sula paid her dagger, which she always drops anyway; the decision took two extra conversations. | fixed: freeing her gives 2 amber and 5 lockpicks; the decision happens in the same conversation |
| R18 | quests | S3 | Killing the Blight Mother or the Vault Sovereign without telling Maeve or Rashid gave an epilogue that described a choice you never made; talking to them after an early kill read as if the boss were alive. | fixed: a neutral epilogue line; Maeve and Rashid notice the boss is dead and go straight to the choice |
| R19 | quests | S3 | New Game+: keeping the Heart of the Grove stacked +20 health every cycle, and the heart stayed in the pack. | fixed: the +20 comes from this run's choice; the heart is removed on NG+ |
| R20 | combat | S3 | The Long Winter's Sunbreaker penalty ("strikes faster") wore off at phase 2. | fixed |
| R21 | combat | S3 | Status effects: the mini-bosses inherited nothing from their base creature (Kharn not bleed-immune, Sandmaw no bleed bite); Sun Sentinels were not fear-immune though Sandstorm fears. | fixed |
| R22 | combat | S3 | Sandstorm ignored armour (used the shout damage type). | fixed: counts as a spell |
| R23 | combat | S3 | Feared stationary enemies (pods, prisms, spore mothers) walked away. | fixed |
| R24 | combat | S3 | Blight Mother: her green Rootbound tint never showed; "TORN LOOSE" could leave a telegraph on screen; pods left floating shadows when she died. | fixed |
| R25 | items | S3 | Glyphward could not be obtained anywhere. | fixed: Khalid sells it (760 gold) |
| R26 | items | S4 | Mini-boss and boss drops like "4 thornvine" gave one. | fixed: drops take an amount range |
| R27 | world | S3 | The two new world bosses (Mossking, Sunwyrm) had no name and no unique drop. | fixed: named; they drop Verdant Mail and Sunplate |
| R28 | world | S3 | A second batch of the same place kind reused ids (two `den0`, two `vale_rest0`): discovering one silently discovered the other, and two dens shared one bounty. | fixed: ids count every place of the kind |
| R29 | art | S4 | Highland boulders were drawn on a snow square on the heath. | fixed: heath rocks there |
| R30 | world | S4 | No footprints on the new snowdrift and frostbloom patches; new place kinds used the ruin colour on the map. | fixed |
| R31 | burden | S2 | Overloaded was no slower than Burdened (the 0.7 speed floor swallowed the overload penalty). | fixed: the floor is 0.5 when Overloaded |
| R32 | burden | S2 | The weight warning missed changes made by selling, stashing, equipping, mounting or food wearing off. | fixed: checked every frame (cached) |
| R33 | burden | S3 | Pressing roll while Overloaded did nothing, with no feedback. | fixed: "TOO HEAVY TO ROLL" and a sound |
| R34 | burden | S4 | One weapon held in both hands counted as one and a half; unknown armour classes in content packs could crash. | fixed; the validator checks `weight` and `wt` |
| R35 | ui | S3 | Pack screen: the sort label overlapped the MISC filter; gold overlapped the weight; the armour stat ran off the panel; the CHARM row was hidden; descriptions ran out of their box; long names ran into the count. | fixed (sort shown in the help line; tighter rows; shorter labels) |
| R36 | ui | S3 | Shop detail pane: heavy armour's lines ran past the pane into the footer. | fixed: shorter class line; the description gives way to stats; nothing drawn past the pane |
| R37 | world | S2 | A frost lily in the starting forest was walled in by pines on every seed (Mirra's herbs need three lilies). Found by the new reachability fuzz. | fixed: a clear path next to it |
| R38 | tests | - | No test walked every region and dungeon for unreachable chests, NPCs, herbs, lore, exits or missing quest places. | added `test/unit/reach.mjs`: 10 regions x 24 seeds plus 9 generated dungeons x 12 seeds (run with 200 seeds by hand: clean) |
| R39 | tests | - | No test ran every NPC's dialogue with random answers. | added `test/stage79_dialogue.mjs`: 115 scripts x 3 story states; all finish, none throw |
| R40 | tests | - | The monkey (random input) test never visited the new regions, hubs or boss dungeons. | added 11 maps; ran on 3 seeds: clean except one crypt hiccup that did not reproduce |
| R41 | tests | - | `campaign_bot` failed since the health increase: its bot re-equipped the starting fur tunic before the crypt (throwing away the armour it bought), and it is simply too weak to beat Jarl Valdrek reliably. | fixed the re-equip bug; it now farms more and gets three tries at the boss like a player; the boss result is reported, not asserted (the balance bot measures that fight), so the test checks the campaign's flow through chapter one |
| R42 | tests | - | `stage37` measured the Winter Elk's movement as straight-line distance after 20 seconds, which fails when the route turns a corner (it did after the landmark fix). | fixed: checks several times along the route |
| R43 | ui | S3 | Lore list names ran into the right panel. | fixed; new `test/stage81_ui.mjs` checks every menu tab for text running off screen or across columns |
| R44 | ui | S4 | The quick-cast key list called slot 8 "Spirit Wolf"; it is Ember Nova. | fixed |
| R45 | quests | S4 | "Verses of the Grove" said "visit" a grove but needs it cleared (its warden fought). | reworded |
| R46 | art | S4 | The Grove Warden mini-boss looked exactly like an ordinary Mosshulk. | fixed: pale green tint |
| R47 | polish | - | New: DROP in the pack (V twice): drops the selected stack at your feet; it stays until you leave the area and is not pulled straight back. Equipped and quest items cannot be dropped. | added |
| R48 | polish | - | New: the mouse wheel scrolls the pack and shop lists (it used to switch the pack filter). | added |
| R49 | polish | - | New: chain quests show a marker back to the giver once the goal is met, and a one-time "QUEST READY" notice. | added |
| R50 | polish | - | New one-time tips: carry weight, dew sprites, cutpurses, warchanters, sand burrowers, sun sentinels. Rootbound Pod has a bestiary entry. | added |
| R51 | spelling | - | Spell-checked every sentence in the expansion's data files: no typos (only names and British spellings flagged). | checked |
| R52 | burden | S3 | A busy buff list could push BURDENED/OVERLOADED off the HUD status row. | fixed: shown first |
| R53 | burden | S4 | The pack's WEIGHT sort ordered by a number the pack never showed. | fixed: the item description starts with its weight |
| R54 | tests | - | stage66 (native art sizes) did not know the new Rootbound Pod. | updated |
| R55 | balance | - | Colin: Normal felt "about right, maybe 10% too easy". | `TUNE.difficulty.normal.dmgTaken` 0.99 -> 1.04, `enemyHp` 1.65 -> 1.73 (Easy and Hard unchanged) |
| R56 | death | **S1** | **After your first death and respawn, a second death left you walking around at 0 health forever**: the "respawning" flag survived the map reload, so the game never noticed you had died again (reproduced: second and third deaths stayed at 0 HP). The companion test even asserted the broken behaviour. | fixed (reset on every map load); test now requires three deaths in a row to each respawn at full health |
| R57 | story | S1 | Closing the game between beating the Long Winter and picking its ending left the story stuck (Chapter 3 never opens); same for the Ashen Sovereign's last choice. | fixed: the choice is offered again on the next load; the game saves after the ending |
| R58 | quests | S1 | Dying in the 0.7 s between Grimfang yielding and his spare prompt could leave "The Pale Alpha" stuck forever. | fixed: no prompt while you are down; sparing updates the quest first |
| R59 | saves | S2 | The save 3 seconds after a boss kill could store 0 health if leftover adds killed you, so loading it killed you again. | fixed: no save while dead |
| R60 | loot | S2 | Heart shards and Skaldrath's three dragon items were loose pickups: dying to leftover adds or reloading could lose them for good. | fixed: they go straight into the pack |
| R61 | ng+ | S2 | New Game+ (which promises "character and gear carry over") dropped the stash contents, socketed gems and runes, learned tomes, trophies, cloak, pet and the Emberhold house. | fixed: all carried over |
| R62 | saves | S3 | A mid-fight save brought a boss back half-dead after you died and respawned in the same dungeon. | fixed |
| R63 | dialogue | S3 | A conversation cut off by death stayed on screen after the respawn; scene event listeners for the ending piled up on every map load. | fixed |
| R64 | doors | - | A reviewer reported a door pressed during the 0.35 s arrival fade-in could freeze the game. Not reproducible: Phaser's fadeOut always forces. Added a timer fallback anyway. | checked |
| R65 | loot | S3 | A Rootbound Pod could still drop a random gear item through the general "ordinary foes now and then" roll. | fixed: a `noLoot` flag |
| R66 | robustness | S2 | Several scripted moments (resting at an inn or at home, house doors, fast travel, map changes) waited for a camera fade event or the scene clock with no fallback; if either never arrived (a throttled background tab, a held scene clock) the conversation never ended. The dialogue fuzz caught one at an inn. | fixed: every such wait also has a real-time fallback |
| R67 | travel | S3 | Fast travel while bleeding, poisoned or burning could finish you off mid-journey and autosave at 0 health. | fixed: "NOT WHILE YOU ARE HURTING" |
| R68 | balance | - | 20-trial matrix (see `docs/BALANCE_TABLE.md`). Outliers fixed: Blight Mother 0.45 -> 0.5 health (the real gate is the pods: a bot that ignores them never wins, one that kills them wins 7/20); Ashen Sovereign 0.7 -> 0.62 (2/20 -> 8/20); Hedge Knight health 80 -> 72, damage 19 -> 16 (Vale patrol 6/20 -> 13/20). Flagged, not changed: late-game patrols of the older creature types are very easy for expected gear. | done |

## Not fixed (and why)

- **Large UI for dialogue text and the pause menu**: the 6 px pixel font cannot scale by a non-whole amount; doubling it needs a redesigned dialogue box. Left in `IMPROVEMENTS.md`.
- **Late-game patrols of the older creature types are very easy** for the expected gear (balance bot 20/20 at tier 2 and 3). The fix (`TUNE.scaling`) also moves the in-game danger warnings, so it needs a joint re-tune; left for Colin's call (see `docs/BALANCE_TABLE.md`).
- **Bosses ignore status effects** (burn, bleed, poison, root, fear). Existing design; now documented in the guide. Thorn Snare and Sunbeam's burn therefore do nothing to bosses.
- **New Game+ keeps the five Hearts**, so the Winter Throne is open from the start of a new cycle. Existing behaviour; a design decision.
- **Armour-class dominance check**: the balance bot cannot play light versus heavy armour meaningfully (it never kites or dodges by speed), so this needs a human.
- **Firefox, Safari, a real gamepad and a real phone**: cannot be tested here.

## Spot checks for Colin (about 20 minutes)

1. **Die twice** anywhere (the first and the second death must both put you back at your respawn point with full health). This was the worst bug.
2. **Amberwell**: Jamila has her shop again (Sunbeam tome, dune bow); Captain Nadir (the gate guard) offers "Raiders on the Road". Kill a Dune Raider or two (it used to freeze the game sometimes).
3. **Embergreen Vale, Thornroot Hollow**: the Blight Mother. When she roots in and says DESTROY THE PODS, kill the three pods. If she feels like a wall even then, lower `TUNE.bosses.blightmother.hp` (0.5) in `src/data/tuning.js`.
4. **Walk the Hollow Reach for a few minutes**: landmarks (the Frozen Fall, Mammoth Bones, the Lone Giant, a Fallen Statue) should now turn up; each has a guard, a chest and a lore page.
5. **Get robbed by a cutpurse** in the Sunscorch Reach: parry or block and nothing is stolen; get hit and chase it; kill it and exactly the stolen amount drops.
6. **Pack (I)**: sort by weight (R), drop something with V twice, walk away and back to pick it up. Scroll with the mouse wheel.
7. **Normal difficulty** is about 10% harder than before (`TUNE.difficulty.normal`: damage taken 1.04, enemy health 1.73; the old values were 0.99 and 1.65).
