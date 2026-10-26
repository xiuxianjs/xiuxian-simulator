import { cancelBackendSkillBookReroll, confirmBackendSkillBookReroll, previewBackendSkillBookReroll } from '@src/api/bot/skill-book-reset-reroll';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

export const previewApp = async (params: { bid?: string; uid: number; skillBookId: number; attrLabel?: string; request?: BackendRequestContext }) => {
  try {
    return await previewBackendSkillBookReroll(params.bid, params.uid, params.skillBookId, params.attrLabel, params.request);
  } catch (error) {
    logger.error('[功法换词预览] 错误:', error);

    return { success: false as const, message: '功法换词失败，请稍后再试' };
  }
};

export const confirmApp = async (params: { bid?: string; uid: number; skillBookId?: number; request?: BackendRequestContext }) => {
  try {
    return await confirmBackendSkillBookReroll(params.bid, params.uid, params.skillBookId, params.request);
  } catch (error) {
    logger.error('[功法换词确认] 错误:', error);

    return { success: false as const, message: '确认功法换词失败，请稍后再试' };
  }
};

export const cancelApp = async (params: { bid?: string; uid: number; request?: BackendRequestContext }) => {
  try {
    return await cancelBackendSkillBookReroll(params.bid, params.uid, params.request);
  } catch (error) {
    logger.error('[功法换词取消] 错误:', error);

    return { success: false as const, message: '取消功法换词失败，请稍后再试' };
  }
};
