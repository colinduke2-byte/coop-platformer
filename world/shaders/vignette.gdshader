shader_type canvas_item;
// Low preset: just a soft dark vignette (an alpha overlay, no screen read).
uniform float vignette = 0.35;
uniform vec3 ink = vec3(0.05, 0.03, 0.08);

void fragment() {
	vec2 q = (UV - 0.5) * vec2(1.15, 1.0);
	float v = smoothstep(0.38, 0.95, length(q));
	COLOR = vec4(ink, v * vignette);
}
