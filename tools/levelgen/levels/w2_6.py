"""World 2-6: GRUMBLEFROST'S SUMMIT - the top of Frostwhistle Peak.
A last lift ride, the windswept ridge (crumbling ice, Snowls, a Yetling), the
frozen tollgate (fetch the key from a high ledge to open the gate), an
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

DX = 1400   # the ice wall and the summit sit DX further right (room for the tollgate)

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
L.land([(3400, -700), (4400, -700)], bottom=1500)
L.wind(3100, -1600, 1200, 1000, wind=(-200, 0), gust=2.2)
L.enemy("snowl", 3600, -1050)
L.enemy("yetling", 4150, -700)
L.snoozling(3850, -930, hanging=True, fur=C(0.9, 0.7, 1.0))
L.ledge(3500, -960, 150)                            # gem 1 up on the ridge
L.gem(3575, -1020)
L.lums(3150, -880, 4100, -880, 9)
L.sign(3450, -700, "Windy up here! Gusts push you back.", 330)

# ---- S2b the frozen tollgate (4400..5700) -----------------------------------------------------------
L.pit_kill(4400, 4700, 1300)
L.crumble(4440, -720, 120, respawn=2.0)
L.crumble(4580, -720, 120, respawn=2.0)
L.land([(4700, -700), (5700, -700)], bottom=1500)
L.checkpoint(4760, -700)
L.sign(4900, -700, "Locked! Fetch the key\nfrom the high ledge.", 300)
L.pad(5060, -700, height=420)
L.ledge(4980, -1060, 220)
L.key(5090, -1120)
L.enemy("snowl", 5150, -1380)
L.enemy("yetling", 5300, -700)
L.key_door(5440, -920, 64, 220)
L.lums(4990, -1160, 5190, -1160, 3)
L.lums(4800, -800, 5380, -800, 5, 30)

# ---- S3 the ice wall ---------------------------------------------------------------------------------
L.net(4230 + DX, -1380, 60, 680)
L.lums(4260 + DX, -800, 4260 + DX, -1300, 5)

# ---- S4 the summit arena: GRUMBLEFROST ---------------------------------------------------------------
L.land([(4300 + DX, -1400), (7000 + DX, -1400)], bottom=1500)
L.checkpoint(4380 + DX, -1400)
L.sign(4480 + DX, -1400, "GRUMBLEFROST! Jump his boulders -\nor PUNCH THEM BACK at him!", 420)
entry = L.gate(4700 + DX, -1760, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit_gate = L.gate(5980 + DX, -1760, 48, 360)
L.arena(5340 + DX, -1400, [exit_gate], enemies=[("grumblefrost", 5500 + DX, -1400, {"asleep": True})])
boss = L.arena_children[0]
L.zone(4770 + DX, -1900, 1150, 500, [entry], everyone=True, send_on=False)
L.zone(4770 + DX, -1900, 1150, 500, [boss], everyone=True)
L.block(4700 + DX, -2400, 48, 640)                  # arena walls above the gates
L.block(5980 + DX, -2400, 48, 640)
L.ledge(4880 + DX, -1600, 180)
L.ledge(5640 + DX, -1600, 180)
L.lums(4850 + DX, -1500, 5900 + DX, -1500, 8, 40)

# ---- the victory ledge ------------------------------------------------------------------------------
L.goal(6500 + DX, -1400)
L.ledge(6250 + DX, -1640, 150)
L.gem(6325 + DX, -1700)
L.lums(6100 + DX, -1500, 6900 + DX, -1500, 6)
L.deco("snowman", 6750 + DX, -1400, 1.1)
L.deco("lantern", 6100 + DX, -1400)
L.wall(7000 + DX, -2800, -1400)

L.dress(-250, 6950 + DX, "snow", spacing=180, seed=26, skip=[(1450, 2760), (3050, 3450), (4350, 4750), (5000, 5750),
        (4650 + DX, 6060 + DX)])
L.finish(spawn=(0, -2), left=-360, right=7060 + DX, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w2_6_grumblefrost_summit.tscn"))
