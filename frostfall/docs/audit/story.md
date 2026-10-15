# Frostfall audit: story, dialogue and writing (prefix ST)

Reviewer area: main-story structure, character voice, dialogue, choices, lore and bestiary, tips, item flavour, barks, continuity.
Read-only review of the `frostfall` branch. Every finding below was checked in the source unless it is marked *(guess)*.
Text renders upper-case in a 6 px font: dialogue wraps at 47 characters, 3 lines a page (`HudScene.say`), and ending cards wrap at 49 characters, 13 lines a page.
Case differences are therefore invisible in game. I left out casing-only issues.

Legend: impact **H/M/L**, effort **S** (hours) / **M** (a day) / **L** (days). **DESIGN** = changes plot, characters or endings, so Colin must approve it.

---

## A. Fixes and polish

### ST1. Two different "Hollow Kings" (Chapter 1's boss and the Old Kingdom's boss) — H / S / DESIGN
**Problem.** "Hollow King" names three different things:
- **Jarl Valdrek**, the Chapter 1 boss. Sigrid calls him this: *"the crypt of Jarl Valdrek, the Hollow King"* (`dialogue.js:95`). So do the quest title `king: 'The Hollow King'` (`quests.js:125`), Guard Haldor (*"the crypt of the Hollow King"*, `dialogue.js:351`), Asta (*"Mostly about the Hollow King"*, `dialogue.js:412`), the bestiary (`BEASTS.boss`: *"The Hollow King. Two phases..."*), and GUIDE section 6 (*"Chapter 1: The Hollow King"*).
- **THE HOLLOW KING**, the Old Kingdom boss and *"the last of the Hollow Kings"* (`story.js` taunts, `hamlets.js` quest `hollowking`).
- **The Hollow Kings**, the ancient rulers who bound the Winter.

A player who beat "the Hollow King" in hour 1 meets "the Hollow King" again 30 hours later, with no explanation.

**Fix.** Valdrek is a jarl, not a King. Rename his references:
- Quest title: **"The Jarl Beneath the Pines"**.
- Sigrid: *"Beneath the pines lies the crypt of Jarl Valdrek, who swore himself to the cold. Our grandmothers said he sleeps with the Frostheart in his hands."*
- Haldor: *"The stone gate in the north-east of the forest is Valdrek's crypt. Do not go in underequipped."*
- Asta: *"Elder Sigrid tells the best stories. Mostly about the old Kings. Mostly the scary parts."*
- `BEASTS.boss.desc`: *"The jarl who swore himself to the cold. Two phases; the second adds a frost nova and a charge."*
- Update GUIDE section 6.

**Files:** `src/data/dialogue.js`, `src/data/quests.js`, `src/data/lore.js`, `docs/GUIDE.md`.

### ST2. The chain and Heart lore contradicts itself — H / S / DESIGN
**Problem.** Different sources tell incompatible versions of the central myth:

| Source | Says |
|---|---|
| Sigrid (`dialogue.js:47`), quest `hearts` desc | bound **with five Hearts** |
| `lore.ruin2` | *"FIVE CHAINS. FIVE HEARTS. FIVE KEEPERS. ONE OF THE FIVE WAS NEVER A HEART. THE LAST ONE WAS A FIRE."* (so only four Hearts) |
| `lore.chains` | *"the fifth link was warm"* (only one chain was fire) |
| Ysolde (`emberhold.js:164`), CHAPTER3.md | **all** the chains were forged from the First Fire |
| `lore.foundry` | *"I made the **sixth** link"* |
| Old Goran (`emberhold.js:144`) | *"I was the Court's smith, **forty years ago**. I made links for the chains."* But the chains are a thousand years old (Sigrid, the Valdrek taunt, `lore.ruin0`). |
| Warden ending (`EndingScene.js:31`) | *"pressed the four Hearts back into the chains, and set your own into the fifth"* |

A player who reads the books will think one of these is a clue, and it is not.

**Fix.** Write one canon sentence and make every source agree with it. Suggested canon: *Five Hearts were the locks; the chain that ran between them was forged by the Anvil from the First Fire.* Rewrites:
- `ruin2`: *"FIVE HEARTS TO HOLD IT. ONE CHAIN TO HOLD THE HEARTS." / "THE CHAIN WAS WARM. WE WERE TOLD NOT TO WRITE THAT DOWN."*
- `chains`: *"Let it be written: the Winter was bound by five Hearts, and the chain that held them was warm."* (keep the second line as it is)
- `foundry`: *"I mended a link of the great chain. They told me it was for a gate..."*
- Goran: *"My master's master's master was the Court's smith when the Kings came. We still keep his tongs. Do you know what he made the chain from? Not iron."* and *"The Hollow Kings brought him a sack of something grey and warm..."*
- Ketil: *"Five Hearts the Kings did bind, one chain the Anvil wrought..."*

Keep a short `docs/LORE.md` canon page so future content stays consistent. (I did not create it; that is Colin's call.)

**Files:** `src/data/lore.js`, `src/data/emberhold.js`.

### ST3. Chapter 1 ends on "THE END", offers New Game+, and the card text is contradicted moments later — H / S / DESIGN (card text)
**Problem.**
- Turning in the Frostheart opens `EndingScene` with the footer *"THE END - E: KEEP EXPLORING"* (`EndingScene.js:72`). Only `thaw/warden/crown` count as a chapter card.
- The title screen then offers **NEW GAME+** (`TitleScene.js:41` tests `info.ending`, which is the Chapter 1 flag), and the save slot shows "✓ ENDING". GUIDE says NG+ comes "after the credits".
- The KEEP card says *"Hollowfrost shuttered its doors... the snow did not stop for a hundred years"*, but you walk straight back in and everyone chats.
- The SELL card says *"You were far away by then"*, but you are standing in Mirra's shop.

**Fix.**
- Footer: `CHAPTER ONE ENDS   -   E: CONTINUE`.
- NG+ and the slot tick should check `flags.ending3`.
- KEEP: *"...The draugr bowed their heads as you passed.\n\nHollowfrost did not shut its doors, but it shut its eyes. Behind you the snow began to fall again, and the old women said it would not stop while the Frostheart was in your keeping."*
- SELL: *"...Then the crystal in her cellar began to hum, and the frost crept up the stairs.\n\nNobody in Hollowfrost said a word to you about it. They did not need to."*

**Files:** `src/scenes/EndingScene.js`, `src/scenes/TitleScene.js`, `src/systems/save.js`.

### ST4. The epilogue repeats on every ending card, and one of its lines can never be seen — H / S
**Problem.** `EndingScene.create` appends `epilogueLines()` to all seven kinds. The same paragraphs ("A frost hound sleeps at the foot of your bed...", "Bards across the Reach sing of you...") can appear on the Chapter 1, Chapter 2 and final cards.
- At Chapter 1, lines such as *"This is not the first winter you have broken"* or region lines make no sense.
- The `kingRemembered` line (*"The Scribe of the Old Kingdom finished the last name..."*) can never show. The Old Kingdom unlocks inside `finalChoice()`, after which no ending card ever plays again, and NG+ wipes the flags.

**Fix.** Show the epilogue only on `c3_*` cards. Let the player re-read it later, either from a "Chronicle" book in Hollowfrost's great hall or after the Scribe turn-in (see ST20).

**Files:** `src/scenes/EndingScene.js`, `src/data/story.js`.

### ST5. Emberhold mixes up the Frostheart choice with the Winter choice — H / S
**Problem.** `emberhold.js:26` defines `ending()` as `S.flags.ending`, with the comment *"once the Winter is decided"*. That flag is actually the **Chapter 1 Frostheart** choice (give / keep / sell). As a result:
- **Corvin**, keyed on `give`: *"They say the Winter broke. It did not break. It was \*let go\*."* This plays even if you crowned the Winter. The asterisks also render literally.
- **Ketil**, keyed on `keep`: *"a Winter King now walks the Reach, with a crown of frost"*. That describes the Chapter 2 *crown* ending, not keeping the Frostheart.
- **Goran**, keyed on `sell`: *"You sold the Winter, I hear. Gold for a god."* You sold the Frostheart to a potion-seller.
- **Ysolde**'s `give/sell/undecided` branches (`emberhold.js:163`) are dead text. Emberhold is only reachable after `finale` is set.

**Fix.** Key Corvin and Ketil on `S.flags.finale`. Rewrites:
- Corvin (thaw): *"They say the Winter broke. It did not break. It was let go. Remember the difference."*
- Ketil (crown): *"And a crown of rime now walks the Reach, and the frost bows its head; I will not sing that song. Not today."*
- Ketil (thaw): *"And the Winter walked north on its own two feet, and the Reach learned the word for summer!"*
- Goran (Frostheart sold): *"You sold the Frostheart to a potion-seller, I hear. Gold for a god's heart. That is an old way of ending, and it never ends."*
- Remove Ysolde's unreachable branches, or keep them as defensive fallbacks.

**Files:** `src/data/emberhold.js`.

### ST6. Ragna, Hrolf and the Ironwatch Company: three timelines and a broken offer — H / S / DESIGN (backstory)
**Problem.**
- **Sigrid** (`dialogue.js:65`) calls Ironwatch *"a fortress the Hollow Kings left to a warden who never stopped marching"*, and the bestiary calls Hrolf *"The first Warden of Ironwatch"*. Both make him ancient.
- **Ragna** rode with him: *"I rode with the Company. Forty of us. Hrolf Ironmarch held the gate when the cold came"*. That was within the last three years.
- Ragna says *"Forty of us"* and later carves *"Forty names"*, but she survived.
- **Corvin** in Emberhold: *"We were forty. I walked home with six."* It reads like a copy-paste of Ragna's number.
- Ragna's offer fires at `heartsHeld() >= 1` and never checks `warlordDead`. If your first Heart was the Iron Heart, she says *"He is still up there, wearing the dead like armour"* about a man you already killed. The quest then auto-completes on the next tick.

**Fix.** Follow Ragna's version, which is the emotional one.
- Sigrid: *"The cold bends around you now. My maps show Ironwatch Keep next. A company held its gate when the cold came, and the gate is holding them still. Look for black stone and old banners."*
- Bestiary: *"The last captain of the Ironwatch Company, still holding the gate..."*
- Ragna: *"Forty of us rode in. I rode out."* and *"Thirty-nine names."*
- Corvin: *"We were sixty on the Ashen wall. I walked home with nine."*
- Ragna when Hrolf is already dead: *"You carry the Iron Heart. Then you have been to the Keep, and Hrolf is down. ...Take me there anyway. Someone has to say the names."*

**Files:** `src/data/dialogue.js`, `src/data/lore.js`, `src/data/emberhold.js`.

### ST7. The Ironwatch banner contradicts itself twice — M / S
**Problem.**
- In `companionScene`, Ragna gives you the banner: *"Take the banner. I do not want to see it again."* The epilogue then says *"Ragna hung the Ironwatch banner over the lodge door"*.
- Captain Vael of the Emberhold Wardens also rewards an `ironwatch_banner` for *The Ashen Road* (`emberhold.js:72`). The item's description is *"Ragna's company banner, cut to a sash."* A player can own two.

**Fix.**
- Epilogue: *"Ragna burned a rafter in the lodge and said forty names over it. The lodge is quieter now, and so is she."* (If `ragnaBond`: *"...and an iron cairn on the Ironwatch road carries every one of them."*)
- Give Vael a new `warden_pennant` (same stats): *"A Warden's pennant from the Ashen wall, cut to a sash."*

**Files:** `src/data/story.js`, `src/data/emberhold.js`, `src/data/items.js`.

### ST8. Sigrid's Heart guidance assumes a fixed order, and gets the sold Frostheart wrong — M / S
**Problem.**
- The Heart dungeons are not gated (only the Throne needs `hearts4`), but Sigrid picks her line by count (`lines[n]`, `dialogue.js:64-68`). A player holding only the Tide Heart hears *"My maps show Ironwatch Keep next"*. With 2 she says *"The third lies under the lakes"*, even if the Chapel is done.
- Her Chapter 2 opener says *"You carry the first, and the cold follows you for it"* to a player who **sold** it to Mirra (the test is only `=== 'give'`).

**Fix.**
- Pick the first un-held Heart in `HEART_ORDER` and give one line per site, with a count lead-in: *"Two Hearts. The Drowned Chapel still waits under the lakes..."*.
- For `sell`: *"The first is in Mirra's cellar now, humming. The other four still hold the Winter in place, and it is waking."*

**Files:** `src/data/dialogue.js`.

### ST9. Name collisions across the cast — M / S / DESIGN (renames)
**Problem.** With 115 named NPCs, near-twins blur in a 6 px upper-case font:

| Clash | Where |
|---|---|
| **Ysolde / Isolt / Ysolt / Isolde** | Matriarch (Emberhold), Brannoch's apprentice, Glasswood warden, Saltmarket cartographer |
| **Vael / Veyl** | Captain Hesper Vael (Wardens), Admiral Veyl (Coast boss) |
| **Haldor / Halldor** | Hollowfrost guard, Skarn herder |
| **Tamsin / Tamsin** | Emberhold gem-setter, Glasswood glassblower |
| **Orrin / Orrel**, **Brann / Brannoch** | Delver leader / Glasswood herbalist; Reedwick hunter / Anvil master |
| **Hilda / Hild Soot / Grimhild** | three smith-adjacent women |
| **Cap / Cap'n Bryn** | Lanternfall fungalist, Saltmarket sailor |
| **The Last Lantern** | Emberhold tavern, and the Lanternfall sign *"THE LAST LANTERN OF THE DELVERS"* |
| **"The Sovereign"** | Ashen Sovereign (finale speaker label) and Vault Sovereign (Rashid: *"The Sovereign is down"*) |
| **Glacial Wyrm / Rime Wyrm** | bestiary name vs boss title, achievement and Sigrid's "serpent of rime" |
| **Tidebreak Cavern / Tidebreak Hall** | game vs GUIDE sections 5 and 7 |

**Fix (suggested renames).**
- Warden Ysolt -> **Warden Bryony**
- Isolde Sea-Charts -> **Wenna Sea-Charts**
- Glasswood Tamsin -> **Vesna Glassblower**
- Halldor -> **Hakon**
- Orrel -> **Wynn Dewkeeper**
- Brann -> **Torvi**
- Hild Soot -> **Agna Soot**
- Hesper Vael -> **Hesper Thorne**
- Vault Sovereign -> **the Gilded Regent**
- Bestiary wyrm -> **Rime Wyrm**
- GUIDE -> **Tidebreak Cavern**
- Lanternfall sign -> *"THE FIRST LANTERN OF THE DELVERS"*

Save keys (`S.flags.*N`) use ids, not names, so renames are display-only.

**Files:** `regions2_story.js`, `regions3_story.js`, `regions4_story.js`, `emberhold.js`, `enemies4.js`, `lore.js`, `hubs3.js`, `docs/GUIDE.md`.

### ST10. Chapter 3's seals are never handed over, and the Anvil's revelation is given away early — M / M / DESIGN
**Problem.**
- None of the three turn-ins (Orrin `emberhold.js:206`, Brannoch `:319`, Vael `:69`) mentions a seal. There is no seal item; CHAPTER3.md's "Seal of Cinders" was never added. The player only learns a seal was earned from the journal.
- CHAPTER3.md says the Anvil seal is where you *"learn the true nature of the chains from Brannoch and Goran"*. Instead, Ysolde explains everything at the first meeting (`emberhold.js:164`). Goran's reveal is only the third line of a cycling chat.
- Thessaly always says *"The missing page says..."*, because `chapter3` is always set in Emberhold. Her *"There is a page missing"* line is unreachable, so she quotes a missing page without ever having found it.

**Fix.**
- Add a seal line at each turn-in. Orrin: *"And this. The Delvers' seal, cut from the first lantern's iron. Ysolde will know it."* Vael: *"Take the Wardens' seal. We have not given it to an outsider in my lifetime."* Brannoch: *"The Court's seal. It is warm. Do not ask me why it is warm; ask Goran."*
- Move Ysolde's chain reveal to the Anvil turn-in. At the first meeting she says only: *"Ask the Court what the chains were made of. Watch their faces when you do."*
- Swap Thessaly's lines: before the Anvil seal, *"There is a page missing from the Book of Chains..."*; after it, *"Goran told me where the page went..."*.

**Files:** `src/data/emberhold.js`, optionally `src/data/items.js`.

### ST11. Choices the GUIDE says matter but don't — M / S / DESIGN (epilogue lines)
**Problem.**
- GUIDE section 8 says the endings depend on *"What you did with the Frostheart and Grimfang"*. `chapter3Ending()` reads only `finale`, the final choice and the best house. `epilogueLines()` has no line for Grimfang, the locket or the Frostheart.
- **Bjorn's Den-Mother offer** fires on `grimfangDone`, which sparing also sets. He says *"Grimfang is down, and the dens are leaderless"* to a player who let him go. The title "The Den-Mother's Debt" also names a character who never appears.

**Fix.**
- Add epilogue lines:
  - `alphaSpared`: *"A grey wolf watches Hollowfrost from the ridge every winter. It has never once come closer."*
  - `alphaSlain`: *"Grimfang's pelt hangs in Bjorn's lodge. The young hunters touch it for luck before they leave."*
  - `locketKind`: *"Asta's mother still wears the silver locket. Asta has started telling people the wolf on it is Grimfang."*
  - Frostheart `give/keep/sell`: one line each.
- Spared Den-Mother text: *"Grimfang went up into the high pass and left the dens to themselves. Masterless wolves are worse than led ones..."*
- Rename the quest *"The Masterless Dens"*.
- Make GUIDE section 8 match whatever ships.

**Files:** `src/data/story.js`, `src/data/sidequests.js`, `docs/GUIDE.md`.

### ST12. Ending-card text that contradicts the game or the map — M / S / DESIGN
- `WINTER_ECHO.crown.thaw`: *"the Fire you crowned stayed **south**"*. The Peaks are north-east (CH2_TAIL, Sigrid). Change to *"stayed on the mountain"*.
- C3 `crown` text: *"Somewhere in the world there was still a crown of frost"*. This is wrong when the Winter was set free (`thaw`). Make that sentence conditional, or end it at *"...every hearth that had ever gone out."*
- Chapter 2 THAW card: *"The Hearts crumbled to dust in your hands, and you let them."* But all four Heart powers and shouts persist (`S.hearts` is never cleared), and Sister Aurel later says *"You carry four Hearts"*. Rewrite: *"The Hearts went quiet in your hands, cold no longer, only strong."*
- Chapter 2 WARDEN card implies you stay at the Throne for ever (*"whoever keeps it never grows old, or warm"*), then the game sends you to Emberhold. Rewrite: *"...Travellers say a lantern burns at the Winter Throne whenever its warden is away, and that the warden never quite grows warm."*

**Files:** `src/data/story.js`, `src/scenes/EndingScene.js`, `src/data/emberhold.js` (Aurel).

### ST13. The final-choice scene: Ysolde speaks from a city away, and the Sovereign ignores your Winter choice — M / S
**Problem.**
- In `finalChoice()`, picking Bind without standing triggers `say('Ysolde', ...)`. Ysolde is in Emberhold, not the Forge.
- The bind requirement is first explained at that moment, so the player meets a refused option at the climax.
- The Sovereign's engage line is the same for every Winter ending: *"You broke my brother and bound my chains"*. "Broke" is wrong for thaw, and "bound" is wrong for crown.

**Fix.**
- Make the Sovereign say the refusal: *"A binding needs hands at the other end of the chain. No house of the mountain would hold it for you. Choose again."*
- Have Ysolde warn earlier, in her Forge-open line: *"If you mean to bind it, you will need a house that trusts you to the end of the chain."*
- Engage per finale:
  - thaw: *"Little Dreamer. You let my brother walk free. Be as generous twice."*
  - warden: *"Little Dreamer. You keep my brother on a leash. Will you hold the other one too?"*
  - crown: *"Little Dreamer. You wear my brother. I can see him behind your eyes."*
  - Keep the rest of the line.

**Files:** `src/data/chapter3.js`, `src/data/story.js`, `src/scenes/HudScene.js` (taunt lookup), `src/data/emberhold.js`.

### ST14. NPC speech hard-codes keys and uses three verbs for one action — M / S
**Problem.** Tips use `{KeyC}` tokens and follow rebinding and the gamepad (R72 / C3 in RUN_AND_UI). NPC speech does not:
- Sigrid intro: *"Hold C or Shift to creep. Press I for your pack, O for your journal."*
- Bjorn: *"Roll through it with Space"*, *"Crouch with C"*.
- Mirra: *"Pick them with E"*.
- Haldor: *"Hold Shift or C to creep"*, *"Press E beside the flames"*.

The same action is called sneak (tips, GUIDE), creep (Sigrid, Haldor) and crouch (Bjorn).

**Fix.**
- Run `say()` text through the same `{Key}` -> `prompt()` replacement that `tip()` uses, in `HudScene.say`.
- Rewrite the lines with tokens, using **sneak** everywhere. For example, Bjorn: *"Sneak with {KeyC} and move slow. Wolves notice you late, and a blade in an unaware back does triple damage."*

**Files:** `src/scenes/HudScene.js`, `src/data/dialogue.js`.

### ST15. Enemy barks don't fit most creatures, and assume a male player — M / S
**Problem.** There are only three bark sets (`enemies.js:475`). The assignment is often absurd:
- **"undead"** (*COLD... / JOIN US / WARM BLOOD*): Glimmerkin, Dew Sprite, Crystal Golem, Gloomcap, Spore Mother, Bridge Troll, Cinder Imp, Stone Giant, Mosshulk, Glacial Wyrm.
- **"human"** (*HEY! / YOUR COIN!*): Mud Lurker.
- **"wolf"** (*GRRR*, flee *\*WHINE\**): Hornet, Leech, Barnacle, Mimic, Lodeling, Scorpion, Thunderbird, Thornling and the dragon Skaldrath.
- *"GET HIM!"* assumes a male player (see ST16).

**Fix.** Add sets and reassign:
- **beast**: GRRR / SNARL; flee "..."
- **critter** (insects, leeches, crabs, scorpions): *bzzz* / *click-click*; no flee bark
- **construct** (golems, colossus, sentinels): *...GRIND...*
- **fey** (glimmerkin, dew sprite): *SHINY! / HEE HEE / GO AWAY*
- **plant/fungus**: *rustle* / no bark

Change the human line to *"GET THEM!"* or *"THERE!"*, and use parentheses instead of asterisks.

**Files:** `src/data/enemies.js`, `src/data/enemies4.js`.

### ST16. The player's gender changes between NPCs — L / S
**Problem.** Ulfar: *"A stranger, walking in from the pass without lightning in **her** hair"*. Pell: *"You are a **gentleman**."* Bandits: *"GET **HIM**!"* There is no gender choice, so keep it neutral. *(I did not check the player sprite.)*

**Fix.**
- Ulfar: *"A stranger who walked up the pass and kept the lightning out of their hair. Sit. Eat. Then listen."*
- Pell: *"You are a saint."*

**Files:** `regions2_story.js`, `emberhold.js`, `enemies.js`.

### ST17. Repetitive beats and phrasing — L / M
**Same quest three times.** Five herbs make a draught that keeps the cold out:
- Maud: *"keeps the bog-chill out of your bones"*
- Orrel: *"keeps the shards out of your lungs"*
- Dahlia: *"keeps the Winter out of the lungs"*

Maud's and Orrel's thank-yous are the same sentence: *"Five! Look at the veins: ... Here, take the draught I promised, and my thanks."* Rewrite Orrel: *"Five, and not one cracked. You carry glass better than most people carry eggs."* Give Dahlia's step a different payoff, such as a recipe she teaches.

**Every boss payoff is "it is quiet now":**
- Ilse: *"the fens are quiet"*
- Ysolt: *"The trees are quiet"*
- Dagna: *"That is silence"*
- Maren: *"Nothing. Oh, nothing at all"*
- Vess: *"The Cove is quiet"*
- Nadir: *"Silence. At last."*
- Tariq: *"The sand is quieter"*

Give each one a *new* sound or sight instead. Ilse: *"Listen: frogs. There have not been frogs in Reedwick since my mother was a girl."*

**Verbal tics.**
- *"Sit. Eat."* (Ulfar, Dagna, Gudrun)
- *"You did it. You actually did it."* (Bjorn, Halldor)
- *"end it, one way or another"* (Ilse and Ysolt quest descriptions)
- *"I will make it worth (your while / the dark / the oil)"* x3

**One shared turn-in for five quests.** All five Hollowfrost side quests use the same line: *"You did it. All of it. Here, this is yours, and my thanks."* (`sidequests.js:65`). Write one line per giver. Bjorn (hamlets): *"Trapper, fisher, prospector, and you came back with all your fingers. The rounds are walked."*

**Files:** `regions2_story.js`, `regions3_story.js`, `regions4_story.js`, `sidequests.js`, `dialogue.js`.

### ST18. Typos, wording and small continuity fixes — L / S
- Lisbet (`regions2_story.js:110`): *"There are always one more than yesterday."* -> **"There is always one more than yesterday."**
- Gardener Ash: *"The briars do not draw a difference between walkers and prey."* -> **"The briars do not know the difference between walkers and prey."**
- Orla's hornet quest says *"the **wasps** scatter"* and *"The **wasps** do not care about shields"*. Change to **hornets**.
- Varro: *"The Hollow Arena in the village is mine too. Distant cousin."* -> **"The Hollow Arena in the village belongs to my cousin. Distant cousin. Loud family."**
- Ragna offer, player option: *"I will take you to him. Free of charge."* The player is not the one charging. -> **"Come with me. We will find him together."**
- Ragna: *"I can smell the winter on it, and under that, Ironwatch."* -> **"You carry a Heart. I know that cold. I last felt it at the Ironwatch gate."**
- Ulfar: *"I have not seen a cloud move since I was a boy"*. The storm is a hundred years old. -> **"No one in the Hold has ever seen a cloud move. Look!"**
- Bestiary, glimmerkin: *"Weak: Lightning, fire. Immune to lightning damage themselves."* This is self-contradictory; it is immune to the *shock status* and takes x1.2 shock damage. -> **"Lightning and fire. Cannot be shocked."**
- Bestiary *"Immune-ish to frost / fire"* (wight, imp) breaks tone -> **"Frost barely hurts it."** / **"Fire barely hurts it."**
- Theft lines (`Npc.js:43,62`) name the speaker by the *last word* of the display name. Thefts are therefore voiced by "INN" (Marit), "LONGHOUSE" (Gudrun), "BENCH" (Oddrun), "LAMP-SELLER", "FERRYMAN", "TAILOR", "WAYFINDER". Use the first word, or add a `speaker` field to `NPC_DEFS`.
- Stage directions: Grimfang's yield uses `*The great wolf lowers its head...*` with speaker "Grimfang". Asta uses `(She wipes her nose...)`. Standardise on parentheses with an empty speaker.
- Vess promises *"Bring me his ledger"* (quest description too), but no ledger exists and the turn-in only checks the kill. Drop the ledger, or drop a `brinegut_ledger` from the boss.
- Tutorial "ready" hint says *"TALK TO BJORN AT THE LODGE"*, while the toast at the same moment says *"SEE SIGRID AND BJORN"*. Pick one.
- *(guess)* The Lanternfall sign says the lantern *"burned since before they built the first tunnel"*, but `lore.lanternfall` says the first Delvers hung it. It may be a deliberate mystery; if not, change the sign to "since the first Delvers came down".

---

## B. Upgrades and new writing

### ST19. Pay off "the Dreamer" and the amnesia hook — H / M / DESIGN
**Problem.** The intro sets up a mystery: *"Do you remember your name?"* with the options *"Not a thing." / "Only fragments."* Then:
- From then on everyone calls you **Dreamer**: Sigrid, the Long Winter (*"Little Dreamer"*), the Sovereign, Ragna.
- Ysolde hints at an origin: *"So. The Reach sends a dreamer. I have waited a long while to see what the Hollow Kings left behind."*
- The Hollow King thanks the *"small light"*.

Nothing ever explains the name or returns to the lost memory. It is the biggest dangling thread in the game.

**Suggested shape** (two beats, small cost):
1. **Name it.** One Sigrid line early in Chapter 2: *"The hunters call you the Dreamer. For three nights after we found you, you talked in your sleep, about thrones, in a tongue none of us knew."*
2. **Answer it** at the Hollow King (see ST20). The Kings could not bring themselves to choose the Winter's fate, so they dreamed someone who could. That is why the Winter says *"You carry my chains and think them yours."*

**Files:** `dialogue.js`, `hamlets.js`, `story.js`.

### ST20. Make the Hollow King the real last chapter — H / M / DESIGN
**Problem.**
- The Old Kingdom unlocks only after the final choice. The player has already seen *"THE END - E: KEEP EXPLORING"*.
- Its boss is the hardest in the game (GUIDE: *"Level up and bring your best gear first"*), and its payoff is one line from the Scribe.
- The Scribe sets up *"three crowns in the stories: Frost, Ember and Memory"*. The player wears or refuses the first two in ending cards, but the third gets nothing.
- The `kingRemembered` epilogue line is unreachable (ST4).

**Suggested change.** After the Scribe turn-in, play a short **"THE CROWN OF MEMORY"** card. It should:
- close the Dreamer thread (ST19);
- echo the Winter and Fire choices in one paragraph each;
- carry the full epilogue (moved from the Chapter 3 card, or shown on both).

Footer: *"THE END"*. Change the Chapter 3 footer to *"THE FIRE IS ANSWERED - E: ONE ROAD REMAINS"*. Only then offer NG+.

**Files:** `hamlets.js`, `story.js`, `EndingScene.js`, `TitleScene.js`.

### ST21. Let earlier choices colour the Winter and the Sovereign — M / M / DESIGN
**Problem.**
- The Long Winter always says *"Four Hearts beat in your hands"*, even when you kept the Frostheart (that makes five).
- Mirra never mentions the Frostheart humming in her cellar after you sell it, even though the SELL card is built around it.
- Grimfang, the hound and companions never appear at the climaxes.

**Additions** (about 10 lines):
- The Winter with `ending==='keep'`: *"Five Hearts. You kept the first for yourself. I know the feel of you already."*
- The Winter with `sell`: *"Four Hearts here, and the fifth hums in a potion-seller's cellar. How very like the Kings."*
- Mirra after `sell`: *"The cellar is cold again this morning. I have started sleeping upstairs. Do not look at me like that."*
- With a companion following at the Sovereign, one interjection each:
  - Ragna: *"Two arrows, one breath, Dreamer. Then the choice is yours."*
  - Pell: *"I am behind a pillar. A very brave pillar."*
- The Sovereign engage per finale (ST13).

**Files:** `events.js` (`startFinale`), `dialogue.js` (Mirra), `story.js`, `chapter3.js`.

### ST22. Chapter 3 pacing: two seals from one boss — M / L / DESIGN
**Problem.**
- *The Silent Mines* (Delvers) and *A Core for the Anvil* (Court) both resolve on the **same Kragnar kill**. The Anvil seal is a fetch of his drop.
- *The Ashen Road* is "clear any three camps".
- So the chapter that carries "the full ending" has one new boss before the finale. The Anvil Court, the house with the chain secret, has no story quest of its own.

**Suggestion.** Turn the Anvil seal into **"The Missing Page"**: Goran confesses, you take him to the Foundry ruin (where `lore.foundry`'s smith lived), and you recover the page from the Book of Chains. The page carries the reveal (ST10).
- Keep Kragnar's core as Brannoch's Emberforge unlock, outside the seal path.
- Optionally tie *The Ashen Road* to Corvin: the third stronghold is where his company fell.

**Files:** `emberhold.js`, `chapter3.js`, map data for the Foundry.

### ST23. Give the companions a voice across the story — M / M
**Problem.**
- Ragna has 3 chat lines, 2 barks and 1 personal quest.
- Pell has 4 chat lines and 1 quest.
- Neither reacts to the Hearts, the Throne, Emberhold, the Sovereign or the endings. Pell gets one clause in a house line, and only for the Delvers.

Companions are where voice is cheapest to add.

**Suggestion.** Add 2-3 state-keyed chat lines per chapter each, through `companionStory`/`cycleLine`, plus one epilogue line each when `ragnaBond`/`pellBond`. Samples:
- Ragna after the Throne (crown): *"You feel colder. Not to the touch. When you talk."*
- Ragna in Emberhold: *"Smiths. All of them. I have never felt so badly dressed."*
- Pell at the Forge: *"I counted the steps to the Forge door. I would rather not say the number. It is not a lucky number."*
- Pell epilogue: *"Pell Quickpick now tells the story of the Forge with himself in front. Nobody corrects him. It seems unkind."*

**Files:** `companionquests.js`, `dialogue.js`, `emberhold.js`, `story.js`.

### ST24. Bestiary entries missing for seven story bosses — M / S
**Problem.** `BEASTS` (`lore.js` + `enemies4.js`) has no entry for **Admiral Veyl, the Hollow King, the Ashen Sovereign, Kragnar, the Blight Mother, the Vault Sovereign** or the **Glass Prism**. These are the fights players most want to read about afterwards. Checked by importing both tables.

**Suggested entries** (keep the house style: one line of character, one of tactics):
- Kragnar: *"The Delvers' king under the lode, who dug until the mountain dug back. Leaps and calls rockfall; frost cracks him, fire feeds him."*
- Admiral Veyl: *"He never gave the order to abandon ship, so nobody left. Shock and fire; frost barely touches him. He tires after half."*
- Ashen Sovereign: *"The First Fire's will, wearing a crown of cinders. Three faces: the Crowned, the Cinder Storm, the Pyre. Frost; fire does almost nothing."*
- Hollow King: *"The last of the Kings who bound the Winter, waiting for someone to say his name. Three faces: the Throne, the Court, the Memory."*
- Blight Mother: *"The grove's old guardian, closed around its heart. Roots in behind poison pods: break the pods to tear her loose. Fire."*
- Vault Sovereign: *"The sun kings' last guard. Sunbeams fall in a line toward you; step sideways. Lightning works."*

Also align the Long Winter's three faces (*"the Crowned, the Storm, the Hunger"*) so they don't echo the Sovereign's "the Crowned".

**Files:** `src/data/lore.js`, `src/data/enemies4.js`.

### ST25. One-page lore canon and name register — M / S / DESIGN
ST1, ST2, ST6 and ST9 share a root cause: content written across 30+ rounds with no single reference.

**Suggestion.** Add `docs/LORE.md` with:
- the Kings / Hearts / chain / First Fire canon (ST2);
- a timeline (a thousand years ago, the binding; three years ago, the cold came and Ironwatch fell; and so on);
- a register of every named NPC with region and role, to check new names against.

Optionally add a unit test that fails on duplicate or near-duplicate NPC display names (edit distance 1 or less on the first word). That would have caught Haldor/Halldor, Ysolde/Ysolt and Tamsin/Tamsin.

**Files:** `docs/`, optionally `test/unit/`.

---

## Top 5
1. **ST1 + ST2: the core myth contradicts itself.** "The Hollow King" names both the hour-1 jarl and the endgame King. The chain and Heart books disagree on how many Hearts there were, which chain was fire, whether a sixth link existed, and whether Goran forged the chains forty years ago or a thousand. One canon pass fixes both (S).
2. **ST3 + ST4: the ending flow undercuts itself.** Chapter 1 shows "THE END" and unlocks NG+. Its KEEP and SELL text is contradicted seconds later. The same epilogue repeats on up to three cards, and one epilogue line can never be seen (S).
3. **ST5 + ST6 + ST7: continuity errors players will notice.** Emberhold reacts to the Frostheart as if it were the Winter choice. Hrolf is both ancient and Ragna's recent captain. Ragna gives away the banner she later hangs over her door, and a second copy comes from Emberhold (S).
4. **ST19 + ST20: the biggest missed payoff.** The amnesiac "Dreamer" is never explained, and the hardest boss sits after the credits with no ending. A short "Crown of Memory" card after the Hollow King would close both threads (M, DESIGN).
5. **ST10 + ST22: Chapter 3, the chapter needed for "the full ending", is thin.** Seals are never handed over, the Anvil's secret is told in the first conversation, and two of three seals come from one boss kill (M-L, DESIGN).
