class_name BaronBristleback
extends Enemy
## BOSS - BARON BRISTLEBACK, lord of Thornwood Keep: an enormous hedgehog in a
## knight's helmet. His quills make him impossible to stomp... usually.
##   - CURLS (he shivers and his spikes glint - that's the tell) and ROLLS at
##     you. Jump over the ball! He bounces off walls, and when he's out of
##     bounces he CRASHES and flips onto his back, dazed.
##   - Dazed = belly up: STOMP or PUNCH him! Each hit takes one pip.
##   - Throws QUILL VOLLEYS (arcing spikes) and, from phase 2, LEAPS and slams
##     the floor (jump the shockwaves). Crashes then bring acorns down from
##     the rafters; in phase 3 he calls Prickleroll squires.
## Starts asleep: wake him with set_active(true) (a ZoneTrigger). Wire his
## `defeated` signal (or a DefeatTrigger parent) to open the exit.

enum St { WALK, CURL, ROLL, VOLLEY, CROUCH, AIR, DAZED }

@export var asleep := true
@export var walk_speed := 90.0
@export var roll_speed := 540.0
@export var daze_time := 2.4
@export var boss_name := "BARON BRISTLEBACK"

const SPINES := Color("6b4a3a")
const SPINES_LIGHT := Color("8d6a52")
const FACE := Color("f1d2a8")
const BELLY := Color("ffe6c7")
const HELM := Color("b8c0cc")
const PLUME := Color("ff5d3f")
const ANGRY := Color("ff6b5a")

var st := St.WALK
var _home := Vector2.INF   ## where he sleeps (set the first time he wakes)
var _timer := 2.0
var _bounces := 0
var _angle := 0.0
var _max_health := 6
var _last_hp_sent := -1
var _squires: Array[Enemy] = []


func _init() -> void:
	body_size = Vector2(130, 104)
	health = 6
	lum_drop = 20
	stompable = false
	knockback_scale = 0.0
	stun_time = 0.0
	stomp_bounce = 1.1


func _setup() -> void:
	_max_health = health


func phase() -> int:
	if health > _max_health * 2 / 3:
		return 1
	if health > _max_health / 3:
		return 2
	return 3


## Everyone respawned at the checkpoint (his ZoneTrigger sends false): back to his
## spot and asleep, with the damage you did kept. The health bar hides till you return.
func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.WALK
		stun_timer = 0.0
		for m in _squires:
			if is_instance_valid(m):
				m.queue_free()
		_squires.clear()
		_send_health()
		return
	if on:
		_timer = 1.2
		st = St.WALK
		squash(Vector2(0.8, 1.25))
		EventBus.screen_shake.emit(0.4)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _physics_process(delta: float) -> void:
	# Dazed: belly up and stompable; the base "stun" pauses _behave meanwhile.
	stompable = st == St.DAZED and stun_timer > 0.0
	if st == St.DAZED and stun_timer <= 0.0 and not dead:
		st = St.WALK
		_timer = 0.8
		velocity.y = -300.0  # hops back onto his feet
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
					st = St.CROUCH
					_timer = 0.45
				elif r < 0.62:
					st = St.CURL
					_timer = 0.75 if ph < 3 else 0.5
				else:
					st = St.VOLLEY
					_timer = 0.55
		St.CURL:
			velocity.x = 0.0
			_angle += delta * 10.0 * facing
			if _timer <= 0.0:
				var p := nearest_player()
				if p:
					face(p)
				st = St.ROLL
				_bounces = ph  # 1, 2 or 3 wall bounces before the crash
				squash(Vector2(1.2, 0.85))
		St.ROLL:
			_angle += delta * roll_speed / 40.0 * facing
			velocity.x = facing * roll_speed * (1.0 + 0.15 * (ph - 1))
			if is_on_wall():
				EventBus.screen_shake.emit(0.35)
				squash(Vector2(0.7, 1.25))
				_bounces -= 1
				if _bounces <= 0:
					_crash()
				else:
					facing = -facing
					velocity.y = -260.0
		St.VOLLEY:
			velocity.x = 0.0
			if _timer <= 0.0:
				_volley(3 + ph - 1)
				st = St.WALK
				_timer = randf_range(1.4, 2.2)
		St.CROUCH:
			velocity.x = 0.0
			squash(Vector2(1.15, 0.85))
			if _timer <= 0.0:
				var p := nearest_player()
				var dx := (p.global_position.x - global_position.x) if p else 0.0
				velocity = Vector2(clampf(dx * 1.1, -460.0, 460.0), -sqrt(2.0 * gravity * 420.0))
				st = St.AIR
		St.AIR:
			if is_on_floor() and velocity.y >= 0.0:
				_slam()


func _crash() -> void:
	st = St.DAZED
	stun_timer = daze_time
	velocity = Vector2(-facing * 180.0, -380.0)
	var ph := phase()
	if ph >= 2:
		_acorn_rain(4 + ph * 2)
	if ph >= 3 and get_tree().get_nodes_in_group(&"enemies").size() < 4:
		# Squires join the fight, but not as arena members: the exit opens
		# when the Baron himself falls (they flee with him).
		var home := get_parent()
		if home is DefeatTrigger:
			home = home.get_parent()
		for d: int in [-1, 1]:
			var m: Enemy = preload("res://enemies/prickleroll.tscn").instantiate()
			m.global_position = global_position + Vector2(d * 220.0, -60.0)
			m.start_facing = -d
			home.add_child.call_deferred(m)
			_squires.append(m)


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
	_timer = randf_range(0.8, 1.4)


## A fan of quills lobbed at the nearest player.
func _volley(count: int) -> void:
	var p := nearest_player()
	var aim := (p.global_position.x - global_position.x) if p else facing * 300.0
	if p:
		face(p)
	for i in count:
		var spread := (float(i) - (count - 1) * 0.5) / maxf(count - 1, 1)
		var vx := clampf(aim * 0.9, -700.0, 700.0) + spread * 260.0
		var q := shoot(Vector2(10, -100), Vector2(vx, -760.0 - absf(spread) * 80.0), 1.0, 0.8)
		q.velocity = Vector2(vx, -760.0 - absf(spread) * 80.0)
		q.color = Color("e8d9c0")
	squash(Vector2(1.2, 0.85))


func _acorn_rain(count: int) -> void:
	for i in count:
		var a := Projectile.new()
		a.velocity = Vector2(randf_range(-40, 40), randf_range(60, 200))
		a.gravity_scale = 0.4
		a.color = Color("b5733c")
		a.position = position + Vector2(randf_range(-650, 650), -700.0 - randf_range(0, 300))
		get_parent().add_child.call_deferred(a)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return asleep or st != St.DAZED or stun_timer <= 0.0


func _on_stomped(by: Player) -> void:
	if st == St.DAZED and stun_timer > 0.0:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	super(by, kind, Vector2.ZERO)
	if not dead:
		# Shakes it off: back on his feet, a bit angrier.
		stun_timer = 0.0
		st = St.WALK
		_timer = 0.9
		velocity.y = -380.0
	_send_health()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	EventBus.screen_shake.emit(0.9)
	for m in _squires:
		if is_instance_valid(m) and not m.dead:
			m.die(null, HitKind.HAZARD, Vector2(0, -300))
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var ph := phase()
	var tint := SPINES.lerp(ANGRY, 0.35 * (ph - 1) / 2.0)
	if st in [St.CURL, St.ROLL]:
		_draw_ball(ci, tint)
		return
	if st == St.DAZED:
		_draw_on_back(ci, tint)
		return
	var walk := anim_time * 6.0
	var step := sin(walk) * 10.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	Enemy.draw_foot(ci, Vector2(-30 + step, -6), tint.darkened(0.4))
	Enemy.draw_foot(ci, Vector2(34 - step, -6), tint.darkened(0.3))
	Enemy.draw_foot(ci, Vector2(-8 - step, -6), tint.darkened(0.35))
	# Great spiky back.
	var back := PackedVector2Array()
	var n := 20
	for i in n + 1:
		var a := PI + PI * float(i) / n
		var r := 76.0 if i % 2 == 0 else 58.0
		var sh := 1.0 if st != St.VOLLEY else 1.0 + sin(anim_time * 50.0) * 0.04
		back.append(Vector2(-10, -18) + Vector2(cos(a) * r * sh, sin(a) * r * 0.95 * sh))
	back.append(Vector2(56, -18))
	Art.shape(ci, back, tint, OUTLINE, 3.5)
	for i in 6:  # highlight streaks on the quills
		var a := PI * 1.1 + i * 0.28
		ci.draw_line(Vector2(-10, -18) + Vector2(cos(a), sin(a)) * 30.0, Vector2(-10, -18) + Vector2(cos(a), sin(a)) * 62.0, SPINES_LIGHT.lerp(tint, 0.3), 3.0)
	# Face + snout.
	var face := PackedVector2Array([Vector2(30, -14), Vector2(34, -58), Vector2(56, -60), Vector2(84, -40), Vector2(78, -18)])
	Art.shape(ci, face, FACE, OUTLINE, 3.0)
	ci.draw_circle(Vector2(84, -40), 8.0, OUTLINE)
	# Knight's helmet + plume.
	Art.shape(ci, PackedVector2Array([Vector2(24, -52), Vector2(30, -84), Vector2(62, -90), Vector2(76, -66), Vector2(66, -50)]), HELM, OUTLINE, 3.0)
	ci.draw_line(Vector2(40, -60), Vector2(70, -64), OUTLINE, 3.0)  # visor slit
	Art.shape(ci, Art.ellipse(Vector2(34, -96), 10, 20, 12), PLUME, OUTLINE, 2.5)
	Enemy.draw_eye(ci, Vector2(58, -44), 6.0, Vector2(1, 0.1), 1.0)
	# Moustache (he is a Baron).
	Art.shape(ci, PackedVector2Array([Vector2(66, -30), Vector2(90, -24), Vector2(78, -32)]), SPINES.darkened(0.2), OUTLINE, 2.0)
	if st == St.VOLLEY:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-10, -150), "!", HORIZONTAL_ALIGNMENT_CENTER, -1, 40, Color("ffd23f"))
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(70 + ph2 * 30.0, -110 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(20 + ph2 * 16), Color(1, 1, 1, 1.0 - ph2))


func _draw_ball(ci: CanvasItem, tint: Color) -> void:
	var c := Vector2(0, -56)
	var shake := Vector2(randf_range(-3, 3), 0) if st == St.CURL else Vector2.ZERO
	var pts := PackedVector2Array()
	var n := 18
	for i in n * 2:
		var a := _angle + PI * float(i) / n
		var r := 60.0 if i % 2 == 0 else 44.0
		pts.append(c + shake + Vector2(cos(a), sin(a)) * r)
	Art.shape(ci, pts, tint, OUTLINE, 3.5)
	Art.shape(ci, Art.ellipse(c + shake, 38, 38, 20), tint.darkened(0.2), OUTLINE, 0.0)
	# The helmet peeking round as he tumbles.
	var hp := c + shake + Vector2(cos(_angle), sin(_angle)) * 26.0
	Art.shape(ci, Art.ellipse(hp, 16, 13, 14), HELM, OUTLINE, 2.5)
	if st == St.CURL:
		for k in 4:  # glinting spikes = the tell
			var a := anim_time * 8.0 + k * TAU / 4.0
			ci.draw_line(c + Vector2(cos(a), sin(a)) * 64.0, c + Vector2(cos(a), sin(a)) * 80.0, Color(1, 1, 0.8, 0.9), 3.0)
	else:
		for k in 3:
			ci.draw_line(Vector2(-70 - k * 10, -40 - k * 18), Vector2(-100 - k * 10, -40 - k * 18), Color(1, 1, 1, 0.6), 3.0)


func _draw_on_back(ci: CanvasItem, tint: Color) -> void:
	# Flipped over: spines down, soft belly up, legs wiggling.
	var wig := sin(anim_time * 18.0) * 6.0
	var back := PackedVector2Array()
	for i in 17:
		var a := PI * float(i) / 16.0
		var r := 70.0 if i % 2 == 0 else 54.0
		back.append(Vector2(0, -52) + Vector2(cos(a) * r, sin(a) * r * 0.8))
	Art.shape(ci, back, tint, OUTLINE, 3.5)
	Art.shape(ci, Art.ellipse(Vector2(0, -52), 58, 30, 20), BELLY, OUTLINE, 3.0)
	for x: float in [-30.0, -10.0, 14.0, 34.0]:
		ci.draw_line(Vector2(x, -74), Vector2(x + wig * (1 if int(x) % 2 else -1), -98), OUTLINE, 7.0)
		ci.draw_line(Vector2(x, -74), Vector2(x + wig * (1 if int(x) % 2 else -1), -98), tint.darkened(0.3), 4.0)
	Art.shape(ci, Art.ellipse(Vector2(58, -60), 18, 14, 14), HELM, OUTLINE, 2.5)
	ci.draw_arc(Vector2(60, -60), 5.0, 0, TAU * 0.8, 8, OUTLINE, 2.0)
	ci.draw_string(ThemeDB.fallback_font, Vector2(-80, -140), "STOMP HIM!", HORIZONTAL_ALIGNMENT_CENTER, 160, 22, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
