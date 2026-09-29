class_name Flapjack
extends Enemy
## FLAPJACK: a flying pancake with bat wings (and a pat of butter on top).
## HOVER bobs in place, PATROL flies between here and `patrol_offset`,
## SWOOP also dives at players who pass underneath, then flaps back home.
## Stomp or punch it; uppercuts are great for these.

enum Mode { HOVER, PATROL, SWOOP }

@export var mode := Mode.PATROL
@export var patrol_offset := Vector2(300, 0)
@export var fly_speed := 120.0
@export var bob_height := 14.0
@export var swoop_speed := 560.0
@export var swoop_range := 320.0            ## px below/around it that triggers a dive

const PANCAKE := Color("e3a857")
const PANCAKE_DARK := Color("b87a35")
const BUTTER := Color("ffe680")
const WING := Color("6b4a8a")

var _home := Vector2.ZERO
var _t := 0.0
var _swoop_target := Vector2.ZERO
var _swooping := 0  ## 0 no, 1 diving, 2 returning


func _init() -> void:
	body_size = Vector2(46, 26)
	uses_gravity = false


func _setup() -> void:
	_home = global_position


func _behave(delta: float) -> void:
	_t += delta
	var target := _home
	match mode:
		Mode.PATROL, Mode.SWOOP:
			target = _home + patrol_offset * (0.5 - 0.5 * cos(_t * fly_speed / maxf(patrol_offset.length(), 1.0) * PI))
	target.y += sin(_t * 3.0) * bob_height
	if mode == Mode.SWOOP:
		match _swooping:
			0:
				var p := nearest_player(swoop_range)
				if p and p.global_position.y > global_position.y + 40.0:
					_swoop_target = p.global_position + Vector2(0, -30)
					_swooping = 1
					squash(Vector2(0.8, 1.2))
			1:
				velocity = (_swoop_target - global_position).normalized() * swoop_speed
				if global_position.distance_to(_swoop_target) < 20.0 or is_on_floor() or is_on_wall():
					_swooping = 2
				_face_velocity()
				return
			2:
				velocity = (target - global_position).normalized() * fly_speed * 1.5
				if global_position.distance_to(target) < 16.0:
					_swooping = 0
				_face_velocity()
				return
	velocity = (target - global_position) * 4.0
	_face_velocity()


func _face_velocity() -> void:
	if absf(velocity.x) > 10.0:
		facing = 1 if velocity.x > 0.0 else -1


func _draw_body(ci: CanvasItem) -> void:
	var flap := sin(anim_time * (26.0 if _swooping == 1 else 16.0))
	var y := -14.0
	# Wings behind.
	for s: float in [-1.0, 1.0]:
		var tip := Vector2(s * 36.0, y - 10.0 - flap * 14.0)
		Art.shape(ci, PackedVector2Array([Vector2(s * 12, y - 2), tip, Vector2(s * 30, y + 4 - flap * 4.0), Vector2(s * 20, y + 2)]), WING, OUTLINE, 2.0)
	# Stack of two pancakes.
	Art.shape(ci, Art.ellipse(Vector2(0, y + 4), 24, 8), PANCAKE_DARK, OUTLINE)
	Art.shape(ci, Art.ellipse(Vector2(0, y - 3), 24, 9), PANCAKE, OUTLINE)
	Art.shape(ci, Art.rounded_rect(Vector2(-7, y - 16), Vector2(7, y - 8), 2.0), BUTTER, OUTLINE, 2.0)
	var dive := _swooping == 1
	Enemy.draw_eye(ci, Vector2(6, y - 2), 4.5, Vector2(1, 0.6 if dive else 0.0), 1.0 if dive else 0.3)
	Enemy.draw_eye(ci, Vector2(16, y - 1), 4.0, Vector2(1, 0.6 if dive else 0.0), -1.0 if dive else -0.3)
