class_name Inkabella
extends Enemy
## BOSS - INKABELLA, the giant octopus of the Sunken Temple.
##   - TENTACLE SLAM: a tentacle rises over someone (its shadow on the floor is
##     the tell), then slams down - and gets STUCK in the floor for a moment.
##     STOMP or PUNCH the stuck tentacle tip: that's the only way to hurt her.
##   - INK: she spits blobs of ink that arc across the temple (punch them back -
##     a blob that hits a stuck tentacle counts) and leave ink clouds that hide things.
##   - Phase 3: two slams in a row, more ink, and the temple floods (`flood`, a Water).
## Starts asleep: wake her with set_active(true) (a ZoneTrigger).

enum St { IDLE, AIM, SLAM, STUCK, RETRACT, INK }

@export var asleep := true
@export var boss_name := "INKABELLA"
@export var stuck_time := 2.4
@export var arena_half := 560.0           ## how far either side of home she reaches
@export var flood: NodePath               ## optional Water to raise in phase 3
@export var flood_rise := 150.0

const SKIN := Color("b05ad6")
const SKIN_DARK := Color("7a3a9e")
const SUCKER := Color("ffc2ef")
const INK := Color("2a1a3a")

var st := St.IDLE
var _home := Vector2.INF
var _timer := 2.0
var _max_health := 6
var _tip := Vector2.ZERO          ## where the tentacle tip is (world)
var _target := Vector2.ZERO       ## where it will slam
var _reach := 0.0                 ## 0 curled up .. 1 slammed
var _slams_left := 0
var _flooded := false
var _hit := {}


func _init() -> void:
	body_size = Vector2(200, 170)
	health = 6
	lum_drop = 24
	stompable = false
	knockback_scale = 0.0
	stun_time = 0.0


func _setup() -> void:
	_max_health = health


func phase() -> int:
	if health > _max_health * 2 / 3:
		return 1
	if health > _max_health / 3:
		return 2
	return 3


func set_active(on: bool) -> void:
	if _home == Vector2.INF:
		_home = global_position
	asleep = not on
	if not on and not dead:
		global_position = _home
		velocity = Vector2.ZERO
		st = St.IDLE
		_reach = 0.0
		for c in get_parent().get_children():
			if (c is Projectile and c.shooter == self) or c is InkCloud:
				c.queue_free()
		_send_health()
		return
	if on:
		_timer = 1.4
		st = St.IDLE
		_send_health()
		squash(Vector2(0.8, 1.2))
		EventBus.screen_shake.emit(0.4)


func _send_health() -> void:
	EventBus.boss_changed.emit(boss_name, health, _max_health, not asleep and not dead)


## Where the tentacle grows out of her (world).
func tentacle_root() -> Vector2:
	return global_position + Vector2(facing * 70.0, -50.0)


func tip() -> Vector2:
	return _tip


func _behave(delta: float) -> void:
	if asleep:
		velocity.x = 0.0
		_tip = tentacle_root()
		return
	var ph := phase()
	_timer -= delta
	var p := nearest_player()
	match st:
		St.IDLE:
			_reach = move_toward(_reach, 0.0, delta * 3.0)
			if p:
				face(p)
				var want := clampf(p.global_position.x, _home.x - 220.0, _home.x + 220.0)
				velocity.x = clampf((want - global_position.x) * 1.5, -90.0, 90.0)
			if _timer <= 0.0 and is_on_floor():
				velocity.x = 0.0
				if randf() < 0.6 or ph >= 3:
					_slams_left = 2 if ph >= 3 else 1
					_start_aim()
				else:
					st = St.INK
					_timer = 0.5
		St.AIM:
			velocity.x = 0.0
			if p:
				_target.x = move_toward(_target.x, clampf(p.global_position.x, _home.x - arena_half, _home.x + arena_half), delta * 240.0)
			if _timer <= 0.0:
				st = St.SLAM
				_hit.clear()
		St.SLAM:
			_reach = move_toward(_reach, 1.0, delta * 4.5)
			_hurt_under_tip()
			if _reach >= 1.0:
				st = St.STUCK
				_timer = stuck_time
				EventBus.screen_shake.emit(0.35)
				Audio.play("pound", -2.0, 0.7)
		St.STUCK:
			_check_tip_hits()
			if _timer <= 0.0:
				st = St.RETRACT
		St.RETRACT:
			_reach = move_toward(_reach, 0.0, delta * 2.5)
			if _reach <= 0.0:
				_slams_left -= 1
				if _slams_left > 0:
					_start_aim()
				else:
					st = St.IDLE
					_timer = randf_range(1.0, 1.6) - 0.15 * (ph - 1)
		St.INK:
			velocity.x = 0.0
			if _timer <= 0.0:
				_spit_ink(2 + ph)
				st = St.IDLE
				_timer = randf_range(1.2, 1.8)
	# The tentacle tip: curled by her side, raised over the target, or slammed down.
	var curl := tentacle_root() + Vector2(facing * 40.0, 60.0)
	var raised := Vector2(_target.x, _home.y - 360.0)
	var down := Vector2(_target.x, _home.y - 6.0)
	if st == St.AIM:
		_tip = _tip.lerp(raised, clampf(delta * 8.0, 0.0, 1.0))
	elif st in [St.SLAM, St.STUCK]:
		_tip = raised.lerp(down, _reach)
	else:
		_tip = _tip.lerp(curl, clampf(delta * 6.0, 0.0, 1.0))
	if ph >= 3 and not _flooded:
		_flood_temple()


func _start_aim() -> void:
	st = St.AIM
	_timer = 0.75
	var p := nearest_player()
	_target = Vector2(p.global_position.x if p else global_position.x + facing * 260.0, _home.y)
	_target.x = clampf(_target.x, _home.x - arena_half, _home.x + arena_half)
	if absf(_target.x - global_position.x) < 140.0:
		_target.x = global_position.x + facing * 180.0


func _hurt_under_tip() -> void:
	for n in get_tree().get_nodes_in_group(&"players"):
		var pl := n as Player
		if pl.is_bubbled() or _hit.has(pl):
			continue
		if absf(pl.global_position.x - _tip.x) < 50.0 and pl.global_position.y > _tip.y - 20.0 and pl.global_position.y < _tip.y + 80.0:
			_hit[pl] = true
			pl.hurt()


## While a tentacle is stuck: a stomp on its tip, or a punch / slide / pound next to it, hurts her.
func _check_tip_hits() -> void:
	for n in get_tree().get_nodes_in_group(&"players"):
		var pl := n as Player
		if pl.remote or pl.is_bubbled():
			continue
		var d := pl.global_position - _tip
		if pl.velocity.y > 20.0 and absf(d.x) < 50.0 and d.y > -60.0 and d.y < 10.0:
			pl.bounce(1.1)
			pl.register_stomp()
			hit_tentacle(pl, HitKind.STOMP)
			return
		var s := pl.state_machine.current_name()
		if s in [&"Punch", &"Slide", &"GroundPound"] and absf(d.x) < 100.0 and absf(d.y + 20.0) < 70.0:
			hit_tentacle(pl, HitKind.PUNCH)
			return


func hit_tentacle(by: Player, kind: HitKind) -> void:
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
	_slams_left = 0
	squash(Vector2(1.2, 0.85))


func _spit_ink(count: int) -> void:
	var p := nearest_player()
	if p:
		face(p)
	for i in count:
		var q := Projectile.new()
		q.velocity = Vector2(facing * (220.0 + i * 110.0), -560.0 - i * 40.0)
		q.gravity_scale = 0.6
		q.color = INK
		q.lifetime = 4.0
		q.shooter = self
		q.position = position + Vector2(facing * 60.0, -140.0)
		get_parent().add_child(q)
	# An ink cloud drifts up and hides part of the temple for a few seconds.
	var cloud := InkCloud.new()
	cloud.position = position + Vector2(facing * randf_range(150.0, 420.0), -220.0)
	get_parent().add_child(cloud)
	squash(Vector2(1.15, 0.9))


func _flood_temple() -> void:
	_flooded = true
	var w := get_node_or_null(flood) as Water
	if w == null:
		return
	EventBus.screen_shake.emit(0.5)
	var start_y := w.position.y
	var start_h := w.size.y
	var tw := create_tween()
	tw.tween_method(func(f: float) -> void:
		w.position.y = start_y - flood_rise * f
		w.size = Vector2(w.size.x, start_h + flood_rise * f), 0.0, 1.0, 2.5)


func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return true  # only a stuck tentacle can be hurt


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	if kind == HitKind.PROJECTILE and st == St.STUCK:
		hit_tentacle(by, kind)  # ink punched back into the stuck tentacle counts


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	_reach = 0.0
	EventBus.screen_shake.emit(1.0)
	EventBus.boss_changed.emit(boss_name, 0, _max_health, false)
	super(by, kind, knockback)


func to_local_visual(p: Vector2) -> Vector2:
	var l := p - global_position
	return Vector2(l.x * facing, l.y)


func _draw_body(ci: CanvasItem) -> void:
	var tint := SKIN.lerp(Color("ff5d6a"), 0.3 * (phase() - 1) / 2.0)
	var bob := sin(anim_time * 2.0) * 6.0
	# Little legs curling under her.
	for k in 6:
		var x := -80.0 + k * 32.0
		var pts := PackedVector2Array()
		for i in 6:
			var t := float(i) / 5.0
			pts.append(Vector2(x + sin(anim_time * 3.0 + k + t * 3.0) * 10.0 * t, -30.0 + t * 30.0))
		ci.draw_polyline(pts, OUTLINE, 22.0)
		ci.draw_polyline(pts, tint.darkened(0.15), 16.0)
	# The big tentacle (local space: mirrored with facing).
	var root := to_local_visual(tentacle_root())
	var tip_l := to_local_visual(_tip)
	var mid := root.lerp(tip_l, 0.5) + Vector2(40, -60) * (1.0 - _reach * 0.6)
	var pts2 := PackedVector2Array()
	for i in 16:
		var t := float(i) / 15.0
		pts2.append(root.lerp(mid, t).lerp(mid.lerp(tip_l, t), t))
	ci.draw_polyline(pts2, OUTLINE, 34.0)
	ci.draw_polyline(pts2, tint, 28.0)
	for i in range(2, 15, 3):
		ci.draw_circle(pts2[i] + Vector2(0, 8), 5.0, SUCKER)
	if st == St.STUCK:
		for k in 3:  # dizzy stars over the stuck tip
			var a := anim_time * 6.0 + TAU * k / 3.0
			ci.draw_circle(tip_l + Vector2(cos(a) * 22.0, -40.0 + sin(a) * 6.0), 4.0, STUN_STAR)
	if st == St.AIM:  # the shadow on the floor is the tell
		ci.draw_colored_polygon(Art.ellipse(Vector2(tip_l.x, 0.0), 54, 10, 16), Color(0, 0, 0, 0.35))
	# Head / mantle.
	var c := Vector2(0, -110 + bob)
	Art.shape(ci, Art.ellipse(c, 100, 92, 30), tint, OUTLINE, 4.0)
	Art.shape(ci, Art.ellipse(c + Vector2(-26, -36), 34, 22, 16), tint.lightened(0.25), OUTLINE, 0.0)
	for k in 5:
		ci.draw_circle(c + Vector2(-50 + k * 22, 40 + (k % 2) * 6), 6.0, SKIN_DARK)
	var dazed := asleep
	Enemy.draw_eye(ci, c + Vector2(20, -10), 18.0, Vector2(1, 0), 0.6, dazed)
	Enemy.draw_eye(ci, c + Vector2(62, -4), 14.0, Vector2(1, 0), 0.6, dazed)
	if asleep:
		for i in 3:
			var k := fmod(anim_time * 0.6 + i / 3.0, 1.0)
			ci.draw_string(ThemeDB.fallback_font, c + Vector2(60 + k * 40, -90 - k * 60), "Z",
					HORIZONTAL_ALIGNMENT_LEFT, -1, int(20 + k * 16), Color(1, 1, 1, 1.0 - k))
	# A little crown of coral.
	for k in 3:
		var x := -30.0 + k * 30.0
		Art.shape(ci, PackedVector2Array([c + Vector2(x - 8, -86), c + Vector2(x, -118 - k % 2 * 10), c + Vector2(x + 8, -86)]), Color("ff7fa8"), OUTLINE, 2.0)


## A drifting cloud of ink that hides whatever is behind it for a few seconds.
class InkCloud extends Node2D:
	var life := 4.5
	var _t := 0.0

	func _ready() -> void:
		z_index = 40

	func _process(delta: float) -> void:
		_t += delta
		position.y -= 12.0 * delta
		if _t >= life:
			queue_free()
		queue_redraw()

	func _draw() -> void:
		var a := clampf(minf(_t * 3.0, (life - _t) * 1.5), 0.0, 1.0) * 0.9
		for k in 7:
			var o := Vector2(cos(k * 1.7) * 90.0, sin(k * 2.3) * 50.0)
			draw_circle(o, 80.0 + sin(_t * 2.0 + k) * 8.0, Color(Inkabella.INK, a))
