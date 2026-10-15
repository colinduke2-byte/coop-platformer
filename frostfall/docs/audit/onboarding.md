# Audit: the first hour and how clearly the systems are explained (prefix NP)

Reviewer area: a brand-new player's first hour, how clearly each system is explained, how readable the HUD is, the hook, Arena as a first impression, plus menu friction the last pass missed.
Branch `frostfall`, 2026-10-15. I read docs/GUIDE.md, CHANGELOG.md and docs/RUN_AND_UI_IMPROVEMENTS.md first, and I don't repeat that document's 101 items.

**How I played.** Headless Chromium through `test/harness.mjs`, using the default seed 0x5eed. The route:
- Title, HOW TO PLAY, OPTIONS, then NEW GAME, the intro and Sigrid's opening conversation.
- The tutorial, played with real key presses: move, roll, then the wolf, with lock-on and swings.
- The pack, the journal and the map. Bjorn's and Mirra's conversations, the campfire, and the pause/System tab.
- Into the Hollow Reach, and the first death (to the wolf pack at the entrance).
- The crypt, lockpicking, the shout, a level-up, and the Arena from the title through to its results screen.

The screenshots are in `test/out/np*.png`; the ones that back a finding are named in it. The scratch scripts are in the session scratchpad, not the repo.
Each item says whether it is **verified** (seen in play or proven from the code) or a **guess**.

Format: **id: title**, followed by impact H/M/L, effort S/M/L, and DESIGN where Colin should approve.

---

## A. Fixes and polish

### NP1: Tutorial instructions arrive one step late, and some never arrive (H / S), verified
- **What happens:**
  1. When the intro ends, `GameScene.js:619` posts the controls card ("WASD MOVE  SPACE ROLL ... R SHOUT") as a hint, holding the hint slot for 12 s.
  2. The tutorial's MOVE hint is then *queued* behind it (`HudScene.js:115`: a new hint waits while the current one has more than 4 s left).
  3. Each later step queues again and only trims the current hint to 6 s, and the queue keeps 3 entries and drops the oldest.
- **What I saw:**
  - While the wolf was attacking, the screen still said "PRESS SPACE TO DODGE ROLL" (np12, np13). The "IT IS WINDING UP, ROLL THROUGH IT" line never appeared in time.
  - After the wolf died, the screen still showed "A WOLF! PRESS T TO LOCK ON" 4.6 s later (np14, np15). The "WELL FOUGHT. TALK TO BJORN" line was stuck behind it.
- **Why it matters:** the only taught fight in the game teaches each move after the player has already needed it.
- **Fix:**
  - Give hints a priority. Tutorial and urgent hints (`tut`, `windup`, `potion`) replace the current hint at once, and tips queue as now.
  - Show the controls card after the tutorial ends (or fold it into the MOVE step).
  - When the tutorial step changes, clear the queued entries from the earlier step.
- **Files:** `src/scenes/HudScene.js:110-117`, `src/systems/tutorial.js`, `src/scenes/GameScene.js:619`.

### NP2: The quest tracker is drawn on top of the clock (H / S), verified
- **What happens:** outdoors, the clock is drawn at y=25, right-aligned (`HudScene.js:432`), and the first quest-tracker line is drawn at y=26, right-aligned (`HudScene.js:590`).
- **What I saw:** with a quest active in the village, the top right read "> HERBS 0/89010" over "SLAY WOLVES 0/3" (np75). The "SAVED" mark also sits in that corner.
- **Why it matters:** the tracker is the main "what now" cue, and it is unreadable outdoors, which is exactly where you need it.
- **Fix:** start the tracker under the clock and moon (y≈36) when outdoors, or move the clock under the purse on the left of it.
- **Files:** `src/scenes/HudScene.js` (the clock around line 432, the tracker around line 586).

### NP3: After the intro, the journal is empty and nothing points you anywhere (H / S-M), verified, light DESIGN
- **What happens:** Sigrid says "Talk to Bjorn at the lodge... Mirra sells potions... then come and see me", but no quest starts.
- **What I saw:**
  - After the tutorial `S.quests` had nothing active.
  - The journal says "NO QUESTS YET. TALK TO THE VILLAGERS." (np20). There is no HUD tracker and no marker.
  - The village map has no labels, so "the lodge" can't be found from it (np25).
- **Why it matters:** a new player's first free moment has no goal on screen.
- **Fix:** start a tiny starter quest, "A Stranger in Hollowfrost", when the intro ends, and track it automatically:
  - Steps: speak to Bjorn, visit Mirra's stall, return to Sigrid.
  - Its marker leads to the next NPC.
  - It completes into Sigrid's existing Hollow King conversation.
- **Files:** `src/data/dialogue.js` (`intro`), `src/data/quests.js`, `src/systems/quests.js`.

### NP4: Fast travel can't be found from the hints the game gives (H / S), verified
- **What happens:**
  - The discovery toast says "CAMPFIRE FOUND - FAST TRAVEL ON THE MAP (F)" (`events.js:148`). In play, F is *block*. The real path is M, then E (cursor), then T (next fire), then F.
  - The map's normal help line ("Q ZOOM R REGION E CURSOR...") never mentions travel.
  - The campfire's own menu (Rest, Cook, Wait, Cancel; np74) has no Travel option, yet the roadside sign says "REST HERE TO HEAL, SAVE AND FAST TRAVEL" (`worldgen.js:380`).
- **Why it matters:** fast travel is part of the core loop, and a new player is told the wrong key for it.
- **Fix:**
  - Add a "Travel to another fire" option to the campfire menu that opens the map in cursor mode on the nearest known fire.
  - Change the toast to "...: AT ANY FIRE, OR MAP > E > F", built from `prompt()`.
  - Add "F TRAVEL" to the map's normal help line when the cursor is on a fire.
- **Files:** `src/entities/Props.js` (RestSpot), `src/world/events.js:148`, `src/scenes/menuMap.js:86`.

### NP5: Tips fire at the wrong moment (M / S), verified
- **potion:** "POTIONS: 1 HEALTH..." fires below 40% HP but was queued behind the sneak tip, so it appeared *after* I had died and woken in the village (np34).
- **sneak:** "UNAWARE FOES TAKE 3X DAMAGE" fires on the *first alert* (`kills.js:87`), the moment a foe has already noticed you (np30). It is the right lesson at the wrong time.
- **quest:** "PRESS O FOR THE JOURNAL" only fires when an item is *picked up* while the wolves quest is active (`GameScene.js:234`), so most players never see it.
- **lock:** fires when you pick up lockpicks, not at the first locked chest.
- **Fix:**
  - potion: urgent priority (see NP1).
  - sneak: fire when an unaware enemy first comes within about 140 px while you are not sneaking.
  - quest: fire from `startQuest`.
  - lock: fire from `Chest.interact` when the chest is locked.
- **Files:** `src/systems/tips.js`, `src/world/kills.js`, `src/scenes/GameScene.js:232-234`, `src/entities/Chest.js:45`.

### NP6: Danger colours are promised but nearly invisible, and never explained in play (M / S), verified
- **What happens:**
  - HOW TO PLAY says "NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU".
  - But the coloured name appears only in the target bar, when you lock on (T) or aim the bow (`HudScene.js:651-664`). Wolves in the Reach show no name at all (np30, np31).
  - "Fair" foes show no danger word, and no screen gives the scale (green easy, white fair, yellow tough, orange deadly, red hopeless).
- **Fix:**
  - A one-time tip the first time you target a foe that isn't "fair": "TOUGH = YELLOW. NAME COLOURS: GREEN EASY ... RED HOPELESS".
  - A legend line in the Bestiary.
  - See NP26 for showing it without lock-on.
- **Files:** `src/scenes/HudScene.js`, `src/systems/tips.js`, `src/scenes/menuLore.js`.

### NP7: The campfire's choice box shows the last speaker and their line (M / S), verified once
- **What I saw:** I left Mirra's shop with ESC, then rested at the fire. The box was headed "MIRRA" with "FIVE SNOWBERRIES AND THREE FROST LILIES. THEY..." above "REST BY THE FIRE / WAIT UNTIL DUSK" (np74).
- **Why:** `choose()` reuses the box's last name and text when nothing `say`s first.
- **Fix:** clear the speaker and question when a script starts, or let `choose()` take an optional title ("THE FIRE").
- **Files:** `src/systems/dialogue.js`, `src/entities/Props.js:56-60`. Check the other bare `choose()` callers too.

### NP8: Villager name labels disappear on snow and pale roofs (M / S), verified
- **What I saw:** "HILDA" on snow (np26, np28) and "ASTA" on the white brick roof (np11) are close to invisible. The new player is told names ("see Bjorn", "Mirra's stall") and has to find them by these labels.
- **Fix:** give the label a dark 1 px outline or a 60% plate, like the "E: TALK" plate that is already there.
- **Files:** `src/entities/Npc.js` (the label), `src/art/font.js`.

### NP9: The first level-up stacks four messages at once (M / S), verified
- **What I saw (np40):** a skill-up banner, the "OPEN THE PACK (I) AND SPEND YOUR PERK POINT" tip, a "PERK POINT" chip, and a modal "LEVEL 2 ... CHOOSE AN ATTRIBUTE" box all appeared together.
- **Smaller problems:**
  - The modal's wording ("Gear and preparation will carry you further") doesn't say what the choice gives until the list appears.
  - The code comment says +10 and the options say +6 (`GameScene.js:624-630`).
- **Fix:** one level-up card that shows the attribute choice, "+1 PERK POINT (I > PERKS)" and the skill line, then nothing else for about 3 s. Drop the separate perks tip for the first level.
- **Files:** `src/scenes/GameScene.js:624`, `src/scenes/HudScene.js` (onChar), `src/systems/tips.js`.

### NP10: The first death creates an elite nemesis at the Reach gate, and the death card doesn't say so (M / S), verified, DESIGN
- **What happens:**
  - Any open-world death makes the killer your nemesis: one tier stronger, elite, and waiting where you fell (`playerCombat.js:276-280`).
  - On my first trip the wolves 160-270 px from the village exit killed me (np29-np32).
  - The death card said "SLAIN BY WOLF / YOU WAKE AT HOLLOWFROST VILLAGE" and nothing about the nemesis.
  - The only notice is a toast 1.8 s after you re-enter, "YOUR NEMESIS WAITS: WOLF", which means nothing to a newcomer.
- **Why it matters:** the first death makes the start of the game harder, without saying so.
- **Fix:**
  - No nemesis before character level 3 (or before the first quest is done).
  - When one is created, add a death-card line: "THE WOLF REMEMBERS YOU. IT WILL WAIT, STRONGER."
- **Files:** `src/entities/playerCombat.js`, `src/scenes/HudScene.js:456-462`.

### NP11: A wolf pack sits right outside the village exit (M / S-M), verified on seed 0x5eed only, DESIGN
- **What I saw:** arriving in the Reach at `forest/west`, four wolves were within 160-272 px and two were on screen at arrival (np29).
- **Why it matters:** the guide's advice is "stay on the roads at first", and the first road starts in a pack.
- **Fix:** keep a safe radius of about 25 tiles around the village exits in worldgen and streaming spawns, or allow only tier-0 single animals there.
- **To check:** other seeds, with `test/reach_hash.mjs`-style sampling.
- **Files:** `src/world/worldgen.js` and the streaming spawn code.

### NP12: Key names are still hard-coded in dialogue and items (M / S), verified
- **What happens:** C3 made prompts follow your bindings, but the text the player reads in conversations and item descriptions was missed:
  - Sigrid: "Hold C or Shift to creep. Press I for your pack, O for your journal" (`dialogue.js:28`).
  - Bjorn: "Roll through it with Space", "Crouch with C" (`dialogue.js:152,154`); also `dialogue.js:228,349,350`.
  - Items: "Hold F to block" (`items.js:62-64,198,227`), "Press V to switch ammo" (`items.js:90-91`), "press E to ride" (`items.js:125`).
  - Toast: "FAST TRAVEL ON THE MAP (F)" (NP4).
  - The controls card at `GameScene.js:619` is a fixed string passed through `padHint`.
- **Fix:** run these strings through the same `{KeyC}` / `prompt()` fill the tips use.
- **Files:** `src/data/dialogue.js`, `src/data/items.js`, `src/scenes/GameScene.js:619`, `src/world/events.js`.

### NP13: The shout's pop-up word is "FUS!" (M / S), verified, DESIGN
- **What I saw:** pressing R shows "FUS!" above the player (`playerBow.js:85`, np42). That is the literal first word of Skyrim's Unrelenting Force shout.
- **Why it matters:** the rest of Frostfall's names are original, and this one is a recognisable borrowing.
- **Fix:** use an original word or a sound mark, for example "HAA!" or a burst of rune glyphs.
- **Files:** `src/entities/playerBow.js:85`.

### NP14: The HUD slots have no key labels (M / S), verified
- **What I saw:** the bottom-left spell slot (a flame) and shout slot (a horn/speaker icon), and the three potion slots bottom right, show counts but not their keys (L, R, 1, 2, 3; np07). The shout slot shows a bare cooldown number ("2", np42).
- **Fix:** a tiny key glyph in each slot's corner from `prompt()` (pad buttons when a pad is in use), and "CD" or a sweep instead of a bare number.
- **Files:** `src/scenes/HudScene.js` (slot drawing).

### NP15: The lockpicking moment teaches too late and too little (L / S), verified
- **What happens:**
  - A locked chest with no picks only says "LOCKED - NEED LOCKPICKS" (`Chest.js:45`), with no hint where to get them (Hilda? bandits? barrels?).
  - The lock tip shows when you pick up picks, not at the lock (NP5).
  - That tip is then drawn half under the lockpick panel (np48).
- **Fix:**
  - "LOCKED. LOCKPICKS: HILDA SELLS THEM" (or wherever they come from).
  - Fire the tip at the lock.
  - Hide the hint while the lockpick panel is open.
- **Files:** `src/entities/Chest.js`, `src/scenes/HudScene.js`.

### NP16: Crafting systems have no first-use explanation (M / S-M), verified from the tip list
- **What happens:** `tips.js` covers combat and creatures but none of cooking, brewing, forge upgrade, enchant, reforge, fletching, sockets or furnishing.
  - "Cook a meal" only appears at a fire when you already hold cookable food, so a player never learns that fires cook.
  - Brewing shows "Brew (learn first)" at Mirra with no pointer to her herb quest.
- **Fix:**
  - Always list "Cook a meal" at the fire; when you have nothing cookable it says what is needed ("FISH, VENISON...").
  - Add one-line tips on the first visit to each service.
  - "Brew (learn first)" should mention the herbs.
- **Files:** `src/entities/Props.js:56`, `src/data/dialogue.js:242-248`, `src/data/services.js`, `src/systems/tips.js`.

### NP17: Arena and Daily drop a first-time player in with no teaching (M / S), verified
- **What happens:** both set `introDone` and `tutDone` (`arena/heroes.js:60`, `systems/daily.js:47`), so a player whose first click is ARENA gets no controls card and no tips (np62).
- **Problems on the Arena setup screen (np60, np61):**
  - Only the Reaver's card names its key ("BATTLE CRY ON R"); the Warden's (Force shout) doesn't.
  - "YOUR HERO" is greyed with no reason given.
  - "NEXT ROOM AT WAVE 5" is unclear.
  - The gold counter shows in the Arena HUD even though gold means nothing there.
- **Fix:**
  - The first Arena or Daily run shows the controls card for 8 s.
  - Each hero card lists its 2-3 key moves with `prompt()`.
  - "YOUR HERO (NEEDS A STORY SAVE)".
  - "THE ARENA CHANGES AT WAVE 5".
  - Hide gold when `S.quick` is set.
- **Files:** `src/arena/ArenaScenes.js`, `src/arena/heroes.js`, `src/scenes/HudScene.js`.

### NP18: Menu help lines are inconsistent, and some text is cut (L / S), verified
- **Help lines:**
  - The Items tab's help line has no "A/D TAB" or "ESC CLOSE" (np21).
  - The Perks tab has no ESC (np24).
- **Unclear terms:** "SKILL-UPS 0" on Perks is never explained (np24).
- **Cut text:**
  - The last skill line reads "SNEAK ATTACKS HIT 0.2X HARD..." (np22). Both the wording and the cut need fixing.
  - The title OPTIONS description is cut: "EASY / NORMAL / HARD. CHANGE IT ANY TIME IN" (np03).
- **Fix:** a shared help-line suffix ("A/D TAB  ESC CLOSE"), wrap the option descriptions to two lines, and rename SKILL-UPS or add a one-line explanation.
- **Files:** `src/scenes/MenuScene.js`, `src/scenes/menuPerks.js`, `src/scenes/TitleScene.js` (options).

### NP19: The guide and the game disagree (L / S), verified
- **Carry weight:** the guide says you start able to carry 180. The pack shows `WT 8/170`, because the starting Fur Tunic is light armour (-10 carry).
- **Skill bonus:** the guide says +7% damage per skill level. The game (`skills.js:38-42`) and the Skills tab both say +5%.
- **Bjorn's directions:** he says the wolves hunt "the north trail", then "follow the forest trail east of the village" (`dialogue.js:147` vs the progress line).
- **Fix:** correct docs/GUIDE.md, and make Bjorn's directions agree.
- **Files:** `docs/GUIDE.md`, `src/data/dialogue.js`.

---

## B. Upgrades and new features

### NP20: Starter quest plus an always-on "next step" line, the first-hour hook (H / M), DESIGN
- **What happens:** the Hollow King quest, the actual story hook, is only offered on the *second* talk with Sigrid (`dialogue.js:89-101`). The intro's "a voice is calling... many times" isn't followed up in the first hour.
  The first 10 minutes are wolves, herbs and a shop.
- **Proposal:**
  - NP3's starter quest.
  - At its end, Sigrid tells the Frostheart story, and **one beat of payoff**: a short vision or flash of the Hollow King calling the Dreamer, or a glimpse of the Hearts.
  - A HUD line that is never empty: the tracked step, or a suggestion such as "YOU CAN AFFORD AN IRON SWORD (HILDA)" or "A CAMPFIRE LIES EAST".
- **Why:** a reason to keep playing after 10 minutes needs to be seen, not written in the journal.
- **Files:** `src/data/dialogue.js`, `src/data/story.js`, `src/data/quests.js`, `src/scenes/HudScene.js`.

### NP21: A Field Guide (re-readable tips) (H / M)
- **What happens:** tips are one-shot (`S.tips`). They are not in the message log (`msglog.js` logs only toasts and speech), and the log isn't saved anyway.
  A tip missed in a fight (NP1, NP5) is gone for good.
- **Proposal:** Lore > GUIDE, listing every tip you've seen, grouped (Combat, Stealth, Crafting, Travel, Creatures).
  - It is filled as tips fire, with the unread dot already used for lore.
  - It also holds the danger-colour legend (NP6) and the controls card.
- **Files:** `src/systems/tips.js`, `src/scenes/menuLore.js`.

### NP22: A short optional "first steps" round at Bjorn's lodge (H / M), DESIGN
- **What the tutorial teaches today:** move, roll and swing.
- **What it never touches:** E (interact), potions, block and parry (the guide says stamina and parry are the heart of combat), sneak attacks, the bow, the pack.
- **Proposal:** Bjorn offers "Want to learn to hunt?" with three 30-second drills:
  - a straw dummy that swings (block, then parry);
  - a sleeping wolf (sneak with C and backstab, which shows HIDDEN/DETECTED);
  - a target post (hold K to draw).
  - Each drill gives a small reward (arrows, a potion), and the round is skippable.
- **Files:** `src/systems/tutorial.js`, `src/data/dialogue.js` (bjorn), the village map build.

### NP23: Labels on the village and hub maps (M / S)
- **What happens:** the village map is a small block of colour with a white "PERSON" square and no names (np25). New players are sent to "the lodge", "Mirra's stall", "Hilda" and "the gate to the Reach".
- **Proposal:** on hub maps, label buildings and key NPCs in tiny text (LODGE, SMITH, MIRRA, ARENA, GATE), and highlight the starter-quest NPC.
- **Files:** `src/scenes/menuMap.js`, `src/data/maps.js` (label points).

### NP24: Show danger without locking on (M / M), DESIGN
- **Proposal:** the first time an enemy becomes aware of you (or while you sneak), float its name for 1.5 s in its danger colour.
  Optionally show a coloured pip under every enemy in the open world for the first few character levels, behind a setting (DANGER MARKERS: AUTO / ALWAYS / OFF).
- **Why:** it puts the danger-colour system on screen during normal play, not only on the HOW TO PLAY card.
- **Files:** `src/entities/Enemy.js`, `src/scenes/HudScene.js`, `src/systems/settings.js`.

### NP25: A first-trip warning and a "safe road" marker on the first exit (M / S), DESIGN
- **Proposal:** the first time you leave the village, show a one-line card: "THE REACH: STAY ON THE ROAD. FIRES ARE SAFE. [DANGER] FOES ARE BEYOND YOU." Mark the nearest campfire with the quest-marker style until you find it.
- **Why:** it gets the player to the first fire (save, rest, travel) quickly. Today the first trip can end in the wolf pack and an elite nemesis (NP10, NP11).
- **Files:** `src/systems/danger.js`, `src/world/events.js`, `src/scenes/HudScene.js`.

### NP26: A bridge from the Arena to the story (L / S)
- **Proposal:** on the Arena results screen (np66), add a fourth option for players with no story save: "TRY THE STORY: A FROZEN NORTH, A HOLLOW KING". After 3 Arena runs, give a one-time title nudge.
- **Why:** the Arena is fast and sharp, and a good funnel into the campaign that is currently unused.
- **Files:** `src/arena/ArenaScenes.js`, `src/scenes/TitleScene.js`.

### NP27: Order the title menu for a first-time player (L / S), DESIGN
- **What happens:** with no save, NEW GAME, ARENA and DAILY CHALLENGE look equal (np01), and DAILY skips all teaching (NP17).
- **Proposal:** with no save, show "NEW GAME (START HERE)" and move ARENA and DAILY under a "MORE MODES" line. Or lock Daily until the tutorial is done, with a word on why.
- **Files:** `src/scenes/TitleScene.js:43`.

---

## Top 5

1. **NP1: tutorial hints lag a step behind and get dropped.** The controls card plus the hint queue mean every lesson arrives after the moment it was needed. Small fix (hint priority), big effect on the first five minutes.
2. **NP2: the quest tracker is drawn over the clock outdoors.** The main "what now" cue is unreadable wherever you most need it. A one-line layout fix.
3. **NP3 + NP20: give the first hour a goal on screen and a hook.** Today the journal is empty after the intro, nothing is tracked, and the story's hook is held back until a second talk with Sigrid. A starter quest that hands off to the Hollow King quest, plus a never-empty next-step line, fixes both.
4. **NP4: fast travel can't be found.** The toast names the block key, the campfire menu has no travel option, and the map hides it behind E then T then F. Add "Travel" to the fire menu and fix the prompt.
5. **NP21 + NP5: a Field Guide, and tips at the right moment.** Tips are one-shot and can fire after the moment they matter (the potion tip after death, the sneak tip after you've been spotted). Make them re-readable and fire them at the right moments.
