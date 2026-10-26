import { upgradeBackendSoulArtifactLevel } from '@src/api/bot/soul-artifact-upgrade';
import { BackendAPIError } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export type SoulArtifactUpgradeResult =
  | { code: 'OK'; data: { success: true; message: string; actualLevels: number; compareLines: string[] } }
  | { code: 'FAILED'; data: { success: false; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  bid?: string;
  uid: number;
  levels: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<SoulArtifactUpgradeResult> {
  try {
    const result = await upgradeBackendSoulArtifactLevel(params.bid, params.uid, params.levels, params.request, params.messageText);

    return {
      code: 'OK',
      data: {
        success: true,
        message: result.message,
        actualLevels: result.actualLevels,
        compareLines: result.compareLines
      }
    };
  } catch (error) {
    if (error instanceof BackendAPIError) {
      return { code: 'FAILED', data: { success: false, message: error.message } };
    }
    logger.error('本命物升级失败:', error);

    return { code: 'LOAD_FAILED', data: { message: error instanceof Error ? error.message : '升级失败' } };
  }
}
