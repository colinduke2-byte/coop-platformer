extends Node
## Renders screenshots of a level so tools/agents can review layout and art
## without playing. Run (needs a display; in the cloud use xvfb-run):
##   godot --path . res://tools/level_shots.tscn -- --level=res://levels/demo_level.tscn \
##       --shots=/tmp/shots [--players=2] [--zoom=0.5] [--at=x,y;x,y;...] [--overview]
## --overview tiles the whole level at `--zoom` (default 0.35) into overview_NN.png.
## --at captures one PNG per point (camera centre) at `--zoom` (default 0.75).
## Players spawn at the level spawn so the art is shown with characters in it.

const SETTLE_FRAMES := 20

var _args := {}


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "true"
	_run.call_deferred()


func _run() -> void:
	var out: String = _args.get("shots", "user://shots")
	DirAccess.make_dir_recursive_absolute(out)
	for i in int(_args.get("players", "1")):
		InputRouter.bind_slot(i, i if i < 2 else 2, i)
	var level: Node = load(_args.get("level", "res://levels/demo_level.tscn")).instantiate()
	add_child(level)
	var cam := Camera2D.new()
	add_child(cam)
	for c in level.find_children("*", "Camera2D", true, false):
		c.set_physics_process(false)
	cam.make_current()
	for f in SETTLE_FRAMES:
		await get_tree().process_frame

	var points: Array[Vector2] = []
	var zoom := float(_args.get("zoom", "0.75"))
	if _args.has("overview"):
		zoom = float(_args.get("zoom", "0.35"))
		var r := _level_rect(level)
		var view := get_viewport().get_visible_rect().size / zoom
		var y := r.position.y + view.y * 0.5
		while y - view.y * 0.5 < r.end.y:
			var x := r.position.x + view.x * 0.5
			while x - view.x * 0.5 < r.end.x:
				points.append(Vector2(x, y))
				x += view.x
			y += view.y
	elif _args.has("at"):
		for s in String(_args["at"]).split(";"):
			var xy := s.split(",")
			points.append(Vector2(float(xy[0]), float(xy[1])))
	cam.zoom = Vector2(zoom, zoom)
	var prefix := "overview" if _args.has("overview") else "shot"
	for i in points.size():
		cam.global_position = points[i]
		cam.reset_smoothing()
		for f in 6:
			await get_tree().process_frame
		get_viewport().get_texture().get_image().save_png("%s/%s_%02d.png" % [out, prefix, i])
	print("saved %d shots to %s" % [points.size(), out])
	get_tree().quit()


## Bounding box of all level geometry (Blocks) so the overview covers it.
func _level_rect(level: Node) -> Rect2:
	var r := Rect2()
	var first := true
	for b in level.find_children("*", "", true, false):
		if b is Block:
			var br := Rect2(b.global_position, b.size)
			r = br if first else r.merge(br)
			first = false
	return r
