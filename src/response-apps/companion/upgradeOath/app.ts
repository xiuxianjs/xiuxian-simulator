import { BackendAPIError } from '@src/api';
import { upgradeBackendCompanionOath } from '@src/api/bot/companion-relationship-actions';
import { getBackendSocialAccess } from '@src/api/bot/queries';
import { confirmBackendCompanionOverview } from '@src/api/bot/interaction-overview';
import { getBackendCompanionOathUpgradePreview } from '@src/api/bot/companion-oath-preview';
import type { BackendRequestContext } from '@src/api/bot/context';

type CompanionAccess = { ok: boolean; realmName: string };

export async function checkUpgradeOath(params: {
  bid?: string;
  uid: number;
  confirmed?: boolean;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<
  | { code: 'FAIL'; data: { message: string; access?: CompanionAccess } }
  | {
      code: 'CONFIRM_NEEDED';
      data: {
        partnerName: string;
        currentBlessingPercent: number;
        upgradedBlessingPercent: number;
        access: CompanionAccess;
        settledResult?: Awaited<ReturnType<typeof confirmUpgradeOath>>;
      };
    }
> {
  try {
    if (!params.bid) {
      throw new Error('查询缺少平台身份');
    }
    const overview = params.confirmed ? await confirmBackendCompanionOverview(params.bid, params.uid, 'upgrade', params.request, params.messageText) : null;
    const access = overview
      ? { ok: overview.info.access.canUseFifthLayerFeature, realmName: overview.info.access.realmName ?? '未知' }
      : await getBackendSocialAccess(params.bid, params.uid);

    if (!access.ok) {
      return { code: 'FAIL', data: { message: '当前境界不足，需达到炼气五层后开启该功能', access } };
    }

    const preview = overview ? overview.preview : await getBackendCompanionOathUpgradePreview(params.bid, params.uid);

    if (!preview) {
      throw new Error('誓约升级预览数据不完整');
    }
    const settledResult = overview
      ? overview.mutationError
        ? { code: 'FAIL' as const, data: { message: overview.mutationError } }
        : { code: 'OK' as const, data: { message: overview.mutation?.message ?? '' } }
      : undefined;

    return { code: 'CONFIRM_NEEDED', data: { ...preview, access, settledResult } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof Error ? error.message : '无法查询誓约升级条件' } };
  }
}

export async function confirmUpgradeOath(params: {
  bid?: string;
  uid: number;
  messageText?: string;
  request?: BackendRequestContext;
}): Promise<{ code: 'OK'; data: { message: string } } | { code: 'FAIL'; data: { message: string } }> {
  try {
    const result = await upgradeBackendCompanionOath(params.bid, params.uid, params.request);

    return { code: 'OK', data: { message: result.message } };
  } catch (error) {
    return { code: 'FAIL', data: { message: error instanceof BackendAPIError ? error.message : '升级誓约失败，请稍后再试' } };
  }
}
