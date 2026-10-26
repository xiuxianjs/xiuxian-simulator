import { isBattleTemplateSummary } from '../schemas/battle-templates-query';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { BattleTemplateApplyResult } from '../schemas/battle-template-apply';

export async function applyBackendBattleTemplate(
  bid: string | undefined,
  uid: number,
  slot: number,
  request?: BackendRequestContext
): Promise<BattleTemplateApplyResult> {
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) {
    throw new Error('模板槽位必须为 1-5 的整数');
  }
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const data = await requestBackend(bid, 'post_players_id_battle_templates_slot_apply', {
    path: { id: uid, slot },
    ...writeContext(request)
  });

  return parseBattleTemplateApply(data, slot);
}

export function parseBattleTemplateApply(value: unknown, slot: number): BattleTemplateApplyResult {
  const data = value as BattleTemplateApplyResult;

  if (!isBattleTemplateSummary(data) || data.slot !== slot || typeof data.cacheInvalidated !== 'boolean') {
    throw new Error('应用战斗模板响应不完整');
  }

  return data;
}
