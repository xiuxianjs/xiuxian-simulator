import { claimBackendLimitedEventTask } from '@src/api/bot/limited-event-actions';
import { displayCurrencyText } from '@src/constants/currency';
import type { BackendRequestContext } from '@src/api/bot/context';
import { logger } from 'alemonjs';

type TaskClaimResult =
  | { code: 'OK'; data: { success: true; rewardText: string } }
  | { code: 'FAIL'; data: { success: false; message: string } }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; taskId: number; bid?: string; request?: BackendRequestContext }): Promise<TaskClaimResult> {
  try {
    const result = await claimBackendLimitedEventTask(params.bid, params.uid, params.taskId, params.request);

    return { code: 'OK', data: { success: true, rewardText: result.issued.map(reward => `${displayCurrencyText(reward.name)}×${reward.amount}`).join('、') } };
  } catch (error: any) {
    logger.error('[活动任务领取] 错误:', error);
    if (error?.status === 409 || error?.code === 'CONFLICT') {
      return { code: 'FAIL', data: { success: false, message: error.message ?? '领取失败' } };
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '领取失败，请稍后再试' } };
  }
}
