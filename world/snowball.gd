class_name Snowball
extends CharacterBody2D
## A rolling snowball (made by punching a SnowPile). It rolls along the ground
## in one direction, GROWS as it rolls, speeds up downhill, and flattens every
## enemy, crate and cracked wall in its path. It never hurts players (they
## roll straight through it). It bursts when it hits a solid wall, or melts
## after `lifetime` seconds.

@export var direction := 1.0
@export var speed := 420.0            ## px/s on the flat
@export var downhill_speed := 760.0   ## px/s on slopes going its way
@export var start_radius := 22.0
@export var max_radius := 72.0
@export var growth := 0.05            ## radius gained per px rolled
@export var lifetime := 14.0
@export var hostile := false          ## a yeti's boulder: bubbles players it rolls over (punch it back!)

var thrower: Node2D                   ## who threw it (a reflected boulder is aimed back at them)

const GRAVITY := 2000.0
const SNOW := Color("f4fbff")
const SHADE := Color("c7dcef")
const OUTLINE := Color("1b2a44")

var radius := 22.0
var _spin := 0.0
var _age := 0.0
var _shape := CircleShape2D.new()
var _area_shape := CircleShape2D.new()
var _area: Area2D
var _hit: Array[Node] = []


func _ready() -> void:
	radius = start_radius
	collision_layer = 4                 # punchable: a punch sends it rolling the other way
	collision_mask = 1
	floor_snap_length = 24.0
	var col := CollisionShape2D.new()
	col.shape = _shape
	add_child(col)
	_area = Area2D.new()
	_area.collision_layer = 0
	_area.collision_mask = 1 | 4        # cracked walls / crates (world) and enemies
	_area.monitorable = false
	var acol := CollisionShape2D.new()
	acol.shape = _area_shape
	_area.add_child(acol)
	add_child(_area)
	_resize()
	z_index = 5


func _resize() -> void:
	_shape.radius = radius
	_area_shape.radius = radius + 10.0
	for c: Node2D in [get_child(0), _area]:
		c.position = Vector2(0, -radius)
	queue_redraw()


func _physics_process(delta: float) -> void:
	_age += delta
	if _age > lifetime or global_position.y > 20000.0:
		burst()
		return
	velocity.y = minf(velocity.y + GRAVITY * delta, 1600.0)
	var target := speed
	if is_on_floor():
		var n := get_floor_normal()
		if signf(n.x) == signf(direction) and absf(n.x) > 0.15:
			target = downhill_speed
	velocity.x = move_toward(velocity.x, direction * target, 900.0 * delta)
	var before := global_position.x
	move_and_slide()
	var rolled := absf(global_position.x - before)
	_spin += rolled / maxf(radius, 1.0) * signf(direction)
	if is_on_floor() and radius < max_radius:
		radius = minf(radius + rolled * growth, max_radius)
		_resize()
	if hostile:
		var c := global_position + Vector2(0, -radius)
		for n in get_tree().get_nodes_in_group(&"players"):
			var p := n as Player
			if not p.is_bubbled() and (p.global_position + Vector2(0, -40)).distance_to(c) < radius + 26.0:
				p.hurt()
	for b in _area.get_overlapping_bodies():
		_smash(b)
	for a in _area.get_overlapping_areas():
		_smash(a)
	if is_on_wall():
		for i in get_slide_collision_count():
			var c := get_slide_collision(i).get_collider()
			if c and c.has_method(&"take_hit") and not c in _hit:
				_smash(c)
				return
		burst()
		return
	View.redraw(self)


func _smash(n: Node) -> void:
	if n == self or n in _hit or not n.has_method(&"take_hit") or n is Player or n is DreamBell or n is SnowPile \
			or n is Snowball or (hostile and n == thrower):
		return
	_hit.append(n)
	var kb := Vector2(direction * 380.0, -340.0)
	if n is Enemy:
		var e := n as Enemy
		if not e.dead:
			e.damage(null, Enemy.HitKind.PROJECTILE, kb)
			if radius >= 45.0 and not e.dead:  # a big snowball hits twice as hard
				e.damage(null, Enemy.HitKind.PROJECTILE, kb)
	elif not n is Projectile:
		n.take_hit(null, kb)
	Vfx.puff(global_position + Vector2(direction * radius, -radius), 6, SNOW, Vector2(direction, -1).normalized(), 1.2)
	EventBus.screen_shake.emit(0.12)


## Punched: roll the other way, faster - and a hostile boulder turns on its thrower.
func take_hit(by: Player, _knockback: Vector2) -> void:
	var dir := signf(global_position.x - by.global_position.x) if by else -direction
	if dir == 0.0:
		dir = -direction
	direction = dir
	velocity.x = dir * maxf(speed, 560.0) * 1.2
	speed = maxf(speed, 560.0)
	hostile = false
	_hit.clear()
	_age = 0.0
	Vfx.ring(global_position + Vector2(0, -radius), radius + 10.0, Color(1, 1, 1), 0.2, 5.0)
	EventBus.screen_shake.emit(0.15)


func burst() -> void:
	if is_queued_for_deletion():
		return
	var c := global_position + Vector2(0, -radius)
	Vfx.puff(c, 10 + int(radius / 6.0), SNOW, Vector2.UP, TAU, Vector2(radius, radius * 3.0))
	Vfx.ring(c, radius * 1.4, Color(1, 1, 1, 0.8), 0.25, 5.0)
	Audio.play("crumble", -6.0, 1.4)
	queue_free()


func _draw() -> void:
	var c := Vector2(0, -radius)
	draw_circle(c, radius + 3.0, OUTLINE)
	draw_circle(c, radius, SNOW)
	draw_circle(c + Vector2(radius * 0.18, radius * 0.22), radius * 0.72, SHADE)
	draw_circle(c + Vector2(-radius * 0.08, -radius * 0.06), radius * 0.7, SNOW)
	# Clumps that turn as it rolls.
	for i in 5:
		var a := _spin + i * TAU / 5.0
		var p := c + Vector2(cos(a), sin(a)) * radius * 0.62
		draw_circle(p, radius * 0.13, SHADE)
	draw_circle(c + Vector2(-radius * 0.35, -radius * 0.4), radius * 0.18, Color(1, 1, 1, 0.95))
