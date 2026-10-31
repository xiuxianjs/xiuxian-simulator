import { repeatPresentationHeaders } from './repeat-presentation';
import { parseNormalExperienceGained, parseTreasureEffects, type TreasureEffectNotice } from './treasure-effects';
import type { BackendRequestContext } from './context';
import { requestBackend, writeContext } from './client';

export type BackendMeditationConfig = {
  QI_PER_INTERVAL: number;
  INTERVAL_MINUTES: number;
  DAILY_QI_CAP: number;
  EXP_PER_ENERGY: number;
  EXP_RECOVERY_EFFICIENCY: number;
  RECOVERED_MENTAL_PER_INTERVAL: number;
  EXP_PER_INTERVAL: number;
  MAX_DURATION_MINUTES: number;
};

type BackendMeditationBenefits = {
  hasSeclusionPassBonus: boolean;
  maxDurationMinutes: number;
  qiBonusRate: number;
  expBonusRate: number;
};

type BackendMeditationPassPreview = {
  maxDurationMinutes: number;
  qiBonusRate: number;
  expBonusRate: number;
};

export type BackendMeditationBoost = {
  billingMode?: 'prepaid' | 'settlement';
  estimatedCharge?: number;
  estimatedRefund?: number;
  enabled: boolean;
  multiplier: number;
  budgetMinutes: number;
  reservedStone: number;
  consumedStone: number;
  refundedStone: number;
  endsAt?: string;
  remainingMinutes?: number;
};
export type BackendMeditationStart = BackendMeditationBenefits & {
  bonusLines?: string[];
  boost?: BackendMeditationBoost;
  success: boolean;
  message: string;
  button?: string;
  buttonText?: string;
  alreadyMeditating: boolean;
  elapsedMinutes: number;
  qiSoFar: number;
  expSoFar: number;
  dailyRemaining: number;
  config: BackendMeditationConfig;
  passPreview: BackendMeditationPassPreview;
  maxDurationHours: number;
  elapsedText: string;
  bonusLine: string;
};

export type BackendMeditationEnd = BackendMeditationBenefits & {
  treasureEffects?: TreasureEffectNotice[];
  normalExperienceGained?: number;
  bonusLines?: string[];
  boost?: BackendMeditationBoost;
  success: boolean;
  message: string;
  elapsedMinutes: number;
  qiGained: number;
  expGained: number;
  creditedExperience?: number;
  recoveredMental: number;
  totalQi: number;
  dailyQiGained: number;
  dailyQiCap: number;
  minimumRewardMinutes: number;
  elapsedText: string;
  bonusLine: string;
  rewardNotice: string;
};
export type BackendMeditationCommandGuard = { active: boolean; allowed: boolean };

type RawRecord = Record<string, unknown>;

function record(value: unknown): RawRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('闭关接口返回不完整，请更新服务端后重试');
  }

  return value as RawRecord;
}

function numeric(value: unknown, integer = false): number {
  if (typeof value !== 'number' || (integer ? !Number.isSafeInteger(value) : !Number.isFinite(value))) {
    throw new Error('闭关接口返回不完整，请更新服务端后重试');
  }

  return value;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('闭关接口返回不完整，请更新服务端后重试');
  }

  return value;
}

function flag(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('闭关接口返回不完整，请更新服务端后重试');
  }

  return value;
}

function benefits(row: RawRecord): BackendMeditationBenefits {
  return {
    hasSeclusionPassBonus: flag(row.hasSeclusionPassBonus),
    maxDurationMinutes: numeric(row.maxDurationMinutes, true),
    qiBonusRate: numeric(row.qiBonusRate),
    expBonusRate: numeric(row.expBonusRate)
  };
}

export async function guardBackendMeditationCommand(bid: string, uid: number, command: string): Promise<BackendMeditationCommandGuard> {
  const row = record(await requestBackend(bid, 'post_players_id_meditation_guard', { path: { id: uid }, body: { command } }));

  return { active: flag(row.active), allowed: flag(row.allowed) };
}

export async function startBackendMeditation(
  bid: string,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendMeditationStart> {
  const row = record(
    await requestBackend(bid, 'post_players_id_meditation_start', {
      path: { id: uid },
      headers: repeatPresentationHeaders(repeatCommand),
      ...(repeatCommand?.match(/灵石\s+(\d+)$/) ? { body: { boostHours: Number(repeatCommand.match(/灵石\s+(\d+)$/)?.[1]) } } : {}),
      ...writeContext(request)
    })
  );

  return parseMeditationStart(row);
}

function parseBonusLines(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('闭关加成数据不完整');
  }

  return value.map(text);
}

function parseBoost(value: unknown): BackendMeditationBoost {
  const row = record(value);

  return {
    ...(row.estimatedCharge === undefined ? {} : { estimatedCharge: numeric(row.estimatedCharge, true) }),
    ...(row.estimatedRefund === undefined ? {} : { estimatedRefund: numeric(row.estimatedRefund, true) }),
    ...(row.billingMode === 'settlement' || row.billingMode === 'prepaid' ? { billingMode: row.billingMode } : {}),
    enabled: flag(row.enabled),
    multiplier: numeric(row.multiplier),
    budgetMinutes: numeric(row.budgetMinutes, true),
    reservedStone: numeric(row.reservedStone, true),
    consumedStone: numeric(row.consumedStone, true),
    refundedStone: numeric(row.refundedStone, true),
    ...(row.endsAt === undefined ? {} : { endsAt: text(row.endsAt) }),
    ...(row.remainingMinutes === undefined ? {} : { remainingMinutes: numeric(row.remainingMinutes, true) })
  };
}
export function parseMeditationBoostOptions(value: unknown) {
  const row = record(value);

  return {
    autoEnabled: row.autoEnabled === true,
    enabled: flag(row.enabled),
    pricePerInterval: numeric(row.pricePerInterval, true),
    multiplier: numeric(row.multiplier),
    spiritStone: numeric(row.spiritStone, true),
    maxHours: numeric(row.maxHours, true)
  };
}
export function parseMeditationStart(value: unknown): BackendMeditationStart {
  const row = record(value);
  const config = record(row.config);
  const preview = record(row.passPreview);

  return {
    ...benefits(row),
    ...(row.bonusLines === undefined ? {} : { bonusLines: parseBonusLines(row.bonusLines) }),
    ...(row.boost === null || row.boost === undefined ? {} : { boost: parseBoost(row.boost) }),
    success: flag(row.success),
    message: text(row.message),
    ...(row.button === undefined ? {} : { button: text(row.button) }),
    ...(row.buttonText === undefined ? {} : { buttonText: text(row.buttonText) }),
    alreadyMeditating: flag(row.alreadyMeditating),
    elapsedMinutes: numeric(row.elapsedMinutes, true),
    qiSoFar: numeric(row.qiSoFar, true),
    expSoFar: numeric(row.expSoFar, true),
    dailyRemaining: numeric(row.dailyRemaining, true),
    maxDurationHours: numeric(row.maxDurationHours, true),
    elapsedText: text(row.elapsedText),
    bonusLine: text(row.bonusLine),
    config: {
      QI_PER_INTERVAL: numeric(config.QI_PER_INTERVAL),
      INTERVAL_MINUTES: numeric(config.INTERVAL_MINUTES),
      DAILY_QI_CAP: numeric(config.DAILY_QI_CAP),
      EXP_PER_ENERGY: numeric(config.EXP_PER_ENERGY),
      EXP_RECOVERY_EFFICIENCY: numeric(config.EXP_RECOVERY_EFFICIENCY),
      RECOVERED_MENTAL_PER_INTERVAL: numeric(config.RECOVERED_MENTAL_PER_INTERVAL),
      EXP_PER_INTERVAL: numeric(config.EXP_PER_INTERVAL),
      MAX_DURATION_MINUTES: numeric(config.MAX_DURATION_MINUTES)
    },
    passPreview: {
      maxDurationMinutes: numeric(preview.maxDurationMinutes, true),
      qiBonusRate: numeric(preview.qiBonusRate),
      expBonusRate: numeric(preview.expBonusRate)
    }
  };
}

export async function settleBackendMeditation(
  bid: string,
  uid: number,
  request?: BackendRequestContext,
  repeatCommand?: string
): Promise<BackendMeditationEnd> {
  const row = record(
    await requestBackend(bid, 'post_players_id_meditation_settle', {
      path: { id: uid },
      headers: repeatPresentationHeaders(repeatCommand),
      ...writeContext(request)
    })
  );

  return parseMeditationEnd(row);
}

export function parseMeditationEnd(value: unknown): BackendMeditationEnd {
  const row = record(value);

  return {
    treasureEffects: parseTreasureEffects(row.treasureEffects),
    normalExperienceGained: parseNormalExperienceGained(row.normalExperienceGained),
    ...benefits(row),
    ...(row.bonusLines === undefined ? {} : { bonusLines: parseBonusLines(row.bonusLines) }),
    ...(row.boost === null || row.boost === undefined ? {} : { boost: parseBoost(row.boost) }),
    success: flag(row.success),
    message: text(row.message),
    elapsedMinutes: numeric(row.elapsedMinutes, true),
    qiGained: numeric(row.qiGained, true),
    expGained: numeric(row.expGained, true),
    ...(row.creditedExperience === undefined ? {} : { creditedExperience: numeric(row.creditedExperience, true) }),
    recoveredMental: numeric(row.recoveredMental, true),
    totalQi: numeric(row.totalQi, true),
    dailyQiGained: numeric(row.dailyQiGained, true),
    dailyQiCap: numeric(row.dailyQiCap, true),
    minimumRewardMinutes: numeric(row.minimumRewardMinutes, true),
    elapsedText: text(row.elapsedText),
    bonusLine: text(row.bonusLine),
    rewardNotice: text(row.rewardNotice)
  };
}
