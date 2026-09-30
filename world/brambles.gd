@tool
class_name Brambles
extends Area2D
## A tangle of thorny vines. Touching it bubbles you. Any size: use it to
## line pits, wrap walls and ceilings, or fill shapes. Baked to one mesh.
## Origin = top-left, like Block.

@export var size := Vector2(256, 64):
	set(v):
		size = v
		_rebuild()
@export var seed_value := 3:
	set(v):
		seed_value = v
		_rebuild()
@export var flowers := true:                ## little pink blossoms among the thorns
	set(v):
		flowers = v
		_rebuild()

const VINE := Color("4a3a5e")
const VINE_LIGHT := Color("6f5a8a")
const THORN := Color("e6ddf2")
const BLOSSOM := Color("ff7fb0")

var _mesh: ArrayMesh
var _col: CollisionShape2D


func _ready() -> void:
	collision_layer = 32
	collision_mask = 2
	monitorable = false
	_rebuild()


func _rebuild() -> void:
	if not is_node_ready():
		return
	if _col == null:
		_col = CollisionShape2D.new()
		add_child(_col, false, Node.INTERNAL_MODE_FRONT)
	var shape := RectangleShape2D.new()
	shape.size = size - Vector2(10, 10)  # a little forgiving
	_col.shape = shape
	_col.position = size * 0.5
	_mesh = null
	queue_redraw()


func _physics_process(_delta: float) -> void:
	if Engine.is_editor_hint():
		return
	for b in get_overlapping_bodies():
		var p := b as Player
		if p and not p.is_bubbled():
			p.hurt()


func _draw() -> void:
	if _mesh == null:
		_mesh = _bake()
	draw_mesh(_mesh, null)


func _bake() -> ArrayMesh:
	var mp := MeshPainter.new()
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var o := Color("1d1726")
	# Dark mass so the tangle reads as solid.
	mp.draw_colored_polygon(Art.rounded_rect(Vector2(4, 6), size - Vector2(4, 2), minf(18.0, size.y * 0.4)), VINE.darkened(0.35))
	var vines := int(size.x * size.y / 2600.0) + 3
	var thorns: Array = []
	for v in vines:
		var p := Vector2(rng.randf_range(0, size.x), rng.randf_range(0, size.y))
		var a := rng.randf_range(0, TAU)
		var pts := PackedVector2Array()
		for i in 9:
			pts.append(p)
			a += rng.randf_range(-0.9, 0.9)
			p += Vector2(cos(a), sin(a)) * 18.0
			p = p.clamp(Vector2(2, 2), size - Vector2(2, 2))
		var col := VINE if v % 3 else VINE_LIGHT
		mp.draw_polyline(pts, o, 8.0)
		mp.draw_polyline(pts, col, 5.0)
		for i in range(1, pts.size(), 2):
			thorns.append([pts[i], (pts[i] - pts[i - 1]).normalized()])
	for th: Array in thorns:
		var at: Vector2 = th[0]
		var d: Vector2 = th[1]
		var n := d.orthogonal() * (1.0 if rng.randf() < 0.5 else -1.0)
		var tip := at + n * 12.0 + d * 4.0
		mp.draw_colored_polygon(PackedVector2Array([at - d * 4.0, tip, at + d * 4.0]), THORN)
		mp.draw_polyline(PackedVector2Array([at - d * 4.0, tip, at + d * 4.0]), o, 1.5)
	if flowers:
		for i in int(size.x / 90.0) + 1:
			var c := Vector2(rng.randf_range(12, size.x - 12), rng.randf_range(8, size.y - 8))
			for k in 5:
				var a := TAU * k / 5.0
				mp.draw_circle(c + Vector2(cos(a), sin(a)) * 5.0, 4.5, BLOSSOM)
			mp.draw_circle(c, 3.0, Color("ffe45c"))
	return mp.build()
