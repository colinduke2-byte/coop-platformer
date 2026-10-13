"""World 7-1: INKWELL FOYER - the first night in the Hushed Library.
Teaches the ECHO: step on a glowing RECORD pad, walk to a plate, step on its STOP pad - and a ghost of you is
left standing there, holding the plate while you get on with it. Then a moving platform that only runs while an
echo holds its plate, and a HEAVY plate (needs two: your echo + you).
Secrets: gem 0 on the high shelf above the first gate, gem 1 under the bridge platform's far end, gem 2 behind
the heavy plate's gate; the Snoozling reads in the last alcove.
Regenerate: python3 tools/levelgen/levels/w7_1.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

LAMP = C(1.0, 0.85, 0.5)
L = LevelKit("InkwellFoyer", "Inkwell Foyer", theme="library", horizon=0, scenery="library")
L.ambience("pages", 0.7)
L.ambience("fireflies", 0.4)

R = 4900
# Floor with one wide gap (the bridge section).
L.land([(-300, 0), (1900, 0)], bottom=900)
L.land([(2500, 0), (R, 0)], bottom=900)
L.wall(-360, -900, 900)
L.wall(R, -900, 900)

# ---- S0 the front hall (-300..1500): meet the echo -------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(170, 0, "RECORD pad: step on it, then walk.\nYour route is recorded for 12 s.", 420)
L.record_pad(420, 0, max_time=12)
g1 = L.gate(1060, -192, 48, 192, stay_open=False)
e1 = L.echo_plate(820, 0, [g1])
L.sign(660, 0, "STOP pad (the square) on a plate:\nyour ECHO stays there. It holds the plate!", 440)
L.lums(500, -110, 760, -110, 4)
L.ledge(1100, -330, 260)                       # the high shelf over the gate
L.gem(1230, -380)                               # gem 0
L.ledge(900, -170, 160)
L.enemy("blotty", 1500, 0)
L.lums(1180, -110, 1420, -110, 4)

# ---- S1 the bridge (1500..2700): a platform that runs only while an echo holds its plate -----------------------------
L.checkpoint(1380, 0)
L.record_pad(1560, 0, max_time=12)
bridge = L.moving(1890, 0, 220, 30, waypoints=((620, 0),), speed=210, wait=0.4, active=False, one_way=True)
e2 = L.echo_plate(1760, 0, [bridge])
L.sign(1640, 0, "The platform only runs while\nsomeone holds ITS plate.", 420)
L.pit_kill(1900, 2500, 700)
L.gem(2260, 140)                                # gem 1, in the gap under the bridge
L.lums(2000, -120, 2420, -120, 6, arc=40)
L.enemy("wormwick", 2800, 0)

# ---- S2 the heavy plate (2700..4100): it needs TWO - your echo and you ---------------------------------------------------
L.checkpoint(2640, 0)
L.record_pad(2900, 0, max_time=12)
g2 = L.gate(3800, -240, 48, 240)
heavy = L.echo_plate(3300, 0, [g2], required=2, latch=True, width=150)
L.sign(3060, 0, "A HEAVY plate needs two.\nLeave an echo on it, then stand on it too.", 440)
L.enemy("shushling", 3550, 0)
L.lums(3000, -110, 3260, -110, 4)
L.gem(3960, -60)                                # gem 2 (beyond the gate)

# ---- S3 the reading alcove (4100..4900) -------------------------------------------------------------------------------
L.checkpoint(4150, 0)
L.snoozling(4450, 0, fur=C(0.7, 0.8, 1.0))
L.enemy("pagebat", 4300, -230)
L.goal(4750, 0)
L.lums(4200, -110, 4600, -110, 6)

# ---- dressing ---------------------------------------------------------------------------------------------------------
for x in (300, 1200, 2300, 3200, 4400):
    L.glow(x, -260, LAMP, radius=340, energy=0.7)
L.dress(-250, 1850, "library", spacing=190, seed=711, skip=[(380, 460), (780, 860), (1020, 1100)])
L.dress(2520, R - 100, "library", spacing=190, seed=712, skip=[(2860, 2940), (3240, 3380), (3780, 3840), (4700, 4800)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_1_inkwell_foyer.tscn"))
