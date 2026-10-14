// A plain HTML panel over the game for things a 320x180 canvas cannot do well: long text to copy, pasting a save code,
// choosing a file. Styled to match the game (dark navy, pale text, pixel-ish monospace). One at a time.
let open = null;

const css = `
.ff-ov{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(5,7,14,.78);
  padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))}
.ff-ov .box{background:#1c2338;border:2px solid #4a5c86;color:#eaf2f8;font:14px/1.4 ui-monospace,Menlo,Consolas,monospace;
  width:min(640px,100%);max-height:100%;display:flex;flex-direction:column;gap:10px;padding:14px;box-sizing:border-box;box-shadow:0 0 0 2px #0b0e1a}
.ff-ov h2{margin:0;font-size:16px;color:#ffd75e;letter-spacing:1px;text-transform:uppercase}
.ff-ov p{margin:0;color:#b4c7e0;white-space:pre-wrap}
.ff-ov textarea{width:100%;box-sizing:border-box;min-height:120px;flex:1;background:#0b0e1a;color:#eaf2f8;border:1px solid #4a5c86;font:12px/1.3 ui-monospace,Menlo,Consolas,monospace;resize:vertical}
.ff-ov .row{display:flex;flex-wrap:wrap;gap:8px}
.ff-ov button,.ff-ov label.btn{background:#2e3a5c;color:#eaf2f8;border:2px solid #6d82b0;padding:8px 12px;font:inherit;cursor:pointer;text-transform:uppercase}
.ff-ov button:focus-visible,.ff-ov label.btn:focus-within{outline:2px solid #ffd75e}
.ff-ov button.main{border-color:#ffd75e}
.ff-ov .msg{color:#7ee08a;min-height:1.4em}
.ff-ov .msg.bad{color:#ff7a6e}`;

function ensureStyle() {
  if (document.getElementById('ff-ov-style')) return;
  const st = document.createElement('style'); st.id = 'ff-ov-style'; st.textContent = css; document.head.appendChild(st);
}

// opts: { title, text, area: { value, readOnly, placeholder }, file: { accept, onText }, buttons: [{ label, main, run(api) }], onClose }
// Each button's run(api) may return true to keep the panel open. api = { value(), setValue(v), say(msg, bad), close() }
export function showOverlay(opts) {
  closeOverlay();
  ensureStyle();
  const root = document.createElement('div'); root.className = 'ff-ov'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true');
  const box = document.createElement('div'); box.className = 'box'; root.appendChild(box);
  const h = document.createElement('h2'); h.textContent = opts.title || ''; box.appendChild(h);
  if (opts.text) { const p = document.createElement('p'); p.textContent = opts.text; box.appendChild(p); }
  let ta = null;
  if (opts.area) {
    ta = document.createElement('textarea'); ta.value = opts.area.value || ''; ta.readOnly = !!opts.area.readOnly; ta.placeholder = opts.area.placeholder || '';
    ta.spellcheck = false; box.appendChild(ta);
  }
  const msg = document.createElement('div'); msg.className = 'msg'; msg.setAttribute('aria-live', 'polite');
  const api = {
    value: () => (ta ? ta.value : ''),
    setValue: (v) => { if (ta) ta.value = v; },
    say: (m, bad) => { msg.textContent = m || ''; msg.className = 'msg' + (bad ? ' bad' : ''); },
    close: () => closeOverlay(),
  };
  const row = document.createElement('div'); row.className = 'row';
  if (opts.file) {
    const lab = document.createElement('label'); lab.className = 'btn'; lab.textContent = 'Choose file';
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = opts.file.accept || ''; inp.style.display = 'none';
    inp.addEventListener('change', () => { const f = inp.files?.[0]; if (!f) return; f.text().then((t) => { api.setValue(t); opts.file.onText?.(t, api); }); });
    lab.appendChild(inp); row.appendChild(lab);
  }
  for (const b of opts.buttons || []) {
    const el = document.createElement('button'); el.type = 'button'; el.textContent = b.label; if (b.main) el.className = 'main';
    el.addEventListener('click', async () => { const keep = await b.run?.(api); if (!keep) closeOverlay(); });
    row.appendChild(el);
  }
  box.appendChild(row); box.appendChild(msg);
  // keys typed here belong to the panel, not the game; Escape closes it
  root.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') closeOverlay(); });
  root.addEventListener('pointerdown', (e) => { if (e.target === root) closeOverlay(); });
  document.body.appendChild(root);
  open = { root, onClose: opts.onClose };
  (ta && !ta.readOnly ? ta : row.querySelector('button.main') || row.querySelector('button'))?.focus();
  if (ta && ta.readOnly) ta.select();
  return api;
}
export function closeOverlay() {
  if (!open) return;
  const { root, onClose } = open; open = null;
  root.remove();
  onClose?.();
}
export const overlayOpen = () => !!open;

// Copy text to the clipboard; falls back to selecting it in a panel so the player can copy by hand.
export async function copyText(text, title = 'Copy this') {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* blocked (sandboxed frame): show it instead */ }
  showOverlay({ title, text: 'Your browser blocked automatic copying. Select the text below and copy it (Ctrl+C / long-press).', area: { value: text, readOnly: true }, buttons: [{ label: 'Done', main: true }] });
  return false;
}

// Offer a text file to save; returns false when the browser or frame does not allow downloads.
export function downloadText(name, text) {
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch { return false; }
}
