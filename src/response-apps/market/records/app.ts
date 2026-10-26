import { PAGE_SIZE } from '@src/constants';
import { getBackendMarketTrades } from '@src/api/bot';
import { logger } from 'alemonjs';

type MarketRecordsResult =
  | {
      code: 'OK';
      data: {
        rows: any[];
        currentPage: number;
        totalPages: number;
        total: number;
        title: string;
        cmdPrefix: string;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { bid?: string; uid: number; mode: 'all' | 'buy' | 'sell'; page: number }): Promise<MarketRecordsResult> {
  try {
    const { rows, currentPage, totalPages, total } = await getBackendMarketTrades(params.bid, params.uid, params.mode, params.page, PAGE_SIZE);

    const title = params.mode === 'buy' ? '交易记录（买）' : params.mode === 'sell' ? '交易记录（卖）' : '交易记录';
    const cmdPrefix = params.mode === 'buy' ? '/我的交易记录 买' : params.mode === 'sell' ? '/我的交易记录 卖' : '/我的交易记录';

    return {
      code: 'OK',
      data: { rows: rows as any[], currentPage, totalPages, total, title, cmdPrefix }
    };
  } catch (error) {
    logger.error('查看我的交易记录失败:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看我的交易记录失败，请稍后再试' } };
  }
}
