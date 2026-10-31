import { requestBackend } from './client';

export type CaveAccelerationPreview = {
  spiritStoneEnabled?: boolean;
  spiritStone?: number;
  stoneCost?: number;
  stoneSecondsPerUse?: number;
  maxSpiritStone?: number;
  ripenCost?: number;
  canRipen?: boolean;
  ripenNextAt?: string;
  stoneReason?: string;
  found: boolean;
  message: string;
  plotIndex?: number;
  greenBottleUsedCount?: number;
  greenBottleLimit?: number;
  remainingSeconds?: number;
  remainingHours?: number;
  lingfeiCount?: number;
  greenBottleCount?: number;
  remainingSlots?: number;
  maxLingfei?: number;
  maxGreenBottle?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireBid(bid: string | undefined): asserts bid is string {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
}

export function parseBackendCaveAccelerationPreview(value: unknown): CaveAccelerationPreview {
  if (!isRecord(value) || typeof value.found !== 'boolean' || typeof value.message !== 'string') {
    throw new Error('灵田加速预览响应不完整');
  }
  if (!value.found) {
    return { found: false, message: value.message };
  }
  if (
    typeof value.plotIndex !== 'number' ||
    typeof value.greenBottleUsedCount !== 'number' ||
    typeof value.greenBottleLimit !== 'number' ||
    typeof value.remainingSeconds !== 'number' ||
    typeof value.remainingHours !== 'number' ||
    typeof value.lingfeiCount !== 'number' ||
    typeof value.greenBottleCount !== 'number' ||
    typeof value.remainingSlots !== 'number' ||
    typeof value.maxLingfei !== 'number' ||
    typeof value.maxGreenBottle !== 'number' ||
    !Number.isInteger(value.plotIndex) ||
    !Number.isInteger(value.greenBottleUsedCount) ||
    !Number.isInteger(value.greenBottleLimit) ||
    !Number.isInteger(value.remainingSeconds) ||
    !Number.isFinite(value.remainingHours) ||
    !Number.isInteger(value.lingfeiCount) ||
    !Number.isInteger(value.greenBottleCount) ||
    !Number.isInteger(value.remainingSlots) ||
    !Number.isInteger(value.maxLingfei) ||
    !Number.isInteger(value.maxGreenBottle) ||
    value.plotIndex <= 0 ||
    value.greenBottleUsedCount < 0 ||
    value.greenBottleLimit < 0 ||
    value.remainingSeconds < 0 ||
    value.remainingHours < 0 ||
    value.maxLingfei < 0 ||
    value.maxGreenBottle < 0
  ) {
    throw new Error('灵田加速预览响应不完整');
  }

  if (value.spiritStoneEnabled === true) {
    for (const field of ['spiritStone', 'stoneCost', 'maxSpiritStone', 'ripenCost']) {
      const amount = value[field];

      if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount < 0) {
        throw new Error('灵石加速报价不完整');
      }
    }
    if (typeof value.canRipen !== 'boolean') {
      throw new Error('灵石加速报价不完整');
    }
  }
  if (value.stoneSecondsPerUse !== undefined && (!Number.isSafeInteger(value.stoneSecondsPerUse) || Number(value.stoneSecondsPerUse) <= 0)) {
    throw new Error('灵石加速时长不完整');
  }

  return {
    found: true,
    message: value.message,
    plotIndex: value.plotIndex,
    greenBottleUsedCount: value.greenBottleUsedCount,
    greenBottleLimit: value.greenBottleLimit,
    remainingSeconds: value.remainingSeconds,
    remainingHours: value.remainingHours,
    lingfeiCount: value.lingfeiCount,
    greenBottleCount: value.greenBottleCount,
    remainingSlots: value.remainingSlots,
    maxLingfei: value.maxLingfei,
    maxGreenBottle: value.maxGreenBottle,
    spiritStoneEnabled: value.spiritStoneEnabled === true,
    spiritStone: typeof value.spiritStone === 'number' ? value.spiritStone : 0,
    stoneCost: typeof value.stoneCost === 'number' ? value.stoneCost : 0,
    ...(value.stoneSecondsPerUse === undefined ? {} : { stoneSecondsPerUse: Number(value.stoneSecondsPerUse) }),
    maxSpiritStone: typeof value.maxSpiritStone === 'number' ? value.maxSpiritStone : 0,
    ripenCost: typeof value.ripenCost === 'number' ? value.ripenCost : 0,
    canRipen: value.canRipen === true,
    ripenNextAt: typeof value.ripenNextAt === 'string' ? value.ripenNextAt : undefined,
    stoneReason: typeof value.stoneReason === 'string' ? value.stoneReason : undefined
  };
}

export async function getBackendCaveAccelerationPreview(bid: string | undefined, uid: number, plotIndex: number): Promise<CaveAccelerationPreview> {
  requireBid(bid);

  return parseBackendCaveAccelerationPreview(
    await requestBackend(bid, 'get_players_id_cave_plots_plotIndex_acceleration_preview', { path: { id: uid, plotIndex } })
  );
}
