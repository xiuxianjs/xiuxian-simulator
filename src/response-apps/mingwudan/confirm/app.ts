import { repeatPresentationHeaders } from '@src/api/bot/repeat-presentation';
import { requestBackend, writeContext } from '@src/api/bot/client';
import type { BackendRequestContext } from '@src/api/bot/context';

export type MingwudanConfirmResult =
  | {
      code: 'OK';
      data: {
        message: string;
        proficiencyGain: number;
        currentProficiency: number;
        skillBookName: string;
        remainingCount: number;
        consumedCount: number;
        guidanceText: string;
        canContinue: boolean;
      };
    }
  | {
      code: 'INVALID_USER';
      message: string;
    }
  | {
      code: 'INVALID_PARAM';
      message: string;
    }
  | {
      code: 'NOT_FOUND';
      message: string;
    }
  | {
      code: 'FAILED';
      message: string;
    };

export default async function App(params: {
  load?: () => Promise<unknown>;
  bid: string;
  uid: number;
  skillBookId: number;
  quantity: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<MingwudanConfirmResult> {
  const { bid, uid, skillBookId, quantity, request } = params;

  if (!Number.isSafeInteger(skillBookId) || skillBookId <= 0) {
    return { code: 'INVALID_PARAM', message: '功法模板ID无效' };
  }

  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    return { code: 'INVALID_PARAM', message: '数量必须是大于0的整数' };
  }

  try {
    const result = (
      params.load
        ? await params.load()
        : await requestBackend(bid, 'post_players_id_mingwu_dan_confirm', {
            path: { id: uid },
            body: { skillBookId, quantity },
            headers: repeatPresentationHeaders(params.messageText),
            ...writeContext(request)
          })
    ) as {
      message: string;
      proficiencyGain: number;
      currentProficiency: number;
      skillBookName: string;
      remainingCount: number;
      consumedCount: number;
      guidanceText?: unknown;
      canContinue?: unknown;
    };

    if (
      typeof result.message !== 'string' ||
      typeof result.skillBookName !== 'string' ||
      ![result.proficiencyGain, result.currentProficiency, result.remainingCount, result.consumedCount].every(
        value => Number.isSafeInteger(value) && value >= 0
      ) ||
      typeof result.guidanceText !== 'string' ||
      typeof result.canContinue !== 'boolean'
    ) {
      throw new Error('明悟丹确认回执不完整');
    }

    return {
      code: 'OK',
      data: {
        message: result.message,
        proficiencyGain: result.proficiencyGain,
        currentProficiency: result.currentProficiency,
        skillBookName: result.skillBookName,
        remainingCount: result.remainingCount,
        consumedCount: result.consumedCount,
        guidanceText: result.guidanceText,
        canContinue: result.canContinue
      }
    };
  } catch (error: any) {
    return { code: 'FAILED', message: error?.message ?? '明悟丹参悟失败' };
  }
}
