class_name JackBonk
extends Enemy
## JACK-IN-THE-BONK: a grinning clown on a spring in a striped box. It sits quietly, the lid
## starts to rattle (that's the tell), then BOING - it springs straight up, bonks whatever
## is overhead and drops back in. Stomp it on the way down (or punch the box). In flipped
## gravity it springs towards the new ceiling - the box always sits on whatever is "down".

@export var rest_time := 1.7          ## s between springs
@export var spring_height := 330.0    ## px it rises
@export var sight := 700.0            ## only springs when a dreamer is this close

const BOX := Color("e8426f")
const BOX_LIGHT := Color("fff0dc")
const FACE := Color("fff1d0")
const HAT := Color("5b8cff")
const SPRING := Color("c9c2d8")

var _rest := 0.0
var _tell := 0.0


func _init() -> void:
	body_size = Vector2(46, 46)
	health = 1
	lum_drop = 3


func _setup() -> void:
	_rest = randf_range(0.4, rest_time)


func _behave(delta: float) -> void:
	velocity.x = 0.0
	if not is_on_floor():
		return
	if _tell > 0.0:
		_tell -= delta
		if _tell <= 0.0:
			velocity.y = -sqrt(2.0 * gravity * spring_height)   # logical: away from the floor it sits on
			squash(Vector2(0.7, 1.4))
		return
	_rest -= delta
	if _rest <= 0.0 and nearest_player(sight, 900.0) != null:
		_tell = 0.45
		_rest = rest_time * randf_range(0.85, 1.2)


func _draw_body(ci: CanvasItem) -> void:
	var air := not is_on_floor()
	var rattle := sin(anim_time * 60.0) * 2.5 if _tell > 0.0 else 0.0
	# The box.
	Art.shape(ci, Art.rounded_rect(Vector2(-23 + rattle, -26), Vector2(23 + rattle, 0), 4.0), BOX, OUTLINE, 3.0)
	for k in 3:
		ci.draw_colored_polygon(Art.rect(Vector2(-23 + k * 16.0 + rattle, -26), Vector2(-15 + k * 16.0 + rattle, 0)), BOX_LIGHT)
	var open := air or _tell > 0.0
	if not open:
		Art.shape(ci, Art.rounded_rect(Vector2(-25, -32), Vector2(25, -24), 3.0), BOX, OUTLINE, 3.0)   # lid shut
		return
	# The spring, longer the higher it is above its box (visual only).
	var stretch := 12.0 + (24.0 if air else 0.0)
	var top := Vector2(0, -26.0 - stretch)
	var pts := PackedVector2Array([Vector2(0, -26)])
	for k in 7:
		pts.append(Vector2((-9.0 if k % 2 == 0 else 9.0), -26.0 - stretch * float(k + 1) / 8.0))
	pts.append(top)
	ci.draw_polyline(pts, OUTLINE, 5.0)
	ci.draw_polyline(pts, SPRING, 2.5)
	# Lid swung open, then the clown head.
	Art.shape(ci, Art.rounded_rect(Vector2(-25, -36), Vector2(-6, -30), 2.0), BOX, OUTLINE, 2.5)
	var h := top + Vector2(0, -14)
	Art.shape(ci, Art.ellipse(h, 17, 16, 18), FACE, OUTLINE, 3.0)
	ci.draw_colored_polygon(PackedVector2Array([h + Vector2(-14, -10), h + Vector2(0, -34), h + Vector2(14, -10)]), HAT)
	ci.draw_circle(h + Vector2(0, -35), 4.0, BOX)
	Enemy.draw_eye(ci, h + Vector2(-6, -3), 4.5, Vector2(1, 0), 0.5)
	Enemy.draw_eye(ci, h + Vector2(7, -3), 4.5, Vector2(1, 0), 0.5)
	ci.draw_circle(h + Vector2(0, 5), 4.0, BOX)   # a red nose
	ci.draw_arc(h + Vector2(0, 4), 9.0, 0.3, PI - 0.3, 10, OUTLINE, 2.0)
