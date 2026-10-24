// One-time tutorial hints shown the first time a mechanic matters.
import { S } from './state.js';
import { bus } from './bus.js';
import { prompt, padHint } from './access.js';

export const TIPS = {
  sneak: 'HOLD {KeyC} TO SNEAK: UNAWARE FOES TAKE 3X DAMAGE.\nROLL ({Space}) THROUGH A TELEGRAPHED HIT.',
  stamina: 'STAMINA REFILLS WHEN YOU STOP ACTING.\nPRESS {Digit3} FOR A STAMINA POTION.',
  perks: 'OPEN THE PACK ({KeyI}) AND SPEND YOUR PERK POINT\nON THE PERKS TAB.',
  lock: 'LOCKPICKING: PRESS {KeyE} WHEN THE MARKER\nIS INSIDE THE GREEN ZONE.',
  block: 'HOLD {KeyF} TO BLOCK. RAISE THE SHIELD JUST BEFORE\nA HIT TO PARRY AND STAGGER THE ATTACKER.',
  bow: 'HOLD {KeyK} TO DRAW, RELEASE TO SHOOT.\nARROWS THAT MISS CAN BE PICKED UP AGAIN.',
  night: 'NIGHT: ENEMIES SEE LESS FAR WHEN YOU SNEAK.\nVILLAGERS ARE INDOORS.',
  potion: 'POTIONS: {Digit1} HEALTH, {Digit2} MANA, {Digit3} STAMINA.\nRESTING AT A CAMPFIRE ALSO HEALS.',
  rest: 'RESTING SAVES YOUR GAME AND SETS\nWHERE YOU WAKE IF YOU FALL.',
  reaver: 'RIME REAVER: IT WAITS OUT YOUR ROLL.\nSTEP BACK, ROLL LATE, OR HIT IT FROM RANGE.',
  knight: 'RIME KNIGHT: ARMOUR SHRUGS OFF BLOWS.\nPARRY ITS SWING WITH A SHIELD ({KeyF}) TO OPEN IT UP.',
  fencer: 'SNOW FENCER: IT SIDESTEPS YOUR SWING.\nBAIT A SWING, THEN STRIKE, OR USE BOW AND SPELLS.',
  imp: 'CINDER IMP: IT RUNS AT YOU AND BURSTS.\nKILL IT AT RANGE OR ROLL AWAY FROM THE FUSE.',
  necro: 'GRAVE CALLER: IT RAISES THE DEAD EVERY FEW SECONDS.\nREACH IT FIRST.',
  frostworm: 'FROST WORM: IT TUNNELS UNDER THE SNOW.\nMOVE OFF THE MARK BEFORE IT SURFACES.',
  tracks: 'GIANT TRACKS! SOMETHING WALKS A LOOP\nBETWEEN THE CAMPS. FOLLOW THE PRINTS.',
  elk: 'THE WINTER ELK: IT CHARGES IN A STRAIGHT LINE.\nSTEP SIDEWAYS AT THE LAST MOMENT, THEN STRIKE.',
  troll: 'THE BRIDGE TROLL REGENERATES.\nKEEP THE DAMAGE COMING. FIRE HURTS IT MOST.',
  bearcub: 'A BEAR CUB! HURT IT AND ITS MOTHER COMES.\nTHE MOTHER CRUSHES SHIELDS. ROLL, DO NOT BLOCK.',
  wyvern: 'WYVERN: IT CIRCLES, THEN DIVES.\nSTRIKE AS IT PASSES OR SHOOT IT DOWN.',
  shroom: 'SPORE MOTHER: IT SEEDS THE GROUND WITH BURSTS.\nKEEP MOVING AND STRIKE FROM RANGE.',
  golem: 'RIME GOLEM: ICE ARMOUR. PARRY IT, STAGGER IT,\nOR USE LIGHTNING.',
  lynx: 'SHADOW LYNX: IT HIDES IN THE SNOW AND POUNCES.\nLISTEN FOR THE GROWL AND ROLL.',
  bear: 'SNOW BEAR: BIG, SLOW SWINGS.\nROLL THROUGH THEM AND STRIKE BACK.',
  burden: 'YOUR PACK IS HEAVY: YOU MOVE SLOWER.\nSELL, STASH AT HOME, OR DROP ({KeyV}) IN THE PACK.',
  dewsprite: 'DEW SPRITE: IT HEALS THE CREATURES AROUND IT.\nKILL IT FIRST. FREEZING OR STUNNING STOPS IT.',
  cutpurse: 'CUTPURSE: ONE CLEAN HIT AND IT RUNS WITH YOUR GOLD.\nCATCH IT AND THE GOLD DROPS. BLOCK OR PARRY TO KEEP IT.',
  warchanter: 'WARCHANTER: ITS DRUM MAKES ALLIES HIT HARDER.\nSILENCE IT FIRST.',
  sandburrower: 'SAND BURROWER: IT TUNNELS UNSEEN.\nWHEN THE SAND SWELLS UNDER YOU, ROLL AWAY.',
  sunsentinel: 'SUN SENTINEL: GOLD ARMOUR. PARRY IT, STAGGER IT,\nOR USE LIGHTNING.',
  crush: 'A DOUBLE !! MEANS A CRUSHING BLOW:\nIT SMASHES A RAISED SHIELD. ROLL, OR PARRY IT.',
  quest: 'PRESS {KeyO} FOR THE JOURNAL.\nPRESS {KeyE} ON A QUEST TO TRACK IT.',
  danger: 'NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU:\nGREEN EASY, WHITE FAIR, YELLOW TOUGH, ORANGE DEADLY, RED HOPELESS.',
  // first visit to a crafting service: shown on the service's own message line (one short line each, NP16)
  cook: 'A MEAL HEALS AND BUFFS YOU. EAT IT FROM THE PACK.',
  brew: 'BREW POTIONS FROM THE HERBS YOU PICK IN THE WILD.',
  forge: 'EACH FORGE STEP MAKES A PIECE OF GEAR STRONGER.',
  enchant: 'AN ENCHANTMENT ADDS FIRE, FROST OR SHOCK TO A WEAPON.',
  reforge: 'REFORGING ROLLS NEW BONUSES ON A PIECE OF GEAR.',
  fletch: 'ARROWS + A MATERIAL = SPECIAL AMMO. {KeyV} SWITCHES.',
  furnish: 'BOUGHT FURNITURE APPEARS IN THE COTTAGE AT ONCE.',
  repair: 'GEAR WEARS DOWN AS YOU FIGHT. MEND IT HERE.',
  socket: 'SOCKETS HOLD GEMS: EACH ADDS A BONUS WHILE WORN.\nTAKING ONE OUT IS FREE. R MARKS A RUNE SLOT.',
};
// The Field Guide (Lore > GUIDE, NP21) lists every tip you have seen, grouped. Anything not named here is a creature.
export const TIP_GROUP = {
  block: 'COMBAT', stamina: 'COMBAT', potion: 'COMBAT', bow: 'COMBAT', perks: 'COMBAT', danger: 'COMBAT',
  sneak: 'STEALTH', night: 'STEALTH', lock: 'STEALTH',
  cook: 'CRAFTING', brew: 'CRAFTING', forge: 'CRAFTING', enchant: 'CRAFTING', reforge: 'CRAFTING', fletch: 'CRAFTING', furnish: 'CRAFTING', repair: 'CRAFTING', socket: 'CRAFTING',
  rest: 'TRAVEL', burden: 'TRAVEL', quest: 'TRAVEL', tracks: 'TRAVEL',
};
export const tipGroup = (id) => TIP_GROUP[id] || 'CREATURES';
export const GROUP_ORDER = ['COMBAT', 'STEALTH', 'CRAFTING', 'TRAVEL', 'CREATURES'];
export const TIP_TITLE = {
  sneak: 'SNEAKING', stamina: 'STAMINA', perks: 'PERK POINTS', lock: 'LOCKPICKING', block: 'BLOCK AND PARRY', bow: 'THE BOW',
  night: 'NIGHT', potion: 'POTIONS', rest: 'RESTING', quest: 'THE JOURNAL', tracks: 'GIANT TRACKS', burden: 'A HEAVY PACK',
  danger: 'DANGER COLOURS', cook: 'COOKING', brew: 'BREWING', forge: 'THE FORGE', enchant: 'ENCHANTING', reforge: 'REFORGING',
  fletch: 'FLETCHING', furnish: 'FURNISHING', repair: 'REPAIRS', socket: 'GEMS AND SOCKETS',
};
// a tip's text with {KeyX} filled in for the keys or pad buttons in use right now
export const tipText = (id) => (TIPS[id] || '').replace(/\{(\w+)\}/g, (_, c) => prompt(c));
// Tips folded into another screen (the level-up card already says how to spend a perk point, NP9): they are marked seen
// for the Field Guide without a hint of their own.
const SILENT = new Set(['perks']);
// tips that matter right now replace the current hint instead of queueing behind it (NP1, NP5)
const URGENT = new Set(['potion']);
export function tip(id) {
  if (S.tips[id] || !TIPS[id]) return;
  S.tips[id] = true;
  if (!SILENT.has(id)) bus.emit('hint', tipText(id), URGENT.has(id));
}
// For a screen that shows the tip itself (a shop's message line): marks it seen and returns its text, once.
export function takeTip(id) {
  if (S.tips[id] || !TIPS[id]) return null;
  S.tips[id] = true;
  return tipText(id);
}

// The controls card: shown when the intro ends, at the start of a first Arena or Daily run, and in the Field Guide.
export const controlsCard = () => ['WASD MOVE  SPACE ROLL  C SNEAK  E TALK', 'J SWORD  K BOW  L SPELL  Q SWAP  R SHOUT'].map((l) => padHint(l)).join('\n');
