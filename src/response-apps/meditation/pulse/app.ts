import { logger } from 'alemonjs';
import { BackendAPIError, pulseBackendMeridian, type BackendRequestContext } from '@src/api';
import type { Schemas } from '@src/api/schemas';

type PulseResult =
  | {
      code: 'OK';
      data: {
        success: boolean;
        message: string;
        phase?: number;
        phaseName?: string;
        phaseCompleted?: boolean;
        allCompleted?: boolean;
        canPulse?: boolean;
        pulseBlockedReason?: string;
        description?: string;
        jumped?: boolean;
        completed?: boolean;
        meridianName?: string;
        progressBefore?: number;
        progressAfter?: number;
        meridianRequiredProgress?: number;
        trueQiRemaining?: number;
        dailyPulseRemaining?: number;
        basePulseRemaining?: number;
        extraPulseRemaining?: number;
        config: Schemas['MeridianConfig'];
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: () => ReturnType<typeof pulseBackendMeridian>;
  uid: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<PulseResult> {
  try {
    if (!params.bid) {
      throw new Error('冲脉请求缺少平台身份');
    }
    const remote = params.load ? await params.load() : await pulseBackendMeridian(params.bid, params.uid, params.request);

    return {
      code: 'OK',
      data: {
        success: true,
        message: '',
        phase: remote.phase,
        phaseName: remote.phaseName,
        phaseCompleted: remote.phaseCompleted,
        allCompleted: remote.allCompleted,
        canPulse: remote.canPulse,
        pulseBlockedReason: remote.pulseBlockedReason,
        description: remote.Description,
        jumped: remote.jumped,
        completed: remote.completed,
        meridianName: remote.Name,
        progressBefore: remote.progressBefore,
        progressAfter: remote.Progress,
        meridianRequiredProgress: remote.RequiredProgress,
        trueQiRemaining: remote.trueQiRemaining,
        dailyPulseRemaining: remote.dailyPulseRemaining,
        basePulseRemaining: remote.basePulseRemaining,
        extraPulseRemaining: remote.extraPulseRemaining,
        config: remote.config
      }
    };
  } catch (error) {
    logger.error('[冲脉] 错误:', { requestId: params.request?.requestId, error });

    if (
      error instanceof BackendAPIError &&
      [
        'MERIDIAN_REALM_LOCKED',
        'INSUFFICIENT_TRUE_QI',
        'MEDITATION_REQUIRED',
        'DAILY_PULSE_LIMIT_REACHED',
        'MERIDIANS_COMPLETE',
        'MERIDIAN_CONFIG_UNAVAILABLE'
      ].includes(error.code ?? '')
    ) {
      return { code: 'LOAD_FAILED', data: { message: `❌ ${error.message}` } };
    }

    return { code: 'LOAD_FAILED', data: { message: '冲脉失败，请稍后再试' } };
  }
}
