class_name Crabbit
extends Enemy
## CRABBIT: a cross little crab scuttling sideways along the beach. Its big
## claw guards its front - punches from that side just clank. Jump on its back,
## or hit it from behind. Snaps its claw now and then (just a warning).

@export var walk_speed := 120.0

const SHELL := Color("ff6a4d")
const SHELL_DARK := Color("c94a35")

var _snap := 0.0


func _init() -> void:
	body_size = Vector2(56, 34)
	health = 1
	lum_drop = 2


func _behave(delta: float) -> void:
	patrol(walk_speed)
	_snap = maxf(_snap - delta * 3.0, 0.0)
	if fposmod(anim_time, 2.2) < delta:
		_snap = 1.0


func blocks_hit(by: Player, kind: HitKind) -> bool:
	if kind != HitKind.PUNCH or by == null:
		return false
	return signf(by.global_position.x - global_position.x) == float(facing)  # the claw's side


func _draw_body(ci: CanvasItem) -> void:
	var step := sin(anim_time * 18.0) * 4.0
	for k in 3:  # legs
		var x := -18.0 + k * 12.0
		ci.draw_line(Vector2(x, -10), Vector2(x - 8, 0 + (step if k % 2 == 0 else -step) * 0.4), OUTLINE, 4.0)
		ci.draw_line(Vector2(x, -10), Vector2(x - 8, 0 + (step if k % 2 == 0 else -step) * 0.4), SHELL_DARK, 2.0)
	Art.shape(ci, Art.ellipse(Vector2(-4, -18), 30, 16, 18), SHELL, OUTLINE, 3.0)
	for k in 3:
		ci.draw_circle(Vector2(-16 + k * 10, -26), 2.5, SHELL_DARK)
	# The big claw in front (snaps open and shut).
	var open := 0.25 + 0.35 * _snap
	var cl := Vector2(30, -22)
	Art.shape(ci, Art.ellipse(cl, 14, 11, 14), SHELL, OUTLINE, 3.0)
	Art.shape(ci, PackedVector2Array([cl + Vector2(6, -4), cl + Vector2(26, -14 - 12 * open), cl + Vector2(16, -2)]), SHELL, OUTLINE, 2.5)
	Art.shape(ci, PackedVector2Array([cl + Vector2(6, 4), cl + Vector2(26, 10 + 8 * open), cl + Vector2(16, 2)]), SHELL_DARK, OUTLINE, 2.5)
	for d: float in [-6.0, 8.0]:  # eyes on stalks
		ci.draw_line(Vector2(d, -30), Vector2(d, -42), OUTLINE, 3.0)
		Enemy.draw_eye(ci, Vector2(d, -45), 5.0, Vector2(1, 0), 0.6, is_stunned())
