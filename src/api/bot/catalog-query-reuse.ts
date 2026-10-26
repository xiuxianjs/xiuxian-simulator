import { logger } from 'alemonjs';
import { getBackendConfig } from './config';
import { createBackendRequestContext, getEventTransportDiagnosticContext } from './context';
import { fromCurrencyCN } from '../../constants/currency';

export type CatalogKind = 'storyline' | 'shop';
export type StorylineCatalogArgs = { chapterNumber: number | null; page: number };
export type ShopCatalogArgs = { shopCode: string | null; currencyCode: string | null; page: number };
export type CatalogRequest = { kind: 'storyline'; args: StorylineCatalogArgs } | { kind: 'shop'; args: ShopCatalogArgs };
export type CommandCatalog = CatalogRequest & { bid: string; playerId: number; data: unknown };
const importers = new WeakMap<object, CatalogKind>();

type CatalogEvent = object & { UserId?: string; MessageText?: string; MessageId?: string; InteractionId?: string };
const eventSignature = (event: CatalogEvent) => JSON.stringify([event.UserId, event.MessageId, event.InteractionId, event.MessageText]);
const snapshots = new WeakMap<object, { bid: string; uid: number; signature: string; request: CatalogRequest; data: unknown }>();
const shopCodes: Record<string, string> = {
  万宝楼: 'WANBAOLOU',
  签到: 'CHECKIN',
  签到商店: 'CHECKIN',
  积分: 'TOWER_SCORE',
  积分商店: 'TOWER_SCORE',
  道侣: 'DAOLV',
  道侣商店: 'DAOLV',
  神奇: 'SHENQI',
  神奇商店: 'SHENQI',
  声望: 'REPUTATION',
  声望商店: 'REPUTATION'
};

// Pure parsers shared with the original renderers; do not change their defaults.
export function parseStorylineListArgs(text: string): { chapterArg: number | null; pageArg: number | null } {
  const match = text.trim().match(/^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+(\d+))|(?:\s+p(\d+)))?$/);

  return { chapterArg: match?.[3] ? Number(match[3]) : null, pageArg: match?.[4] ? Number(match[4]) : null };
}
export function parseShopListArgs(text: string, defaultShopCode?: string) {
  const cleaned = defaultShopCode ? text.trim() : text.replace(/^(!|！|\/|#|＃)?商店\s*/, '').trim();
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  let shopCode = defaultShopCode;
  let page = 1;

  for (const token of tokens) {
    if (!shopCode && shopCodes[token]) {
      shopCode = shopCodes[token];
      continue;
    }
    if (/^\d+$/.test(token)) {
      page = Math.max(1, Number(token));
    }
  }
  const cnMatch = cleaned.match(/(灵石|灵晶|道晶)/);
  const currencyCode = cnMatch ? fromCurrencyCN(cnMatch[1]) : undefined;

  if (!shopCode && currencyCode) {
    shopCode = 'WANBAOLOU';
  }

  return { shopCode, page, currencyCode };
}
export function withCommandCatalog<T extends () => Promise<unknown>>(kind: CatalogKind, importer: T): T {
  importers.set(importer, kind);

  return importer;
}
export function getRegisteredCommandCatalog(values: readonly object[]): CatalogKind | undefined {
  const kinds = [...new Set(values.map(value => importers.get(value)).filter((value): value is CatalogKind => value !== undefined))];

  return kinds.length === 1 ? kinds[0] : undefined;
}
export function catalogRequestFromMessage(text: string, kind: CatalogKind | undefined): CatalogRequest | undefined {
  if (kind === 'storyline' && /^(!|！|\/|#|＃)?(查看主线|副本列表|主线列表)(?:(?:\s+\d+)|(?:\s+p\d+))?$/.test(text.trim())) {
    const { chapterArg, pageArg } = parseStorylineListArgs(text);
    const page = Math.max(1, pageArg ?? 1);

    if (Number.isSafeInteger(page) && (chapterArg === null || Number.isSafeInteger(chapterArg))) {
      return { kind, args: { chapterNumber: chapterArg, page } };
    }
  } else if (kind === 'shop' && /^(!|！|\/|#|＃)?商店(?:\s|$)/.test(text.trim())) {
    // Filtered robot queries use their authoritative business response, never
    // the legacy unfiltered command-entry projection.
    if (/(?:^|\s)(筛选|搜索|可购|全部状态|默认排序|价格升序|价格降序)(?:\s|$)/.test(text)) {
      return;
    }
    const { page, shopCode, currencyCode } = parseShopListArgs(text.trim());

    if (Number.isSafeInteger(page)) {
      return { kind, args: { page, shopCode: shopCode ?? null, currencyCode: currencyCode ?? null } };
    }
  }
}
function sameRequest(value: unknown, expected: CatalogRequest): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const row = value as { kind?: unknown; args?: unknown };

  if (row.kind !== expected.kind || !row.args || typeof row.args !== 'object' || Array.isArray(row.args)) {
    return false;
  }
  const args = row.args as Record<string, unknown>;
  const keys = Object.keys(expected.args);

  return Object.keys(args).length === keys.length && keys.every(key => args[key] === (expected.args as unknown as Record<string, unknown>)[key]);
}
export function seedEventCatalog(event: CatalogEvent, bid: string, uid: number, request: CatalogRequest, value: unknown): void {
  invalidateEventCatalog(event);
  if (!value || typeof value !== 'object' || Array.isArray(value) || event.UserId !== bid || !Number.isSafeInteger(uid) || uid < 1) {
    return;
  }
  const catalog = value as Partial<CommandCatalog>;

  if (catalog.bid === bid && catalog.playerId === uid && sameRequest(catalog, request) && catalog.data !== undefined) {
    snapshots.set(event, { bid, uid, signature: eventSignature(event), request, data: catalog.data });
  }
}
export function getEventCatalog(event: CatalogEvent | undefined, bid: string, uid: number, request: CatalogRequest): unknown {
  if (!event || event.UserId !== bid) {
    return;
  }
  const saved = snapshots.get(event);

  if (saved?.bid === bid && saved.uid === uid && saved.signature === eventSignature(event) && sameRequest(saved.request, request)) {
    return saved.data;
  }
}
export function invalidateEventCatalog(event: object): void {
  snapshots.delete(event);
}

// Safe observation of optional consumption or decode fallback, not an authority/cache marker.
export function reportCatalogReuse(event: CatalogEvent | undefined, kind: CatalogKind, reason?: 'invalid_inline_payload'): void {
  try {
    const config = getBackendConfig();

    if (!event || (!config.logApiTimings && !config.logTransportTimings)) {
      return;
    }
    logger.info('[目录复用]', {
      ...getEventTransportDiagnosticContext(event),
      requestId: createBackendRequestContext(event).requestId,
      kind,
      outcome: reason ? 'fallback' : 'reused',
      ...(reason ? { reason } : {})
    });
  } catch {
    // Diagnostics must not alter reuse or prevent the original fallback GET.
  }
}
