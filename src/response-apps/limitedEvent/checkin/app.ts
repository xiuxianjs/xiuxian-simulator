import { postBackendLimitedEventCheckin } from '@src/api/bot/limited-event-checkin';
import { presentLimitedEventCheckin } from '@src/api/bot/limited-event-robot-query';
import { getBackendLimitedEventCheckinStatus } from '@src/api/bot/limited-event-checkin-status';
import type { BackendRequestContext } from '@src/api/bot/context';

type CheckinResult =
  | {
      code: 'OK';
      data: {
        success: boolean;
        message?: string;
        results?: Array<{ eventTitle: string; subTitle: string; dayIndex: number; rewardText: string }>;
      };
    }
  | {
      code: 'FAIL';
      data: {
        message: string;
        status: Array<{
          eventTitle: string;
          subTitle: string;
          subActivityId: number;
          totalDays: number;
          signedDays: number[];
          startTime: Date;
          rewards: Array<{ signed: boolean; dayIndex: number; rewardName: string }>;
        }>;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string; request?: BackendRequestContext }): Promise<CheckinResult> {
  try {
    const result = await postBackendLimitedEventCheckin(params.bid, params.uid, params.request);

    return presentLimitedEventCheckin(result);
  } catch (error: any) {
    if (error?.status === 409 || error?.code === 'CONFLICT') {
      try {
        const status = await getBackendLimitedEventCheckinStatus(params.bid, params.uid);

        return {
          code: 'FAIL',
          data: {
            message: error?.message ?? '当前没有可签到的限时活动',
            status: status.map(row => ({ ...row, startTime: new Date(row.startTime) }))
          }
        };
      } catch (statusError: any) {
        return { code: 'LOAD_FAILED', data: { message: statusError?.message ?? '活动签到失败，请稍后再试' } };
      }
    }

    return { code: 'LOAD_FAILED', data: { message: error?.message ?? '活动签到失败，请稍后再试' } };
  }
}
