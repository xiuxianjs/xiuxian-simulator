import { getCommandErrorMessage } from '@src/utils/commandError';
import { logger } from 'alemonjs';
import { settleBackendMeditation, type BackendRequestContext } from '@src/api';

type MeditationEndResult =
  | {
      code: 'OK';
      data: {
        bonusLines?: string[];
        boost?: import('@src/api/bot/meditation').BackendMeditationBoost;
        success: boolean;
        message: string;
        elapsedMinutes?: number;
        qiGained?: number;
        expGained?: number;
        creditedExperience?: number;
        recoveredMental?: number;
        totalQi?: number;
        dailyQiGained?: number;
        dailyQiCap: number;
        minimumRewardMinutes: number;
        elapsedText: string;
        bonusLine: string;
        rewardNotice: string;
        hasSeclusionPassBonus?: boolean;
        maxDurationMinutes?: number;
        qiBonusRate?: number;
        expBonusRate?: number;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: () => ReturnType<typeof settleBackendMeditation>;
  uid: number;
  bid?: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<MeditationEndResult> {
  try {
    if (!params.bid) {
      throw new Error('闭关结算请求缺少平台身份');
    }

    return { code: 'OK', data: params.load ? await params.load() : await settleBackendMeditation(params.bid, params.uid, params.request, params.messageText) };
  } catch (error) {
    logger.error('[出关] 错误:', { requestId: params.request?.requestId, error });

    return { code: 'LOAD_FAILED', data: { message: getCommandErrorMessage(error) } };
  }
}
