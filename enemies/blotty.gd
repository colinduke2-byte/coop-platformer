class_name Blotty
extends Enemy
## BLOTTY: a puddle of living ink that creeps along the floor. When a dreamer is in range it
## rears up (the tell), then spits a lobbed glob of ink at them. Stompable; the glob can be
## punched back. In flipped gravity it creeps along whatever is "down".

@export var creep_speed := 46.0
@export var spit_time := 2.8
@export var sight := 620.0

const INK := Color("2b2a5c")
const INK_LIGHT := Color("5a58a8")

var _wait := 1.0
var _rear := 0.0


func _init() -> void:
	body_size = Vector2(46, 30)
	health = 1
	lum_drop = 2


func _setup() -> void:
	_wait = randf_range(0.5, spit_time)


func _behave(delta: float) -> void:
	if _rear > 0.0:
		velocity.x = 0.0
		_rear -= delta
		if _rear <= 0.0:
			_spit()
		return
	patrol(creep_speed)
	_wait -= delta
	var t := nearest_player(sight, 420.0)
	if _wait <= 0.0 and t != null:
		face(t)
		_rear = 0.45
		_wait = spit_time * randf_range(0.9, 1.2)


func _spit() -> void:
	var t := nearest_player()
	if t:
		face(t)
	var dx := 1.0
	if t:
		dx = clampf(absf(t.global_position.x - global_position.x) / 420.0, 0.35, 1.2)
	var p := shoot(Vector2(16, -26), Vector2(float(facing) * dx, -0.9 * gdir), 420.0, 0.5)
	p.color = INK_LIGHT
	squash(Vector2(1.3, 0.7))


func _draw_body(ci: CanvasItem) -> void:
	var rear := 1.0 if _rear > 0.0 else 0.0
	var h := 24.0 + 20.0 * rear
	var wob := sin(anim_time * 5.0) * 2.0
	var pts := PackedVector2Array()
	for i in 17:
		var a := PI + PI * float(i) / 16.0
		pts.append(Vector2(cos(a) * (24.0 - rear * 6.0), sin(a) * h + wob * sin(a * 3.0)))
	pts.append(Vector2(24, 0))
	pts.append(Vector2(-24, 0))
	Art.shape(ci, pts, INK, OUTLINE, 3.0)
	ci.draw_colored_polygon(Art.ellipse(Vector2(-8, -h * 0.62), 6, 4, 8), Color(INK_LIGHT, 0.7))
	for k in 3:   # drips along the bottom edge
		Art.shape(ci, Art.ellipse(Vector2(-17 + k * 17.0, 1), 5, 3, 8), INK, OUTLINE, 2.0)
	Enemy.draw_eye(ci, Vector2(-6, -h * 0.45), 5.0, Vector2(facing, 0), 0.0)
	Enemy.draw_eye(ci, Vector2(8, -h * 0.45), 5.0, Vector2(facing, 0), 0.0)
