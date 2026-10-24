// WQ18: every landmark has its own small secret (two per region to start, all twenty-five here). Pure data: the hint goes on
// the landmark's sign (world/landmarks.js); the behaviour is in features/world_secrets.js. Kinds:
//   fire    hit it with a fire spell                 ring   ring it: a wave of guardians, then a reward
//   riddle  answer a question (three answers)        time   touch it at the right hour or in the right weather
//   gift    leave an item                            under  walk under or into it: a blessing
//   dig     at the right hour it points at a buried treasure (sets a waypoint to the nearest dig spot)
export const SECRETS = {
  frozenfall: { kind: 'fire', hint: 'THE ICE IS THIN AT THE FOOT OF THE FALL. A LITTLE FIRE WOULD GO A LONG WAY.' },
  mammothbones: { kind: 'gift', item: 'venison', hint: 'HUNTERS LEAVE MEAT HERE FOR LUCK. NOBODY SAYS WHOSE LUCK.' },
  lonepine: { kind: 'time', hours: [21, 4], hint: 'THEY SAY THE GIANT TALKS IN ITS SLEEP. IT SLEEPS AT NIGHT, LIKE EVERYONE.' },
  fallenstatue: { kind: 'riddle', q: 'A PLAQUE: WHAT DID THE FALLEN KING FEAR MOST?', a: ['THE WINTER', 'BEING FORGOTTEN', 'HIS SCULPTOR'], right: 1, hint: 'THE PLAQUE ASKS A QUESTION. THE KING WAS NOT A BRAVE MAN.' },
  lavafall: { kind: 'under', buff: 'warm', hint: 'STAND IN THE HEAT A WHILE. THE COLD WILL NOT FIND YOU FOR HOURS.' },
  obsidianspire: { kind: 'time', hours: [5, 7], hint: 'IT RINGS AT DAWN. TOUCH IT WHILE IT RINGS.' },
  ashbell: { kind: 'ring', hint: 'A ROPE HANGS FROM THE BELL. WHATEVER ANSWERS IT WILL BE ANGRY.' },
  whalebones: { kind: 'gift', item: 'grilled_trout', hint: 'THE GULLS SAY THE WHALE IS STILL HUNGRY. GULLS LIE.' },
  icearch: { kind: 'under', buff: 'breath', hint: 'WALK UNDER THE ARCH AND YOUR BREATH HANGS. SO DOES THE COLD, ON THE FAR SIDE OF YOU.' },
  sunkenstatue: { kind: 'dig', hours: [11.5, 13], hint: 'AT NOON THE HAND\'S SHADOW POINTS AT SOMETHING BURIED.' },
  brokenbridge: { kind: 'time', weather: 'rain', hint: 'WHEN IT RAINS, THE RIVER REMEMBERS WHERE IT WAS.' },
  emptythrone: { kind: 'riddle', q: 'A VOICE: WHO SITS HERE NOW?', a: ['THE LAST KING', 'NOBODY', 'WHOEVER IS ASKED'], right: 2, hint: 'THE SEAT IS WARM. SOMEONE WILL ASK YOU SOMETHING.' },
  obelisk: { kind: 'time', hours: [21, 4], hint: 'THE NAMES GLOW AFTER DARK. ONE OF THEM IS YOURS.' },
  drownedbell: { kind: 'ring', hint: 'THE BELL RINGS WHEN THE WATER RISES. YOU COULD RING IT YOURSELF.' },
  sinkingtower: { kind: 'gift', item: 'marsh_orchid', hint: 'THE TOWER KEEPER LIKED ORCHIDS. THE TOWER STILL DOES.' },
  stormpillar: { kind: 'time', weather: 'storm', hint: 'TOUCH IT IN A THUNDERSTORM. YOU WILL ONLY DO THIS ONCE.' },
  eaglenest: { kind: 'ring', hint: 'A HORN HANGS ON THE NEST. THE EAGLES COME WHEN IT BLOWS.' },
  songtree: { kind: 'time', weather: 'chime', hint: 'WHEN THE CHIME WIND BLOWS, SING BACK TO IT.' },
  prismarch: { kind: 'dig', hours: [11.5, 13], hint: 'AT NOON A BEAM OF LIGHT FALLS ON BURIED TREASURE.' },
  lightshaft: { kind: 'under', buff: 'heal', hint: 'STAND IN THE DAYLIGHT. IT HAS COME A LONG WAY TO REACH YOU.' },
  bonehall: { kind: 'gift', item: 'bone_dust', hint: 'THE DELVERS ARE MISSING A LITTLE OF THEMSELVES. BRING SOME BACK.' },
  greatoak: { kind: 'gift', item: 'honeycomb', hint: 'GARDENERS LEAVE THE OAK HONEY. IT LEAVES SOMETHING BACK.' },
  rainfall: { kind: 'time', weather: 'rain', hint: 'IN THE RAIN THE COLOURS RUN INTO THE POOL. LOOK IN IT THEN.' },
  sphinx: { kind: 'riddle', q: 'THE SPHINX: WHAT DOES THE SUN WANT?', a: ['TO BE WORSHIPPED', 'TO REST', 'NOTHING: IT GIVES'], right: 2, hint: 'IT WILL ASK YOU ITS ONE QUESTION. THINK OF WHAT THE SUN DOES ALL DAY.' },
  sunobelisk: { kind: 'dig', hours: [11.5, 13], hint: 'IT POINTS AT NOON ALL DAY. AT REAL NOON IT POINTS AT SOMETHING ELSE.' },
  buriedcolossus: { kind: 'ring', hint: 'TAP THE HAND AND THE SAND MOVES. SO DO THE THINGS UNDER IT.' },
};
