import { parseFeatureAccess } from './tianshu-content';
import type { ProfessionDashboardEquipment, ProfessionDashboardQueryData } from '@src/api/schemas/profession-dashboard-query';
import { requestBackend } from './client';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('职业面板接口资料不完整');
  }

  return value as Record<string, unknown>;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('职业面板接口缺少状态');
  }

  return value;
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('职业面板接口缺少数值');
  }

  return value;
}

function integer(value: unknown): number {
  const result = number(value);

  if (!Number.isSafeInteger(result)) {
    throw new Error('职业面板接口数值无效');
  }

  return result;
}

function text(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('职业面板接口缺少文本');
  }

  return value;
}

function nullableText(value: unknown): string | null {
  return value === null ? null : text(value);
}

function nullableInteger(value: unknown): number | null {
  return value === null ? null : integer(value);
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error('职业面板接口缺少列表');
  }

  return value;
}

function alchemyAction(value: unknown): 'recipes' | 'continueGuide' | 'joinGuide' | 'none' {
  if (value === 'recipes' || value === 'continueGuide' || value === 'joinGuide' || value === 'none') {
    return value;
  }

  throw new Error('职业面板接口缺少炼丹操作');
}

function lingzhiAction(value: unknown): 'plots' | 'joinGuide' {
  if (value === 'plots' || value === 'joinGuide') {
    return value;
  }

  throw new Error('职业面板接口缺少灵药操作');
}

function equipment(value: unknown): ProfessionDashboardEquipment {
  const row = record(value);

  return {
    typeName: text(row.typeName),
    equipped: boolean(row.equipped),
    equipmentName: nullableText(row.equipped === false && row.equipmentName === undefined ? null : row.equipmentName),
    gradeName: nullableText(row.equipped === false && row.gradeName === undefined ? null : row.gradeName)
  };
}

export async function getBackendProfessionDashboard(bid: string | undefined, uid: number): Promise<ProfessionDashboardQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }

  return parseProfessionDashboard(await requestBackend(bid, 'get_players_id_professions_dashboard', { path: { id: uid } }));
}

export function parseProfessionDashboard(value: unknown): ProfessionDashboardQueryData {
  const data = record(value);
  const access = record(data.access);
  const alchemy = record(data.alchemy);
  const guide = record(alchemy.guide);
  const lingzhi = record(data.lingzhi);

  return {
    access: {
      features: parseFeatureAccess(access.features),
      canUseProfessionAndCave: boolean(access.canUseProfessionAndCave),
      canJoinAlchemyGuide: boolean(access.canJoinAlchemyGuide)
    },
    alchemy: {
      unlocked: boolean(alchemy.unlocked),
      title: text(alchemy.title),
      level: integer(alchemy.level),
      exp: integer(alchemy.exp),
      nextExpRequired: nullableInteger(alchemy.nextExpRequired),
      totalCrafts: integer(alchemy.totalCrafts),
      learnedRecipeCount: integer(alchemy.learnedRecipeCount),
      equipments: array(alchemy.equipments).map(equipment),
      canAdvance: boolean(alchemy.canAdvance),
      showSection: boolean(alchemy.showSection),
      primaryAction: alchemyAction(alchemy.primaryAction),
      guide: {
        active: boolean(guide.active),
        step: nullableInteger(guide.step),
        expiresAt: nullableInteger(guide.expiresAt),
        stepLabel: text(guide.stepLabel)
      }
    },
    lingzhi: {
      cultivatedCount: lingzhi.cultivatedCount === undefined ? undefined : integer(lingzhi.cultivatedCount),
      cultivatableCount: lingzhi.cultivatableCount === undefined ? undefined : integer(lingzhi.cultivatableCount),
      cultivationCostText: lingzhi.cultivationCostText === undefined ? undefined : text(lingzhi.cultivationCostText),
      unlocked: boolean(lingzhi.unlocked),
      title: text(lingzhi.title),
      level: integer(lingzhi.level),
      exp: integer(lingzhi.exp),
      nextExpRequired: nullableInteger(lingzhi.nextExpRequired),
      dailyExpGained: integer(lingzhi.dailyExpGained),
      dailyExpCap: integer(lingzhi.dailyExpCap),
      maxPlots: integer(lingzhi.maxPlots),
      maxFieldGrade: integer(lingzhi.maxFieldGrade),
      maxFieldGradeLabel: text(lingzhi.maxFieldGradeLabel),
      yieldBonus: integer(lingzhi.yieldBonus),
      primaryAction: lingzhiAction(lingzhi.primaryAction)
    }
  };
}
