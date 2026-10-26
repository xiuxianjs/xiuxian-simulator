import type { BackendRequestContext } from '@src/api/bot/context';
import { previewBackendSoulPathAction, type SoulPathAction } from '@src/api/bot/soul-path-action';
import type { SoulPathKey } from '@src/constants/soulPath';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; action: SoulPathAction; pathKey: SoulPathKey | null; request?: BackendRequestContext }) {
  try {
    return { success: true as const, data: await previewBackendSoulPathAction(params.bid, params.uid, params.action, params.pathKey, params.request) };
  } catch (error) {
    logger.error('[道途操作] 预览失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '道途操作预览失败，请稍后重试。' };
  }
}
