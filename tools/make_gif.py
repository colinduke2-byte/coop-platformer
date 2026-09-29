#!/usr/bin/env python3
"""Turn a folder of PNG frames into a GIF: make_gif.py <frames_dir> <out.gif> [scale] [crop x0,y0,x1,y1] [fps]"""
import sys, glob
from PIL import Image
d, out = sys.argv[1], sys.argv[2]
scale = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
crop = tuple(int(v) for v in sys.argv[4].split(",")) if len(sys.argv) > 4 and sys.argv[4] != "-" else None
fps = float(sys.argv[5]) if len(sys.argv) > 5 else 40.0
frames = []
for f in sorted(glob.glob(d + "/*.png")):
    im = Image.open(f).convert("RGB")
    if crop:
        im = im.crop(crop)
    im = im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)
    frames.append(im.quantize(colors=128, method=Image.Quantize.MEDIANCUT))
frames[0].save(out, save_all=True, append_images=frames[1:], duration=int(1000 / fps), loop=0, optimize=True)
print(out, len(frames), "frames")
