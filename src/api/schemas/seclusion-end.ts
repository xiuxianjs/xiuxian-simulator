import type { TreasureEffectNotice } from '../bot/treasure-effects';

export type SeclusionEndData = {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  interrupted: boolean;
  spiritRefunded: boolean;
  penaltyApplied: boolean;
  settledHours: number;
  creditedExperience?: number;
  refundedSpirit?: number;
  materialProgressPercent?: number;
  gatheredMaterialCount?: number;
  presenceText?: string;
  view: {
    kind: 'refunded' | 'interrupted' | 'completed';
    title: string;
    introText: string;
    penaltyText: string;
    expBonusText: string;
    pillCount: number;
    rareDropTypeCount: number;
    rareDropTotalCount: number;
    showHuanHunDan: boolean;
    showYangShenDan: boolean;
    showRareDrops: boolean;
  };
  rewards?: {
    experience: number;
    spiritStone: number;
    huanHunDan: number;
    yangShenDan: number;
    soulDew: number;
    rareDrops: Array<{ name: string; quantity: number }>;
  };
};
