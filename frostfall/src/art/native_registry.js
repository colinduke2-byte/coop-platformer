// Which creatures have native-pixel art. Keyed by ENEMIES kind (not by texture: kinds share textures and differ in scale).
//   registerNative(kind, { scale, w, h, build(scene, key) })
// scale = the on-screen scale the creature has today (so size and hitbox stay the same); w x h = its texture size
// (normally round(16 * scale)); build() must create the texture `key` with the same frame names as the 16px sheet
// (see makeNativeSheet in native.js). Textures are built lazily the first time such an enemy is spawned.
const REG = new Map();
export const registerNative = (kind, spec) => { REG.set(kind, spec); };
export const unregisterNative = (kind) => { REG.delete(kind); };
export const nativeSpec = (kind) => REG.get(kind) || null;
export const nativeKey = (kind) => 'nat_' + kind;
export const nativeKinds = () => [...REG.keys()];

// Make sure the texture for `kind` exists on this scene's texture manager; returns its key (or null if not native).
export function ensureNative(scene, kind) {
  const spec = REG.get(kind);
  if (!spec) return null;
  const key = nativeKey(kind);
  if (!scene.textures.exists(key)) spec.build(scene, key);
  return key;
}
