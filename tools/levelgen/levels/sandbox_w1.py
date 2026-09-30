"""Sandbox with every World 1 toy and enemy (not in the level list; open it with F6)."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from kit import LevelKit

L = LevelKit("SandboxW1", "World 1 Toybox", theme="meadow", horizon=0, scenery="forest", backdrop={"light_shafts": True})
L.ground(-400, 900, 0)
L.dandelion(300, 0, height=200)
L.geyser(600, 0, height=380)
L.ground(900, 1500, 0)
L.seesaw(1200, 0, 320)
L.ground(1500, 1700, 0)
L.bridge(1700, 0, 2400, 0)
L.brambles(1700, 260, 700, 80)
L.ground(2400, 2800, 0)
L.pendulum(3100, -520, rope=300)
L.pendulum(3500, -520, rope=300, spiked=True, phase=0.5)
L.ground(2800, 4000, 200)
L.leaf(4200, -60)
L.ground(4400, 4800, 0)
L.water(4800, 20, 900, 300)
L.raft(5000, 20, travel=600)
L.ground(5700, 7400, 0)
L.acorns(5900, -320)
for i, k in enumerate(["shellbert", "bumblebonk", "diggle", "ribbiton", "prickleroll", "puffcap", "wispet"]):
    L.enemy(k, 6100 + i * 180, -120 if k in ("bumblebonk", "wispet") else 0)
L.finish(spawn=(0, -2), left=-400, right=7400, bottom=560, kill_y=900)
L.save(os.path.join(os.path.dirname(__file__), "../../../levels/sandbox_w1.tscn"))
