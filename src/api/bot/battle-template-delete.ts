import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { BattleTemplateDeleteResult } from '../schemas/battle-template-delete';

export async function deleteBackendBattleTemplate(
  bid: string | undefined,
  uid: number,
  slot: number,
  request?: BackendRequestContext
): Promise<BattleTemplateDeleteResult> {
  if (!Number.isInteger(slot) || slot < 1 || slot > 5) {
    throw new Error('模板槽位必须为 1-5 的整数');
  }
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_players_id_battle_templates_slot', { path: { id: uid, slot }, ...context });

  return parseBattleTemplateDelete(data);
}

export function parseBattleTemplateDelete(value: unknown): BattleTemplateDeleteResult {
  const data = value as BattleTemplateDeleteResult;

  if (typeof data?.deleted !== 'boolean') {
    throw new Error('删除战斗模板响应不完整');
  }

  return data;
}
