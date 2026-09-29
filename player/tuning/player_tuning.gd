class_name PlayerTuning
extends Resource
## EVERY number that affects game feel lives here, not in state scripts.
## Edit player_default.tres in the Inspector while the game runs to tune live.
## Jump physics are defined by height + time (designer-friendly); gravity and
## jump velocity are derived from them.

@export_group("Run")
@export var max_run_speed := 430.0          ## px/s
@export var ground_accel := 3400.0          ## px/s^2
@export var ground_decel := 3800.0
@export var turn_boost := 1.8               ## accel multiplier when reversing direction
@export var sprint_speed := 610.0           ## px/s top speed after running flat out for a while
@export var sprint_build_time := 0.8        ## s of flat-out running before the sprint kicks in
@export var sprint_ramp_time := 0.4         ## s to grow from run speed to sprint speed
@export var skid_speed := 260.0             ## reversing faster than this on the ground = skid (visual + dust)

@export_group("Air")
@export var air_accel := 2400.0
@export var air_decel := 1100.0
@export var max_fall_speed := 1150.0
@export var fast_fall_gravity_multiplier := 1.4  ## hold DOWN while falling to drop faster
@export var fast_fall_max_speed := 1500.0
@export var corner_correction := 16.0       ## px: clip a ceiling corner by this much and you slide round it
@export var ledge_bump := 16.0              ## px: feet clip a ledge top by this much and you pop up onto it

@export_group("Jump")
@export var jump_height := 190.0            ## px, full-hold jump
@export var jump_time_to_peak := 0.38       ## s
@export var jump_time_to_fall := 0.30       ## s, shorter = snappier fall
@export var jump_cut_multiplier := 0.45     ## upward speed kept when jump released early
@export var apex_speed_threshold := 70.0    ## |vy| under this counts as "apex"
@export var apex_gravity_multiplier := 0.5  ## floaty hang at top while jump held
@export var coyote_time := 0.10             ## s after leaving a ledge you can still jump
@export var jump_buffer_time := 0.12        ## s a jump press is remembered before landing
@export var stomp_bounce_multiplier := 0.8  ## bounce off enemies, fraction of jump velocity
@export var teammate_bounce_multiplier := 0.9  ## land on a teammate's head: boing

enum GlideMode {
	HOLD_THROUGH,     ## keep holding jump past the apex -> glide (no second press)
	SECOND_PRESS,     ## fresh jump press in midair, then hold
	SEPARATE_BUTTON,  ## hold the dedicated "glide" action in the air
}

@export_group("Glide (helicopter)")
@export var glide_mode: GlideMode = GlideMode.HOLD_THROUGH
@export var glide_hold_delay := 0.12        ## s of held jump after the apex before HOLD_THROUGH glides
@export var glide_fall_speed := 110.0
@export var glide_accel := 1700.0
@export var glide_max_speed := 380.0
@export var updraft_accel := 2600.0         ## px/s^2 an updraft uses to take over a glide

@export_group("Wall")
@export var wall_slide_speed := 190.0
@export var wall_jump_velocity := Vector2(380.0, -900.0)  ## ~150 px of height per kick
@export var wall_jump_lock_time := 0.16     ## s of ignored steering after a wall jump
@export var wall_jump_cuttable := false     ## false = releasing jump early doesn't shorten wall jumps
@export var wall_auto_grab := true          ## stick to walls you touch while falling (no need to push in); push away to let go

@export_group("Ledge grab")
@export var ledge_grab := true              ## catch ledges you just miss; hold toward = climb, jump = hop up
@export var ledge_grab_high := 80.0         ## px above the feet: highest ledge you can catch
@export var ledge_grab_low := 34.0          ## px above the feet: lowest ledge you catch (lower = ledge_bump)
@export var ledge_hang_offset := 70.0       ## px from ledge top down to the feet while hanging (arms up)
@export var ledge_grab_max_rise := 260.0    ## can't grab while rising faster than this
@export var ledge_climb_time := 0.2         ## s to pull up onto the ledge
@export var ledge_min_hang := 0.07          ## s you hang before an auto-climb (lets the grab read)
@export var ledge_regrab_delay := 0.3       ## s after dropping before you can grab again

@export_group("Swing")
@export var swing_length := 92.0            ## px from ring to hands
@export var swing_gravity := 2600.0         ## px/s^2 pulling the pendulum down
@export var swing_push := 1500.0            ## px/s^2 of pumping with left/right
@export var swing_damping := 0.35           ## 1/s speed loss
@export var swing_max_angle := 1.45         ## rad either side of straight down
@export var swing_release_boost := 1.15     ## tangential speed x this on release
@export var swing_release_up := 420.0       ## extra upward kick when you jump off
@export var swing_regrab_delay := 0.35      ## s before you can grab a ring again

@export_group("Crouch & slide")
@export var crouch_height := 34.0           ## px collision height while crouched / sliding (standing = 60)
@export var crawl_speed := 150.0
@export var slide_min_speed := 280.0        ## run faster than this + DOWN = belly slide instead of crouch
@export var slide_boost := 90.0             ## px/s added when a slide starts
@export var slide_max_speed := 700.0
@export var slide_friction := 520.0         ## px/s^2
@export var long_jump_speed := 640.0        ## jump out of a slide = long jump at least this fast
@export var long_jump_height_multiplier := 0.8
@export var drop_through_time := 0.25       ## s one-way ledges ignore you after DOWN + JUMP

@export_group("Ground pound")
@export var ground_pound_hang := 0.13       ## s of spin in midair before the dive
@export var ground_pound_speed := 1550.0
@export var ground_pound_steer := 140.0     ## px/s sideways control while diving
@export var ground_pound_recovery := 0.16
@export var ground_pound_power := 0.5       ## punch power vs breakables (iron crates need 0.6)
@export var ground_pound_radius := 110.0    ## px shockwave that hits grounded enemies on landing
@export var ground_pound_jump_multiplier := 1.25  ## jump right after landing = higher "pound jump"

@export_group("Punch")
@export var punch_windup := 0.05
@export var punch_active := 0.12
@export var punch_recovery := 0.12
@export var punch_reach := 72.0             ## px, fist distance from body centre (was 46)
@export var punch_hitbox_size := Vector2(64.0, 46.0)
@export var punch_knockback := Vector2(380.0, -220.0)
@export var punch_ground_speed_scale := 0.35
@export var punch_charge_min := 0.1         ## s held after the windup before a punch starts charging
@export var punch_charge_time := 0.6        ## s of holding to reach full charge
@export var punch_charged_reach_multiplier := 1.6
@export var punch_charged_hitbox_multiplier := 1.4
@export var punch_charged_knockback_multiplier := 1.8
@export var punch_charge_move_scale := 0.2  ## run speed fraction while charging on the ground
@export var uppercut_lift := 430.0          ## UP + punch in the air: upward kick, once per airtime

@export_group("Bubble / revive")
@export var bubble_steer_speed := 160.0
@export var bubble_follow_strength := 2.2
@export var revive_pop_speed := 420.0
@export var revive_invulnerability := 1.2

@export_group("Juice")
@export var squash_return_speed := 14.0
@export var jump_stretch := Vector2(0.82, 1.2)
@export var land_squash := Vector2(1.22, 0.8)
@export var hard_land_speed := 950.0        ## falling faster than this = big squash + dust + shake
@export var hard_land_squash := Vector2(1.4, 0.65)
@export var crouch_squash := Vector2(1.1, 0.85)


func jump_velocity() -> float:
	return -2.0 * jump_height / jump_time_to_peak


func rise_gravity() -> float:
	return 2.0 * jump_height / (jump_time_to_peak * jump_time_to_peak)


func fall_gravity() -> float:
	return 2.0 * jump_height / (jump_time_to_fall * jump_time_to_fall)
