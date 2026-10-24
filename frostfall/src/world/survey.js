// WQ12 + WQ24: charting a region pays. Each region has three milestones: half its places found, every place found, and
// every landmark found. Reaching one says so; any chartmaker or hermit pays what is owed (gold, and for a full survey a rare
// piece of gear and the region's finished chart). The chartmakers also tell you how far your survey has come.
import { S } from '../systems/state.js';
import { getRegion } from '../data/maps.js';
import { REGIONS, REGION_ORDER } from '../data/regions.js';
import { LANDMARKS } from './discovery.js';
import { tierIn } from './worldgen.js';
import { TUNE } from '../data/tuning.js';
import { ITEMS } from '../data/items.js';
import { defineOnce } from '../util.js';

export const MILESTONES = ['half', 'landmarks', 'full'];
export function surveyOf(rid) {
  const map = REGIONS[rid].map, pois = getRegion(rid).pois, seen = (p) => !!S.discovered?.[map + ':' + p.id];
  const lms = pois.filter((p) => LANDMARKS.has(p.kind));
  return { found: pois.filter(seen).length, total: pois.length, lmFound: lms.filter(seen).length, lmTotal: lms.length };
}
export function reached(rid) {
  const s = surveyOf(rid), out = [];
  if (s.found * 2 >= s.total) out.push('half');
  if (s.lmTotal && s.lmFound >= s.lmTotal) out.push('landmarks');
  if (s.found >= s.total) out.push('full');
  return out;
}
const book = () => (S.flags.survey ||= {});
// milestones just reached in region rid (announced once each); call after a discovery
export function newMilestones(rid) {
  const b = (book()[rid] ||= {}), fresh = reached(rid).filter((m) => !b[m]);
  for (const m of fresh) b[m] = 'owed';
  return fresh;
}
export const owed = () => Object.entries(book()).flatMap(([rid, b]) => MILESTONES.filter((m) => b[m] === 'owed').map((m) => [rid, m]));
// gold for a milestone of a region (its tier is the tier at its entrance)
export function payOf(rid, m) {
  const P = TUNE.world.survey, st = REGION_ORDER.includes(rid) ? tierIn(rid, 12, 64) : 0;
  return { gold: P[m][0] + P[m][1] * st, tier: st, gear: m === 'full' };
}
export const markPaid = (rid, m) => { book()[rid][m] = 'paid'; };
export const fullySurveyed = () => Object.values(book()).filter((b) => b.full).length;

// WQ24: the finished chart of each fully surveyed region, framed: a keepsake item the chartmaker hands over with the full
// survey's pay, hung on the house Trophy Wall (features/world.js draws it there). One colour per region for the frame.
export const CHART_COL = { reach: 8, ashen: 11, coast: 15, kingdom: 2, fens: 9, highlands: 3, glasswood: 14, underdeep: 12, vale: 13, sunscorch: 10 };
export const chartId = (rid) => 'chart_' + rid;
for (const rid of REGION_ORDER) defineOnce(ITEMS, chartId(rid), { name: `Chart: ${REGIONS[rid].name.replace(/^The /, '')}`, type: 'quest', icon: ['scroll', CHART_COL[rid]], value: 0, desc: `The finished chart of ${REGIONS[rid].name}, every place on it, framed in a chartmaker's frame. It hangs on the Trophy Wall at home.` }, 'ITEMS');
// regions whose chart hangs on the wall: you hold the chart, or a full survey was paid (an older save, before charts were given)
export const framedCharts = () => REGION_ORDER.filter((rid) => (S.inv?.[chartId(rid)] || 0) > 0 || book()[rid]?.full === 'paid');
