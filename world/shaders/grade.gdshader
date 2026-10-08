shader_type canvas_item;
// Per-world colour grade + vignette over the finished frame (Medium / High).
// Reads the screen, so it costs a framebuffer copy: Low uses vignette.gdshader instead.
uniform sampler2D screen : hint_screen_texture, filter_linear;
uniform float saturation = 1.1;
uniform float contrast = 1.05;
uniform vec3 tint = vec3(1.02, 1.0, 0.97);
uniform vec3 shadow_tint = vec3(0.0, 0.0, 0.0);   // added in the darks (cool shadows, warm lights)
uniform float vignette = 0.35;

void fragment() {
	vec3 c = texture(screen, SCREEN_UV).rgb;
	float l = dot(c, vec3(0.299, 0.587, 0.114));
	c = mix(vec3(l), c, saturation);
	c = (c - 0.5) * contrast + 0.5;
	c *= tint;
	c += shadow_tint * (1.0 - l);
	vec2 q = (SCREEN_UV - 0.5) * vec2(1.15, 1.0);
	float v = smoothstep(0.38, 0.95, length(q));
	c *= 1.0 - v * vignette;
	COLOR = vec4(c, 1.0);
}
