shader_type canvas_item;
// Painted look for enemies and bosses: material detail texture, a touch more saturation
// so they pop against the busier backgrounds, and light from above (feet at y = 0).
uniform sampler2D detail : filter_linear, repeat_enable;
uniform float strength = 0.5;
uniform float tile = 52.0;
uniform float pop = 1.12;
varying vec2 lpos;

void vertex() {
	lpos = VERTEX;
}

void fragment() {
	float l = dot(COLOR.rgb, vec3(0.299, 0.587, 0.114));
	float mask = smoothstep(0.1, 0.24, l) * (1.0 - smoothstep(0.86, 0.95, l));
	float d = texture(detail, lpos / tile).r;
	vec3 c = COLOR.rgb * (1.0 + (d - 0.5) * strength * mask);
	c = mix(vec3(l), c, mix(1.0, pop, mask));
	float up = clamp(-lpos.y / 90.0, 0.0, 1.0);
	c *= mix(0.95, 1.07, up * mask);
	COLOR = vec4(c, COLOR.a);
}
