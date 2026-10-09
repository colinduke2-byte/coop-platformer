class_name MadameTopsy
extends Enemy
## BOSS - MADAME TOPSY-TURVY, ringmaster of the Big Top: a tall lady in a lopsided top hat and
## mismatched boots, with a cane taller than she is. Her trick is GRAVITY.
##   - HOOPS: she flicks flaming hoops along the floor at you. Jump them (or punch one back!).
##   - LEAP: she vaults and SLAMS her cane - jump the shockwaves.
##   - TOPSY-TURN: she strides to the arena's gravity lever and WHACKS it - everything flips,
##     her included. The lurch leaves her DIZZY (stars, cane drooping): that's your window -
##     STOMP or PUNCH her. Each hit takes a pip, and she gets angrier.
##   - Phase 3: balloon clowns float in, and the hoops come in threes.
## Anyone can pull the arena's levers too - use them to get to her, or to dodge.
## Starts asleep: wake her with set_active(true) (a ZoneTrigger). `levers` = the GravityLevers
## she may use (one on the floor, one on the ceiling).

enum St { WALK, HOOPS, LEAP_WIND, LEAP, TO_LEVER, WHACK, DIZZY }

@export var asleep := true
@export var walk_speed := 100.0
@export var daze_time := 2.8
@export var boss_name := "MADAME TOPSY-TURVY"
@export var levers: Array[NodePath] = []

const COAT := Color("e8426f")
const COAT_DARK := Color("b02c52")
const SKIN := Color("ffd9b8")
const HAT := Color("2b2438")
const BAND := Color("ffd23f")
const BOOT_A := Color("5b8cff")
const BOOT_B := Color("ffd23f")
const HOOP := Color("ff9a3a")

var st := St.WALK
var _home := Vector2.INF
var _timer := 2.0
var _max_health := 6
var _since_flip := 0
var _hoops_left := 0
var _hoop_t := 0.0
var _helpers: Array[Enemy] = []
var _whacked := false


func _init() -> void:
	body_size = Vector2(64, 150)
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


## Everyone respawned (her ZoneTrigger sends false): back home, asleep, damage kept.
func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.WALK
		stun_timer = 0.0
		for m in _helpers:
			if is_instance_valid(m):
				m.queue_free()
		_helpers.clear()
		_send_health()
		return
	if on:
		_timer = 1.4
		st = St.WALK
		squash(Vector2(0.85, 1.2))
		EventBus.screen_shake.emit(0.4)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _physics_process(delta: float) -> void:
	stompable = st == St.DIZZY and stun_timer > 0.0
	if st == St.DIZZY and stun_timer <= 0.0 and not dead:
		st = St.WALK
		_timer = 0.9
		velocity.y = -260.0
		squash(Vector2(0.85, 1.2))
	super(delta)


func _behave(delta: float) -> void:
	if asleep:
		velocity.x = 0.0
		return
	var ph := phase()
	_timer -= delta
	var p := nearest_player()
	match st:
		St.WALK:
			if p:
				face(p)
			velocity.x = facing * walk_speed * (1.0 + 0.2 * (ph - 1))
			if wall_ahead():
				velocity.x = 0.0
			if _timer <= 0.0 and is_on_floor():
				_choose(ph)
		St.HOOPS:
			velocity.x = 0.0
			if _timer <= 0.0:
				_hoop_t -= delta
				if _hoop_t <= 0.0 and _hoops_left > 0:
					_throw_hoop(ph)
					_hoops_left -= 1
					_hoop_t = 0.55
				if _hoops_left <= 0:
					st = St.WALK
					_timer = randf_range(1.2, 2.0)
		St.LEAP_WIND:
			velocity.x = 0.0
			squash(Vector2(1.15, 0.85))
			if _timer <= 0.0:
				var dx := (p.global_position.x - global_position.x) if p else 0.0
				velocity = Vector2(clampf(dx * 1.1, -480.0, 480.0), -sqrt(2.0 * gravity * 430.0))
				st = St.LEAP
		St.LEAP:
			if is_on_floor() and velocity.y >= 0.0:
				_slam()
		St.TO_LEVER:
			var lv := _my_lever()
			if lv == null:
				st = St.WALK
				_timer = 0.6
				return
			var dx := lv.global_position.x - global_position.x
			facing = 1 if dx >= 0.0 else -1
			velocity.x = facing * walk_speed * 1.8
			if absf(dx) < 54.0 or wall_ahead():
				velocity.x = 0.0
				st = St.WHACK
				_timer = 0.5       # cane raised: the tell
				_whacked = false
		St.WHACK:
			velocity.x = 0.0
			if _timer <= 0.0 and not _whacked:
				_whacked = true
				var lv := _my_lever()
				if lv != null:
					lv.take_hit(null, Vector2.ZERO)
				EventBus.screen_shake.emit(0.5)
				_since_flip = 0
				# The lurch: she's dazed, and (phase 3) clowns float in.
				st = St.DIZZY
				stun_timer = daze_time
				velocity = Vector2(0.0, -200.0)
				if ph >= 3 and _helpers.size() < 2:
					_spawn_clowns()


func _choose(ph: int) -> void:
	_since_flip += 1
	var r := randf()
	if _since_flip >= 3 and _my_lever() != null:
		st = St.TO_LEVER
		_timer = 6.0
	elif r < 0.55 or ph == 1 and r < 0.7:
		st = St.HOOPS
		_timer = 0.6
		_hoops_left = 1 + ph
		_hoop_t = 0.0
		squash(Vector2(0.9, 1.15))
	elif ph >= 2:
		st = St.LEAP_WIND
		_timer = 0.5
	else:
		st = St.HOOPS
		_timer = 0.6
		_hoops_left = 2
		_hoop_t = 0.0


## The lever she may use right now: the one standing on whatever surface she is on.
func _my_lever() -> GravityLever:
	var best: GravityLever = null
	var best_d := INF
	for np in levers:
		var lv := get_node_or_null(np) as GravityLever
		if lv == null:
			continue
		var d := absf(lv.global_position.y - global_position.y)
		if d < best_d:
			best_d = d
			best = lv
	return best if best_d < 160.0 else null


func _throw_hoop(ph: int) -> void:
	var p := nearest_player()
	if p:
		face(p)
	var h := shoot(Vector2(46, -26), Vector2(facing, 0), 330.0 + 50.0 * ph, 0.0)
	h.color = HOOP
	h.lifetime = 5.0
	squash(Vector2(1.15, 0.9))


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
	_timer = randf_range(1.0, 1.6)


func _spawn_clowns() -> void:
	var home := get_parent()
	if home is DefeatTrigger:
		home = home.get_parent()
	for d: int in [-1, 1]:
		var b: Enemy = preload("res://enemies/balloonatic.tscn").instantiate()
		b.global_position = global_position + Vector2(d * 260.0, -80.0 * gdir)
		home.add_child.call_deferred(b)
		_helpers.append(b)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return asleep or st != St.DIZZY or stun_timer <= 0.0


func _on_stomped(by: Player) -> void:
	if st == St.DIZZY and stun_timer > 0.0:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	super(by, kind, Vector2.ZERO)
	if not dead:
		stun_timer = 0.0   # she shakes it off, a bit angrier
		st = St.WALK
		_timer = 0.9
		velocity.y = -300.0
	_send_health()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	EventBus.screen_shake.emit(0.9)
	for m in _helpers:
		if is_instance_valid(m) and not m.dead:
			m.die(null, HitKind.HAZARD, Vector2(0, -300))
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var ph := phase()
	var coat := COAT.lerp(Color("ff5d3f"), 0.3 * (ph - 1) / 2.0)
	var dizzy := st == St.DIZZY
	var walk := anim_time * 6.0
	var step := sin(walk) * 8.0 if is_on_floor() and absf(velocity.x) > 1.0 else 0.0
	var lean := -6.0 if dizzy else 0.0
	# Mismatched boots and long legs.
	Art.shape(ci, Art.rounded_rect(Vector2(-22 + step, -10), Vector2(-4 + step, 0), 4.0), BOOT_A, OUTLINE, 2.5)
	Art.shape(ci, Art.rounded_rect(Vector2(6 - step, -10), Vector2(24 - step, 0), 4.0), BOOT_B, OUTLINE, 2.5)
	ci.draw_line(Vector2(-13 + step, -10), Vector2(-8, -62), OUTLINE, 11.0)
	ci.draw_line(Vector2(-13 + step, -10), Vector2(-8, -62), Color("fff0dc"), 7.0)
	ci.draw_line(Vector2(15 - step, -10), Vector2(8, -62), OUTLINE, 11.0)
	ci.draw_line(Vector2(15 - step, -10), Vector2(8, -62), Color("e8426f"), 7.0)
	# Tailcoat.
	Art.shape(ci, PackedVector2Array([Vector2(-24, -58), Vector2(-30 + lean, -104), Vector2(30 + lean, -104), Vector2(26, -58), Vector2(10, -48), Vector2(-10, -48)]), coat, OUTLINE, 3.5)
	ci.draw_colored_polygon(PackedVector2Array([Vector2(-8 + lean * 0.3, -100), Vector2(8 + lean * 0.3, -100), Vector2(0, -62)]), Color("fff0dc"))
	for k in 3:
		ci.draw_circle(Vector2(lean * 0.3, -92 + k * 10.0), 2.4, BAND)
	# Head, hat and the lopsided brim.
	var hc := Vector2(lean * 1.2, -122)
	Art.shape(ci, Art.ellipse(hc, 17, 19, 18), SKIN, OUTLINE, 3.0)
	Art.shape(ci, PackedVector2Array([hc + Vector2(-24, -14), hc + Vector2(-16, -52), hc + Vector2(14, -52), hc + Vector2(26, -20)]), HAT, OUTLINE, 3.0)
	ci.draw_line(hc + Vector2(-20, -24), hc + Vector2(22, -28), BAND, 5.0)
	Enemy.draw_eye(ci, hc + Vector2(-5, -2), 4.5, Vector2(1, 0), 0.8 if not dizzy else 0.0, false)
	Enemy.draw_eye(ci, hc + Vector2(7, -2), 4.5, Vector2(1, 0), 0.8 if not dizzy else 0.0, false)
	ci.draw_arc(hc + Vector2(1, 8), 8.0, 0.2, PI - 0.2, 10, OUTLINE, 2.5)
	# The cane: raised for a whack, drooping when dizzy.
	var raise := 1.0 if st == St.WHACK else (0.1 if dizzy else 0.45)
	var hand := Vector2(34, -84)
	var tip := hand + Vector2.from_angle(lerpf(0.9, -1.2, raise)) * 78.0
	ci.draw_line(hand, tip, OUTLINE, 9.0)
	ci.draw_line(hand, tip, Color("fff0dc"), 5.0)
	Art.shape(ci, Art.ellipse(tip, 11, 11, 12), BAND, OUTLINE, 2.5)
	# Tells.
	if st == St.HOOPS and _timer > 0.0:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-8, -190), "!", HORIZONTAL_ALIGNMENT_CENTER, -1, 38, Color("ffd23f"))
	if dizzy:
		for k in 3:
			var a := anim_time * 6.0 + k * TAU / 3.0
			Art.shape(ci, Art.star(hc + Vector2(cos(a) * 24.0, -60.0 + sin(a) * 6.0), 6.0), Color("fff3a0"), OUTLINE, 1.5)
		ci.draw_string(ThemeDB.fallback_font, Vector2(-70, -200), "HIT HER!", HORIZONTAL_ALIGNMENT_CENTER, 140, 22, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(30 + ph2 * 30.0, -150 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(20 + ph2 * 16), Color(1, 1, 1, 1.0 - ph2))
