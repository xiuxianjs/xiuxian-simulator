import type { BackendRequestContext } from '@src/api/bot/context';
import { setBackendSkillVisibility } from '@src/api/bot/skill-visibility';
import { logger } from 'alemonjs';

export type HiddenSkillBookToggleResult =
  { code: 'OK'; data: { message: string } } | { code: 'FAILED'; data: { message: string } } | { code: 'LOAD_FAILED'; data: { message: string } };

export async function toggleSkillBookHidden(params: {
  request?: BackendRequestContext;
  bid?: string;
  uid: number;
  skillBookId: number;
  isHidden: boolean;
}): Promise<HiddenSkillBookToggleResult> {
  try {
    const result = await setBackendSkillVisibility(params.bid, params.uid, params.skillBookId, params.isHidden, params.request);

    return { code: result.code === 'UPDATED' ? 'OK' : 'FAILED', data: { message: result.message } };
  } catch (error) {
    logger.error(`${params.isHidden ? '隐藏' : '显示'}功法失败:`, error);

    return { code: 'LOAD_FAILED', data: { message: `${params.isHidden ? '隐藏' : '显示'}功法失败，请稍后再试或联系运营。` } };
  }
}
