import { requestBackend } from './client';
import type { VipPrivilegesQueryData } from '../schemas/vip-privileges-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('特权接口格式不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw new Error('特权接口缺少数值');
  }

  return value;
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('特权接口缺少状态');
  }

  return value;
}
function privilegeRows(value: unknown): VipPrivilegesQueryData['vipPrivileges'] {
  if (!Array.isArray(value)) {
    throw new Error('特权接口列表不完整');
  }

  return value.map(item => {
    const row = record(item);

    if (typeof row.text !== 'string' || (row.needText !== undefined && typeof row.needText !== 'string') || (row.code !== undefined && typeof row.code !== 'string')) {
      throw new Error('特权接口列表不完整');
    }

    return { minLevel: row.minLevel === undefined ? undefined : number(row.minLevel), text: row.text, unlocked: boolean(row.unlocked), needText: row.needText,
      ...(row.code === undefined ? {} : { code: row.code }) };
  });
}

function periodicPackResets(value: unknown): VipPrivilegesQueryData['periodicPackResets'] {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error('礼包重置特权状态不完整');
  }
  const rows = value.map((item): NonNullable<VipPrivilegesQueryData['periodicPackResets']>[number] => {
    const { period, used } = record(item);

    if (period !== 'weekly' && period !== 'monthly') {
      throw new Error('礼包重置特权周期无效');
    }

    return { period, used: boolean(used) };
  });

  if (new Set(rows.map(row => row.period)).size !== rows.length) {
    throw new Error('礼包重置特权周期重复');
  }

  return rows;
}
export async function getBackendVipPrivileges(bid: string | undefined, uid: number): Promise<VipPrivilegesQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendVipPrivileges(await requestBackend(bid, 'get_players_id_vip_privileges', { path: { id: uid } }));
}

export function parseBackendVipPrivileges(value: unknown) {
  const data = record(value);

  if (
    typeof data.name !== 'string' ||
    !Array.isArray(data.levelEligibility) ||
    (data.activeThemeConfig !== null && typeof data.activeThemeConfig !== 'string')
  ) {
    throw new Error('特权接口资料不完整');
  }
  const checkinDoubleDays = Object.fromEntries(
    Object.entries(record(data.checkinDoubleDays)).map(([key, value]) => {
      if (!Array.isArray(value)) {
        throw new Error('特权接口签到日不完整');
      }

      return [key, value.map(number)];
    })
  );
  const levelEligibility = data.levelEligibility.map(value => {
    const row = record(value);

    return { minLevel: number(row.minLevel), unlocked: boolean(row.unlocked), needAmount: number(row.needAmount) };
  });
  const found = boolean(data.found);
  const vipPrivileges = privilegeRows(data.vipPrivileges);
  const monthCardPrivileges = privilegeRows(data.monthCardPrivileges);
  const resets = periodicPackResets(data.periodicPackResets);

  if (found && (levelEligibility.length !== 10 || levelEligibility.some((row, level) => row.minLevel !== level))) {
    throw new Error('特权接口等级或配置不完整');
  }

  return {
    found,
    name: data.name,
    vipLevel: number(data.vipLevel),
    totalRechargeAmount: number(data.totalRechargeAmount),
    hasMonthCard: boolean(data.hasMonthCard),
    pillDailyLimit: number(data.pillDailyLimit),
    levelEligibility,
    checkinDoubleDays,
    canUseMeridian: boolean(data.canUseMeridian),
    canUseSoulPath: boolean(data.canUseSoulPath),
    activeThemeConfig: data.activeThemeConfig,
    vipPrivileges,
    monthCardPrivileges,
    ...(resets === undefined ? {} : { periodicPackResets: resets })
  };
}
