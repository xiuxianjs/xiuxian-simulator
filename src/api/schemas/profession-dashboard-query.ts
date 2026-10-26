import type { FeatureAccess } from '../bot/tianshu-content';
/** Service-interpreted profession facts and display labels; command routing and layout remain client-owned. */
export interface ProfessionDashboardEquipment {
  typeName: string;
  equipped: boolean;
  equipmentName: string | null;
  gradeName: string | null;
}

export interface ProfessionDashboardQueryData {
  access: {
    features?: Record<string, FeatureAccess>;
    canUseProfessionAndCave: boolean;
    canJoinAlchemyGuide: boolean;
  };
  alchemy: {
    unlocked: boolean;
    title: string;
    level: number;
    exp: number;
    nextExpRequired: number | null;
    totalCrafts: number;
    learnedRecipeCount: number;
    equipments: ProfessionDashboardEquipment[];
    canAdvance: boolean;
    showSection: boolean;
    primaryAction: 'recipes' | 'continueGuide' | 'joinGuide' | 'none';
    guide: {
      active: boolean;
      step: number | null;
      expiresAt: number | null;
      stepLabel: string;
    };
  };
  lingzhi: {
    cultivatedCount?: number;
    cultivatableCount?: number;
    cultivationCostText?: string;
    unlocked: boolean;
    title: string;
    level: number;
    exp: number;
    nextExpRequired: number | null;
    dailyExpGained: number;
    dailyExpCap: number;
    maxPlots: number;
    maxFieldGrade: number;
    maxFieldGradeLabel: string;
    yieldBonus: number;
    primaryAction: 'plots' | 'joinGuide';
  };
}
