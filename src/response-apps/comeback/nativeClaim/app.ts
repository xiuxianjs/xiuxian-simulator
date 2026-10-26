import { requestBackend, writeContext } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';
import { parseNativeComebackClaim } from '@src/api/bot/native-comeback';
import { logger } from 'alemonjs';

type Result =
  | {
      code: 'OK';
      data: {
        message: string;
        rewardSummary: string[];
      };
    }
  | {
      code: 'FAILED';
      data: { message: string };
    };

export default async function App(params: { bid: string; uid: number; request: BackendRequestContext }): Promise<Result> {
  try {
    const result = await requestBackend(params.bid, 'post_players_id_native_comeback_claim', {
      path: { id: params.uid },
      ...writeContext(params.request)
    });

    return { code: 'OK', data: parseNativeComebackClaim(result) };
  } catch (error) {
    logger.error('领取本服回归奖励失败:', error);

    return {
      code: 'FAILED',
      data: {
        message: error instanceof Error ? error.message : '领取本服回归奖励失败'
      }
    };
  }
}
