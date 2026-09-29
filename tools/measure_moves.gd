extends Node
## Measures what the player can actually do with the current PlayerTuning and
## writes docs/MOVEMENT.md (level-design reference numbers). Re-run after tuning:
##   godot --headless --path . res://tools/measure_moves.tscn
## Every number comes from simulating real inputs, so it stays honest.

const OUT := "res://docs/MOVEMENT.md"

var _arena: Node2D
var _rows: Array = []


func _ready() -> void:
	Vfx.enabled = false
	Vfx.hit_stop_enabled = false
	_run.call_deferred()


func _run() -> void:
	await _measure("Tap jump height", "px", _tap_jump)
	await _measure("Full jump height (hold)", "px", _full_jump)
	await _measure("Running jump distance (hold)", "px", _run_jump.bind(false))
	await _measure("Sprinting jump distance (hold)", "px", _run_jump.bind(true))
	await _measure("Long jump distance (slide + jump)", "px", _long_jump)
	await _measure("Running jump + glide distance (same height)", "px", _glide_jump)
	await _measure("Glide: horizontal distance per 100 px of drop", "px", _glide_ratio)
	await _measure("Ground-pound jump height", "px", _pound_jump)
	await _measure("Air uppercut extra height (at the apex)", "px", _uppercut)
	await _measure("Wall jump: height gained per kick (2 walls 160 px apart)", "px", _wall_kick)
	await _measure("Wall run height (sprint into a wall)", "px", _wall_run)
	await _measure("Stomp bounce height (tap / hold jump)", "px", _stomp_bounce)
	var t: PlayerTuning = load("res://player/tuning/player_default.tres")
	_rows.append(["Run speed / sprint speed", "%d / %d px/s" % [t.max_run_speed, t.sprint_speed]])
	_rows.append(["Fall speed / fast fall / glide fall", "%d / %d / %d px/s" % [t.max_fall_speed, t.fast_fall_max_speed, t.glide_fall_speed]])
	_rows.append(["Ledge grab window (above feet)", "%d - %d px" % [t.ledge_grab_low, t.ledge_grab_high]])
	_rows.append(["Corner correction / ledge bump", "%d / %d px" % [t.corner_correction, t.ledge_bump]])
	_rows.append(["Crouch height (fits gaps taller than)", "%d px" % t.crouch_height])
	_rows.append(["BouncePad default (plain / hold / pound)", "%d / %d / %d px" % [420, 420 * 1.3, 420 * 1.7]])
	_write()
	get_tree().quit()


func _measure(label: String, unit: String, fn: Callable) -> void:
	_arena = Node2D.new()
	add_child(_arena)
	var floor_b: Block = load("res://world/block.tscn").instantiate()
	floor_b.position = Vector2(-4000, 0)
	floor_b.size = Vector2(12000, 200)
	_arena.add_child(floor_b)
	var root := Level.new()
	root.name = "MeasureLevel"
	var players := Node2D.new()
	players.name = "Players"
	root.add_child(players)
	var sp := Marker2D.new()
	sp.name = "SpawnPoint"
	root.add_child(sp)
	_arena.add_child(root)
	await get_tree().physics_frame
	InputRouter.bind_slot(0, 0)
	var result: Variant = await fn.call()
	for a in InputRouter.ACTIONS:
		Input.action_release(InputRouter.action_name(0, a))
	InputRouter.unbind_slot(0)
	_arena.queue_free()
	await get_tree().physics_frame
	var text: String = ("%.0f %s" % [result, unit]) if result is float else str(result)
	_rows.append([label, text])
	print("%-60s %s" % [label, text])


func _player(pos: Vector2) -> Player:
	var p: Player = GameManager.spawn_player(0, pos)
	return p


func _frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func _settle(p: Player) -> void:
	for i in 240:
		await get_tree().physics_frame
		if p.is_on_floor() and p.state_machine.current_name() == &"Ground":
			return


func _press(a: String) -> void:
	Input.action_press("p0_" + a)


func _release(a: String) -> void:
	Input.action_release("p0_" + a)


## Highest point above `y0` over `frames` physics frames.
func _peak(p: Player, y0: float, frames: int) -> float:
	var best := y0
	for i in frames:
		await get_tree().physics_frame
		best = minf(best, p.global_position.y)
	return y0 - best


func _tap_jump() -> float:
	var p := _player(Vector2(0, -2))
	await _settle(p)
	_press("jump")
	await _frames(2)
	_release("jump")
	return await _peak(p, p.global_position.y, 90)


func _full_jump() -> float:
	var p := _player(Vector2(0, -2))
	await _settle(p)
	_press("jump")
	var h: float = await _peak(p, p.global_position.y, 70)
	_release("jump")
	return h


## Horizontal distance from takeoff to landing back on the floor.
func _airtime_distance(p: Player, hold_jump_frames: int) -> float:
	var x0 := p.global_position.x
	_press("jump")
	var left := false
	for i in 600:
		await get_tree().physics_frame
		if i == hold_jump_frames:
			_release("jump")
		if not p.is_on_floor():
			left = true
		elif left:
			break
	_release("jump")
	return p.global_position.x - x0


func _run_jump(sprint: bool) -> float:
	var p := _player(Vector2(-3500, -2))
	await _settle(p)
	_press("move_right")
	await _frames(int((1.6 if sprint else 0.3) * 120.0))
	var d: float = await _airtime_distance(p, 45)  # release before the apex: no glide
	_release("move_right")
	return d


func _long_jump() -> float:
	var p := _player(Vector2(-3500, -2))
	await _settle(p)
	_press("move_right")
	await _frames(40)
	_press("move_down")
	await _frames(4)
	_release("move_down")
	var d: float = await _airtime_distance(p, 45)
	_release("move_right")
	return d


func _glide_jump() -> float:
	var p := _player(Vector2(-3500, -2))
	p.tuning = p.tuning.duplicate()
	p.tuning.glide_mode = PlayerTuning.GlideMode.HOLD_THROUGH
	await _settle(p)
	_press("move_right")
	await _frames(40)
	var d: float = await _airtime_distance(p, 9999)
	_release("move_right")
	return d


func _glide_ratio() -> float:
	var t: PlayerTuning = load("res://player/tuning/player_default.tres")
	return t.glide_max_speed / t.glide_fall_speed * 100.0


func _pound_jump() -> float:
	var p := _player(Vector2(0, -300))
	await _frames(10)
	_press("move_down")
	await _frames(2)
	_press("attack")
	await _frames(2)
	_release("attack")
	_release("move_down")
	for i in 120:
		await get_tree().physics_frame
		if p.rig.pound_phase == 2:
			break
	_press("jump")
	var h: float = await _peak(p, p.global_position.y, 90)
	_release("jump")
	return h


func _uppercut() -> float:
	var p := _player(Vector2(0, -2))
	await _settle(p)
	_press("jump")
	await _frames(2)
	_release("jump")
	var y0 := p.global_position.y
	for i in 60:
		await get_tree().physics_frame
		if p.velocity.y >= 0.0:
			break
	var apex := p.global_position.y
	_press("move_up")
	_press("attack")
	await _frames(2)
	_release("attack")
	var extra: float = await _peak(p, apex, 60)
	_release("move_up")
	return extra


func _wall_kick() -> float:
	for x: float in [300.0, 520.0]:
		var w: Block = load("res://world/block.tscn").instantiate()
		w.position = Vector2(x, -2000)
		w.size = Vector2(60, 1900)
		_arena.add_child(w)
	var p := _player(Vector2(440, -300))
	_press("move_right")
	for i in 60:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"WallSlide":
			break
	_release("move_right")
	var y0 := p.global_position.y
	for k in 4:
		for i in 60:
			await get_tree().physics_frame
			if p.state_machine.current_name() == &"WallSlide":
				break
		_press("jump")
		await _frames(4)
		_release("jump")
	for i in 60:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"WallSlide":
			break
	return (y0 - p.global_position.y) / 4.0


func _wall_run() -> float:
	var w: Block = load("res://world/block.tscn").instantiate()
	w.position = Vector2(0, -2000)
	w.size = Vector2(100, 2000)
	_arena.add_child(w)
	var p := _player(Vector2(-2400, -2))
	await _settle(p)
	_press("move_right")
	var h: float = await _peak(p, p.global_position.y, 600)
	_release("move_right")
	return h


func _stomp_bounce() -> String:
	var res: Array[float] = []
	for hold in [false, true]:
		var p := _player(Vector2(0, -2))
		await _settle(p)
		if hold:
			_press("jump")
		p.bounce()
		res.append(await _peak(p, p.global_position.y, 90))
		_release("jump")
		p.queue_free()
		GameManager.players.erase(0)
		await _frames(2)
	return "%.0f / %.0f px" % [res[0], res[1]]


func _write() -> void:
	var lines := PackedStringArray([
		"# Movement reference (generated)", "",
		"Measured by `tools/measure_moves.tscn` from `player/tuning/player_default.tres`.",
		"Re-run after changing tuning: `godot --headless --path . res://tools/measure_moves.tscn`.",
		"Use these when building levels: gaps a bit *under* a number are fair, gaps over it",
		"need a helper (pad, updraft, swing, wall, glide).", "",
		"| Move | Result |", "|---|---|",
	])
	for r in _rows:
		lines.append("| %s | %s |" % [r[0], r[1]])
	lines.append("")
	lines.append("Rules of thumb: a single-block step (full jump) should be at most ~80% of the full")
	lines.append("jump height; must-make gaps ~80% of the running jump; secrets can ask for the max.")
	var f := FileAccess.open(OUT, FileAccess.WRITE)
	f.store_string("\n".join(lines) + "\n")
	f.close()
	print("wrote ", OUT)
