import type { BackendRequestContext } from '@src/api/bot/context';
import { previewBackendSoulPathChoose } from '@src/api/bot/soul-path-choose';
import type { SoulPathKey } from '@src/constants/soulPath';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; pathKey: SoulPathKey; request?: BackendRequestContext }) {
  try {
    const data = await previewBackendSoulPathChoose(params.bid, params.uid, params.pathKey, params.request);

    return { success: true as const, data };
  } catch (error) {
    logger.error('[选择道途] 预览失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '选择道途预览失败，请稍后重试。' };
  }
}
