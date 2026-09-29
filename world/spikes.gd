@tool
class_name Spikes
extends Area2D
## Row of spikes that bubbles players who touch it. Origin = left end of the
## base; `length` runs along +x. Rotate the node to point them sideways/down.

const HEIGHT := 30.0
const TOOTH := 28.0

@export var length := 168.0:
	set(v):
		length = v
		_rebuild()
@export var hurts_enemies := false


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2 | (4 if hurts_enemies else 0)
	monitorable = false
	body_entered.connect(_on_body_entered)
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for c in get_children(true):
		if c is CollisionShape2D:
			c.queue_free()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(length - 8.0, HEIGHT * 0.6)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(length * 0.5, -HEIGHT * 0.3)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	# Also catch players standing still in them (body_entered fires once).
	for b in get_overlapping_bodies():
		_on_body_entered(b)


func _on_body_entered(body: Node2D) -> void:
	if body is Player:
		body.hurt()
	elif hurts_enemies and body.has_method("take_hit"):
		body.take_hit(null, Vector2(0, -300))


func _draw() -> void:
	var th := LevelTheme.find(self)
	var metal := Color("d9dde8")
	var n := maxi(int(round(length / TOOTH)), 1)
	var w := length / n
	draw_rect(Rect2(0, -6, length, 6), th.outline)
	for i in n:
		var x := i * w
		var tip := Vector2(x + w * 0.5, -HEIGHT)
		Art.shape(self, PackedVector2Array([Vector2(x + 1, -4), tip, Vector2(x + w - 1, -4)]), metal, th.outline, 2.5)
		draw_line(tip + Vector2(0, 6), Vector2(x + w * 0.5 - 3, -8), Color.WHITE, 2.0)
