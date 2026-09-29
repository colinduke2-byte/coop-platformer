class_name Grunt
extends CharacterBody2D
## Basic patrolling enemy. Turns at walls and ledges. Punch it or stomp it;
## touch it any other way and you get bubbled.

@export var speed := 110.0
@export var health := 1
@export var gravity := 2400.0

var _dir := -1
var _dead := false

@onready var _ledge_ray: RayCast2D = $LedgeRay


func _ready() -> void:
	add_to_group(&"enemies")
	$Hitbox.body_entered.connect(_on_hitbox_body_entered)


func _physics_process(delta: float) -> void:
	if _dead:
		return
	velocity.y = minf(velocity.y + gravity * delta, 1200.0)
	if is_on_floor() and (is_on_wall() or not _ledge_ray.is_colliding()):
		_dir = -_dir
	_ledge_ray.position.x = 26.0 * _dir
	velocity.x = speed * _dir
	move_and_slide()
	$Visual.scale.x = -_dir


func take_hit(by: Player, knockback: Vector2) -> void:
	if _dead:
		return
	health -= 1
	velocity = knockback
	if health <= 0:
		_die(by)


func _die(by: Player) -> void:
	_dead = true
	EventBus.enemy_defeated.emit(self, by)
	$Hitbox.set_deferred(&"monitoring", false)
	set_deferred(&"collision_layer", 0)
	var tw := create_tween()
	tw.tween_property(self, ^"scale", Vector2(1.4, 0.2), 0.12)
	tw.tween_callback(queue_free)


func _on_hitbox_body_entered(body: Node2D) -> void:
	if _dead or not body is Player:
		return
	var p := body as Player
	if p.is_bubbled():
		return
	var stomping := p.velocity.y > 0.0 and p.global_position.y < global_position.y - 20.0
	if stomping:
		take_hit(p, Vector2.ZERO)
		p.bounce()
	else:
		p.hurt()
