class_name Level
extends Node2D
## Root script for every level. Required children: SpawnPoint (Marker2D),
## Players (Node2D). Copy levels/test_level.tscn as a starting template.

@onready var players_root: Node2D = $Players
@onready var spawn_point: Marker2D = $SpawnPoint


func _ready() -> void:
	GameManager.register_level(self)
	var cam := get_viewport().get_camera_2d()
	if cam is CoopCamera:
		cam.snap()


func _exit_tree() -> void:
	GameManager.unregister_level(self)


func get_spawn_position() -> Vector2:
	return spawn_point.global_position
