@tool
class_name PlatformWheel
extends Node2D
## Ferris wheel of platforms turning round this point. Platforms stay level
## and carry riders. Great for timing puzzles and vertical climbs.

@export var count := 4:
	set(v):
		count = maxi(v, 1)
		_rebuild()
@export var radius := 220.0:
	set(v):
		radius = v
		_rebuild()
@export var speed := 30.0                   ## degrees per second
@export var platform_size := Vector2(150, 28):
	set(v):
		platform_size = v
		_rebuild()
@export var one_way := true:
	set(v):
		one_way = v
		_rebuild()

var _angle := 0.0
var _plats: Array[AnimatableBody2D] = []


func _ready() -> void:
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	for p in _plats:
		p.queue_free()
	_plats.clear()
	for i in count:
		var b := AnimatableBody2D.new()
		b.collision_layer = 1
		b.collision_mask = 0
		b.sync_to_physics = true
		var shape := RectangleShape2D.new()
		shape.size = platform_size
		var col := CollisionShape2D.new()
		col.shape = shape
		col.one_way_collision = one_way
		b.add_child(col)
		b.draw.connect(_draw_platform.bind(b))
		add_child(b, false, Node.INTERNAL_MODE_FRONT)
		_plats.append(b)
	_place()


func _place() -> void:
	for i in _plats.size():
		_plats[i].position = Vector2.from_angle(_angle + TAU * float(i) / _plats.size()) * radius
		_plats[i].queue_redraw()


func _physics_process(delta: float) -> void:
	if not Engine.is_editor_hint():
		_angle += deg_to_rad(speed) * delta
	_place()
	View.redraw(self, radius + 200.0)


func _draw_platform(b: AnimatableBody2D) -> void:
	PlatformArt.draw_plank(b, Rect2(-platform_size * 0.5, platform_size), LevelTheme.find(self))


func _draw() -> void:
	var th := LevelTheme.find(self)
	for p in _plats:
		draw_line(Vector2.ZERO, p.position, th.outline, 8.0)
		draw_line(Vector2.ZERO, p.position, th.ledge_dark, 4.0)
	Art.shape(self, Art.ellipse(Vector2.ZERO, 18, 18, 16), th.ledge_dark, th.outline, 3.0)
	draw_circle(Vector2.ZERO, 6.0, th.accent)
