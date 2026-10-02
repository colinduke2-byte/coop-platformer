"""Split the web build into small files for play.html: <out>/pieces/part1-NNN.webm (the gzipped
engine), part2-NNN.webm (the game data) and parts.json. Small plain files download reliably on
flaky networks and on hosts that struggle with one big file. (.webm only so every host serves
them; the content is raw bytes.)
Usage: python3 tools/web/split_pieces.py build/web <out_dir>"""
import gzip, json, os, shutil, sys

PIECE = 1024 * 1024
src, out = sys.argv[1], sys.argv[2]
dst = os.path.join(out, "pieces")
shutil.rmtree(dst, ignore_errors=True)
os.makedirs(dst)
with open(os.path.join(src, "index.wasm"), "rb") as f:
    engine = gzip.compress(f.read(), 9)
with open(os.path.join(src, "index.pck"), "rb") as f:
    data = f.read()
manifest = {"total": len(engine) + len(data)}
for name, blob in [("part1", engine), ("part2", data)]:
    n = 0
    for i in range(0, len(blob), PIECE):
        with open(os.path.join(dst, "%s-%03d.webm" % (name, n)), "wb") as f:
            f.write(blob[i:i + PIECE])
        n += 1
    manifest[name] = {"count": n, "size": len(blob)}
with open(os.path.join(dst, "parts.json"), "w") as f:
    json.dump(manifest, f)
print("pieces:", manifest)
