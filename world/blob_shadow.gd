class_name BlobShadow
extends Node2D
## A soft contact shadow under a character or enemy: it sits on whatever ground is
## below (tilted to the slope), shrinking and fading as the owner rises, which
## grounds everything in the scene and sells jumps. Add as a child of the owner
## (it makes itself top-level). Wide = half-width in px at rest.

@export var half_width := 26.0
@export var reach := 640.0          ## how far below the owner it can find ground

var _owner_node: Node2D
var _space: PhysicsDirectSpaceState2D


func _init() -> void:
	top_level = true
	z_index = 0     # after the terrain (earlier in the tree), before its owner (show_behind_parent)
	show_behind_parent = true


func _ready() -> void:
	_owner_node = get_parent() as Node2D
	set_physics_process(_owner_node != null)


func _physics_process(_delta: float) -> void:
	if _owner_node == null or not is_instance_valid(_owner_node):
		return
	if not View.sees(_owner_node.global_position, 260.0):
		visible = false
		return
	# Which way "down" is for the owner (World 6 flips it). Duck-typed: naming Player / Enemy here
	# would make a script dependency cycle (they both create a BlobShadow).
	var g := float(_owner_node.get("gdir")) if "gdir" in _owner_node else 1.0
	var from := _owner_node.global_position + Vector2(0, -6 * g)
	var q := PhysicsRayQueryParameters2D.create(from, from + Vector2(0, reach * g), 1)
	var hit := _owner_node.get_world_2d().direct_space_state.intersect_ray(q)
	if hit.is_empty():
		visible = false
		return
	visible = true
	var h := from.distance_to(hit.position as Vector2)
	var k := clampf(h / 420.0, 0.0, 1.0)
	global_position = (hit.position as Vector2) + Vector2(0, g)
	global_rotation = (hit.normal as Vector2).angle() + PI * 0.5
	scale = Vector2.ONE * lerpf(1.0, 0.5, k)
	modulate.a = lerpf(1.0, 0.0, clampf(h / reach, 0.0, 1.0))
	queue_redraw()


func _draw() -> void:
	draw_colored_polygon(Art.ellipse(Vector2.ZERO, half_width * 1.25, 6.5, 20), Color(0.05, 0.02, 0.1, 0.17))
	draw_colored_polygon(Art.ellipse(Vector2.ZERO, half_width * 0.95, 4.5, 20), Color(0.05, 0.02, 0.1, 0.34))
