import type { BackendRequestContext } from '@src/api/bot/context';
import { previewBackendSoulArtifactWash } from '@src/api/bot/soul-artifact-wash';
import { logger } from 'alemonjs';

export type SoulArtifactWashResult =
  | {
      code: 'PENDING';
      data: {
        totalSuccess: number;
        times: number;
        message: string;
        results: Array<{ success: boolean; action?: 'add' | 'replace' | 'upgrade'; message?: string; details?: string[] }>;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; times: number; request?: BackendRequestContext }): Promise<SoulArtifactWashResult> {
  try {
    const result = await previewBackendSoulArtifactWash(params.bid, params.uid, params.times, params.request);

    return {
      code: 'PENDING',
      data: {
        totalSuccess: result.pending.totalSuccess,
        times: result.pending.times,
        message: result.pending.finalMessage,
        results: result.pending.results
      }
    };
  } catch (error) {
    logger.error('本命物洗涤失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '洗涤失败' } };
  }
}
