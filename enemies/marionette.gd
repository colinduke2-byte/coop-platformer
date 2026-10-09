class_name Marionette
extends Enemy
## MARIONETTE: a wooden puppet dangling from strings, swinging like a pendulum. The ORIGIN is
## the pivot (where the strings are tied - put it on a tent pole or the ceiling); the puppet
## swings `length` px below it. Dodge the swing, or punch it. Doesn't care which way gravity goes.

@export var length := 220.0
@export var amplitude := 0.8     ## radians
@export var period := 3.2        ## s per full swing
@export var phase := 0.0

const WOOD := Color("d9a064")
const WOOD_DARK := Color("a8723c")
const COAT := Color("e8426f")

var _pivot := Vector2.INF


func _init() -> void:
	body_size = Vector2(34, 64)
	health = 2
	lum_drop = 3
	uses_gravity = false
	stompable = false     # a swinging puppet isn't a platform: PUNCH it
	stun_time = 0.4


func _setup() -> void:
	_pivot = global_position
	global_position = _pivot + Vector2(0, length)


func _behave(delta: float) -> void:
	var a := amplitude * sin(TAU * anim_time / period + phase)
	var want := _pivot + Vector2(sin(a), cos(a)) * length
	velocity = (want - global_position) / maxf(delta, 0.001)
	facing = 1 if cos(TAU * anim_time / period + phase) >= 0.0 else -1


func _draw_body(ci: CanvasItem) -> void:
	var tilt := sin(TAU * anim_time / period + phase) * amplitude
	# Strings up to the pivot (convert the pivot into this drawing's local space).
	var pv := _pivot - global_position
	pv.x *= float(facing)
	for dx: float in [-12.0, 12.0]:
		ci.draw_line(Vector2(dx, -60), pv, Color(OUTLINE, 0.7), 1.5)
	# Body.
	Art.shape(ci, Art.rounded_rect(Vector2(-13, -48), Vector2(13, -20), 4.0), COAT, OUTLINE, 3.0)
	for k in 3:
		ci.draw_circle(Vector2(0, -42 + k * 8.0), 2.2, Color("fff0dc"))
	# Limbs that flop with the swing.
	for s: float in [-1.0, 1.0]:
		var swing := tilt * 14.0 * s
		ci.draw_line(Vector2(s * 9.0, -22), Vector2(s * 10.0 + swing, -2), OUTLINE, 7.0)
		ci.draw_line(Vector2(s * 9.0, -22), Vector2(s * 10.0 + swing, -2), WOOD, 4.0)
		ci.draw_line(Vector2(s * 13.0, -44), Vector2(s * 20.0 - swing, -28), OUTLINE, 6.0)
		ci.draw_line(Vector2(s * 13.0, -44), Vector2(s * 20.0 - swing, -28), WOOD, 3.5)
	# Head: a painted wooden ball with a hinged jaw.
	Art.shape(ci, Art.ellipse(Vector2(0, -58), 13, 13, 16), WOOD, OUTLINE, 3.0)
	Enemy.draw_eye(ci, Vector2(-4, -60), 3.4, Vector2(1, 0), 0.6)
	Enemy.draw_eye(ci, Vector2(6, -60), 3.4, Vector2(1, 0), 0.6)
	ci.draw_line(Vector2(-6, -52), Vector2(8, -52 + absf(tilt) * 3.0), OUTLINE, 2.5)
	ci.draw_colored_polygon(PackedVector2Array([Vector2(-12, -64), Vector2(0, -80), Vector2(12, -64)]), Color("5b8cff"))
