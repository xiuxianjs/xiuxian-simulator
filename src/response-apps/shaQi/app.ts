import { getBackendShaQi } from '@src/api/bot/shaqi-queries';
import { logger } from 'alemonjs';

type ShaQiResult =
  | {
      code: 'OK';
      data: {
        shaQi: number;
        onKillGodList: boolean;
        killGodThreshold: number;
        dailyDecayAmount: number;
        jinpenReduceAmount: number;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: { uid: number; bid?: string }): Promise<ShaQiResult> {
  try {
    const info = await getBackendShaQi(params.bid, params.uid);

    if (!info) {
      return { code: 'LOAD_FAILED', data: { message: '无法获取煞气信息' } };
    }

    return {
      code: 'OK',
      data: {
        shaQi: info.shaQi,
        onKillGodList: info.onKillGodList,
        killGodThreshold: info.killGodThreshold,
        dailyDecayAmount: info.dailyDecayAmount,
        jinpenReduceAmount: info.jinpenReduceAmount
      }
    };
  } catch (error) {
    logger.error('[煞气] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '获取煞气信息失败' } };
  }
}
