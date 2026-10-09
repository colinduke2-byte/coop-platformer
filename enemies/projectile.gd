class_name Projectile
extends Area2D
## Enemy shot (seeds, spit, cannonballs). Bubbles players it touches, pops on
## walls. Punch it to send it back: reflected shots hurt enemies instead.

const RADIUS := 11.0

@export var velocity := Vector2(-380, 0)
@export var gravity_scale := 0.0           ## 1.0 = lobbed like a thrown thing
@export var lifetime := 4.0
@export var color := Color("9be15d")

var shooter: Node2D                        ## who fired it (reflected shots aim back at it)
var friendly := false
var _age := 0.0


func _ready() -> void:
	collision_layer = 4   # punchable
	collision_mask = 1 | 2
	var shape := CircleShape2D.new()
	shape.radius = RADIUS
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col)


func _physics_process(delta: float) -> void:
	_age += delta
	if _age > lifetime:
		queue_free()
		return
	velocity.y += 2400.0 * gravity_scale * delta * float(GameManager.gravity_dir)
	position += velocity * delta
	rotation += delta * 8.0
	for body in get_overlapping_bodies():
		if body == shooter and not friendly:
			continue
		if body is Player:
			if not friendly:
				(body as Player).hurt()
				_pop()
				return
		elif body is Enemy:
			if friendly:
				(body as Enemy).damage(null, Enemy.HitKind.PROJECTILE, velocity.normalized() * 300.0)
				_pop()
				return
		elif body is CollisionObject2D and (body as CollisionObject2D).collision_layer & 1:
			_pop()
			return
	View.redraw(self)


## Punched: fly back where it came from, twice as fast, now hurting enemies.
func take_hit(by: Player, _knockback: Vector2) -> void:
	if friendly:
		return
	friendly = true
	collision_mask = 1 | 4
	var dir := Vector2(by.facing if by else -signf(velocity.x), -0.15).normalized()
	if is_instance_valid(shooter):
		dir = (shooter.global_position + Vector2(0, -24) - global_position).normalized()
	velocity = dir * maxf(velocity.length(), 380.0) * 1.8
	gravity_scale = 0.0
	_age = 0.0
	color = Color("fff3a0")
	EventBus.projectile_reflected.emit(self, by)


func _pop() -> void:
	EventBus.breakable_broken.emit(self, null)
	queue_free()


func _draw() -> void:
	Art.shape(self, Art.ellipse(Vector2.ZERO, RADIUS, RADIUS * 0.85, 14), color, Enemy.OUTLINE, 2.5)
	draw_circle(Vector2(-3, -3), 3.0, Color(1, 1, 1, 0.7))
