class_name Balloonatic
extends Enemy
## BALLOONATIC: a grinning clown dangling from a bunch of balloons. It is lighter than air,
## so it floats AWAY from the floor - up to the ceiling normally, and when gravity flips it
## sails across the room to the other side. Place it mid-way; it drifts `rise` px either way
## and bobs sideways. Stomp it to pop the balloons.

@export var rise := 160.0     ## px it floats above (or below) where you placed it
@export var sway := 70.0      ## px of side-to-side bob
@export var drift_speed := 110.0

const SKIN := Color("ffd7a8")
const SUIT := Color("5b8cff")
const COLORS: Array[Color] = [Color("ff5d8f"), Color("ffd23f"), Color("5bd6c8"), Color("b98aff")]

var _home := Vector2.INF


func _init() -> void:
	body_size = Vector2(34, 44)
	health = 1
	lum_drop = 3
	gravity = 0.0   # lighter than air: it steers itself (still turns over with the level's gravity)


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	if _home == Vector2.INF:
		_home = global_position
	var target_y := _home.y - float(gdir) * rise
	var target_x := _home.x + sin(anim_time * 0.9) * sway
	# velocity is logical (y+ = towards the floor); the base turns it into world space.
	velocity.y = clampf((target_y - global_position.y) * float(gdir) * 2.0, -drift_speed, drift_speed)
	velocity.x = clampf((target_x - global_position.x) * 2.0, -drift_speed, drift_speed)
	facing = 1 if velocity.x >= 0.0 else -1


func _draw_body(ci: CanvasItem) -> void:
	var dang := sin(anim_time * 3.0) * 3.0
	# The clown, hanging by his strings.
	Art.shape(ci, Art.rounded_rect(Vector2(-9, -30 + dang), Vector2(9, -10 + dang), 4.0), SUIT, OUTLINE, 2.5)
	ci.draw_line(Vector2(-4, -10 + dang), Vector2(-7, 0), OUTLINE, 5.0)
	ci.draw_line(Vector2(4, -10 + dang), Vector2(7, 0), OUTLINE, 5.0)
	Art.shape(ci, Art.ellipse(Vector2(0, -38 + dang), 11, 11, 14), SKIN, OUTLINE, 2.5)
	Enemy.draw_eye(ci, Vector2(-3, -40 + dang), 3.2, Vector2(1, 0), 0.4)
	Enemy.draw_eye(ci, Vector2(5, -40 + dang), 3.2, Vector2(1, 0), 0.4)
	ci.draw_circle(Vector2(1, -35 + dang), 2.6, COLORS[0])
	# Balloons overhead, on strings.
	for k in 4:
		var tip := Vector2((float(k) - 1.5) * 15.0 + sin(anim_time * 2.0 + k) * 3.0, -78.0 - (k % 2) * 8.0)
		ci.draw_line(Vector2(0, -46 + dang), tip + Vector2(0, 14), Color(OUTLINE, 0.8), 1.5)
		Art.shape(ci, Art.ellipse(tip, 12, 14, 14), COLORS[k % COLORS.size()], OUTLINE, 2.5)
		ci.draw_colored_polygon(Art.ellipse(tip + Vector2(-4, -5), 3.5, 5, 8), Color(1, 1, 1, 0.45))
