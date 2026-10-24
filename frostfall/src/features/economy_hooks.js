// Economy wiring that would otherwise close an import cycle through systems/inventory.js (docs/AGENT_RULES.md, section 8).
import { bus } from '../systems/bus.js';
import { addItem, setPickupMark } from '../systems/inventory.js';
import { upMark } from '../systems/compare.js';
import { ngLevel } from '../systems/ngplus.js';

// Pickup toasts say whether the item beats what you wear (PR-21).
setPickupMark(upMark);
// Every titled boss beaten in NG+ leaves a Winter's Echo (for the Ascended tempers, +11 and +12).
bus.on('boss:killed', (b) => { if (ngLevel() > 0 && b?.cfg?.title) { addItem('winters_echo', 1); bus.emit('toast', "A WINTER'S ECHO LINGERS", 15); } });
