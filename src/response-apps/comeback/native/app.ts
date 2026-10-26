import { requestBackend } from '@src/api/bot/client';
import { parseNativeComebackOverview, type NativeComebackOverview } from '@src/api/bot/native-comeback';
import { logger } from 'alemonjs';

type Result =
  | {
      code: 'OK';
      data: NativeComebackOverview;
    }
  | {
      code: 'LOAD_FAILED';
      data: { message: string };
    };

export default async function App(params: { bid: string; uid: number }): Promise<Result> {
  try {
    const data = await requestBackend(params.bid, 'get_players_id_native_comeback', { path: { id: params.uid } });

    return { code: 'OK', data: parseNativeComebackOverview(data) };
  } catch (error) {
    logger.error('加载本服回归奖励失败:', error);

    return {
      code: 'LOAD_FAILED',
      data: {
        message: error instanceof Error ? error.message : '加载本服回归奖励失败'
      }
    };
  }
}
