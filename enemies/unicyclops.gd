class_name Unicyclops
extends Enemy
## UNICYCLOPS: a one-eyed juggler wobbling along on a unicycle. It rolls back and forth
## along whatever surface it is standing on (floor OR ceiling, whichever is "down"), and
## when a dreamer is close on its level it pedals up to a fast, wobbly charge. Stomp it.

@export var roll_speed := 80.0
@export var charge_speed := 230.0
@export var sight := 480.0

const SKIN := Color("8f6bd8")
const SKIN_DARK := Color("6a48b0")
const TYRE := Color("2b2438")
const RIM := Color("ffd24a")
const HAT := Color("ff5d8f")

var _spin := 0.0
var _charging := 0.0


func _init() -> void:
	body_size = Vector2(36, 66)
	health = 1
	lum_drop = 3


func _behave(delta: float) -> void:
	var p := nearest_player(sight, 120.0)
	if p != null and is_on_floor():
		face(p)
		_charging = minf(_charging + delta * 2.0, 1.0)
	else:
		_charging = maxf(_charging - delta, 0.0)
	if is_on_floor():
		if wall_ahead() or not floor_ahead():
			facing = -facing
			_charging = 0.0
		velocity.x = facing * lerpf(roll_speed, charge_speed, _charging)
	_spin += velocity.x * delta / 16.0


func _draw_body(ci: CanvasItem) -> void:
	var wob := sin(anim_time * 9.0) * (2.0 + 4.0 * _charging)
	# Wheel.
	Art.shape(ci, Art.ellipse(Vector2(0, -16), 16, 16, 20), TYRE, OUTLINE, 3.0)
	ci.draw_circle(Vector2(0, -16), 9.0, RIM)
	for k in 4:
		var a := _spin + k * PI * 0.5
		ci.draw_line(Vector2(0, -16), Vector2(0, -16) + Vector2.from_angle(a) * 9.0, OUTLINE, 2.0)
	# Body and the single big eye.
	ci.draw_line(Vector2(0, -28), Vector2(wob * 0.5, -36), OUTLINE, 8.0)
	ci.draw_line(Vector2(0, -28), Vector2(wob * 0.5, -36), SKIN_DARK, 5.0)
	var c := Vector2(wob, -50)
	Art.shape(ci, Art.ellipse(c, 17, 18, 18), SKIN, OUTLINE, 3.0)
	Art.shape(ci, Art.ellipse(c + Vector2(2, -1), 11, 11, 16), EYE_WHITE, OUTLINE, 2.0)
	ci.draw_circle(c + Vector2(5, -1), 5.0, OUTLINE)
	ci.draw_colored_polygon(PackedVector2Array([c + Vector2(-9, -14), c + Vector2(2, -34), c + Vector2(13, -13)]), HAT)
	ci.draw_circle(c + Vector2(2, -35), 3.0, RIM)
	# Juggling balls.
	for k in 3:
		var a := anim_time * 5.0 + k * TAU / 3.0
		ci.draw_circle(c + Vector2(cos(a) * 24.0, -26.0 - absf(sin(a)) * 12.0), 4.5, Color.from_hsv(k * 0.3, 0.7, 1.0))
