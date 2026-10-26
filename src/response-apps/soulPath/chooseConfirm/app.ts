import type { BackendRequestContext } from '@src/api/bot/context';
import { confirmBackendSoulPathChoose } from '@src/api/bot/soul-path-choose';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; token: string; request?: BackendRequestContext }) {
  try {
    return { success: true as const, data: await confirmBackendSoulPathChoose(params.bid, params.uid, params.token, params.request) };
  } catch (error) {
    logger.error('[确认道途选择] 失败:', error);

    return { success: false as const, message: error instanceof Error ? error.message : '确认道途选择失败，请稍后重试。' };
  }
}
