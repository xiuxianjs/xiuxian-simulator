import { requestBackend, writeContext } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

type Result =
  | {
      code: 'FAIL';
      data: { message: string };
    }
  | {
      code: 'OK';
      data: { giftCode: string };
    };

export default async function App(params: { bid: string; uid: number; request: BackendRequestContext }): Promise<Result> {
  try {
    const result = await requestBackend(params.bid, 'post_players_id_old_game_comeback_code_issue', {
      path: { id: params.uid },
      body: { platformUserId: params.bid },
      ...writeContext(params.request)
    });

    if (!result || typeof result !== 'object' || Array.isArray(result) || typeof (result as { giftCode?: unknown }).giftCode !== 'string') {
      throw new Error('凡人修仙礼包码响应不完整');
    }

    return { code: 'OK', data: { giftCode: (result as { giftCode: string }).giftCode } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '当前无法获取凡人修仙礼包码，请稍后再试' } };
  }
}
