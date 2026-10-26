import { getCurrentEvent } from 'alemonjs';
import { getEventAccessFacts } from './access-facts';
import { requestBackend } from './client';
import { isBattleTemplateSummary, type BattleTemplatesQueryData } from '../schemas/battle-templates-query';

export async function getBackendBattleTemplateAccess(bid: string | undefined, uid: number) {
  try {
    if (!bid) {
      throw new Error('操作缺少平台身份');
    }
    const cached = getEventAccessFacts(getCurrentEvent(), bid, uid)?.social;

    if (cached) {
      return { ok: cached.canUseFifthLayerFeature, realmName: cached.realmNameValue ?? '未知' };
    }
    const data = await requestBackend(bid, 'get_players_id_social_access', { path: { id: uid } });

    if (typeof data?.canUseFifthLayerFeature !== 'boolean' || (data.realmNameValue !== null && typeof data.realmNameValue !== 'string')) {
      throw new Error('战斗模板资格响应不完整');
    }

    return { ok: data.canUseFifthLayerFeature, realmName: data.realmNameValue ?? '未知' };
  } catch {
    // The original getUserRealmInfo catches data failures and returns null.
    return { ok: false, realmName: '未知' };
  }
}

export async function getBackendBattleTemplates(bid: string | undefined, uid: number): Promise<BattleTemplatesQueryData> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_battle_templates', { path: { id: uid } });

  return parseBattleTemplates(data);
}

export function parseBattleTemplates(value: unknown): BattleTemplatesQueryData {
  const data = value as BattleTemplatesQueryData;

  if (!data || !Array.isArray(data.templates) || !data.templates.every(isBattleTemplateSummary) || !isBattleTemplateSummary(data.current)) {
    throw new Error('战斗模板接口返回不完整');
  }

  return data;
}
