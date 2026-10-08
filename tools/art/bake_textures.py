#!/usr/bin/env python3
"""Bake the painterly detail textures used by the visual overhaul.

    python3 tools/art/bake_textures.py [--check OUT.png]

Writes tileable GREYSCALE PNGs into art/textures/. They are *detail* maps with a
mean of ~0.5: the shaders multiply the theme colour by (1 + (tex - 0.5) * k), so
one set of textures serves every world's palette. Everything is generated from
noise and brush-stroke stamps (all original, deterministic, regenerable).
Tiling is guaranteed by working on a torus (FFT noise, wrapped stamps).
--check writes a 2x2-tiled contact sheet so seams are easy to spot.
"""
import os, sys
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), "../../art/textures")
SIZE = 256


def rng_for(name):
    return np.random.default_rng(abs(hash(name)) % (2 ** 32) if False else sum(ord(c) * (i + 7) for i, c in enumerate(name)))


def norm(a, lo=0.0, hi=1.0):
    a = a - a.min()
    m = a.max()
    return lo + (a / m if m > 0 else a) * (hi - lo)


def noise(w, h, scale, rng):
    """Tileable value noise: white noise low-passed in Fourier space (wraps)."""
    n = rng.standard_normal((h, w))
    f = np.fft.fft2(n)
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    r = np.sqrt(fx * fx + fy * fy)
    cutoff = 1.0 / max(scale, 1.0)
    f *= np.exp(-(r / cutoff) ** 2)
    return norm(np.real(np.fft.ifft2(f)))


def fbm(w, h, base, octaves, rng, gain=0.5):
    out = np.zeros((h, w))
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * noise(w, h, base / (2 ** o), rng)
        tot += amp
        amp *= gain
    return norm(out / tot)


def strokes(w, h, count, length, width, angle, jitter, rng, strength=0.5, soft=True):
    """Soft elongated brush stamps (wrapped), centred on 0 (values in -strength..strength)."""
    canvas = np.zeros((h, w))
    for _ in range(count):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        a = angle + rng.normal(0, jitter)
        L = length * rng.uniform(0.5, 1.4)
        W = width * rng.uniform(0.6, 1.4)
        r = int(max(L, W) * 1.2) + 2
        ys, xs = np.mgrid[-r:r + 1, -r:r + 1]
        ca, sa = np.cos(a), np.sin(a)
        u = (xs * ca + ys * sa) / L
        v = (-xs * sa + ys * ca) / W
        d2 = u * u + v * v
        k = np.exp(-d2 * (2.2 if soft else 6.0)) if soft else (d2 < 1).astype(float)
        k *= rng.uniform(-1, 1) * strength
        yy = (np.arange(-r, r + 1) + int(cy)) % h
        xx = (np.arange(-r, r + 1) + int(cx)) % w
        canvas[np.ix_(yy, xx)] += k
    return canvas


def blobs(w, h, count, rmin, rmax, rng, strength=0.4):
    canvas = np.zeros((h, w))
    for _ in range(count):
        cx, cy = rng.uniform(0, w), rng.uniform(0, h)
        r = rng.uniform(rmin, rmax)
        rr = int(r * 1.6) + 2
        ys, xs = np.mgrid[-rr:rr + 1, -rr:rr + 1]
        k = np.exp(-(xs * xs + ys * ys) / (r * r)) * rng.uniform(-1, 1) * strength
        yy = (np.arange(-rr, rr + 1) + int(cy)) % h
        xx = (np.arange(-rr, rr + 1) + int(cx)) % w
        canvas[np.ix_(yy, xx)] += k
    return canvas


def finish(a, contrast=1.0):
    """Centre on 0.5 and clamp."""
    a = a - a.mean()
    a = 0.5 + a * contrast
    return np.clip(a, 0.0, 1.0)


# --- the textures ------------------------------------------------------------------------

def earth(r):
    b = fbm(SIZE, SIZE, 90, 5, r) - 0.5
    pebbles = blobs(SIZE, SIZE, 70, 2.5, 7.0, r, 0.9)
    strata = strokes(SIZE, SIZE, 260, 34, 2.4, 0.0, 0.08, r, 0.28)
    return finish(b * 0.9 + pebbles * 0.35 + strata, 1.0)


def rock(r):
    f = fbm(SIZE, SIZE, 70, 5, r)
    ridge = 1.0 - np.abs(f - 0.5) * 2
    ridge = ridge ** 5
    chips = strokes(SIZE, SIZE, 220, 22, 5, 1.2, 0.7, r, 0.3)
    return finish((f - 0.5) * 0.8 - ridge * 0.35 + chips * 0.5)


def snow(r):
    b = fbm(SIZE, SIZE, 120, 4, r) - 0.5
    drift = strokes(SIZE, SIZE, 120, 60, 7, 0.1, 0.1, r, 0.2)
    spark = np.zeros((SIZE, SIZE))
    ys, xs = r.integers(0, SIZE, 90), r.integers(0, SIZE, 90)
    spark[ys, xs] = 0.6
    return finish(b * 0.5 + drift + spark, 0.7)


def sand(r):
    grain = r.standard_normal((SIZE, SIZE)) * 0.06
    ripples = np.sin((np.arange(SIZE)[:, None] / SIZE * 12 + fbm(SIZE, SIZE, 60, 3, r) * 2.5) * np.pi * 2) * 0.12
    b = fbm(SIZE, SIZE, 100, 4, r) - 0.5
    return finish(grain + ripples + b * 0.4, 1.0)


def brick(r):
    out = np.zeros((SIZE, SIZE))
    rows, cols = 8, 4
    bh, bw = SIZE // rows, SIZE // cols
    for j in range(rows):
        off = (bw // 2) if j % 2 else 0
        for i in range(cols):
            tone = r.uniform(-0.18, 0.18)
            y0, x0 = j * bh, (i * bw + off)
            ys = np.arange(y0, y0 + bh) % SIZE
            xs = np.arange(x0, x0 + bw) % SIZE
            out[np.ix_(ys, xs)] = tone
    mortar = np.zeros((SIZE, SIZE))
    for j in range(rows):
        mortar[(j * bh) % SIZE:(j * bh) % SIZE + 3, :] = -0.35
        off = (bw // 2) if j % 2 else 0
        for i in range(cols):
            x = (i * bw + off) % SIZE
            mortar[(j * bh) % SIZE:(j * bh) % SIZE + bh, x:x + 3] = -0.35 if x + 3 <= SIZE else 0
    wear = fbm(SIZE, SIZE, 40, 4, r) - 0.5
    return finish(out + mortar + wear * 0.35 + blobs(SIZE, SIZE, 50, 2, 5, r, 0.25))


def metal(r):
    brushed = strokes(SIZE, SIZE, 900, 70, 0.9, 0.0, 0.02, r, 0.22)
    b = fbm(SIZE, SIZE, 110, 3, r) - 0.5
    scr = strokes(SIZE, SIZE, 40, 50, 0.6, 0.4, 0.8, r, 0.3)
    return finish(brushed + b * 0.45 + scr, 0.9)


def coral(r):
    f = fbm(SIZE, SIZE, 38, 4, r)
    cells = np.sin(f * 14) * 0.2
    return finish(cells + (f - 0.5) * 0.7 + blobs(SIZE, SIZE, 90, 1.5, 4, r, 0.6) * 0.3)


def crystal(r):
    f = fbm(SIZE, SIZE, 60, 3, r)
    facets = np.floor(f * 7) / 7.0
    streak = strokes(SIZE, SIZE, 90, 50, 3, 0.9, 0.15, r, 0.3)
    return finish((facets - 0.5) * 0.9 + streak, 1.0)


def nebula(r):
    c = fbm(SIZE, SIZE, 110, 5, r, 0.55) - 0.5
    stars = np.zeros((SIZE, SIZE))
    ys, xs = r.integers(0, SIZE, 60), r.integers(0, SIZE, 60)
    stars[ys, xs] = r.uniform(0.3, 0.9, 60)
    return finish(c * 0.9 + stars, 0.9)


def lip(r, kind):
    """Strip 256x64 for the top edge. grass = upright blades, others = soft daubs."""
    w, h = SIZE, 64
    if kind == "grass":
        blades = strokes(w, h, 700, 14, 1.4, np.pi / 2, 0.35, r, 0.35)
        b = fbm(w, h, 50, 3, r) - 0.5
        return finish(blades + b * 0.5, 1.0)
    if kind == "snow":
        d = strokes(w, h, 160, 28, 7, 0.0, 0.2, r, 0.28)
        return finish(d + (fbm(w, h, 60, 3, r) - 0.5) * 0.4, 0.8)
    if kind == "moss":
        d = blobs(w, h, 150, 2, 7, r, 0.7)
        return finish(d * 0.5 + (fbm(w, h, 30, 4, r) - 0.5) * 0.7, 1.0)
    if kind == "sand":
        return finish(r.standard_normal((h, w)) * 0.06 + (fbm(w, h, 50, 3, r) - 0.5) * 0.45, 1.0)
    if kind == "brass":
        s = strokes(w, h, 300, 50, 0.8, 0.0, 0.02, r, 0.25)
        return finish(s + (fbm(w, h, 70, 3, r) - 0.5) * 0.4, 0.9)
    d = blobs(w, h, 140, 1.5, 4, r, 0.7)  # coral / default
    return finish(d * 0.5 + (fbm(w, h, 28, 3, r) - 0.5) * 0.6, 1.0)


def bark(r):
    v = strokes(SIZE, SIZE, 480, 60, 3.2, np.pi / 2, 0.05, r, 0.3)
    ridge = 1.0 - np.abs(fbm(SIZE, SIZE, 40, 4, r) - 0.5) * 2
    return finish(v + (ridge ** 3 - 0.4) * 0.5 + blobs(SIZE, SIZE, 14, 3, 8, r, 0.6) * 0.25)


def cloth(r):
    x = np.arange(SIZE)
    weave = (np.sin(x[None, :] / SIZE * 64 * np.pi) * np.sin(x[:, None] / SIZE * 64 * np.pi)) * 0.08
    b = fbm(SIZE, SIZE, 90, 4, r) - 0.5
    fibres = strokes(SIZE, SIZE, 300, 10, 0.8, 0.8, 1.5, r, 0.15)
    return finish(weave + b * 0.5 + fibres, 1.0)


def fur(r):
    f = strokes(SIZE, SIZE, 2200, 9, 1.0, np.pi / 2, 0.7, r, 0.3)
    b = fbm(SIZE, SIZE, 90, 3, r) - 0.5
    return finish(f + b * 0.35, 1.0)


def shell(r):
    b = fbm(SIZE, SIZE, 80, 4, r) - 0.5
    ridge = np.sin((fbm(SIZE, SIZE, 150, 2, r) * 9) * np.pi) * 0.12
    return finish(b * 0.5 + ridge + blobs(SIZE, SIZE, 60, 1, 3, r, 0.5) * 0.3, 1.0)


def jelly(r):
    b = fbm(SIZE, SIZE, 120, 3, r) - 0.5
    return finish(b * 0.7 + blobs(SIZE, SIZE, 20, 8, 20, r, 0.3), 0.8)


def paper(r):
    fibres = strokes(SIZE, SIZE, 1100, 12, 0.7, 0.0, 3.0, r, 0.1)
    b = fbm(SIZE, SIZE, 120, 4, r) - 0.5
    return finish(r.standard_normal((SIZE, SIZE)) * 0.02 + fibres + b * 0.25, 1.0)


def brush_mask(r):
    s = strokes(SIZE, SIZE, 140, 46, 9, 0.2, 0.25, r, 0.5)
    return finish(s + (fbm(SIZE, SIZE, 70, 3, r) - 0.5) * 0.3, 1.0)


TEXTURES = {
    "ground_earth": earth, "ground_rock": rock, "ground_snow": snow, "ground_sand": sand,
    "ground_brick": brick, "ground_metal": metal, "ground_coral": coral,
    "ground_crystal": crystal, "ground_nebula": nebula,
    "lip_grass": lambda r: lip(r, "grass"), "lip_snow": lambda r: lip(r, "snow"),
    "lip_moss": lambda r: lip(r, "moss"), "lip_sand": lambda r: lip(r, "sand"),
    "lip_brass": lambda r: lip(r, "brass"), "lip_coral": lambda r: lip(r, "coral"),
    "bark": bark, "cloth": cloth, "fur": fur, "shell": shell, "jelly": jelly,
    "paper": paper, "brush_mask": brush_mask,
}


# --- UI: storybook paper panel (9-slice, RGBA) ---------------------------------------------

def ui_panel(size=192, margin=60, radius=30, border=5):
    """A cream paper card with a hand-inked border, deckled edge and a soft drop shadow.
    Bake at 4x and downsample so the edges are smooth. Returns an RGBA PIL image."""
    from PIL import ImageFilter
    S = 4
    n = size * S
    r = np.random.default_rng(777)
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float32)
    # rounded-rect signed distance (negative inside), inset to leave room for the shadow
    inset = 16 * S
    cx = cy = n / 2.0
    hw = n / 2.0 - inset
    qx = np.abs(xs - cx) - (hw - radius * S)
    qy = np.abs(ys - cy) - (hw - radius * S)
    outside = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2)
    inside = np.minimum(np.maximum(qx, qy), 0)
    sd = outside + inside - radius * S
    # deckle: wobble the edge a little with low-frequency noise
    wob = (noise(n, n, 40 * S, r) - 0.5) * 7.0 * S * 0.25 + (noise(n, n, 9 * S, r) - 0.5) * 2.0 * S * 0.25
    sd = sd + wob
    edge = border * S
    mask = np.clip(0.5 - sd / 2.0, 0, 1)                      # 1 inside the card
    ink = np.clip(0.5 - (sd + edge) / 2.0, 0, 1)              # 1 inside the inner (fill) region
    band = mask - ink                                          # the ink border ring
    paper = np.zeros((n, n))
    fibre = strokes(256, 256, 1100, 12, 0.7, 0.0, 3.0, np.random.default_rng(5), 0.1)
    mott = fbm(256, 256, 120, 4, np.random.default_rng(6)) - 0.5
    detail = np.clip(0.5 + fibre + mott * 0.25, 0, 1)
    detail = np.array(Image.fromarray((detail * 255).astype(np.uint8), "L").resize((n, n), Image.BICUBIC)) / 255.0
    cream = np.array([255, 246, 228], dtype=np.float32)
    shade = 0.93 + 0.14 * detail                                   # paper grain
    glow = np.clip(1.0 - (xs + ys) / (2.0 * n), 0, 1) * 0.03       # light from the top-left
    fill_rgb = cream[None, None, :] * (shade + glow)[:, :, None]
    ink_rgb = np.array([29, 23, 38], dtype=np.float32)[None, None, :]
    rgb = fill_rgb * ink[:, :, None] + ink_rgb * band[:, :, None]
    alpha = mask
    # soft drop shadow (blurred, offset down)
    sh = Image.fromarray((np.roll(mask, 8 * S, axis=0) * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(7 * S))
    sh = np.array(sh) / 255.0 * 0.32
    out_a = alpha + sh * (1 - alpha)
    out_rgb = (rgb * alpha[:, :, None] + np.array([20, 10, 30], dtype=np.float32)[None, None, :] * (sh * (1 - alpha))[:, :, None]) / np.maximum(out_a, 1e-4)[:, :, None]
    img = np.dstack([np.clip(out_rgb, 0, 255), np.clip(out_a * 255, 0, 255)]).astype(np.uint8)
    return Image.fromarray(img, "RGBA").resize((size, size), Image.LANCZOS)



def seam_error(a):
    """How different the wrap-around edge is vs. a normal neighbouring row/column."""
    wrap = np.abs(a[:, 0] - a[:, -1]).mean() + np.abs(a[0, :] - a[-1, :]).mean()
    cy = min(100, a.shape[0] - 2)
    inner = np.abs(a[:, 100] - a[:, 101]).mean() + np.abs(a[cy, :] - a[cy + 1, :]).mean()
    return wrap / max(inner, 1e-6)


def main():
    os.makedirs(OUT, exist_ok=True)
    check_path = None
    if "--check" in sys.argv:
        check_path = sys.argv[sys.argv.index("--check") + 1]
    tiles = []
    for name, fn in TEXTURES.items():
        a = fn(rng_for(name))
        img = Image.fromarray((a * 255).astype(np.uint8), "L")
        img.save(os.path.join(OUT, name + ".png"), optimize=True)
        tiles.append((name, a))
        print(f"{name:16s} {a.shape[1]}x{a.shape[0]}  mean {a.mean():.2f}  seam x{seam_error(a):.2f}")
    ui_dir = os.path.join(os.path.dirname(OUT), "ui")
    os.makedirs(ui_dir, exist_ok=True)
    ui_panel().save(os.path.join(ui_dir, "panel_paper.png"), optimize=True)
    print("panel_paper      192x192  (art/ui)")
    if check_path:
        cols = 5
        cell = 2 * SIZE // 2
        rows = (len(tiles) + cols - 1) // cols
        sheet = Image.new("L", (cols * cell, rows * cell))
        for i, (name, a) in enumerate(tiles):
            big = np.tile(a, (2, 2))
            im = Image.fromarray((big * 255).astype(np.uint8), "L").resize((cell, cell))
            sheet.paste(im, ((i % cols) * cell, (i // cols) * cell))
        sheet.save(check_path)
        print("wrote", check_path)


if __name__ == "__main__":
    main()
