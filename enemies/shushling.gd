class_name Shushling
extends Enemy
## SHUSHLING: a shy library ghost. It only creeps towards a dreamer who is standing STILL -
## the moment anyone nearby moves it freezes, hands over its mouth ("shh!"), and goes solid
## and harmless. Sneak past it, or stand still and punch it when it gets close. Stompable.

@export var creep_speed := 105.0
@export var sight := 520.0
@export var still_speed := 40.0   ## px/s: a dreamer slower than this counts as "still"

const SHEET := Color("e9f3ff")
const SHEET_DARK := Color("b7c8e8")

var _shy := false
var _bob := 0.0


func _init() -> void:
	body_size = Vector2(36, 54)
	health = 1
	lum_drop = 3
	gravity = 0.0   # it floats a little above the floor


func _behave(delta: float) -> void:
	_bob += delta
	var p := nearest_player(sight, 300.0)
	var moving := false
	for n in get_tree().get_nodes_in_group(&"players"):
		var q := n as Player
		if q.is_bubbled() or q.global_position.distance_to(global_position) > sight * 1.3:
			continue
		if q.velocity.length() > still_speed:
			moving = true
	_shy = moving and p != null
	contact_hurts = not _shy
	if p == null:
		velocity.x = 0.0
	elif _shy:
		velocity.x = 0.0
		face(p)
	else:
		face(p)
		velocity.x = facing * creep_speed
	var home_off := sin(_bob * 2.0) * 4.0
	velocity.y = home_off - 0.0


func _draw_body(ci: CanvasItem) -> void:
	var bob := sin(anim_time * 2.0) * 3.0
	var a := 0.55 if _shy else 1.0
	var c := Color(SHEET.r, SHEET.g, SHEET.b, a)
	var pts := PackedVector2Array()
	for i in 13:
		var ang := PI + PI * float(i) / 12.0
		pts.append(Vector2(cos(ang) * 20.0, -34.0 + sin(ang) * 22.0 + bob))
	for k in 5:   # ragged hem
		pts.append(Vector2(20.0 - k * 10.0, -10.0 + bob + (6.0 if k % 2 == 0 else 0.0)))
	Art.shape(ci, pts, c, OUTLINE, 3.0)
	ci.draw_colored_polygon(Art.ellipse(Vector2(-8, -42 + bob), 5, 8, 8), Color(1, 1, 1, 0.5 * a))
	Enemy.draw_eye(ci, Vector2(-6, -36 + bob), 4.0, Vector2(facing, 0), 0.0, _shy)
	Enemy.draw_eye(ci, Vector2(7, -36 + bob), 4.0, Vector2(facing, 0), 0.0, _shy)
	if _shy:   # hands over the mouth: "shh!"
		Art.shape(ci, Art.ellipse(Vector2(0, -26 + bob), 9, 5, 8), SHEET_DARK, OUTLINE, 2.0)
	else:
		Art.shape(ci, Art.ellipse(Vector2(1, -27 + bob), 4, 6, 8), OUTLINE, OUTLINE, 1.0)
