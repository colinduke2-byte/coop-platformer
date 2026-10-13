class_name Archivist
extends Enemy
## BOSS - THE ARCHIVIST, the hushed keeper of the Great Library: a tall owl in a scholar's
## gown and spectacles, floating inside a ward of living script. Nothing can touch him...
## until BOTH SEAL PLATES are held down at the same moment. That is what the ECHO is for:
## record yourself onto one plate (it stands there for you), then step on the other - the
## ward shatters and he sinks to the floor, dazed. Punch or stomp him (two hits per opening).
##   - PAGES: a fan of razor pages. Punch one back!
##   - HUSH: he claps a book shut - a shockwave rolls along the floor. Jump it.
##   - ERASE (from phase 2): he wipes your echoes clean, so you must record again.
##   - Phase 3: inkblots seep in and the openings are short.
## Starts asleep: wake him with set_active(true) (a ZoneTrigger). `plates` = the two seal plates.

enum St { DRIFT, PAGES, HUSH_WIND, EXPOSED, ERASE }

@export var asleep := true
@export var boss_name := "THE ARCHIVIST"
@export var plates: Array[NodePath] = []
@export var hover_height := 190.0     ## px above the floor while warded
@export var roam := 420.0             ## px he drifts either side of home

const ROBE := Color("3b3a8a")
const ROBE_DARK := Color("27265e")
const FEATHER := Color("c9a46a")
const FEATHER_LIGHT := Color("efd9a8")
const GOLD := Color("ffd23f")
const WARD := Color("7be0ff")
const PAGE := Color("fff0cc")

var st := St.DRIFT
var _home := Vector2.INF
var _floor_y := INF
var _timer := 2.0
var _max_health := 6
var _t := 0.0
var _hits_this_opening := 0
var _openings := 0
var _helpers: Array[Enemy] = []
var _ward_flash := 0.0
var _pages_left := 0


func _init() -> void:
	body_size = Vector2(70, 110)
	health = 6
	lum_drop = 22
	stompable = false
	knockback_scale = 0.0
	stun_time = 0.0
	stomp_bounce = 1.1
	gravity = 0.0


func _setup() -> void:
	_max_health = health


func phase() -> int:
	if health > _max_health * 2 / 3:
		return 1
	if health > _max_health / 3:
		return 2
	return 3


func warded() -> bool:
	return st != St.EXPOSED


func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.DRIFT
		for m in _helpers:
			if is_instance_valid(m):
				m.queue_free()
		_helpers.clear()
		_send_health()
		return
	if on:
		_timer = 1.4
		st = St.DRIFT
		squash(Vector2(0.85, 1.2))
		EventBus.screen_shake.emit(0.4)
		_send_health()


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


func _all_plates_held() -> bool:
	if plates.is_empty():
		return false
	for np in plates:
		var pl := get_node_or_null(np) as PressurePlate
		if pl == null or not pl.on:
			return false
	return true


func _find_floor() -> void:
	var q := PhysicsRayQueryParameters2D.create(global_position, global_position + Vector2(0, 3000.0 * gdir), 1)
	var hit := get_world_2d().direct_space_state.intersect_ray(q)
	_floor_y = hit["position"].y if not hit.is_empty() else global_position.y + hover_height * gdir


func _opening_time() -> float:
	return [7.0, 6.0, 4.5][phase() - 1]


func _behave(delta: float) -> void:
	_ward_flash = maxf(_ward_flash - delta, 0.0)
	if asleep:
		velocity = Vector2.ZERO
		return
	if _home == Vector2.INF:
		_home = global_position
	if _floor_y == INF:
		_find_floor()
	_t += delta
	_timer -= delta
	var p := nearest_player()
	var ph := phase()
	var goal := Vector2(_home.x + sin(_t * 0.7) * roam, _floor_y - hover_height * float(gdir))
	match st:
		St.DRIFT:
			_steer(goal, 160.0)
			if p:
				face(p)
			if _all_plates_held():
				_open_ward()
			elif _timer <= 0.0:
				_choose(ph)
		St.PAGES:
			_steer(goal, 120.0)
			if p:
				face(p)
			if _timer <= 0.0:
				if _pages_left > 0:
					_throw_pages(ph)
					_pages_left -= 1
					_timer = 0.7
				else:
					st = St.DRIFT
					_timer = randf_range(1.2, 2.0)
		St.HUSH_WIND:
			_steer(Vector2(global_position.x, _floor_y - 60.0 * float(gdir)), 260.0)
			if _timer <= 0.0:
				_hush()
		St.ERASE:
			_steer(goal, 100.0)
			if _timer <= 0.0:
				_erase()
				st = St.DRIFT
				_timer = 1.4
		St.EXPOSED:
			# The ward is down: he sinks to the floor, dazed, and can be hit.
			var land := Vector2(global_position.x, _floor_y)
			_steer(land, 220.0)
			stun_timer = 0.0
			if _timer <= 0.0:
				_close_ward()


func _steer(goal: Vector2, speed: float) -> void:
	var d := goal - global_position
	var v := d * 3.0
	if v.length() > speed:
		v = v.normalized() * speed
	velocity = Vector2(v.x, v.y * float(gdir))   # logical y: + is towards the floor


func _choose(ph: int) -> void:
	var r := randf()
	if ph >= 2 and r < 0.28 and not get_tree().get_nodes_in_group(&"echoes").is_empty():
		st = St.ERASE
		_timer = 0.9
		_ward_flash = 0.9
	elif r < 0.62:
		st = St.PAGES
		_pages_left = 2 + ph
		_timer = 0.6
	else:
		st = St.HUSH_WIND
		_timer = 0.7
	if ph >= 3 and _helpers.size() < 2 and randf() < 0.5:
		_spawn_inkblots()


func _open_ward() -> void:
	st = St.EXPOSED
	_timer = _opening_time()
	_hits_this_opening = 0
	_ward_flash = 0.6
	EventBus.screen_shake.emit(0.45)
	Audio.play("clank", -2.0, 0.7)


func _close_ward() -> void:
	st = St.DRIFT
	_timer = 1.0
	_openings += 1
	_ward_flash = 0.6
	# Later openings: he sweeps your echoes away before you can lean on them.
	if phase() >= 3 or (phase() == 2 and _openings % 2 == 0):
		st = St.ERASE
		_timer = 0.8


func _erase() -> void:
	for g in get_tree().get_nodes_in_group(&"echoes"):
		g.queue_free()
	EventBus.screen_shake.emit(0.3)
	Audio.play("echo_release", -2.0, 0.7)


func _throw_pages(ph: int) -> void:
	var p := nearest_player()
	if p:
		face(p)
	var origin := global_position + Vector2(0, -60.0 * float(gdir))
	var aim := (p.global_position + Vector2(0, -30) - origin).normalized() if p else Vector2(facing, 0)
	for k in 1 + ph:
		var a := aim.rotated((float(k) - float(ph) * 0.5) * 0.28)
		var pr := shoot(Vector2(0, -60), a, 300.0 + 40.0 * ph, 0.0)
		pr.color = PAGE
		pr.lifetime = 4.0


func _hush() -> void:
	velocity = Vector2.ZERO
	squash(Vector2(1.3, 0.8))
	EventBus.screen_shake.emit(0.5)
	EventBus.player_ground_pounded.emit(null, Vector2(global_position.x, _floor_y))
	for d: int in [-1, 1]:
		var w := Shockwave.new()
		w.dir = d
		get_parent().add_child(w)
		w.global_position = Vector2(global_position.x + d * 36.0, _floor_y)
	st = St.DRIFT
	_timer = randf_range(1.2, 1.8)


func _spawn_inkblots() -> void:
	var home := get_parent()
	if home is DefeatTrigger:
		home = home.get_parent()
	for d: int in [-1, 1]:
		var b: Enemy = preload("res://enemies/blotty.tscn").instantiate()
		b.global_position = Vector2(global_position.x + d * 300.0, _floor_y - 4.0 * gdir)
		home.add_child.call_deferred(b)
		_helpers.append(b)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	if asleep or st != St.EXPOSED:
		_ward_flash = 0.35
		return true
	return false


func _on_stomped(by: Player) -> void:
	if st == St.EXPOSED:
		damage(by, HitKind.STOMP, Vector2.ZERO)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	super(by, kind, Vector2.ZERO)
	_hits_this_opening += 1
	_send_health()
	if not dead and _hits_this_opening >= 2:
		_close_ward()


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	EventBus.screen_shake.emit(0.9)
	for m in _helpers:
		if is_instance_valid(m) and not m.dead:
			m.die(null, HitKind.HAZARD, Vector2(0, -300))
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func _draw_body(ci: CanvasItem) -> void:
	var exposed := st == St.EXPOSED
	var bob := sin(anim_time * 2.2) * 5.0 if not exposed else 0.0
	var flap := sin(anim_time * 5.0) * 0.12
	# Gown and wings.
	for side in [-1, 1]:
		Art.shape(ci, PackedVector2Array([Vector2(side * 18, -78 + bob), Vector2(side * 62, -92 + bob + flap * 60.0), Vector2(side * 70, -40 + bob), Vector2(side * 24, -34 + bob)]), ROBE_DARK, OUTLINE, 3.0)
	Art.shape(ci, PackedVector2Array([Vector2(-26, -20 + bob), Vector2(-20, -92 + bob), Vector2(20, -92 + bob), Vector2(26, -20 + bob), Vector2(14, 0 + bob), Vector2(-14, 0 + bob)]), ROBE, OUTLINE, 3.5)
	ci.draw_colored_polygon(PackedVector2Array([Vector2(-8, -88 + bob), Vector2(8, -88 + bob), Vector2(0, -30 + bob)]), FEATHER_LIGHT)
	for k in 3:
		ci.draw_circle(Vector2(0, -78 + k * 14.0 + bob), 2.4, GOLD)
	# Owl head with spectacles.
	var hc := Vector2(0, -110 + bob)
	Art.shape(ci, Art.ellipse(hc, 26, 24, 20), FEATHER, OUTLINE, 3.5)
	Art.shape(ci, PackedVector2Array([hc + Vector2(-22, -14), hc + Vector2(-16, -36), hc + Vector2(-6, -22)]), FEATHER, OUTLINE, 2.5)
	Art.shape(ci, PackedVector2Array([hc + Vector2(22, -14), hc + Vector2(16, -36), hc + Vector2(6, -22)]), FEATHER, OUTLINE, 2.5)
	for ex: float in [-10.0, 10.0]:
		Art.shape(ci, Art.ellipse(hc + Vector2(ex, -2), 11, 11, 14), Color("fbfaf5"), GOLD, 3.0)
		Enemy.draw_eye(ci, hc + Vector2(ex, -2), 5.0, Vector2(facing, 0), 0.0, exposed)
	ci.draw_line(hc + Vector2(-1, -2), hc + Vector2(1, -2), GOLD, 3.0)
	Art.shape(ci, PackedVector2Array([hc + Vector2(-5, 8), hc + Vector2(5, 8), hc + Vector2(0, 20)]), GOLD, OUTLINE, 2.0)
	# A floating book he reads from.
	var bk := Vector2(40.0 * facing, -52.0 + bob + sin(anim_time * 3.0) * 4.0)
	Art.shape(ci, Art.rounded_rect(bk + Vector2(-16, -12), bk + Vector2(16, 12), 3.0), Color("7a3a52"), OUTLINE, 2.5)
	ci.draw_rect(Rect2(bk + Vector2(-13, -9), Vector2(26, 18)), PAGE)
	# The ward: a ring of runes joined to the seal plates.
	if not exposed and not asleep:
		var a := 0.30 + 0.5 * _ward_flash + 0.08 * sin(anim_time * 4.0)
		ci.draw_circle(Vector2(0, -60 + bob), 84.0, Color(WARD.r, WARD.g, WARD.b, a * 0.35))
		ci.draw_arc(Vector2(0, -60 + bob), 84.0, 0.0, TAU, 40, Color(WARD.r, WARD.g, WARD.b, a + 0.2), 3.5)
		for k in 8:
			var ang := anim_time * 0.8 + k * TAU / 8.0
			ci.draw_circle(Vector2(0, -60 + bob) + Vector2.from_angle(ang) * 84.0, 4.0, Color(WARD.r, WARD.g, WARD.b, 0.9))
		for np in plates:
			var pl := get_node_or_null(np) as Node2D
			if pl != null:
				var held: bool = (pl as PressurePlate).on
				var end: Vector2 = ci.to_local(pl.global_position + Vector2(0, -10))
				Art.dotted(ci, PackedVector2Array([Vector2(0, -60 + bob), end]), Color(0.5, 1.0, 0.7, 0.9) if held else Color(WARD.r, WARD.g, WARD.b, 0.5), 22.0, 3.0)
	if exposed:
		for k in 3:
			var ang := anim_time * 6.0 + k * TAU / 3.0
			Art.shape(ci, Art.star(hc + Vector2(cos(ang) * 28.0, -32.0 + sin(ang) * 6.0), 6.0), Color("fff3a0"), OUTLINE, 1.5)
		ci.draw_string(ThemeDB.fallback_font, Vector2(-70, -178), "HIT HIM!", HORIZONTAL_ALIGNMENT_CENTER, 140, 22, Color(1, 1, 1, 0.7 + 0.3 * sin(anim_time * 8.0)))
	if st == St.ERASE:
		ci.draw_string(ThemeDB.fallback_font, Vector2(-60, -170), "ERASE!", HORIZONTAL_ALIGNMENT_CENTER, 120, 26, Color("ff6b6b"))
	if asleep:
		for k in 3:
			var ph2 := fposmod(anim_time * 0.5 + k * 0.33, 1.0)
			ci.draw_string(ThemeDB.fallback_font, Vector2(30 + ph2 * 30.0, -150 - ph2 * 60.0), "Z", HORIZONTAL_ALIGNMENT_LEFT, -1, int(20 + ph2 * 16), Color(1, 1, 1, 1.0 - ph2))
