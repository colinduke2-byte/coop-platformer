# Story changes (branch w-story)

Every story line that was changed or added, for Colin to review in the build. Before → after for changes; new lines in full.
Text renders upper-case in the game. `{KeyC}`-style tokens show the player's own key (or pad button).

## New names and the shout word

- **Jarl Valdrek is now "the Frostsworn".** Quest *The Frostsworn Jarl*, map *Crypt of the Frostsworn*, boss title
  "JARL VALDREK THE FROSTSWORN", toasts "QUEST UPDATED: THE FROSTSWORN JARL" and "THE FROSTSWORN JARL FALLS".
  The quest id `king` is unchanged. Only the Old Kingdom's king is "the Hollow King".
- **Renames to stop near-identical names (display text only; ids, flags and cycle keys unchanged):**
  - Warden Ysolt → **Solveig**
  - Isolde Sea-Charts → **Wenna**
  - Tamsin Glassblower → **Vesna**
  - Halldor → **Hakon**
  - Orrel → **Wynn**
  - Brann → **Torvi**
  - Hild Soot → **Brenna Soot**
  - Isolt → **Kerra**
  - Capt. Hesper Vael → **Thorne**
  - Cap the Fungalist → **Morel**
  - Vault Sovereign → **the Gilded Regent**
  - Glacial Wyrm → **the Rime Wyrm**
  - Found by the name test (one letter apart): Pim → **Tobin**, Fenn → **Aldo**, Marrow → **Linnet**,
    Foreman Dagna → **Thora**, Nim → **Quist**, Nell → **Maddy**
  - Tidebreak Hall → Tidebreak Cavern (GUIDE, README)
- **Shout word: "HROM!"**, an old-tongue word for a horn blast (replaces "FUS!"). Recorded in `docs/LORE_CANON.md`.

## Sigrid
- Intro: "Hold C or Shift to creep. Press I for your pack, O for your journal. And mind the cold." → "Hold {KeyC} to sneak. Press {KeyI} for your pack, {KeyO} for your journal. And mind the cold."
- Frostheart quest: "…crypt of Jarl Valdrek, the Hollow King. Our grandmothers…" → "…crypt of Jarl Valdrek the Frostsworn, who swore himself to the cold. Our grandmothers…"
- NEW, start of Chapter 2: "You know why the hunters call you that? For three nights after we found you, you talked in your sleep. About thrones, in a tongue none of us knew."
- NEW, if you sold the Frostheart: "The first is in Mirra's cellar now, humming. The other four still hold the Winter in place, and it is waking."
- Heart guidance now names the first Heart you don't hold. Lead-in by count: "The cold bends around you now." / "Two Hearts. The ground trembles less, I think." / "Three. I can hear them when the fire is low." Then the site:
  - "The Glacial Maw still waits far to the east, where the ice meets the mountains. A serpent of rime sleeps there."
  - "My maps show Ironwatch Keep. A company held its gate when the cold came, and the gate is holding them still. Look for black stone and old banners."
  - "The Drowned Chapel still waits under the lakes, where a congregation prayed until the water took them."
  - "The Rootvault still waits in the blight, where the trees have died and keep growing anyway. It is the largest of the guardians."
- "…ask them what the chains were made of." → "…what the chain was made of."
- Thank-you for *Stones That Hum*: "Three stones, and they still bless. Then the Kings are not wholly gone. I do not know yet whether that comforts me. Take this."

## Bjorn
- "Roll through it with Space." → "…with {Space}."
- "Crouch with C and move slow…" → "Sneak with {KeyC} and move slow…"
- "You did it. You actually did it. Frostbrow himself." → "Frostbrow himself. My grandfather would have walked to the Peaks to see this."
- Hamlet Rounds thank-you: "Trapper, fisher, prospector, and you came back with all your fingers. The rounds are walked. This is yours."
- Dens thank-you: "Three dens empty. The flocks can graze the high meadow again. Take this, and the shepherds' thanks with it."
- *The Den-Mother's Debt* → **The Masterless Dens**.
  - Grimfang spared: "Grimfang went up into the high pass and left the dens to themselves. Masterless wolves are worse than led ones. Clear three dens across the Reach, and I will pay in silver."
  - Grimfang slain: "Grimfang is down, and the dens are leaderless. Masterless wolves are worse than led ones. Clear three dens across the Reach, and I will pay in silver."

## Mirra
- "Pick them with E." → "Pick them with {KeyE}."
- NEW after you sold her the Frostheart: "The cellar is cold again this morning. I have started sleeping upstairs. Do not look at me like that. What do you need?"
- Barrows thank-you: "Grave-moss, and plenty. The unquiet dead make the best medicine; do not tell them. Here, as promised: it bites."

## Haldor
- "Hold Shift or C to creep…" → "Hold {KeyC} to sneak…"
- "Press E beside the flames…" → "Press {KeyE} beside the flames…"
- "…is the crypt of the Hollow King." → "…is the Frostsworn's crypt."
- Watchtowers thank-you: "Fires on three towers. I can see the whole Reach from the palisade tonight. Take this, watchman."

## Asta
- "…Mostly about the Hollow King…" → "…Mostly about the old Kings…"
- Her stage directions now have no speaker.

## Ragna
- "You carry a Heart. I can smell the winter on it, and under that, Ironwatch." → "You carry a Heart. I know that cold. I last felt it at the Ironwatch gate."
- "I rode with the Company. Forty of us. Hrolf…" → "I rode with the Company, three winters ago. Forty of us rode in. I rode out. Hrolf…"
- Player option "I will take you to him. Free of charge." → "Come with me. We will find him together."
- NEW, if Hrolf is already dead:
  - "You carry the Iron Heart. Then you have been to the Keep, and Hrolf is down."
  - "I rode with the Company, three winters ago. Forty of us rode in. I rode out. ...Walk with me a while, Dreamer. Someone has to say the names."
  - Options: [Walk with me. / Not now.]
  - "Then my bow is yours, for nothing. Give me a quiet road and a little time." / "The names will keep. They have kept this long."
- Laying the Company to rest: "Forty names. I carved them…" → "Thirty-nine names. I carved them…"
- Cairn: "There. Forty names, in iron." → "There. Thirty-nine names, in iron, and a space at the bottom. Not yet."
- NEW one-time chat lines:
  - "Valdrek swore himself to the cold. Hrolf swore himself to a gate. I swore myself to nothing. I sleep better than both."
  - "Every Heart you take, the snow gets softer under my boots. I noticed. I am not saying anything. I noticed."
  - "The Throne. If it talks to you, do not answer the first thing it says. Make it ask twice."
  - Winter freed: "Summer. I had forgotten I own a summer shirt. I do not, it turns out."
  - Winter bound: "You hold the Winter on a leash now. Hold it like a bowstring: firm, not tight."
  - Winter crowned: "You feel colder. Not to the touch. When you talk."
  - "Smiths. All of them. I have never felt so badly dressed."
  - "Thirty-nine names, and now a mountain. If I fall in there, say mine last. It is the shortest."
  - "It is quiet. I keep reaching for an arrow. Give me a few weeks."
  - "So the Kings dreamed you. Then they dreamed well. Do not let it go to your head."
- NEW boss asides:
  - Hrolf: "Hrolf! It is Ragna! ...He does not know me. Then we do this the hard way."
  - The Winter: "Breathe out before you loose. It hates warm breath."
  - Kragnar: "Big. Slow. Hits like a rockfall. My favourite kind."
  - Sovereign: "Two arrows, one breath, Dreamer. Then the choice is yours."
  - Hollow King: "A king who kept his post after he died. I know the type. Make it quick; that is a kindness."

## Pell
- "…You are a gentleman." → "…You are a saint."
- NEW one-time chat lines:
  - "Emberhold is lovely. Every street is uphill. Both ways. I have measured."
  - "I went back down the shaft yesterday. Only to the first lantern. It was lit. I sat with it a while."
  - "So this is the Reach. It is very flat. Where do you all hide?"
  - "I counted the steps to the Forge door. I would rather not say the number. It is not a lucky number."
  - "I was there. Behind a pillar, but I was there. That counts. I have decided it counts."
  - "A king who only wanted remembering. I would like to be remembered as someone who was not hiding. Do not check."
- NEW boss asides:
  - The Winter: "It is snowing indoors. I would like to file a complaint."
  - Kragnar: "That is Kragnar? I used to fetch his tea. ...I am staying back here."
  - Sovereign: "I am behind a pillar. A very brave pillar."
  - Hollow King: "He looks lonely. I mean that. Hit him anyway."

## Emberhold
- **Corvin**
  - "I was at the Reach when the Frost came down. We were forty. I walked home with six." → "I was on the Ashen wall when the Frost came down. We were sixty. I walked home with nine."
  - Winter freed: "They say the Winter broke. It did not break. It was let go. Remember the difference." (now keyed on the Winter choice, no asterisks)
  - NEW, Winter crowned: "The cold does not forget. Now it has a face, and the face is yours."
- **Captain Thorne**
  - "Corvin lost his company to the last Winter…" → "Corvin lost his company on the wall when the cold came…"
  - NEW at turn-in: "Take the Wardens' seal. We have not given it to an outsider in my lifetime. Ysolde will know it."
  - Reward is now the Warden's Pennant instead of a second Ironwatch Banner: "A Warden's pennant from the Ashen wall, cut to a sash."
- **Ketil**
  - "five chains the Anvil wrought" → "one chain the Anvil wrought"
  - Winter crowned: "And a crown of rime now walks the Reach, and the frost bows its head; I will not sing that song. Not today."
  - Winter freed: "And the Winter walked north on its own two feet, and the Reach learned the word for summer!"
  - Winter bound: "And the Winter sleeps on a leash of light, and its warden walks among us; hush, now, hush, or it will hear!"
- **Old Goran**
  - "I was the Court's smith, forty years ago. I made links for the chains…" → "My master's master's master was the Court's smith when the Kings came. We still keep his tongs. Do you know what he made the chain from? Not iron."
  - "The Hollow Kings brought us… We never asked…" → "…brought him… He never asked…"
  - "You sold the Winter, I hear. Gold for a god." → "You sold the Frostheart to a potion-seller, I hear. Gold for a god's heart. That is an old way of ending, and it never ends."
  - After the page: "You found the page. So now you know: it was never iron. The Kings chained a fire to hold a frost, and the fire has been patient ever since."
  - "The chains held for a thousand years…" → "The chain held for a thousand years…"
  - NEW confession: "You have been asking what the chain was made of. Sit. I will tell you, because Brannoch will not, and Ysolde cannot." / "My master's master's master cut a page from the Book of Chains, the night he finished the chain. He carried it to his forge on the Ashen Peaks and never came down." / "That forge is a cold ruin now, an old foundry among the crags. If the page is anywhere, it is under his anvil. Read it, then tell Brannoch. It is the Court's shame to carry."
  - Options: [I will find the page. / Not now.] → "Go gently. He was a better smith than any of us, and a worse liar."
  - Reminders: "You have read it. I can see it on you. Go to Brannoch." / "The old foundry, on the Peaks, among the cold anvils. Under the anvil. Do not make me say it twice."
- **Brannoch**, NEW turn-in: "Goran sent you. I can tell by your face. ...Say it, then. What did the page say?" / "Not iron. We forged the chain from the First Fire, which the Kings buried under this mountain so the world would never burn. When you loosened the Winter, you loosened the fire that held it." / "A thousand years of smiths, and not one of us asked why the chain was warm. The Court's seal. Take it. It is warm too. Now we both know why."
- **Orrin**, NEW at turn-in: "And this. The Delvers' seal, cut from the first lantern's iron. Ysolde will know it."
- **Ysolde**
  - Her chain reveal moved to Brannoch. At the first meeting she now says: "You will want to know what the chain was made of. Ask the Court. Watch their faces when you do."
  - Unreachable give/sell/undecided branches removed.
  - NEW when the Forge opens: "If you mean to bind it, you will need a house that trusts you to the end of the chain."
  - NEW while the Forge is open and no house trusts you: "And if you mean to bind it, you will need a house that trusts you to the end of the chain. None does yet."
- **Thessaly**: "The missing page says: when the Winter is loosed…" → "Goran told me where the page went. It says: when the Winter is loosed, the First Fire must be asked a question. It says only that someone must be brave enough to answer." (only once the page is found)
- **Varro**: "The Hollow Arena in the village is mine too. Distant cousin. We both like the sound of a crowd." → "The Hollow Arena in the village belongs to my cousin. Distant cousin. Loud family."

## Chapter 2 and 3 climaxes
- **The Winter**
  - "You have broken the chains the kings forged." → "You have broken the chain the Kings laid on me."
  - The offer changes with the Frostheart choice:
    - Kept: "But hear me, little Dreamer. Five Hearts. You kept the first for yourself; I know the feel of you already."
    - Sold: "But hear me, little Dreamer. Four Hearts here, and the fifth hums in a potion-seller's cellar. How very like the Kings."
    - Given: "But hear me, little Dreamer. Four Hearts beat in your hands, and the fifth warms a village hearth."
    - Each ends: "You may release me, bind me again, or take my crown. Choose."
- **The Sovereign**
  - Engage line by Winter choice (each ends "Now you stand where the Kings stood, and I am ready to ask my question."):
    - Freed: "Little Dreamer. You let my brother walk free. Be as generous twice."
    - Bound: "Little Dreamer. You keep my brother on a leash. Will you hold the other one too?"
    - Crowned: "Little Dreamer. You wear my brother. I can see him behind your eyes."
  - "Winter was my brother, and you freed him, or bound him, or wore him." → "…and you set him free / you keep him on a leash / you wear him."
  - Refusing Bind is now said by the Sovereign, not Ysolde: "A binding needs hands at the other end of the chain. No house of the mountain would hold it for you. Choose again."

## The Scribe
- NEW at turn-in: "And now I can read the last line he made me write. It is not his name. It is the place where a name should go." / "The Kings could not choose the Winter's fate. So on the last night of the Binding they dreamed someone who could: someone with no name to lose. They dreamed you, Dreamer."
- NEW option afterwards: [Read the last page. / Read the last page again. / Leave.]

## Regions
- **Ilse**: "…For the first time in my life, the fens are quiet." → "Listen: frogs. There have not been frogs in Reedwick since my mother was a girl." Quest description "…end it, one way or another." → "…let the fen stop weeping."
- **Lisbet**: "There are always one more than yesterday." → "There is always one more than yesterday."
- **Ulfar**
  - "A stranger, walking in from the pass without lightning in her hair. Sit. Eat. Then listen." → "A stranger who walked up the pass and kept the lightning out of their hair. Sit by the fire. Then listen."
  - "I have not seen a cloud move since I was a boy." → "No one in the Hold has ever seen a cloud move. Look!"
- **Hakon**: "You did it. You actually did it. The herd walks again." → "Greytusk is down, and the herd is already walking the high road."
- **Gudrun**: "Sit. Eat. The storm has not stopped…" → "Shake the hail off at the door. The storm has not stopped…"
- **Solveig**: "The trees are quiet. I do not know the last time I heard them quiet." → "Look at the lantern by the gate: a moth. A soft one, not glass. The wood is breathing again." Quest description → "…climb the Hart Spire and set him free of it."
- **Wynn**
  - "Five! Look at the veins: bright as a window. Here, take the draught I promised, and my thanks." → "Five, and not one cracked. You carry glass better than most people carry eggs. The draught is yours."
  - The draught "keeps the shards out of your lungs" → "lets the glass-dust pass through you instead of settling" (quest description and intro).
- **Glimmerkin quest giver**: "…make it worth the oil." → "…fill your lamp for a year."
- **Thora**
  - "Sit. Eat." → "Pull up a crate."
  - "Do you hear that? That is silence. I had forgotten it." → "My crews are singing on the lift instead. Badly. I have never heard anything better."
- **Vess**: ledger lines removed ("Close it. Stop him, and I will see the Guild pays what it should."). Thank-you → "Brinegut is the colour of the harbour water, and three honest ships came in on this morning's tide. That is what I wanted."
- **Maren**: "Nothing. Oh, nothing at all." → "Listen: gulls. They have come back to the light. I had forgotten they were so rude."
- **Dahlia**: "I brew a dew that keeps the cold out of the bones." → "I brew a dew that wakes the blood like a slap of sunlight." Quest description → "Dahlia brews a morning dew from valeroot that wakes the blood." Thank-you adds: "Here: crush the root, never chop it, or it sulks. Now you know my whole secret."
- **Hornets quest**: "wasps" → "hornets" (twice).
- **Gardener Ash**: "draw a difference" → "know the difference".
- **Nadir**: "Silence. At last." → "No drums. The caravans are singing their own songs again." Idle "The roads are quiet. I hear you did that." → "Caravans on the roads again. I hear you did that."
- **Tariq**: idle "The sand is quieter…" → "The dunes lie flat at night now. I owe you a drink and a story."
- **Rashid**: "Sovereign" → "Regent" (3 lines).
- **Lanternfall signs**: "THE LAST LANTERN OF THE DELVERS. IT HAS BURNED SINCE BEFORE THEY BUILT THE FIRST TUNNEL ABOVE." → "THE FIRST LANTERN OF THE DELVERS. IT HAS BURNED SINCE THE FIRST DELVERS CAME DOWN." (the region sign likewise LAST → FIRST)

## Lore and bestiary
- **Books**
  - ruin2: "FIVE CHAINS. FIVE HEARTS. FIVE KEEPERS. ONE OF THE FIVE WAS NEVER A HEART." / "THE LAST ONE WAS A FIRE…" → "FIVE HEARTS TO HOLD IT. ONE CHAIN TO HOLD THE HEARTS." / "THE CHAIN WAS WARM. WE WERE TOLD NOT TO WRITE THAT DOWN."
  - Book of Chains: "…bound with five links, and the fifth link was warm." → "…bound by five Hearts, and the chain that held them was warm."
  - court0: "…ended with five chains and no ring at all." → "…ended with five Hearts, one chain, and no ring at all."
  - Valdrek book: "Jarl Valdrek the Hollow" → "Jarl Valdrek the Frostsworn".
  - foundry: "I made the sixth link…" → "I forged the great chain, link by link, for the Kings. They told me it was for a gate…", plus a new third page: "Under the anvil, a page cut from the Book of Chains: WHEN THE WINTER IS LOOSED, THE FIRST FIRE MUST BE ASKED A QUESTION. LET WHOEVER ASKS IT BE BRAVE ENOUGH TO HEAR THE ANSWER."
- **Bestiary changes**
  - Valdrek: "The Hollow King. Two phases…" → "The Frostsworn: the jarl who swore himself to the cold. Two phases…"
  - Hrolf: "The first Warden of Ironwatch, still marching." → "The last captain of the Ironwatch Company, still holding the gate."
  - Winter's faces: "the Crowned, the Storm, the Hunger" → "the Rime Crown, the Storm, the Hunger".
  - Glimmerkin: "Lightning, fire. Immune to lightning damage themselves." → "Lightning and fire. Cannot be shocked."
  - Wight: "Immune-ish to frost." → "Frost barely hurts it." Imp: "Immune-ish to fire." → "Fire barely hurts it."
- **NEW bestiary entries**
  - Kragnar: "The Delvers' king under the lode, who dug until the mountain dug back. Leaps and calls rockfall." / "Frost cracks him. Fire feeds him."
  - Admiral Veyl: "He never gave the order to abandon ship, so nobody left, and his drowned crew still answers him. Past half, the ice comes up through the floor." / "Lightning, then fire. Frost barely touches him."
  - Ashen Sovereign: "The First Fire's will, wearing a crown of cinders. Three faces: the Ember Crown, the Cinder Storm, the Pyre." / "Frost. Fire does almost nothing."
  - Hollow King: "The last of the Kings who bound the Winter, waiting for someone to say his name. Three faces: the Throne, the Court, the Memory." / "Fire, lightning. Resists frost."
  - Blight Mother: "The grove's old guardian, closed around its heart. She roots in behind poison pods: break the pods to tear her loose." / "Fire."
  - Gilded Regent: "The sun kings' last guard. Sunbeams fall in a line toward you; step sideways, not back." / "Lightning. Fire does little."
  - Glass Prism: "Crystal the Hartking grows to armour himself. Smash every prism and the armour shatters, leaving him stunned." / "Any heavy blow."
- **NEW seal items**
  - Delvers' Seal: "Cut from the iron of Lanternfall's first lantern. One of the three seals of the Forge."
  - Court Seal: "The Anvil Court's seal. Warm in the hand, and now you know why. One of the three seals of the Forge."
  - Wardens' Seal: "Not given to an outsider in living memory. One of the three seals of the Forge."
- **Item descriptions**: "Hold F to block" → "Hold {KeyF} to block" (five shields); "Press V to switch ammo" → "Press {KeyV}…" (two arrows); pony whistle "press E to ride" → "press {KeyE} to ride".
- **Barks**: "GET HIM!" → "GET THEM!" / "THERE!"; "*WHINE*" → "(WHINE)". New sets:
  - beast: GRRR / SNARL / HRRUNF
  - critter: BZZZ / CLICK-CLICK / SKRITCH
  - construct: ...GRIND... / ...CRACK... / (STONE SHIFTS)
  - fey: SHINY! / HEE HEE / GO AWAY!; fleeing MEAN! / HEE...
  - plant: (RUSTLE) / (CREAK)

## Ending cards
- **Footers**: Chapter 1 "E: CONTINUE - CHAPTER 1 COMPLETE" (was "THE END - E: KEEP EXPLORING"); Chapter 2 "E: THE MOUNTAIN STIRS - CHAPTER 2 COMPLETE"; Chapter 3 "E: ONE ROAD REMAINS - THE FIRE IS ANSWERED"; Crown of Memory "E: KEEP EXPLORING - THE END".
- KEEP: "Hollowfrost shuttered its doors. Behind you, the snow began to fall again, and it did not stop for a hundred years." → "Hollowfrost did not shut its doors, but it shut its eyes. Behind you the snow began to fall again, and the old women said it would not stop while the Frostheart was in your keeping."
- SELL: "You were far away by then, with a full purse and a lighter conscience than you deserved." → "Nobody in Hollowfrost said a word to you about it. They did not need to."
- THAW: "The Hearts crumbled to dust in your hands, and you let them." → "The Hearts went quiet in your hands, cold no longer, only strong."
- WARDEN
  - "You pressed the four Hearts back into the chains, and set your own into the fifth." → "You pressed the four Hearts back into the chain, and set your own heart where the fifth had been."
  - "Travellers say there is a lantern burning at the Winter Throne, and that whoever keeps it never grows old, or warm." → "Travellers say a lantern burns at the Winter Throne whenever its warden is away, and that the warden never quite grows warm."
- Chapter 3
  - Crown card: the sentence "Somewhere in the world there was still a crown of frost, and a crown of fire, and a single pair of hands deciding which seasons the Reach would be allowed." is cut.
  - Freed-Winter echo: "the Fire you crowned stayed south" → "stayed on the mountain".
  - "chains" → "chain" in the Chapter 2 tail and in the Bind echo.
- **Epilogue** (now only on the Chapter 3 and Crown of Memory cards)
  - Ragna: "Ragna hung the Ironwatch banner over the lodge door, and nobody has asked her to take it down." → "Ragna burned a rafter in the lodge and said thirty-nine names over it. The lodge is quieter now, and so is she." With her cairn quest done it adds: "An iron cairn on the Ironwatch road carries every one of them."
  - NEW lines:
    - Frostheart given: "The Frostheart still burns in the great hall at Hollowfrost. Nobody remembers the snow ever reaching the palisade."
    - Frostheart kept: "You still carry the Frostheart. It beats a little slower than you do, and it has never once asked to be put down."
    - Frostheart sold: "Mirra sleeps upstairs now. The Frostheart hums in her cellar, and the hamlet children dare each other to touch the cellar door."
    - Grimfang spared: "A grey wolf watches Hollowfrost from the ridge every winter. It has never once come closer."
    - Grimfang slain: "Grimfang's pelt hangs in Bjorn's lodge. The young hunters touch it for luck before they leave."
    - Locket returned: "Asta's mother still wears the silver locket. Asta has started telling people the wolf on it is Grimfang."
    - Locket kept: "Asta never asked about the locket again. She asks other people for help now, and looks at them carefully first."
    - Pell's quest done: "Pell Quickpick now tells the story of the Forge with himself in front. Nobody corrects him. It seems unkind."
- **NEW card: THE CROWN OF MEMORY**
  - "The Hollow King knelt at the end, and you did not take his crown. There was nothing in it but names."
  - "The Scribe read the last line of the Book of Chains aloud, and you knew it before the last word. The Kings could not bring themselves to decide what the Winter deserved, so on the last night of the Binding they dreamed someone who could: a stranger with no name to lose, half buried on the north road, a thousand years later."
  - "That was why you remembered nothing. There had been nothing to remember. Everything you are, you made in the Reach."
  - One Winter line:
    - Freed: "You gave the Winter what the Kings never dared to: its freedom. Somewhere north of the mountains it is still walking, and it has never once looked back."
    - Bound: "You chose for the Winter what the Kings chose, but with your own hand on the chain and your eyes open. It sleeps. It knows who is watching."
    - Crowned: "You chose to wear the Winter. The Kings would have been afraid of you. The Scribe was not, and only wrote it down, carefully, in ink."
  - One Fire line:
    - Quench: "And the Fire you answered with one word: enough. The mountain is only a mountain now, and the smiths of Emberhold have learned to make their own warmth."
    - Crown: "And the Fire you wear still. Some nights you dream of every forge in the world. You do not mind. You were made from a dream."
    - Bind: "And the Fire sleeps in the Court of Anvils, held by three houses and a stranger who trusted them. It was the first binding anyone ever asked permission for."
  - "The Kings dreamed you. They never got to decide what you would do when you woke. Neither, it turns out, did anyone else."
  - Then the full epilogue.

## Quest titles and toasts
- The Hollow King → **The Frostsworn Jarl**
- The Den-Mother's Debt → **The Masterless Dens**
- NEW: **The Missing Page** (from Old Goran): "A page was cut from the Book of Chains a thousand years ago. Goran says the smith who forged the chain took it to his forge on the Ashen Peaks. Read it, and tell Brannoch what the Court made." Objectives: "Find the page at the old foundry on the Ashen Peaks" / "Tell Brannoch Redhammer what it said".
- Tutorial toast "YOU ARE READY. SEE SIGRID AND BJORN" → "YOU ARE READY. SEE BJORN AT THE LODGE"
- Campfire toast "CAMPFIRE FOUND - FAST TRAVEL ON THE MAP (F)" → "CAMPFIRE FOUND - FAST TRAVEL: M MAP, THEN F" (with your actual keys)

## How to try the top 5
1. **Chapter 1 ending.** Turn in the Frostheart to Sigrid or Mirra. The card ends with "E: CONTINUE - CHAPTER 1 COMPLETE" and has no epilogue. The title screen does not offer New Game+ yet.
2. **The Missing Page.**
   - In Emberhold, talk to Ysolde: she no longer reveals the chain's secret.
   - Old Goran gives the quest; the marker points to the old foundry on the Ashen Peaks.
   - Press E on the book there, then talk to Brannoch: you get the reveal and the Court Seal.
   - Captain Thorne and Orrin also hand over seals.
3. **The last road.** After the Forge choice, the Chapter 3 card's footer reads "ONE ROAD REMAINS". Beat the Hollow King and talk to the Scribe: the Dreamer reveal plays, then the CROWN OF MEMORY card with THE END and the full epilogue.
4. **Key names.** Options → rebind sneak or block, then talk to Sigrid or Haldor, or look at a shield in the pack. The text names your key, or the pad button if you last used a controller.
5. **Companions.** Hire Ragna in Hollowfrost, or Pell after the mines, and pick Chat at different points in the story. Bring one into a boss fight: they speak about 4.5 seconds in. Press R to shout and look for "HROM!".
