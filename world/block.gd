@tool
class_name Block
extends StaticBody2D
## Grey-box level geometry. Drop one in, set `size` in the Inspector.
## Origin is the TOP-LEFT corner. `one_way` = jump up through it (Rayman ledges).

@export var size := Vector2(256, 64):
	set(value):
		size = value
		_rebuild()
@export var color := Color("4a3f5c"):
	set(value):
		color = value
		_rebuild()
@export var one_way := false:
	set(value):
		one_way = value
		_rebuild()


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	var shape := RectangleShape2D.new()
	shape.size = size
	var col: CollisionShape2D = $CollisionShape2D
	col.shape = shape
	col.position = size / 2.0
	col.one_way_collision = one_way
	var poly: Polygon2D = $Polygon2D
	poly.color = color.lightened(0.25) if one_way else color
	poly.polygon = PackedVector2Array([Vector2.ZERO, Vector2(size.x, 0), size, Vector2(0, size.y)])
