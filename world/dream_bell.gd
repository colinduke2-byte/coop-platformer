@tool
class_name DreamBell
extends Area2D
## A golden bell hanging in a little wooden frame. Touch it (or punch it) and it
## rings out a LUM RUSH: for `duration` seconds every Lum turns gold and counts
## double. Place one just before a big trail of Lums! It dozes off after ringing
## and can be rung again after `recharge` seconds. Origin = ground under the frame.

@export var duration := 10.0
@export var recharge := 30.0

const WOOD := Color("a0673a")
const GOLD := Color("ffc93f")
const GOLD_DARK := Color("c98a1c")
const BELL_Y := -150.0

var _t := 0.0
var _swing := 0.0        ## current swing angle
var _swing_v := 0.0
var _cooldown := 0.0     ## > 0: dozing (can't ring yet)
var _bell: Node2D


func _ready() -> void:
	collision_layer = 4      # enemies layer: PunchArea (mask enemies+bubbles) can hit it
	collision_mask = 2       # players touching it ring it too
	monitorable = true
	var col := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 42.0
	col.shape = shape
	col.position = Vector2(0, BELL_Y + 20.0)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	_bell = Bell.new()
	_bell.position = Vector2(0, BELL_Y - 40.0)
	add_child(_bell, false, Node.INTERNAL_MODE_FRONT)
	if not Engine.is_editor_hint():
		body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	_t += delta
	# Damped swing: a light idle sway, big swings after a ring.
	_swing_v += (-_swing * 40.0 - _swing_v * 2.2) * delta
	_swing += _swing_v * delta
	_bell.rotation = _swing + sin(_t * 1.6) * 0.04
	if _cooldown > 0.0:
		_cooldown = maxf(_cooldown - delta, 0.0)
		_bell.modulate = Color(0.65, 0.62, 0.7) if _cooldown > 0.0 else Color.WHITE
		if _cooldown == 0.0 and not Engine.is_editor_hint():
			Vfx.sparkle(_bell.global_position + Vector2(0, 45), 6, GOLD, 50.0)
	if not Engine.is_editor_hint() and _cooldown == 0.0 and GameManager.lum_rush > 0.0 and fmod(_t, 0.25) < delta:
		Vfx.sparkle(_bell.global_position + Vector2(randf_range(-40, 40), 50), 1, GOLD, 20.0)


func _on_body_entered(body: Node2D) -> void:
	var p := body as Player
	if p and not p.is_bubbled():
		ring(signf(p.velocity.x) if absf(p.velocity.x) > 10.0 else 1.0)


## Punches (and ground pounds) call this.
func take_hit(by: Player, _knockback: Vector2) -> void:
	ring(signf(global_position.x - by.global_position.x))


func is_ready() -> bool:
	return _cooldown == 0.0


func ring(dir := 1.0) -> void:
	_swing_v += dir * 7.0
	if _cooldown > 0.0:
		Audio.play("clank", -10.0, 0.7)
		return
	_cooldown = recharge
	GameManager.start_lum_rush(duration)
	var at := _bell.global_position + Vector2(0, 50)
	Audio.play("bell", 0.0, 1.0, 0.0)
	Vfx.ring(at, 120.0, GOLD, 0.5, 8.0)
	Vfx.ring(at, 200.0, Color(1, 0.9, 0.5, 0.6), 0.7, 5.0)
	Vfx.sparkle(at, 14, GOLD, 120.0)
	Vfx.text(at + Vector2(0, -120), "LUM RUSH!", GOLD, 44)
	Vfx.shake(4.0)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	# Frame: two posts, a roof beam with a little shingle roof.
	for x: float in [-70.0, 70.0]:
		Art.shape(self, Art.rect(Vector2(x - 7, BELL_Y - 60), Vector2(x + 7, 0)), WOOD, o, 3.0)
		Art.shape(self, Art.rect(Vector2(x - 14, -12), Vector2(x + 14, 0)), WOOD.darkened(0.2), o, 3.0)
	Art.shape(self, Art.rect(Vector2(-88, BELL_Y - 72), Vector2(88, BELL_Y - 56)), WOOD.darkened(0.1), o, 3.0)
	Art.shape(self, PackedVector2Array([Vector2(-100, BELL_Y - 72), Vector2(0, BELL_Y - 112), Vector2(100, BELL_Y - 72)]),
			th.accent, o, 3.0)
	draw_line(Vector2(-60, BELL_Y - 80), Vector2(0, BELL_Y - 104), th.accent.lightened(0.3), 3.0)
	# Bunting: little flags hanging off the beam.
	for i in 5:
		var fx := -56.0 + i * 28.0
		var c: Color = th.flower_colors[i % th.flower_colors.size()] if th.flower_colors.size() > 0 else GOLD
		draw_colored_polygon(PackedVector2Array([Vector2(fx - 8, BELL_Y - 56), Vector2(fx + 8, BELL_Y - 56), Vector2(fx, BELL_Y - 42)]), c)


## The bell itself: pivots at the top so it can swing.
class Bell extends Node2D:
	func _draw() -> void:
		var o := Color("2b1d17")
		draw_line(Vector2(0, -16), Vector2(0, 8), o, 4.0)
		var body := PackedVector2Array()
		for i in 13:
			var a := PI + i * PI / 12.0
			body.append(Vector2(cos(a) * 26.0, 24.0 + sin(a) * 22.0))
		body.append(Vector2(34, 66))
		body.append(Vector2(40, 74))
		body.append(Vector2(-40, 74))
		body.append(Vector2(-34, 66))
		Art.shape(self, body, GOLD, o, 4.0)
		draw_colored_polygon(PackedVector2Array([Vector2(-16, 18), Vector2(-8, 12), Vector2(-14, 58), Vector2(-24, 62)]),
				Color(1, 1, 1, 0.45))
		draw_line(Vector2(-36, 66), Vector2(36, 66), GOLD_DARK, 4.0)
		Art.shape(self, Art.ellipse(Vector2(0, 80), 10.0, 9.0, 12), GOLD_DARK, o, 3.0)
		# A sleepy face: it's a DREAM bell.
		draw_arc(Vector2(-10, 44), 5.0, 0.2, PI - 0.2, 8, o, 2.5)
		draw_arc(Vector2(10, 44), 5.0, 0.2, PI - 0.2, 8, o, 2.5)
		draw_arc(Vector2(0, 54), 4.0, 0.3, PI - 0.3, 8, o, 2.5)
