class_name Shockwave
extends Area2D
## Ground-hugging wave from a slam: rolls along the floor, bubbles anyone it
## touches. Jump over it! Stops at walls and ledges.

@export var speed := 460.0
@export var dir := 1
@export var lifetime := 1.8

var _age := 0.0


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(34, 34)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -17)
	add_child(col)


func _physics_process(delta: float) -> void:
	_age += delta
	var step := Vector2(dir * speed * delta, 0)
	var space := get_world_2d().direct_space_state
	var ahead := PhysicsPointQueryParameters2D.new()
	ahead.position = global_position + step + Vector2(dir * 18.0, -12.0)
	ahead.collision_mask = 1
	var below := PhysicsPointQueryParameters2D.new()
	below.position = global_position + step + Vector2(0, 6)
	below.collision_mask = 1
	if _age > lifetime or not space.intersect_point(ahead, 1).is_empty() or space.intersect_point(below, 1).is_empty():
		queue_free()
		return
	position += step
	for b in get_overlapping_bodies():
		if b is Player:
			(b as Player).hurt()
	queue_redraw()


func _draw() -> void:
	var fade := 1.0 - _age / lifetime
	var h := 30.0 + sin(_age * 30.0) * 4.0
	var pts := PackedVector2Array([Vector2(-22, 0), Vector2(-10, -h * 0.6), Vector2(0, -h), Vector2(10, -h * 0.6), Vector2(22, 0)])
	Art.shape(self, pts, Color(1, 0.95, 0.8, 0.9 * fade), Color(0.4, 0.3, 0.2, fade), 2.5)
