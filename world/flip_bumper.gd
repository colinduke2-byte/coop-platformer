@tool
class_name FlipBumper
extends Bumper
## A pinball bumper that flips gravity every time you bounce off it. Timed puzzles: bounce,
## flip, and be ready for the new floor. Same knock-back as a Bumper.

func _on_bounced(p: Player) -> void:
	if p.remote:
		return
	if GameManager.flip_gravity():
		Audio.play("clank", -6.0, 1.7)
		if Net.is_online():
			Net.relay_call(self, "net_flip", [GameManager.gravity_dir])


func net_flip(dir: int) -> void:
	GameManager.set_gravity_dir(dir, true)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var dir := -GameManager.gravity_dir if not Engine.is_editor_hint() else -1
	var s := 1.0 + 0.2 * _hit
	var c := GravityArt.color_for(dir)
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * s, radius * s, 28), o, o)
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * 0.85 * s, radius * 0.85 * s, 28), th.accent, o, 0.0)
	Art.shape(self, Art.ellipse(Vector2.ZERO, radius * 0.58 * s, radius * 0.58 * s, 24), Color.WHITE if _hit > 0.3 else c.lightened(0.15), o, 3.0)
	GravityArt.arrow(self, Vector2.ZERO, dir, radius * 0.3, o, o)
