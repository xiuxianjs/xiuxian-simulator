import { requestBackend } from './client';
import type { RechargeNormalPackage, RechargeNormalPackagesQueryData } from '../schemas/recharge-normal-packages-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('普通充值套餐响应不完整');
  }

  return value as Record<string, unknown>;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('普通充值套餐数值字段不完整');
  }

  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('普通充值套餐文本字段不完整');
  }

  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('普通充值套餐状态字段不完整');
  }

  return value;
}

function packageItem(value: unknown): RechargeNormalPackage {
  const item = record(value);

  return {
    id: number(item.id),
    name: text(item.name),
    yuan: number(item.yuan),
    priceAmount: number(item.priceAmount),
    grantSpiritMilk: number(item.grantSpiritMilk),
    doubleAvailable: boolean(item.doubleAvailable),
    doubleClaimed: boolean(item.doubleClaimed)
  };
}

export async function getBackendRechargeNormalPackages(bid: string | undefined, uid: number): Promise<RechargeNormalPackagesQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseBackendRechargeNormalPackages(await requestBackend(bid, 'get_players_id_recharge_normal_packages', { path: { id: uid } }));
}
export function parseBackendRechargeNormalPackages(value: unknown): RechargeNormalPackagesQueryData {
  const data = record(value);

  if (!Array.isArray(data.packages)) {
    throw new Error('普通充值套餐列表不完整');
  }

  return { packages: data.packages.map(packageItem) };
}
