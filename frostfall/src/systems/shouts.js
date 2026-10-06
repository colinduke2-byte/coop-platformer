// Shouts: Force is always known; the other four are granted by the Hearts of the Hollow Kings.
import { S } from './state.js';
export const SHOUT_ORDER = ['force', 'frost', 'cry', 'surge', 'grasp', 'fire', 'cinderstep', 'hearthcall'];
const NEED = { frost: 'rime', cry: 'iron', surge: 'tide', grasp: 'root' };
export const shoutUnlocked = (id) => id === 'force' || (id === 'fire' ? !!S.flags?.dragonDead : id === 'cinderstep' ? !!S.flags?.kragnarDead : id === 'hearthcall' ? !!S.flags?.sovereignDead : !!S.hearts?.[NEED[id]]);
export const unlockedShouts = () => SHOUT_ORDER.filter(shoutUnlocked);
export const currentShout = () => (S.shout && shoutUnlocked(S.shout) ? S.shout : 'force');
