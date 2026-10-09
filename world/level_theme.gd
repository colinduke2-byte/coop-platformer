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

@export_group("Painted look")
@export var ground_texture := ""              ## override (art/textures name, e.g. "ground_rock"); "" = by theme name
@export var texture_strength := 1.0          ## multiplier on the per-texture painted-detail strength (TEXTURE_STRENGTH)

@export_group("Decor")
@export var foliage := Color("4fb548")
@export var foliage_dark := Color("2f8a3b")
@export var flower_colors: Array[Color] = [Color("ff5d8f"), Color("ffd23f"), Color("5b8cff"), Color("ffffff")]

const DEFAULT_PATH := "res://world/themes/meadow.tres"

## Which baked texture (tools/art/bake_textures.py) paints each theme's ground.
const GROUND_TEXTURE := {
	"meadow": "earth", "breezy": "earth", "jungle": "earth", "rapids": "earth", "swamp": "earth",
	"canopy": "bark", "treetops": "bark", "shipwreck": "bark",
	"hollow": "rock", "hotspring": "rock", "thorn": "rock", "summit": "rock", "frost": "rock",
	"gondola": "rock", "avalanche": "rock", "ruins": "rock", "temple": "rock", "river": "rock",
	"sunset": "rock", "tower": "rock", "cuckoo": "rock", "octopus": "rock", "trench": "rock",
	"brass": "metal", "steam": "metal", "conveyor": "metal", "nightshift": "metal",
	"glacier": "crystal", "crystal": "crystal",
	"shore": "sand", "reef": "coral", "kelp": "coral",
	"candy": "jelly", "nebula": "nebula", "nebula_boss": "nebula",
	"carnival": "brick", "funhouse": "crystal", "bigtop": "sand",
}

static var _default: LevelTheme  # loaded lazily: a preload here would be a circular load


## Colour grade per theme: saturation, contrast, tint (multiply), shadow tint (added in the darks),
## vignette strength. Worlds share a mood; see docs/VISUAL_OVERHAUL.md (Phase 1.4).
const GRADES := {
	"meadow":  {"sat": 1.14, "con": 1.06, "tint": Color(1.03, 1.0, 0.95), "shadow": Color(0.0, 0.01, 0.03), "vig": 0.32},
	"warm":    {"sat": 1.14, "con": 1.06, "tint": Color(1.03, 1.0, 0.95), "shadow": Color(0.0, 0.01, 0.03), "vig": 0.32},
	"snow":    {"sat": 1.05, "con": 1.06, "tint": Color(0.96, 1.0, 1.06), "shadow": Color(0.0, 0.015, 0.04), "vig": 0.30},
	"jungle":  {"sat": 1.18, "con": 1.08, "tint": Color(0.97, 1.04, 0.96), "shadow": Color(0.0, 0.02, 0.01), "vig": 0.40},
	"factory": {"sat": 1.08, "con": 1.10, "tint": Color(1.06, 1.0, 0.91), "shadow": Color(0.02, 0.01, 0.0), "vig": 0.38},
	"sea":     {"sat": 1.15, "con": 1.06, "tint": Color(0.95, 1.02, 1.08), "shadow": Color(0.0, 0.01, 0.05), "vig": 0.36},
	"deep":    {"sat": 1.2, "con": 1.1, "tint": Color(0.92, 1.0, 1.1), "shadow": Color(0.0, 0.0, 0.05), "vig": 0.5},
	"night":   {"sat": 1.1, "con": 1.12, "tint": Color(0.95, 0.98, 1.08), "shadow": Color(0.01, 0.0, 0.04), "vig": 0.5},
	"nebula":  {"sat": 1.25, "con": 1.1, "tint": Color(1.02, 0.95, 1.1), "shadow": Color(0.03, 0.0, 0.05), "vig": 0.5},
	"candy":   {"sat": 1.2, "con": 1.04, "tint": Color(1.03, 0.98, 1.03), "shadow": Color(0.02, 0.0, 0.02), "vig": 0.26},
	"carnival": {"sat": 1.22, "con": 1.08, "tint": Color(1.04, 0.97, 1.04), "shadow": Color(0.03, 0.0, 0.05), "vig": 0.42},
}
const GRADE_BY_THEME := {
	"meadow": "meadow", "breezy": "meadow", "river": "warm", "thorn": "warm", "swamp": "jungle", "hollow": "night",
	"sunset": "warm", "frost": "snow", "gondola": "snow", "avalanche": "snow", "summit": "snow", "glacier": "snow",
	"hotspring": "snow", "crystal": "night", "jungle": "jungle", "canopy": "jungle", "treetops": "jungle",
	"rapids": "jungle", "ruins": "jungle", "temple": "jungle", "brass": "factory", "conveyor": "factory",
	"steam": "factory", "tower": "factory", "cuckoo": "factory", "nightshift": "night",
	"shore": "sea", "reef": "sea", "shipwreck": "sea", "kelp": "sea", "trench": "deep", "octopus": "deep",
	"nebula": "nebula", "nebula_boss": "nebula", "candy": "candy",
	"carnival": "carnival", "funhouse": "carnival", "bigtop": "carnival",
}


func grade() -> Dictionary:
	var key := resource_path.get_file().get_basename()
	return GRADES[GRADE_BY_THEME.get(key, "meadow")]


## Name of the baked ground texture for this theme ("ground_earth"...), or "bark" for log grain.
func surface_strength() -> float:
	var t := surface_texture()
	return float(TEXTURE_STRENGTH.get(t, 0.7)) * texture_strength


## How strongly each baked texture shows (busy ones are held back).
const TEXTURE_STRENGTH := {
	"ground_earth": 0.8, "ground_rock": 0.6, "ground_sand": 0.4, "ground_snow": 0.5, "ground_brick": 0.6,
	"ground_metal": 0.65, "ground_coral": 0.55, "ground_crystal": 0.5, "ground_nebula": 0.55, "bark": 0.7, "jelly": 0.45,
}


func surface_texture() -> String:
	if ground_texture != "":
		return ground_texture
	var key := resource_path.get_file().get_basename()
	var kind: String = GROUND_TEXTURE.get(key, "earth")
	return kind if kind in ["bark", "cloth", "fur", "shell", "jelly"] else "ground_" + kind


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
