import { logger } from 'alemonjs';
import type { BackendMeditationBoost } from '@src/api/bot/meditation';
import { startBackendMeditation, type BackendMeditationConfig, type BackendRequestContext } from '@src/api';
import { getCommandErrorMessage } from '@src/utils/commandError';

type MeditationStartResult =
  | {
      code: 'OK';
      data: {
        bonusLines?: string[];
        boost?: BackendMeditationBoost;
        success: boolean;
        message: string;
        button?: string;
        buttonText?: string;
        alreadyMeditating?: boolean;
        elapsedMinutes?: number;
        qiSoFar?: number;
        expSoFar?: number;
        dailyRemaining?: number;
        hasSeclusionPassBonus?: boolean;
        maxDurationMinutes?: number;
        qiBonusRate?: number;
        expBonusRate?: number;
        config: BackendMeditationConfig;
        passPreview: { maxDurationMinutes: number; qiBonusRate: number; expBonusRate: number };
        maxDurationHours: number;
        elapsedText: string;
        bonusLine: string;
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: () => ReturnType<typeof startBackendMeditation>;
  uid: number;
  bid?: string;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<MeditationStartResult> {
  try {
    if (!params.bid) {
      throw new Error('闭关请求缺少平台身份');
    }

    return { code: 'OK', data: params.load ? await params.load() : await startBackendMeditation(params.bid, params.uid, params.request, params.messageText) };
  } catch (error) {
    logger.error('[闭关] 错误:', { requestId: params.request?.requestId, error });

    const message = getCommandErrorMessage(error);

    return { code: 'LOAD_FAILED', data: { message } };
  }
}
