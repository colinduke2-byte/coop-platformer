// The three powers of Emberhold. Reputation runs 0..100 each; helping the Anvil Court costs a little goodwill with the Delvers (and back).
import { S } from '../systems/state.js';
import { bus } from '../systems/bus.js';

export const FACTIONS = {
  anvil: { id: 'anvil', name: 'The Anvil Court', short: 'ANVIL COURT', col: 12, rival: 'delvers', blurb: 'Rulers and master smiths of Emberhold.' },
  delvers: { id: 'delvers', name: "The Delvers' Guild", short: 'DELVERS', col: 8, rival: 'anvil', blurb: 'Miners and tunnel-wardens of the Deep Mines.' },
  wardens: { id: 'wardens', name: 'The Ember Wardens', short: 'WARDENS', col: 15, rival: null, blurb: "The city's soldiers and the road's guardians." },
};
export const FACTION_IDS = Object.keys(FACTIONS);
export const REP_TIERS = [[0, 'STRANGER'], [20, 'KNOWN'], [45, 'TRUSTED'], [75, 'HONOURED']];

export const rep = (id) => Math.max(0, Math.min(100, Math.round(S.rep?.[id] || 0)));
export const repTier = (id) => { const v = rep(id); let t = REP_TIERS[0][1]; for (const [min, name] of REP_TIERS) if (v >= min) t = name; return t; };
export const repAtLeast = (id, n) => rep(id) >= n;
export function addRep(id, n, quiet = false) {
  if (!FACTIONS[id]) return;
  S.rep = S.rep || { anvil: 0, delvers: 0, wardens: 0 };
  const before = repTier(id);
  S.rep[id] = Math.max(0, Math.min(100, (S.rep[id] || 0) + n));
  const rv = FACTIONS[id].rival;
  if (rv && n > 0) S.rep[rv] = Math.max(0, (S.rep[rv] || 0) - n / 4);
  if (!quiet) {
    bus.emit('toast', `${FACTIONS[id].short} ${n >= 0 ? '+' : ''}${n}`, FACTIONS[id].col);
    if (repTier(id) !== before) bus.emit('toast', `${FACTIONS[id].short}: ${repTier(id)}`, 15);
  }
}
// The house that will stand with you in the final fight: the highest standing of 45+ (ties go to the Court, then the Guild).
export function bestHelp() {
  let best = null;
  for (const f of ['anvil', 'delvers', 'wardens']) if (rep(f) >= 45 && (!best || rep(f) > rep(best))) best = f;
  return best;
}
