import { requestBackend } from './client';

export interface MasterLineageDisplayNode {
  userId: number;
  userName: string;
  realmName: string;
  isSelf: boolean;
  relationStatusText?: string;
  disciples: MasterLineageDisplayNode[];
}
function mapNode(value: unknown, uid: number, path = new Set<number>()): MasterLineageDisplayNode {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('师谱接口数据不完整');
  }
  const row = value as Record<string, unknown>;

  if (
    !Number.isSafeInteger(row.userId) ||
    Number(row.userId) < 1 ||
    (row.name !== null && typeof row.name !== 'string') ||
    (row.realmName !== null && typeof row.realmName !== 'string') ||
    (row.relationStatus !== null && row.relationStatus !== 1 && row.relationStatus !== 2) ||
    !Array.isArray(row.disciples) ||
    path.has(Number(row.userId))
  ) {
    throw new Error('师谱接口数据不完整');
  }
  const userId = Number(row.userId);

  path.add(userId);
  const node: MasterLineageDisplayNode = {
    userId,
    userName: row.name === null ? `修士${userId}` : String(row.name),
    realmName: row.realmName === null ? '未知境界' : String(row.realmName),
    isSelf: userId === uid,
    relationStatusText: row.relationStatus === null ? undefined : row.relationStatus === 2 ? '已出师' : '在培养',
    disciples: row.disciples.map(child => mapNode(child, uid, path))
  };

  path.delete(userId);

  return node;
}
export async function getBackendMasterLineage(bid: string | undefined, uid: number): Promise<{ root: MasterLineageDisplayNode | null }> {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_master_lineage', { path: { id: uid } });

  return parseMasterLineage(data, uid);
}

export function parseMasterLineage(data: unknown, uid: number): { root: MasterLineageDisplayNode | null } {
  if (!data || typeof data !== 'object' || Array.isArray(data) || !('root' in data)) {
    throw new Error('师谱接口数据不完整');
  }

  return { root: data.root === null ? null : mapNode(data.root, uid) };
}
