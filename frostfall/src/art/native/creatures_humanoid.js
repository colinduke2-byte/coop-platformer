// Humanoid-style large monsters drawn by the shared humanoid renderer (the bosses have their own hand-designed art in bosses_*.js).
// registerHumanoid(kind, STYLES entry, on-screen scale): native size is round(16 * scale).
import { registerHumanoid } from './humanoid.js';

registerHumanoid('troll', 'troll', 2);
registerHumanoid('golem', 'golem', 1.7);
registerHumanoid('crystalgolem', 'golem', 1.6);
registerHumanoid('stonegiant', 'stonegiant', 2.2);
