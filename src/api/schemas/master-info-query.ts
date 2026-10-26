export type MasterInfoDirectional = {
  interactionCount: number;
  activeDays: number;
  lastInteractionDate: string | null;
  inactiveDays: number;
  thresholdDays: number;
  canLeaveWithoutPenalty: boolean;
};
export type MasterInfoGraduation = {
  relationDays: number;
  requiredRelationDays: number;
  activeDays: number;
  requiredActiveDays: number;
  interactionCount: number;
  requiredInteractionCount: number;
  reachedGoldenCore: boolean;
  breakthroughRewarded: boolean;
  canGraduate: boolean;
  statusText: string;
};
export type MasterInfoDaily = {
  teachCount: number;
  teachLimit: number;
  blessCount: number;
  blessLimit: number;
  giftCount: number;
  giftLimit: number;
  hasAnyActionToday: boolean;
  rewardClosed: boolean;
};
export type MasterInfoRelation = {
  startedAt: string;
  interactionCount: number;
  activeDays: number;
  graduationProgress: MasterInfoGraduation;
  masterSupportProgress: MasterInfoDirectional;
  discipleResponseProgress: MasterInfoDirectional;
  dailyProgress: MasterInfoDaily;
};
export type MasterInfoHistory = {
  targetName: string | null;
  targetRealm: string | null;
  displayTargetName: string;
  displayTargetRealm: string;
  status: number;
  statusText: string;
  startedAt: string;
  finishedAt: string | null;
  displayFinishedAt: string;
};
export interface MasterInfoQueryData {
  access: { allowed: boolean; realmName: string | null };
  discipleSide:
    | null
    | (MasterInfoRelation & {
        masterName: string | null;
        masterRealm: string | null;
        displayMasterName: string;
        displayMasterRealm: string;
        blessing?: { percent: number; expireAt: string; expireAtText: string };
      });
  discipleHistory: MasterInfoHistory[];
  masterSide: null | {
    stats: {
      masterVirtueExp: number;
      masterVirtueLevel: number;
      activeDiscipleCount: number;
      totalGraduatedCount: number;
      totalAcceptedDiscipleCount: number;
      discipleCap: number;
    };
    virtueTitle: string;
    virtueProgress: { progressExp: number; progressRequired: number | null };
    titleReward?: {
      titleName: string | null;
      displayTitleName: string;
      requiredGraduatedCount: number;
      owned: boolean;
      canClaim: boolean;
    };
    disciples: Array<
      MasterInfoRelation & {
        discipleUserId: number;
        discipleName: string | null;
        discipleRealm: string | null;
        displayDiscipleName: string;
        displayDiscipleRealm: string;
      }
    >;
    history: MasterInfoHistory[];
  };
}
