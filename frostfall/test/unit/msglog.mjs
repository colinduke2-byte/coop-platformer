// Node test for systems/msglog.js (CH18: an untested module). The journal's LOG keeps what the game said: toasts and
// spoken lines from the bus, repeats folded into one line with a count, at most 80 lines, cleared for a new character.
import assert from 'node:assert/strict';
import { bus } from '../../src/systems/bus.js';
import { logLines, logStamp, logLine } from '../../src/systems/msglog.js';
import { resetState } from '../../src/systems/state.js';

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('  ok   ' + name); };

t('a toast and a spoken line are logged from the bus', () => {
  const s0 = logStamp();
  bus.emit('toast', 'A BLIZZARD ROLLS IN', 15);
  bus.emit('say', 'Bjorn', 'Mind the wolves.');
  const L = logLines().slice(-2);
  assert.deepEqual(L.map((l) => [l.kind, l.text, l.col]), [['toast', 'A BLIZZARD ROLLS IN', 15], ['say', 'Bjorn: Mind the wolves.', 13]]);
  assert.ok(logStamp() > s0);
});
t('a repeat folds into the last line with a count; blank text is ignored', () => {
  const len = logLines().length;
  logLine('toast', 'SAVED'); logLine('toast', '  SAVED  '); logLine('toast', '   ');
  assert.equal(logLines().length, len + 1);
  assert.equal(logLines().at(-1).n, 2);
});
t('at most 80 lines are kept, the oldest dropped', () => {
  for (let i = 0; i < 100; i++) logLine('toast', 'LINE ' + i);
  assert.equal(logLines().length, 80);
  assert.equal(logLines().at(-1).text, 'LINE 99');
  assert.equal(logLines()[0].text, 'LINE 20');
});
t('a new character starts with an empty log', () => {
  resetState();
  assert.equal(logLines().length, 0);
});
console.log(`MSGLOG PASSED (${n} tests)`);
