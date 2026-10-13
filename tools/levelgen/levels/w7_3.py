"""World 7-3: THE READING ROOM - a lever you cannot reach in time.
A TIMED lever (2 s) sits far from the plate that completes the gate's AND lamps, so nobody can do both. Leave a
LOOPING echo: it walks to the lever and punches it again and again, while you wait on the plate. Then shushlings
(they only creep at you while you stand still) around a crumbling bridge, and a ladder of shelves to the exit.
Secrets: gem 0 over the reading-room shelves, gem 1 under the crumbling bridge, gem 2 at the top of the ladder;
the Snoozling reads in the final alcove.
Regenerate: python3 tools/levelgen/levels/w7_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

LAMP = C(1.0, 0.85, 0.5)
L = LevelKit("TheReadingRoom", "The Reading Room", theme="library", horizon=0, scenery="library")
L.ambience("pages", 0.9)
L.ambience("fireflies", 0.4)

R = 6200
L.land([(-300, 0), (3500, 0)], bottom=900)
L.land([(4350, 0), (R, 0)], bottom=900)
L.wall(-360, -900, 900)
L.wall(R, -900, 900)

# ---- S0 the foyer (-300..1300): shushlings - only creep while you stand still -----------------------------------------
L.checkpoint(0, 0)
L.sign(180, 0, "SHUSHLINGS only creep up on you\nwhile you stand STILL. Keep moving!", 420)
L.enemy("shushling", 800, 0)
L.enemy("wormwick", 1100, 0)
for x, y in [(450, -140), (700, -270), (950, -400)]:
    L.ledge(x, y, 190)
L.gem(1040, -460)                               # gem 0
L.lums(450, -200, 1040, -460, 6)

# ---- S1 the looping echo (1300..3000) ------------------------------------------------------------------------------------
L.checkpoint(1320, 0)
L.record_pad(1480, 0, max_time=10, loop=True)
lever = L.switch(2420, 0, [], mode=2, duration=2.0)     # TIMED: on for 2 s after each punch
gate = L.gate(3000, -420, 56, 420, need=2)
plate = L.plate(2800, 0, [gate])
L.extra(lever, targets=[L.rel(lever, gate)])
L.stop_pad(2500, 0, width=70)
L.sign(1600, 0, "The lever (far away) only stays on for 2 s.\nLeave a LOOPING echo to keep punching it\nwhile you wait on the plate.", 500)
L.enemy("pagebat", 2100, -300)
L.enemy("blotty", 1900, 0)
L.lums(1560, -110, 2300, -110, 6)

# ---- S2 the crumbling bridge (3000..4400): shushlings watch the far end -----------------------------------------------
L.checkpoint(3100, 0)
for i, x in enumerate([3560, 3760, 3960, 4160]):
    L.crumble(x, -10, 150, respawn=3.0)
L.pit_kill(3500, 4350, 700)
L.gem(3860, 130)                                # gem 1, under the bridge
L.enemy("shushling", 4500, 0)
L.enemy("candlewick", 3250, 0)
L.lums(3560, -120, 4240, -120, 6, arc=40)

# ---- S3 the shelf ladder and the exit (4400..6200) ---------------------------------------------------------------------------
L.checkpoint(4440, 0)
for x, y in [(4800, -130), (5020, -260), (5240, -390), (5460, -520)]:
    L.ledge(x, y, 180)
L.gem(5550, -580)                                # gem 2
L.snoozling(5750, 0, fur=C(0.7, 0.8, 1.0))
L.enemy("wormwick", 4700, 0)
L.enemy("blotty", 5400, 0)
L.goal(6050, 0)
L.lums(4800, -190, 5500, -580, 7)

for x in (400, 1700, 2900, 4500, 5600):
    L.glow(x, -260, LAMP, radius=340, energy=0.7)
L.dress(-250, 3450, "library", spacing=190, seed=731, skip=[(1440, 1520), (2330, 2500), (2750, 3060)])
L.dress(4400, R - 100, "library", spacing=190, seed=732, skip=[(5700, 5800), (5960, 6100)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_3_the_reading_room.tscn"))
