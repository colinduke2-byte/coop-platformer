extends Node
## Headless feel/regression tests. Run (from the project folder):
##   godot --headless --path . res://tests/test_runner.tscn
## Exit code 0 = all passed. Add a test: write `func test_<name>() -> void`
## (it may await) and use check(). Each test gets a fresh arena.

const ARENA := "res://tests/test_arena.tscn"

var _failures: Array[String] = []
var _current := ""
var _arena: Node
var _errors := ErrorCatcher.new()


## Collects engine/script errors so a test that crashes mid-way (SCRIPT ERROR
## aborts the coroutine and call() just returns) is reported as FAIL, not PASS.
class ErrorCatcher extends Logger:
	var _mutex := Mutex.new()
	var _messages: Array[String] = []

	func _log_error(function: String, file: String, line: int, code: String, rationale: String,
			_editor_notify: bool, error_type: int, _backtraces: Array[ScriptBacktrace]) -> void:
		if error_type == ERROR_TYPE_WARNING:
			return
		_mutex.lock()
		_messages.append("%s (%s:%d %s)" % [rationale if rationale != "" else code, file.get_file(), line, function])
		_mutex.unlock()

	func take() -> Array[String]:
		_mutex.lock()
		var m := _messages.duplicate()
		_messages.clear()
		_mutex.unlock()
		return m


func _ready() -> void:
	OS.add_logger(_errors)
	Vfx.hit_stop_enabled = false  # keep test timing deterministic
	_run.call_deferred()


func _run() -> void:
	var names: Array[String] = []
	for m in get_method_list():
		if String(m.name).begins_with("test_"):
			names.append(m.name)
	names.sort()
	for n in names:
		_current = n
		await _setup_arena()
		_errors.take()
		await call(n)
		for e in _errors.take():
			_failures.append("%s: engine/script error: %s" % [n, e])
		_teardown_arena()
		print(("PASS  " if not _failures.any(func(f: String) -> bool: return f.begins_with(n)) else "FAIL  ") + n)
	print("\n%d tests, %d failures" % [names.size(), _failures.size()])
	for f in _failures:
		print("  - " + f)
	OS.remove_logger(_errors)
	get_tree().quit(1 if _failures.size() > 0 else 0)


# --- helpers ------------------------------------------------------------------

func check(cond: bool, msg: String) -> void:
	if not cond:
		_failures.append("%s: %s" % [_current, msg])


func gm() -> Node:
	return GameManager


func router() -> Node:
	return InputRouter


func frames(n: int) -> void:
	for i in n:
		await get_tree().physics_frame


func seconds(s: float) -> void:
	await frames(int(ceil(s * Engine.physics_ticks_per_second)))


func press(slot: int, action: String) -> void:
	Input.action_press("p%d_%s" % [slot, action])


func release(slot: int, action: String) -> void:
	Input.action_release("p%d_%s" % [slot, action])


func add_player(slot: int, pos: Vector2) -> Player:
	assert(slot < 2, "tests bind keyboard layouts; use slot 0 or 1")
	router().bind_slot(slot, 0 if slot == 0 else 1)
	var p: Player = gm().spawn_player(slot, pos)
	p.global_position = pos  # (already spawned players are just moved)
	return p


func settle(p: Player) -> void:
	for i in 240:
		await get_tree().physics_frame
		if p.is_on_floor() and p.state_machine.current_name() == &"Ground":
			return


func _setup_arena() -> void:
	await frames(1)  # let the previous arena finish freeing
	gm().chosen_characters.clear()
	for s in router().get_bound_slots():
		router().unbind_slot(s)
	_arena = load(ARENA).instantiate()
	get_tree().root.add_child(_arena)
	await frames(2)


func _teardown_arena() -> void:
	for s in router().get_bound_slots():
		for a in router().ACTIONS:
			Input.action_release(router().action_name(s, a))
	_arena.queue_free()
	_arena = null


# --- tests --------------------------------------------------------------------

func test_full_jump_reaches_tuned_height() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var start_y := p.global_position.y
	var peak := start_y
	press(0, "jump")
	for i in 180:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	release(0, "jump")
	var height := start_y - peak
	var target := p.tuning.jump_height
	check(height > target * 0.9 and height < target * 1.25,
			"jump height %.0f px, expected about %.0f" % [height, target])


func test_tap_jump_is_lower_than_full_jump() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var start_y := p.global_position.y
	var peak := start_y
	press(0, "jump")
	await frames(2)
	release(0, "jump")
	for i in 120:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	var height := start_y - peak
	check(height < p.tuning.jump_height * 0.6, "tap jump too high: %.0f px" % height)
	check(height > 10.0, "tap jump barely left the ground: %.0f px" % height)


const GM := PlayerTuning.GlideMode


func add_player_mode(slot: int, pos: Vector2, mode: PlayerTuning.GlideMode) -> Player:
	var p := add_player(slot, pos)
	p.tuning = p.tuning.duplicate() as PlayerTuning  # don't leak the mode into the shared resource
	p.tuning.glide_mode = mode
	return p


func _is_gliding(p: Player) -> bool:
	return p.state_machine.current_name() == &"Glide"


func _check_glide_speed(p: Player, label: String) -> void:
	check(_is_gliding(p), "%s: expected Glide, got %s" % [label, p.state_machine.current_name()])
	check(p.velocity.y <= p.tuning.glide_fall_speed + 1.0,
			"%s: glide fall speed %.0f > %.0f" % [label, p.velocity.y, p.tuning.glide_fall_speed])


func test_glide_hold_through() -> void:
	var p := add_player_mode(0, Vector2(0, -2), GM.HOLD_THROUGH)
	await settle(p)
	press(0, "jump")
	await seconds(1.0)
	_check_glide_speed(p, "HOLD_THROUGH")
	release(0, "jump")
	await frames(2)
	check(not _is_gliding(p), "HOLD_THROUGH: releasing jump should end the glide")


func test_glide_second_press() -> void:
	var p := add_player_mode(0, Vector2(0, -2000), GM.SECOND_PRESS)
	await seconds(0.4)  # falling fast now
	press(0, "jump")
	await seconds(0.5)
	_check_glide_speed(p, "SECOND_PRESS")
	release(0, "jump")
	await frames(2)
	check(not _is_gliding(p), "SECOND_PRESS: releasing jump should end the glide")


func test_glide_separate_button() -> void:
	var p := add_player_mode(0, Vector2(0, -2000), GM.SEPARATE_BUTTON)
	await seconds(0.4)
	press(0, "jump")
	await seconds(0.3)
	check(not _is_gliding(p), "SEPARATE_BUTTON: jump must not glide")
	release(0, "jump")
	press(0, "glide")
	await seconds(0.3)
	_check_glide_speed(p, "SEPARATE_BUTTON")
	release(0, "glide")
	await frames(2)
	check(not _is_gliding(p), "SEPARATE_BUTTON: releasing glide should end the glide")


func test_hold_through_tap_jump_never_glides() -> void:
	var p := add_player_mode(0, Vector2(0, -2), GM.HOLD_THROUGH)
	await settle(p)
	press(0, "jump")
	await frames(2)
	release(0, "jump")
	var glided := false
	for i in 120:
		await get_tree().physics_frame
		glided = glided or _is_gliding(p)
	check(not glided, "HOLD_THROUGH: a tap jump must never glide")
	# Also: holding jump AFTER a tap (re-press held) without a fresh launch must not glide.
	check(p.is_on_floor(), "tap jump should have landed by now")


func test_hold_through_held_jump_glides_after_apex() -> void:
	var p := add_player_mode(0, Vector2(0, -2), GM.HOLD_THROUGH)
	await settle(p)
	press(0, "jump")
	var glided_early := false
	var reached_apex := false
	for i in 120:
		await get_tree().physics_frame
		if p.velocity.y >= 0.0:
			reached_apex = true
		if not reached_apex and _is_gliding(p):
			glided_early = true
	check(not glided_early, "HOLD_THROUGH: must not glide before the apex")
	check(reached_apex, "jump never reached its apex")
	await seconds(p.tuning.glide_hold_delay + 0.1)
	check(_is_gliding(p), "HOLD_THROUGH: held jump should glide after the apex")


func test_hold_through_landing_while_holding_does_not_rearm_glide() -> void:
	var p := add_player_mode(0, Vector2(0, -2), GM.HOLD_THROUGH)
	await settle(p)
	press(0, "jump")
	await seconds(3.5)  # jump, glide, land, all while still holding
	check(p.is_on_floor(), "should have landed while still holding jump")
	p.state_machine.transition_to(&"Fall")  # as if walking off a ledge with jump still held
	p.global_position.y -= 100.0
	p.velocity = Vector2.ZERO
	p.coyote_timer = 0.0
	await seconds(0.3)
	check(not _is_gliding(p), "HOLD_THROUGH: holding jump since before a ledge must not glide")

func _check_wall_jump(mode: PlayerTuning.GlideMode) -> void:
	var p := add_player_mode(0, Vector2(560, -700), mode)
	press(0, "move_right")
	await seconds(0.4)
	check(p.state_machine.current_name() == &"WallSlide",
			"mode %d: expected WallSlide, got %s" % [mode, p.state_machine.current_name()])
	check(p.velocity.y <= p.tuning.wall_slide_speed + 1.0, "sliding too fast: %.0f" % p.velocity.y)
	press(0, "jump")
	await frames(3)
	check(p.velocity.x < 0.0 and p.velocity.y < 0.0, "mode %d: wall jump should launch up and away" % mode)


## Coyote jump (just left the ledge) and stomp bounce must work in every mode.
func _check_coyote_and_bounce(mode: PlayerTuning.GlideMode) -> void:
	var p := add_player_mode(0, Vector2(0, -2), mode)
	await settle(p)
	p.global_position.y -= 40.0
	p.velocity = Vector2.ZERO
	p.coyote_timer = p.tuning.coyote_time
	p.state_machine.transition_to(&"Fall")
	press(0, "jump")
	await frames(3)
	check(p.velocity.y < 0.0 and p.state_machine.current_name() == &"Jump",
			"mode %d: coyote jump failed (%s, vy %.0f)" % [mode, p.state_machine.current_name(), p.velocity.y])
	release(0, "jump")
	await seconds(0.3)
	p.bounce()
	await frames(2)
	check(p.velocity.y < 0.0 and p.state_machine.current_name() == &"Jump",
			"mode %d: stomp bounce failed" % mode)


func test_wall_jump_hold_through() -> void:
	await _check_wall_jump(GM.HOLD_THROUGH)


func test_wall_jump_second_press() -> void:
	await _check_wall_jump(GM.SECOND_PRESS)


func test_wall_jump_separate_button() -> void:
	await _check_wall_jump(GM.SEPARATE_BUTTON)


func test_coyote_and_bounce_hold_through() -> void:
	await _check_coyote_and_bounce(GM.HOLD_THROUGH)


func test_coyote_and_bounce_second_press() -> void:
	await _check_coyote_and_bounce(GM.SECOND_PRESS)


func test_coyote_and_bounce_separate_button() -> void:
	await _check_coyote_and_bounce(GM.SEPARATE_BUTTON)

func test_bubbled_player_revived_by_touch() -> void:
	var a := add_player(0, Vector2(0, -2))
	var b := add_player(1, Vector2(300, -2))
	await settle(a)
	await settle(b)
	b.hurt()
	await frames(2)
	check(b.is_bubbled(), "hurt() should bubble the player")
	b.global_position = a.global_position + Vector2(0, -30)
	await frames(6)
	check(not b.is_bubbled(), "touching a teammate should pop the bubble")


func test_everyone_bubbled_respawns_at_checkpoint() -> void:
	var a := add_player(0, Vector2(-200, -2))
	await settle(a)
	gm().checkpoint = Vector2(100, -2)
	a.hurt()
	await seconds(gm().RESPAWN_DELAY + 0.2)
	check(not a.is_bubbled(), "player should respawn when nobody is left alive")
	check(a.global_position.distance_to(Vector2(100, -2)) < 80.0,
			"respawned at %s, expected checkpoint" % a.global_position)


func test_each_slot_gets_a_distinct_character() -> void:
	var a := add_player(0, Vector2(0, -2))
	var b := add_player(1, Vector2(200, -2))
	await frames(2)
	check(a.character != b.character, "P1 and P2 should be different characters")
	check(a.rig.get_child_count() > 5 and b.rig.get_child_count() > 5, "rigs should be built")


func test_all_characters_build_and_animate() -> void:
	for def: CharacterDef in gm().CHARACTERS:
		var rig := CharacterRig.new()
		_arena.add_child(rig)
		rig.build(def)
		for s: StringName in [&"Ground", &"Jump", &"Fall", &"Glide", &"WallSlide", &"Punch", &"Bubble"]:
			rig.gliding = s == &"Glide"
			rig.punching = s == &"Punch"
			rig.update_pose(s, Vector2(300, 200), s == &"Ground", 430.0, 1.0 / 60.0)
		check(rig.top_y < -60.0, "%s: top_y %.0f looks wrong" % [def.display_name, rig.top_y])
		check(def.display_name != "Dreamer", "character missing a name")
		rig.queue_free()

func test_chosen_character_is_used_on_spawn() -> void:
	var gribble: CharacterDef = gm().CHARACTERS[3]
	gm().chosen_characters[0] = gribble
	var p := add_player(0, Vector2(0, -2))
	await frames(2)
	check(p.character == gribble, "spawned as %s, expected Gribble" % p.character.display_name)


func test_wardrobe_pedestal_swaps_character() -> void:
	var tootle: CharacterDef = gm().CHARACTERS[2]
	var pedestal := WardrobePedestal.new()
	pedestal.character = tootle
	pedestal.position = Vector2(200, 0)
	_arena.add_child(pedestal)
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	check(p.character != tootle, "should not start as Tootle")
	press(0, "move_up")
	await frames(3)
	release(0, "move_up")
	check(p.character == tootle, "pressing UP on the pedestal should swap to Tootle")
	check(p.rig.def == tootle, "rig should be rebuilt for the new character")


func test_character_select_pick_ready_and_lock() -> void:
	var sel: CharacterSelect = load("res://ui/character_select.tscn").instantiate()
	sel.auto_start = false
	_arena.add_child(sel)
	router().bind_slot(0, 0)
	router().bind_slot(1, 1)
	router().join_requested.emit(0)
	router().join_requested.emit(1)
	await seconds(sel.JOIN_GRACE + 0.05)
	var start := sel.card_index(0)
	press(0, "move_right")
	await frames(2)
	release(0, "move_right")
	await frames(2)
	check(sel.card_index(0) != start, "left/right should change the pick")
	press(0, "jump")
	await frames(2)
	release(0, "jump")
	check(sel.is_card_ready(0), "jump should lock in the pick")
	check(not sel.is_everyone_ready(), "P2 isn't ready yet")
	# P2 must skip over P1's locked character while browsing.
	var locked := sel.card_index(0)
	for i in gm().CHARACTERS.size():
		press(1, "move_right")
		await frames(2)
		release(1, "move_right")
		await frames(2)
		check(sel.card_index(1) != locked, "P2 landed on P1's locked character")
	press(1, "jump")
	await frames(2)
	release(1, "jump")
	check(sel.is_everyone_ready(), "both players ready")
	sel.queue_free()


func test_demo_level_loads_and_spawns_players() -> void:
	router().bind_slot(0, 0)
	gm().chosen_characters[0] = gm().CHARACTERS[1]
	var demo: Level = load("res://levels/demo_level.tscn").instantiate()
	_arena.add_child(demo)
	await frames(5)
	var p: Player = gm().players.get(0)
	check(p != null and is_instance_valid(p), "demo level should spawn joined players")
	if p:
		check(p.character == gm().CHARACTERS[1], "demo should use the chosen character")
		check(p.get_parent() == demo.players_root, "player should be in the demo level")
	demo.queue_free()
	await frames(1)

## Two walls 160 px apart (like the demo shaft). After the first grab, just tap
## jump: auto-grab should carry you wall to wall and you must gain real height.
func test_wall_jump_shaft_climb_by_tapping() -> void:
	var wall: Node2D = load("res://world/block.tscn").instantiate()
	wall.position = Vector2(380, -1400)
	wall.size = Vector2(60, 1300)
	_arena.add_child(wall)
	var p := add_player(0, Vector2(520, -300))
	press(0, "move_right")
	for i in 60:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"WallSlide":
			break
	release(0, "move_right")
	check(p.state_machine.current_name() == &"WallSlide", "never grabbed the first wall")
	var start_y := p.global_position.y
	var best_y := start_y
	var sides := {}
	for jump in 5:
		for i in 60:
			await get_tree().physics_frame
			if p.state_machine.current_name() == &"WallSlide":
				break
		sides[p.touching_wall_dir()] = true
		press(0, "jump")
		await frames(4)
		release(0, "jump")  # a tap: wall jumps must not be cut short
		for i in 30:
			await get_tree().physics_frame
			best_y = minf(best_y, p.global_position.y)
	check(sides.size() == 2, "should have bounced between both walls")
	check(start_y - best_y > 400.0, "only climbed %.0f px in 5 tapped wall jumps" % (start_y - best_y))

func test_hold_through_reglide_after_letting_go() -> void:
	var p := add_player_mode(0, Vector2(0, -2), GM.HOLD_THROUGH)
	await settle(p)
	p.global_position.y -= 600.0  # plenty of air to work with
	press(0, "jump")
	await seconds(0.9)
	check(_is_gliding(p), "should glide by holding through the apex")
	release(0, "jump")
	await seconds(0.2)
	check(not _is_gliding(p), "letting go should end the glide")
	press(0, "jump")
	await seconds(p.tuning.glide_hold_delay + p.tuning.jump_buffer_time + 0.1)
	check(_is_gliding(p), "pressing jump again in the air should restart the glide")


func _add_crate(x: float, iron: bool) -> Crate:
	var crate := Crate.new()
	crate.reinforced = iron
	crate.position = Vector2(x, 0)
	_arena.add_child(crate)
	return crate


func test_tap_punch_reaches_and_breaks_wood_crate() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var crate := _add_crate(p.global_position.x + 90.0, false)  # beyond the old 46 px reach
	await frames(2)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	await seconds(0.3)
	check(crate.collision_layer == 0, "a tap punch should reach and smash a wooden crate 90 px away")


func test_iron_crate_needs_charged_punch() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var crate := _add_crate(p.global_position.x + 90.0, true)
	await frames(2)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	await seconds(0.4)
	check(crate.collision_layer != 0, "a tap punch must not break an iron crate")
	press(0, "attack")
	await seconds(p.tuning.punch_charge_time + 0.2)
	check(p.state_machine.current_name() == &"Punch", "holding attack should keep charging")
	release(0, "attack")
	await seconds(0.3)
	check(crate.collision_layer == 0, "a fully charged punch should smash the iron crate")


func test_updraft_lifts_a_glider() -> void:
	var draft := Updraft.new()
	draft.position = Vector2(-100, -1200)
	draft.size = Vector2(200, 1000)
	_arena.add_child(draft)
	var p := add_player_mode(0, Vector2(0, -400), GM.SEPARATE_BUTTON)
	press(0, "glide")
	await seconds(0.8)
	check(_is_gliding(p), "should be gliding")
	check(p.velocity.y < 0.0, "updraft should push a glider upward (vy %.0f)" % p.velocity.y)
	check(p.global_position.y < -400.0, "glider should have risen above its start")


# --- Movement overhaul ----------------------------------------------------------

func _add_block(pos: Vector2, size: Vector2, one_way := false) -> Block:
	var b: Block = load("res://world/block.tscn").instantiate()
	b.position = pos
	b.size = size
	b.one_way = one_way
	_arena.add_child(b)
	return b


func _state(p: Player) -> StringName:
	return p.state_machine.current_name()


func test_sprint_builds_after_running_flat_out() -> void:
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(0.5)
	check(p.velocity.x <= p.tuning.max_run_speed + 1.0, "no sprint yet after 0.5 s (vx %.0f)" % p.velocity.x)
	await seconds(p.tuning.sprint_build_time + p.tuning.sprint_ramp_time + 0.3)
	check(p.velocity.x > p.tuning.max_run_speed * 1.2, "should be sprinting by now (vx %.0f)" % p.velocity.x)
	release(0, "move_right")
	await seconds(0.4)
	check(p.sprint == 0.0 and absf(p.velocity.x) < 1.0, "letting go should stop and end the sprint")


func test_corner_correction_slides_past_ceiling_edge() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	_add_block(Vector2(p.global_position.x + 10.0, -260), Vector2(200, 40))  # clips our head by 8 px
	await frames(1)
	var x0 := p.global_position.x
	var peak := 0.0
	press(0, "jump")
	for i in 60:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	release(0, "jump")
	check(peak < -175.0, "head should slide round the ceiling corner (peak %.0f)" % peak)
	check(p.global_position.x < x0 - 6.0, "should have been nudged left off the corner")


func test_ledge_bump_pops_onto_platform() -> void:
	_add_block(Vector2(100, -120), Vector2(300, 120))
	var p := add_player(0, Vector2(78, -110))  # feet 10 px below the platform top, 4 px from its side
	await frames(1)
	p.velocity = Vector2(400, 0)
	press(0, "move_right")
	await seconds(0.4)
	release(0, "move_right")
	check(p.global_position.x > 110.0 and absf(p.global_position.y + 120.0) < 3.0,
			"should pop up onto the platform, at %s" % p.global_position)


func _ledge_setup() -> Player:
	_add_block(Vector2(100, -300), Vector2(300, 300))
	var p := add_player(0, Vector2(100 - 19, -300 + 60))
	await frames(1)
	p.velocity = Vector2.ZERO
	return p


func test_ledge_grab_hang_and_climb() -> void:
	var p: Player = await _ledge_setup()
	await seconds(0.2)
	check(_state(p) == &"LedgeHang", "should catch the ledge (got %s)" % _state(p))
	await seconds(0.5)
	check(_state(p) == &"LedgeHang", "should keep hanging with no input")
	press(0, "move_right")
	await seconds(0.5)
	release(0, "move_right")
	check(p.global_position.x > 110.0 and absf(p.global_position.y + 300.0) < 3.0,
			"holding toward the ledge should climb onto it, at %s" % p.global_position)


func test_ledge_hang_jump_and_drop() -> void:
	var p: Player = await _ledge_setup()
	await seconds(0.2)
	press(0, "jump")
	await frames(3)
	check(_state(p) == &"Jump" and p.velocity.y < 0.0, "jump from a hang should hop up")
	release(0, "jump")
	var q: Player = p
	await seconds(1.2)  # lands back on the floor
	q.global_position = Vector2(100 - 19, -300 + 60)
	q.velocity = Vector2.ZERO
	q.state_machine.transition_to(&"Fall")
	await seconds(0.2)
	check(_state(q) == &"LedgeHang", "should catch the ledge again")
	press(0, "move_down")
	await frames(3)
	release(0, "move_down")
	check(_state(q) == &"Fall", "DOWN should let go of the ledge")


func test_crouch_crawls_under_low_gap() -> void:
	_add_block(Vector2(100, -300), Vector2(300, 255))  # 45 px gap above the floor
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "move_down")
	press(0, "move_right")
	await seconds(1.2)
	check(_state(p) == &"Crouch", "should be crouching (got %s)" % _state(p))
	check(p.global_position.x > 110.0, "should crawl into the gap (x %.0f)" % p.global_position.x)
	release(0, "move_down")
	await frames(10)
	check(_state(p) == &"Crouch", "can't stand up under the low ceiling")
	await seconds(2.5)
	release(0, "move_right")
	check(p.global_position.x > 420.0, "should crawl all the way through (x %.0f)" % p.global_position.x)
	await frames(10)
	check(_state(p) == &"Ground", "should stand up once out of the gap")


func test_slide_then_long_jump() -> void:
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(0.6)
	press(0, "move_down")
	await frames(4)
	check(_state(p) == &"Slide", "fast + DOWN should belly slide (got %s)" % _state(p))
	check(p.velocity.x > p.tuning.max_run_speed, "a slide should start with a boost")
	check(p.crouched, "slide should use the low hitbox")
	release(0, "move_down")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(_state(p) == &"Jump" and p.velocity.x >= p.tuning.long_jump_speed - 30.0,
			"jumping out of a slide should long-jump (vx %.0f)" % p.velocity.x)
	release(0, "move_right")


func test_drop_through_one_way_ledge() -> void:
	_add_block(Vector2(-150, -200), Vector2(300, 20), true)
	var p := add_player(0, Vector2(0, -205))
	await settle(p)
	check(absf(p.global_position.y + 200.0) < 3.0, "should stand on the one-way ledge")
	press(0, "move_down")
	await frames(3)
	press(0, "jump")
	await seconds(0.3)
	release(0, "jump")
	release(0, "move_down")
	check(p.global_position.y > -170.0, "DOWN + JUMP should drop through (y %.0f)" % p.global_position.y)


func _ground_pound() -> void:
	press(0, "move_down")
	await frames(2)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	release(0, "move_down")


func test_ground_pound_smashes_crate_below() -> void:
	var crate := _add_crate(0.0, false)
	var p := add_player(0, Vector2(0, -400))
	await frames(10)
	await _ground_pound()
	check(_state(p) == &"GroundPound", "DOWN + ATTACK in the air should ground pound")
	await seconds(1.0)
	check(not is_instance_valid(crate) or crate.collision_layer == 0, "pound should smash the wooden crate")
	check(p.is_on_floor() and absf(p.global_position.y) < 3.0, "should end up on the floor")


func test_ground_pound_jump_is_higher() -> void:
	var p := add_player(0, Vector2(0, -300))
	await frames(10)
	await _ground_pound()
	for i in 120:
		await get_tree().physics_frame
		if p.rig.pound_phase == 2:
			break
	check(p.rig.pound_phase == 2, "should land the pound")
	var y0 := p.global_position.y
	var peak := y0
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	release(0, "jump")
	check(y0 - peak > p.tuning.jump_height * 1.15, "pound jump should beat a normal jump (%.0f px)" % (y0 - peak))


func test_ground_pound_defeats_grunt() -> void:
	var grunt: Node2D = load("res://enemies/grunt.tscn").instantiate()
	grunt.position = Vector2(0, 0)
	_arena.add_child(grunt)
	var p := add_player(0, Vector2(0, -350))
	await frames(10)
	await _ground_pound()
	await seconds(0.8)
	check(not is_instance_valid(grunt) or grunt.collision_layer == 0, "ground pound should defeat the grunt")
	check(not p.is_bubbled(), "pounding an enemy must not hurt you")


func test_uppercut_hits_crate_overhead() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var crate := _add_crate(p.global_position.x, false)
	crate.position.y = -100.0
	await frames(2)
	press(0, "move_up")
	await frames(2)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	release(0, "move_up")
	await seconds(0.3)
	check(crate.collision_layer == 0, "UP + punch should uppercut the crate overhead")


func test_air_uppercut_lifts_once() -> void:
	var p := add_player(0, Vector2(0, -600))
	await seconds(0.3)
	press(0, "move_up")
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	await frames(8)
	check(p.velocity.y < 0.0, "air uppercut should kick you upward (vy %.0f)" % p.velocity.y)
	await seconds(0.4)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	await frames(8)
	release(0, "move_up")
	check(p.velocity.y > 0.0, "second uppercut in the same airtime gives no lift (vy %.0f)" % p.velocity.y)


func test_head_bounce_on_teammate() -> void:
	var a := add_player(0, Vector2(0, -2))
	await settle(a)
	var b := add_player(1, Vector2(0, -300))
	var bounced := false
	for i in 120:
		await get_tree().physics_frame
		if b.velocity.y < 0.0:
			bounced = true
			break
	check(bounced, "falling onto a teammate's head should bounce you")
	check(not a.is_bubbled() and not b.is_bubbled(), "head bounces are harmless")


func test_juice_effects_spawn_and_clean_up() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	var layer := _arena.get_node_or_null(^"VfxLayer")
	check(layer != null and layer.get_child_count() > 0, "jumping should puff dust into the level")
	await seconds(1.5)
	check(layer == null or layer.get_child_count() == 0, "effects should free themselves")


# --- World toys -------------------------------------------------------------------

func test_bounce_pad_launches_and_hold_jump_goes_higher() -> void:
	var p := add_player(0, Vector2(0, -300))
	await frames(2)
	var pad := BouncePad.new()
	_arena.add_child(pad)
	var peaks: Array[float] = []
	for hold in [false, true]:
		p.global_position = Vector2(0, -300)
		p.velocity = Vector2.ZERO
		p.state_machine.transition_to(&"Fall")
		var peak := 0.0
		var bounced := false
		for i in 150:
			await get_tree().physics_frame
			if hold and not bounced and p.global_position.y > -140.0:
				press(0, "jump")  # hold jump as you land on the pad
			if p.velocity.y < -500.0:
				bounced = true
			if bounced:
				peak = minf(peak, p.global_position.y)
			if bounced and p.velocity.y > 0.0:
				break
		release(0, "jump")
		check(bounced, "pad should launch the player (hold=%s)" % hold)
		peaks.append(-peak)
	check(peaks[0] > pad.launch_height * 0.9, "plain bounce reached %.0f px" % peaks[0])
	check(peaks[1] > peaks[0] + 60.0, "holding jump should bounce higher (%.0f vs %.0f)" % [peaks[1], peaks[0]])


func test_swing_ring_grab_pump_and_release() -> void:
	var ring := SwingRing.new()
	ring.position = Vector2(0, -500)
	_arena.add_child(ring)
	var p := add_player(0, Vector2(-60, -500 + 60))
	await frames(1)
	p.velocity = Vector2(300, -200)
	p.state_machine.transition_to(&"Jump")
	for i in 30:
		await get_tree().physics_frame
		if _state(p) == &"Swing":
			break
	check(_state(p) == &"Swing", "flying into a ring should grab it (got %s)" % _state(p))
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	var d := (p.global_position + Player.GRIP_OFFSET).distance_to(ring.global_position)
	check(absf(d - p.tuning.swing_length) < 12.0, "hands should stay on the rope length (%.0f)" % d)
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(_state(p) in [&"Jump", &"Fall"] and p.velocity.y < 0.0, "jump should fling you off the ring upward")


func test_moving_platform_carries_rider() -> void:
	var plat := MovingPlatform.new()
	plat.position = Vector2(-100, -200)
	plat.size = Vector2(200, 32)
	plat.waypoints = PackedVector2Array([Vector2(500, 0)])
	plat.speed = 200.0
	plat.wait_time = 0.0
	_arena.add_child(plat)
	var p := add_player(0, Vector2(0, -205))
	await settle(p)
	var x0 := p.global_position.x
	await seconds(1.0)
	check(p.global_position.x - x0 > 150.0, "rider should be carried along (moved %.0f)" % (p.global_position.x - x0))
	check(p.is_on_floor(), "rider should still be standing on it")


func test_crumble_platform_breaks_and_returns() -> void:
	var c := CrumblePlatform.new()
	c.position = Vector2(-72, -200)
	c.respawn_time = 1.0
	_arena.add_child(c)
	var p := add_player(0, Vector2(0, -205))
	await settle(p)
	await seconds(c.crumble_delay + 0.3)
	check(c.collision_layer == 0, "should crumble after being stood on")
	await seconds(0.5)
	check(p.global_position.y > -150.0, "player should fall once it crumbles")
	await seconds(1.5)
	check(c.collision_layer == 1, "should come back after respawn_time")


func test_spikes_bubble_players() -> void:
	var s := Spikes.new()
	s.position = Vector2(-100, 0)
	s.length = 200.0
	_arena.add_child(s)
	var p := add_player(0, Vector2(0, -100))
	await seconds(0.5)
	check(p.is_bubbled(), "landing on spikes should bubble you")


func test_punch_switch_opens_gate() -> void:
	var gate := Gate.new()
	gate.name = "Gate"
	gate.position = Vector2(300, -192)
	_arena.add_child(gate)
	var sw := PunchSwitch.new()
	sw.position = Vector2(60, 0)
	_arena.add_child(sw)
	sw.targets = [sw.get_path_to(gate)]
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var y0 := gate.position.y
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	await seconds(0.8)
	check(sw.on, "punching the switch should flip it on")
	check(gate.is_open() and gate.position.y < y0 - 100.0, "gate should slide open")


func test_pressure_plate_needs_two_players() -> void:
	var gate := Gate.new()
	gate.position = Vector2(400, -192)
	gate.stay_open = false
	_arena.add_child(gate)
	var plate := PressurePlate.new()
	plate.position = Vector2(0, 0)
	plate.required = 2
	_arena.add_child(plate)
	plate.targets = [plate.get_path_to(gate)]
	var a := add_player(0, Vector2(-10, -2))
	await settle(a)
	await frames(5)
	check(not plate.on and not gate.is_open(), "one player shouldn't be enough")
	var b := add_player(1, Vector2(10, -2))
	await settle(b)
	await frames(5)
	check(plate.on and gate.is_open(), "two players on the plate should open the gate")
	b.global_position.x = 300.0
	await frames(5)
	check(not plate.on and not gate.is_open(), "stepping off should close it again (no latch)")


func test_lum_line_spawns_lums() -> void:
	var line := LumLine.new()
	line.count = 7
	line.end = Vector2(300, 0)
	line.arc_height = 80.0
	_arena.add_child(line)
	await frames(1)
	var lums := line.get_children().filter(func(c: Node) -> bool: return c is Lum)
	check(lums.size() == 7, "LumLine should spawn 7 lums, got %d" % lums.size())
	check((lums[3] as Node2D).position.y < -70.0, "middle lum should be raised by the arc")


# --- Enemies -------------------------------------------------------------------------

func _spawn_enemy(path: String, pos: Vector2, facing := -1) -> Enemy:
	var e: Enemy = load(path).instantiate()
	e.position = pos
	e.start_facing = facing
	_arena.add_child(e)
	return e


func _punch(slot := 0, hold := 2) -> void:
	press(slot, "attack")
	await frames(hold)
	release(slot, "attack")


func test_stomp_defeats_grumblet_and_bounces() -> void:
	var g := _spawn_enemy("res://enemies/grunt.tscn", Vector2(0, 0))
	g.walk_speed = 0.0
	g.sight = 0.0
	var p := add_player(0, Vector2(0, -200))
	var bounced := false
	for i in 90:
		await get_tree().physics_frame
		if p.velocity.y < -300.0:
			bounced = true
	check(bounced, "stomping should bounce you")
	check(not is_instance_valid(g) or g.dead, "stomp should defeat a Grumblet")
	check(not p.is_bubbled(), "stomping must not hurt")


func test_grumblet_touch_bubbles_player() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	_spawn_enemy("res://enemies/grunt.tscn", Vector2(120, 0), -1)
	await seconds(1.5)
	check(p.is_bubbled(), "walking into a Grumblet should bubble you")


func test_spikeroo_hurts_stompers_but_punch_works() -> void:
	var s := _spawn_enemy("res://enemies/spikeroo.tscn", Vector2(0, 0))
	s.walk_speed = 0.0
	var p := add_player(0, Vector2(0, -200))
	await seconds(0.6)
	check(p.is_bubbled(), "stomping a Spikeroo should hurt you")
	check(not s.dead, "and it survives")
	var q := add_player(1, Vector2(-90, -2))
	await settle(q)
	await _punch(1)
	await seconds(0.3)
	check(not is_instance_valid(s) or s.dead, "a punch should defeat it")


func test_shieldbug_blocks_front_but_charged_punch_breaks_shield() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var b := _spawn_enemy("res://enemies/shieldbug.tscn", Vector2(85, 0), -1) as Shieldbug
	b.walk_speed = 0.0
	await frames(3)
	await _punch()
	await seconds(0.3)
	check(b.has_shield and b.health == 2, "a tap punch should clank off the shield")
	p.global_position = Vector2(0, -2)
	b.global_position = Vector2(85, 0)
	b.facing = -1
	await frames(2)
	press(0, "attack")
	await seconds(p.tuning.punch_charge_time + 0.1)
	release(0, "attack")
	await seconds(0.3)
	check(not b.has_shield, "a charged punch should smash the shield")
	check(not b.dead, "breaking the shield doesn't defeat it yet")


func test_spitpod_shot_can_be_punched_back() -> void:
	var pod := _spawn_enemy("res://enemies/spitpod.tscn", Vector2(500, 0)) as Spitpod
	pod.fire_interval = 0.2
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	p.invulnerable_timer = 100.0  # we only care about the reflect here
	var shot: Projectile = null
	for i in 480:
		await get_tree().physics_frame
		shot = null
		for c in _arena.get_children():
			if c is Projectile and (shot == null or c.global_position.x < shot.global_position.x):
				shot = c
		if shot and shot.global_position.x < p.global_position.x + 110.0:
			break
	check(shot != null, "Spitpod should spit at a player in range")
	if shot:
		pod.fire_interval = 100.0
		await _punch()
		await frames(10)
		check(is_instance_valid(shot) and shot.friendly, "punching the seed should reflect it")
		await seconds(1.5)
		check(not is_instance_valid(pod) or pod.dead, "the reflected seed should knock out the Spitpod")


func test_bonkhorn_charges_into_wall_and_gets_dizzy() -> void:
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var b := _spawn_enemy("res://enemies/bonkhorn.tscn", Vector2(400, 0), -1) as Bonkhorn
	await frames(3)
	p.global_position = Vector2(560, -2)  # get behind it so it charges into the wall
	b.facing = 1
	var dizzy := false
	for i in 360:
		await get_tree().physics_frame
		if b.is_stunned():
			dizzy = true
			break
	check(dizzy, "charging into the wall should make it dizzy")


func test_bonkhorn_armour_blocks_front_punch() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var b := _spawn_enemy("res://enemies/bonkhorn.tscn", Vector2(90, 0), -1) as Bonkhorn
	b.sight = 0.0
	b.walk_speed = 0.0
	await frames(3)
	await _punch()
	await seconds(0.3)
	check(b.health == 2, "front punches should bounce off an awake Bonkhorn")


func test_uppercut_downs_flapjack() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var f := _spawn_enemy("res://enemies/flapjack.tscn", Vector2(p.global_position.x + 10.0, -110)) as Flapjack
	f.mode = Flapjack.Mode.HOVER
	f.bob_height = 0.0
	await frames(10)
	press(0, "move_up")
	await _punch()
	release(0, "move_up")
	await seconds(0.3)
	check(not is_instance_valid(f) or f.dead, "an uppercut should knock the Flapjack out of the sky")


func test_boingo_stomp_gives_big_bounce_and_respawns() -> void:
	var b := _spawn_enemy("res://enemies/boingo.tscn", Vector2(0, -150)) as Boingo
	b.bob_height = 0.0
	b.respawn_time = 0.5
	var p := add_player(0, Vector2(0, -400))
	var best := 0.0
	for i in 120:
		await get_tree().physics_frame
		best = minf(best, p.velocity.y)
	check(best < p.tuning.jump_velocity() * 1.2, "Boingo bounce should beat a normal jump (vy %.0f)" % best)
	check(not p.is_bubbled(), "bouncing on Boingo's head is safe")
	check(b.visible, "it should have puffed back up")


func test_spawner_and_defeat_trigger_open_arena_gate() -> void:
	var gate := Gate.new()
	gate.position = Vector2(300, -192)
	_arena.add_child(gate)
	var lock := DefeatTrigger.new()
	_arena.add_child(lock)
	var sp := EnemySpawner.new()
	sp.total = 2
	sp.max_alive = 2
	sp.interval = 0.1
	sp.active = true
	sp.position = Vector2(-300, 0)
	lock.add_child(sp)
	lock.targets = [lock.get_path_to(gate)]
	await seconds(0.8)
	var spawned := get_tree().get_nodes_in_group(&"enemies").filter(func(e: Node) -> bool: return e is Grunt)
	check(spawned.size() == 2, "spawner should make 2 enemies, made %d" % spawned.size())
	check(not gate.is_open(), "gate stays shut while enemies live")
	for e: Enemy in spawned:
		e.damage(null, Enemy.HitKind.HAZARD, Vector2.ZERO)
	await seconds(0.8)
	check(gate.is_open(), "beating every enemy should open the gate")


func test_king_grumblo_slam_daze_and_stomp() -> void:
	var k := _spawn_enemy("res://enemies/king_grumblo.tscn", Vector2(0, 0)) as KingGrumblo
	var p := add_player(0, Vector2(-400, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var waves := false
	for i in 600:
		await get_tree().physics_frame
		for c in _arena.get_children():
			if c is Shockwave:
				waves = true
		if k.is_stunned():
			break
	check(waves, "the slam should send shockwaves")
	check(k.is_stunned(), "he should be dazed after slamming")
	var h := k.health
	p.global_position = k.global_position + Vector2(0, -180)
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	await seconds(0.5)
	check(k.health == h - 1, "stomping him while dazed should hurt him")


# --- Environments & obstacles -------------------------------------------------------

func test_water_swim_and_leap_out() -> void:
	var w := Water.new()
	w.position = Vector2(-400, -400)
	w.size = Vector2(800, 400)
	_arena.add_child(w)
	var p := add_player(0, Vector2(0, -500))
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	check(_state(p) == &"Swim", "falling into water should start swimming (got %s)" % _state(p))
	await seconds(0.5)
	check(p.velocity.y < 400.0, "should sink slowly, not fall (vy %.0f)" % p.velocity.y)
	press(0, "move_up")
	await seconds(1.2)
	release(0, "move_up")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(_state(p) == &"Jump" and p.velocity.y < -500.0, "JUMP at the surface should leap out (%s)" % _state(p))


func test_vine_climb_and_jump_off() -> void:
	var v := Climbable.new()
	v.position = Vector2(-20, -600)
	v.size = Vector2(40, 560)
	_arena.add_child(v)
	var p := add_player(0, Vector2(-120, -2))
	await settle(p)
	press(0, "move_right")
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		if _state(p) == &"Climb":
			break
	release(0, "jump")
	release(0, "move_right")
	check(_state(p) == &"Climb", "jumping into a vine should grab it (got %s)" % _state(p))
	var y0 := p.global_position.y
	press(0, "move_up")
	await seconds(0.6)
	release(0, "move_up")
	check(p.global_position.y < y0 - 80.0, "UP should climb (moved %.0f)" % (y0 - p.global_position.y))
	check(absf(p.global_position.x) < 6.0, "should be centred on the vine")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(_state(p) == &"Jump", "JUMP should leap off the vine")


func test_barrel_cannon_fires_player() -> void:
	var c := BarrelCannon.new()
	c.position = Vector2(0, -300)
	c.rotation_degrees = 45.0
	_arena.add_child(c)
	var p := add_player(0, Vector2(0, -250))
	for i in 60:
		await get_tree().physics_frame
		if _state(p) == &"Cannon":
			break
	check(_state(p) == &"Cannon", "touching a barrel should load you in")
	await seconds(0.3)
	check(_state(p) == &"Cannon", "should wait inside for JUMP")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(p.velocity.x > 500.0 and p.velocity.y < -500.0, "should fire up-right (v %s)" % p.velocity)


func test_wind_pushes_player() -> void:
	var wz := WindZone.new()
	wz.position = Vector2(-300, -300)
	wz.size = Vector2(1200, 300)
	wz.wind = Vector2(300, 0)
	_arena.add_child(wz)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var x0 := p.global_position.x
	await seconds(1.0)
	check(p.global_position.x - x0 > 150.0, "wind should push you along (moved %.0f)" % (p.global_position.x - x0))


func test_conveyor_carries_and_ice_is_slippery() -> void:
	var belt := _add_block(Vector2(-300, -100), Vector2(600, 40))
	belt.conveyor_speed = 200.0
	var p := add_player(0, Vector2(0, -105))
	await settle(p)
	var x0 := p.global_position.x
	await seconds(0.8)
	check(p.global_position.x - x0 > 100.0, "conveyor should carry you (moved %.0f)" % (p.global_position.x - x0))
	# Ice: stopping takes much longer than on normal ground.
	var stops: Array[float] = []
	for slippery in [false, true]:
		var floor_b := _add_block(Vector2(-1900, -300 if slippery else -600), Vector2(1400, 40))
		floor_b.slippery = slippery
		p.global_position = Vector2(-1800, floor_b.position.y - 2)
		p.velocity = Vector2.ZERO
		await settle(p)
		press(0, "move_right")
		await seconds(0.8)
		release(0, "move_right")
		var xs := p.global_position.x
		await seconds(1.2)
		stops.append(p.global_position.x - xs)
	check(stops[1] > stops[0] * 3.0, "ice should slide much further (%.0f vs %.0f)" % [stops[1], stops[0]])


func test_bumper_knocks_player_away() -> void:
	var b := Bumper.new()
	b.position = Vector2(0, -200)
	_arena.add_child(b)
	var p := add_player(0, Vector2(30, -120))
	var launched := false
	for i in 30:
		await get_tree().physics_frame
		if p.velocity.length() > 600.0:
			launched = true
			break
	check(launched, "bumper should launch you")
	check(p.velocity.x > 0.0, "away from its centre (v %s)" % p.velocity)


func test_spike_ball_and_crusher_hurt() -> void:
	var sb := SpikeBall.new()
	sb.position = Vector2(-600, -40)
	sb.radius = 0.0
	sb.speed = 0.0
	_arena.add_child(sb)
	var a := add_player(0, Vector2(-600, -2))
	await seconds(0.3)
	check(a.is_bubbled(), "touching a spike ball should bubble you")
	var cr := Crusher.new()
	cr.position = Vector2(200, -500)
	_arena.add_child(cr)
	var b := add_player(1, Vector2(264, -2))
	await settle(b)
	var squashed := false
	for i in 180:
		await get_tree().physics_frame
		squashed = squashed or b.is_bubbled()  # (everyone-bubbled respawn revives them after)
	check(squashed, "standing under a crusher should get you squashed")


func test_breakable_block_and_secret_area() -> void:
	var wall := BreakableBlock.new()
	wall.position = Vector2(60, -128)
	_arena.add_child(wall)
	var secret := SecretArea.new()
	secret.position = Vector2(130, -300)
	secret.size = Vector2(300, 300)
	_arena.add_child(secret)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	await _punch()
	await seconds(0.3)
	check(wall.collision_layer == 0, "punching a breakable wall should smash it")
	press(0, "move_right")
	await seconds(0.8)
	release(0, "move_right")
	check(secret.found, "walking into the secret area should reveal it")


func test_rising_lava_rises_and_resets() -> void:
	var lava := RisingHazard.new()
	lava.position = Vector2(-1000, 200)
	lava.width = 2000.0
	lava.speed = 400.0
	lava.rise_distance = 600.0
	_arena.add_child(lava)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	await seconds(0.3)
	check(not p.is_bubbled(), "lava is idle until triggered")
	lava.set_active(true)
	await seconds(1.0)
	check(p.is_bubbled(), "rising lava should catch you")
	EventBus.level_reset.emit()
	await frames(2)
	check(is_equal_approx(lava.position.y, 200.0) and not lava.active, "lava should reset on respawn")


# --- Movement refinement ------------------------------------------------------------

func test_wall_run_up_a_wall_when_sprinting() -> void:
	var p := add_player(0, Vector2(-1200, -2))
	await settle(p)
	press(0, "move_right")
	var ran := false
	var best := 0.0
	for i in 600:
		await get_tree().physics_frame
		if _state(p) == &"WallRun":
			ran = true
		best = minf(best, p.global_position.y)
	release(0, "move_right")
	check(ran, "sprinting into the arena wall should wall-run")
	check(best < -120.0, "a wall run should carry you well up the wall (%.0f)" % best)


func test_no_wall_run_at_walking_speed() -> void:
	var p := add_player(0, Vector2(400, -2))
	await settle(p)
	press(0, "move_right")
	var ran := false
	for i in 90:
		await get_tree().physics_frame
		ran = ran or _state(p) == &"WallRun"
	release(0, "move_right")
	check(not ran, "just walking into a wall must not wall-run")


func test_wall_coyote_jump_after_letting_go() -> void:
	var p := add_player(0, Vector2(560, -700))
	press(0, "move_right")
	await seconds(0.4)
	release(0, "move_right")
	check(_state(p) == &"WallSlide", "should be sliding on the wall")
	press(0, "move_left")
	await frames(3)  # pushing away lets go of the wall
	check(_state(p) == &"Fall", "pushing away should let go")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	release(0, "move_left")
	check(_state(p) == &"Jump" and p.velocity.x < -200.0 and p.velocity.y < -500.0,
			"a jump just after letting go should still be a wall jump (v %s)" % p.velocity)


func test_walk_up_slope_and_slide_down_faster() -> void:
	var s := Slope.new()
	s.position = Vector2(0, 0)
	s.size = Vector2(300, 150)
	_arena.add_child(s)
	_add_block(Vector2(300, -150), Vector2(260, 150))
	var p := add_player(0, Vector2(-200, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(1.2)
	release(0, "move_right")
	check(p.global_position.y < -140.0, "should walk up the slope onto the block (y %.0f)" % p.global_position.y)
	check(not p.is_on_wall() or _state(p) == &"Ground", "slope must not count as a wall")
	# Slide back down: faster at the bottom than at the top.
	p.global_position = Vector2(240, -125)  # on the slope near the top
	p.velocity = Vector2.ZERO
	await settle(p)
	press(0, "move_left")
	await frames(6)
	press(0, "move_down")
	await frames(2)
	check(_state(p) == &"Slide", "DOWN on a downhill slope should slide even when slow (got %s)" % _state(p))
	var top_speed := absf(p.velocity.x)
	await seconds(0.45)
	var low_speed := absf(p.velocity.x)
	release(0, "move_down")
	release(0, "move_left")
	check(low_speed > top_speed + 100.0, "belly slide should speed up downhill (%.0f -> %.0f)" % [top_speed, low_speed])


func _jump_distance(p: Player, run_frames: int) -> float:
	press(0, "move_right")
	await frames(run_frames)
	var x0 := p.global_position.x
	press(0, "jump")
	var left := false
	for i in 300:
		await get_tree().physics_frame
		if i == 45:
			release(0, "jump")
		if not p.is_on_floor():
			left = true
		elif left:
			break
	release(0, "jump")
	release(0, "move_right")
	return p.global_position.x - x0


func test_sprint_jump_carries_momentum() -> void:
	var p := add_player(0, Vector2(-1900, -2))
	await settle(p)
	var run := await _jump_distance(p, 40)
	await seconds(0.5)
	p.global_position = Vector2(-1900, -2)
	await settle(p)
	var sprint := await _jump_distance(p, 200)
	check(sprint > run * 1.25, "sprint jumps should go much further (%.0f vs %.0f)" % [sprint, run])


func test_tap_stomp_bounce_is_still_decent() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var y0 := p.global_position.y
	p.bounce()
	var peak := y0
	for i in 90:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	check(y0 - peak > 70.0, "a tap stomp bounce should still pop you up (%.0f px)" % (y0 - peak))


# --- Game loop ---------------------------------------------------------------------

func test_goal_completes_level_and_records_results() -> void:
	var goal := LevelGoal.new()
	goal.position = Vector2(300, 0)
	_arena.add_child(goal)
	var got := {}
	var cb := func(r: Dictionary) -> void: got.merge(r)
	EventBus.level_completed.connect(cb)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	EventBus.lum_collected.emit(0, Vector2.ZERO)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	EventBus.level_completed.disconnect(cb)
	check(gm().level_complete, "reaching the goal should complete the level")
	check(got.get("lums", -1) == 1, "results should include the Lum count")
	check(_state(p) == &"Victory", "players should celebrate")
	var results := _arena.get_node_or_null(^"Results")
	check(results != null, "every level gets a results screen")


func test_gem_pickup_is_tracked() -> void:
	var gem := DreamGem.new()
	gem.gem_index = 1
	gem.position = Vector2(80, -30)
	_arena.add_child(gem)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(0.4)
	release(0, "move_right")
	check(gm().gems[1] and not gm().gems[0], "collecting gem 1 should mark only gem 1")


func test_pause_menu_pauses_and_resumes() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var pm = _arena.get_node(^"PauseMenu")
	press(0, "pause")
	await get_tree().process_frame
	await get_tree().process_frame
	release(0, "pause")
	check(get_tree().paused and pm.is_open(), "PAUSE should open the menu and pause the game")
	await get_tree().process_frame
	press(0, "jump")  # "Resume" is the first item
	await get_tree().process_frame
	await get_tree().process_frame
	release(0, "jump")
	check(not get_tree().paused and not pm.is_open(), "choosing Resume should unpause")


func test_drop_out_removes_player() -> void:
	var a := add_player(0, Vector2(0, -2))
	var b := add_player(1, Vector2(100, -2))
	await frames(3)
	gm().drop_player(1)
	await frames(2)
	check(not is_instance_valid(b) and not gm().players.has(1), "dropped player should be removed")
	check(not router().get_bound_slots().has(1), "their slot should be free to rejoin")
	check(is_instance_valid(a), "other players stay")


func test_level_select_builds() -> void:
	var ls: Control = load("res://ui/level_select.tscn").instantiate()
	_arena.add_child(ls)
	await frames(3)
	check(ls.get_child_count() > 3, "level select should build its cards")
	ls.queue_free()


func test_lums_drift_toward_nearby_players() -> void:
	var lum: Lum = load("res://collectibles/lum.tscn").instantiate()
	lum.position = Vector2(70, -40)
	_arena.add_child(lum)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	await seconds(0.5)
	check(not is_instance_valid(lum) or lum.is_queued_for_deletion() or lum._taken, "a Lum this close should fly to you")


# --- Demo level playthrough bots (prove the key sections are makeable) --------------

var _demo: Level


func _load_demo(path := "res://levels/demo_level.tscn") -> Player:
	router().bind_slot(0, 0)
	for n in [^"Floor", ^"Wall"]:  # the test arena's own geometry would get in the way
		if _arena.has_node(n):
			_arena.get_node(n).free()
	_demo = load(path).instantiate()
	_arena.add_child(_demo)
	await frames(3)
	return gm().players.get(0)


func _place(p: Player, pos: Vector2) -> void:
	p.global_position = pos
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	await settle(p)


## Hold `dir` until the player's x passes `x` (or time runs out).
func _run_to(p: Player, x: float, dir := "move_right", max_s := 6.0) -> void:
	press(0, dir)
	for i in int(max_s * 120):
		await get_tree().physics_frame
		if (dir == "move_right" and p.global_position.x >= x) or (dir == "move_left" and p.global_position.x <= x):
			return


func _finish_demo() -> void:
	for a in router().ACTIONS:
		Input.action_release(router().action_name(0, a))
	_demo.queue_free()
	await frames(2)


func test_demo_sprint_gap_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(2300, -2))
	await _run_to(p, 3860)
	press(0, "jump")
	await seconds(1.2)
	check(p.global_position.x > 4260 and p.global_position.y < 10.0, "sprint jump should clear the gap (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_wall_run_step_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(5750, -702))
	await _run_to(p, 6430)
	press(0, "jump")
	await seconds(1.5)
	check(p.global_position.y < -1015.0 and p.global_position.x > 6555.0, "sprint + wall run should get on top (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_glide_canyon_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(7150, -1022))
	await _run_to(p, 7420)
	press(0, "jump")
	await seconds(4.0)
	check(p.global_position.x > 8360 and not p.is_bubbled() and p.global_position.y < -900.0,
			"gliding should cross the canyon (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_pound_chamber_pad_returns_you() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(11400, -1100))
	press(0, "jump")
	await frames(20)
	release(0, "jump")
	press(0, "move_down")
	await frames(2)
	press(0, "attack")
	await frames(2)
	release(0, "attack")
	release(0, "move_down")
	var lowest := -9999.0
	for i in 72:
		await get_tree().physics_frame
		lowest = maxf(lowest, p.global_position.y)
	check(lowest > -700.0, "pound should break into the chamber (lowest y %.0f)" % lowest)
	# The pad sends you back up; steer onto the right-hand floor.
	await seconds(0.3)
	await _run_to(p, 11560, "move_right", 2.0)
	await seconds(1.0)
	check(p.global_position.y < -955.0 and p.global_position.x > 11500.0, "pad should launch you back up (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_cannons_carry_you_across() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(18300, -1562))
	await _run_to(p, 18400)
	release(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Cannon":
			break
	check(_state(p) == &"Cannon", "should hop into the first barrel")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	await seconds(3.0)
	check(p.global_position.x > 19360 and p.global_position.y < -1500.0 and not p.is_bubbled(),
			"two barrels should land you across (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_wind_gap_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(21200, -1262))
	await _run_to(p, 21430)
	press(0, "jump")
	var landed := false
	for i in 360:
		await get_tree().physics_frame
		if p.global_position.x > 22110 and p.is_on_floor():
			landed = true
			break
	check(landed and not p.is_bubbled(), "glide + wind should cross (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_mound_is_climbable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(28240, -1262))
	await _run_to(p, 28260)
	press(0, "jump")
	await seconds(0.5)
	release(0, "jump")
	await seconds(0.3)
	press(0, "jump")
	await seconds(1.5)
	check(p.global_position.x > 28960 or p.global_position.y < -1500.0, "should get up and over the mound (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_pad_reaches_swing_rings() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(8700, -962))
	await _run_to(p, 8800, "move_right", 2.0)
	release(0, "move_right")
	press(0, "jump")  # hold for the big bounce
	await seconds(0.5)
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "jump")
	check(p.global_position.y < -1290.0, "the mushroom should get you onto the ledge (at %s)" % p.global_position)
	await _place(p, Vector2(9060, -1302))
	press(0, "move_right")
	press(0, "jump")
	var swung := false
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swing":
			swung = true
			break
	check(swung, "jumping off the ledge should reach the first ring (at %s)" % p.global_position)
	await _finish_demo()


## Jump from where we stand to land on the platform whose top is at (x, y).
func _hop_to(p: Player, x: float, y: float, max_s := 2.0) -> bool:
	var dir := "move_right" if x > p.global_position.x else "move_left"
	press(0, "jump")
	var left := false
	for i in int(max_s * 120):
		await get_tree().physics_frame
		var dx := x - p.global_position.x
		if absf(dx) > 24.0:
			release(0, "move_left" if dx > 0.0 else "move_right")
			press(0, "move_right" if dx > 0.0 else "move_left")
		else:
			release(0, "move_right")
			release(0, "move_left")
		if i == 48:
			release(0, "jump")
		if not p.is_on_floor():
			left = true
		elif left and absf(p.global_position.y - y) < 6.0:
			release(0, "move_right")
			release(0, "move_left")
			release(0, "jump")
			await frames(4)
			return true
	release(0, "move_right")
	release(0, "move_left")
	release(0, "jump")
	return false


func test_candy_boingo_chain_crosses_the_pool() -> void:
	var p: Player = await _load_demo("res://levels/candy_canopy.tscn")
	await _place(p, Vector2(1440, -2))
	await _run_to(p, 1480)
	press(0, "jump")
	var crossed := false
	for i in 600:
		await get_tree().physics_frame
		if i == 45:
			release(0, "jump")  # drop onto the first Boingo...
		if i > 45 and p.velocity.y < -500.0:
			press(0, "jump")    # ...and hold jump for big bounces
		if p.global_position.x > 2230 and p.is_on_floor() and p.global_position.y < 5.0:
			crossed = true
			break
	check(crossed, "bouncing on the Boingos should cross the pool (at %s)" % p.global_position)
	await _finish_demo()


func test_candy_syrup_shaft_is_climbable_in_time() -> void:
	var p: Player = await _load_demo("res://levels/candy_canopy.tscn")
	await _place(p, Vector2(9380, -2))
	await _run_to(p, 9640)
	release(0, "move_right")
	await settle(p)
	var ledges := []
	for i in 10:
		ledges.append([9660 if i % 2 == 0 else 10000, -140 * (i + 1)])
	for l in ledges:
		var ok: bool = await _hop_to(p, l[0], l[1])
		if not ok or p.is_bubbled():
			break
	check(not p.is_bubbled(), "the syrup should not catch a steady climber")
	var ok2: bool = await _hop_to(p, 10300, -1250, 3.0)
	check(ok2 and p.global_position.x > 10200, "should hop out onto the summit (at %s)" % p.global_position)
	await _finish_demo()


func test_candy_switch_puzzle_opens_gate() -> void:
	var p: Player = await _load_demo("res://levels/candy_canopy.tscn")
	await _place(p, Vector2(8380, -2))
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()  # just the puzzle, please
	await _run_to(p, 8420)
	release(0, "move_right")
	press(0, "jump")
	for i in 240:
		await get_tree().physics_frame
		if p.global_position.y < -300.0 and p.global_position.x < 8650.0:
			press(0, "move_right")
		else:
			release(0, "move_right")
		if p.is_on_floor() and p.global_position.y < -400.0:
			break
	release(0, "move_right")
	release(0, "jump")
	check(p.global_position.y < -410.0, "the mushroom should reach the switch ledge (at %s)" % p.global_position)
	p.global_position.x = 8630.0
	p.facing = 1
	await frames(2)
	await _punch()
	await seconds(1.0)
	var gate: Gate = _demo.find_children("*", "Gate", true, false).filter(func(g: Node) -> bool: return g.position.x > 9000.0)[0]
	check(gate.is_open(), "punching the switch should open the gate")
	await _finish_demo()


func test_sunset_crumble_bridge_is_crossable() -> void:
	var p: Player = await _load_demo("res://levels/sunset_gusts.tscn")
	await _place(p, Vector2(1100, -2))
	press(0, "move_right")
	var crossed := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_on_floor():
			press(0, "jump")
		elif p.velocity.y > 0.0:
			release(0, "jump")
		if p.global_position.x > 2330 and p.is_on_floor():
			crossed = true
			break
	check(crossed and not p.is_bubbled(), "hopping along should cross the crumbling bridge (at %s)" % p.global_position)
	await _finish_demo()


func test_sunset_cannons_cross_the_canyon() -> void:
	var p: Player = await _load_demo("res://levels/sunset_gusts.tscn")
	await _place(p, Vector2(4450, -2))
	await _run_to(p, 4580)
	release(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Cannon":
			break
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	await seconds(3.0)
	check(p.global_position.x > 5530 and not p.is_bubbled(), "cannons should land you across (at %s)" % p.global_position)
	await _finish_demo()


func test_sunset_arena_locks_and_unlocks() -> void:
	var p: Player = await _load_demo("res://levels/sunset_gusts.tscn")
	await _place(p, Vector2(8100, -2))
	p.invulnerable_timer = 999.0
	await seconds(0.5)
	var gates := _demo.find_children("*", "Gate", true, false)
	var entry: Gate = gates.filter(func(g: Node) -> bool: return absf(g.position.x - 7840.0) < 1.0)[0]
	var exit_g: Gate = gates.filter(func(g: Node) -> bool: return absf(g.position.x - 8800.0) < 1.0)[0]
	check(not entry.is_open(), "the entry gate should slam shut once everyone is inside")
	check(not exit_g.is_open(), "the exit stays shut while enemies live")
	for k in 12:
		for e in get_tree().get_nodes_in_group(&"enemies"):
			if e is Enemy and not e.dead and e.global_position.x > 7850 and e.global_position.x < 8800:
				e.damage(null, Enemy.HitKind.HAZARD, Vector2.ZERO)
				e.damage(null, Enemy.HitKind.HAZARD, Vector2.ZERO)
		await seconds(0.4)
	check(exit_g.is_open(), "beating every enemy (and the flapjack wave) should open the exit")
	await _finish_demo()


func test_glacier_slide_long_jump_clears_the_gap() -> void:
	var p: Player = await _load_demo("res://levels/glacier_grotto.tscn")
	await _place(p, Vector2(7150, -602))
	press(0, "move_right")
	await frames(20)
	press(0, "move_down")
	var jumped := false
	for i in 400:
		await get_tree().physics_frame
		if not jumped and p.global_position.x > 8200:
			release(0, "move_down")
			press(0, "jump")
			jumped = true
		if jumped and p.is_on_floor() and p.global_position.x > 8300:
			break
	check(p.global_position.x > 8620 and not p.is_bubbled(), "slide + long jump should clear the gap (at %s)" % p.global_position)
	await _finish_demo()


func test_glacier_lake_exit() -> void:
	var p: Player = await _load_demo("res://levels/glacier_grotto.tscn")
	p.global_position = Vector2(4150, 800)
	await seconds(0.3)
	press(0, "move_right")
	press(0, "move_up")
	await seconds(1.2)
	release(0, "move_up")
	press(0, "jump")
	await seconds(1.0)
	release(0, "jump")
	await seconds(0.5)
	check(p.global_position.x > 4400 and p.global_position.y < 605 and p.is_on_floor(), "should leap out onto the far shore (at %s)" % p.global_position)
	await _finish_demo()


func test_glacier_boss_sleeps_wakes_and_unlocks_exit() -> void:
	var p: Player = await _load_demo("res://levels/glacier_grotto.tscn")
	var king: KingGrumblo = _demo.find_children("*", "KingGrumblo", true, false)[0]
	await seconds(0.5)
	check(king.asleep and absf(king.global_position.x - 9900.0) < 5.0, "the King should be asleep in his arena")
	await _place(p, Vector2(9500, -2))
	p.invulnerable_timer = 999.0
	await seconds(0.5)
	check(not king.asleep, "entering the arena should wake him")
	var exit_g: Gate = _demo.find_children("*", "Gate", true, false).filter(func(g: Node) -> bool: return g.position.x > 10000.0)[0]
	check(not exit_g.is_open(), "exit shut during the fight")
	for k in 40:
		for e in get_tree().get_nodes_in_group(&"enemies"):
			if e is Enemy and not e.dead:
				e.stun_timer = 1.0  # (dazed, so hits land)
				e.damage(null, Enemy.HitKind.STOMP, Vector2.ZERO)
		await seconds(0.25)
		if exit_g.is_open():
			break
	check(exit_g.is_open(), "beating the King (and his minions) should open the exit")
	await _finish_demo()


func test_audio_plays_sfx_for_events_and_theme_music() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "jump")
	await frames(2)
	release(0, "jump")
	var playing := Audio._voices.filter(func(v: AudioStreamPlayer) -> bool:
		return v.playing and v.stream and v.stream.resource_path.ends_with("jump.wav"))
	check(playing.size() > 0, "jumping should play the jump sound")
	EventBus.level_started.emit(_arena)  # arena has no theme -> default meadow music
	await frames(2)
	check(Audio._music_name.ends_with("meadow.wav"), "levels should pick their theme music (got %s)" % Audio._music_name)


# --- Level pieces round 2 --------------------------------------------------------------

func test_zipline_carries_you_downhill_and_flings_you_off() -> void:
	var z := Zipline.new()
	z.position = Vector2(-500, -500)
	z.end = Vector2(700, 300)
	_arena.add_child(z)
	var p := add_player(0, Vector2(-350, -500 + 72 - 20))  # hands just above the rope, falling
	for i in 60:
		await get_tree().physics_frame
		if _state(p) == &"Zipline":
			break
	check(_state(p) == &"Zipline", "jumping into a zipline should grab it (got %s)" % _state(p))
	await seconds(0.5)
	check(p.velocity.x > 300.0, "should whizz downhill (vx %.0f)" % p.velocity.x)
	await seconds(2.0)
	check(_state(p) != &"Zipline" and p.global_position.x > 200.0, "should be flung off the end (at %s)" % p.global_position)


func test_balloon_lifts_then_drops_you() -> void:
	var stand := BalloonStand.new()
	stand.position = Vector2(120, 0)
	_arena.add_child(stand)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(0.3)
	release(0, "move_right")
	check(p.balloon_timer > 0.0, "touching the stand should hand you a balloon")
	await seconds(1.2)
	check(p.global_position.y < -200.0, "the balloon should lift you (y %.0f)" % p.global_position.y)
	await seconds(p.tuning.balloon_time + 1.5)
	check(p.is_on_floor(), "when the balloon runs out you float back down")


func test_door_takes_everyone_to_its_twin() -> void:
	var a := Door.new()
	a.name = "DoorA"
	a.position = Vector2(0, 0)
	_arena.add_child(a)
	var b := Door.new()
	b.name = "DoorB"
	b.position = Vector2(-1500, 0)
	_arena.add_child(b)
	a.target = a.get_path_to(b)
	var p := add_player(0, Vector2(0, -2))
	var q := add_player(1, Vector2(300, -2))
	await settle(p)
	press(0, "move_up")
	await seconds(0.8)
	release(0, "move_up")
	check(p.global_position.x < -1400.0 and q.global_position.x < -1400.0, "UP at a door should take everyone to the twin door")


func test_lum_block_pops_lums_when_bumped() -> void:
	var blk := LumBlock.new()
	blk.position = Vector2(-32, -170)
	blk.lums = 2
	_arena.add_child(blk)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "jump")
	await seconds(0.5)
	release(0, "jump")
	check(blk.lums == 1, "jumping into it from below should pop a Lum (left %d)" % blk.lums)


func test_fire_jet_hurts_steam_jet_launches() -> void:
	var fire := FlameJet.new()
	fire.position = Vector2(-400, 0)
	fire.on_time = 5.0
	_arena.add_child(fire)
	var a := add_player(0, Vector2(-400, -2))
	await seconds(0.3)
	check(a.is_bubbled(), "standing in a lit fire jet should bubble you")
	var steam := FlameJet.new()
	steam.style = FlameJet.Style.STEAM
	steam.position = Vector2(400, 0)
	steam.on_time = 5.0
	_arena.add_child(steam)
	var b := add_player(1, Vector2(400, -2))
	var launched := false
	for i in 60:
		await get_tree().physics_frame
		launched = launched or b.velocity.y < -600.0
	check(launched and not b.is_bubbled(), "a steam geyser should launch you up, harmlessly")


func test_pop_spikes_only_hurt_when_up() -> void:
	var s := PopSpikes.new()
	s.position = Vector2(-100, 0)
	s.length = 200.0
	s.up_time = 0.5
	s.down_time = 1.0
	s.phase = 0.45  # start just before they sink
	_arena.add_child(s)
	var p := add_player(0, Vector2(0, -2))
	var hurt_at := -1.0
	for i in 240:
		await get_tree().physics_frame
		if p.is_bubbled():
			hurt_at = i / 120.0
			break
	check(hurt_at > 0.6, "spikes are safe while down, deadly once they pop back up (hurt at %.2f s)" % hurt_at)


func test_stalactite_falls_on_you() -> void:
	var st := Stalactite.new()
	st.position = Vector2(0, -600)
	_arena.add_child(st)
	var p := add_player(0, Vector2(0, -2))
	var hit := false
	for i in 240:
		await get_tree().physics_frame
		hit = hit or p.is_bubbled()
	check(hit, "standing under a stalactite should get you bonked")


func test_saw_blade_hurts() -> void:
	var saw := SawBlade.new()
	saw.position = Vector2(-300, -34)
	saw.waypoints = PackedVector2Array([Vector2(600, 0)])
	saw.speed = 400.0
	_arena.add_child(saw)
	var p := add_player(0, Vector2(0, -2))
	var hit := false
	for i in 240:
		await get_tree().physics_frame
		hit = hit or p.is_bubbled()
	check(hit, "a saw running along the floor should bubble you")


func test_key_opens_matching_door_and_drops_when_carrier_bubbles() -> void:
	var key := DreamKey.new()
	key.position = Vector2(80, -30)
	_arena.add_child(key)
	var door := KeyDoor.new()
	door.position = Vector2(400, -220)
	_arena.add_child(door)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(0.3)
	check(key.carrier == p, "touching the key should pick it up")
	p.hurt()
	await frames(2)
	check(key.carrier == null, "getting bubbled drops the key")
	p.revive(false)
	p.global_position = Vector2(key.global_position.x - 40, -2)
	await seconds(1.5)
	release(0, "move_right")
	check(door.collision_layer == 0, "carrying the key to the door should unlock it")


func test_demo_toybox_balloon_reaches_tower_and_zipline() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(23700, -1262))
	await _run_to(p, 23830)
	release(0, "move_right")
	check(p.balloon_timer > 0.0, "the balloon stand should give you a balloon")
	# Float up, then steer right onto the tower.
	var on_tower := false
	for i in 600:
		await get_tree().physics_frame
		if p.global_position.y < -1720.0 and p.global_position.x < 24080.0:
			press(0, "move_right")
		elif p.global_position.x >= 24080.0 and p.balloon_timer > 0.0:
			release(0, "move_right")
			await _punch()  # pop it over the tower
		if p.is_on_floor() and p.global_position.y < -1690.0:
			on_tower = true
			break
	release(0, "move_right")
	check(on_tower, "the balloon should get you onto the tower (at %s)" % p.global_position)
	await _run_to(p, 24190)
	press(0, "jump")
	var zipped := false
	for i in 120:
		await get_tree().physics_frame
		if i == 6:
			release(0, "jump")  # a little hop
		if _state(p) == &"Zipline":
			zipped = true
			break
	release(0, "jump")
	release(0, "move_right")
	check(zipped, "jumping off the tower should catch the zipline (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_key_reachable_via_geyser() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(26150, -1262))
	await _run_to(p, 26240, "move_right", 2.0)
	release(0, "move_right")
	var high := 0.0
	for i in 360:
		await get_tree().physics_frame
		high = minf(high, p.global_position.y)
		var key: DreamKey = _demo.find_children("*", "DreamKey", true, false)[0]
		if key.carrier == p:
			break
	var k: DreamKey = _demo.find_children("*", "DreamKey", true, false)[0]
	check(k.carrier == p, "the geyser should pop you up to the key (highest %.0f)" % high)
	await _finish_demo()
