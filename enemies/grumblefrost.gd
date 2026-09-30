class_name Grumblefrost
extends Enemy
## BOSS - GRUMBLEFROST, the Snowball King: a colossal yeti with an icicle crown
## who lives on the summit of Frostwhistle Peak.
##   - Heaves a giant SNOW BOULDER (he lifts it overhead first - the tell) that
##     rolls at you. Jump it... or PUNCH IT BACK! A boulder that rolls into him
##     knocks him flat on his back, dazed.
##   - TOBOGGANS across the arena on his belly (he wiggles and grins first).
##     Jump him; when he slams into the wall he's dazed too.
##   - From phase 2 he BELLOWS: icicles rain from the sky, then he LEAPS and
##     slams the ice (jump the shockwaves).
##   - Dazed = STOMP or PUNCH him. Each hit takes one pip.
## Starts asleep: wake him with set_active(true) (a ZoneTrigger).

enum St { WALK, LIFT, SLIDE_TELL, SLIDE, BELLOW, CROUCH, AIR, DAZED }

@export var asleep := true
@export var walk_speed := 80.0
@export var slide_speed := 600.0
@export var daze_time := 2.6
@export var boss_name := "GRUMBLEFROST"

const FUR := Color("eef4fb")
const FUR_SHADE := Color("b9cbe0")
const FACE := Color("7fa7e0")
const FACE_DARK := Color("5b82c0")
const ICE := Color("bfe9ff")
const ANGRY := Color("ffb0c0")
const MOUTH := Color("3a2a4a")

var st := St.WALK
var _timer := 2.0
var _bounces := 0
var _max_health := 6
var _boulders_left := 0


func _init() -> void:
	body_size = Vector2(140, 150)
	health = 6
	lum_drop = 24
	stompable = false
	knockback_scale = 0.0
	stun_time = 0.0
	stomp_bounce = 1.15


func _setup() -> void:
	_max_health = health


func phase() -> int:
	if health > _max_health * 2 / 3:
		return 1
	if health > _max_health / 3:
		return 2
	return 3


func set_active(on: bool) -> void:
	asleep = not on
	if on:
		_timer = 1.4
		st = St.WALK
		squash(Vector2(0.8, 1.25))
		EventBus.screen_shake.emit(0.5)
		Audio.play("boss_slam", -2.0, 0.8)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _physics_process(delta: float) -> void:
	stompable = st == St.DAZED and stun_timer > 0.0
	if st == St.DAZED and stun_timer <= 0.0 and not dead:
		st = St.WALK
		_timer = 0.9
		velocity.y = -320.0
		squash(Vector2(0.8, 1.2))
	super(delta)


func _behave(delta: float) -> void:
	if asleep:
		velocity.x = 0.0
		return
	var ph := phase()
	_timer -= delta
	match st:
		St.WALK:
			var p := nearest_player()
			if p:
				face(p)
			velocity.x = facing * walk_speed * (1.0 + 0.25 * (ph - 1))
			if wall_ahead():
				velocity.x = 0.0
			if _timer <= 0.0 and is_on_floor():
				var r := randf()
				if ph >= 2 and r < 0.3:
					st = St.BELLOW
					_timer = 0.8
					Audio.play("boss_slam", -6.0, 1.4)
				elif r < 0.65:
					st = St.LIFT
					_timer = 0.85 if ph < 3 else 0.6
					_boulders_left = 1 if ph < 3 else 2
				else:
					st = St.SLIDE_TELL
					_timer = 0.7 if ph < 3 else 0.5
		St.LIFT:
			velocity.x = 0.0
			if _timer <= 0.0:
				_throw_boulder()
				_boulders_left -= 1
				if _boulders_left > 0:
					_timer = 0.9
				else:
					st = St.WALK
					_timer = randf_range(1.6, 2.4)
		St.SLIDE_TELL:
			velocity.x = 0.0
			if _timer <= 0.0:
				var p := nearest_player()
				if p:
					face(p)
				st = St.SLIDE
				_bounces = ph
				squash(Vector2(1.3, 0.7))
		St.SLIDE:
			velocity.x = facing * slide_speed * (1.0 + 0.12 * (ph - 1))
			if fmod(anim_time, 0.06) < delta:
				Vfx.puff(global_position + Vector2(-facing * 60.0, -6), 2, Color(1, 1, 1, 0.9), Vector2(-facing, -0.6).normalized(), 0.7)
			if is_on_wall():
				EventBus.screen_shake.emit(0.4)
				squash(Vector2(0.7, 1.25))
				_bounces -= 1
				if _bounces <= 0:
					_daze()
					_icicle_rain(3 + ph * 2)
				else:
					facing = -facing
					velocity.y = -240.0
		St.BELLOW:
			velocity.x = 0.0
			if fmod(anim_time, 0.1) < delta:
				EventBus.screen_shake.emit(0.15)
			if _timer <= 0.0:
				_icicle_rain(5 + ph * 2)
				st = St.CROUCH
				_timer = 0.5
		St.CROUCH:
			velocity.x = 0.0
			squash(Vector2(1.15, 0.85))
			if _timer <= 0.0:
				var p := nearest_player()
				var dx := (p.global_position.x - global_position.x) if p else 0.0
				velocity = Vector2(clampf(dx * 1.1, -480.0, 480.0), -sqrt(2.0 * gravity * 440.0))
				st = St.AIR
		St.AIR:
			if is_on_floor() and velocity.y >= 0.0:
				_slam()


func _daze() -> void:
	st = St.DAZED
	stun_timer = daze_time
	velocity = Vector2(-facing * 160.0, -360.0)
	EventBus.enemy_hit.emit(self, null)


func _throw_boulder() -> void:
	var p := nearest_player()
	if p:
		face(p)
	var b := Snowball.new()
	b.hostile = true
	b.thrower = self
	b.direction = float(facing)
	b.speed = 330.0 + 60.0 * (phase() - 1)
	b.downhill_speed = b.speed
	b.start_radius = 52.0
	b.max_radius = 52.0
	b.lifetime = 8.0
	b.position = position + Vector2(facing * 150.0, -80.0)
	get_parent().add_child(b)
	b.velocity = Vector2(facing * b.speed, -200.0)
	squash(Vector2(1.2, 0.85))
	EventBus.screen_shake.emit(0.2)
	Audio.play("punch_big", -4.0, 0.6)


func _slam() -> void:
	velocity = Vector2.ZERO
	squash(Vector2(1.4, 0.6))
	EventBus.screen_shake.emit(0.6)
	EventBus.player_ground_pounded.emit(null, global_position)
	for d: int in [-1, 1]:
		var w := Shockwave.new()
		w.dir = d
		w.position = position + Vector2(d * body_size.x * 0.5, 0)
		get_parent().add_child(w)
	st = St.WALK
	_timer = randf_range(0.9, 1.5)


## Icicles drop out of the sky, some aimed near players.
func _icicle_rain(count: int) -> void:
	var targets: Array[float] = []
	for n in get_tree().get_nodes_in_group(&"players"):
		targets.append((n as Player).global_position.x)
	for i in count:
		var a := Projectile.new()
		var x := position.x + randf_range(-700, 700)
		if i < targets.size():
			x = targets[i] + randf_range(-80, 80)
		a.velocity = Vector2(0, randf_range(40, 140))
		a.gravity_scale = 0.35
		a.color = ICE
		a.lifetime = 6.0
		a.position = Vector2(x, position.y - 800.0 - randf_range(0, 400))
		get_parent().add_child.call_deferred(a)


func blocks_hit(_by: Player, kind: HitKind) -> bool:
	if kind == HitKind.PROJECTILE:
		return false
	return asleep or st != St.DAZED or stun_timer <= 0.0


func _on_stomped(by: Player) -> void:
	if st == St.DAZED and stun_timer > 0.0:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	if asleep or dead:
		return
	if kind == HitKind.PROJECTILE:
		# His own boulder (or a punched-back icicle/snowball) knocks him flat.
		if st != St.DAZED:
			_daze()
			squash(Vector2(1.4, 0.6))
			EventBus.screen_shake.emit(0.5)
		return
	super(by, kind, Vector2.ZERO)
	if not dead:
		stun_timer = 0.0
		st = St.WALK
		_timer = 1.0
		velocity.y = -400.0
	_send_health()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	EventBus.screen_shake.emit(1.0)
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var ph := phase()
	var tint := FUR.lerp(ANGRY, 0.3 * (ph - 1) / 2.0)
	if st == St.DAZED:
		_draw_on_back(ci, tint)
		return
	if st in [St.SLIDE, St.SLIDE_TELL] and st == St.SLIDE:
		_draw_sliding(ci, tint)
		return
	var step := sin(anim_time * 5.0) * 10.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	var wig := sin(anim_time * 30.0) * 4.0 if st == St.SLIDE_TELL else 0.0
	ci.draw_set_transform(Vector2(wig, 0), 0.0, Vector2.ONE)
	# Big flat feet.
	Art.shape(ci, Art.ellipse(Vector2(-34 + step, -8), 30, 12, 14), FACE_DARK, OUTLINE, 3.0)
	Art.shape(ci, Art.ellipse(Vector2(34 - step, -8), 30, 12, 14), FACE_DARK, OUTLINE, 3.0)
	# Shaggy body.
	var pts := PackedVector2Array()
	for i in 36:
		var a := TAU * i / 36.0
		var r := 74.0 + (9.0 if i % 2 == 0 else 0.0)
		pts.append(Vector2(0, -84) + Vector2(cos(a) * r, sin(a) * r * 1.02))
	Art.shape(ci, pts, tint, OUTLINE, 3.5)
	ci.draw_colored_polygon(Art.ellipse(Vector2(14, -50), 46, 28, 16), FUR_SHADE)
	# Arms: up holding a boulder when lifting, otherwise hanging.
	var lifting := st == St.LIFT
	for d: float in [-1.0, 1.0]:
		var sh := Vector2(d * 60.0, -110)
		var hand := sh + (Vector2(d * 20.0, -90.0) if lifting else Vector2(d * 30.0, 60.0 + sin(anim_time * 3.0 + d) * 6.0))
		ci.draw_line(sh, hand, OUTLINE, 34.0)
		ci.draw_line(sh, hand, FUR_SHADE, 27.0)
		ci.draw_line(sh + Vector2(-4, 0), hand + Vector2(-4, 0), tint, 12.0)
		Art.shape(ci, Art.ellipse(hand, 17, 15, 12), FACE_DARK, OUTLINE, 3.0)
	if lifting:
		var up := clampf(1.0 - _timer / 0.85, 0.0, 1.0)
		var c := Vector2(0, -230 - up * 20.0)
		ci.draw_circle(c, 56.0, OUTLINE)
		ci.draw_circle(c, 52.0, Color("f4fbff"))
		ci.draw_circle(c + Vector2(10, 12), 36.0, Color("c7dcef"))
		ci.draw_circle(c + Vector2(-3, -3), 36.0, Color("f4fbff"))
	# Face: blue, with a huge toothy grin.
	var face_c := Vector2(20, -110)
	Art.shape(ci, Art.ellipse(face_c, 44, 36, 20), FACE, OUTLINE, 3.0)
	var mouth_open := 1.0 if st == St.BELLOW else 0.45
	var m := PackedVector2Array()
	for i in 11:
		var a := float(i) / 10.0 * PI
		m.append(face_c + Vector2(-26 + i * 5.2, 8 + sin(a) * 22.0 * mouth_open))
	m.append(face_c + Vector2(26, 8))
	Art.shape(ci, m, MOUTH, OUTLINE, 2.5)
	for k in 2:  # tusks
		var x := -16.0 + k * 28.0
		Art.shape(ci, PackedVector2Array([face_c + Vector2(x, 8), face_c + Vector2(x + 8, 8), face_c + Vector2(x + 4, -6)]), Color.WHITE, OUTLINE, 1.5)
	var angry := ph >= 2 or st in [St.SLIDE_TELL, St.BELLOW]
	Enemy.draw_eye(ci, face_c + Vector2(-14, -14), 7.0, Vector2(1, 0), 1.0 if angry else 0.4)
	Enemy.draw_eye(ci, face_c + Vector2(14, -14), 7.0, Vector2(1, 0), 1.0 if angry else 0.4)
	# Icicle crown.
	for k in 5:
		var x := -40.0 + k * 20.0
		var h := 28.0 + (10.0 if k == 2 else 0.0)
		Art.shape(ci, PackedVector2Array([Vector2(x - 9, -154), Vector2(x + 9, -154), Vector2(x, -154 - h)]), ICE, OUTLINE, 2.0)
	ci.draw_rect(Rect2(-50, -160, 100, 10), Color("ffd23f"))
	if st == St.BELLOW:
		for k in 3:
			var r := 60.0 + fmod(anim_time * 300.0 + k * 40.0, 120.0)
			ci.draw_arc(face_c + Vector2(20, 10), r, -0.6, 0.6, 12, Color(1, 1, 1, 0.6 - r / 300.0), 4.0)
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(70 + ph2 * 30.0, -190 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(22 + ph2 * 18), Color(1, 1, 1, 1.0 - ph2))
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_sliding(ci: CanvasItem, tint: Color) -> void:
	# Belly-down toboggan, arms swept back, face forward.
	var c := Vector2(0, -52)
	var pts := PackedVector2Array()
	for i in 36:
		var a := TAU * i / 36.0
		var r := 1.0 + (0.08 if i % 2 == 0 else 0.0)
		pts.append(c + Vector2(cos(a) * 110.0 * r, sin(a) * 52.0 * r))
	Art.shape(ci, pts, tint, OUTLINE, 3.5)
	Art.shape(ci, Art.ellipse(c + Vector2(84, -10), 36, 30, 16), FACE, OUTLINE, 3.0)
	Enemy.draw_eye(ci, c + Vector2(92, -20), 6.0, Vector2(1, 0), 1.0)
	ci.draw_arc(c + Vector2(90, 2), 14.0, 0.1, PI - 0.1, 10, MOUTH, 5.0)
	for k in 3:
		ci.draw_line(Vector2(-130 - k * 12, -40 - k * 22), Vector2(-170 - k * 12, -40 - k * 22), Color(1, 1, 1, 0.7), 4.0)
	for k in 5:
		var x := 40.0 + k * 16.0
		Art.shape(ci, PackedVector2Array([c + Vector2(x - 8, -40), c + Vector2(x + 8, -40), c + Vector2(x + 16, -64)]), ICE, OUTLINE, 2.0)


func _draw_on_back(ci: CanvasItem, tint: Color) -> void:
	var wig := sin(anim_time * 16.0) * 8.0
	var c := Vector2(0, -56)
	Art.shape(ci, Art.ellipse(c, 112, 56, 28), tint, OUTLINE, 3.5)
	ci.draw_colored_polygon(Art.ellipse(c + Vector2(0, -12), 80, 30, 20), FUR_SHADE)
	for x: float in [-60.0, -20.0, 30.0, 70.0]:
		var tip := Vector2(x + wig * (1.0 if int(x) % 20 == 0 else -1.0), -140)
		ci.draw_line(Vector2(x, -96), tip, OUTLINE, 26.0)
		ci.draw_line(Vector2(x, -96), tip, tint, 20.0)
	Art.shape(ci, Art.ellipse(Vector2(110, -60), 36, 30, 16), FACE, OUTLINE, 3.0)
	ci.draw_arc(Vector2(104, -66), 5.0, 0, TAU * 0.8, 8, OUTLINE, 2.0)
	ci.draw_arc(Vector2(122, -66), 5.0, 0, TAU * 0.8, 8, OUTLINE, 2.0)
	ci.draw_string(ThemeDB.fallback_font, Vector2(-80, -180), "STOMP HIM!", HORIZONTAL_ALIGNMENT_CENTER, 160, 24, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
