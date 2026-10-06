// Animation clips: which frames of a sheet make up idle / walk / windup / attack / hurt / death.
// A sheet without an entry here uses the classic naming (down0..2, up0..2, side0..2, atk<dir>0..2, hurt0).
export const ANIM_CLIPS = {
  spr_dragon: { idle: ['side0', 'side0', 'side2'], walk: ['side1', 'side2'], windup: ['side1'], attack: ['attack0'], hurt: ['hurt0'], death: ['death0'] },
};

export const hasClips = (tex) => !!ANIM_CLIPS[tex];

// The frame to show for a clip. `t` is a running animation time/phase (walk alternates frames).
export function clipFrame(tex, clip, t = 0) {
  const c = ANIM_CLIPS[tex]; if (!c) return null;
  const fr = c[clip] || c.idle;
  return fr[Math.floor(t) % fr.length];
}

// Which clip an enemy is in right now.
export function clipOf(e) {
  if (e.dead) return 'death';
  if (e.flashT > 0 || (e.stun > 0.05 && e.state !== 'recover')) return 'hurt';
  if (e.state === 'windup') return 'windup';
  if (e.state === 'attack') return 'attack';
  const sp = Math.hypot(e.body.velocity.x, e.body.velocity.y);
  return sp > 6 ? 'walk' : 'idle';
}
