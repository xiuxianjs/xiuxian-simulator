import { parseBackendNormalCheckout, parseBackendNormalPaymentSettlement, parseRobotSponsorPaymentState } from './sponsor-payment';
import { parseBackendRechargeNormalPackages } from './recharge-normal-package-queries';
export class NormalPackageListDecodeError extends Error {}

export function parseRobotNormalPaymentCreate(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('充值购买响应不完整');
  }
  const row = value as Record<string, unknown>;

  if (row.kind === 'packages') {
    try {
      return { kind: 'packages' as const, packages: parseBackendRechargeNormalPackages(row).packages };
    } catch (error) {
      throw new NormalPackageListDecodeError(error instanceof Error ? error.message : '普通充值套餐响应不完整');
    }
  }
  if (row.kind === 'checkout') {
    return { kind: 'checkout' as const, checkout: parseBackendNormalCheckout(row.checkout) };
  }
  throw new Error('充值购买响应不完整');
}
export function parseRobotNormalPaymentState(value: unknown) {
  const data = parseRobotSponsorPaymentState(value);
  const row = value as Record<string, unknown>;

  return {
    ...data,
    cancelled: row.cancelled === true,
    receipt: data.order.status === 'SUCCESS' ? parseBackendNormalPaymentSettlement(row.receipt) : undefined
  };
}
