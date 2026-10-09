// Humanoid-style bosses and monsters, drawn natively by the shared humanoid renderer.
// registerHumanoid(kind, STYLES entry, on-screen scale): native size is round(16 * scale).
import { registerHumanoid } from './humanoid.js';

// bosses
registerHumanoid('warlord', 'warlord', 2.4);
registerHumanoid('admiral', 'admiral', 2.5);
registerHumanoid('hollowking', 'hollowking', 2.8);
registerHumanoid('sovereign', 'sovereign', 2.8);
registerHumanoid('kragnar', 'kragnar', 2.6);
registerHumanoid('winter', 'winter', 3);
registerHumanoid('miremother', 'miremother', 2.6);
registerHumanoid('stormgiant', 'stormgiant', 2.8);
registerHumanoid('hartking', 'hartking', 2.6);
registerHumanoid('lodecolossus', 'lodecolossus', 3);
registerHumanoid('brinegut', 'brinegut', 2.4);
// large monsters
registerHumanoid('troll', 'troll', 2);
registerHumanoid('golem', 'golem', 1.7);
registerHumanoid('crystalgolem', 'golem', 1.6);
registerHumanoid('stonegiant', 'stonegiant', 2.2);
