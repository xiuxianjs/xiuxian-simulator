import { BackendAPIError } from '@src/api';
import { breakupBackendCompanion } from '@src/api/bot/companion-relationship-actions';
import { confirmBackendCompanionOverview } from '@src/api/bot/interaction-overview';
import { getBackendCompanionInfo } from '@src/api/bot/companion-info-queries';
import type { BackendRequestContext } from '@src/api/bot/context';

type CompanionAccess = { ok: boolean; realmName: string };

type BreakupCheck =
  | { code: 'NO_COMPANION'; data: { message: string; access: CompanionAccess } }
  | { code: 'CONFIRM_NEEDED'; data: { partnerName: string; access: CompanionAccess; settledResult?: Awaited<ReturnType<typeof confirmBreakup>> } };

/** The confirmation page reads server facts; the server owns the breakup itself. */
export async function checkBreakup(params: {
  bid?: string;
  uid: number;
  confirmed?: boolean;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<BreakupCheck> {
  const overview = params.confirmed ? await confirmBackendCompanionOverview(params.bid, params.uid, 'breakup', params.request, params.messageText) : null;
  const info = overview ? overview.info : await getBackendCompanionInfo(params.bid, params.uid);
  const access = { ok: info.access.canUseFifthLayerFeature, realmName: info.access.realmName ?? '未知' };

  if (!info.companion) {
    return { code: 'NO_COMPANION', data: { message: '你当前没有道侣', access } };
  }

  const settledResult = overview
    ? overview.mutationError
      ? { code: 'FAIL' as const, data: { message: overview.mutationError } }
      : { code: 'OK' as const, data: { message: overview.mutation?.message ?? '', narrativeText: overview.mutation?.narrativeText ?? '' } }
    : undefined;

  return { code: 'CONFIRM_NEEDED', data: { partnerName: info.companion.partnerName ?? '未知道侣', access, settledResult } };
}

export async function confirmBreakup(params: {
  bid?: string;
  uid: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<{ code: 'OK'; data: { message: string; narrativeText: string } } | { code: 'FAIL'; data: { message: string } }> {
  try {
    const result = await breakupBackendCompanion(params.bid, params.uid, params.request);

    return { code: 'OK', data: { message: result.message, narrativeText: result.narrativeText } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '解除道侣失败，请稍后再试' } };
  }
}
