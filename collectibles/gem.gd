@tool
class_name DreamGem
extends Area2D
## Rare collectible: 3 per level (gem_index 0, 1, 2). Hide them well -
## secret rooms, tricky jumps, behind breakable walls. Remembered in the save;
## already-found gems show as ghostly outlines (still collectible).

@export_range(0, 2) var gem_index := 0:
	set(v):
		gem_index = v
		queue_redraw()

const COLORS: Array[Color] = [Color("ff5d8f"), Color("3bceac"), Color("5b8cff")]

var _t := 0.0
var _taken := false
var _ghost := false


func _ready() -> void:
	collision_layer = 8
	collision_mask = 2
	monitorable = false
	var shape := CircleShape2D.new()
	shape.radius = 26.0
	var col := CollisionShape2D.new()
	col.shape = shape
	add_child(col, false, Node.INTERNAL_MODE_FRONT)
	if Engine.is_editor_hint():
		return
	body_entered.connect(_on_body_entered)
	var lvl := GameManager.level
	if lvl:
		var i := LevelCatalog.index_of(lvl.scene_file_path)
		if i != -1:
			_ghost = SaveData.has_gem(LevelCatalog.LEVELS[i]["id"], gem_index)


func _process(delta: float) -> void:
	_t += delta
	View.redraw(self)


func _on_body_entered(body: Node2D) -> void:
	var p := body as Player
	if _taken or p == null or p.is_bubbled():
		return
	_taken = true
	EventBus.gem_collected.emit(gem_index, p.slot, global_position)
	Vfx.sparkle(global_position, 10, COLORS[gem_index], 70.0)
	Vfx.ring(global_position, 80.0, COLORS[gem_index], 0.4, 6.0)
	var tw := create_tween()
	tw.tween_property(self, ^"position:y", position.y - 60.0, 0.4).set_ease(Tween.EASE_OUT)
	tw.parallel().tween_property(self, ^"scale", Vector2(1.6, 1.6), 0.4)
	tw.tween_property(self, ^"modulate:a", 0.0, 0.2)
	tw.tween_callback(queue_free)


func _draw() -> void:
	var c := COLORS[gem_index]
	var bob := Vector2(0, sin(_t * 2.5) * 6.0)
	var shine := 0.5 + 0.5 * sin(_t * 4.0)
	var pts := PackedVector2Array([Vector2(0, -26), Vector2(20, -8), Vector2(0, 26), Vector2(-20, -8)])
	for i in pts.size():
		pts[i] = pts[i] * Vector2(cos(_t * 1.5), 1.0) + bob
	var a := 0.35 if _ghost else 1.0
	draw_circle(bob, 34.0, Color(c, 0.18 * a))
	Art.shape(self, pts, Color(c, a), Color(0.1, 0.07, 0.15, a), 3.0)
	draw_line(pts[3].lerp(pts[0], 0.3), pts[3].lerp(pts[2], 0.2), Color(1, 1, 1, 0.7 * shine * a), 3.0)
