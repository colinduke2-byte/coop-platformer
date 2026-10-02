"""World 4-3: STEAM PIPES - the boiler rooms deep in the Works, hissing and clanking.
Teaches: rippling fire vents in the floor, a steam geyser that throws you up to
the pipe walkway, a corridor of vents above AND below with Sparkbots, a
pressure-cart over the boiling pit, a springbot pipe yard with zaps, then the gate.
Secrets: gem 0 at the far end of the pipe walkway, gem 1 high above the cart
(a steam geyser at the pit's edge), gem 2 in a toolbox at the finish; the
Snoozling is on the walkway.
Regenerate: python3 tools/levelgen/levels/w4_3.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

ORANGE = C(1.0, 0.6, 0.3)
L = LevelKit("SteamPipes", "Steam Pipes", theme="steam", horizon=0, scenery="factory")
L.ambience("spores", 0.8, tint=C(1, 1, 1, 0.5))
L.ambience("embers", 0.5)

# ---- S0 the boiler room door (x -300..1400) -----------------------------------------------------
L.wall(-360, -1200, 600)
L.land([(-300, 0), (6600, 0)], bottom=1500)
L.sign(90, 0, "STEAM PIPES. Hot, hissy and\nfull of things that go BOOM.", 420)
L.deco("pipes", 600, 0, 1.3)
L.deco("gear", 900, 0)
L.lums(300, -110, 1000, -110, 6, 40)

# ---- S1 the fire vents (1400..3000) ---------------------------------------------------------------
L.sign(1350, 0, "Fire vents sputter,\nthen blast. Wait,\nthen dash!", 260)
for i, x in enumerate([1800, 2100, 2400, 2700]):
    L.flame(x, 0, length=200, on=0.8, off=1.6, phase=0.6 - i * 0.18)   # a wave you can run with
L.lums(1750, -120, 2750, -120, 8)
L.enemy("windup", 2950, 0)

# ---- S2 the steam geyser and the pipe walkway (3000..4800) ---------------------------------------------
L.checkpoint(3060, 0)
L.sign(3150, 0, "Steam geysers throw\nyou up - steer onto\nthe pipes!", 260)
L.geyser(3320, 0, height=620, calm=1.4)
L.block(3420, -520, 1380, 40)                      # the pipe walkway
L.enemy("windup", 4100, -520)
L.snoozling(3800, -520, fur=C(0.7, 1.0, 0.9))
L.gem(4740, -600)                                  # gem 0 at the walkway's end
L.lums(3500, -620, 4650, -620, 9, 20)
L.lums(3320, -150, 3320, -450, 3)

# ---- S3 the vent corridor (4800..6600) ------------------------------------------------------------------
L.checkpoint(4900, 0)
L.ceiling([(5100, -900), (5110, -380), (6500, -380), (6510, -900)], top=-2600)
L.backwall(5100, -900, 1400, 900, shade=0.5)
for i, x in enumerate([5400, 5800, 6200]):
    L.flame(x, -380, length=170, on=0.8, off=1.6, phase=0.6 - i * 0.2, rotation=180)
for i, x in enumerate([5600, 6000]):
    L.flame(x, 0, length=170, on=0.8, off=1.6, phase=0.2 - i * 0.2 + 0.5)
L.enemy("sparkbot", 5900, -120, travel=V(0, -120), speed=90.0)
for x in [5300, 5900, 6400]:
    L.glow(x, -200, ORANGE, radius=260, energy=0.6)
L.lums(5200, -110, 6400, -110, 10, 20)

# ---- S4 the boiling pit: the pressure cart (6600..7700) ---------------------------------------------------
L.pit_kill(6600, 7600, 700)
L.moving(6602, -2, w=200, h=30, waypoints=((800, 0),), speed=160, wait=1.0, rider=True)
L.geyser(6540, 0, height=760, calm=2.0, phase=0.5)  # the secret way up to gem 1
L.gem(6560, -820)
L.lums(6700, -100, 7500, -100, 7)

# ---- S5 the springbot pipe yard (7600..10200) --------------------------------------------------------------
L.land([(7600, 0), (12600, 0)], bottom=1500)
L.checkpoint(7680, 0)
L.bell(7800, 0)
L.enemy("springbot", 8200, 0)
L.enemy("springbot", 8800, 0)
for i, x in enumerate([9200, 9500, 9800]):
    L.zap(x, -10, x, -240, on=0.9, off=1.5, phase=i * 0.25)
L.lums(7900, -110, 9900, -110, 14, 20)
L.deco("pipes", 8500, 0, 1.2)

# ---- S6 the finish (10200..12600) ------------------------------------------------------------------------
L.checkpoint(10300, 0)
# Gem 2: a toolbox - punch its cracked side. The path climbs over its lid.
L.breakable(10800, -140, 40, 140, lums=2)
L.block(10800, -160, 300, 20)
L.block(11080, -160, 20, 160)
L.gem(10940, -60)
L.secret(10840, -140, 240, 140)
L.enemy("windup", 11500, 0)
L.goal(12200, 0)
L.lums(11800, -110, 12130, -110, 4, 30)
L.deco("clock", 12420, 0, 1.1)
L.wall(12600, -1200, 0)

L.dress(-250, 1350, "factory", spacing=160, seed=91)
L.dress(7620, 12550, "factory", spacing=170, seed=93, skip=[(9150, 9850), (10750, 11150)])
L.finish(spawn=(0, -2), left=-360, right=12660, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w4_3_steam_pipes.tscn"))
