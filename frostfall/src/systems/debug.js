// Bug reports and crash safety: a ring buffer of recent errors (with stacks), a guard that keeps the game loop alive when
// one scene throws, a crash card when an error keeps repeating, and the "copy bug report" text.
import { S } from './state.js';
import { settings } from './settings.js';
import { VERSION, BUILD } from '../config.js';
import { bus } from './bus.js';
import { copyText } from '../ui/overlay.js';

const errors = [];
const stackOf = (e) => (e?.stack ? String(e.stack).split('\n').slice(1, 7).map((l) => l.trim()).join(' | ') : '');
function push(m, err) {
  const line = `${new Date().toISOString().slice(11, 19)} ${String(m).slice(0, 300)}${err ? '  [' + stackOf(err).slice(0, 600) + ']' : ''}`;
  if (errors.length && errors[errors.length - 1].slice(9) === line.slice(9)) return;      // the same error every frame: keep one
  errors.push(line); if (errors.length > 12) errors.shift();
}

let lastToast = -1e9;
const note = () => {
  const now = Date.now();
  if (now - lastToast > 60000) { lastToast = now; bus.emit('toast', 'SOMETHING WENT WRONG. THE GAME KEPT GOING. SYSTEM > BUG REPORT', 11); }
};

export function installErrorLog() {
  window.addEventListener('error', (e) => { push(e.message + (e.filename ? ` @${e.filename.split('/').pop()}:${e.lineno}:${e.colno}` : ''), e.error); note(); });
  window.addEventListener('unhandledrejection', (e) => { push('promise: ' + (e.reason?.message || e.reason), e.reason); note(); });
}
export const recentErrors = () => errors.slice();

// ---- keep the loop alive: Phaser schedules the next frame only after a step returns, so one throw would freeze the game.
// Each scene's step runs in its own try/catch (one broken scene does not stop the others from updating and drawing), and
// the whole game step is guarded as well. An error that keeps repeating shows the crash card.
const burst = { n: 0, since: 0, card: false };
function caught(e, where) {
  push(`${where}: ${e?.message || e}`, e);
  console.error(`[${where}]`, e);           // still reported to the console (and to the automated tests)
  note();
  const now = performance.now();
  if (now - burst.since > 3000) { burst.since = now; burst.n = 0; }
  if (++burst.n >= 30 && !burst.card) { burst.card = true; try { crashHandler?.(e); } catch { /* the card itself must never throw */ } }
}
let crashHandler = null;                       // set by main.js (ui/crash.js), kept out of here to avoid an import cycle
export const onCrash = (fn) => { crashHandler = fn; };
export const crashReset = () => { burst.card = false; burst.n = 0; };
export function guardGame(Phaser, game) {
  const Systems = Phaser.Scenes.Systems.prototype;
  if (!Systems.__guarded) {
    const step = Systems.step;
    Systems.step = function (time, delta) { try { step.call(this, time, delta); } catch (e) { caught(e, this.settings?.key || 'scene'); } };
    const render = Systems.render;
    Systems.render = function (renderer) { try { render.call(this, renderer); } catch (e) { caught(e, (this.settings?.key || 'scene') + ' draw'); } };
    Systems.__guarded = true;
  }
  // the loop binds game.step when it starts (after boot), so wrapping the method now guards every frame
  const step = game.step;
  game.step = function (time, delta) { try { step.call(this, time, delta); } catch (e) { caught(e, 'loop'); } };
}

export function debugInfo(scene) {
  const gs = scene?.scene?.get?.('Game');
  let saveBytes = 0, storageState = '?';
  try { let n = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k?.startsWith('frostfall')) n += (localStorage.getItem(k) || '').length; } saveBytes = n; storageState = 'ok'; } catch { storageState = 'blocked'; }
  const set = { ...settings }; delete set.keys; delete set.padMap;
  const lines = [
    'FROSTFALL BUG REPORT',
    `version: ${VERSION}  build: ${BUILD}`,
    `time: ${new Date().toISOString()}`,
    `seed: ${S.seed}  ng+: ${S.ngPlus || 0}  map: ${gs?.mapId || S.map}  playtime: ${Math.round(S.playtime || 0)}s  ${S.daily ? 'daily' : S.quick ? 'arena' : 'campaign'}`,
    `hp ${Math.round(S.hp)}/${S.maxHp}  mp ${Math.round(S.mp)}/${S.maxMp}  sp ${Math.round(S.sp)}/${S.maxSp}  level ${S.charLevel || 1}  gold ${S.gold}`,
    `player: ${gs?.player ? Math.round(gs.player.x) + ',' + Math.round(gs.player.y) + ' mode ' + gs.player.mode : 'n/a'}`,
    `enemies live ${gs?.enemies?.getLength?.() ?? '?'}  pending ${gs?.pend?.length ?? '?'}  boss ${gs?.boss ? gs.boss.kind + (gs.boss.engaged ? ' engaged' : '') : 'none'}`,
    `fps ${Math.round(scene?.game?.loop?.actualFps || 0)}  renderer ${scene?.game?.config?.renderType === 2 ? 'webgl' : 'canvas'}  screen ${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
    `storage ${storageState}  saved bytes ${saveBytes}`,
    `settings: ${JSON.stringify(set)}`,
    `flags: ${Object.keys(S.flags || {}).filter((k) => S.flags[k] === true).join(' ')}`,
    `status: ${Object.keys(gs?.player?.statuses || {}).join(' ') || 'none'}`,
    `recent errors (${errors.length}):`,
    ...errors.map((e) => '  ' + e),
    `agent: ${navigator.userAgent}`,
  ];
  return lines.join('\n');
}

// Copies the report; when the browser blocks the clipboard, shows it in a panel to copy by hand.
export async function copyDebugInfo(scene) {
  const text = debugInfo(scene);
  console.log(text);
  window.__debugInfo = text;
  return copyText(text, 'Bug report');
}
