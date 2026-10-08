"""World 6-3 (secret): ABYSSAL CANOPY - the Rainbloom Jungle hanging over the Deep Sea Dream.
Short and hard: a liana ravine over the void, a starry pool full of eels (dive
under the rock), a bubble column up to the canopy, jellybob trampolines over a
second void, then the gate.
Secrets: gem 0 on the pool floor under the rock, gem 1 high above the jellies,
gem 2 in a hollow log at the finish; the Snoozling sits on top of the canopy.
Regenerate: python3 tools/levelgen/levels/w6_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

TEAL, PINK = C(0.45, 1.0, 0.85), C(1.0, 0.5, 0.8)
L = LevelKit("AbyssalCanopy", "Abyssal Canopy", theme="nebula", horizon=0, scenery="nebula")
L.ambience("bubbles", 0.5)
L.ambience("stars", 0.6)

L.wall(-360, -1600, 600)
L.land([(-300, 0), (1150, 0)], bottom=1500)
L.land([(2150, 0), (2700, 0), (2720, 600), (4180, 600), (4200, -800), (5000, -800)], bottom=1500)
L.land([(5980, -800), (6300, -800), (6600, 0), (8000, 0)], bottom=1500)

# ---- S0 the canopy edge (x -300..1150) -----------------------------------------------------------
L.sign(90, 0, "ABYSSAL CANOPY. Swing, swim,\nbounce - and don't look down.", 420)
L.lums(300, -110, 1000, -110, 5, 40)

# ---- S1 the liana ravine over the void (1150..2150) -------------------------------------------------
L.checkpoint(900, 0)
L.pit_kill(1150, 2150, 700)
L.liana(1380, -500, 330, sway=0.15, phase=0.3)
L.liana(1840, -500, 330, sway=0.2, phase=1.1)
L.lums(1250, -300, 2050, -300, 7, 80)
L.enemy("swoopbeak", 1650, -560)

# ---- S2 the starry pool (2150..4200) ---------------------------------------------------------------
L.checkpoint(2300, 0)
L.water(2720, 20, 1460, 580)
L.block(3200, -200, 400, 520)                      # the rock (dive under it)
L.enemy("eelectra", 3190, 400, facing=-1)
L.enemy("eelectra", 3610, 520, facing=1)
L.enemy("pufferfin", 3900, 300, travel=V(0, 200), speed=80.0)
L.gem(3400, 560)                                   # gem 0 under the rock
L.lums(2800, 450, 4000, 450, 9, -40)
L.glow(3400, 500, TEAL, radius=260, energy=0.8)
# The sea-well: duck under its wall, and the bubbles carry you up to the canopy.
L.block(3940, -800, 60, 690)
L.water(4000, -800, 200, 820)
L.bubbles(4010, -800, 180, 1400, rise=460)
L.lums(4100, -700, 4100, 400, 8)

# ---- S3 up to the canopy and the jellies over the void (4200..6100) ------------------------------------
L.checkpoint(4300, -800)
L.snoozling(4800, -800, fur=C(0.5, 1.0, 0.85))
L.pit_kill(5000, 5980, 700)
for i, x in enumerate([5260, 5620]):
    L.enemy("jellybob", x, -760, bob=16.0, phase=i * 0.3)
L.gem(5450, -1130)                                 # gem 1, on the arc between the jellies
L.lums(5260, -980, 5900, -980, 6, 60)

# ---- S4 down to the gate (6100..8000) ------------------------------------------------------------------
L.checkpoint(6700, 0)
L.enemy("cocobonk", 6900, 0)
# Gem 2: a hollow log - punch its cracked end. The path climbs over it.
L.breakable(7000, -140, 40, 140, lums=2)
L.block(7000, -160, 300, 20)
L.block(7280, -160, 20, 160)
L.gem(7140, -60)
L.secret(7040, -140, 240, 140)
L.goal(7600, 0)
L.lums(6050, -900, 6250, -900, 3)
for x, c in [(1600, PINK), (4600, TEAL), (6250, PINK), (7600, TEAL)]:
    L.glow(x, -300 if x != 4600 else -1000, c, radius=300, energy=0.6)
L.wall(8000, -1200, 0)

L.dress(-250, 1100, "dream", spacing=170, seed=231)
L.dress(4220, 4980, "dream", spacing=170, seed=232, skip=[(4750, 4850)])
L.dress(6650, 7950, "dream", spacing=170, seed=233, skip=[(6950, 7350), (7550, 7650)])
L.finish(spawn=(0, -2), left=-360, right=8060, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_3_abyssal_canopy.tscn"))
