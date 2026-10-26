import { isBattleTemplateSummary } from '../schemas/battle-templates-query';
import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { BattleTemplateSaveResult } from '../schemas/battle-template-save';

export async function saveBackendBattleTemplate(
  bid: string | undefined,
  uid: number,
  slot: number,
  name: string | undefined,
  request?: BackendRequestContext
): Promise<BattleTemplateSaveResult> {
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) {
    throw new Error('模板槽位必须为 1-5 的整数');
  }
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'post_players_id_battle_templates_slot_snapshot', {
    path: { id: uid, slot },
    body: name === undefined ? {} : { name },
    ...context
  });

  return parseBattleTemplateSave(data, slot);
}

export function parseBattleTemplateSave(value: unknown, slot: number): BattleTemplateSaveResult {
  const data = value as BattleTemplateSaveResult;

  if (!isBattleTemplateSummary(data) || data.slot !== slot || typeof data.created !== 'boolean') {
    throw new Error('保存战斗模板响应不完整');
  }

  return data;
}
