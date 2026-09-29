@tool
class_name LevelGoal
extends Area2D
## The Dream Gate at the end of a level: any player who reaches it finishes
## the level for everyone (results screen, save records). Origin = bottom centre.

const SIZE := Vector2(180, 240)

var _t := 0.0
var _done := false


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(SIZE.x * 0.6, SIZE.y * 0.8)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -SIZE.y * 0.4)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	body_entered.connect(_on_body_entered)


func _process(delta: float) -> void:
	_t += delta
	queue_redraw()


func _on_body_entered(body: Node2D) -> void:
	if _done or Engine.is_editor_hint():
		return
	var p := body as Player
	if p and not p.is_bubbled():
		_done = true
		Vfx.confetti(global_position + Vector2(0, -SIZE.y * 0.6), 60)
		Vfx.shake(0.3)
		GameManager.complete_level()


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var w := SIZE.x * 0.5
	var h := SIZE.y
	# Swirling portal inside an arch.
	var portal := PackedVector2Array()
	for i in 25:
		var a := PI + PI * float(i) / 24.0
		portal.append(Vector2(cos(a) * (w - 26), -h + 90 + sin(a) * 70))
	portal.append(Vector2(w - 26, 0))
	portal.append(Vector2(-w + 26, 0))
	draw_colored_polygon(portal, Color("7b5cff"))
	for k in 5:
		var r := fmod(_t * 40.0 + k * 30.0, 150.0)
		var c := Color(1, 1, 1, 0.35 * (1.0 - r / 150.0))
		draw_arc(Vector2(0, -h * 0.45), r, 0, TAU, 32, c, 4.0)
	# Stars drifting up.
	for k in 6:
		var y := -fmod(_t * 60.0 + k * 40.0, h - 20.0)
		draw_colored_polygon(Art.star(Vector2(sin(_t * 2.0 + k) * (w - 50), y), 6.0), Color("fff3a0"))
	# Arch frame.
	for s: float in [-1.0, 1.0]:
		Art.shape(self, Art.rounded_rect(Vector2(s * w - 16, -h + 90), Vector2(s * w + 16, 0), 6.0), th.ledge, o, 4.0)
	var arch := PackedVector2Array()
	for i in 25:
		var a := PI + PI * float(i) / 24.0
		arch.append(Vector2(cos(a) * (w + 16), -h + 90 + sin(a) * 86))
	for i in range(24, -1, -1):
		var a := PI + PI * float(i) / 24.0
		arch.append(Vector2(cos(a) * (w - 16), -h + 90 + sin(a) * 58))
	Art.shape(self, arch, th.accent, o, 4.0)
	Art.shape(self, Art.star(Vector2(0, -h - 6), 22.0), Color("ffd23f"), o, 3.0)
