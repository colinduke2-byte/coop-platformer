class_name UIStyle
## Shared look for menus and HUD: chunky rounded panels, outlined text.

const INK := Color("2b2233")
const OUTLINE := Color("1d1726")
const PANEL := Color("fff6e4")
const ACCENT := Color("ff5d8f")
const GOLD := Color("ffd23f")


## A cream paper card with a hand-inked border and soft shadow (baked: tools/art/bake_textures.py).
## `fill` tints the paper (cream = unchanged); `radius`/`border` are kept for old call sites.
static func panel(fill := PANEL, _radius := 22, _border := 6) -> StyleBox:
	var paper: Texture2D = load("res://art/ui/panel_paper.png")   # (Godot caches it; no static ref to leak at exit)
	if paper == null:
		var sb := StyleBoxFlat.new()
		sb.bg_color = fill
		sb.border_color = OUTLINE
		sb.set_border_width_all(6)
		sb.set_corner_radius_all(22)
		sb.set_content_margin_all(24)
		return sb
	var st := StyleBoxTexture.new()
	st.texture = paper
	st.set_texture_margin_all(60)
	st.set_content_margin_all(34)
	st.modulate_color = Color(fill.r / PANEL.r, fill.g / PANEL.g, fill.b / PANEL.b, fill.a)
	return st


## Bold display font for titles and big numbers (Fredoka Bold).
static func bold_font() -> Font:
	return load("res://ui/fonts/Fredoka-Bold.ttf")


static func label(text: String, size: int, color := INK, outline := 0, outline_color := OUTLINE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override(&"font_size", size)
	l.add_theme_color_override(&"font_color", color)
	if size >= 34 and bold_font() != null:
		l.add_theme_font_override(&"font", bold_font())
	if outline > 0:
		l.add_theme_color_override(&"font_outline_color", outline_color)
		l.add_theme_constant_override(&"outline_size", outline)
	return l


static func fmt_time(t: float) -> String:
	return "%d:%05.2f" % [int(t) / 60, fmod(t, 60.0)]
