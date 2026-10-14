// The crash card: shown when the same error keeps happening every frame. The game state is written to a separate
// rescue save first (never over a slot), so nothing is lost; the title screen offers to load it.
import { showOverlay } from './overlay.js';
import { writeRescue } from '../systems/save.js';
import { debugInfo, crashReset } from '../systems/debug.js';

export function showCrash(err) {
  const rescued = writeRescue();
  const game = window.__ff?.game;
  const report = debugInfo(game?.scene?.getScene?.('Hud') || game?.scene?.getScene?.('Title'));
  showOverlay({
    title: 'Something broke',
    text: `The game hit an error it cannot get past (${String(err?.message || err).slice(0, 120)}).\n`
      + (rescued ? 'Your progress up to this moment was kept in a rescue save: the title screen will offer it.\n' : '')
      + 'Copy the report below and send it to the developer, then reload.',
    area: { value: report, readOnly: true },
    buttons: [
      { label: 'Copy report', run: async (api) => { try { await navigator.clipboard.writeText(report); api.say('Copied.'); } catch { api.say('Select the text and copy it by hand.', true); } return true; } },
      { label: 'Reload', main: true, run: () => { location.reload(); return true; } },
      { label: 'Keep trying', run: () => { crashReset(); } },
    ],
  });
}
