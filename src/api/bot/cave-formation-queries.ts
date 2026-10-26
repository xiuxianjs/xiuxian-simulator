import { requestBackend } from './client';

export async function getBackendCaveFormations(bid: string | undefined, uid: number) {
  if (!bid) {
    throw new Error('查询缺少平台身份');
  }
  const data = await requestBackend(bid, 'get_players_id_cave_formations', { path: { id: uid } });

  return parseBackendCaveFormations(data);
}

export function parseBackendCaveFormations(data: unknown) {
  if (!Array.isArray(data)) {
    throw new Error('洞府阵法接口数据不完整');
  }

  return data.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('洞府阵法接口数据不完整');
    }
    const row = value as Record<string, unknown>;

    if (
      !['formationKey', 'formationCategory', 'formationName', 'formationEffect', 'expiresAt', 'categoryLabel', 'remainingText'].every(
        key => typeof row[key] === 'string'
      )
    ) {
      throw new Error('洞府阵法接口数据不完整');
    }

    return {
      formationKey: String(row.formationKey),
      formationName: String(row.formationName),
      formationCategory: String(row.formationCategory),
      categoryLabel: String(row.categoryLabel),
      effectText: String(row.formationEffect),
      remainingText: String(row.remainingText)
    };
  });
}
