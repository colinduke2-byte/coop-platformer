// Fills in the placeholders of public/sw.js: the build id (part of the cache name) and extra files to precache.
// Used by vite.config.js (dist/sw.js) and tools/publish.mjs (the GitHub Pages copy).
export function stampServiceWorker(src, build, precache = []) {
  if (!src.includes("'__BUILD__'") || !src.includes('/*__PRECACHE__*/[]')) throw new Error('sw.js placeholders missing');
  return src.replace("'__BUILD__'", JSON.stringify(build)).replace('/*__PRECACHE__*/[]', JSON.stringify(precache));
}
