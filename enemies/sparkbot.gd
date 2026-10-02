class_name Sparkbot
extends Enemy
## SPARKBOT: a crackling ball of electricity in a little cage that zips back and
## forth along its rail. Don't stomp it - it shocks! PUNCH it (or slide into
## it) to pop it. `travel` is how far it zips from where it starts.

@export var travel := Vector2(320, 0)
@export var speed := 150.0
@export var phase := 0.0

const BOLT := Color("aef6ff")
const CAGE := Color("8a93a6")

var _home := Vector2.ZERO
var _t := 0.0


func _init() -> void:
	body_size = Vector2(40, 40)
	uses_gravity = false
	stompable = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position
	_t = phase * 2.0 * travel.length() / maxf(speed, 1.0)


func _behave(delta: float) -> void:
	_t += delta
	var period := 2.0 * travel.length() / maxf(speed, 1.0)
	var f := fposmod(_t, period) / period
	var k := f * 2.0 if f < 0.5 else 2.0 - f * 2.0
	var target := _home + travel * (0.5 - 0.5 * cos(k * PI))
	velocity = (target - global_position) / maxf(delta, 0.001)
	if absf(velocity.x) > 1.0:
		facing = 1 if velocity.x > 0.0 else -1


func _draw_body(ci: CanvasItem) -> void:
	var c := Vector2(0, -20)
	ci.draw_circle(c, 26.0 + sin(anim_time * 20.0) * 2.0, Color(0.5, 0.95, 1.0, 0.25))
	ci.draw_circle(c, 14.0, BOLT)
	ci.draw_circle(c, 8.0, Color.WHITE)
	for k in 5:  # crackling sparks
		var a := anim_time * 9.0 + k * TAU / 5.0
		var p1 := c + Vector2(cos(a), sin(a)) * 14.0
		var p2 := c + Vector2(cos(a + 0.4), sin(a + 0.4)) * (22.0 + sin(anim_time * 30.0 + k) * 4.0)
		ci.draw_line(p1, p2, BOLT, 2.0)
	for k in 4:  # the little cage
		var a := TAU * k / 4.0 + anim_time
		ci.draw_arc(c, 19.0, a, a + 0.9, 6, CAGE, 3.0)
	Enemy.draw_eye(ci, c + Vector2(-5, -2), 3.5, Vector2(1, 0), 0.8, is_stunned())
	Enemy.draw_eye(ci, c + Vector2(5, -2), 3.5, Vector2(1, 0), 0.8, is_stunned())
