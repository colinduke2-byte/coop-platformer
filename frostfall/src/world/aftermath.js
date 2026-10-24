// WQ26 (talk): after a region's boss falls, two people in its hub (the Old Kingdom: its grave-keeper) have something new to
// say. features/world_changes.js puts these in front of their usual talk on every other visit; a shop or inn opens after.
//   npc: [speaker, flag that must be set, [two lines], svc: their own menu follows the line]
export const AFTER_BOSS = {
  wick_child: ['Lisbet', 'mireMotherDead', ['The bell stopped ringing at night. Mother says it is because you went down there. I put a lantern out for you.', 'I walked to the end of the boards today and nothing grabbed me. Nothing! I was a little disappointed.']],
  wick_inn: ['Marit', 'mireMotherDead', ['People stay late since the Mire Mother went under. They used to run home before dark.', 'Every pole on the boards was lit last night, and nobody drowned. That is the whole toast.'], true],
  skarn_child: ['Tyra', 'stormGiantDead', ['The sky moved! A cloud went right over the Hold. Gudrun cried. Do not tell her I told you.', 'The lightning bugs are back. They were hiding from the giant, I think. So was I.']],
  skarn_bard: ['Wind-Bard', 'stormGiantDead', ['A new verse for the longhouse: the Dreamer climbed the spire, and the storm climbed down.', 'Under the wind there was a drum. It has stopped. I keep listening for it anyway.']],
  glade_child: ['Pip', 'hartKingDead', ['The trees sing softer now. Like they are not afraid of anything.', 'I kept a sliver of the Hartking\'s antler. It is not even sharp. It just hums.']],
  glade_inn: ['Linnet', 'hartKingDead', ['Since the Hartking fell, the Singing Inn sings in tune. Mostly.', 'Travellers come in from the deep wood with all their fingers. First time in years.'], true],
  fall_child: ['Grit', 'lodeColossusDead', ['The floor does not shake when I sleep any more. Thora says that was the Colossus walking. I liked the shaking a bit.', 'Everything is warmer since you came back up. Even Thora.']],
  fall_inn: ['Oddrun', 'lodeColossusDead', ['The east tunnels are open. Delvers come in hungry and leave singing. Good for the Long Bench.', 'Somebody carved you into the end of the bench. Badly. You have a very big sword.'], true],
  salt_child: ['Minnow', 'brinegutDead', ['Dad says the smugglers are gone. He also says it is bad for business. I do not understand grown-ups.', 'I found a captain\'s button on the quay. Brinegut\'s, maybe. It is under my pillow.']],
  salt_bard: ['Shanty-Man', 'brinegutDead', ['New shanty: old Brinegut sank with his cargo and his crew, and the Dreamer did the sinking. Heave and haul!', 'Seven bells, and the cargo is right for once. I do not know what to sing about now.']],
  vale_child: ['Clover', 'blightMotherDead', ['There are flowers all round the old hollow now! I picked one and two more grew. So I stopped.', 'The bees are thinking about the hollow now. It smells of honey there.']],
  vale_hunter: ['Fern', 'blightMotherDead', ['No briars in the boar hides any more. Easier to skin. Harder to brag about.', 'I walked past the Thornroot today. Flowers. Just flowers. I sat down and did not know why.']],
  dune_child: ['Samira', 'vaultSovereignDead', ['The sand stopped whispering. It used to say a name. Now it only says shhh.', 'My scorpion is called Regent now. He is the smallest regent there is.']],
  dune_caravan: ['Basil', 'vaultSovereignDead', ['Two hundred and one crossings, and the first where nobody made the sign at the vault road.', 'The raiders say the gold went quiet. They do not like quiet gold. Neither do I.']],
  ketil: ['Ketil', 'sovereignDead', ['A new verse! The ember crown fell in the forge, and the forge burned on, kinder than before!', 'Thirty years I have sung of kings. I never thought to sing of the one who ended one.']],
  nessa: ['Nessa', 'sovereignDead', ['The pot simmers easy since the Sovereign fell. The mountain is not angry any more. Only warm.', 'Free stew for whoever put out the ember crown. That is the rule now. I made the rule.'], true],
  hf_gravekeep: ['Grave-keeper', 'hollowKingDead', ['One name is cut fresh on the last stone. His. I do not know who carved it in the night.', 'The knights stopped their rounds. They lay down where they stood. I am burying them as fast as I can.'], true],
};
