extends Node
## Records scripted movement scenarios to PNG frames (then tools/make_gif.py
## turns them into GIFs). Lets agents *see* moves and send clips to Colin.
##   godot --path . res://tools/scenario_shots.tscn -- --scenario=ledge --shots=/tmp/f
## Scenarios are the scn_<name>() functions below; they drive input like tests.
## --level=res://... runs it inside a real level instead of the test arena
## (with --x=,--y= as the spawn).

const ARENA := "res://tests/test_arena.tscn"

var _args := {}
var _out := ""
var _frame := 0
var _capturing := false
var _cam: Camera2D
var _follow: Node2D
var _arena: Node


func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "true"
	_out = _args.get("shots", "user://scenario")
	DirAccess.make_dir_recursive_absolute(_out)
	_run.call_deferred()


func _run() -> void:
	_arena = load(_args.get("level", ARENA)).instantiate()
	add_child(_arena)
	for c in _arena.find_children("*", "Camera2D", true, false):
		c.set_physics_process(false)
	_cam = Camera2D.new()
	_cam.zoom = Vector2.ONE * float(_args.get("zoom", "1.6"))
	add_child(_cam)
	_cam.make_current()
	await frames(2)
	await call("scn_" + String(_args.get("scenario", "ledge")))
	print("saved %d frames to %s" % [_frame, _out])
	get_tree().quit()


func _physics_process(_delta: float) -> void:
	if _args.has("debug") and _follow is Player:
		print("%d %s %s y=%.0f" % [Engine.get_physics_frames(), _follow.state_machine.current_name(), _follow.velocity, _follow.global_position.y])
	if _follow and is_instance_valid(_follow):
		_cam.global_position = _cam.global_position.lerp(_follow.global_position + Vector2(0, -60), 0.2)


# --- helpers --------------------------------------------------------------------

func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


## Run with --fixed-fps 40 (tools/clip.sh does): every rendered frame is
## exactly 3 physics steps, so scripted input timing matches the tests.
func _process(_delta: float) -> void:
	if _capturing:
		_frame += 1
		get_viewport().get_texture().get_image().save_png("%s/f_%05d.png" % [_out, _frame])


func seconds(s: float) -> void:
	await frames(int(ceil(s * Engine.physics_ticks_per_second)))


func press(slot: int, action: String) -> void:
	Input.action_press("p%d_%s" % [slot, action])


func release(slot: int, action: String) -> void:
	Input.action_release("p%d_%s" % [slot, action])


func tap(slot: int, action: String, n := 3) -> void:
	press(slot, action)
	await frames(n)
	release(slot, action)


func add_player(slot: int, pos: Vector2, char_index := -1) -> Player:
	InputRouter.bind_slot(slot, slot if slot < 2 else 2, slot)
	if char_index >= 0:
		GameManager.chosen_characters[slot] = GameManager.CHARACTERS[char_index]
	var p: Player = GameManager.spawn_player(slot)
	p.global_position = pos
	return p


func block(pos: Vector2, size: Vector2, one_way := false) -> Block:
	var b: Block = load("res://world/block.tscn").instantiate()
	b.position = pos
	b.size = size
	b.one_way = one_way
	_arena.add_child(b)
	return b


func start(p: Node2D) -> void:
	_follow = p
	_cam.global_position = p.global_position + Vector2(0, -60)
	_cam.reset_smoothing()
	await frames(2)
	_capturing = true


# --- scenarios --------------------------------------------------------------------

func scn_ledge() -> void:
	block(Vector2(100, -235), Vector2(360, 235))  # taller than a full jump: must catch the ledge
	var p := add_player(0, Vector2(-160, -2), 0)
	await frames(30)
	await start(p)
	await seconds(0.3)
	press(0, "move_right")
	await frames(10)
	press(0, "jump")
	await frames(8)
	release(0, "jump")
	release(0, "move_right")
	await seconds(0.8)  # hangs
	press(0, "move_right")
	await seconds(0.8)
	release(0, "move_right")
	await seconds(0.4)


func scn_pound() -> void:
	var crate := Crate.new()
	crate.position = Vector2(0, 0)
	_arena.add_child(crate)
	var p := add_player(0, Vector2(-150, -2), 1)
	await frames(30)
	await start(p)
	press(0, "move_right")
	press(0, "jump")
	await seconds(0.35)
	release(0, "move_right")
	await seconds(0.1)
	release(0, "jump")
	press(0, "move_down")
	await tap(0, "attack")
	release(0, "move_down")
	await seconds(0.35)
	press(0, "jump")  # pound jump
	await seconds(0.9)
	release(0, "jump")
	await seconds(0.5)


func scn_slide() -> void:
	block(Vector2(300, -300), Vector2(260, 258))
	var p := add_player(0, Vector2(-500, -2), 2)
	await frames(30)
	await start(p)
	press(0, "move_right")
	await seconds(0.9)
	press(0, "move_down")
	await seconds(0.7)
	release(0, "move_down")
	press(0, "jump")
	await seconds(0.6)
	release(0, "jump")
	await seconds(0.4)
	release(0, "move_right")
	await seconds(0.3)


func scn_sprint() -> void:
	var p := add_player(0, Vector2(-1800, -2), 3)
	await frames(30)
	await start(p)
	press(0, "move_right")
	await seconds(1.8)
	press(0, "jump")
	await seconds(0.5)
	release(0, "jump")
	await seconds(0.5)
	release(0, "move_right")
	press(0, "move_left")
	await seconds(0.35)
	release(0, "move_left")
	await seconds(0.3)


func scn_uppercut() -> void:
	var crate := Crate.new()
	crate.position = Vector2(40, -170)
	_arena.add_child(crate)
	var p := add_player(0, Vector2(0, -2), 0)
	await frames(30)
	await start(p)
	await seconds(0.2)
	press(0, "move_up")
	await tap(0, "attack")
	await seconds(0.4)
	press(0, "jump")
	await seconds(0.25)
	await tap(0, "attack")
	release(0, "move_up")
	await seconds(0.8)
	release(0, "jump")


func scn_toys() -> void:
	var pad := BouncePad.new()
	pad.position = Vector2(-300, 0)
	_arena.add_child(pad)
	for i in 3:
		var ring := SwingRing.new()
		ring.position = Vector2(-120 + i * 190, -420)
		_arena.add_child(ring)
	var plat := MovingPlatform.new()
	plat.position = Vector2(-560, -260)
	plat.waypoints = PackedVector2Array([Vector2(0, -120)])
	_arena.add_child(plat)
	var cr := CrumblePlatform.new()
	cr.position = Vector2(420, -300)
	_arena.add_child(cr)
	var sp := Spikes.new()
	sp.position = Vector2(150, 0)
	_arena.add_child(sp)
	var gate := Gate.new()
	gate.position = Vector2(560, -192)
	_arena.add_child(gate)
	var sw := PunchSwitch.new()
	sw.position = Vector2(380, 0)
	_arena.add_child(sw)
	sw.targets = [sw.get_path_to(gate)]
	var plate := PressurePlate.new()
	plate.position = Vector2(-150, 0)
	_arena.add_child(plate)
	var line := LumLine.new()
	line.position = Vector2(-300, -260)
	line.end = Vector2(0, -250)
	line.count = 5
	_arena.add_child(line)
	var p := add_player(0, Vector2(-420, -2), 2)
	await frames(10)
	_cam.zoom = Vector2.ONE * 0.9
	await start(p)
	_follow = null
	_cam.global_position = Vector2(0, -300)
	press(0, "move_right")
	await seconds(0.15)
	release(0, "move_right")
	await seconds(1.4)  # bounce on the pad, fly into the rings
	press(0, "move_right")
	await seconds(1.2)
	press(0, "jump")
	await seconds(0.1)
	release(0, "jump")
	await seconds(1.5)
	release(0, "move_right")
	await seconds(0.5)


func scn_enemies() -> void:
	var names := ["grunt", "flapjack", "spikeroo", "shieldbug", "spitpod", "bonkhorn", "boingo"]
	for i in names.size():
		var e: Enemy = load("res://enemies/%s.tscn" % names[i]).instantiate()
		e.position = Vector2(-900 + i * 190, -120 if names[i] in ["flapjack", "boingo"] else 0)
		e.set_script(e.get_script())
		_arena.add_child(e)
		e.set_physics_process(false)
		e.visual.scale = Vector2(-1, 1)
		e.visual.queue_redraw()
	var k: Enemy = load("res://enemies/king_grumblo.tscn").instantiate()
	k.position = Vector2(450, 0)
	_arena.add_child(k)
	k.set_physics_process(false)
	k.visual.scale = Vector2(-1, 1)
	_cam.zoom = Vector2.ONE * 1.25
	_cam.global_position = Vector2(-280, -90)
	await frames(4)
	_capturing = true
	await frames(6)


func scn_env() -> void:
	var w := Water.new()
	w.position = Vector2(-900, -260)
	w.size = Vector2(500, 260)
	_arena.add_child(w)
	var vine := Climbable.new()
	vine.position = Vector2(-300, -560)
	vine.size = Vector2(40, 520)
	_arena.add_child(vine)
	var net := Climbable.new()
	net.position = Vector2(-200, -560)
	net.size = Vector2(180, 250)
	_arena.add_child(net)
	var c := BarrelCannon.new()
	c.position = Vector2(80, -250)
	c.rotation_degrees = 50.0
	c.sweep_degrees = 20.0
	_arena.add_child(c)
	var belt := block(Vector2(150, -120), Vector2(260, 40))
	belt.conveyor_speed = 150.0
	var ice := block(Vector2(-380, -40), Vector2(0, 0))
	ice.queue_free()
	var bump := Bumper.new()
	bump.position = Vector2(480, -420)
	_arena.add_child(bump)
	var sb := SpikeBall.new()
	sb.position = Vector2(300, -500)
	sb.count = 2
	sb.radius = 110.0
	_arena.add_child(sb)
	var cr := Crusher.new()
	cr.position = Vector2(470, -600)
	cr.auto_period = 1.5
	_arena.add_child(cr)
	var wall := BreakableBlock.new()
	wall.position = Vector2(-460, -128)
	_arena.add_child(wall)
	var wheel := PlatformWheel.new()
	wheel.position = Vector2(-620, -620)
	wheel.radius = 150.0
	_arena.add_child(wheel)
	var lava := RisingHazard.new()
	lava.position = Vector2(600, -10)
	lava.width = 400.0
	_arena.add_child(lava)
	var wz := WindZone.new()
	wz.position = Vector2(-900, -900)
	wz.size = Vector2(1400, 200)
	_arena.add_child(wz)
	var p := add_player(0, Vector2(-800, -500), 1)
	await frames(10)
	_cam.zoom = Vector2.ONE * 0.8
	_cam.global_position = Vector2(-150, -380)
	_capturing = true
	await seconds(1.0)
	press(0, "move_right")
	await seconds(0.5)
	release(0, "move_right")
	press(0, "move_up")
	await seconds(0.8)
	press(0, "jump")
	await frames(4)
	release(0, "jump")
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_up")
	await seconds(0.8)
	release(0, "move_right")
	await seconds(1.0)


## Use with --level=res://levels/demo_level.tscn
func scn_results() -> void:
	var p := add_player(0, Vector2(150, 580), 0)
	add_player(1, Vector2(250, 580), 3)
	await frames(30)
	for c in _arena.find_children("*", "Camera2D", true, false):
		c.set_physics_process(true)
		c.make_current()
	_capturing = true
	for i in 7:
		EventBus.lum_collected.emit(i % 2, p.global_position)
	EventBus.gem_collected.emit(0, 0, p.global_position)
	await seconds(1.0)
	GameManager.complete_level()
	await seconds(2.5)
