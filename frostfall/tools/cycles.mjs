// Lists the import cycles in src/ (strongly connected components of the relative-import graph).   node tools/cycles.mjs
// See docs/AGENT_RULES.md, section 8: a new cycle is a review question.
import fs from 'node:fs';
import path from 'node:path';
const root = new URL('../src/', import.meta.url).pathname;
const files = [];
(function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } })(root);
const deps = {};
for (const f of files) deps[f] = [...fs.readFileSync(f, 'utf8').matchAll(/^import\s[^'"]*?['"](\.[^'"]+)['"]/gm)].map((m) => path.normalize(path.join(path.dirname(f), m[1])));
let idx = 0; const st = [], on = new Set(), I = {}, L = {}, sccs = [];
function visit(v) {
  I[v] = L[v] = idx++; st.push(v); on.add(v);
  for (const w of deps[v] || []) { if (!(w in deps)) continue; if (!(w in I)) { visit(w); L[v] = Math.min(L[v], L[w]); } else if (on.has(w)) L[v] = Math.min(L[v], I[w]); }
  if (L[v] === I[v]) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) sccs.push(c); }
}
for (const v of Object.keys(deps)) if (!(v in I)) visit(v);
for (const c of sccs) {
  console.log(`cycle of ${c.length}: ${c.map((f) => path.relative(root, f)).join(' ')}`);
  for (const f of c) for (const d of deps[f]) if (c.includes(d)) console.log(`  ${path.relative(root, f)} -> ${path.relative(root, d)}`);
}
if (!sccs.length) console.log('no import cycles');
