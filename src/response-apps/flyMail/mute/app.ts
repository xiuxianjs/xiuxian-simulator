import { formatFlyMailMuteResult } from '@src/utils/flyMailCommand';
import { getBackendFlyMailMuteContext, setBackendFlyMailMute } from '@src/api/bot/flymail-mute';
import type { BackendRequestContext } from '@src/api/bot/context';

export { parseFlyMailMuteCommand } from '@src/utils/flyMailCommand';
export { getBackendFlyMailMuteContext as getFlyMailMuteAccess };

export async function resolveFlyMailMuteTarget(
  bid: string | undefined,
  uid: number,
  targetArg?: string,
  mention?: { findOne: () => Promise<{ count?: number; data?: { UserId?: string | null } | null }> }
): Promise<number | null> {
  const text = String(targetArg ?? '').trim();
  const value = Number(text);

  if (/^\d+$/.test(text) && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (!mention) {
    return null;
  }
  const user = await mention.findOne();

  if (!user?.count || !user.data?.UserId) {
    return null;
  }

  return (await getBackendFlyMailMuteContext(bid, uid, user.data.UserId)).targetUid;
}
export { formatFlyMailMuteResult };
export async function changeFlyMailMute(params: { bid?: string; uid: number; targetUid: number; action: 'mute' | 'unmute'; request?: BackendRequestContext }) {
  const result = await setBackendFlyMailMute(params.bid, params.uid, params.targetUid, params.action === 'mute', params.request);

  return formatFlyMailMuteResult(result, params.action);
}
