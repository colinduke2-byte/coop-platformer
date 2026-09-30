@tool
class_name Door
extends Area2D
## Round dream door. Stand in front and press UP to go through: EVERYONE is
## whisked to the `target` door (co-op stays together on one screen).
## Great for shortcuts, secret rooms, and "inside" areas. Origin = bottom centre.

@export var target: NodePath:
	set(v):
		target = v
		queue_redraw()
@export var locked := false                 ## set_active(true) unlocks (wire a switch / key door)

const FADE := 0.25

var _busy := false
var _up_prev := {}
var _t := 0.0


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	var shape := RectangleShape2D.new()
	shape.size = Vector2(70, 120)
	var col := CollisionShape2D.new()
	col.shape = shape
	col.position = Vector2(0, -60)
	add_child(col, false, Node.INTERNAL_MODE_FRONT)


func set_active(on: bool) -> void:
	locked = not on
	queue_redraw()


func _physics_process(delta: float) -> void:
	_t += delta
	View.redraw(self)
	if Engine.is_editor_hint() or _busy or locked:
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p == null or p.is_bubbled():
			continue
		var up := p.input.up_held() and p.is_on_floor()
		if up and not _up_prev.get(p, false):
			_go()
			return
		_up_prev[p] = up


func _go() -> void:
	var dest := get_node_or_null(target) as Node2D
	if dest == null or _busy:
		return
	Net.relay_call(self, "_go")  # online: the whole team goes through, on every screen
	_busy = true
	var fade := ColorRect.new()
	fade.color = Color(0.05, 0.02, 0.1, 0.0)
	fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	var layer := CanvasLayer.new()
	layer.layer = 60
	layer.add_child(fade)
	get_tree().root.add_child(layer)
	Audio.play("swing", -2.0, 0.6)
	var tw := create_tween()
	tw.tween_property(fade, ^"color:a", 1.0, FADE)
	tw.tween_callback(func() -> void:
		var i := 0
		for p: Player in GameManager.players.values():
			if is_instance_valid(p):
				p.global_position = dest.global_position + Vector2((i - 0.5 * (GameManager.players.size() - 1)) * 40.0, -2)
				p.velocity = Vector2.ZERO
				if not p.is_bubbled():
					p.state_machine.transition_to(&"Fall")
				i += 1
		EventBus.players_teleported.emit(dest.global_position))
	tw.tween_property(fade, ^"color:a", 0.0, FADE)
	tw.tween_callback(func() -> void:
		layer.queue_free()
		_busy = false)


func _draw() -> void:
	var th := LevelTheme.find(self)
	var o := th.outline
	var pts := PackedVector2Array()
	for i in 17:
		var a := PI + PI * i / 16.0
		pts.append(Vector2(cos(a) * 42, -90 + sin(a) * 42))
	pts.append(Vector2(42, 0))
	pts.append(Vector2(-42, 0))
	Art.shape(self, pts, th.ledge_dark.darkened(0.2), o, 4.0)
	var inner := PackedVector2Array()
	for p in pts:
		inner.append(p * Vector2(0.8, 0.92) + Vector2(0, -2))
	Art.shape(self, inner, th.ledge, o, 2.5)
	Art.shape(self, Art.ellipse(Vector2(0, -92), 12, 12, 14), Color("fff3a0") if not locked else Color("6d7680"), o, 2.5)
	draw_circle(Vector2(22, -50), 5.0, Color("ffd23f"))
	if locked:
		Art.shape(self, Art.rounded_rect(Vector2(-14, -60), Vector2(14, -36), 3.0), Color("ffd23f"), o, 2.5)
	elif not Engine.is_editor_hint():
		var bob := sin(_t * 4.0) * 3.0
		Art.shape(self, PackedVector2Array([Vector2(-8, -150 + bob), Vector2(8, -150 + bob), Vector2(0, -138 + bob)]), Color.WHITE, o, 2.0)
	if Engine.is_editor_hint() and has_node(target):
		Art.dotted(self, PackedVector2Array([Vector2(0, -60), to_local((get_node(target) as Node2D).global_position + Vector2(0, -60))]), Color(0.6, 0.8, 1, 0.8), 18.0, 4.0)
