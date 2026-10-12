// Tables shared by GameScene and the mixins split out of it.
import { TILE } from '../config.js';
import RimeWyrm from '../entities/RimeWyrm.js';
import { BlightMother, VaultSovereign } from '../entities/Guardians4.js';
import { Warlord, Tidemother, AshenRoot, LongWinter, EmberDragon, Kragnar, AshenSovereign, DrownedAdmiral, HollowKing, MireMother, StormGiant, HartKing, LodeColossus, Brinegut } from '../entities/Guardians.js';

export const TILE_DOOR = TILE.DOOR, TILE_FLOOR = TILE.CFLOOR;
export const BOSS_CLASS = { wyrm: RimeWyrm, warlord: Warlord, tide: Tidemother, root: AshenRoot, winter: LongWinter, dragon: EmberDragon, kragnar: Kragnar, sovereign: AshenSovereign, admiral: DrownedAdmiral, hollowking: HollowKing, miremother: MireMother, stormgiant: StormGiant, hartking: HartKing, lodecolossus: LodeColossus, brinegut: Brinegut, blightmother: BlightMother, vaultsovereign: VaultSovereign };
export const BOSS_FLAG = { grimfang: 'grimfangDone', wyrm: 'wyrmDead', warlord: 'warlordDead', tide: 'tideDead', root: 'rootDead', winter: 'winterDead', dragon: 'dragonDead', kragnar: 'kragnarDead', sovereign: 'sovereignDead', admiral: 'admiralDead', hollowking: 'hollowKingDead', miremother: 'mireMotherDead', stormgiant: 'stormGiantDead', hartking: 'hartKingDead', lodecolossus: 'lodeColossusDead', blightmother: 'blightMotherDead', vaultsovereign: 'vaultSovereignDead', brinegut: 'brinegutDead' };
