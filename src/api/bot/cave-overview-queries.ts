import type { CaveOverviewFormation, CaveOverviewPlot, CaveOverviewQueryData } from '../schemas/cave-overview-query';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('洞府概览接口资料不完整');
  }

  return value as Record<string, unknown>;
}
function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('洞府概览接口缺少数值');
  }

  return value;
}
function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('洞府概览接口缺少文本');
  }

  return value;
}
function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}
function nullableNumber(value: unknown): number | null {
  return value === null ? null : number(value);
}
function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('洞府概览接口缺少状态');
  }

  return value;
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('洞府概览接口缺少列表');
  }

  return value;
}
function date(value: unknown): string | null {
  const result = nullableText(value);

  if (result !== null && !Number.isFinite(new Date(result).getTime())) {
    throw new Error('洞府概览接口日期无效');
  }

  return result;
}
function capability(value: unknown): CaveOverviewPlot['capabilities'][number] {
  const row = record(value);
  const kind = text(row.kind);

  if (!['plant', 'harvest', 'care', 'accelerate', 'upgrade', 'cultivate'].includes(kind)) {
    throw new Error('洞府概览接口能力无效');
  }
  const careAction = row.careAction === undefined ? undefined : text(row.careAction);

  if (careAction !== undefined && !['water', 'worm', 'weed'].includes(careAction)) {
    throw new Error('洞府概览接口照料能力无效');
  }
  if ((kind === 'care') !== (careAction !== undefined)) {
    throw new Error('洞府概览接口能力参数不一致');
  }

  return { kind: kind as CaveOverviewPlot['capabilities'][number]['kind'], careAction: careAction as CaveOverviewPlot['capabilities'][number]['careAction'] };
}
function plot(value: unknown): CaveOverviewPlot {
  const row = record(value);
  const plotState = text(row.plotState);

  if (plotState !== 'cultivated' && plotState !== 'unlockable' && plotState !== 'locked') {
    throw new Error('洞府概览接口地块状态无效');
  }

  return {
    plotIndex: number(row.plotIndex),
    plotState,
    fieldGrade: number(row.fieldGrade),
    seedName: text(row.seedName),
    seedMatureHours: nullableNumber(row.seedMatureHours),
    seedStageSplit: nullableText(row.seedStageSplit),
    cropName: text(row.cropName),
    baseYield: number(row.baseYield),
    expReward: number(row.expReward),
    abnormalFlags: number(row.abnormalFlags),
    abnormalStateCount: number(row.abnormalStateCount),
    isMature: boolean(row.isMature),
    plantedAt: date(row.plantedAt),
    matureAt: date(row.matureAt),
    remainingSeconds: number(row.remainingSeconds),
    title: text(row.title),
    detail: text(row.detail),
    capabilities: array(row.capabilities).map(capability)
  };
}
function formation(value: unknown): CaveOverviewFormation {
  const row = record(value);
  const expiresAt = text(row.expiresAt);

  if (!Number.isFinite(new Date(expiresAt).getTime())) {
    throw new Error('洞府概览接口日期无效');
  }

  return {
    formationKey: text(row.formationKey),
    formationCategory: text(row.formationCategory),
    formationName: text(row.formationName),
    formationEffect: text(row.formationEffect),
    expiresAt
  };
}
export function parseBackendCaveOverview(value: unknown): CaveOverviewQueryData {
  const data = record(value);

  return {
    plots: array(data.plots).map(plot),
    maxPlots: number(data.maxPlots),
    cultivationCostText: data.cultivationCostText === undefined ? undefined : text(data.cultivationCostText),
    cultivatedCount: number(data.cultivatedCount),
    plantedCount: number(data.plantedCount),
    matureCount: number(data.matureCount),
    abnormalCount: number(data.abnormalCount),
    auraScore: number(data.auraScore),
    auraLevel: text(data.auraLevel),
    auraLabel: text(data.auraLabel),
    activeFormations: array(data.activeFormations).map(formation),
    stasisFormation:
      data.stasisFormation === undefined || data.stasisFormation === null
        ? null
        : (() => {
            const stasis = record(data.stasisFormation);

            return { name: text(stasis.name), remainingText: text(stasis.remainingText) };
          })()
  };
}
