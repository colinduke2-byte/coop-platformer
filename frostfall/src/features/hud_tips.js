// A module that should not import the tips system (a data module, a service menu) asks for a first-use tip with
// bus.emit('tip', id). The tip shows once, like any other (systems/tips.js). NP16: the gem cutter's socket screen uses it.
import { registerListener } from '../scenes/gameHooks.js';
import { tip } from '../systems/tips.js';

registerListener('tip', (sc, id) => tip(id));
