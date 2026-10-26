import { requestBackend } from './client';

export { getBackendSponsorPayment as getPaymentOrder } from './sponsor-payment';

export async function getPaymentOrders(bid: string, uid: number, page: number) {
  const value = await requestBackend(bid, 'get_players_id_payments_orders', { path: { id: uid }, query: { page, pageSize: 5 } });

  if (!value || typeof value !== 'object') {
    throw new Error('订单列表响应不完整');
  }
  const data = value as Record<string, unknown>;

  if (!Array.isArray(data.items) || typeof data.total !== 'number' || !Number.isSafeInteger(data.total) || data.total < 0) {
    throw new Error('订单列表响应不完整');
  }
  const items = data.items.map(value => {
    if (!value || typeof value !== 'object') {
      throw new Error('订单列表响应不完整');
    }
    const row = value as Record<string, unknown>;

    if (
      typeof row.orderNo !== 'string' ||
      !row.orderNo ||
      typeof row.status !== 'string' ||
      typeof row.payAmount !== 'number' ||
      !Number.isSafeInteger(row.payAmount) ||
      row.payAmount <= 0 ||
      typeof row.packageId !== 'number'
    ) {
      throw new Error('订单列表响应不完整');
    }

    return { orderNo: row.orderNo, status: row.status, payAmount: row.payAmount, packageId: row.packageId };
  });

  return { items, total: data.total };
}
