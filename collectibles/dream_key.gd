@tool
class_name DreamKey
extends Area2D
## Key that follows whoever grabs it. Touch a matching KeyDoor to unlock it.
## If the carrier gets bubbled, the key drops where they were - teamwork!

@export_range(0, 3) var key_color := 0:
	set(v):
		key_color = v
		queue_redraw()

const COLORS: Array[Color] = [Color("ffd23f"), Color("ff5d8f"), Color("3bceac"), Color("5b8cff")]

var carrier: Player
var _t := 0.0
var _home := Vector2.ZERO


func _ready() -> void:
	add_to_group(&"dream_keys")
	collision_layer = 8
	collision_mask = 2
	monitorable = false
	var shape := CircleShape2D.new()
	shape.radius = 26.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	_home = global_position
	if not Engine.is_editor_hint():
		body_entered.connect(_on_body_entered)
		EventBus.player_died.connect(_on_player_died)
		EventBus.level_reset.connect(func() -> void:
			carrier = null
			global_position = _home)


func _on_body_entered(body: Node2D) -> void:
	var p := body as Player
	if carrier == null and p and not p.is_bubbled():
		carrier = p
		EventBus.key_picked.emit(self, p)
		Audio.play("gem", -6.0, 1.3, 0.0)


func _on_player_died(p: Player) -> void:
	if p == carrier:
		carrier = null  # dropped right here


func use() -> void:
	queue_free()


func _process(delta: float) -> void:
	_t += delta
	if carrier and is_instance_valid(carrier):
		var want := carrier.global_position + Vector2(-carrier.facing * 44.0, -90.0 + sin(_t * 4.0) * 6.0)
		global_position = global_position.lerp(want, clampf(10.0 * delta, 0.0, 1.0))
	View.redraw(self)


func _draw() -> void:
	var c := COLORS[key_color]
	var o := Color("1d1726")
	var bob := Vector2(0, sin(_t * 3.0) * 4.0) if carrier == null else Vector2.ZERO
	draw_circle(bob, 30.0, Color(c, 0.2))
	Art.shape(self, Art.ellipse(bob + Vector2(-10, 0), 12, 12, 16), c, o, 3.0)
	draw_circle(bob + Vector2(-10, 0), 4.0, o)
	Art.shape(self, Art.rect(bob + Vector2(0, -4), bob + Vector2(26, 4)), c, o, 3.0)
	Art.shape(self, Art.rect(bob + Vector2(16, 4), bob + Vector2(22, 12)), c, o, 2.0)
