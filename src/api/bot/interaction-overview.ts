import { repeatPresentationHeaders } from './repeat-presentation';
import { parseCompanionProposalPreflight } from './companion-proposal-preflight';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import { parseCompanionInfo } from './companion-info-queries';
import { decodeShopPreview } from './shop-purchase';
import { parseGachaCatalog, parseGachaGoods, parseGachaHistory } from './queries';
import { parseGachaPullResult } from './gacha-pull';
import type { ShopPurchaseOverviewData } from '../schemas/interaction-overview';
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('业务聚合响应不完整');
  }

  return v as Record<string, unknown>;
};
const identity = (bid: string | undefined): string => {
  if (!bid) {
    throw new Error('请求缺少平台身份');
  }

  return bid;
};
const mutation = (v: unknown) => {
  const data = record(v);

  if (typeof data.success !== 'boolean' || typeof data.message !== 'string') {
    throw new Error('道侣操作响应不完整');
  }

  return { success: data.success, message: data.message, narrativeText: typeof data.narrativeText === 'string' ? data.narrativeText : '' };
};

export async function actBackendCompanionProposalByName(
  bid: string | undefined,
  uid: number,
  name: string,
  action: 'accept' | 'reject',
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  return mutation(
    await requestBackend(identity(bid), 'post_players_id_companion_proposals_by_name_action', {
      headers: repeatPresentationHeaders(repeatCommand),
      path: { id: uid, action },
      body: { name },
      ...writeContext(request)
    })
  );
}
export async function confirmBackendCompanionOverview(
  bid: string | undefined,
  uid: number,
  action: 'upgrade' | 'breakup',
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  const data = await requestBackend(identity(bid), 'post_players_id_companion_confirmation_action', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid, action },
    ...writeContext(request)
  });
  const info = parseCompanionInfo(data.info);

  if (
    data.preview !== null &&
    (!data.preview ||
      typeof data.preview.partnerName !== 'string' ||
      ![data.preview.partnerId, data.preview.currentBlessingPercent, data.preview.upgradedBlessingPercent].every(Number.isFinite))
  ) {
    throw new Error('誓约升级预览数据不完整');
  }
  if (data.mutationError !== undefined && typeof data.mutationError !== 'string') {
    throw new Error('道侣操作响应不完整');
  }

  return { info, preview: data.preview, mutation: data.mutation === null ? null : mutation(data.mutation), mutationError: data.mutationError };
}
export async function proposeBackendCompanionOverview(
  bid: string | undefined,
  uid: number,
  targetUserId: number,
  oathItemId: number,
  request?: BackendRequestContext
) {
  const data = record(
    await requestBackend(identity(bid), 'post_players_id_companion_proposals_overview', {
      path: { id: uid },
      body: { targetUserId, oathItemId },
      ...writeContext(request)
    })
  );

  if (typeof data.initiatorName !== 'string' || (data.projectionError !== undefined && typeof data.projectionError !== 'string')) {
    throw new Error('道侣申请响应不完整');
  }
  if (data.projectionError) {
    throw new Error(data.projectionError);
  }

  return { ...mutation(data.mutation), initiatorName: data.initiatorName };
}
export async function getBackendNamedGacha(
  bid: string | undefined,
  uid: number,
  poolName: string,
  view: 'goods' | 'history' | 'pull',
  count?: 1 | 10,
  request?: BackendRequestContext
) {
  const raw =
    view === 'pull'
      ? await requestBackend(identity(bid), 'post_players_id_gacha_named_poolName_pull', {
          path: { id: uid, poolName },
          body: { count: count ?? 1 },
          requestId: request?.requestId,
          idempotencyKey: request?.idempotencyKey
        })
      : await requestBackend(identity(bid), 'get_players_id_gacha_named_poolName_view', { path: { id: uid, poolName, view } });

  return parseNamedGacha(raw, view);
}

export function parseNamedGacha(raw: unknown, view: 'goods' | 'history' | 'pull') {
  const data = record(raw);
  const catalog = parseGachaCatalog(record(data.catalog));
  const banner =
    catalog.accessStatus === 'READY'
      ? { ok: true as const, banner: catalog }
      : catalog.accessStatus === 'NO_BANNER'
        ? { ok: false as const, reason: 'no_banner' as const }
        : { ok: false as const, reason: 'realm_low' as const, minRealmName: catalog.minRealm?.name ?? '' };

  return {
    banner,
    goods: data.data !== null && view === 'goods' ? parseGachaGoods(data.data) : [],
    history: data.data !== null && view === 'history' ? parseGachaHistory(data.data) : [],
    pull: data.data !== null && view === 'pull' ? parseGachaPullResult(data.data) : null
  };
}
const purchaseResult = (v: unknown) => {
  const data = record(v);

  if (typeof data.name !== 'string' || typeof data.paid !== 'string' || ![data.granted, data.buyCount].every(Number.isFinite)) {
    throw new Error('商店结算响应不完整');
  }

  return data as unknown as ShopPurchaseOverviewData['result'];
};

export async function purchaseBackendShopOverview(
  bid: string | undefined,
  uid: number,
  productId: number,
  count: number,
  confirmed: boolean,
  request?: BackendRequestContext
) {
  const data = await requestBackend(identity(bid), 'post_players_id_shop_purchases_overview', {
    path: { id: uid },
    body: { productId, count, confirmed },
    requestId: request?.requestId,
    idempotencyKey: request?.idempotencyKey
  });

  return parseShopPurchaseOverview(data);
}

export function parseShopPurchaseOverview(value: unknown) {
  const data = record(value);

  if (data.purchaseError !== undefined && typeof data.purchaseError !== 'string') {
    throw new Error('商店结算响应不完整');
  }

  return {
    preview: decodeShopPreview(data.preview),
    result: data.result === null ? null : purchaseResult(data.result),
    purchaseError: data.purchaseError,
    checkinAlternative: data.checkinAlternative === null || data.checkinAlternative === undefined ? undefined : decodeShopPreview(data.checkinAlternative)
  };
}
export async function purchaseBackendCompanionShopOverview(
  bid: string | undefined,
  uid: number,
  productId: number,
  count: number,
  request?: BackendRequestContext,
  repeatCommand?: string
) {
  const data = await requestBackend(identity(bid), 'post_players_id_companion_shop_purchases_overview', {
    headers: repeatPresentationHeaders(repeatCommand),
    path: { id: uid },
    body: { productId, count },
    ...writeContext(request)
  });

  if (
    !data.preview ||
    typeof data.preview.name !== 'string' ||
    ![data.preview.productId, data.preview.unitPrice, data.preview.totalPrice, data.preview.grantQuantity, data.preview.count].every(Number.isFinite)
  ) {
    throw new Error('道侣商店预检响应不完整');
  }
  if (data.purchaseError !== undefined && typeof data.purchaseError !== 'string') {
    throw new Error('商店结算响应不完整');
  }

  return { preview: data.preview, result: data.result === null ? null : purchaseResult(data.result), purchaseError: data.purchaseError };
}

export async function executeBackendCompanionProposalCommand(
  bid: string | undefined,
  uid: number,
  input: { target: string; targetBid?: string; oathIndex?: number; fallbackPage?: number },
  request?: BackendRequestContext
) {
  const data = record(
    await requestBackend(identity(bid), 'post_players_id_companion_proposals_command', {
      path: { id: uid },
      body: input,
      requestId: request?.requestId,
      idempotencyKey: request?.idempotencyKey
    })
  );

  return parseCompanionProposalCommand(data);
}

export function parseCompanionProposalCommand(value: unknown) {
  const data = record(value);

  if (
    typeof data.code !== 'string' ||
    !['NOT_FOUND', 'NO_OATH_ITEMS', 'INDEX_INVALID', 'SELECTION_REQUIRED', 'COMPLETED'].includes(data.code) ||
    (data.mutationError !== undefined && typeof data.mutationError !== 'string')
  ) {
    throw new Error('道侣申请响应不完整');
  }
  const preflight = parseCompanionProposalPreflight(data.preflight);
  const result = data.result === null ? null : record(data.result);

  if (result && (typeof result.initiatorName !== 'string' || (result.projectionError !== undefined && typeof result.projectionError !== 'string'))) {
    throw new Error('道侣申请响应不完整');
  }

  return {
    code: data.code as 'NOT_FOUND' | 'NO_OATH_ITEMS' | 'INDEX_INVALID' | 'SELECTION_REQUIRED' | 'COMPLETED',
    preflight,
    result: result ? { ...mutation(result.mutation), initiatorName: result.initiatorName as string } : null,
    mutationError: (data.mutationError ?? result?.projectionError) as string | undefined
  };
}
