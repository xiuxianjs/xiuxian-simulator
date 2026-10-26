import { getBackendRealmRanking } from '@src/api/bot/realm-ranking-queries';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number }) {
  try {
    const result = await getBackendRealmRanking(params.bid, params.uid, true);

    if (!result.canUseFifthLayerFeature) {
      return { code: 'LOCKED' as const, data: { realmName: result.realmName ?? '未知' } };
    }

    if (!result.region) {
      return { code: 'NO_REGION' as const, data: { message: '你当前没有归属区，无法查看区排行。' } };
    }

    return { code: 'OK' as const, data: { ...result, canUseSpar: result.canUseSpar } };
  } catch (error) {
    logger.error('[区境界排行榜] 错误:', error);

    return { code: 'LOAD_FAILED' as const, data: { message: '查看区境界排行榜失败，请稍后再试' } };
  }
}
