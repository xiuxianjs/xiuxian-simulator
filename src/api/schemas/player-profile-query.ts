export type PlayerProfileResource = {
  current: number;
  cap: number;
  regenIntervalMinutes: number;
};

export type PlayerProfileHomeView = {
  hasMonthCard?: boolean;
  spiritRootTitle?: string;
  realmName: string;
  experienceText: string;
  qiRecoverText: string;
  mentalRecoverText: string;
  isEarlyStarter: boolean;
};

export type PlayerProfileQueryData = {
  found: boolean;
  user: {
    id: number;
    name: string | null;
    gender: number | null;
    signature: string | null;
    experience: number;
    qiValue: number;
    mentalValue: number;
    realmId: number | null;
    createdAt: string | null;
    lastCheckInTime: string | null;
  } | null;
  realm: {
    id: number;
    name: string | null;
    level: number;
    stageLevel: number;
    experienceLimit: number | null;
  } | null;
  title: { id: number; name: string | null; theme: string | null } | null;
  themeConfig: string | null;
  foundationPrefix: string | null;
  mental: PlayerProfileResource;
  qi: PlayerProfileResource;
  access: Record<string, boolean>;
  isNewcomer: boolean;
  canStoreGreenBottle: boolean;
  absenceDays: number | null;
  combatPower: number;
  homeView: PlayerProfileHomeView | null;
};
