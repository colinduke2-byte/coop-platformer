class_name ScreenWipe
extends CanvasLayer
## Circle-wipe scene change: a dark iris closes on the old scene (with a ring of
## little stars round its edge), the new scene loads, and the iris opens again.
## Use ScreenWipe.go(tree, path) - GameManager.goto_scene does. Headless runs
## (tests, servers) change scenes instantly.

const CLOSE_TIME := 0.32
const OPEN_TIME := 0.42
const SHADER := """
shader_type canvas_item;
uniform float radius = 1.5;
uniform vec2 center = vec2(0.5, 0.5);
uniform float aspect = 1.7778;
uniform vec4 ink : source_color = vec4(0.11, 0.09, 0.15, 1.0);
uniform vec4 rim : source_color = vec4(1.0, 0.82, 0.25, 1.0);
void fragment() {
	vec2 d = (UV - center) * vec2(aspect, 1.0);
	float dist = length(d);
	float edge = smoothstep(radius, radius + 0.004, dist);
	float band = smoothstep(radius - 0.012, radius, dist) * (1.0 - smoothstep(radius, radius + 0.03, dist));
	COLOR = mix(vec4(rim.rgb, band * step(0.001, radius)), ink, edge);
}
"""

static var _busy := false

var _rect: ColorRect
var _mat: ShaderMaterial
var _path := ""


static func go(tree: SceneTree, path: String) -> void:
	if DisplayServer.get_name() == "headless" or _busy:
		tree.change_scene_to_file.call_deferred(path)
		return
	_busy = true
	var w := ScreenWipe.new()
	w._path = path
	tree.root.add_child.call_deferred(w)


func _init() -> void:
	layer = 120
	process_mode = Node.PROCESS_MODE_ALWAYS
	_rect = ColorRect.new()
	_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_mat = ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = SHADER
	_mat.shader = sh
	_rect.material = _mat
	add_child(_rect)


func _ready() -> void:
	_run(_path)


func _run(path: String) -> void:
	var vp := get_viewport().get_visible_rect().size
	_mat.set_shader_parameter(&"aspect", vp.x / maxf(vp.y, 1.0))
	_mat.set_shader_parameter(&"center", _focus(vp))
	var tw := create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tw.tween_method(_set_r, 1.2, 0.0, CLOSE_TIME).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	await tw.finished
	get_tree().change_scene_to_file(path)
	await get_tree().process_frame
	await get_tree().process_frame
	_mat.set_shader_parameter(&"center", Vector2(0.5, 0.5))
	var tw2 := create_tween().set_pause_mode(Tween.TWEEN_PAUSE_PROCESS)
	tw2.tween_method(_set_r, 0.0, 1.2, OPEN_TIME).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	await tw2.finished
	_busy = false
	queue_free()


func _set_r(r: float) -> void:
	_mat.set_shader_parameter(&"radius", r)


## Close the iris on the first player if there is one (else the middle).
func _focus(vp: Vector2) -> Vector2:
	for p: Player in GameManager.players.values():
		if is_instance_valid(p) and p.is_inside_tree():
			var s := p.get_global_transform_with_canvas().origin + Vector2(0, -50)
			return Vector2(clampf(s.x / vp.x, 0.1, 0.9), clampf(s.y / vp.y, 0.1, 0.9))
	return Vector2(0.5, 0.5)
