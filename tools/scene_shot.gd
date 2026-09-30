extends Node
## Screenshot any scene (menus, the world map...):
##   godot --path . res://tools/scene_shot.tscn -- --scene=res://ui/world_map.tscn --out=/tmp/x.png [--wait=1.0] [--players=2]


func _ready() -> void:
	var args := {}
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		args[kv[0]] = kv[1] if kv.size() > 1 else "true"
	for i in int(args.get("players", "1")):
		InputRouter.bind_slot(i, i if i < 2 else 2, i)
	var scene: Node = load(args.get("scene", "res://ui/world_map.tscn")).instantiate()
	add_child(scene)
	await get_tree().create_timer(float(args.get("wait", "1.0"))).timeout
	await get_tree().process_frame
	get_viewport().get_texture().get_image().save_png(args.get("out", "/tmp/shot.png"))
	get_tree().quit()
