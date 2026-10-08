class_name Anglerling
extends Enemy
## ANGLERLING: a little deep-sea fish with a glowing lure - in the dark you see
## the light long before the teeth. It drifts toward anyone within `sight` and
## snaps when close. Stomp or punch it. Its lure is a real light.

@export var sight := 520.0
@export var speed := 80.0

const SKIN := Color("5a4a8a")
const LURE := Color("bfffe8")

var _home := Vector2.ZERO
var _light: GlowLight


func _init() -> void:
	body_size = Vector2(48, 40)
	uses_gravity = false
	lum_drop = 2


func _setup() -> void:
	_home = global_position
	_light = GlowLight.new()
	_light.radius = 200.0
	_light.color = LURE
	_light.energy = 0.9
	_light.position = Vector2(26, -62)
	add_child(_light)


func _behave(delta: float) -> void:
	var p := nearest_player(sight, 300.0)
	var target := _home + Vector2(0, sin(anim_time * 1.5) * 20.0)
	if p:
		target = p.global_position + Vector2(0, -10)
		face(p)
	var to := target - global_position
	var v := to.limit_length(speed) if to.length() > 4.0 else Vector2.ZERO
	velocity = velocity.lerp(v, clampf(delta * 3.0, 0.0, 1.0))
	if _light:
		_light.position.x = 26.0 * facing


func _draw_body(ci: CanvasItem) -> void:
	var c := Vector2(0, -20)
	var mouth := 0.5 + 0.5 * sin(anim_time * 6.0)
	Art.shape(ci, PackedVector2Array([c + Vector2(-20, 0), c + Vector2(-38, -12), c + Vector2(-38, 12)]), SKIN.darkened(0.2), OUTLINE, 2.0)
	Art.shape(ci, Art.ellipse(c, 24, 20, 18), SKIN, OUTLINE, 3.0)
	# Jaw with little teeth.
	Art.shape(ci, PackedVector2Array([c + Vector2(4, 4), c + Vector2(26, 2 + mouth * 6.0), c + Vector2(6, 16)]), SKIN.darkened(0.3), OUTLINE, 2.0)
	for k in 3:
		ci.draw_colored_polygon(PackedVector2Array([c + Vector2(10 + k * 5, 4), c + Vector2(12 + k * 5, 9), c + Vector2(14 + k * 5, 4)]), Color.WHITE)
	# The lure on its stalk.
	ci.draw_polyline(PackedVector2Array([c + Vector2(0, -18), c + Vector2(12, -38), c + Vector2(26, -42)]), OUTLINE, 3.0)
	ci.draw_circle(c + Vector2(26, -42), 12.0, Color(LURE, 0.25))
	ci.draw_circle(c + Vector2(26, -42), 6.0, LURE)
	Enemy.draw_eye(ci, c + Vector2(8, -6), 6.0, Vector2(1, 0), 0.7, is_stunned())
