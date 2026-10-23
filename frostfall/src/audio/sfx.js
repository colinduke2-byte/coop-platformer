// Frostfall's audio: chiptune effects, music and ambience, all synthesised live with Web Audio (no audio files).
// This file is the one the game imports; the parts live next to it:
//   core.js      the audio graph (channels, limiter, ducking and muffle nodes) and the tone / noise voices
//   sounds.js    every effect recipe by name          play.js     sfx.play (variation, position, rate limit)
//   songs.js     the songs, their keys and variants   music.js    the music player, crossfades, combat layer, stings
//   ambience.js  ambience layers by region / weather  hooks.js    bus listeners and the low-health / dialogue watch
//   state.js     where the player is, for music and ambience
import { settings, saveSettings } from '../systems/settings.js';
import './hooks.js';

export { settings, saveSettings };
export { setHidden, unlock, setVolume, setMusic, setChannel } from './core.js';
export { sfx } from './play.js';
export { SOUNDS } from './sounds.js';
export { music } from './music.js';
export { ambience } from './ambience.js';
