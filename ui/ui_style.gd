class_name UIStyle
## Shared look for menus and HUD: chunky rounded panels, outlined text.

const INK := Color("2b2233")
const OUTLINE := Color("1d1726")
const PANEL := Color("fff6e4")
const ACCENT := Color("ff5d8f")
const GOLD := Color("ffd23f")


static func panel(fill := PANEL, radius := 22, border := 6) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = OUTLINE
	sb.set_border_width_all(border)
	sb.set_corner_radius_all(radius)
	sb.shadow_color = Color(0, 0, 0, 0.25)
	sb.shadow_size = 8
	sb.shadow_offset = Vector2(0, 6)
	sb.set_content_margin_all(24)
	return sb


static func label(text: String, size: int, color := INK, outline := 0, outline_color := OUTLINE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override(&"font_size", size)
	l.add_theme_color_override(&"font_color", color)
	if outline > 0:
		l.add_theme_color_override(&"font_outline_color", outline_color)
		l.add_theme_constant_override(&"outline_size", outline)
	return l


static func fmt_time(t: float) -> String:
	return "%d:%05.2f" % [int(t) / 60, fmod(t, 60.0)]
