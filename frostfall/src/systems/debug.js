// Bug-report helpers: a small ring buffer of recent errors and a "copy debug info" report (F4).
import { S } from './state.js';
import { settings } from './settings.js';

const errors = [];
export function installErrorLog() {
  const push = (m) => { errors.push(`${new Date().toISOString().slice(11, 19)} ${String(m).slice(0, 300)}`); if (errors.length > 12) errors.shift(); };
  let lastToast = -1e9;
  // The game keeps going after a stray error; tell the player once a minute so a bug report can be sent.
  const note = () => { const now = Date.now(); if (now - lastToast > 60000) { lastToast = now; import('./bus.js').then(({ bus }) => bus.emit('toast', 'SOMETHING WENT WRONG. THE GAME KEPT GOING. F4 COPIES A REPORT', 11)); } };
  window.addEventListener('error', (e) => { push(e.message + (e.filename ? ` @${e.filename.split('/').pop()}:${e.lineno}` : '')); note(); });
  window.addEventListener('unhandledrejection', (e) => { push('promise: ' + (e.reason?.message || e.reason)); note(); });
}
export const recentErrors = () => errors.slice();

export function debugInfo(scene) {
  const gs = scene?.scene?.get?.('Game');
  const lines = [
    'FROSTFALL DEBUG INFO',
    `time: ${new Date().toISOString()}`,
    `seed: ${S.seed}  ng+: ${S.ngPlus || 0}  map: ${gs?.mapId || S.map}  playtime: ${Math.round(S.playtime || 0)}s`,
    `hp ${Math.round(S.hp)}/${S.maxHp}  mp ${Math.round(S.mp)}/${S.maxMp}  sp ${Math.round(S.sp)}/${S.maxSp}  level ${S.charLevel || 1}  gold ${S.gold}`,
    `player: ${gs?.player ? Math.round(gs.player.x) + ',' + Math.round(gs.player.y) + ' mode ' + gs.player.mode : 'n/a'}`,
    `enemies live ${gs?.enemies?.getLength?.() ?? '?'}  pending ${gs?.pend?.length ?? '?'}  boss ${gs?.boss ? gs.boss.kind + (gs.boss.engaged ? ' engaged' : '') : 'none'}`,
    `fps ${Math.round(scene?.game?.loop?.actualFps || 0)}  renderer ${scene?.game?.config?.renderType === 2 ? 'webgl' : 'canvas'}  difficulty ${settings.difficulty}`,
    `flags: ${Object.keys(S.flags || {}).filter((k) => S.flags[k] === true).join(' ')}`,
    `status: ${Object.keys(gs?.player?.statuses || {}).join(' ') || 'none'}`,
    `recent errors (${errors.length}):`,
    ...errors.map((e) => '  ' + e),
    `agent: ${navigator.userAgent}`,
  ];
  return lines.join('\n');
}

export async function copyDebugInfo(scene) {
  const text = debugInfo(scene);
  try { await navigator.clipboard.writeText(text); return true; } catch { window.__debugInfo = text; return false; }
}
