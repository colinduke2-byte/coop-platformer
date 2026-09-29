class_name CharacterRig
extends Node2D
## Vector cutout character built from a CharacterDef, animated procedurally.
## Local space: feet at y = 0, facing +x (the parent Visual node flips it).
## Driven by update_pose() every physics frame; knows nothing about Player,
## so the gallery and select screens can drive it too. Placeholder until the
## real rig (Skeleton2D / Spine) lands; keep the update_pose() API when swapping.

const OUTLINE := Color("1d1726")
const SHOE := Color("3b2b24")
const EYE_WHITE := Color("fbfaf5")
const PUPIL := Color("1d1726")
const BEARD := Color("f4f1ea")
const MASK := Color("2b2233")
const BLUSH := Color(1.0, 0.35, 0.4, 0.28)
const TRAIL_COLOR := Color(1, 1, 1, 0.6)
const IMPACT_COLOR := Color("fff3a0")
const PARTICLE_COLOR := Color.WHITE

const OUTLINE_WIDTH := 2.5
const ARM_WIDTH := 5.0
const LEG_WIDTH := 6.0
const HAND_RADIUS := 5.5
const BROW_WIDTH := 2.6

# Animation (visual only; gameplay feel numbers live in PlayerTuning)
const POSE_SHARPNESS := 22.0      ## how fast limbs ease toward their target pose
const RUN_CYCLE_BASE := 8.0       ## rad/s of the run cycle when barely moving
const RUN_CYCLE_SPEED := 11.0     ## extra rad/s at full run speed
const STRIDE := 11.0              ## px foot swing at full speed
const STEP_LIFT := 7.0
const RUN_BOB := 3.0
const RUN_LEAN := 0.14            ## rad
const GLIDE_SPIN_RATE := 22.0     ## rad/s: headwear twirls like a propeller
const BLINK_TIME := 0.12
const CHARGE_SHAKE := 2.0         ## px tremble of the fist at full charge
const PUNCH_FIST_SCALE := 1.9     ## fist size when a punch lands
const CHARGED_FIST_BONUS := 1.0   ## extra fist size at full charge
const TRAIL_POINTS := 7
const PUNCH_ARM_THICKNESS := 1.6  ## arm width multiplier while a punch is extended
const SPEED_LINES := 3
const IMPACT_TIME := 0.2
const IDLE_QUIRK_DELAY := 2.5     ## s standing still before the idle quirk starts
const QUIRK_PARTICLE_INTERVAL := 0.9

var def: CharacterDef
var gliding := false
var punching := false             ## punch is in its active (extended) phase
var punch_charge := 0.0           ## 0..1 while holding a charge punch
var punch_power := 0.0            ## 0..1 power of the current / last punch
var punch_target := Vector2(72.0, -30.0)
var idle_quirk_delay := IDLE_QUIRK_DELAY
var top_y := -80.0                ## highest point of the rig (for name tags)

var _torso: Node2D
var _head: Node2D
var _face: Node2D
var _headwear: Node2D
var _plume: Node2D
var _eyes: Array[Node2D] = []
var _pupils: Array[Node2D] = []
var _brows: Array[Line2D] = []
var _scarf_tail: Node2D
var _bandana_tails: Node2D
var _limbs := {}                  ## name -> [outline Line2D, fill Line2D]
var _hands: Array[Node2D] = []    ## [back, front]
var _feet: Array[Node2D] = []     ## [back, front]
var _charge_glow: Polygon2D
var _trail: Line2D
var _speed_lines: Array[Line2D] = []

var _pose := {}                   ## current eased pose
var _time := 0.0
var _run_phase := 0.0
var _blink_timer := 2.0
var _idle_time := 0.0
var _quirk_active := false
var _particle_timer := 0.0


func build(p_def: CharacterDef) -> void:
	def = p_def
	for c in get_children():
		remove_child(c)
		c.queue_free()
	_eyes.clear()
	_pupils.clear()
	_brows.clear()
	_hands.clear()
	_feet.clear()
	_limbs.clear()
	_speed_lines.clear()
	_scarf_tail = null
	_bandana_tails = null
	_plume = null

	var r := def.head_radius
	var h := def.body_height
	var wb := def.body_width
	var wt := wb * 0.55

	# Back to front: back arm, legs, torso (body + head), front arm, trail.
	_add_limb(&"arm_b", ARM_WIDTH, def.main_color.darkened(0.25))
	_hands.append(_add_blob(self, HAND_RADIUS, HAND_RADIUS, def.hand_color.darkened(0.12)))
	_add_limb(&"leg_b", LEG_WIDTH, def.trim_color.darkened(0.45))
	_feet.append(_add_blob(self, 8.0, 4.5, SHOE))
	_add_limb(&"leg_f", LEG_WIDTH, def.trim_color.darkened(0.3))
	_feet.append(_add_blob(self, 8.0, 4.5, SHOE))

	_torso = Node2D.new()
	add_child(_torso)
	if def.has_scarf:
		_scarf_tail = _add_poly(_torso, PackedVector2Array([
			Vector2(0, -3), Vector2(-18, 0), Vector2(-20, 6), Vector2(-16, 8), Vector2(0, 4),
		]), def.trim_color.darkened(0.1), Vector2(-wt * 0.3, -h + 3))
	var body := _add_poly(_torso, PackedVector2Array([
		Vector2(-wb * 0.5, 2), Vector2(-wb * 0.53, -h * 0.35), Vector2(-wt * 0.5, -h * 0.85),
		Vector2(-wt * 0.25, -h), Vector2(wt * 0.25, -h), Vector2(wt * 0.5, -h * 0.85),
		Vector2(wb * 0.53, -h * 0.35), Vector2(wb * 0.5, 2), Vector2(wb * 0.2, 6), Vector2(-wb * 0.2, 6),
	]), def.main_color)
	# Back half in shade (light comes from the front).
	_add_shade(body, _rect(-wb, -h - 10, -wt * 0.05, 10), def.main_color.darkened(0.14))
	var belt_y := -h * 0.35
	_add_poly(_torso, _rect(-wb * 0.5, belt_y - 3.0, wb * 0.5, belt_y + 3.0), def.trim_color, Vector2.ZERO, false)
	if def.has_scarf:
		_add_poly(_torso, _rect(-wt * 0.6, -h - 1.0, wt * 0.6, -h + 6.0), def.trim_color)

	_head = Node2D.new()
	_head.position = Vector2(0, -h - r * 0.75)
	_torso.add_child(_head)
	var head_top := _build_head(r)
	top_y = -def.leg_length - h - r * 0.75 + head_top

	_add_limb(&"arm_f", ARM_WIDTH, def.main_color.darkened(0.1))
	var hand_f := _add_blob(self, HAND_RADIUS, HAND_RADIUS, def.hand_color)
	_hands.append(hand_f)
	_charge_glow = _add_blob(hand_f, HAND_RADIUS * 2.2, HAND_RADIUS * 2.2, Color(def.accent_color, 0.45), Vector2.ZERO, false)
	_charge_glow.show_behind_parent = true
	_charge_glow.visible = false

	_trail = Line2D.new()
	_trail.width = HAND_RADIUS * 2.4
	var grad := Gradient.new()
	grad.set_color(0, Color(TRAIL_COLOR, 0.0))
	grad.set_color(1, TRAIL_COLOR)
	_trail.gradient = grad
	_trail.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_trail.end_cap_mode = Line2D.LINE_CAP_ROUND
	_trail.joint_mode = Line2D.LINE_JOINT_ROUND
	add_child(_trail)
	move_child(_trail, _hands[1].get_index())  # just behind the front fist
	for i in SPEED_LINES:
		var sl := Line2D.new()
		sl.width = 2.0
		sl.default_color = TRAIL_COLOR
		sl.begin_cap_mode = Line2D.LINE_CAP_ROUND
		sl.end_cap_mode = Line2D.LINE_CAP_ROUND
		sl.visible = false
		add_child(sl)
		_speed_lines.append(sl)

	_torso.position = Vector2(0, -def.leg_length)
	_pose = _target_pose(&"Ground", Vector2.ZERO, true, 1.0)
	_apply_pose()


## Returns the headwear's top y relative to the head centre.
func _build_head(r: float) -> float:
	if def.headwear == CharacterDef.Headwear.BANDANA:
		_bandana_tails = Node2D.new()
		_bandana_tails.position = Vector2(-r * 0.9, -r * 0.45)
		_head.add_child(_bandana_tails)
		_add_poly(_bandana_tails, PackedVector2Array([
			Vector2(0, -2), Vector2(-15, -7), Vector2(-12, 1)]), def.accent_color.darkened(0.1))
		_add_poly(_bandana_tails, PackedVector2Array([
			Vector2(0, 1), Vector2(-13, 6), Vector2(-7, 9)]), def.accent_color.darkened(0.2))

	var skull := _add_blob(_head, r, r, def.skin_color)
	# Crescent shadow on the back-bottom of the head.
	var lit := _ellipse(r * 1.02, r * 1.02)
	for i in lit.size():
		lit[i] += Vector2(r * 0.3, -r * 0.3)
	for piece in Geometry2D.clip_polygons(skull.polygon, lit):
		var s := Polygon2D.new()
		s.polygon = piece
		s.color = def.skin_color.darkened(0.13)
		skull.add_child(s)
		skull.move_child(s, 0)

	if def.has_beard:
		var beard := _add_poly(_head, PackedVector2Array([
			Vector2(r * 0.95, r * 0.05), Vector2(r * 0.8, r * 0.9), Vector2(r * 0.35, r * 1.75),
			Vector2(r * 0.05, r * 1.2), Vector2(-r * 0.4, r * 0.75), Vector2(-r * 0.3, r * 0.3),
			Vector2(r * 0.3, r * 0.35),
		]), BEARD)
		_add_shade(beard, _rect(-r, -r, r * 0.25, r * 2.0), BEARD.darkened(0.1))

	_face = Node2D.new()
	_head.add_child(_face)
	_add_blob(_face, r * 0.22, r * 0.14, BLUSH, Vector2(r * 0.5, r * 0.3), false)
	if def.has_mask:
		_add_poly(_face, _rect(-r * 0.45, -r * 0.55, r * 1.02, -r * 0.02), MASK, Vector2.ZERO, false)
	_add_eye(Vector2(-r * 0.12, -r * 0.28), 0.85, 1.0)
	_add_eye(Vector2(r * 0.4, -r * 0.25), 1.0, -1.0)
	# Big goofy nose + small smile.
	var nose := _add_blob(_face, r * 0.42, r * 0.3, def.skin_color.darkened(0.12), Vector2(r * 0.88, r * 0.18))
	_add_blob(nose, r * 0.12, r * 0.08, Color(1, 1, 1, 0.45), Vector2(r * 0.08, -r * 0.1), false)
	var mouth := Line2D.new()
	mouth.width = 2.0
	mouth.default_color = OUTLINE
	mouth.begin_cap_mode = Line2D.LINE_CAP_ROUND
	mouth.end_cap_mode = Line2D.LINE_CAP_ROUND
	mouth.points = PackedVector2Array([
		Vector2(r * 0.2, r * 0.5), Vector2(r * 0.42, r * 0.62), Vector2(r * 0.62, r * 0.52)])
	_face.add_child(mouth)

	_headwear = Node2D.new()
	_head.add_child(_headwear)
	match def.headwear:
		CharacterDef.Headwear.WIZARD_HAT:
			var hat := def.main_color.darkened(0.15)
			var cone := _add_poly(_headwear, PackedVector2Array([
				Vector2(-r * 0.8, -r * 0.55), Vector2(-r * 0.2, -r * 1.8), Vector2(-r * 0.8, -r * 2.5),
				Vector2(r * 0.15, -r * 1.95), Vector2(r * 0.8, -r * 0.55),
			]), hat)
			_add_shade(cone, _rect(-r * 2, -r * 3, -r * 0.1, 0), hat.darkened(0.15))
			_add_poly(_headwear, _rect(-r * 0.72, -r * 0.95, r * 0.72, -r * 0.7), def.accent_color, Vector2.ZERO, false)
			_add_blob(_headwear, r * 1.3, r * 0.26, hat.darkened(0.1), Vector2(0, -r * 0.55))
			_add_poly(_headwear, _star(r * 0.34), def.accent_color, Vector2(-r * 0.8, -r * 2.5))
			return -r * 2.85
		CharacterDef.Headwear.BUCKET_HELM:
			_face.visible = false
			var steel := def.trim_color
			var helm := _add_poly(_headwear, PackedVector2Array([
				Vector2(-r * 1.1, r * 0.95), Vector2(-r * 1.15, -r * 0.6), Vector2(-r * 0.8, -r * 1.05),
				Vector2(r * 0.8, -r * 1.05), Vector2(r * 1.15, -r * 0.6), Vector2(r * 1.1, r * 0.95),
			]), steel)
			_add_shade(helm, _rect(-r * 2, -r * 2, -r * 0.35, r * 2), steel.darkened(0.15))
			_add_poly(_headwear, _rect(r * 0.55, -r * 0.95, r * 0.8, -r * 0.4), Color(1, 1, 1, 0.5), Vector2.ZERO, false)
			_add_poly(_headwear, _rect(r * 0.0, -r * 0.3, r * 1.12, -r * 0.05), OUTLINE, Vector2.ZERO, false)
			for x: float in [r * 0.35, r * 0.8]:  # eyes peeking through the slit
				_eyes.append(_add_blob(_headwear, 2.2, 2.0, EYE_WHITE, Vector2(x, -r * 0.18), false))
			_add_poly(_headwear, _rect(-r * 1.12, r * 0.35, r * 1.12, r * 0.5), steel.darkened(0.2), Vector2.ZERO, false)
			for x: float in [-r * 0.7, r * 0.2, r * 0.8]:  # rivets
				_add_blob(_headwear, 1.8, 1.8, steel.darkened(0.35), Vector2(x, r * 0.72), false)
			_plume = _add_blob(_headwear, r * 0.32, r * 0.95, def.accent_color, Vector2(-r * 0.25, -r * 1.75))
			_plume.rotation = -0.45
			_plume.set_meta(&"rest", _plume.rotation)
			return -r * 2.65
		CharacterDef.Headwear.BERET:
			var feather := _add_blob(_headwear, r * 1.0, r * 0.17, def.accent_color, Vector2(-r * 0.7, -r * 1.25))
			feather.rotation = -0.9
			var beret := _add_blob(_headwear, r * 1.1, r * 0.42, def.trim_color, Vector2(-r * 0.1, -r * 0.78))
			beret.rotation = 0.18
			_add_shade(beret, _rect(-r * 2, 0, r * 2, r), def.trim_color.darkened(0.15))
			_add_blob(_headwear, r * 0.14, r * 0.14, def.trim_color.darkened(0.2), Vector2(-r * 0.05, -r * 1.22))
			return -r * 2.05
		CharacterDef.Headwear.BANDANA:
			var cap := PackedVector2Array()
			for i in 13:
				var a := PI + PI * float(i) / 12.0
				cap.append(Vector2(cos(a) * r * 1.05, -r * 0.3 + sin(a) * r * 0.8))
			var band := _add_poly(_headwear, cap, def.accent_color)
			_add_shade(band, _rect(-r * 2, -r * 2, -r * 0.3, 0), def.accent_color.darkened(0.15))
			for p: Vector2 in [Vector2(-r * 0.3, -r * 0.75), Vector2(r * 0.3, -r * 0.85), Vector2(0, -r * 0.5)]:
				_add_blob(_headwear, 1.8, 1.8, EYE_WHITE, p, false)  # polka dots
			return -r * 1.15
	return -r


# --- Public ---------------------------------------------------------------------

## A punch connected: flash a star burst at the fist.
func impact() -> void:
	if def == null:
		return
	var star := _add_poly(self, _star(HAND_RADIUS * 2.6, 8, 0.5), IMPACT_COLOR, punch_target)
	star.scale = Vector2.ONE * 0.4
	var size := 1.3 + punch_power
	var tw := star.create_tween()
	tw.tween_property(star, ^"scale", Vector2.ONE * size, IMPACT_TIME).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)
	tw.parallel().tween_property(star, ^"rotation", 0.6, IMPACT_TIME)
	tw.parallel().tween_property(star, ^"modulate:a", 0.0, IMPACT_TIME).set_delay(IMPACT_TIME * 0.4)
	tw.tween_callback(star.queue_free)


# --- Pose -----------------------------------------------------------------------

func update_pose(state: StringName, vel: Vector2, on_floor: bool, max_speed: float, delta: float) -> void:
	if def == null:
		return
	_time += delta
	var speed_t := clampf(absf(vel.x) / maxf(max_speed, 1.0), 0.0, 1.0)
	if state == &"Ground" and speed_t > 0.05:
		_run_phase += delta * (RUN_CYCLE_BASE + RUN_CYCLE_SPEED * speed_t)
	if state == &"Ground" and speed_t <= 0.05:
		_idle_time += delta
	else:
		_idle_time = 0.0
	_quirk_active = def.idle_quirk != CharacterDef.IdleQuirk.NONE and _idle_time > idle_quirk_delay

	var target := _target_pose(state, vel, on_floor, speed_t)
	var k := 1.0 - exp(-POSE_SHARPNESS * delta)
	for key: StringName in target:
		_pose[key] = lerp(_pose[key], target[key], k)
	_update_face(vel, delta)
	_update_extras(vel, speed_t, delta)
	_update_punch_fx(state)
	_apply_pose()


func _target_pose(state: StringName, vel: Vector2, on_floor: bool, speed_t: float) -> Dictionary:
	var L := def.leg_length
	var h := def.body_height
	var r := def.head_radius
	var s_y := -L - h + 7.0                          # shoulder height
	var sx := def.body_width * 0.55 * 0.45           # shoulder half-width
	var t := _time
	var p := {
		&"bob": 0.0, &"lean": 0.0, &"head_tilt": 0.0, &"hand_scale": 1.0, &"arm_thick": 1.0,
		&"brow_tilt": 0.0, &"brow_raise": 0.0,
		&"foot_f": Vector2(7, 0), &"foot_b": Vector2(-6, 0),
		&"hand_f": Vector2(sx + 5, s_y + 15), &"hand_b": Vector2(-sx - 5, s_y + 15),
	}
	match state:
		&"Ground":
			if speed_t > 0.05:
				var ph := _run_phase
				var stride := 2.0 + STRIDE * speed_t
				p[&"foot_f"] = Vector2(3 + sin(ph) * stride, -maxf(0.0, cos(ph)) * STEP_LIFT * speed_t)
				p[&"foot_b"] = Vector2(-3 - sin(ph) * stride, -maxf(0.0, -cos(ph)) * STEP_LIFT * speed_t)
				p[&"hand_f"] = Vector2(sx + 3 - sin(ph) * 10.0 * speed_t, s_y + 13)
				p[&"hand_b"] = Vector2(-sx - 3 + sin(ph) * 10.0 * speed_t, s_y + 13)
				p[&"bob"] = -absf(sin(ph)) * RUN_BOB * speed_t
				p[&"lean"] = RUN_LEAN * speed_t
				p[&"brow_tilt"] = 0.3 * speed_t
			else:
				p[&"bob"] = sin(t * 2.2) * 1.0
				p[&"head_tilt"] = sin(t * 1.1) * 0.04
				if _quirk_active:
					_apply_quirk_pose(p, s_y, sx)
		&"Jump":
			p[&"foot_f"] = Vector2(6, -L * 0.55)
			p[&"foot_b"] = Vector2(-5, -L * 0.3)
			p[&"hand_f"] = Vector2(sx + 16, s_y - 12)
			p[&"hand_b"] = Vector2(-sx - 14, s_y - 8)
			p[&"lean"] = -0.06
			p[&"brow_raise"] = -1.5
		&"Fall":
			p[&"foot_f"] = Vector2(9, 3 + sin(t * 14.0) * 2.0)
			p[&"foot_b"] = Vector2(-8, 4 + cos(t * 14.0) * 2.0)
			p[&"hand_f"] = Vector2(sx + 15, s_y - 3 + sin(t * 16.0) * 5.0)
			p[&"hand_b"] = Vector2(-sx - 15, s_y - 3 + cos(t * 16.0) * 5.0)
			p[&"head_tilt"] = clampf(vel.y / 2000.0, 0.0, 0.25)
			p[&"brow_raise"] = -3.0
		&"Glide":
			# Hands up either side of the head, holding the twirling headwear.
			p[&"foot_f"] = Vector2(5 + sin(t * 5.0) * 3.0, 4)
			p[&"foot_b"] = Vector2(-5 + sin(t * 5.0 + 1.5) * 3.0, 5)
			p[&"hand_f"] = Vector2(r * 1.15, -L - h - r * 1.6)
			p[&"hand_b"] = Vector2(-r * 1.15, -L - h - r * 1.5)
			p[&"lean"] = 0.08
			p[&"brow_tilt"] = -0.3
		&"WallSlide":
			var wall_x := -def.body_width * 0.5 - 4.0      # wall is behind (we face away)
			p[&"foot_b"] = Vector2(wall_x + 2, -4)
			p[&"foot_f"] = Vector2(6, 0)
			p[&"hand_b"] = Vector2(wall_x, s_y - 10)
			p[&"hand_f"] = Vector2(sx + 12, s_y + 2)
			p[&"lean"] = -0.12
			p[&"brow_tilt"] = 0.5
		&"Punch":
			p[&"brow_tilt"] = 1.0
			p[&"hand_b"] = Vector2(-sx - 8, s_y + 10)
			if punching:
				p[&"hand_f"] = punch_target
				p[&"hand_scale"] = PUNCH_FIST_SCALE + CHARGED_FIST_BONUS * punch_power
				p[&"arm_thick"] = PUNCH_ARM_THICKNESS + 0.6 * punch_power
				p[&"lean"] = 0.22 + 0.1 * punch_power
				p[&"hand_b"] = Vector2(-sx - 14, s_y + 2)
			else:
				# Windup / charge: fist pulled back, trembling as it charges.
				var shake := Vector2(randf_range(-1, 1), randf_range(-1, 1)) * CHARGE_SHAKE * punch_charge
				p[&"hand_f"] = Vector2(-sx - 4 - 8 * punch_charge, s_y + 6) + shake
				p[&"hand_scale"] = 1.2 + CHARGED_FIST_BONUS * punch_charge
				p[&"lean"] = -0.1 - 0.12 * punch_charge
				p[&"bob"] = 3.0 * punch_charge
			if on_floor:
				p[&"foot_f"] = Vector2(11, 0)
				p[&"foot_b"] = Vector2(-9, 0)
		&"Bubble":
			p[&"foot_f"] = Vector2(5, -L - 2)
			p[&"foot_b"] = Vector2(-5, -L)
			p[&"hand_f"] = Vector2(sx + 10, s_y - 8 + sin(t * 3.0) * 6.0)
			p[&"hand_b"] = Vector2(-sx - 10, s_y - 8 + cos(t * 3.0) * 6.0)
			p[&"lean"] = sin(t * 1.5) * 0.2
			p[&"bob"] = 4.0
			p[&"brow_tilt"] = -1.0
	return p


func _apply_quirk_pose(p: Dictionary, s_y: float, sx: float) -> void:
	var t := _time
	match def.idle_quirk:
		CharacterDef.IdleQuirk.SNORE:
			p[&"head_tilt"] = 0.14 + sin(t * 1.3) * 0.06
			p[&"bob"] = sin(t * 1.3) * 1.8
			p[&"hand_f"] = Vector2(sx + 2, s_y + 17)
			p[&"brow_tilt"] = -0.4
		CharacterDef.IdleQuirk.PLUME_WAG:
			p[&"foot_f"] = Vector2(8, -maxf(0.0, sin(t * 9.0)) * 4.0)
			p[&"hand_b"] = Vector2(-sx - 2, s_y + 12)  # hand on hip
		CharacterDef.IdleQuirk.HUM:
			p[&"head_tilt"] = sin(t * 3.0) * 0.12
			p[&"bob"] = absf(sin(t * 3.0)) * -2.0
			p[&"hand_f"] = Vector2(sx + 8, s_y + 8 + sin(t * 6.0) * 3.0)  # conducting
			p[&"brow_tilt"] = -0.5
		CharacterDef.IdleQuirk.SHIFTY_EYES:
			p[&"lean"] = -0.08
			p[&"brow_raise"] = -1.5 if sin(t * 2.4) > 0.0 else 0.0
			p[&"hand_f"] = Vector2(sx + 1, s_y + 10)  # rubbing hands
			p[&"hand_b"] = Vector2(sx - 3, s_y + 12 + sin(t * 14.0) * 1.5)


func _apply_pose() -> void:
	var L := def.leg_length
	var h := def.body_height
	var wt := def.body_width * 0.55
	_torso.position = Vector2(0, -L + _pose[&"bob"])
	_torso.rotation = _pose[&"lean"]
	_head.rotation = _pose[&"head_tilt"]
	var hip := _torso.position
	var rot := _torso.rotation
	var hip_f := hip + Vector2(5, -2).rotated(rot)
	var hip_b := hip + Vector2(-5, -2).rotated(rot)
	var sh_f := hip + Vector2(wt * 0.4, -h + 7).rotated(rot)
	var sh_b := hip + Vector2(-wt * 0.4, -h + 7).rotated(rot)
	_set_limb(&"leg_f", hip_f, _pose[&"foot_f"], -1.0)
	_set_limb(&"leg_b", hip_b, _pose[&"foot_b"], -1.0)
	_set_limb(&"arm_f", sh_f, _pose[&"hand_f"], 1.0)
	_set_limb(&"arm_b", sh_b, _pose[&"hand_b"], 1.0)
	_feet[1].position = _pose[&"foot_f"] + Vector2(3, -3)
	_feet[0].position = _pose[&"foot_b"] + Vector2(3, -3)
	_hands[1].position = _pose[&"hand_f"]
	_hands[0].position = _pose[&"hand_b"]
	_hands[1].scale = Vector2.ONE * _pose[&"hand_scale"]
	var arm_lines: Array = _limbs[&"arm_f"]
	arm_lines[0].width = ARM_WIDTH * _pose[&"arm_thick"] + OUTLINE_WIDTH * 2.0
	arm_lines[1].width = ARM_WIDTH * _pose[&"arm_thick"]
	for b in _brows:
		# Positive tilt = angry (inner ends down), negative = worried.
		b.rotation = _pose[&"brow_tilt"] * 0.4 * float(b.get_meta(&"inner"))
		b.position = b.get_meta(&"rest") + Vector2(0, _pose[&"brow_raise"])


func _update_face(vel: Vector2, delta: float) -> void:
	_blink_timer -= delta
	if _blink_timer < -BLINK_TIME:
		_blink_timer = randf_range(1.8, 4.5)
	var eye_scale_y := 0.12 if _blink_timer < 0.0 else 1.0
	if _quirk_active and def.idle_quirk in [CharacterDef.IdleQuirk.SNORE, CharacterDef.IdleQuirk.HUM]:
		eye_scale_y = 0.12  # eyes closed: asleep / lost in the tune
	for e in _eyes:
		e.scale.y = eye_scale_y
	var look := Vector2(1.4, clampf(vel.y / 700.0, -1.0, 1.0) * 1.6)
	if _quirk_active and def.idle_quirk == CharacterDef.IdleQuirk.SHIFTY_EYES:
		look = Vector2(2.4 * signf(sin(_time * 2.4)), 0.3)
	for pupil in _pupils:
		pupil.position = look


func _update_extras(vel: Vector2, speed_t: float, delta: float) -> void:
	# Headwear twirls like a propeller while gliding (fake 3D spin).
	if gliding:
		_headwear.scale.x = cos(_time * GLIDE_SPIN_RATE)
	else:
		_headwear.scale.x = lerpf(_headwear.scale.x, 1.0, 0.3)
	var flutter := speed_t * 0.5 + clampf(-vel.y / 1500.0, -0.4, 0.4) + sin(_time * 12.0) * 0.08 * (speed_t + 0.2)
	if _scarf_tail:
		_scarf_tail.rotation = -flutter
	if _bandana_tails:
		_bandana_tails.rotation = -flutter * 0.8
	if _plume:
		var wag := sin(_time * 9.0) * 0.35 if _quirk_active else flutter * 0.3
		_plume.rotation = float(_plume.get_meta(&"rest")) + wag

	if _quirk_active:
		_particle_timer -= delta
		if _particle_timer <= 0.0:
			_particle_timer = QUIRK_PARTICLE_INTERVAL
			match def.idle_quirk:
				CharacterDef.IdleQuirk.SNORE:
					_spawn_float_text("z")
				CharacterDef.IdleQuirk.HUM:
					_spawn_float_note()
	else:
		_particle_timer = 0.0


func _update_punch_fx(state: StringName) -> void:
	var charging := state == &"Punch" and not punching and punch_charge > 0.0
	_charge_glow.visible = charging
	if charging:
		_charge_glow.scale = Vector2.ONE * (0.6 + 0.5 * punch_charge + sin(_time * 30.0) * 0.08)
		_charge_glow.modulate.a = 0.4 + 0.6 * punch_charge
	var pts := _trail.points
	if state == &"Punch" and punching:
		pts.append(_hands[1].position)
		while pts.size() > TRAIL_POINTS:
			pts.remove_at(0)
	elif pts.size() > 0:
		pts.remove_at(0)
	_trail.points = pts
	# Speed lines streak behind the fist while the punch is out.
	var fist := _hands[1].position
	for i in _speed_lines.size():
		var sl := _speed_lines[i]
		sl.visible = state == &"Punch" and punching
		if sl.visible:
			var y := (float(i) - 1.0) * (9.0 + 5.0 * punch_power)
			var line_len := 22.0 + 30.0 * punch_power + 6.0 * float(i % 2)
			sl.points = PackedVector2Array([fist + Vector2(-14.0 - line_len, y), fist + Vector2(-14.0, y)])
	_trail.width = HAND_RADIUS * (2.4 + 1.5 * punch_power)


# --- Floating quirk particles ---------------------------------------------------

func _particle_origin() -> Vector2:
	var r := def.head_radius
	return Vector2(r * 0.9, -def.leg_length - def.body_height - r * 1.9)


func _spawn_float_text(text: String) -> void:
	var holder := Node2D.new()
	holder.position = _particle_origin()
	# Counter the Visual flip so letters never read mirrored.
	if get_global_transform().get_scale().x < 0.0:
		holder.scale.x = -1.0
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override(&"font_size", 18)
	l.add_theme_color_override(&"font_color", PARTICLE_COLOR)
	l.add_theme_color_override(&"font_outline_color", OUTLINE)
	l.add_theme_constant_override(&"outline_size", 5)
	l.position = Vector2(-6, -12)
	holder.add_child(l)
	_float_away(holder)


func _spawn_float_note() -> void:
	var note := Node2D.new()
	note.position = _particle_origin()
	_add_blob(note, 4.0, 3.0, PARTICLE_COLOR, Vector2.ZERO)
	var stem := Line2D.new()
	stem.width = 2.0
	stem.default_color = OUTLINE
	stem.points = PackedVector2Array([Vector2(3.5, 0), Vector2(3.5, -12), Vector2(8, -9)])
	note.add_child(stem)
	_float_away(note)


func _float_away(node: Node2D) -> void:
	add_child(node)
	var drift := Vector2(randf_range(6.0, 16.0), randf_range(-40.0, -30.0))
	var tw := node.create_tween()
	tw.tween_property(node, ^"position", node.position + drift, 1.4).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(node, ^"rotation", randf_range(-0.4, 0.4), 1.4)
	tw.parallel().tween_property(node, ^"modulate:a", 0.0, 0.6).set_delay(0.8)
	tw.tween_callback(node.queue_free)


# --- Shape helpers --------------------------------------------------------------

func _add_limb(n: StringName, width: float, color: Color) -> void:
	var lines: Array[Line2D] = []
	for i in 2:
		var l := Line2D.new()
		l.width = width + (OUTLINE_WIDTH * 2.0 if i == 0 else 0.0)
		l.default_color = OUTLINE if i == 0 else color
		l.begin_cap_mode = Line2D.LINE_CAP_ROUND
		l.end_cap_mode = Line2D.LINE_CAP_ROUND
		l.joint_mode = Line2D.LINE_JOINT_ROUND
		add_child(l)
		lines.append(l)
	_limbs[n] = lines


## Two-segment limb with a slight bend (knees bend forward, elbows back).
func _set_limb(n: StringName, a: Vector2, b: Vector2, bend: float) -> void:
	var mid := (a + b) * 0.5 + (b - a).orthogonal().normalized() * 3.0 * bend
	var pts := PackedVector2Array([a, mid, b])
	for l: Line2D in _limbs[n]:
		l.points = pts


## `inner` = which way the brow's inner end points (+1 toward +x).
func _add_eye(pos: Vector2, size: float, inner: float) -> void:
	var e := _add_blob(_face, 4.8 * size, 6.2 * size, EYE_WHITE, pos, true)
	_eyes.append(e)
	_pupils.append(_add_blob(e, 2.3 * size, 3.1 * size, PUPIL, Vector2.ZERO, false))
	var brow := Line2D.new()
	brow.width = BROW_WIDTH
	brow.default_color = OUTLINE
	brow.begin_cap_mode = Line2D.LINE_CAP_ROUND
	brow.end_cap_mode = Line2D.LINE_CAP_ROUND
	brow.points = PackedVector2Array([Vector2(-4.5 * size, 0), Vector2(4.5 * size, -0.8)])
	brow.position = pos + Vector2(0, -9.5 * size)
	brow.set_meta(&"rest", brow.position)
	brow.set_meta(&"inner", inner)
	_face.add_child(brow)
	_brows.append(brow)


## Darker copy of `poly` clipped to `region`, drawn under poly's outline.
func _add_shade(poly: Polygon2D, region: PackedVector2Array, color: Color) -> void:
	for piece in Geometry2D.intersect_polygons(poly.polygon, region):
		var s := Polygon2D.new()
		s.polygon = piece
		s.color = color
		poly.add_child(s)
		poly.move_child(s, 0)


func _add_blob(parent: Node, rx: float, ry: float, color: Color, pos := Vector2.ZERO, outline := true) -> Polygon2D:
	return _add_poly(parent, _ellipse(rx, ry), color, pos, outline)


func _add_poly(parent: Node, pts: PackedVector2Array, color: Color, pos := Vector2.ZERO, outline := true) -> Polygon2D:
	var poly := Polygon2D.new()
	poly.polygon = pts
	poly.color = color
	poly.position = pos
	parent.add_child(poly)
	if outline:
		var l := Line2D.new()
		l.points = pts
		l.closed = true
		l.width = OUTLINE_WIDTH
		l.default_color = OUTLINE
		l.joint_mode = Line2D.LINE_JOINT_ROUND
		poly.add_child(l)
	return poly


static func _ellipse(rx: float, ry: float, n := 18) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * float(i) / float(n)
		pts.append(Vector2(cos(a) * rx, sin(a) * ry))
	return pts


static func _rect(x0: float, y0: float, x1: float, y1: float) -> PackedVector2Array:
	return PackedVector2Array([Vector2(x0, y0), Vector2(x1, y0), Vector2(x1, y1), Vector2(x0, y1)])


static func _star(radius: float, points := 5, inner := 0.45) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in points * 2:
		var a := -PI * 0.5 + PI * float(i) / float(points)
		var rr := radius if i % 2 == 0 else radius * inner
		pts.append(Vector2(cos(a) * rr, sin(a) * rr))
	return pts
