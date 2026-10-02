class_name Windup
extends Enemy
## WINDUP: a wind-up tin soldier marching back and forth with a big key turning
## in its back. Hit it once and the key pops off - it panics and races around
## twice as fast! A second hit (or a stomp) finishes it.

@export var walk_speed := 110.0

const TIN := Color("d94a3f")
const TIN_DARK := Color("a8322a")
const BRASS := Color("e8c04a")
const FACE := Color("f6d7b0")

var _keyless := false


func _init() -> void:
	body_size = Vector2(40, 58)
	health = 2
	lum_drop = 3


func _behave(_delta: float) -> void:
	patrol(walk_speed * (2.1 if _keyless else 1.0))


func _on_hurt(_by: Player, _kind: HitKind) -> void:
	if not _keyless:
		_keyless = true
		squash(Vector2(1.3, 0.75))
		Vfx.puff(global_position + Vector2(-facing * 20.0, -40.0), 4, BRASS, Vector2(-facing, -1).normalized(), 0.6)


func _draw_body(ci: CanvasItem) -> void:
	var step := sin(anim_time * (16.0 if _keyless else 9.0)) * 5.0
	# Legs (stiff, marching).
	for d: float in [-1.0, 1.0]:
		var hip := Vector2(d * 8, -18)
		var foot := hip + Vector2(step * d, 16)
		ci.draw_line(hip, foot, OUTLINE, 9.0)
		ci.draw_line(hip, foot, Color("2f3a5a"), 6.0)
		Art.shape(ci, Art.ellipse(foot + Vector2(3, 0), 7, 4, 10), OUTLINE, OUTLINE, 1.0)
	# Body: a red tin coat with gold buttons and a belt.
	Art.shape(ci, Art.rounded_rect(Vector2(-14, -46), Vector2(14, -16), 5.0), TIN, OUTLINE, 2.5)
	ci.draw_rect(Rect2(-14, -26, 28, 5), Color("2f3a5a"))
	for k in 2:
		ci.draw_circle(Vector2(5, -40 + k * 8), 2.5, BRASS)
	# Head with a tall hat.
	Art.shape(ci, Art.ellipse(Vector2(2, -54), 11, 10, 16), FACE, OUTLINE, 2.0)
	Art.shape(ci, Art.rect(Vector2(-10, -78), Vector2(12, -60)), Color("2f3a5a"), OUTLINE, 2.0)
	ci.draw_rect(Rect2(-11, -62, 24, 4), BRASS)
	ci.draw_circle(Vector2(8, -54), 2.0, OUTLINE)
	ci.draw_circle(Vector2(12, -51), 3.0, Color("ff8a8a"))
	if _keyless:  # panicking: sweat drops and wide eyes
		ci.draw_circle(Vector2(8, -55), 3.2, Color.WHITE)
		ci.draw_circle(Vector2(8, -55), 1.6, OUTLINE)
		ci.draw_circle(Vector2(-8, -64 + fmod(anim_time * 40.0, 10.0)), 2.0, Color("7fd0ff"))
	else:  # the wind-up key, turning
		var a := anim_time * 6.0
		var base := Vector2(-16, -34)
		ci.draw_line(base, base + Vector2(-10, 0), OUTLINE, 4.0)
		for d: float in [-1.0, 1.0]:
			var lobe := base + Vector2(-16, 0) + Vector2(0, d * 8.0 * cos(a))
			Art.shape(ci, Art.ellipse(lobe, 6, 5 * absf(cos(a)) + 1.5, 10), BRASS, OUTLINE, 1.5)
