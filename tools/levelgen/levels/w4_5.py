"""World 4-5: NIGHT SHIFT - the Works after dark: only the lamps, the sparks and the eyes of the bots.
Teaches: belts with saw blades on rails over them, crumbling crates over the dark
scrap pit, the sorting floor (zaps, Windups, a crusher pair), tick-tock blocks lit
by their own glow, the long night line of saws and Springbots, a dark shaft up
to the high catwalk and a zipline over the abyss to the gate.
Secrets: gem 0 up a bounce pad past the crumbling crates, gem 1 on the shelves
above the sorting floor, gem 2 in a toolbox at the finish; the Snoozling is on a
shelf in the night line.
Regenerate: python3 tools/levelgen/levels/w4_5.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

LAMP = C(1.0, 0.82, 0.5)
BLUE = C(0.5, 0.75, 1.0)
PINK = C(1.0, 0.5, 0.75)
L = LevelKit("NightShift", "Night Shift", theme="nightshift", horizon=0, scenery="factory")
L.ambience("fireflies", 0.6, darkness=0.6)
L.ambience("embers", 0.4)

L.wall(-360, -1200, 600)
L.land([(-300, 0), (1700, 0), (1700, 16), (2700, 16), (2700, 0), (3400, 0)], bottom=1500)

# ---- S0 clocking in (x -300..1400) ----------------------------------------------------------------
L.sign(90, 0, "NIGHT SHIFT. Lights out -\nstick to the lamps!", 400)
for x in [100, 700, 1300]:
    L.glow(x, -160, LAMP, radius=300, energy=0.9)
L.deco("clock", 450, 0, 1.0)
L.lums(300, -110, 1150, -110, 6, 40)
L.enemy("windup", 950, 0)

# ---- S1 the belt and the rail saws (1400..3400) -------------------------------------------------------
L.checkpoint(1340, 0)
L.sign(1560, 0, "Saws on rails! Watch\nthem rise, then go.", 240)
L.block(1700, 0, 1000, 16, conveyor=150.0)         # a helpful belt: ride it under the saws
for i, x in enumerate([1950, 2350]):
    L.saw(x, -40, waypoints=((0, -200),), speed=130.0 + i * 20)
    L.glow(x, -150, PINK, radius=200, energy=0.7)
L.enemy("sparkbot", 3000, -100, travel=V(0, -160), speed=100.0)
L.glow(3000, -180, BLUE, radius=240, energy=0.8)
L.lums(1750, -100, 2650, -100, 8)

# ---- S2 crumbling crates over the scrap pit (3400..4900) ------------------------------------------------
L.checkpoint(3250, 0)
L.pit_kill(3400, 4400, 700)
for x, y in [(3480, -20), (3730, -40), (3990, -20), (4240, -40)]:
    L.crumble(x, y, 150, respawn=2.0)
    L.glow(x + 75, -160, LAMP, radius=200, energy=0.7)
L.lums(3500, -140, 4300, -140, 8, 30)
L.land([(4400, 0), (6900, 0)], bottom=1500)
# Gem 0: a bounce pad up to a high shelf.
L.pad(4700, 0, height=560)
L.ledge(4600, -520, 260)
L.gem(4730, -590)
L.glow(4730, -560, LAMP, radius=220, energy=0.8)

# ---- S3 the sorting floor (4900..6900) ------------------------------------------------------------------
L.checkpoint(4950, 0)
for i, x in enumerate([5300, 6100]):
    L.zap(x, -10, x, -240, on=0.9, off=1.5, phase=i * 0.4)
    L.glow(x, -120, BLUE, radius=200, energy=0.8)
L.enemy("windup", 5800, 0)
L.ceiling([(6300, -900), (6310, -420), (6800, -420), (6810, -900)], top=-1000)
L.backwall(6300, -900, 510, 900, shade=0.5)
for x in [6380, 6600]:
    L.crusher(x, -420, w=140, h=112, drop=292)
L.glow(6550, -250, PINK, radius=260, energy=0.7)
# Gem 1: two shelves up over the sorting floor.
L.ledge(5480, -170, 200)
L.ledge(5700, -340, 200)
L.gem(5820, -400)
L.glow(5700, -300, LAMP, radius=240, energy=0.8)
L.lums(5100, -110, 6200, -110, 10, 20)

# ---- S4 glowing tick-tock blocks over the dark (6900..8200) -------------------------------------------------
L.checkpoint(6880, 0)
L.pit_kill(6900, 7900, 700)
for i, x in enumerate([6940, 7180, 7420, 7660]):
    L.beat(x, -40, 160, 32, group=i % 2)
    L.glow(x + 80, -120, PINK if i % 2 == 0 else BLUE, radius=200, energy=0.8)
L.lums(7000, -140, 7720, -140, 7, 30)

# ---- S5 the night line (7900..12600) ---------------------------------------------------------------------
L.land([(7900, 0), (13100, 0)], bottom=1500)
L.land([(15000, 0), (16500, 0)], bottom=1500)
L.checkpoint(8000, 0)
L.bell(8120, 0)
L.enemy("springbot", 8600, 0)
L.ledge(8950, -170, 220)
L.snoozling(9060, -170, fur=C(0.75, 0.7, 1.0))
L.glow(9060, -260, LAMP, radius=240, energy=0.8)
L.saw(9500, -40, waypoints=((0, -200),), speed=140.0)
L.enemy("sparkbot", 9900, -120, travel=V(200, 0), speed=120.0)
L.saw(10300, -40, waypoints=((0, -200),), speed=160.0)
for x in [8400, 9500, 10300]:
    L.glow(x, -160, LAMP if x == 8400 else PINK, radius=260, energy=0.8)
L.lums(8300, -110, 10500, -110, 14, 20)
L.checkpoint(10560, 0)
# Gem 2: a toolbox - punch its cracked side. The path climbs over its lid.
L.breakable(10800, -140, 40, 140, lums=2)
L.block(10800, -160, 300, 20)
L.block(11080, -160, 20, 160)
L.gem(10940, -60)
L.secret(10840, -140, 240, 140)
L.glow(10950, -240, LAMP, radius=240, energy=0.8)
L.enemy("windup", 11500, 0)
L.lums(11800, -110, 12130, -110, 4, 30)

# ---- S7 the dark shaft up to the high catwalk (12300..13700) --------------------------------------------
L.checkpoint(12350, 0)
for i, (x, y) in enumerate([(12700, -180), (12920, -360), (12700, -540), (12920, -720)]):
    L.ledge(x, y, 180)
    L.glow(x + 90, y - 60, LAMP if i % 2 == 0 else BLUE, radius=180, energy=0.7)
    L.lums(x + 40, y - 70, x + 140, y - 70, 2)
L.enemy("sparkbot", 12880, -460, travel=V(0, -260), speed=80.0)
L.block(13100, -900, 560, 30)                       # the high catwalk
L.glow(13380, -980, LAMP, radius=260, energy=0.9)
L.lums(13150, -990, 13550, -990, 4, 20)

# ---- S8 the zipline over the abyss (13600..15000) ----------------------------------------------------------
L.pit_kill(13100, 15000, 700)
L.zipline(13620, -960, 15100, -260)
L.lums(13750, -900, 14950, -330, 9)
for x in [14000, 14600]:
    L.glow(x, -500, PINK, radius=220, energy=0.6)

# ---- S9 the night yard and the gate (15000..16500) --------------------------------------------------------
L.checkpoint(15200, 0)
L.enemy("windup", 15600, 0)
L.goal(16100, 0)
L.lums(15350, -110, 16000, -110, 6, 30)
for x in [15200, 15800, 16100]:
    L.glow(x, -200, LAMP, radius=300, energy=1.0)
L.deco("clock", 16350, 0, 1.1)
L.wall(16500, -1200, 0)

L.dress(-250, 1450, "factory", spacing=170, seed=111)
L.dress(4450, 6250, "factory", spacing=180, seed=112, skip=[(4550, 4850), (5250, 5350)])
L.dress(7950, 16450, "factory", spacing=170, seed=113, skip=[(9400, 9600), (10200, 10400), (10750, 11150), (12450, 13100),
        (15150, 15250), (16050, 16150)])
L.finish(spawn=(0, -2), left=-360, right=16560, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_5_night_shift.tscn"))
