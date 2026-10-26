import { getCurrentEvent } from 'alemonjs';
import { getEventCatalog, reportCatalogReuse } from './catalog-query-reuse';
import type { CurrencyCode } from '@src/constants';
import type { CompanionShopQueryData, ShopListProductsResult } from '../schemas/companion-shop-query';
import { requestBackend } from './client';

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('道侣商店接口数据不完整');
  }

  return value as Record<string, unknown>;
};
const finiteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const nullableInteger = (value: unknown) => value === null || integer(value);
const nullableText = (value: unknown) => value === null || typeof value === 'string';

export async function getBackendUnifiedShop(bid: string | undefined, uid: number, page: number, shopCode?: string, currencyCode?: CurrencyCode) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  if (currencyCode && currencyCode !== 'SPIRIT_STONE' && currencyCode !== 'SPIRIT_CRYSTAL' && currencyCode !== 'SPIRIT_MILK') {
    throw new Error('商店币种参数无效');
  }
  if (shopCode && !['WANBAOLOU', 'SHENQI', 'CHECKIN', 'TOWER_SCORE', 'DAOLV', 'REPUTATION'].includes(shopCode)) {
    throw new Error('商店分类参数无效');
  }
  const inline = getEventCatalog(getCurrentEvent(), bid, uid, { kind: 'shop', args: { page, shopCode: shopCode ?? null, currencyCode: currencyCode ?? null } });

  if (inline !== undefined) {
    try {
      const decoded = decodeShopData(object(inline));

      reportCatalogReuse(getCurrentEvent(), 'shop');

      return decoded;
    } catch {
      reportCatalogReuse(getCurrentEvent(), 'shop', 'invalid_inline_payload');
      // Missing/invalid optional views retain the original authoritative GET.
    }
  }
  const data = object(await requestBackend(bid, 'get_players_id_shop_products', { path: { id: uid }, query: { page, shopCode, currencyCode } }));

  return decodeShopData(data);
}

export function decodeShopData(data: Record<string, unknown>) {
  const access = object(data.access);
  const currencies = object(data.currencies);

  if (
    !['hasCompanion', 'isFoundationRealm', 'canUseReputationShop'].every(key => typeof access[key] === 'boolean') ||
    !Array.isArray(access.visibleShopCodes) ||
    !access.visibleShopCodes.every((code: unknown) => typeof code === 'string') ||
    !nullableText(access.deniedReason) ||
    !['spiritStone', 'spiritsCrystal', 'spiritsMilk', 'signInCoin', 'towerScore', 'reputation', 'tongxin', 'greenBottle'].every(key => integer(currencies[key])
    ) ||
    !Array.isArray(data.products) ||
    !integer(data.page) ||
    data.page < 1 ||
    !integer(data.totalPages) ||
    data.totalPages < 1 ||
    !integer(data.total) ||
    data.total < 0
  ) {
    throw new Error('道侣商店接口数据不完整');
  }
  for (const raw of data.products) {
    const p = object(raw);

    if (
      !integer(p.productId) ||
      p.productId < 1 ||
      !['shopCode', 'name', 'category', 'priceCurrencyCode', 'limitPeriod', 'limitPeriodName', 'typeLabel'].every(key => typeof p[key] === 'string') ||
      !['priceAmount', 'quantity', 'used', 'limit', 'remaining'].every(key => integer(p[key])) ||
      !['itemId', 'secondaryPriceAmount', 'requiredRealmId', 'requiredStars', 'discountPriceAmount'].every(key => nullableInteger(p[key])) ||
      (p.discountRate !== null && !finiteNumber(p.discountRate)) ||
      ![
        'priceCurrencyName',
        'secondaryPriceCurrencyCode',
        'secondaryPriceCurrencyName',
        'grantCurrencyCode',
        'grantCurrencyName',
        'discountLabel',
        'itemType',
        'itemSubtype',
        'requiredRealmName',
        'lockReason'
      ].every(key => nullableText(p[key])) ||
      typeof p.unlocked !== 'boolean' ||
      (p.nextPurchaseAt !== null && (typeof p.nextPurchaseAt !== 'string' || !Number.isFinite(new Date(p.nextPurchaseAt).getTime())))
    ) {
      throw new Error('道侣商店商品数据不完整');
    }
  }
  const facts = data as unknown as CompanionShopQueryData;
  const result: ShopListProductsResult = {
    success: true,
    pagination: { currentPage: facts.page, totalPages: facts.totalPages, total: facts.total },
    data: facts.products.map(p => ({
      productId: p.productId,
      shopCode: p.shopCode,
      name: p.name,
      category: p.category,
      itemId: p.itemId ?? undefined,
      priceAmount: p.priceAmount,
      priceCurrencyName: p.priceCurrencyName ?? undefined,
      quantity: p.quantity,
      used: p.used,
      limit: p.limit,
      remaining: p.remaining,
      limitPeriodCN: p.limitPeriodName,
      unlocked: p.unlocked,
      lockReason: p.lockReason ?? undefined,
      discountPriceAmount: p.discountPriceAmount ?? undefined,
      discountLabel: p.discountLabel ?? undefined,
      typeLabel: p.typeLabel,
      secondaryPriceAmount: p.secondaryPriceAmount && p.secondaryPriceCurrencyCode ? p.secondaryPriceAmount : undefined,
      secondaryPriceCurrencyName: p.secondaryPriceAmount && p.secondaryPriceCurrencyCode ? (p.secondaryPriceCurrencyName ?? undefined) : undefined,
      grantCurrencyName: p.category === 'currency' && p.grantCurrencyCode ? (p.grantCurrencyName ?? undefined) : undefined
    }))
  };

  return { access: facts.access, currencies: facts.currencies, result };
}
