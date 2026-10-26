import { assertMarketMutationResult, assertMarketPurchasePreview } from '../schemas/market-trade';
import { assertMarketPriceRange } from './market-trade';
import type { Operations } from '../registry';
import { repeatPresentationHeaders } from './repeat-presentation';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { MarketWorkflowInput } from '../schemas/market-community-views';
import { parseMyMarketListings } from './my-market-listings';
import { parseMarketCredibility } from './market-credibility';
import { parseRobberyRecords } from './robbery-records';
import { parseGlossaryEntry } from './glossary-queries';
import { GLOSSARY_PAGE_SIZE } from '@src/constants/glossary';
function identity(bid?: string): string {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return bid;
}
export async function marketWorkflow(bid: string | undefined, uid: number, body: MarketWorkflowInput, request?: BackendRequestContext, repeatCommand?: string) {
  let context: { requestId?: string; idempotencyKey?: string } = { requestId: request?.requestId };

  if (body.action === 'purchase') {
    try {
      context = writeContext(request);
    } catch (error) {
      if (body.confirmed) {
        throw error;
      }
      body = { ...body, readOnly: true };
    }
  } else if (body.action === 'sell' && (body.firstNumber ?? 0) > 0 && (body.category !== 'item' || (body.secondNumber ?? 0) > 0)) {
    try {
      context = writeContext(request);
    } catch {
      body = { ...body, readOnly: true };
    }
  }
  const data = await requestBackend(identity(bid), 'post_players_id_market_workflow', {
    headers: repeatPresentationHeaders(request?.idempotencyKey ? repeatCommand : undefined),
    path: { id: uid },
    body,
    ...context
  });

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('市场操作响应不完整');
  }
  if (body.action === 'sell') {
    assertMarketPriceRange(data.range, '市场价格区间响应不完整');
    if (
      data.listingError !== undefined &&
      (!data.listingError ||
        typeof data.listingError !== 'object' ||
        Array.isArray(data.listingError) ||
        typeof data.listingError.message !== 'string' ||
        typeof data.listingError.code !== 'string')
    ) {
      throw new Error('交易上架响应不完整');
    }
    if (data.receipt !== undefined) {
      assertMarketMutationResult(data.receipt, '交易上架响应不完整');
    }
  }
  if (body.action === 'purchase') {
    if (data.preview !== undefined) {
      assertMarketPurchasePreview(data.preview, '市场购买预览响应不完整');
    } else {
      assertMarketMutationResult(data.receipt, '选购响应不完整');
    }
  }

  return data;
}
export async function marketListingsView(bid: string | undefined, uid: number, page: number, request?: BackendRequestContext) {
  return parseMyMarketListings((await marketWorkflow(bid, uid, { action: 'listings', page }, request)).listings);
}
export async function marketCredibilityView(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  return parseMarketCredibility((await marketWorkflow(bid, uid, { action: 'credibility' }, request)).credibility);
}
export async function robberyRecordsView(bid: string | undefined, uid: number, page: number, request?: BackendRequestContext) {
  return parseRobberyRecords(
    await requestBackend(identity(bid), 'post_players_id_robbery_records_view', {
      path: { id: uid },
      body: { page },
      requestId: request?.requestId
    })
  );
}
export async function glossaryView(
  bid: string | undefined,
  action: 'browse' | 'search' | 'category' | 'edit_context',
  page = 1,
  keyword?: string,
  category?: string
) {
  const data = await requestBackend(identity(bid), 'get_glossary_view', { query: { action, page, keyword, category } });

  return parseGlossaryView(data, action);
}

export async function glossaryEditContextCommand(bid: string | undefined, uid: number, request?: BackendRequestContext) {
  const data = await requestBackend(identity(bid), 'post_players_id_glossary_edit_context', {
    path: { id: uid },
    requestId: request?.requestId,
    idempotencyKey: request?.idempotencyKey,
    headers: repeatPresentationHeaders(request?.idempotencyKey ? '录入词典' : undefined)
  });

  return parseGlossaryView(data, 'edit_context');
}

export function parseGlossaryView(data: Operations['get_glossary_view']['response'], action: 'browse' | 'search' | 'category' | 'edit_context') {
  if (!data || typeof data !== 'object' || !(data.exact === null || typeof data.exact === 'object')) {
    throw new Error('词典接口返回格式不完整');
  }
  const policy = data.policy;

  if (
    policy &&
    (!Array.isArray(policy.categories) ||
      !policy.categories.every(value => typeof value === 'string') ||
      typeof policy.defaultCategory !== 'string' ||
      !Number.isInteger(policy.keywordMaxLength) ||
      !Number.isInteger(policy.contentMaxLength) ||
      typeof policy.categoryValid !== 'boolean')
  ) {
    throw new Error('词典策略响应不完整');
  }
  const quota = data.quota;

  if (action === 'edit_context' && (!quota || typeof quota.allowed !== 'boolean' || typeof quota.withinLimit !== 'boolean')) {
    throw new Error('词典配额响应不完整');
  }
  if (action !== 'search' && action !== 'edit_context' && !policy) {
    throw new Error('词典策略响应不完整');
  }
  if (action === 'edit_context' && quota?.allowed && quota.withinLimit && !policy) {
    throw new Error('词典策略响应不完整');
  }
  const raw = data.page;

  if (raw && (!Array.isArray(raw.items) || raw.pageSize !== GLOSSARY_PAGE_SIZE || !Number.isSafeInteger(raw.total) || !Number.isSafeInteger(raw.page))) {
    throw new Error('词典分页响应不完整');
  }

  return {
    policy,
    quota,
    exact: data.exact === null ? null : parseGlossaryEntry(data.exact),
    page: raw
      ? { entries: raw.items.map(parseGlossaryEntry), total: raw.total, totalPages: Math.ceil(raw.total / raw.pageSize), currentPage: raw.page }
      : undefined
  };
}
