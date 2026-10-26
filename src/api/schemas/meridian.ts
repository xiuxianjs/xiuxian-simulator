// HTTP contract aligned with Go docs/openapi.yaml. Update alongside OpenAPI and verify with yarn test:contracts.
// Unspecified domain payloads intentionally remain unknown.
import type { Schemas } from './index.js';

export interface MeridianSchemas {
  MeridianConfig: {
    TOTAL_COUNT: number;
    QI_PER_MERIDIAN: number;
    PULSE_QI_COST: number;
    PULSE_PROGRESS: number;
    DAILY_PULSE_MAX: number;
    DAILY_EXTRA_PULSE_MAX: number;
    FOUNDATION_STAGE_LEVEL: number;
    [key: string]: number;
  };
  MeridianPhase: { phase: number; name: string; totalCount: number; completedCount: number; completed: boolean; unlocked: boolean };
  MeridianStatus: {
    index: number;
    phase: number;
    phaseIndex: number;
    phaseName: string;
    normalPulsesRemaining: number;
    tailJumpEscalation: boolean;
    Name: string;
    Category: string;
    Description: string;
    Progress: number;
    RequiredProgress: number;
    completed: boolean;
  };
  MeridianView: {
    phases: Array<Schemas['MeridianPhase']>;
    currentPhase: number;
    currentPhaseName: string;
    basePulseRemaining: number;
    extraPulseRemaining: number;
    canPulse: boolean;
    pulseBlockedReason: string;
    TrueQi: number;
    DailyPulseRemaining: number;
    CompletedCount: number;
    config: Schemas['MeridianConfig'];
    isLocked: boolean;
    meridians: Array<Schemas['MeridianStatus']>;
    allCompleted: boolean;
    current: Schemas['MeridianStatus'] | null;
    next: Schemas['MeridianStatus'] | null;
    progressBar: string;
    progressPercent: number;
    showPulseButton: boolean;
  };
  MeridianPulse: Schemas['MeridianStatus'] & {
    phases: Array<Schemas['MeridianPhase']>;
    phaseCompleted: boolean;
    allCompleted: boolean;
    canPulse: boolean;
    pulseBlockedReason: string;
    config: Schemas['MeridianConfig'];
    progressBefore: number;
    basePulseRemaining: number;
    extraPulseRemaining: number;
    jumped: boolean;
    trueQiRemaining: number;
    dailyPulseRemaining: number;
  };
}
