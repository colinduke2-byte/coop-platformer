extends Node
## Robustness sweep: loads every level in LevelCatalog, drops a dreamer in, and mashes random inputs
## (run, jump, punch, slide, pound, ... and, in World 6, the lever punches that flip gravity) for a
## few seconds, teleporting along the level so every section gets exercised. Any SCRIPT ERROR /
## ERROR line in the output is a bug. Usage:
##   godot --headless --path . res://tools/fuzz_levels.tscn -- [--seconds=14] [--only=w6] [--seed=1]

var _seconds := 14.0
var _players := 1
var _only := ""
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		match kv[0]:
			"seconds": _seconds = float(kv[1])
			"players": _players = clampi(int(kv[1]), 1, 4)
			"only": _only = kv[1]
			"seed": _rng.seed = int(kv[1])
	_run.call_deferred()


func _run() -> void:
	for s in _players:
		InputRouter.bind_slot(s, s if s < 2 else 2, s)
	var n := 0
	for l: Dictionary in LevelCatalog.LEVELS:
		if _only != "" and not String(l["id"]).begins_with(_only):
			continue
		if not ResourceLoader.exists(l["scene"]):
			continue
		await _fuzz(l)
		n += 1
	print("FUZZ done: %d levels" % n)
	get_tree().quit()


func _fuzz(l: Dictionary) -> void:
	var level: Level = load(l["scene"]).instantiate()
	add_child(level)
	for i in 10:
		await get_tree().physics_frame
	var p: Player = GameManager.players.get(0)
	if p == null:
		print("FUZZ %s: no player!" % l["id"])
		level.queue_free()
		return
	if _players == 1:
		p.invulnerable_timer = 1000.0   # (with a team, let them get hurt, bubble and revive: that's the code we want to exercise)
	var rect := Rect2(p.global_position, Vector2.ZERO)
	for c in level.find_children("*", "Checkpoint", true, false):
		rect = rect.expand((c as Node2D).global_position)
	var held := {}
	var frames := int(_seconds * 120.0)
	for f in frames:
		await get_tree().physics_frame
		if not is_instance_valid(p):
			break
		if f % 24 == 0:   # new random habit every 0.2 s
			for slot in _players:
				for a in ["move_left", "move_right", "move_up", "move_down", "jump", "attack", "sprint"]:
					var key := "p%d_%s" % [slot, a]
					var want := _rng.randf() < (0.55 if a == "move_right" else 0.25)
					if want and not held.get(key, false):
						Input.action_press(key)
					elif not want and held.get(key, false):
						Input.action_release(key)
					held[key] = want
		if f % 480 == 0 and f > 0 and rect.size.x > 200.0:   # hop to a random checkpoint to cover the whole level
			var targets := level.find_children("*", "Checkpoint", true, false)
			var t := targets[_rng.randi() % targets.size()] as Node2D
			for q: Player in GameManager.players.values():
				if is_instance_valid(q):
					q.global_position = t.global_position + Vector2(_rng.randf_range(-60, 160), -4)
					q.velocity = Vector2.ZERO
		if f % 600 == 300 and String(l["id"]).begins_with("w6"):
			GameManager.set_gravity_dir(-GameManager.gravity_dir, true)   # as if a lever were punched
		if GameManager.living_players().is_empty() and f % 60 == 0:
			GameManager.respawn_all_at_checkpoint()
	for a in held:
		Input.action_release(a)
	GameManager.set_gravity_dir(1, true)
	print("FUZZ %-6s ok" % l["id"])
	level.queue_free()
	await get_tree().process_frame
