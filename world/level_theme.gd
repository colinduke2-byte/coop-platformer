@tool
class_name LevelTheme
extends Resource
## Palette for a level (or a section). Blocks, platforms and toys look up the
## nearest ancestor with a `level_theme` property (normally the Level root) via
## LevelTheme.find(), so re-colouring a whole level is one Inspector change.
## Make new themes by duplicating a .tres in world/themes/.

@export_group("Ground")
@export var ground := Color("7a4e2d")        ## earth / rock body
@export var ground_dark := Color("5c3a22")   ## bands, cracks, shading
@export var top := Color("5cc94f")           ## grass / snow / moss lip
@export var top_dark := Color("3e9c3a")
@export var outline := Color("2b1d17")
@export var pattern := 1                     ## 0 none, 1 pebbles, 2 bricks, 3 stripes

@export_group("Platforms")
@export var ledge := Color("c98a4b")         ## one-way ledges, moving platforms
@export var ledge_dark := Color("9a6533")
@export var accent := Color("ff5d8f")        ## pads, switches, highlights
@export var accent_dark := Color("c93a69")

@export_group("Sky")
@export var sky_top := Color("5ab8f0")
@export var sky_bottom := Color("c9f0ff")
@export var far_hills := Color("8fc9d8")
@export var near_hills := Color("6fbf8e")
@export var cloud := Color(1, 1, 1, 0.9)
@export var sun := Color("fff3b0")

@export_group("Music")
@export var music: AudioStream               ## loops while a level with this theme plays

@export_group("Decor")
@export var foliage := Color("4fb548")
@export var foliage_dark := Color("2f8a3b")
@export var flower_colors: Array[Color] = [Color("ff5d8f"), Color("ffd23f"), Color("5b8cff"), Color("ffffff")]

const DEFAULT_PATH := "res://world/themes/meadow.tres"

static var _default: LevelTheme  # loaded lazily: a preload here would be a circular load


static func default_theme() -> LevelTheme:
	if _default == null:
		_default = load(DEFAULT_PATH) as LevelTheme
		if _default == null:
			_default = LevelTheme.new()
	return _default


## The theme that applies to `node`: nearest ancestor (or the edited scene
## root in the editor) with a non-null `level_theme`, else the meadow default.
static func find(node: Node) -> LevelTheme:
	var n := node
	while n != null:
		var t: Variant = n.get(&"level_theme")
		if t is LevelTheme:
			return t
		n = n.get_parent()
	if node.is_inside_tree() and Engine.is_editor_hint():
		var root := node.get_tree().edited_scene_root
		if root:
			var t: Variant = root.get(&"level_theme")
			if t is LevelTheme:
				return t
	return default_theme()
