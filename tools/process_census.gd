extends Node
## Which scripts keep per-frame callbacks running in a level? Counts nodes with _process / _physics_process on,
## grouped by script, so off-screen gating can go where the numbers are.
##   godot --headless --path . res://tools/process_census.tscn -- --level=res://levels/w5_5_midnight_trench.tscn


func _ready() -> void:
	var path := "res://levels/w3_2_canopy_highway.tscn"
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--level="):
			path = a.substr(8)
	InputRouter.bind_slot(0, 0, 0)
	var level: Node = load(path).instantiate()
	add_child(level)
	for i in 30:
		await get_tree().physics_frame
	var proc := {}
	var phys := {}
	var total := 0
	for n in level.find_children("*", "", true, false):
		total += 1
		var s: Script = n.get_script()
		var key := s.resource_path.get_file() if s else n.get_class()
		if n.is_processing():
			proc[key] = int(proc.get(key, 0)) + 1
		if n.is_physics_processing():
			phys[key] = int(phys.get(key, 0)) + 1
	print("nodes: %d" % total)
	for title: String in ["process", "physics"]:
		var d: Dictionary = proc if title == "process" else phys
		var keys := d.keys()
		keys.sort_custom(func(a: String, b: String) -> bool: return d[a] > d[b])
		print("-- %s" % title)
		for k: String in keys.slice(0, 14):
			print("  %-28s %d" % [k, d[k]])
	get_tree().quit()
