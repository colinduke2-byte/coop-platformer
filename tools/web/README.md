# Browser build (the "play in a link" page)

1. Web templates: `web_nothreads_release.zip` must be in Godot's export_templates/4.7.2.stable folder.
2. `godot --headless --export-release "Web" build/web/index.html`
3. `python3 tools/web/split_pieces.py build/web build/web` (writes build/web/pieces/: the engine and game data in 1 MB pieces + parts.json)
4. Copy `tools/web/play.html` into build/web and publish it with everything in pieces/,
   index.js and the two index.audio*.worklet.js files next to it.

play.html downloads the gzipped engine, unpacks it in the browser (DecompressionStream) and
hands the files to Godot by intercepting fetch() - so no single file is over ~10 MB.

## GitHub Pages (public link, online play without claude.ai accounts)

`bash tools/web/deploy_pages.sh` builds and force-pushes the page to the `gh-pages` branch
(play.html becomes index.html, with peerjs.min.js next to it). Online play there uses PeerJS:
the free PeerJS cloud server introduces browsers, then they talk directly (WebRTC, with PeerJS's
TURN relays as a fallback). Invite links are `https://<user>.github.io/<repo>/#CODE`.

Testing PeerJS locally: run a PeerJS server (`npm i peer`, `PeerServer({port: 9000, host: '127.0.0.1'})`)
and open `play.html?peerhost=127.0.0.1&peerport=9000` in two tabs. `play.html?net=local` skips the
network entirely (BroadcastChannel between tabs).
