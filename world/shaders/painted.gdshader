shader_type canvas_item;
// Painted-surface look for baked terrain / blocks / props: multiplies the mesh's
// vertex colours by a tileable greyscale detail texture (art/textures, mean 0.5),
// sampled in WORLD space so neighbouring pieces continue the same brushwork,
// plus a very low-frequency warm/cool drift so big areas never look flat.
uniform sampler2D detail : filter_linear, repeat_enable;
uniform float strength = 0.9;      // how strongly the detail shows
uniform float tile = 384.0;        // world px per texture repeat
uniform float drift = 0.35;        // low-frequency brightness variation
uniform vec3 warm = vec3(0.05, 0.015, -0.04);

varying vec2 wpos;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 0.0, 1.0)).xy;
}

void fragment() {
	float d = texture(detail, wpos / tile).r;
	float big = texture(detail, wpos / (tile * 5.0) + vec2(0.37, 0.11)).r;
	vec3 c = COLOR.rgb * (1.0 + (d - 0.5) * strength) * (1.0 + (big - 0.5) * drift);
	c += (big - 0.5) * warm * COLOR.a;
	COLOR = vec4(c, COLOR.a);
}
