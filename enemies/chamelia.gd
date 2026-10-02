class_name Chamelia
extends Enemy
## BOSS - CHAMELIA, the Colour Queen: a huge crowned chameleon who rules the
## old temple at the top of the Rainbloom Jungle.
##   - Her TONGUE: her eyes swivel and lock onto you and her throat puffs up
##     (the tell), then the tongue shoots straight out across the arena.
##     Jump it! If it hits a WALL instead of you, it STICKS - she's stuck and
##     dazed, tugging at it. That's your chance.
##   - From phase 2 she turns INVISIBLE (just a shimmer and her footprints),
##     scuttles somewhere else and pops out with a tongue attack.
##   - From phase 3 she LEAPS high and spits a fan of seeds, then lands with a
##     thump (jump the shockwaves).
##   - Dazed = STOMP or PUNCH her. Each hit takes one pip.
## Starts asleep: wake her with set_active(true) (a ZoneTrigger).

enum St { WALK, TELL, TONGUE, RETRACT, STUCK, CAMO, LEAP, AIR }

@export var asleep := true
@export var walk_speed := 90.0
@export var tongue_reach := 760.0
@export var tongue_speed := 2600.0
@export var stuck_time := 2.6
@export var boss_name := "CHAMELIA"

const SKIN := Color("54c45a")
const SKIN_DARK := Color("2f8f3f")
const BELLY := Color("d9f59a")
const CREST := Color("ff4fa0")
const TONGUE := Color("ff6f9a")
const EYE_RING := Color("ffd23f")

var st := St.WALK
var _home := Vector2.INF
var _timer := 2.0
var _max_health := 6
var _tongue := 0.0          ## current tongue length (px)
var _tongue_y := -70.0      ## mouth height above the feet
var _hue := 0.0             ## colour cycling while camouflaged / angry
var _alpha := 1.0
var _camo_target := 0.0
var _tongue_hit := {}       ## Player -> true (one hit per lash)


func _init() -> void:
	body_size = Vector2(150, 110)
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


## Everyone respawned (her ZoneTrigger sends false): back to her spot, asleep, damage kept.
func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.WALK
		stun_timer = 0.0
		_tongue = 0.0
		_alpha = 1.0
		_send_health()
		return
	if on:
		_timer = 1.4
		st = St.WALK
		squash(Vector2(0.8, 1.25))
		EventBus.screen_shake.emit(0.4)
		Audio.play("boss_slam", -2.0, 1.2)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _physics_process(delta: float) -> void:
	stompable = st == St.STUCK and stun_timer > 0.0
	if st == St.STUCK and stun_timer <= 0.0 and not dead:
		st = St.RETRACT
		squash(Vector2(0.8, 1.2))
	_hue = fposmod(_hue + delta * (0.6 if st == St.CAMO else 0.08 * phase()), 1.0)
	_alpha = move_toward(_alpha, 0.12 if st == St.CAMO else 1.0, delta * 3.0)
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
			velocity.x = facing * walk_speed * (1.0 + 0.2 * (ph - 1))
			if wall_ahead():
				velocity.x = 0.0
			if _timer <= 0.0 and is_on_floor():
				var r := randf()
				if ph >= 3 and r < 0.3:
					st = St.LEAP
					_timer = 0.45
				elif ph >= 2 and r < 0.6:
					st = St.CAMO
					_timer = 1.6
					var pl := nearest_player()
					var px := pl.global_position.x if pl else global_position.x
					# Sneak to the far side of the nearest player.
					_camo_target = px + (360.0 if global_position.x < px else -360.0)
				else:
					_start_tell()
		St.CAMO:
			var dx := _camo_target - global_position.x
			facing = 1 if dx > 0.0 else -1
			velocity.x = facing * 340.0 if absf(dx) > 20.0 and not wall_ahead() else 0.0
			if fmod(anim_time, 0.25) < delta and is_on_floor():
				Vfx.puff(global_position + Vector2(randf_range(-40, 40), -4), 1, Color(1, 1, 1, 0.5), Vector2.UP, 0.4)
			if _timer <= 0.0:
				_start_tell()
		St.TELL:
			velocity.x = 0.0
			if _timer <= 0.0:
				st = St.TONGUE
				_tongue = 0.0
				_tongue_hit.clear()
				Audio.play("punch_big", -6.0, 1.8)
		St.TONGUE:
			velocity.x = 0.0
			_tongue += tongue_speed * delta
			_hurt_on_tongue()
			var wall := _wall_distance()
			if wall >= 0.0 and _tongue >= wall:
				_tongue = wall
				_stick()
			elif _tongue >= tongue_reach:
				_tongue = tongue_reach
				st = St.RETRACT
		St.RETRACT:
			velocity.x = 0.0
			_tongue = move_toward(_tongue, 0.0, tongue_speed * 0.6 * delta)
			_hurt_on_tongue()
			if _tongue <= 0.0:
				st = St.WALK
				_timer = randf_range(1.2, 2.0) - 0.2 * (ph - 1)
		St.STUCK:
			velocity.x = 0.0
			if fmod(anim_time, 0.4) < delta:
				squash(Vector2(1.08, 0.94))
		St.LEAP:
			velocity.x = 0.0
			squash(Vector2(1.15, 0.85))
			if _timer <= 0.0:
				var p := nearest_player()
				var dx := (p.global_position.x - global_position.x) if p else 0.0
				velocity = Vector2(clampf(dx * 0.9, -420.0, 420.0), -sqrt(2.0 * gravity * 520.0))
				st = St.AIR
				_timer = 0.35
		St.AIR:
			if _timer <= 0.0 and _timer > -1.0 and velocity.y > -200.0:
				_timer = -2.0
				_seed_fan(5)
			if is_on_floor() and velocity.y >= 0.0:
				_land()


func _start_tell() -> void:
	var p := nearest_player()
	if p:
		face(p)
	st = St.TELL
	_timer = 0.75 if phase() < 3 else 0.55
	squash(Vector2(0.9, 1.1))


func _mouth() -> Vector2:
	return global_position + Vector2(facing * body_size.x * 0.5, _tongue_y)


## Distance from the mouth to the first wall along the tongue, or -1.
func _wall_distance() -> float:
	var q := PhysicsRayQueryParameters2D.create(_mouth(), _mouth() + Vector2(facing * tongue_reach, 0), 1)
	q.exclude = [get_rid()]
	var hit := get_world_2d().direct_space_state.intersect_ray(q)
	if hit.is_empty():
		return -1.0
	return absf((hit["position"] as Vector2).x - _mouth().x)


func _hurt_on_tongue() -> void:
	var m := _mouth()
	var r := Rect2(minf(m.x, m.x + facing * _tongue), m.y - 16.0, absf(_tongue), 32.0)
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_bubbled() or _tongue_hit.has(p):
			continue
		var box := Rect2(p.global_position + Vector2(-18, -60), Vector2(36, 60))
		if r.intersects(box):
			_tongue_hit[p] = true
			p.hurt()


func _stick() -> void:
	st = St.STUCK
	stun_timer = stuck_time
	EventBus.screen_shake.emit(0.35)
	EventBus.enemy_hit.emit(self, null)
	squash(Vector2(1.25, 0.8))


func _seed_fan(count: int) -> void:
	for i in count:
		var a := lerpf(-2.6, -0.5, float(i) / maxf(count - 1, 1))
		var q := Projectile.new()
		q.velocity = Vector2(cos(a), sin(a)) * 520.0
		q.gravity_scale = 0.45
		q.color = Color("c6ff4a")
		q.lifetime = 5.0
		q.shooter = self
		q.position = position + Vector2(0, -90)
		get_parent().add_child(q)


func _land() -> void:
	velocity = Vector2.ZERO
	squash(Vector2(1.4, 0.6))
	EventBus.screen_shake.emit(0.5)
	EventBus.player_ground_pounded.emit(null, global_position)
	for d: int in [-1, 1]:
		var w := Shockwave.new()
		w.dir = d
		w.position = position + Vector2(d * body_size.x * 0.5, 0)
		get_parent().add_child(w)
	st = St.WALK
	_timer = randf_range(0.9, 1.4)


func blocks_hit(_by: Player, kind: HitKind) -> bool:
	if kind == HitKind.PROJECTILE:
		return false
	return asleep or st != St.STUCK or stun_timer <= 0.0


func _on_stomped(by: Player) -> void:
	if st == St.STUCK and stun_timer > 0.0:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	if asleep or dead:
		return
	if kind == HitKind.PROJECTILE:
		# A seed punched back at her makes her flinch and stick her tongue out stupidly.
		if st != St.STUCK:
			_tongue = 120.0
			_stick()
		return
	super(by, kind, Vector2.ZERO)
	if not dead:
		stun_timer = 0.0
		st = St.RETRACT
		velocity.y = -380.0
	_send_health()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	_tongue = 0.0
	EventBus.screen_shake.emit(1.0)
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _skin() -> Color:
	var base := SKIN.lerp(Color("ff9a3d"), 0.3 * (phase() - 1) / 2.0)
	if st == St.CAMO:
		return Color.from_hsv(_hue, 0.5, 0.95)
	return base


func _draw_body(ci: CanvasItem) -> void:
	var skin := _skin()
	var a := _alpha
	var col := func(c: Color) -> Color: return Color(c, c.a * a)
	var o: Color = col.call(OUTLINE)
	var step := sin(anim_time * 6.0) * 8.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	# Curled tail.
	var tail := PackedVector2Array()
	for i in 20:
		var t := float(i) / 19.0
		var r := lerpf(70.0, 10.0, t)
		var ang := PI + t * TAU * 1.1
		tail.append(Vector2(-90 - 30.0 * t, -60) + Vector2(cos(ang), sin(ang)) * r * 0.6)
	ci.draw_polyline(tail, o, 22.0)
	ci.draw_polyline(tail, col.call(skin.darkened(0.1)), 16.0)
	# Legs (gripping feet).
	for x: float in [-50.0, 40.0]:
		var foot := Vector2(x + (step if x < 0.0 else -step), -4)
		ci.draw_line(Vector2(x, -40), foot, o, 18.0)
		ci.draw_line(Vector2(x, -40), foot, col.call(skin.darkened(0.15)), 12.0)
		Art.shape(ci, Art.ellipse(foot, 16, 7, 10), col.call(skin.darkened(0.2)), o, 2.0)
	# Body: a big humped oval with a pale belly and stripes.
	var stuck := st == St.STUCK
	var body_c := Vector2(-6, -66)
	Art.shape(ci, Art.ellipse(body_c, 86, 46, 26), col.call(skin), o, 3.5)
	ci.draw_colored_polygon(Art.ellipse(body_c + Vector2(10, 22), 60, 16, 18), col.call(BELLY))
	for k in 4:
		var x := -60.0 + k * 30.0
		ci.draw_line(Vector2(x, -104), Vector2(x + 12, -72), col.call(skin.darkened(0.2)), 6.0)
	# Crest / crown along the back.
	for k in 5:
		var x := -50.0 + k * 22.0
		Art.shape(ci, PackedVector2Array([Vector2(x - 10, -108), Vector2(x + 10, -108), Vector2(x, -132 - (8.0 if k == 2 else 0.0))]),
				col.call(CREST), o, 2.0)
	# Head with a casque, a big swivelling eye and a wide mouth.
	var head := Vector2(72, -82)
	Art.shape(ci, PackedVector2Array([head + Vector2(-30, -20), head + Vector2(10, -56), head + Vector2(26, -20)]), col.call(skin.darkened(0.1)), o, 2.5)
	Art.shape(ci, Art.ellipse(head, 40, 30, 20), col.call(skin), o, 3.0)
	var throat := 1.0 + (0.35 * sin(anim_time * 30.0) + 0.35 if st == St.TELL else 0.0)
	ci.draw_colored_polygon(Art.ellipse(head + Vector2(4, 22), 22 * throat, 12 * throat, 14), col.call(CREST.lightened(0.2)))
	var eye_c := head + Vector2(4, -10)
	Art.shape(ci, Art.ellipse(eye_c, 16, 16, 16), col.call(skin.lightened(0.15)), o, 2.5)
	var look := Vector2(1, 0)
	if st == St.TELL or st == St.CAMO:
		look = Vector2(cos(anim_time * 12.0), sin(anim_time * 9.0))
	if st == St.TELL and _timer < 0.3:
		look = Vector2(1, 0)
	if stuck:
		ci.draw_arc(eye_c, 7.0, 0, TAU * 0.8, 8, o, 2.5)
	else:
		ci.draw_circle(eye_c, 8.0, col.call(EYE_RING))
		ci.draw_circle(eye_c + look * 4.0, 4.5, o)
	ci.draw_line(head + Vector2(0, 10), head + Vector2(38, 4), o, 3.0)
	# The tongue, straight out from the mouth (drawn in local space; the visual is mirrored by facing).
	if _tongue > 1.0:
		var m := Vector2(body_size.x * 0.5, _tongue_y)
		var tip := m + Vector2(_tongue, sin(anim_time * 30.0) * (4.0 if stuck else 0.0))
		ci.draw_line(m, tip, o, 16.0)
		ci.draw_line(m, tip, TONGUE, 11.0)
		Art.shape(ci, Art.ellipse(tip, 18, 16, 14), TONGUE, OUTLINE, 3.0)
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(100 + ph2 * 30.0, -150 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(22 + ph2 * 18), Color(1, 1, 1, 1.0 - ph2))
	if stuck and stun_timer > 0.0:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-80, -170), "STOMP HER!", HORIZONTAL_ALIGNMENT_CENTER, 160, 24, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
