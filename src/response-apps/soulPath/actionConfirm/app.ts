import type { BackendRequestContext } from '@src/api/bot/context';
import { confirmBackendSoulPathAction } from '@src/api/bot/soul-path-action';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; token: string; request?: BackendRequestContext }) {
  try {
    return { success: true as const, data: await confirmBackendSoulPathAction(params.bid, params.uid, params.token, params.request) };
  } catch (error) {
    logger.error('[确认道途操作] 失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '确认道途操作失败，请稍后重试。' };
  }
}
