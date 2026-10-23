# Frostfall lore canon

One page to check new writing against. If a line in the game disagrees with this page, the line is wrong.
Display names may change; save ids, quest ids and flags never do (see the last section).

## The myth in one paragraph

A thousand years ago the **Hollow Kings** (a ring of rulers, none at the head) could not destroy the **Long Winter**, a
thing older than snow, so they bound it. **Five Hearts were the locks; the chain that ran between them was forged by the
Anvil Court from the First Fire.** The Kings buried the **First Fire** under the Ashen Peaks so the world would never
burn, and chained it to hold the frost. Every Heart had a guardian. The binding held until three years ago, when the cold
woke and came south. The Kings could not bring themselves to decide the Winter's fate, so at the very end they **dreamed
someone who could**: the player, found half buried on the north road, with no name. That is why everyone says
"Dreamer", and why the Winter says "You carry my chains and think them yours."

## Hard facts (do not contradict)

| Fact | Canon |
|---|---|
| Hearts | **Five.** The Frostheart (Valdrek's crypt) is the first. Then Rime (Glacial Maw), Iron (Ironwatch Keep), Tide (Drowned Chapel), Root (Rootvault). Sigrid's maps name them in that order, but they can be taken in any order. |
| Chain | **One chain**, many links, warm to the touch. Forged by the Anvil Court's smith from the First Fire. "Chains" is only poetry in the mouths of the Winter and the Sovereign. |
| Who forged it | The Court's smith, **a thousand years ago**, at his own forge on the Ashen Peaks (now the old foundry). Old Goran is his apprentice line ("my master's master's master"). The smith cut a page from the Book of Chains and left it under his anvil (*The Missing Page*). There was never a "sixth link". |
| Winter vs Fire | The Winter and the First Fire are siblings ("my brother"). Loosening the Winter loosened the Fire. |
| Three crowns | Frost (the Winter's crown of rime), Ember (the Sovereign's crown of cinders), Memory (the Hollow King's). |
| Titles | **The Hollow King** is only the last of the Old Kingdom's Kings (Hollow Sepulchre). **Jarl Valdrek the Frostsworn** is the Chapter 1 boss: a jarl, never a King. His quest is *The Frostsworn Jarl*, his tomb the *Crypt of the Frostsworn*. |
| The Sovereign | "The Sovereign" means the Ashen Sovereign only. The desert boss is **the Gilded Regent**. |
| Bosses' names | The Rime Wyrm (Glacial Maw), Hrolf Ironmarch (Ironwatch), the Tidemother, the Ashen Root, the Long Winter, Kragnar the Hollowed, the Ashen Sovereign, Admiral Veyl, the Hollow King. |

## Timeline

- **~1000 years ago**: the Binding. The Kings raise standing stones where roads cross. The Peak Road drifts shut.
- **Hollowfrost's founding**: seven families follow one fire north and seal it in the great hall.
- **~100 years ago**: the storm settles on the Stormcrown and never leaves. No one in Skarn Hold has seen a cloud move.
- **3 years ago**: the cold comes south. The Ironwatch Company (forty riders) holds the Keep's gate; Ragna rides out alone,
  and Captain Hrolf Ironmarch is still holding it. Corvin's Wardens lose most of sixty men on the Ashen wall.
- **Now**: Chapter 1 (the Frostheart), Chapter 2 (the five Hearts, the Winter Throne), Chapter 3 (the three seals of
  Emberhold, the Forge), then the last road: the Old Kingdom and the Crown of Memory.

## The player

No name, no stated gender: write "they", "stranger", "Dreamer", "friend". Never "him/her", "lad", "gentleman".
Key names in speech are tokens (`{KeyC}`), never letters.

## Name register

Check a new name against this list: no first word within one letter of an existing one.

| Place | People (role) |
|---|---|
| Hollowfrost | Elder Sigrid (elder), Bjorn (hunter), Mirra (alchemist), Hilda (smith), Ragna (archer, Ironwatch Company), Guard Haldor, Asta (child) |
| Reach hamlets | Trapper, Fisher, Prospector, Hermit; Keeper Maren (Last Light, coast); the Scribe (Old Kingdom) |
| Emberhold | Matriarch Ysolde (Anvil Court), Brannoch (Great Anvil), Kerra (his apprentice), Old Goran (old smith), Thessaly (archivist), Captain Hesper Thorne and Warden Corvin (Wardens), Orrin (Delvers), Pell Quickpick, Garrow Pitt, Rook, Dunmar (gem-cutter), Tamsin (gem-setter), Agna Soot (potions), Nessa (stew), Varro (pit), Ketil (bard), Sister Aurel, Mother Brisa, Maelis (the Last Lantern tavern) |
| Reedwick (Fens) | Warden-Mother Ilse, Pim the Lamp-seller, Odda (smith), Torvi (hunter), Maud (herbalist), Old Tolle, Lisbet, Marit (Lantern Inn), Joss the Chartmaker |
| Skarn Hold (Stormcrown) | Chief Ulfar Stormbrow, Rannveig, Grimhild (smith), Shaman Veda, Hakon (herder), Scout Asger, Tyra, the Wind-Bard, Gudrun (longhouse), Kelda the Wayfinder |
| The Glade (Glasswood) | Warden Solveig, Fenn Lanternwright, Vesna Glassblower, Kestrel, Wynn Dewkeeper, Pip, Marrow (Singing Inn), Spindle the Mapmaker, the Moon-Reader |
| Lanternfall (Underdeep) | Foreman Dagna, Bollard the Lampman, Irma Deepforge, Morel the Fungalist, Tallow, Grit, Oddrun (Long Bench), Quill, Orm the Ferryman |
| Saltmarket (Coast) | Harbourmaster Vess, Rosalind Sea-Goods, Cormac Shipwright, Madam Perpetua, Guildmaster Anneke, Nim the Fence, Old Cap'n Bryn, Nell (Gull & Anchor), Wenna Sea-Charts, Minnow, the Shanty-Man |
| Greenhollow (Vale) | Elder Maeve, Hazel Hedgerow, Bramble, Fern, Dahlia, Clover, Mother Marigold, Thistle, Beekeeper Orla, Lark, Gardener Ash |
| Amberwell (Sunscorch) | Sheikh Rashid, Jamila, Khalid Sunforge, Tariq Sandwalker, Scholar Nefer, Samira, Captain Nadir, Umm Hassan, Ibrahim, the quiet man, Caravan Master Basil, Red Sula |

## Ids stay, names move

Renames are display text only. Quest ids (`king`, `hollowking`, `roadwatch`...), NPC ids (`glade_warden`, `hesper`,
`isolt`...), enemy kinds (`boss`, `vaultsovereign`), flags (`vaultSovereignDead`) and cycle keys (`ysoltN`) keep their
old spelling so old saves load unchanged. If an id ever has to change, add a migration in `src/systems/save.js`.
