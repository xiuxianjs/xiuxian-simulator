import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';

type Row = Record<string, unknown>;
const asRow = (value: unknown, message: string): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }

  return value as Row;
};

export type BackendSponsorOrder = { orderNo: string; payAmount: number; status: string };
const order = (value: unknown): BackendSponsorOrder => {
  const data = asRow(value, '支付订单响应不完整');
  const payAmount = data.payAmount;

  if (
    typeof data.orderNo !== 'string' ||
    !data.orderNo ||
    !Number.isSafeInteger(payAmount) ||
    typeof payAmount !== 'number' ||
    payAmount <= 0 ||
    typeof data.status !== 'string'
  ) {
    throw new Error('支付订单响应不完整');
  }

  return { orderNo: data.orderNo, payAmount, status: data.status };
};

export type BackendSponsorCheckout = { order: BackendSponsorOrder; payUrl: string; packageName: string };

export async function createBackendSponsorPayment(
  bid: string,
  uid: number,
  amountYuan: number,
  request: BackendRequestContext
): Promise<BackendSponsorCheckout> {
  const value = await requestBackend(bid, 'post_players_id_payments_orders', {
    path: { id: uid },
    body: { kind: 'sponsor', amountYuan },
    ...writeContext(request)
  });

  return parseBackendSponsorCheckout(value);
}
export function parseBackendSponsorCheckout(value: unknown): BackendSponsorCheckout {
  const data = asRow(value, '支付收银台响应不完整');

  if (typeof data.payUrl !== 'string' || !data.payUrl) {
    throw new Error('支付收银台响应不完整');
  }
  if (typeof data.packageName !== 'string' || !data.packageName) {
    throw new Error('支付收银台响应不完整');
  }
  const paymentOrder = order(data.order);

  if (paymentOrder.status !== 'PENDING') {
    throw new Error('新建赞助订单状态异常');
  }

  return { order: paymentOrder, payUrl: data.payUrl, packageName: data.packageName };
}
export async function getBackendSponsorPayment(bid: string, uid: number, orderNo: string): Promise<BackendSponsorOrder> {
  return order(await requestBackend(bid, 'get_players_id_payments_orders_orderNo', { path: { id: uid, orderNo } }));
}
export async function cancelBackendSponsorPayment(bid: string, uid: number, orderNo: string, request: BackendRequestContext): Promise<boolean> {
  const data = asRow(
    await requestBackend(bid, 'post_players_id_payments_orders_orderNo_cancel', { path: { id: uid, orderNo }, ...writeContext(request) }),
    '取消支付订单响应不完整'
  );

  if (typeof data.cancelled !== 'boolean') {
    throw new Error('取消支付订单响应不完整');
  }

  return data.cancelled;
}

export type BackendNormalPaymentSettlement = {
  orderNo: string;
  packageRewards: { spiritMilk: number; spiritStone: number; spiritCrystal: number; items: unknown[]; equipments: unknown[]; skills: unknown[] };
  bonusSpiritMilk: number;
  vipUpgrade: { oldLevel: number; newLevel: number } | null;
  newcomerDayGranted: number | null;
  monthCardExtended: boolean;
  seclusionPassActivated: boolean;
  spiritVein?: { days: number; dailyCrystal: number; startDate: string; endDate: string };
};
export async function getBackendNormalPaymentSettlement(bid: string, uid: number, orderNo: string): Promise<BackendNormalPaymentSettlement> {
  return parseBackendNormalPaymentSettlement(await requestBackend(bid, 'get_players_id_payments_orders_orderNo_settlement', { path: { id: uid, orderNo } }));
}
export function parseBackendNormalPaymentSettlement(value: unknown): BackendNormalPaymentSettlement {
  const data = asRow(value, '充值结算回执不完整');
  const rewards = asRow(data.packageRewards, '充值结算回执不完整');

  for (const key of ['spiritMilk', 'spiritStone', 'spiritCrystal'] as const) {
    if (!Number.isFinite(rewards[key])) {
      throw new Error('充值结算回执不完整');
    }
  }
  for (const key of ['items', 'equipments', 'skills'] as const) {
    if (!Array.isArray(rewards[key])) {
      throw new Error('充值结算回执不完整');
    }
  }
  if (
    typeof data.orderNo !== 'string' ||
    !Number.isFinite(data.bonusSpiritMilk) ||
    typeof data.monthCardExtended !== 'boolean' ||
    typeof data.seclusionPassActivated !== 'boolean'
  ) {
    throw new Error('充值结算回执不完整');
  }
  const vip = data.vipUpgrade === undefined || data.vipUpgrade === null ? null : asRow(data.vipUpgrade, '充值结算回执不完整');

  if (vip && (!Number.isInteger(vip.oldLevel) || !Number.isInteger(vip.newLevel))) {
    throw new Error('充值结算回执不完整');
  }
  const spiritVein = data.spiritVein === undefined || data.spiritVein === null ? undefined : asRow(data.spiritVein, '灵脉租契回执不完整');

  if (
    spiritVein &&
    (!Number.isSafeInteger(spiritVein.days) ||
      Number(spiritVein.days) <= 0 ||
      !Number.isSafeInteger(spiritVein.dailyCrystal) ||
      Number(spiritVein.dailyCrystal) <= 0 ||
      typeof spiritVein.startDate !== 'string' ||
      !Number.isFinite(Date.parse(spiritVein.startDate)) ||
      typeof spiritVein.endDate !== 'string' ||
      !Number.isFinite(Date.parse(spiritVein.endDate)))
  ) {
    throw new Error('灵脉租契回执不完整');
  }

  return {
    orderNo: data.orderNo,
    packageRewards: {
      spiritMilk: rewards.spiritMilk as number,
      spiritStone: rewards.spiritStone as number,
      spiritCrystal: rewards.spiritCrystal as number,
      items: rewards.items as unknown[],
      equipments: rewards.equipments as unknown[],
      skills: rewards.skills as unknown[]
    },
    bonusSpiritMilk: data.bonusSpiritMilk as number,
    vipUpgrade: vip ? { oldLevel: vip.oldLevel as number, newLevel: vip.newLevel as number } : null,
    newcomerDayGranted: Number.isInteger(data.newcomerDayGranted) ? (data.newcomerDayGranted as number) : null,
    monthCardExtended: data.monthCardExtended,
    seclusionPassActivated: data.seclusionPassActivated,
    ...(spiritVein
      ? {
          spiritVein: {
            days: spiritVein.days as number,
            dailyCrystal: spiritVein.dailyCrystal as number,
            startDate: spiritVein.startDate as string,
            endDate: spiritVein.endDate as string
          }
        }
      : {})
  };
}

export async function createBackendNormalPayment(bid: string, uid: number, packageId: number, request: BackendRequestContext): Promise<BackendSponsorCheckout> {
  const value = await requestBackend(bid, 'post_players_id_payments_orders', {
    path: { id: uid },
    body: { kind: 'package', packageId },
    ...writeContext(request)
  });

  return parseBackendNormalCheckout(value);
}
export function parseBackendNormalCheckout(value: unknown): BackendSponsorCheckout {
  const data = asRow(value, '支付收银台响应不完整');

  if (typeof data.payUrl !== 'string' || !data.payUrl) {
    throw new Error('支付收银台响应不完整');
  }
  if (typeof data.packageName !== 'string' || !data.packageName) {
    throw new Error('支付收银台响应不完整');
  }
  const paymentOrder = order(data.order);

  if (paymentOrder.status !== 'PENDING') {
    throw new Error('新建充值订单状态异常');
  }

  return { order: paymentOrder, payUrl: data.payUrl, packageName: data.packageName };
}
export async function createBackendLimitedEventPayment(
  bid: string,
  uid: number,
  subActivityId: number,
  tierLevel: number,
  request: BackendRequestContext
): Promise<BackendSponsorCheckout> {
  const value = await requestBackend(bid, 'post_players_id_payments_orders', {
    path: { id: uid },
    body: { kind: 'limited_event', subActivityId, tierLevel },
    ...writeContext(request)
  });

  return parseBackendLimitedEventCheckout(value);
}
export function parseBackendLimitedEventCheckout(value: unknown): BackendSponsorCheckout {
  const data = asRow(value, '支付收银台响应不完整');

  if (typeof data.payUrl !== 'string' || !data.payUrl) {
    throw new Error('支付收银台响应不完整');
  }
  if (typeof data.packageName !== 'string' || !data.packageName) {
    throw new Error('支付收银台响应不完整');
  }

  return { order: order(data.order), payUrl: data.payUrl, packageName: data.packageName };
}
export async function getBackendLimitedEventPaymentSettlement(
  bid: string,
  uid: number,
  orderNo: string
): Promise<{ packageName: string; rewardTexts: string[]; vipUpgrade: { oldLevel: number; newLevel: number } | null }> {
  return parseBackendLimitedEventSettlement(
    await requestBackend(bid, 'get_players_id_payments_orders_orderNo_limited_event_settlement', { path: { id: uid, orderNo } })
  );
}
export function parseBackendLimitedEventSettlement(value: unknown): {
  packageName: string;
  rewardTexts: string[];
  vipUpgrade: { oldLevel: number; newLevel: number } | null;
} {
  const data = asRow(value, '活动充值结算回执不完整');

  if (typeof data.packageName !== 'string' || !Array.isArray(data.rewardTexts) || !data.rewardTexts.every(x => typeof x === 'string')) {
    throw new Error('活动充值结算回执不完整');
  }
  const vip = data.vipUpgrade === undefined || data.vipUpgrade === null ? null : asRow(data.vipUpgrade, '活动充值结算回执不完整');

  if (vip && (!Number.isInteger(vip.oldLevel) || !Number.isInteger(vip.newLevel))) {
    throw new Error('活动充值结算回执不完整');
  }

  return {
    packageName: data.packageName,
    rewardTexts: data.rewardTexts,
    vipUpgrade: vip ? { oldLevel: vip.oldLevel as number, newLevel: vip.newLevel as number } : null
  };
}

export function parseRobotLimitedEventPaymentState(value: unknown) {
  const data = asRow(value, '活动支付状态响应不完整');
  const paymentOrder = order(data.order);

  if (typeof data.timedOut !== 'boolean' || (data.timedOut && typeof data.cancelled !== 'boolean')) {
    throw new Error('活动支付状态响应不完整');
  }

  return {
    order: paymentOrder,
    timedOut: data.timedOut,
    receipt: paymentOrder.status === 'SUCCESS' ? parseBackendLimitedEventSettlement(data.receipt) : undefined
  };
}

export function parseRobotSponsorPaymentState(value: unknown) {
  const data = asRow(value, '赞助支付状态响应不完整');
  const paymentOrder = order(data.order);

  if (typeof data.timedOut !== 'boolean' || (data.timedOut && typeof data.cancelled !== 'boolean')) {
    throw new Error('赞助支付状态响应不完整');
  }

  return { order: paymentOrder, timedOut: data.timedOut };
}
