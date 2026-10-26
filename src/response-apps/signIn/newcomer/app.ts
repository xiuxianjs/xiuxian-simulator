import { presentNewcomerCheckIn } from '@src/api/bot/signin-robot-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import { newcomerBackendCheckIn } from '@src/api/bot/daily-checkin';
import { logger } from 'alemonjs';

export type NewcomerSignInResult =
  { code: 'OK'; data: { message: string; ritualText?: string } } | { code: 'LOAD_FAILED'; data: { message: string; ritualText?: string } };

export default async function App(params: { bid: string; uid: number; messageText?: string; request?: BackendRequestContext }): Promise<NewcomerSignInResult> {
  try {
    const result = await newcomerBackendCheckIn(params.bid, params.uid, params.request, params.messageText);

    return presentNewcomerCheckIn(result);
  } catch (error) {
    logger.error('新人签到失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '新人签到失败，请稍后再试。' } };
  }
}
