class_name Jellybob
extends Enemy
## JELLYBOB: a wobbly jellyfish bobbing in place. Its top is a trampoline -
## STOMP it for a huge bounce (it doesn't mind). Its trailing tendrils sting, so
## don't touch it from the side or below. A punch pops it (only if you must!).

@export var bob := 60.0          ## px up and down
@export var bob_period := 2.4
@export var phase := 0.0

const BELL := Color("ff9ad5")
const TENDRIL := Color("ffd0ef")

var _home := Vector2.ZERO


func _init() -> void:
	body_size = Vector2(60, 44)
	uses_gravity = false
	stomp_bounce = 1.75
	lum_drop = 2


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	var target := _home + Vector2(0, sin((anim_time / bob_period + phase) * TAU) * bob * 0.5)
	velocity = (target - global_position) / maxf(delta, 0.001)


func _on_stomped(_by: Player) -> void:
	squash(Vector2(1.4, 0.6))  # boing - no harm done
	Audio.play("pad", -4.0, 1.3)


func _draw_body(ci: CanvasItem) -> void:
	var w := sin(anim_time * 4.0) * 4.0
	ci.draw_circle(Vector2(0, -26), 46.0, Color(BELL, 0.12))
	for k in 5:  # tendrils
		var x := -20.0 + k * 10.0
		var pts := PackedVector2Array()
		for i in 7:
			var t := float(i) / 6.0
			pts.append(Vector2(x + sin(anim_time * 3.0 + k + t * 4.0) * 5.0, -8.0 + t * 40.0))
		ci.draw_polyline(pts, TENDRIL, 3.0)
	var bell := PackedVector2Array()
	for i in 17:
		var a := PI + PI * float(i) / 16.0
		bell.append(Vector2(cos(a) * (32.0 + w), -12.0 + sin(a) * (30.0 - w * 0.5)))
	for i in 5:
		bell.append(Vector2(32.0 - i * 16.0, -12.0 + (4.0 if i % 2 == 0 else 0.0)))
	Art.shape(ci, bell, BELL, OUTLINE, 3.0)
	ci.draw_colored_polygon(Art.ellipse(Vector2(-10, -30), 10, 6, 10), Color(1, 1, 1, 0.45))
	Enemy.draw_eye(ci, Vector2(-8, -22), 4.5, Vector2(0, 1), 0.0, is_stunned())
	Enemy.draw_eye(ci, Vector2(8, -22), 4.5, Vector2(0, 1), 0.0, is_stunned())
