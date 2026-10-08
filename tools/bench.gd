extends Node
## Performance benchmark: plays a level with a player teleported along the
## route (camera follows as in the real game) and prints frame-time stats.
##   godot --path . res://tools/bench.tscn -- --level=res://levels/demo_level.tscn [--seconds=20] [--players=1]
## Headless measures CPU only (scripts + physics). With a display (xvfb-run)
## it includes rendering too. Numbers are ms per frame.

var _args := {}


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "true"
	if _args.has("gfx"):
		Gfx.level = int(_args["gfx"])  # 0 low, 1 medium, 2 high
	Engine.max_fps = 0
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_DISABLED)
	_run.call_deferred()


func _run() -> void:
	var players := int(_args.get("players", "1"))
	for i in players:
		InputRouter.bind_slot(i, i if i < 2 else 2, i)
	var level: Level = load(_args.get("level", "res://levels/demo_level.tscn")).instantiate()
	add_child(level)
	for f in 30:
		await get_tree().process_frame
	var r := _level_rect(level)
	if _args.has("drawcalls"):
		await _drawcalls(level, float(_args.get("x", "14000")))
		get_tree().quit()
		return
	if _args.has("blame"):
		await _blame(level, Vector2(float(_args.get("x", "14000")), 0.0))
		get_tree().quit()
		return
	var seconds := float(_args.get("seconds", "20"))
	var frame_ms: Array[float] = []
	var proc_ms: Array[float] = []
	var phys_ms: Array[float] = []
	var draws: Array[float] = []
	var t0 := Time.get_ticks_usec()
	var last := t0
	var elapsed := 0.0
	var worst_at := Vector2.ZERO
	var worst := 0.0
	while elapsed < seconds:
		# Sweep the players left -> right along the top surface of the level.
		var x := lerpf(r.position.x + 200.0, r.end.x - 200.0, elapsed / seconds)
		var y := _surface_y(level, x)
		var i := 0
		for p: Player in GameManager.players.values():
			if is_instance_valid(p):
				p.global_position = Vector2(x + i * 50.0, y)
				p.velocity = Vector2(400, 0)
				i += 1
		await get_tree().process_frame
		var now := Time.get_ticks_usec()
		var ms := (now - last) / 1000.0
		last = now
		elapsed = (now - t0) / 1e6
		frame_ms.append(ms)
		proc_ms.append(Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0)
		phys_ms.append(Performance.get_monitor(Performance.TIME_PHYSICS_PROCESS) * 1000.0)
		draws.append(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
		if ms > worst and frame_ms.size() > 10:
			worst = ms
			worst_at = Vector2(x, y)
	frame_ms.sort()
	var n := frame_ms.size()
	print("BENCH %s players=%d frames=%d avg_fps=%.0f" % [_args.get("level", "demo"), players, n, n / elapsed])
	print("  frame ms: p50 %.2f  p90 %.2f  p99 %.2f  max %.2f (worst near %s)" % [
			frame_ms[n / 2], frame_ms[n * 9 / 10], frame_ms[n * 99 / 100], frame_ms[n - 1], worst_at])
	print("  process ms avg %.2f   physics ms avg %.2f   draw calls avg %.0f   nodes %d" % [
			_avg(proc_ms), _avg(phys_ms), _avg(draws), Performance.get_monitor(Performance.OBJECT_NODE_COUNT)])
	get_tree().quit()


func _avg(a: Array[float]) -> float:
	var s := 0.0
	for v in a:
		s += v
	return s / maxf(a.size(), 1.0)


## Top of the highest block under x (so the sweep follows the ground).
func _surface_y(level: Node, x: float) -> float:
	var best := 1e9
	for b in level.find_children("*", "Block", true, false):
		var blk := b as Block
		if blk.global_position.x <= x and blk.global_position.x + blk.size.x >= x and not blk.one_way:
			best = minf(best, blk.global_position.y)
	return (best if best < 1e8 else 0.0) - 80.0


func _level_rect(level: Node) -> Rect2:
	var r := Rect2()
	var first := true
	for b in level.find_children("*", "Block", true, false):
		var br := Rect2(b.global_position, b.size)
		r = br if first else r.merge(br)
		first = false
	return r


## --blame: park the player at --x and, per script type, time 90 frames with
## that script's _process/_physics_process running vs switched off.
func _blame(level: Node, at: Vector2) -> void:
	for p: Player in GameManager.players.values():
		p.global_position = Vector2(at.x, _surface_y(level, at.x))
	for f in 30:
		await get_tree().process_frame
	var by_script := {}
	for n in level.find_children("*", "", true, false):
		var sc: Script = n.get_script()
		if sc and (n.is_processing() or n.is_physics_processing()):
			var k := sc.resource_path.get_file()
			if not by_script.has(k):
				by_script[k] = []
			by_script[k].append(n)
	var base := await _time_frames(int(_args.get("frames", "90")))
	print("BLAME at x=%.0f  base %.3f ms/frame" % [at.x, base])
	var rows := []
	for k: String in by_script:
		var nodes: Array = by_script[k]
		var states := []
		for n: Node in nodes:
			states.append([n.is_processing(), n.is_physics_processing()])
			n.set_process(false)
			n.set_physics_process(false)
		var t := await _time_frames(int(_args.get("frames", "90")))
		for i in nodes.size():
			nodes[i].set_process(states[i][0])
			nodes[i].set_physics_process(states[i][1])
		rows.append([base - t, k, nodes.size()])
	rows.sort_custom(func(a: Array, b: Array) -> bool: return a[0] > b[0])
	for row: Array in rows:
		print("  %-26s x%-4d saves %.3f ms" % [row[1], row[2], row[0]])


## Average TIME_PROCESS (scripts + redraw callbacks) over n frames, in ms.
## Wall-clock time is useless here: headless caps the frame rate and xvfb's
## software GPU dominates, but the process monitor is the CPU cost we control.
func _time_frames(n: int) -> float:
	var s := 0.0
	for i in n:
		await get_tree().process_frame
		s += Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0
	return s / n


## --drawcalls: draw calls at --x with everything, then with each script type hidden.
func _drawcalls(level: Node, x: float) -> void:
	for p: Player in GameManager.players.values():
		p.global_position = Vector2(x, _surface_y(level, x))
	for f in 40:
		await get_tree().process_frame
	var base := await _calls()
	print("DRAWCALLS at x=%.0f  total %d" % [x, base])
	var groups := {}
	for n in level.find_children("*", "CanvasItem", true, false):
		var sc: Script = n.get_script()
		var k: String = sc.resource_path.get_file() if sc else n.get_class()
		if not groups.has(k):
			groups[k] = []
		groups[k].append(n)
	var rows := []
	for k: String in groups:
		var nodes: Array = groups[k]
		var vis := []
		for n in nodes:
			vis.append(is_instance_valid(n) and n.visible)
			if is_instance_valid(n):
				n.visible = false
		var c := await _calls()
		for i in nodes.size():
			if is_instance_valid(nodes[i]):
				nodes[i].visible = vis[i]
		rows.append([base - c, k, nodes.size()])
	rows.sort_custom(func(a: Array, b: Array) -> bool: return a[0] > b[0])
	for row: Array in rows.slice(0, 25):
		print("  %-26s x%-4d %d calls" % [row[1], row[2], row[0]])


func _calls() -> int:
	for i in 3:
		await get_tree().process_frame
	return int(Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME))
