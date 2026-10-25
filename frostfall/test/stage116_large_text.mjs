// UI finish: LARGE TEXT (A1) in the HUD and the menus, with the overflow audit in both modes; the Perks tab's skill-up
// line and help line (NP18); sockets explained on first use (NP16); the quest diamond clear of the hint plate; the intro's
// fade from white (VX-25); no download button inside the artifact viewer.
//   node test/stage116_large_text.mjs
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=amberwell&spawn=entry&seed=4242');
await h.sleep(1500);
const G = (fn, a) => h.ev(fn, a);
const W = 320, H = 180;
await G(async () => {
  const S = window.__ff.S, { ITEMS } = await import('/src/data/items.js'), { addItem } = await import('/src/systems/inventory.js');
  await import('/src/data/items4.js');
  window.__bus = (await import('/src/systems/bus.js')).bus;
  window.__set = (await import('/src/systems/settings.js')).settings;
  S.flags.introDone = true; S.flags.tutDone = true; S.gold = 987654; S.charLevel = 12; S.skillUps = 34; S.perkPoints = 2;
  const long = Object.keys(ITEMS).filter((id) => !ITEMS[id].gen).sort((a, b) => ITEMS[b].name.length - ITEMS[a].name.length).slice(0, 40);
  for (const id of long) addItem(id, ['potion', 'ingredient', 'food', 'ammo', 'misc'].includes(ITEMS[id].type) ? 99 : 1, true);
  addItem('bramble_blade', 1, true);
  S.sockets = {};
});

// ---- the menu, every tab, in both modes: nothing off screen, help lines whole
const auditMenu = (big) => G(async ([big, W, H]) => {
  window.__set.largeText = big;
  const g = window.__ff.game.scene.getScene('Game'); g.openMenu(0);
  await window.__ffStep.frames(4, 16.7);
  const m = window.__ff.game.scene.getScene('Menu'), bad = [], helps = [];
  const { helpPages } = await import('/src/scenes/MenuScene.js');
  for (let i = 0; i < m.tabs.length; i++) for (let s = 0; s < Math.max(1, m.subsOf(i).length); s++) {
    m.go(i); if (m.subsOf(i).length) m.setSub(i, s, true); m.draw();
    for (let k = 0; k < 3; k++) {
      if (k) { m.cursor = (m.cursor || 0) + 4; m.draw(); }
      for (const t of m.dyn.list) {
        if (!t.text || !t.getBounds) continue;
        const b = t.getBounds();
        if (b.right > W - 3 || b.bottom > H - 1) bad.push(`${m.tabs[i].name}: "${String(t.text).slice(0, 24)}" ends at ${Math.round(b.right)},${Math.round(b.bottom)}`);
        if (big && b.y >= H - 20 && b.y < H - 3) bad.push(`${m.tabs[i].name}: "${String(t.text).slice(0, 24)}" sits under the big help strip`);
      }
      if (big) {
        const pages = m.helpList || [];
        if (!pages.length) bad.push(m.tabs[i].name + ': no big help line');
        for (const p of pages) { m.helpBig.setText(p); const b = m.helpBig.getBounds(); if (b.right > W - 30) bad.push(`${m.tabs[i].name}: big help "${p}" ends at ${Math.round(b.right)}`); }
        helps.push(...pages);
        if (helpPages('A/D TAB  ESC').join('|') !== 'A/D TAB  ESC CLOSE') bad.push('a bare ESC is not spelt out');
      } else {
        const help = m.dyn.list.filter((t) => t.y === H - 12).map((t) => t.text).join(' ');
        if (help.includes('…')) bad.push(`${m.tabs[i].name}: help line cut: ${help}`);
        helps.push(help);
      }
    }
  }
  m.updateBigHelp();
  const shown = { big: m.helpBig.visible, font: m.helpBig.font };
  window.__ff.game.scene.stop('Menu');
  return { bad, helps, shown };
}, [big, W, H]);
const norm = await auditMenu(false);
check('normal text: no menu text off screen, no help line cut (A1, NP18)', norm.bad.length === 0, '\n    ' + norm.bad.slice(0, 20).join('\n    '));
check('normal text: the menu draws no big help line (the default look is unchanged)', !norm.shown.big, JSON.stringify(norm.shown));
check('every tab\'s help line says how to close it (NP18)', norm.helps.every((x) => /ESC|B CLOSE/.test(x)), norm.helps.filter((x) => !/ESC/.test(x)).join(' | '));
await h.frames(5);
const large = await auditMenu(true);
check('large text: no menu text off screen or under the help strip, every help page fits (A1)', large.bad.length === 0, '\n    ' + large.bad.slice(0, 20).join('\n    '));
check('large text: the help line is drawn in the 2x font', large.shown.big && /^g\d+$/.test(large.shown.font), JSON.stringify(large.shown));
await G(() => { window.__set.largeText = false; });
await h.frames(5);
const longHints = await G(async () => { const { HINTS } = await import('/src/scenes/menuSystem.js'); return Object.values(HINTS).filter((x) => (x + '  ESC CLOSE').length > 51); });
check('every SYSTEM row hint fits on the help line with ESC CLOSE (NP18)', longHints.length === 0, longHints.join(' | '));

// ---- NP18: the Perks tab says what skill-ups are for; NP16: a socketed item explains sockets until a gem is first set
const perks = await G(async () => {
  const g = window.__ff.game.scene.getScene('Game'); g.openMenu(0);
  await window.__ffStep.frames(4, 16.7);
  const m = window.__ff.game.scene.getScene('Menu');
  m.go(m.tabs.findIndex((t) => t.name === 'PERKS')); m.draw();
  const perksText = m.dyn.list.map((t) => t.text || '').join('|');
  m.go(0); m.setSub(0, 0, true); const l = m.inventory(); m.cursor = l.indexOf('bramble_blade'); m.scroll = Math.max(0, m.cursor - 2); m.info = true; m.draw();   // its description (G)
  const before = m.dyn.list.map((t) => t.text || '').join(' ');
  window.__ff.S.sockets = { some_sword: ['gem_ruby', null] }; m.draw();
  const after = m.dyn.list.map((t) => t.text || '').join(' ');
  window.__ff.S.sockets = {};
  window.__ff.game.scene.stop('Menu');
  return { perksText, before, after };
});
check('the Perks tab explains skill-ups: NEXT: n SKILL LEVELS, no bare SKILL-UPS count (NP18)', /NEXT: 2 SKILL LEVELS/.test(perks.perksText) && !/SKILL-UPS \d/.test(perks.perksText), perks.perksText.slice(-200));
check('a socketed item says what sockets are and where gems go, until a gem is set (NP16)', /SOCKETS 0\/2: A\s+SET GEM/.test(perks.before) && /SOCKETS 0\/2\./.test(perks.after) && !/TAMSIN/.test(perks.after), perks.before.slice(-160) + ' || ' + perks.after.slice(-120));
await h.frames(5);
const sockTip = await G(async () => { delete window.__ff.S.tips.socket; const hd = window.__ff.game.scene.getScene('Hud'); hd.hint?.destroy(); hd.hint = null; hd.hintQ = []; window.__bus.emit('tip', 'socket'); return hd.hintText; });
check('the gem cutter\'s socket screen explains sockets the first time (bus tip, NP16)', /SOCKETS HOLD GEMS/.test(sockTip || ''), sockTip);

// ---- the HUD's important text in both modes
const hudAudit = (big) => G(async ([big, W, H]) => {
  window.__set.largeText = big;
  const hd = window.__ff.game.scene.getScene('Hud');
  hd.hint?.destroy(); hd.hint = null; hd.hintQ = []; hd.toasts.forEach((t) => t.t.destroy()); hd.toasts = []; hd.sub = null;
  window.__bus.emit('hint', 'NAME COLOURS SHOW HOW HARD A FOE IS FOR YOU:\nGREEN EASY, WHITE FAIR, YELLOW TOUGH, ORANGE DEADLY, RED HOPELESS.');
  window.__bus.emit('toast', 'DROPPED FLAWLESS BLOODSTONE: IT STAYS HERE UNTIL YOU LEAVE', 12);
  window.__bus.emit('toast', 'FOUND 12 GOLD', 13);
  await window.__ffStep.frames(3, 16.7);
  const bad = [], box = (o, what) => { const b = o.getBounds(); if (b.x < 0 || b.right > W || b.y < 0 || b.bottom > H) bad.push(`${what} "${String(o.text).slice(0, 20)}" at ${Math.round(b.x)}..${Math.round(b.right)}, ${Math.round(b.y)}..${Math.round(b.bottom)}`); return b; };
  const hb = box(hd.hint, 'hint');
  hd.toasts.forEach((t) => box(t.t, 'toast'));
  const fonts = { hint: hd.hint.font, toast: hd.toasts[0].t.font };
  // a toast never prints over the hint
  for (const t of hd.toasts) if (t.t.visible) { const b = t.t.getBounds(); if (b.y < hb.bottom && b.bottom > hb.y && b.right > hb.x) bad.push('a toast overlaps the hint'); }
  // a spoken line
  hd.hint.destroy(); hd.hint = null; hd.hintRect = null; hd.toasts.forEach((t) => t.t.destroy()); hd.toasts = [];
  window.__bus.emit('say', 'A COLD VOICE', 'Dreamer. You woke at last. I kept your name for you, down in the dark under the pines.');
  await window.__ffStep.frames(30, 16.7);
  box(hd.subTxt, 'spoken line'); box(hd.subWho, 'speaker');
  hd.sub = null;
  await window.__ffStep.frames(2, 16.7);
  // a conversation: every page within the box, two big lines or three small
  const p = hd.say('Elder Sigrid', 'You have gone pale. You heard it too, then. Sit, and listen. The winter came from the north, and it has not left since the night the bells stopped.');
  await window.__ffStep.frames(2, 16.7);
  const pages = hd.dlg.pages.map((x) => x.split('\n').length);
  hd.dlg.n = hd.dlg.pages[0].length;
  await window.__ffStep.frames(2, 16.7);
  box(hd.dBody, 'dialogue'); box(hd.dName, 'name');
  const top = H - 6 - (big ? 56 : 52);
  if (hd.dBody.getBounds().bottom > H - 16) bad.push('dialogue text runs into the key hints');
  if (hd.dBody.y < top) bad.push('dialogue text above its box');
  hd.hideBox(); p.catch(() => {});
  const c = hd.choose(['Ask about the wolves on the north trail and the old lodge', 'Ask about the lodge', 'Buy supplies', 'Leave']);
  await window.__ffStep.frames(3, 16.7);
  hd.dChoice.forEach((t) => { if (t.text) box(t, 'choice'); });
  const rows = hd.choiceRows.length;
  hd.hideBox(); c.catch(() => {});
  await window.__ffStep.frames(2, 16.7);
  return { bad, fonts, pages, rows };
}, [big, W, H]);
const hn = await hudAudit(false);
check('normal text: hints, toasts, spoken lines and dialogue stay on screen', hn.bad.length === 0, hn.bad.join('\n    '));
check('normal text: the HUD keeps its small font and three-line pages (default unchanged)', hn.fonts.hint === 'f5' && /^f/.test(hn.fonts.toast) && hn.pages[0] === 3 && hn.rows === 5, JSON.stringify(hn));
await h.shot('s116_normal_hud');
const hl = await hudAudit(true);
check('large text: hints, toasts, spoken lines and dialogue stay on screen and apart (A1)', hl.bad.length === 0, hl.bad.join('\n    '));
check('large text: the HUD text is in the 2x font, two lines a page, three choice lines', hl.fonts.hint === 'g5' && /^g/.test(hl.fonts.toast) && hl.pages.every((n) => n <= 2) && hl.rows === 3, JSON.stringify(hl));
// screenshots of the large mode
await G(() => { window.__bus.emit('hint', 'OPEN THE PACK AND SPEND YOUR PERK POINT\nON THE PERKS TAB.'); window.__bus.emit('toast', 'QUEST UPDATED: SPEAK TO BJORN AT THE LODGE', 13); });
await h.sleep(300);
await h.shot('s116_large_hud');
await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); hd.say('Elder Sigrid', 'You have gone pale. You heard it too, then. Sit, and listen.').catch(() => {}); hd.dlg.n = 999; });
await h.sleep(300);
await h.shot('s116_large_dialogue');
await G(() => { const hd = window.__ff.game.scene.getScene('Hud'); hd.hideBox(); hd.hint?.destroy(); hd.hint = null; hd.hintRect = null; window.__set.largeText = false; });
await h.frames(3);

// ---- the quest diamond steps out from under the hint plate
const mk = await G(() => {
  const hd = window.__ff.game.scene.getScene('Hud'), gs = hd.gs, cam = gs.cameras.main.worldView;
  const sx = 160, sy = 70;                                  // a target on screen whose diamond would sit at y 54
  const T = { map: gs.mapId, x: (cam.x + sx) / 16 - 0.5, y: (cam.y + sy) / 16 - 0.5 };
  hd.hintRect = null; const free = hd.markerAt(hd.g, T, 15, 0);
  hd.hintRect = { x: 60, y: 46, w: 200, h: 21 }; const moved = hd.markerAt(hd.g, T, 15, 0);
  hd.hintRect = null;
  return { free, moved };
});
const r = { x: 60, y: 46, w: 200, h: 21 };
check('the quest diamond is never drawn under the hint plate', mk.free && mk.moved && !(mk.moved.y + 11 > r.y && mk.moved.y - 4 < r.y + r.h) && Math.abs(mk.free.y - 54) <= 2, JSON.stringify(mk));

// ---- no download button inside the artifact viewer; the Pages build keeps it
const dl = await G(async () => {
  const { openSaveTools } = await import('/src/ui/savetools.js'), { closeOverlay, inArtifact } = await import('/src/ui/overlay.js');
  const labels = () => [...document.querySelectorAll('.ff-ov button')].map((b) => b.textContent);
  const plain = inArtifact();
  window.__ffArtifact = true; openSaveTools(window.__ff.game.scene.getScene('Game')); const art = labels(); const artText = document.querySelector('.ff-ov p').textContent; closeOverlay();
  window.__ffArtifact = false; openSaveTools(window.__ff.game.scene.getScene('Game')); const page = labels(); closeOverlay();
  delete window.__ffArtifact;
  return { plain, art, artText, page };
});
check('a page opened on its own is not the artifact viewer', dl.plain === false, JSON.stringify(dl));
check('inside the artifact viewer the save panel has no download button and points to the save code', !dl.art.includes('Export file') && dl.art.includes('Copy save code') && /Copy save code/.test(dl.artText), JSON.stringify(dl));
check('the Pages build keeps the download button', dl.page.includes('Export file'), JSON.stringify(dl.page));

// ---- VX-25: the intro ends in white and the village fades in from white
const fade = await G(async () => {
  const game = window.__ff.game; window.__set.flashes = true;
  game.scene.stop('Hud'); game.scene.stop('Game'); game.scene.start('Intro');
  await window.__ffStep.frames(10, 16.7);
  const it = game.scene.getScene('Intro'); it.finish();
  const out = { r: it.cameras.main.fadeEffect.red, g: it.cameras.main.fadeEffect.blue };
  await window.__ffStep.frames(80, 16.7);
  await window.__ffStep.frames(5, 16.7);
  const gs = game.scene.getScene('Game'), f = gs.cameras.main.fadeEffect;
  return { out, inn: { r: f.red, b: f.blue, dir: f.direction, game: game.scene.isActive('Game') } };
});
check('the intro fades out to white and the village fades in from white (VX-25)', fade.out.r === 234 && fade.inn.game && fade.inn.r === 234 && fade.inn.dir === false, JSON.stringify(fade));

check('no page errors', h.errors.length === 0, h.errors.slice(0, 5).join('\n'));
await h.close();
console.log(failCount() ? 'LARGE TEXT FAILED' : 'LARGE TEXT PASSED');
process.exit(failCount() ? 1 : 0);
