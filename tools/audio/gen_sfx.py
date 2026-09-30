"""Generate the game's placeholder sound effects (all original, synthesized).
Run: python3 tools/audio/gen_sfx.py  ->  audio/sfx/*.wav  (needs numpy)
Swap any file for a real recording later; names are what Audio (audio_manager.gd) plays."""
import numpy as np, wave, os

SR = 22050
OUT = os.path.join(os.path.dirname(__file__), "../../audio/sfx")
rng = np.random.default_rng(7)


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a=0.005, r=None, curve=3.0):
    """Attack then exponential-ish decay over n samples."""
    x = np.linspace(0, 1, n)
    att = max(int(SR * a), 1)
    e = (1 - x) ** curve
    e[:att] *= np.linspace(0, 1, att)
    return e


def sweep(f0, f1, d, shape="sine", curve=1.0):
    tt = t(d)
    k = (tt / d) ** curve
    f = f0 + (f1 - f0) * k
    ph = 2 * np.pi * np.cumsum(f) / SR
    if shape == "square":
        return np.sign(np.sin(ph)) * 0.6
    if shape == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if shape == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    return np.sin(ph)


def noise(d, lp=1.0):
    n = rng.uniform(-1, 1, int(SR * d))
    if lp < 1.0:  # one-pole low-pass
        y = np.zeros_like(n)
        for i in range(1, len(n)):
            y[i] = y[i - 1] + lp * (n[i] - y[i - 1])
        n = y / max(np.abs(y).max(), 1e-6)
    return n


def tone(f, d, shape="sine", a=0.005, curve=3.0):
    return sweep(f, f, d, shape) * env(int(SR * d), a, curve=curve)


def mix(*parts):
    n = max(len(p) for p in parts)
    out = np.zeros(n)
    for p in parts:
        out[:len(p)] += p
    return out


def seq(*parts, gap=0.0):
    g = np.zeros(int(SR * gap))
    out = []
    for p in parts:
        out += [p, g]
    return np.concatenate(out)


def save(name, x, vol=0.8):
    x = np.asarray(x, dtype=float)
    peak = max(np.abs(x).max(), 1e-6)
    x = x / peak * vol
    fade = min(200, len(x))
    x[-fade:] *= np.linspace(1, 0, fade)
    data = (x * 32767).astype(np.int16)
    with wave.open(os.path.join(OUT, name + ".wav"), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


def main():
    os.makedirs(OUT, exist_ok=True)
    save("jump", sweep(260, 620, 0.14, "square", 0.6) * env(int(SR * 0.14), 0.002, curve=1.5), 0.45)
    save("land", noise(0.09, 0.08) * env(int(SR * 0.09), 0.001, curve=4) + tone(90, 0.09, "sine") * 0.8, 0.5)
    save("hard_land", mix(noise(0.25, 0.05) * env(int(SR * 0.25), 0.001, curve=3), sweep(120, 50, 0.25) * env(int(SR * 0.25))), 0.8)
    save("punch_swing", noise(0.12, 0.3) * np.sin(np.linspace(0, np.pi, int(SR * 0.12))) ** 2, 0.35)
    save("punch_hit", mix(noise(0.08, 0.5) * env(int(SR * 0.08), 0.001, curve=5), sweep(300, 90, 0.12) * env(int(SR * 0.12), 0.001)), 0.8)
    save("punch_big", mix(noise(0.3, 0.2) * env(int(SR * 0.3), 0.001, curve=3), sweep(200, 40, 0.35) * env(int(SR * 0.35), 0.001, curve=2)), 0.95)
    save("stomp", sweep(180, 700, 0.18, "tri", 0.4) * env(int(SR * 0.18), 0.002, curve=2), 0.7)
    save("pound", mix(noise(0.4, 0.04) * env(int(SR * 0.4), 0.001, curve=2), sweep(90, 30, 0.45) * env(int(SR * 0.45), 0.001, curve=2)), 1.0)
    save("wall_jump", sweep(400, 800, 0.1, "square", 0.5) * env(int(SR * 0.1), 0.001, curve=2), 0.4)
    save("slide", noise(0.35, 0.15) * env(int(SR * 0.35), 0.02, curve=1.5), 0.35)
    save("ledge", mix(noise(0.05, 0.4) * env(int(SR * 0.05)), tone(330, 0.06, "tri")), 0.4)
    save("glide", sweep(500, 520, 0.25, "tri") * (0.5 + 0.5 * np.sin(np.linspace(0, 40, int(SR * 0.25)))) * env(int(SR * 0.25), 0.03, curve=1), 0.2)
    save("lum", seq(tone(1320, 0.07, "sine", curve=2), tone(1760, 0.12, "sine", curve=3)), 0.45)
    save("gem", seq(*[tone(f, 0.09, "tri", curve=2) for f in [880, 1109, 1319, 1760]], tone(2217, 0.35, "sine"), gap=0.0), 0.6)
    save("bubble", mix(sweep(300, 900, 0.15, "sine", 0.5) * env(int(SR * 0.15), 0.01, curve=2), noise(0.05, 0.5) * 0.2), 0.5)
    save("revive", seq(*[tone(f, 0.07, "square", curve=2) for f in [523, 659, 784, 1047]]), 0.4)
    save("hurt", sweep(600, 150, 0.35, "square", 0.8) * env(int(SR * 0.35), 0.001, curve=1.5), 0.5)
    save("checkpoint", mix(seq(tone(784, 0.1, "tri"), tone(1175, 0.4, "tri", curve=2)), seq(np.zeros(int(SR * 0.1)), tone(1568, 0.4, "sine", curve=3) * 0.4)), 0.55)
    save("pad", sweep(150, 900, 0.3, "sine", 0.35) * (1 + 0.4 * np.sin(np.linspace(0, 60, int(SR * 0.3)))) * env(int(SR * 0.3), 0.002, curve=1.5), 0.7)
    save("swing", noise(0.18, 0.25) * np.sin(np.linspace(0, np.pi, int(SR * 0.18))), 0.3)
    save("splash", noise(0.45, 0.2) * env(int(SR * 0.45), 0.003, curve=2.5), 0.55)
    save("cannon", mix(noise(0.5, 0.06) * env(int(SR * 0.5), 0.001, curve=2.5), sweep(160, 45, 0.4) * env(int(SR * 0.4), 0.001)), 1.0)
    save("switch", seq(mix(noise(0.02, 0.9), tone(1200, 0.03, "square")), tone(880, 0.08, "tri"), tone(1320, 0.2, "tri", curve=2)), 0.5)
    save("gate", mix(noise(0.6, 0.05) * env(int(SR * 0.6), 0.1, curve=1), sweep(80, 60, 0.6, "saw") * 0.3 * env(int(SR * 0.6), 0.1, curve=1)), 0.55)
    save("crumble", seq(*[noise(0.05, 0.3) * env(int(SR * 0.05)) for _ in range(5)], gap=0.02), 0.5)
    save("break", mix(noise(0.3, 0.35) * env(int(SR * 0.3), 0.001, curve=2.5), sweep(250, 80, 0.2, "square") * 0.3 * env(int(SR * 0.2))), 0.75)
    save("clank", mix(tone(1400, 0.25, "square", curve=4) * 0.5, tone(2100, 0.2, "sine", curve=5), noise(0.03, 0.9) * 0.4), 0.5)
    save("enemy_pop", mix(sweep(900, 200, 0.2, "square", 0.5) * env(int(SR * 0.2), 0.001, curve=2) * 0.6, noise(0.15, 0.3) * env(int(SR * 0.15))), 0.6)
    save("shoot", sweep(700, 300, 0.15, "square", 0.4) * env(int(SR * 0.15), 0.001, curve=2), 0.4)
    save("reflect", sweep(400, 1600, 0.15, "tri", 0.5) * env(int(SR * 0.15), 0.001, curve=1.5), 0.5)
    save("boss_slam", mix(noise(0.8, 0.03) * env(int(SR * 0.8), 0.001, curve=2), sweep(70, 25, 0.8) * env(int(SR * 0.8), 0.001, curve=1.5)), 1.0)
    save("secret", seq(*[tone(f, 0.11, "tri", curve=2) for f in [659, 784, 988, 1319, 1568]]), 0.5)
    save("menu_move", tone(660, 0.05, "square", curve=3), 0.25)
    save("menu_ok", seq(tone(784, 0.06, "square"), tone(1175, 0.12, "square", curve=2)), 0.35)
    save("join", seq(tone(523, 0.07, "tri"), tone(784, 0.07, "tri"), tone(1047, 0.15, "tri", curve=2)), 0.45)
    notes = [523, 659, 784, 1047, 784, 1047, 1319]
    save("victory", seq(*[tone(f, 0.12 if i < 6 else 0.6, "square", curve=1.5 if i < 6 else 2.5) for i, f in enumerate(notes)]), 0.5)
    print("wrote sfx to", os.path.abspath(OUT))


if __name__ == "__main__":
    main()
