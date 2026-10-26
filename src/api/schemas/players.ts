// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from './index.js';

export interface PlayersSchemas {
  PlayerSQLNullTime: { Time: string; Valid: boolean };
  PlayerRead: {
    id: number;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    bid: string;
    region: string | null;
    pid: string;
    email: string;
    name: string;
    gender: number;
    signature: string | null;
    experience: number;
    status: number;
    mentalValue: number;
    qiValue: number;
    lastCheckInTime: Schemas['PlayerSQLNullTime'];
    totalCheckInDays: number;
    realmId: number;
    spiritStone: number;
    spiritsCrystal: number;
    spiritsMilk: number;
    signInCoin: number;
    towerScore: number;
    fiveElements: string | null;
    monthCardExpireTime: Schemas['PlayerSQLNullTime'];
    monthCardStartTime: Schemas['PlayerSQLNullTime'];
    freeAttributePoints: number;
    specialSkillRule: number;
    friendRequestEnabled: number;
    vipLevel: number;
    totalRechargeAmount: number;
    firstRechargeTime: Schemas['PlayerSQLNullTime'];
    monthCardTotalDays: number;
    tongxin: number;
    reputation: number;
    shaQi: number;
    stamina: number;
    seclusionPassExpireTime: Schemas['PlayerSQLNullTime'];
    seclusionPassTotalDays: number;
    emailChangeCount: number;
    previousEmail: string | null;
    greenBottle: number;
  };
  PlayerCurrencyBalances: {
    SPIRIT_STONE: number;
    SPIRIT_CRYSTAL: number;
    SPIRIT_MILK: number;
    TONGXIN: number;
    CHECKIN_COIN: number;
    TOWER_SCORE: number;
    REPUTATION: number;
  };
}
