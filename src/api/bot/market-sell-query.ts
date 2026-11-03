import { parseFishingView, type FishingView } from './fishing';
import { assertMarketPriceRange, parseBackendMarketSellable, type BackendMarketPriceRange, type BackendMarketSellablePage } from './market-trade';

/** Original display-only mapping; eligibility and prices remain server-owned. */
export function presentMarketSellable(page: BackendMarketSellablePage, category: string) {
  const displayType =
    category === 'fish'
      ? 'fish'
      : category === 'equipment'
        ? 'equipment'
        : category === 'profession_tool'
          ? 'professionTool'
          : category === 'skill_book'
            ? 'skillBook'
            : 'item';

  return {
    total: page.total,
    totalPages: page.totalPages,
    items: page.items.map(item => ({
      ...item,
      ...item.attributes,
      id: category === 'fish' ? item.catchId : item.userItemId,
      type: displayType,
      priceRange: item.priceRange ? { min: item.priceRange.minPrice, max: item.priceRange.maxPrice, ref: item.priceRange.referencePrice } : undefined
    }))
  };
}

type RobotMarketSell =
  | { mode: 'choose' }
  | { mode: 'list'; page: ReturnType<typeof presentMarketSellable> }
  | {
      mode: 'start';
      range: BackendMarketPriceRange;
      message?: string;
      listingId?: number;
      catchId?: string;
      itemName?: string;
      weightG?: number;
      fishConfirmation?: FishingView;
    }
  | { mode: 'confirm'; fishConfirmation: FishingView };

export function parseRobotMarketSell(value: unknown, expected: string, category: string, uid?: number): RobotMarketSell {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !('mode' in value) || value.mode !== expected) {
    throw new Error('交易上架响应不完整');
  }
  if (value.mode === 'choose') {
    return { mode: 'choose' };
  }
  if (value.mode === 'confirm') {
    if (!('fishConfirmation' in value)) { throw new Error('鱼挂牌原回执不完整'); }

    return { mode: 'confirm', fishConfirmation: parseFishingView(value.fishConfirmation, uid) };
  }
  if (value.mode === 'list') {
    return { mode: 'list', page: presentMarketSellable(parseBackendMarketSellable(value), category) };
  }
  if (value.mode !== 'start' || !('range' in value)) {
    throw new Error('交易上架响应不完整');
  }
  assertMarketPriceRange(value.range, '市场价格区间响应不完整');
  if ('message' in value && typeof value.message !== 'string') {
    throw new Error('交易上架响应不完整');
  }
  if ('listingId' in value && (typeof value.listingId !== 'number' || !Number.isSafeInteger(value.listingId))) {
    throw new Error('交易上架响应不完整');
  }
  const metadata = value as Record<string, unknown>;

  if (
    metadata.catchId !== undefined &&
    (typeof metadata.catchId !== 'string' ||
      !/^[A-Za-z0-9_.:-]{1,40}$/.test(metadata.catchId) ||
      typeof metadata.itemName !== 'string' ||
      typeof metadata.weightG !== 'number' ||
      !Number.isSafeInteger(metadata.weightG) ||
      metadata.weightG < 1)
  ) {
    throw new Error('鱼上架原实例与重量不完整');
  }

  return {
    mode: 'start',
    range: value.range,
    ...('fishConfirmation' in value && value.fishConfirmation ? { fishConfirmation: parseFishingView(value.fishConfirmation, uid) } : {}),
    ...(metadata.catchId === undefined
      ? {}
      : { catchId: metadata.catchId, itemName: metadata.itemName as string, weightG: metadata.weightG as number }),
    ...('message' in value ? { message: value.message as string } : {}),
    ...('listingId' in value ? { listingId: value.listingId as number } : {})
  };
}
