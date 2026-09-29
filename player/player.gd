class_name Player
extends CharacterBody2D
## Player body. Owns shared helpers (gravity, steering, jump buffer, coyote
## time, squash & stretch); the StateMachine child decides WHAT happens.

const LAYER_WORLD := 1
const LAYER_PLAYERS := 2
const WALL_PROBE := 2.0       ## px, how far touching_wall_dir() looks sideways
const STICK_DEADZONE := 0.2   ## stick deflection that counts as "pushing"
const UPDRAFT_GRACE := 0.05   ## s an updraft keeps acting after its last apply_updraft()

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
var punch_power := 0.0     ## 0..1 charge of the current punch (breakables read this)
var updraft_speed := 0.0   ## rise speed of the updraft we're in (0 = none)
var _updraft_timer := 0.0

var _squash := Vector2.ONE

@onready var state_machine: StateMachine = $StateMachine
@onready var visual: Node2D = $Visual
@onready var rig: CharacterRig = $Visual/Rig
@onready var punch_area: Area2D = $PunchArea
@onready var bubble_area: Area2D = $BubbleArea


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
	var punch_shape := $PunchArea/CollisionShape2D.shape as RectangleShape2D
	punch_shape.size = tuning.punch_hitbox_size
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
	move_and_slide()
	_update_visual(delta)


# --- Shared movement helpers (used by states) --------------------------------

func apply_gravity(delta: float) -> void:
	var g := tuning.rise_gravity() if velocity.y < 0.0 else tuning.fall_gravity()
	if absf(velocity.y) < tuning.apex_speed_threshold and input.jump_held():
		g *= tuning.apex_gravity_multiplier
	velocity.y = minf(velocity.y + g * delta, tuning.max_fall_speed)


func apply_horizontal(delta: float, accel: float, decel: float, max_speed: float) -> void:
	if control_lock_timer > 0.0:
		return  # keep wall-jump momentum
	var dir := input.move_x()
	if absf(dir) > 0.1:
		var a := accel
		if velocity.x != 0.0 and signf(dir) != signf(velocity.x):
			a *= tuning.turn_boost
		velocity.x = move_toward(velocity.x, dir * max_speed, a * delta)
		facing = 1 if dir > 0.0 else -1
	else:
		velocity.x = move_toward(velocity.x, 0.0, decel * delta)


func wants_jump() -> bool:
	return jump_buffer_timer > 0.0


func can_coyote_jump() -> bool:
	return coyote_timer > 0.0


func consume_jump() -> void:
	jump_buffer_timer = 0.0
	coyote_timer = 0.0


func do_jump() -> void:
	consume_jump()
	velocity.y = tuning.jump_velocity()
	squash(tuning.jump_stretch)
	arm_glide_after_launch()
	EventBus.player_jumped.emit(self)


## Call after any launch (jump, wall jump, stomp bounce). Only HOLD_THROUGH lets
## the launching hold carry into a glide; other modes need their own input.
func arm_glide_after_launch() -> void:
	glide_armed = tuning.glide_mode == PlayerTuning.GlideMode.HOLD_THROUGH and input.jump_held()


## The input that keeps a glide going in the current mode.
func glide_input_held() -> bool:
	if tuning.glide_mode == PlayerTuning.GlideMode.SEPARATE_BUTTON:
		return input.glide_held()
	return input.jump_held()


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


# --- Damage / co-op ----------------------------------------------------------

func hurt() -> void:
	if is_bubbled() or invulnerable_timer > 0.0:
		return
	state_machine.transition_to(&"Bubble")
	EventBus.player_died.emit(self)


## Stomped an enemy: bounce. Holding jump bounces higher (Jump state cuts it otherwise).
func bounce() -> void:
	velocity.y = tuning.jump_velocity() * tuning.stomp_bounce_multiplier
	squash(tuning.jump_stretch)
	arm_glide_after_launch()
	state_machine.transition_to(&"Jump")


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


# --- Visual hooks (swap for AnimationPlayer / Skeleton2D later) --------------

func squash(amount: Vector2) -> void:
	_squash = amount


func set_glide_visual(on: bool) -> void:
	rig.gliding = on


func set_punch_visual(on: bool, reach := 0.0, power := 0.0) -> void:
	rig.punching = on
	if on:
		rig.punch_power = power
		rig.punch_target = Vector2(reach, punch_area.position.y)


func set_punch_charge(charge: float) -> void:
	rig.punch_charge = charge


func punch_hit(target: Node2D) -> void:
	rig.impact()
	EventBus.punch_landed.emit(self, target, punch_power)


## Called every physics frame by an Updraft we're inside.
func apply_updraft(speed: float) -> void:
	updraft_speed = speed
	_updraft_timer = UPDRAFT_GRACE


func _update_visual(delta: float) -> void:
	_squash = _squash.lerp(Vector2.ONE, clampf(tuning.squash_return_speed * delta, 0.0, 1.0))
	visual.scale = Vector2(_squash.x * facing, _squash.y)
	$Visual/Tag.scale.x = facing  # keep the label readable when flipped
	rig.update_pose(state_machine.current_name(), velocity, is_on_floor(), tuning.max_run_speed, delta)
	visual.modulate.a = 0.5 if (invulnerable_timer > 0.0 and fmod(invulnerable_timer, 0.2) < 0.1) else 1.0


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
	_updraft_timer = maxf(_updraft_timer - delta, 0.0)
	if _updraft_timer <= 0.0:
		updraft_speed = 0.0
