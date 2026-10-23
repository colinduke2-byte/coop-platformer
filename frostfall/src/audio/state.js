// What the audio knows about where the player is, shared by music, ambience and the bus hooks.
//   place:   the map (set by GameScene via music.setPlace on every map load): { map, music, bossMusic, interior, cave, arena, outdoors, ambience }
//   region:  a data/regions.js id, from the 'weather' bus event; weather: S.weather from the same event
//   night:   the game asked for night music (GameScene.updateMusic); blood: a blood moon is up
export const place = { map: null, music: null, bossMusic: null, interior: false, cave: false, arena: false, outdoors: false, ambience: null };
export const where = { region: null, weather: 'clear', night: false, blood: false, bossKind: null };
// Hub towns (a murmur bed, plus a forge in Emberhold) and their region bed.
export const HUBS = new Set(['village', 'emberhold', 'skarnhold', 'saltmarket', 'reedwick', 'lanternglade', 'greenhollow', 'amberwell']);
