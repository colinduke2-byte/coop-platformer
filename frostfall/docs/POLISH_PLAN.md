# Polish plan: making Frostfall feel finished

Decisions from Colin: all four areas matter (game feel, menus and screens, visuals and audio, story and world); plays on a mix of Mac with a wired controller, phone with a Bluetooth controller, and keyboard; wants a thorough effort in several rounds, each tested and republished.

Method for every round: **audit** (automated sweeps plus a short list from Colin's play), **fix**, **test** (a new regression test for every bug), **republish**, then a five-line report with how to try it and which numbers to adjust.

## Round 1: Stability and input (the things that make a game feel broken)
- Finish the death/respawn hardening: audit every `ui.modal` path (menus, shops, dialogues, level-up pickers) for anything that can freeze the world while the player is dead, in a cutscene, or mid-transition. Add a "stuck-state watchdog" test that tries every combination.
- Pause and menus: Esc/Start while dying, while a dialogue is open, during a fade, during a boss intro. Window blur on phones and Macs (alt-tab, notification pull-down).
- Input matrix test: keyboard, wired pad, Bluetooth pad, touch, and mixes, on every menu and in play. Hold-to-repeat in menus, button-mash safety, pad hot-plug, controller remap sanity.
- Phone: the sideways view with a controller (built), safe areas for notches, a "performance mode" that cuts lighting, particles and far-away enemy updates if the frame rate is low. Measure real fps in the F3 overlay (needs Colin's numbers).
- Saves: autosave rules, slot clarity, a "last saved" stamp, corrupt-file recovery already exists; add export/import of a save as a code.

## Round 2: Game feel
- Combat pass per weapon style (sword, axe, spear, greatsword, dagger, bow, crossbow, hammer, each spell): wind-up, hit-stop, knockback, recovery, sound and screen shake. Colin plays and says "too floaty / too heavy"; I map it to `tuning.js` and report old to new values.
- Enemy readability: every enemy gets a clear telegraph and a distinct hit reaction; no unavoidable damage; check crowd behaviour (wolf packs, camps) for fairness.
- Dodge, block and parry timing windows; stamina costs; lock-on in crowds.
- Camera: look-ahead, boss framing, arena framing, shake budget, accessibility (shake and flash options already exist).
- Difficulty curve: re-run the balance bots for every boss and arena hero after the changes; widen to a full "level 1 to credits" progression sim.

## Round 3: Menus and screens
- Title: continue/new/arena/daily flow, a settings entry, version stamp, no dead cursor positions.
- Pause > System has 26 rows: split into pages (Game, Controls, Display, Audio, Accessibility) with a short hint line for each row.
- Inventory, journal and map: sort and filter everywhere, compare-with-equipped, clearer quest steps, map legend, marker declutter, pad and touch parity.
- Tutorials and tips: show once, only when relevant, never during combat; a "controls reminder" page.
- Arena Mode: hero preview art, a how-to-play card, a stats page (records per hero and mode), mode and room descriptions.
- Accessibility pass on every screen: text size, contrast, colour-blind modes, readable prompts for the current input device, nothing important conveyed by colour alone.

## Round 4: Visuals and audio
- Animation: walk cycles beyond three frames, attack/hurt/death for every creature, idle life (breathing, blinking, sway), consistent shadows.
- Effects: hit sparks per element, status icons, spell trails, boss phase transitions, weather and lighting by region, death and respawn transitions.
- World art: biome transitions, interior detail, region identity for the Ashen Peaks, Frozen Coast and Old Kingdom, UI icon set consistency.
- Audio: longer music loops (currently 30 to 60 s), per-region and per-situation variation, layered combat music, SFX mix levels and variation to avoid repetition, ambience.

## Round 5: Story and world
- Writing pass over all dialogue for one voice (epic, mythic, never padded), quest text that always says what to do next, no dead-end quests.
- Quest flow audit: a bot that walks every quest line from start to finish and fails on any blocked step, missing item or unmarked target.
- NPC life: schedules, barks, reactions to your choices and to the ending, more to see in hamlets.
- World: points of interest feel distinct, rewards fit their risk, no empty stretches (use the map screenshots to check density).
- Endings: pacing of the credits and epilogues, a "what happens next" in the world after the end.

## Round 6: Balance, economy and content cohesion
- Gold sinks and income over a full run, loot quality curve, crafting and socket usefulness, faction rewards.
- XP and level curve (slowed already), perk value, spell parity, arena heroes and boss rush tuning.
- NG+ scaling, daily challenge modifiers, new-region enemy tuning.

## Round 7: Release hardening
- Cross-browser: Firefox and Safari checks, iOS and Android real-device passes, audio autoplay rules, fullscreen behaviour.
- Performance budgets per region and per arena; load time and file size.
- CI: run the GitHub Actions workflow once for real and fix differences.
- Docs: update README, the Field Guide page and the changelog; a short "known issues" list.

## What I need from Colin (all optional, each makes a round better)
1. A list of the 5 most annoying things from your own play, in your words.
2. Frame rate from the F3 overlay on your phone during a fight, and which phone and controller.
3. Any art or audio you love in other games and want it to feel like (a few names is enough).
4. Whether there is anything you want removed instead of polished.
