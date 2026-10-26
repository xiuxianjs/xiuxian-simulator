import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { getBackendRobotIdentity } from '@src/api/bot/identity';
import { createBackendNormalPayment } from '@src/api/bot/sponsor-payment';
import { getBackendRechargeNormalPackages } from '@src/api/bot/recharge-normal-package-queries';
import QRCode from 'qrcode';

type PayablePackageDisplay = {
  id: number;
  name: string;
  yuan: number;
  grantSpiritMilk: number;
  isAvailableDouble: boolean;
  isClaimedDouble: boolean;
};

export type PayResult =
  | { code: 'PRIVATE_ONLY' }
  | { code: 'NO_MATCH_LIST_EMPTY' }
  | {
      code: 'NO_MATCH_LIST';
      packages: PayablePackageDisplay[];
    }
  | { code: 'ORDER_FAILED'; error: string }
  | {
      code: 'ORDER_CREATED';
      orderNo: string;
      uid: number;
      qrCodeBuffer: Buffer;
      packageName: string;
      yuan: string;
    };

export const getPayData = async (messageText: string, isPrivate: boolean, bid: string, request: BackendRequestContext): Promise<PayResult> => {
  const identity = await getBackendRobotIdentity(bid, request);
  const uid = identity.account.playerId;

  if (!uid || uid <= 0) {
    return { code: 'ORDER_FAILED', error: '尚未进入修仙世界' };
  }
  if (!isPrivate) {
    return { code: 'PRIVATE_ONLY' };
  }

  const text = (messageText ?? '').trim();
  const match = text.match(/充值购买\s+(\d+)/);

  if (!match) {
    // 展示套餐列表
    const { packages } = await getBackendRechargeNormalPackages(bid, uid);

    if (packages.length === 0) {
      return { code: 'NO_MATCH_LIST_EMPTY' };
    }

    const displayPackages: PayablePackageDisplay[] = packages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      yuan: pkg.yuan,
      grantSpiritMilk: pkg.grantSpiritMilk,
      isAvailableDouble: pkg.doubleAvailable,
      isClaimedDouble: pkg.doubleClaimed
    }));

    return { code: 'NO_MATCH_LIST', packages: displayPackages };
  }

  const packageId = parseInt(match[1], 10);

  try {
    const checkout = await createBackendNormalPayment(bid, uid, packageId, request);

    return {
      code: 'ORDER_CREATED',
      uid,
      orderNo: checkout.order.orderNo,
      qrCodeBuffer: await QRCode.toBuffer(checkout.payUrl, { width: 300, margin: 1 }),
      packageName: checkout.packageName,
      yuan: (checkout.order.payAmount / 100).toFixed(2)
    };
  } catch (error) {
    return { code: 'ORDER_FAILED', error: error instanceof BackendAPIError ? error.message : '创建订单失败' };
  }
};
