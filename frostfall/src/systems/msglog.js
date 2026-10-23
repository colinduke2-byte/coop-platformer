// A short memory of what the game told you: toasts, spoken lines and conversation lines, newest last. Read in the journal
// (Quests tab > LOG), so a message that flashed past in a fight is never lost. Not saved: it is about this session.
import { bus } from './bus.js';
import { onStateReset } from './state.js';

const MAX = 80;
const lines = [];
let stamp = 0;
export function logLine(kind, text, col = 6) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return;
  const last = lines[lines.length - 1];
  if (last && last.text === t && last.kind === kind) { last.n++; last.at = Date.now(); stamp++; return; }
  lines.push({ kind, text: t, col, n: 1, at: Date.now() });
  if (lines.length > MAX) lines.shift();
  stamp++;
}
export const logLines = () => lines;
export const logStamp = () => stamp;
onStateReset(() => { lines.length = 0; stamp++; });       // another character's messages are not yours (CH8)
bus.on('toast', (text, col) => logLine('toast', text, col ?? 6));
bus.on('say', (who, text) => logLine('say', `${who}: ${text}`, 13));
