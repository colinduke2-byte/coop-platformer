class_name EchoGhost
extends Node2D
## A replay of a dreamer's recorded route: it walks it once and then stands where the route ended
## (or, with `loop`, repeats it). Weighs on pressure plates (they count
## the "echoes" group) and punches whatever punchable thing is in front of its fist at the
## moments the original punched. It never simulates physics - it only follows the samples -
## so it can't desync or get stuck. Cleared on checkpoint respawn.

const HOLD := 0.9      ## s standing at the end of the route before it loops
const FADE := 0.35
const PUNCH_REACH := 62.0

var slot := 0
var loop := false      ## true: replay the route again and again; false: stand where the route ended
var character: CharacterDef
var samples := PackedFloat32Array()
var states: Array[StringName] = []
var rig: CharacterRig
var _i := 0
var _hold := 0.0
var _was_punching := false
var _t := 0.0
var _trail := PackedVector2Array()


func _ready() -> void:
	add_to_group(&"echoes")
	name = "Echo%d" % slot
	z_index = 5
	rig = CharacterRig.new()
	rig.name = "Rig"
	add_child(rig)
	rig.build(character)
	rig.modulate = Color(0.55, 0.95, 1.0, 0.62)
	EventBus.level_reset.connect(queue_free)
	_goto(0)


func frames() -> int:
	return samples.size() / EchoRecorder.STRIDE


func _goto(i: int) -> void:
	_i = clampi(i, 0, frames() - 1)
	var o := _i * EchoRecorder.STRIDE
	global_position = Vector2(samples[o], samples[o + 1])
	_trail.clear()


## Feet position the plates compare against (same as a Player's origin).
func feet() -> Vector2:
	return global_position


func _physics_process(delta: float) -> void:
	_t += delta
	var n := frames()
	if n < 2:
		return
	if _i >= n - 1 and not loop:
		_pose(n - 1, delta)   # the route is done: stay put (holding a plate, say) until replaced or reset
		return
	if _i >= n - 1:
		_hold += delta
		rig.modulate.a = 0.62 * clampf(1.0 - (_hold - (HOLD - FADE)) / FADE, 0.0, 1.0)
		_pose(n - 1, delta)
		if _hold >= HOLD:
			_hold = 0.0
			rig.modulate.a = 0.62
			_goto(0)
			if View.sees(global_position):
				Audio.play("echo_hold", -14.0)
		return
	_i += 1
	var o := _i * EchoRecorder.STRIDE
	global_position = Vector2(samples[o], samples[o + 1])
	_pose(_i, delta)
	var flags := int(samples[o + 5])
	var punching := flags & EchoRecorder.FLAG_PUNCH != 0
	if punching and not _was_punching:
		_punch(int(samples[o + 4]))
	_was_punching = punching
	if View.sees(global_position):
		_trail.append(global_position + Vector2(0, -30))
		if _trail.size() > 14:
			_trail.remove_at(0)
		queue_redraw()


func _pose(i: int, delta: float) -> void:
	var o := i * EchoRecorder.STRIDE
	var face := int(samples[o + 4])
	var g := int(samples[o + 7])
	var flags := int(samples[o + 5])
	rig.scale = Vector2(float(face), float(g))
	rig.punching = flags & EchoRecorder.FLAG_PUNCH != 0
	var st := states[int(samples[o + 6])] if int(samples[o + 6]) < states.size() else &"Idle"
	rig.update_pose(st, Vector2(samples[o + 2], samples[o + 3]), flags & EchoRecorder.FLAG_FLOOR != 0, 420.0, delta)


func _punch(face: int) -> void:
	var owner_player: Player = GameManager.players.get(slot) as Player
	if owner_player == null or not is_instance_valid(owner_player):
		return
	var q := PhysicsShapeQueryParameters2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 34.0
	q.shape = shape
	q.transform = Transform2D(0.0, global_position + Vector2(PUNCH_REACH * face, -32))
	q.collision_mask = 4
	q.collide_with_areas = true
	q.collide_with_bodies = true
	for hit in get_world_2d().direct_space_state.intersect_shape(q, 8):
		var c: Object = hit["collider"]
		if c != null and c.has_method(&"take_hit") and not (c is Player):
			c.take_hit(owner_player, Vector2(face * 380.0, -80.0))
	Audio.play("punch_swing", -12.0, 1.4)


func _draw() -> void:
	if _trail.size() > 1:
		for k in _trail.size() - 1:
			var a := float(k) / _trail.size() * 0.4
			draw_line(to_local(_trail[k]), to_local(_trail[k + 1]), Color(0.6, 0.95, 1.0, a), 6.0 * a + 1.0)
