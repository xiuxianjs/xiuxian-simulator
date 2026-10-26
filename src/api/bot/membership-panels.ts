import { formatGameDate, formatGameTime } from '@src/utils/gameTime';
import type { RightsPanelData } from '@src/img/views/RightsPanel';
import type { PrivilegesPanelData } from '@src/img/views/PrivilegesPanel';
import type { RechargeRightsQueryData } from '../schemas/recharge-rights-query';
import type { VipPrivilegesQueryData } from '../schemas/vip-privileges-query';

export type RightsResult =
  { code: 'OK'; data: RightsPanelData; access: { canUseMeridian: boolean; canUseSoulPath: boolean } } | { code: 'INVALID_USER' | 'LOAD_FAILED' };

export type PrivilegesResult =
  { code: 'OK'; data: PrivilegesPanelData; access: { canUseMeridian: boolean; canUseSoulPath: boolean } } | { code: 'INVALID_USER' | 'LOAD_FAILED' };

function formatTheme(config: string | null): RightsPanelData['theme'] {
  if (config === null) {
    return undefined;
  }

  try {
    return JSON.parse(config) ?? undefined;
  } catch {
    return undefined;
  }
}

export function projectRightsPanel(data: RechargeRightsQueryData, avatarURL: string): RightsResult {
  const vipLevel = data.vipLevel;
  const totalRechargeAmount = data.totalRechargeAmount / 100;
  const monthCardExpire = data.monthCard.expireTime;
  const seclusionPassExpire = data.seclusionPass.expireTime;

  return {
    code: 'OK',
    access: { canUseMeridian: data.canUseMeridian, canUseSoulPath: data.canUseSoulPath },
    data: {
      avatarURL,
      theme: formatTheme(data.activeThemeConfig),
      name: data.name,
      vipLevel,
      totalRechargeAmount,
      progressText: data.progressText,
      firstRechargeTimeText: data.firstRechargeTime ? formatGameDate(data.firstRechargeTime) : '未充值',
      monthCardValid: data.monthCard.active,
      monthCardExpireText: data.monthCard.active && monthCardExpire ? formatGameTime(monthCardExpire) : '未开通或已过期',
      monthCardRemainingDays: data.monthCard.remainingDays,
      monthCardTotalDays: data.monthCard.totalDays,
      monthCardMaxDays: data.monthCard.maxDays,
      monthCardRemainingQuota: data.monthCard.remainingQuota,
      monthCardInstantRewards: data.monthCardInstantRewards,
      monthCardDailyClaimable: data.monthCard.daily.claimableCount,
      monthCardDailyClaimed: data.monthCard.daily.claimedCount,
      monthCardDailyUpcoming: data.monthCard.daily.upcomingCount,
      seclusionPassValid: data.seclusionPass.active,
      seclusionPassExpireText: data.seclusionPass.active && seclusionPassExpire ? formatGameTime(seclusionPassExpire) : '未开通或已过期',
      seclusionPassRemainingDays: data.seclusionPass.remainingDays,
      seclusionPriceText: data.seclusionPriceText,
      seclusionRewards: data.seclusionRewards
    }
  };
}

export function projectPrivilegesPanel(data: VipPrivilegesQueryData, avatarURL: string): PrivilegesResult {
  if (!data.found) {
    return { code: 'INVALID_USER' };
  }
  const { name, vipLevel, hasMonthCard } = data;
  const totalRechargeAmount = data.totalRechargeAmount / 100;
  let theme: PrivilegesPanelData['theme'];

  if (data.activeThemeConfig !== null) {
    try {
      theme = JSON.parse(data.activeThemeConfig) ?? undefined;
    } catch {
      theme = undefined;
    }
  }

  return {
    code: 'OK',
    access: { canUseMeridian: data.canUseMeridian, canUseSoulPath: data.canUseSoulPath },
    data: {
      avatarURL,
      theme,
      name,
      vipLevel,
      totalRechargeAmount,
      vipPrivileges: data.vipPrivileges,
      monthCardPrivileges: data.monthCardPrivileges,
      hasMonthCard
    }
  };
}
