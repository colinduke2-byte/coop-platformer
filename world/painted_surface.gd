class_name PaintedSurface
extends RefCounted
## Cached ShaderMaterials for the painted-surface shader (world/shaders/painted.gdshader).
## One material per (texture, strength, tile) so thousands of pieces share state and
## still batch. Textures are baked by tools/art/bake_textures.py into art/textures/.
##   material = PaintedSurface.material(theme.surface_texture(), theme.texture_strength)

const SHADER := preload("res://world/shaders/painted.gdshader")
const DIR := "res://art/textures/"

static var _cache := {}
static var _tex := {}


static func texture(name: String) -> Texture2D:
	if not _tex.has(name):
		var path := DIR + name + ".png"
		_tex[name] = load(path) if ResourceLoader.exists(path) else null
	return _tex[name]


## A shared material for texture `name` (e.g. "ground_earth"), or null if it's missing.
static func material(name: String, strength := 0.9, tile := 384.0, drift := 0.35) -> ShaderMaterial:
	if name == "":
		return null
	var key := "%s|%.2f|%.0f|%.2f" % [name, strength, tile, drift]
	if _cache.has(key):
		return _cache[key]
	var tex := texture(name)
	if tex == null:
		return null
	var m := ShaderMaterial.new()
	m.shader = SHADER
	m.set_shader_parameter(&"detail", tex)
	m.set_shader_parameter(&"strength", strength)
	m.set_shader_parameter(&"tile", tile)
	m.set_shader_parameter(&"drift", drift)
	_cache[key] = m
	return m
