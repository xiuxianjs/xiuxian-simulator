import type { MasterInfoQueryData } from '../schemas/master-info-query';
import { requestBackend } from './client';
export async function getBackendMasterInfo(bid: string | undefined, uid: number): Promise<MasterInfoQueryData> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_master_info', { path: { id: uid } });

  return parseMasterInfo(data);
}

export function parseMasterInfo(value: unknown): MasterInfoQueryData {
  const v = value as MasterInfoQueryData;

  if (
    !v?.access ||
    typeof v.access.allowed !== 'boolean' ||
    !(v.access.realmName === null || typeof v.access.realmName === 'string') ||
    !Array.isArray(v.discipleHistory) ||
    v.discipleSide === undefined ||
    v.masterSide === undefined ||
    (v.masterSide !== null &&
      (!v.masterSide.stats || !v.masterSide.virtueProgress || !Array.isArray(v.masterSide.disciples) || !Array.isArray(v.masterSide.history)))
  ) {
    throw new Error('师门接口数据不完整');
  }
  const rows = [...(v.discipleSide ? [v.discipleSide] : []), ...(v.masterSide?.disciples ?? [])];

  for (const row of rows) {
    if (
      !row?.graduationProgress ||
      !row.masterSupportProgress ||
      !row.discipleResponseProgress ||
      !row.dailyProgress ||
      typeof row.startedAt !== 'string' ||
      !Number.isFinite(row.interactionCount) ||
      !Number.isFinite(row.activeDays) ||
      typeof row.graduationProgress.statusText !== 'string'
    ) {
      throw new Error('师门接口数据不完整');
    }
  }
  const histories = [...v.discipleHistory, ...(v.masterSide?.history ?? [])];

  if (
    histories.some(
      row => typeof row.displayTargetName !== 'string' ||
        typeof row.displayTargetRealm !== 'string' ||
        typeof row.statusText !== 'string' ||
        typeof row.displayFinishedAt !== 'string'
    )
  ) {
    throw new Error('师门接口展示投影不完整');
  }
  if (
    (v.discipleSide &&
      (typeof v.discipleSide.displayMasterName !== 'string' ||
        typeof v.discipleSide.displayMasterRealm !== 'string' ||
        (v.discipleSide.blessing && typeof v.discipleSide.blessing.expireAtText !== 'string'))) ||
    (v.masterSide &&
      (typeof v.masterSide.virtueTitle !== 'string' ||
        v.masterSide.disciples.some(row => typeof row.displayDiscipleName !== 'string' || typeof row.displayDiscipleRealm !== 'string') ||
        (v.masterSide.titleReward && typeof v.masterSide.titleReward.displayTitleName !== 'string')))
  ) {
    throw new Error('师门接口展示投影不完整');
  }

  return v;
}
