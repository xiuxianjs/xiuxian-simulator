export type VipPrivilegesQueryData = {
  found: boolean;
  name: string;
  vipLevel: number;
  totalRechargeAmount: number;
  hasMonthCard: boolean;
  pillDailyLimit: number;
  levelEligibility: { minLevel: number; unlocked: boolean; needAmount: number }[];
  checkinDoubleDays: Record<string, number[]>;
  canUseMeridian: boolean;
  canUseSoulPath: boolean;
  activeThemeConfig: string | null;
  vipPrivileges: { minLevel?: number; text: string; unlocked: boolean; needText?: string }[];
  monthCardPrivileges: { minLevel?: number; text: string; unlocked: boolean; needText?: string }[];
};
