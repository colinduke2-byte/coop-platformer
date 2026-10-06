// Tables shared by GameScene and the mixins split out of it.
import { TILE } from '../config.js';
import RimeWyrm from '../entities/RimeWyrm.js';
import { Warlord, Tidemother, AshenRoot, LongWinter, EmberDragon, Kragnar, AshenSovereign, DrownedAdmiral, HollowKing } from '../entities/Guardians.js';

export const TILE_DOOR = TILE.DOOR, TILE_FLOOR = TILE.CFLOOR;
export const BOSS_CLASS = { wyrm: RimeWyrm, warlord: Warlord, tide: Tidemother, root: AshenRoot, winter: LongWinter, dragon: EmberDragon, kragnar: Kragnar, sovereign: AshenSovereign, admiral: DrownedAdmiral, hollowking: HollowKing };
export const BOSS_FLAG = { grimfang: 'grimfangDone', wyrm: 'wyrmDead', warlord: 'warlordDead', tide: 'tideDead', root: 'rootDead', winter: 'winterDead', dragon: 'dragonDead', kragnar: 'kragnarDead', sovereign: 'sovereignDead', admiral: 'admiralDead', hollowking: 'hollowKingDead' };
