@tool
class_name KeyDoor
extends AnimatableBody2D
## Locked barrier that opens when someone carrying a matching DreamKey touches
## it (the key is used up). Also emits door_unlocked and can fire `targets`.
## Origin = top-left.

@export var size := Vector2(64, 220):
	set(v):
		size = v
		_rebuild()
@export_range(0, 3) var key_color := 0:
	set(v):
		key_color = v
		queue_redraw()
@export var targets: Array[NodePath] = []

var _open := false
var _col: CollisionShape2D
var _zone: Area2D


func _ready() -> void:
	collision_layer = 1
	collision_mask = 0
	sync_to_physics = true
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
		_zone = Area2D.new()
		_zone.collision_layer = 0
		_zone.collision_mask = 2
		_zone.monitorable = false
		_zone.add_child(CollisionShape2D.new())
		add_child(_zone, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size
	_col.shape = shape
	_col.position = size * 0.5
	var zs := RectangleShape2D.new()
	zs.size = size + Vector2(40, 0)
	var zc := _zone.get_child(0) as CollisionShape2D
	zc.shape = zs
	zc.position = size * 0.5
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint() or _open:
		return
	for b in _zone.get_overlapping_bodies():
		var p := b as Player
		if p == null:
			continue
		for k in get_tree().get_nodes_in_group(&"dream_keys"):
			var key := k as DreamKey
			if key.carrier == p and key.key_color == key_color:
				key.use()
				unlock()
				return


func unlock() -> void:
	_open = true
	collision_layer = 0
	EventBus.door_unlocked.emit(self)
	Activation.send(self, targets, true)
	Audio.play("switch", -2.0, 0.8, 0.0)
	var tw := create_tween()
	tw.tween_property(self, ^"modulate:a", 0.0, 0.4)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var c := DreamKey.COLORS[key_color]
	Art.shape(self, Art.rect(Vector2.ZERO, size), th.ledge_dark, o, 4.0)
	for i in int(size.y / 40.0):
		draw_line(Vector2(6, 20 + i * 40), Vector2(size.x - 6, 20 + i * 40), th.ledge_dark.darkened(0.25), 3.0)
	var mid := size * 0.5
	Art.shape(self, Art.rounded_rect(mid - Vector2(20, 24), mid + Vector2(20, 20), 6.0), c, o, 3.0)
	Art.shape(self, Art.ellipse(mid + Vector2(0, -24), 14, 14, 16), Color(0, 0, 0, 0), o, 4.0)
	draw_circle(mid + Vector2(0, -2), 5.0, o)
	draw_line(mid + Vector2(0, -2), mid + Vector2(0, 10), o, 4.0)
	Activation.draw_links(self, targets)
