@tool
class_name ZoneTrigger
extends Area2D
## Invisible box that fires its targets when players walk in: start platforms,
## wake spawners, close a gate behind you for an arena fight...
## Origin = top-left. `need_everyone` waits for all living players (co-op regroup).

signal triggered

@export var size := Vector2(200, 300):
	set(v):
		size = v
		_rebuild()
@export var targets: Array[NodePath] = []:
	set(v):
		targets = v
		queue_redraw()
@export var need_everyone := false
@export var once := true
@export var send_on := true                 ## value passed to set_active()

var _fired := false
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size
	_col.shape = shape
	_col.position = size * 0.5
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint() or (_fired and once):
		return
	var inside := 0
	for b in get_overlapping_bodies():
		if b is Player and not b.is_bubbled():
			inside += 1
	var alive := GameManager.living_players().size()
	var go := inside > 0 and (not need_everyone or inside >= alive)
	if go and not _fired:
		_fired = true
		Activation.send(self, targets, send_on)
		triggered.emit()
	elif not go and not once:
		_fired = false


func _draw() -> void:
	if Engine.is_editor_hint():
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.3, 1.0, 0.5, 0.12))
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.3, 1.0, 0.5, 0.6), false, 2.0)
		Activation.draw_links(self, targets)
