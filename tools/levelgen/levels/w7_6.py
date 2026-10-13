"""World 7-6: THE GREAT LIBRARY - the Archivist's reading hall.
A short run-in with the pieces you know, then the hall: THE ARCHIVIST floats inside a ward of living script that
nothing can touch... until BOTH seal plates are held at once. Record an echo onto one plate, step on the other:
the ward shatters, he sinks to the floor, and you get two hits in. He throws pages, claps shockwaves along the
floor, and (from the second phase) ERASES your echoes so you must record again. Phase 3 brings inkblots.
Secrets: gem 0 on the run-in's shelf, gem 1 on the hall's high ledge, gem 2 on the victory run; the Snoozling
stands on the victory run.
Regenerate: python3 tools/levelgen/levels/w7_6.py"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit
from tscn import C, V

GOLD = C(1.0, 0.85, 0.5)
L = LevelKit("TheGreatLibrary", "The Great Library", theme="scriptorium", horizon=0, scenery="library")
L.ambience("pages", 1.0)
L.ambience("embers", 0.4)

R = 5800
L.land([(-300, 0), (R, 0)], bottom=900)
L.wall(-360, -900, 900)
L.wall(R, -900, 900)

# ---- S0 the run-in (-300..1400) ---------------------------------------------------------------------------------------------------------
L.checkpoint(0, 0)
L.sign(280, 0, "THE GREAT LIBRARY. A ward only\nTWO plates can break guards it.", 380)
L.record_pad(520, 0, max_time=8)
rg = L.gate(1000, -240, 48, 240, stay_open=False)
rp = L.echo_plate(820, 0, [rg], width=110)
L.sign(660, 0, "(Practice: an echo on the plate\nholds this gate open.)", 360)
L.ledge(700, -170, 200)
L.ledge(900, -300, 200)
L.gem(1000, -360)                                # gem 0
L.enemy("candlewick", 1250, 0)
L.lums(620, -110, 760, -110, 3)

# ---- S1 the hall: THE ARCHIVIST (1450..3550) ------------------------------------------------------------------------------------------------
L.checkpoint(1380, 0)
L.sign(1560, 0, "THE ARCHIVIST!  Hold BOTH seal plates at once.\nRecord an echo onto one, step on the other,\nthen HIT HIM while he is dazed.", 520)
entry = L.gate(1440, -480, 48, 480, start_open=True, stay_open=False, open_offset=(0, 520))
exit_gate = L.gate(3560, -480, 48, 480, open_offset=(0, -520))
plate_a = L.echo_plate(1880, 0, [], width=130)
plate_b = L.echo_plate(3120, 0, [], width=130)
L.record_pad(1700, 0, max_time=8)                # left of plate A: record the walk onto A
L.record_pad(3300, 0, max_time=8)                # right of plate B: record the walk onto B
L.arena(2500, 0, [exit_gate], enemies=[("archivist", 2500, -190, {"asleep": True})])
boss = L.arena_children[0]
L.extra(boss, plates=[L.rel(boss, plate_a), L.rel(boss, plate_b)], floor_y=0.0)
L.zone(1490, -520, 2040, 700, [entry], everyone=True, send_on=False)
L.zone(1490, -520, 2040, 700, [boss], everyone=True)
L.ledge(3340, -150, 200)                         # above the right-hand record pad, out of the boss's way
L.gem(3440, -210)                                # gem 1
for x in (1750, 2500, 3250):
    L.glow(x, -300, GOLD, radius=380, energy=0.8)
L.lums(1900, -110, 3100, -110, 8)

# ---- S2 the victory run (3560..5800) ------------------------------------------------------------------------------------------------------------
L.checkpoint(3660, 0)
L.snoozling(3900, 0, fur=C(0.7, 0.8, 1.0))
L.enemy("pagebat", 4300, -260)
L.ledge(4400, -150, 200)
L.ledge(4640, -280, 200)
L.gem(4740, -340)                                # gem 2
L.goal(5500, 0)
L.lums(3800, -110, 5300, -110, 9)

L.dress(-250, 1380, "library", spacing=190, seed=761, skip=[(480, 560), (780, 880), (960, 1060)])
L.dress(3600, R - 100, "library", spacing=200, seed=762, skip=[(5420, 5560)])

L.finish(spawn=(0, -2), left=-360, right=R + 60, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/w7_6_the_great_library.tscn"))
