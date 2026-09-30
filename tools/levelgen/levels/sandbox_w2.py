"""Sandbox with every World 2 toy and enemy (not in the level list; open it with F6)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("SandboxW2", "World 2 Toybox", theme="frost", horizon=0, scenery="ice")
L.ambience("snow", 1.0)
L.land([(-400, 0), (700, 0), (900, -40), (1400, -40), (2400, 200), (3200, 200)])
L.snowpile(300, 0)
L.enemy("grunt", 1200, -40)
L.enemy("grunt", 1900, 100)
L.gondola(3300, 120, waypoints=((900, -500),), w=200, speed=160)
L.land([(4400, -420), (6000, -420)])
L.avalanche(4500, -420, distance=1200, speed=300)
L.dress(-400, 6000, "snow", seed=7)
L.deco("snowman", 500, 0)
L.deco("igloo", 1100, -40)
L.deco("skis", 1300, -40)
L.finish(spawn=(0, -2), left=-400, right=6000, bottom=900, kill_y=1200)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/sandbox_w2.tscn"))
