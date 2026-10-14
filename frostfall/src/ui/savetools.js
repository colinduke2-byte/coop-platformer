// "Saves and bug report" panel (title Options and Pause > System): export a save as a file or a code, import one,
// copy a bug report. Plain HTML so text can be pasted and files chosen.
import { showOverlay, downloadText, copyText } from './overlay.js';
import { exportSave, importSave, toCode, SLOTS, storage, slotState } from '../systems/save.js';
import { settings } from '../systems/settings.js';
import { debugInfo } from '../systems/debug.js';

export function openSaveTools(scene, { onImported } = {}) {
  const slot = settings.slot;
  const stamp = new Date().toISOString().slice(0, 10);
  const note = storage.ok ? '' : '\nThis browser is blocking saved data, so export is the only way to keep your progress.';
  showOverlay({
    title: 'Saves and bug report',
    text: `Slot ${slot} of ${SLOTS} (${slotState(slot)}). Export keeps a copy of your progress outside the browser: a file, or a code you can paste anywhere (a note, an email to yourself). Import puts a save into slot ${slot}; the old one stays as its backup.${note}`,
    area: { value: '', placeholder: 'Paste a save code or file contents here to import' },
    file: { accept: '.json,.txt,application/json,text/plain' },
    buttons: [
      { label: 'Export file', run: (api) => { const t = exportSave(slot); if (!t) { api.say('Nothing to export in this slot yet.', true); return true; } api.say(downloadText(`frostfall-slot${slot}-${stamp}.json`, t) ? 'Downloaded (if your browser allows downloads here). The code below works too.' : 'Downloads are blocked here: copy the code below.'); api.setValue(toCode(t)); return true; } },
      { label: 'Copy save code', run: async (api) => { const t = exportSave(slot); if (!t) { api.say('Nothing to export in this slot yet.', true); return true; } const code = toCode(t); api.setValue(code); try { await navigator.clipboard.writeText(code); api.say('Save code copied.'); } catch { api.say('Select the code in the box and copy it.', true); } return true; } },
      { label: `Import into slot ${slot}`, main: true, run: (api) => { const err = importSave(api.value(), slot); if (err) { api.say(err, true); return true; } api.say(`Imported into slot ${slot}.`); onImported?.(slot); return true; } },
      { label: 'Copy bug report', run: async () => { await copyText(debugInfo(scene), 'Bug report'); return true; } },
      { label: 'Close' },
    ],
  });
}
