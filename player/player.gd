class_name Player
extends CharacterBody2D
## Player body. Owns shared helpers (gravity, steering, sprint, jump buffer,
## coyote time, corner correction, ledge detection, crouch shape, squash &
## stretch); the StateMachine child decides WHAT happens.

const LAYER_WORLD := 1
const LAYER_PLAYERS := 2
const WALL_PROBE := 2.0       ## px, how far touching_wall_dir() looks sideways
const STICK_DEADZONE := 0.2   ## stick deflection that counts as "pushing"
const UPDRAFT_GRACE := 0.05   ## s an updraft keeps acting after its last apply_updraft()
const BODY_SIZE := Vector2(36, 60)
const LEDGE_PROBE := 6.0      ## px past our side where ledges are looked for
const LEDGE_STEP := 2.0       ## px resolution of the ledge-top search
const CLIMB_FORWARD := 28.0   ## px we end up past the ledge edge after climbing

@export var tuning: PlayerTuning = preload("res://player/tuning/player_default.tres")

var slot := 0
var input: PlayerInput
var character: CharacterDef = preload("res://characters/mumbleby.tres")
var player_color := Color.WHITE  ## = character.main_color; for HUD / UI tinting
var facing := 1

var coyote_timer := 0.0
var jump_buffer_timer := 0.0
var control_lock_timer := 0.0
var invulnerable_timer := 0.0
## True while the jump input that allows a glide is still valid: HOLD_THROUGH = jump
## held continuously since takeoff; SECOND_PRESS = fresh midair press still held.
var glide_armed := false
var punch_power := 0.0     ## 0..1 power of the current hit (breakables read this)
var updraft_speed := 0.0   ## rise speed of the updraft we're in (0 = none)
var sprint := 0.0          ## 0..1: how far top speed has grown toward sprint_speed
var crouched := false
var uppercut_used := false ## one air uppercut per airtime
var ledge_regrab_timer := 0.0
## Filled by try_ledge_grab() for the LedgeHang state.
var ledge_dir := 0
var ledge_top := 0.0
var ledge_body: Node2D
## Environment: set every frame by Water / Climbable / WindZone / BarrelCannon.
var water: Node2D                ## the Water we're in (null = dry)
var climbable: Node2D            ## the vine / net we're touching
var climb_regrab_timer := 0.0
var wind_push := Vector2.ZERO    ## px/s added to this frame's motion by wind
var cannon: Node2D               ## the barrel we're sitting in
var _water_timer := 0.0
var _climb_timer := 0.0
## Set by SwingRing.grab for the Swing state.
var swing_anchor: Node2D
var swing_regrab_timer := 0.0
var _updraft_timer := 0.0
var _sprint_build := 0.0
var _drop_timer := 0.0
var _dropped_through: Array[PhysicsBody2D] = []
var _was_on_floor := false
var _fall_speed := 0.0     ## fastest downward speed since leaving the ground

var _squash := Vector2.ONE
## Extra whole-body rotation set by states (swinging), applied about body_pivot.
var body_rotation := 0.0
var body_pivot := Vector2(0.0, -30.0)
## False after launches (pads, rings, wall jumps) so letting go of jump
## doesn't cut them short. Read by the Jump state.
var jump_cuttable := true

@onready var state_machine: StateMachine = $StateMachine
@onready var visual: Node2D = $Visual
@onready var rig: CharacterRig = $Visual/Rig
@onready var punch_area: Area2D = $PunchArea
@onready var bubble_area: Area2D = $BubbleArea
@onready var body_shape: CollisionShape2D = $CollisionShape2D


## Call before add_child().
func setup(p_slot: int, p_character: CharacterDef) -> void:
	slot = p_slot
	character = p_character
	player_color = character.main_color
	input = PlayerInput.new(slot)


func _ready() -> void:
	add_to_group(&"players")
	if input == null:
		setup(slot, character)
	# Own copies: crouching resizes the body, punches resize the hitbox.
	body_shape.shape = body_shape.shape.duplicate()
	var punch_col := $PunchArea/CollisionShape2D as CollisionShape2D
	punch_col.shape = punch_col.shape.duplicate()
	reset_punch_area()
	_build_character()
	state_machine.setup(self)
	state_machine.start(&"Fall")


## Swap costume at runtime (wardrobe, character select). Cosmetic only.
func set_character(def: CharacterDef) -> void:
	character = def
	player_color = def.main_color
	_build_character()
	squash(tuning.jump_stretch)
	EventBus.player_character_changed.emit(self)


func _build_character() -> void:
	rig.build(character)
	rig.punch_target = Vector2(tuning.punch_reach, punch_area.position.y)
	var tag: Label = $Visual/Tag
	tag.text = "P%d" % (slot + 1)
	tag.position.y = rig.top_y - tag.size.y - 4.0


func _physics_process(delta: float) -> void:
	_update_timers(delta)
	state_machine.physics_update(delta)
	_update_sprint(delta)
	if not is_bubbled():
		_correct_corners(delta)
	_move_with_wind()
	_check_head_bounce()
	_track_landing()
	_update_visual(delta)


## move_and_slide(), plus this frame's wind push (not kept as momentum).
func _move_with_wind() -> void:
	var push := wind_push
	wind_push = Vector2.ZERO
	if push == Vector2.ZERO or is_bubbled() or state_machine.current_name() in [&"LedgeHang", &"Cannon"]:
		move_and_slide()
		return
	if state_machine.current_name() == &"Glide":
		push *= 1.6  # gliders catch the wind
	velocity += push
	move_and_slide()
	if not is_on_wall():
		velocity.x -= push.x
	if not (is_on_floor() or is_on_ceiling()):
		velocity.y -= push.y


# --- Shared movement helpers (used by states) --------------------------------

func apply_gravity(delta: float) -> void:
	var g := tuning.rise_gravity() if velocity.y < 0.0 else tuning.fall_gravity()
	var max_fall := tuning.max_fall_speed
	if absf(velocity.y) < tuning.apex_speed_threshold and input.jump_held():
		g *= tuning.apex_gravity_multiplier
	if velocity.y > 0.0 and input.down_held() and not is_on_floor():
		g *= tuning.fast_fall_gravity_multiplier
		max_fall = tuning.fast_fall_max_speed
	velocity.y = minf(velocity.y + g * delta, maxf(max_fall, velocity.y))


func apply_horizontal(delta: float, accel: float, decel: float, max_speed: float) -> void:
	if control_lock_timer > 0.0:
		return  # keep wall-jump momentum
	var dir := input.move_x()
	if absf(dir) > 0.1:
		var target := dir * max_speed
		var a := accel
		if velocity.x != 0.0 and signf(dir) != signf(velocity.x):
			a *= tuning.turn_boost
		elif absf(velocity.x) > absf(target):
			a = decel  # over the limit (sprint, launch): bleed it off gently, keep momentum
		velocity.x = move_toward(velocity.x, target, a * delta)
		facing = 1 if dir > 0.0 else -1
	else:
		velocity.x = move_toward(velocity.x, 0.0, decel * delta)


## Run speed right now: grows toward sprint_speed while sprinting.
func current_max_speed() -> float:
	return lerpf(tuning.max_run_speed, tuning.sprint_speed, sprint)


## Floor grip: 1 normally, tuning.ice_friction on slippery blocks.
func floor_friction() -> float:
	if not is_on_floor():
		return 1.0
	for i in get_slide_collision_count():
		var c := get_slide_collision(i)
		if c.get_normal().y < -0.7:
			var b := c.get_collider()
			if b is Block and b.slippery:
				return tuning.ice_friction
	return 1.0


## Enter Swim / Climb if the environment calls for it. States call this first.
func try_environment_states(allow_climb := true) -> bool:
	if is_submerged():
		state_machine.transition_to(&"Swim")
		return true
	if allow_climb and can_grab_climb():
		state_machine.transition_to(&"Climb")
		return true
	return false


func is_submerged() -> bool:
	return water != null and global_position.y > water.surface_y() + tuning.swim_enter_depth


func can_grab_climb() -> bool:
	if climbable == null or climb_regrab_timer > 0.0 or crouched:
		return false
	if is_on_floor():
		return input.up_held()
	return input.up_held() or velocity.y > 0.0 or climbable.auto_grab


func wants_jump() -> bool:
	return jump_buffer_timer > 0.0


func can_coyote_jump() -> bool:
	return coyote_timer > 0.0


func consume_jump() -> void:
	jump_buffer_timer = 0.0
	coyote_timer = 0.0


func do_jump(multiplier := 1.0) -> void:
	consume_jump()
	jump_cuttable = true
	velocity.y = tuning.jump_velocity() * multiplier
	squash(tuning.jump_stretch)
	arm_glide_after_launch()
	EventBus.player_jumped.emit(self)


## Fling the player (bounce pads, swing release, cannons). Not cut short by
## releasing jump; `lock` seconds of ignored steering keep sideways launches true.
func launch(vel: Vector2, lock := 0.0) -> void:
	velocity = vel
	jump_cuttable = false
	uppercut_used = false
	control_lock_timer = maxf(control_lock_timer, lock)
	if absf(vel.x) > tuning.max_run_speed:
		sprint = 1.0  # keep the air speed cap high enough to carry it
	squash(tuning.jump_stretch)
	arm_glide_after_launch()
	state_machine.transition_to(&"Jump" if vel.y < 0.0 else &"Fall")


## Call after any launch (jump, wall jump, stomp bounce). Only HOLD_THROUGH lets
## the launching hold carry into a glide; other modes need their own input.
func arm_glide_after_launch() -> void:
	glide_armed = tuning.glide_mode == PlayerTuning.GlideMode.HOLD_THROUGH and input.jump_held()


## The input that keeps a glide going in the current mode.
func glide_input_held() -> bool:
	if tuning.glide_mode == PlayerTuning.GlideMode.SEPARATE_BUTTON:
		return input.glide_held()
	return input.jump_held()


## Which state an ATTACK press leads to in the air: DOWN + attack = ground pound.
func air_attack_state() -> StringName:
	return &"GroundPound" if input.down_held() else &"Punch"


func is_pushing_into_wall() -> bool:
	return is_on_wall() and input.move_x() * -get_wall_normal().x > 0.2


## +1 / -1 if a wall is touching our right / left side, else 0. Unlike
## is_on_wall() this works with zero horizontal speed (e.g. after bumping a wall).
func touching_wall_dir() -> int:
	for d: int in [1, -1]:
		if test_move(global_transform, Vector2(d * WALL_PROBE, 0.0)):
			return d
	return 0


## Should we grab the wall on side `dir` (see touching_wall_dir)?
func wants_wall_grab(dir: int) -> bool:
	if dir == 0:
		return false
	var push := input.move_x() * dir
	if tuning.wall_auto_grab:
		return push > -STICK_DEADZONE  # anything but pushing away
	return push > STICK_DEADZONE


# --- Sprint --------------------------------------------------------------------

func _update_sprint(delta: float) -> void:
	var t := tuning
	var push := input.move_x()
	if is_on_floor():
		var flat_out := absf(push) > 0.7 and signf(push) == signf(velocity.x) \
				and absf(velocity.x) >= t.max_run_speed * 0.92
		var state := state_machine.current_name()
		if flat_out and state in [&"Ground", &"Punch"]:
			_sprint_build += delta
			if _sprint_build >= t.sprint_build_time:
				sprint = move_toward(sprint, 1.0, delta / maxf(t.sprint_ramp_time, 0.01))
		elif state != &"Slide":
			_sprint_build = 0.0
			sprint = 0.0
	elif push * velocity.x < 0.0:
		sprint = move_toward(sprint, 0.0, delta * 3.0)  # steering back in the air drops it
	if is_on_wall() and state_machine.current_name() != &"WallSlide":
		_sprint_build = 0.0
		sprint = 0.0


func is_sprinting() -> bool:
	return sprint > 0.5


# --- Corner correction & ledges --------------------------------------------------

## Nudge round obstacles we only just clip: head on a ceiling edge while rising,
## or feet on a ledge top while moving sideways in the air. Makes near misses count.
func _correct_corners(delta: float) -> void:
	var t := tuning
	if state_machine.current_name() == &"LedgeHang":
		return
	if velocity.y < 0.0 and t.corner_correction > 0.0:
		var up := Vector2(0.0, velocity.y * delta)
		if test_move(global_transform, up):
			var first := 1 if (velocity.x > 0.0 or (velocity.x == 0.0 and facing > 0)) else -1
			for i in range(1, int(t.corner_correction) + 1):
				for s: int in [first, -first]:
					var off := Vector2(i * s, 0.0)
					if not test_move(global_transform, off) and not test_move(global_transform.translated(off), up):
						global_position += off
						return
	if not is_on_floor() and absf(velocity.x) > 1.0 and velocity.y > -t.ledge_grab_max_rise and t.ledge_bump > 0.0:
		var side := Vector2(signf(velocity.x) * maxf(absf(velocity.x) * delta, WALL_PROBE), 0.0)
		if test_move(global_transform, side):
			var i := 2.0
			while i <= t.ledge_bump:
				var off := Vector2(0.0, -i)
				if not test_move(global_transform, off) and not test_move(global_transform.translated(off), side):
					global_position += off
					if velocity.y > 0.0:
						velocity.y = 0.0
					return
				i += 2.0


## If a grabbable ledge is beside us, fill ledge_* and switch to LedgeHang.
func try_ledge_grab() -> bool:
	var t := tuning
	if not t.ledge_grab or ledge_regrab_timer > 0.0 or velocity.y < -t.ledge_grab_max_rise or crouched:
		return false
	var dir := touching_wall_dir()
	if dir == 0 or input.move_x() * dir < -STICK_DEADZONE or input.down_held():
		return false
	var top := find_ledge(dir)
	if is_nan(top):
		return false
	ledge_dir = dir
	ledge_top = top
	state_machine.transition_to(&"LedgeHang")
	return true


## Top y of a grabbable ledge on side `dir` (open air above it, room to stand
## on it), or NAN. Also stores the body it belongs to in ledge_body.
func find_ledge(dir: int) -> float:
	var t := tuning
	var x := global_position.x + dir * (BODY_SIZE.x * 0.5 + LEDGE_PROBE)
	var y := global_position.y - t.ledge_grab_high
	if _solid_at(Vector2(x, y)) != null:
		return NAN  # wall continues above the window: that's a wall, not a ledge
	var top := NAN
	while y <= global_position.y - t.ledge_grab_low:
		var body := _solid_at(Vector2(x, y))
		if body != null:
			top = y
			ledge_body = body
			break
		y += LEDGE_STEP
	if is_nan(top):
		return NAN
	# Refine to the exact surface.
	while _solid_at(Vector2(x, top - 1.0)) != null:
		top -= 1.0
	var stand := Vector2(global_position.x + dir * (BODY_SIZE.x * 0.5 + CLIMB_FORWARD), top - 1.0)
	return top if body_fits_at(stand) else NAN


## The solid (non one-way) world body at a point, or null.
func _solid_at(point: Vector2) -> Node2D:
	var q := PhysicsPointQueryParameters2D.new()
	q.position = point
	q.collision_mask = LAYER_WORLD
	q.exclude = [get_rid()]
	for hit in get_world_2d().direct_space_state.intersect_point(q, 8):
		var c: Node = hit["collider"]
		if c is Block and c.one_way:
			continue
		return c as Node2D
	return null


## Would a standing (or `size`) body with its feet at `feet` overlap solid world?
func body_fits_at(feet: Vector2, size := BODY_SIZE) -> bool:
	var shape := RectangleShape2D.new()
	shape.size = size - Vector2(2, 2)
	var q := PhysicsShapeQueryParameters2D.new()
	q.shape = shape
	q.transform = Transform2D(0.0, feet + Vector2(0.0, -size.y * 0.5))
	q.collision_mask = LAYER_WORLD
	q.exclude = [get_rid()]
	for hit in get_world_2d().direct_space_state.intersect_shape(q, 8):
		var c: Node = hit["collider"]
		if c is Block and c.one_way:
			continue
		return false
	return true


# --- Swinging ------------------------------------------------------------------

## Hands position while hanging from something (rings, ropes).
const GRIP_OFFSET := Vector2(0.0, -72.0)


## Can a SwingRing grab us right now?
func can_grab_swing() -> bool:
	return swing_regrab_timer <= 0.0 and not is_on_floor() and not crouched \
			and state_machine.current_name() in [&"Jump", &"Fall", &"Glide"]


func grab_swing(anchor: Node2D) -> void:
	swing_anchor = anchor
	state_machine.transition_to(&"Swing")


# --- Crouch & drop-through ------------------------------------------------------

func set_crouched(on: bool) -> void:
	if crouched == on:
		return
	crouched = on
	var rect := body_shape.shape as RectangleShape2D
	rect.size.y = tuning.crouch_height if on else BODY_SIZE.y
	body_shape.position.y = -rect.size.y * 0.5


func can_stand() -> bool:
	return body_fits_at(global_position)


## DOWN + JUMP on a one-way ledge: fall through it. Returns false if not on one.
func try_drop_through() -> bool:
	var ledge: PhysicsBody2D = null
	for i in get_slide_collision_count():
		var c := get_slide_collision(i)
		if c.get_normal().y < -0.7 and c.get_collider() is Block and c.get_collider().one_way:
			ledge = c.get_collider()
	if ledge == null:
		return false
	consume_jump()
	add_collision_exception_with(ledge)
	_dropped_through.append(ledge)
	_drop_timer = tuning.drop_through_time
	velocity.y = 120.0
	global_position.y += 2.0
	state_machine.transition_to(&"Fall")
	return true


# --- Damage / co-op ----------------------------------------------------------

func hurt() -> void:
	if is_bubbled() or invulnerable_timer > 0.0:
		return
	state_machine.transition_to(&"Bubble")
	EventBus.player_died.emit(self)


## Stomped an enemy: bounce. Holding jump bounces higher (Jump state cuts it otherwise).
func bounce(multiplier := -1.0) -> void:
	if multiplier < 0.0:
		multiplier = tuning.stomp_bounce_multiplier
	velocity.y = tuning.jump_velocity() * multiplier
	squash(tuning.jump_stretch)
	jump_cuttable = true
	uppercut_used = false
	arm_glide_after_launch()
	state_machine.transition_to(&"Jump")


## Land on a teammate's head: boing! You bounce, they get squashed (harmless).
func _check_head_bounce() -> void:
	if velocity.y <= 0.0 or is_on_floor() or is_bubbled():
		return
	if not state_machine.current_name() in [&"Fall", &"Glide", &"GroundPound"]:
		return
	for body in bubble_area.get_overlapping_bodies():
		var other := body as Player
		if other == null or other == self or other.is_bubbled():
			continue
		var head_y := other.global_position.y - other.body_shape.shape.get_rect().size.y
		if absf(global_position.x - other.global_position.x) < BODY_SIZE.x \
				and global_position.y >= head_y - 6.0 and global_position.y <= head_y + 18.0:
			other.squash(tuning.hard_land_squash)
			bounce(tuning.teammate_bounce_multiplier)
			EventBus.player_head_bounced.emit(self, other)
			return


func revive(pop := true) -> void:
	if not is_bubbled():
		return
	glide_armed = false
	invulnerable_timer = tuning.revive_invulnerability
	velocity = Vector2(0.0, -tuning.revive_pop_speed) if pop else Vector2.ZERO
	state_machine.transition_to(&"Fall")
	EventBus.player_revived.emit(self)


func is_bubbled() -> bool:
	return state_machine != null and state_machine.current_name() == &"Bubble"


func set_bubbled_physics(on: bool) -> void:
	# Deferred: this can be triggered from inside physics callbacks.
	set_deferred(&"collision_layer", 0 if on else LAYER_PLAYERS)
	set_deferred(&"collision_mask", 0 if on else LAYER_WORLD)
	$Visual/BubbleShell.visible = on


# --- Hits ----------------------------------------------------------------------

## Put the hitbox back to a forward jab.
func reset_punch_area() -> void:
	var rect := $PunchArea/CollisionShape2D.shape as RectangleShape2D
	rect.size = tuning.punch_hitbox_size
	punch_area.position = Vector2(facing * tuning.punch_reach, -30.0)
	punch_area.rotation = 0.0
	punch_area.scale = Vector2.ONE


## Hit everything in the punch area once (tracked in `already`). Returns bodies hit.
func hit_with_punch_area(knockback: Vector2, already: Array[Node]) -> Array[Node]:
	var hit: Array[Node] = []
	for body in punch_area.get_overlapping_bodies():
		if body == self or body in already:
			continue
		if body.has_method("take_hit"):
			body.take_hit(self, knockback)
			already.append(body)
			hit.append(body)
			punch_hit(body)
	for area in punch_area.get_overlapping_areas():
		if area.has_method("take_hit") and not area in already:
			area.take_hit(self, knockback)  # switches and other punchable areas
			already.append(area)
			hit.append(area)
			punch_hit(area)
			continue
		var target := area.get_parent()
		if target is Player and target != self and target.is_bubbled():
			target.revive()
	return hit


# --- Visual hooks (swap for AnimationPlayer / Skeleton2D later) --------------

func squash(amount: Vector2) -> void:
	_squash = amount


func set_glide_visual(on: bool) -> void:
	rig.gliding = on


## `target` is the fist position in facing-right local space.
func set_punch_visual(on: bool, target := Vector2.ZERO, power := 0.0) -> void:
	rig.punching = on
	if on:
		rig.punch_power = power
		rig.punch_target = target


func set_punch_charge(charge: float) -> void:
	rig.punch_charge = charge


func punch_hit(target: Node2D) -> void:
	rig.impact()
	EventBus.punch_landed.emit(self, target, punch_power)


## Called every physics frame by Water / Climbable areas we're inside.
func touch_water(w: Node2D) -> void:
	water = w
	_water_timer = UPDRAFT_GRACE


func touch_climbable(c: Node2D) -> void:
	climbable = c
	_climb_timer = UPDRAFT_GRACE


## Called by a BarrelCannon when we touch it.
func enter_cannon(c: Node2D) -> void:
	cannon = c
	state_machine.transition_to(&"Cannon")


## Called every physics frame by an Updraft we're inside.
func apply_updraft(speed: float) -> void:
	updraft_speed = speed
	_updraft_timer = UPDRAFT_GRACE


func _update_visual(delta: float) -> void:
	_squash = _squash.lerp(Vector2.ONE, clampf(tuning.squash_return_speed * delta, 0.0, 1.0))
	var s := _squash * (tuning.crouch_squash if crouched else Vector2.ONE)
	visual.scale = Vector2(s.x * facing, s.y)
	var spin := rig.spin_angle() * facing + body_rotation
	var pivot := body_pivot if body_rotation != 0.0 else Vector2(0.0, -BODY_SIZE.y * 0.5)
	visual.rotation = spin
	visual.position = pivot - pivot.rotated(spin)
	$Visual/Tag.rotation = -spin * facing  # name tag stays upright while we flip
	$Visual/Tag.scale.x = facing  # keep the label readable when flipped
	rig.sprint = sprint
	rig.skidding = is_skidding()
	rig.update_pose(state_machine.current_name(), velocity, is_on_floor(), tuning.max_run_speed, delta)
	visual.modulate.a = 0.5 if (invulnerable_timer > 0.0 and fmod(invulnerable_timer, 0.2) < 0.1) else 1.0


## Reversing hard on the ground (heels dug in).
func is_skidding() -> bool:
	return is_on_floor() and absf(velocity.x) > tuning.skid_speed and input.move_x() * signf(velocity.x) < -0.3


func _track_landing() -> void:
	var on_floor := is_on_floor()
	if not on_floor:
		_fall_speed = maxf(_fall_speed, velocity.y)
	elif not _was_on_floor:
		uppercut_used = false
		if _fall_speed >= tuning.hard_land_speed:
			squash(tuning.hard_land_squash)
			EventBus.player_hard_landed.emit(self, _fall_speed)
		_fall_speed = 0.0
	_was_on_floor = on_floor


## Fastest fall since leaving the ground (states read it on landing).
func landing_speed() -> float:
	return _fall_speed


func _update_timers(delta: float) -> void:
	if is_on_floor():
		coyote_timer = tuning.coyote_time
	else:
		coyote_timer = maxf(coyote_timer - delta, 0.0)
	jump_buffer_timer = maxf(jump_buffer_timer - delta, 0.0)
	if input.jump_pressed():
		jump_buffer_timer = tuning.jump_buffer_time
		# A fresh press in midair can (re)start a glide in both jump-button modes.
		if tuning.glide_mode != PlayerTuning.GlideMode.SEPARATE_BUTTON and not is_on_floor():
			glide_armed = true
	if not input.jump_held():
		glide_armed = false
	control_lock_timer = maxf(control_lock_timer - delta, 0.0)
	invulnerable_timer = maxf(invulnerable_timer - delta, 0.0)
	ledge_regrab_timer = maxf(ledge_regrab_timer - delta, 0.0)
	swing_regrab_timer = maxf(swing_regrab_timer - delta, 0.0)
	climb_regrab_timer = maxf(climb_regrab_timer - delta, 0.0)
	# Environment areas re-register every physics frame; forget stale ones.
	_water_timer -= delta
	if _water_timer <= 0.0:
		water = null
	_climb_timer -= delta
	if _climb_timer <= 0.0:
		climbable = null
	_updraft_timer = maxf(_updraft_timer - delta, 0.0)
	if _updraft_timer <= 0.0:
		updraft_speed = 0.0
	if _drop_timer > 0.0:
		_drop_timer -= delta
		if _drop_timer <= 0.0:
			for b in _dropped_through:
				if is_instance_valid(b):
					remove_collision_exception_with(b)
			_dropped_through.clear()
