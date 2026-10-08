shader_type canvas_item;
// Soft cloth/brush detail on a character rig. Applied to the rig root; every part uses the
// parent material. Near-white (eyes) and near-black (ink lines) are left untouched.
uniform sampler2D detail : filter_linear, repeat_enable;
uniform float strength = 0.5;
uniform float tile = 46.0;
varying vec2 lpos;

void vertex() {
	lpos = VERTEX;
}

void fragment() {
	float l = dot(COLOR.rgb, vec3(0.299, 0.587, 0.114));
	float mask = smoothstep(0.1, 0.24, l) * (1.0 - smoothstep(0.86, 0.95, l));
	float d = texture(detail, lpos / tile).r;
	COLOR.rgb *= 1.0 + (d - 0.5) * strength * mask;
}
