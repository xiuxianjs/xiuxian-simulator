import type { BackendRequestContext } from '@src/api/bot/context';
import { confirmBackendSoulArtifactWash } from '@src/api/bot/soul-artifact-wash';
import { logger } from 'alemonjs';

export default async function App(params: { bid?: string; uid: number; request?: BackendRequestContext }) {
  try {
    const result = await confirmBackendSoulArtifactWash(params.bid, params.uid, params.request);

    return { success: true, message: result.message, pending: result.pending };
  } catch (error) {
    logger.error('确认本命物洗涤失败:', error);

    return {
      success: false,
      message: error instanceof Error ? error.message : '确认本命物洗涤失败'
    };
  }
}
