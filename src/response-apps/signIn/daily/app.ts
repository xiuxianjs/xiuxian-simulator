import { presentDailyCheckIn } from '@src/api/bot/signin-robot-query';
import type { BackendRequestContext } from '@src/api/bot/context';
import { dailyBackendCheckIn } from '@src/api/bot/daily-checkin';
import { logger } from 'alemonjs';

export type DailySignInResult =
  { code: 'OK'; data: { message: string; ritualText?: string } } | { code: 'LOAD_FAILED'; data: { message: string; ritualText?: string } };

export default async function App(params: { bid: string; uid: number; messageText?: string; request?: BackendRequestContext }): Promise<DailySignInResult> {
  try {
    const result = await dailyBackendCheckIn(params.bid, params.uid, params.request, params.messageText);

    return presentDailyCheckIn(result);
  } catch (error) {
    logger.error('日常签到失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '日常签到失败，请稍后再试。' } };
  }
}
