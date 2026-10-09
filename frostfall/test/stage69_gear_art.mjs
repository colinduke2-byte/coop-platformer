// Gear art: every weapon, shield, armour and charm in the item table has its own icon (and weapons their own held sprite).
import { launch, check, failCount } from './harness.mjs';
const h = await launch();
await h.open('scene=game');
await h.sleep(700);
const r = await h.ev(async () => {
  const { ITEMS, iconKey } = await import('/src/data/items.js');
  const sc = window.__ff.game.scene.getScene('Game');
  const sig = (key) => { const img = sc.textures.get(key).getSourceImage(), c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; let a = 7; for (let i = 0; i < d.length; i++) a = (a * 31 + d[i] + i) >>> 0; return a; };
  const gear = Object.entries(ITEMS).filter(([, i]) => ['weapon', 'weapon2h', 'bow', 'shield', 'armor', 'charm'].includes(i.type));
  const out = { total: gear.length, noIcon: [], icons: new Map(), helds: new Map(), oldKinds: [], noHeld: [] };
  for (const [id, it] of gear) {
    const ik = iconKey(id);
    if (!sc.textures.exists(ik)) { out.noIcon.push(id); continue; }
    const s = sig(ik); (out.icons.get(s) || out.icons.set(s, []).get(s)).push(id);
    if (['weapon', 'weapon2h', 'shield'].includes(it.type)) { if (!sc.textures.exists('held_' + id)) out.noHeld.push(id); else { const hs = sig('held_' + id); (out.helds.get(hs) || out.helds.set(hs, []).get(hs)).push(id); } }
    if (!/^(sword|axe|spear|mace|hammer|bow|shield|armor|charm|dagger|staff|halberd)_/.test(it.icon[0])) out.oldKinds.push(id + ':' + it.icon[0]);
  }
  return { total: out.total, noIcon: out.noIcon, noHeld: out.noHeld, oldKinds: out.oldKinds, dupIcons: [...out.icons.values()].filter((v) => v.length > 1), dupHeld: [...out.helds.values()].filter((v) => v.length > 1) };
});
console.log(r.total, 'pieces of gear');
check('every piece of gear has an icon', r.noIcon.length === 0, r.noIcon.join());
check('every weapon and shield has a held sprite', r.noHeld.length === 0, r.noHeld.join());
check('no gear still uses an old shared template icon', r.oldKinds.length === 0, r.oldKinds.join());
check('no two pieces of gear share an icon', r.dupIcons.length === 0, JSON.stringify(r.dupIcons));
check('no two weapons or shields share a held sprite', r.dupHeld.length === 0, JSON.stringify(r.dupHeld));
check('no page errors', h.errors.length === 0, h.errors.join('\n'));
await h.close();
process.exit(failCount() ? 1 : 0);
