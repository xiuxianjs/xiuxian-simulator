import { getBackendLootboxes } from '@src/api/bot';
import type { LootboxListItem } from '@src/api/schemas/queries';
import { logger } from 'alemonjs';

export type StorageLootboxesResult =
  { code: 'OK'; data: { page: number; total: number; pageSize: number; items: LootboxListItem[] } } | { code: 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid: number; page: number }): Promise<StorageLootboxesResult> {
  try {
    const result = await getBackendLootboxes(params.bid, params.uid, params.page);

    return {
      code: 'OK',
      data: {
        page: params.page,
        total: result.total,
        pageSize: result.pageSize,
        items: result.items
      }
    };
  } catch (error) {
    logger.error('查询礼盒失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
