import { purchaseBackendCompanionShopOverview } from '@src/api/bot/interaction-overview';
import { BackendAPIError } from '@src/api';
import { previewBackendCompanionShopPurchase, purchaseBackendCompanionShop } from '@src/api/bot/companion-shop-purchase';
import type { BackendRequestContext } from '@src/api/bot/context';

type PreviewResult =
  | {
      code: 'CONFIRM_NEEDED';
      data: { productId: number; name: string; unitPrice: number; totalPrice: number; grantQuantity: number; count: number; settledResult?: PurchaseResult };
    }
  | { code: 'FAIL'; data: { message: string } };

type PurchaseResult = { code: 'OK'; data: { name: string; paid: string; granted: number } } | { code: 'FAIL'; data: { message: string } };

/** The robot forwards command input; product validation and confirmation facts belong to Go. */
export async function checkShopBuy(params: {
  bid?: string;
  uid: number;
  productId: number;
  count: number;
  messageText?: string;
  request?: BackendRequestContext;
  confirmed?: boolean;
}): Promise<PreviewResult> {
  try {
    if (params.confirmed) {
      const overview = await purchaseBackendCompanionShopOverview(params.bid, params.uid, params.productId, params.count, params.request, params.messageText);
      const settledResult: PurchaseResult =
        overview.purchaseError || !overview.result
          ? { code: 'FAIL', data: { message: overview.purchaseError ?? '兑换失败，请稍后再试' } }
          : { code: 'OK', data: { name: overview.result.name, paid: overview.result.paid, granted: overview.result.granted } };

      return { code: 'CONFIRM_NEEDED', data: { ...overview.preview, settledResult } };
    }
    const result = await previewBackendCompanionShopPurchase(params.bid, params.uid, params.productId, params.count, params.request);

    return { code: 'CONFIRM_NEEDED', data: result };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '兑换预检失败，请稍后再试' } };
  }
}

export async function confirmShopBuy(params: {
  bid?: string;
  uid: number;
  productId: number;
  count: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<PurchaseResult> {
  try {
    const result = await purchaseBackendCompanionShop(params.bid, params.uid, params.productId, params.count, params.request);

    return { code: 'OK', data: { name: result.name, paid: result.paid, granted: result.granted } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '兑换失败，请稍后再试' } };
  }
}
