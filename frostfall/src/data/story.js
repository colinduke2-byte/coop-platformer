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
  sovereign: { name: 'THE ASHEN SOVEREIGN', engage: 'Little Dreamer. You broke my brother and bound my chains. Now you stand where the Kings stood, and I am ready to ask my question.', 2: 'I was the first spark in the first dark. Every fire since is my child, and every child wants to come home.', 3: 'BURN. BURN. BURN. THE WORLD WAS ALWAYS KINDLING.', death: 'The question... is whether... you will let me... rest.' },
  kragnar: { name: 'KRAGNAR', engage: 'Who walks in my lode? The lanterns are mine. The dark is mine. You are mine.', 2: 'Dig! DIG! The mountain remembers every hand that wronged it!', 3: 'Break me and the lode breaks with me...', death: 'Sleep... at last... under... stone.' },
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
// ---- Chapter 2's closing card and the three final endings of Chapter 3 (The Ember Crown)
export const CH2_TAIL = "Far to the north-east, past the lakes where the Winter once ruled, a thread of smoke rose from the Ashen Peaks. It was not the smoke of a hearth. The chains that had held the Winter had been forged from something that did not like to be forgotten.\n\nThe Peak Road, drifted shut for a thousand years, was open.";
const C3 = {
  quench: { title: 'THE LAST EMBER', col: 13, text: "You laid your hand on the Sovereign's broken crown and said the word the Hollow Kings never dared: enough.\n\nThe First Fire did not fight. It went out the way a tired child lets go of a lantern, and the whole mountain breathed out. By morning the furnaces of Emberhold were embers, and the smiths stood in the strange new quiet with hammers in their hands and nothing to strike.\n\nThere would be no more Winter and no more fire that wanted to be a god. Only seasons. Only people. It was, you thought, the first honest ending the Reach had ever been given." },
  crown: { title: 'THE EMBER CROWN', col: 12, text: "The crown of cinders was warm, and it fit.\n\nThe First Fire did not burn you. It leaned into you the way a flame leans into a draught, and for a moment you knew every forge that had ever been lit and every hearth that had ever gone out. Emberhold knelt, not out of fear, or not only.\n\nThe Hollow Kings had bound the old powers. You wore one. Somewhere in the world there was still a crown of frost, and a crown of fire, and a single pair of hands deciding which seasons the Reach would be allowed." },
  bind: { title: 'THE BALANCE HOLDS', col: 15, text: "It took three houses to lift the anvil: the Court to forge, the Guild to carry, the Wardens to guard. You were the first link, and the fire went into the chain as quietly as a coal into ash.\n\nThe Sovereign's crown cooled into a great grey ring and was hung in the Court of Anvils, where Matriarch Ysolde had a small plaque cut: HERE THE FIRE WAS ASKED, AND ANSWERED.\n\nNothing was ended. Everything was held. The Reach would have its winters and the mountain would have its fire, and between them, a city that remembered why." },
};
const WINTER_ECHO = {
  quench: { thaw: 'The Winter you freed and the Fire you quenched left the sky bare, and the stars came out in numbers no one living had seen.', warden: 'You were the Winter\'s warden once. Now there was nothing left to ward, and for the first time you slept without a cold weight on your ribs.', crown: 'You set the crown of rime aside and let it melt in your hands. Nobody in the Reach would ever know how near they had come to a sovereign.' },
  crown: { thaw: 'The Winter you freed went north and the Fire you crowned stayed south, and the Reach learned what it meant to live between a blessing and a power.', warden: 'You were the Winter\'s warden, and now the Fire\'s crown: the one who holds both ends of the old balance in a single pair of hands.', crown: 'Crown of Rime and Crown of Ember: the Lord of Fire and Frost walked the Reach, and the seasons turned when they were told to.' },
  bind: { thaw: 'The Winter had gone free and the Fire was bound, so the chains were different this time: lighter, loved, mended by many hands.', warden: 'You had already bound one power. Binding the second was almost a habit, and the Court noticed it, and quietly wrote the word Warden after your name.', crown: 'You wore the crown of rime and bound the crown of fire, and Ysolde wrote in the Book of Chains: let the record show the balance was held by one who could have broken it.' },
};
const HOUSE = {
  anvil: 'The Anvil Court stood with you at the end. Brannoch finished your gear with a smile; Thessaly wrote the whole story out, in ink, which is how everyone knew it was over.',
  delvers: 'The Delvers lit every lantern in the Deep Mines in your name, one by one, from the shaft to the lode. Pell claimed he had been there the whole time.',
  wardens: 'The Wardens stood their last watch at the Forge door and then, for the first time in memory, put down their shields. Corvin was seen smiling. Nobody mentioned it.',
  none: 'No house of Emberhold stood with you at the end, and they never quite forgave you for being right anyway.',
};
export function chapter3Ending(kind) {
  const c = C3[String(kind).replace('c3_', '')];
  if (!c) return null;
  const choice = String(kind).replace('c3_', ''), winter = S.flags.finale || 'thaw';
  const best = ['anvil', 'delvers', 'wardens'].reduce((b, f) => ((S.rep?.[f] || 0) >= 45 && (!b || S.rep[f] > S.rep[b]) ? f : b), null);
  const title = choice === 'crown' && winter === 'crown' ? 'LORD OF FIRE AND FROST' : c.title;
  return { title, col: c.col, text: [c.text, WINTER_ECHO[choice][winter] || WINTER_ECHO[choice].thaw, HOUSE[best || 'none']].join('\n\n') };
}

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
