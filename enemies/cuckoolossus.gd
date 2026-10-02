class_name Cuckoolossus
extends Enemy
## BOSS - CUCKOOLOSSUS, the clock that struck thirteen: a towering cuckoo clock
## stomping about the top of the Clockwhirl Works on little brass legs.
##   - CHIME + PENDULUM: it rings (DONG - the tell, pendulum pulled back), then
##     its huge pendulum sweeps along the floor in front of it. Jump it!
##   - GEARS: it spits brass gears that bounce across the arena.
##   - CUCKOO! Its doors rattle (the tell) and the cuckoo bird shoots out on a
##     long spring at you - and gets STUCK beak-first in the floor, dizzy.
##     STOMP or PUNCH the bird! That's the only way to hurt it.
##   - Phase 3: two cuckoos in a row, and it shakes gears from the ceiling.
## Starts asleep: wake it with set_active(true) (a ZoneTrigger).

enum St { WALK, CHIME, SWING, GEARS, RATTLE, LUNGE, STUCK, RETRACT }

@export var asleep := true
@export var walk_speed := 70.0
@export var stuck_time := 2.6
@export var boss_name := "CUCKOOLOSSUS"

const WOOD := Color("8a5a36")
const WOOD_DARK := Color("6a4228")
const BRASS := Color("e8c04a")
const FACE := Color("fff8ec")
const BIRD := Color("6fb7ff")
const BEAK := Color("ffb13f")
const ROOF := Color("c9452e")

var st := St.WALK
var _home := Vector2.INF
var _timer := 2.0
var _max_health := 6
var _swing := 0.0            ## pendulum swing amount 0..1 (forward)
var _bird := 0.0             ## 0 in the house .. 1 at the target
var _bird_target := Vector2.ZERO
var _cuckoos_left := 0
var _swing_hit := {}


func _init() -> void:
	body_size = Vector2(150, 220)
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


## Everyone respawned (its ZoneTrigger sends false): back to its spot, asleep, damage kept.
func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.WALK
		_bird = 0.0
		_swing = 0.0
		for c in get_parent().get_children():
			if c is Projectile and c.shooter == self:
				c.queue_free()
		_send_health()
		return
	if on:
		_timer = 1.4
		st = St.WALK
		squash(Vector2(0.85, 1.2))
		EventBus.screen_shake.emit(0.4)
		Audio.play("boss_slam", -2.0, 1.4)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


## Where the cuckoo bird's head is (world space).
func bird_head() -> Vector2:
	var door := global_position + Vector2(facing * 30.0, -170.0)
	return door.lerp(_bird_target, _bird)


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
				if r < 0.45:
					st = St.RATTLE
					_timer = 0.8 if ph < 3 else 0.6
					_cuckoos_left = 2 if ph >= 3 else 1
				elif r < 0.75:
					st = St.CHIME
					_timer = 0.7
					Audio.play("boss_slam", -8.0, 2.0)
				else:
					st = St.GEARS
					_timer = 0.4
		St.CHIME:
			velocity.x = 0.0
			_swing = move_toward(_swing, -0.6, delta * 2.0)  # pulled back
			if _timer <= 0.0:
				st = St.SWING
				_timer = 0.55
				_swing_hit.clear()
		St.SWING:
			velocity.x = 0.0
			_swing = move_toward(_swing, 1.0, delta * 6.0)
			_hurt_on_pendulum()
			if _timer <= 0.0:
				st = St.WALK
				_swing = 0.0
				_timer = randf_range(1.2, 1.8)
		St.GEARS:
			velocity.x = 0.0
			if _timer <= 0.0:
				_throw_gears(2 + ph)
				if ph >= 3:
					_gear_rain(4)
				st = St.WALK
				_timer = randf_range(1.4, 2.0)
		St.RATTLE:
			velocity.x = 0.0
			if fmod(anim_time, 0.1) < delta:
				squash(Vector2(1.04, 0.97))
			if _timer <= 0.0:
				var p := nearest_player()
				if p:
					face(p)
				var tx := (p.global_position.x if p else global_position.x + facing * 300.0)
				tx = clampf(tx, global_position.x - 600.0, global_position.x + 600.0)
				if absf(tx - global_position.x) < 160.0:
					tx = global_position.x + facing * 200.0
				_bird_target = Vector2(tx, global_position.y - 18.0)
				st = St.LUNGE
				_bird = 0.0
				Audio.play("punch_big", -4.0, 1.7)
		St.LUNGE:
			velocity.x = 0.0
			_bird = move_toward(_bird, 1.0, delta * 3.2)
			_hurt_on_bird()
			if _bird >= 1.0:
				st = St.STUCK
				_timer = stuck_time
				EventBus.screen_shake.emit(0.3)
		St.STUCK:
			velocity.x = 0.0
			_check_bird_hits()
			if _timer <= 0.0:
				st = St.RETRACT
		St.RETRACT:
			velocity.x = 0.0
			_bird = move_toward(_bird, 0.0, delta * 2.5)
			if _bird <= 0.0:
				_cuckoos_left -= 1
				if _cuckoos_left > 0:
					st = St.RATTLE
					_timer = 0.5
				else:
					st = St.WALK
					_timer = randf_range(1.2, 1.8) - 0.2 * (ph - 1)


func _pendulum_bob() -> Vector2:
	var pivot := global_position + Vector2(0, -60)
	var a := _swing * 1.3
	return pivot + Vector2(sin(a) * facing, cos(a)) * 120.0


func _hurt_on_pendulum() -> void:
	# The bob sweeps the floor in front: anyone on the ground in its path is hit.
	var reach := Rect2(global_position.x + (0.0 if facing > 0 else -380.0), global_position.y - 70.0, 380.0, 70.0)
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_bubbled() or _swing_hit.has(p) or _swing < 0.2:
			continue
		if reach.has_point(p.global_position + Vector2(0, -10)):
			_swing_hit[p] = true
			p.hurt()


func _hurt_on_bird() -> void:
	var h := bird_head()
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if not p.is_bubbled() and p.global_position.distance_to(h + Vector2(0, 20)) < 40.0:
			p.hurt()


## While the bird is stuck: a stomp on its head or a punch next to it hurts the clock.
func _check_bird_hits() -> void:
	var h := bird_head()
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.remote or p.is_bubbled():
			continue
		var d := p.global_position - h
		if p.velocity.y > 20.0 and absf(d.x) < 44.0 and d.y > -40.0 and d.y < 10.0:
			p.bounce(stomp_bounce)
			p.register_stomp()
			hit_bird(p, HitKind.STOMP)
			return
		var st_name := p.state_machine.current_name()
		if st_name in [&"Punch", &"Slide", &"GroundPound"] and absf(d.x) < 100.0 and absf(d.y + 30.0) < 70.0:
			hit_bird(p, HitKind.PUNCH)
			return


func hit_bird(by: Player, kind: HitKind) -> void:
	if st != St.STUCK or dead:
		return
	health -= 1
	hit_flash = 1.0
	EventBus.enemy_hit.emit(self, by)
	_send_health()
	if health <= 0:
		die(by, kind, Vector2(0, -300))
		return
	st = St.RETRACT
	squash(Vector2(1.2, 0.85))


func _throw_gears(count: int) -> void:
	var p := nearest_player()
	if p:
		face(p)
	for i in count:
		var q := Projectile.new()
		var vx := facing * (260.0 + i * 120.0)
		q.velocity = Vector2(vx, -620.0 - i * 60.0)
		q.gravity_scale = 0.6
		q.color = BRASS
		q.lifetime = 4.0
		q.shooter = self
		q.position = position + Vector2(facing * 70.0, -150.0)
		get_parent().add_child(q)
	squash(Vector2(1.1, 0.9))


func _gear_rain(count: int) -> void:
	for i in count:
		var q := Projectile.new()
		q.velocity = Vector2(randf_range(-30, 30), randf_range(60, 160))
		q.gravity_scale = 0.4
		q.color = BRASS
		q.lifetime = 6.0
		q.shooter = self
		q.position = position + Vector2(randf_range(-650, 650), -700.0 - randf_range(0, 250))
		get_parent().add_child.call_deferred(q)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return true  # only the bird can be hurt


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	if kind == HitKind.PROJECTILE and st == St.STUCK:
		hit_bird(by, kind)  # a gear punched back into the stuck bird counts


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	_bird = 0.0
	EventBus.screen_shake.emit(1.0)
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var tint := WOOD.lerp(Color("c94a3a"), 0.35 * (phase() - 1) / 2.0)
	var step := sin(anim_time * 5.0) * 8.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	# Little brass legs.
	for x: float in [-40.0, 40.0]:
		var foot := Vector2(x + (step if x < 0.0 else -step), -4)
		ci.draw_line(Vector2(x, -40), foot, OUTLINE, 12.0)
		ci.draw_line(Vector2(x, -40), foot, BRASS, 7.0)
		Art.shape(ci, Art.ellipse(foot + Vector2(6, 0), 18, 8, 12), WOOD_DARK, OUTLINE, 2.5)
	# Pendulum case and pendulum (drawn in local space; the visual is mirrored by facing).
	Art.shape(ci, Art.rect(Vector2(-50, -110), Vector2(50, -36)), tint.darkened(0.15), OUTLINE, 3.0)
	var a := _swing * 1.3
	var piv := Vector2(0, -100)
	var bob := piv + Vector2(sin(a), cos(a)) * (60.0 if st != St.SWING else 150.0)
	ci.draw_line(piv, bob, OUTLINE, 6.0)
	ci.draw_line(piv, bob, BRASS, 3.0)
	Art.shape(ci, Art.ellipse(bob, 20, 20, 16), BRASS, OUTLINE, 3.0)
	# The clock body and face.
	Art.shape(ci, Art.rect(Vector2(-70, -210), Vector2(70, -104)), tint, OUTLINE, 3.5)
	var fc := Vector2(0, -150)
	Art.shape(ci, Art.ellipse(fc, 40, 40, 28), FACE, OUTLINE, 3.0)
	for k in 12:
		var ang := TAU * k / 12.0
		ci.draw_line(fc + Vector2(cos(ang), sin(ang)) * 32.0, fc + Vector2(cos(ang), sin(ang)) * 37.0, OUTLINE, 2.5)
	var hand := anim_time * (1.5 + phase())
	ci.draw_line(fc, fc + Vector2(cos(hand), sin(hand)) * 28.0, OUTLINE, 3.0)
	ci.draw_line(fc, fc + Vector2(cos(hand * 0.08), sin(hand * 0.08)) * 18.0, OUTLINE, 4.0)
	# Angry eyebrows on the face (a clock with a temper).
	var angry := phase() >= 2 or st in [St.CHIME, St.RATTLE]
	ci.draw_line(fc + Vector2(-26, -26), fc + Vector2(-8, -20 if angry else -24), OUTLINE, 4.0)
	ci.draw_line(fc + Vector2(26, -26), fc + Vector2(8, -20 if angry else -24), OUTLINE, 4.0)
	# Roof with the bird's little door.
	Art.shape(ci, PackedVector2Array([Vector2(-88, -206), Vector2(0, -290), Vector2(88, -206)]), ROOF, OUTLINE, 3.5)
	var door := Vector2(30, -238)
	var rattle := sin(anim_time * 50.0) * 3.0 if st == St.RATTLE else 0.0
	Art.shape(ci, Art.rect(door + Vector2(-14 + rattle, -16), door + Vector2(14 + rattle, 14)), WOOD_DARK, OUTLINE, 2.5)
	# The cuckoo bird on its spring.
	if _bird > 0.0:
		var to := to_local_visual(bird_head())
		var pts := PackedVector2Array()
		for i in 17:
			var t := float(i) / 16.0
			var n := (to - door).orthogonal().normalized() * (10.0 if i % 2 == 0 else -10.0)
			pts.append(door.lerp(to, t) + (n if i > 0 and i < 16 else Vector2.ZERO))
		ci.draw_polyline(pts, OUTLINE, 5.0)
		ci.draw_polyline(pts, Color("c0c8d0"), 3.0)
		_draw_bird(ci, to, st == St.STUCK)
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(90 + ph2 * 30.0, -260 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(22 + ph2 * 18), Color(1, 1, 1, 1.0 - ph2))


## Turn a world position into the (mirrored) visual's local space.
func to_local_visual(p: Vector2) -> Vector2:
	var l := p - global_position
	return Vector2(l.x * facing, l.y)


func _draw_bird(ci: CanvasItem, c: Vector2, stuck: bool) -> void:
	var tilt := 0.9 if stuck else 0.2
	ci.draw_set_transform(c, tilt, Vector2.ONE)
	Art.shape(ci, Art.ellipse(Vector2.ZERO, 26, 20, 18), BIRD, OUTLINE, 3.0)
	Art.shape(ci, PackedVector2Array([Vector2(20, -4), Vector2(44, 2), Vector2(20, 8)]), BEAK, OUTLINE, 2.0)
	Art.shape(ci, PackedVector2Array([Vector2(-10, -18), Vector2(-2, -32), Vector2(4, -18)]), BIRD.darkened(0.2), OUTLINE, 2.0)
	if stuck:
		ci.draw_arc(Vector2(8, -6), 5.0, 0, TAU * 0.8, 8, OUTLINE, 2.0)
	else:
		Enemy.draw_eye(ci, Vector2(8, -6), 5.0, Vector2(1, 0), 1.0)
	ci.draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	if stuck:
		for k in 3:
			var a := anim_time * 6.0 + TAU * k / 3.0
			Art.shape(ci, Art.star(c + Vector2(cos(a) * 24.0, -34.0 + sin(a) * 6.0), 6.0), STUN_STAR, OUTLINE, 1.5)
		ci.draw_string(ThemeDB.fallback_font, c + Vector2(-80, -60), "STOMP IT!", HORIZONTAL_ALIGNMENT_CENTER, 160, 22, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
