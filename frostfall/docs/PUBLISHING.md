# Publishing Frostfall

Frostfall ships in two places, and both are made from one build:

| Where | File | Notes |
|---|---|---|
| GitHub Pages: `colinduke2-byte/FrostFall`, branch `main` (local clone `/home/user/frostfall`) | `index.html` + `sw.js` + `manifest.webmanifest` + icons | Works offline after the first visit. Can be installed to a phone or desktop home screen. |
| claude.ai artifact | `frostfall/frostfall.html` | One self-contained file with no manifest link. It runs in a sandboxed iframe, so it has no service worker, and storage may be blocked there. |

## Publish

```bash
cd frostfall
npm run publish                     # build once, write the Pages files into /home/user/frostfall and frostfall/frostfall.html
npm run publish -- --out /tmp/site  # write the Pages files somewhere else, for example to try them first
npm run publish -- --push           # also commit "Publish <build>" in /home/user/frostfall and push origin main
```

`tools/publish.mjs` prints the build id and the path and size of every file. It writes:

- `index.html`: the whole game in one HTML document. It includes the `<link rel="manifest">` and apple-touch-icon links.
- `sw.js`: `public/sw.js` with the build id and the precache list filled in.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: a pixel snowflake on navy, drawn in code by `tools/icons.mjs`.
- `.nojekyll`, only if it is missing. `README.md` is never touched.
- `frostfall/frostfall.html`: the artifact copy. It is the same page without the manifest link.

`--push` does three things:
1. It points `origin` at `https://github.com/colinduke2-byte/FrostFall.git`, because the repo was renamed and the old URL only redirects.
2. It stages the files above.
3. It commits and pushes `HEAD:main`. If nothing changed, it skips the commit.

Pages usually goes live a minute or two after the push.

To update the artifact, publish `frostfall/frostfall.html` to the existing artifact URL. Use the same URL every time so the link people already have keeps working.

`npm run build:single` still works too. It runs `vite build` and then `node tools/single-file.mjs frostfall.html [--manifest]`, and produces only the single file.

## Build id

`vite.config.js` computes a build id in the form `<git short hash>-<yyyymmdd>`, for example `682c97b-20261014`. Outside a git checkout it is `dev`, and the `FROSTFALL_BUILD` environment variable overrides it. The id is used in four places:

- It is defined as `__BUILD__` in the bundle. `src/config.js` exports it as `BUILD`, and the title screen shows it next to `VERSION`.
- It goes into `<meta name="frostfall-build">` in both HTML files, so you can check which build a page is: `document.querySelector('meta[name=frostfall-build]').content`.
- It is part of the service worker cache name, `frostfall-<build>`.
- Publishing prints it.

Publishing twice on the same day without a new commit gives the same id. That is fine: the worker only cares whether `sw.js` changed. To force a fresh id, commit first or set `FROSTFALL_BUILD=...`.

## Offline mode and updates (`public/sw.js`)

`src/main.js` registers `./sw.js` only on http(s), outside an iframe and outside `vite dev`. The worker handles requests like this:

- **Install**: it precaches `./`, `index.html`, the manifest and the icons, with `cache: 'reload'` so a stale HTTP-cached copy is never stored. In `dist/` builds it precaches the hashed bundle instead.
- **The page itself is network-first.** Online, a reload always gets the newest published game. Offline, or when the network takes more than 4 s to answer, it serves the cached copy. A query string such as `?renderer=canvas` still finds the cached page.
- **Everything else is cache-first.** These files do not change within one build.
- **Activate**: it deletes every other `frostfall-*` cache and claims open tabs.
- **Messages**: `{type:'SKIP_WAITING'}` makes a waiting worker take over. `{type:'GET_BUILD'}`, sent with a MessageChannel port, answers `{type:'BUILD', build}`.

A new worker does not take over on its own while an older one controls an open tab. The page decides, in `src/main.js`:

- **A new build is published while the game is open.** The waiting worker's build differs from the page's `BUILD`, so the page shows **UPDATE READY - RELOAD**. Clicking it sends `SKIP_WAITING`. When `controllerchange` fires, the page reloads into the new build.
- **The game is opened after a publish.** Network-first has already served the new page, and the waiting worker reports the same build. The page sends `SKIP_WAITING` silently and shows no toast.
- **The page checks for updates** every 30 minutes (`reg.update()`), so long play sessions also notice new builds.

## Tests

- `node test/offline.mjs` (also part of `npm test`) runs `publish()` into a fresh `mkdtemp` directory and serves it. It then checks:
  - the files, the manifest link and the build id in `sw.js`;
  - that the artifact boots from `file://` and enters the Game scene (forest, west);
  - that the Pages copy boots, the worker takes control and the cache is named after the build;
  - that offline reloads still start the game;
  - that a second publish arrives at once, its worker waits, answers `GET_BUILD`, takes over on `SKIP_WAITING`, and leaves only the new cache.
- Phaser comes from `phaser/dist/phaser-arcade-physics.min.js` through an exact `^phaser$` alias. The game only uses Arcade physics, so this drops Matter.js and makes the bundle about 112 KB smaller.

## Why there is no GitHub Actions deploy

`.github/workflows/frostfall-pages.yml` was deleted. It deployed `frostfall/dist` from this repo to this repo's own Pages site, but the game lives in the separate `FrostFall` repo. The workflow only existed on the `frostfall` branch and never ran, and it would have shipped the multi-file `dist/` build without the manifest or the stamped worker. Publishing by hand with `npm run publish -- --push` is the real route. `.github/workflows/frostfall.yml` (CI tests) stays.
