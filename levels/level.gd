class_name Level
extends Node2D
## Root script for every level. Required children: SpawnPoint (Marker2D),
## Players (Node2D). Copy levels/test_level.tscn as a starting template.

## Palette every block / platform / toy in this level draws with.
@export var level_theme: LevelTheme
@export var level_name := ""
## Screens every level gets automatically (so level scenes stay lean).
@export var add_hud := true
@export var add_pause_menu := true
@export var add_results_screen := true

@onready var players_root: Node2D = $Players
@onready var spawn_point: Marker2D = $SpawnPoint


func _ready() -> void:
	GameManager.register_level(self)
	if add_hud and not has_node(^"HUD"):
		var hud: Node = load("res://ui/hud.tscn").instantiate()
		hud.name = "HUD"
		add_child(hud)
	if add_pause_menu and not has_node(^"PauseMenu"):
		var pm: Node = load("res://ui/pause_menu.tscn").instantiate()
		pm.name = "PauseMenu"
		add_child(pm)
	if add_results_screen and not has_node(^"Results"):
		var rs: Node = load("res://ui/results.tscn").instantiate()
		rs.name = "Results"
		add_child(rs)
	if level_theme != null:
		if not has_node(^"Foreground"):
			var fg := Foreground.new()
			add_child(fg)
			var bd := find_children("*", "Backdrop", true, false)
			fg.setup(level_theme, (bd[0] as Backdrop).scenery if not bd.is_empty() else Backdrop.Scenery.HILLS)
		if not has_node(^"ColorGrade"):
			var cg := ColorGrade.new()
			add_child(cg)
			cg.setup(level_theme)
	if OS.has_feature("web") and Settings.graphics < 0 and not has_node(^"GfxWatchdog"):
		var wd := GfxWatchdog.new()
		wd.name = "GfxWatchdog"
		add_child(wd)
	var cam := get_viewport().get_camera_2d()
	if cam is CoopCamera:
		cam.snap()
	EventBus.level_started.emit(self)
	Net.level_loaded(self)


func _exit_tree() -> void:
	GameManager.unregister_level(self)


func get_spawn_position() -> Vector2:
	return spawn_point.global_position
