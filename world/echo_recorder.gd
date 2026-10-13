class_name EchoRecorder
extends Node2D
## World 7's mechanic: while a dreamer is "recording" (stepped on a RecordPad) this child of
## the Player samples their moves every physics frame. When the recording ends (stepping on
## any RecordPad again, or the time runs out) it becomes an EchoGhost that replays the route
## on a loop - holding plates, punching levers - while the dreamer does something else.
## Runs identically on every browser: friends' puppets are recorded from their streamed spot.

const STRIDE := 8   ## x, y, vx, vy, facing, flags, state index, gdir
const FLAG_FLOOR := 1
const FLAG_PUNCH := 2
const MIN_TIME := 0.6   ## s before stepping on a pad again counts as "stop"

var max_time := 8.0
var t := 0.0
var samples := PackedFloat32Array()
var states: Array[StringName] = []
var player: Player
var start_pad: Node2D
var loop := false


func _ready() -> void:
	name = "EchoRecorder"
	player = get_parent() as Player
	z_index = 40
	EventBus.level_reset.connect(_cancel)
	Audio.play("echo_rec", -6.0)
	_sample()


func _cancel() -> void:
	queue_free()


func _physics_process(delta: float) -> void:
	if player == null or not is_instance_valid(player):
		queue_free()
		return
	t += delta
	_sample()
	if t >= max_time:
		finish()
	elif View.sees(player.global_position):
		queue_redraw()


func _sample() -> void:
	var sn := player.state_machine.current_name() if not player.remote else player.state_machine.puppet_name
	var si := states.find(sn)
	if si < 0:
		states.append(sn)
		si = states.size() - 1
	var flags := 0
	if player.is_on_floor():
		flags |= FLAG_FLOOR
	if player.rig.punching:
		flags |= FLAG_PUNCH
	samples.append_array(PackedFloat32Array([player.global_position.x, player.global_position.y,
			player.velocity.x, player.velocity.y, float(player.facing), float(flags), float(si), float(player.gdir)]))


func frame_count() -> int:
	return samples.size() / STRIDE


## Stop recording and release the echo. Replaces this dreamer's previous echo.
func finish() -> void:
	if player == null or not is_instance_valid(player) or frame_count() < 20:
		queue_free()
		return
	var host := player.get_parent()
	for g in get_tree().get_nodes_in_group(&"echoes"):
		if (g as EchoGhost).slot == player.slot:
			g.queue_free()
	var ghost := EchoGhost.new()
	ghost.slot = player.slot
	ghost.character = player.character
	ghost.samples = samples
	ghost.loop = loop
	ghost.states = states
	host.add_child(ghost)
	Audio.play("echo_release", -4.0)
	EventBus.echo_created.emit(player.slot)
	queue_free()


func _draw() -> void:
	# A shrinking ring over the dreamer's head: how much recording time is left.
	var f := clampf(1.0 - t / max_time, 0.0, 1.0)
	var c := Color("ff6b6b").lerp(Color("7be0ff"), f)
	var y := -110.0 * player.gdir
	draw_arc(Vector2(0, y), 14.0, -PI * 0.5, -PI * 0.5 + TAU * f, 24, c, 5.0)
	draw_circle(Vector2(0, y), 5.0, c if fmod(t, 0.6) < 0.35 else c.darkened(0.4))
