// Shop prices as pure maths (no scenes), so node tests can check them. data/services.js re-exports these.
import { ITEMS } from '../data/items.js';
import { TUNE } from '../data/tuning.js';

const value = (id) => ITEMS[id]?.value || 1;
// Shops pay half an item's value, and a quarter for bulk goods they sell in bundles, so nothing can be bought and sold
// back at a profit (PR-03; test/unit/economy.mjs scans every ware list).
export const sellPrice = (id) => Math.max(1, Math.floor(value(id) * (ITEMS[id]?.bulk ? TUNE.economy.sellBulk : TUNE.economy.sellRate)));
// The cheapest a ware can ever cost per unit (the Easy price), for the check above.
export const unitBuyFloor = (w) => (w.price * Math.min(...Object.values(TUNE.difficulty).map((d) => d.price))) / (w.n || 1);
