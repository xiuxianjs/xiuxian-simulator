import { getBackendMeridians, type BackendRequestContext } from '@src/api';
import { logger } from 'alemonjs';

type MeridianViewResult =
  | {
      code: 'OK';
      data: {
        success: true;
        message: '';
        meridians: Array<{
          index: number;
          name: string;
          category: string;
          description: string;
          progress: number;
          requiredProgress: number;
          completed: boolean;
        }>;
        phases: Awaited<ReturnType<typeof getBackendMeridians>>['phases'];
        currentPhase: number;
        currentPhaseName: string;
        basePulseRemaining: number;
        extraPulseRemaining: number;
        canPulse: boolean;
        pulseBlockedReason: string;
        trueQi: number;
        completedCount: number;
        dailyPulseRemaining: number;
        isLocked: boolean;
        allCompleted: boolean;
        current: {
          index: number;
          phase: number;
          phaseIndex: number;
          phaseName: string;
          normalPulsesRemaining: number;
          tailJumpEscalation: boolean;
          name: string;
          category: string;
          description: string;
          progress: number;
          requiredProgress: number;
        } | null;
        next: { phase: number; phaseName: string; name: string; category: string; description: string } | null;
        progressBar: string;
        progressPercent: number;
        showPulseButton: boolean;
        config: Awaited<ReturnType<typeof getBackendMeridians>>['config'];
      };
    }
  | { code: 'LOAD_FAILED'; data: { message: string } };

export default async function App(params: {
  load?: () => ReturnType<typeof getBackendMeridians>;
  uid: number;
  bid?: string;
  request?: BackendRequestContext;
}): Promise<MeridianViewResult> {
  try {
    if (!params.bid) {
      throw new Error('经络查询缺少平台身份');
    }
    const data = params.load ? await params.load() : await getBackendMeridians(params.bid, params.uid, params.request);
    const mapMeridian = (item: (typeof data.meridians)[number]) => ({
      index: item.index,
      phase: item.phase,
      phaseIndex: item.phaseIndex,
      phaseName: item.phaseName,
      normalPulsesRemaining: item.normalPulsesRemaining,
      tailJumpEscalation: item.tailJumpEscalation,
      name: item.Name,
      category: item.Category,
      description: item.Description,
      progress: item.Progress,
      requiredProgress: item.RequiredProgress,
      completed: item.completed
    });

    return {
      code: 'OK',
      data: {
        success: true,
        message: '',
        phases: data.phases,
        currentPhase: data.currentPhase,
        currentPhaseName: data.currentPhaseName,
        basePulseRemaining: data.basePulseRemaining,
        extraPulseRemaining: data.extraPulseRemaining,
        canPulse: data.canPulse,
        pulseBlockedReason: data.pulseBlockedReason,
        trueQi: data.TrueQi,
        completedCount: data.CompletedCount,
        dailyPulseRemaining: data.DailyPulseRemaining,
        isLocked: data.isLocked,
        allCompleted: data.allCompleted,
        current: data.current ? mapMeridian(data.current) : null,
        next: data.next ? mapMeridian(data.next) : null,
        progressBar: data.progressBar,
        progressPercent: data.progressPercent,
        showPulseButton: data.showPulseButton,
        config: data.config,
        meridians: data.meridians.map(mapMeridian)
      }
    };
  } catch (error) {
    logger.error('[经络] 错误:', error);

    return { code: 'LOAD_FAILED', data: { message: '查看经络失败，请稍后再试' } };
  }
}
