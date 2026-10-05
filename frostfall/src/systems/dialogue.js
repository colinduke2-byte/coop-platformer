import { ui } from './ui.js';

// The HUD scene owns the dialogue box; scripts talk to it through this tiny API.
export const dialogue = { hud: null };
export const say = (name, text) => dialogue.hud.say(name, text);
export const choose = (opts) => dialogue.hud.choose(opts);

export async function runScript(fn) {
  ui.modal = true;
  try { await fn(); } finally {
    dialogue.hud?.hideBox();
    ui.modal = false;
  }
}
