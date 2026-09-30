"""World 2-6: GRUMBLEFROST'S SUMMIT - the top of Frostwhistle Peak.
A last lift ride, the windswept ridge (crumbling ice, Snowls, a Yetling), an
ice-wall climb, and then the boss on the summit: GRUMBLEFROST, the Snowball
King. Jump his boulders or PUNCH THEM BACK at him; when he's flat on his back,
STOMP him!
Secrets: gem 0 above the lift cable, gem 1 on a ledge high on the ridge,
gem 2 above the victory ledge; the Snoozling's cage dangles over the ridge.
Regenerate: python3 tools/levelgen/levels/w2_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C

L = LevelKit("GrumblefrostSummit", "Grumblefrost's Summit", theme="summit", horizon=-200, scenery="ice")
L.ambience("snow", 1.2)

# ---- S0 the last station (x -300..1500) --------------------------------------------------------
L.wall(-360, -1600, 600)
L.land([(-300, 0), (1500, 0), (1580, 400)], bottom=1500)
L.sign(90, 0, "THE SUMMIT. Grumblefrost the\nSnowball King waits at the top...", 420)
L.deco("hut", 600, 0)
L.deco("lantern", 1400, 0)
L.lums(300, -110, 1100, -110, 6, 30)

# ---- S1 the last lift (1500..2740) --------------------------------------------------------------
L.pit_kill(1500, 2740, 1300)
L.gondola(1520, 0, waypoints=((1000, -700),), speed=170, wait=0.6, rider=True)
L.gem(2050, -700)
L.lums(1700, -250, 2450, -800, 8)

# ---- S2 the windswept ridge (2740..4300) -----------------------------------------------------------
L.land([(2660, 400), (2740, -700), (3100, -700)], bottom=1500)
L.checkpoint(2800, -700)
L.bell(2980, -700)
L.pit_kill(3100, 3400, 1300)
L.crumble(3170, -720, 160, respawn=2.0)
L.land([(3400, -700), (4300, -700)], bottom=1500)
L.wind(3100, -1600, 1200, 1000, wind=(-200, 0), gust=2.2)
L.enemy("snowl", 3600, -1050)
L.enemy("yetling", 4150, -700)
L.snoozling(3850, -930, hanging=True, fur=C(0.9, 0.7, 1.0))
L.ledge(3500, -960, 150)                            # gem 1 up on the ridge
L.gem(3575, -1020)
L.lums(3150, -800, 4100, -800, 9)
L.sign(3450, -700, "Windy up here! Gusts push you back.", 330)

# ---- S3 the ice wall (4300..4700) ------------------------------------------------------------------
L.net(4230, -1380, 60, 680)
L.lums(4260, -800, 4260, -1300, 5)
L.sign(3950, -700, "Climb the net (UP) to the summit.", 320)

# ---- S4 the summit arena: GRUMBLEFROST (4300..6030) -------------------------------------------------
L.land([(4300, -1400), (7000, -1400)], bottom=1500)
L.checkpoint(4380, -1400)
L.sign(4480, -1400, "GRUMBLEFROST! Jump his boulders -\nor PUNCH THEM BACK at him!", 420)
entry = L.gate(4700, -1760, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(5980, -1760, 48, 360)
L.arena(5340, -1400, [exit_gate], enemies=[("grumblefrost", 5500, -1400, {"asleep": True})])
boss = L.arena_children[0]
L.zone(4770, -1900, 1150, 500, [entry], everyone=True, send_on=False)
L.zone(4770, -1900, 1150, 500, [boss], everyone=True)
L.block(4700, -2400, 48, 640)                       # arena walls above the gates
L.block(5980, -2400, 48, 640)
L.ledge(4880, -1600, 180)
L.ledge(5640, -1600, 180)
L.lums(4850, -1500, 5900, -1500, 8, 40)

# ---- the victory ledge ------------------------------------------------------------------------------
L.goal(6500, -1400)
L.ledge(6250, -1640, 150)
L.gem(6325, -1700)
L.lums(6100, -1500, 6900, -1500, 6)
L.deco("snowman", 6750, -1400, 1.1)
L.deco("lantern", 6100, -1400)
L.wall(7000, -2800, -1400)

L.dress(-250, 6950, "snow", spacing=180, seed=26, skip=[(1450, 2760), (3050, 3450), (4150, 4350), (4650, 6060)])
L.finish(spawn=(0, -2), left=-360, right=7060, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_6_grumblefrost_summit.tscn"))
