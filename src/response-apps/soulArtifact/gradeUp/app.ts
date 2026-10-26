import { upgradeBackendSoulArtifactGrade } from '@src/api/bot/soul-artifact-grade-upgrade';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type SoulArtifactGradeUpResult =
  { code: 'OK'; data: { message: string } } | { code: 'FAILED'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  instanceId?: number;
  request?: BackendRequestContext;
}): Promise<SoulArtifactGradeUpResult> {
  try {
    const result = await upgradeBackendSoulArtifactGrade(params.bid, params.uid, params.instanceId, params.request);

    return {
      code: 'OK',
      data: {
        message: `「${result.artifact.name}」升品成功：${result.previousGradeName} → ${result.newGradeName}（消耗同名${result.previousGradeName}本命物 ×${result.consumed}）`
      }
    };
  } catch (error) {
    logger.error('本命物升品失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '升品失败' } };
  }
}
