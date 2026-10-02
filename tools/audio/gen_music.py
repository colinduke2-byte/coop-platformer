"""Generate placeholder music loops (original, procedural chiptune-ish).
Run: python3 tools/audio/gen_music.py -> audio/music/<name>.wav (seamless loops).
Each track: 16 bars = intro-free A/B loop, chords + generated melody + bass + drums."""
import numpy as np, wave, os, sys

ONLY = set(sys.argv[1:])  # e.g. `python3 gen_music.py frost` writes just that track

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "../../audio/music")

NOTE = {n: i for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def freq(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def osc(shape, f, n, duty=0.5):
    ph = (np.arange(n) * f / SR) % 1.0
    if shape == "square":
        return np.where(ph < duty, 1.0, -1.0)
    if shape == "tri":
        return 4 * np.abs(ph - 0.5) - 1
    if shape == "saw":
        return 2 * ph - 1
    return np.sin(2 * np.pi * ph)


def adsr(n, a=0.01, d=0.08, s=0.6, r=0.05):
    e = np.ones(n) * s
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    A = min(A, n)
    e[:A] = np.linspace(0, 1, A)
    D2 = min(D, n - A)
    e[A:A + D2] = np.linspace(1, s, D2)
    if R < n:
        e[-R:] *= np.linspace(1, 0, R)
    return e


def chord_notes(root, kind):
    iv = {"maj": [0, 4, 7], "min": [0, 3, 7], "sus": [0, 5, 7], "maj7": [0, 4, 7, 11], "min7": [0, 3, 7, 10]}[kind]
    return [root + i for i in iv]


def track(name, key, bpm, prog, lead="square", seed=1, swing=0.0, bass_shape="tri", drums="pop", bright=1.0):
    if ONLY and name not in ONLY:
        return
    rng = np.random.default_rng(seed)
    beat = 60.0 / bpm
    bar = 4 * beat
    bars = len(prog)
    total = int(bars * bar * SR)
    out = np.zeros(total)
    base = 48 + NOTE[key]
    scale_major = [0, 2, 4, 5, 7, 9, 11]

    def place(sig, t0):
        i0 = int(t0 * SR)
        n = min(len(sig), total - i0)
        if n > 0:
            out[i0:i0 + n] += sig[:n]
        # wrap into the start so the loop is seamless
        if len(sig) > n and n >= 0:
            rest = sig[n:]
            out[:len(rest)] += rest

    melody_prev = 12
    for b, (deg, kind) in enumerate(prog):
        root = base + deg
        t_bar = b * bar
        notes = chord_notes(root, kind)
        # Pad / chord stabs on beats 2 and 4 (off-beat bounce).
        for k in [1, 3]:
            n = int(beat * 0.45 * SR)
            sig = sum(osc("square", freq(m + 12), n, 0.25) for m in notes) / len(notes)
            place(sig * adsr(n, 0.005, 0.1, 0.3, 0.05) * 0.10 * bright, t_bar + k * beat)
        # Bass: root / fifth walking eighths.
        for k in range(8):
            n = int(beat * 0.5 * SR * 0.9)
            m = root - 12 + (7 if k % 4 == 2 else (12 if k % 4 == 3 else 0))
            place(osc(bass_shape, freq(m), n) * adsr(n, 0.005, 0.05, 0.7, 0.03) * 0.28, t_bar + k * beat * 0.5)
        # Melody: chord tones on strong beats, scale steps between; a rhythm per bar.
        section_b = b >= bars // 2
        rhythm = [[1, 0.5, 0.5, 1, 1], [0.5, 0.5, 0.5, 0.5, 1, 1], [1.5, 0.5, 1, 1], [0.5, 0.5, 1, 0.5, 0.5, 1]][
            (b + (1 if section_b else 0)) % 4]
        tt = 0.0
        for i, dur in enumerate(rhythm):
            if rng.random() < 0.12 and i > 0:
                tt += dur
                continue  # a rest now and then
            if i == 0 or rng.random() < 0.5:
                target = rng.choice(notes) - base + (12 if not section_b else 17 if rng.random() < 0.3 else 12)
            else:
                step = rng.choice([-2, -1, 1, 2])
                target = melody_prev + step
            # snap to scale
            octv, pc = divmod(int(target), 12)
            pc = min(scale_major, key=lambda s: abs(s - pc))
            melody_prev = octv * 12 + pc
            m = base + 12 + melody_prev
            n = int(dur * beat * SR * 0.92)
            sw = swing * beat if (i % 2 == 1) else 0.0
            vib = 1 + 0.004 * np.sin(np.arange(n) / SR * 2 * np.pi * 5.5)
            sig = osc(lead, freq(m) * vib.mean(), n, 0.5 if lead != "square" else 0.35)
            place(sig * adsr(n, 0.01, 0.1, 0.55, 0.06) * 0.16, t_bar + tt + sw)
            tt += dur
        # Drums.
        for k in range(8):
            t0 = t_bar + k * beat * 0.5
            if k % 4 == 0 or (drums == "busy" and k % 4 == 3):
                n = int(0.18 * SR)
                f = 120 * np.exp(-np.arange(n) / SR * 25) + 40
                kick = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-np.arange(n) / SR * 18)
                place(kick * 0.45, t0)
            if k % 4 == 2:
                n = int(0.14 * SR)
                sn = np.random.default_rng(b * 8 + k).uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 22)
                place(sn * 0.22, t0)
            n = int(0.04 * SR)
            hat = np.random.default_rng(b * 16 + k).uniform(-1, 1, n) * np.exp(-np.arange(n) / SR * 90)
            place(hat * (0.08 if k % 2 else 0.05), t0)
    out /= max(np.abs(out).max(), 1e-6)
    data = (out * 0.8 * 32767).astype(np.int16)
    os.makedirs(OUT, exist_ok=True)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())
    print(name, f"{bars * bar:.1f}s")


I, IV, V, vi, ii, iii = (0, "maj"), (5, "maj"), (7, "maj"), (9, "min"), (2, "min"), (4, "min")
track("meadow", "C", 124, [I, V, vi, IV] * 2 + [IV, V, iii, vi, ii, V, I, I], lead="square", seed=3)
track("candy", "F", 132, [I, vi, IV, V] * 2 + [ii, V, I, vi, ii, V, I, (7, "sus")], lead="tri", seed=11, drums="busy")
track("sunset", "D", 110, [vi, IV, I, V] * 2 + [ii, iii, IV, V, vi, IV, V, V], lead="saw", seed=5, bass_shape="square")
track("glacier", "A", 100, [I, iii, IV, I] * 2 + [vi, V, IV, V, (0, "maj7"), IV, (2, "min7"), V], lead="sine", seed=9, bright=0.7)
track("menu", "G", 116, [I, IV, vi, V] * 2, lead="tri", seed=21)
# World 1
track("breezy", "G", 128, [I, IV, I, V] * 2 + [vi, IV, I, V, IV, V, I, (7, "sus")], lead="tri", seed=31, bright=1.1)
track("hollow", "E", 96, [vi, IV, V, iii] * 2 + [ii, vi, IV, V, vi, (2, "min7"), IV, V], lead="sine", seed=33, bright=0.6)
track("canopy", "D", 120, [I, vi, ii, V] * 2 + [IV, I, ii, V, I, iii, IV, V], lead="square", seed=35, swing=0.12)
track("river", "A", 134, [I, V, IV, V] * 2 + [vi, iii, IV, I, ii, V, I, I], lead="tri", seed=37, drums="busy")
track("thorn", "C", 108, [vi, V, IV, V] * 2 + [vi, IV, (7, "sus"), V, vi, ii, iii, V], lead="saw", seed=39, bass_shape="square")
track("boss", "D", 150, [vi, IV, V, V] * 2 + [vi, (5, "maj7"), V, iii, ii, V, vi, V], lead="saw", seed=41, drums="busy", bass_shape="square")
track("worldmap", "F", 104, [I, iii, IV, V] * 2 + [vi, IV, I, V], lead="tri", seed=43, swing=0.08)
# World 2 - Frostwhistle Peaks
track("frost", "E", 126, [I, IV, vi, V] * 2 + [IV, I, ii, V, I, vi, IV, (7, "sus")], lead="tri", seed=51, drums="busy", bright=1.2)
track("crystal", "B", 92, [vi, IV, I, V] * 2 + [ii, vi, (0, "maj7"), V, vi, IV, (2, "min7"), V], lead="sine", seed=53, bright=0.8)
track("gondola", "A", 112, [I, iii, vi, IV] * 2 + [I, V, vi, IV, ii, V, I, I], lead="square", seed=55, swing=0.1)
track("avalanche", "C", 164, [vi, IV, V, V] * 2 + [vi, IV, I, V, ii, V, vi, V], lead="saw", seed=57, drums="busy", bass_shape="square")
track("hotspring", "F", 98, [I, vi, ii, V] * 2 + [IV, iii, ii, V, I, vi, ii, V], lead="tri", seed=59, swing=0.14, bright=0.9)
track("yeti", "G", 146, [vi, V, IV, V] * 2 + [vi, IV, (5, "maj7"), V, ii, iii, IV, V], lead="saw", seed=61, drums="busy", bass_shape="square")
# World 3 - Rainbloom Jungle (marimba-ish leads, swung grooves).
track("jungle", "G", 118, [I, IV, V, IV] * 2 + [vi, IV, I, V, ii, V, I, (7, "sus")], lead="tri", seed=71, swing=0.16, drums="busy")
track("treetops", "D", 126, [I, iii, IV, V] * 2 + [vi, V, IV, V, I, vi, ii, V], lead="sine", seed=73, swing=0.1, bright=1.1)
track("ruins", "E", 100, [vi, IV, V, iii] * 2 + [vi, (5, "maj7"), IV, V, ii, vi, IV, V], lead="sine", seed=75, bright=0.75)
track("rapids", "A", 140, [I, V, vi, IV] * 2 + [IV, V, I, vi, ii, V, I, I], lead="tri", seed=77, drums="busy")
track("swamp", "C", 92, [vi, ii, V, vi] * 2 + [IV, iii, ii, V, vi, (2, "min7"), IV, V], lead="sine", seed=79, swing=0.18, bright=0.6)
track("chameleon", "F", 148, [vi, IV, V, iii] * 2 + [vi, IV, (7, "sus"), V, ii, iii, IV, V], lead="saw", seed=81, drums="busy", bass_shape="square")
# World 4 - Clockwhirl Works (bouncy, mechanical, square leads).
track("brass", "C", 120, [I, V, IV, V] * 2 + [vi, IV, I, V, ii, V, I, I], lead="square", seed=91, drums="busy")
track("conveyor", "G", 136, [I, IV, I, V] * 2 + [vi, V, IV, V, I, iii, IV, V], lead="square", seed=93, drums="busy", bright=1.1)
track("steam", "D", 108, [vi, IV, I, V] * 2 + [ii, vi, IV, V, vi, (2, "min7"), IV, V], lead="tri", seed=95, swing=0.12)
track("tower", "A", 116, [I, iii, vi, IV] * 2 + [IV, V, iii, vi, ii, V, I, (7, "sus")], lead="sine", seed=97, bright=0.9)
track("nightshift", "E", 96, [vi, IV, V, iii] * 2 + [vi, (5, "maj7"), IV, V, ii, vi, IV, V], lead="sine", seed=99, bright=0.65)
track("cuckoo", "B", 152, [vi, V, IV, V] * 2 + [vi, IV, (7, "sus"), V, ii, iii, IV, V], lead="saw", seed=101, drums="busy", bass_shape="square")
