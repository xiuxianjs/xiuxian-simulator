import { getBackendSoulArtifactBag } from '@src/api/bot';
import type { SoulArtifactDetail } from '@src/types/storage';
import { logger } from 'alemonjs';

export type StorageSoulArtifactsResult =
  { code: 'OK'; data: { page: number; total: number; pageSize: number; items: SoulArtifactDetail[] } } | { code: 'LOAD_FAILED' };

export default async function App(params: { bid?: string; uid: number; page: number }): Promise<StorageSoulArtifactsResult> {
  try {
    const result = await getBackendSoulArtifactBag(params.bid, params.uid, params.page);

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
    logger.error('查询本命物失败:', error);

    return { code: 'LOAD_FAILED' };
  }
}
