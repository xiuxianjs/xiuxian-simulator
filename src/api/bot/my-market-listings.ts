import { assertMyMarketInstance } from '../schemas/my-market-listings';
import type { MyMarketListingPage } from '../schemas/my-market-listings';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('我的上架响应不完整');
  }

  return value as Record<string, unknown>;
}
export function parseMyMarketListings(data: unknown): MyMarketListingPage {
  const row = record(data);
  const pagination = record(row.pagination);

  if (
    !Array.isArray(row.items) ||
    !['currentPage', 'totalPages', 'total'].every(k => typeof pagination[k] === 'number' && Number.isSafeInteger(pagination[k]))
  ) {
    throw new Error('我的上架响应不完整');
  }
  for (const value of row.items) {
    const item = record(value);

    if (
      !['listingId', 'status'].every(k => typeof item[k] === 'number' && Number.isSafeInteger(item[k])) ||
      !['quantity', 'unitPriceAmount', 'totalPriceAmount'].every(k => typeof item[k] === 'number' && Number.isFinite(item[k])) ||
      !['itemCategory', 'itemCategoryLabel', 'itemName', 'currencyCode', 'currencyName', 'lockTag'].every(k => typeof item[k] === 'string') ||
      !['itemType', 'itemSubtype'].every(k => item[k] === null || typeof item[k] === 'string') ||
      !['createdAt', 'expiresAt', 'lockedUntil'].every(k => item[k] === null || (typeof item[k] === 'string' && Number.isFinite(Date.parse(item[k])))) ||
      typeof item.attributeAvailable !== 'boolean'
    ) {
      throw new Error('挂单字段不完整');
    }
    assertMyMarketInstance(item.attributes, '挂单属性不完整');
    if (item.attributeView !== null) {
      const view = record(item.attributeView);

      if (typeof view.hidden !== 'boolean' || (view.attrText !== null && typeof view.attrText !== 'string')) {
        throw new Error('挂单属性视图不完整');
      }
    }
  }

  return row as unknown as MyMarketListingPage;
}
