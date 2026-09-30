class_name Enemy
extends CharacterBody2D
## Base for every enemy. Handles: health, getting punched / stomped / pounded /
## slid into, stun with dizzy stars, hit flash, knockback, death animation,
## Lum drops, touching players (hurts them unless stunned), and helpers for
## patrolling, finding players and shooting.
##
## Make a new enemy: extend Enemy, set its defaults (body_size, health, ...)
## in _init() so the Inspector can still override them, override _setup()
## (optional, runs at the end of _ready), _behave(delta)
## (set velocity / facing each frame; gravity + move_and_slide are done for
## you) and _draw_body(ci) (draw it facing RIGHT with feet at y = 0; the base
## flips, squashes and flashes it). Optional hooks: blocks_hit(), _on_hurt(),
## _on_stomped(). Origin = feet centre. See enemies/*.gd for examples.

signal defeated(by: Player)

enum HitKind { PUNCH, STOMP, POUND, SLIDE, PROJECTILE, HAZARD }

const OUTLINE := Color("1d1726")
const EYE_WHITE := Color("fbfaf5")
const CONTACT_COOLDOWN := 0.25
const STUN_STAR := Color("fff3a0")

@export var health := 1
@export var body_size := Vector2(44, 40)    ## collision box (feet-centre origin)
@export var stompable := true               ## false = stomping it hurts you (spiky)
@export var contact_hurts := true           ## touching it (not stomping) bubbles players
@export var uses_gravity := true
@export var gravity := 2400.0
@export var stun_time := 0.6                ## s dazed after a hit that didn't kill it
@export var knockback_scale := 1.0
@export var stomp_bounce := 0.85            ## player bounce (x jump velocity) off its head
@export var lum_drop := 1                   ## Lums it spits out when defeated
@export_enum("Left:-1", "Right:1") var start_facing := -1

var facing := -1
var dead := false
var stun_timer := 0.0
var anim_time := 0.0
var hit_flash := 0.0
var visual: Node2D

var _hitbox: Area2D
var _squash := Vector2.ONE
var _contact_cd := {}  ## Player -> s


func _ready() -> void:
	add_to_group(&"enemies")
	collision_layer = 4
	collision_mask = 1
	floor_snap_length = 8.0
	facing = start_facing
	var shape := RectangleShape2D.new()
	shape.size = body_size
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -body_size.y * 0.5)
	add_child(col)
	_hitbox = Area2D.new()
	_hitbox.collision_layer = 0
	_hitbox.collision_mask = 2
	_hitbox.monitorable = false
	var hshape := RectangleShape2D.new()
	hshape.size = body_size + Vector2(8, 10)
	var hcol := CollisionShape2D.new()
	hcol.shape = hshape
	hcol.position = Vector2(0, -body_size.y * 0.5 - 3.0)
	_hitbox.add_child(hcol)
	add_child(_hitbox)
	visual = Node2D.new()
	visual.name = "Visual"
	add_child(visual)
	visual.draw.connect(_on_visual_draw)
	_setup()


# --- Overridables -------------------------------------------------------------------

func _setup() -> void:
	pass


func _behave(_delta: float) -> void:
	pass


func _draw_body(_ci: CanvasItem) -> void:
	pass


## Return true to shrug off this hit (shields, armour, spikes). Called before damage.
func blocks_hit(_by: Player, _kind: HitKind) -> bool:
	return false


## A hit landed but didn't kill it.
func _on_hurt(_by: Player, _kind: HitKind) -> void:
	pass


## Something bounced on its head (only called if stompable).
func _on_stomped(by: Player) -> void:
	damage(by, HitKind.STOMP, Vector2.ZERO)


# --- Core loop ---------------------------------------------------------------------

func _physics_process(delta: float) -> void:
	if dead:
		return
	anim_time += delta
	hit_flash = maxf(hit_flash - delta * 6.0, 0.0)
	if stun_timer > 0.0:
		stun_timer -= delta
		velocity.x = move_toward(velocity.x, 0.0, 1400.0 * delta)
	else:
		_behave(delta)
	if uses_gravity:
		velocity.y = minf(velocity.y + gravity * delta, 1400.0)
	move_and_slide()
	_check_contacts(delta)
	_squash = _squash.lerp(Vector2.ONE, clampf(12.0 * delta, 0.0, 1.0))
	visual.scale = Vector2(_squash.x * facing, _squash.y)
	var f := 1.0 + 2.5 * hit_flash
	visual.modulate = Color(f, f, f)
	View.redraw(visual)


func _check_contacts(delta: float) -> void:
	for p in _contact_cd.keys():
		_contact_cd[p] -= delta
		if _contact_cd[p] <= 0.0:
			_contact_cd.erase(p)
	for body in _hitbox.get_overlapping_bodies():
		var p := body as Player
		if p == null or p.is_bubbled() or _contact_cd.has(p) or dead:
			continue
		var state := p.state_machine.current_name()
		if state == &"GroundPound":
			continue  # the pound's own hitbox deals with us
		var above := p.global_position.y <= global_position.y - body_size.y * 0.45
		if p.velocity.y > 20.0 and above:
			_contact_cd[p] = CONTACT_COOLDOWN
			if stompable:
				p.bounce(stomp_bounce)
				_on_stomped(p)
				p.register_stomp()
			else:
				p.hurt()
			continue
		if state == &"Slide":
			continue  # the slide kick hits us through the punch area
		if contact_hurts and stun_timer <= 0.0:
			_contact_cd[p] = CONTACT_COOLDOWN
			p.hurt()


# --- Getting hit ---------------------------------------------------------------------

## Called by punches, slide kicks, ground pounds (Player.hit_with_punch_area).
func take_hit(by: Player, knockback: Vector2) -> void:
	if dead:
		return
	var kind := HitKind.HAZARD
	if by:
		match by.state_machine.current_name():
			&"GroundPound":
				kind = HitKind.POUND
			&"Slide":
				kind = HitKind.SLIDE
			_:
				kind = HitKind.PUNCH
	if blocks_hit(by, kind):
		_blocked(by)
		return
	damage(by, kind, knockback)


func damage(by: Player, kind: HitKind, knockback: Vector2) -> void:
	if dead:
		return
	var amount := 1
	if kind == HitKind.PUNCH and by and by.punch_power >= 0.95:
		amount = 2  # fully charged punches hit twice as hard
	health -= amount
	hit_flash = 1.0
	velocity = knockback * knockback_scale
	_squash = Vector2(1.3, 0.75)
	EventBus.enemy_hit.emit(self, by)
	if health <= 0:
		die(by, kind, knockback)
	else:
		stun_timer = stun_time
		_on_hurt(by, kind)


func _blocked(by: Player) -> void:
	_squash = Vector2(0.9, 1.1)
	EventBus.enemy_blocked.emit(self, by)
	if by:
		by.velocity.x = -signf(global_position.x - by.global_position.x) * 380.0
		by.control_lock_timer = maxf(by.control_lock_timer, 0.15)


func die(by: Player, kind: HitKind, knockback: Vector2) -> void:
	dead = true
	stun_timer = 0.0
	set_deferred(&"collision_layer", 0)
	_hitbox.set_deferred(&"monitoring", false)
	defeated.emit(by)
	EventBus.enemy_defeated.emit(self, by)
	_drop_lums()
	var tw := create_tween()
	if kind in [HitKind.STOMP, HitKind.POUND]:
		# Squashed flat, then gone.
		tw.tween_property(visual, ^"scale", Vector2(1.6 * facing, 0.15), 0.1)
		tw.tween_interval(0.15)
		tw.tween_property(visual, ^"modulate:a", 0.0, 0.15)
	else:
		# Knocked flying, spinning off.
		var dir := knockback.normalized() if knockback.length() > 1.0 else Vector2(0, -1)
		var to := global_position + (dir + Vector2(0, -0.6)).normalized() * 260.0
		tw.set_parallel()
		tw.tween_property(self, ^"global_position", to, 0.45).set_ease(Tween.EASE_OUT)
		tw.tween_property(visual, ^"rotation", 8.0 * signf(dir.x if dir.x != 0.0 else 1.0), 0.45)
		tw.tween_property(visual, ^"modulate:a", 0.0, 0.25).set_delay(0.2)
		tw.chain()
	tw.tween_callback(queue_free)


func _drop_lums() -> void:
	var parent := get_parent()
	if parent == null:
		return
	for i in lum_drop:
		var lum: Node2D = preload("res://collectibles/lum.tscn").instantiate()
		var a := lerpf(-2.3, -0.8, float(i) / maxf(lum_drop - 1, 1)) if lum_drop > 1 else -PI * 0.5
		lum.position = position + Vector2(0, -body_size.y * 0.5) + Vector2(cos(a), sin(a)) * 40.0
		parent.add_child.call_deferred(lum)


func is_stunned() -> bool:
	return stun_timer > 0.0


# --- Helpers for behaviours -----------------------------------------------------------

## Closest living player within `max_dist` (and `max_dy` vertically), or null.
func nearest_player(max_dist := 99999.0, max_dy := 99999.0) -> Player:
	var best: Player = null
	var best_d := max_dist
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_bubbled():
			continue
		var d := p.global_position.distance_to(global_position)
		if d < best_d and absf(p.global_position.y - global_position.y) <= max_dy:
			best = p
			best_d = d
	return best


## Is there floor just ahead of our front foot?
func floor_ahead(dir := facing) -> bool:
	var q := PhysicsPointQueryParameters2D.new()
	q.position = global_position + Vector2(dir * (body_size.x * 0.5 + 6.0), 10.0)
	q.collision_mask = 1
	return not get_world_2d().direct_space_state.intersect_point(q, 1).is_empty()


func wall_ahead(dir := facing) -> bool:
	return test_move(global_transform, Vector2(dir * 4.0, -2.0))


## Walk back and forth, turning at walls and ledges.
func patrol(speed: float) -> void:
	if is_on_floor() and (wall_ahead() or not floor_ahead()):
		facing = -facing
	velocity.x = facing * speed


func face(target: Node2D) -> void:
	if target:
		facing = 1 if target.global_position.x > global_position.x else -1


## Fire a Projectile from `offset` (local, facing right) toward `dir`.
func shoot(offset: Vector2, dir: Vector2, speed := 380.0, gravity_scale := 0.0) -> Projectile:
	var p := Projectile.new()
	p.velocity = dir.normalized() * speed
	p.gravity_scale = gravity_scale
	p.shooter = self
	p.position = position + Vector2(offset.x * facing, offset.y)
	get_parent().add_child(p)
	EventBus.enemy_shot.emit(self)
	return p


func squash(amount: Vector2) -> void:
	_squash = amount


# --- Drawing ----------------------------------------------------------------------------

func _on_visual_draw() -> void:
	_draw_body(visual)
	if stun_timer > 0.0 and not dead:
		# Dizzy stars orbiting over its head.
		var top := -body_size.y - 12.0
		for i in 3:
			var a := anim_time * 6.0 + TAU * float(i) / 3.0
			var c := Vector2(cos(a) * 18.0, top + sin(a) * 5.0)
			Art.shape(visual, Art.star(c, 6.0), STUN_STAR, OUTLINE, 1.5)


## Shared eye: white + pupil looking along `look`, optional angry brow.
static func draw_eye(ci: CanvasItem, c: Vector2, r: float, look := Vector2(1, 0), brow := 0.0, closed := false) -> void:
	if closed:
		ci.draw_line(c + Vector2(-r, 0), c + Vector2(r, 0), OUTLINE, 2.5)
		return
	Art.shape(ci, Art.ellipse(c, r, r * 1.15, 14), EYE_WHITE, OUTLINE, 2.0)
	ci.draw_circle(c + look.limit_length(1.0) * r * 0.4, r * 0.5, OUTLINE)
	if brow != 0.0:
		ci.draw_line(c + Vector2(-r * 1.1, -r * 1.3 - brow * 3.0), c + Vector2(r * 1.1, -r * 1.3 + brow * 3.0), OUTLINE, 3.0)


static func draw_foot(ci: CanvasItem, c: Vector2, color: Color) -> void:
	Art.shape(ci, Art.ellipse(c, 8.0, 5.0, 12), color, OUTLINE, 2.0)
