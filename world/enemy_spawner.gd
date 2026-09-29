@tool
class_name EnemySpawner
extends Node2D
## Pops enemies out (with a puff) while active: `total` of them, at most
## `max_alive` at once, one every `interval` s. Starts on its own or waits for a
## trigger (set_active). Put it under a DefeatTrigger for arena waves.

@export var enemy_scene: PackedScene = preload("res://enemies/grunt.tscn")
@export var total := 4
@export var max_alive := 2
@export var interval := 1.2
@export var active := false                 ## false = wait for a trigger
@export var spawn_facing := -1

var _spawned := 0
var _alive: Array[Node] = []
var _timer := 0.3


func set_active(on: bool) -> void:
	active = on


func is_finished() -> bool:
	_alive = _alive.filter(func(e: Node) -> bool: return is_instance_valid(e) and not e.dead)
	return _spawned >= total and _alive.is_empty()


func _physics_process(delta: float) -> void:
	if Engine.is_editor_hint():
		return
	if not active or _spawned >= total:
		return
	_alive = _alive.filter(func(e: Node) -> bool: return is_instance_valid(e) and not e.dead)
	_timer -= delta
	if _timer <= 0.0 and _alive.size() < max_alive:
		_timer = interval
		var e: Node2D = enemy_scene.instantiate()
		e.position = position
		if "start_facing" in e:
			e.start_facing = spawn_facing
		get_parent().add_child(e)
		_alive.append(e)
		_spawned += 1
		EventBus.enemy_spawned.emit(e)


func _draw() -> void:
	if Engine.is_editor_hint():
		Art.shape(self, Art.star(Vector2(0, -30), 22.0, 6), Color(1, 0.5, 0.3, 0.6), Color(0.4, 0.1, 0, 0.8), 2.0)
		draw_string(ThemeDB.fallback_font, Vector2(-30, -60), "x%d" % total, HORIZONTAL_ALIGNMENT_CENTER, 60, 18)
