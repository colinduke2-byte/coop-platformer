extends Node
## Autoload "Vfx": all the juice. Listens to EventBus and spawns short-lived
## effects (dust, puffs, rings, sparkles, confetti) into the current level,
## requests screen shake, and runs hit-stop. Nothing gameplay-critical lives
## here: delete this autoload and the game still plays, just flatter.
## Effects are built from the same flat shapes as the characters so the look
## stays consistent (swap for painted sprites in the art pass).

const DUST := Color(1.0, 0.97, 0.9, 0.85)
const SPARK := Color("fff3a0")
const LUM_GLOW := Color("ffe45c")
const RING := Color(1, 1, 1, 0.9)
const CONFETTI: Array[Color] = [Color("ff5d8f"), Color("ffd23f"), Color("3bceac"), Color("5b8cff"), Color("b86bff")]

@export var enabled := true
@export var hit_stop_enabled := true
@export var hit_stop_scale := 0.05          ## Engine.time_scale during a hit-stop
@export var trail_interval := 0.045         ## s between dust puffs while sprinting / sliding / skidding

var _trail_timers := {}                     ## Player -> s until next trail puff
var _hit_stop_until := 0
var _layer: Node2D


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	EventBus.player_jumped.connect(_on_jumped)
	EventBus.player_wall_jumped.connect(_on_wall_jumped)
	EventBus.player_landed.connect(_on_landed)
	EventBus.player_hard_landed.connect(_on_hard_landed)
	EventBus.player_ground_pounded.connect(_on_ground_pounded)
	EventBus.player_slid.connect(_on_slid)
	EventBus.player_ledge_grabbed.connect(_on_ledge_grabbed)
	EventBus.player_head_bounced.connect(_on_head_bounced)
	EventBus.player_died.connect(_on_player_died)
	EventBus.player_revived.connect(_on_revived)
	EventBus.punch_landed.connect(_on_punch_landed)
	EventBus.enemy_defeated.connect(_on_enemy_defeated)
	EventBus.breakable_broken.connect(_on_breakable_broken)
	EventBus.lum_collected.connect(_on_lum_collected)
	EventBus.checkpoint_reached.connect(_on_checkpoint)
	EventBus.hit_stop.connect(hit_stop)
	EventBus.enemy_blocked.connect(_on_enemy_blocked)
	EventBus.enemy_spawned.connect(_on_enemy_spawned)
	EventBus.projectile_reflected.connect(_on_reflected)
	EventBus.pad_bounced.connect(_on_pad_bounced)
	EventBus.player_splashed.connect(_on_splashed)
	EventBus.cannon_fired.connect(_on_cannon_fired)
	EventBus.secret_found.connect(_on_secret_found)
	EventBus.stomp_chain.connect(_on_stomp_chain)


# --- Public ----------------------------------------------------------------------

## Freeze the action for a blink so hits land with weight. Uses real time.
func hit_stop(duration: float) -> void:
	if not hit_stop_enabled or duration <= 0.0:
		return
	var until := Time.get_ticks_msec() + int(duration * 1000.0)
	if until <= _hit_stop_until:
		return
	_hit_stop_until = until
	Engine.time_scale = hit_stop_scale
	await get_tree().create_timer(duration, true, false, true).timeout
	if Time.get_ticks_msec() >= _hit_stop_until:
		Engine.time_scale = 1.0


## Burst of round blobs flying out from `pos` in a cone around `dir`.
func puff(pos: Vector2, count: int, color := DUST, dir := Vector2.UP, spread := PI,
		dist := Vector2(20, 50), size := Vector2(5, 10), life := 0.35) -> void:
	var layer := _get_layer()
	if layer == null:
		return
	for i in count:
		var blob := _circle(randf_range(size.x, size.y), color)
		blob.position = pos
		layer.add_child(blob)
		var d := dir.rotated(randf_range(-spread * 0.5, spread * 0.5))
		var l := life * randf_range(0.75, 1.25)
		var tw := blob.create_tween().set_parallel()
		tw.tween_property(blob, ^"position", pos + d * randf_range(dist.x, dist.y), l) \
				.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(blob, ^"scale", Vector2.ZERO, l).set_ease(Tween.EASE_IN)
		tw.tween_property(blob, ^"modulate:a", 0.0, l * 0.5).set_delay(l * 0.5)
		tw.chain().tween_callback(blob.queue_free)


## Expanding outline ring (shockwaves, bubble pops, hit flashes).
func ring(pos: Vector2, radius: float, color := RING, life := 0.3, width := 5.0) -> void:
	var layer := _get_layer()
	if layer == null:
		return
	var l := Line2D.new()
	l.closed = true
	l.width = width
	l.default_color = color
	l.position = pos
	layer.add_child(l)
	# Animate the radius (not the node scale, which would fatten the line too).
	var set_r := func(r: float) -> void: l.points = _ellipse(r, r, 24)
	set_r.call(radius * 0.25)
	var tw := l.create_tween().set_parallel()
	tw.tween_method(set_r, radius * 0.25, radius, life).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.tween_property(l, ^"width", 0.5, life)
	tw.tween_property(l, ^"modulate:a", 0.0, life).set_ease(Tween.EASE_IN)
	tw.chain().tween_callback(l.queue_free)


## Little twinkling stars (pickups, sparkles).
func sparkle(pos: Vector2, count := 5, color := SPARK, dist := 40.0) -> void:
	var layer := _get_layer()
	if layer == null:
		return
	for i in count:
		var star := Polygon2D.new()
		star.polygon = _star(randf_range(5.0, 9.0))
		star.color = color
		star.position = pos
		layer.add_child(star)
		var d := Vector2.from_angle(TAU * float(i) / count + randf_range(-0.3, 0.3))
		var tw := star.create_tween().set_parallel()
		tw.tween_property(star, ^"position", pos + d * dist * randf_range(0.6, 1.1), 0.4).set_ease(Tween.EASE_OUT)
		tw.tween_property(star, ^"rotation", randf_range(-3.0, 3.0), 0.4)
		tw.tween_property(star, ^"scale", Vector2.ZERO, 0.4).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(star.queue_free)


## Colourful paper bits that flutter down (checkpoints, level end).
func confetti(pos: Vector2, count := 24) -> void:
	var layer := _get_layer()
	if layer == null:
		return
	for i in count:
		var bit := Polygon2D.new()
		bit.polygon = PackedVector2Array([Vector2(-5, -3), Vector2(5, -3), Vector2(5, 3), Vector2(-5, 3)])
		bit.color = CONFETTI[i % CONFETTI.size()]
		bit.position = pos
		bit.rotation = randf() * TAU
		layer.add_child(bit)
		var up := pos + Vector2(randf_range(-140, 140), randf_range(-200, -90))
		var down := up + Vector2(randf_range(-40, 40), randf_range(160, 260))
		var tw := bit.create_tween()
		tw.tween_property(bit, ^"position", up, 0.35).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
		tw.tween_property(bit, ^"position", down, 1.2).set_ease(Tween.EASE_IN_OUT)
		tw.parallel().tween_property(bit, ^"rotation", bit.rotation + randf_range(-12.0, 12.0), 1.2)
		tw.parallel().tween_property(bit, ^"modulate:a", 0.0, 0.4).set_delay(0.8)
		tw.tween_callback(bit.queue_free)


func shake(amount: float) -> void:
	EventBus.screen_shake.emit(amount)


# --- Continuous trails -------------------------------------------------------------

func _physics_process(delta: float) -> void:
	if not enabled:
		return
	for node in get_tree().get_nodes_in_group(&"players"):
		var p := node as Player
		if p == null or p.is_bubbled():
			continue
		var t: float = _trail_timers.get(p, 0.0) - delta
		var state := p.state_machine.current_name()
		var feet := p.global_position
		if t <= 0.0:
			t = trail_interval
			if state == &"Slide":
				puff(feet + Vector2(-p.facing * 10.0, -4.0), 2, DUST, Vector2(-p.facing, -0.6).normalized(), 0.8, Vector2(10, 30))
			elif p.is_skidding():
				puff(feet + Vector2(signf(p.velocity.x) * 14.0, -4.0), 2, DUST, Vector2(signf(p.velocity.x), -1).normalized(), 0.8, Vector2(10, 28))
			elif state == &"Ground" and p.is_sprinting() and absf(p.velocity.x) > p.tuning.max_run_speed:
				puff(feet + Vector2(-p.facing * 12.0, -4.0), 2, DUST, Vector2(-p.facing, -0.8).normalized(), 0.7, Vector2(14, 34), Vector2(5, 10))
			elif state == &"WallRun":
				puff(feet + Vector2(p.facing * 18.0, -30.0), 2, DUST, Vector2(-p.facing, 0.6).normalized(), 0.7, Vector2(10, 26), Vector2(4, 8))
			elif state == &"WallSlide" and p.velocity.y > 60.0:
				t = trail_interval * 2.0
				puff(feet + Vector2(-p.facing * 20.0, -50.0), 1, DUST, Vector2(p.facing, -0.4).normalized(), 0.6, Vector2(6, 16), Vector2(3, 6))
			else:
				t = 0.0
		_trail_timers[p] = t
	for p in _trail_timers.keys():
		if not is_instance_valid(p):
			_trail_timers.erase(p)


# --- Event reactions -------------------------------------------------------------

func _on_jumped(p: Player) -> void:
	if p.is_on_floor() or p.can_coyote_jump():
		puff(p.global_position + Vector2(0, -2), 5, DUST, Vector2.UP, PI * 0.9, Vector2(14, 30), Vector2(4, 7), 0.25)


func _on_wall_jumped(p: Player) -> void:
	var wall_side := -p.facing
	puff(p.global_position + Vector2(wall_side * 18.0, -30.0), 6, DUST, Vector2(-wall_side, 0), PI * 0.7, Vector2(14, 34), Vector2(4, 7), 0.28)


func _on_landed(p: Player) -> void:
	var feet := p.global_position + Vector2(0, -3)
	puff(feet, 3, DUST, Vector2.LEFT, 0.6, Vector2(12, 26), Vector2(4, 7), 0.25)
	puff(feet, 3, DUST, Vector2.RIGHT, 0.6, Vector2(12, 26), Vector2(4, 7), 0.25)


func _on_hard_landed(p: Player, speed: float) -> void:
	var k := clampf(speed / 1500.0, 0.5, 1.0)
	var feet := p.global_position + Vector2(0, -3)
	puff(feet, 6, DUST, Vector2.LEFT, 0.8, Vector2(20, 55) * k, Vector2(5, 10), 0.35)
	puff(feet, 6, DUST, Vector2.RIGHT, 0.8, Vector2(20, 55) * k, Vector2(5, 10), 0.35)
	shake(0.18 * k)


func _on_ground_pounded(_p: Player, pos: Vector2) -> void:
	ring(pos + Vector2(0, -4), 95.0, DUST, 0.35, 7.0)
	puff(pos + Vector2(0, -3), 9, DUST, Vector2.LEFT, 1.0, Vector2(30, 80), Vector2(6, 12), 0.45)
	puff(pos + Vector2(0, -3), 9, DUST, Vector2.RIGHT, 1.0, Vector2(30, 80), Vector2(6, 12), 0.45)
	shake(0.45)
	hit_stop(0.05)


func _on_slid(p: Player) -> void:
	puff(p.global_position + Vector2(0, -4), 5, DUST, Vector2(-p.facing, -0.5).normalized(), 0.9, Vector2(16, 40))


func _on_ledge_grabbed(p: Player) -> void:
	puff(p.global_position + Vector2(p.facing * 16.0, -p.tuning.ledge_hang_offset), 3, DUST,
			Vector2.UP, PI * 0.8, Vector2(6, 16), Vector2(3, 5), 0.2)


func _on_head_bounced(top: Player, bottom: Player) -> void:
	ring(bottom.global_position + Vector2(0, -62), 30.0, RING, 0.2, 4.0)
	sparkle(top.global_position, 4, top.player_color.lightened(0.4), 30.0)


func _on_player_died(p: Player) -> void:
	ring(p.global_position + Vector2(0, -32), 70.0, Color(0.75, 0.95, 1.0, 0.9), 0.35, 6.0)
	puff(p.global_position + Vector2(0, -32), 8, p.player_color.lightened(0.3), Vector2.UP, TAU, Vector2(30, 60), Vector2(4, 8), 0.4)
	shake(0.3)


func _on_revived(p: Player) -> void:
	ring(p.global_position + Vector2(0, -32), 80.0, Color(0.75, 0.95, 1.0, 0.95), 0.3, 6.0)
	puff(p.global_position + Vector2(0, -32), 10, Color(0.8, 0.95, 1.0, 0.9), Vector2.UP, TAU, Vector2(40, 80), Vector2(3, 7), 0.35)
	sparkle(p.global_position + Vector2(0, -32), 6, p.player_color.lightened(0.5), 55.0)


func _on_punch_landed(_p: Player, target: Node2D, power: float) -> void:
	if target == null or not is_instance_valid(target):
		return
	var at := target.global_position + Vector2(0, -24)
	ring(at, 40.0 + 40.0 * power, SPARK, 0.18, 4.0 + 3.0 * power)
	shake(0.12 + 0.3 * power)
	hit_stop(0.035 + 0.05 * power)


func _on_enemy_defeated(enemy: Node2D, _by: Player) -> void:
	if enemy == null or not is_instance_valid(enemy):
		return
	var at := enemy.global_position + Vector2(0, -24)
	puff(at, 10, Color(1, 1, 1, 0.95), Vector2.UP, TAU, Vector2(20, 55), Vector2(8, 15), 0.45)
	sparkle(at, 6, SPARK, 60.0)


func _on_breakable_broken(b: Node2D, _by: Player) -> void:
	if b == null or not is_instance_valid(b):
		return
	puff(b.global_position + Vector2(0, -30), 8, Color(0.85, 0.72, 0.55, 0.9), Vector2.UP, TAU, Vector2(20, 60), Vector2(5, 10), 0.4)
	shake(0.15)


func _on_enemy_blocked(e: Node2D, _by: Player) -> void:
	if is_instance_valid(e):
		sparkle(e.global_position + Vector2(0, -30), 4, Color("d9dde8"), 30.0)
		ring(e.global_position + Vector2(0, -30), 30.0, Color("d9dde8"), 0.15, 4.0)
		shake(0.1)


func _on_enemy_spawned(e: Node2D) -> void:
	puff(e.global_position + Vector2(0, -20), 10, Color(1, 1, 1, 0.95), Vector2.UP, TAU, Vector2(20, 50), Vector2(8, 14), 0.4)


func _on_reflected(p: Node2D, _by: Player) -> void:
	ring(p.global_position, 36.0, SPARK, 0.18, 4.0)
	hit_stop(0.05)


func _on_pad_bounced(_p: Player, pad: Node2D, pounding: bool) -> void:
	var top := pad.global_position + Vector2.UP.rotated(pad.global_rotation) * 50.0
	ring(top, 70.0 if pounding else 45.0, Color(1, 1, 1, 0.8), 0.25, 5.0)
	if pounding:
		shake(0.3)


func _on_splashed(_p: Player, pos: Vector2) -> void:
	puff(pos, 10, Color(0.75, 0.9, 1.0, 0.9), Vector2.UP, PI * 0.7, Vector2(30, 80), Vector2(4, 8), 0.45)
	ring(pos, 50.0, Color(1, 1, 1, 0.8), 0.3, 4.0)


func _on_cannon_fired(c: Node2D, _p: Player) -> void:
	var muzzle := c.global_position + Vector2.UP.rotated(c.global_rotation) * 50.0
	puff(muzzle, 10, Color(1, 1, 1, 0.9), Vector2.UP.rotated(c.global_rotation), 1.0, Vector2(30, 90), Vector2(8, 14), 0.4)
	ring(muzzle, 50.0, SPARK, 0.2, 5.0)


func _on_secret_found(s: Node2D) -> void:
	var at := s.global_position + Vector2(s.size.x * 0.5, s.size.y * 0.5) if "size" in s else s.global_position
	confetti(at, 30)
	sparkle(at, 8, LUM_GLOW, 80.0)


func _on_lum_collected(_slot: int, pos: Vector2) -> void:
	sparkle(pos, 5, LUM_GLOW, 34.0)
	ring(pos, 22.0, LUM_GLOW, 0.2, 3.0)


func _on_checkpoint(pos: Vector2) -> void:
	confetti(pos + Vector2(0, -90), 26)


# --- Helpers ------------------------------------------------------------------------

## Effects go into the current level (so they scroll with the world and die with it).
func _get_layer() -> Node2D:
	if not enabled:
		return null
	if is_instance_valid(_layer) and _layer.is_inside_tree():
		return _layer
	var host: Node = GameManager.level if is_instance_valid(GameManager.level) else get_tree().current_scene
	if host == null or not host is CanvasItem:
		return null
	_layer = Node2D.new()
	_layer.name = "VfxLayer"
	_layer.z_index = 5
	host.add_child(_layer)
	return _layer


func _circle(r: float, color: Color) -> Polygon2D:
	var p := Polygon2D.new()
	p.polygon = _ellipse(r, r, 10)
	p.color = color
	return p


static func _ellipse(rx: float, ry: float, n := 18) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in n:
		var a := TAU * float(i) / float(n)
		pts.append(Vector2(cos(a) * rx, sin(a) * ry))
	return pts


static func _star(radius: float, points := 4, inner := 0.4) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in points * 2:
		var a := -PI * 0.5 + PI * float(i) / float(points)
		var rr := radius if i % 2 == 0 else radius * inner
		pts.append(Vector2(cos(a) * rr, sin(a) * rr))
	return pts


## Floating text that pops up and drifts away (combo counters, "SECRET!"...).
func text(pos: Vector2, msg: String, color := Color.WHITE, size := 34) -> void:
	var l := Label.new()
	l.text = msg
	l.add_theme_font_size_override(&"font_size", size)
	l.add_theme_color_override(&"font_color", color)
	l.add_theme_color_override(&"font_outline_color", Color("1d1726"))
	l.add_theme_constant_override(&"outline_size", 8)
	l.z_index = 60
	l.position = pos - Vector2(size * 0.8, size * 0.6)
	l.scale = Vector2(0.4, 0.4)
	l.pivot_offset = Vector2(size * 0.8, size * 0.6)
	_layer_for_world().add_child(l)
	var tw := l.create_tween()
	tw.tween_property(l, ^"scale", Vector2.ONE * 1.15, 0.12).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	tw.tween_property(l, ^"scale", Vector2.ONE, 0.08)
	tw.tween_property(l, ^"position:y", l.position.y - 60.0, 0.6).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(l, ^"modulate:a", 0.0, 0.35).set_delay(0.3)
	tw.tween_callback(l.queue_free)


func _layer_for_world() -> Node:
	var scene := get_tree().current_scene
	return scene if scene else get_tree().root


func _on_stomp_chain(p: Player, count: int) -> void:
	var cols := [Color("ffd23f"), Color("ff9e3f"), Color("ff5d8f"), Color("c58bff"), Color("5bc8ff")]
	text(p.global_position + Vector2(0, -110), "x%d!" % count, cols[mini(count - 2, cols.size() - 1)], 30 + mini(count, 8) * 3)
	sparkle(p.global_position + Vector2(0, -20), 4 + count, SPARK, 50.0)
