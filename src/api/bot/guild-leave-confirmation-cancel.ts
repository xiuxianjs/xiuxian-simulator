import { requestBackend, writeContext } from './client';
import type { BackendRequestContext } from './context';
import type { GuildLeaveConfirmationCancelResult } from '../schemas/guild-leave-confirmation-cancel';

export async function cancelBackendGuildLeaveConfirmation(
  bid: string | undefined,
  uid: number,
  request?: BackendRequestContext
): Promise<GuildLeaveConfirmationCancelResult> {
  if (!bid) {
    throw new Error('操作缺少平台身份');
  }
  const context = writeContext(request);
  const data = await requestBackend(bid, 'delete_players_id_guild_leave_confirmation', { path: { id: uid }, ...context });

  return parseGuildLeaveCancel(data);
}

export function parseGuildLeaveCancel(value: unknown): GuildLeaveConfirmationCancelResult {
  const data = value as GuildLeaveConfirmationCancelResult | null | undefined;

  if (!data || typeof data.deleted !== 'boolean') {
    throw new Error('宗门确认状态取消响应不完整');
  }

  return data;
}
