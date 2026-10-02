class_name Springbot
extends Enemy
## SPRINGBOT: a little robot on a big spring. It squashes its spring down (the
## tell - BOING coming!) and springs toward you in a high arc. Stomp its head
## or punch it while it's on the ground.

@export var sight := 700.0
@export var hop_height := 260.0
@export var rest := 1.0
@export var crouch_time := 0.45

const METAL := Color("b8c2cc")
const METAL_DARK := Color("7f8a96")
const LIGHT := Color("ff5d3f")

var _timer := 0.8
var _crouch := 0.0


func _init() -> void:
	body_size = Vector2(40, 56)
	lum_drop = 2


func _behave(delta: float) -> void:
	if not is_on_floor():
		return
	velocity.x = move_toward(velocity.x, 0.0, 1600.0 * delta)
	if _crouch > 0.0:
		_crouch -= delta
		if _crouch <= 0.0:
			var p := nearest_player(sight * 1.3)
			var dx := clampf((p.global_position.x - global_position.x) if p else facing * 200.0, -380.0, 380.0)
			var vy := -sqrt(2.0 * gravity * hop_height)
			var air := 2.0 * -vy / gravity
			velocity = Vector2(dx / air, vy)
			squash(Vector2(0.7, 1.35))
		return
	_timer -= delta
	var p := nearest_player(sight)
	if p:
		face(p)
	if _timer <= 0.0 and p:
		_crouch = crouch_time
		_timer = rest


func _draw_body(ci: CanvasItem) -> void:
	var squeeze := 0.55 if _crouch > 0.0 else (1.25 if not is_on_floor() else 1.0)
	var coil_top := -26.0 * squeeze
	# The spring.
	var pts := PackedVector2Array()
	for i in 13:
		var t := float(i) / 12.0
		pts.append(Vector2((10.0 if i % 2 == 0 else -10.0), lerpf(0.0, coil_top, t)))
	ci.draw_polyline(pts, OUTLINE, 5.0)
	ci.draw_polyline(pts, METAL_DARK, 3.0)
	# The robot head: a round tin can with a light on top and a visor.
	var h := Vector2(0, coil_top - 16.0)
	Art.shape(ci, Art.rounded_rect(h + Vector2(-18, -16), h + Vector2(18, 16), 8.0), METAL, OUTLINE, 2.5)
	Art.shape(ci, Art.rounded_rect(h + Vector2(-12, -8), h + Vector2(16, 4), 4.0), Color("2a3346"), OUTLINE, 1.5)
	var glow := 1.0 if _crouch > 0.0 else 0.5 + 0.5 * sin(anim_time * 4.0)
	ci.draw_circle(h + Vector2(4, -2), 3.0, Color(0.5, 1.0, 0.9, glow))
	ci.draw_circle(h + Vector2(11, -2), 3.0, Color(0.5, 1.0, 0.9, glow))
	ci.draw_line(h + Vector2(0, -16), h + Vector2(0, -24), OUTLINE, 2.0)
	ci.draw_circle(h + Vector2(0, -26), 4.0, LIGHT if _crouch > 0.0 else LIGHT.darkened(0.4))
