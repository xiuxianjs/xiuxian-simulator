import { getBackendEventTokens } from '@src/api/bot/event-tokens-queries';
import type { EventTokenQueryItem } from '@src/api/schemas/event-tokens-query';
import { logger } from 'alemonjs';

type TokensResult = { code: 'OK'; data: { tokens: EventTokenQueryItem[] } } | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<TokensResult> {
  try {
    const tokens = await getBackendEventTokens(params.bid, params.uid);

    return { code: 'OK', data: { tokens } };
  } catch (error) {
    logger.error('[活动道具] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看活动道具失败，请稍后再试' } };
  }
}
