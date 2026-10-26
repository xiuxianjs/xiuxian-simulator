import { requestBackend } from './client';
import type {
  RechargeRightsCalendarState,
  RechargeRightsDaily,
  RechargeRightsMonthCard,
  RechargeRightsPackage,
  RechargeRightsQueryData,
  RechargeRightsReward,
  RechargeRightsSeclusionPass
} from '../schemas/recharge-rights-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('权益接口资料不完整');
  }

  return value as Record<string, unknown>;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('权益接口缺少数值');
  }

  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('权益接口缺少文本');
  }

  return value;
}

function nullableText(value: unknown): string | null {
  if (value === null) {
    return null;
  }

  return text(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null ? null : number(value);
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('权益接口缺少状态');
  }

  return value;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('权益接口缺少列表');
  }

  return value;
}

function textArray(value: unknown): string[] {
  return array(value).map(text);
}

function reward(value: unknown): RechargeRightsReward {
  const row = record(value);

  return { id: number(row.id), name: nullableText(row.name), quantity: number(row.quantity) };
}

function packageData(value: unknown): RechargeRightsPackage | null {
  if (value === null) {
    return null;
  }

  const row = record(value);

  return {
    id: number(row.id),
    priceAmount: number(row.priceAmount),
    grantSpiritStone: number(row.grantSpiritStone),
    grantSpiritCrystal: number(row.grantSpiritCrystal),
    grantSpiritMilk: number(row.grantSpiritMilk),
    items: array(row.items).map(reward),
    skills: array(row.skills).map(reward)
  };
}

function calendarState(value: unknown): RechargeRightsCalendarState {
  const row = record(value);
  const state = text(row.state);

  if (state !== 'claimed' && state !== 'claimable' && state !== 'upcoming') {
    throw new Error('权益接口日历状态无效');
  }

  return { day: number(row.day), rewardDate: text(row.rewardDate), state, prepaid: row.prepaid === true };
}

function daily(value: unknown): RechargeRightsDaily {
  const row = record(value);

  return {
    prepaidCount: number(row.prepaidCount ?? 0),
    reviewRequired: row.reviewRequired === true,
    total: number(row.total),
    claimableCount: number(row.claimableCount),
    claimedCount: number(row.claimedCount),
    upcomingCount: number(row.upcomingCount),
    calendarState: array(row.calendarState).map(calendarState)
  };
}

function monthCard(value: unknown): RechargeRightsMonthCard {
  const row = record(value);

  return {
    active: boolean(row.active),
    expireTime: nullableText(row.expireTime),
    remainingDays: number(row.remainingDays),
    totalDays: number(row.totalDays),
    maxDays: number(row.maxDays),
    remainingQuota: number(row.remainingQuota),
    daily: daily(row.daily),
    package: packageData(row.package)
  };
}

function seclusionPass(value: unknown): RechargeRightsSeclusionPass {
  const row = record(value);

  return {
    active: boolean(row.active),
    expireTime: nullableText(row.expireTime),
    remainingDays: number(row.remainingDays),
    totalDays: number(row.totalDays),
    maxDays: number(row.maxDays),
    package: packageData(row.package)
  };
}

export async function getBackendRechargeRights(bid: string | undefined, uid: number): Promise<RechargeRightsQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendRechargeRights(await requestBackend(bid, 'get_players_id_recharge_rights', { path: { id: uid } }));
}

export function parseBackendRechargeRights(value: unknown) {
  const data = record(value);

  return {
    name: text(data.name),
    vipLevel: number(data.vipLevel),
    totalRechargeAmount: number(data.totalRechargeAmount),
    nextVipLevel: nullableNumber(data.nextVipLevel),
    nextVipThreshold: nullableNumber(data.nextVipThreshold),
    firstRechargeTime: nullableText(data.firstRechargeTime),
    monthCard: monthCard(data.monthCard),
    seclusionPass: seclusionPass(data.seclusionPass),
    activeThemeConfig: nullableText(data.activeThemeConfig),
    canUseMeridian: boolean(data.canUseMeridian),
    canUseSoulPath: boolean(data.canUseSoulPath),
    progressText: text(data.progressText),
    monthCardInstantRewards: textArray(data.monthCardInstantRewards),
    seclusionPriceText: text(data.seclusionPriceText),
    seclusionRewards: textArray(data.seclusionRewards)
  };
}
