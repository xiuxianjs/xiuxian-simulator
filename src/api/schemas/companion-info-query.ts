export interface CompanionInfoQueryData {
  access: { canUseFifthLayerFeature: boolean; realmName: string | null };
  noCompanionMessage: string | null;
  companion: null | {
    partnerId: number;
    partnerName: string | null;
    partnerRealm: string | null;
    displayPartnerName: string;
    displayPartnerRealm: string;
    intimacy: number;
    spiritBondLevel: string;
    tongxin: number;
    oathType: 'normal' | 'advanced';
    blessingPercent: number;
    dualCultivationExp: number;
    dailyDualCultivationUsed: number;
    dailyDungeonUsed: number;
    dailyGiftUsed: number;
    companionSince: string | null;
    companionMessage: string;
    anniversaryMessage: string | null;
  };
}
