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
	for a in OS.get_cmdline_user_args():
		if a.begins_with("ticks="):  # e.g. ticks=60: run everything at the browser's physics rate
			Engine.physics_ticks_per_second = int(a.substr(6))
	_run.call_deferred()


func _run() -> void:
	# Optional filter: godot ... res://tests/test_runner.tscn -- only=wall
	var only := ""
	for a in OS.get_cmdline_user_args():
		if a.begins_with("only="):
			only = a.substr(5)
	var names: Array[String] = []
	for m in get_method_list():
		if String(m.name).begins_with("test_") and (only == "" or String(m.name).contains(only)):
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
	if names.is_empty():
		_failures.append("no tests matched")
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


func _hop_height(p: Player, hold_frames: int) -> float:
	await settle(p)
	var start_y := p.global_position.y
	var peak := start_y
	press(0, "jump")
	for i in 200:
		await get_tree().physics_frame
		if i == hold_frames:
			release(0, "jump")
		peak = minf(peak, p.global_position.y)
		if i > hold_frames and i > 10 and p.is_on_floor():
			break
	release(0, "jump")
	return start_y - peak


func test_quick_taps_give_the_same_hop() -> void:
	var p := add_player(0, Vector2(0, -2))
	var heights: Array[float] = []
	for hold: int in [1, 3, 6, 9]:
		heights.append(await _hop_height(p, hold))
	var lo: float = heights.min()
	var hi: float = heights.max()
	check(lo >= p.tuning.jump_min_height - 4.0, "every tap should reach the minimum hop (%s)" % [heights])
	check(hi - lo < 20.0, "quick taps should all hop about the same height (%s)" % [heights])
	var full := await _hop_height(p, 90)
	check(full > p.tuning.jump_height - 8.0, "holding jump should give the full jump (%.0f)" % full)


func test_holding_jump_never_glides_by_itself() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "jump")
	var glided := false
	for i in 150:
		await get_tree().physics_frame
		glided = glided or _state(p) == &"Glide"
	release(0, "jump")
	check(not glided, "a held jump must land on its own arc (glide = press JUMP again in the air)")
	check(p.is_on_floor(), "should have landed")


func test_press_jump_again_in_air_glides_at_once() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	press(0, "jump")
	await frames(60)
	release(0, "jump")
	await frames(2)
	press(0, "jump")
	await frames(3)
	check(_state(p) == &"Glide", "second press in the air should glide straight away (got %s)" % _state(p))
	release(0, "jump")


func test_wall_jump_works_while_rising() -> void:
	var p := add_player(0, Vector2(570, -2))  # arena wall starts at x = 600
	await settle(p)
	press(0, "jump")
	await frames(12)
	release(0, "jump")
	check(_state(p) == &"Jump", "should still be rising")
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(p.velocity.x < -200.0 and p.velocity.y < -600.0, "JUMP beside a wall while rising should kick off it (v %s)" % p.velocity)


func test_hold_toward_wall_and_tap_jump_climbs_it() -> void:
	var p := add_player(0, Vector2(560, -300))
	press(0, "move_right")
	for i in 90:
		await get_tree().physics_frame
		if _state(p) == &"WallSlide":
			break
	check(_state(p) == &"WallSlide", "should grab the wall")
	var start_y := p.global_position.y
	for kick in 5:
		press(0, "jump")
		await frames(3)
		release(0, "jump")
		await frames(27)
	release(0, "move_right")
	check(start_y - p.global_position.y > 350.0, "tapping JUMP while holding toward the wall should climb it (gained %.0f)" % (start_y - p.global_position.y))
	check(p.touching_wall_dir(p.tuning.wall_jump_reach) == 1, "should still be on the same wall")


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


func test_running_alone_never_sprints() -> void:
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	press(0, "move_right")
	await seconds(2.0)
	release(0, "move_right")
	check(p.velocity.x <= p.tuning.max_run_speed + 1.0, "plain running must stay at run speed (vx %.0f)" % p.velocity.x)


func test_sprint_button_sprints_while_held() -> void:
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	press(0, "move_right")
	press(0, "sprint")
	await seconds(p.tuning.sprint_ramp_time + 0.3)
	check(p.velocity.x > p.tuning.max_run_speed * 1.2, "holding sprint should sprint (vx %.0f)" % p.velocity.x)
	release(0, "sprint")
	await seconds(0.2)
	check(p.sprint == 0.0 and p.velocity.x <= p.tuning.max_run_speed + 1.0, "letting go of sprint should drop back to a run")
	release(0, "move_right")
	await seconds(0.4)
	check(absf(p.velocity.x) < 1.0, "letting go should stop")


func test_double_tap_direction_sprints() -> void:
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	press(0, "move_right")
	await frames(8)
	release(0, "move_right")
	await frames(8)
	press(0, "move_right")
	await seconds(p.tuning.sprint_ramp_time + 0.3)
	check(p.velocity.x > p.tuning.max_run_speed * 1.2, "double-tap + hold should sprint (vx %.0f)" % p.velocity.x)
	release(0, "move_right")
	await seconds(0.3)
	check(p.sprint == 0.0, "letting go ends a double-tap sprint")
	# Two slow taps are just walking.
	press(0, "move_left")
	await frames(8)
	release(0, "move_left")
	await seconds(p.tuning.sprint_double_tap_window + 0.1)
	press(0, "move_left")
	await seconds(0.8)
	release(0, "move_left")
	check(p.velocity.x >= -p.tuning.max_run_speed - 1.0, "slow taps must not sprint (vx %.0f)" % p.velocity.x)


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
	press(0, "sprint")
	var ran := false
	var best := 0.0
	for i in 600:
		await get_tree().physics_frame
		if _state(p) == &"WallRun":
			ran = true
		best = minf(best, p.global_position.y)
	release(0, "move_right")
	release(0, "sprint")
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
	await seconds(1.6)
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


func _jump_distance(p: Player, run_frames: int, sprinting := false) -> float:
	press(0, "move_right")
	if sprinting:
		press(0, "sprint")
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
	release(0, "sprint")
	return p.global_position.x - x0


func test_sprint_jump_carries_momentum() -> void:
	var p := add_player(0, Vector2(-1900, -2))
	await settle(p)
	var run := await _jump_distance(p, 40)
	await seconds(0.5)
	p.global_position = Vector2(-1900, -2)
	await settle(p)
	var sprint := await _jump_distance(p, 200, true)
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


func _tap(action: String) -> void:
	press(0, action)
	await get_tree().process_frame
	await get_tree().process_frame
	release(0, action)
	await get_tree().process_frame
	await get_tree().process_frame


func test_pause_settings_change_and_save_the_volume() -> void:
	var keep := [Settings.music, Settings.sfx, Settings.fullscreen]
	Settings.music = 1.0
	Settings.apply()
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var pm = _arena.get_node(^"PauseMenu")
	await _tap("pause")
	await _tap("move_down")
	await _tap("move_down")
	await _tap("jump")   # Settings
	check(pm._settings, "the third item opens the settings")
	await _tap("move_left")
	await _tap("move_left")
	check(is_equal_approx(Settings.music, 0.8), "Left twice turns the music down to 80%% (%.2f)" % Settings.music)
	var db := AudioServer.get_bus_volume_db(AudioServer.get_bus_index(&"Music"))
	check(is_equal_approx(db, -6.0 + linear_to_db(0.8)), "the Music bus follows the setting (%.2f dB)" % db)
	var f := FileAccess.open(Settings.PATH, FileAccess.READ)
	var saved: Variant = JSON.parse_string(f.get_as_text()) if f else null
	check(saved is Dictionary and is_equal_approx(float(saved["music"]), 0.8), "the setting is saved (%s)" % [saved])
	await _tap("attack")  # back to the main list
	check(not pm._settings and pm.is_open(), "Back returns to the pause list")
	await _tap("pause")
	check(not pm.is_open() and not get_tree().paused, "PAUSE closes the menu")
	Settings.music = keep[0]
	Settings.sfx = keep[1]
	Settings.fullscreen = keep[2]
	Settings.apply()
	Settings.save()


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


## Bot glide (SECOND_PRESS): once the jump starts falling, let go of JUMP and
## press it again (held until the test releases it). Call WITHOUT await.
func _auto_glide(p: Player, max_frames := 360) -> void:
	for i in max_frames:
		await get_tree().physics_frame
		if not is_instance_valid(p) or (p.velocity.y > 0.0 and not p.is_on_floor()):
			break
	release(0, "jump")
	await frames(1)
	press(0, "jump")


func _finish_demo() -> void:
	for a in router().ACTIONS:
		Input.action_release(router().action_name(0, a))
	_demo.queue_free()
	await frames(2)


func test_demo_sprint_gap_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(2300, -2))
	press(0, "sprint")
	await _run_to(p, 3860)
	press(0, "jump")
	await seconds(1.2)
	check(p.global_position.x > 4260 and p.global_position.y < 10.0, "sprint jump should clear the gap (at %s)" % p.global_position)
	await _finish_demo()


func test_demo_wall_run_step_is_makeable() -> void:
	var p: Player = await _load_demo()
	await _place(p, Vector2(5750, -702))
	press(0, "sprint")
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
	_auto_glide(p)
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
	_auto_glide(p)
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
	release(0, "jump")  # (holding on would glide past the ledge)
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
		if i == 8:
			release(0, "jump")  # a short hop reaches the ring (a full jump sails over it)
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
	check(king.asleep and absf(king.global_position.x - 13200.0) < 5.0, "the King should be asleep in his arena")
	await _place(p, Vector2(12800, -2))
	p.invulnerable_timer = 999.0
	await seconds(0.5)
	check(not king.asleep, "entering the arena should wake him")
	var exit_g: Gate = _demo.find_children("*", "Gate", true, false).filter(func(g: Node) -> bool: return g.position.x > 13300.0)[0]
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


# --- World 1 enemies --------------------------------------------------------------------

func test_shellbert_stomp_hides_then_kicked_shell_smashes_enemies() -> void:
	var s := _spawn_enemy("res://enemies/shellbert.tscn", Vector2(0, 0)) as Shellbert
	s.walk_speed = 0.0
	var g := _spawn_enemy("res://enemies/grunt.tscn", Vector2(-360, 0))
	g.walk_speed = 0.0
	g.sight = 0.0
	var p := add_player(0, Vector2(0, -200))
	await seconds(0.5)
	check(s.st == Shellbert.St.SHELL, "a stomp should send it into its shell (st %d)" % s.st)
	check(not p.is_bubbled(), "stomping it is safe")
	# Walk into the shell from the right: kicks it left into the Grumblet.
	p.global_position = Vector2(90, -2)
	await settle(p)
	press(0, "move_left")
	var kicked := false
	for i in 90:
		await get_tree().physics_frame
		if s.st == Shellbert.St.SPIN:
			kicked = true
			break
	release(0, "move_left")
	check(kicked, "walking into the shell should kick it")
	await seconds(0.8)
	check(not is_instance_valid(g) or g.dead, "the spinning shell should knock out the Grumblet")
	check(not p.is_bubbled(), "a spinning shell never hurts players")


func test_shellbert_cracks_after_bouncing_off_walls() -> void:
	var s := _spawn_enemy("res://enemies/shellbert.tscn", Vector2(400, 0)) as Shellbert
	s.max_bounces = 1
	await frames(3)
	s._kick(1)
	var gone := false
	for i in 480:
		await get_tree().physics_frame
		if not is_instance_valid(s) or s.dead:
			gone = true
			break
	check(gone, "after its bounces the shell should crack")


func test_bumblebonk_aims_then_dashes_at_player() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var b := _spawn_enemy("res://enemies/bumblebonk.tscn", Vector2(300, -200)) as Bumblebonk
	var aimed := false
	var dashed := false
	for i in 240:
		await get_tree().physics_frame
		aimed = aimed or b.st == Bumblebonk.St.AIM
		if b.st == Bumblebonk.St.DASH:
			dashed = true
			await frames(2)
			check(b.velocity.x < 0.0 and b.velocity.y > 0.0, "the dash should head down toward the player (v %s)" % b.velocity)
			break
	check(aimed and dashed, "it should telegraph, then dash")


func test_bumblebonk_stomp_defeats() -> void:
	var b := _spawn_enemy("res://enemies/bumblebonk.tscn", Vector2(0, -60)) as Bumblebonk
	b.sight = 0.0
	b.loop_size = Vector2.ZERO
	var p := add_player(0, Vector2(0, -300))
	await seconds(0.6)
	check(not is_instance_valid(b) or b.dead, "stomping a bee should defeat it")
	check(not p.is_bubbled(), "and not hurt you")


func test_diggle_pops_up_throws_and_is_only_hittable_when_up() -> void:
	var d := _spawn_enemy("res://enemies/diggle.tscn", Vector2(0, 0)) as Diggle
	var p := add_player(0, Vector2(-1500, -2))
	await settle(p)
	await frames(10)
	check(d.st == Diggle.St.HIDDEN, "no one near: stays hidden")
	d.take_hit(p, Vector2.ZERO)
	check(not d.dead and d.health == 1, "hidden moles can't be hit")
	p.global_position = Vector2(-300, -2)
	p.invulnerable_timer = 100.0
	var threw := false
	for i in 180:
		await get_tree().physics_frame
		for c in _arena.get_children():
			if c is Projectile:
				threw = true
		if threw:
			break
	check(d.st == Diggle.St.UP or d.st == Diggle.St.SINKING, "a nearby player should make it pop up")
	check(threw, "it should throw a clod")


func test_ribbiton_is_a_trampoline_not_a_stomp_kill() -> void:
	var r := _spawn_enemy("res://enemies/ribbiton.tscn", Vector2(0, 0)) as Ribbiton
	r.sit_time = 100.0
	r._sit = 100.0
	var p := add_player(0, Vector2(0, -160))
	var peak := 0.0
	var start := -160.0
	for i in 150:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	check(not r.dead, "stomping the frog must not defeat it")
	check(not p.is_bubbled(), "bouncing on it is safe")
	check(peak < start - 180.0, "it should launch you high (peak %.0f)" % peak)


func test_ribbiton_hops_toward_player() -> void:
	var r := _spawn_enemy("res://enemies/ribbiton.tscn", Vector2(0, 0)) as Ribbiton
	var p := add_player(0, Vector2(400, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var x0 := r.global_position.x
	await seconds(3.0)
	check(r.global_position.x > x0 + 150.0, "it should hop toward the player (x %.0f)" % r.global_position.x)


func test_prickleroll_rolls_blocks_punches_and_gets_dizzy_on_wall() -> void:
	var p := add_player(0, Vector2(560, -2))  # right next to the arena wall
	await settle(p)
	p.invulnerable_timer = 100.0
	var h := _spawn_enemy("res://enemies/prickleroll.tscn", Vector2(300, 0), 1) as Prickleroll
	var rolled := false
	for i in 120:
		await get_tree().physics_frame
		if h.st == Prickleroll.St.ROLL:
			rolled = true
			break
	check(rolled, "it should curl up and roll at the player")
	check(h.blocks_hit(p, Enemy.HitKind.PUNCH), "a rolling ball shrugs off punches")
	p.global_position = Vector2(0, -2)  # jump out of the way
	var dizzy := false
	for i in 240:
		await get_tree().physics_frame
		if h.st == Prickleroll.St.DIZZY:
			dizzy = true
			break
	check(dizzy, "rolling into the wall should make it dizzy")
	h.take_hit(p, Vector2(300, -100))
	await frames(2)
	check(not is_instance_valid(h) or h.dead, "a dizzy hedgehog can be punched out")


func test_puffcap_spores_bubble_players_nearby() -> void:
	var m := _spawn_enemy("res://enemies/puffcap.tscn", Vector2(0, 0)) as Puffcap
	m.idle_time = 0.3
	var p := add_player(0, Vector2(70, -2))
	await settle(p)
	var hurt := false
	for i in 480:
		await get_tree().physics_frame
		if p.is_bubbled():
			hurt = true
			break
	check(hurt, "standing next to a puffing Puffcap should bubble you")


func test_wispet_only_moves_when_you_look_away() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var w := _spawn_enemy("res://enemies/wispet.tscn", Vector2(400, -40)) as Wispet
	p.facing = 1  # looking at it
	await seconds(0.8)
	var x_watched := w.global_position.x
	check(w.shy and x_watched > 380.0, "watched: it should freeze (x %.0f)" % x_watched)
	check(not w.contact_hurts, "a shy ghost is harmless")
	p.facing = -1  # turn our back
	await seconds(1.0)
	check(not w.shy and w.global_position.x < x_watched - 40.0, "back turned: it should creep closer (x %.0f)" % w.global_position.x)


# --- World 1 obstacles ----------------------------------------------------------------

func test_dandelion_parachute_slows_fall_and_drops_on_landing() -> void:
	var d := Dandelion.new()
	d.position = Vector2(0, 0)
	d.height = 300.0
	_arena.add_child(d)
	var p := add_player(0, Vector2(0, -420))
	var grabbed := false
	for i in 60:
		await get_tree().physics_frame
		if p.parachute:
			grabbed = true
			break
	check(grabbed, "falling into the fluff should grab a puff")
	await seconds(0.5)
	check(p.velocity.y <= p.tuning.parachute_fall_speed + 5.0, "a parachute should drift down slowly (vy %.0f)" % p.velocity.y)
	await seconds(4.0)
	check(p.is_on_floor() and not p.parachute, "landing lets go of the puff")


func test_dandelion_jump_lets_go() -> void:
	var p := add_player(0, Vector2(0, -600))
	await frames(2)
	p.take_parachute()
	await seconds(0.3)
	press(0, "jump")
	await frames(2)
	release(0, "jump")
	check(not p.parachute, "JUMP should let go of the puff")


func test_geyser_launches_players_when_erupting() -> void:
	var g := Geyser.new()
	g.position = Vector2(0, 0)
	g.calm_time = 0.2
	g.warn_time = 0.2
	_arena.add_child(g)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var peak := 0.0
	for i in 150:
		await get_tree().physics_frame
		peak = minf(peak, p.global_position.y)
	check(peak < -250.0, "the eruption should launch you high (peak %.0f)" % peak)


func test_seesaw_tips_toward_rider_and_slam_flings_other_end() -> void:
	var s := Seesaw.new()
	s.position = Vector2(0, -44)
	s.length = 320.0
	_arena.add_child(s)
	var a := add_player(0, Vector2(-120, -120))  # rider on the left end
	await seconds(0.8)
	check(s.angle < -0.1, "the left end should tip down under a rider (angle %.2f)" % s.angle)
	# Player 2 drops hard onto the raised right end.
	var b := add_player(1, Vector2(125, -700))
	var peak := 0.0
	for i in 150:
		await get_tree().physics_frame
		peak = minf(peak, a.global_position.y)
	check(peak < -400.0, "a slam on the high end should catapult the other rider (peak %.0f)" % peak)
	check(not b.is_bubbled() and not a.is_bubbled(), "nobody gets hurt")


func test_rope_bridge_sags_under_a_rider() -> void:
	var r := RopeBridge.new()
	r.position = Vector2(-300, -200)
	r.span = Vector2(600, 0)
	_arena.add_child(r)
	await frames(2)
	var mid_i := r.plank_count / 2
	var rest_y := r._pos[mid_i].y
	var p := add_player(0, Vector2(0, -330))
	await seconds(1.2)
	check(p.is_on_floor() and p.global_position.y < -100.0, "you should stand on the bridge (y %.0f)" % p.global_position.y)
	check(r._pos[mid_i].y > rest_y + 15.0, "the middle should sag under you (%.0f -> %.0f)" % [rest_y, r._pos[mid_i].y])


func test_two_players_stay_on_a_rope_bridge() -> void:
	var r := RopeBridge.new()
	r.position = Vector2(-300, -200)
	r.span = Vector2(600, 0)
	_arena.add_child(r)
	await frames(2)
	var a := add_player(0, Vector2(-100, -300))
	await seconds(0.8)
	var b := add_player(1, Vector2(80, -330))
	var fell := false
	for i in 150:
		await get_tree().physics_frame
		fell = fell or a.global_position.y > -100.0 or b.global_position.y > -100.0
	check(not fell, "neither dreamer should fall through the bridge (a %.0f, b %.0f)" % [a.global_position.y, b.global_position.y])


func test_ground_pound_empties_a_lum_block() -> void:
	var blk := LumBlock.new()
	blk.position = Vector2(-32, -200)
	blk.lums = 5
	_arena.add_child(blk)
	var p := add_player(0, Vector2(0, -330))
	await frames(2)
	EventBus.player_ground_pounded.emit(p, Vector2(0, -200))
	check(blk.lums == 0, "a pound on top should release every Lum (left %d)" % blk.lums)


func test_pendulum_platform_carries_rider_and_spiked_one_hurts() -> void:
	var pd := Pendulum.new()
	pd.position = Vector2(0, -600)
	pd.rope_length = 300.0
	pd.amplitude = 0.6
	_arena.add_child(pd)
	await frames(2)
	var start := pd.log_position() + pd.position
	var p := add_player(0, start + Vector2(0, -60))
	await seconds(0.3)
	var x0 := p.global_position.x
	await seconds(0.8)
	check(p.global_position.y < -200.0 and absf(p.global_position.x - x0) > 40.0, "the swinging log should carry you (x %.0f -> %.0f)" % [x0, p.global_position.x])
	var sp := Pendulum.new()
	sp.spiked = true
	sp.position = Vector2(-900, -400)
	sp.rope_length = 360.0
	sp.amplitude = 0.0
	_arena.add_child(sp)
	var q := add_player(1, Vector2(-900, -2))
	await seconds(0.4)
	check(q.is_bubbled(), "a spiky log should bubble you")


func test_leaf_platform_sinks_while_ridden() -> void:
	var l := LeafPlatform.new()
	l.position = Vector2(0, -300)
	_arena.add_child(l)
	var p := add_player(0, Vector2(0, -360))
	await seconds(0.5)
	var y0 := l.position.y
	await seconds(1.0)
	check(p.is_on_floor(), "you can stand on the leaf")
	check(l.position.y > y0 + 50.0, "it should sink under you (%.0f -> %.0f)" % [y0, l.position.y])


func test_brambles_hurt() -> void:
	var b := Brambles.new()
	b.position = Vector2(-100, -60)
	b.size = Vector2(200, 60)
	_arena.add_child(b)
	var p := add_player(0, Vector2(0, -200))
	await seconds(0.6)
	check(p.is_bubbled(), "falling into brambles should bubble you")


func test_log_raft_drifts_and_carries_rider() -> void:
	var r := LogRaft.new()
	r.position = Vector2(-300, -200)
	r.travel = 1000.0
	r.current = 150.0
	r.start_offset = 0.2
	_arena.add_child(r)
	var p := add_player(0, Vector2(-100, -300))
	await seconds(0.6)
	var x0 := p.global_position.x
	await seconds(1.0)
	check(p.is_on_floor() and p.global_position.x > x0 + 100.0, "the raft should carry you downstream (x %.0f -> %.0f)" % [x0, p.global_position.x])


func test_acorn_dropper_drops_acorns_near_players() -> void:
	var a := AcornDropper.new()
	a.position = Vector2(0, -400)
	a.interval = 0.5
	_arena.add_child(a)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var dropped := false
	for i in 120:
		await get_tree().physics_frame
		for c in _arena.get_children():
			if c is Projectile:
				dropped = true
	check(dropped, "it should drop an acorn")
	await seconds(1.0)
	check(p.is_bubbled(), "an acorn on the head bubbles you")


# --- World 1-1 Pillow Meadow bots ----------------------------------------------------

const W1_1 := "res://levels/w1_1_pillow_meadow.tscn"


func test_w1_1_cliff_can_be_wall_climbed() -> void:
	var p: Player = await _load_demo(W1_1)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Ribbiton:
			e.queue_free()  # climbing without the frog's help
	await _place(p, Vector2(5620, -2))
	press(0, "move_right")
	for k in 8:
		press(0, "jump")
		await frames(4)
		release(0, "jump")
		await frames(26)
		if p.global_position.y < -430.0 and p.is_on_floor():
			break
	await seconds(0.6)
	release(0, "move_right")
	check(p.global_position.y < -430.0 and p.global_position.x > 5700.0, "you should be able to climb onto the cliff (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_1_frog_bounce_clears_the_cliff() -> void:
	var p: Player = await _load_demo(W1_1)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Ribbiton and e.global_position.x < 7000.0:
			e.global_position = Vector2(5600, -2)
			e.sit_time = 100.0
			e._sit = 100.0
	await _place(p, Vector2(5420, -112))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "move_right")
	var best := 0.0
	for i in 150:
		await get_tree().physics_frame
		best = minf(best, p.global_position.y)
		if i > 40:
			press(0, "move_right")
	release(0, "move_right")
	release(0, "jump")
	check(best < -450.0, "a frog bounce should carry you above the cliff top (best %.0f)" % best)
	await _finish_demo()


func test_w1_1_dandelion_crosses_the_valley() -> void:
	var p: Player = await _load_demo(W1_1)
	await _place(p, Vector2(6760, -442))
	press(0, "move_right")
	await frames(8)
	press(0, "jump")
	await frames(30)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.x > 7720.0 and p.is_on_floor():
			landed = true
			break
	release(0, "move_right")
	check(landed and not p.is_bubbled(), "a dandelion puff should float you across (at %s, parachute %s)" % [p.global_position, p.parachute])
	await _finish_demo()


func test_w1_1_cave_mushroom_returns_you_to_the_cliff() -> void:
	var p: Player = await _load_demo(W1_1)
	await _place(p, Vector2(6800, 178))
	check(p.is_on_floor() and p.global_position.y > 150.0, "should stand in the cave (at %s)" % p.global_position)
	await _run_to(p, 6975, "move_right", 2.0)
	release(0, "move_right")
	await frames(20)
	press(0, "move_left")
	var ok := false
	for i in 360:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.y < -430.0:
			ok = true
			break
	release(0, "move_left")
	check(ok, "the mushroom should send you back up onto the cliff (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_1_pendulum_carries_you_to_the_goal_side() -> void:
	var p: Player = await _load_demo(W1_1)
	var pd: Pendulum = null
	for n in _demo.find_children("*", "Pendulum", true, false):
		pd = n
	check(pd != null, "the level should have a pendulum")
	# Wait until the log is at its left end, stand on it and ride.
	for i in 600:
		await get_tree().physics_frame
		if pd.angle() > pd.amplitude * 0.97:
			break
	var log_pos := pd.global_position + pd.log_position()
	p.global_position = log_pos + Vector2(0, -30)
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	for i in 600:
		await get_tree().physics_frame
		if pd.angle() < -pd.amplitude * 0.9:
			break
	press(0, "move_right")
	press(0, "jump")
	await frames(20)
	release(0, "jump")
	await seconds(1.5)
	release(0, "move_right")
	check(p.global_position.x > 10300.0 and p.global_position.y < -150.0 and not p.is_bubbled(), "jumping off at the far end should reach the goal ground (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_1_shell_bowls_over_the_grumblets() -> void:
	var p: Player = await _load_demo(W1_1)
	var shell: Shellbert = null
	var grunts: Array[Enemy] = []
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Shellbert:
			shell = e
		elif e is Grunt and e.global_position.x > 4400.0 and e.global_position.x < 4800.0:
			grunts.append(e)
	var sx := shell.global_position.x
	p.global_position = Vector2(sx, -200)
	p.velocity = Vector2.ZERO
	for i in 90:
		await get_tree().physics_frame
		if shell.st != Shellbert.St.WALK:
			break
	check(shell.st == Shellbert.St.SHELL, "stomping Shellbert should hide him")
	await _place(p, Vector2(sx - 90, -2))
	await _run_to(p, shell.global_position.x, "move_right", 1.0)
	release(0, "move_right")
	await seconds(1.5)
	var down := 0
	for g in grunts:
		if not is_instance_valid(g) or g.dead:
			down += 1
	check(down == grunts.size() and grunts.size() == 3, "the kicked shell should knock out all three Grumblets (%d/%d)" % [down, grunts.size()])
	await _finish_demo()


# --- World 1-2 Dandelion Drift bots ---------------------------------------------------

const W1_2 := "res://levels/w1_2_dandelion_drift.tscn"


func _clear_enemies() -> void:
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await frames(2)


func test_w1_2_leaves_cross_to_the_first_island() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(1350, -42))
	for x in [1600.0, 1860.0, 2120.0, 2380.0, 2700.0]:
		press(0, "move_right")
		press(0, "jump")
		for i in 90:
			await get_tree().physics_frame
			if p.global_position.x >= x - 50.0 and p.is_on_floor():
				break
			if p.global_position.x >= x - 60.0:
				release(0, "move_right")  # coast onto the leaf instead of overshooting
		release(0, "jump")
		release(0, "move_right")
		await frames(6)
	check(p.global_position.x > 2620.0 and p.global_position.y < -60.0 and not p.is_bubbled(), "hopping the leaves should reach the island (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_2_glide_through_updraft_to_high_island() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(3200, -82))
	press(0, "move_right")
	press(0, "jump")
	await frames(20)
	release(0, "jump")
	await frames(20)
	press(0, "jump")  # glide
	var rose := 0.0
	for i in 600:
		await get_tree().physics_frame
		rose = minf(rose, p.global_position.y)
		# Hover in the column until high, then drift right.
		if p.global_position.x > 3560.0 and rose > -900.0:
			release(0, "move_right")
			press(0, "move_left")
		else:
			release(0, "move_left")
			press(0, "move_right")
		if p.is_on_floor() and p.global_position.x > 4300.0:
			break
	release(0, "jump")
	release(0, "move_left")
	release(0, "move_right")
	check(rose < -900.0, "the updraft should lift a glider high (best %.0f)" % rose)
	check(p.global_position.x > 4300.0 and p.global_position.y < -480.0, "and you can glide on to the high island (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_2_dandelion_hop_to_island_a() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(4960, -502))
	press(0, "move_right")
	await frames(6)
	press(0, "jump")
	await frames(30)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		# Steer to stop over island A.
		if p.global_position.x > 6030.0:
			release(0, "move_right")
			press(0, "move_left")
		elif p.global_position.x < 5950.0:
			release(0, "move_left")
			press(0, "move_right")
		if p.is_on_floor() and p.global_position.x > 5880.0 and p.global_position.x < 6170.0:
			landed = true
			break
	release(0, "move_right")
	release(0, "move_left")
	check(landed, "a puff from the high island should reach island A (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_2_gale_valley_crossing() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(8200, -252))
	press(0, "move_right")
	await frames(6)
	press(0, "jump")
	await frames(30)
	release(0, "jump")
	var landed := false
	for i in 1800:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 10200.0:
			landed = true
			break
	release(0, "move_right")
	check(landed and not p.is_bubbled(), "the last puff + gale should carry you to the goal (at %s %s v%s chute %s floor %s)" % [p.global_position, p.state_machine.current_name(), p.velocity, p.parachute, p.is_on_floor()])
	await _finish_demo()


# --- World 1-3 Mossy Hollow bots ------------------------------------------------------

const W1_3 := "res://levels/w1_3_mossy_hollow.tscn"


func test_w1_3_punching_through_the_puffcaps() -> void:
	var p: Player = await _load_demo(W1_3)
	p.invulnerable_timer = 0.0
	await _place(p, Vector2(1500, -2))
	# Walk up to each Puffcap, wait for it to snooze, punch it.
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Puffcap:
			continue
		var pc := e as Puffcap
		if pc.global_position.x > 2400.0:
			continue
		for i in 600:
			await get_tree().physics_frame
			if pc.st == Puffcap.St.IDLE and pc._timer > 0.8:
				break
		p.global_position = Vector2(pc.global_position.x - 70.0, -2)
		p.facing = 1
		await frames(2)
		await _punch()
		await frames(20)
	var alive := 0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Puffcap and e.global_position.x < 2400.0 and not e.dead:
			alive += 1
	check(alive == 0, "punching Puffcaps between puffs should clear the corridor (%d left)" % alive)
	check(not p.is_bubbled(), "without getting sporeed")
	await _finish_demo()


func test_w1_3_geyser_shaft_reaches_the_corridor() -> void:
	var p: Player = await _load_demo(W1_3)
	await _clear_enemies()
	await _place(p, Vector2(5550, -2))
	# Ride geyser 1, drift right onto the ledge.
	var up := false
	for i in 600:
		await get_tree().physics_frame
		if p.global_position.y < -800.0:
			up = true
			press(0, "move_right")
		if up and p.is_on_floor():
			break
	release(0, "move_right")
	check(p.is_on_floor() and p.global_position.y < -770.0, "geyser 1 should get you onto the first ledge (at %s)" % p.global_position)
	# Walk into geyser 2, then drift right to the corridor.
	await _run_to(p, 6000, "move_right", 2.0)
	release(0, "move_right")
	var high := false
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -1250.0:
			high = true
		if high:
			press(0, "move_right")
		if high and p.is_on_floor() and p.global_position.x > 6250.0:
			break
	await _run_to(p, 6750, "move_right", 3.0)
	release(0, "move_right")
	check(p.global_position.x > 6600.0 and p.global_position.y < -1050.0, "geyser 2 should lift you to the upper corridor (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_lake_snoozling_is_reachable() -> void:
	var p: Player = await _load_demo(W1_3)
	await _clear_enemies()
	await _place(p, Vector2(7700, -620))
	var cage: SnoozlingCage = null
	for n in _demo.find_children("*", "SnoozlingCage", true, false):
		cage = n
	press(0, "move_down")
	press(0, "move_right")
	for i in 600:
		await get_tree().physics_frame
		if p.global_position.x > cage.global_position.x - 60.0:
			release(0, "move_right")
		if p.global_position.distance_to(cage.global_position) < 90.0:
			break
	release(0, "move_down")
	release(0, "move_right")
	p.facing = 1 if cage.global_position.x > p.global_position.x else -1
	await _punch()
	await frames(20)
	check(cage._opened, "you should be able to swim down and punch the cage open (player at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_mushroom_hops_over_the_brambles() -> void:
	var p: Player = await _load_demo(W1_3)
	await _clear_enemies()
	await _place(p, Vector2(8940, -602))
	press(0, "move_right")
	var ok := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 10050.0:
			ok = true
			break
		if p.is_bubbled():
			break
	release(0, "move_right")
	check(ok, "running right should bounce you from mushroom to mushroom and across (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	await _finish_demo()


# --- World 1-4 Bramble Bridges bots ---------------------------------------------------

const W1_4 := "res://levels/w1_4_bramble_bridges.tscn"


func test_w1_4_first_bridge_crossing() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(850, -2))
	await _run_to(p, 1760, "move_right", 4.0)
	release(0, "move_right")
	await seconds(0.5)
	check(p.global_position.x > 1700.0 and p.global_position.y < 0.0 and not p.is_bubbled(), "you should walk across the rope bridge (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_swinging_log_to_the_frog_deck() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	var pd: Pendulum = null
	for n in _demo.find_children("*", "Pendulum", true, false):
		if not n.spiked and n.global_position.x < 3000.0:
			pd = n
	await _place(p, Vector2(2280, -42))
	# Wait for the log to swing close, then jump onto it.
	for i in 900:
		await get_tree().physics_frame
		if pd.angle() > pd.amplitude * 0.95:
			break
	press(0, "move_right")
	press(0, "jump")
	for i in 70:
		await get_tree().physics_frame
		var lp := pd.global_position + pd.log_position()
		if p.global_position.x > lp.x - 20.0:
			release(0, "move_right")
	release(0, "move_right")
	release(0, "jump")
	var rode := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_on_floor() and absf(p.global_position.x - (pd.global_position + pd.log_position()).x) < 120.0:
			rode = true
		if rode and pd.angle() < -pd.amplitude * 0.9:
			break
	check(rode, "you should be able to jump onto the swinging log (at %s)" % p.global_position)
	press(0, "move_right")
	press(0, "jump")
	await frames(45)
	release(0, "jump")
	await seconds(1.2)
	release(0, "move_right")
	check(p.global_position.x > 3300.0 and p.global_position.y < -40.0 and not p.is_bubbled(), "and ride it over to the frog deck (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_zipline_to_the_next_tree() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(3900, -302))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 4920.0:
			landed = true
			break
	release(0, "move_right")
	check(landed, "the zipline should carry you to the next tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_ducking_under_the_spiky_log() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	var pd: Pendulum = null
	for n in _demo.find_children("*", "Pendulum", true, false):
		if n.spiked:
			pd = n
	var log_bottom := (pd.global_position + Vector2(0, pd.rope_length)).y
	await _place(p, Vector2(pd.global_position.x, -60))
	check(p.is_on_floor(), "should stand on the bridge under the log")
	press(0, "move_down")
	await seconds(3.0)
	release(0, "move_down")
	check(not p.is_bubbled(), "crouching should duck under the spiky log (log bottom %.0f, player %.0f)" % [log_bottom, p.global_position.y])
	await _finish_demo()


func test_w1_4_vine_climb_to_the_canopy() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(6800, -62))
	press(0, "move_right")
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"Climb":
			break
	release(0, "jump")
	release(0, "move_right")
	check(p.state_machine.current_name() == &"Climb", "jumping at the vine should grab it (%s)" % p.state_machine.current_name())
	press(0, "move_up")
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -1150.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	await seconds(1.0)
	release(0, "move_right")
	check(p.is_on_floor() and p.global_position.y < -1190.0 and p.global_position.x > 7000.0, "climbing to the top should get you onto the canopy deck (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_last_zipline_to_the_goal_tree() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(8800, -1242))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 9870.0:
			landed = true
			break
	release(0, "move_right")
	check(landed, "the long zipline should reach the goal tree (at %s)" % p.global_position)
	await _finish_demo()


# --- World 1-5 Millstream Rush bots ---------------------------------------------------

const W1_5 := "res://levels/w1_5_millstream_rush.tscn"


func test_w1_5_rafts_cross_the_river() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	await _place(p, Vector2(1150, -2))
	# Wait for a raft near the bank, hop on, ride, hop off at the far bank.
	var rafts := _demo.find_children("*", "LogRaft", true, false)
	var on_raft: LogRaft = null
	for i in 900:
		await get_tree().physics_frame
		for r in rafts:
			var lr := r as LogRaft
			if lr.global_position.x > 1280.0 and lr.global_position.x < 1380.0 and lr.modulate.a > 0.9 and lr.global_position.y < 200.0:
				on_raft = lr
		if on_raft:
			break
	check(on_raft != null, "a raft should drift past the bank")
	press(0, "move_right")
	press(0, "jump")
	for i in 60:
		await get_tree().physics_frame
		if p.global_position.x > on_raft.global_position.x - 10.0:
			release(0, "move_right")
	release(0, "jump")
	release(0, "move_right")
	for i in 2400:
		await get_tree().physics_frame
		if on_raft.global_position.x > 2800.0:
			break
	press(0, "move_right")
	press(0, "jump")
	await frames(40)
	release(0, "jump")
	await seconds(0.8)
	release(0, "move_right")
	check(p.global_position.x > 3010.0 and p.global_position.y < 10.0, "riding a raft should get you across dry (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_water_wheel_to_the_mill_roof() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	var wheel: Node2D = _demo.find_children("*", "PlatformWheel", true, false)[0]
	await _place(p, Vector2(4080, -2))
	# Hop onto whichever platform comes low on the left, then ride to the top.
	var rode := false
	for i in 1800:
		await get_tree().physics_frame
		if not rode and p.is_on_floor() and p.global_position.y < -60.0:
			rode = true
		if not rode and i % 60 == 0:
			press(0, "jump")
			await frames(4)
			release(0, "jump")
		if rode and p.global_position.y < wheel.global_position.y - 220.0 and p.global_position.x > wheel.global_position.x + 30.0:
			break  # at the top, just past the apex
	check(rode, "you should be able to board the wheel")
	press(0, "move_right")
	press(0, "jump")
	await frames(30)
	release(0, "jump")
	await seconds(1.0)
	release(0, "move_right")
	check(p.global_position.y < -540.0 and p.global_position.x > 4520.0, "the wheel should lift you onto the mill roof (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_rock_hops_over_the_rapids() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	await _place(p, Vector2(5180, -2))
	for target in [5485.0, 5795.0, 6115.0, 6435.0, 6755.0, 7000.0]:
		press(0, "move_right")
		press(0, "jump")
		for i in 120:
			await get_tree().physics_frame
			if p.global_position.x >= target - 40.0:
				release(0, "move_right")
			if p.is_on_floor() and absf(p.global_position.x - target) < 70.0 and i > 10:
				break
		release(0, "jump")
		release(0, "move_right")
		await frames(4)
		# The geyser on the second rock may toss you up: wait until you're down.
		for i in 300:
			if p.is_on_floor():
				break
			await get_tree().physics_frame
	check(p.global_position.x > 6920.0 and p.global_position.y < 10.0, "hopping the rocks should get you over the rapids (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_net_climb_beside_the_falls() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	await _place(p, Vector2(7405, -2))
	press(0, "move_up")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -1060.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(20)
	release(0, "jump")
	await seconds(0.8)
	release(0, "move_right")
	check(p.global_position.y < -1090.0 and p.global_position.x > 7440.0, "the net should take you up to the top of the falls (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_dam_zipline_to_the_goal() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	await _place(p, Vector2(10080, -1272))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var ok := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 10920.0:
			ok = true
			break
	release(0, "move_right")
	check(ok, "the dam zipline should reach the goal island (at %s)" % p.global_position)
	await _finish_demo()


# --- Baron Bristleback + World 1-6 -----------------------------------------------------

func test_baron_rolls_into_wall_gets_dazed_and_can_be_stomped() -> void:
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var b := _spawn_enemy("res://enemies/baron_bristleback.tscn", Vector2(-200, 0), 1) as BaronBristleback
	await frames(3)
	b.set_active(true)
	b.st = BaronBristleback.St.CURL
	b._timer = 0.1
	b.facing = 1
	p.global_position = Vector2(520, -2)  # between him and the wall: he rolls at us, into the wall
	await frames(2)
	var dazed := false
	for i in 600:
		await get_tree().physics_frame
		if b.st == BaronBristleback.St.DAZED and b.stun_timer > 0.0:
			dazed = true
			break
	check(dazed, "rolling into the wall should flip him over, dazed (st %d)" % b.st)
	var hp := b.health
	p.invulnerable_timer = 0.0
	p.global_position = b.global_position + Vector2(0, -260)
	p.velocity = Vector2.ZERO
	for i in 90:
		await get_tree().physics_frame
		if b.health < hp:
			break
	check(b.health == hp - 1, "a stomp on his belly should hurt him (%d -> %d)" % [hp, b.health])
	check(not p.is_bubbled(), "stomping a dazed Baron is safe")


func test_baron_upright_stomp_hurts_you() -> void:
	var b := _spawn_enemy("res://enemies/baron_bristleback.tscn", Vector2(0, 0)) as BaronBristleback
	await frames(3)
	var p := add_player(0, Vector2(0, -320))
	await seconds(0.8)
	check(p.is_bubbled(), "his quills should hurt anyone who stomps him upright")
	check(b.health == 6, "and he takes no damage")


const W1_6 := "res://levels/w1_6_thornwood_keep.tscn"


func test_w1_6_boss_fight_can_be_won() -> void:
	seed(20260930)  # the Baron picks moves at random: keep the test repeatable
	var p: Player = await _load_demo(W1_6)
	var baron: BaronBristleback = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is BaronBristleback:
			baron = e
		elif e.global_position.x < 9000.0:
			e.queue_free()
	check(baron != null and baron.asleep, "the Baron should be asleep in his arena")
	await _place(p, Vector2(9400, -1402))
	await frames(10)
	check(not baron.asleep, "walking into the arena should wake him")
	var gates := _demo.find_children("*", "Gate", true, false)
	for round in 24:
		if baron == null or not is_instance_valid(baron) or baron.dead:
			break
		p.invulnerable_timer = 100.0
		# Force a roll into the far wall, then stomp the dazed Baron.
		baron.st = BaronBristleback.St.CURL
		baron._timer = 0.05
		for i in 600:
			await get_tree().physics_frame
			if not is_instance_valid(baron) or (baron.st == BaronBristleback.St.DAZED and baron.stun_timer > 0.5):
				break
		if not is_instance_valid(baron):
			break
		p.invulnerable_timer = 0.0
		var hp := baron.health
		p.global_position = baron.global_position + Vector2(0, -300)
		p.velocity = Vector2.ZERO
		p.state_machine.transition_to(&"Fall")
		for i in 150:
			await get_tree().physics_frame
			if not is_instance_valid(baron) or baron.health < hp:
				break
		if p.is_bubbled():
			await seconds(2.5)  # (respawn - he naps again) then walk back in and try again
			await _place(p, Vector2(9400, -1402))
			await frames(10)
	check(baron == null or not is_instance_valid(baron) or baron.dead, "six belly-stomps should defeat the Baron (hp %d)" % (baron.health if is_instance_valid(baron) else 0))
	await seconds(1.5)
	var exit_open := false
	for g in gates:
		if g.global_position.x > 10200.0 and g.is_open():
			exit_open = true
	check(exit_open, "beating him should open the exit gate")
	await _finish_demo()


func test_w1_6_tower_climb_reaches_the_roof() -> void:
	var p: Player = await _load_demo(W1_6)
	await _clear_enemies()
	for n in _demo.find_children("*", "SpikeBall", true, false):
		n.queue_free()
	# Up the lift, then the zigzag ledges.
	await _place(p, Vector2(8240, -82))
	var lift: Node2D = _demo.find_children("*", "MovingPlatform", true, false)[0]
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -600.0:
			break
	check(p.global_position.y < -600.0, "the lift should carry you up (at %s)" % p.global_position)
	for target in [Vector2(8520, -700), Vector2(8770, -860), Vector2(8520, -1020), Vector2(8770, -1180), Vector2(8870, -1340), Vector2(8980, -1400)]:
		var dir := "move_right" if target.x > p.global_position.x else "move_left"
		press(0, dir)
		press(0, "jump")
		for i in 120:
			await get_tree().physics_frame
			if (dir == "move_right" and p.global_position.x >= target.x - 30.0) or (dir == "move_left" and p.global_position.x <= target.x + 30.0):
				release(0, dir)
			if p.is_on_floor() and i > 12:
				break
		release(0, "jump")
		release(0, dir)
		await frames(6)
	check(p.global_position.y < -1390.0 and p.global_position.x > 8900.0, "you should reach the roof (at %s)" % p.global_position)
	await _finish_demo()


# --- Mechanics polish ----------------------------------------------------------------

func test_air_punch_slows_your_fall() -> void:
	var p := add_player(0, Vector2(0, -900))
	await seconds(0.5)
	check(p.velocity.y > 400.0, "should be falling fast first (vy %.0f)" % p.velocity.y)
	await _punch()
	await frames(3)
	check(p.velocity.y <= p.tuning.air_punch_fall_cap + 1.0, "an air punch should brake the fall (vy %.0f)" % p.velocity.y)


func test_stomp_chain_bounces_higher_and_pays_lums() -> void:
	var p := add_player(0, Vector2(0, -600))
	await frames(2)
	p.invulnerable_timer = 100.0
	var lums0 := GameManager.lums
	var heights: Array[float] = []
	for i in 3:
		p.velocity = Vector2(0, 600)
		p.state_machine.transition_to(&"Fall")
		p.bounce(0.85)
		p.register_stomp()
		heights.append(-p.velocity.y)
	check(p.stomp_chain == 3, "three stomps without landing = a chain of 3 (%d)" % p.stomp_chain)
	check(heights[2] > heights[0] + 10.0, "chained stomps should bounce higher (%s)" % [heights])
	await frames(3)
	var popped := 0
	for c in get_tree().root.find_children("*", "", true, false):
		if c is Lum:
			popped += 1
	check(popped >= 1, "the third chained stomp should pop a bonus Lum")
	await seconds(2.0)
	check(p.is_on_floor() and p.stomp_chain == 0, "landing resets the chain")


func test_dream_bell_rings_a_lum_rush_that_doubles_lums() -> void:
	GameManager.lum_rush = 0.0
	var bell := DreamBell.new()
	bell.position = Vector2(0, 0)
	_arena.add_child(bell)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	check(GameManager.lum_rush == 0.0, "walking under the bell shouldn't ring it")
	press(0, "jump")
	await seconds(0.35)
	release(0, "jump")
	check(GameManager.lum_rush > 5.0, "jumping into the bell should start a Lum Rush (%.1f s)" % GameManager.lum_rush)
	check(not bell.is_ready(), "a rung bell dozes until it recharges")
	await settle(p)
	var lums0 := GameManager.lums
	var lum: Lum = load("res://collectibles/lum.tscn").instantiate()
	lum.position = p.global_position + Vector2(0, -30)
	_arena.add_child(lum)
	await frames(4)
	check(GameManager.lums == lums0 + 2, "during a Lum Rush a Lum counts double (%d -> %d)" % [lums0, GameManager.lums])
	GameManager.lum_rush = 0.0


func test_dream_bell_can_be_punched() -> void:
	GameManager.lum_rush = 0.0
	var bell := DreamBell.new()
	bell.position = Vector2(60, 0)
	_arena.add_child(bell)
	var p := add_player(0, Vector2(-30, -2))
	await settle(p)
	bell.take_hit(p, Vector2.RIGHT)
	check(GameManager.lum_rush > 0.0, "punching the bell rings it too")
	var left := GameManager.lum_rush
	bell.take_hit(p, Vector2.RIGHT)
	check(GameManager.lum_rush <= left, "a dozing bell just clanks (no extra time)")
	GameManager.lum_rush = 0.0


func test_snow_pile_rolls_a_growing_snowball_that_bowls_enemies() -> void:
	var pile := SnowPile.new()
	pile.position = Vector2(-300, 0)
	_arena.add_child(pile)
	var g := _spawn_enemy("res://enemies/grunt.tscn", Vector2(200, 0))
	g.walk_speed = 0.0
	g.sight = 0.0
	var p := add_player(0, Vector2(-420, -2))
	await settle(p)
	pile.take_hit(p, Vector2.RIGHT)
	var ball: Snowball = null
	for c in _arena.get_children():
		if c is Snowball:
			ball = c
	check(ball != null and ball.direction > 0.0, "punching the pile from the left rolls a snowball to the right")
	if ball == null:
		return
	await seconds(0.6)
	check(is_instance_valid(ball) and ball.radius > ball.start_radius + 5.0, "the snowball grows as it rolls")
	await seconds(1.0)
	check(not is_instance_valid(g) or g.dead, "the snowball should flatten the Grumblet")
	await seconds(1.5)
	check(not is_instance_valid(ball), "the snowball bursts on the wall")
	check(not p.is_bubbled(), "snowballs never hurt players")


func test_avalanche_catches_players_who_dawdle_and_resets() -> void:
	var av := Avalanche.new()
	av.position = Vector2(-900, 0)
	av.distance = 3000.0
	av.speed = 500.0
	_arena.add_child(av)
	var p := add_player(0, Vector2(-300, -2))
	await settle(p)
	av.set_active(true)
	await seconds(1.6)
	check(p.is_bubbled() or p.state_machine.current_name() == &"Bubble", "standing still, the avalanche catches you")
	check(av.front_x() > -300.0, "the avalanche rolls forward (front %.0f)" % av.front_x())
	GameManager.checkpoint = Vector2(-2000, 0)
	EventBus.level_reset.emit()
	await frames(2)
	check(not av.active and absf(av.front_x() + 900.0) < 1.0, "a level reset puts it back, waiting")


func test_gondola_carries_riders_along_its_cable() -> void:
	var gd := Gondola.new()
	gd.position = Vector2(-200, -300)
	gd.waypoints = PackedVector2Array([Vector2(400, -200)])
	gd.speed = 200.0
	gd.wait_time = 0.0
	gd.one_way = true
	_arena.add_child(gd)
	var p := add_player(0, Vector2(-100, -340))
	await seconds(1.2)
	check(p.global_position.x > 0.0 and p.global_position.y < -400.0,
			"a rider is carried up the cable (at %s)" % p.global_position)


func test_slidgewick_toboggans_at_you_and_a_stomp_stops_it() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	var s := _spawn_enemy("res://enemies/slidgewick.tscn", Vector2(-350, 0), 1) as Slidgewick
	var slid := false
	for i in 120:
		await get_tree().physics_frame
		if s.st == Slidgewick.St.SLIDE:
			slid = true
			break
	check(slid, "it should flap, then belly-slide at the player")
	check(s.blocks_hit(p, Enemy.HitKind.PUNCH), "a sliding penguin's beak shrugs off punches from the front")
	s._on_stomped(p)
	check(not s.dead and s.st == Slidgewick.St.SKID, "stomping a sliding penguin stops it, dazed")
	s.take_hit(p, Vector2(300, -100))
	await frames(2)
	check(not is_instance_valid(s) or s.dead, "a stopped penguin can be punched out")


func test_snowl_drops_snowballs_on_players_below() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var o := _spawn_enemy("res://enemies/snowl.tscn", Vector2(0, -420)) as Snowl
	o.patrol_offset = Vector2.ZERO
	var dropped := false
	for i in 150:
		await get_tree().physics_frame
		for c in _arena.get_children():
			if c is Projectile:
				dropped = true
		if dropped:
			break
	check(dropped, "a Snowl should drop a snowball on someone underneath")
	await seconds(1.0)
	check(p.is_bubbled() or p.state_machine.current_name() == &"Bubble", "the dropped snowball should hit a player who stands still")


func test_yetling_lobs_snowballs_and_takes_two_hits() -> void:
	var p := add_player(0, Vector2(-100, -2))
	await settle(p)
	var y := _spawn_enemy("res://enemies/yetling.tscn", Vector2(420, 0)) as Yetling
	var landed_near := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_bubbled() or p.state_machine.current_name() == &"Bubble":
			landed_near = true
			break
	check(landed_near, "a Yetling's lobbed snowball should find a player who stands still")
	y.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(not y.dead, "one hit isn't enough for a Yetling")
	await seconds(0.8)
	y.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(y.dead, "two hits knock it out")


func test_grumblefrost_is_dazed_by_his_own_boulder_punched_back() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).queue_free()
	var b := _spawn_enemy("res://enemies/grumblefrost.tscn", Vector2(500, 0), -1) as Grumblefrost
	var p := add_player(0, Vector2(-200, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	b.set_active(true)
	await frames(2)
	b._throw_boulder()
	var boulder: Snowball = null
	for c in _arena.get_children():
		if c is Snowball:
			boulder = c
	check(boulder != null and boulder.hostile, "he heaves a hostile snow boulder")
	if boulder == null:
		return
	await seconds(0.3)
	boulder.take_hit(p, Vector2.RIGHT)
	check(not boulder.hostile and boulder.direction > 0.0, "a punch sends the boulder back at him")
	var dazed := false
	for i in 180:
		await get_tree().physics_frame
		if b.st == Grumblefrost.St.DAZED:
			dazed = true
			break
	check(dazed, "his own boulder knocks him flat")
	var hp := b.health
	b._on_stomped(p)
	check(b.health == hp - 1, "a dazed yeti can be stomped (hp %d -> %d)" % [hp, b.health])
	check(not b.blocks_hit(p, Enemy.HitKind.PROJECTILE), "boulders always get through")


# --- World 2 bots -------------------------------------------------------------------------

## Hold right (sprinting if asked); tap JUMP each time x passes one of `jump_at`.
## Stops at `end_x` or after `max_s`. Returns true if it got there without bubbling.
func _hop_run(p: Player, jump_at: Array, end_x: float, sprint := false, max_s := 12.0) -> bool:
	press(0, "move_right")
	if sprint:
		press(0, "sprint")
	var k := 0
	var held := 0
	for i in int(max_s * 120):
		await get_tree().physics_frame
		if held > 0:
			held -= 1
			if held == 0:
				release(0, "jump")
		while k < jump_at.size() and p.global_position.x > float(jump_at[k]) + 140.0:
			k += 1  # overshot this take-off point in the air: skip it
		if k < jump_at.size() and p.global_position.x >= float(jump_at[k]) and (p.is_on_floor() or p.coyote_timer > 0.0) and held == 0:
			press(0, "jump")
			held = 46
			k += 1
		if p.global_position.x >= end_x and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "sprint")
	release(0, "jump")
	return p.global_position.x >= end_x and not p.is_bubbled()


func _nodes_of(script_class: String) -> Array[Node]:
	return _demo.find_children("*", script_class, true, false)


const W2_1 := "res://levels/w2_1_snowball_slopes.tscn"


func test_w2_1_first_snowball_bowls_the_line_of_grumblets() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(1440, -2))
	var pile: SnowPile = null
	for n in _nodes_of("SnowPile"):
		if absf(n.global_position.x - 1560.0) < 10.0:
			pile = n
	pile.take_hit(p, Vector2.RIGHT)
	await seconds(4.0)
	var alive := 0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Grunt and not e.dead and e.global_position.x > 1900.0 and e.global_position.x < 2300.0:
			alive += 1
	check(alive == 0, "the snowball should flatten all three Grumblets (%d left)" % alive)
	var wall_broken := true
	for b in _nodes_of("BreakableBlock"):
		if absf(b.global_position.x - 2700.0) < 5.0 and b.collision_layer != 0:
			wall_broken = false
	check(wall_broken, "...and burst through the cracked wall")
	await _finish_demo()


func test_w2_1_big_snowball_smashes_the_ice_gate() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4740, -2))
	for n in _nodes_of("SnowPile"):
		if absf(n.global_position.x - 4800.0) < 10.0:
			n.take_hit(p, Vector2.RIGHT)
	var broken := false
	for i in 900:
		await get_tree().physics_frame
		for b in _nodes_of("BreakableBlock"):
			if absf(b.global_position.x - 6560.0) < 5.0 and b.collision_layer == 0:
				broken = true
		if broken:
			break
	check(broken, "a snowball rolled down the big slope should smash the packed-ice gate")
	await _finish_demo()


func test_w2_1_ski_jump_is_makeable_with_a_sprint() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	for b in _nodes_of("BreakableBlock"):
		b.take_hit(null, Vector2.ZERO)
	await _place(p, Vector2(7150, 638))
	var ok := await _hop_run(p, [7600], 8100, true, 6.0)
	check(ok, "a sprint jump off the kicker should clear the gap (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_1_pit_mushroom_returns_you_to_the_kicker() -> void:
	var p: Player = await _load_demo(W2_1)
	await _place(p, Vector2(7800, 998))
	await _run_to(p, 7720, "move_left", 2.0)
	var ok := false
	for i in 360:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.y < 700.0:
			release(0, "move_left")
			ok = true
			break
	release(0, "move_left")
	check(ok, "the mushroom in the pit should send you back up (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_1_drifts_can_be_hopped_to_the_goal() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(8560, 638))
	var ok := await _hop_run(p, [8650, 9170, 9700, 10240], 10500, false, 10.0)
	check(ok, "the floating drifts should be hoppable (at %s)" % p.global_position)
	await _finish_demo()


const W2_2 := "res://levels/w2_2_cablecar_cliffs.tscn"


## Stand on the chair at `board`, ride to the top, then walk off right to x > `off_x`.
func _ride_lift(p: Player, board: Vector2, off_x: float, top_y: float) -> bool:
	await _place(p, board)
	for i in 1800:
		await get_tree().physics_frame
		if p.global_position.x >= off_x - 260.0 and absf(p.global_position.y - top_y) < 6.0:
			break
	await _run_to(p, off_x + 40.0, "move_right", 2.0)
	release(0, "move_right")
	await seconds(0.3)
	return p.is_on_floor() and absf(p.global_position.y - top_y) < 10.0 and p.global_position.x > off_x


func test_w2_2_first_chairlift_reaches_the_station() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	var ok := await _ride_lift(p, Vector2(1320, -4), 2560.0, -600.0)
	check(ok, "the first chairlift should carry you up to the gusty ledges (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_crumbling_ledges_in_the_headwind() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(2900, -602))
	var ok := await _hop_run(p, [2990, 3240, 3500, 3750], 3900, true, 8.0)
	check(ok, "the crumbling ledges should be crossable in the wind (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_second_chairlift_reaches_the_upper_station() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	var ok := await _ride_lift(p, Vector2(4570, -624), 5720.0, -1250.0)
	check(ok, "the second chairlift should reach the upper station (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_ice_staircase_climbs_to_the_summit_deck() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6300, -1252))
	var ok := await _hop_run(p, [6370, 6730, 7130, 7530], 7800, false, 8.0)
	check(ok, "the icy steps should lead up to the summit deck (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_zipline_goes_down_to_the_goal() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(8550, -1852))
	var ok := await _hop_run(p, [8640], 9900, false, 8.0)
	check(ok, "the zipline should carry you down to the bottom station (at %s)" % p.global_position)
	await _finish_demo()


const W2_3 := "res://levels/w2_3_crystal_caverns.tscn"


## Jump from where you stand toward `dir` (holding it), until you land. Returns the landing spot.
func _leap(p: Player, dir: String, hold := 30) -> Vector2:
	press(0, dir)
	press(0, "jump")
	await frames(hold)
	release(0, "jump")
	for i in 240:
		await get_tree().physics_frame
		if p.is_on_floor() and i > 4:
			break
	release(0, dir)
	await frames(6)
	return p.global_position


func test_w2_3_icicle_corridor_can_be_run_through() -> void:
	var p: Player = await _load_demo(W2_3)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Yetling:
			e.queue_free()
	await _place(p, Vector2(1800, -2))
	var ok := await _hop_run(p, [], 3150, true, 6.0)
	check(ok, "sprinting through the icicle corridor should be safe (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	await _finish_demo()


func test_w2_3_slide_and_lake_lead_to_the_far_shore() -> void:
	var p: Player = await _load_demo(W2_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3150, -2))
	press(0, "move_right")
	var ok := false
	for i in 1800:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"Swim" and i % 30 == 0:
			press(0, "jump")
		elif i % 30 == 10:
			release(0, "jump")
		if p.global_position.x > 6720.0 and p.is_on_floor():
			ok = true
			break
	release(0, "move_right")
	release(0, "jump")
	check(ok, "slide down, swim the lake and climb out the far side (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_3_crystal_ledges_climb_to_the_top() -> void:
	var p: Player = await _load_demo(W2_3)
	p.invulnerable_timer = 100.0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Snowl:
			e.queue_free()
	await _place(p, Vector2(6900, 478))
	var steps := [["move_right", 340.0], ["move_right", 200.0], ["move_left", 60.0], ["move_right", -80.0], ["move_left", -220.0],
			["move_right", -360.0], ["move_right", -400.0]]
	for s in steps:
		var at: Vector2 = await _leap(p, s[0], 50)
		if absf(at.y - float(s[1])) > 8.0:
			check(false, "the crystal climb should reach y %.0f (landed at %s)" % [s[1], at])
			await _finish_demo()
			return
	check(p.global_position.x > 7650.0, "the climb should end on the upper tunnel (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_3_crushers_can_be_outrun() -> void:
	var p: Player = await _load_demo(W2_3)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Slidgewick:
			e.queue_free()
	await _place(p, Vector2(8700, -402))
	var ok := await _hop_run(p, [], 9800, true, 5.0)
	check(ok, "sprinting under the crushers should get you through (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	await _finish_demo()


const W2_4 := "res://levels/w2_4_avalanche_alley.tscn"


func test_w2_4_the_avalanche_can_be_outrun_to_the_bottom() -> void:
	var p: Player = await _load_demo(W2_4)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()  # the bot doesn't fight; it just runs
	var ava: Avalanche = _nodes_of("Avalanche")[0]
	await _place(p, Vector2(1200, -2))
	var ok := await _hop_run(p, [2975, 5175, 7375, 9490], 10000, true, 40.0)
	check(ava.active or ava._done, "crossing the valley should set off the avalanche")
	check(ok, "sprinting and hopping the crevasses should outrun the avalanche (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	await _finish_demo()


func test_w2_4_avalanche_restarts_behind_a_mid_chase_checkpoint() -> void:
	var p: Player = await _load_demo(W2_4)
	var ava: Avalanche = _nodes_of("Avalanche")[0]
	gm().checkpoint = Vector2(4280, 404)
	EventBus.level_reset.emit()
	await frames(2)
	check(not ava.active and absf(ava.front_x() - (4280.0 - ava.respawn_lead)) < 2.0, "it waits behind the checkpoint")
	await seconds(ava.restart_delay + 0.3)
	check(ava.active, "...then comes again by itself")
	await _finish_demo()


const W2_5 := "res://levels/w2_5_hot_spring_hollow.tscn"


func test_w2_5_geysers_carry_you_up_the_terraces() -> void:
	var p: Player = await _load_demo(W2_5)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	for vent in [Vector2(1620, -2), Vector2(2150, -302), Vector2(2650, -602)]:
		await _place(p, vent)
		var launched := false
		for i in 600:
			await get_tree().physics_frame
			if p.velocity.y < -600.0:
				launched = true
				break
		check(launched, "the geyser at %s should launch you" % vent)
		press(0, "move_right")
		for i in 240:
			await get_tree().physics_frame
			if p.is_on_floor() and p.global_position.x > vent.x + 90.0:
				break
		release(0, "move_right")
		check(p.global_position.y < vent.y - 250.0, "...up onto the next terrace (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_5_canyon_rocks_can_be_hopped() -> void:
	var p: Player = await _load_demo(W2_5)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await _place(p, Vector2(4050, -902))
	var ok := await _hop_run(p, [4185, 4625, 5065, 5545], 5900, false, 8.0)
	check(ok, "the floating rocks should be hoppable (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_5_thermal_lifts_you_out_of_the_canyon() -> void:
	var p: Player = await _load_demo(W2_5)
	await _place(p, Vector2(5300, 298))
	check(p.is_on_floor() and p.global_position.y > 250.0, "should stand on the warm rock (at %s)" % p.global_position)
	press(0, "jump")
	await frames(40)
	release(0, "jump")
	await frames(4)
	press(0, "jump")  # glide (SECOND_PRESS)
	var best := 9999.0
	for i in 480:
		await get_tree().physics_frame
		best = minf(best, p.global_position.y)
	release(0, "jump")
	check(best < -900.0, "gliding in the thermal should lift you back above the rocks (best %.0f)" % best)
	await _finish_demo()


const W2_6 := "res://levels/w2_6_grumblefrost_summit.tscn"


func test_w2_6_lift_ridge_and_net_reach_the_summit() -> void:
	var p: Player = await _load_demo(W2_6)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e.global_position.x < 8500.0:
			e.queue_free()
	var ok := await _ride_lift(p, Vector2(1620, -4), 2760.0, -700.0)
	check(ok, "the last lift should reach the ridge (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	ok = await _hop_run(p, [3090, 3330], 4150, true, 6.0)
	check(ok, "the ridge should be crossable in the wind (at %s)" % p.global_position)
	await _place(p, Vector2(8080, -702))  # (past the tollgate and the outpost - they have their own tests)
	await _run_to(p, 8155, "move_right", 2.0)
	release(0, "move_right")
	press(0, "move_up")
	for i in 600:
		await get_tree().physics_frame
		if p.global_position.y < -1300.0:
			break
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_up")
	release(0, "move_right")
	check(p.is_on_floor() and absf(p.global_position.y + 1400.0) < 6.0, "climbing the net should reach the summit (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_6_grumblefrost_can_be_beaten_with_his_own_boulders() -> void:
	seed(20261001)
	var p: Player = await _load_demo(W2_6)
	var boss: Grumblefrost = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Grumblefrost:
			boss = e
		else:
			e.queue_free()
	check(boss != null and boss.asleep, "Grumblefrost should be asleep in his arena")
	await _place(p, Vector2(8850, -1402))
	await frames(10)
	check(not boss.asleep, "walking into the arena should wake him")
	var reflected := 0
	for round in 30:
		if not is_instance_valid(boss) or boss.dead:
			break
		p.invulnerable_timer = 100.0
		# Stand left of him, facing him; wait for a boulder, then PUNCH it back.
		p.global_position = Vector2(boss.global_position.x - 420.0, -1402.0)
		p.velocity = Vector2.ZERO
		p.facing = 1
		boss.st = Grumblefrost.St.WALK
		boss.stun_timer = 0.0
		boss._throw_boulder()
		var hit := false
		for i in 300:
			await get_tree().physics_frame
			for c in boss.get_parent().get_children():
				if c is Snowball and c.hostile and absf(c.global_position.x - p.global_position.x) < 150.0 and not hit:
					press(0, "attack")
					await frames(3)
					release(0, "attack")
					hit = true
			if boss.st == Grumblefrost.St.DAZED:
				break
		if boss.st != Grumblefrost.St.DAZED:
			continue
		reflected += 1
		var hp := boss.health
		p.global_position = boss.global_position + Vector2(0, -320)
		p.velocity = Vector2.ZERO
		p.state_machine.transition_to(&"Fall")
		for i in 150:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.health < hp:
				break
		await seconds(0.5)
	check(reflected > 0, "punching a boulder back should knock him down")
	check(not is_instance_valid(boss) or boss.dead, "six stomps should beat Grumblefrost (hp %d)" % (boss.health if is_instance_valid(boss) else 0))
	await seconds(1.5)
	var exit_open := false
	for g in _demo.find_children("*", "Gate", true, false):
		if g.global_position.x > 9800.0 and g.is_open():
			exit_open = true
	check(exit_open, "beating him should open the exit gate")
	await _finish_demo()


func test_world_maps_build_for_every_world_with_gates() -> void:
	for w in ["w1", "w2", "w3", "w4", "w5"]:
		WorldMap.world = w
		var m: WorldMap = load("res://ui/world_map.tscn").instantiate()
		_arena.add_child(m)
		await frames(3)
		var ids: Array = []
		for n in m.nodes:
			ids.append(n["id"])
		check(ids.has(w + "_1") and ids.has(w + "_6"), "the %s map should list its six levels (%s)" % [w, ids])
		var back := LevelCatalog.previous_world(w)
		var onward := LevelCatalog.next_world(w)
		check(back == "" or ids.has("gate_" + back), "the %s map should have a gate back to %s (%s)" % [w, back, ids])
		check(onward == "" or ids.has("gate_" + onward), "the %s map should have a gate on to %s (%s)" % [w, onward, ids])
		m.queue_free()
		await frames(2)
	WorldMap.world = "w1"
	check(LevelCatalog.previous_world("w2") == "w1" and LevelCatalog.world_number("w2") == 2, "worlds are in order")


func test_wardrobe_dresses_characters_and_unlocks_with_gems() -> void:
	var base: CharacterDef = GameManager.CHARACTERS[0]
	check(Wardrobe.dress(base, 0) == base, "the Classic outfit is the character itself")
	var d := Wardrobe.dress(base, 1)
	check(d != base and d.main_color == Wardrobe.OUTFITS[1]["main"] and d.display_name == base.display_name, "an outfit recolours a copy")
	check(Wardrobe.base_of(d) == base, "a dressed dreamer still knows who they are")
	check(Wardrobe.is_unlocked(0), "Classic is always available")
	var t := Wardrobe.totals()
	check(Wardrobe.is_unlocked(1) == (t["gems"] >= 6), "Sunset unlocks at 6 Dream Gems (have %d)" % t["gems"])


func test_hit_stop_is_a_short_blink_and_always_releases() -> void:
	Vfx.hit_stop_enabled = true
	Vfx.hit_stop(0.04)
	Vfx.hit_stop(5.0)       # an over-long request is capped
	Vfx.hit_stop(0.03)
	check(Engine.time_scale < 1.0, "a hit-stop slows time for a blink")
	var t0 := Time.get_ticks_msec()
	while Time.get_ticks_msec() - t0 < 200:
		await get_tree().process_frame
	check(Engine.time_scale == 1.0, "after 0.2 s real time everything runs at full speed again (%.2f)" % Engine.time_scale)
	Vfx.hit_stop_enabled = false
	Engine.time_scale = 1.0


# --- Online play (Net) with the in-memory transport ---------------------------------------

var _net_t := 0.0


## Go online as the host on a fake connection (restored by _net_end).
func _net_host() -> NetTransport:
	var tr := NetTransport.new()
	Net.transport = tr
	Net.host_game()
	for i in 3:
		await get_tree().process_frame
	Net.level_loaded(_arena)  # as if the level had loaded while online
	return tr


func _net_end() -> void:
	Net.leave()
	Net.transport = NetTransport.WebTransport.new()
	for s in router().get_bound_slots():
		router().unbind_slot(s)
	await frames(2)


## One packet from friend "f1" (a client in slot `slot`) with their dreamer at `pos`.
func _friend_packet(tr: NetTransport, pos: Vector2, state := &"Ground", flags := 1, events: Array = []) -> void:
	var me: Player = gm().players.get(0)
	var idx := me.state_machine.index_of(state) if me else 0
	var pk := {"v": 1, "r": "c", "t": Time.get_ticks_msec(), "s": 1, "lb": [2, 0, 1], "ld": Net.epoch,
			"ak": [["me", 0]], "pe": Net.epoch,
			"p": [pos.x, pos.y, 0, 0, 1, idx, flags, 0, 0, 0, 72, -30, 0, -1, 0, -70, 0, 0]}
	if not events.is_empty():
		pk["ev"] = events
	tr.inject("f1", pk)


func _feed_friend(tr: NetTransport, from: Vector2, to: Vector2, secs: float, state := &"Ground") -> void:
	var n := int(secs * 20.0)
	for i in n + 1:
		_friend_packet(tr, from.lerp(to, float(i) / n), state)
		await seconds(0.05)


func test_net_friend_appears_as_a_puppet_that_follows_their_stream() -> void:
	var me := add_player(0, Vector2(0, -2))
	var tr: NetTransport = await _net_host()
	check(Net.is_host() and Net.my_slot == 0, "hosting gives us slot 0")
	await _feed_friend(tr, Vector2(200, -2), Vector2(200, -2), 0.3)
	var pup: Player = gm().players.get(1)
	check(pup != null and pup.remote, "the friend got slot 1 and a puppet")
	if pup == null:
		await _net_end()
		return
	check(pup.character.display_name == gm().CHARACTERS[2].display_name, "puppet wears the friend's pick (lobby char 2)")
	await _feed_friend(tr, Vector2(200, -2), Vector2(700, -2), 1.0)
	await _feed_friend(tr, Vector2(700, -2), Vector2(700, -2), 0.4)
	check(absf(pup.global_position.x - 700.0) < 20.0, "puppet reached the friend's spot (x=%.0f)" % pup.global_position.x)
	check(pup.is_on_floor(), "puppet stands on the floor like a real body")
	check(me.state_machine.current_name() != &"Bubble", "our dreamer untouched")
	# Their dreamer can't be hurt by our world: only their browser decides.
	pup.hurt()
	check(not pup.is_bubbled(), "puppets ignore hurt()")
	# A packet saying they're bubbled shows the bubble.
	for i in 8:
		_friend_packet(tr, Vector2(700, -200), &"Bubble", 0)
		await seconds(0.05)
	check(pup.is_bubbled(), "friend's bubble shows on our screen")
	await _net_end()


func test_net_friends_hits_land_here_and_ours_are_sent() -> void:
	var me := add_player(0, Vector2(0, -2))
	var tr: NetTransport = await _net_host()
	var grunt: Enemy = load("res://enemies/grunt.tscn").instantiate()
	grunt.position = Vector2(500, -2)
	grunt.health = 2
	_arena.add_child(grunt)
	await _feed_friend(tr, Vector2(430, -2), Vector2(430, -2), 0.3)
	var path := String(_arena.get_path_to(grunt))
	# The friend's punch arrives as an event.
	_friend_packet(tr, Vector2(430, -2), &"Punch", 1, [[1, Net.epoch, "hit", 1, path, 300.0, -200.0, 0.0, "Punch"]])
	await frames(3)
	check(grunt.health == 1, "friend's punch hurt the enemy here (health %d)" % grunt.health)
	# Replaying the same packet doesn't hit twice.
	_friend_packet(tr, Vector2(430, -2), &"Punch", 1, [[1, Net.epoch, "hit", 1, path, 300.0, -200.0, 0.0, "Punch"]])
	await frames(3)
	check(grunt.health == 1, "events apply once")
	# Our own punch goes out as an event.
	grunt.global_position = Vector2(70, -2)
	grunt.velocity = Vector2.ZERO
	grunt.stun_timer = 5.0
	await frames(2)
	me.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(0.3)
	var sent_hit := false
	for pk in tr.sent:
		for e: Array in pk.get("ev", []):
			if e[2] == "hit" and e[4] == path:
				sent_hit = true
	check(sent_hit, "our punch was sent to friends")
	await _net_end()


func test_net_host_steers_friends_scene_and_hands_out_slots() -> void:
	# As a client: the host's packet gives us our slot.
	var tr := NetTransport.new()
	Net.transport = tr
	Net.change_scenes = false
	Net.join_game("abcd")
	check(Net.code == "ABCD", "codes are upper-case")
	tr.inject("h1", {"v": 1, "r": "h", "t": Time.get_ticks_msec(), "s": 0, "lb": [0, 0, 0], "ld": 0,
			"ak": [], "sc": "", "ep": 0, "go": -1, "w": "w1", "mi": 2, "sl": [["me", 2]]})
	await frames(3)
	check(Net.my_slot == 2, "the host gave us slot 2 (got %d)" % Net.my_slot)
	await frames(2)
	check(Net.is_client(), "joined as a client")
	check(router().get_bound_slots() == [2], "our keys and pads now drive slot 2")
	check(int(Net.host_value("mi", -1)) == 2, "we can read the host's map cursor")
	await seconds(0.15)  # a packet goes out every 0.05 s
	var sent_hello := false
	for pk in tr.sent:
		sent_hello = sent_hello or pk.get("r") == "c"
	check(sent_hello, "we told the host we're here")
	# The host closing their tab ends the game for us.
	tr.drop("h1")
	await frames(2)
	check(Net.mode == Net.Mode.OFFLINE and Net.error != "", "host leaving drops us back offline with a message")
	Net.change_scenes = true
	await _net_end()


func test_w1_1_orchard_hill_runs_to_the_new_gate() -> void:
	var p: Player = await _load_demo(W1_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12300, -202))
	var ok: bool = await _hop_run(p, [12860], 15450, false, 16.0)
	check(ok, "Orchard Hill: crates, the apple-tree mushroom and the stairs lead to Moonflower Brook (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_1_moonflower_brook_and_pillow_hills_reach_the_gate() -> void:
	var p: Player = await _load_demo(W1_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(15450, -202))
	var ok: bool = await _hop_run(p, [], 19720, false, 18.0)
	check(ok or gm().level_complete, "over both rope bridges and the hills (at %s)" % p.global_position)
	check(gm().level_complete, "the hilltop Dream Gate completes Pillow Meadow")
	await _finish_demo()


func test_w1_1_pillow_mushroom_reaches_the_sleepy_cloud() -> void:
	var p: Player = await _load_demo(W1_1)
	await _clear_enemies()
	await _place(p, Vector2(19120, -182))
	var high := 0.0
	for i in 300:
		await get_tree().physics_frame
		high = minf(high, p.global_position.y)
		if p.global_position.y < -760.0:
			press(0, "move_right")
		if p.global_position.x > 19400.0:
			release(0, "move_right")
		if i > 30 and p.is_on_floor():
			break
	release(0, "move_right")
	check(p.global_position.y < -700.0, "the mushroom bounces you onto the cloud island (highest %.0f, at %s)" % [high, p.global_position])
	await _finish_demo()


func test_w1_1_stream_can_be_swum_across() -> void:
	var p: Player = await _load_demo(W1_1)
	await _place(p, Vector2(11600, -202))
	# Walk straight into the stream (no ferry), swim right, leap out onto the far bank.
	p.invulnerable_timer = 100.0  # (the bank's Grumblet wanders over sometimes)
	press(0, "move_right")
	for i in 900:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"Swim":
			press(0, "move_up")  # swim up to the surface while heading across
			if p.global_position.x > 12120 and i % 20 == 0:
				press(0, "jump")  # at the far bank: leap out
		if i % 20 == 8:
			release(0, "jump")
		if p.global_position.x > 12300 and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "move_up")
	release(0, "jump")
	check(p.global_position.x > 12250 and p.global_position.y < -150 and not p.is_bubbled(), "you can swim the stream and climb out (at %s, %s)" % [p.global_position, p.state_machine.current_name()])
	await _finish_demo()


func test_w1_2_balloon_floats_you_to_the_sky_meadow() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(12760, -602))
	press(0, "move_right")
	await seconds(0.35)
	release(0, "move_right")
	check(p.balloon_timer > 0.0, "walking into the stand should grab a balloon")
	await seconds(1.2)
	var landed := false
	for i in 1500:
		await get_tree().physics_frame
		# rise beside the island, then steer over the middle of the meadow (the breeze pushes right)
		var x := p.global_position.x
		if p.global_position.y > -1350.0:
			if x > 13020:
				press(0, "move_left")
				release(0, "move_right")
			else:
				release(0, "move_left")
				release(0, "move_right")
		elif x < 13300:
			press(0, "move_right")
			release(0, "move_left")
		elif x > 13480:
			press(0, "move_left")
			release(0, "move_right")
		else:
			release(0, "move_left")
			release(0, "move_right")
		if p.is_on_floor() and p.global_position.y < -1250.0:
			landed = true
			break
	release(0, "move_right")
	release(0, "move_left")
	check(landed, "the balloon should carry you up onto the sky meadow (at %s, balloon %.1f, %s)" % [p.global_position, p.balloon_timer, p.state_machine.current_name()])
	await _finish_demo()


func test_w1_2_last_puff_drifts_down_to_the_gate() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(13560, -1302))
	press(0, "move_right")
	await frames(20)
	press(0, "jump")
	await frames(12)
	release(0, "jump")
	var landed := false
	for i in 1500:
		await get_tree().physics_frame
		if p.global_position.x > 14800.0:  # over the gate ground: let go of the puff
			release(0, "move_right")
			press(0, "jump")
		if p.is_on_floor() and p.global_position.x > 14500.0:
			landed = true
			break
	release(0, "move_right")
	release(0, "jump")
	check(landed and not p.is_bubbled(), "the last puff should carry you down to the gate ground (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_rope_bridge_and_grotto_lead_to_the_mines() -> void:
	var p: Player = await _load_demo(W1_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(11100, -782))
	var ok: bool = await _hop_run(p, [11930, 12480], 13500, false, 12.0)
	check(ok, "the broken bridge and the grotto lead to the Spore Mines (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_swing_rings_cross_to_the_shieldbug_tree() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(10560, -452))
	press(0, "move_right")
	var jumped := false
	var rings := 0
	var landed := false
	var held := 0
	for i in 1500:
		await get_tree().physics_frame
		if held > 0:
			held -= 1
			if held == 0:
				release(0, "jump")
		var st := _state(p)
		if DEBUG_LIANA and i % 12 == 0:
			print("L ", i, " ", st, " ", p.global_position.round(), " v", p.velocity.round())
		if not jumped and p.global_position.x > 10670.0 and p.is_on_floor():
			press(0, "jump")
			held = 40  # a full jump off the end of the deck carries you into the first ring
			jumped = true
		if st == &"Swing":
			var a: Node2D = p.swing_anchor
			if a and p.global_position.x > a.global_position.x + 45.0 and p.velocity.x > 150.0 and held == 0:
				rings += 1
				press(0, "jump")  # let go on the forward swing
				held = 8
		if p.is_on_floor() and p.global_position.x > 11540.0:
			landed = true
			break
		if p.is_bubbled():
			break
	release(0, "move_right")
	release(0, "jump")
	check(rings >= 1, "you should catch the rings (swung %d)" % rings)
	check(landed, "swinging ring to ring should reach the Shieldbug's tree (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w1_4_lantern_lane_bridge_reaches_the_gorge() -> void:
	var p: Player = await _load_demo(W1_4)
	p.invulnerable_timer = 100.0
	await _clear_enemies()
	await _place(p, Vector2(11600, -422))
	var ok: bool = await _hop_run(p, [12330, 12620], 14000, false, 14.0)
	check(ok, "the broken bridge leads to the gorge tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_6_courtyard_leads_to_the_tower() -> void:
	var p: Player = await _load_demo(W1_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3900, -42))
	var ok: bool = await _hop_run(p, [4150, 4800, 5250], 5600, false, 14.0)
	check(ok, "the courtyard (spikes, Bonkhorn pen walls, fire jets) leads to the tower door (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_1_sledge_run_reaches_the_new_gate() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10460, 558))
	var ok: bool = await _hop_run(p, [11290], 15000, false, 16.0)
	check(ok, "over the snow hut, down Snowman Hill and across the penguin lake (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_1_snow_hut_hides_gem_2() -> void:
	var p: Player = await _load_demo(W2_1)
	await _place(p, Vector2(11300, 558))
	p.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(0.5)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[2], "punching through the hut's drift reaches gem 2 (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_third_lift_reaches_the_frost_fort() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	var ok := await _ride_lift(p, Vector2(10400, -954), 11800.0, -1650.0)
	check(ok, "the third lift should carry you over the gem room up to the Frost Fort (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_frost_fort_snowball_breaks_the_gate_and_leads_to_the_goal() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12060, -1652))
	p.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(3.0)
	var ok: bool = await _hop_run(p, [13350, 13750], 14350, false, 12.0)
	check(ok or gm().level_complete, "the snowball smashes the ice gate and the courtyard leads to the goal (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_3_minecart_carries_you_over_the_chasm() -> void:
	var p: Player = await _load_demo(W2_3)
	p.invulnerable_timer = 100.0
	await _clear_enemies()
	var cart: MovingPlatform = null
	for n in _demo.find_children("*", "MovingPlatform", true, false):
		if (n as Node2D).global_position.x > 10000:
			cart = n
	check(cart != null, "the mine should have a cart")
	await _place(p, Vector2(10220, -402))
	for i in 1200:  # wait for the cart to park at the near side
		await get_tree().physics_frame
		if cart.global_position.x < 10320.0:
			break
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if p.global_position.x > cart.global_position.x + 70.0:
			break
	release(0, "move_right")
	for i in 900:
		await get_tree().physics_frame
		if cart.global_position.x > 11220.0:
			break
	var ok: bool = await _hop_run(p, [], 11600, false, 3.0)
	check(ok, "riding the cart across and stepping off reaches the crystal chamber (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_3_crystal_chamber_leads_to_the_goal() -> void:
	var p: Player = await _load_demo(W2_3)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await _place(p, Vector2(11550, -402))
	var ok: bool = await _hop_run(p, [], 13450, true, 8.0)
	check(ok or gm().level_complete, "sprinting under the chamber's crushers reaches the goal (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	await _finish_demo()


func test_w2_4_ice_floes_cross_frostbite_lake_to_the_camp() -> void:
	var p: Player = await _load_demo(W2_4)
	p.invulnerable_timer = 100.0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await _place(p, Vector2(11480, 898))
	var ok: bool = await _hop_run(p, [11110, 11660, 12010, 12360, 12710, 13060, 13730, 14180], 14850, false, 16.0)
	check(ok or gm().level_complete, "over the shed, across the floes and through the camp to the goal (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_5_boardwalk_and_seesaw_hill_reach_the_upper_bath_house() -> void:
	var p: Player = await _load_demo(W2_5)
	p.invulnerable_timer = 100.0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await _place(p, Vector2(10700, -202))
	var ok: bool = await _hop_run(p, [10980, 11190, 11490, 11790, 12090, 12720], 14500, false, 16.0)
	check(ok, "over the back room, along the boardwalk and up the hill to the upper bath-house (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_6_tollgate_key_opens_the_way_to_the_ice_wall() -> void:
	var p: Player = await _load_demo(W2_6)
	p.invulnerable_timer = 100.0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Grumblefrost:
			e.queue_free()
	await _place(p, Vector2(4900, -702))
	press(0, "move_right")
	for i in 240:
		await get_tree().physics_frame
		if p.global_position.x > 5050.0:
			break
	release(0, "move_right")  # the mushroom throws you straight up onto the key ledge
	for i in 240:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.y < -1000.0:
			break
	check(p.global_position.y < -1000.0, "the mushroom should put you on the key ledge (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [], 5580, false, 6.0)
	check(ok, "carrying the key, the door opens and you reach the ice wall (at %s)" % p.global_position)
	await _finish_demo()


func test_every_level_passes_the_layout_audit() -> void:
	# Signs clear of terrain / props / Lum trails, nothing buried, one goal each (tools/level_audit.gd).
	for n in [^"Floor", ^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	for path in LevelAudit.all_levels():
		var issues: Array[String] = await LevelAudit.audit_path(self, path)
		check(issues.is_empty(), "%s: %s" % [path.get_file(), ", ".join(issues)])


## Die in a boss arena -> respawn at the lantern before it -> the arena must let you back in.
func _boss_arena_lets_you_back_in(path: String, cp: Vector2, inside_x: float) -> void:
	var p: Player = await _load_demo(path)
	_clear_enemies_except_bosses()
	var boss: Enemy = get_tree().get_first_node_in_group(&"enemies")
	var home := boss.global_position
	await _place(p, cp + Vector2(0, -2))
	await frames(4)
	p.invulnerable_timer = 100.0
	await _run_to(p, inside_x, "move_right", 8.0)
	release(0, "move_right")
	await seconds(1.0)
	check(p.global_position.x > inside_x - 80.0, "should reach the arena (x %d)" % p.global_position.x)
	check(not boss.get(&"asleep"), "the boss should wake up")
	p.invulnerable_timer = 0.0
	p.hurt()
	await seconds(2.5)
	check(not p.is_bubbled(), "should respawn")
	check(p.global_position.distance_to(cp) < 300.0, "should respawn at the lantern before the arena (at %s)" % p.global_position)
	check(boss.get(&"asleep") and boss.global_position.distance_to(home) < 40.0, "the boss should go back to sleep on his spot")
	p.invulnerable_timer = 100.0
	await _run_to(p, inside_x, "move_right", 8.0)
	release(0, "move_right")
	check(p.global_position.x > inside_x - 80.0, "should get back into the arena (stuck at x %d)" % p.global_position.x)
	await frames(10)
	check(not boss.get(&"asleep"), "the boss should wake up again")
	await _finish_demo()


func _clear_enemies_except_bosses() -> void:
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not (e is BaronBristleback or e is Grumblefrost or e is KingGrumblo or e is Chamelia or e is Cuckoolossus or e is Inkabella):
			e.queue_free()


func test_w1_6_dying_in_the_boss_arena_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in(W1_6, Vector2(9030, -1400), 9600.0)


func test_w2_6_dying_in_the_boss_arena_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in(W2_6, Vector2(8420, -1400), 9200.0)


func test_glacier_dying_in_king_grumblos_arena_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in("res://levels/glacier_grotto.tscn", Vector2(12340, 0), 12900.0)


# --- World 3: Rainbloom Jungle pieces and enemies -------------------------------------------

func test_liana_grab_swing_far_and_release() -> void:
	var vine := Liana.new()
	vine.length = 320.0
	vine.sway = 0.0
	vine.position = Vector2(0, -900)
	_arena.add_child(vine)
	var p := add_player(0, Vector2(-60, -900 + 320 + 40))
	await frames(1)
	p.velocity = Vector2(300, -150)
	p.state_machine.transition_to(&"Jump")
	for i in 40:
		await get_tree().physics_frame
		if _state(p) == &"Swing":
			break
	check(_state(p) == &"Swing", "jumping into a liana's end should grab it (got %s)" % _state(p))
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	var d := (p.global_position + Player.GRIP_OFFSET).distance_to(vine.global_position)
	check(absf(d - vine.rope_length) < 14.0 and vine.rope_length > 170.0, "hands stay where you caught the long vine (%.0f / %.0f)" % [d, vine.rope_length])
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	check(_state(p) in [&"Jump", &"Fall"], "jump lets go of the vine")


func test_snap_trap_catches_you_if_you_linger_but_not_if_you_run() -> void:
	var trap := SnapTrap.new()
	trap.position = Vector2(200, 0)
	_arena.add_child(trap)
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	await seconds(0.8)
	check(p.is_bubbled(), "standing in an open flytrap gets you caught when it snaps")
	await seconds(3.0)  # respawn
	trap.st = SnapTrap.St.OPEN
	p.global_position = Vector2(-200, -2)
	p.velocity = Vector2.ZERO
	await settle(p)
	p.invulnerable_timer = 0.0
	press(0, "move_right")
	await _run_to(p, 420.0, "move_right", 3.0)
	release(0, "move_right")
	await seconds(0.6)
	check(not p.is_bubbled(), "running straight across is quicker than the snap")


func test_nibblefin_leaps_out_of_the_water_and_back() -> void:
	var f := _spawn_enemy("res://enemies/nibblefin.tscn", Vector2(-300, -200)) as Nibblefin
	f.interval = 0.3
	f._timer = 0.2
	var surface := -200.0
	var top := 0.0
	var back := false
	for i in 400:
		await get_tree().physics_frame
		top = minf(top, f.global_position.y - surface)
		if top < -200.0 and f.global_position.y > surface:
			back = true
	check(top < -200.0, "it should leap well above the surface (peak %.0f)" % top)
	check(back, "and splash back under")


func test_cocobonk_lobs_coconuts_and_takes_two_hits() -> void:
	var p := add_player(0, Vector2(-100, -2))
	await settle(p)
	var m := _spawn_enemy("res://enemies/cocobonk.tscn", Vector2(380, 0)) as Cocobonk
	var hit := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_bubbled():
			hit = true
			break
	check(hit, "a Cocobonk's coconut should find a player who stands still")
	m.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(not m.dead, "one hit isn't enough")
	await seconds(0.8)
	m.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(m.dead, "two hits knock it out")


func test_swoopbeak_dives_at_you_and_flies_back() -> void:
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	var b := _spawn_enemy("res://enemies/swoopbeak.tscn", Vector2(-150, -380)) as Swoopbeak
	b.patrol_offset = Vector2.ZERO
	var lowest := -380.0
	for i in 240:
		await get_tree().physics_frame
		lowest = maxf(lowest, b.global_position.y)
		if p.is_bubbled():
			break
	check(lowest > -150.0, "it should dive down toward you (lowest %.0f)" % lowest)
	await seconds(2.5)
	check(b.global_position.y < -250.0, "then flap back up (y %.0f)" % b.global_position.y)


func test_chamelia_tongue_sticks_in_a_wall_and_she_can_be_stomped() -> void:
	var c := _spawn_enemy("res://enemies/chamelia.tscn", Vector2(0, 0), 1) as Chamelia
	var p := add_player(0, Vector2(470, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	c.set_active(true)
	await frames(2)
	c._start_tell()
	var stuck := false
	for i in 240:
		await get_tree().physics_frame
		if c.st == Chamelia.St.STUCK:
			stuck = true
			break
	check(stuck, "her tongue should hit the wall behind you and stick")
	var hp := c.health
	c._on_stomped(p)
	check(c.health == hp - 1, "stuck = stompable (hp %d -> %d)" % [hp, c.health])
	check(c.st != Chamelia.St.STUCK, "a stomp frees her tongue")


func test_chamelia_tongue_hurts_whoever_it_reaches() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	var c := _spawn_enemy("res://enemies/chamelia.tscn", Vector2(0, 0), 1) as Chamelia
	var p := add_player(0, Vector2(450, -2))
	await settle(p)
	c.set_active(true)
	await frames(2)
	p.invulnerable_timer = 0.0
	c._start_tell()
	await seconds(1.3)
	check(p.is_bubbled(), "standing still in front of her tongue gets you caught")


## Bot: run, jump into the first liana, pump, let go at the forward swing, catch the next...
## until standing on the floor past `end_x`.
const DEBUG_LIANA := false
const GAP_PROBE := 460.0


func _liana_cross(p: Player, take_off_x: float, end_x: float, max_s := 14.0) -> bool:
	var y0 := p.global_position.y
	press(0, "move_right")
	var jumped := false
	var hold := 0
	for i in int(max_s * 120):
		await get_tree().physics_frame
		if hold > 0:
			hold -= 1
			if hold == 0:
				release(0, "jump")
		var st := _state(p)
		if DEBUG_LIANA and i % 12 == 0:
			print("L ", i, " ", st, " ", p.global_position.round(), " v", p.velocity.round())
		if not jumped and p.global_position.x >= take_off_x and p.is_on_floor():
			press(0, "jump")
			hold = 40
			jumped = true
		if st == &"Swing":
			# Pump with the swing: push the way you're moving.
			if p.velocity.x < -20.0:
				release(0, "move_right")
				press(0, "move_left")
			else:
				release(0, "move_left")
				press(0, "move_right")
		else:
			release(0, "move_left")
			press(0, "move_right")
		if st == &"Swing" and hold == 0:
			var anchor: Node2D = p.swing_anchor
			var grip := p.global_position + Player.GRIP_OFFSET
			# Let go on the forward upswing.
			var rope: float = anchor.get(&"rope_length") if anchor.get(&"rope_length") != null else 92.0
			if p.velocity.x > 200.0 and grip.x > anchor.global_position.x + rope * 0.42 and p.velocity.y < 60.0:
				press(0, "jump")
				hold = 30
		if p.global_position.x >= end_x and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "move_left")
	release(0, "jump")
	return p.global_position.x >= end_x and p.global_position.y < y0 + 60.0 and not p.is_bubbled()


func test_liana_chain_crosses_a_wide_pit() -> void:
	for n in [^"Wall", ^"Floor"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	for r in [Rect2(-2000, 0, 500, 200), Rect2(-1500 + GAP_PROBE * 3 - 100, 0, 1500, 200)]:
		var b: Node2D = load("res://world/block.tscn").instantiate()
		b.position = r.position
		b.size = r.size
		_arena.add_child(b)
	for k in 3:
		var v := Liana.new()
		v.length = 330.0
		v.position = Vector2(-1300 + k * GAP_PROBE, -520)
		v.phase = k * 0.7
		_arena.add_child(v)
	var p := add_player(0, Vector2(-1800, -2))
	await settle(p)
	var ok := await _liana_cross(p, -1560.0, -1500 + GAP_PROBE * 3, 14.0)
	check(ok, "a bot swinging vine to vine should cross a pit with lianas %.0f px apart" % GAP_PROBE)


## Bot: walk into water, swim right at the surface, leap out past `bank_x`, stop on land past `end_x`.
func _swim_across(p: Player, bank_x: float, end_x: float, max_s := 10.0) -> bool:
	press(0, "move_right")
	for i in int(max_s * 120):
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			press(0, "move_up")
			# Leap out at the far bank - or onto anything that blocks the way.
			if (p.global_position.x > bank_x or absf(p.velocity.x) < 30.0) and i % 20 == 0:
				press(0, "jump")
		if i % 20 == 8:
			release(0, "jump")
		if p.global_position.x > end_x and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "move_up")
	release(0, "jump")
	return p.global_position.x > end_x and p.is_on_floor() and not p.is_bubbled()


## Bot: hop along sinking leaves (one hop per leaf x), coasting onto each.
func _leaf_hops(p: Player, xs: Array) -> void:
	for x in xs:
		press(0, "move_right")
		press(0, "jump")
		for i in 90:
			await get_tree().physics_frame
			if p.global_position.x >= float(x) - 50.0 and p.is_on_floor():
				break
			if p.global_position.x >= float(x) - 60.0:
				release(0, "move_right")
		release(0, "jump")
		release(0, "move_right")
		await frames(6)


const W3_1 := "res://levels/w3_1_drizzle_thicket.tscn"


func test_w3_1_flytraps_and_monkeys_lead_to_the_lianas() -> void:
	var p: Player = await _load_demo(W3_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3400, false, 10.0)
	check(ok, "running past the flytraps reaches the liana checkpoint (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_gem_0_sits_on_the_ledges_over_the_flytraps() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(2060, -2))
	var ok: bool = await _hop_run(p, [2100, 2330], 2480, false, 4.0)
	check(gm().gems[0], "two hops up the ledges reach gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_lianas_swing_you_over_the_pit() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(3400, -2))
	var ok := await _liana_cross(p, 4090.0, 5300.0)
	check(ok, "swinging liana to liana crosses the pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_stream_can_be_swum_past_the_nibblefins() -> void:
	var p: Player = await _load_demo(W3_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5300, -2))
	var ok := await _swim_across(p, 6480.0, 6700.0)
	check(ok, "you can swim the stream and climb out (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_tall_tree_pad_reaches_gem_1() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(8080, -2))
	press(0, "move_right")
	for i in 300:
		await get_tree().physics_frame
		if p.global_position.x > 8300.0:
			release(0, "move_right")
		if gm().gems[1]:
			break
	release(0, "move_right")
	if not gm().gems[1]:
		await _run_to(p, 8560.0, "move_right", 2.0)
		release(0, "move_right")
	check(gm().gems[1], "the mushroom pad bounces you onto the tall tree and gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_leaves_cross_the_bog() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(9320, -2))
	await _leaf_hops(p, [9560, 9820, 10080, 10340, 10700])
	check(p.global_position.x > 10600.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "hopping the sinking leaves crosses the bog (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_mossy_mound_and_the_flytraps() -> void:
	var p: Player = await _load_demo(W3_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10700, -2))
	var ok: bool = await _hop_run(p, [11200], 12600, false, 10.0)
	check(ok, "over the mossy mound and past the flytraps (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_mossy_hollow_hides_gem_2() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(11240, -2))
	p.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(0.5)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[2], "punching through the mossy wall reaches gem 2 (at %s)" % p.global_position)
	await _finish_demo()


const W3_2 := "res://levels/w3_2_canopy_highway.tscn"


func test_w3_2_first_bridge_reaches_the_second_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 2200, false, 8.0)
	check(ok, "across the first rope bridge to the second tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_liana_gap_to_the_third_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(1800, -42))
	var ok := await _liana_cross(p, 2240.0, 3450.0)
	check(ok, "two lianas swing you to the third tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_zipline_to_the_fourth_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(3960, -302))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 600:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 4970.0:
			landed = true
			break
	release(0, "move_right")
	check(landed, "the zipline should carry you to the fourth tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_zipline_post_is_reachable_from_the_deck() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(3640, -42))
	press(0, "move_right")
	var high := 0.0
	var k := 0
	for i in 480:
		await get_tree().physics_frame
		high = minf(high, p.global_position.y)
		if k < 2 and p.global_position.x >= [3700.0, 3850.0][k] and p.is_on_floor():
			press(0, "jump")
			k += 1
		if i % 40 == 30:
			release(0, "jump")
	release(0, "move_right")
	release(0, "jump")
	check(high < -280.0, "ledge then post: you can climb to the zipline (highest %.0f)" % high)
	await _finish_demo()


func test_w3_2_crumbling_branches_cross_to_the_fifth_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(5450, -102))
	var ok: bool = await _hop_run(p, [5640, 5900, 6160, 6420], 6560, false, 6.0)
	check(ok, "hopping the crumbling branches reaches the fifth tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_three_liana_swing_reaches_the_sixth_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(6560, -82))
	var ok := await _liana_cross(p, 7040.0, 8650.0)
	check(ok, "three lianas in a row reach the sixth tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_broken_bridge_and_the_treehouse_deck() -> void:
	var p: Player = await _load_demo(W3_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(8650, -42))
	var ok: bool = await _hop_run(p, [9380, 10600], 11700, false, 12.0)
	check(ok, "over the broken bridge and the stump to the end of the deck (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_under_bridge_branch_has_gem_1_and_a_pad_back_up() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(9395, 298))
	await _run_to(p, 9560.0, "move_right", 2.0)
	check(gm().gems[1], "the branch under the bridge holds gem 1")
	release(0, "move_right")
	var up := false
	for i in 200:
		await get_tree().physics_frame
		if p.global_position.y < -100.0:
			up = true
	check(up, "the mushroom bounces you back up through the gap (at %s)" % p.global_position)
	await _finish_demo()


const W3_3 := "res://levels/w3_3_sunken_temple.tscn"


func test_w3_3_entrance_hall_traps_lead_to_the_crushers() -> void:
	var p: Player = await _load_demo(W3_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3700, false, 10.0)
	check(ok, "past the pop-spikes and the flytrap to the crusher hall (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_pop_spikes_can_be_dashed_when_down() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(1800, -2))
	# Wait for the first spikes to sink, then run straight through the ripple.
	var first: PopSpikes = null
	for n in _demo.find_children("*", "PopSpikes", true, false):
		if first == null or n.global_position.x < first.global_position.x:
			first = n
	for i in 400:
		await get_tree().physics_frame
		if not first.is_up() and fmod(first._t, first.up_time + first.down_time) < first.up_time + 0.1:
			break
	var ok: bool = await _hop_run(p, [], 2950, false, 4.0)
	check(ok, "running with the wave as the spikes sink gets you past them unhurt (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_shaft_wall_jump_reaches_gem_0() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(3280, -202))
	press(0, "jump")  # straight up into the shaft...
	for i in 40:
		await get_tree().physics_frame
	release(0, "jump")
	press(0, "move_right")  # ...then kick off the walls
	for i in 600:
		await get_tree().physics_frame
		if i % 24 == 0:
			press(0, "jump")
		elif i % 24 == 6:
			release(0, "jump")
		if gm().gems[0]:
			break
	release(0, "move_right")
	release(0, "jump")
	check(gm().gems[0], "wall-jumping up the narrow shaft reaches gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_crushers_can_be_run_under() -> void:
	var p: Player = await _load_demo(W3_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3700, -2))
	var ok: bool = await _hop_run(p, [], 5760, false, 12.0)
	check(ok, "the crusher hall leads to the key hall (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_vine_climbs_to_the_key_ledge() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(5880, -2))
	press(0, "move_up")
	press(0, "jump")
	await frames(6)
	release(0, "jump")
	var top := 0.0
	for i in 600:
		await get_tree().physics_frame
		top = minf(top, p.global_position.y)
		if p.global_position.y < -800.0:
			break
	release(0, "move_up")
	check(top < -800.0, "climbing the vine reaches the key ledge (highest %.0f)" % top)
	await _finish_demo()


func test_w3_3_key_opens_the_temple_door() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(5990, -782))
	var ok: bool = await _hop_run(p, [], 6300, false, 6.0)
	check(p.global_position.x > 6200.0, "carrying the key, the temple door opens (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_swim_under_the_lintel_through_the_crypt() -> void:
	var p: Player = await _load_demo(W3_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6210, -2))
	press(0, "move_right")
	for i in 1500:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			# Dive under the lintel, then come up and leap out at the far bank.
			if p.global_position.x < 6560.0:
				press(0, "move_up")
				release(0, "move_down")
			elif p.global_position.x < 6960.0:
				release(0, "move_up")
				press(0, "move_down")
			else:
				release(0, "move_down")
				press(0, "move_up")
				if p.global_position.x > 7150.0 and i % 20 == 0:
					press(0, "jump")
		if i % 20 == 8:
			release(0, "jump")
		if p.global_position.x > 7400.0 and p.is_on_floor():
			break
	for a in ["move_right", "move_up", "move_down", "jump"]:
		release(0, a)
	check(p.global_position.x > 7350.0 and p.is_on_floor(), "you can swim under the stone lintel and climb out (at %s)" % p.global_position)
	check(gm().gems[1], "gem 1 waits under the lintel")
	await _finish_demo()


func test_w3_3_lianas_swing_across_the_collapsed_hall() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(7700, -2))
	var ok := await _liana_cross(p, 7950.0, 9150.0)
	check(ok, "two lianas carry you over the collapsed floor (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_pyramid_steps_lead_to_the_pool() -> void:
	var p: Player = await _load_demo(W3_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(9100, -2))
	var ok: bool = await _hop_run(p, [9500, 9800, 10100, 11700], 12500, false, 14.0)
	check(ok, "up and over the pyramid and the shrine (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_shrine_hides_gem_2() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(11740, -2))
	p.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(0.5)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[2], "punching the shrine's cracked front reaches gem 2 (at %s)" % p.global_position)
	await _finish_demo()


## Bot: wait on the bank for a raft at bank_x..bank_x+100, hop on, ride to `off_x`, hop off.
func _ride_raft(p: Player, home_x: float, off_x: float, surface_y: float) -> bool:
	var rafts := _demo.find_children("*", "LogRaft", true, false)
	var on_raft: LogRaft = null
	for i in 1200:
		await get_tree().physics_frame
		for r in rafts:
			var lr := r as LogRaft
			if lr.global_position.x > home_x + 20.0 and lr.global_position.x < home_x + 110.0 and lr.modulate.a > 0.9 \
					and lr.global_position.y < surface_y + 40.0:
				on_raft = lr
		if on_raft:
			break
	if on_raft == null:
		return false
	press(0, "move_right")
	press(0, "jump")
	for i in 60:
		await get_tree().physics_frame
		if p.global_position.x > on_raft.global_position.x - 10.0:
			release(0, "move_right")
	release(0, "jump")
	release(0, "move_right")
	for i in 2400:
		await get_tree().physics_frame
		if DEBUG_LIANA and i % 30 == 0:
			print("R ", i, " p", p.global_position.round(), " ", _state(p), " raft", on_raft.global_position.round())
		if on_raft.global_position.x > off_x:
			break
	press(0, "move_right")
	press(0, "jump")
	await frames(40)
	release(0, "jump")
	await seconds(0.8)
	release(0, "move_right")
	return p.global_position.y < surface_y - 10.0 and not p.is_bubbled()


const W3_4 := "res://levels/w3_4_rumbletide_rapids.tscn"


func test_w3_4_rafts_cross_the_lower_river() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(1250, -2))
	var ok := await _ride_raft(p, 1360.0, 2800.0, 20.0)
	check(ok and p.global_position.x > 3010.0, "riding a raft gets you across the lower river (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_monkey_bank_reaches_the_falls() -> void:
	var p: Player = await _load_demo(W3_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3080, -2))
	var ok: bool = await _hop_run(p, [], 4600, false, 8.0)
	check(ok, "along the monkey bank to the waterfall (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_gem_0_on_the_bank_ledges() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(3700, -2))
	var ok: bool = await _hop_run(p, [3750, 3970], 4120, false, 4.0)
	check(gm().gems[0], "two hops up the ledges reach gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_net_climbs_the_waterfall() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(5130, -2))
	press(0, "move_up")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	for i in 900:
		await get_tree().physics_frame
		if DEBUG_LIANA and i % 30 == 0:
			print("N ", i, " ", _state(p), " ", p.global_position.round())
		if p.global_position.y < -660.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(30)
	release(0, "jump")
	await seconds(0.8)
	release(0, "move_right")
	check(p.global_position.x > 5200.0 and p.global_position.y < -690.0, "climbing the net up the falls reaches the top (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_three_lianas_cross_the_gorge() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(5300, -702))
	var ok := await _liana_cross(p, 6240.0, 7750.0)
	check(ok, "three lianas swing you over the gorge (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_rafts_cross_the_upper_river() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(8150, -702))
	var ok := await _ride_raft(p, 8260.0, 9800.0, -680.0)
	check(ok and p.global_position.x > 10000.0, "riding a raft gets you up the upper river (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_mudslide_and_the_hollow() -> void:
	var p: Player = await _load_demo(W3_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10080, -702))
	var ok: bool = await _hop_run(p, [11900], 12700, false, 14.0)
	check(ok, "down the mudslide and over the hollow (at %s)" % p.global_position)
	await _finish_demo()


const W3_5 := "res://levels/w3_5_firefly_bog.tscn"


func test_w3_5_lily_leaves_cross_the_first_pool() -> void:
	var p: Player = await _load_demo(W3_5)
	await _clear_enemies()
	await _place(p, Vector2(1320, -2))
	await _leaf_hops(p, [1560, 1820, 2080, 2340, 2600, 2860, 3110, 3320])
	check(p.global_position.x > 3200.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "hopping the lily leaves crosses the pool (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_5_flytrap_meadow_and_the_dead_tree_gem() -> void:
	var p: Player = await _load_demo(W3_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3300, -2))
	var ok: bool = await _hop_run(p, [], 4790, false, 8.0)
	check(ok, "across the flytrap meadow to the sinkhole (at %s)" % p.global_position)
	check(gm().gems[0], "the mushroom pad on the way tosses you past gem 0 on the dead tree")
	await _finish_demo()


func test_w3_5_three_lianas_cross_the_sinkhole() -> void:
	var p: Player = await _load_demo(W3_5)
	await _clear_enemies()
	await _place(p, Vector2(4600, -2))
	var ok := await _liana_cross(p, 4760.0, 6300.0)
	check(ok, "three lianas swing you over the sinkhole (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_5_log_stepping_stones_and_the_island() -> void:
	var p: Player = await _load_demo(W3_5)
	await _clear_enemies()
	await _place(p, Vector2(6520, -2))
	await _leaf_hops(p, [6800, 7060, 7320, 7560, 7840, 8080, 8300])
	check(p.global_position.x > 8200.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "hopping log to log crosses the pool (at %s)" % p.global_position)
	check(gm().gems[1], "gem 1 floats over the last log")
	await _finish_demo()


func test_w3_5_root_tunnel_and_the_stump() -> void:
	var p: Player = await _load_demo(W3_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(8320, -2))
	var ok: bool = await _hop_run(p, [10900], 12500, false, 14.0)
	check(ok, "through the root tunnel and over the stump (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_5_hollow_stump_hides_gem_2() -> void:
	var p: Player = await _load_demo(W3_5)
	await _clear_enemies()
	await _place(p, Vector2(10940, -2))
	p.facing = 1
	press(0, "attack")
	await frames(4)
	release(0, "attack")
	await seconds(0.5)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[2], "punching the stump open reaches gem 2 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_every_snoozling_cage_can_be_punched_open() -> void:
	for path in [W3_1, W3_2, W3_3, W3_4, W3_5]:
		var p: Player = await _load_demo(path)
		await _clear_enemies()
		var cage: SnoozlingCage = _demo.find_children("*", "SnoozlingCage", true, false)[0]
		await _place(p, cage.global_position + Vector2(-55, -4))
		if _state(p) == &"Swim":  # underwater: swim back down to it
			press(0, "move_down")
			for i in 400:
				await get_tree().physics_frame
				if p.global_position.distance_to(cage.global_position) < 90.0:
					break
			release(0, "move_down")
		p.facing = 1
		await _punch()
		await frames(20)
		check(cage._opened, "%s: the Snoozling's cage opens with a punch (player %s %s, cage %s)" % [path.get_file(), p.global_position, _state(p), cage.global_position])
		await _finish_demo()


const W3_6 := "res://levels/w3_6_chamelia_temple.tscn"


func test_w3_6_temple_steps_lead_to_the_moat() -> void:
	var p: Player = await _load_demo(W3_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3150, false, 10.0)
	check(ok, "up the temple steps to the moat (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_6_three_lianas_cross_the_moat() -> void:
	var p: Player = await _load_demo(W3_6)
	await _clear_enemies()
	await _place(p, Vector2(2900, -2))
	var ok := await _liana_cross(p, 3160.0, 4700.0)
	check(ok, "three lianas swing you over the moat (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_6_terraces_climb_to_the_summit() -> void:
	var p: Player = await _load_demo(W3_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4700, -2))
	var ok: bool = await _hop_run(p, [4920, 5170, 5420, 5670, 5920], 6250, false, 10.0)
	check(ok and p.global_position.y < -690.0, "hopping up the terraces reaches the summit (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_6_chamelia_can_be_beaten_by_sticking_her_tongue_in_the_walls() -> void:
	seed(20261002)
	var p: Player = await _load_demo(W3_6)
	var boss: Chamelia = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Chamelia:
			boss = e
		else:
			e.queue_free()
	check(boss != null and boss.asleep, "Chamelia should be asleep in her arena")
	await _place(p, Vector2(9500, -702))
	await frames(10)
	check(not boss.asleep, "walking into the arena should wake her")
	var gates := _demo.find_children("*", "Gate", true, false)
	for round in 24:
		if not is_instance_valid(boss) or boss.dead:
			break
		p.invulnerable_timer = 100.0
		# Stand between her and a wall, let her lash: the tongue sticks in the wall.
		var right := boss.global_position.x < 9700.0
		p.global_position = Vector2(10220.0 if right else 9140.0, -702.0)
		p.velocity = Vector2.ZERO
		boss.st = Chamelia.St.WALK
		boss._tongue = 0.0
		boss._start_tell()
		for i in 300:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.st == Chamelia.St.STUCK:
				break
		if not is_instance_valid(boss) or boss.st != Chamelia.St.STUCK:
			continue
		boss._on_stomped(p)
		await seconds(0.6)
	check(not is_instance_valid(boss) or boss.dead, "six stomps while she's stuck should beat Chamelia (hp %d)" % (boss.health if is_instance_valid(boss) else 0))
	await seconds(1.5)
	var exit_open := false
	for g in gates:
		if g.global_position.x > 10200.0 and g.is_open():
			exit_open = true
	check(exit_open, "beating her should open the exit gate")
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10200, -702))
	var ok: bool = await _hop_run(p, [], 10840, false, 6.0)
	check(gm().level_complete, "the gate past the arena completes World 3 (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_6_dying_in_the_boss_arena_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in(W3_6, Vector2(8900, -700), 9550.0)


# --- World 4: Clockwhirl Works pieces and enemies --------------------------------------------

func test_beat_blocks_take_turns_being_solid() -> void:
	BeatBlock.clock = 0.0
	var pink := BeatBlock.new()
	pink.position = Vector2(-300, -200)
	pink.beat = 1.0
	_arena.add_child(pink)
	var blue := BeatBlock.new()
	blue.position = Vector2(0, -200)
	blue.group = 1
	blue.beat = 1.0
	_arena.add_child(blue)
	await frames(10)
	check(pink._solid and not blue._solid, "pink is solid first, blue is a dotted outline")
	await seconds(1.0)
	check(blue._solid and not pink._solid, "after one beat they swap")
	# Stand on the blue block: when the beat passes it vanishes and you fall.
	var p := add_player(0, Vector2(64, -202))
	await frames(4)
	check(p.global_position.y < -150.0, "you can stand on a solid tick-tock block")
	await seconds(1.2)
	check(p.global_position.y > -150.0, "when it swaps out, you drop through")


func test_beat_block_never_snaps_solid_inside_a_player() -> void:
	BeatBlock.clock = 0.0
	var blue := BeatBlock.new()
	blue.position = Vector2(-64, -48)
	blue.size = Vector2(128, 48)
	blue.group = 1
	blue.beat = 1.0
	_arena.add_child(blue)
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	await seconds(1.2)
	check(not blue._solid, "a block waits while a player stands inside its space")
	p.global_position = Vector2(-400, -2)
	await frames(6)
	check(blue._solid, "and snaps solid once they've moved out")


func test_zap_arc_hurts_only_while_on() -> void:
	var z := ZapArc.new()
	z.position = Vector2(200, -10)
	z.end = Vector2(0, -200)
	z.on_time = 0.6
	z.off_time = 1.0
	_arena.add_child(z)
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	await frames(10)
	check(not p.is_bubbled(), "standing in an arc while it's off is safe")
	await seconds(1.2)
	check(p.is_bubbled(), "when the bolt fires, you're zapped")


func test_windup_loses_its_key_then_races_and_takes_two_hits() -> void:
	var w := _spawn_enemy("res://enemies/windup.tscn", Vector2(-200, 0)) as Windup
	await frames(30)
	var slow := absf(w.velocity.x)
	w.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(not w.dead and w._keyless, "the first hit knocks its key off")
	await seconds(1.0)
	check(absf(w.velocity.x) > slow * 1.8, "without its key it races (%.0f -> %.0f)" % [slow, absf(w.velocity.x)])
	w.damage(null, Enemy.HitKind.PUNCH, Vector2.ZERO)
	check(w.dead, "the second hit finishes it")


func test_sparkbot_zips_shocks_stompers_and_pops_to_a_punch() -> void:
	var s := _spawn_enemy("res://enemies/sparkbot.tscn", Vector2(-300, -60)) as Sparkbot
	var x0 := s.global_position.x
	await seconds(1.0)
	check(absf(s.global_position.x - x0) > 100.0, "it zips along its rail")
	check(not s.stompable, "stomping it shocks you")
	s.take_hit(null, Vector2.RIGHT)
	check(s.dead, "a punch pops it")


func test_springbot_springs_at_you() -> void:
	var p := add_player(0, Vector2(200, -2))
	await settle(p)
	var b := _spawn_enemy("res://enemies/springbot.tscn", Vector2(-200, 0)) as Springbot
	var top := 0.0
	for i in 300:
		await get_tree().physics_frame
		top = minf(top, b.global_position.y)
	check(top < -150.0, "it springs high (peak %.0f)" % top)
	check(b.global_position.x > -150.0, "toward the player (x %.0f)" % b.global_position.x)


func test_cuckoolossus_bird_gets_stuck_and_can_be_stomped() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	var c := _spawn_enemy("res://enemies/cuckoolossus.tscn", Vector2(-300, 0), 1) as Cuckoolossus
	var p := add_player(0, Vector2(100, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	c.set_active(true)
	await frames(2)
	c.st = Cuckoolossus.St.RATTLE
	c._timer = 0.1
	c._cuckoos_left = 1
	var stuck := false
	for i in 240:
		await get_tree().physics_frame
		if c.st == Cuckoolossus.St.STUCK:
			stuck = true
			break
	check(stuck, "the cuckoo shoots out at you and sticks in the floor")
	check(c.bird_head().distance_to(Vector2(100, -18)) < 60.0, "it lands where you stood (%s)" % c.bird_head())
	var hp := c.health
	# Drop onto the bird's head.
	p.global_position = c.bird_head() + Vector2(0, -160)
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	for i in 120:
		await get_tree().physics_frame
		if c.health < hp:
			break
	check(c.health == hp - 1, "stomping the stuck bird hurts the clock (hp %d -> %d)" % [hp, c.health])
	check(c.st == Cuckoolossus.St.RETRACT, "and it snaps back into its house")


func test_cuckoolossus_body_shrugs_off_punches() -> void:
	var c := _spawn_enemy("res://enemies/cuckoolossus.tscn", Vector2(0, 0), 1) as Cuckoolossus
	c.set_active(true)
	await frames(2)
	var hp := c.health
	c.take_hit(null, Vector2.RIGHT)
	check(c.health == hp, "only the bird can be hurt, not the clock")


func test_cuckoolossus_pendulum_sweeps_the_floor() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	var c := _spawn_enemy("res://enemies/cuckoolossus.tscn", Vector2(-200, 0), 1) as Cuckoolossus
	var p := add_player(0, Vector2(0, -2))
	await settle(p)
	c.set_active(true)
	await frames(2)
	p.invulnerable_timer = 0.0
	c.st = Cuckoolossus.St.CHIME
	c._timer = 0.3
	await seconds(1.2)
	check(p.is_bubbled(), "standing in front of the swinging pendulum gets you hit")


## Bot: hop along tick-tock blocks. `hops` = [[land_x, group], ...]; group -1 = solid ground.
## The first hop waits for its group to be solid; later hops jump on the BLINK (just before
## the swap) so they land on the next block right as it appears.
func _beat_hops(p: Player, hops: Array, beat := 1.6) -> void:
	for k in hops.size():
		var x: float = hops[k][0]
		var g: int = hops[k][1]
		for i in 400:
			await get_tree().physics_frame
			var left := beat - fmod(BeatBlock.clock, beat)
			var solid_now := BeatBlock.solid_group(BeatBlock.clock, beat)
			if g < 0:
				break
			if k == 0 and solid_now == g and left > 1.0:
				break
			if k > 0 and solid_now != g and left < 0.3:
				break
		press(0, "move_right")
		press(0, "jump")
		for i in 120:
			await get_tree().physics_frame
			if p.global_position.x >= x - 40.0:
				release(0, "move_right")
			if i > 10 and p.is_on_floor():
				break
		release(0, "jump")
		release(0, "move_right")
		await frames(4)


const W4_1 := "res://levels/w4_1_cogwheel_courtyard.tscn"


func test_w4_1_belts_and_windups_lead_to_the_scrap_pit() -> void:
	var p: Player = await _load_demo(W4_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3400, false, 12.0)
	check(ok, "over the belts to the scrap pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_gem_0_over_the_belts() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	await _place(p, Vector2(2060, -2))
	var ok: bool = await _hop_run(p, [2100, 2330], 2480, false, 4.0)
	check(gm().gems[0], "two hops up the ledges reach gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_cart_crosses_the_scrap_pit() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(3700, -4), 4755.0, -2.0)
	check(ok and p.global_position.x > 4600.0, "the cart carries you over the scrap pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_tick_tock_steps_reach_gem_1() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	await _place(p, Vector2(5150, -2))
	await _beat_hops(p, [[5300, 0], [5500, 1], [5700, 0]])
	check(gm().gems[1], "jumping on the blink climbs the practice steps to gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_tick_tock_blocks_cross_the_pit() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	await _place(p, Vector2(5950, -2))
	await _beat_hops(p, [[6100, 0], [6340, 1], [6580, 0], [6820, 1], [7100, -1]])
	check(p.global_position.x > 7000.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "the tick-tock row crosses the pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_yard_zaps_and_the_crate() -> void:
	var p: Player = await _load_demo(W4_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(7100, -2))
	var ok: bool = await _hop_run(p, [11100], 12450, false, 16.0)
	check(ok, "through the yard, past the zaps and over the crate (at %s)" % p.global_position)
	await _finish_demo()


const W4_2 := "res://levels/w4_2_conveyor_chaos.tscn"


func test_w4_2_belt_under_the_crushers() -> void:
	var p: Player = await _load_demo(W4_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3400, false, 14.0)
	check(ok, "against the belt and under the crushers (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_zaps_lead_to_the_lift() -> void:
	var p: Player = await _load_demo(W4_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(3400, -2))
	var ok: bool = await _hop_run(p, [], 4950, false, 8.0)
	check(ok, "past the zap arcs to the lift (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_tick_tock_steps_reach_gem_0() -> void:
	var p: Player = await _load_demo(W4_2)
	await _clear_enemies()
	await _place(p, Vector2(3480, -2))
	await _beat_hops(p, [[3650, 0], [3850, 1], [4080, -1]])
	check(gm().gems[0], "tick-tock steps up to the shelf with gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_lift_to_the_catwalk() -> void:
	var p: Player = await _load_demo(W4_2)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(5220, -2), 5440.0, -600.0)
	check(ok and p.global_position.y < -590.0, "the lift carries you up to the catwalk (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_tick_tock_catwalk_gap() -> void:
	var p: Player = await _load_demo(W4_2)
	await _clear_enemies()
	await _place(p, Vector2(6560, -602))
	await _beat_hops(p, [[6740, 0], [6980, 1], [7220, 0], [7460, 1], [7700, -1]])
	check(p.global_position.x > 7600.0 and p.global_position.y < -590.0 and not p.is_bubbled(), "tick-tock blocks cross the catwalk gap (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_ramp_sorting_line_and_the_crate() -> void:
	var p: Player = await _load_demo(W4_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(7700, -602))
	var ok: bool = await _hop_run(p, [10700], 12300, false, 16.0)
	check(gm().gems[1], "gem 1 waits at the end of the catwalk")
	check(ok, "down the ramp, along the sorting line, over the crate (at %s)" % p.global_position)
	await _finish_demo()


const W4_3 := "res://levels/w4_3_steam_pipes.tscn"


## Stand on a geyser at `gx`, wait for it to throw you above `above_y`, then steer right.
func _geyser_ride(p: Player, gx: float, above_y: float, steer_to: float, max_s := 6.0, gy := 0.0) -> void:
	await _place(p, Vector2(gx, gy - 2.0))
	var risen := false
	for i in int(max_s * 60.0):
		await get_tree().physics_frame
		if not risen and p.global_position.y < above_y:
			risen = true
			press(0, "move_right")
		if risen and p.global_position.x >= steer_to:
			release(0, "move_right")
		if risen and i > 20 and p.is_on_floor():
			break
	release(0, "move_right")
	await frames(4)


func test_w4_3_fire_vent_wave() -> void:
	var p: Player = await _load_demo(W4_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3100, false, 10.0)
	check(ok, "through the fire vents (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_geyser_to_the_pipe_walkway_and_gem_0() -> void:
	var p: Player = await _load_demo(W4_3)
	await _clear_enemies()
	await _geyser_ride(p, 3320, -540, 3600, 10.0)
	check(p.global_position.y < -500.0 and p.is_on_floor(), "the geyser throws you onto the pipe walkway (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [4700], 4760, false, 6.0)
	check(gm().gems[0], "gem 0 waits at the end of the walkway (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_vent_corridor() -> void:
	var p: Player = await _load_demo(W4_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4900, -2))
	var ok: bool = await _hop_run(p, [], 6520, false, 8.0)
	check(ok, "through the vent corridor (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_cart_over_the_boiling_pit() -> void:
	var p: Player = await _load_demo(W4_3)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(6700, -4), 7755.0, -2.0)
	check(ok and p.global_position.x > 7600.0, "the pressure cart crosses the pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_pit_edge_geyser_reaches_gem_1() -> void:
	var p: Player = await _load_demo(W4_3)
	await _clear_enemies()
	await _place(p, Vector2(6540, -2))
	for i in 420:
		await get_tree().physics_frame
		if gm().gems[1]:
			break
	check(gm().gems[1], "the geyser at the pit's edge throws you up to gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_pipe_yard_and_the_toolbox() -> void:
	var p: Player = await _load_demo(W4_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(7700, -2))
	var ok: bool = await _hop_run(p, [10700], 12300, false, 16.0)
	check(ok, "through the pipe yard and over the toolbox (at %s)" % p.global_position)
	await _finish_demo()


const W4_4 := "res://levels/w4_4_tick_tock_tower.tscn"


func test_w4_4_staircase_shaft_reaches_the_pendulum_hall() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	await _place(p, Vector2(1480, -2))
	var ok := true
	for t: Vector2 in [Vector2(1700, -170), Vector2(1930, -340), Vector2(2160, -510), Vector2(2390, -680), Vector2(2600, -850)]:
		ok = ok and await _hop_to(p, t.x, t.y)
	check(ok and p.global_position.y < -840.0, "up the shelves into the pendulum hall (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_hidden_shelf_holds_gem_0() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	await _place(p, Vector2(2160, -512))
	await _hop_to(p, 1870, -680)
	await _run_to(p, 1880, "move_left", 1.0)
	release(0, "move_left")
	check(gm().gems[0], "a hop left off the third shelf reaches gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_pendulum_hall() -> void:
	var p: Player = await _load_demo(W4_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(2600, -852))
	var ok: bool = await _hop_run(p, [], 3760, false, 6.0)
	check(ok, "under the pendulums to the tick-tock climb (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_tick_tock_climb_to_the_deck() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	await _place(p, Vector2(3800, -852))
	await _beat_hops(p, [[3990, 0], [4190, 1], [4390, 0], [4590, 1], [4800, -1]])
	check(p.global_position.x > 4700.0 and p.global_position.y < -1590.0 and not p.is_bubbled(), "the tick-tock blocks climb to the clock deck (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_lift_to_the_gallery_and_gem_1() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(5110, -1602), 5360.0, -2190.0)
	check(ok, "the lift reaches the clock gallery (at %s)" % p.global_position)
	await _run_to(p, 5660, "move_right", 2.0)
	release(0, "move_right")
	check(gm().gems[1], "gem 1 waits in the gallery (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_roof_steps_and_the_crate() -> void:
	var p: Player = await _load_demo(W4_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5900, -1602))
	var ok: bool = await _hop_run(p, [10700], 12250, false, 16.0)
	check(ok, "down the roof steps and over the crate (at %s)" % p.global_position)
	await _finish_demo()


const W4_5 := "res://levels/w4_5_night_shift.tscn"


func test_w4_5_belt_under_the_rail_saws() -> void:
	var p: Player = await _load_demo(W4_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3300, false, 10.0)
	check(ok, "along the belt under the rail saws (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_crumbling_crates_cross_the_pit() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(3280, -2))
	var ok: bool = await _hop_run(p, [3390, 3640, 3900, 4150], 4500, true, 8.0)
	check(ok, "the crumbling crates carry you over the scrap pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_bounce_pad_reaches_gem_0() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(4700, -2))
	for i in 240:
		await get_tree().physics_frame
		if gm().gems[0]:
			break
	check(gm().gems[0], "the bounce pad throws you up to gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_sorting_floor() -> void:
	var p: Player = await _load_demo(W4_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4950, -2))
	var ok: bool = await _hop_run(p, [], 6850, false, 8.0)
	check(ok, "across the sorting floor and under the crushers (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_shelves_hold_gem_1() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(5380, -2))
	var ok: bool = await _hop_to(p, 5580, -170)
	ok = ok and await _hop_to(p, 5810, -340)
	check(gm().gems[1], "two shelves up to gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_glowing_tick_tock_blocks() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(6850, -2))
	await _beat_hops(p, [[7020, 0], [7260, 1], [7500, 0], [7740, 1], [8000, -1]])
	check(p.global_position.x > 7900.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "the glowing tick-tock row crosses the dark (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_night_line_and_the_toolbox() -> void:
	var p: Player = await _load_demo(W4_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(8000, -2))
	var ok: bool = await _hop_run(p, [10700], 12300, false, 16.0)
	check(ok, "down the night line and over the toolbox (at %s)" % p.global_position)
	await _finish_demo()


const W4_6 := "res://levels/w4_6_cuckoolossus_clocktower.tscn"


func test_w4_6_assembly_yard() -> void:
	var p: Player = await _load_demo(W4_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok: bool = await _hop_run(p, [], 3300, false, 10.0)
	check(ok, "through the assembly yard (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_tick_tock_steps_reach_gem_0() -> void:
	var p: Player = await _load_demo(W4_6)
	await _clear_enemies()
	await _place(p, Vector2(2580, -2))
	await _beat_hops(p, [[2750, 0], [2950, 1], [3180, -1]])
	check(gm().gems[0], "tick-tock steps up to the shelf with gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_tick_tock_blocks_over_the_gear_pit() -> void:
	var p: Player = await _load_demo(W4_6)
	await _clear_enemies()
	await _place(p, Vector2(3300, -2))
	await _beat_hops(p, [[3500, 0], [3740, 1], [3980, 0], [4220, 1], [4500, -1]])
	check(p.global_position.x > 4400.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "the tick-tock row crosses the gear pit (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_terraces_climb_to_the_bell_loft() -> void:
	var p: Player = await _load_demo(W4_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4480, -2))
	var ok: bool = await _hop_run(p, [4920, 5170, 5420, 5670, 5920], 6250, false, 10.0)
	check(ok and p.global_position.y < -690.0, "hopping up the terraces reaches the bell loft (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_hidden_ledge_holds_gem_1() -> void:
	var p: Player = await _load_demo(W4_6)
	await _clear_enemies()
	await _place(p, Vector2(5560, -422))
	await _hop_to(p, 5400, -560)
	check(gm().gems[1], "a hop left off the terrace reaches gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_cuckoolossus_can_be_beaten_by_stomping_the_cuckoo() -> void:
	seed(20261002)
	var p: Player = await _load_demo(W4_6)
	var boss: Cuckoolossus = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Cuckoolossus:
			boss = e
		else:
			e.queue_free()
	check(boss != null and boss.asleep, "Cuckoolossus should be asleep in the bell loft")
	await _place(p, Vector2(9400, -702))
	await frames(10)
	check(not boss.asleep, "walking into the loft should wake it")
	var gates := _demo.find_children("*", "Gate", true, false)
	for round in 24:
		if not is_instance_valid(boss) or boss.dead:
			break
		p.invulnerable_timer = 100.0
		# Stand a little way off, let the cuckoo shoot out and stick, then drop on its head.
		var side := -1.0 if boss.global_position.x > 9680.0 else 1.0
		p.global_position = Vector2(boss.global_position.x + side * 340.0, -702.0)
		p.velocity = Vector2.ZERO
		await frames(2)
		boss.st = Cuckoolossus.St.RATTLE
		boss._timer = 0.2
		boss._cuckoos_left = 1
		for i in 300:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.st == Cuckoolossus.St.STUCK:
				break
		if not is_instance_valid(boss) or boss.st != Cuckoolossus.St.STUCK:
			continue
		var hp := boss.health
		p.global_position = boss.bird_head() + Vector2(0, -160)
		p.velocity = Vector2.ZERO
		p.state_machine.transition_to(&"Fall")
		for i in 120:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.dead or boss.health < hp:
				break
		await seconds(0.8)
	check(not is_instance_valid(boss) or boss.dead, "six stomps on the stuck cuckoo should beat Cuckoolossus (hp %d)" % (boss.health if is_instance_valid(boss) else 0))
	await seconds(1.5)
	var exit_open := false
	for g in gates:
		if g.global_position.x > 10200.0 and g.is_open():
			exit_open = true
	check(exit_open, "beating it should open the exit gate")
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10250, -702))
	var ok: bool = await _hop_run(p, [10480], 11160, false, 6.0)
	check(gm().level_complete, "over the toolbox to the gate completes World 4 (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_dying_in_the_bell_loft_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in(W4_6, Vector2(8900, -700), 9550.0)


func test_w4_every_snoozling_cage_can_be_punched_open() -> void:
	for path in [W4_1, W4_2, W4_3, W4_4, W4_5, W4_6]:
		var p: Player = await _load_demo(path)
		await _clear_enemies()
		var cage: SnoozlingCage = _demo.find_children("*", "SnoozlingCage", true, false)[0]
		await _place(p, cage.global_position + Vector2(-55, -4))
		p.facing = 1
		await _punch()
		await frames(20)
		check(cage._opened, "%s: the Snoozling's cage opens with a punch (player %s %s, cage %s)" % [path.get_file(), p.global_position, _state(p), cage.global_position])
		await _finish_demo()


func test_w4_secret_toolboxes_hold_gem_2() -> void:
	for spot: Array in [[W4_3, Vector2(10700, -2)], [W4_4, Vector2(10700, -2)], [W4_5, Vector2(10700, -2)], [W4_6, Vector2(10450, -702)]]:
		var p: Player = await _load_demo(spot[0])
		await _clear_enemies_except_bosses()
		await _place(p, spot[1])
		p.facing = 1
		await _run_to(p, spot[1].x + 50.0, "move_right", 1.0)
		release(0, "move_right")
		await _punch()
		await frames(20)
		press(0, "move_right")
		await seconds(1.0)
		release(0, "move_right")
		check(gm().gems[2], "%s: punching the toolbox open reaches gem 2 (at %s)" % [String(spot[0]).get_file(), p.global_position])
		await _finish_demo()


## Stand on a bounce pad at `pad`, and once it throws you above `steer_above_y`, steer right
## until `stop_x`. Returns once you land.
func _pad_hop(p: Player, pad: Vector2, steer_above_y: float, stop_x: float, max_s := 4.0) -> void:
	await _place(p, pad + Vector2(0, -2))
	var risen := false
	for i in int(max_s * 60.0):
		await get_tree().physics_frame
		if p.global_position.y < steer_above_y:
			risen = true
		if risen and p.global_position.x < stop_x:
			press(0, "move_right")
		else:
			release(0, "move_right")
		if risen and i > 20 and p.is_on_floor():
			break
	release(0, "move_right")
	await frames(4)


func test_w1_2_cloud_island_hops() -> void:
	var p: Player = await _load_demo(W1_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(15600, -152))
	var ok: bool = await _hop_run(p, [15860, 16310, 16810, 17310], 17700, false, 10.0)
	check(ok, "hopping the cloud islands reaches the mushroom island (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_2_mushroom_steps_reach_the_sky_garden() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _pad_hop(p, Vector2(18000, -150), -600.0, 18300.0)
	check(p.global_position.y < -550.0 and p.is_on_floor(), "the first mushroom bounces you onto the middle island (at %s)" % p.global_position)
	await _pad_hop(p, Vector2(18440, -560), -990.0, 18700.0)
	check(p.global_position.y < -940.0 and p.is_on_floor(), "the second mushroom reaches the Sky Garden (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_2_garden_puff_floats_home_to_the_gate() -> void:
	var p: Player = await _load_demo(W1_2)
	await _clear_enemies()
	await _place(p, Vector2(19250, -952))
	press(0, "move_right")
	await frames(20)
	press(0, "jump")
	await frames(12)
	release(0, "jump")
	var landed := false
	for i in 1500:
		await get_tree().physics_frame
		if p.global_position.x > 20050.0:  # over the gate ground: let go of the puff
			release(0, "move_right")
			press(0, "jump")
		if p.is_on_floor() and p.global_position.x > 19900.0:
			landed = true
			break
	release(0, "move_right")
	release(0, "jump")
	check(landed and not p.is_bubbled(), "the garden puff floats you down to the gate ground (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [], 20470, false, 4.0)
	check(gm().level_complete, "the Dream Gate completes Dandelion Drift (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_crumbling_mine_stones() -> void:
	var p: Player = await _load_demo(W1_3)
	await _clear_enemies()
	await _place(p, Vector2(13450, -782))
	var ok: bool = await _hop_run(p, [13560, 13840, 14140, 14440], 14600, false, 8.0)
	check(ok, "hopping the crumbling stones crosses the Spore Mines (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_puffcaps_and_the_geyser_to_the_gallery() -> void:
	var p: Player = await _load_demo(W1_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14560, -782))
	var ok: bool = await _hop_run(p, [], 15700, false, 6.0)
	check(ok, "past the puffcaps to the geyser (at %s)" % p.global_position)
	await _clear_enemies()
	await _geyser_ride(p, 15800, -1420, 16150, 10.0, -780.0)
	check(p.global_position.y < -1390.0 and p.is_on_floor(), "the geyser throws you up into the crystal gallery (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_3_crystal_gallery_out_to_the_daylight_gate() -> void:
	var p: Player = await _load_demo(W1_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(16150, -1402))
	var ok: bool = await _hop_run(p, [], 19300, false, 12.0)
	check(ok or gm().level_complete, "along the crystal gallery and up into the daylight (at %s)" % p.global_position)
	check(gm().level_complete, "the daylight gate completes Mossy Hollow")
	await _finish_demo()


func test_w1_4_leaf_hops_over_the_gorge() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(13950, -462))
	var ok: bool = await _hop_run(p, [14160, 14440, 14740, 15040], 15500, false, 8.0)
	check(ok, "the sinking leaves carry you over to the treetop market (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_market_vine_to_the_owl_lookout() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(16330, -462))
	press(0, "move_right")
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"Climb":
			break
	release(0, "jump")
	release(0, "move_right")
	check(p.state_machine.current_name() == &"Climb", "jumping at the vine grabs it (%s)" % p.state_machine.current_name())
	press(0, "move_up")
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -1250.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	await seconds(1.0)
	release(0, "move_right")
	check(p.is_on_floor() and p.global_position.y < -1290.0 and p.global_position.x > 16500.0, "climbing to the top gets you onto the Owl Lookout (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_4_lookout_zipline_to_the_gate() -> void:
	var p: Player = await _load_demo(W1_4)
	await _clear_enemies()
	await _place(p, Vector2(17350, -1302))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 18400.0:
			landed = true
			break
	check(landed, "the lookout zipline reaches the last tree (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [], 19100, false, 4.0)
	check(gm().level_complete, "the gate on the last tree completes Bramble Bridges (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_lily_lagoon_and_the_shell_bowl() -> void:
	var p: Player = await _load_demo(W1_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(11600, -452))
	var swam := await _swim_across(p, 13150.0, 13350.0, 14.0)
	check(swam, "you can swim across Lily Lagoon (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [14130], 14700, false, 10.0)
	check(ok, "across Lily Lagoon and past the shell bowl to the Mill Race (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_mill_race_raft_ride() -> void:
	var p: Player = await _load_demo(W1_5)
	await _clear_enemies()
	await _place(p, Vector2(14880, -452))
	var ok := await _ride_raft(p, 14960.0, 16520.0, -415.0)
	check(ok and p.global_position.x > 16790.0 and p.global_position.y < -440.0, "a log carries you down the Mill Race (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_5_kingfisher_bank_to_the_mill_gate() -> void:
	var p: Player = await _load_demo(W1_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(16860, -452))
	var ok: bool = await _hop_run(p, [17060], 19400, false, 12.0)
	check(ok or gm().level_complete, "over the seesaw and up the mill-house hill (at %s)" % p.global_position)
	check(gm().level_complete, "the mill-house gate completes Millstream Rush")
	await _finish_demo()


func test_w1_6_great_hall_and_the_timed_portcullis() -> void:
	var p: Player = await _load_demo(W1_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5460, -42))
	var ok: bool = await _hop_run(p, [], 6740, false, 6.0)
	check(ok, "through the great hall to the lever (at %s)" % p.global_position)
	p.facing = 1
	await _punch()
	await frames(10)
	ok = await _hop_run(p, [], 7120, false, 4.0)
	check(ok, "punching the lever lifts the portcullis long enough to dash through (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_6_portcullis_blocks_you_without_the_lever() -> void:
	var p: Player = await _load_demo(W1_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6860, -42))
	var ok: bool = await _hop_run(p, [], 7100, false, 2.0)
	check(not ok and p.global_position.x < 6960.0, "the shut portcullis stops you (at %s)" % p.global_position)
	await _finish_demo()


func test_w1_6_thorn_bridge_to_the_tower() -> void:
	var p: Player = await _load_demo(W1_6)
	await _clear_enemies()
	await _place(p, Vector2(7100, -42))
	var ok: bool = await _hop_run(p, [7470], 8200, false, 8.0)
	check(ok, "over the thorn bridge (and its broken plank) to the tower door (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_1_bowling_hill_snowball_knocks_down_the_pins() -> void:
	var p: Player = await _load_demo(W2_1)
	await _place(p, Vector2(15330, 758))
	p.invulnerable_timer = 100.0
	p.facing = 1
	await frames(10)
	await _punch()
	await seconds(4.0)
	var standing := 0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e.global_position.x > 15700.0 and e.global_position.x < 16300.0 and not e.dead:
			standing += 1
	check(standing == 0, "the snowball bowls over every pin on Bowling Hill (%d left)" % standing)
	await _finish_demo()


func test_w2_1_icicles_rink_and_the_camp_gate() -> void:
	var p: Player = await _load_demo(W2_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(15000, 758))
	var ok: bool = await _hop_run(p, [], 19560, false, 18.0)
	check(ok or gm().level_complete, "down Bowling Hill, under the icicles and across the rink (at %s)" % p.global_position)
	check(gm().level_complete, "the Yetling camp gate completes Snowball Slopes")
	await _finish_demo()


func test_w2_2_high_gondolas_cross_the_snowl_gorge() -> void:
	var p: Player = await _load_demo(W2_2)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(14710, -1654), 16050.0, -1650.0)
	check(ok, "the first high gondola reaches the middle station (at %s)" % p.global_position)
	ok = await _ride_lift(p, Vector2(16300, -1654), 17550.0, -1900.0)
	check(ok, "the second high gondola climbs to the summit (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_2_summit_plateau_to_the_gate() -> void:
	var p: Player = await _load_demo(W2_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(17420, -1902))
	var ok: bool = await _hop_run(p, [], 18750, false, 8.0)
	check(ok or gm().level_complete, "across the summit plateau (at %s)" % p.global_position)
	check(gm().level_complete, "the summit gate completes Cablecar Cliffs")
	await _finish_demo()


func test_w2_3_ice_chute_and_the_floes() -> void:
	var p: Player = await _load_demo(W2_3)
	await _clear_enemies()
	await _place(p, Vector2(13450, -402))
	var ok: bool = await _hop_run(p, [14760, 15060, 15360, 15660, 15960], 16300, false, 12.0)
	check(ok, "down the ice chute and over the floes (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w2_3_cracked_geode_hides_gem_2() -> void:
	var p: Player = await _load_demo(W2_3)
	await _clear_enemies()
	await _place(p, Vector2(16450, 98))
	p.facing = 1
	await _run_to(p, 16540, "move_right", 1.0)
	release(0, "move_right")
	await _punch()
	await frames(20)
	press(0, "move_right")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[2], "punching the geode open reaches gem 2 (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_3_geode_hall_crushers_to_the_gate() -> void:
	var p: Player = await _load_demo(W2_3)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	await _place(p, Vector2(16300, 98))
	var ok: bool = await _hop_run(p, [16520], 18050, true, 8.0)
	check(ok or gm().level_complete, "over the geode and sprinting under the crushers (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	check(gm().level_complete, "the gate completes Crystal Caverns")
	await _finish_demo()


func test_w2_4_second_avalanche_can_be_outrun_to_the_lower_lodge() -> void:
	var p: Player = await _load_demo(W2_4)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		e.queue_free()
	var ava: Avalanche = _nodes_of("Avalanche")[1]
	await _place(p, Vector2(14830, 898))
	var ok := await _hop_run(p, [17470], 18900, true, 20.0)
	check(ava.active or ava._done, "running into the Lower Gorge sets off the second avalanche")
	check(ok, "sprinting and hopping the crevasse outruns it (at %s, bubbled %s)" % [p.global_position, p.is_bubbled()])
	ok = await _hop_run(p, [], 19400, false, 4.0)
	check(gm().level_complete, "the lower lodge gate completes Avalanche Alley (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_4_second_avalanche_restarts_behind_its_checkpoint() -> void:
	var p: Player = await _load_demo(W2_4)
	var first: Avalanche = _nodes_of("Avalanche")[0]
	var ava: Avalanche = _nodes_of("Avalanche")[1]
	gm().checkpoint = Vector2(16600, 1178)
	EventBus.level_reset.emit()
	await frames(2)
	await seconds(ava.restart_delay + 0.3)
	check(ava.active, "the second avalanche comes again behind the mid-gorge checkpoint")
	check(not first.active, "the first one stays put")
	await _finish_demo()


func test_w2_5_steam_gorge_rocks() -> void:
	var p: Player = await _load_demo(W2_5)
	p.invulnerable_timer = 100.0
	await _clear_enemies()
	await _place(p, Vector2(14700, -402))
	var ok: bool = await _hop_run(p, [14960, 15260, 15560, 15860, 16160], 16500, false, 8.0)
	check(ok, "hopping the rocks crosses the steam gorge (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_5_snow_fort_and_the_geyser_to_the_spa() -> void:
	var p: Player = await _load_demo(W2_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(16480, -402))
	var ok: bool = await _hop_run(p, [16930, 17380], 17800, false, 6.0)
	check(ok, "through the Yetlings' snow fort (at %s)" % p.global_position)
	await _clear_enemies()
	await _geyser_ride(p, 17840, -920, 18100, 10.0, -400.0)
	check(p.global_position.y < -890.0 and p.is_on_floor(), "the geyser throws you up to the summit spa (at %s)" % p.global_position)
	ok = await _hop_run(p, [18360], 19100, false, 8.0)
	check(gm().level_complete, "the summit spa gate completes Hot Spring Hollow (at %s)" % p.global_position)
	await _finish_demo()


func test_w2_6_gale_bridge_and_the_yetling_outpost() -> void:
	var p: Player = await _load_demo(W2_6)
	await _clear_enemies()
	await _place(p, Vector2(5650, -702))
	var ok: bool = await _hop_run(p, [6280], 6800, true, 8.0)
	check(ok, "over the broken bridge in the gale (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	ok = await _hop_run(p, [7750], 8080, false, 6.0)
	check(ok, "through the outpost to the ice wall (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_liana_ravine() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _place(p, Vector2(12700, -2))
	var ok := await _liana_cross(p, 13040.0, 14250.0)
	check(ok, "two lianas swing you over the ravine (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_grove_mushroom_reaches_the_treetop() -> void:
	var p: Player = await _load_demo(W3_1)
	await _clear_enemies()
	await _pad_hop(p, Vector2(14850, 0), -660.0, 15100.0)
	check(p.global_position.y < -630.0 and p.is_on_floor(), "the mushroom throws you up onto the grove treetop (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_1_grove_and_the_rainbow_falls_gate() -> void:
	var p: Player = await _load_demo(W3_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14200, -2))
	var ok: bool = await _hop_run(p, [14400], 16300, false, 10.0)
	check(ok or gm().level_complete, "through the monkey grove to the falls (at %s)" % p.global_position)
	check(gm().level_complete, "the rainbow falls gate completes Drizzle Thicket")
	await _finish_demo()


func test_w3_2_zipline_down_to_the_fig_tree() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(11850, -42))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 12800.0:
			landed = true
			break
	release(0, "move_right")
	check(landed and p.global_position.y > 300.0, "the zipline drops you on the fig tree (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_2_vine_up_the_fig_trunk_to_the_crown_gate() -> void:
	var p: Player = await _load_demo(W3_2)
	await _clear_enemies()
	await _place(p, Vector2(13530, 358))
	press(0, "move_right")
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		if p.state_machine.current_name() == &"Climb":
			break
	release(0, "jump")
	release(0, "move_right")
	check(p.state_machine.current_name() == &"Climb", "jumping at the vine grabs it (%s)" % p.state_machine.current_name())
	press(0, "move_up")
	for i in 900:
		await get_tree().physics_frame
		if p.global_position.y < -470.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	await seconds(1.0)
	release(0, "move_right")
	check(p.is_on_floor() and p.global_position.y < -510.0, "climbing to the top gets you onto the crown branch (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	var ok: bool = await _hop_run(p, [], 15520, false, 8.0)
	check(gm().level_complete, "the bridge leads to the crown gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_stepping_stones_over_the_piranha_pool() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(12450, -2))
	var ok: bool = await _hop_run(p, [12760, 13060, 13360, 13660], 14100, false, 8.0)
	check(ok, "the stepping stones cross the piranha pool (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w3_3_pendulums_hit_anyone_standing_underneath() -> void:
	var p: Player = await _load_demo(W3_3)
	await _clear_enemies()
	await _place(p, Vector2(14550, -2))
	p.invulnerable_timer = 0.0
	var hit := false
	for i in 360:
		await get_tree().physics_frame
		hit = hit or p.is_bubbled() or p.global_position.x < 14000.0
	check(hit, "standing under a spiked pendulum gets you hit (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_3_colonnade_and_the_altar_gate() -> void:
	var p: Player = await _load_demo(W3_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14080, -2))
	var ok: bool = await _hop_run(p, [15340, 15540], 16350, false, 10.0)
	check(ok or gm().level_complete, "under the pendulums and up the altar steps (at %s)" % p.global_position)
	check(gm().level_complete, "the altar gate completes the Sunken Temple")
	await _finish_demo()


func test_w3_4_lily_leaves_cross_the_river_mouth() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(12600, -2))
	var ok: bool = await _hop_run(p, [12930, 13220, 13520, 13820, 14120, 14420], 14800, false, 10.0)
	check(ok, "the sinking lily leaves cross the river mouth (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w3_4_fishing_village_gate() -> void:
	var p: Player = await _load_demo(W3_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14740, -2))
	var ok: bool = await _hop_run(p, [], 16750, false, 8.0)
	check(ok or gm().level_complete, "through the fishing village (at %s)" % p.global_position)
	check(gm().level_complete, "the village gate completes Rumbletide Rapids")
	await _finish_demo()


func test_w3_4_river_mouth_can_be_swum_if_you_fall_in() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _place(p, Vector2(12900, -2))
	var ok := await _swim_across(p, 14550.0, 14700.0, 14.0)
	check(ok, "you can swim the river mouth and climb out (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w3_5_drifting_logs_cross_the_sinkhole() -> void:
	var p: Player = await _load_demo(W3_5)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(13010, -2), 13650.0, -2.0)
	check(ok, "the first log carries you to the island (at %s)" % p.global_position)
	ok = await _ride_lift(p, Vector2(14010, -2), 14955.0, -2.0)
	check(ok, "the second log carries you over to the clearing (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_5_glowcap_clearing_gate() -> void:
	var p: Player = await _load_demo(W3_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14880, -2))
	var ok: bool = await _hop_run(p, [], 16200, false, 8.0)
	check(ok or gm().level_complete, "through the glowcap clearing (at %s)" % p.global_position)
	check(gm().level_complete, "the stilt-village gate completes Firefly Bog")
	await _finish_demo()


func test_w3_6_colour_garden_and_the_summit_lianas() -> void:
	var p: Player = await _load_demo(W3_6)
	await _clear_enemies_except_bosses()
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6060, -702))
	var ok: bool = await _hop_run(p, [], 6640, false, 6.0)
	check(ok, "through the colour garden (at %s)" % p.global_position)
	p.invulnerable_timer = 0.0
	ok = await _liana_cross(p, 6880.0, 8000.0)
	check(ok, "over the summit chasm on the lianas (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	ok = await _hop_run(p, [], 8850, false, 6.0)
	check(ok, "the guard terrace leads to the arena door (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_backwards_conveyor_bridge() -> void:
	var p: Player = await _load_demo(W4_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12450, -2))
	var ok: bool = await _hop_run(p, [], 14100, false, 8.0)
	check(ok, "running against the conveyor bridge gets you across (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_conveyor_bridge_carries_idle_players_back() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	await _place(p, Vector2(13000, -26))
	await seconds(1.0)
	check(p.global_position.x < 12920.0, "standing still on the bridge rolls you back toward the start (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_1_parade_mushroom_and_the_clock_plaza_gate() -> void:
	var p: Player = await _load_demo(W4_1)
	await _clear_enemies()
	await _pad_hop(p, Vector2(15200, 0), -660.0, 15400.0)
	check(p.global_position.y < -610.0 and p.is_on_floor(), "the mushroom reaches the shelf (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(14100, -2))
	var ok: bool = await _hop_run(p, [], 16350, false, 8.0)
	check(gm().level_complete, "the parade route leads to the clock plaza gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w3_4_village_mushroom_reaches_the_lookout() -> void:
	var p: Player = await _load_demo(W3_4)
	await _clear_enemies()
	await _pad_hop(p, Vector2(15750, 0), -660.0, 15950.0)
	check(p.global_position.y < -630.0 and p.is_on_floor(), "the mushroom throws you up onto the village lookout (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_packing_line_crushers() -> void:
	var p: Player = await _load_demo(W4_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12320, -2))
	var ok: bool = await _hop_run(p, [], 14250, false, 8.0)
	check(ok, "along the rushing belt under the crushers (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_2_shipping_lift_to_the_catwalk_gate() -> void:
	var p: Player = await _load_demo(W4_2)
	await _clear_enemies()
	var ok := await _ride_lift(p, Vector2(14710, -2), 14930.0, -600.0)
	check(ok, "the shipping lift reaches the loading catwalk (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	ok = await _hop_run(p, [], 16150, false, 8.0)
	check(gm().level_complete, "the loading-catwalk gate completes Conveyor Chaos (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_geysers_up_and_over_the_great_boiler() -> void:
	var p: Player = await _load_demo(W4_3)
	await _clear_enemies()
	await _geyser_ride(p, 12780, -540, 13000, 10.0)
	check(p.global_position.y < -510.0 and p.is_on_floor(), "the first geyser reaches walkway A (at %s)" % p.global_position)
	await _geyser_ride(p, 13430, -1020, 13700, 10.0, -520.0)
	check(p.global_position.y < -990.0 and p.is_on_floor(), "the second geyser reaches the top of the boiler (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_3_boiler_top_and_the_gauge_yard_gate() -> void:
	var p: Player = await _load_demo(W4_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(13620, -1002))
	var ok: bool = await _hop_run(p, [], 16150, false, 12.0)
	check(gm().level_complete, "over the boiler's vents, down and through the gauge yard to the gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_great_pendulum_carries_you_over_the_drop() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	var pd: Pendulum = null
	for n in _demo.find_children("*", "Pendulum", true, false):
		if not n.spiked:
			pd = n
	check(pd != null, "the level should have a rideable pendulum")
	for i in 600:
		await get_tree().physics_frame
		if pd.angle() > pd.amplitude * 0.97:
			break
	p.global_position = pd.global_position + pd.log_position() + Vector2(0, -30)
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	for i in 600:
		await get_tree().physics_frame
		if pd.angle() < -pd.amplitude * 0.9:
			break
	press(0, "move_right")
	press(0, "jump")
	await frames(20)
	release(0, "jump")
	await seconds(1.5)
	release(0, "move_right")
	check(p.global_position.x > 14000.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "jumping off at the far end reaches the bell yard (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_ledges_reach_the_pendulum() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	await _place(p, Vector2(12400, -2))
	var ok: bool = await _hop_to(p, 12610, -180)
	ok = ok and await _hop_to(p, 12770, -360)
	check(ok and p.global_position.y < -350.0, "two ledges lead up to the pendulum's reach (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_4_bell_yard_steps_and_the_gate() -> void:
	var p: Player = await _load_demo(W4_4)
	await _clear_enemies()
	await _place(p, Vector2(14250, -2))
	await _beat_hops(p, [[14520, 0], [14720, 1], [14920, 0], [15120, -1]])
	check(p.global_position.y < -590.0, "the tick-tock steps reach the bell balcony (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	var ok: bool = await _hop_run(p, [], 16150, false, 8.0)
	check(gm().level_complete, "the bell yard gate completes Tick-Tock Tower (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_dark_shaft_up_to_the_catwalk() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(12600, -2))
	var ok := true
	for t: Vector2 in [Vector2(12790, -180), Vector2(13010, -360), Vector2(12790, -540), Vector2(13010, -720), Vector2(13200, -900)]:
		ok = ok and await _hop_to(p, t.x, t.y)
	check(ok and p.global_position.y < -890.0, "up the shelves to the high catwalk (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_5_zipline_over_the_abyss_to_the_gate() -> void:
	var p: Player = await _load_demo(W4_5)
	await _clear_enemies()
	await _place(p, Vector2(13550, -902))
	press(0, "move_right")
	press(0, "jump")
	await frames(10)
	release(0, "jump")
	var landed := false
	for i in 900:
		await get_tree().physics_frame
		if p.is_on_floor() and p.global_position.x > 15000.0:
			landed = true
			break
	check(landed, "the zipline carries you over the abyss (at %s)" % p.global_position)
	var ok: bool = await _hop_run(p, [], 16150, false, 6.0)
	check(gm().level_complete, "the night yard gate completes Night Shift (at %s)" % p.global_position)
	await _finish_demo()


func test_w4_6_gear_plaza_and_the_tick_tock_bridge() -> void:
	var p: Player = await _load_demo(W4_6)
	await _clear_enemies_except_bosses()
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6050, -702))
	var ok: bool = await _hop_run(p, [], 6860, false, 6.0)
	check(ok, "across the gear plaza (at %s)" % p.global_position)
	p.invulnerable_timer = 0.0
	await _beat_hops(p, [[7060, 0], [7300, 1], [7540, 0], [7780, 1], [8000, -1]])
	check(p.global_position.x > 7880.0 and p.global_position.y < -690.0 and not p.is_bubbled(), "the tick-tock bridge crosses the gear pit (at %s)" % p.global_position)
	p.invulnerable_timer = 100.0
	ok = await _hop_run(p, [], 8850, false, 6.0)
	check(ok, "the landing leads to the bell loft (at %s)" % p.global_position)
	await _finish_demo()


func test_sunset_moat_bridge_and_courtyard_to_the_gate() -> void:
	var p: Player = await _load_demo("res://levels/sunset_gusts.tscn")
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10600, -2))
	var ok: bool = await _hop_run(p, [11470, 12250], 13950, false, 12.0)
	check(ok or gm().level_complete, "over the moat bridge and through the courtyard (at %s)" % p.global_position)
	check(gm().level_complete, "the courtyard gate completes Sunset Gusts")
	await _finish_demo()


func test_glacier_frozen_approach_bowl_and_icicle_hall() -> void:
	var p: Player = await _load_demo("res://levels/glacier_grotto.tscn")
	await _place(p, Vector2(9060, -2))
	p.invulnerable_timer = 100.0
	p.facing = 1
	await frames(10)
	await _punch()
	await seconds(4.0)
	var standing := 0
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Grunt and e.global_position.x > 9700.0 and e.global_position.x < 10200.0 and not e.dead:
			standing += 1
	check(standing == 0, "the snowball bowls the rink guards over (%d left)" % standing)
	var ok: bool = await _hop_run(p, [], 12300, false, 12.0)
	check(ok, "across the rink and through the icicle hall to the King's door (at %s)" % p.global_position)
	await _finish_demo()


func test_candy_gumdrop_hops_down_to_the_meadow_gate() -> void:
	var p: Player = await _load_demo("res://levels/candy_canopy.tscn")
	await _clear_enemies()
	await _place(p, Vector2(11300, -1252))
	var ok: bool = await _hop_run(p, [11560, 12010, 12510, 13010, 13510, 14020], 14650, false, 14.0)
	check(ok or gm().level_complete, "hopping the gumdrops down to the candy meadow (at %s)" % p.global_position)
	check(gm().level_complete, "the meadow gate completes Candy Canopy")
	await _finish_demo()


# --- World 5: Deep Sea Dream pieces and enemies --------------------------------------------

func _add_water(rect: Rect2) -> Water:
	var w := Water.new()
	w.position = rect.position
	w.size = rect.size
	_arena.add_child(w)
	return w


func test_bubble_column_carries_swimmers_up() -> void:
	_add_water(Rect2(-600, -800, 1200, 800))
	var col := BubbleColumn.new()
	col.position = Vector2(-60, -800)
	col.size = Vector2(120, 800)
	_arena.add_child(col)
	var p := add_player(0, Vector2(0, -150))
	await frames(20)
	check(_state(p) == &"Swim", "the player swims in the water (%s)" % _state(p))
	var y0 := p.global_position.y
	await seconds(1.0)
	check(p.global_position.y < y0 - 200.0, "the bubbles carry you up (%.0f -> %.0f)" % [y0, p.global_position.y])


func test_clam_bounces_only_while_open() -> void:
	var c := Clam.new()
	c.position = Vector2(0, 0)
	c.open_time = 1.0
	c.closed_time = 1.0
	_arena.add_child(c)
	var p := add_player(0, Vector2(300, -2))
	await settle(p)
	# Wait until it is shut, then stand on it: no bounce.
	for i in 300:
		await get_tree().physics_frame
		if not c.is_open() and fposmod(c._tt + c.phase, 2.0) < 1.15:
			break
	p.global_position = Vector2(0, -60)
	p.velocity = Vector2.ZERO
	await frames(8)
	check(p.velocity.y >= -100.0, "a shut clam doesn't launch you (vy %.0f)" % p.velocity.y)
	var launched := false
	for i in 200:
		await get_tree().physics_frame
		if p.velocity.y < -600.0:
			launched = true
			break
	check(launched, "once it opens, it flings you up")


func test_tide_water_rises_and_falls() -> void:
	var t := TideWater.new()
	t.position = Vector2(-400, -300)
	t.size = Vector2(800, 300)
	t.amplitude = 120.0
	t.period = 2.0
	_arena.add_child(t)
	var lo := 99999.0
	var hi := -99999.0
	for i in 150:
		await get_tree().physics_frame
		lo = minf(lo, t.surface_y())
		hi = maxf(hi, t.surface_y())
	check(hi - lo > 100.0, "the tide moves the surface up and down (%.0f..%.0f)" % [lo, hi])


func test_pufferfin_is_all_spikes_when_puffed() -> void:
	var f := _spawn_enemy("res://enemies/pufferfin.tscn", Vector2(-200, -80)) as Pufferfin
	f.puff_every = 0.5
	f.puff_time = 2.0
	await seconds(1.0)
	check(f.is_puffed() and not f.stompable, "puffed up, it can't be stomped")
	f.take_hit(null, Vector2.RIGHT)
	check(not f.dead, "punches bounce off the spikes")
	f.puff_every = 100.0
	f._t = 0.0
	await seconds(0.5)
	f.take_hit(null, Vector2.RIGHT)
	check(f.dead, "small again, a punch pops it")


func test_crabbit_claw_blocks_punches_from_the_front() -> void:
	var p := add_player(0, Vector2(100, -2))
	await settle(p)
	var c := _spawn_enemy("res://enemies/crabbit.tscn", Vector2(0, 0), 1) as Crabbit
	c.walk_speed = 0.0
	await frames(3)
	c.facing = 1
	check(c.blocks_hit(p, Enemy.HitKind.PUNCH), "a punch from the claw's side clanks")
	c.facing = -1
	check(not c.blocks_hit(p, Enemy.HitKind.PUNCH), "a punch from behind lands")
	check(c.stompable, "you can always jump on its back")


func test_jellybob_is_a_trampoline() -> void:
	var j := _spawn_enemy("res://enemies/jellybob.tscn", Vector2(0, -100)) as Jellybob
	j.bob = 0.0
	var p := add_player(0, Vector2(0, -400))
	var top := 0.0
	var bounced := false
	for i in 200:
		await get_tree().physics_frame
		if p.velocity.y < -900.0:
			bounced = true
		top = minf(top, p.global_position.y)
	check(bounced and not j.dead, "stomping it bounces you high and it doesn't mind (peak %.0f)" % top)


func test_eelectra_lunges_only_when_you_come_close() -> void:
	var e := _spawn_enemy("res://enemies/eelectra.tscn", Vector2(-300, -100), 1) as Eelectra
	await frames(10)
	check(e.st == Eelectra.St.HIDE and e.blocks_hit(null, Enemy.HitKind.PUNCH), "it hides (and can't be hit) when nobody is near")
	var p := add_player(0, Vector2(-100, -2))
	p.invulnerable_timer = 100.0
	var out := false
	for i in 120:
		await get_tree().physics_frame
		if e._ext > 0.9:
			out = true
			break
	check(out and e.global_position.x > -150.0, "it lunges out at you (x %.0f)" % e.global_position.x)
	check(not e.blocks_hit(p, Enemy.HitKind.PUNCH), "while it's out it can be hit")


func test_anglerling_drifts_toward_you_and_glows() -> void:
	var a := _spawn_enemy("res://enemies/anglerling.tscn", Vector2(-400, -120)) as Anglerling
	var p := add_player(0, Vector2(0, -2))
	p.invulnerable_timer = 100.0
	await seconds(1.5)
	check(a.global_position.x > -330.0, "it drifts toward you (x %.0f)" % a.global_position.x)
	check(a.find_children("*", "GlowLight", true, false).size() == 1, "its lure is a light")


func test_inkabella_only_her_stuck_tentacle_can_be_hurt() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	var b := _spawn_enemy("res://enemies/inkabella.tscn", Vector2(-300, 0), 1) as Inkabella
	var p := add_player(0, Vector2(150, -2))
	await settle(p)
	p.invulnerable_timer = 100.0
	b.set_active(true)
	await frames(2)
	var hp := b.health
	b.take_hit(p, Vector2.RIGHT)
	check(b.health == hp, "her body shrugs off punches")
	b._slams_left = 1
	b._start_aim()
	var stuck := false
	for i in 240:
		await get_tree().physics_frame
		if b.st == Inkabella.St.STUCK:
			stuck = true
			break
	check(stuck, "the tentacle slams down and sticks")
	check(absf(b.tip().x - p.global_position.x) < 120.0, "it slams where you were (tip %.0f, you %.0f)" % [b.tip().x, p.global_position.x])
	p.global_position = b.tip() + Vector2(0, -160)
	p.velocity = Vector2.ZERO
	p.state_machine.transition_to(&"Fall")
	for i in 120:
		await get_tree().physics_frame
		if b.health < hp:
			break
	check(b.health == hp - 1, "a stomp on the stuck tentacle hurts her (hp %d -> %d)" % [hp, b.health])


func test_inkabella_slam_hurts_whoever_is_underneath() -> void:
	for n in [^"Wall"]:
		if _arena.has_node(n):
			_arena.get_node(n).free()
	var b := _spawn_enemy("res://enemies/inkabella.tscn", Vector2(-300, 0), 1) as Inkabella
	var p := add_player(0, Vector2(150, -2))
	await settle(p)
	b.set_active(true)
	await frames(2)
	p.invulnerable_timer = 0.0
	b._slams_left = 1
	b._start_aim()
	var hit := false
	for i in 240:
		await get_tree().physics_frame
		hit = hit or p.is_bubbled()
	check(hit, "standing under the slam gets you hit")


## General bot: hold right; jump at ledges / gaps and when blocked; in water swim up and
## stroke, leaping out at banks. Good for mixed land-and-water stretches. Returns true when
## standing past end_x.
func _auto_run(p: Player, end_x: float, max_s := 20.0, sprint := false) -> bool:
	press(0, "move_right")
	if sprint:
		press(0, "sprint")
	var held := 0
	var stuck := 0
	var space := p.get_world_2d().direct_space_state
	for i in int(max_s * 60.0):
		await get_tree().physics_frame
		if held > 0:
			held -= 1
			if held == 0:
				release(0, "jump")
		var st := _state(p)
		if st == &"Swim":
			press(0, "move_up")
			if i % 16 == 0 and held == 0:
				press(0, "jump")
				held = 6
		elif st == &"Climb":
			release(0, "move_up")
			if held == 0:
				press(0, "jump")
				held = 10
		else:
			release(0, "move_up")
			if p.is_on_floor() and held == 0:
				stuck = stuck + 1 if absf(p.velocity.x) < 40.0 else 0
				var ahead := p.global_position + Vector2(60, -10)
				var q := PhysicsRayQueryParameters2D.create(ahead, ahead + Vector2(0, 90), 1)
				var edge := space.intersect_ray(q).is_empty()
				if stuck > 5 or edge:
					press(0, "jump")
					held = 40
					stuck = 0
		if DEBUG_AUTO and i % 30 == 0:
			print("AR ", i, " ", p.global_position.round(), " ", st, " v", p.velocity.round())
		if p.global_position.x >= end_x and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "sprint")
	release(0, "jump")
	release(0, "move_up")
	return p.global_position.x >= end_x and not p.is_bubbled()


## Bot: swim through a list of points (steering with the d-pad, stroking now and then).
func _swim_path(p: Player, pts: Array, max_s := 12.0) -> bool:
	var k := 0
	for i in int(max_s * 60.0):
		await get_tree().physics_frame
		if k >= pts.size():
			break
		var d: Vector2 = pts[k] - p.global_position
		for a in ["move_left", "move_right", "move_up", "move_down"]:
			release(0, a)
		if d.x > 20.0: press(0, "move_right")
		elif d.x < -20.0: press(0, "move_left")
		if d.y > 20.0: press(0, "move_down")
		elif d.y < -20.0: press(0, "move_up")
		if i % 30 == 0:
			press(0, "jump")
		elif i % 30 == 6:
			release(0, "jump")
		if DEBUG_AUTO and i % 20 == 0:
			print("SW ", i, " k", k, " ", p.global_position.round(), " ", _state(p), " v", p.velocity.round())
		if d.length() < 50.0:
			k += 1
	for a in ["move_left", "move_right", "move_up", "move_down", "jump"]:
		release(0, a)
	return k >= pts.size()


const DEBUG_AUTO := false
const W5_1 := "res://levels/w5_1_seashell_shore.tscn"


func test_w5_1_beach_and_tide_pools() -> void:
	var p: Player = await _load_demo(W5_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 3100, 16.0)
	check(ok, "along the beach and over the tide pools (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_1_dive_under_the_arch_for_gem_0() -> void:
	var p: Player = await _load_demo(W5_1)
	await _clear_enemies()
	await _place(p, Vector2(3300, -2))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(3600, 460), Vector2(4300, 470), Vector2(4500, 540), Vector2(4520, 60)])
	check(ok, "swimming down and under the rock arch (at %s)" % p.global_position)
	check(gm().gems[0], "gem 0 waits on the pool floor")
	ok = await _auto_run(p, 4800, 6.0)
	check(ok, "and out on the far bank (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_1_clam_flings_you_to_the_ledge() -> void:
	var p: Player = await _load_demo(W5_1)
	await _clear_enemies()
	await _pad_hop(p, Vector2(5300, 0), -580.0, 5520.0, 6.0)
	check(p.global_position.y < -530.0 and p.is_on_floor(), "the open clam throws you up onto the ledge (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_1_jelly_bounce_reaches_gem_1() -> void:
	var p: Player = await _load_demo(W5_1)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Jellybob:
			e.queue_free()
		else:
			e.bob = 0.0
	await _place(p, Vector2(8000, -300))
	p.state_machine.transition_to(&"Fall")
	var bounced := false
	var top := 0.0
	for i in 200:
		await get_tree().physics_frame
		top = minf(top, p.global_position.y)
		if p.velocity.y < -900.0:
			bounced = true
		if bounced:
			press(0, "move_right")
		if p.global_position.x > 8170.0:
			release(0, "move_right")
		if gm().gems[1]:
			break
	release(0, "move_right")
	check(gm().gems[1], "a jellybob bounce reaches gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_1_jelly_bay_dune_and_the_sea_well() -> void:
	var p: Player = await _load_demo(W5_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(7280, -2))
	var ok := await _auto_run(p, 11400, 20.0)
	check(ok, "across the jelly bay and over the dune (at %s, %s)" % [p.global_position, _state(p)])
	await _clear_enemies()
	ok = await _auto_run(p, 11900, 14.0)
	check(ok and p.global_position.y < -790.0, "the bubbles in the sea-well carry you up to the cliffs (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_1_cliffs_and_dunes_to_the_gate() -> void:
	var p: Player = await _load_demo(W5_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(11950, -802))
	var ok := await _auto_run(p, 14700, 12.0)
	ok = await _hop_run(p, [14900], 16100, false, 8.0)
	check(gm().level_complete, "down the dunes and over the sandcastle to the gate (at %s)" % p.global_position)
	await _finish_demo()


const W5_2 := "res://levels/w5_2_coral_kingdom.tscn"


func test_w5_2_reef_towers_and_the_current() -> void:
	var p: Player = await _load_demo(W5_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 5400, 30.0)
	check(ok, "over the reef towers and swept along the current (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_2_gem_0_under_the_coral_arch() -> void:
	var p: Player = await _load_demo(W5_2)
	await _clear_enemies()
	await _place(p, Vector2(3500, 200))
	p.state_machine.transition_to(&"Fall")
	var ok := await _swim_path(p, [Vector2(3700, 600), Vector2(4000, 620)], 8.0)
	check(gm().gems[0], "gem 0 waits under the coral arch (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_2_clam_reaches_the_reef_shelf() -> void:
	var p: Player = await _load_demo(W5_2)
	await _clear_enemies()
	await _pad_hop(p, Vector2(5700, 0), -580.0, 5950.0, 6.0)
	check(p.global_position.y < -530.0 and p.is_on_floor(), "the clam throws you up onto the reef shelf (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_2_deep_tunnel_and_gem_1() -> void:
	var p: Player = await _load_demo(W5_2)
	await _clear_enemies()
	await _place(p, Vector2(7400, -2))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(8300, 650), Vector2(9200, 640), Vector2(9200, 600), Vector2(10000, 650)], 20.0)
	check(gm().gems[1], "gem 1 sits in the tunnel's side niche (at %s)" % p.global_position)
	check(ok, "swimming the whole tunnel (at %s)" % p.global_position)
	ok = await _auto_run(p, 11200, 10.0)
	check(ok, "the bubble column helps you out the far side (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_2_jelly_up_the_coral_cliffs() -> void:
	var p: Player = await _load_demo(W5_2)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Jellybob:
			e.queue_free()
		else:
			e.bob = 0.0
	await _place(p, Vector2(11660, -362))
	press(0, "move_right")
	var landed := false
	var jumped := false
	var bounced := false
	for i in 300:
		await get_tree().physics_frame
		if not jumped and p.global_position.x >= 11730.0 and p.is_on_floor():
			press(0, "jump")
			jumped = true
		if p.velocity.y < -1000.0:
			bounced = true
		if bounced:
			press(0, "move_right")
		elif jumped and p.global_position.x > 11850.0:
			release(0, "move_right")
		if i > 40:
			release(0, "jump")
		if p.global_position.x > 12200.0 and p.is_on_floor():
			landed = true
			break
	release(0, "move_right")
	check(landed and p.global_position.y < -610.0, "a jellybob bounce reaches the top of the cliffs (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_2_cliffs_to_the_palace_gate() -> void:
	var p: Player = await _load_demo(W5_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12200, -622))
	var ok := await _auto_run(p, 14700, 12.0)
	ok = await _hop_run(p, [14900], 16100, false, 8.0)
	check(gm().level_complete, "down from the cliffs and over the shell to the gate (at %s)" % p.global_position)
	await _finish_demo()


const W5_3 := "res://levels/w5_3_shipwreck_cove.tscn"


func test_w5_3_bridge_and_galleon_deck() -> void:
	var p: Player = await _load_demo(W5_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 5700, 40.0)
	check(ok and p.global_position.y < -270.0, "over the broken bridge and onto the galleon's deck (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_3_climb_the_mast_to_gem_0() -> void:
	var p: Player = await _load_demo(W5_3)
	await _clear_enemies()
	await _place(p, Vector2(5000, -282))
	press(0, "move_up")
	for i in 240:
		await get_tree().physics_frame
		if _state(p) == &"Climb" and p.global_position.y < -820.0 and absf(p.velocity.y) < 5.0:
			break
	release(0, "move_up")
	check(_state(p) == &"Climb", "the rigging is climbable (at %s, %s)" % [p.global_position, _state(p)])
	press(0, "move_right")
	press(0, "jump")
	for i in 60:
		await get_tree().physics_frame
		if i == 14:
			release(0, "jump")
	release(0, "move_right")
	check(gm().gems[0], "hop from the rigging into the crow's nest for gem 0 (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_3_flooded_hold_and_gem_1() -> void:
	var p: Player = await _load_demo(W5_3)
	await _clear_enemies()
	await _place(p, Vector2(5850, -282))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if p.global_position.x > 5960.0:
			release(0, "move_right")
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(6400, 600), Vector2(7300, 620), Vector2(8300, 500), Vector2(8650, 60)], 16.0)
	check(gm().gems[1], "gem 1 waits in the hold's treasure chest (at %s)" % p.global_position)
	ok = await _auto_run(p, 9100, 8.0)
	check(ok, "out of the hold through the far hatch (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_3_upper_deck_over_the_hold() -> void:
	var p: Player = await _load_demo(W5_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5600, -282))
	var ok := await _auto_run(p, 9100, 30.0)
	check(ok, "along the upper deck, over the hatch and the see-saw (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_3_cannon_battery() -> void:
	var p: Player = await _load_demo(W5_3)
	await _clear_enemies()
	await _place(p, Vector2(9350, -2))
	await _run_to(p, 9480)
	release(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Cannon":
			break
	press(0, "jump")
	await frames(3)
	release(0, "jump")
	await seconds(3.0)
	check(p.global_position.x > 10430 and not p.is_bubbled(), "the cannons fire you over the rocks (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_3_clam_to_the_rigging() -> void:
	var p: Player = await _load_demo(W5_3)
	await _clear_enemies()
	await _pad_hop(p, Vector2(12750, 0), -580.0, 13000.0, 6.0)
	check(p.global_position.y < -530.0 and p.is_on_floor(), "the clam throws you up to the rigging ledge (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_3_stern_castle_to_the_gate() -> void:
	var p: Player = await _load_demo(W5_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10500, -2))
	var ok := await _auto_run(p, 13900, 30.0)
	check(ok, "over the stern castle (at %s, %s)" % [p.global_position, _state(p)])
	ok = await _hop_run(p, [14000], 15100, false, 8.0)
	check(gm().level_complete, "over the treasure chest to the gate (at %s)" % p.global_position)
	await _finish_demo()


const W5_4 := "res://levels/w5_4_kelp_forest_rapids.tscn"


## Bot: climb the kelp/vine at x to its top, then jump off to the right.
func _kelp_hop(p: Player, x: float, foot_y: float, max_s := 6.0) -> void:
	await _place(p, Vector2(x, foot_y - 2))
	press(0, "move_up")
	var still := 0
	for i in int(max_s * 60.0):
		await get_tree().physics_frame
		still = still + 1 if _state(p) == &"Climb" and absf(p.velocity.y) < 5.0 else 0
		if still > 10:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	for i in 90:
		await get_tree().physics_frame
		if i == 14:
			release(0, "jump")
		if i > 20 and p.is_on_floor():
			break
	release(0, "move_right")
	release(0, "jump")


func test_w5_4_shore_and_kelp_up_the_cliff() -> void:
	var p: Player = await _load_demo(W5_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 2200, 12.0)
	check(ok, "along the kelp shore (at %s, %s)" % [p.global_position, _state(p)])
	await _clear_enemies()
	await _kelp_hop(p, 2300, 0.0)
	check(p.is_on_floor() and p.global_position.y < -590.0, "climbing the giant kelp reaches the cliff top (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_4_pond_kelp_to_gem_0() -> void:
	var p: Player = await _load_demo(W5_4)
	await _clear_enemies()
	await _place(p, Vector2(3300, -320))
	p.state_machine.transition_to(&"Fall")
	press(0, "move_up")
	for i in 600:
		await get_tree().physics_frame
		if _state(p) == &"Climb" and p.global_position.y < -920.0:
			break
	release(0, "move_up")
	press(0, "move_right")
	press(0, "jump")
	await frames(14)
	release(0, "jump")
	await seconds(1.0)
	release(0, "move_right")
	check(gm().gems[0], "the pond's kelp leads up to the shelf with gem 0 (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_4_cliff_top_and_the_rapids() -> void:
	var p: Player = await _load_demo(W5_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(2550, -602))
	var ok := await _auto_run(p, 9200, 40.0)
	check(ok, "over the pond, down the slope and through the rapids (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_4_rapids_crevice_gem_1() -> void:
	var p: Player = await _load_demo(W5_4)
	await _clear_enemies()
	await _place(p, Vector2(7900, 300))
	p.state_machine.transition_to(&"Fall")
	var ok := await _swim_path(p, [Vector2(8150, 380), Vector2(8450, 540), Vector2(8620, 560)], 8.0)
	check(gm().gems[1], "gem 1 hides in the riverbed crevice (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_4_raft_channel() -> void:
	var p: Player = await _load_demo(W5_4)
	await _clear_enemies()
	await _place(p, Vector2(9950, -2))
	await _ride_raft(p, 10180.0, 12200.0, 20.0)
	check(p.global_position.x > 12150.0, "a raft carries you down the channel (at %s)" % p.global_position)
	var ok := await _auto_run(p, 12700, 6.0)
	check(ok, "and onto the far bank (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_4_kelp_to_the_snoozling_rock() -> void:
	var p: Player = await _load_demo(W5_4)
	await _clear_enemies()
	await _kelp_hop(p, 13300, 0.0)
	check(p.is_on_floor() and p.global_position.y < -640.0, "the last kelp reaches the Snoozling's rock (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_4_meadow_to_the_gate() -> void:
	var p: Player = await _load_demo(W5_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(12600, -2))
	var ok := await _auto_run(p, 14000, 14.0)
	ok = await _hop_run(p, [14100], 15100, false, 8.0)
	check(gm().level_complete, "over the hollow log to the gate (at %s)" % p.global_position)
	await _finish_demo()


const W5_5 := "res://levels/w5_5_midnight_trench.tscn"


func test_w5_5_rim_to_the_first_trench() -> void:
	var p: Player = await _load_demo(W5_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 2900, 14.0)
	check(ok, "along the trench rim (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_5_under_the_curtain_to_the_rest_island() -> void:
	var p: Player = await _load_demo(W5_5)
	await _clear_enemies()
	await _place(p, Vector2(3150, 200))
	p.state_machine.transition_to(&"Fall")
	var ok := await _swim_path(p, [Vector2(3450, 1050), Vector2(4150, 1050), Vector2(4600, 1450), Vector2(5500, 1300),
			Vector2(5680, 900)], 24.0)
	check(gm().gems[0], "gem 0 glows on the trench floor (at %s)" % p.global_position)
	check(ok, "swimming under the rock curtain to the bubble column (at %s)" % p.global_position)
	ok = await _auto_run(p, 6200, 10.0)
	check(ok, "the bubbles carry you up to the rest island (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_5_caverns_and_gem_1() -> void:
	var p: Player = await _load_demo(W5_5)
	await _clear_enemies()
	await _place(p, Vector2(6550, -42))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(6900, 1200), Vector2(7300, 1300), Vector2(8000, 1000), Vector2(8250, 1050),
			Vector2(8260, 1250), Vector2(8380, 1400)], 24.0)
	check(gm().gems[1], "gem 1 waits in the sealed grotto (at %s)" % p.global_position)
	ok = await _swim_path(p, [Vector2(8260, 1250), Vector2(8250, 1000), Vector2(9300, 900)], 14.0)
	check(ok, "back out of the grotto to the bubble column (at %s)" % p.global_position)
	ok = await _auto_run(p, 9800, 10.0)
	check(ok, "up and out of the caverns (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_5_clam_on_the_dark_rim() -> void:
	var p: Player = await _load_demo(W5_5)
	await _clear_enemies()
	await _pad_hop(p, Vector2(11000, 0), -580.0, 11250.0, 6.0)
	check(p.global_position.y < -530.0 and p.is_on_floor(), "the clam throws you up to the ledge (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_5_dark_rim_to_the_gate() -> void:
	var p: Player = await _load_demo(W5_5)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(9750, -2))
	var ok := await _auto_run(p, 12200, 16.0)
	ok = await _hop_run(p, [12200], 13150, false, 8.0)
	check(gm().level_complete, "past the anglerlings and over the crate to the gate (at %s)" % p.global_position)
	await _finish_demo()


const W5_6 := "res://levels/w5_6_sunken_temple.tscn"


func test_w5_6_temple_steps_and_the_colonnade() -> void:
	var p: Player = await _load_demo(W5_6)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(0, -2))
	var ok := await _auto_run(p, 4700, 30.0)
	check(ok, "up the temple steps and across the tide-flooded colonnade (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_6_jelly_bounce_onto_the_broken_arch() -> void:
	var p: Player = await _load_demo(W5_6)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Jellybob:
			e.queue_free()
		else:
			e.bob = 0.0
	await _place(p, Vector2(3180, -42))
	press(0, "move_right")
	var jumped := false
	var bounced := false
	for i in 300:
		await get_tree().physics_frame
		if not jumped and p.global_position.x >= 3255.0 and p.is_on_floor():
			press(0, "jump")
			jumped = true
		if p.velocity.y < -1000.0:
			bounced = true
		if bounced:
			if p.global_position.x < 3700.0:
				press(0, "move_right")
			else:
				release(0, "move_right")
		elif jumped and p.global_position.x > 3420.0:
			release(0, "move_right")
		if i > 80:
			release(0, "jump")
		if gm().gems[0]:
			break
	release(0, "move_right")
	check(gm().gems[0], "a jellybob bounce reaches gem 0 on the broken arch (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_6_drowned_nave_and_gem_1() -> void:
	var p: Player = await _load_demo(W5_6)
	await _clear_enemies()
	await _place(p, Vector2(4850, -152))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(5300, 700), Vector2(6000, 840), Vector2(6800, 800)], 20.0)
	check(gm().gems[1], "gem 1 sits on the sunken shrine (at %s)" % p.global_position)
	ok = await _auto_run(p, 7350, 12.0)
	check(ok, "the bubble column lifts you up to the gallery (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w5_6_inkabella_can_be_beaten_by_hitting_her_stuck_tentacle() -> void:
	seed(20261008)
	var p: Player = await _load_demo(W5_6)
	var boss: Inkabella = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Inkabella:
			boss = e
		else:
			e.queue_free()
	check(boss != null and boss.asleep, "Inkabella should be asleep in the great hall")
	await _place(p, Vector2(9400, -2))
	await frames(10)
	check(not boss.asleep, "walking into the hall should wake her")
	var flood: Water = boss.get_node_or_null(boss.flood)
	check(flood != null, "her flood points at the hall's water")
	var gates := _demo.find_children("*", "Gate", true, false)
	for round in 24:
		if not is_instance_valid(boss) or boss.dead:
			break
		p.invulnerable_timer = 100.0
		var side := -1.0 if boss.global_position.x > 9674.0 else 1.0
		p.global_position = Vector2(boss.global_position.x + side * 340.0, -2.0)
		p.velocity = Vector2.ZERO
		await frames(2)
		for c in boss.get_parent().get_children():
			if c is Inkabella.InkCloud or (c is Projectile and c.shooter == boss):
				c.queue_free()
		boss._slams_left = 1
		boss._start_aim()
		for i in 300:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.st == Inkabella.St.STUCK:
				break
		if not is_instance_valid(boss) or boss.st != Inkabella.St.STUCK:
			continue
		var hp := boss.health
		p.global_position = boss.tip() + Vector2(-60, -10)
		p.velocity = Vector2.ZERO
		p.facing = 1
		await frames(2)
		press(0, "attack")
		await frames(4)
		release(0, "attack")
		for i in 60:
			await get_tree().physics_frame
			if not is_instance_valid(boss) or boss.dead or boss.health < hp:
				break
		await seconds(0.6)
	check(not is_instance_valid(boss) or boss.dead, "six hits on her stuck tentacle should beat Inkabella (hp %d)" % (boss.health if is_instance_valid(boss) else 0))
	check(flood.global_position.y < -100.0, "the hall floods once she's angry (surface %.0f)" % flood.global_position.y)
	await seconds(1.5)
	var exit_open := false
	for g in gates:
		if g.global_position.x > 10200.0 and g.is_open():
			exit_open = true
	check(exit_open, "beating her should open the exit gate")
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(10420, -2))
	var ok: bool = await _hop_run(p, [10500], 11550, false, 6.0)
	check(gm().level_complete, "over the treasure chest to the gate completes World 5 (at %s)" % p.global_position)
	await _finish_demo()


func test_w5_6_dying_in_the_great_hall_lets_you_back_in() -> void:
	await _boss_arena_lets_you_back_in(W5_6, Vector2(8800, 0), 9400.0)


func test_w5_every_snoozling_cage_can_be_punched_open() -> void:
	for path in [W5_1, W5_2, W5_3, W5_4, W5_5, W5_6]:
		var p: Player = await _load_demo(path)
		await _clear_enemies()
		var cage: SnoozlingCage = _demo.find_children("*", "SnoozlingCage", true, false)[0]
		await _place(p, cage.global_position + Vector2(-55, -4))
		p.facing = 1
		await _punch()
		await frames(20)
		check(cage._opened, "%s: the Snoozling's cage opens with a punch (player %s %s, cage %s)" % [path.get_file(), p.global_position, _state(p), cage.global_position])
		await _finish_demo()


func test_w5_secret_chests_hold_gem_2() -> void:
	for spot: Array in [[W5_1, Vector2(14900, -2)], [W5_2, Vector2(14900, -2)], [W5_3, Vector2(14000, -2)],
			[W5_4, Vector2(14100, -2)], [W5_5, Vector2(12200, -2)], [W5_6, Vector2(10500, -2)]]:
		var p: Player = await _load_demo(spot[0])
		await _clear_enemies_except_bosses()
		await _place(p, spot[1])
		p.facing = 1
		await _run_to(p, spot[1].x + 50.0, "move_right", 1.0)
		release(0, "move_right")
		await _punch()
		await frames(20)
		press(0, "move_right")
		await seconds(1.0)
		release(0, "move_right")
		check(gm().gems[2], "%s: punching the chest open reaches gem 2 (at %s)" % [String(spot[0]).get_file(), p.global_position])
		await _finish_demo()


# --- Phase 2/3: wipes, Lum Shop, Nightmare Nebula -----------------------------------------

func test_lum_shop_banks_lums_and_sells_outfits() -> void:
	SaveData.load_records()
	var saved: Dictionary = SaveData.records.duplicate(true)
	SaveData.records.erase("_shop")
	check(SaveData.lum_bank() == 0, "the bank starts empty")
	var idx := -1
	for i in Wardrobe.OUTFITS.size():
		if Wardrobe.OUTFITS[i].has("price"):
			idx = i
			break
	check(idx > 0, "the wardrobe has shop outfits")
	var o: Dictionary = Wardrobe.OUTFITS[idx]
	check(not Wardrobe.is_unlocked(idx) or OS.has_feature("unlock_all"), "a shop outfit is locked until bought")
	check(not SaveData.buy(o["name"], int(o["price"])), "can't buy without the Lums")
	SaveData.bank_lums(int(o["price"]) + 50)
	check(SaveData.buy(o["name"], int(o["price"])), "buying with enough Lums works")
	check(SaveData.lum_bank() == 50, "the price comes out of the bank (have %d)" % SaveData.lum_bank())
	check(SaveData.owns(o["name"]) and Wardrobe.is_unlocked(idx), "the outfit is yours")
	check(not SaveData.buy(o["name"], int(o["price"])), "can't buy it twice")
	var hat_idx := -1
	for i in Wardrobe.OUTFITS.size():
		if Wardrobe.OUTFITS[i].has("hat"):
			hat_idx = i
	var dressed := Wardrobe.dress(GameManager.CHARACTERS[0], hat_idx)
	check(dressed.headwear == Wardrobe.OUTFITS[hat_idx]["hat"], "a shop outfit can come with its own hat")
	SaveData.records = saved
	SaveData._write()


func test_lum_shop_scene_browses_and_buys() -> void:
	SaveData.load_records()
	var saved: Dictionary = SaveData.records.duplicate(true)
	SaveData.records.erase("_shop")
	SaveData.bank_lums(5000)
	router().bind_slot(0, 0)
	var shop: Control = load("res://ui/lum_shop.tscn").instantiate()
	_arena.add_child(shop)
	await frames(3)
	check(shop.items().size() >= 5, "the shop has outfits for sale (%d)" % shop.items().size())
	var first: int = shop.selected()
	press(0, "move_right")
	await frames(3)
	release(0, "move_right")
	await frames(3)
	check(shop.selected() != first, "RIGHT browses to the next outfit")
	var name: String = Wardrobe.OUTFITS[shop.selected()]["name"]
	check(shop.buy_selected(), "buying the outfit you're trying on works")
	check(SaveData.owns(name), "and it's saved")
	shop.queue_free()
	await frames(2)
	SaveData.records = saved
	SaveData._write()


func test_world_1_map_has_the_lum_shop() -> void:
	WorldMap.world = "w1"
	var m: WorldMap = load("res://ui/world_map.tscn").instantiate()
	_arena.add_child(m)
	await frames(3)
	var has_shop := false
	for n in m.nodes:
		has_shop = has_shop or n.has("shop")
	check(has_shop, "World 1's map has a Lum Shop stall")
	m.queue_free()
	await frames(2)


func test_nightmare_nebula_opens_with_three_quarters_of_the_gems() -> void:
	SaveData.load_records()
	var saved: Dictionary = SaveData.records.duplicate(true)
	var need := LevelCatalog.secret_gems_needed()
	check(need == int(ceil(30 * 3 * 0.75)), "75%% of Worlds 1-5's gems are needed (%d)" % need)
	# Finish every level of Worlds 1-5 with no gems: the gate stays shut.
	for w in ["w1", "w2", "w3", "w4", "w5"]:
		for l in LevelCatalog.levels_in(w):
			SaveData.records[l["id"]] = {"done": true, "gems": [false, false, false], "time": 1.0, "lums": 0}
	if not (OS.has_feature("unlock_all") or LevelCatalog.dev_unlock):
		check(not LevelCatalog.is_unlocked("w6_1"), "beating World 5 alone doesn't open the secret world")
	# Now give them enough gems.
	var given := 0
	for w in ["w1", "w2", "w3", "w4", "w5"]:
		for l in LevelCatalog.levels_in(w):
			if given < need:
				var g := mini(3, need - given)
				SaveData.records[l["id"]]["gems"] = [g > 0, g > 1, g > 2]
				given += g
	check(LevelCatalog.is_unlocked("w6_1"), "with %d gems the Nightmare Nebula opens" % need)
	WorldMap.world = "w5"
	var m: WorldMap = load("res://ui/world_map.tscn").instantiate()
	_arena.add_child(m)
	await frames(3)
	var gate_open := false
	for n in m.nodes:
		if n.get("gate", "") == "w6":
			gate_open = n["unlocked"]
	check(gate_open, "World 5's map shows the gate to the Nebula open")
	m.queue_free()
	await frames(2)
	WorldMap.world = "w6"
	m = load("res://ui/world_map.tscn").instantiate()
	_arena.add_child(m)
	await frames(3)
	var ids: Array = []
	for n in m.nodes:
		ids.append(n["id"])
	check(ids.has("w6_1") and ids.has("w6_4") and ids.has("gate_w5"), "the Nebula map has its four levels and a way back (%s)" % [ids])
	m.queue_free()
	await frames(2)
	WorldMap.world = "w1"
	SaveData.records = saved
	SaveData._write()


func test_screen_wipe_changes_scenes_instantly_when_headless() -> void:
	check(DisplayServer.get_name() == "headless", "tests run headless")
	var w := ScreenWipe.new()
	check(w is CanvasLayer and w.layer > 100, "the wipe is an overlay above everything")
	w.free()


const W6_1 := "res://levels/w6_1_starfall_gardens.tscn"
const W6_2 := "res://levels/w6_2_comet_clockworks.tscn"
const W6_3 := "res://levels/w6_3_abyssal_canopy.tscn"
const W6_4 := "res://levels/w6_4_nightmare_core.tscn"


func test_w6_1_crumbling_stars_over_the_void() -> void:
	var p: Player = await _load_demo(W6_1)
	await _clear_enemies()
	await _place(p, Vector2(780, -2))
	var ok := await _hop_run(p, [860, 1204, 1504, 1804, 2104, 2404], 2700, false, 10.0)
	check(ok, "hopping the crumbling stars crosses the void (at %s)" % p.global_position)
	check(gm().gems[0], "gem 0 sits on the arc of a full jump between the stars")
	await _finish_demo()


func test_w6_1_bramble_garden_and_the_ice() -> void:
	var p: Player = await _load_demo(W6_1)
	await _clear_enemies()
	await _place(p, Vector2(2700, -2))
	var ok := await _hop_run(p, [2850, 3350, 4660, 5310], 5800, false, 14.0)
	check(ok, "over the brambles and across the icy comet slabs (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_1_mushroom_bounces_you_to_gem_1() -> void:
	var p: Player = await _load_demo(W6_1)
	await _clear_enemies()
	await _pad_hop(p, Vector2(3780, 0), -560.0, 3700.0, 6.0)
	check(gm().gems[1], "the mushroom bounces you up to gem 1 (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_1_starlit_gate() -> void:
	var p: Player = await _load_demo(W6_1)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6100, -2))
	await _hop_run(p, [7000], 7700, false, 8.0)
	check(gm().level_complete, "over the star-chest to the gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_2_tick_tock_row_over_the_void() -> void:
	var p: Player = await _load_demo(W6_2)
	await _clear_enemies()
	await _place(p, Vector2(800, -2))
	await _beat_hops(p, [[1060, 0], [1300, 1], [1540, 0], [1780, 1], [2100, -1]])
	check(p.global_position.x > 2000.0 and p.global_position.y < 10.0 and not p.is_bubbled(), "the tick-tock row crosses the void (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_2_belt_between_the_zaps() -> void:
	var p: Player = await _load_demo(W6_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(2100, -2))
	var ok := await _auto_run(p, 4300, 16.0)
	check(ok, "up the belt between the zaps (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w6_2_tick_tock_climb_to_gem_1() -> void:
	var p: Player = await _load_demo(W6_2)
	await _clear_enemies()
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(4420, -2))
	await _beat_hops(p, [[4630, 0], [4830, 1], [5030, 0], [5230, 1], [5560, -1]])
	check(p.global_position.y < -590.0 and not p.is_bubbled(), "the tick-tock steps climb to the plateau (at %s)" % p.global_position)
	check(gm().gems[1], "gem 1 waits at the top of the climb")
	await _finish_demo()


func test_w6_2_down_to_the_gate() -> void:
	var p: Player = await _load_demo(W6_2)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5600, -602))
	await _auto_run(p, 7000, 12.0)
	await _hop_run(p, [7100], 7900, false, 8.0)
	check(gm().level_complete, "down from the plateau and over the crate to the gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_3_liana_ravine() -> void:
	var p: Player = await _load_demo(W6_3)
	await _clear_enemies()
	await _place(p, Vector2(950, -2))
	var ok := await _liana_cross(p, 1090.0, 2300.0)
	check(ok, "the lianas swing you over the void (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_3_starry_pool_and_the_sea_well() -> void:
	var p: Player = await _load_demo(W6_3)
	await _clear_enemies()
	await _place(p, Vector2(2600, -2))
	press(0, "move_right")
	for i in 120:
		await get_tree().physics_frame
		if _state(p) == &"Swim":
			break
	release(0, "move_right")
	var ok := await _swim_path(p, [Vector2(3100, 500), Vector2(3390, 578), Vector2(3430, 578), Vector2(3800, 450), Vector2(4100, 200)], 16.0)
	check(gm().gems[0], "gem 0 lies under the rock (at %s)" % p.global_position)
	ok = await _auto_run(p, 4300, 12.0)
	check(ok and p.global_position.y < -790.0, "the sea-well's bubbles carry you up to the canopy (at %s, %s)" % [p.global_position, _state(p)])
	await _finish_demo()


func test_w6_3_jellies_over_the_void() -> void:
	var p: Player = await _load_demo(W6_3)
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if not e is Jellybob:
			e.queue_free()
		else:
			e.bob = 0.0
	await _place(p, Vector2(4880, -802))
	var targets := [5260.0, 5620.0, 6150.0]
	var k := 0
	var jumped := false
	press(0, "move_right")
	for i in 600:
		await get_tree().physics_frame
		if not jumped and p.global_position.x >= 4955.0 and p.is_on_floor():
			press(0, "jump")
			jumped = true
		if i > 30 and jumped and p.velocity.y < -900.0 and k < targets.size() - 1 and p.global_position.x > targets[k] - 80.0:
			k += 1
		if jumped and p.velocity.y > 0.0:
			release(0, "jump")
		var dx: float = targets[k] - p.global_position.x
		release(0, "move_left")
		release(0, "move_right")
		if dx > 12.0:
			press(0, "move_right")
		elif dx < -12.0:
			press(0, "move_left")
		if k == targets.size() - 1 and p.is_on_floor() and p.global_position.x > 6050.0:
			break
	release(0, "move_right")
	release(0, "move_left")
	release(0, "jump")
	check(p.is_on_floor() and p.global_position.x > 6000.0 and not p.is_bubbled(), "bouncing jelly to jelly crosses the void (at %s)" % p.global_position)
	check(gm().gems[1], "gem 1 hangs on the arc between the jellies")
	await _finish_demo()


func test_w6_3_down_to_the_gate() -> void:
	var p: Player = await _load_demo(W6_3)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6200, -802))
	await _auto_run(p, 6850, 10.0)
	await _hop_run(p, [6900], 7700, false, 8.0)
	check(gm().level_complete, "down the slope and over the log to the gate (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_4_the_gauntlet() -> void:
	var p: Player = await _load_demo(W6_4)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(950, -2))
	var ok := await _hop_run(p, [1760, 2054, 2354], 2850, false, 10.0)
	check(ok, "through the gauntlet and over the crumbling stars (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_4_both_bosses_can_be_beaten() -> void:
	seed(20261009)
	var p: Player = await _load_demo(W6_4)
	var cuckoo: Cuckoolossus = null
	var ink: Inkabella = null
	for e in get_tree().get_nodes_in_group(&"enemies"):
		if e is Cuckoolossus:
			cuckoo = e
		elif e is Inkabella:
			ink = e
		else:
			e.queue_free()
	check(cuckoo != null and ink != null and cuckoo.asleep and ink.asleep, "both bosses wait asleep in the Core")
	# Round one: Cuckoolossus.
	await _place(p, Vector2(3500, -2))
	await frames(10)
	check(not cuckoo.asleep, "walking into the first arena wakes Cuckoolossus")
	for round in 24:
		if not is_instance_valid(cuckoo) or cuckoo.dead:
			break
		p.invulnerable_timer = 100.0
		var side := -1.0 if cuckoo.global_position.x > 3874.0 else 1.0
		p.global_position = Vector2(cuckoo.global_position.x + side * 340.0, -2.0)
		p.velocity = Vector2.ZERO
		await frames(2)
		cuckoo.st = Cuckoolossus.St.RATTLE
		cuckoo._timer = 0.2
		cuckoo._cuckoos_left = 1
		for i in 300:
			await get_tree().physics_frame
			if not is_instance_valid(cuckoo) or cuckoo.st == Cuckoolossus.St.STUCK:
				break
		if not is_instance_valid(cuckoo) or cuckoo.st != Cuckoolossus.St.STUCK:
			continue
		var hp := cuckoo.health
		p.global_position = cuckoo.bird_head() + Vector2(0, -160)
		p.velocity = Vector2.ZERO
		p.state_machine.transition_to(&"Fall")
		for i in 120:
			await get_tree().physics_frame
			if not is_instance_valid(cuckoo) or cuckoo.dead or cuckoo.health < hp:
				break
		await seconds(0.8)
	check(not is_instance_valid(cuckoo) or cuckoo.dead, "Cuckoolossus falls in round one")
	await seconds(1.5)
	# Round two: Inkabella.
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(5600, -2))
	await frames(10)
	check(not ink.asleep, "walking into the second arena wakes Inkabella")
	for round in 24:
		if not is_instance_valid(ink) or ink.dead:
			break
		p.invulnerable_timer = 100.0
		var side := -1.0 if ink.global_position.x > 6074.0 else 1.0
		p.global_position = Vector2(ink.global_position.x + side * 340.0, -2.0)
		p.velocity = Vector2.ZERO
		await frames(2)
		for c in ink.get_parent().get_children():
			if c is Inkabella.InkCloud or (c is Projectile and c.shooter == ink):
				c.queue_free()
		ink._slams_left = 1
		ink._start_aim()
		for i in 300:
			await get_tree().physics_frame
			if not is_instance_valid(ink) or ink.st == Inkabella.St.STUCK:
				break
		if not is_instance_valid(ink) or ink.st != Inkabella.St.STUCK:
			continue
		var hp := ink.health
		p.global_position = ink.tip() + Vector2(-60, -10)
		p.velocity = Vector2.ZERO
		p.facing = 1
		await frames(2)
		press(0, "attack")
		await frames(4)
		release(0, "attack")
		for i in 60:
			await get_tree().physics_frame
			if not is_instance_valid(ink) or ink.dead or ink.health < hp:
				break
		await seconds(0.6)
	check(not is_instance_valid(ink) or ink.dead, "Inkabella falls in round two")
	await seconds(1.5)
	var exits := 0
	for g in _demo.find_children("*", "Gate", true, false):
		if (g.global_position.x > 4400.0 and g.global_position.x < 4600.0 or g.global_position.x > 6600.0) and g.is_open():
			exits += 1
	check(exits == 2, "both exit gates open (%d)" % exits)
	p.invulnerable_timer = 100.0
	await _place(p, Vector2(6800, -2))
	await _hop_run(p, [6900], 7950, false, 6.0)
	check(gm().level_complete, "past the dream-chest to the gate: the Nightmare is over (at %s)" % p.global_position)
	await _finish_demo()


func test_w6_every_snoozling_cage_and_chest() -> void:
	for spot: Array in [[W6_1, Vector2(7000, -2)], [W6_2, Vector2(7100, -2)], [W6_3, Vector2(6900, -2)], [W6_4, Vector2(6900, -2)]]:
		var p: Player = await _load_demo(spot[0])
		await _clear_enemies_except_bosses()
		var cage: SnoozlingCage = _demo.find_children("*", "SnoozlingCage", true, false)[0]
		await _place(p, cage.global_position + Vector2(-55, -4))
		p.facing = 1
		await _punch()
		await frames(20)
		check(cage._opened, "%s: the Snoozling's cage opens with a punch" % String(spot[0]).get_file())
		await _place(p, spot[1])
		p.facing = 1
		await _run_to(p, spot[1].x + 50.0, "move_right", 1.0)
		release(0, "move_right")
		await _punch()
		await frames(20)
		press(0, "move_right")
		await seconds(1.0)
		release(0, "move_right")
		check(gm().gems[2], "%s: punching the chest open reaches gem 2 (at %s)" % [String(spot[0]).get_file(), p.global_position])
		await _finish_demo()


# --- Visual overhaul: quality presets ----------------------------------------------------

func test_graphics_preset_is_chosen_saved_and_cycled() -> void:
	var old_level := Gfx.level
	var old_pref := Settings.graphics
	check(Gfx.at_least(Gfx.Level.LOW), "every device is at least LOW")
	check(Gfx.auto_pick() == Gfx.Level.MEDIUM, "headless runs auto-pick MEDIUM")
	Settings.graphics = Gfx.Level.LOW
	Gfx.level = Gfx.Level.LOW
	check(not Gfx.at_least(Gfx.Level.MEDIUM), "LOW skips MEDIUM effects")
	Settings.nudge("graphics", 1)
	check(Gfx.level == Gfx.Level.MEDIUM and Settings.graphics == Gfx.Level.MEDIUM, "nudging Graphics goes LOW -> MEDIUM")
	Settings.nudge("graphics", 1)
	Settings.nudge("graphics", 1)
	check(Gfx.level == Gfx.Level.LOW, "and wraps HIGH -> LOW")
	check(Settings.describe("graphics").contains("Low"), "the menu row shows the preset name")
	var pm := load("res://ui/pause_menu.gd")
	check("graphics" in pm.get("SETTING_ROWS"), "Graphics is a row in the settings menu")
	Gfx.level = old_level
	Settings.graphics = old_pref
	Settings.save()


func test_every_theme_has_a_painted_ground_texture_and_a_grade() -> void:
	var dir := DirAccess.open("res://world/themes")
	var n := 0
	for f in dir.get_files():
		if not f.ends_with(".tres"):
			continue
		var th := load("res://world/themes/" + f) as LevelTheme
		var tex := th.surface_texture()
		check(PaintedSurface.texture(tex) != null, "%s: baked texture '%s' exists" % [f, tex])
		check(PaintedSurface.material(tex, th.surface_strength()) is ShaderMaterial, "%s: painted material builds" % f)
		var g := th.grade()
		check(g.has("sat") and g.has("tint") and g.has("vig"), "%s: has a colour grade" % f)
		n += 1
	check(n >= 35, "all %d themes checked" % n)


func test_levels_get_foreground_and_colour_grade_layers() -> void:
	var p: Player = await _load_demo("res://levels/w4_1_cogwheel_courtyard.tscn")
	check(_demo.has_node(^"ColorGrade") and _demo.get_node(^"ColorGrade").layer == 2, "the level has a colour grade above the foreground")
	check(_demo.has_node(^"Foreground"), "the level has a foreground layer")
	check(_demo.get_node(^"Foreground").get_child_count() >= 1, "MEDIUM draws the factory's foreground silhouettes")
	var leafy := Foreground.new()
	_arena.add_child(leafy)
	leafy.setup(load("res://world/themes/jungle.tres"), Backdrop.Scenery.JUNGLE)
	check(leafy.get_child_count() == 0, "jungle (leafy) levels have no dark leaves on screen")
	leafy.queue_free()
	var old := Gfx.level
	Gfx.level = Gfx.Level.LOW
	var fg := Foreground.new()
	_arena.add_child(fg)
	fg.setup(load("res://world/themes/meadow.tres"), Backdrop.Scenery.HILLS)
	check(fg.get_child_count() == 0, "LOW skips the foreground")
	fg.queue_free()
	Gfx.level = old
	await _finish_demo()


func test_ink_outline_is_thicker_on_the_shadow_side() -> void:
	var mp := MeshPainter.new()
	mp.draw_ink(PackedVector2Array([Vector2(0, 0), Vector2(200, 0), Vector2(200, 200), Vector2(0, 200)]), Color.BLACK, true, 2.0, 6.0, 3)
	check(not mp.is_empty(), "ink outline produces geometry")
	var mesh := mp.build()
	var v: PackedVector2Array = mesh.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]
	var top := 0.0
	var bottom := 0.0
	for p in v:
		if absf(p.x - 100.0) < 30.0:
			if p.y < 20.0: top = maxf(top, absf(p.y))
			if p.y > 180.0: bottom = maxf(bottom, p.y - 200.0)
	check(bottom > top, "the bottom edge is heavier than the top (%.1f vs %.1f)" % [bottom, top])


func test_character_rig_expressions_springs_and_paint() -> void:
	for def in GameManager.CHARACTERS:
		var rig := CharacterRig.new()
		_arena.add_child(rig)
		rig.build(def)
		check(rig.material is ShaderMaterial, "%s: the rig has the painted material at MEDIUM" % def.display_name)
		for st: StringName in [&"Ground", &"Jump", &"Fall", &"Victory", &"Bubble", &"Punch", &"GroundPound", &"Swim", &"Glide"]:
			for i in 40:
				rig.update_pose(st, Vector2(500, -300 if st == &"Jump" else 900), st == &"Ground", 430.0, 1.0 / 60.0)
		for i in 40:
			rig.update_pose(&"Fall", Vector2(0, 900), false, 430.0, 1.0 / 60.0)
		check(rig._mouth_open.visible, "%s: a falling dreamer opens their mouth" % def.display_name)
		for key in rig._springs:
			check(is_finite((rig._springs[key] as Vector2).x), "%s: spring '%s' stays finite" % [def.display_name, key])
		var amt := rig._mouth_amt
		for i in 60:
			rig.update_pose(&"Victory", Vector2.ZERO, true, 430.0, 1.0 / 60.0)
		check(rig._mouth_amt > 0.9 and rig._mouth_open.visible, "%s: cheering is a big open grin" % def.display_name)
		rig.queue_free()
	var old := Gfx.level
	Gfx.level = Gfx.Level.LOW
	var low := CharacterRig.new()
	_arena.add_child(low)
	low.build(GameManager.CHARACTERS[0])
	check(low.material == null, "LOW skips the painted rig material")
	low.queue_free()
	Gfx.level = old


func test_enemies_are_painted_and_grounded_by_kind() -> void:
	var expect := {"grunt": "fur", "shellbert": "shell", "jellybob": "jelly", "windup": "ground_metal", "bonkhorn": "bark"}
	for k: String in expect:
		var e := _spawn_enemy("res://enemies/%s.tscn" % k, Vector2(0, 0), 1)
		await frames(2)
		check(e._paint_kind() == expect[k], "%s is painted with '%s'" % [k, expect[k]])
		check(e.visual.material is ShaderMaterial, "%s has the creature material at MEDIUM" % k)
		check(e.has_node(^"BlobShadow") == e.uses_gravity, "%s: contact shadow only when it walks on the ground" % k)
		e.queue_free()
	await frames(2)


func test_boss_defeat_flourish_runs() -> void:
	var b := _spawn_enemy("res://enemies/inkabella.tscn", Vector2(0, 0), 1)
	var p := add_player(0, Vector2(-300, -2))
	await settle(p)
	b.set_active(true)
	b.health = 1
	b._slams_left = 1
	b._start_aim()
	for i in 300:
		await get_tree().physics_frame
		if b.st == Inkabella.St.STUCK:
			break
	b.hit_tentacle(p, Enemy.HitKind.STOMP)
	await seconds(1.2)
	check(not is_instance_valid(b) or b.dead, "Inkabella falls and the boss flourish plays without errors")


# --- Phase 4: storybook UI ---------------------------------------------------------------

func test_storybook_ui_kit_paper_panels_fonts_and_cards() -> void:
	var sb := UIStyle.panel()
	check(sb is StyleBoxTexture and (sb as StyleBoxTexture).texture != null, "panels are the baked paper card")
	check(UIStyle.bold_font() != null, "the bold Fredoka font loads")
	var big := UIStyle.label("Hi", 60)
	check(big.has_theme_font_override(&"font"), "big labels use the bold font")
	var small := UIStyle.label("hi", 20)
	check(not small.has_theme_font_override(&"font"), "small labels keep the regular font")
	var pp := PaperPanel.new()
	_arena.add_child(pp)
	pp.color = Color(0.85, 1, 0.85, 0.8)
	await frames(2)
	pp.queue_free()
	var rs := load("res://ui/results.gd")
	var m: Control = rs.MedalStar.new(true, 1)
	check(m is Control, "medal stars exist")
	m.free()
	var cs: CharacterSelect = load("res://ui/character_select.tscn").instantiate()
	cs.auto_start = false
	_arena.add_child(cs)
	await frames(3)
	check(cs._cards[0].panel is PaperPanel and cs._cards[0].spot is Node2D, "character cards use paper panels and spotlights")
	cs.queue_free()
	await frames(2)


func test_results_screen_builds_with_medals_and_counts_up() -> void:
	var p: Player = await _load_demo(W1_1)
	var rs: Node = load("res://ui/results.tscn").instantiate()
	_arena.add_child(rs)
	rs._results = {"id": "w1_1", "name": "Pillow Meadow", "time": 62.5, "lums": 40, "lums_by_slot": {0: 40},
			"gems": [true, true, false], "snoozling": true, "secrets": 1, "secrets_total": 2, "new": {"lums": true},
			"next": "", "new_outfits": []}
	rs._build()
	await seconds(2.0)
	var medals: Array = rs.find_children("*", "Control", true, false).filter(func(n: Node) -> bool: return n.get_script() != null and "earned" in n)
	check(medals.size() == 3, "three medal stars (%d)" % medals.size())
	check(medals[0].earned and medals[1].earned and not medals[2].earned, "finishing and a gem earn medals, but not all three gems")
	rs.queue_free()
	await _finish_demo()
