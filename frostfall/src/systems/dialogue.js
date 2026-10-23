import { ui } from './ui.js';

// The HUD scene owns the dialogue box; scripts talk to it through this tiny API.
//   await runScript(async () => { await say('Bjorn', 'Hello.'); const c = await choose(['Yes', 'No']); ... });
// One conversation runs at a time: a second runScript waits until the first has finished (CH6), so it can never orphan it.
// Don't call runScript from inside a script (it would wait for itself); call say / choose or the helper directly.
// A conversation cut off by a map change, a death or a HUD relaunch is cancelled (cancelScript): the say / choose it is
// waiting on rejects with Cancelled, which runScript swallows, so the rest of the script does not run.
// runScript resolves to true when the script ran to its end, false when it was cancelled (or dropped from the queue).
export const dialogue = { hud: null };

export class Cancelled extends Error {
  constructor() { super('conversation cancelled'); this.name = 'Cancelled'; }
}
const isCancel = (e) => e instanceof Cancelled || e?.name === 'Cancelled';

let current = null;                 // the running script: { cancelled }; null again as soon as it ends or is cancelled
let waiting = [];                   // scripts queued behind it: resolvers of "your turn" (true) or "dropped" (false)

export const say = (name, text) => dialogue.hud.say(name, text);
export const choose = (opts) => dialogue.hud.choose(opts);
export const scriptRunning = () => !!current;

export function runScript(fn) {
  if (!current) return start(fn);
  return new Promise((turn) => waiting.push(turn)).then((go) => (go ? runScript(fn) : false));
}

// async: runs fn synchronously up to its first await, exactly like the old runScript did
async function start(fn) {
  const me = { cancelled: false };
  current = me;
  const release = ui.hold('script');
  let finished = false;
  try { await fn(); finished = !me.cancelled; } catch (e) { if (!isCancel(e)) throw e; } finally {
    if (current === me) {
      current = null;
      if (!me.cancelled) dialogue.hud?.hideBox();
    }
    release();
    if (!current && waiting.length) waiting.shift()(true);
  }
  return finished;
}

// Cut the running conversation off (and drop any queued behind it). Safe to call when nothing runs.
export function cancelScript() {
  const q = waiting; waiting = [];
  if (current) { current.cancelled = true; current = null; }   // a script stuck on something else never holds up the next one
  dialogue.hud?.hideBox?.();
  for (const turn of q) turn(false);
}
