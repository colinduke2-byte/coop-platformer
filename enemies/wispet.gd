class_name Wispet
extends Enemy
## WISPET: a shy little ghost with a candle-flame tuft. It drifts after the
## nearest player - but only while their back is turned. Face it and it
## freezes, hides its eyes and goes see-through (harmless). Turn around, punch!
## Floats through walls. Great in dark caves and haunted bits.

@export var chase_speed := 120.0
@export var accel := 260.0
@export var sight := 900.0

const GHOST := Color(0.88, 0.94, 1.0)
const GHOST_DARK := Color(0.66, 0.76, 0.92)
const FLAME := Color("7ee0ff")

var shy := false
var _alpha := 1.0


func _init() -> void:
	body_size = Vector2(38, 38)
	uses_gravity = false
	lum_drop = 3


func _setup() -> void:
	collision_mask = 0  # drifts through walls


func _behave(delta: float) -> void:
	var p := nearest_player(sight)
	if p == null:
		velocity = velocity.move_toward(Vector2(0, sin(anim_time * 2.0) * 20.0), accel * delta)
		shy = false
		return
	var to := p.global_position + Vector2(0, -30) - (global_position + Vector2(0, -19))
	# The player "looks at" us when facing our side.
	shy = p.facing == int(signf(to.x)) * -1 and to.length() < sight
	if shy:
		velocity = velocity.move_toward(Vector2.ZERO, accel * 2.0 * delta)
	else:
		face(p)
		var want := to.normalized() * chase_speed + Vector2(0, sin(anim_time * 3.0) * 30.0)
		velocity = velocity.move_toward(want, accel * delta)
	contact_hurts = not shy
	_alpha = move_toward(_alpha, 0.45 if shy else 1.0, delta * 4.0)


func _draw_body(ci: CanvasItem) -> void:
	var c := Vector2(0, -20)
	var a := _alpha
	# Glow.
	ci.draw_circle(c, 34.0, Color(FLAME, 0.1 * a))
	# Body with a wavy tail.
	var pts := PackedVector2Array()
	for i in 13:
		var t := PI + PI * float(i) / 12.0
		pts.append(c + Vector2(cos(t) * 18.0, sin(t) * 18.0))
	for i in 7:
		var x := 18.0 - i * 6.0
		pts.append(c + Vector2(x, 14.0 + (4.0 if i % 2 == 0 else -2.0) + sin(anim_time * 6.0 + i) * 2.0))
	Art.shape(ci, pts, Color(GHOST, a), Color(OUTLINE, 0.8 * a), 2.5)
	ci.draw_circle(c + Vector2(-6, -8), 5.0, Color(1, 1, 1, 0.6 * a))
	# Flame tuft.
	var f := sin(anim_time * 12.0) * 2.0
	Art.shape(ci, PackedVector2Array([c + Vector2(-6, -16), c + Vector2(f, -34), c + Vector2(6, -16)]), Color(FLAME, a), Color(OUTLINE, 0.6 * a), 2.0)
	if shy:
		# Little hands over the eyes.
		for k in 2:
			Art.shape(ci, Art.ellipse(c + Vector2(2 + k * 11, -2), 6, 5, 10), Color(GHOST_DARK, a), Color(OUTLINE, 0.8 * a), 2.0)
		ci.draw_arc(c + Vector2(8, 8), 3.0, 0.2, PI - 0.2, 6, Color(OUTLINE, a), 2.0)
	else:
		Enemy.draw_eye(ci, c + Vector2(3, -2), 4.5, Vector2(1, 0.3), 0.6)
		Enemy.draw_eye(ci, c + Vector2(13, -1), 4.0, Vector2(1, 0.3), -0.6)
		Art.shape(ci, Art.ellipse(c + Vector2(9, 8), 4, 5, 10), Color(OUTLINE, a), Color(OUTLINE, a), 0.0)
