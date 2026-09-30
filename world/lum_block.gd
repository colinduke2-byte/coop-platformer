@tool
class_name LumBlock
extends AnimatableBody2D
## Floating block with Lums inside: bump it from below (jump into it) or punch
## it to pop one out. Goes dull when empty. Solid - you can stand on it.
## Origin = top-left; 64 x 64.

const SIZE := 64.0

@export var lums := 5:
	set(v):
		lums = v
		queue_redraw()

var _bump := 0.0
var _cd := 0.0


func _ready() -> void:
	collision_layer = 1 | 4   # solid + punchable
	collision_mask = 0
	sync_to_physics = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(SIZE, SIZE)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(SIZE, SIZE) * 0.5
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func take_hit(by: Player, _knockback: Vector2) -> void:
	_pop(by)


func _physics_process(delta: float) -> void:
	_bump = maxf(_bump - delta * 5.0, 0.0)
	_cd = maxf(_cd - delta, 0.0)
	View.redraw(self)
	if Engine.is_editor_hint():
		return
	# Head bumps: a player moving up whose head just hit our underside.
	for n in get_tree().get_nodes_in_group(&"players"):
		var p := n as Player
		if p.is_on_ceiling() and p.speed_before_move.y < 0.0:
			var head := p.global_position + Vector2(0, -Player.BODY_SIZE.y)
			if absf(head.y - (global_position.y + SIZE)) < 8.0 and head.x > global_position.x - 10.0 and head.x < global_position.x + SIZE + 10.0:
				_pop(p)


func _pop(by: Player) -> void:
	if _cd > 0.0:
		return
	_cd = 0.15
	_bump = 1.0
	if lums <= 0:
		EventBus.enemy_blocked.emit(self, by)
		return
	lums -= 1
	var lum: Node2D = preload("res://collectibles/lum.tscn").instantiate()
	lum.position = position + Vector2(SIZE * 0.5, -30)
	get_parent().add_child(lum)
	Audio.play("lum", -6.0, 1.3, 0.0)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var off := Vector2(0, -8.0 * _bump)
	var full := lums > 0
	var c := th.accent if full else th.ground.lerp(Color.GRAY, 0.4)
	Art.shape(self, Art.rounded_rect(off, off + Vector2(SIZE, SIZE), 8.0), c, o, 4.0)
	draw_rect(Rect2(off + Vector2(6, 6), Vector2(SIZE - 12, 6)), c.lightened(0.3))
	if full:
		draw_circle(off + Vector2(SIZE, SIZE) * 0.5, 13.0, o)
		draw_circle(off + Vector2(SIZE, SIZE) * 0.5, 10.0, Color("ffe45c"))
		draw_circle(off + Vector2(SIZE * 0.5 - 3, SIZE * 0.5 - 3), 3.5, Color.WHITE)
	for p: Vector2 in [Vector2(8, 8), Vector2(SIZE - 8, 8), Vector2(8, SIZE - 8), Vector2(SIZE - 8, SIZE - 8)]:
		draw_circle(off + p, 3.0, c.darkened(0.35))
