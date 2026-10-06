// Story voice: boss taunts, villager barks and the epilogue. Epic and mythic, kept short enough to read mid-fight.
import { S } from '../systems/state.js';
import { heartsHeld } from './hearts.js';

// Spoken as subtitles when a boss engages, changes phase, or falls. Keys match the boss's enemy kind.
export const BOSS_TAUNTS = {
  boss: { name: 'JARL VALDREK', engage: 'The crypt is a crown. You walk in it like a thief.', 2: 'I have worn this cold for a thousand winters. Kneel.', death: 'The Heart... was never mine to keep...' },
  grimfang: { name: 'GRIMFANG', engage: 'The pack remembers every snare. Every arrow. Every one of you.', 2: 'Howl, children. Howl for the last of us.', death: 'Run, little ones. The pass is yours now.' },
  wyrm: { name: 'THE RIME WYRM', engage: 'I was a river once. Now I am the ice that remembers.', 2: 'Break me and the Maw will sing your name.', 3: 'COLD. COLDER. COLDEST.', death: 'The water... is warm... at last...' },
  warlord: { name: 'HROLF IRONMARCH', engage: 'Hold the gate. Hold it for the dead who cannot.', 2: 'Rally to me, Ironwatch! The Reach does not fall!', 3: 'I will not break. I was forged in this winter.', death: 'Stand down, men. The watch... is over.' },
  tide: { name: 'THE TIDEMOTHER', engage: 'Every drowned prayer rises here. Hush, little light.', 2: 'The deep takes everything. Even you.', 3: 'Sink with us, child. It is quiet below.', death: 'The tide goes out... the song goes with it...' },
  root: { name: 'THE ASHEN ROOT', engage: 'We were seeds in the first fire. We are patient.', 2: 'The Wound spreads. The Wound is hungry.', 3: 'GROW. GROW. GROW.', death: 'Rot... returns to the soil... as it should...' },
  winter: { name: 'THE LONG WINTER', engage: 'Little Dreamer. You carry my chains and think them yours.', 2: 'I am the storm that made your fathers kneel.', 3: 'I am the silence after the last fire dies.', death: 'You broke the chains. Now break the choice.' },
  dragon: { name: 'SKALDRATH', engage: 'Another small flame comes to my hoard. How it flickers.', 2: 'The sky burns because I wish it. Watch.', 3: 'EMBERS FALL WHERE I LOOK.', death: 'The last dragon... falls to a mortal spark...' },
};

// A villager mutters something about the world as you pass. state -> list of lines (a random one is shown).
const hearts = () => heartsHeld();
export const NPC_BARKS = {
  sigrid: () => [
    S.flags.finale ? 'The Winter has been decided. Now the living must do the deciding.' : hearts() >= 4 ? 'Four Hearts in your hands. The Throne waits.' : hearts() >= 1 ? 'Every Heart you free, the cold loosens its grip a little.' : 'Walk softly in the old places, Dreamer.',
    'The Kings are only stories to the young. Let them stay stories.',
  ],
  bjorn: () => [
    S.flags.rb_elk ? 'You felled Frostbrow? Gods. I have waited my whole life to see his antlers.' : 'Tracks near the north trail. Big. Bigger than any elk has a right to be.',
    'The dogs are restless tonight. They smell the aurora coming.',
  ],
  mirra: () => [
    'Snowberries keep. Fear does not. Drink up.',
    S.flags.alchemy ? 'Three drops of frost lily, one of bone dust. Do not ask what it tastes like.' : 'I could teach you, if you brought me herbs.',
  ],
  hilda: () => [
    S.flags.rb_troll ? 'Trollbone. Do you know what that does to a hammer? ...No. Nobody does. Yet.' : 'A good edge outlives its smith.',
    'Steel remembers every blow. So should you.',
  ],
  guard: () => [
    S.flags.finale === 'thaw' ? 'The palisade is dripping. I have forgotten what that sounds like.' : 'Nothing on the road tonight. That is the part that worries me.',
    'The aurora means the Kings are dreaming. Do not look too long.',
  ],
  child: () => [
    S.flags.houndOwned ? 'Is that a frost hound? Can I pet him? ...Is he yours?' : 'Mama says the stars are the Kings\' lanterns.',
    'I am going to be a hunter. Or a dragon. I have not decided.',
  ],
  ragna: () => ['Two arrows, one breath. Never three.', 'Keep your back to the wall and your bowstring dry.'],
};

// Closing paragraphs for the ending scene: the world remembers how you played.
export function epilogueLines() {
  const out = [];
  const trophies = Object.keys(S.trophies || {}).length;
  if (S.flags.ragnaVeteran) out.push('Ragna hung the Ironwatch banner over the lodge door, and nobody has asked her to take it down.');
  if (S.flags.houndGiven) out.push('Asta and her hound run the length of the palisade every morning. He has never once come back without her.');
  else if (S.flags.houndOwned) out.push('A frost hound sleeps at the foot of your bed. He does not dream of winter.');
  if (S.flags.cubOwned) out.push('The bear cub grew into a bear. She still follows you to the door, and waits.');
  if (S.flags.rb_elk && S.flags.rb_troll) out.push('The hunters tell of the elk and the troll the way they tell of the Kings: with their voices lowered.');
  const relics = Object.keys(S.lore || {}).filter((k) => k.startsWith('relic_')).length;
  if (relics >= 8) out.push('The eight relics hang in the great hall. Children are taught their names before their letters.');
  else if (relics >= 4) out.push(`Half the Kings' relics rest in Hollowfrost now (${relics} of 8). The rest are still out there, under the snow.`);
  if (S.flags.dragonDead) out.push('Skaldrath\'s bones lie in the Ember Nest. The snow will not settle on them.');
  if (trophies >= 20) out.push('Bards across the Reach sing of you. They disagree about almost everything except the ending.');
  if ((S.ngPlus || 0) >= 1) out.push('This is not the first winter you have broken. It may not be the last.');
  return out;
}
