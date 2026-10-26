import { cancelBackendSkillBookReset, confirmBackendSkillBookReset, previewBackendSkillBookReset } from '@src/api/bot/skill-book-reset-reroll';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export const previewApp = async (params: { bid?: string; uid: number; skillBookId: number; request?: BackendRequestContext }) => {
  try {
    return await previewBackendSkillBookReset(params.bid, params.uid, params.skillBookId, params.request);
  } catch (error) {
    logger.error('[功法重制预览] 错误:', error);

    return { success: false as const, message: '功法重制失败，请稍后再试' };
  }
};

export const confirmApp = async (params: { bid?: string; uid: number; skillBookId?: number; request?: BackendRequestContext }) => {
  try {
    return await confirmBackendSkillBookReset(params.bid, params.uid, params.skillBookId, params.request);
  } catch (error) {
    logger.error('[功法重制确认] 错误:', error);

    return { success: false as const, message: '确认功法重制失败，请稍后再试' };
  }
};

export const cancelApp = async (params: { bid?: string; uid: number; request?: BackendRequestContext }) => {
  try {
    return await cancelBackendSkillBookReset(params.bid, params.uid, params.request);
  } catch (error) {
    logger.error('[功法重制取消] 错误:', error);

    return { success: false as const, message: '取消功法重制失败，请稍后再试' };
  }
};
