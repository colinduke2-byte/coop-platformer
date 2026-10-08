"""World 6-4 (secret): THE NIGHTMARE CORE - the heart of the bad dream, and the remix finale.
A short gauntlet that borrows from every world (spike balls, flame jets,
crumbling stars, zaps), then two old foes back to back in the Core: first
CUCKOOLOSSUS (stomp the cuckoo when it sticks in the floor), then INKABELLA
(stomp or punch her tentacle when it sticks). Beat both and the dream is over.
Secrets: gem 0 above the spike-ball run, gem 1 between the two arenas, gem 2 in
a dream-chest past the Core; the Snoozling sits in the gauntlet.
Regenerate: python3 tools/levelgen/levels/w6_4.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

PINK, VIOLET, GOLD = C(1.0, 0.35, 0.55), C(0.65, 0.5, 1.0), C(1.0, 0.85, 0.45)
L = LevelKit("NightmareCore", "The Nightmare Core", theme="nebula_boss", horizon=0, scenery="nebula")
L.ambience("embers", 0.8, tint=C(1.0, 0.5, 0.7, 0.6))
L.ambience("stars", 0.6)

L.wall(-360, -1600, 600)
L.land([(-300, 0), (1800, 0)], bottom=1500)
L.land([(2600, 0), (9600, 0)], bottom=1500)

# ---- S0 the brink (x -300..1000) ------------------------------------------------------------------
L.sign(90, 0, "THE NIGHTMARE CORE. Old foes\nwait at the heart of the dream...", 420)
L.lums(300, -110, 900, -110, 5, 40)

# ---- S1 the gauntlet (1000..2700) ----------------------------------------------------------------
L.checkpoint(950, 0)
L.spikeball(1350, -200, count=2, radius=150, speed=110)
L.gem(1350, -420)                                  # gem 0 above the spike balls
L.flame(1650, 0, length=200, on=1.0, off=1.4)
L.snoozling(1750, 0, fur=C(1.0, 0.55, 0.7))
L.pit_kill(1800, 2600, 700)
for x in [1950, 2250]:
    L.crumble(x, 0, 144, respawn=2.0)
L.zap(2560, -10, 2560, -240, on=0.8, off=1.4)
L.lums(1100, -110, 1250, -110, 2)
L.lums(1980, -90, 2370, -90, 4, 30)

# ---- S2 the Core, part one: CUCKOOLOSSUS (2700..4500) ------------------------------------------------
L.checkpoint(2850, 0)
L.sign(3050, 0, "Round one: CUCKOOLOSSUS!\nStomp the cuckoo when it sticks.", 300)
entry1 = L.gate(3250, -360, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit1 = L.gate(4500, -360, 48, 360)
L.arena(3874, 0, [exit1], enemies=[("cuckoolossus", 3874, 0, {"asleep": True})])
boss1 = L.arena_children[0]
L.zone(3320, -500, 1110, 500, [entry1], everyone=True, send_on=False)
L.zone(3320, -500, 1110, 500, [boss1], everyone=True)
L.block(3250, -1000, 48, 640)
L.block(4500, -1000, 48, 640)
L.backwall(3298, -1000, 1202, 1000, shade=0.45)
L.ledge(3360, -300, 160)
L.ledge(4280, -300, 160)

# ---- between the rounds (4550..5400) -----------------------------------------------------------------
L.checkpoint(4700, 0)
L.gem(5000, -60)                                   # gem 1: a breather between the rounds
L.lums(4650, -110, 5300, -110, 6, 30)
L.sign(5200, 0, "Round two: INKABELLA!\nHit her tentacle when it sticks.", 300)

# ---- S3 the Core, part two: INKABELLA (5400..6700) -----------------------------------------------------
entry2 = L.gate(5400, -360, 48, 360, start_open=True, stay_open=False, open_offset=(0, -360))
exit2 = L.gate(6700, -360, 48, 360)
L.arena(6074, 0, [exit2], enemies=[("inkabella", 6074, 0, {"asleep": True})])
boss2 = L.arena_children[0]
L.zone(5470, -500, 1200, 500, [entry2], everyone=True, send_on=False)
L.zone(5470, -500, 1200, 500, [boss2], everyone=True)
L.block(5400, -1000, 48, 640)
L.block(6700, -1000, 48, 640)
L.backwall(5448, -1000, 1252, 1000, shade=0.45)
L.ledge(5520, -300, 160)
L.ledge(6510, -300, 160)
for x, c in [(3500, GOLD), (4200, GOLD), (5650, VIOLET), (6500, VIOLET)]:
    L.glow(x, -500, c, radius=320, energy=0.7)

# ---- the dream's end (6750..9600) -------------------------------------------------------------------------
# Gem 2: a dream-chest - punch its cracked side. The path climbs over it.
L.breakable(7000, -140, 40, 140, lums=3)
L.block(7000, -160, 300, 20)
L.block(7280, -160, 20, 160)
L.gem(7140, -60)
L.secret(7040, -140, 240, 140)
L.goal(7900, 0)
L.lums(7350, -110, 7820, -110, 5, 30)
for x in range(8100, 9500, 250):
    L.lums(x, -200, x, -400, 3)
L.sign(8300, 0, "You woke up from the Nightmare.\nSweet dreams, Dreamers!", 360)
L.wall(9600, -1200, 0)

L.dress(-250, 950, "dream", spacing=170, seed=241)
L.dress(4570, 5350, "dream", spacing=170, seed=242, skip=[(4950, 5050), (5150, 5250)])
L.dress(6770, 9550, "dream", spacing=170, seed=243, skip=[(6950, 7350), (7850, 7950), (8250, 8350)])
L.finish(spawn=(0, -2), left=-360, right=9660, bottom=1100, kill_y=1500)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w6_4_nightmare_core.tscn"))
