"""World 7-4: THE FORBIDDEN STACKS - the lamps are low and the shelves lean in.
A LOOPING echo walks to a plate, stands on it, and goes back to the start - so the plate PULSES, and the gate
beside it only stays open while it is held: time your dash. Then a timed lever for a second gate, candlewicks
(punch them: you can't stomp a flame), pagebats overhead and a book-hopping bridge over the gap.
Secrets: gem 0 on the shelf over the pulse gate, gem 1 in the timed alcove, gem 2 over the book bridge; the
Snoozling hides behind the last shelf.
Regenerate: python3 tools/levelgen/levels/w7_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

CAND = C(1.0, 0.8, 0.4)
CYAN = C(0.5, 0.85, 1.0)
L = LevelKit("ForbiddenStacks", "The Forbidden Stacks", theme="stacks", horizon=0, scenery="library")
L.ambience("pages", 0.6, darkness=0.3)
L.ambience("fireflies", 0.6)

R = 6300
L.land([(-300, 0), (3900, 0)], bottom=900)
L.land([(4700, 0), (R, 0)], bottom=900)
L.wall(-360, -900, 900)
L.wall(R, -900, 900)

# ---- S0 the dark entrance (-300..1300): candles light the way --------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(250, 0, "It is dark in here.\nCandlewicks burn: PUNCH them, don't stomp.", 420)
L.enemy("candlewick", 700, 0)
L.enemy("pagebat", 900, -300)
L.enemy("candlewick", 1100, 0)
L.spikes(560, 0, 100)
for x in (250, 700, 1100):
    L.glow(x, -120, CAND, radius=300, energy=0.9)
L.lums(520, -110, 1200, -110, 6)

# ---- S1 the pulse gate (1300..2800) ----------------------------------------------------------------------------------------------
L.checkpoint(1320, 0)
L.record_pad(1480, 0, max_time=9, loop=True)
pgate = L.gate(2480, -300, 56, 300, stay_open=False)
pplate = L.echo_plate(2260, 0, [pgate], width=110)
L.sign(1740, 0, "A LOOPING echo makes the\nplate PULSE: the gate is only\nopen while it is held.", 340)
L.ledge(2100, -170, 200)
L.ledge(2300, -300, 200)
L.gem(2390, -360)                                # gem 0, on the shelf above the plate
L.enemy("blotty", 1800, 0)
L.lums(1960, -110, 2200, -110, 3)

# ---- S2 the timed lever (2800..3900) --------------------------------------------------------------------------------------------------
L.checkpoint(2740, 0)
tgate = L.gate(3500, -300, 56, 300)
tlever = L.switch(3060, 0, [tgate], mode=2, duration=4.5)
L.sign(2900, 0, "Punch the lever: the gate stays up for\n4 seconds. RUN.", 420)
L.gem(3300, -60)                                 # gem 1 (in the run, rewards the dash)
L.enemy("shushling", 3750, 0)
L.enemy("candlewick", 3250, 0)
L.lums(3100, -110, 3460, -110, 4)

# ---- S3 the book bridge (3900..4700) and the end (4700..6300) --------------------------------------------------------------------------
L.checkpoint(3860, 0)
L.pit_kill(3900, 4700, 700)
for i, x in enumerate([3960, 4150, 4340, 4530]):
    L.ledge(x, -30, 150)                         # stepping-stone books (the shelf-top ones bob a little)
L.moving(4245, -150, 110, 24, waypoints=((0, -70),), speed=50, wait=0.4, one_way=True)
L.gem(4300, -230)                                # gem 2, over the book bridge
L.enemy("pagebat", 4250, -300)
L.checkpoint(4760, 0)
L.snoozling(5300, 0, fur=C(0.7, 0.8, 1.0))
L.enemy("wormwick", 5000, 0)
L.enemy("candlewick", 5600, 0)
L.goal(6150, 0)
for x in (3300, 4300, 5000, 5800):
    L.glow(x, -150, CAND, radius=300, energy=0.9)
L.lums(4960, -110, 5900, -110, 8)

L.dress(-250, 3850, "stacks", spacing=190, seed=741, skip=[(1440, 1520), (2200, 2330), (2440, 2520), (3020, 3100), (3460, 3540)])
L.dress(4700, R - 100, "stacks", spacing=190, seed=742, skip=[(6100, 6250)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_4_the_forbidden_stacks.tscn"))
