// Economy wiring that would otherwise close an import cycle through systems/inventory.js (docs/AGENT_RULES.md, section 8).
import { bus } from '../systems/bus.js';
import { addItem, setPickupMark } from '../systems/inventory.js';
import { gearMark } from '../ui/gearCompare.js';
import { ngLevel } from '../systems/ngplus.js';

// Pickup toasts say whether the item beats what you wear (PR-21).
// the pickup toast's mark is the pack card's verdict (▲ better, ▼ worse, ◆ mixed), so the two never disagree
setPickupMark((id) => ({ 1: ' ▲', '-1': ' ▼', 2: ' ◆' })[gearMark(id)] || '');
// Every titled boss beaten in NG+ leaves a Winter's Echo (for the Ascended tempers, +11 and +12).
bus.on('boss:killed', (b) => { if (ngLevel() > 0 && b?.cfg?.title) { addItem('winters_echo', 1); bus.emit('toast', "A WINTER'S ECHO LINGERS", 15); } });
